// TIIS Configuration
// System prompts, client info, and employee profiles

const knowledgeManager = require('./knowledge-manager');
const userManager = require('./user-manager');

const CLIENT_INFO = {
  name: 'Greater St. Cloud Development Corporation',
  short_name: 'GSDC',
  description: 'Private nonprofit economic development organization',
  location: 'Greater St. Cloud, Minnesota',
  service_area: 'Benton, Sherburne, and Stearns counties',
  strategic_imperatives: [
    'Business Vitality',
    'Talent Resourcing',
    'Leadership Engagement',
    'Regional Promotion'
  ]
};

const EMPLOYEE_PROFILES = {
  // Employee-specific context can be added here as needed
  // Example:
  // 'user@gsdc.org': {
  //   focus_areas: ['Community Development', 'Grant Management']
  // }
};

function getEmployeeContext(email) {
  return EMPLOYEE_PROFILES[email] || {};
}

// DEFAULT onboarding system prompt (used when no knowledge module assigned)
function getDefaultOnboardingPrompt() {
  return `You are conducting an onboarding interview for ${CLIENT_INFO.name} (${CLIENT_INFO.short_name}), a ${CLIENT_INFO.description} serving ${CLIENT_INFO.service_area}.

Your goal is to deeply understand this employee's role, responsibilities, daily workflows, tools they use, and pain points through natural, conversational questions.

IMPORTANT GUIDELINES:
- Ask one focused question at a time
- Build on their previous answers
- Probe for specific examples and details
- Ask about tools, software, and systems they use
- Understand their workflows step-by-step
- Identify repetitive or time-consuming tasks
- Be conversational and friendly
- Listen for automation opportunities

After 12-15 exchanges covering their role comprehensively, generate a summary of their responsibilities, workflows, and tools used.`;
}

// Onboarding system prompt - checks for custom knowledge module
async function getOnboardingSystemPrompt(userEmail = null) {
  // If no user email provided, return default
  if (!userEmail) {
    return getDefaultOnboardingPrompt();
  }
  
  try {
    // Check if user has assigned knowledge module
    const user = await userManager.getUserByEmail(userEmail);
    
    if (user && user.knowledge_module_id) {
      console.log(`📚 Loading knowledge module for ${userEmail}: ${user.knowledge_module_id}`);
      
      // Load the knowledge module
      const module = await knowledgeManager.loadKnowledgeModule(user.knowledge_module_id);
      
      if (module && knowledgeManager.validateKnowledgeModule(module)) {
        // Use custom prompt from module
        const customPrompt = knowledgeManager.getModulePrompt(module, user.name);
        
        if (customPrompt) {
          console.log(`✅ Using custom prompt from module: ${module.title || user.knowledge_module_id}`);
          return customPrompt;
        }
      }
    }
  } catch (error) {
    console.error('Error loading knowledge module, falling back to default:', error);
  }
  
  // Fall back to default prompt
  return getDefaultOnboardingPrompt();
}

// Task documentation system prompt  
function getTaskSystemPrompt() {
  return `You are helping an employee at ${CLIENT_INFO.name} document a specific work task or process in detail.

Your goal is to understand:
- What the task involves
- When and how often it's done
- What tools/software are used
- Step-by-step workflow
- Pain points or challenges
- Time required
- Dependencies on others

Ask focused, specific questions to deeply understand this task. Build on their answers. Look for automation opportunities.

After thoroughly documenting the task (8-12 exchanges), summarize the process clearly.`;
}

// Corporation analysis prompt
function getCorporationAnalysisPrompt(allConversations) {
  return `You are analyzing workflow data from ${CLIENT_INFO.name}, a ${CLIENT_INFO.description}.

CONTEXT:
${CLIENT_INFO.name} operates under four strategic imperatives:
1. Business Vitality
2. Talent Resourcing  
3. Leadership Engagement
4. Regional Promotion

Below are conversations from employees describing their roles and tasks.

YOUR TASK:
Analyze these conversations and create a comprehensive report identifying:
1. Common workflow patterns across the organization
2. Frequently used tools and systems
3. Repetitive tasks suitable for automation
4. Process bottlenecks and inefficiencies
5. Opportunities for workflow optimization
6. Recommended automation priorities

Format as a professional analysis report with specific, actionable recommendations.

CONVERSATIONS:
${JSON.stringify(allConversations, null, 2)}`;
}

// Individual analysis prompt
function getIndividualAnalysisPrompt(employeeData) {
  return `You are analyzing workflow data for an individual employee at ${CLIENT_INFO.name}.

EMPLOYEE: ${employeeData.name}
ROLE: ${employeeData.role}

Below are their onboarding summary and task documentation conversations.

YOUR TASK:
Create a personalized workflow analysis identifying:
1. Their key responsibilities and workflows
2. Tools and systems they use regularly
3. Time-consuming or repetitive tasks
4. Specific automation opportunities for their role
5. Workflow optimization recommendations
6. Skills development opportunities

Be specific and actionable. Reference their actual tasks and examples. Make recommendations they can implement.

EMPLOYEE DATA:
${employeeData.conversations}`;
}

module.exports = {
  CLIENT_INFO,
  EMPLOYEE_PROFILES,
  getEmployeeContext,
  getOnboardingSystemPrompt,
  getTaskSystemPrompt,
  getCorporationAnalysisPrompt,
  getIndividualAnalysisPrompt
};