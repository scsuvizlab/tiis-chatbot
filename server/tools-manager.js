// Tools Manager - UPDATED VERSION
// Service for aggregating and querying tools/platforms used across conversations
// NOW INCLUDES: Social media, video editing, forms, calendars, and more

const fs = require('fs').promises;
const path = require('path');

const CONVERSATIONS_DIR = path.join(__dirname, '../data/conversations');

/**
 * Extract tools mentioned in conversation text
 * UPDATED: Now detects 150+ tools including social media, video, forms
 */
function extractToolsFromText(text) {
  const tools = new Set();
  const lowerText = text.toLowerCase();
  
  // EXPANDED: Common software/platforms to look for
  const knownTools = [
    // Microsoft Office & 365
    'excel', 'microsoft excel', 'word', 'microsoft word', 'powerpoint', 'microsoft powerpoint',
    'outlook', 'microsoft outlook', 'teams', 'microsoft teams', 'microsoft 365', 'office 365',
    'sharepoint', 'onedrive', 'onenote', 'access', 'publisher',
    'ms forms', 'microsoft forms', 'forms', // ADDED
    
    // Google Workspace
    'gmail', 'google drive', 'google docs', 'google sheets', 'google slides',
    'google calendar', 'google meet', 'google workspace',
    'drive', 'docs', 'sheets', 'slides', 'calendar', // Short names
    
    // Communication & Video
    'slack', 'zoom', 'skype', 'discord', 'webex', 'gotomeeting',
    'telegram', 'whatsapp', 'signal',
    
    // Social Media - ADDED
    'facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'snapchat',
    'youtube', 'pinterest', 'reddit',
    
    // Project Management
    'asana', 'trello', 'monday.com', 'monday', 'jira', 'basecamp', 'clickup', 'notion',
    'wrike', 'smartsheet', 'airtable',
    
    // CRM & Sales
    'salesforce', 'hubspot', 'zoho', 'pipedrive', 'freshsales',
    'zendesk', 'intercom', 'drift',
    
    // Finance & Accounting
    'quickbooks', 'xero', 'freshbooks', 'sage', 'netsuite', 'bill.com',
    'expensify', 'concur',
    
    // Design & Creative - EXPANDED
    'figma', 'adobe', 'photoshop', 'illustrator', 'indesign', 'canva', 'sketch',
    'adobe photoshop', 'adobe illustrator', 'adobe indesign',
    'premiere', 'after effects', 'lightroom',
    'clipchamp', 'camtasia', 'screenflow', // ADDED video editing
    
    // Development & DevOps
    'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
    'docker', 'kubernetes', 'jenkins', 'aws', 'azure',
    
    // Email Marketing & Automation
    'mailchimp', 'constant contact', 'sendgrid', 'campaignmonitor',
    'activecampaign', 'convertkit',
    
    // Social Media Management - ADDED
    'hootsuite', 'buffer', 'sprout social', 'later', 'planoly',
    
    // File Storage & Sharing
    'dropbox', 'box', 'evernote', 'google drive',
    
    // Forms & Surveys - ADDED
    'typeform', 'surveymonkey', 'google forms', 'jotform', 'formstack',
    
    // Calendar & Scheduling - ADDED
    'calendly', 'doodle', 'acuity', 'schedulonce',
    
    // Analytics
    'google analytics', 'mixpanel', 'amplitude', 'tableau', 'power bi',
    
    // E-commerce
    'shopify', 'woocommerce', 'magento', 'bigcommerce', 'squarespace',
    
    // HR & Recruiting
    'bamboohr', 'workday', 'adp', 'gusto', 'namely',
    'greenhouse', 'lever', 'indeed',
    
    // Other Popular Tools
    'zapier', 'ifttt', 'stripe', 'paypal', 'square',
    'mailgun', 'twilio', 'sendgrid'
  ];
  
  knownTools.forEach(tool => {
    // Look for whole word matches (case insensitive)
    const regex = new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      // Capitalize properly (handle multi-word tools)
      const properName = tool.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      tools.add(properName);
    }
  });
  
  return Array.from(tools);
}

