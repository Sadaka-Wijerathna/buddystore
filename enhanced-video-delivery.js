// Enhanced video delivery functions with retry logic and batch processing

/**
 * Categorize failure type based on error message
 */
function categorizeFailure(errorMessage) {
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
function calculateNextRetryTime(failureType, retryCount) {
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
 * Delivers videos to a user with retry logic and batch processing
 * @param {Object} bot - Telegram bot instance
 * @param {Object} db - MongoDB database instance
 * @param {string} username - Target username
 * @param {string} packageType - Package type (Mixed, Mom And Son, etc.)
 * @param {number} count - Number of videos to send
 * @param {string} adminChatId - Admin chat ID for notifications (optional)
 * @returns {Object} Delivery result with success status and statistics
 */
async function deliverVideosToUserWithRetry(bot, db, username, packageType, count, adminChatId = null) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const MAX_RETRIES = 3;
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_VIDEOS = 1000; // 1 second
  const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds
  
  try {
    // Find user chat ID by Telegram username
    const telegramUser = await db.collection("users").findOne({ username });

    if (!telegramUser || !telegramUser.id) {
      const errorMsg = `⚠️ Can't find chat ID of @${username}, videos not sent.`;
      if (adminChatId) await bot.sendMessage(adminChatId, errorMsg);
      return { 
        success: false, 
        error: 'User not found or no Telegram ID',
        sentCount: 0,
        failedCount: 0,
        successRate: 0
      };
    }

    const buyerId = telegramUser.id;
    const sentVideoIds = new Set(telegramUser[`sent_${packageType}`] || []);
    const entry = await db.collection("video_files").findOne({ category: packageType });
    
    if (!entry || !entry.files || entry.files.length === 0) {
      const errorMsg = `⚠️ No files found in '${packageType}' package.`;
      if (adminChatId) await bot.sendMessage(adminChatId, errorMsg);
      return { 
        success: false, 
        error: 'No videos available',
        sentCount: 0,
        failedCount: 0,
        successRate: 0
      };
    }

    // Filter out already sent videos
    const availableFiles = entry.files.filter(fileData => {
      const fileId = typeof fileData === 'string' ? fileData : fileData.id;
      return !sentVideoIds.has(fileId);
    });
    
    const videosToSend = availableFiles.slice(0, count);

    if (videosToSend.length === 0) {
      const errorMsg = `⚠️ No new files available to send for @${username}.`;
      if (adminChatId) await bot.sendMessage(adminChatId, errorMsg);
      return { 
        success: false, 
        error: 'No new videos available',
        sentCount: 0,
        failedCount: 0,
        successRate: 0
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    const failedVideos = [];
    
    // Process videos in batches
    const batches = [];
    for (let i = 0; i < videosToSend.length; i += BATCH_SIZE) {
      batches.push(videosToSend.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Starting delivery of ${videosToSend.length} videos in ${batches.length} batches to @${username}`);
    
    // ✅ Send initial status message with real-time tracking (like broadcast)
    let statusMsg = null;
    if (adminChatId) {
      statusMsg = await bot.sendMessage(adminChatId, 
        `📦 <b>Video Delivery Started</b>\n\n` +
        `👤 <b>User:</b> @${username}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Total Videos:</b> ${videosToSend.length}\n` +
        `📊 <b>Batches:</b> ${batches.length}\n\n` +
        `🔄 <b>Progress:</b> 0/${videosToSend.length} (0%)\n` +
        `✅ <b>Sent:</b> 0\n` +
        `❌ <b>Failed:</b> 0\n` +
        `📈 <b>Success Rate:</b> 0%`,
        { parse_mode: 'HTML' }
      );
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📤 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} videos)`);
      
      for (const fileData of batch) {
        const fileId = typeof fileData === 'string' ? fileData : fileData.id;
        let retryCount = 0;
        let videoSent = false;
        
        // Retry logic for each video
        while (retryCount < MAX_RETRIES && !videoSent) {
          try {
            await bot.sendVideo(buyerId, fileId);
            sentVideoIds.add(fileId);
            sentCount++;
            videoSent = true;
            
            // Log successful send
            console.log(`✅ Sent video ${sentCount}/${videosToSend.length} to @${username}`);
            
            // ✅ Update progress every 5 videos or at important milestones
            const totalProcessed = sentCount + failedCount;
            const shouldUpdate = (
              sentCount % 5 === 0 || // Every 5 successful sends
              totalProcessed === videosToSend.length || // At completion
              (batchIndex + 1) % 2 === 0 && totalProcessed % BATCH_SIZE === 0 // Every 2 batches
            );
            
            if (shouldUpdate && statusMsg && adminChatId) {
              const progress = Math.round((totalProcessed / videosToSend.length) * 100);
              const currentSuccessRate = totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 0;
              
              const progressText = 
                `📦 <b>Video Delivery in Progress</b>\n\n` +
                `👤 <b>User:</b> @${username}\n` +
                `📦 <b>Package:</b> ${packageType}\n` +
                `🎬 <b>Total Videos:</b> ${videosToSend.length}\n` +
                `📊 <b>Current Batch:</b> ${batchIndex + 1}/${batches.length}\n\n` +
                `🔄 <b>Progress:</b> ${totalProcessed}/${videosToSend.length} (${progress}%)\n` +
                `✅ <b>Sent:</b> ${sentCount}\n` +
                `❌ <b>Failed:</b> ${failedCount}\n` +
                `📈 <b>Success Rate:</b> ${currentSuccessRate}%\n\n` +
                `⏱️ <b>Status:</b> ${totalProcessed === videosToSend.length ? 'Completing...' : 'Sending videos...'}`;
              
              try {
                await bot.editMessageText(progressText, {
                  chat_id: adminChatId,
                  message_id: statusMsg.message_id,
                  parse_mode: 'HTML'
                });
              } catch (editError) {
                // Ignore edit errors (message might be the same or rate limited)
                console.log('⚠️ Could not update progress message:', editError.message);
              }
            }
            
          } catch (err) {
            retryCount++;
            console.error(`❌ Failed to send video (attempt ${retryCount}/${MAX_RETRIES}):`, err.message);
            
            if (retryCount < MAX_RETRIES) {
              // Wait before retry with exponential backoff
              const retryDelay = DELAY_BETWEEN_VIDEOS * Math.pow(2, retryCount - 1);
              await delay(retryDelay);
            } else {
              // Max retries reached, mark as failed
              failedCount++;
              failedVideos.push({ fileId, error: err.message });
              console.error(`❌ Failed to send video after ${MAX_RETRIES} attempts: ${err.message}`);
              
              // ✅ Update progress for failed videos too
              const totalProcessed = sentCount + failedCount;
              if (failedCount % 3 === 0 && statusMsg && adminChatId) { // Update every 3 failures
                const progress = Math.round((totalProcessed / videosToSend.length) * 100);
                const currentSuccessRate = totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 0;
                
                const progressText = 
                  `📦 <b>Video Delivery in Progress</b>\n\n` +
                  `👤 <b>User:</b> @${username}\n` +
                  `📦 <b>Package:</b> ${packageType}\n` +
                  `🎬 <b>Total Videos:</b> ${videosToSend.length}\n` +
                  `📊 <b>Current Batch:</b> ${batchIndex + 1}/${batches.length}\n\n` +
                  `🔄 <b>Progress:</b> ${totalProcessed}/${videosToSend.length} (${progress}%)\n` +
                  `✅ <b>Sent:</b> ${sentCount}\n` +
                  `❌ <b>Failed:</b> ${failedCount}\n` +
                  `📈 <b>Success Rate:</b> ${currentSuccessRate}%\n\n` +
                  `⚠️ <b>Status:</b> Some videos failing, retrying...`;
                
                try {
                  await bot.editMessageText(progressText, {
                    chat_id: adminChatId,
                    message_id: statusMsg.message_id,
                    parse_mode: 'HTML'
                  });
                } catch (editError) {
                  // Ignore edit errors
                }
              }
            }
          }
        }
        
        // Delay between videos (only if video was sent successfully)
        if (videoSent) {
          await delay(DELAY_BETWEEN_VIDEOS);
        }
      }
      
      // ✅ Update progress at the end of each batch
      if (statusMsg && adminChatId) {
        const totalProcessed = sentCount + failedCount;
        const progress = Math.round((totalProcessed / videosToSend.length) * 100);
        const currentSuccessRate = totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 0;
        
        const batchCompleteText = 
          `📦 <b>Video Delivery in Progress</b>\n\n` +
          `👤 <b>User:</b> @${username}\n` +
          `📦 <b>Package:</b> ${packageType}\n` +
          `🎬 <b>Total Videos:</b> ${videosToSend.length}\n` +
          `📊 <b>Batch Completed:</b> ${batchIndex + 1}/${batches.length}\n\n` +
          `🔄 <b>Progress:</b> ${totalProcessed}/${videosToSend.length} (${progress}%)\n` +
          `✅ <b>Sent:</b> ${sentCount}\n` +
          `❌ <b>Failed:</b> ${failedCount}\n` +
          `📈 <b>Success Rate:</b> ${currentSuccessRate}%\n\n` +
          `${batchIndex < batches.length - 1 ? `⏳ <b>Status:</b> Waiting before next batch...` : `🏁 <b>Status:</b> Finalizing delivery...`}`;
        
        try {
          await bot.editMessageText(batchCompleteText, {
            chat_id: adminChatId,
            message_id: statusMsg.message_id,
            parse_mode: 'HTML'
          });
        } catch (editError) {
          // Ignore edit errors
        }
      }
      
      // Delay between batches (except for the last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    // Update sent videos tracking
    await db.collection("users").updateOne(
      { username },
      { 
        $set: { 
          [`sent_${packageType}`]: Array.from(sentVideoIds),
          [`last_delivery_${packageType}`]: {
            date: new Date().toISOString(),
            sentCount,
            failedCount,
            totalRequested: count,
            successRate: Math.round((sentCount / (sentCount + failedCount)) * 100)
          }
        }
      }
    );

    const successRate = Math.round((sentCount / (sentCount + failedCount)) * 100);
    
    // ✅ Send final completion status with detailed summary
    if (adminChatId && statusMsg) {
      const finalStatusText = 
        `✅ <b>Video Delivery Complete!</b>\n\n` +
        `👤 <b>User:</b> @${username}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Total Videos:</b> ${videosToSend.length}\n` +
        `📊 <b>Batches Processed:</b> ${batches.length}\n\n` +
        `📊 <b>Final Results:</b>\n` +
        `✅ <b>Successfully Sent:</b> ${sentCount}\n` +
        `❌ <b>Failed:</b> ${failedCount}\n` +
        `📈 <b>Success Rate:</b> ${successRate}%\n\n` +
        `⏱️ <b>Completed at:</b> ${new Date().toLocaleString()}\n\n` +
        `${sentCount > 0 ? '🎉 Videos delivered to user!' : '⚠️ No videos were delivered.'}\n` +
        `${failedCount > 0 ? `\n🔄 ${failedCount} videos failed and saved for retry.` : ''}`;
      
      try {
        await bot.editMessageText(finalStatusText, {
          chat_id: adminChatId,
          message_id: statusMsg.message_id,
          parse_mode: 'HTML'
        });
      } catch (editError) {
        // If edit fails, send a new message
        await bot.sendMessage(adminChatId, finalStatusText, { parse_mode: 'HTML' });
      }
    } else if (adminChatId && !statusMsg) {
      // Fallback if no status message was created
      const fallbackMsg = `📊 <b>Delivery Complete for @${username}:</b>\n✅ Sent: ${sentCount}\n❌ Failed: ${failedCount}\n📊 Success Rate: ${successRate}%`;
      await bot.sendMessage(adminChatId, fallbackMsg, { parse_mode: 'HTML' });
    }
    
    if (sentCount > 0) {
      await bot.sendMessage(buyerId, `🎉 You've received ${sentCount} new files from the '${packageType}' package! Enjoy!`);
    }

    // Log failed videos for retry later with enhanced categorization
    if (failedVideos.length > 0) {
      // Categorize the primary failure type
      const primaryFailure = failedVideos[0];
      const failureInfo = categorizeFailure(primaryFailure.error || 'Unknown error');
      
      await db.collection("failed_deliveries").insertOne({
        username,
        packageType,
        failedVideos,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        failureType: failureInfo.type,
        isPermanentFailure: failureInfo.isPermanent,
        autoRetryEnabled: !failureInfo.isPermanent,
        nextRetryAt: failureInfo.isPermanent ? null : calculateNextRetryTime(failureInfo.type, 0),
        retryHistory: [],
        adminNotified: false,
        createdBy: 'delivery_service'
      });
      
      console.log(`📝 Logged ${failedVideos.length} failed videos for auto-retry (failure type: ${failureInfo.type})`);
    }

    return { 
      success: sentCount > 0, 
      sentCount, 
      failedCount,
      totalRequested: count,
      successRate,
      batchesProcessed: batches.length,
      error: failedCount > 0 ? `${failedCount} videos failed to send` : null
    };
    
  } catch (error) {
    console.error("❌ Error in deliverVideosToUserWithRetry:", error);
    if (adminChatId) {
      await bot.sendMessage(adminChatId, `❌ Failed to send videos due to technical error: ${error.message}`);
    }
    return { 
      success: false, 
      error: error.message,
      sentCount: 0,
      failedCount: 0,
      successRate: 0
    };
  }
}

/**
 * Retries failed video deliveries for a specific user and package
 * @param {Object} bot - Telegram bot instance
 * @param {Object} db - MongoDB database instance
 * @param {string} username - Target username
 * @param {string} packageType - Package type
 * @param {string} adminChatId - Admin chat ID for notifications
 * @returns {Object} Retry result
 */
async function retryFailedDeliveries(bot, db, username, packageType, adminChatId) {
  try {
    // Find failed deliveries for this user and package
    const failedDelivery = await db.collection("failed_deliveries").findOne({
      username,
      packageType,
      retryCount: { $lt: 3 } // Max 3 retry attempts
    });

    if (!failedDelivery) {
      return {
        success: false,
        error: "No failed deliveries found or max retries exceeded"
      };
    }

    const { failedVideos } = failedDelivery;
    const telegramUser = await db.collection("users").findOne({ username });
    
    if (!telegramUser || !telegramUser.id) {
      return {
        success: false,
        error: "User not found or no Telegram ID"
      };
    }

    const buyerId = telegramUser.id;
    const sentVideoIds = new Set(telegramUser[`sent_${packageType}`] || []);
    let sentCount = 0;
    let stillFailedCount = 0;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    console.log(`🔄 Retrying ${failedVideos.length} failed videos for @${username}`);

    // ✅ Send initial retry status message
    let retryStatusMsg = null;
    if (adminChatId) {
      retryStatusMsg = await bot.sendMessage(adminChatId, 
        `🔄 <b>Video Retry Started</b>\n\n` +
        `👤 <b>User:</b> @${username}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Failed Videos to Retry:</b> ${failedVideos.length}\n\n` +
        `🔄 <b>Progress:</b> 0/${failedVideos.length} (0%)\n` +
        `✅ <b>Retry Success:</b> 0\n` +
        `❌ <b>Still Failed:</b> 0\n` +
        `📈 <b>Retry Success Rate:</b> 0%`,
        { parse_mode: 'HTML' }
      );
    }

    for (let i = 0; i < failedVideos.length; i++) {
      const failedVideo = failedVideos[i];
      try {
        await bot.sendVideo(buyerId, failedVideo.fileId);
        sentVideoIds.add(failedVideo.fileId);
        sentCount++;
        console.log(`✅ Retry successful for video ${sentCount}/${failedVideos.length}`);
        
        // ✅ Update retry progress every 3 videos or at completion
        if (sentCount % 3 === 0 || (sentCount + stillFailedCount) === failedVideos.length) {
          const totalProcessed = sentCount + stillFailedCount;
          const progress = Math.round((totalProcessed / failedVideos.length) * 100);
          const retrySuccessRate = totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 0;
          
          const retryProgressText = 
            `🔄 <b>Video Retry in Progress</b>\n\n` +
            `👤 <b>User:</b> @${username}\n` +
            `📦 <b>Package:</b> ${packageType}\n` +
            `🎬 <b>Failed Videos to Retry:</b> ${failedVideos.length}\n\n` +
            `🔄 <b>Progress:</b> ${totalProcessed}/${failedVideos.length} (${progress}%)\n` +
            `✅ <b>Retry Success:</b> ${sentCount}\n` +
            `❌ <b>Still Failed:</b> ${stillFailedCount}\n` +
            `📈 <b>Retry Success Rate:</b> ${retrySuccessRate}%\n\n` +
            `⏱️ <b>Status:</b> ${totalProcessed === failedVideos.length ? 'Completing retry...' : 'Retrying failed videos...'}`;
          
          if (retryStatusMsg && adminChatId) {
            try {
              await bot.editMessageText(retryProgressText, {
                chat_id: adminChatId,
                message_id: retryStatusMsg.message_id,
                parse_mode: 'HTML'
              });
            } catch (editError) {
              // Ignore edit errors
            }
          }
        }
        
        await delay(1000); // 1 second delay between videos
      } catch (err) {
        stillFailedCount++;
        console.error(`❌ Retry failed for video:`, err.message);
        
        // Update progress for failed retries too
        if (stillFailedCount % 2 === 0 && retryStatusMsg && adminChatId) {
          const totalProcessed = sentCount + stillFailedCount;
          const progress = Math.round((totalProcessed / failedVideos.length) * 100);
          const retrySuccessRate = totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 0;
          
          const retryProgressText = 
            `🔄 <b>Video Retry in Progress</b>\n\n` +
            `👤 <b>User:</b> @${username}\n` +
            `📦 <b>Package:</b> ${packageType}\n` +
            `🎬 <b>Failed Videos to Retry:</b> ${failedVideos.length}\n\n` +
            `🔄 <b>Progress:</b> ${totalProcessed}/${failedVideos.length} (${progress}%)\n` +
            `✅ <b>Retry Success:</b> ${sentCount}\n` +
            `❌ <b>Still Failed:</b> ${stillFailedCount}\n` +
            `📈 <b>Retry Success Rate:</b> ${retrySuccessRate}%\n\n` +
            `⚠️ <b>Status:</b> Some retries still failing...`;
          
          try {
            await bot.editMessageText(retryProgressText, {
              chat_id: adminChatId,
              message_id: retryStatusMsg.message_id,
              parse_mode: 'HTML'
            });
          } catch (editError) {
            // Ignore edit errors
          }
        }
      }
    }

    // Update sent videos tracking
    await db.collection("users").updateOne(
      { username },
      { $set: { [`sent_${packageType}`]: Array.from(sentVideoIds) } }
    );

    // Update or remove failed delivery record
    if (stillFailedCount === 0) {
      // All videos sent successfully, remove the failed delivery record
      await db.collection("failed_deliveries").deleteOne({ _id: failedDelivery._id });
    } else {
      // Some videos still failed, update retry count
      await db.collection("failed_deliveries").updateOne(
        { _id: failedDelivery._id },
        { 
          $inc: { retryCount: 1 },
          $set: { lastRetryAt: new Date().toISOString() }
        }
      );
    }

    const successRate = Math.round((sentCount / failedVideos.length) * 100);

    // ✅ Send final retry completion status
    if (adminChatId && retryStatusMsg) {
      const finalRetryText = 
        `✅ <b>Video Retry Complete!</b>\n\n` +
        `👤 <b>User:</b> @${username}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Videos Retried:</b> ${failedVideos.length}\n\n` +
        `📊 <b>Final Retry Results:</b>\n` +
        `✅ <b>Successfully Sent:</b> ${sentCount}\n` +
        `❌ <b>Still Failed:</b> ${stillFailedCount}\n` +
        `📈 <b>Retry Success Rate:</b> ${successRate}%\n\n` +
        `⏱️ <b>Completed at:</b> ${new Date().toLocaleString()}\n\n` +
        `${sentCount > 0 ? '🎉 Retry delivered additional videos!' : '⚠️ No additional videos were delivered.'}\n` +
        `${stillFailedCount > 0 ? `\n🔄 ${stillFailedCount} videos still failed after retry.` : ''}`;
      
      try {
        await bot.editMessageText(finalRetryText, {
          chat_id: adminChatId,
          message_id: retryStatusMsg.message_id,
          parse_mode: 'HTML'
        });
      } catch (editError) {
        // If edit fails, send a new message
        await bot.sendMessage(adminChatId, finalRetryText, { parse_mode: 'HTML' });
      }
    }

    if (sentCount > 0) {
      await bot.sendMessage(buyerId, `🎉 Retry successful! You've received ${sentCount} additional files from the '${packageType}' package!`);
    }

    return {
      success: sentCount > 0,
      sentCount,
      failedCount: stillFailedCount,
      successRate,
      totalRetried: failedVideos.length
    };

  } catch (error) {
    console.error("❌ Error in retryFailedDeliveries:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  deliverVideosToUserWithRetry,
  retryFailedDeliveries
};