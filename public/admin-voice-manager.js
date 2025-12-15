// Admin Voice Manager Component
// Handles voice configuration UI and API interactions

class AdminVoiceManager {
    constructor(adminToken) {
        this.adminToken = adminToken;
        this.API_BASE = '/api';
        this.voiceConfig = null;
        this.currentAudio = null; // For playing test audio
        this.elements = {};
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.setupEventListeners();
    }
    
    cacheElements() {
        this.elements = {
            // Main voice button
            voiceManagementBtn: document.getElementById('voice-management-btn'),
            
            // Voice Modal
            voiceModal: document.getElementById('voice-modal'),
            closeVoiceModalBtn: document.getElementById('close-voice-modal-btn'),
            
            // Voice List
            voicesList: document.getElementById('voices-list'),
            addVoiceBtn: document.getElementById('add-voice-btn'),
            
            // Default voice selector
            defaultVoiceSelect: document.getElementById('default-voice-select'),
            
            // Save button
            saveVoiceConfigBtn: document.getElementById('save-voice-config-btn'),
            
            // Add/Edit Voice Form
            voiceFormModal: document.getElementById('voice-form-modal'),
            voiceFormTitle: document.getElementById('voice-form-title'),
            voiceForm: document.getElementById('voice-form'),
            voiceIdInput: document.getElementById('voice-id-input'),
            voiceNameInput: document.getElementById('voice-name-input'),
            voiceDescInput: document.getElementById('voice-desc-input'),
            cancelVoiceFormBtn: document.getElementById('cancel-voice-form-btn'),
            
            // Browse API Voices
            browseApiVoicesBtn: document.getElementById('browse-api-voices-btn'),
            apiVoicesModal: document.getElementById('api-voices-modal'),
            apiVoicesList: document.getElementById('api-voices-list'),
            closeApiVoicesBtn: document.getElementById('close-api-voices-btn'),
            
            // Status messages
            voiceStatusMessage: document.getElementById('voice-status-message')
        };
    }
    
    setupEventListeners() {
        // Open voice management
        this.elements.voiceManagementBtn?.addEventListener('click', () => this.show());
        
        // Close modal
        this.elements.closeVoiceModalBtn?.addEventListener('click', () => this.hide());
        
        // Add voice
        this.elements.addVoiceBtn?.addEventListener('click', () => this.showVoiceForm());
        
        // Save configuration
        this.elements.saveVoiceConfigBtn?.addEventListener('click', () => this.saveConfiguration());
        
        // Voice form
        this.elements.voiceForm?.addEventListener('submit', (e) => this.handleVoiceFormSubmit(e));
        this.elements.cancelVoiceFormBtn?.addEventListener('click', () => this.hideVoiceForm());
        
        // Browse API voices
        this.elements.browseApiVoicesBtn?.addEventListener('click', () => this.browseApiVoices());
        this.elements.closeApiVoicesBtn?.addEventListener('click', () => this.hideApiVoicesModal());
    }
    
    async show() {
        this.elements.voiceModal.classList.remove('hidden');
        await this.loadConfiguration();
    }
    
    hide() {
        this.elements.voiceModal.classList.add('hidden');
        this.stopAudio();
    }
    
    async loadConfiguration() {
        try {
            this.showStatus('Loading configuration...', 'info');
            
            const response = await fetch(`${this.API_BASE}/voice/admin/config`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }
            
            this.voiceConfig = await response.json();
            this.renderVoicesList();
            this.updateDefaultVoiceSelect();
            this.hideStatus();
            
        } catch (error) {
            console.error('Error loading voice configuration:', error);
            this.showStatus('Failed to load configuration: ' + error.message, 'error');
        }
    }
    
