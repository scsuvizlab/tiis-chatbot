// Simple Voice Playback - Single Button Approach
// Add this to the END of user-voice-interface.js

class SimpleVoicePlayback {
    constructor() {
        this.currentAudio = null;
        this.lastBotMessage = null;
        this.playing = false;
        this.injectButton();
        this.setupListener();
    }
    
    injectButton() {
        // Add speaker button next to settings button
        const inputRow = document.querySelector('.input-row');
        if (!inputRow) return;
        
        const playBtn = document.createElement('button');
        playBtn.id = 'play-last-message-btn';
        playBtn.className = 'btn-icon voice-playback-btn';
        playBtn.title = 'Play last message';
        playBtn.innerHTML = '🔊';
        
        // Insert at the end (after settings button)
        inputRow.appendChild(playBtn);
        
        this.playBtn = playBtn;
        
        playBtn.addEventListener('click', () => this.playLastMessage());
    }
    
    setupListener() {
        // Watch for new messages being added
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;
        
        const observer = new MutationObserver(() => {
            this.updateLastMessage();
        });
        
        observer.observe(messagesContainer, { childList: true });
        
        // Check on init
        this.updateLastMessage();
    }
    
    updateLastMessage() {
        // Find the last bot message
        const botMessages = document.querySelectorAll('.bot-message, .assistant-message');
        if (botMessages.length === 0) {
            this.playBtn.disabled = true;
            this.playBtn.title = 'No messages to play';
            return;
        }
        
        const lastMsg = botMessages[botMessages.length - 1];
        const textEl = lastMsg.querySelector('.message-text, .message-bubble');
        
        if (textEl) {
            this.lastBotMessage = textEl.textContent.trim();
            this.playBtn.disabled = false;
            this.playBtn.title = 'Play last message';
        }
    }
    
    async playLastMessage() {
        if (!this.lastBotMessage) {
            alert('No message to play');
            return;
        }
        
        // If already playing, stop
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.playBtn.innerHTML = '🔊';
            this.playing = false;
            return;
        }
        
        try {
            // Show loading
            this.playBtn.innerHTML = '⏳';
            this.playBtn.disabled = true;
            
            const response = await fetch('/api/voice/synthesize', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: this.lastBotMessage })
            });
            
            if (!response.ok) {
                throw new Error('Failed to synthesize speech');
            }
            
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            this.currentAudio = new Audio(audioUrl);
            
            this.currentAudio.addEventListener('ended', () => {
                this.playBtn.innerHTML = '🔊';
                this.playBtn.disabled = false;
                this.currentAudio = null;
                this.playing = false;
                URL.revokeObjectURL(audioUrl);
            });
            
            this.currentAudio.addEventListener('error', () => {
                this.playBtn.innerHTML = '🔊';
                this.playBtn.disabled = false;
                this.currentAudio = null;
                this.playing = false;
                alert('Failed to play audio');
            });
            
            await this.currentAudio.play();
            this.playBtn.innerHTML = '⏸️';
            this.playBtn.disabled = false;
            this.playing = true;
            
        } catch (error) {
            console.error('Playback error:', error);
            this.playBtn.innerHTML = '🔊';
            this.playBtn.disabled = false;
            alert('Failed to play message');
        }
    }
}

// Initialize simple playback
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simpleVoicePlayback = new SimpleVoicePlayback();
    });
} else {
    window.simpleVoicePlayback = new SimpleVoicePlayback();
}
