// Auto-Retry Service Configuration

module.exports = {
  // Enable/disable auto-retry service
  enabled: process.env.AUTO_RETRY_ENABLED !== 'false', // Default enabled unless explicitly disabled
  
  // How often to run the auto-retry process (in minutes)
  intervalMinutes: parseInt(process.env.AUTO_RETRY_INTERVAL_MINUTES) || 15,
  
  // Maximum number of retry attempts before marking as permanent failure
  maxRetryAttempts: parseInt(process.env.AUTO_RETRY_MAX_ATTEMPTS) || 5,
  
  // How many days to keep old failed delivery records before cleanup
  cleanupDays: parseInt(process.env.AUTO_RETRY_CLEANUP_DAYS) || 7,
  
  // After how many failed attempts to notify admin
  adminNotificationThreshold: parseInt(process.env.AUTO_RETRY_ADMIN_THRESHOLD) || 3,
  
  // Primary admin ID for notifications
  primaryAdminId: parseInt(process.env.PRIMARY_ADMIN_ID) || 6539713872,
  
  // How many failed deliveries to process in one batch
  batchSize: parseInt(process.env.AUTO_RETRY_BATCH_SIZE) || 10,
  
  // Retry delay configurations (in hours) for different failure types
  retryDelays: {
    rate_limit: [1, 4, 12, 24, 48],      // Rate limit errors: gradual backoff
    network_error: [0.5, 2, 8, 24, 48],  // Network errors: faster initial retry
    unknown: [1, 3, 9, 24, 48],          // Unknown errors: standard backoff
    user_blocked: [],                     // User blocked: no retries (permanent)
    invalid_file: [],                     // Invalid file: no retries (permanent)
    user_not_found: []                    // User not found: no retries (permanent)
  },
  
  // Enable detailed logging
  detailedLogging: process.env.AUTO_RETRY_DETAILED_LOGGING === 'true',
  
  // Enable admin notifications for service errors
  notifyAdminOnErrors: process.env.AUTO_RETRY_NOTIFY_ADMIN_ERRORS !== 'false',
  
  // Minimum time between notifications to avoid spam (in hours)
  notificationCooldownHours: parseInt(process.env.AUTO_RETRY_NOTIFICATION_COOLDOWN) || 6
};