/**
 * Categorize a tool into a category
 * UPDATED: New categories for social media, video, forms
 */
function categorizeTool(toolName) {
  const lower = toolName.toLowerCase();
  
  // Office Suite
  if (['excel', 'word', 'powerpoint', 'google sheets', 'google docs', 'google slides', 
       'office 365', 'microsoft 365', 'sheets', 'docs', 'slides'].some(t => lower.includes(t))) {
    return 'Office Suite';
  }
  
  // Communication & Meetings
  if (['slack', 'teams', 'zoom', 'gmail', 'outlook', 'skype', 'discord', 'meet', 
       'webex', 'telegram', 'whatsapp', 'signal'].some(t => lower.includes(t))) {
    return 'Communication';
  }
  
  // Social Media - NEW
  if (['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'snapchat', 
       'youtube', 'pinterest', 'reddit'].some(t => lower.includes(t))) {
    return 'Social Media';
  }
  
  // Social Media Management - NEW
  if (['hootsuite', 'buffer', 'sprout', 'later', 'planoly'].some(t => lower.includes(t))) {
    return 'Social Media Management';
  }
  
  // Project Management
  if (['asana', 'trello', 'monday', 'jira', 'basecamp', 'notion', 'clickup', 
       'wrike', 'smartsheet'].some(t => lower.includes(t))) {
    return 'Project Management';
  }
  
  // CRM
  if (['salesforce', 'hubspot', 'zoho', 'pipedrive', 'freshsales', 
       'zendesk', 'intercom'].some(t => lower.includes(t))) {
    return 'CRM';
  }
  
  // Finance/Accounting
  if (['quickbooks', 'xero', 'freshbooks', 'sage', 'netsuite', 'bill.com', 
       'expensify', 'concur'].some(t => lower.includes(t))) {
    return 'Finance/Accounting';
  }
  
  // Design & Creative
  if (['figma', 'adobe', 'photoshop', 'illustrator', 'canva', 'sketch', 
       'indesign', 'premiere', 'lightroom'].some(t => lower.includes(t))) {
    return 'Design';
  }
  
  // Video Editing - NEW
  if (['clipchamp', 'camtasia', 'screenflow', 'premiere', 'after effects'].some(t => lower.includes(t))) {
    return 'Video Editing';
  }
  
  // Forms & Surveys - NEW
  if (['forms', 'typeform', 'surveymonkey', 'jotform', 'formstack'].some(t => lower.includes(t))) {
    return 'Forms & Surveys';
  }
  
  // Calendar & Scheduling - NEW
  if (['calendar', 'calendly', 'doodle', 'acuity', 'schedulonce'].some(t => lower.includes(t))) {
    return 'Calendar & Scheduling';
  }
  
  // Development
  if (['github', 'gitlab', 'bitbucket', 'docker', 'kubernetes', 'jenkins'].some(t => lower.includes(t))) {
    return 'Development';
  }
  
  // File Storage
  if (['dropbox', 'box', 'drive', 'onedrive', 'sharepoint', 'evernote'].some(t => lower.includes(t))) {
    return 'File Storage';
  }
  
  // Analytics
  if (['analytics', 'mixpanel', 'amplitude', 'tableau', 'power bi'].some(t => lower.includes(t))) {
    return 'Analytics';
  }
  
  // E-commerce
  if (['shopify', 'woocommerce', 'magento', 'bigcommerce', 'squarespace'].some(t => lower.includes(t))) {
    return 'E-commerce';
  }
  
  // HR
  if (['bamboohr', 'workday', 'adp', 'gusto', 'greenhouse', 'lever'].some(t => lower.includes(t))) {
    return 'HR & Recruiting';
  }
  
  // Email Marketing
  if (['mailchimp', 'constant contact', 'sendgrid', 'campaignmonitor', 
       'activecampaign'].some(t => lower.includes(t))) {
    return 'Email Marketing';
  }
  
  return 'Other';
}

