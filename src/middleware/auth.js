const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Telegram authentication verification
const checkTelegramAuth = (data) => {
  const { hash, ...rest } = data;
  const sortedData = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('\\n');
  
  const secret = crypto.createHash('sha256').update(process.env.BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secret).update(sortedData).digest('hex');
  
  return hmac === hash;
};

// Generate admin token
const generateAdminToken = (adminId) => {
  return jwt.sign(
    { 
      id: adminId, 
      role: 'admin',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify payment PIN
const verifyPaymentPin = (req, res, next) => {
  const { pin } = req.body;
  
  if (!pin || pin !== process.env.PAYMENT_PIN) {
    return res.status(401).json({ error: 'Invalid payment PIN' });
  }
  
  next();
};

module.exports = {
  adminAuth,
  checkTelegramAuth,
  generateAdminToken,
  verifyPaymentPin
};