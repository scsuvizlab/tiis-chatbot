const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 3000;

/**
 * Send message in onboarding conversation
 * @param {Array} conversationHistory - Array of {role, content} messages
 * @param {string} userMessage - New user message
 * @param {string} userEmail - Optional user email for personalized context
 * @returns {Promise<string>} Claude's response
 */
async function sendOnboardingMessage(conversationHistory, userMessage, userEmail = null) {
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];
  
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: config.getOnboardingSystemPrompt(userEmail),
    messages: messages
  });
  
  return response.content[0].text;
}

/**
 * Send message in task conversation
 * @param {Array} conversationHistory - Array of {role, content} messages
 * @param {string} userMessage - New user message
 * @param {string} onboardingSummary - User's onboarding summary for context
 * @returns {Promise<string>} Claude's response
 */
async function sendTaskMessage(conversationHistory, userMessage, onboardingSummary) {
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];
  
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: config.getTaskSystemPrompt(onboardingSummary),
    messages: messages
  });
  
  return response.content[0].text;
}

/**
 * Extract task title from first user message
 * @param {string} userMessage - First message describing the task
 * @returns {Promise<string>} Extracted title
 */
async function extractTaskTitle(userMessage) {
  const prompt = `Extract a concise task title from this message. The title should be:
- Under 50 characters
- Title Case
- Specific and descriptive
- No articles (a, an, the) at the start

User message: "${userMessage}"

Respond with ONLY the title, nothing else.

Examples:
"I'm documenting invoice reconciliation" → Invoice Reconciliation
"Let me tell you about our grant reporting process" → Grant Reporting Process
"I want to describe how I handle business inquiries" → Business Inquiry Handling
"This is about the monthly board meeting prep" → Monthly Board Meeting Prep

Now extract the title:`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 50,
    messages: [{ role: 'user', content: prompt }]
  });
  
  let title = response.content[0].text.trim();
  
  // Remove quotes if present
  title = title.replace(/^["']|["']$/g, '');
  
  // Truncate if too long
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  
  // Fallback if extraction failed
  if (!title || title.length < 3) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    title = `Task - ${timestamp}`;
  }
  
  return title;
}

/**
 * Format conversation with attachments for Claude
 * @param {Array} messages - Messages with potential attachments
 * @returns {Array} Formatted messages for Claude API
 */
function formatMessagesWithAttachments(messages) {
  return messages.map(msg => {
    if (msg.role === 'user' && msg.content && Array.isArray(msg.content)) {
      // Message has attachments
      return {
        role: 'user',
        content: msg.content // Already in Claude format
      };
    } else {
      // Simple text message
      return {
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content[0].text
      };
    }
  });
}

/**
 * Generate corporation-wide analysis
 * @param {Array} allConversations - All user conversations formatted for analysis
 * @returns {Promise<string>} Analysis report
 */
async function generateCorporationAnalysis(allConversations) {
  const prompt = config.getCorporationAnalysisPrompt(allConversations);
  
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000, // Longer for comprehensive analysis
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.content[0].text;
}

/**
 * Generate individual employee analysis
 * @param {Object} employeeData - Employee info and conversations
 * @returns {Promise<string>} Individual analysis report
 */
async function generateIndividualAnalysis(employeeData) {
  const prompt = config.getIndividualAnalysisPrompt(employeeData);
  
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.content[0].text;
}

module.exports = {
  sendOnboardingMessage,
  sendTaskMessage,
  extractTaskTitle,
  formatMessagesWithAttachments,
  generateCorporationAnalysis,
  generateIndividualAnalysis
};