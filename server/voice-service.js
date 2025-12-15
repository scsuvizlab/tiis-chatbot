// Voice Service - Hybrid: Whisper (STT) + Eleven Labs (TTS)
// Uses OpenAI Whisper for Speech-to-Text (supports all formats)
// Uses Eleven Labs for Text-to-Speech (best quality)

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

const VOICE_CONFIG_PATH = path.join(__dirname, '../data/voice-config.json');

/**
 * Voice Service with hybrid API approach
 */
class VoiceService {
  constructor() {
    if (!OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not set - voice recording will not work');
    }
    if (!ELEVENLABS_API_KEY) {
      console.warn('⚠️  ELEVENLABS_API_KEY not set - voice playback will not work');
    }
  }

  /**
   * Transcribe audio to text using OpenAI Whisper
   * Supports ALL audio formats: WebM, MP3, MP4, WAV, OGG, etc.
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} filename - Original filename
   * @returns {Promise<string>} Transcribed text
   */
  async transcribe(audioBuffer, filename = 'audio.webm') {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      console.log(`🎤 Transcribing with Whisper: ${filename} (${audioBuffer.length} bytes)`);

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: filename,
        contentType: this.getContentType(filename)
      });
      formData.append('model', 'whisper-1');

      const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Whisper API Error:', errorText);
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      const transcribedText = result.text || '';

      console.log(`✅ Whisper transcription: "${transcribedText.substring(0, 50)}..."`);
      return transcribedText;

    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw error;
    }
  }

  /**
   * Helper: Detect content type from filename
   */
  getContentType(filename) {
    if (filename.endsWith('.wav')) return 'audio/wav';
    if (filename.endsWith('.mp4') || filename.endsWith('.m4a')) return 'audio/mp4';
    if (filename.endsWith('.mp3') || filename.endsWith('.mpeg')) return 'audio/mpeg';
    if (filename.endsWith('.webm')) return 'audio/webm';
    if (filename.endsWith('.ogg')) return 'audio/ogg';
    return 'audio/webm'; // default
  }

  /**
   * Convert text to speech using Eleven Labs TTS
   * @param {string} text - Text to convert to speech
   * @param {string} voiceId - Eleven Labs voice ID
   * @param {object} options - Optional TTS parameters
   * @returns {Promise<Buffer>} Audio buffer (MP3)
   */
  async synthesize(text, voiceId, options = {}) {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('Eleven Labs API key not configured');
    }

    try {
      console.log(`🔊 Synthesizing speech: ${text.substring(0, 30)}... (voice: ${voiceId})`);

      const response = await fetch(
        `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: options.model_id || 'eleven_monolingual_v1',
            voice_settings: options.voice_settings || {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Eleven Labs TTS Error:', errorText);
        throw new Error(`Speech synthesis failed: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ TTS complete: ${audioBuffer.length} bytes`);

      return audioBuffer;

    } catch (error) {
      console.error('❌ TTS error:', error);
      throw error;
    }
  }

  /**
   * Test a voice by generating sample audio
   * @param {string} voiceId - Eleven Labs voice ID
   * @param {string} text - Optional custom text
   * @returns {Promise<Buffer>} Audio buffer (MP3)
   */
  async testVoice(voiceId, text = null) {
    const testText = text || "Hello! This is a test of this voice. How does it sound?";
    return await this.synthesize(testText, voiceId);
  }

  /**
   * Get available voices from configuration file
   * @returns {Promise<object>} Voice configuration
   */
  async getVoiceConfig() {
    try {
      const data = await fs.readFile(VOICE_CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Return default config if file doesn't exist
      console.log('No voice config found, using defaults');
      return {
        voices: [],
        default_voice_id: null
      };
    }
  }

  /**
   * Update voice configuration
   * @param {object} config - New configuration
   * @returns {Promise<object>} Updated configuration
   */
  async updateVoiceConfig(config) {
    // Ensure data directory exists
    const dataDir = path.dirname(VOICE_CONFIG_PATH);
    await fs.mkdir(dataDir, { recursive: true });

    // Write config
    await fs.writeFile(
      VOICE_CONFIG_PATH,
      JSON.stringify(config, null, 2),
      'utf8'
    );

    return config;
  }

  /**
   * Check if a voice ID is valid
   * @param {string} voiceId - Voice ID to check
   * @returns {Promise<boolean>} True if valid
   */
  async isValidVoiceId(voiceId) {
    const config = await this.getVoiceConfig();
    return config.voices.some(v => v.id === voiceId);
  }

  /**
   * Get all available voices from Eleven Labs API
   * (For discovering new voice IDs in admin panel)
   * @returns {Promise<Array>} Array of voice objects
   */
  async getAvailableVoicesFromAPI() {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('Eleven Labs API key not configured');
    }

    try {
      const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices || [];

    } catch (error) {
      console.error('Error fetching voices from API:', error);
      throw error;
    }
  }
}

module.exports = new VoiceService();