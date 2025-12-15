// ============================================
// ADMIN-DASHBOARD.JS - VOICE MANAGER ADDITIONS
// ============================================
// Add these 2 small changes to your existing admin-dashboard.js

// CHANGE 1: Add this variable at the top (around line 8)
// --------------------------------------------
// Find this section:
const API_BASE = '/api';

// Global state
let adminToken = null;
let users = [];
let stats = null;
let currentReportData = null;
let currentReportFilename = null;
let selectedUserForAction = null;

// ADD THIS LINE:
let voiceManager = null;  // <-- ADD THIS LINE

// DOM Elements - will be set after DOM loads
let elements = {};


// CHANGE 2: Add voice manager initialization in showDashboard()
// ---------------------------------------------------------------
// Find the showDashboard() function (around line 60-70)
// It currently looks like this:

function showDashboard() {
    elements.loginScreen.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    loadDashboardData();
}

// REPLACE IT WITH THIS:

function showDashboard() {
    elements.loginScreen.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    
    // Initialize voice manager (ADD THESE 3 LINES)
    if (!voiceManager) {
        voiceManager = new AdminVoiceManager(adminToken);
    }
    
    loadDashboardData();
}


// ============================================
// THAT'S IT! Only 2 tiny changes needed.
// ============================================

// The AdminVoiceManager class (loaded from admin-voice-manager.js)
// handles everything else automatically:
// - Modal display
// - Voice CRUD operations  
// - API calls
// - Testing voices
// - Browsing Eleven Labs voices

// No other changes needed to admin-dashboard.js!
