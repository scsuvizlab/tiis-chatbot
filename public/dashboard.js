// TIIS Dashboard - Full Implementation
const API_BASE = '/api';

// Global state
let currentUser = null;
let conversations = [];
let currentConversationId = null;
let currentConversation = null;
let pendingAttachments = [];

// DOM Elements - will be set after DOM loads
let elements = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('=== DASHBOARD INIT STARTED ===');
    
    try {
        // Verify authentication
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!data.valid) {
            console.log('Token invalid, redirecting to login');
            window.location.href = '/';
            return;
        }
        
        currentUser = data.user;
        console.log('✅ User authenticated:', currentUser.email);
        
        // Cache DOM elements
        cacheElements();
        
        // Set up event listeners
        setupEventListeners();
        
        // Update UI with user info
        updateUserInfo();
        
        // Load conversations
        await loadConversations();
        
        // Check if should start onboarding
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('start_onboarding') === 'true') {
            await startOnboarding();
        }
        
        console.log('✅ Dashboard loaded successfully!');
        
    } catch (error) {
        console.error('❌ Dashboard init error:', error);
        alert('Failed to load dashboard. Please try logging in again.');
        window.location.href = '/';
    }
}

// Cache DOM element references
function cacheElements() {
    elements = {
        // User info
        userName: document.getElementById('user-name'),
        userAvatar: document.getElementById('user-avatar'),
        
        // Sidebar
        conversationList: document.getElementById('conversation-list'),
        newTaskBtn: document.getElementById('new-task-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        
        // Mobile menu
        mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
        mobileMenuClose: document.getElementById('mobile-menu-close'),
        sidebar: document.querySelector('.sidebar'),
        
        // Main content
        chatTitle: document.getElementById('chat-title'),
        welcomeScreen: document.getElementById('welcome-screen'),
        chatArea: document.getElementById('chat-area'),
        messagesContainer: document.getElementById('messages'),
        
        // Welcome screen
        startOnboardingBtn: document.getElementById('start-onboarding-btn'),
        
        // Input area
        userInput: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        attachBtn: document.getElementById('attach-btn'),
        fileInput: document.getElementById('file-input'),
        attachmentPreview: document.getElementById('attachment-preview'),
        
        // Actions
        deleteConversationBtn: document.getElementById('delete-conversation-btn'),
        
        // Indicators
        typingIndicator: document.getElementById('typing-indicator'),
        
        // Modals
        summaryModal: document.getElementById('summary-modal'),
        summaryText: document.getElementById('summary-text'),
        modifySummaryBtn: document.getElementById('modify-summary-btn'),
        approveSummaryBtn: document.getElementById('approve-summary-btn'),
        
        deleteModal: document.getElementById('delete-modal'),
        cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
        
        // Storage
        storageFill: document.getElementById('storage-fill'),
        storageText: document.getElementById('storage-text')
    };
}

// Set up all event listeners
function setupEventListeners() {
    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // New task
    elements.newTaskBtn.addEventListener('click', handleNewTask);
    
    // Mobile menu
    if (elements.mobileMenuToggle) {
        elements.mobileMenuToggle.addEventListener('click', () => {
            elements.sidebar.classList.add('mobile-open');
        });
    }
    
    if (elements.mobileMenuClose) {
        elements.mobileMenuClose.addEventListener('click', () => {
            elements.sidebar.classList.remove('mobile-open');
        });
    }
    
    // Message input
    elements.sendBtn.addEventListener('click', handleSendMessage);
    elements.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Auto-resize textarea
    elements.userInput.addEventListener('input', () => {
        elements.userInput.style.height = 'auto';
        elements.userInput.style.height = elements.userInput.scrollHeight + 'px';
    });
    
    // File attachments
    elements.attachBtn.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.chatArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.chatArea.classList.add('drag-over');
    });
    
    elements.chatArea.addEventListener('dragleave', () => {
        elements.chatArea.classList.remove('drag-over');
    });
    
    elements.chatArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.chatArea.classList.remove('drag-over');
        handleFileDrop(e.dataTransfer.files);
    });
    
    // Delete conversation
    elements.deleteConversationBtn.addEventListener('click', handleDeleteClick);
    elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
    
    // Onboarding summary modal
    elements.modifySummaryBtn.addEventListener('click', handleModifySummary);
    elements.approveSummaryBtn.addEventListener('click', handleApproveSummary);
    
    // Start onboarding from welcome screen
    if (elements.startOnboardingBtn) {
        elements.startOnboardingBtn.addEventListener('click', startOnboarding);
    }
}