    renderVoicesList() {
        if (!this.voiceConfig || !this.voiceConfig.voices) {
            this.elements.voicesList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No voices configured yet. Add your first voice to get started.
                </div>
            `;
            return;
        }
        
        this.elements.voicesList.innerHTML = '';
        
        this.voiceConfig.voices.forEach((voice, index) => {
            const voiceItem = document.createElement('div');
            voiceItem.className = 'voice-item';
            voiceItem.dataset.index = index;
            
            const isDefault = voice.id === this.voiceConfig.default_voice_id;
            
            voiceItem.innerHTML = `
                <div class="voice-item-header">
                    <div class="voice-item-title">
                        <strong>${voice.name}</strong>
                        ${isDefault ? '<span class="badge badge-primary">Default</span>' : ''}
                    </div>
                    <div class="voice-item-actions">
                        <button class="btn btn-icon test-voice-btn" data-voice-id="${voice.id}" title="Test Voice">
                            ▶️
                        </button>
                        <button class="btn btn-icon edit-voice-btn" data-index="${index}" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-icon delete-voice-btn" data-index="${index}" title="Delete">
                            🗑️
                        </button>
                        ${index > 0 ? `<button class="btn btn-icon move-up-btn" data-index="${index}" title="Move Up">⬆️</button>` : ''}
                        ${index < this.voiceConfig.voices.length - 1 ? `<button class="btn btn-icon move-down-btn" data-index="${index}" title="Move Down">⬇️</button>` : ''}
                    </div>
                </div>
                <div class="voice-item-details">
                    <div class="voice-id"><code>${voice.id}</code></div>
                    <div class="voice-description">${voice.description || 'No description'}</div>
                </div>
            `;
            
            this.elements.voicesList.appendChild(voiceItem);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.test-voice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.testVoice(btn.dataset.voiceId, btn);
            });
        });
        
        document.querySelectorAll('.edit-voice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editVoice(parseInt(btn.dataset.index));
            });
        });
        
        document.querySelectorAll('.delete-voice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteVoice(parseInt(btn.dataset.index));
            });
        });
        
        document.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveVoice(parseInt(btn.dataset.index), 'up');
            });
        });
        
        document.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveVoice(parseInt(btn.dataset.index), 'down');
            });
        });
    }
    
    updateDefaultVoiceSelect() {
        this.elements.defaultVoiceSelect.innerHTML = '';
        
        if (!this.voiceConfig || !this.voiceConfig.voices || this.voiceConfig.voices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No voices available';
            this.elements.defaultVoiceSelect.appendChild(option);
            this.elements.defaultVoiceSelect.disabled = true;
            return;
        }
        
        this.elements.defaultVoiceSelect.disabled = false;
        
        this.voiceConfig.voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = voice.name;
            if (voice.id === this.voiceConfig.default_voice_id) {
                option.selected = true;
            }
            this.elements.defaultVoiceSelect.appendChild(option);
        });
    }
    
    showVoiceForm(voice = null, index = null) {
        if (voice) {
            // Edit mode
            this.elements.voiceFormTitle.textContent = 'Edit Voice';
            this.elements.voiceIdInput.value = voice.id;
            this.elements.voiceNameInput.value = voice.name;
            this.elements.voiceDescInput.value = voice.description || '';
            this.elements.voiceForm.dataset.editIndex = index;
        } else {
            // Add mode
            this.elements.voiceFormTitle.textContent = 'Add New Voice';
            this.elements.voiceIdInput.value = '';
            this.elements.voiceNameInput.value = '';
            this.elements.voiceDescInput.value = '';
            delete this.elements.voiceForm.dataset.editIndex;
        }
        
        this.elements.voiceFormModal.classList.remove('hidden');
    }
    
    hideVoiceForm() {
        this.elements.voiceFormModal.classList.add('hidden');
        this.elements.voiceForm.reset();
    }
    
    handleVoiceFormSubmit(e) {
        e.preventDefault();
        
        const voiceId = this.elements.voiceIdInput.value.trim();
        const voiceName = this.elements.voiceNameInput.value.trim();
        const voiceDesc = this.elements.voiceDescInput.value.trim();
        
        if (!voiceId || !voiceName) {
            alert('Voice ID and Name are required');
            return;
        }
        
        const newVoice = {
            id: voiceId,
            name: voiceName,
            description: voiceDesc
        };
        
        const editIndex = this.elements.voiceForm.dataset.editIndex;
        
        if (editIndex !== undefined) {
            // Edit existing voice
            this.voiceConfig.voices[parseInt(editIndex)] = newVoice;
        } else {
            // Add new voice
            if (!this.voiceConfig.voices) {
                this.voiceConfig.voices = [];
            }
            this.voiceConfig.voices.push(newVoice);
            
            // Set as default if it's the first voice
            if (this.voiceConfig.voices.length === 1) {
                this.voiceConfig.default_voice_id = newVoice.id;
            }
        }
        
        this.renderVoicesList();
        this.updateDefaultVoiceSelect();
        this.hideVoiceForm();
        
        // Auto-save configuration after voice changes
        this.saveConfiguration();
    }
    
    editVoice(index) {
        const voice = this.voiceConfig.voices[index];
        this.showVoiceForm(voice, index);
    }
    
    deleteVoice(index) {
        const voice = this.voiceConfig.voices[index];
        
        if (!confirm(`Are you sure you want to delete "${voice.name}"?`)) {
            return;
        }
        
        // Check if this is the default voice
        if (voice.id === this.voiceConfig.default_voice_id) {
            // Set new default (first remaining voice or null)
            const remainingVoices = this.voiceConfig.voices.filter((_, i) => i !== index);
            this.voiceConfig.default_voice_id = remainingVoices[0]?.id || null;
        }
        
        this.voiceConfig.voices.splice(index, 1);
        this.renderVoicesList();
        this.updateDefaultVoiceSelect();
        
        // Auto-save configuration after deletion
        this.saveConfiguration();
    }
    
    moveVoice(index, direction) {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (newIndex < 0 || newIndex >= this.voiceConfig.voices.length) {
            return;
        }
        
        // Swap voices
        const temp = this.voiceConfig.voices[index];
        this.voiceConfig.voices[index] = this.voiceConfig.voices[newIndex];
        this.voiceConfig.voices[newIndex] = temp;
        
        this.renderVoicesList();
    }
    
    async testVoice(voiceId, button) {
        try {
            // Stop any currently playing audio
            this.stopAudio();
            
            // Show loading state
            const originalText = button.textContent;
            button.textContent = '⏳';
            button.disabled = true;
            
            const response = await fetch(`${this.API_BASE}/voice/admin/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ voice_id: voiceId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to test voice');
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            this.currentAudio = new Audio(audioUrl);
            this.currentAudio.addEventListener('ended', () => {
                button.textContent = originalText;
                button.disabled = false;
                URL.revokeObjectURL(audioUrl);
            });
            
            this.currentAudio.addEventListener('error', () => {
                button.textContent = originalText;
                button.disabled = false;
                alert('Failed to play audio');
            });
            
            await this.currentAudio.play();
            button.textContent = '⏸️';
            
        } catch (error) {
            console.error('Error testing voice:', error);
            button.textContent = '▶️';
            button.disabled = false;
            alert('Failed to test voice: ' + error.message);
        }
    }
    
    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }
    
    async saveConfiguration() {
        try {
            this.showStatus('Saving configuration...', 'info');
            
            // Get selected default voice
            const defaultVoiceId = this.elements.defaultVoiceSelect.value;
            
            const configToSave = {
                voices: this.voiceConfig.voices,
                default_voice_id: defaultVoiceId
            };
            
            const response = await fetch(`${this.API_BASE}/voice/admin/config`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configToSave)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }
            
            const result = await response.json();
            this.voiceConfig = result.config;
            
            this.showStatus('✅ Configuration saved successfully!', 'success');
            
            setTimeout(() => this.hideStatus(), 3000);
            
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showStatus('❌ Failed to save: ' + error.message, 'error');
        }
    }
    
    async browseApiVoices() {
        try {
            this.elements.apiVoicesModal.classList.remove('hidden');
            this.elements.apiVoicesList.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading voices from Eleven Labs...</p>';
            
            const response = await fetch(`${this.API_BASE}/voice/admin/api-voices`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch voices from API');
            }
            
            const data = await response.json();
            this.renderApiVoices(data.voices);
            
        } catch (error) {
            console.error('Error browsing API voices:', error);
            this.elements.apiVoicesList.innerHTML = `
                <p style="text-align: center; padding: 2rem; color: var(--danger-color);">
                    Failed to load voices: ${error.message}
                </p>
            `;
        }
    }
    
    renderApiVoices(voices) {
        if (!voices || voices.length === 0) {
            this.elements.apiVoicesList.innerHTML = '<p style="text-align: center; padding: 2rem;">No voices available</p>';
            return;
        }
        
        this.elements.apiVoicesList.innerHTML = '';
        
        voices.forEach(voice => {
            const voiceItem = document.createElement('div');
            voiceItem.className = 'api-voice-item';
            
            voiceItem.innerHTML = `
                <div class="api-voice-info">
                    <strong>${voice.name}</strong>
                    <div class="api-voice-meta">
                        <span class="badge">${voice.category || 'Unknown'}</span>
                        <code>${voice.voice_id}</code>
                    </div>
                    ${voice.description ? `<p>${voice.description}</p>` : ''}
                </div>
                <button class="btn btn-secondary btn-sm use-voice-btn" data-voice-id="${voice.voice_id}" data-voice-name="${voice.name}">
                    Use This Voice
                </button>
            `;
            
            this.elements.apiVoicesList.appendChild(voiceItem);
        });
        
        // Add event listeners
        document.querySelectorAll('.use-voice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.useApiVoice(btn.dataset.voiceId, btn.dataset.voiceName);
            });
        });
    }
    
    useApiVoice(voiceId, voiceName) {
        this.hideApiVoicesModal();
        this.showVoiceForm({
            id: voiceId,
            name: voiceName,
            description: 'Voice from Eleven Labs library'
        });
    }
    
    hideApiVoicesModal() {
        this.elements.apiVoicesModal.classList.add('hidden');
    }
    
    showStatus(message, type = 'info') {
        this.elements.voiceStatusMessage.textContent = message;
        this.elements.voiceStatusMessage.className = `status-message status-${type}`;
        this.elements.voiceStatusMessage.classList.remove('hidden');
    }
    
    hideStatus() {
        this.elements.voiceStatusMessage.classList.add('hidden');
    }
}

// Export for use in admin dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminVoiceManager;
}