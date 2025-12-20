// Conversation Manager - Complete with all endpoints
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const claudeService = require('./claude-service');
const userManager = require('./user-manager');
const { requireAuth } = require('./auth');

const CONVERSATIONS_DIR = path.join(__dirname, '../data/conversations');

// Ensure conversations directory exists
async function ensureConversationsDir(email) {
  const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const userDir = path.join(CONVERSATIONS_DIR, sanitized);
  
  try {
    await fs.mkdir(userDir, { recursive: true });
  } catch (error) {
    console.error('Error creating conversations directory:', error);
  }
}

// Get conversation file path
function getConversationPath(email, conversationId) {
  const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const filename = conversationId === 'onboarding' 
    ? 'onboarding.json' 
    : `task_${conversationId}.json`;
  return path.join(CONVERSATIONS_DIR, sanitized, filename);
}

// ============================================
// ONBOARDING ROUTES
// ============================================

// Start onboarding conversation
router.post('/onboarding/start', requireAuth, async (req, res) => {
  const email = req.user.email;
  
  console.log(`\n🎯 [Onboarding Start] User: ${email}`);
  
  try {
    const user = await userManager.getUserByEmail(email);
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.onboarding_complete) {
      console.log(`⚠️  User already completed onboarding: ${email}`);
      return res.status(400).json({ error: 'Onboarding already completed' });
    }
    
    // Create conversation directory
    await ensureConversationsDir(email);
    
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
    
    // Save conversation file
    const filepath = getConversationPath(email, 'onboarding');
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    // Generate greeting
    const greeting = `Welcome to TIIS, ${user.name}! Let's start by understanding your role at Greater St. Cloud Development Corporation. What's your job title?`;
    
    // Save greeting message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: greeting }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    console.log(`✅ [Onboarding Start] Success for: ${email}`);
    
    res.json({
      conversation_id: 'onboarding',
      greeting
    });
    
  } catch (error) {
    console.error(`❌ [Onboarding Start] Error:`, error);
    res.status(500).json({ 
      error: 'Failed to start onboarding',
      details: error.message 
    });
  }
});

// Send message in onboarding
router.post('/onboarding/message', requireAuth, async (req, res) => {
  const email = req.user.email;
  const { conversation_id, message } = req.body;
  
  console.log(`📝 [Onboarding Message] User: ${email}`);
  
  try {
    if (conversation_id !== 'onboarding') {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    // Load conversation
    const filepath = getConversationPath(email, 'onboarding');
    const fileContent = await fs.readFile(filepath, 'utf8');
    const conversationData = JSON.parse(fileContent);
    
    // Save user message
    const userContent = [{ type: 'text', text: message }];
    
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString()
    });
    
    // Format messages for Claude API (only role and content)
    const history = conversationData.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Get bot response from Claude
    const botResponse = await claudeService.sendOnboardingMessage(
      history,
      email
    );
    
    // Save bot message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: botResponse }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    console.log(`✅ [Onboarding Message] Success`);
    
    res.json({
      message_id: conversationData.messages[conversationData.messages.length - 1].message_id,
      bot_response: botResponse
    });
    
  } catch (error) {
    console.error(`❌ [Onboarding Message] Error:`, error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });
  }
});

// Complete onboarding
router.post('/onboarding/complete', requireAuth, async (req, res) => {
  const email = req.user.email;
  const { summary } = req.body;
  
  console.log(`✅ [Onboarding Complete] User: ${email}`);
  
  try {
    const filepath = getConversationPath(email, 'onboarding');
    const fileContent = await fs.readFile(filepath, 'utf8');
    const conversationData = JSON.parse(fileContent);
    
    conversationData.status = 'complete';
    conversationData.summary = summary;
    conversationData.completed_at = new Date().toISOString();
    conversationData.last_updated = new Date().toISOString();
    
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    // Mark user onboarding complete
    await userManager.markOnboardingComplete(email);
    
    console.log(`✅ [Onboarding Complete] Success`);
    
    res.json({
      success: true,
      onboarding_complete: true
    });
    
  } catch (error) {
    console.error(`❌ [Onboarding Complete] Error:`, error);
    res.status(500).json({ 
      error: 'Failed to complete onboarding',
      details: error.message 
    });
  }
});

// ============================================
// TASK ROUTES
// ============================================

