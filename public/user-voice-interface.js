// User Voice Interface Component - WITH AUTO-PLAY TOGGLE
// Handles voice recording, transcription, playback, and AUTO-PLAY mode

class UserVoiceInterface {
    constructor() {
        this.API_BASE = '/api';
        this.recording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.silenceTimer = null;
        this.recordingTimer = null;
        this.recordingStartTime = 0;
        this.maxRecordingTime = 30000; // 30 seconds
        this.silenceTimeout = 1500; // 1.5 seconds
        this.currentAudio = null;
        this.availableVoices = [];
        this.userPreferredVoice = null;
        
        // NEW: Auto-play state
        this.autoPlayEnabled = false;
        
        this.elements = {};
        this.init();
    }
    
    async init() {
        await this.loadVoicePreference();
        await this.loadAvailableVoices();
        this.loadAutoPlayPreference(); // NEW
        this.injectUI();
        this.cacheElements();
        this.setupEventListeners();
        this.updateAutoPlayUI(); // NEW
        console.log('🎤 Voice interface initialized');
    }
    
    // NEW: Load auto-play preference from localStorage
    loadAutoPlayPreference() {
        const saved = localStorage.getItem('tiis_autoplay_enabled');
        this.autoPlayEnabled = saved === 'true';
        console.log('Auto-play enabled:', this.autoPlayEnabled);
    }
    
    // NEW: Save auto-play preference
    saveAutoPlayPreference() {
        localStorage.setItem('tiis_autoplay_enabled', this.autoPlayEnabled);
        this.updateAutoPlayUI();
    }
    
    // NEW: Check if auto-play is enabled
    isAutoPlayEnabled() {
        return this.autoPlayEnabled;
    }
    
    // NEW: Toggle auto-play
    toggleAutoPlay() {
        this.autoPlayEnabled = !this.autoPlayEnabled;
        this.saveAutoPlayPreference();
        console.log('Auto-play toggled:', this.autoPlayEnabled);
    }
    
    // NEW: Update UI to show auto-play state
    updateAutoPlayUI() {
        const speakerBtn = this.elements.speakerBtn;
        if (!speakerBtn) return;
        
        if (this.autoPlayEnabled) {
            // Auto-play ON
            speakerBtn.innerHTML = '🔊';
            speakerBtn.title = 'Auto-play ON (click to turn off)';
            speakerBtn.style.color = 'var(--primary-color)';
        } else {
            // Auto-play OFF
            speakerBtn.innerHTML = '🔇';
            speakerBtn.title = 'Auto-play OFF (click to turn on)';
            speakerBtn.style.color = '';
        }
    }
    
    async loadVoicePreference() {
        try {
            const response = await fetch(`${this.API_BASE}/voice/available`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.availableVoices = data.voices || [];
            }
        } catch (error) {
            console.error('Failed to load voice preferences:', error);
        }
    }
    
    async loadAvailableVoices() {
        try {
            const response = await fetch(`${this.API_BASE}/voice/available`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.availableVoices = data.voices || [];
            }
        } catch (error) {
            console.error('Failed to load available voices:', error);
        }
    }
    
    injectUI() {
        // Inject voice controls into input area
        const inputRow = document.querySelector('.input-row');
        if (!inputRow) return;
        
        // Create mic button
        const micBtn = document.createElement('button');
        micBtn.id = 'voice-record-btn';
        micBtn.className = 'btn-icon voice-record-btn';
        micBtn.title = 'Record voice message';
        micBtn.innerHTML = '🎤';
        
        // Create speaker button (now a toggle!)
        const speakerBtn = document.createElement('button');
        speakerBtn.id = 'voice-speaker-btn';
        speakerBtn.className = 'btn-icon voice-speaker-btn';
        speakerBtn.title = 'Toggle auto-play (currently OFF)';
        speakerBtn.innerHTML = '🔇'; // Muted by default
        
        // Create settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'voice-settings-btn';
        settingsBtn.className = 'btn-icon voice-settings-btn';
        settingsBtn.title = 'Voice settings';
        settingsBtn.innerHTML = '⚙️';
        
        // Insert before textarea
        const textarea = inputRow.querySelector('#user-input');
        inputRow.insertBefore(micBtn, textarea);
        inputRow.insertBefore(speakerBtn, textarea);
        inputRow.appendChild(settingsBtn);
        
        // Add recording UI container
        const recordingUI = document.createElement('div');
        recordingUI.id = 'recording-ui';
        recordingUI.className = 'recording-ui hidden';
        recordingUI.innerHTML = `
            <div class="recording-header">
                <span class="recording-status">🔴 Recording...</span>
                <span class="recording-timer">0:00</span>
            </div>
            <div class="recording-progress">
                <div class="recording-progress-bar"></div>
            </div>
            <div class="recording-actions">
                <button id="stop-recording-btn" class="btn btn-danger">Stop</button>
                <button id="cancel-recording-btn" class="btn btn-secondary">Cancel</button>
            </div>
        `;
        
        const inputArea = document.querySelector('.input-area');
        inputArea.insertBefore(recordingUI, inputArea.firstChild);
        
        // Add voice settings modal
        this.injectSettingsModal();
    }
    
    injectSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'voice-settings-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>⚙️ Settings</h2>
                
                <div class="settings-group" style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 0.75rem; color: var(--text-primary);">Theme</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                        Choose your preferred color theme
                    </p>
                    <div class="theme-selector">
                        <div class="theme-option" data-theme="light">
                            <div class="theme-icon">☀️</div>
                            <div class="theme-name">Light</div>
                        </div>
                        <div class="theme-option" data-theme="dark">
                            <div class="theme-icon">🌙</div>
                            <div class="theme-name">Dark</div>
                        </div>
                    </div>
                </div>
                
                <div class="settings-group" style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 0.75rem; color: var(--text-primary);">Voice Playback</h3>
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="voice-select">Preferred Voice</label>
                        <select id="voice-select" class="voice-select">
                            <option value="">Loading voices...</option>
                        </select>
                        <small style="color: var(--text-secondary); font-size: 0.875rem; display: block; margin-top: 0.5rem;">
                            Choose the voice you'd like to hear for AI responses. Click the speaker button 🔊 to enable auto-play.
                        </small>
                    </div>
                    
                    <div class="voice-preview" style="margin-top: 1rem;">
                        <button id="preview-voice-btn" class="btn btn-secondary" disabled>
                            ▶️ Preview Voice
                        </button>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button id="cancel-voice-settings-btn" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button id="save-voice-settings-btn" class="btn btn-primary">
                        Save
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    cacheElements() {
        this.elements = {
            // Recording buttons
            recordBtn: document.getElementById('voice-record-btn'),
            speakerBtn: document.getElementById('voice-speaker-btn'), // NEW: Speaker toggle button
            settingsBtn: document.getElementById('voice-settings-btn'),
            
            // Recording UI
            recordingUI: document.getElementById('recording-ui'),
            recordingTimer: document.querySelector('.recording-timer'),
            recordingProgress: document.querySelector('.recording-progress-bar'),
            stopRecordingBtn: document.getElementById('stop-recording-btn'),
            cancelRecordingBtn: document.getElementById('cancel-recording-btn'),
            
            // Settings modal
            settingsModal: document.getElementById('voice-settings-modal'),
            voiceSelect: document.getElementById('voice-select'),
            previewVoiceBtn: document.getElementById('preview-voice-btn'),
            saveSettingsBtn: document.getElementById('save-voice-settings-btn'),
            cancelSettingsBtn: document.getElementById('cancel-voice-settings-btn'),
            
            // Input area
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            attachBtn: document.getElementById('attach-btn')
        };
    }
    
    setupEventListeners() {
        // Recording
        this.elements.recordBtn?.addEventListener('click', () => this.startRecording());
        this.elements.stopRecordingBtn?.addEventListener('click', () => this.stopRecording());
        this.elements.cancelRecordingBtn?.addEventListener('click', () => this.cancelRecording());
        
        // Speaker button - toggles auto-play
        this.elements.speakerBtn?.addEventListener('click', () => this.toggleAutoPlay());
        
        // Settings
        this.elements.settingsBtn?.addEventListener('click', () => this.showSettings());
        this.elements.cancelSettingsBtn?.addEventListener('click', () => this.hideSettings());
        this.elements.saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
        this.elements.voiceSelect?.addEventListener('change', () => this.onVoiceChange());
        this.elements.previewVoiceBtn?.addEventListener('click', () => this.previewVoice());
    }
    
    // NEW: Generate audio BEFORE rendering (for auto-play mode)
    async generateAudioForText(text) {
        try {
            console.log('🔊 Generating audio for text (length:', text.length, ')');
            
            const response = await fetch(`${this.API_BASE}/voice/synthesize`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }
            
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            
            // Wait for audio to load to get duration
            await new Promise((resolve, reject) => {
                audio.addEventListener('loadedmetadata', resolve);
                audio.addEventListener('error', reject);
            });
            
            console.log('✅ Audio generated, duration:', audio.duration, 'seconds');
            
            return {
                audio: audio,
                duration: audio.duration,
                url: audioUrl
            };
            
        } catch (error) {
            console.error('Failed to generate audio:', error);
            return null;
        }
    }
    
    // ============================================
    // RECORDING
    // ============================================
    
