require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./auth');
const conversationRoutes = require('./conversation-manager');
const adminRoutes = require('./admin');
const voiceRoutes = require('./voice-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // For base64 file uploads
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice', voiceRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TIIS Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check if Eleven Labs API key is configured
  const voiceEnabled = !!process.env.ELEVENLABS_API_KEY;
  console.log(`🎤 Voice features: ${voiceEnabled ? 'ENABLED' : 'DISABLED (set ELEVENLABS_API_KEY to enable)'}`);
  
  console.log('\n📋 Available endpoints:');
  console.log('  Auth:');
  console.log('    POST /api/auth/login');
  console.log('    POST /api/auth/change-password');
  console.log('    POST /api/auth/verify');
  console.log('  Conversations:');
  console.log('    POST /api/conversations/onboarding/start');
  console.log('    POST /api/conversations/onboarding/message');
  console.log('    POST /api/conversations/task/new');
  console.log('    POST /api/conversations/task/message');
  console.log('    GET  /api/conversations/list');
  console.log('    GET  /api/conversations/:id');
  console.log('    DELETE /api/conversations/:id');
  console.log('  Admin:');
  console.log('    POST /api/admin/login');
  console.log('    GET  /api/admin/users');
  console.log('    POST /api/admin/users/create');
  console.log('    POST /api/admin/users/reset-password');
  console.log('    DELETE /api/admin/users/:email');
  console.log('    GET  /api/admin/conversations/:email');
  console.log('    POST /api/admin/analyze/corporation');
  console.log('    POST /api/admin/analyze/user/:email');
  console.log('    GET  /api/admin/export/all');
  
  if (voiceEnabled) {
    console.log('  Voice:');
    console.log('    POST /api/voice/transcribe');
    console.log('    POST /api/voice/synthesize');
    console.log('    GET  /api/voice/available');
    console.log('    PUT  /api/voice/preference');
    console.log('    GET  /api/voice/admin/config');
    console.log('    PUT  /api/voice/admin/config');
    console.log('    POST /api/voice/admin/test');
    console.log('    GET  /api/voice/admin/api-voices');
  }
});