// Create new task conversation
router.post('/task/new', requireAuth, async (req, res) => {
  console.log(`📋 [Task New] User: ${req.user.email}`);
  
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
      title: null,
      status: 'active',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      messages: [],
      summary: null
    };
    
    await ensureConversationsDir(email);
    const filepath = getConversationPath(email, conversationId);
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    const greeting = "What task or aspect of your job would you like to describe?";
    
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: greeting }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    console.log(`✅ [Task New] Created: ${conversationId}`);
    
    res.json({
      conversation_id: conversationId,
      greeting
    });
    
  } catch (error) {
    console.error(`❌ [Task New] Error:`, error);
    res.status(500).json({ 
      error: 'Failed to create task',
      details: error.message 
    });
  }
});

// Send message in task conversation
router.post('/task/message', requireAuth, async (req, res) => {
  const email = req.user.email;
  const { conversation_id, message } = req.body;
  
  console.log(`📝 [Task Message] User: ${email}, Conv: ${conversation_id}`);
  
  try {
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const filepath = getConversationPath(email, conversation_id);
    const fileContent = await fs.readFile(filepath, 'utf8');
    const conversationData = JSON.parse(fileContent);
    
    // Save user message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: message }],
      timestamp: new Date().toISOString()
    });
    
    // Generate title if first message
    let titleGenerated = null;
    if (!conversationData.title) {
      titleGenerated = await claudeService.extractTaskTitle(message);
      conversationData.title = titleGenerated;
    }
    
    // Format messages for Claude API (only role and content)
    const history = conversationData.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Get bot response
    const botResponse = await claudeService.sendTaskMessage(
      history,
      email
    );
    
    // Save bot message
    conversationData.messages.push({
      message_id: crypto.randomUUID(),
      role: 'assistant',
      content: [{ type: 'text', text: botResponse }],
      timestamp: new Date().toISOString()
    });
    
    conversationData.last_updated = new Date().toISOString();
    await fs.writeFile(filepath, JSON.stringify(conversationData, null, 2), 'utf8');
    
    console.log(`✅ [Task Message] Success`);
    
    res.json({
      message_id: conversationData.messages[conversationData.messages.length - 1].message_id,
      bot_response: botResponse,
      title_generated: titleGenerated
    });
    
  } catch (error) {
    console.error(`❌ [Task Message] Error:`, error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });
  }
});

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

// List all conversations
router.get('/list', requireAuth, async (req, res) => {
  console.log(`📋 [List] User: ${req.user.email}`);
  
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
      console.log(`📭 No conversations yet for: ${email}`);
    }
    
    conversations.sort((a, b) => 
      new Date(b.last_updated) - new Date(a.last_updated)
    );
    
    res.json({ conversations });
    
  } catch (error) {
    console.error(`❌ [List] Error:`, error);
    res.status(500).json({ 
      error: 'Failed to list conversations',
      details: error.message 
    });
  }
});

// Load specific conversation
router.get('/:conversation_id', requireAuth, async (req, res) => {
  const email = req.user.email;
  const { conversation_id } = req.params;
  
  console.log(`📖 [Load] User: ${email}, Conv: ${conversation_id}`);
  
  try {
    const filepath = getConversationPath(email, conversation_id);
    const data = await fs.readFile(filepath, 'utf8');
    const conversation = JSON.parse(data);
    
    const formattedMessages = conversation.messages.map(msg => {
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
        message_count: conversation.messages.length,
        messages: formattedMessages,
        summary: conversation.summary
      }
    });
    
  } catch (error) {
    console.error(`❌ [Load] Error:`, error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to load conversation',
      details: error.message 
    });
  }
});

// Delete conversation
router.delete('/:conversation_id', requireAuth, async (req, res) => {
  const email = req.user.email;
  const { conversation_id } = req.params;
  
  console.log(`🗑️  [Delete] User: ${email}, Conv: ${conversation_id}`);
  
  try {
    if (conversation_id === 'onboarding') {
      return res.status(400).json({ error: 'Cannot delete onboarding conversation' });
    }
    
    const filepath = getConversationPath(email, conversation_id);
    await fs.unlink(filepath);
    
    console.log(`✅ [Delete] Success`);
    
    res.json({
      success: true,
      message: 'Conversation deleted'
    });
    
  } catch (error) {
    console.error(`❌ [Delete] Error:`, error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete conversation',
      details: error.message 
    });
  }
});

module.exports = router;