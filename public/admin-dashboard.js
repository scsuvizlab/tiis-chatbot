// Admin Dashboard JavaScript - COMPLETE VERSION
// Includes full Create User modal and View User conversations functionality

const API_BASE = window.location.origin + '/api';

// Global state
let adminToken = null;
let users = [];
let stats = null;
let toolsManager = null;
let currentViewingUser = null;

// DOM elements cache
let elements = {};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    setupEventListeners();
    createModals(); // Create modals dynamically
    
    // Check if already logged in
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
        adminToken = savedToken;
        showDashboard();
    } else {
        showLoginScreen();
    }
});

function cacheElements() {
    elements = {
        // Login
        loginScreen: document.getElementById('login-screen'),
        adminLoginForm: document.getElementById('admin-login-form'),
        adminPassword: document.getElementById('admin-password'),
        loginError: document.getElementById('login-error'),
        
        // Navigation
        usersTab: document.getElementById('users-tab'),
        reportsTab: document.getElementById('reports-tab'),
        toolsTab: document.getElementById('tools-tab'),
        exportTab: document.getElementById('export-tab'),
        logoutBtn: document.getElementById('logout-btn'),
        
        // Sections
        usersSection: document.getElementById('users-section'),
        reportsSection: document.getElementById('reports-section'),
        toolsSection: document.getElementById('tools-section'),
        exportSection: document.getElementById('export-section'),
        
        // Stats
        statTotalUsers: document.getElementById('stat-total-users'),
        statOnboarding: document.getElementById('stat-onboarding'),
        statTasks: document.getElementById('stat-tasks'),
        statMessages: document.getElementById('stat-messages'),
        
        // Users
        createUserBtn: document.getElementById('create-user-btn'),
        usersTableContainer: document.getElementById('users-table-container'),
        
        // Export
        exportAllBtn: document.getElementById('export-all-btn'),
        
        // Tools
        toolsContainer: document.getElementById('tools-container')
    };
}

function setupEventListeners() {
    // Login
    elements.adminLoginForm?.addEventListener('submit', handleLogin);
    
    // Navigation tabs
    elements.usersTab?.addEventListener('click', () => showSection('users'));
    elements.reportsTab?.addEventListener('click', () => showSection('reports'));
    elements.toolsTab?.addEventListener('click', () => showSection('tools'));
    elements.exportTab?.addEventListener('click', () => showSection('export'));
    
    // Logout
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // Export
    elements.exportAllBtn?.addEventListener('click', handleExport);
    
    // Create user
    elements.createUserBtn?.addEventListener('click', showCreateUserModal);
}

// ============================================
// MODALS - Create dynamically
// ============================================

