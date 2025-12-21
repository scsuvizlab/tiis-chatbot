#!/usr/bin/env node
/**
 * TIIS Password Diagnostic Tool
 * 
 * Usage: node check-user-password.js <email> <password-to-test>
 * 
 * This will:
 * 1. Load the user file
 * 2. Show if password_hash exists and its length
 * 3. Test if the password matches
 */

const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

async function checkPassword(email, testPassword) {
  console.log('\n🔍 TIIS Password Diagnostic\n');
  console.log('Email:', email);
  console.log('Testing password:', testPassword);
  console.log('Password length:', testPassword.length);
  console.log('');

  // Get user file path
  const sanitized = email.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const filepath = path.join(__dirname, '..', 'data', 'users', `user_${sanitized}.json`);
  
  console.log('User file path:', filepath);
  
  try {
    // Check if file exists
    const fileExists = await fs.access(filepath).then(() => true).catch(() => false);
    
    if (!fileExists) {
      console.log('❌ ERROR: User file does not exist!');
      console.log('   The user was not created properly.');
      return;
    }
    
    console.log('✅ User file exists\n');
    
    // Read user file
    const data = await fs.readFile(filepath, 'utf8');
    const user = JSON.parse(data);
    
    console.log('User data loaded:');
    console.log('  - Name:', user.name);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - temp_password:', user.temp_password);
    console.log('  - has password_hash:', !!user.password_hash);
    
    if (!user.password_hash) {
      console.log('\n❌ CRITICAL: password_hash field is missing or empty!');
      console.log('   The user was created but password was not hashed.');
      return;
    }
    
    console.log('  - password_hash length:', user.password_hash.length);
    console.log('  - password_hash starts with:', user.password_hash.substring(0, 10) + '...');
    console.log('');
    
    // Verify bcrypt hash format
    if (!user.password_hash.startsWith('$2b$') && !user.password_hash.startsWith('$2a$')) {
      console.log('⚠️  WARNING: password_hash does not look like a bcrypt hash!');
      console.log('   Expected to start with $2b$ or $2a$');
      console.log('   Actual:', user.password_hash.substring(0, 20));
      return;
    }
    
    console.log('✅ password_hash format looks correct (bcrypt)\n');
    
    // Test password
    console.log('Testing password match...');
    const isMatch = await bcrypt.compare(testPassword, user.password_hash);
    
    if (isMatch) {
      console.log('✅ SUCCESS: Password matches!');
      console.log('\n   The password is correct. Login should work.');
      console.log('   If login still fails, check server logs for other errors.');
    } else {
      console.log('❌ FAILURE: Password does NOT match!');
      console.log('\n   Possible causes:');
      console.log('   1. You are entering the wrong password');
      console.log('   2. The password was changed after creation');
      console.log('   3. There are invisible characters (spaces, etc.)');
      console.log('\n   Solution: Reset the password from admin panel');
      console.log('   Make sure to copy/paste the exact password');
    }
    
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    
    if (error.code === 'ENOENT') {
      console.log('   User file not found at:', filepath);
    } else if (error instanceof SyntaxError) {
      console.log('   User file is not valid JSON');
    }
  }
}

// Parse command line args
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node check-user-password.js <email> <password>');
  console.log('');
  console.log('Example:');
  console.log('  node check-user-password.js john@example.com MyPassword123');
  process.exit(1);
}

const [email, password] = args;
checkPassword(email, password);
