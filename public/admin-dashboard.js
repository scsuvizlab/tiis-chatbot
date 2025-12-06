// TIIS Admin Dashboard - Full Implementation
const API_BASE = '/api';

// Global state
let adminToken = null;
let users = [];
let stats = null;
let currentReportData = null;
let currentReportFilename = null;
let selectedUserForAction = null;

// DOM Elements - will be set after DOM loads
let elements = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

function init() {
    console.log('=== ADMIN DASHBOARD INIT ===');
    
    // Cache DOM elements FIRST
    cacheElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if already logged in (token in localStorage)
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
        adminToken = savedToken;
        showDashboard();
    } else {
        showLoginScreen();
    }
}

// Cache DOM element references
function cacheElements() {
    elements = {
        // Screens
        loginScreen: document.getElementById('admin-login-screen'),
        dashboard: document.getElementById('admin-dashboard'),
        
        // Login
        loginForm: document.getElementById('admin-login-form'),
        adminPassword: document.getElementById('admin-password'),
        loginError: document.getElementById('admin-login-error'),
        
        // Header
        logoutBtn: document.getElementById('admin-logout-btn'),
        
        // Stats
        statTotalUsers: document.getElementById('stat-total-users'),
        statOnboarding: document.getElementById('stat-onboarding'),
        statOnboardingPercent: document.getElementById('stat-onboarding-percent'),
        statTasks: document.getElementById('stat-tasks'),
        statMessages: document.getElementById('stat-messages'),
        statStorage: document.getElementById('stat-storage'),
        
        // Users table
        usersTableBody: document.getElementById('users-table-body'),
        createUserBtn: document.getElementById('create-user-btn'),
        
        // Reports
        generateCorpReportBtn: document.getElementById('generate-corp-report-btn'),
        individualReportUser: document.getElementById('individual-report-user'),
        generateIndividualReportBtn: document.getElementById('generate-individual-report-btn'),
        
        // Export
        exportAllBtn: document.getElementById('export-all-btn'),
        
        // Create User Modal
        createUserModal: document.getElementById('create-user-modal'),
        createUserForm: document.getElementById('create-user-form'),
        newUserEmail: document.getElementById('new-user-email'),
        newUserName: document.getElementById('new-user-name'),
        newUserRole: document.getElementById('new-user-role'),
        newUserPassword: document.getElementById('new-user-password'),
        createUserError: document.getElementById('create-user-error'),
        cancelCreateUserBtn: document.getElementById('cancel-create-user-btn'),
        
        // Reset Password Modal
        resetPasswordModal: document.getElementById('reset-password-modal'),
        resetPasswordForm: document.getElementById('reset-password-form'),
        resetUserName: document.getElementById('reset-user-name'),
        resetNewPassword: document.getElementById('reset-new-password'),
        resetPasswordError: document.getElementById('reset-password-error'),
        cancelResetPasswordBtn: document.getElementById('cancel-reset-password-btn'),
        
        // Delete User Modal
        deleteUserModal: document.getElementById('delete-user-modal'),
        deleteUserName: document.getElementById('delete-user-name'),
        cancelDeleteUserBtn: document.getElementById('cancel-delete-user-btn'),
        confirmDeleteUserBtn: document.getElementById('confirm-delete-user-btn'),
        
        // View Conversations Modal
        viewConversationsModal: document.getElementById('view-conversations-modal'),
        conversationsUserName: document.getElementById('conversations-user-name'),
        conversationsList: document.getElementById('conversations-list'),
        closeConversationsBtn: document.getElementById('close-conversations-btn'),
        
        // Report Preview Modal
        reportPreviewModal: document.getElementById('report-preview-modal'),
        reportPreviewTitle: document.getElementById('report-preview-title'),
        reportPreviewContent: document.getElementById('report-preview-content'),
        downloadReportBtn: document.getElementById('download-report-btn'),
        closeReportBtn: document.getElementById('close-report-btn'),
        
        // User Credentials Modal
        userCredentialsModal: document.getElementById('user-credentials-modal'),
        credWebsite: document.getElementById('cred-website'),
        credEmail: document.getElementById('cred-email'),
        credPassword: document.getElementById('cred-password'),
        copyCredentialsBtn: document.getElementById('copy-credentials-btn'),
        closeCredentialsBtn: document.getElementById('close-credentials-btn')
    };
}

