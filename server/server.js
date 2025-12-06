require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./auth');
const conversationRoutes = require('./conversation-manager');
const adminRoutes = require('./admin');

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
  console.log('    POST /api/admin/analyze/corporation');
  console.log('    POST /api/admin/analyze/user/:email');
  console.log('    GET  /api/admin/export/all');
});
