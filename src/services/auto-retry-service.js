// Auto-Retry Service for Failed Video Deliveries
// Automatically retries failed deliveries with intelligent retry logic

const { deliverVideosToUserWithRetry } = require('../../enhanced-video-delivery');

class AutoRetryService {
  constructor(bot, db, config = {}) {
    this.bot = bot;
    this.db = db;
    this.config = {
      enabled: config.enabled !== false, // Default enabled
      intervalMinutes: config.intervalMinutes || 15, // Run every 15 minutes
      maxRetryAttempts: config.maxRetryAttempts || 5,
      cleanupDays: config.cleanupDays || 7, // Clean up records older than 7 days
      adminNotificationThreshold: config.adminNotificationThreshold || 3, // Notify admin after 3 failed attempts
      primaryAdminId: config.primaryAdminId || 6539713872,
      batchSize: config.batchSize || 10, // Process 10 failed deliveries at a time
      ...config
    };
    
    this.isRunning = false;
    this.intervalId = null;
    this.stats = {
      totalProcessed: 0,
      successfulRetries: 0,
      failedRetries: 0,
      permanentFailures: 0,
      lastRunAt: null,
      nextRunAt: null
    };
    
    console.log('🔄 Auto-Retry Service initialized with config:', this.config);
  }

  /**
   * Start the auto-retry service
   */
  start() {
    if (this.intervalId) {
      console.log('⚠️ Auto-retry service is already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('⚠️ Auto-retry service is disabled in configuration');
      return;
    }

    console.log(`🚀 Starting auto-retry service (interval: ${this.config.intervalMinutes} minutes)`);
    
    // Run immediately on start
    this.processFailedDeliveries();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.processFailedDeliveries();
    }, this.config.intervalMinutes * 60 * 1000);

