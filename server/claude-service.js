// Claude Service - Fixed message formatting
const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 3000;

/**
 * Send message in onboarding conversation
 * @param {Array} messages - Array of {role, content} messages (already formatted, no message_id)
 * @param {string} userEmail - User email for personalized context
 * @returns {Promise<string>} Claude's response
 */
async function sendOnboardingMessage(messages, userEmail = null) {
  console.log(`[Claude Service] Sending ${messages.length} messages to Claude for onboarding`);
  
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: config.getOnboardingSystemPrompt(userEmail),
    messages: messages // Already formatted with only role and content
  });
  
  return response.content[0].text;
}

/**
 * Send message in task conversation
 * @param {Array} messages - Array of {role, content} messages (already formatted)
 * @param {string} userEmail - User email for context
 * @returns {Promise<string>} Claude's response
 */
async function sendTaskMessage(messages, userEmail = null) {
  console.log(`[Claude Service] Sending ${messages.length} messages to Claude for task`);
  
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: config.getTaskSystemPrompt(),
    messages: messages // Already formatted with only role and content
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

Respond with ONLY the title, nothing else.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text.trim();
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
    max_tokens: 8000,
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
  generateCorporationAnalysis,
  generateIndividualAnalysis
};