class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.first_name = data.first_name;
    this.last_name = data.last_name || '';
    this.hasUsername = data.hasUsername || true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || new Date().toISOString();
    this.purchases = data.purchases || [];
    this.badges = data.badges || [];
    this.loginAttempts = data.loginAttempts || 0;
  }

  static validate(data) {
    const errors = [];
    
    if (!data.username || data.username.trim() === '') {
      errors.push('Username is required');
    }
    
    if (!data.id || isNaN(parseInt(data.id))) {
      errors.push('Valid Telegram ID is required');
    }
    
    if (!data.first_name || data.first_name.trim() === '') {
      errors.push('First name is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      first_name: this.first_name,
      last_name: this.last_name,
      hasUsername: this.hasUsername,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
      purchases: this.purchases,
      badges: this.badges,
      loginAttempts: this.loginAttempts
    };
  }
}

module.exports = User;
