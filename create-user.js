#!/usr/bin/env node
/**
 * TIIS User Creation Helper
 * 
 * Usage: node create-user.js
 * 
 * Interactive script to create new user accounts
 */

require('dotenv').config();
const readline = require('readline');
const { createUser, getUserByEmail } = require('./server/user-manager');
const { hashPassword } = require('./server/auth');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🎯 TIIS User Creation Tool\n');
  console.log('Create a new employee account for the TIIS platform.\n');
  
  try {
    // Get user details
    const email = await question('Email address: ');
    
    // Check if user exists
    const existing = await getUserByEmail(email);
    if (existing) {
      console.log('\n❌ Error: User with this email already exists');
      rl.close();
      process.exit(1);
    }
    
    const name = await question('Full name: ');
    const role = await question('Job title/role: ');
    const tempPassword = await question('Temporary password (min 8 chars): ');
    
    if (tempPassword.length < 8) {
      console.log('\n❌ Error: Password must be at least 8 characters');
      rl.close();
      process.exit(1);
    }
    
    // Confirm
    console.log('\n📋 Creating user with these details:');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: ${role}`);
    console.log(`   Temp Password: ${tempPassword}`);
    
    const confirm = await question('\nCreate this user? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Cancelled');
      rl.close();
      process.exit(0);
    }
    
    // Create user
    console.log('\n⏳ Creating user...');
    
    try {
      const passwordHash = await hashPassword(tempPassword);
      
      if (!passwordHash || passwordHash.length < 20) {
        throw new Error('Password hashing failed - hash is empty or invalid');
      }
      
      console.log('✓ Password hashed successfully');
      
      await createUser(email, name, role, true, passwordHash);
      
      console.log('✓ User file created');
      
      // Verify user was created
      const createdUser = await getUserByEmail(email);
      if (!createdUser) {
        throw new Error('User file not found after creation');
      }
      
      if (!createdUser.password_hash || createdUser.password_hash.length < 20) {
        throw new Error('User created but password_hash is invalid');
      }
      
      console.log('✓ User verified in database');
      
    } catch (error) {
      console.error('\n❌ User creation failed:', error.message);
      throw error;
    }
    
    console.log('\n✅ User created successfully!');
    console.log('\n📧 Send these credentials to the employee:');
    console.log('─'.repeat(50));
    console.log(`   Website: http://localhost:3000`);
    console.log(`   Email: ${email}`);
    console.log(`   Temporary Password: ${tempPassword}`);
    console.log('─'.repeat(50));
    console.log('\nThey will be prompted to create a new password on first login.\n');
    
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
  } finally {
    rl.close();
  }
}

main();