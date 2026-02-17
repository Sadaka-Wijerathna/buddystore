class Package {
  constructor(data) {
    this.package = data.package;
    this.count = parseInt(data.count);
    this.price = data.price;
    this.date = data.date;
    this.isSample = data.isSample || false;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  static validate(data) {
    const errors = [];
    
    if (!data.package || data.package.trim() === '') {
      errors.push('Package name is required');
    }
    
    if (!data.count || isNaN(parseInt(data.count)) || parseInt(data.count) <= 0) {
      errors.push('Valid video count is required');
    }
    
    if (!data.price) {
      errors.push('Price is required');
    }
    
    if (!data.date) {
      errors.push('Date is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      package: this.package,
      count: this.count,
      price: this.price,
      date: this.date,
      isSample: this.isSample,
      createdAt: this.createdAt
    };
  }
}

module.exports = Package;
