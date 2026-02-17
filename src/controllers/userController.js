const { logError } = require('../utils/logger');

class UserController {
  constructor(db) {
    this.db = db;
  }

  async getAllUsers(req, res) {
    try {
      const users = await this.db.collection('users').find({}, { 
        projection: { username: 1, _id: 0 } 
      }).toArray();
      res.json(users);
    } catch (error) {
      logError(error, { context: 'Get all users' });
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async getUserByUsername(req, res) {
    try {
      const { username } = req.params;
      const user = await this.db.collection('users').findOne({ username });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      logError(error, { context: 'Get user by username' });
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  async createUser(req, res) {
    try {
      const { username, firstName, lastName, telegramId } = req.body;
      
      const existingUser = await this.db.collection('users').findOne({ 
        $or: [{ username }, { id: parseInt(telegramId) }]
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      const newUser = {
        id: parseInt(telegramId),
        username,
        first_name: firstName,
        last_name: lastName || '',
        hasUsername: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        purchases: [],
        badges: [{ type: 'NEW', assignedAt: new Date().toISOString(), assignedBy: 'admin' }],
        loginAttempts: 0
      };
      
      await this.db.collection('users').insertOne(newUser);
      
      // Broadcast to SSE clients
      global.sseClients?.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'user_created', user: newUser })}\n\n`);
      });
      
      res.json({ success: true, user: newUser });
    } catch (error) {
      logError(error, { context: 'Create user' });
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { username } = req.body;
      await this.db.collection('users').deleteOne({ username });
      
      // Broadcast to SSE clients
      global.sseClients?.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'user_deleted', username })}\n\n`);
      });
      
      res.json({ success: true });
    } catch (error) {
      logError(error, { context: 'Delete user' });
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
}

module.exports = UserController;
