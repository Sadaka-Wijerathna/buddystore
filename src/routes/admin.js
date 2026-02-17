const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { validateUser, validatePackageDeletion } = require('../middleware/validation');
const { logError } = require('../utils/logger');
const database = require('../services/database');

// Get all users with enhanced information
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await database.getAllUsersWithDetails();
    res.json(users);
  } catch (error) {
    logError(error, { context: 'Getting all users' });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete user
router.delete('/users/:username', adminAuth, async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const result = await database.deleteUser(username);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: `User @${username} deleted successfully` });
  } catch (error) {
    logError(error, { context: 'Deleting user', username: req.params.username });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Legacy delete user endpoint (for backward compatibility)
router.post('/deleteUser', adminAuth, validateUser, async (req, res) => {
  try {
    const { username } = req.body;
    
    const result = await database.deleteUser(username);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logError(error, { context: 'Deleting user (legacy)', username: req.body.username });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete package
router.post('/deletePackage', adminAuth, validatePackageDeletion, async (req, res) => {
  try {
    const { username, index } = req.body;
    
    await database.deletePurchase(username, index);
    res.json({ success: true });
  } catch (error) {
    logError(error, { context: 'Deleting package', username: req.body.username, index: req.body.index });
    
    if (error.message === 'Purchase not found') {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// Get user details
router.get('/users/:username', adminAuth, async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await database.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive information
    const { _id, ...userInfo } = user;
    
    res.json(userInfo);
  } catch (error) {
    logError(error, { context: 'Getting user details', username: req.params.username });
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Get system statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await database.getAnalytics();
    
    // Additional system stats
    const videoStats = await database.getDb().collection('video_files').aggregate([
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          totalVideos: { $sum: { $size: "$files" } }
        }
      }
    ]).toArray();

    const recentOrders = await database.getDb().collection('orders').find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).count();

    res.json({
      ...stats,
      videos: videoStats[0] || { totalCategories: 0, totalVideos: 0 },
      recentOrders
    });
  } catch (error) {
    logError(error, { context: 'Getting admin stats' });
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get video inventory
router.get('/inventory', adminAuth, async (req, res) => {
  try {
    const inventory = await database.getDb().collection('video_files').find({}).toArray();
    
    const formattedInventory = inventory.map(item => ({
      category: item.category,
      totalVideos: item.files ? item.files.length : 0,
      lastUpdated: item.lastUpdated || 'Unknown'
    }));

    res.json(formattedInventory);
  } catch (error) {
    logError(error, { context: 'Getting video inventory' });
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// Clear video category
router.delete('/inventory/:category', adminAuth, async (req, res) => {
  try {
    const { category } = req.params;
    
    const validCategories = ['Mixed', 'Mom And Son', 'Rape', 'SL Leaks', 'CCTV', 'Foreign'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    await database.clearVideoFiles(category);
    
    res.json({ 
      success: true, 
      message: `All videos cleared from ${category} category` 
    });
  } catch (error) {
    logError(error, { context: 'Clearing video category', category: req.params.category });
    res.status(500).json({ error: 'Failed to clear category' });
  }
});

// Fix user IDs
router.post('/fix-user-ids', adminAuth, async (req, res) => {
  try {
    const result = await database.fixUserIds();
    res.json({ 
      success: true, 
      message: `Fixed ${result.fixed} users out of ${result.total} users with missing IDs`,
      ...result
    });
  } catch (error) {
    logError(error, { context: 'Fixing user IDs' });
    res.status(500).json({ error: 'Failed to fix user IDs' });
  }
});

// Fix string IDs to numeric IDs
router.post('/fix-string-ids', adminAuth, async (req, res) => {
  try {
    const result = await database.fixStringIds();
    res.json({ 
      success: true, 
      message: `Fixed ${result.fixed} string IDs, failed to fix ${result.failed} out of ${result.total} total`,
      ...result
    });
  } catch (error) {
    logError(error, { context: 'Fixing string IDs' });
    res.status(500).json({ error: 'Failed to fix string IDs' });
  }
});

// Get user database analysis
router.get('/user-analysis', adminAuth, async (req, res) => {
  try {
    const allUsers = await database.getDb().collection('users').find({}).toArray();
    
    const validUsers = [];
    const usersWithoutIds = [];
    const usersWithStringIds = [];
    const usersWithInvalidIds = [];
    
    allUsers.forEach(user => {
      if (!user.id || user.id === null || user.id === undefined || user.id === '') {
        usersWithoutIds.push(user);
      } else if (typeof user.id === 'string') {
        const numericId = parseInt(user.id);
        if (!isNaN(numericId) && numericId > 0) {
          usersWithStringIds.push(user); // Can be converted
        } else {
          usersWithInvalidIds.push(user);
        }
      } else if (typeof user.id === 'number' && user.id > 0) {
        validUsers.push(user);
      } else {
        usersWithInvalidIds.push(user);
      }
    });
    
    res.json({
      total: allUsers.length,
      validUsers: validUsers.length,
      usersWithoutIds: usersWithoutIds.length,
      usersWithStringIds: usersWithStringIds.length,
      usersWithInvalidIds: usersWithInvalidIds.length,
      sampleUsersWithoutIds: usersWithoutIds.slice(0, 5).map(u => ({
        username: u.username || 'Unknown',
        first_name: u.first_name || 'No name',
        id: u.id
      })),
      sampleUsersWithStringIds: usersWithStringIds.slice(0, 5).map(u => ({
        username: u.username || 'Unknown',
        first_name: u.first_name || 'No name',
        id: u.id
      }))
    });
  } catch (error) {
    logError(error, { context: 'Getting user analysis' });
    res.status(500).json({ error: 'Failed to analyze users' });
  }
});

// Get user badges
router.get('/user/badges', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const user = await database.getUserByUsername(username);
    
    if (!user) {
      return res.json({ badges: [] });
    }

    res.json({ badges: user.badges || [] });
  } catch (error) {
    logError(error, { context: 'Getting user badges', username: req.query.username });
    res.json({ badges: [] }); // Return empty array instead of error
  }
});

// Toggle user badge
router.post('/user/badge', adminAuth, async (req, res) => {
  try {
    const { username, badgeType, action } = req.body;
    
    if (!username || !badgeType) {
      return res.status(400).json({ error: 'Username and badgeType required' });
    }

    const user = await database.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let badges = user.badges || [];
    const badgeIndex = badges.findIndex(b => b.type === badgeType);
    
    if (action === 'toggle') {
      if (badgeIndex >= 0) {
        badges.splice(badgeIndex, 1);
      } else {
        badges.push({ type: badgeType, assignedAt: new Date() });
      }
    }

    await database.getDb().collection('users').updateOne(
      { username },
      { $set: { badges } }
    );

    res.json({ 
      success: true, 
      message: badgeIndex >= 0 ? 'Badge removed' : 'Badge added',
      badges 
    });
  } catch (error) {
    logError(error, { context: 'Toggling user badge', username: req.body.username });
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

// Auto-assign badges
router.post('/user/auto-assign-badges', adminAuth, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const user = await database.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const purchases = await database.getPurchaseHistory(username);
    const badges = [];

    // Auto-assign based on purchase history
    if (purchases.length === 1) {
      badges.push({ type: 'FIRST_PURCHASE', assignedAt: new Date() });
    }
    if (purchases.length >= 3) {
      badges.push({ type: 'REGULAR_CUSTOMER', assignedAt: new Date() });
    }
    if (purchases.length >= 10) {
      badges.push({ type: 'LOYAL_CUSTOMER', assignedAt: new Date() });
    }

    const totalSpent = purchases.reduce((sum, p) => {
      const price = parseFloat(p.price?.replace(/[^0-9.]/g, '') || 0);
      return sum + price;
    }, 0);

    if (totalSpent >= 5000) {
      badges.push({ type: 'BIG_SPENDER', assignedAt: new Date() });
    }
    if (totalSpent >= 10000) {
      badges.push({ type: 'VIP_MEMBER', assignedAt: new Date() });
    }

    await database.getDb().collection('users').updateOne(
      { username },
      { $set: { badges } }
    );

    res.json({ 
      success: true, 
      assignedCount: badges.length,
      badges 
    });
  } catch (error) {
    logError(error, { context: 'Auto-assigning badges', username: req.body.username });
    res.status(500).json({ error: 'Failed to auto-assign badges' });
  }
});

module.exports = router;