// Real-time Updates using Server-Sent Events
class RealtimeUpdates {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource('/api/events');

    this.eventSource.onopen = () => {
      console.log('✅ Real-time connection established');
      this.reconnectAttempts = 0;
      this.showNotification('Connected to real-time updates', 'success');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    this.eventSource.onerror = () => {
      console.error('❌ Real-time connection error');
      this.eventSource.close();
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(() => this.connect(), delay);
      } else {
        this.showNotification('Real-time updates disconnected', 'warning');
      }
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  handleEvent(data) {
    const { type, ...payload } = data;

    // Call registered listeners
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(callback => callback(payload));
    }

    // Handle built-in events
    switch(type) {
      case 'connected':
        console.log('Connected to SSE');
        break;
      
      case 'user_created':
        this.showNotification(`New user: @${payload.user.username}`, 'info');
        this.refreshUserList();
        break;
      
      case 'user_deleted':
        this.showNotification(`User deleted: @${payload.username}`, 'info');
        this.refreshUserList();
        break;
      
      case 'package_added':
        this.showNotification(`Package added for @${payload.username}`, 'success');
        this.updateUserPackages(payload.username);
        break;
      
      case 'package_deleted':
        this.showNotification(`Package deleted for @${payload.username}`, 'info');
        this.updateUserPackages(payload.username);
        break;
      
      case 'delivery_started':
        this.showNotification(`Delivery started for @${payload.username}`, 'info');
        break;
      
      case 'delivery_progress':
        this.updateDeliveryProgress(payload);
        break;
      
      case 'delivery_completed':
        this.showNotification(`Delivery completed for @${payload.username}`, 'success');
        break;
    }
  }

  refreshUserList() {
    if (typeof fetchUsers === 'function') {
      fetchUsers();
    }
  }

  updateUserPackages(username) {
    if (typeof loadPackages === 'function' && window.selectedUser?.username === username) {
      loadPackages(username);
    }
  }

  updateDeliveryProgress(payload) {
    const { username, current, total } = payload;
    if (window.selectedUser?.username === username) {
      LoadingStates.showProgress('packageList', current, total, 'Delivering videos');
    }
  }

  showNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// Initialize real-time updates
const realtimeUpdates = new RealtimeUpdates();

// Auto-connect when page loads
document.addEventListener('DOMContentLoaded', () => {
  realtimeUpdates.connect();
});

// Disconnect when page unloads
window.addEventListener('beforeunload', () => {
  realtimeUpdates.disconnect();
});

window.realtimeUpdates = realtimeUpdates;
