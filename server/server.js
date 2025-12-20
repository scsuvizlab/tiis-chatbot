require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./auth');
const conversationRoutes = require('./conversation-manager');
const adminRoutes = require('./admin');
const voiceRoutes = require('./voice-routes');
const toolsRoutes = require('./tools-routes'); // ⭐ NEW: Tools routes

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
app.use('/api/tools', toolsRoutes); // ⭐ NEW: Tools API endpoints

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
  console.log(`🎤 Voice features: ${voiceEnabled ? 'ENABLED ✓' : 'DISABLED (no API key)'}`);
  
  // Tools tracking is always available
  console.log(`🔧 Tools tracking: ENABLED ✓`); // ⭐ NEW: Confirm tools are available
});