// Update user info in UI
function updateUserInfo() {
    if (elements.userName) {
        elements.userName.textContent = currentUser.name;
    }
    
    if (elements.userAvatar) {
        const initials = currentUser.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        elements.userAvatar.textContent = initials;
    }
}

// Load conversations from API
async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE}/conversations/list`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }
        
        const data = await response.json();
        conversations = data.conversations || [];
        
        renderConversationList();
        updateStorageDisplay();
        
        // Handle initial view
        if (conversations.length === 0) {
            // No conversations - show welcome screen
            showWelcomeScreen();
        } else if (!currentConversationId) {
            // Has conversations but none selected - auto-load the first one
            await loadConversation(conversations[0].conversation_id);
        }
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        elements.conversationList.innerHTML = '<div class="error-message">Failed to load conversations</div>';
    }
}

// Render conversation list in sidebar
function renderConversationList() {
    if (conversations.length === 0) {
        elements.conversationList.innerHTML = '<div class="empty-state">No conversations yet. Complete onboarding to get started!</div>';
        return;
    }
    
    elements.conversationList.innerHTML = '';
    
    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        
        if (conv.conversation_id === currentConversationId) {
            item.classList.add('active');
        }
        
        if (conv.type === 'onboarding') {
            item.classList.add('pinned');
            if (conv.status === 'complete') {
                item.classList.add('complete');
            }
        }
        
        // Icon
        const icon = conv.type === 'onboarding' ? '🎯' : '📋';
        
        // Time ago
        const timeAgo = getTimeAgo(conv.last_updated);
        
        item.innerHTML = `
            <div class="conversation-icon">${icon}</div>
            <div class="conversation-details">
                <div class="conversation-title">${conv.title || 'Untitled'}</div>
                <div class="conversation-meta">
                    ${conv.has_attachments ? '📎 ' : ''}
                    ${conv.message_count} messages
                    ${conv.status === 'complete' ? ' • ✓ Complete' : ''}
                </div>
                <div class="conversation-time">${timeAgo}</div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            loadConversation(conv.conversation_id);
            
            // Close mobile menu if open
            if (elements.sidebar.classList.contains('mobile-open')) {
                elements.sidebar.classList.remove('mobile-open');
            }
        });
        
        elements.conversationList.appendChild(item);
    });
}

// Load and display a specific conversation
async function loadConversation(conversationId) {
    try {
        const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversation');
        }
        
        const data = await response.json();
        currentConversation = data.conversation;
        currentConversationId = conversationId;
        
        // Update UI
        showChatArea();
        renderConversation();
        
        // Update active state in sidebar
        renderConversationList();
        
    } catch (error) {
        console.error('Error loading conversation:', error);
        alert('Failed to load conversation');
    }
}