// Set up all event listeners
function setupEventListeners() {
    // Login
    elements.loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Create user
    elements.createUserBtn.addEventListener('click', showCreateUserModal);
    elements.createUserForm.addEventListener('submit', handleCreateUser);
    elements.cancelCreateUserBtn.addEventListener('click', hideCreateUserModal);
    
    // Reset password
    elements.resetPasswordForm.addEventListener('submit', handleResetPassword);
    elements.cancelResetPasswordBtn.addEventListener('click', hideResetPasswordModal);
    
    // Delete user
    elements.cancelDeleteUserBtn.addEventListener('click', hideDeleteUserModal);
    elements.confirmDeleteUserBtn.addEventListener('click', handleDeleteUser);
    
    // View conversations
    elements.closeConversationsBtn.addEventListener('click', hideConversationsModal);
    
    // Reports
    elements.generateCorpReportBtn.addEventListener('click', handleGenerateCorpReport);
    elements.generateIndividualReportBtn.addEventListener('click', handleGenerateIndividualReport);
    elements.downloadReportBtn.addEventListener('click', handleDownloadReport);
    elements.closeReportBtn.addEventListener('click', hideReportModal);
    
    // Export
    elements.exportAllBtn.addEventListener('click', handleExportAll);
    
    // Credentials modal
    elements.copyCredentialsBtn.addEventListener('click', handleCopyCredentials);
    elements.closeCredentialsBtn.addEventListener('click', hideCredentialsModal);
}

// ============================================
// LOGIN / LOGOUT
// ============================================

function showLoginScreen() {
    elements.loginScreen.classList.remove('hidden');
    elements.dashboard.classList.add('hidden');
}

function showDashboard() {
    elements.loginScreen.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    loadDashboardData();
}

async function handleLogin(e) {
    e.preventDefault();
    
    const password = elements.adminPassword.value;
    
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
    localStorage.removeItem('admin_token');
    showLoginScreen();
}

// ============================================
// LOAD DASHBOARD DATA
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
        populateUserSelectors();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data');
    }
}

// Update stats cards
function updateStatsDisplay() {
    if (!stats) return;
    
    elements.statTotalUsers.textContent = stats.total_users;
    elements.statOnboarding.textContent = `${stats.onboarding_complete}/${stats.total_users}`;
    
    const onboardingPercent = stats.total_users > 0 
        ? Math.round((stats.onboarding_complete / stats.total_users) * 100)
        : 0;
    elements.statOnboardingPercent.textContent = `${onboardingPercent}%`;
    
    elements.statTasks.textContent = stats.total_tasks;
    elements.statMessages.textContent = stats.total_messages;
    elements.statStorage.textContent = `${stats.total_storage_mb.toFixed(1)} MB`;
}