    this.updateNextRunTime();
  }

  /**
   * Stop the auto-retry service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Auto-retry service stopped');
    }
  }

  /**
   * Update next run time for monitoring
   */
  updateNextRunTime() {
    this.stats.nextRunAt = new Date(Date.now() + (this.config.intervalMinutes * 60 * 1000));
  }

  /**
   * Categorize failure type based on error message
   */
  categorizeFailure(errorMessage) {
    const error = errorMessage.toLowerCase();
    
    if (error.includes('rate limit') || error.includes('too many requests')) {
      return { type: 'rate_limit', isPermanent: false, retryDelayHours: 1 };
    }
    
    if (error.includes('blocked') || error.includes('forbidden') || error.includes('403')) {
      return { type: 'user_blocked', isPermanent: true, retryDelayHours: 0 };
    }
    
    if (error.includes('network') || error.includes('timeout') || error.includes('connection')) {
      return { type: 'network_error', isPermanent: false, retryDelayHours: 0.5 };
    }
    
    if (error.includes('file not found') || error.includes('invalid file')) {
      return { type: 'invalid_file', isPermanent: true, retryDelayHours: 0 };
    }
    
    if (error.includes('chat not found') || error.includes('user not found')) {
      return { type: 'user_not_found', isPermanent: true, retryDelayHours: 0 };
    }
    
    // Default for unknown errors
    return { type: 'unknown', isPermanent: false, retryDelayHours: 2 };
  }

  /**
   * Calculate next retry time based on failure type and retry count
   */
  calculateNextRetryTime(failureType, retryCount) {
    const baseDelayHours = {
      'rate_limit': [1, 4, 12, 24, 48],
      'network_error': [0.5, 2, 8, 24, 48],
      'unknown': [1, 3, 9, 24, 48]
    };

    const delays = baseDelayHours[failureType] || baseDelayHours['unknown'];
    const delayIndex = Math.min(retryCount, delays.length - 1);
    const delayHours = delays[delayIndex];
    
    return new Date(Date.now() + (delayHours * 60 * 60 * 1000));
  }

  /**
   * Process all failed deliveries that are ready for retry
   */
  async processFailedDeliveries() {
    if (this.isRunning) {
      console.log('⚠️ Auto-retry process is already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    this.stats.lastRunAt = new Date();
    this.updateNextRunTime();

    try {
      console.log('🔄 Starting auto-retry process...');
      
      // Find failed deliveries ready for retry
      const now = new Date();
      const failedDeliveries = await this.db.collection('failed_deliveries').find({
        isPermanentFailure: { $ne: true },
        autoRetryEnabled: { $ne: false },
        retryCount: { $lt: this.config.maxRetryAttempts },
        $or: [
          { nextRetryAt: { $exists: false } },
          { nextRetryAt: { $lte: now } }
        ]
      }).limit(this.config.batchSize).toArray();

      if (failedDeliveries.length === 0) {
        console.log('✅ No failed deliveries ready for retry');
        await this.cleanupOldRecords();
        return;
      }

      console.log(`📦 Processing ${failedDeliveries.length} failed deliveries for auto-retry`);

      for (const failedDelivery of failedDeliveries) {
        await this.processFailedDelivery(failedDelivery);
        // Small delay between processing different users
        await this.delay(2000);
      }

      // Clean up old records after processing
      await this.cleanupOldRecords();

      console.log(`✅ Auto-retry cycle completed. Stats: ${this.stats.successfulRetries} successful, ${this.stats.failedRetries} failed`);

    } catch (error) {
      console.error('❌ Error in auto-retry process:', error);
      await this.notifyAdminOfError(error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single failed delivery
   */
  async processFailedDelivery(failedDelivery) {
    const { username, packageType, failedVideos, retryCount = 0 } = failedDelivery;
    
    try {
      console.log(`🔄 Auto-retrying delivery for @${username} (${packageType}) - Attempt ${retryCount + 1}`);

      // Check if user still exists and has valid Telegram ID
      const user = await this.db.collection('users').findOne({ username });
      if (!user || !user.id) {
        await this.markAsPermanentFailure(failedDelivery._id, 'user_not_found', 'User no longer exists or has no Telegram ID');
        return;
      }

      // Attempt to retry failed videos
      const retryResult = await this.retryFailedVideos(user.id, failedVideos, packageType);
      
      if (retryResult.allSuccessful) {
        // All videos sent successfully
        await this.handleSuccessfulRetry(failedDelivery, retryResult);
        this.stats.successfulRetries++;
        
        // Notify user of successful retry
        await this.bot.sendMessage(user.id, 
          `🎉 Great news! We've successfully delivered ${retryResult.sentCount} videos from your '${packageType}' package that previously failed. Enjoy!`
        );
        
      } else if (retryResult.sentCount > 0) {
        // Partial success - update the failed delivery record
        await this.handlePartialRetry(failedDelivery, retryResult);
        this.stats.successfulRetries++;
        
      } else {
        // Complete failure - update retry count and schedule next retry
        await this.handleFailedRetry(failedDelivery, retryResult);
        this.stats.failedRetries++;
      }

      this.stats.totalProcessed++;

    } catch (error) {
      console.error(`❌ Error processing failed delivery for @${username}:`, error);
      await this.handleFailedRetry(failedDelivery, { error: error.message, sentCount: 0 });
      this.stats.failedRetries++;
    }
  }

  /**
   * Retry failed videos for a specific user
   */
  async retryFailedVideos(userId, failedVideos, packageType) {
    let sentCount = 0;
    let stillFailedVideos = [];
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const failedVideo of failedVideos) {
      try {
        await this.bot.sendVideo(userId, failedVideo.fileId);
        sentCount++;
        console.log(`✅ Auto-retry successful for video ${sentCount}/${failedVideos.length}`);
        
        // Update user's sent videos tracking
        await this.db.collection('users').updateOne(
          { id: userId },
          { $addToSet: { [`sent_${packageType}`]: failedVideo.fileId } }
        );
        
        await delay(1000); // 1 second delay between videos
        
      } catch (error) {
        console.error(`❌ Auto-retry failed for video:`, error.message);
        stillFailedVideos.push({
          ...failedVideo,
          lastError: error.message,
          lastRetryAt: new Date().toISOString()
        });
      }
    }

    return {
      sentCount,
      failedCount: stillFailedVideos.length,
      stillFailedVideos,
      allSuccessful: stillFailedVideos.length === 0,
      totalAttempted: failedVideos.length
    };
  }

  /**
   * Handle successful retry (all videos sent)
   */
  async handleSuccessfulRetry(failedDelivery, retryResult) {
    // Remove the failed delivery record
    await this.db.collection('failed_deliveries').deleteOne({ _id: failedDelivery._id });
    
    // Log successful retry
    await this.db.collection('retry_logs').insertOne({
      username: failedDelivery.username,
      packageType: failedDelivery.packageType,
      type: 'successful_retry',
      retryCount: failedDelivery.retryCount + 1,
      videosRetried: retryResult.totalAttempted,
      videosSent: retryResult.sentCount,
      timestamp: new Date().toISOString(),
      processedBy: 'auto-retry-service'
    });

    console.log(`✅ Auto-retry successful for @${failedDelivery.username} - ${retryResult.sentCount} videos delivered`);
  }

  /**
   * Handle partial retry (some videos sent)
   */
  async handlePartialRetry(failedDelivery, retryResult) {
    const nextRetryTime = this.calculateNextRetryTime('unknown', failedDelivery.retryCount + 1);
    
    // Update failed delivery record with remaining failed videos
    await this.db.collection('failed_deliveries').updateOne(
      { _id: failedDelivery._id },
      {
        $set: {
          failedVideos: retryResult.stillFailedVideos,
          lastRetryAt: new Date().toISOString(),
          nextRetryAt: nextRetryTime,
          retryHistory: [
            ...(failedDelivery.retryHistory || []),
            {
              attempt: failedDelivery.retryCount + 1,
              timestamp: new Date().toISOString(),
              result: 'partial_success',
              videosSent: retryResult.sentCount,
              videosStillFailed: retryResult.failedCount
            }
          ]
        },
        $inc: { retryCount: 1 }
      }
    );

    console.log(`🔄 Partial auto-retry for @${failedDelivery.username} - ${retryResult.sentCount} sent, ${retryResult.failedCount} still failed`);
  }

  /**
   * Handle failed retry
   */
  async handleFailedRetry(failedDelivery, retryResult) {
    const newRetryCount = failedDelivery.retryCount + 1;
    
    // Categorize the failure
    const failureInfo = this.categorizeFailure(retryResult.error || 'Unknown error');
    
    if (failureInfo.isPermanent || newRetryCount >= this.config.maxRetryAttempts) {
      await this.markAsPermanentFailure(
        failedDelivery._id, 
        failureInfo.type, 
        failureInfo.isPermanent ? 'Permanent failure type' : 'Max retry attempts reached'
      );
      this.stats.permanentFailures++;
      
      // Notify admin if threshold reached
      if (newRetryCount >= this.config.adminNotificationThreshold) {
        await this.notifyAdminOfPersistentFailure(failedDelivery, retryResult);
      }
      
    } else {
      // Schedule next retry
      const nextRetryTime = this.calculateNextRetryTime(failureInfo.type, newRetryCount);
      
      await this.db.collection('failed_deliveries').updateOne(
        { _id: failedDelivery._id },
        {
          $set: {
            lastRetryAt: new Date().toISOString(),
            nextRetryAt: nextRetryTime,
            failureType: failureInfo.type,
            lastError: retryResult.error,
            retryHistory: [
              ...(failedDelivery.retryHistory || []),
              {
                attempt: newRetryCount,
                timestamp: new Date().toISOString(),
                result: 'failed',
                error: retryResult.error,
                failureType: failureInfo.type
              }
            ]
          },
          $inc: { retryCount: 1 }
        }
      );
      
      console.log(`❌ Auto-retry failed for @${failedDelivery.username} - scheduled next retry for ${nextRetryTime.toLocaleString()}`);
    }
  }

  /**
   * Mark a failed delivery as permanent failure
   */
  async markAsPermanentFailure(failedDeliveryId, failureType, reason) {
    await this.db.collection('failed_deliveries').updateOne(
      { _id: failedDeliveryId },
      {
        $set: {
          isPermanentFailure: true,
          failureType,
          permanentFailureReason: reason,
          markedPermanentAt: new Date().toISOString()
        }
      }
    );
  }

  /**
   * Clean up old failed delivery records
   */
  async cleanupOldRecords() {
    try {
      const cutoffDate = new Date(Date.now() - (this.config.cleanupDays * 24 * 60 * 60 * 1000));
      
      const result = await this.db.collection('failed_deliveries').deleteMany({
        $or: [
          { isPermanentFailure: true, markedPermanentAt: { $lt: cutoffDate.toISOString() } },
          { retryCount: { $gte: this.config.maxRetryAttempts }, lastRetryAt: { $lt: cutoffDate.toISOString() } }
        ]
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} old failed delivery records`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up old records:', error);
    }
  }

  /**
   * Notify admin of persistent failure
   */
  async notifyAdminOfPersistentFailure(failedDelivery, retryResult) {
    try {
      if (failedDelivery.adminNotified) {
        return; // Already notified
      }

      const message = 
        `⚠️ <b>Persistent Delivery Failure Alert</b>\n\n` +
        `👤 <b>User:</b> @${failedDelivery.username}\n` +
        `📦 <b>Package:</b> ${failedDelivery.packageType}\n` +
        `🔄 <b>Retry Attempts:</b> ${failedDelivery.retryCount + 1}/${this.config.maxRetryAttempts}\n` +
        `❌ <b>Failed Videos:</b> ${failedDelivery.failedVideos.length}\n` +
        `🕒 <b>First Failed:</b> ${new Date(failedDelivery.timestamp).toLocaleString()}\n` +
        `📝 <b>Last Error:</b> ${retryResult.error}\n\n` +
        `🔧 <b>Action Required:</b> Manual intervention may be needed.\n` +
        `Use /retry ${failedDelivery.username} ${failedDelivery.packageType} to manually retry.`;

      await this.bot.sendMessage(this.config.primaryAdminId, message, { parse_mode: 'HTML' });
      
      // Mark as notified
      await this.db.collection('failed_deliveries').updateOne(
        { _id: failedDelivery._id },
        { $set: { adminNotified: true, adminNotifiedAt: new Date().toISOString() } }
      );

    } catch (error) {
      console.error('❌ Error notifying admin:', error);
    }
  }

  /**
   * Notify admin of service errors
   */
  async notifyAdminOfError(error) {
    try {
      const message = 
        `🚨 <b>Auto-Retry Service Error</b>\n\n` +
        `❌ <b>Error:</b> ${error.message}\n` +
        `🕒 <b>Time:</b> ${new Date().toLocaleString()}\n\n` +
        `The auto-retry service encountered an error and may need attention.`;

      await this.bot.sendMessage(this.config.primaryAdminId, message, { parse_mode: 'HTML' });
    } catch (notifyError) {
      console.error('❌ Error notifying admin of service error:', notifyError);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      config: this.config,
      uptime: this.intervalId ? Date.now() - this.stats.lastRunAt : 0
    };
  }

  /**
   * Get failed deliveries summary
   */
  async getFailedDeliveriesSummary() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$failureType',
            count: { $sum: 1 },
            avgRetryCount: { $avg: '$retryCount' },
            oldestFailure: { $min: '$timestamp' }
          }
        }
      ];

      const summary = await this.db.collection('failed_deliveries').aggregate(pipeline).toArray();
      
      const total = await this.db.collection('failed_deliveries').countDocuments();
      const permanent = await this.db.collection('failed_deliveries').countDocuments({ isPermanentFailure: true });
      const readyForRetry = await this.db.collection('failed_deliveries').countDocuments({
        isPermanentFailure: { $ne: true },
        autoRetryEnabled: { $ne: false },
        retryCount: { $lt: this.config.maxRetryAttempts },
        $or: [
          { nextRetryAt: { $exists: false } },
          { nextRetryAt: { $lte: new Date() } }
        ]
      });

      return {
        total,
        permanent,
        readyForRetry,
        byFailureType: summary
      };
    } catch (error) {
      console.error('❌ Error getting failed deliveries summary:', error);
      return null;
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AutoRetryService;