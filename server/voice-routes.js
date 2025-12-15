// Voice Routes - API endpoints for voice features
const express = require('express');
const router = express.Router();
const multer = require('multer');
const voiceService = require('./voice-service');
const userManager = require('./user-manager');
const { requireAuth } = require('./auth');

// Configure multer for audio file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// ============================================
// USER VOICE ENDPOINTS (Require Authentication)
// ============================================

/**
 * POST /api/voice/transcribe
 * Convert audio to text using Eleven Labs STT
 * Body: Audio file (multipart/form-data)
 */
router.post('/transcribe', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('📝 Transcription request from:', req.user.email);
    console.log('   File size:', req.file.size, 'bytes');
    console.log('   MIME type:', req.file.mimetype);

    // Transcribe the audio
    const text = await voiceService.transcribe(
      req.file.buffer,
      req.file.originalname
    );

    res.json({
      success: true,
      text: text,
      original_filename: req.file.originalname,
      file_size: req.file.size
    });

  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({
      error: 'Transcription failed',
      message: error.message
    });
  }
});

/**
 * POST /api/voice/synthesize
 * Convert text to speech using Eleven Labs TTS
 * Body: { text: string, voice_id?: string }
 */
router.post('/synthesize', requireAuth, async (req, res) => {
  try {
    const { text, voice_id } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log('🔊 TTS request from:', req.user.email);
    console.log('   Text length:', text.length, 'characters');

    // Get user's preferred voice or use provided voice_id or default
    let voiceId = voice_id;
    
    if (!voiceId) {
      const user = await userManager.getUserByEmail(req.user.email);
      voiceId = user.preferred_voice_id;
    }

    if (!voiceId) {
      const config = await voiceService.getVoiceConfig();
      voiceId = config.default_voice_id;
    }

    if (!voiceId) {
      return res.status(400).json({ error: 'No voice ID available' });
    }

    console.log('   Using voice:', voiceId);

    // Synthesize speech
    const audioBuffer = await voiceService.synthesize(text, voiceId);

    // Send audio as MP3
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': 'inline; filename="speech.mp3"'
    });

    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS endpoint error:', error);
    res.status(500).json({
      error: 'Speech synthesis failed',
      message: error.message
    });
  }
});

/**
 * GET /api/voice/available
 * Get list of available voices from configuration
 */
router.get('/available', requireAuth, async (req, res) => {
  try {
    const config = await voiceService.getVoiceConfig();
    
    res.json({
      voices: config.voices,
      default_voice_id: config.default_voice_id
    });

  } catch (error) {
    console.error('Error fetching available voices:', error);
    res.status(500).json({
      error: 'Failed to fetch voices',
      message: error.message
    });
  }
});

/**
 * PUT /api/voice/preference
 * Update user's preferred voice
 * Body: { voice_id: string }
 */
router.put('/preference', requireAuth, async (req, res) => {
  try {
    const { voice_id } = req.body;
    
    console.log(`🎤 Voice preference save request from ${req.user.email}:`, voice_id);

    if (!voice_id) {
      console.log('❌ No voice_id provided');
      return res.status(400).json({ error: 'No voice_id provided' });
    }

    // Validate that voice exists in config
    const isValid = await voiceService.isValidVoiceId(voice_id);
    if (!isValid) {
      const config = await voiceService.getVoiceConfig();
      const availableIds = config.voices.map(v => v.id).join(', ');
      console.log(`❌ Invalid voice ID: ${voice_id}. Available: ${availableIds}`);
      return res.status(400).json({ 
        error: `Invalid voice ID: "${voice_id}". Available voices: ${availableIds}` 
      });
    }

    // Update user's preference
    const user = await userManager.getUserByEmail(req.user.email);
    user.preferred_voice_id = voice_id;
    await userManager.updateUser(user);

    console.log(`✅ Updated voice preference for ${req.user.email} to ${voice_id}`);

    res.json({
      success: true,
      preferred_voice_id: voice_id
    });

  } catch (error) {
    console.error('❌ Error updating voice preference:', error);
    res.status(500).json({
      error: 'Failed to update preference',
      message: error.message
    });
  }
});

// ============================================
// ADMIN VOICE ENDPOINTS (Require Admin Auth)
// ============================================

/**
 * Admin authentication middleware
 */
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const password = authHeader.substring(7);
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  
  next();
}

/**
 * GET /api/voice/admin/config
 * Get current voice configuration
 */
router.get('/admin/config', requireAdminAuth, async (req, res) => {
  try {
    const config = await voiceService.getVoiceConfig();
    res.json(config);

  } catch (error) {
    console.error('Error fetching voice config:', error);
    res.status(500).json({
      error: 'Failed to fetch configuration',
      message: error.message
    });
  }
});

/**
 * PUT /api/voice/admin/config
 * Update voice configuration
 * Body: { voices: [...], default_voice_id: string }
 */
router.put('/admin/config', requireAdminAuth, async (req, res) => {
  try {
    const { voices, default_voice_id } = req.body;

    if (!voices || !Array.isArray(voices)) {
      return res.status(400).json({ error: 'Invalid voices array' });
    }

    // Validate structure
    for (const voice of voices) {
      if (!voice.id || !voice.name) {
        return res.status(400).json({ 
          error: 'Each voice must have id and name' 
        });
      }
    }

    const config = {
      voices,
      default_voice_id: default_voice_id || voices[0]?.id || null
    };

    const updated = await voiceService.updateVoiceConfig(config);

    console.log('✅ Voice configuration updated by admin');

    res.json({
      success: true,
      config: updated
    });

  } catch (error) {
    console.error('Error updating voice config:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/voice/admin/test
 * Test a voice by generating sample audio
 * Body: { voice_id: string, text?: string }
 */
router.post('/admin/test', requireAdminAuth, async (req, res) => {
  try {
    const { voice_id, text } = req.body;

    if (!voice_id) {
      return res.status(400).json({ error: 'No voice_id provided' });
    }

    console.log('🎵 Testing voice:', voice_id);

    const audioBuffer = await voiceService.testVoice(voice_id, text);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': 'inline; filename="test.mp3"'
    });

    res.send(audioBuffer);

  } catch (error) {
    console.error('Voice test error:', error);
    res.status(500).json({
      error: 'Voice test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/voice/admin/api-voices
 * Get all available voices from Eleven Labs API
 * (For discovering new voice IDs)
 */
router.get('/admin/api-voices', requireAdminAuth, async (req, res) => {
  try {
    const voices = await voiceService.getAvailableVoicesFromAPI();
    
    res.json({
      voices: voices.map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        description: v.description,
        labels: v.labels
      }))
    });

  } catch (error) {
    console.error('Error fetching API voices:', error);
    res.status(500).json({
      error: 'Failed to fetch voices from API',
      message: error.message
    });
  }
});

module.exports = router;