/**
 * Get all tools mentioned across all users and conversations
 * Returns aggregated data with usage statistics
 */
async function getAllTools() {
  const toolsData = {};
  
  try {
    // Read all user directories
    const userDirs = await fs.readdir(CONVERSATIONS_DIR);
    
    for (const userDir of userDirs) {
      const userPath = path.join(CONVERSATIONS_DIR, userDir);
      const stat = await fs.stat(userPath);
      
      if (!stat.isDirectory()) continue;
      
      // Extract email from directory name
      const email = userDir.replace('_at_', '@').replace(/_/g, '.');
      
      // Read all conversation files
      const files = await fs.readdir(userPath);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filepath = path.join(userPath, file);
        const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
        
        // Extract tools from conversation messages
        const conversationTools = new Set();
        
        data.messages.forEach(msg => {
          if (msg.content) {
            // Handle both string and array content
            const text = Array.isArray(msg.content)
              ? msg.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
              : msg.content;
            
            const extracted = extractToolsFromText(text);
            extracted.forEach(tool => conversationTools.add(tool));
          }
        });
        
        // ALSO check summary field (where many tools are mentioned!)
        if (data.summary) {
          const summaryTools = extractToolsFromText(data.summary);
          summaryTools.forEach(tool => conversationTools.add(tool));
        }
        
        // Aggregate tool data
        conversationTools.forEach(tool => {
          if (!toolsData[tool]) {
            toolsData[tool] = {
              tool_name: tool,
              category: categorizeTool(tool),
              total_mentions: 0,
              users: new Set(),
              conversations: new Set(),
              first_mentioned: null,
              last_mentioned: null
            };
          }
          
          toolsData[tool].total_mentions++;
          toolsData[tool].users.add(email);
          toolsData[tool].conversations.add(data.conversation_id);
          
          // Track first/last mentions
          const convDate = new Date(data.created_at);
          if (!toolsData[tool].first_mentioned || convDate < new Date(toolsData[tool].first_mentioned)) {
            toolsData[tool].first_mentioned = data.created_at;
          }
          if (!toolsData[tool].last_mentioned || convDate > new Date(toolsData[tool].last_mentioned)) {
            toolsData[tool].last_mentioned = data.last_updated;
          }
        });
      }
    }
  } catch (error) {
    console.error('Error aggregating tools:', error);
  }
  
  // Convert Sets to Arrays and counts
  const toolsArray = Object.values(toolsData).map(tool => ({
    tool_name: tool.tool_name,
    category: tool.category,
    total_mentions: tool.total_mentions,
    user_count: tool.users.size,
    conversation_count: tool.conversations.size,
    users: Array.from(tool.users),
    conversations: Array.from(tool.conversations),
    first_mentioned: tool.first_mentioned,
    last_mentioned: tool.last_mentioned
  }));
  
  // Sort by user count (most widely used first)
  toolsArray.sort((a, b) => b.user_count - a.user_count || b.total_mentions - a.total_mentions);
  
  return toolsArray;
}

/**
 * Get tools used by a specific user
 */
