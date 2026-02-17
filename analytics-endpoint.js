// Add this to server.js inside mongo.connect().then() block

// ✅ Analytics API Endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    switch(range) {
      case 'today':
        dateFilter = {
          $gte: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
          $lte: new Date(now.setHours(23, 59, 59, 999)).toISOString()
        };
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        dateFilter = { $gte: weekAgo.toISOString() };
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        dateFilter = { $gte: monthAgo.toISOString() };
        break;
      case 'year':
        const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
        dateFilter = { $gte: yearAgo.toISOString() };
        break;
      case 'custom':
        if (startDate && endDate) {
          dateFilter = { $gte: startDate, $lte: endDate };
        }
        break;
      default:
        dateFilter = {}; // All time
    }

    // Get all users with their purchase history
    const users = await db.collection('users').find({}).toArray();
    
    // Calculate statistics
    let totalRevenue = 0;
    let totalOrders = 0;
    let activeUsers = 0;
    const packageCounts = {};
    const revenueByDate = {};
    const usersByDate = {};
    const topCustomers = [];

    users.forEach(user => {
      if (!user.purchases || user.purchases.length === 0) return;

      let userRevenue = 0;
      let userOrders = 0;

      user.purchases.forEach(purchase => {
        // Filter by date if needed
        if (dateFilter.$gte || dateFilter.$lte) {
          const purchaseDate = purchase.date || purchase.createdAt;
          if (dateFilter.$gte && purchaseDate < dateFilter.$gte) return;
          if (dateFilter.$lte && purchaseDate > dateFilter.$lte) return;
        }

        // Extract price
        const priceMatch = purchase.price?.match(/[\d,]+\.?\d*/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

        if (price > 0 && !purchase.isSample) {
          totalRevenue += price;
          totalOrders++;
          userRevenue += price;
          userOrders++;

          // Package distribution
          const packageName = purchase.package || 'Unknown';
          packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;

          // Revenue by date
          const date = (purchase.date || purchase.createdAt || '').split('T')[0];
          revenueByDate[date] = (revenueByDate[date] || 0) + price;
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

      // User growth by date
      const joinDate = (user.createdAt || user.lastLogin || '').split('T')[0];
      if (joinDate) {
        usersByDate[joinDate] = (usersByDate[joinDate] || 0) + 1;
      }
    });

    // Sort top customers
    topCustomers.sort((a, b) => b.totalSpent - a.totalSpent);

    // Prepare revenue over time data
    const revenueDates = Object.keys(revenueByDate).sort();
    const revenueOverTime = {
      labels: revenueDates,
      data: revenueDates.map(date => revenueByDate[date])
    };

    // Prepare package distribution
    const packageDistribution = {
      labels: Object.keys(packageCounts),
      data: Object.values(packageCounts)
    };

    // Prepare user growth data
    const userDates = Object.keys(usersByDate).sort();
    const userGrowth = {
      labels: userDates,
      data: userDates.map(date => usersByDate[date])
    };

    // Calculate changes (mock for now - would need historical data)
    const stats = {
      totalRevenue,
      totalOrders,
      activeUsers,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      revenueChange: 0, // Would calculate from previous period
      ordersChange: 0,
      usersChange: 0,
      avgChange: 0
    };

    res.json({
      stats,
      revenueOverTime,
      packageDistribution,
      userGrowth,
      topCustomers
    });

  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});
