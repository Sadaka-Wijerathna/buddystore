// Add this to server.js inside mongo.connect().then() block

const sseService = require('./src/services/sseService');

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  sseService.addClient(res);
});

// Make sseService globally available for broadcasting
global.sseService = sseService;

// Example: Broadcast when user is created
// sseService.broadcast({ type: 'user_created', user: newUser });

// Example: Broadcast delivery progress
// sseService.broadcast({ type: 'delivery_progress', username, current, total });
