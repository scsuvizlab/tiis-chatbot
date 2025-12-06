const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const userManager = require('./user-manager');
const claudeService = require('./claude-service');
const { hashPassword } = require('./auth');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const CONVERSATIONS_DIR = path.join(__dirname, '../data/conversations');

// Admin login (verify password) - NO AUTH REQUIRED FOR THIS ROUTE
router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({
      success: true,
      token: password // Simple - just use password as token
    });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Admin auth middleware
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

// Apply auth to all OTHER admin routes (not login)
router.use(requireAdminAuth);

// Get all users with stats
router.get('/users', async (req, res) => {
  try {
    const users = await userManager.getAllUsers();
    
    // Get stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await userManager.getUserStats(user.email);
        return stats;
      })
    );
    
    // Calculate totals
    const stats = {
      total_users: usersWithStats.length,
      onboarding_complete: usersWithStats.filter(u => u.onboarding_complete).length,
      total_tasks: usersWithStats.reduce((sum, u) => sum + u.task_count, 0),
      total_messages: usersWithStats.reduce((sum, u) => sum + u.total_messages, 0),
      total_storage_mb: usersWithStats.reduce((sum, u) => sum + u.storage_used_mb, 0)
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

// Create new user
router.post('/users/create', async (req, res) => {
  try {
    const { email, name, role, temp_password } = req.body;
    
    if (!email || !name || !role || !temp_password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    // Check if user already exists
    const existing = await userManager.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const passwordHash = await hashPassword(temp_password);
    
    // Create user
    const user = await userManager.createUser(email, name, role, true, passwordHash);
    
    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        temp_password: temp_password // Send back for admin to share with user
      }
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Reset user password
router.post('/users/reset-password', async (req, res) => {
  try {
    const { email, new_password } = req.body;
    
    if (!email || !new_password) {
      return res.status(400).json({ error: 'Email and new password required' });
    }
    
    // Get user
    const user = await userManager.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash new password
    const passwordHash = await hashPassword(new_password);
    
    // Update user with temp password flag
    user.password_hash = passwordHash;
    user.temp_password = true; // Force password change on next login
    await userManager.updateUser(user);
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      temp_password: new_password
    });
    
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user
router.delete('/users/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Get user
    const user = await userManager.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user's conversations directory
    const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userConversationsDir = path.join(CONVERSATIONS_DIR, sanitized);
    
    try {
      // Recursively delete conversations directory
      await fs.rm(userConversationsDir, { recursive: true, force: true });
    } catch (error) {
      console.log('No conversations directory to delete or already deleted');
    }
    
    // Delete user file
    await userManager.deleteUser(email);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all conversations for a specific user
router.get('/conversations/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
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
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    res.json({ conversations });
    
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Corporation-wide analysis
router.post('/analyze/corporation', async (req, res) => {
  try {
    const users = await userManager.getAllUsers();
    
    // Gather all conversations
    const allData = [];
    
    for (const user of users) {
      const sanitized = user.email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const userDir = path.join(CONVERSATIONS_DIR, sanitized);
      
      let onboardingSummary = '';
      const tasks = [];
      
      try {
        const files = await fs.readdir(userDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filepath = path.join(userDir, file);
            const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
            
            if (data.type === 'onboarding' && data.summary) {
              onboardingSummary = data.summary;
            } else if (data.type === 'task') {
              tasks.push({
                title: data.title,
                messages: data.messages.length,
                last_updated: data.last_updated
              });
            }
          }
        }
      } catch (error) {
        // User might not have conversations yet
      }
      
      if (onboardingSummary || tasks.length > 0) {
        allData.push({
          name: user.name,
          role: user.role,
          onboarding_summary: onboardingSummary,
          tasks: tasks
        });
      }
    }
    
    if (allData.length === 0) {
      return res.status(400).json({ error: 'No data to analyze yet' });
    }
    
    // Format for Claude
    const formattedData = allData.map(user => {
      return `
## ${user.name} - ${user.role}

### Onboarding Summary:
${user.onboarding_summary || 'Not completed'}

### Tasks Documented (${user.tasks.length} total):
${user.tasks.map(t => `- ${t.title} (${t.messages} messages)`).join('\n')}
`;
    }).join('\n---\n');
    
    // Generate analysis
    const analysis = await claudeService.generateCorporationAnalysis(formattedData);
    
    res.json({
      analysis,
      generated_at: new Date().toISOString(),
      users_analyzed: allData.length
    });
    
  } catch (error) {
    console.error('Error running corporation analysis:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// Individual user analysis
router.post('/analyze/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await userManager.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userDir = path.join(CONVERSATIONS_DIR, sanitized);
    
    let onboardingSummary = '';
    const taskConversations = [];
    
    try {
      const files = await fs.readdir(userDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(userDir, file);
          const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
          
          if (data.type === 'onboarding' && data.summary) {
            onboardingSummary = data.summary;
          } else if (data.type === 'task') {
            // Extract conversation snippets
            const snippets = data.messages
              .filter(m => m.role === 'user')
              .map(m => {
                const text = Array.isArray(m.content) 
                  ? m.content.find(c => c.type === 'text')?.text || ''
                  : m.content;
                return text;
              })
              .join('\n');
            
            taskConversations.push({
              title: data.title,
              snippets: snippets
            });
          }
        }
      }
    } catch (error) {
      // User might not have conversations
    }
    
    if (!onboardingSummary && taskConversations.length === 0) {
      return res.status(400).json({ error: 'No data to analyze for this user' });
    }
    
    // Format for Claude
    const formattedConversations = taskConversations.map(t => {
      return `### ${t.title}\n${t.snippets}`;
    }).join('\n\n');
    
    const employeeData = {
      name: user.name,
      role: user.role,
      conversations: `
## Onboarding Summary:
${onboardingSummary}

## Task Conversations:
${formattedConversations}
`
    };
    
    // Generate analysis
    const analysis = await claudeService.generateIndividualAnalysis(employeeData);
    
    res.json({
      analysis,
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      },
      tasks_analyzed: taskConversations.length
    });
    
  } catch (error) {
    console.error('Error running individual analysis:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// Export all data
router.get('/export/all', async (req, res) => {
  try {
    const users = await userManager.getAllUsers();
    
    const exportData = {
      export_date: new Date().toISOString(),
      users: [],
      conversations: []
    };
    
    for (const user of users) {
      exportData.users.push({
        name: user.name,
        email: user.email,
        role: user.role,
        onboarding_complete: user.onboarding_complete,
        storage_used_mb: user.storage_used_mb,
        created_at: user.created_at,
        last_login: user.last_login
      });
      
      const sanitized = user.email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const userDir = path.join(CONVERSATIONS_DIR, sanitized);
      
      try {
        const files = await fs.readdir(userDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filepath = path.join(userDir, file);
            const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
            exportData.conversations.push(data);
          }
        }
      } catch (error) {
        // User might not have conversations
      }
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tiis-export.json"');
    res.json(exportData);
    
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;