// Render conversation messages
function renderConversation() {
    if (!currentConversation) return;
    
    // Update title
    elements.chatTitle.textContent = currentConversation.title;
    
    // Show/hide delete button (can't delete onboarding)
    if (currentConversation.type === 'onboarding') {
        elements.deleteConversationBtn.classList.add('hidden');
    } else {
        elements.deleteConversationBtn.classList.remove('hidden');
    }
    
    // Clear messages
    elements.messagesContainer.innerHTML = '';
    
    // Render each message
    currentConversation.messages.forEach(msg => {
        renderMessage(msg);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

// Render a single message
function renderMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}-message`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    // Handle content array (text + attachments)
    const content = Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }];
    
    // Render attachments first
    const attachments = content.filter(c => c.type === 'image' || c.type === 'document');
    if (attachments.length > 0) {
        const attachDiv = document.createElement('div');
        attachDiv.className = 'message-attachments';
        attachments.forEach(att => {
            const badge = document.createElement('div');
            badge.className = 'attachment-badge';
            badge.textContent = att.type === 'image' ? '🖼️ Image' : '📄 PDF';
            attachDiv.appendChild(badge);
        });
        bubbleDiv.appendChild(attachDiv);
    }
    
    // Render text
    const textContent = content.find(c => c.type === 'text');
    if (textContent) {
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = textContent.text;
        bubbleDiv.appendChild(textDiv);
    }
    
    messageDiv.appendChild(bubbleDiv);
    elements.messagesContainer.appendChild(messageDiv);
    
    // Add voice playback button to bot messages
    if (message.role === 'assistant' && window.userVoiceInterface) {
        const textContent = Array.isArray(message.content) 
            ? message.content.find(c => c.type === 'text')?.text 
            : message.content;
        
        if (textContent) {
            window.userVoiceInterface.addPlaybackButton(messageDiv, textContent);
        }
    }
}

// Send message
async function handleSendMessage() {
    if (!currentConversationId) {
        alert('Please select or create a conversation first');
        return;
    }
    
    const message = elements.userInput.value.trim();
    
    if (!message && pendingAttachments.length === 0) {
        return;
    }
    
    // Disable input while sending
    elements.userInput.disabled = true;
    elements.sendBtn.disabled = true;
    
    try {
        // Prepare attachments
        const attachments = await Promise.all(
            pendingAttachments.map(file => fileToBase64(file))
        );
        
        // Determine endpoint
        const isOnboarding = currentConversation.type === 'onboarding';
        const endpoint = isOnboarding 
            ? `${API_BASE}/conversations/onboarding/message`
            : `${API_BASE}/conversations/task/message`;
        
        // Show typing indicator
        elements.typingIndicator.classList.remove('hidden');
        
        // Send message
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: currentConversationId,
                message,
                attachments: attachments.length > 0 ? attachments : undefined
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        const data = await response.json();
        
        // Hide typing indicator
        elements.typingIndicator.classList.add('hidden');
        
        // Clear input and attachments
        elements.userInput.value = '';
        elements.userInput.style.height = 'auto';
        pendingAttachments = [];
        renderAttachmentPreview();
        
        // Update conversation title if generated
        if (data.title_generated) {
            currentConversation.title = data.title_generated;
            elements.chatTitle.textContent = data.title_generated;
            await loadConversations(); // Refresh sidebar
        }
        
        // Reload conversation to show new messages
        await loadConversation(currentConversationId);
        
        // Check if onboarding summary
        if (isOnboarding && data.is_summary) {
            showSummaryModal(data.bot_response);
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        elements.typingIndicator.classList.add('hidden');
        alert('Failed to send message. Please try again.');
    } finally {
        elements.userInput.disabled = false;
        elements.sendBtn.disabled = false;
        elements.userInput.focus();
    }
}

// Handle file selection
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addAttachments(files);
    event.target.value = ''; // Reset input
}

// Handle file drop
function handleFileDrop(files) {
    const fileArray = Array.from(files);
    addAttachments(fileArray);
}

// Add attachments to pending list
function addAttachments(files) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    files.forEach(file => {
        if (!allowedTypes.includes(file.type)) {
            alert(`File type not supported: ${file.name}`);
            return;
        }
        
        if (file.size > maxSize) {
            alert(`File too large (max 10MB): ${file.name}`);
            return;
        }
        
        pendingAttachments.push(file);
    });
    
    renderAttachmentPreview();
}

// Render attachment preview
function renderAttachmentPreview() {
    if (pendingAttachments.length === 0) {
        elements.attachmentPreview.innerHTML = '';
        elements.attachmentPreview.style.display = 'none';
        return;
    }
    
    elements.attachmentPreview.style.display = 'flex';
    elements.attachmentPreview.innerHTML = '';
    
    pendingAttachments.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'attachment-preview-item';
        
        const icon = file.type.startsWith('image/') ? '🖼️' : '📄';
        
        item.innerHTML = `
            <span>${icon} ${file.name}</span>
            <button class="btn-remove" data-index="${index}">×</button>
        `;
        
        item.querySelector('.btn-remove').addEventListener('click', () => {
            removeAttachment(index);
        });
        
        elements.attachmentPreview.appendChild(item);
    });
}

// Remove attachment from pending list
function removeAttachment(index) {
    pendingAttachments.splice(index, 1);
    renderAttachmentPreview();
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64
            });
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Create new task conversation
async function handleNewTask() {
    try {
        const response = await fetch(`${API_BASE}/conversations/task/new`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const data = await response.json();
            if (data.error === 'Complete onboarding first') {
                alert('Please complete your onboarding conversation before creating tasks.');
                return;
            }
            throw new Error('Failed to create task');
        }
        
        const data = await response.json();
        
        // Reload conversations
        await loadConversations();
        
        // Load the new conversation
        await loadConversation(data.conversation_id);
        
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create new task');
    }
}

// Start onboarding conversation
async function startOnboarding() {
    try {
        const response = await fetch(`${API_BASE}/conversations/onboarding/start`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('Failed to start onboarding');
        }
        
        const data = await response.json();
        
        // Reload conversations
        await loadConversations();
        
        // Load the onboarding conversation
        await loadConversation(data.conversation_id);
        
    } catch (error) {
        console.error('Error starting onboarding:', error);
        alert('Failed to start onboarding');
    }
}

// Show summary modal for onboarding completion
function showSummaryModal(summary) {
    elements.summaryText.textContent = summary;
    elements.summaryModal.classList.remove('hidden');
}

// Handle modify summary
function handleModifySummary() {
    elements.summaryModal.classList.add('hidden');
    elements.userInput.focus();
}

// Handle approve summary
async function handleApproveSummary() {
    try {
        const summary = elements.summaryText.textContent;
        
        const response = await fetch(`${API_BASE}/conversations/onboarding/complete`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: 'onboarding',
                summary
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to complete onboarding');
        }
        
        elements.summaryModal.classList.add('hidden');
        
        // Update user state
        currentUser.onboarding_complete = true;
        
        // Reload conversations
        await loadConversations();
        
        // Reload current conversation
        await loadConversation('onboarding');
        
        alert('✓ Onboarding complete! You can now create task conversations.');
        
    } catch (error) {
        console.error('Error completing onboarding:', error);
        alert('Failed to complete onboarding');
    }
}

// Delete conversation
function handleDeleteClick() {
    if (!currentConversationId || currentConversation.type === 'onboarding') {
        return;
    }
    
    elements.deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
    elements.deleteModal.classList.add('hidden');
}

async function handleDeleteConfirm() {
    try {
        const response = await fetch(`${API_BASE}/conversations/${currentConversationId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete conversation');
        }
        
        hideDeleteModal();
        
        // Clear current conversation
        currentConversationId = null;
        currentConversation = null;
        
        // Reload conversations
        await loadConversations();
        
        // Show welcome screen
        showWelcomeScreen();
        
    } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation');
    }
}