// Render users table
function renderUsersTable() {
    if (users.length === 0) {
        elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No users yet. Create your first user to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    elements.usersTableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        const statusBadge = user.onboarding_complete
            ? '<span class="badge badge-success">Complete</span>'
            : '<span class="badge badge-warning">Pending</span>';
        
        const lastActive = user.last_active 
            ? getTimeAgo(user.last_active)
            : 'Never';
        
        row.innerHTML = `
            <td>
                <div class="user-name">${user.name}</div>
                <div class="user-email">${user.email}</div>
            </td>
            <td>${user.role}</td>
            <td>${statusBadge}</td>
            <td>${user.task_count}</td>
            <td>${user.total_messages}</td>
            <td>${user.storage_used_mb.toFixed(1)} MB</td>
            <td>${lastActive}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-icon-small view-conversations-btn" data-email="${user.email}" data-name="${user.name}">
                        👁️ View
                    </button>
                    <button class="btn btn-secondary btn-icon-small reset-password-btn" data-email="${user.email}" data-name="${user.name}">
                        🔑 Reset
                    </button>
                    <button class="btn btn-danger btn-icon-small delete-user-btn" data-email="${user.email}" data-name="${user.name}">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        
        // Add event listeners to action buttons
        row.querySelector('.view-conversations-btn').addEventListener('click', (e) => {
            handleViewConversations(e.target.dataset.email, e.target.dataset.name);
        });
        
        row.querySelector('.reset-password-btn').addEventListener('click', (e) => {
            showResetPasswordModal(e.target.dataset.email, e.target.dataset.name);
        });
        
        row.querySelector('.delete-user-btn').addEventListener('click', (e) => {
            showDeleteUserModal(e.target.dataset.email, e.target.dataset.name);
        });
        
        elements.usersTableBody.appendChild(row);
    });
}

// Populate user selector dropdowns
function populateUserSelectors() {
    elements.individualReportUser.innerHTML = '<option value="">Select employee...</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.email;
        option.textContent = `${user.name} (${user.role})`;
        elements.individualReportUser.appendChild(option);
    });
}

// ============================================
// CREATE USER
// ============================================

function showCreateUserModal() {
    elements.createUserModal.classList.remove('hidden');
    elements.createUserForm.reset();
    elements.createUserError.classList.add('hidden');
    elements.newUserEmail.focus();
}

function hideCreateUserModal() {
    elements.createUserModal.classList.add('hidden');
}

async function handleCreateUser(e) {
    e.preventDefault();
    
    const email = elements.newUserEmail.value.trim();
    const name = elements.newUserName.value.trim();
    const role = elements.newUserRole.value.trim();
    const tempPassword = elements.newUserPassword.value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/users/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                email,
                name,
                role,
                temp_password: tempPassword
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            elements.createUserError.textContent = data.error || 'Failed to create user';
            elements.createUserError.classList.remove('hidden');
            return;
        }
        
        const data = await response.json();
        
        // Hide create modal
        hideCreateUserModal();
        
        // Show credentials modal
        showCredentialsModal(email, name, tempPassword);
        
        // Reload dashboard
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error creating user:', error);
        elements.createUserError.textContent = 'Connection error';
        elements.createUserError.classList.remove('hidden');
    }
}

function showCredentialsModal(email, name, password) {
    elements.credWebsite.textContent = window.location.origin;
    elements.credEmail.textContent = email;
    elements.credPassword.textContent = password;
    elements.userCredentialsModal.classList.remove('hidden');
}

function hideCredentialsModal() {
    elements.userCredentialsModal.classList.add('hidden');
}

function handleCopyCredentials() {
    const text = `TIIS Login Credentials
Website: ${elements.credWebsite.textContent}
Email: ${elements.credEmail.textContent}
Temporary Password: ${elements.credPassword.textContent}

The user will be required to create a new password on first login.`;
    
    navigator.clipboard.writeText(text).then(() => {
        elements.copyCredentialsBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            elements.copyCredentialsBtn.textContent = 'Copy to Clipboard';
        }, 2000);
    });
}

// ============================================
// RESET PASSWORD
// ============================================

function showResetPasswordModal(email, name) {
    selectedUserForAction = { email, name };
    elements.resetUserName.textContent = name;
    elements.resetPasswordModal.classList.remove('hidden');
    elements.resetPasswordForm.reset();
    elements.resetPasswordError.classList.add('hidden');
    elements.resetNewPassword.focus();
}

function hideResetPasswordModal() {
    elements.resetPasswordModal.classList.add('hidden');
    selectedUserForAction = null;
}

async function handleResetPassword(e) {
    e.preventDefault();
    
    const newPassword = elements.resetNewPassword.value;
    
    // This would require a new endpoint on the backend
    // For now, we'll show a not implemented message
    alert(`Password reset functionality requires backend implementation.\n\nNew password for ${selectedUserForAction.name}: ${newPassword}\n\nTo implement: Add POST /api/admin/users/reset-password endpoint`);
    
    hideResetPasswordModal();
}

// ============================================
// DELETE USER
// ============================================

function showDeleteUserModal(email, name) {
    selectedUserForAction = { email, name };
    elements.deleteUserName.textContent = name;
    elements.deleteUserModal.classList.remove('hidden');
}

function hideDeleteUserModal() {
    elements.deleteUserModal.classList.add('hidden');
    selectedUserForAction = null;
}

async function handleDeleteUser() {
    // This would require a new endpoint on the backend
    // For now, we'll show a not implemented message
    alert(`Delete user functionality requires backend implementation.\n\nTo implement: Add DELETE /api/admin/users/:email endpoint`);
    
    hideDeleteUserModal();
}

// ============================================
// VIEW CONVERSATIONS
// ============================================

async function handleViewConversations(email, name) {
    elements.conversationsUserName.textContent = name;
    elements.viewConversationsModal.classList.remove('hidden');
    elements.conversationsList.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading conversations...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/admin/conversations/${email}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }
        
        const data = await response.json();
        renderConversationsList(data.conversations);
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        elements.conversationsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--danger-color);">Failed to load conversations</p>';
    }
}

function renderConversationsList(conversations) {
    if (conversations.length === 0) {
        elements.conversationsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No conversations yet</p>';
        return;
    }
    
    elements.conversationsList.innerHTML = '';
    
    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item-admin';
        
        const title = conv.type === 'onboarding' ? 'Onboarding' : conv.title;
        const icon = conv.type === 'onboarding' ? '🎯' : '📋';
        const status = conv.status === 'complete' ? 'Complete' : 'In Progress';
        const lastUpdated = new Date(conv.last_updated).toLocaleString();
        
        item.innerHTML = `
            <h4>${icon} ${title}</h4>
            <p>
                Status: ${status} • 
                ${conv.messages?.length || 0} messages • 
                Updated: ${lastUpdated}
            </p>
        `;
        
        elements.conversationsList.appendChild(item);
    });
}

function hideConversationsModal() {
    elements.viewConversationsModal.classList.add('hidden');
}

// ============================================
// GENERATE REPORTS
// ============================================

async function handleGenerateCorpReport() {
    elements.generateCorpReportBtn.disabled = true;
    elements.generateCorpReportBtn.textContent = 'Generating...';
    
    try {
        const response = await fetch(`${API_BASE}/admin/analyze/corporation`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to generate report');
        }
        
        const data = await response.json();
        currentReportData = data.analysis;
        currentReportFilename = `GSCDC_Corporation_Report_${new Date().toISOString().split('T')[0]}.md`;
        
        showReportModal('Corporation-Wide Analysis Report', data.analysis);
        
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report: ' + error.message);
    } finally {
        elements.generateCorpReportBtn.disabled = false;
        elements.generateCorpReportBtn.textContent = 'Generate Corporation Report';
    }
}

async function handleGenerateIndividualReport() {
    const email = elements.individualReportUser.value;
    
    if (!email) {
        alert('Please select an employee');
        return;
    }
    
    const user = users.find(u => u.email === email);
    
    elements.generateIndividualReportBtn.disabled = true;
    elements.generateIndividualReportBtn.textContent = 'Generating...';
    
    try {
        const response = await fetch(`${API_BASE}/admin/analyze/user/${email}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to generate report');
        }
        
        const data = await response.json();
        currentReportData = data.analysis;
        currentReportFilename = `${user.name.replace(/\s+/g, '_')}_Individual_Report_${new Date().toISOString().split('T')[0]}.md`;
        
        showReportModal(`Individual Report: ${user.name}`, data.analysis);
        
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report: ' + error.message);
    } finally {
        elements.generateIndividualReportBtn.disabled = false;
        elements.generateIndividualReportBtn.textContent = 'Generate Individual Report';
    }
}

function showReportModal(title, content) {
    elements.reportPreviewTitle.textContent = title;
    elements.reportPreviewContent.textContent = content;
    elements.reportPreviewModal.classList.remove('hidden');
}

function hideReportModal() {
    elements.reportPreviewModal.classList.add('hidden');
}

function handleDownloadReport() {
    if (!currentReportData || !currentReportFilename) return;
    
    const blob = new Blob([currentReportData], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentReportFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// EXPORT DATA
// ============================================

async function handleExportAll() {
    elements.exportAllBtn.disabled = true;
    elements.exportAllBtn.textContent = 'Exporting...';
    
    try {
        const response = await fetch(`${API_BASE}/admin/export/all`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export data');
        }
        
        const data = await response.json();
        
        // Download as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tiis-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Failed to export data');
    } finally {
        elements.exportAllBtn.disabled = false;
        elements.exportAllBtn.textContent = '📥 Export All Data (JSON)';
    }
}

// ============================================
// UTILITIES
// ============================================

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