function createModals() {
    // Create User Modal
    const createUserModal = document.createElement('div');
    createUserModal.id = 'create-user-modal';
    createUserModal.className = 'modal hidden';
    createUserModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">Create New User</h2>
                <button id="close-create-user" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">×</button>
            </div>
            
            <form id="create-user-form">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Full Name *</label>
                    <input type="text" id="new-user-name" required 
                           style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);"
                           placeholder="Sarah Johnson">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email *</label>
                    <input type="email" id="new-user-email" required 
                           style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);"
                           placeholder="sarah@gsdc.org">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Job Title *</label>
                    <input type="text" id="new-user-role" required 
                           style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);"
                           placeholder="Director of Community Engagement">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Temporary Password *</label>
                    <input type="password" id="new-user-password" required minlength="8"
                           style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);"
                           placeholder="Min 8 characters">
                    <small style="color: var(--text-secondary); font-size: 0.875rem;">User will be required to change on first login</small>
                </div>
                
                <div id="create-user-error" class="hidden" style="color: var(--error-color); margin-bottom: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-radius: 6px;"></div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" id="cancel-create-user" class="button-secondary">Cancel</button>
                    <button type="submit" class="button-primary">Create User</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(createUserModal);
    
    // View User Conversations Modal
    const viewUserModal = document.createElement('div');
    viewUserModal.id = 'view-user-modal';
    viewUserModal.className = 'modal hidden';
    viewUserModal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 80vh;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 id="view-user-title" style="margin: 0;">User Conversations</h2>
                <button id="close-view-user" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary);">×</button>
            </div>
            
            <div id="view-user-content" style="overflow-y: auto; max-height: calc(80vh - 100px);"></div>
        </div>
    `;
    document.body.appendChild(viewUserModal);
    
    // Setup modal event listeners
    setupModalListeners();
}

function setupModalListeners() {
    // Create User Modal
    document.getElementById('close-create-user')?.addEventListener('click', hideCreateUserModal);
    document.getElementById('cancel-create-user')?.addEventListener('click', hideCreateUserModal);
    document.getElementById('create-user-form')?.addEventListener('submit', handleCreateUser);
    
    // View User Modal
    document.getElementById('close-view-user')?.addEventListener('click', hideViewUserModal);
    
    // Click outside to close
    document.getElementById('create-user-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'create-user-modal') hideCreateUserModal();
    });
    
    document.getElementById('view-user-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'view-user-modal') hideViewUserModal();
    });
}

// ============================================
// CREATE USER FUNCTIONALITY
// ============================================

function showCreateUserModal() {
    const modal = document.getElementById('create-user-modal');
    const form = document.getElementById('create-user-form');
    const errorDiv = document.getElementById('create-user-error');
    
    // Reset form
    form.reset();
    errorDiv.classList.add('hidden');
    
    // Show modal
    modal.classList.remove('hidden');
}

function hideCreateUserModal() {
    const modal = document.getElementById('create-user-modal');
    modal.classList.add('hidden');
}

async function handleCreateUser(e) {
    e.preventDefault();
    
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const role = document.getElementById('new-user-role').value;
    const password = document.getElementById('new-user-password').value;
    const errorDiv = document.getElementById('create-user-error');
    
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, role, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            errorDiv.textContent = data.error || 'Failed to create user';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Success!
        hideCreateUserModal();
        
        // Show success message
        alert(`User created successfully!\n\nEmail: ${email}\nTemporary Password: ${password}\n\nUser will be required to change password on first login.`);
        
        // Reload users list
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error creating user:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

// ============================================
// VIEW USER FUNCTIONALITY
// ============================================

async function viewUserConversations(email) {
    const modal = document.getElementById('view-user-modal');
    const title = document.getElementById('view-user-title');
    const content = document.getElementById('view-user-content');
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
        alert('User not found');
        return;
    }
    
    currentViewingUser = email;
    
    // Update title
    title.textContent = `${user.name} - Conversations`;
    
    // Show loading
    content.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
            <div>Loading conversations...</div>
        </div>
    `;
    
    // Show modal
    modal.classList.remove('hidden');
    
    try {
        // Fetch user's conversations
        const response = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}/conversations`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }
        
        const data = await response.json();
        const conversations = data.conversations || [];
        
        // Render conversations
        if (conversations.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">📭</div>
                    <div>No conversations yet</div>
                    <div style="font-size: 0.875rem; margin-top: 0.5rem;">User hasn't started onboarding</div>
                </div>
            `;
            return;
        }
        
        let html = `
            <div style="display: grid; gap: 1rem;">
        `;
        
        conversations.forEach(conv => {
            const icon = conv.type === 'onboarding' ? '🎯' : '📋';
            const statusBadge = conv.status === 'complete' 
                ? '<span style="background: var(--success-color); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">Complete</span>'
                : '';
            
            const lastUpdated = formatDate(conv.last_updated);
            
            html += `
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; cursor: pointer; transition: all 0.2s;"
                     onmouseover="this.style.borderColor='var(--primary-color)'"
                     onmouseout="this.style.borderColor='var(--border-color)'"
                     onclick="viewConversationDetail('${email}', '${conv.conversation_id}')">
                    <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.75rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <span style="font-size: 1.5rem;">${icon}</span>
                                <strong style="font-size: 1.125rem;">${conv.title}</strong>
                                ${statusBadge}
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.875rem;">
                                ${conv.message_count} messages • Last updated ${lastUpdated}
                            </div>
                        </div>
                    </div>
                    
                    ${conv.summary ? `
                        <details style="margin-top: 1rem;">
                            <summary style="cursor: pointer; color: var(--primary-color); font-size: 0.875rem;">View Summary</summary>
                            <div style="margin-top: 0.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 6px; font-size: 0.875rem; white-space: pre-wrap;">
                                ${conv.summary.substring(0, 500)}${conv.summary.length > 500 ? '...' : ''}
                            </div>
                        </details>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        
        content.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--error-color);">
                <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                <div>Failed to load conversations</div>
                <div style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</div>
            </div>
        `;
    }
}

async function viewConversationDetail(email, conversationId) {
    const content = document.getElementById('view-user-content');
    
    // Show loading
    content.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
            <div>Loading conversation messages...</div>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(email)}/conversations/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversation');
        }
        
        const data = await response.json();
        const conversation = data.conversation;
        
        // Render full conversation
        let html = `
            <div>
                <button onclick="viewUserConversations('${email}')" 
                        style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                    ← Back to All Conversations
                </button>
                
                <div style="margin-bottom: 2rem;">
                    <h3>${conversation.title}</h3>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">
                        ${conversation.message_count} messages • 
                        Created ${formatDate(conversation.created_at)} • 
                        Last updated ${formatDate(conversation.last_updated)}
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 1rem;">
        `;
        
        conversation.messages.forEach(msg => {
            const isUser = msg.role === 'user';
            const bgColor = isUser ? 'var(--primary-color)' : 'var(--card-bg)';
            const textColor = isUser ? 'white' : 'var(--text-primary)';
            const alignment = isUser ? 'flex-end' : 'flex-start';
            
            let content = '';
            if (Array.isArray(msg.content)) {
                msg.content.forEach(item => {
                    if (item.type === 'text') {
                        content += item.text;
                    } else if (item.type === 'image') {
                        content += `<div style="margin: 0.5rem 0;">[Image attachment]</div>`;
                    } else if (item.type === 'document') {
                        content += `<div style="margin: 0.5rem 0;">[Document attachment]</div>`;
                    }
                });
            } else {
                content = msg.content;
            }
            
            html += `
                <div style="display: flex; justify-content: ${alignment};">
                    <div style="max-width: 70%; background: ${bgColor}; color: ${textColor}; padding: 1rem; border-radius: 8px;">
                        <div style="white-space: pre-wrap; word-wrap: break-word;">${content}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.5rem; opacity: 0.7;">
                            ${formatDate(msg.timestamp)}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading conversation detail:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--error-color);">
                <button onclick="viewUserConversations('${email}')" 
                        style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                    ← Back to All Conversations
                </button>
                <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                <div>Failed to load conversation</div>
                <div style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</div>
            </div>
        `;
    }
}

function hideViewUserModal() {
    const modal = document.getElementById('view-user-modal');
    modal.classList.add('hidden');
    currentViewingUser = null;
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    
    const password = elements.adminPassword.value;
    elements.loginError.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (!response.ok) {
            const data = await response.json();
            elements.loginError.textContent = data.error || 'Invalid password';
            elements.loginError.classList.remove('hidden');
            return;
        }
        
        const data = await response.json();
        adminToken = data.token;
        localStorage.setItem('admin_token', adminToken);
        
        showDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        elements.loginError.textContent = 'Connection error';
        elements.loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    adminToken = null;
    toolsManager = null;
    currentViewingUser = null;
    localStorage.removeItem('admin_token');
    showLoginScreen();
}

function showLoginScreen() {
    hideAllSections();
    elements.loginScreen?.classList.add('active');
}

function showDashboard() {
    elements.loginScreen?.classList.remove('active');
    showSection('users');
    loadDashboardData();
}

// ============================================
// NAVIGATION
// ============================================

function hideAllSections() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });
}

async function showSection(sectionName) {
    hideAllSections();
    
    const section = document.getElementById(`${sectionName}-section`);
    const tab = document.getElementById(`${sectionName}-tab`);
    
    if (section) section.classList.add('active');
    if (tab) tab.classList.add('active');
    
    switch(sectionName) {
        case 'users':
            await loadDashboardData();
            break;
        case 'tools':
            await loadToolsSection();
            break;
        case 'reports':
        case 'export':
            break;
    }
}

// ============================================
// USER MANAGEMENT
// ============================================

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const data = await response.json();
        users = data.users;
        stats = data.stats;
        
        updateStatsDisplay();
        renderUsersTable();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data');
    }
}

function updateStatsDisplay() {
    if (!stats) return;
    
    elements.statTotalUsers.textContent = stats.total_users;
    elements.statOnboarding.textContent = `${stats.onboarding_complete}/${stats.total_users}`;
    elements.statTasks.textContent = stats.total_tasks;
    elements.statMessages.textContent = stats.total_messages;
}

function renderUsersTable() {
    if (!elements.usersTableContainer) return;
    
    if (users.length === 0) {
        elements.usersTableContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                No users yet. Create your first user to get started.
            </div>
        `;
        return;
    }
    
    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 2px solid var(--border-color);">
                    <th style="text-align: left; padding: 1rem;">User</th>
                    <th style="text-align: left; padding: 1rem;">Role</th>
                    <th style="text-align: center; padding: 1rem;">Status</th>
                    <th style="text-align: center; padding: 1rem;">Tasks</th>
                    <th style="text-align: center; padding: 1rem;">Messages</th>
                    <th style="text-align: center; padding: 1rem;">Storage</th>
                    <th style="text-align: center; padding: 1rem;">Last Active</th>
                    <th style="text-align: center; padding: 1rem;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const statusBadge = user.onboarding_complete
            ? '<span style="background: var(--success-color); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">Complete</span>'
            : '<span style="background: var(--warning-color); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">Incomplete</span>';
        
        const lastActive = user.last_login ? formatDate(user.last_login) : 'Never';
        
        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 1rem;">
                    <div style="font-weight: 500;">${user.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${user.email}</div>
                </td>
                <td style="padding: 1rem;">${user.role}</td>
                <td style="padding: 1rem; text-align: center;">${statusBadge}</td>
                <td style="padding: 1rem; text-align: center;">${user.task_count}</td>
                <td style="padding: 1rem; text-align: center;">${user.total_messages}</td>
                <td style="padding: 1rem; text-align: center;">${user.storage_used_mb.toFixed(1)} MB</td>
                <td style="padding: 1rem; text-align: center;">${lastActive}</td>
                <td style="padding: 1rem; text-align: center;">
                    <button class="button-secondary" onclick="viewUserConversations('${user.email}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                        👁️ View
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    elements.usersTableContainer.innerHTML = html;
}

// ============================================
// TOOLS SECTION
// ============================================

async function loadToolsSection() {
    if (!elements.toolsContainer) return;
    
    if (!toolsManager) {
        try {
            elements.toolsContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">🔧</div>
                    <div>Loading tools data...</div>
                </div>
            `;
            
            toolsManager = new AdminToolsManager(API_BASE, adminToken);
            await toolsManager.initialize('tools-container');
            
            console.log('✅ Tools manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize tools manager:', error);
            elements.toolsContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--error-color);">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">Failed to load tools data</div>
                    <div style="font-size: 0.875rem;">${error.message}</div>
                    <button class="button-primary" onclick="loadToolsSection()" style="margin-top: 1rem;">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// DATA EXPORT
// ============================================

async function handleExport() {
    try {
        const response = await fetch(`${API_BASE}/admin/export`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export data');
        }
        
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tiis-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Data exported successfully');
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data: ' + error.message);
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 7) return date.toLocaleDateString();
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Make functions globally accessible
window.showSection = showSection;
window.viewUserConversations = viewUserConversations;
window.viewConversationDetail = viewConversationDetail;
window.handleLogout = handleLogout;
window.loadToolsSection = loadToolsSection;
window.showCreateUserModal = showCreateUserModal;