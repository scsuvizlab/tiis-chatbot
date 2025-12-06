// TIIS Login Page - Authentication and Password Change
const API_BASE = '/api';

// Global state
let tempToken = null;

// DOM Elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('remember-me');
const loginError = document.getElementById('login-error');
const passwordChangeModal = document.getElementById('password-change-modal');
const passwordChangeForm = document.getElementById('password-change-form');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordChangeError = document.getElementById('password-change-error');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    checkExistingAuth();
    
    // Set up event listeners
    loginForm.addEventListener('submit', handleLogin);
    passwordChangeForm.addEventListener('submit', handlePasswordChange);
    
    // Auto-focus email field
    emailInput.focus();
});

// Check if user is already authenticated
async function checkExistingAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.valid) {
            // Already logged in, redirect to dashboard
            window.location.href = '/dashboard.html';
        }
    } catch (error) {
        // Not logged in, stay on login page
        console.log('Not authenticated');
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;
    
    if (!email || !password) {
        loginError.textContent = 'Please enter email and password';
        loginError.classList.remove('hidden');
        return;
    }
    
    try {
        console.log('Attempting login with:', email);
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            credentials: 'include', // Ensure cookies are received
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Login response status:', response.status);
        
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (!response.ok) {
            console.log('Login failed:', data.error);
            loginError.textContent = data.error || 'Login failed';
            loginError.classList.remove('hidden');
            return;
        }
        
        // Check if temp password (first login)
        if (data.temp_password) {
            console.log('Password change required');
            tempToken = data.temp_token;
            showPasswordChangeModal();
            return;
        }
        
        // Successful login
        console.log('Login successful, redirecting to:', data.redirect);
        
        // Store debug info in localStorage so we can see it after redirect
        localStorage.setItem('lastLogin', JSON.stringify({
            time: new Date().toISOString(),
            email: email,
            tokenReceived: !!data.token,
            redirect: data.redirect,
            success: true
        }));
        
        // Note: Server has set httpOnly cookie, no need to set it client-side
        console.log('HttpOnly cookie set by server, redirecting...');
        
        // Redirect
        window.location.href = data.redirect;
        
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Connection error. Please try again.';
        loginError.classList.remove('hidden');
    }
}

// Show password change modal
function showPasswordChangeModal() {
    loginForm.classList.add('hidden');
    passwordChangeModal.classList.remove('hidden');
    newPasswordInput.focus();
}

// Handle password change
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const errorDiv = passwordChangeError;
    
    // Clear any previous errors
    errorDiv.classList.add('hidden');
    
    // Validate
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (newPassword.length < 8) {
        errorDiv.textContent = 'Password must be at least 8 characters';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (!/\d/.test(newPassword)) {
        errorDiv.textContent = 'Password must contain at least one number';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    try {
        
        const response = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            credentials: 'include', // Ensure cookies are sent/received
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tempToken}`
            },
            body: JSON.stringify({
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            errorDiv.textContent = data.error || 'Password change failed';
            return;
        }
        
        // Success - server has set httpOnly cookie, redirect
        console.log('Password changed successfully, httpOnly cookie set by server');
        window.location.href = '/dashboard.html?start_onboarding=true';
        
    } catch (error) {
        console.error('Password change error:', error);
        errorDiv.textContent = 'Connection error. Please try again.';
    }
}

// Cookie helpers
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}