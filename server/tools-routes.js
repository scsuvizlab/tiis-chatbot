// Tools API Routes
// Endpoints for querying and analyzing tools/platforms usage

const express = require('express');
const router = express.Router();
const toolsManager = require('./tools-manager');

// Admin authentication middleware (reuse from admin.js)
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const password = authHeader.substring(7);
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  
  next();
}

// Apply admin auth to all tools routes
router.use(requireAdminAuth);

/**
 * GET /api/tools
 * Get all tools used across all users and conversations
 * Returns aggregated list with usage statistics
 */
router.get('/', async (req, res) => {
  try {
    console.log('[Tools API] Getting all tools');
    const tools = await toolsManager.getAllTools();
    
    res.json({
      success: true,
      count: tools.length,
      tools: tools
    });
    
  } catch (error) {
    console.error('[Tools API] Error getting all tools:', error);
    res.status(500).json({ 
      error: 'Failed to get tools',
      message: error.message 
    });
  }
});

/**
 * GET /api/tools/stats
 * Get tools statistics summary
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('[Tools API] Getting tools stats');
    const stats = await toolsManager.getToolsStats();
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('[Tools API] Error getting tools stats:', error);
    res.status(500).json({ 
      error: 'Failed to get tools stats',
      message: error.message 
    });
  }
});

/**
 * GET /api/tools/by-user/:email
 * Get tools used by a specific user
 */
router.get('/by-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('[Tools API] Getting tools for user:', email);
    
    const tools = await toolsManager.getToolsByUser(email);
    
    res.json({
      success: true,
      email: email,
      count: tools.length,
      tools: tools
    });
    
  } catch (error) {
    console.error('[Tools API] Error getting tools for user:', error);
    res.status(500).json({ 
      error: 'Failed to get user tools',
      message: error.message 
    });
  }
});

/**
 * GET /api/tools/detail/:toolName
 * Get detailed information about a specific tool
 * Shows which users use it and in which conversations
 */
router.get('/detail/:toolName', async (req, res) => {
  try {
    const toolName = decodeURIComponent(req.params.toolName);
    console.log('[Tools API] Getting details for tool:', toolName);
    
    const details = await toolsManager.getToolDetails(toolName);
    
    res.json({
      success: true,
      details: details
    });
    
  } catch (error) {
    console.error('[Tools API] Error getting tool details:', error);
    res.status(500).json({ 
      error: 'Failed to get tool details',
      message: error.message 
    });
  }
});

/**
 * GET /api/tools/by-category
 * Get tools grouped by category
 */
router.get('/by-category', async (req, res) => {
  try {
    console.log('[Tools API] Getting tools by category');
    const stats = await toolsManager.getToolsStats();
    
    res.json({
      success: true,
      categories: stats.by_category
    });
    
  } catch (error) {
    console.error('[Tools API] Error getting tools by category:', error);
    res.status(500).json({ 
      error: 'Failed to get tools by category',
      message: error.message 
    });
  }
});

module.exports = router;
