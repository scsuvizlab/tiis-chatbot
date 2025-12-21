#!/usr/bin/env node
/**
 * TIIS User Creation Debugger
 * Finds ALL users in the system and shows where they are
 */

const fs = require('fs').promises;
const path = require('path');

async function debugUserCreation() {
  console.log('\n🔍 TIIS User Creation Debugger\n');
  console.log('═'.repeat(60));
  
  const baseDir = path.join(__dirname, '..');
  const usersDir = path.join(baseDir, 'data', 'users');
  
  console.log('Base directory:', baseDir);
  console.log('Users directory:', usersDir);
  console.log('═'.repeat(60));
  
  try {
    // Check if users directory exists
    console.log('\n1️⃣  Checking users directory...\n');
    
    try {
      await fs.access(usersDir);
      console.log('   ✅ Users directory EXISTS:', usersDir);
    } catch (error) {
      console.log('   ❌ Users directory DOES NOT EXIST:', usersDir);
      console.log('   This is the problem! Directory was never created.');
      console.log('\n   Solution: Create the directory:');
      console.log('   mkdir -p data/users');
      return;
    }
    
    // List all files in users directory
    console.log('\n2️⃣  Listing all files in users directory...\n');
    
    const files = await fs.readdir(usersDir);
    
    if (files.length === 0) {
      console.log('   ⚠️  Directory is EMPTY - no user files found!');
      console.log('   This means users are being "created" but files are not saved.');
      console.log('\n   Possible causes:');
      console.log('   - createUser() is failing silently');
      console.log('   - File write permissions issue');
      console.log('   - Using wrong admin.js file');
    } else {
      console.log(`   ✅ Found ${files.length} file(s):\n`);
      
      for (const file of files) {
        if (file.startsWith('user_') && file.endsWith('.json')) {
          const filepath = path.join(usersDir, file);
          const stats = await fs.stat(filepath);
          
          console.log(`   📄 ${file}`);
          console.log(`      Size: ${stats.size} bytes`);
          console.log(`      Modified: ${stats.mtime.toISOString()}`);
          
          // Try to read and parse
          try {
            const data = await fs.readFile(filepath, 'utf8');
            const user = JSON.parse(data);
            
            console.log(`      Email: ${user.email}`);
            console.log(`      Name: ${user.name}`);
            console.log(`      Role: ${user.role}`);
            console.log(`      Has password_hash: ${!!user.password_hash}`);
            console.log(`      temp_password: ${user.temp_password}`);
            console.log('');
          } catch (error) {
            console.log(`      ❌ ERROR reading file: ${error.message}`);
            console.log('');
          }
        } else {
          console.log(`   ⚠️  ${file} (unexpected file)`);
        }
      }
    }
    
    // Check what admin dashboard would show
    console.log('\n3️⃣  What admin dashboard sees...\n');
    
    const userFiles = files.filter(f => f.startsWith('user_') && f.endsWith('.json'));
    
    if (userFiles.length === 0) {
      console.log('   Admin dashboard would show: NO USERS');
      console.log('');
      console.log('   If you SEE users in the dashboard, it means:');
      console.log('   - Browser cache is showing old data');
      console.log('   - You\'re looking at the wrong server/environment');
      console.log('   - Admin is reading from a different location');
    } else {
      console.log(`   Admin dashboard would show: ${userFiles.length} user(s)`);
      
      for (const file of userFiles) {
        const filepath = path.join(usersDir, file);
        const data = await fs.readFile(filepath, 'utf8');
        const user = JSON.parse(data);
        console.log(`   - ${user.email} (${user.name})`);
      }
    }
    
    console.log('\n═'.repeat(60));
    console.log('\n4️⃣  Testing file creation...\n');
    
    // Try to create a test file
    const testFile = path.join(usersDir, 'test_file_creation.txt');
    
    try {
      await fs.writeFile(testFile, 'Test file creation', 'utf8');
      console.log('   ✅ Can write files to users directory');
      await fs.unlink(testFile);
      console.log('   ✅ Can delete files from users directory');
      console.log('   → File permissions are OK');
    } catch (error) {
      console.log('   ❌ CANNOT write files to users directory!');
      console.log('   Error:', error.message);
      console.log('\n   This is a PERMISSIONS issue.');
      console.log('   Solution: Fix directory permissions');
    }
    
    console.log('\n═'.repeat(60));
    console.log('\n5️⃣  Path analysis...\n');
    
    // Show what path createUser would generate for the test email
    const testEmail = 'mcgill@stcouldstate.edu';
    const sanitized = testEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const expectedFile = `user_${sanitized}.json`;
    const expectedPath = path.join(usersDir, expectedFile);
    
    console.log(`   For email: ${testEmail}`);
    console.log(`   Expected filename: ${expectedFile}`);
    console.log(`   Expected full path: ${expectedPath}`);
    
    const testFileExists = files.includes(expectedFile);
    
    if (testFileExists) {
      console.log(`   ✅ File EXISTS for this email`);
    } else {
      console.log(`   ❌ File DOES NOT EXIST for this email`);
      console.log('\n   This confirms: User was NOT created successfully');
    }
    
    console.log('\n═'.repeat(60));
    console.log('\n📋 SUMMARY\n');
    
    if (files.length === 0) {
      console.log('❌ PROBLEM: No user files exist');
      console.log('');
      console.log('DIAGNOSIS: createUser() is not saving files');
      console.log('');
      console.log('SOLUTIONS:');
      console.log('1. Check server console for errors during user creation');
      console.log('2. Verify you\'re using the correct admin.js file');
      console.log('3. Check file permissions on data/users directory');
      console.log('4. Try creating user manually with fix script');
    } else if (!testFileExists) {
      console.log('⚠️  PROBLEM: User file not found for mcgill@stcouldstate.edu');
      console.log('');
      console.log('DIAGNOSIS: Either:');
      console.log('- User was never created');
      console.log('- Created with different email');
      console.log('- Browser showing cached data');
      console.log('');
      console.log('SOLUTIONS:');
      console.log('1. Refresh admin dashboard (Ctrl+Shift+R)');
      console.log('2. Double-check email used during creation');
      console.log('3. Create user again and watch server logs');
    } else {
      console.log('✅ User file exists!');
      console.log('');
      console.log('The file is there, but check-user-password.js couldn\'t find it.');
      console.log('This means there\'s a PATH MISMATCH.');
      console.log('');
      console.log('Run check-user-password.js from the correct directory:');
      console.log('cd C:\\Projects\\GitHubRepos\\tiis-chatbot\\server');
    }
    
    console.log('\n═'.repeat(60));
    
  } catch (error) {
    console.log('\n❌ UNEXPECTED ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
}

debugUserCreation();