async function getToolsByUser(email) {
  const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const userPath = path.join(CONVERSATIONS_DIR, sanitized);
  
  const toolsData = {};
  
  try {
    const files = await fs.readdir(userPath);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filepath = path.join(userPath, file);
      const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
      
      // Extract tools from conversation
      data.messages.forEach(msg => {
        if (msg.content) {
          const text = Array.isArray(msg.content)
            ? msg.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
            : msg.content;
          
          const extracted = extractToolsFromText(text);
          extracted.forEach(tool => {
            if (!toolsData[tool]) {
              toolsData[tool] = {
                tool_name: tool,
                category: categorizeTool(tool),
                mentions: 0,
                conversations: []
              };
            }
            
            toolsData[tool].mentions++;
            if (!toolsData[tool].conversations.find(c => c.id === data.conversation_id)) {
              toolsData[tool].conversations.push({
                id: data.conversation_id,
                title: data.type === 'onboarding' ? 'Onboarding' : data.title,
                type: data.type
              });
            }
          });
        }
      });
      
      // Check summary too
      if (data.summary) {
        const summaryTools = extractToolsFromText(data.summary);
        summaryTools.forEach(tool => {
          if (!toolsData[tool]) {
            toolsData[tool] = {
              tool_name: tool,
              category: categorizeTool(tool),
              mentions: 0,
              conversations: []
            };
          }
          
          toolsData[tool].mentions++;
          if (!toolsData[tool].conversations.find(c => c.id === data.conversation_id)) {
            toolsData[tool].conversations.push({
              id: data.conversation_id,
              title: data.type === 'onboarding' ? 'Onboarding' : data.title,
              type: data.type
            });
          }
        });
      }
    }
  } catch (error) {
    console.error(`Error getting tools for user ${email}:`, error);
    return [];
  }
  
  const toolsArray = Object.values(toolsData);
  toolsArray.sort((a, b) => b.mentions - a.mentions);
  
  return toolsArray;
}

/**
 * Get details about a specific tool
 * Shows which users use it and in which tasks
 */
async function getToolDetails(toolName) {
  const details = {
    tool_name: toolName,
    category: categorizeTool(toolName),
    total_mentions: 0,
    users: []
  };
  
  try {
    const userDirs = await fs.readdir(CONVERSATIONS_DIR);
    
    for (const userDir of userDirs) {
      const userPath = path.join(CONVERSATIONS_DIR, userDir);
      const stat = await fs.stat(userPath);
      
      if (!stat.isDirectory()) continue;
      
      const email = userDir.replace('_at_', '@').replace(/_/g, '.');
      const userTools = {
        email,
        mentions: 0,
        conversations: []
      };
      
      const files = await fs.readdir(userPath);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filepath = path.join(userPath, file);
        const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
        
        let conversationMentions = 0;
        
        data.messages.forEach(msg => {
          if (msg.content) {
            const text = Array.isArray(msg.content)
              ? msg.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
              : msg.content;
            
            const extracted = extractToolsFromText(text);
            if (extracted.includes(toolName)) {
              conversationMentions++;
            }
          }
        });
        
        // Check summary
        if (data.summary) {
          const summaryTools = extractToolsFromText(data.summary);
          if (summaryTools.includes(toolName)) {
            conversationMentions++;
          }
        }
        
        if (conversationMentions > 0) {
          userTools.mentions += conversationMentions;
          userTools.conversations.push({
            conversation_id: data.conversation_id,
            title: data.type === 'onboarding' ? 'Onboarding' : data.title,
            type: data.type,
            mentions: conversationMentions
          });
        }
      }
      
      if (userTools.mentions > 0) {
        details.users.push(userTools);
        details.total_mentions += userTools.mentions;
      }
    }
  } catch (error) {
    console.error(`Error getting details for tool ${toolName}:`, error);
  }
  
  // Sort users by mentions
  details.users.sort((a, b) => b.mentions - a.mentions);
  
  return details;
}

/**
 * Get tools statistics summary
 */
async function getToolsStats() {
  const allTools = await getAllTools();
  
  const stats = {
    total_unique_tools: allTools.length,
    total_mentions: allTools.reduce((sum, t) => sum + t.total_mentions, 0),
    most_used_tools: allTools.slice(0, 10),
    by_category: {}
  };
  
  // Group by category
  allTools.forEach(tool => {
    if (!stats.by_category[tool.category]) {
      stats.by_category[tool.category] = {
        count: 0,
        tools: []
      };
    }
    
    stats.by_category[tool.category].count++;
    stats.by_category[tool.category].tools.push({
      tool_name: tool.tool_name,
      user_count: tool.user_count,
      mentions: tool.total_mentions
    });
  });
  
  return stats;
}

module.exports = {
  getAllTools,
  getToolsByUser,
  getToolDetails,
  getToolsStats,
  extractToolsFromText,
  categorizeTool
};
