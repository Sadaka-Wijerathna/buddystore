const { logError } = require('../utils/logger');

class AnalyticsController {
  constructor(db) {
    this.db = db;
  }

  calculateDateFilter(range, startDate, endDate) {
    const now = new Date();
    
    switch(range) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() };
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { $gte: weekAgo.toISOString() };
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return { $gte: monthAgo.toISOString() };
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return { $gte: yearAgo.toISOString() };
      case 'custom':
        if (startDate && endDate) {
          return { $gte: startDate, $lte: endDate };
        }
        return {};
      default:
        return {};
    }
  }

  async getAnalytics(req, res) {
    try {
      const { range, startDate, endDate } = req.query;
      const dateFilter = this.calculateDateFilter(range, startDate, endDate);
      
      const users = await this.db.collection('users').find({}).toArray();
      
      let totalRevenue = 0;
      let totalOrders = 0;
      let activeUsers = 0;
      const packageCounts = {};
      const revenueByDate = {};
      const usersByDate = {};
      const topCustomers = [];

      users.forEach(user => {
        // Exclude admin account from analytics
        if (!user.purchases || user.purchases.length === 0 || user.username?.toLowerCase() === 'thaveeseller') return;

        let userRevenue = 0;
        let userOrders = 0;

        user.purchases.forEach(purchase => {
          if (dateFilter.$gte || dateFilter.$lte) {
            const purchaseDate = purchase.date || purchase.createdAt;
            if (dateFilter.$gte && purchaseDate < dateFilter.$gte) return;
            if (dateFilter.$lte && purchaseDate > dateFilter.$lte) return;
          }

          const priceMatch = purchase.price?.match(/[\d,]+\.?\d*/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

          if (price > 0 && !purchase.isSample) {
            totalRevenue += price;
            totalOrders++;
            userRevenue += price;
            userOrders++;

            const packageName = purchase.package || 'Unknown';
            packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;

            const date = (purchase.date || purchase.createdAt || '').split('T')[0];
            if (date) {
              revenueByDate[date] = (revenueByDate[date] || 0) + price;
            }
          }
        });

        if (userOrders > 0) {
          activeUsers++;
          topCustomers.push({
            username: user.username,
            totalOrders: userOrders,
            totalSpent: userRevenue,
            avgOrderValue: userRevenue / userOrders,
            lastPurchase: user.purchases[user.purchases.length - 1]?.date || 'N/A'
          });
        }

        const joinDate = (user.createdAt || user.lastLogin || '').split('T')[0];
        if (joinDate) {
          usersByDate[joinDate] = (usersByDate[joinDate] || 0) + 1;
        }
      });

      topCustomers.sort((a, b) => b.totalSpent - a.totalSpent);

      const revenueDates = Object.keys(revenueByDate).sort();
      const userDates = Object.keys(usersByDate).sort();

      res.json({
        stats: {
          totalRevenue,
          totalOrders,
          activeUsers,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          revenueChange: 0,
          ordersChange: 0,
          usersChange: 0,
          avgChange: 0
        },
        revenueOverTime: {
          labels: revenueDates,
          data: revenueDates.map(date => revenueByDate[date])
        },
        packageDistribution: {
          labels: Object.keys(packageCounts),
          data: Object.values(packageCounts)
        },
        userGrowth: {
          labels: userDates,
          data: userDates.map(date => usersByDate[date])
        },
        topCustomers
      });

    } catch (error) {
      logError(error, { context: 'Get analytics' });
      res.status(500).json({ error: 'Failed to load analytics' });
    }
  }
}

module.exports = AnalyticsController;
