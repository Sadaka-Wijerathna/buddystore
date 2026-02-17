const express = require('express');
const router = express.Router();
const { validateOrder, validateUsername } = require('../middleware/validation');
const { orderLimiter } = require('../middleware/security');
const { logOrder, logError } = require('../utils/logger');
const database = require('../services/database');
const telegramService = require('../services/telegram');

// Create new order
router.post('/', orderLimiter, validateOrder, async (req, res) => {
  try {
    const { username, package: pkg, count } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Check for duplicate orders in the last 5 minutes
    const recentOrders = await database.getDb().collection('orders').findOne({
      username,
      package: pkg,
      count,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (recentOrders) {
      logOrder('duplicate_order_blocked', { username, package: pkg, count, ip: clientIP });
      return res.status(400).json({ error: 'Duplicate order detected. Please wait before placing another order.' });
    }

    // Calculate price (1 Rs per video)
    const price = count * 1;

    const date = new Date().toISOString().split("T")[0];
    
    // Create order record
    const orderData = {
      username,
      package: pkg,
      count,
      price: `Rs ${price}`,
      date,
      status: 'pending',
      createdAt: new Date(),
      ip: clientIP
    };

    // Save order to database
    await database.getDb().collection('orders').insertOne(orderData);

    // Send Telegram notification to admin
    await telegramService.sendOrderNotification(orderData);

    logOrder('order_created', orderData);

    res.json({ success: true, orderId: orderData._id });
  } catch (error) {
    logError(error, { context: 'Creating order', body: req.body });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user order history
router.get('/history', validateUsername, async (req, res) => {
  try {
    const { username } = req.query;
    
    const purchases = await database.getUserPurchases(username);
    
    // Sort by date (newest first)
    const sortedPurchases = purchases.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    res.json(sortedPurchases);
  } catch (error) {
    logError(error, { context: 'Getting order history', username: req.query.username });
    res.status(500).json({ error: 'Failed to retrieve order history' });
  }
});

// Get order analytics (admin only)
router.get('/analytics', async (req, res) => {
  try {
    // This would be protected by admin auth middleware in the main server
    const analytics = await database.getAnalytics();
    
    // Additional order-specific analytics
    const orderStats = await database.getDb().collection('orders').aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { 
            $sum: { 
              $toDouble: { 
                $substr: ["$price", 3, -1] // Remove "Rs " prefix
              }
            }
          },
          averageOrderValue: { 
            $avg: { 
              $toDouble: { 
                $substr: ["$price", 3, -1]
              }
            }
          }
        }
      }
    ]).toArray();

    const packageStats = await database.getDb().collection('orders').aggregate([
      {
        $group: {
          _id: "$package",
          count: { $sum: 1 },
          totalRevenue: { 
            $sum: { 
              $toDouble: { 
                $substr: ["$price", 3, -1]
              }
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({
      ...analytics,
      orders: orderStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      packageStats
    });
  } catch (error) {
    logError(error, { context: 'Getting order analytics' });
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

module.exports = router;