// Admin Routes - FIXED VERSION
// Fixed createUser call to use correct parameters

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const userManager = require('./user-manager');
const claudeService = require('./claude-service');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const CONVERSATIONS_DIR = path.join(__dirname, '../data/conversations');

// ============================================
// AUTHENTICATION
// ============================================

router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({
      success: true,
      token: password
    });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const password = authHeader.substring(7);
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  
  next();
}

router.use(requireAdminAuth);

// ============================================
// USER MANAGEMENT
// ============================================

router.get('/users', async (req, res) => {
  try {
    const users = await userManager.getAllUsers();
    
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await userManager.getUserStats(user.email);
        return stats;
      })
    );
    
    const stats = {
      total_users: usersWithStats.length,
      onboarding_complete: usersWithStats.filter(u => u.onboarding_complete).length,
      total_tasks: usersWithStats.reduce((sum, u) => sum + u.task_count, 0),
      total_messages: usersWithStats.reduce((sum, u) => sum + u.total_messages, 0)
    };
    
    res.json({
      users: usersWithStats,
      stats
    });
    
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Ã¢Â­Â FIXED: Create new user with correct parameter order
router.post('/users', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    
    console.log('Creating user:', { name, email, role });
    
    // Validate required fields
    if (!name || !email || !role || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, role, password' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }
    
    // Check if user already exists
    try {
      const existingUser = await userManager.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
    } catch (error) {
      // User doesn't exist - this is what we want
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');
    
    // Ã¢Â­Â FIXED: Call createUser with correct parameters
    // Signature: createUser(email, name, role, tempPassword, passwordHash)
    const newUser = await userManager.createUser(
      email,        // email
      name,         // name  
      role,         // role
      true,         // tempPassword flag
      hashedPassword // passwordHash
    );
    
    console.log(`Ã¢Å“â€¦ Admin created new user: ${email}`);
    
    res.json({
      success: true,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at
      }
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
});

// Get all conversations for a specific user
router.get('/users/:email/conversations', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    const user = await userManager.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
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
            message_count: data.messages.length,
            summary: data.summary || null
          });
        }
      }
    } catch (error) {
      console.log(`No conversations found for user: ${email}`);
    }
    
    conversations.sort((a, b) => 
      new Date(b.last_updated) - new Date(a.last_updated)
    );
    
    res.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      },
      conversations
    });
    
  } catch (error) {
    console.error('Error getting user conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get specific conversation detail
router.get('/users/:email/conversations/:conversationId', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const conversationId = req.params.conversationId;
    
    const user = await userManager.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filename = conversationId === 'onboarding' 
      ? 'onboarding.json'
      : `task_${conversationId}.json`;
    const filepath = path.join(CONVERSATIONS_DIR, sanitized, filename);
    
    try {
      const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
      
      const formattedMessages = data.messages.map(msg => {
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
          conversation_id: data.conversation_id,
          type: data.type,
          title: data.type === 'onboarding' ? 'Onboarding' : data.title,
          status: data.status,
          created_at: data.created_at,
          last_updated: data.last_updated,
          message_count: data.messages.length,
          messages: formattedMessages,
          summary: data.summary || null
        }
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error getting conversation detail:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Reset user password
router.post('/users/reset-password', async (req, res) => {
  try {
    const { email, new_password } = req.body;
    
    if (!email || !new_password) {
      return res.status(400).json({ error: 'Email and new password required' });
    }
    
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const user = await userManager.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.password_hash = hashedPassword;
    user.temp_password = true;
    await userManager.updateUser(user);
    
    res.json({ success: true, message: 'Password reset successfully' });
    
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user
router.delete('/users/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    const user = await userManager.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userDir = path.join(CONVERSATIONS_DIR, sanitized);
    
    try {
      await fs.rm(userDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error deleting user conversations:', error);
    }
    
    await userManager.deleteUser(email);
    
    res.json({ success: true, message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// DATA EXPORT
// ============================================

router.get('/export', async (req, res) => {
  try {
    const users = await userManager.getAllUsers();
    const conversations = [];
    
    for (const user of users) {
      const sanitized = user.email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const userDir = path.join(CONVERSATIONS_DIR, sanitized);
      
      try {
        const files = await fs.readdir(userDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filepath = path.join(userDir, file);
            const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
            
            conversations.push({
              ...data,
              user_email: user.email
            });
          }
        }
      } catch (error) {
        // No conversations for this user
      }
    }
    
    res.json({
      export_date: new Date().toISOString(),
      users: users.map(u => ({
        name: u.name,
        email: u.email,
        role: u.role,
        onboarding_complete: u.onboarding_complete,
        storage_used_mb: u.storage_used_mb,
        created_at: u.created_at,
        last_login: u.last_login
      })),
      conversations
    });
    
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Export data for a specific user
router.get('/export/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userManager.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userDir = path.join(CONVERSATIONS_DIR, sanitized);
    const conversations = [];
    
    try {
      const files = await fs.readdir(userDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(userDir, file);
          const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
          conversations.push(data);
        }
      }
    } catch (error) {
      // No conversations for this user - that's ok
    }
    
    // Include attachments metadata
    const attachmentsDir = path.join(userDir, 'attachments');
    let attachments = [];
    try {
      const attachmentFiles = await fs.readdir(attachmentsDir);
      attachments = attachmentFiles.map(f => ({
        filename: f,
        path: `attachments/${f}`
      }));
    } catch (error) {
      // No attachments - that's ok
    }
    
    res.json({
      export_date: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        onboarding_complete: user.onboarding_complete,
        storage_used_mb: user.storage_used_mb,
        created_at: user.created_at,
        last_login: user.last_login,
        knowledge_module_id: user.knowledge_module_id
      },
      conversations,
      attachments_info: {
        count: attachments.length,
        files: attachments
      }
    });
    
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// ============================================
// ANALYSIS (Placeholders)
// ============================================

router.post('/analyze/corporation', async (req, res) => {
  try {
    res.json({
      message: 'Corporation-wide analysis not yet implemented',
      placeholder: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

router.post('/analyze/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    res.json({
      message: `Analysis for ${email} not yet implemented`,
      placeholder: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// ============================================
// KNOWLEDGE MODULES
// ============================================

const knowledgeManager = require('./knowledge-manager');

// List all available knowledge modules
router.get('/knowledge/modules', async (req, res) => {
  try {
    const modules = await knowledgeManager.listAvailableModules();
    
    res.json({
      success: true,
      count: modules.length,
      modules: modules
    });
    
  } catch (error) {
    console.error('Error listing knowledge modules:', error);
    res.status(500).json({ error: 'Failed to list modules' });
  }
});

// Get module details
router.get('/knowledge/modules/:moduleId', async (req, res) => {
  try {
    const moduleId = req.params.moduleId;
    const metadata = await knowledgeManager.getModuleMetadata(moduleId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    res.json({
      success: true,
      module: metadata
    });
    
  } catch (error) {
    console.error('Error getting module metadata:', error);
    res.status(500).json({ error: 'Failed to get module' });
  }
});

// Assign knowledge module to user
router.post('/knowledge/assign', async (req, res) => {
  try {
    const { email, module_id } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // module_id can be null to unassign
    const updatedUser = await userManager.assignKnowledgeModule(email, module_id);
    
    res.json({
      success: true,
      user: {
        email: updatedUser.email,
        name: updatedUser.name,
        knowledge_module_id: updatedUser.knowledge_module_id
      }
    });
    
  } catch (error) {
    console.error('Error assigning knowledge module:', error);
    res.status(500).json({ 
      error: 'Failed to assign module',
      message: error.message 
    });
  }
});

module.exports = router;