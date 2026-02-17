const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'buddystore' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs to orders.log for business tracking
    new winston.transports.File({ 
      filename: path.join(logsDir, 'orders.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Helper functions for specific log types
const logOrder = (action, data) => {
  logger.info('ORDER_EVENT', {
    action,
    username: data.username,
    package: data.package,
    count: data.count,
    price: data.price,
    timestamp: new Date().toISOString()
  });
};

const logAuth = (action, data) => {
  logger.info('AUTH_EVENT', {
    action,
    username: data.username || data.adminId,
    ip: data.ip,
    userAgent: data.userAgent,
    timestamp: new Date().toISOString()
  });
};

const logError = (error, context = {}) => {
  logger.error('APPLICATION_ERROR', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

const logBot = (action, data) => {
  logger.info('BOT_EVENT', {
    action,
    chatId: data.chatId,
    username: data.username,
    command: data.command,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logOrder,
  logAuth,
  logError,
  logBot
};