    async startRecording() {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const mimeType = MediaRecorder.isTypeSupported('audio/wav') 
                ? 'audio/wav' 
                : MediaRecorder.isTypeSupported('audio/webm') 
                    ? 'audio/webm;codecs=opus'
                    : '';
            
            const options = mimeType ? { mimeType } : {};
            this.mediaRecorder = new MediaRecorder(stream, options);
            
            this.audioChunks = [];
            
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                this.audioChunks.push(event.data);
            });
            
            this.mediaRecorder.addEventListener('stop', () => {
                this.handleRecordingComplete();
            });
            
            // Start recording
            this.mediaRecorder.start();
            this.recording = true;
            this.recordingStartTime = Date.now();
            
            // Show recording UI
            this.elements.recordingUI.classList.remove('hidden');
            this.elements.userInput.disabled = true;
            this.elements.sendBtn.disabled = true;
            this.elements.attachBtn.disabled = true;
            
            // Start timer
            this.startRecordingTimer();
            
            // Auto-stop after max time
            setTimeout(() => {
                if (this.recording) {
                    this.stopRecording();
                }
            }, this.maxRecordingTime);
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }
    
    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            
            this.elements.recordingTimer.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            
            const progress = (elapsed / this.maxRecordingTime) * 100;
            this.elements.recordingProgress.style.width = `${progress}%`;
        }, 100);
    }
    
    stopRecording() {
        if (!this.recording) return;
        
        this.recording = false;
        clearInterval(this.recordingTimer);
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    
    cancelRecording() {
        this.recording = false;
        clearInterval(this.recordingTimer);
        
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        this.audioChunks = [];
        
        // Hide recording UI
        this.elements.recordingUI.classList.add('hidden');
        this.elements.userInput.disabled = false;
        this.elements.sendBtn.disabled = false;
        this.elements.attachBtn.disabled = false;
    }
    
    async handleRecordingComplete() {
        try {
            // Create blob from chunks
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            
            // Hide recording UI
            this.elements.recordingUI.classList.add('hidden');
            
            // Send to API for transcription
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            const response = await fetch(`${this.API_BASE}/voice/transcribe`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Transcription failed');
            }
            
            const data = await response.json();
            
            // Insert transcribed text into input
            this.elements.userInput.value = data.text;
            this.elements.userInput.focus();
            
            // Auto-resize textarea
            this.elements.userInput.style.height = 'auto';
            this.elements.userInput.style.height = this.elements.userInput.scrollHeight + 'px';
            
        } catch (error) {
            console.error('Recording processing error:', error);
            alert('Failed to process voice recording');
        } finally {
            // Re-enable input
            this.elements.userInput.disabled = false;
            this.elements.sendBtn.disabled = false;
            this.elements.attachBtn.disabled = false;
        }
    }
    
    // ============================================
    // SETTINGS
    // ============================================
    
    showSettings() {
        // Populate voices
        this.elements.voiceSelect.innerHTML = '';
        
        if (this.availableVoices.length === 0) {
            this.elements.voiceSelect.innerHTML = '<option value="">No voices available</option>';
            this.elements.previewVoiceBtn.disabled = true;
        } else {
            this.availableVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.id;
                option.textContent = voice.name;
                if (voice.description) {
                    option.textContent += ` - ${voice.description}`;
                }
                this.elements.voiceSelect.appendChild(option);
            });
            
            this.elements.previewVoiceBtn.disabled = false;
        }
        
        // Update theme selector
        if (window.themeManager) {
            window.themeManager.updateThemeSelectors();
        }
        
        this.elements.settingsModal.classList.remove('hidden');
    }
    
    hideSettings() {
        this.elements.settingsModal.classList.add('hidden');
    }
    
    onVoiceChange() {
        const selected = this.elements.voiceSelect.value;
        this.elements.previewVoiceBtn.disabled = !selected;
    }
    
    async previewVoice() {
        const voiceId = this.elements.voiceSelect.value;
        if (!voiceId) return;
        
        const sampleText = "Hello! This is a preview of how I'll sound when reading your messages.";
        
        try {
            this.elements.previewVoiceBtn.disabled = true;
            this.elements.previewVoiceBtn.textContent = 'Playing...';
            
            const response = await fetch(`${this.API_BASE}/voice/synthesize`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: sampleText,
                    voice_id: voiceId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate preview');
            }
            
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            
            if (this.currentAudio) {
                this.currentAudio.pause();
                URL.revokeObjectURL(this.currentAudio.src);
            }
            
            this.currentAudio = new Audio(audioUrl);
            this.currentAudio.play();
            
            this.currentAudio.addEventListener('ended', () => {
                this.elements.previewVoiceBtn.textContent = '▶️ Preview Voice';
                this.elements.previewVoiceBtn.disabled = false;
                URL.revokeObjectURL(audioUrl);
            });
            
        } catch (error) {
            console.error('Preview error:', error);
            alert('Failed to play voice preview');
            this.elements.previewVoiceBtn.textContent = '▶️ Preview Voice';
            this.elements.previewVoiceBtn.disabled = false;
        }
    }
    
    async saveSettings() {
        try {
            const voiceId = this.elements.voiceSelect.value;
            
            // Save voice preference using PUT
            const response = await fetch(`${this.API_BASE}/voice/preference`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_id: voiceId || null
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save preference');
            }
            
            this.userPreferredVoice = voiceId;
            
            // Save theme if theme manager exists
            if (window.themeManager) {
                window.themeManager.saveThemeFromSelector();
            }
            
            this.hideSettings();
            
        } catch (error) {
            console.error('Save settings error:', error);
            alert('Failed to save voice preference');
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.userVoiceInterface = new UserVoiceInterface();
    });
} else {
    window.userVoiceInterface = new UserVoiceInterface();
}