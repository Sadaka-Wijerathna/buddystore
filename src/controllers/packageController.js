const { logError } = require('../utils/logger');

class PackageController {
  constructor(db) {
    this.db = db;
  }

  async getUserPackages(req, res) {
    try {
      const { username } = req.query;
      const user = await this.db.collection('users').findOne({ username });
      
      if (!user) {
        return res.json({ packages: [] });
      }
      
      res.json({ packages: user.purchases || [] });
    } catch (error) {
      logError(error, { context: 'Get user packages' });
      res.status(500).json({ error: 'Failed to fetch packages' });
    }
  }

  async addPackage(req, res) {
    try {
      const { username, package: packageName, count, price, date } = req.body;
      
      const packageData = {
        package: packageName,
        count: parseInt(count),
        price,
        date,
        createdAt: new Date().toISOString()
      };
      
      await this.db.collection('users').updateOne(
        { username },
        { $push: { purchases: packageData } }
      );
      
      // Broadcast to SSE clients
      global.sseClients?.forEach(client => {
        client.write(`data: ${JSON.stringify({ 
          type: 'package_added', 
          username, 
          package: packageData 
        })}\n\n`);
      });
      
      res.json({ success: true, package: packageData });
    } catch (error) {
      logError(error, { context: 'Add package' });
      res.status(500).json({ error: 'Failed to add package' });
    }
  }

  async deletePackage(req, res) {
    try {
      const { username, index } = req.body;
      
      const user = await this.db.collection('users').findOne({ username });
      if (!user || !user.purchases || !user.purchases[index]) {
        return res.status(404).json({ error: 'Package not found' });
      }
      
      user.purchases.splice(index, 1);
      
      await this.db.collection('users').updateOne(
        { username },
        { $set: { purchases: user.purchases } }
      );
      
      // Broadcast to SSE clients
      global.sseClients?.forEach(client => {
        client.write(`data: ${JSON.stringify({ 
          type: 'package_deleted', 
          username, 
          index 
        })}\n\n`);
      });
      
      res.json({ success: true });
    } catch (error) {
      logError(error, { context: 'Delete package' });
      res.status(500).json({ error: 'Failed to delete package' });
    }
  }

  async getPackagePrices(req, res) {
    try {
      const pricing = await this.db.collection('settings').findOne({ key: 'package_pricing' });
      const defaultPricing = {
        'Mixed': { pricePerVideo: 1 },
        'Mom And Son': { pricePerVideo: 1.5 },
        'Rape': { pricePerVideo: 1.2 },
        'SL Leaks': { pricePerVideo: 0.8 },
        'CCTV': { pricePerVideo: 1.0 }
      };
      
      res.json(pricing?.value || defaultPricing);
    } catch (error) {
      logError(error, { context: 'Get package prices' });
      res.status(500).json({ error: 'Failed to fetch prices' });
    }
  }
}

module.exports = PackageController;
