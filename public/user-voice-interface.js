// User Voice Interface Component
// Handles voice recording, transcription, playback, and settings

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
        this.currentAudio = null; // For playback
        this.availableVoices = [];
        this.userPreferredVoice = null;
        
        this.elements = {};
        this.init();
    }
    
    async init() {
        await this.loadVoicePreference();
        await this.loadAvailableVoices();
        this.injectUI();
        this.cacheElements();
        this.setupEventListeners();
        console.log('🎤 Voice interface initialized');
    }
    
    async loadVoicePreference() {
        try {
            const response = await fetch(`${this.API_BASE}/voice/available`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.availableVoices = data.voices || [];
                // User preference will be fetched when needed
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
        
        // Create settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'voice-settings-btn';
        settingsBtn.className = 'btn-icon voice-settings-btn';
        settingsBtn.title = 'Voice settings';
        settingsBtn.innerHTML = '⚙️';
        
        // Insert before textarea
        const textarea = inputRow.querySelector('#user-input');
        inputRow.insertBefore(micBtn, textarea);
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
                <h2>🎤 Voice Settings</h2>
                
                <div class="form-group">
                    <label for="voice-select">Preferred Voice</label>
                    <select id="voice-select" class="voice-select">
                        <option value="">Loading voices...</option>
                    </select>
                    <small>Choose the voice you'd like to hear for AI responses</small>
                </div>
                
                <div class="voice-preview">
                    <button id="preview-voice-btn" class="btn btn-secondary" disabled>
                        ▶️ Preview Voice
                    </button>
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
            
            // Input area (for enabling/disabling)
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
        
        // Settings
        this.elements.settingsBtn?.addEventListener('click', () => this.showSettings());
        this.elements.cancelSettingsBtn?.addEventListener('click', () => this.hideSettings());
        this.elements.saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
        this.elements.voiceSelect?.addEventListener('change', () => this.onVoiceChange());
        this.elements.previewVoiceBtn?.addEventListener('click', () => this.previewVoice());
    }
    
    // ============================================
    // RECORDING
    // ============================================
    
    async startRecording() {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Try to use WAV format if supported, fallback to default
            const mimeType = MediaRecorder.isTypeSupported('audio/wav') 
                ? 'audio/wav' 
                : MediaRecorder.isTypeSupported('audio/webm') 
                    ? 'audio/webm;codecs=opus'
                    : '';
            
            // Create MediaRecorder
            const options = mimeType ? { mimeType } : {};
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.audioChunks = [];
            
            console.log('🎤 Recording with format:', this.mediaRecorder.mimeType);
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
                stream.getTracks().forEach(track => track.stop());
            };
            
            // Start recording
            this.mediaRecorder.start();
            this.recording = true;
            this.recordingStartTime = Date.now();
            
            // Show recording UI
            this.showRecordingUI();
            
            // Start timers
            this.startRecordingTimer();
            this.startSilenceDetection(stream);
            
            // Disable other inputs
            this.elements.userInput.disabled = true;
            this.elements.sendBtn.disabled = true;
            this.elements.attachBtn.disabled = true;
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Failed to access microphone. Please check permissions.');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.recording) {
            this.mediaRecorder.stop();
            this.recording = false;
            this.stopTimers();
        }
    }
    
    cancelRecording() {
        if (this.mediaRecorder && this.recording) {
            this.mediaRecorder.stop();
            this.recording = false;
            this.audioChunks = [];
            this.stopTimers();
            this.hideRecordingUI();
            
            // Re-enable inputs
            this.elements.userInput.disabled = false;
            this.elements.sendBtn.disabled = false;
            this.elements.attachBtn.disabled = false;
        }
    }
    
    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            
            this.elements.recordingTimer.textContent = 
                `${minutes}:${secs.toString().padStart(2, '0')}`;
            
            // Update progress bar
            const progress = (elapsed / this.maxRecordingTime) * 100;
            this.elements.recordingProgress.style.width = `${Math.min(progress, 100)}%`;
            
            // Auto-stop at max time
            if (elapsed >= this.maxRecordingTime) {
                this.stopRecording();
            }
        }, 100);
    }
    
    startSilenceDetection(stream) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.fftSize);
        let lastSoundTime = Date.now();
        
        const checkSilence = () => {
            if (!this.recording) {
                audioContext.close();
                return;
            }
            
            analyser.getByteTimeDomainData(dataArray);
            
            // Check if there's sound
            let hasSound = false;
            for (let i = 0; i < dataArray.length; i++) {
                if (Math.abs(dataArray[i] - 128) > 10) {
                    hasSound = true;
                    break;
                }
            }
            
            if (hasSound) {
                lastSoundTime = Date.now();
            } else if (Date.now() - lastSoundTime > this.silenceTimeout) {
                // Silence detected for 1.5 seconds
                this.stopRecording();
                audioContext.close();
                return;
            }
            
            requestAnimationFrame(checkSilence);
        };
        
        checkSilence();
    }
    
    stopTimers() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
    
    showRecordingUI() {
        this.elements.recordingUI.classList.remove('hidden');
        this.elements.recordBtn.classList.add('recording-active');
    }
    
    hideRecordingUI() {
        this.elements.recordingUI.classList.add('hidden');
        this.elements.recordBtn.classList.remove('recording-active');
    }
    
    async processRecording() {
        this.hideRecordingUI();
        
        if (this.audioChunks.length === 0) {
            alert('No audio recorded');
            this.elements.userInput.disabled = false;
            this.elements.sendBtn.disabled = false;
            this.elements.attachBtn.disabled = false;
            return;
        }
        
        // Create audio blob with the actual MIME type used
        const mimeType = this.mediaRecorder.mimeType;
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        console.log('📦 Recorded audio:', mimeType, audioBlob.size, 'bytes');
        
        // Transcribe
        await this.transcribeAudio(audioBlob, mimeType);
    }
    
    async transcribeAudio(audioBlob, mimeType) {
        try {
            // Show loading state
            this.elements.userInput.value = 'Transcribing...';
            this.elements.userInput.disabled = true;
            
            // Determine file extension from MIME type
            let filename = 'recording.webm';
            if (mimeType.includes('wav')) {
                filename = 'recording.wav';
            } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
                filename = 'recording.m4a';
            } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
                filename = 'recording.mp3';
            } else if (mimeType.includes('ogg')) {
                filename = 'recording.ogg';
            }
            
            console.log('📤 Sending for transcription:', filename);
            
            // Convert to FormData
            const formData = new FormData();
            formData.append('audio', audioBlob, filename);
            
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
            this.elements.userInput.disabled = false;
            this.elements.sendBtn.disabled = false;
            this.elements.attachBtn.disabled = false;
            
            // Focus on input for editing
            this.elements.userInput.focus();
            
        } catch (error) {
            console.error('Transcription error:', error);
            this.elements.userInput.value = '';
            this.elements.userInput.disabled = false;
            this.elements.sendBtn.disabled = false;
            this.elements.attachBtn.disabled = false;
            alert('Failed to transcribe audio. Please type your message instead.');
        }
    }
    
    // ============================================
    // PLAYBACK
    // ============================================
    
    addPlaybackButton(messageElement, messageText) {
        // Check if message already has playback button
        if (messageElement.querySelector('.voice-playback-btn')) {
            return;
        }
        
        const playbackBtn = document.createElement('button');
        playbackBtn.className = 'voice-playback-btn btn-icon';
        playbackBtn.title = 'Play as audio';
        playbackBtn.innerHTML = '🔊';
        playbackBtn.dataset.text = messageText;
        
        playbackBtn.addEventListener('click', () => this.playMessage(messageText, playbackBtn));
        
        // Add to message
        const messageContent = messageElement.querySelector('.message-content');
        if (messageContent) {
            messageContent.appendChild(playbackBtn);
        }
    }
    
    async playMessage(text, button) {
        try {
            // Stop any currently playing audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            // Show loading
            const originalHTML = button.innerHTML;
            button.innerHTML = '⏳';
            button.disabled = true;
            
            const response = await fetch(`${this.API_BASE}/voice/synthesize`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error('Speech synthesis failed');
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            this.currentAudio = new Audio(audioUrl);
            
            this.currentAudio.addEventListener('ended', () => {
                button.innerHTML = originalHTML;
                button.disabled = false;
                URL.revokeObjectURL(audioUrl);
            });
            
            this.currentAudio.addEventListener('error', () => {
                button.innerHTML = originalHTML;
                button.disabled = false;
                alert('Failed to play audio');
            });
            
            await this.currentAudio.play();
            button.innerHTML = '⏸️';
            
        } catch (error) {
            console.error('Playback error:', error);
            button.innerHTML = '🔊';
            button.disabled = false;
            alert('Failed to play message as audio');
        }
    }
    
    // ============================================
    // SETTINGS
    // ============================================
    
    async showSettings() {
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
            const btn = this.elements.previewVoiceBtn;
            btn.disabled = true;
            btn.textContent = '⏳ Loading...';
            
            const response = await fetch(`${this.API_BASE}/voice/synthesize`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: sampleText, voice_id: voiceId })
            });
            
            if (!response.ok) {
                throw new Error('Preview failed');
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.addEventListener('ended', () => {
                btn.disabled = false;
                btn.textContent = '▶️ Preview Voice';
                URL.revokeObjectURL(audioUrl);
            });
            
            await audio.play();
            btn.textContent = '⏸️ Playing...';
            
        } catch (error) {
            console.error('Preview error:', error);
            this.elements.previewVoiceBtn.disabled = false;
            this.elements.previewVoiceBtn.textContent = '▶️ Preview Voice';
            alert('Failed to preview voice');
        }
    }
    
    async saveSettings() {
        const voiceId = this.elements.voiceSelect.value;
        
        if (!voiceId) {
            alert('Please select a voice');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/voice/preference`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice_id: voiceId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save preference');
            }
            
            this.userPreferredVoice = voiceId;
            this.hideSettings();
            
            // Show confirmation
            alert('Voice preference saved!');
            
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