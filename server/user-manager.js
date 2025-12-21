const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const USERS_DIR = path.join(__dirname, '../data/users');
const STORAGE_QUOTA_MB = 25; // Per user storage limit

// Ensure users directory exists
async function ensureUsersDir() {
  try {
    await fs.mkdir(USERS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating users directory:', error);
  }
}

ensureUsersDir();

// Get user file path
function getUserFilePath(email) {
  const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  return path.join(USERS_DIR, `user_${sanitized}.json`);
}

// Create new user
async function createUser(email, name, role, tempPassword, passwordHash) {
  const userData = {
    user_id: crypto.randomUUID(),
    email,
    password_hash: passwordHash,
    temp_password: !!tempPassword, // Flag for first-time password change
    name,
    role,
    created_at: new Date().toISOString(),
    onboarding_complete: false,
    storage_used_mb: 0,
    last_login: null,
    knowledge_module_id: null // NEW: Custom interview module assignment
  };
  
  const filepath = getUserFilePath(email);
  await fs.writeFile(filepath, JSON.stringify(userData, null, 2), 'utf8');
  
  return userData;
}

// Get user by email
async function getUserByEmail(email) {
  try {
    const filepath = getUserFilePath(email);
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // User not found
    }
    throw error;
  }
}

// Get all users
async function getAllUsers() {
  try {
    const files = await fs.readdir(USERS_DIR);
    const users = [];
    
    for (const file of files) {
      if (file.startsWith('user_') && file.endsWith('.json')) {
        const data = await fs.readFile(path.join(USERS_DIR, file), 'utf8');
        const user = JSON.parse(data);
        // Remove sensitive data
        delete user.password_hash;
        users.push(user);
      }
    }
    
    return users;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

// Update user (generic update function)
async function updateUser(user) {
  const filepath = getUserFilePath(user.email);
  await fs.writeFile(filepath, JSON.stringify(user, null, 2), 'utf8');
  return user;
}

// Update password
async function updatePassword(email, newPasswordHash) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.password_hash = newPasswordHash;
  user.temp_password = false; // Clear temp flag
  
  const filepath = getUserFilePath(email);
  await fs.writeFile(filepath, JSON.stringify(user, null, 2), 'utf8');
}

// Update last login
async function updateLastLogin(email) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.last_login = new Date().toISOString();
  
  const filepath = getUserFilePath(email);
  await fs.writeFile(filepath, JSON.stringify(user, null, 2), 'utf8');
}

// Mark onboarding complete
async function markOnboardingComplete(email) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.onboarding_complete = true;
  
  const filepath = getUserFilePath(email);
  await fs.writeFile(filepath, JSON.stringify(user, null, 2), 'utf8');
}

// Update storage used
async function updateStorageUsed(email, deltaKB) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.storage_used_mb += (deltaKB / 1024);
  
  const filepath = getUserFilePath(email);
  await fs.writeFile(filepath, JSON.stringify(user, null, 2), 'utf8');
  
  return user.storage_used_mb;
}

// Check if user has storage quota
async function hasStorageQuota(email, fileSizeKB) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return false;
  }
  
  const newTotal = user.storage_used_mb + (fileSizeKB / 1024);
  return newTotal <= STORAGE_QUOTA_MB;
}

// Delete user
async function deleteUser(email) {
  const filepath = getUserFilePath(email);
  
  try {
    await fs.unlink(filepath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false; // User not found
    }
    throw error;
  }
}

// Get user statistics - FIXED to include knowledge_module_id
async function getUserStats(email) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return null;
  }
  
  // Count conversations
  const conversationsDir = path.join(__dirname, '../data/conversations', email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_'));
  
  let taskCount = 0;
  let totalMessages = 0;
  
  try {
    const files = await fs.readdir(conversationsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      const data = await fs.readFile(path.join(conversationsDir, file), 'utf8');
      const conv = JSON.parse(data);
      
      if (conv.type === 'task') {
        taskCount++;
      }
      
      totalMessages += conv.messages.length;
    }
  } catch (error) {
    // Directory might not exist yet
  }
  
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    onboarding_complete: user.onboarding_complete,
    task_count: taskCount,
    total_messages: totalMessages,
    storage_used_mb: user.storage_used_mb,
    last_active: user.last_login,
    knowledge_module_id: user.knowledge_module_id // ADDED: Include knowledge module assignment
  };
}

// Assign knowledge module to user
async function assignKnowledgeModule(email, moduleId) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.knowledge_module_id = moduleId;
  
  const filepath = getUserFilePath(email);
  await fs.writeFile(filepath, JSON.stringify(user, null, 2), 'utf8');
  
  console.log(`📚 Assigned knowledge module '${moduleId}' to ${email}`);
  
  return user;
}

module.exports = {
  createUser,
  getUserByEmail,
  getAllUsers,
  updateUser,
  updatePassword,
  updateLastLogin,
  markOnboardingComplete,
  updateStorageUsed,
  hasStorageQuota,
  deleteUser,
  getUserStats,
  assignKnowledgeModule, // NEW
  STORAGE_QUOTA_MB
};