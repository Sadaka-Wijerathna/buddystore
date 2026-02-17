const { MongoClient } = require('mongodb');
const { logger, logError } = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new MongoClient(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        tls: true,
        ssl: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db("telegram_site");
      this.isConnected = true;
      
      // Create indexes for better performance
      await this.createIndexes();
      
      logger.info('✅ Connected to MongoDB');
      return this.db;
    } catch (error) {
      logError(error, { context: 'Database connection' });
      throw error;
    }
  }

  async createIndexes() {
    try {
      // User collection indexes
      await this.db.collection('users').createIndex({ username: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ id: 1 }, { unique: true });
      
      // Orders collection indexes (if you add orders collection)
      await this.db.collection('orders').createIndex({ username: 1 });
      await this.db.collection('orders').createIndex({ createdAt: -1 });
      await this.db.collection('orders').createIndex({ status: 1 });
      
      // Video files collection indexes
      await this.db.collection('video_files').createIndex({ category: 1 }, { unique: true });
      
      logger.info('Database indexes created successfully');
    } catch (error) {
      logError(error, { context: 'Creating database indexes' });
    }
  }

  getDb() {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logError(error, { context: 'Database disconnection' });
    }
  }

  // User operations
  async createUser(userData) {
    try {
      const result = await this.db.collection('users').updateOne(
        { id: userData.id },
        {
          $set: {
            username: userData.username,
            photo_url: userData.photo_url,
            id: userData.id,
            lastLogin: new Date(),
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      return result;
    } catch (error) {
      logError(error, { context: 'Creating user', userData });
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      return await this.db.collection('users').findOne({ username });
    } catch (error) {
      logError(error, { context: 'Getting user by username', username });
      throw error;
    }
  }

  async getUserById(id) {
    try {
      return await this.db.collection('users').findOne({ id: parseInt(id) });
    } catch (error) {
      logError(error, { context: 'Getting user by ID', id });
      throw error;
    }
  }

  async getUserByIdentifier(identifier) {
    try {
      // Try username first
      let user = await this.db.collection('users').findOne({ username: identifier });
      
      // Try by ID if not found and identifier is numeric
      if (!user && !isNaN(identifier)) {
        user = await this.db.collection('users').findOne({ id: parseInt(identifier) });
      }
      
      return user;
    } catch (error) {
      logError(error, { context: 'Getting user by identifier', identifier });
      throw error;
    }
  }

  async getAllUsers() {
    try {
      return await this.db.collection('users').find({}, { 
        projection: { username: 1, _id: 0, lastLogin: 1, createdAt: 1 } 
      }).toArray();
    } catch (error) {
      logError(error, { context: 'Getting all users' });
      throw error;
    }
  }

  async getAllUsersWithDetails() {
    try {
      const users = await this.db.collection('users').find({}, { 
        projection: { 
          username: 1, 
          id: 1, 
          first_name: 1, 
          last_name: 1, 
          _id: 0, 
          lastLogin: 1, 
          createdAt: 1,
          hasUsername: 1
        } 
      }).toArray();
      
      // Ensure all users have a valid ID for display
      return users.map(user => {
        // If id is missing, undefined, or invalid, provide a fallback
        if (!user.id || user.id === null || user.id === undefined) {
          user.id = 'NO_ID';
        }
        return user;
      });
    } catch (error) {
      logError(error, { context: 'Getting all users with details' });
      throw error;
    }
  }

  async deleteUser(username) {
    try {
      return await this.db.collection('users').deleteOne({ username });
    } catch (error) {
      logError(error, { context: 'Deleting user', username });
      throw error;
    }
  }

  // Fix users with missing or invalid IDs
  async fixUserIds() {
    try {
      const usersWithoutIds = await this.db.collection('users').find({
        $or: [
          { id: { $exists: false } },
          { id: null },
          { id: undefined },
          { id: '' }
        ]
      }).toArray();
      
      logger.info(`Found ${usersWithoutIds.length} users without valid IDs`);
      
      let fixedCount = 0;
      for (const user of usersWithoutIds) {
        // For users without IDs, we can't automatically assign Telegram IDs
        // since we don't have that information. We'll mark them for manual review.
        await this.db.collection('users').updateOne(
          { _id: user._id },
          { 
            $set: { 
              id: 'NEEDS_MANUAL_FIX',
              needsIdFix: true,
              idFixedAt: new Date().toISOString()
            }
          }
        );
        fixedCount++;
      }
      
      logger.info(`Fixed ${fixedCount} users with missing IDs`);
      return { fixed: fixedCount, total: usersWithoutIds.length };
    } catch (error) {
      logError(error, { context: 'Fixing user IDs' });
      throw error;
    }
  }

  // Fix string IDs to numeric IDs
  async fixStringIds() {
    try {
      const usersWithStringIds = await this.db.collection('users').find({ 
        id: { $type: 'string' } 
      }).toArray();
      
      let fixedCount = 0;
      let failedCount = 0;
      
      for (const user of usersWithStringIds) {
        const numericId = parseInt(user.id);
        if (!isNaN(numericId) && numericId > 0) {
          await this.db.collection('users').updateOne(
            { _id: user._id },
            { $set: { id: numericId } }
          );
          fixedCount++;
        } else {
          failedCount++;
        }
      }
      
      logger.info(`Fixed ${fixedCount} string IDs, failed to fix ${failedCount}`);
      return { fixed: fixedCount, failed: failedCount, total: usersWithStringIds.length };
    } catch (error) {
      logError(error, { context: 'Fixing string IDs' });
      throw error;
    }
  }

  // Purchase operations
  async addPurchase(username, purchaseData) {
    try {
      return await this.db.collection('users').updateOne(
        { username },
        { 
          $push: { purchases: purchaseData },
          $set: { lastPurchase: new Date() }
        },
        { upsert: true }
      );
    } catch (error) {
      logError(error, { context: 'Adding purchase', username, purchaseData });
      throw error;
    }
  }

  async getUserPurchases(identifier) {
    try {
      const user = await this.getUserByIdentifier(identifier);
      return user?.purchases || [];
    } catch (error) {
      logError(error, { context: 'Getting user purchases', identifier });
      throw error;
    }
  }

  async deletePurchase(username, index) {
    try {
      const user = await this.db.collection('users').findOne({ username });
      if (!user || !user.purchases || !user.purchases[index]) {
        throw new Error('Purchase not found');
      }

      user.purchases.splice(index, 1);
      return await this.db.collection('users').updateOne(
        { username },
        { $set: { purchases: user.purchases } }
      );
    } catch (error) {
      logError(error, { context: 'Deleting purchase', username, index });
      throw error;
    }
  }

  // Video file operations
  async addVideoFile(category, fileId) {
    try {
      return await this.db.collection('video_files').updateOne(
        { category },
        { $push: { files: fileId } },
        { upsert: true }
      );
    } catch (error) {
      logError(error, { context: 'Adding video file', category, fileId });
      throw error;
    }
  }

  async getVideoFiles(category) {
    try {
      const result = await this.db.collection('video_files').findOne({ category });
      return result?.files || [];
    } catch (error) {
      logError(error, { context: 'Getting video files', category });
      throw error;
    }
  }

  async clearVideoFiles(category) {
    try {
      return await this.db.collection('video_files').updateOne(
        { category },
        { $set: { files: [] } }
      );
    } catch (error) {
      logError(error, { context: 'Clearing video files', category });
      throw error;
    }
  }

  // Analytics operations
  async getAnalytics() {
    try {
      const totalUsers = await this.db.collection('users').countDocuments();
      const totalPurchases = await this.db.collection('users').aggregate([
        { $unwind: '$purchases' },
        { $count: 'total' }
      ]).toArray();

      const popularPackages = await this.db.collection('users').aggregate([
        { $unwind: '$purchases' },
        { $group: { _id: '$purchases.package', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray();

      return {
        totalUsers,
        totalPurchases: totalPurchases[0]?.total || 0,
        popularPackages
      };
    } catch (error) {
      logError(error, { context: 'Getting analytics' });
      throw error;
    }
  }
}

module.exports = new DatabaseService();