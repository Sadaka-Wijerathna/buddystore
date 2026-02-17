const express = require('express');
const router = express.Router();
const { checkTelegramAuth, generateAdminToken } = require('../middleware/auth');
const { validateAdminLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/security');
const { logAuth, logError } = require('../utils/logger');
const database = require('../services/database');

// Telegram login auth verification
router.get('/telegram', authLimiter, async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!checkTelegramAuth(req.query)) {
      logAuth('telegram_auth_failed', { 
        ip: clientIP, 
        userAgent,
        query: req.query 
      });
      return res.status(403).send('Invalid Telegram Login');
    }

    const user = {
      id: parseInt(req.query.id),
      username: req.query.username,
      photo_url: req.query.photo_url
    };

    // Save/update user in database
    await database.createUser(user);

    logAuth('telegram_auth_success', { 
      username: user.username,
      ip: clientIP,
      userAgent 
    });

    res.redirect(`/dashboard.html?name=${user.username}&pic=${encodeURIComponent(user.photo_url)}`);
  } catch (error) {
    logError(error, { context: 'Telegram authentication', query: req.query });
    res.status(500).send('Authentication error');
  }
});

// Admin login endpoint
router.post('/admin', authLimiter, validateAdminLogin, async (req, res) => {
  try {
    const { adminId, secret } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Verify admin credentials
    if (secret !== process.env.ADMIN_SECRET) {
      logAuth('admin_auth_failed', { 
        adminId,
        ip: clientIP,
        userAgent 
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateAdminToken(adminId);

    logAuth('admin_auth_success', { 
      adminId,
      ip: clientIP,
      userAgent 
    });

    res.json({ 
      success: true, 
      token,
      expiresIn: '24h'
    });
  } catch (error) {
    logError(error, { context: 'Admin authentication', body: req.body });
    res.status(500).json({ error: 'Authentication error' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({ 
      valid: true, 
      user: {
        id: decoded.id,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;