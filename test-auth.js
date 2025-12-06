// Test script to verify auth module loads correctly
require('dotenv').config();

console.log('Testing auth module loading...\n');

try {
  const auth = require('./server/auth');
  console.log('✓ Auth module loaded successfully');
  console.log('  Type:', typeof auth);
  console.log('  Is function:', typeof auth === 'function');
  console.log('  Has .stack:', typeof auth.stack);
  console.log('  Has .requireAuth:', typeof auth.requireAuth);
  console.log('  Has .hashPassword:', typeof auth.hashPassword);
  
  if (typeof auth === 'function' && auth.stack) {
    console.log('\n✓ Auth is a valid Express Router');
    console.log('  Stack layers:', auth.stack.length);
    
    // List routes
    console.log('\nRegistered routes:');
    auth.stack.forEach((layer, i) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`  ${i + 1}. ${methods} ${layer.route.path}`);
      }
    });
  } else {
    console.log('\n❌ Auth is not a valid Express Router!');
  }
  
} catch (error) {
  console.log('❌ Failed to load auth module');
  console.log('Error:', error.message);
  console.log('\nStack trace:');
  console.log(error.stack);
}