// Show welcome screen
function showWelcomeScreen() {
    elements.welcomeScreen.classList.remove('hidden');
    elements.chatArea.classList.add('hidden');
    elements.chatTitle.textContent = 'Welcome';
    
    // Handle onboarding button visibility and welcome message
    const welcomeSection = document.querySelector('.welcome-section');
    
    if (currentUser.onboarding_complete) {
        // Onboarding complete - hide the onboarding section
        if (elements.startOnboardingBtn) {
            const onboardingSection = elements.startOnboardingBtn.closest('.welcome-section');
            if (onboardingSection) {
                onboardingSection.style.display = 'none';
            }
        }
    } else {
        // Onboarding not complete - make sure button is visible
        if (elements.startOnboardingBtn) {
            const onboardingSection = elements.startOnboardingBtn.closest('.welcome-section');
            if (onboardingSection) {
                onboardingSection.style.display = 'block';
            }
        }
    }
}

// Show chat area
function showChatArea() {
    elements.welcomeScreen.classList.add('hidden');
    elements.chatArea.classList.remove('hidden');
}

// Update storage display
function updateStorageDisplay() {
    // This would need to be updated from server
    // For now, just show placeholder
    const usedMB = 0;
    const totalMB = 25;
    const percentage = (usedMB / totalMB) * 100;
    
    if (elements.storageFill) {
        elements.storageFill.style.width = `${percentage}%`;
    }
    
    if (elements.storageText) {
        elements.storageText.textContent = `${usedMB.toFixed(1)} MB / ${totalMB} MB`;
    }
}

// Scroll to bottom of messages
function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Handle logout
async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Redirect to login
    window.location.href = '/';
}

// Utility: Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return then.toLocaleDateString();
}