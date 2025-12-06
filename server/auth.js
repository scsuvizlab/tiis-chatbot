const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userManager = require('./user-manager');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password length:', password?.length);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await userManager.getUserByEmail(email);
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('User found:', {
      email: user.email,
      temp_password: user.temp_password,
      onboarding_complete: user.onboarding_complete,
      has_password_hash: !!user.password_hash
    });
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', passwordValid);
    
    if (!passwordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if temp password (first login)
    if (user.temp_password) {
      console.log('First login detected, requiring password change');
      const tempToken = jwt.sign(
        { email: user.email, temp: true },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      return res.json({
        temp_password: true,
        temp_token: tempToken,
        message: 'Please change your password'
      });
    }
    
    // Generate regular JWT token
    const token = jwt.sign(
      {
        email: user.email,
        user_id: user.user_id,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict'
    });
    
    // Update last login
    user.last_login = new Date().toISOString();
    await userManager.updateUser(user);
    
    // Determine redirect
    let redirect = '/dashboard.html';
    if (!user.onboarding_complete) {
      redirect = '/dashboard.html?start_onboarding=true';
    }
    
    console.log('Login successful, redirect:', redirect);
    console.log('Sending successful login response with user:', user.email);
    
    res.json({
      success: true,
      token: token, // Also send in response for compatibility
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        onboarding_complete: user.onboarding_complete
      },
      redirect
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change password endpoint
router.post('/change-password', async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    console.log('Change password request:', {
      hasOldPassword: !!old_password,
      hasNewPassword: !!new_password,
      newPasswordLength: new_password?.length,
      hasToken: !!token,
      body: req.body
    });
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!new_password) {
      return res.status(400).json({ error: 'New password required' });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token decoded:', { email: decoded.email, isTemp: decoded.temp });
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const user = await userManager.getUserByEmail(decoded.email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If not a temp token, verify old password
    if (!decoded.temp) {
      if (!old_password) {
        return res.status(400).json({ error: 'Old password required' });
      }
      
      const passwordValid = await bcrypt.compare(old_password, user.password_hash);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid old password' });
      }
    }
    
    // Hash new password
    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
    console.log('New password hashed, length:', newHash.length);
    
    // Update user
    user.password_hash = newHash;
    user.temp_password = false;
    await userManager.updateUser(user);
    
    console.log('Password updated for:', user.email);
    
    // Generate new permanent token
    const newToken = jwt.sign(
      {
        email: user.email,
        user_id: user.user_id,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set httpOnly cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      token: newToken,
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: error.message || 'Password change failed' });
  }
});

// Logout endpoint - clears httpOnly cookie
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0, // Expire immediately
    sameSite: 'strict',
    path: '/'
  });
  
  res.json({ success: true });
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    console.log('=== VERIFY TOKEN REQUEST ===');
    console.log('Cookies:', req.cookies);
    console.log('Has token cookie:', !!req.cookies.token);
    
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    console.log('Token found:', !!token);
    
    if (!token) {
      console.log('No token, returning invalid');
      return res.json({ valid: false });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token decoded, email:', decoded.email);
    
    const user = await userManager.getUserByEmail(decoded.email);
    
    if (!user) {
      console.log('User not found, returning invalid');
      return res.json({ valid: false });
    }
    
    console.log('Verification successful for:', user.email);
    res.json({
      valid: true,
      user: {
        email: user.email,
        name: user.name,
        onboarding_complete: user.onboarding_complete
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.json({ valid: false });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);

// Middleware to require authentication
function requireAuth(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}