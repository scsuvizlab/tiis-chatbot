// Knowledge Manager - Loads and manages user-specific interview modules
const fs = require('fs').promises;
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');

/**
 * Load a specific knowledge module by ID
 * @param {string} moduleId - The module filename (without .json)
 * @returns {Promise<object|null>} Knowledge module data or null if not found
 */
async function loadKnowledgeModule(moduleId) {
  if (!moduleId) return null;
  
  try {
    const filepath = path.join(KNOWLEDGE_DIR, `${moduleId}.json`);
    const data = await fs.readFile(filepath, 'utf8');
    const module = JSON.parse(data);
    
    console.log(`📚 Loaded knowledge module: ${module.title || moduleId}`);
    return module;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`⚠️  Knowledge module not found: ${moduleId}`);
      return null;
    }
    console.error(`❌ Error loading knowledge module ${moduleId}:`, error);
    return null;
  }
}

/**
 * List all available knowledge modules
 * @returns {Promise<Array>} Array of {id, title, description} objects
 */
async function listAvailableModules() {
  try {
    // Ensure knowledge directory exists
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    
    const files = await fs.readdir(KNOWLEDGE_DIR);
    const modules = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filepath = path.join(KNOWLEDGE_DIR, file);
          const data = await fs.readFile(filepath, 'utf8');
          const module = JSON.parse(data);
          
          modules.push({
            id: file.replace('.json', ''),
            module_id: module.module_id,
            title: module.title || 'Untitled Module',
            description: module.interviewee ? 
              `${module.interviewee.name} - ${module.interviewee.role}` : 
              'No description',
            version: module.version || '1.0',
            questions_count: module.questions ? module.questions.length : 0
          });
          
        } catch (error) {
          console.error(`Error reading module ${file}:`, error);
          // Skip invalid modules
        }
      }
    }
    
    // Sort by title
    modules.sort((a, b) => a.title.localeCompare(b.title));
    
    return modules;
    
  } catch (error) {
    console.error('Error listing knowledge modules:', error);
    return [];
  }
}

/**
 * Validate a knowledge module structure
 * @param {object} module - Module data to validate
 * @returns {boolean} True if valid
 */
function validateKnowledgeModule(module) {
  if (!module) return false;
  
  // Required fields
  if (!module.module_id) {
    console.error('Module missing module_id');
    return false;
  }
  
  if (!module.prompt_text && !module.questions) {
    console.error('Module must have either prompt_text or questions array');
    return false;
  }
  
  return true;
}

/**
 * Get the custom onboarding prompt from a knowledge module
 * @param {object} module - Knowledge module data
 * @param {string} userName - User's name for personalization
 * @returns {string} Custom system prompt
 */
function getModulePrompt(module, userName = 'the interviewee') {
  if (!module) return null;
  
  // If module has custom prompt_text, use it
  if (module.prompt_text) {
    return module.prompt_text;
  }
  
  // Otherwise, build prompt from module structure
  let prompt = `You are conducting an interview with ${userName}`;
  
  if (module.interviewee) {
    prompt += ` who is ${module.interviewee.role} at ${module.interviewee.organization}.`;
  } else {
    prompt += '.';
  }
  
  prompt += '\n\n';
  
  if (module.assumptions_summary && module.assumptions_summary.length > 0) {
    prompt += 'Baseline assumptions about this role:\n';
    module.assumptions_summary.forEach(assumption => {
      prompt += `- ${assumption}\n`;
    });
    prompt += '\n';
  }
  
  if (module.questions && module.questions.length > 0) {
    prompt += `Interview questions to cover (adapt naturally, one at a time):\n`;
    module.questions.forEach((q, i) => {
      prompt += `${i + 1}) ${q.text}\n`;
    });
    prompt += '\n';
  }
  
  prompt += `Interview rules:
- Ask one question at a time
- Listen for concrete examples and details
- Capture frequency, volume, stakeholders, tools, and systems used
- Do not prescribe solutions or mention AI/automation
- After covering the key topics, provide a neutral summary in 8-12 bullets`;
  
  return prompt;
}

/**
 * Get module metadata for display
 * @param {string} moduleId - Module ID to load
 * @returns {Promise<object|null>} Module metadata
 */
async function getModuleMetadata(moduleId) {
  const module = await loadKnowledgeModule(moduleId);
  if (!module) return null;
  
  return {
    module_id: module.module_id,
    title: module.title,
    version: module.version,
    interviewee: module.interviewee,
    questions_count: module.questions ? module.questions.length : 0,
    has_custom_prompt: !!module.prompt_text,
    assumptions_count: module.assumptions_summary ? module.assumptions_summary.length : 0
  };
}

module.exports = {
  loadKnowledgeModule,
  listAvailableModules,
  validateKnowledgeModule,
  getModulePrompt,
  getModuleMetadata
};
