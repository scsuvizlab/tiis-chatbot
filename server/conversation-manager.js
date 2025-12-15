const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('./auth');
const userManager = require('./user-manager');
const claudeService = require('./claude-service');

const CONVERSATIONS_DIR = path.join(__dirname, '../data/conversations');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Allowed file types for attachments
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf']
};

// Ensure conversations directory exists
async function ensureConversationsDir(email) {
  const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const userDir = path.join(CONVERSATIONS_DIR, sanitized);
  const attachmentsDir = path.join(userDir, 'attachments');
  
  await fs.mkdir(userDir, { recursive: true });
  await fs.mkdir(attachmentsDir, { recursive: true });
  
  return userDir;
}

// Get conversation file path
function getConversationPath(email, conversationId) {
  const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const filename = conversationId === 'onboarding' ? 'onboarding.json' : `task_${conversationId}.json`;
  return path.join(CONVERSATIONS_DIR, sanitized, filename);
}

// Start onboarding conversation
router.post('/onboarding/start', requireAuth, async (req, res) => {
  const email = req.user.email;
  
  console.log(`[Onboarding Start] User: ${email}`);
  
  try {
    const user = await userManager.getUserByEmail(email);
    
    if (!user) {
      console.log(`[Onboarding Start] User not found: ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.onboarding_complete) {
      console.log(`[Onboarding Start] User already completed onboarding: ${email}`);
      return res.status(400).json({ error: 'Onboarding already completed' });
    }
    
    // Create conversation data
    const conversationData = {
      conversation_id: 'onboarding',
      user_email: email,
      type: 'onboarding',
      status: 'in-progress',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      completed_at: null,
      messages: [],
      summary: null
    };
    
    // Save to file
    await ensureConversationsDir(email);
    const filepath = getConversationPath(email, 'onboarding');
    console.log(`[Onboarding Start] Creating file: ${filepath}`);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
      console.log(`[Onboarding Start] File created successfully`);
    } catch (error) {
      console.error(`[Onboarding Start] CRITICAL: Failed to create file:`, error);
      return res.status(500).json({ error: 'Failed to create onboarding conversation' });
    }
    
    // Generate greeting - pass email for personalized context
    const greeting = `Welcome to TIIS, ${user.name}! Let's start by understanding your role at ${require('./config').CLIENT_INFO.name}. What's your job title?`;
    
    // Save greeting message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: greeting }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    
    try {
      await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
      console.log(`[Onboarding Start] Greeting message saved`);
    } catch (error) {
      console.error(`[Onboarding Start] Failed to save greeting:`, error);
      // Continue anyway - we can recover from this
    }
    
    console.log(`[Onboarding Start] SUCCESS for user: ${email}`);
    
    res.json({
      conversation_id: 'onboarding',
      greeting
    });
    
  } catch (error) {
    console.error(`[Onboarding Start] Unexpected error:`, error);
    res.status(500).json({ error: 'Failed to start onboarding: ' + error.message });
  }
});

// Send message in onboarding
router.post('/onboarding/message', requireAuth, async (req, res) => {
  const email = req.user.email;
  const { conversation_id, message, attachments } = req.body;
  
  console.log(`[Onboarding Message] User: ${email}, Message length: ${message?.length || 0}`);
  
  try {
    if (conversation_id !== 'onboarding') {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    // Load conversation
    const filepath = getConversationPath(email, 'onboarding');
    console.log(`[Onboarding Message] Reading file: ${filepath}`);
    
    let conversationData;
    try {
      const fileContent = await fs.readFile(filepath, 'utf8');
      conversationData = JSON.parse(fileContent);
      console.log(`[Onboarding Message] Loaded conversation with ${conversationData.messages.length} messages`);
    } catch (error) {
      console.error(`[Onboarding Message] Failed to read conversation file:`, error);
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Process attachments if any
    const userContent = [{ type: 'text', text: message }];
    
    if (attachments && attachments.length > 0) {
      console.log(`[Onboarding Message] Processing ${attachments.length} attachments`);
      const processedAttachments = await processAttachments(
        attachments, 
        email, 
        'onboarding',
        crypto.randomUUID()
      );
      userContent.push(...processedAttachments);
    }
    
    // Save user message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString()
    });
    
    // Build conversation history for Claude
    const history = conversationData.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    console.log(`[Onboarding Message] Sending to Claude with ${history.length} messages in history`);
    
    // Get Claude response - PASS EMAIL FOR PERSONALIZED CONTEXT
    const claudeResponse = await claudeService.sendOnboardingMessage(history, message, email);
    
    console.log(`[Onboarding Message] Received Claude response, length: ${claudeResponse.length}`);
    
    // Save Claude response
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: claudeResponse }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    
    // Write file with error handling
    try {
      await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
      console.log(`[Onboarding Message] Successfully saved conversation with ${conversationData.messages.length} messages`);
    } catch (error) {
      console.error(`[Onboarding Message] CRITICAL: Failed to save conversation file:`, error);
      // Return error but include response so user doesn't lose it
      return res.status(500).json({ 
        error: 'Failed to save conversation', 
        bot_response: claudeResponse,
        warning: 'Your message was processed but may not have been saved. Please contact support.'
      });
    }
    
    // Check if Claude generated a summary (completion)
    const isSummary = detectOnboardingSummary(claudeResponse);
    console.log(`[Onboarding Message] Summary detected: ${isSummary}`);
    
    res.json({
      message_id: conversationData.messages[conversationData.messages.length - 1].message_id,
      bot_response: claudeResponse,
      is_summary: isSummary
    });
    
  } catch (error) {
    console.error(`[Onboarding Message] Unexpected error:`, error);
    res.status(500).json({ error: 'Failed to process message: ' + error.message });
  }
});

// Complete onboarding
router.post('/onboarding/complete', requireAuth, async (req, res) => {
  const email = req.user.email;
  const { conversation_id, summary } = req.body;
  
  console.log(`[Onboarding Complete] User: ${email}, Summary length: ${summary?.length || 0}`);
  
  try {
    if (conversation_id !== 'onboarding' || !summary) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    // Load and update conversation
    const filepath = getConversationPath(email, 'onboarding');
    console.log(`[Onboarding Complete] Reading file: ${filepath}`);
    
    let conversationData;
    try {
      const fileContent = await fs.readFile(filepath, 'utf8');
      conversationData = JSON.parse(fileContent);
    } catch (error) {
      console.error(`[Onboarding Complete] Failed to read conversation:`, error);
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    conversationData.status = 'complete';
    conversationData.summary = summary;
    conversationData.completed_at = new Date().toISOString();
    conversationData.last_updated = new Date().toISOString();
    
    // Save with error handling
    try {
      await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
      console.log(`[Onboarding Complete] Saved conversation file successfully`);
    } catch (error) {
      console.error(`[Onboarding Complete] CRITICAL: Failed to save conversation:`, error);
      return res.status(500).json({ error: 'Failed to save onboarding completion' });
    }
    
    // Mark user onboarding complete
    try {
      await userManager.markOnboardingComplete(email);
      console.log(`[Onboarding Complete] Marked user as complete successfully`);
    } catch (error) {
      console.error(`[Onboarding Complete] CRITICAL: Failed to mark user complete:`, error);
      return res.status(500).json({ error: 'Failed to update user status' });
    }
    
    console.log(`[Onboarding Complete] SUCCESS for user: ${email}`);
    
    res.json({
      success: true,
      onboarding_complete: true
    });
    
  } catch (error) {
    console.error(`[Onboarding Complete] Unexpected error:`, error);
    res.status(500).json({ error: 'Failed to complete onboarding: ' + error.message });
  }
});

// Create new task conversation
router.post('/task/new', requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const user = await userManager.getUserByEmail(email);
    
    if (!user || !user.onboarding_complete) {
      return res.status(400).json({ error: 'Complete onboarding first' });
    }
    
    const conversationId = crypto.randomUUID();
    
    // Create conversation data
    const conversationData = {
      conversation_id: conversationId,
      user_email: email,
      type: 'task',
      title: null, // Will be set after first message
      status: 'active',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      messages: [],
      summary: null
    };
    
    // Save to file
    await ensureConversationsDir(email);
    const filepath = getConversationPath(email, conversationId);
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    // Generate greeting
    const greeting = "What task or aspect of your job would you like to describe?";
    
    // Save greeting message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: greeting }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    res.json({
      conversation_id: conversationId,
      greeting
    });
    
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Send message in task conversation
router.post('/task/message', requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const { conversation_id, message, attachments } = req.body;
    
    if (!conversation_id || !message || !message.trim()) {
      return res.status(400).json({ error: 'Conversation ID and message required' });
    }
    
    // Load conversation
    const filepath = getConversationPath(email, conversation_id);
    let conversationData;
    
    try {
      conversationData = JSON.parse(await fs.readFile(filepath, 'utf8'));
    } catch (error) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversationData.type !== 'task') {
      return res.status(400).json({ error: 'Invalid conversation type' });
    }
    
    // Process attachments if any
    const userContent = [{ type: 'text', text: message }];
    
    if (attachments && attachments.length > 0) {
      const processedAttachments = await processAttachments(
        attachments,
        email,
        conversation_id,
        crypto.randomUUID()
      );
      userContent.push(...processedAttachments);
    }
    
    // Save user message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString()
    });
    
    // Extract title from first user message
    let titleGenerated = false;
    if (!conversationData.title && conversationData.messages.length === 2) {
      // Second message (first user message)
      const title = await claudeService.extractTaskTitle(message);
      conversationData.title = title;
      titleGenerated = true;
    }
    
    // Get onboarding summary for context
    const onboardingPath = getConversationPath(email, 'onboarding');
    let onboardingSummary = '';
    
    try {
      const onboardingData = JSON.parse(await fs.readFile(onboardingPath, 'utf8'));
      onboardingSummary = onboardingData.summary || 'No onboarding summary available.';
    } catch (error) {
      console.log('No onboarding found, proceeding without context');
    }
    
    // Build conversation history for Claude
    const history = conversationData.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Get Claude response
    const claudeResponse = await claudeService.sendTaskMessage(history, message, onboardingSummary);
    
    // Save Claude response
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: claudeResponse }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    res.json({
      message_id: conversationData.messages[conversationData.messages.length - 1].message_id,
      bot_response: claudeResponse,
      title_generated: titleGenerated ? conversationData.title : null
    });
    
  } catch (error) {
    console.error('Error processing task message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// List all conversations for user
router.get('/list', requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userDir = path.join(CONVERSATIONS_DIR, sanitized);
    
    const conversations = [];
    
    try {
      const files = await fs.readdir(userDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(userDir, file);
          const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
          
          conversations.push({
            conversation_id: data.conversation_id,
            type: data.type,
            title: data.type === 'onboarding' ? 'Onboarding' : data.title,
            status: data.status,
            created_at: data.created_at,
            last_updated: data.last_updated,
            message_count: data.messages.length
          });
        }
      }
      
    } catch (error) {
      // No conversations directory yet
    }
    
    // Sort by last_updated (most recent first)
    conversations.sort((a, b) => 
      new Date(b.last_updated) - new Date(a.last_updated)
    );
    
    res.json({ conversations });
    
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// Load specific conversation
router.get('/:conversation_id', requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const { conversation_id } = req.params;
    
    const filepath = getConversationPath(email, conversation_id);
    
    try {
      const data = await fs.readFile(filepath, 'utf8');
      const conversation = JSON.parse(data);
      
      // Format messages for frontend
      const formattedMessages = conversation.messages.map(msg => {
        // Handle both old format (string content) and new format (array content)
        let content = msg.content;
        
        if (typeof content === 'string') {
          content = [{ type: 'text', text: content }];
        }
        
        return {
          message_id: msg.message_id,
          role: msg.role,
          content: content,
          timestamp: msg.timestamp
        };
      });
      
      res.json({
        conversation: {
          conversation_id: conversation.conversation_id,
          type: conversation.type,
          title: conversation.type === 'onboarding' ? 'Onboarding' : conversation.title,
          status: conversation.status,
          created_at: conversation.created_at,
          last_updated: conversation.last_updated,
          messages: formattedMessages
        }
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error loading conversation:', error);
    res.status(500).json({ error: 'Failed to load conversation' });
  }
});

// Delete task conversation
router.delete('/:conversation_id', requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const { conversation_id } = req.params;
    
    if (conversation_id === 'onboarding') {
      return res.status(400).json({ error: 'Cannot delete onboarding conversation' });
    }
    
    const filepath = getConversationPath(email, conversation_id);
    
    try {
      // Load conversation to check for attachments
      const data = await fs.readFile(filepath, 'utf8');
      const conversation = JSON.parse(data);
      
      // Delete attachments folder if exists
      const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const attachmentsDir = path.join(CONVERSATIONS_DIR, sanitized, 'attachments', conversation_id);
      
      try {
        const attachmentFiles = await fs.readdir(attachmentsDir);
        let freedStorage = 0;
        
        for (const file of attachmentFiles) {
          const stats = await fs.stat(path.join(attachmentsDir, file));
          freedStorage += stats.size;
          await fs.unlink(path.join(attachmentsDir, file));
        }
        
        await fs.rmdir(attachmentsDir);
        
        // Update user storage
        if (freedStorage > 0) {
          await userManager.updateStorageUsed(email, -(freedStorage / 1024));
        }
        
      } catch (error) {
        // No attachments or already deleted
      }
      
      // Delete conversation file
      await fs.unlink(filepath);
      
      res.json({
        success: true,
        message: 'Conversation deleted'
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Helper: Process file attachments
async function processAttachments(attachments, email, conversationId, messageId) {
  const processed = [];
  
  for (const attachment of attachments) {
    // Validate file
    if (!attachment.type || !attachment.data || !attachment.name) {
      continue;
    }
    
    // Check file type
    if (!ALLOWED_TYPES[attachment.type]) {
      continue;
    }
    
    // Check file size
    const sizeBytes = Buffer.from(attachment.data, 'base64').length;
    if (sizeBytes > MAX_FILE_SIZE) {
      continue;
    }
    
    const sizeKB = sizeBytes / 1024;
    
    // Check user quota
    const hasQuota = await userManager.hasStorageQuota(email, sizeKB);
    if (!hasQuota) {
      continue; // Skip if over quota
    }
    
    // Save file
    const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const attachmentsDir = path.join(CONVERSATIONS_DIR, sanitized, 'attachments', conversationId);
    await fs.mkdir(attachmentsDir, { recursive: true });
    
    const ext = path.extname(attachment.name) || ALLOWED_TYPES[attachment.type][0];
    const filename = `${messageId}_${Date.now()}${ext}`;
    const filepath = path.join(attachmentsDir, filename);
    
    await fs.writeFile(filepath, Buffer.from(attachment.data, 'base64'));
    
    // Update user storage
    await userManager.updateStorageUsed(email, sizeKB);
    
    // Add to Claude content
    if (attachment.type.startsWith('image/')) {
      processed.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.type,
          data: attachment.data
        }
      });
    } else if (attachment.type === 'application/pdf') {
      processed.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: attachment.data
        }
      });
    }
  }
  
  return processed;
}

// Helper: Detect if Claude generated onboarding summary
function detectOnboardingSummary(message) {
  // Updated to match new prompt format
  const indicators = [
    'PRIMARY RESPONSIBILITIES:',
    'PRIMARY STRATEGIC IMPERATIVES:',
    'TOOLS & SYSTEMS:',
    'KEY PROGRAMS/INITIATIVES:',
    'TIME ALLOCATION:',
    'KEY PAIN POINTS:',
    'COLLABORATION PATTERNS:',
    'STRENGTHS & INTERESTS:',
    'Does this accurately capture your role'
  ];
  
  let matchCount = 0;
  const foundIndicators = [];
  
  for (const indicator of indicators) {
    if (message.includes(indicator)) {
      matchCount++;
      foundIndicators.push(indicator);
    }
  }
  
  console.log(`[Summary Detection] Found ${matchCount} indicators:`, foundIndicators);
  
  // Need at least 4 indicators to be confident it's a summary
  return matchCount >= 4;
}

module.exports = router;