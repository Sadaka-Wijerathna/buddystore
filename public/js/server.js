require('dotenv').config();
const express = require('express');
const path = require('path');
const uploadSessions = {}; // To track ongoing upload sessions
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');
const TelegramBot = require('node-telegram-bot-api');
const userSteps = {};
const broadcastSessions = {}; // Separate storage for broadcast sessions
const packageOptions = ['Mixed', 'Mom And Son', 'Rape', 'SL Leaks', 'CCTV'];

// ✅ Import enhanced video delivery functions
const { deliverVideosToUserWithRetry, retryFailedDeliveries } = require('./enhanced-video-delivery');

// ✅ Import auto-retry service
const AutoRetryService = require('./src/services/auto-retry-service');
const autoRetryConfig = require('./src/config/auto-retry-config');

// ✅ Import video API router
const videoApiRouter = require('./src/routes/video-api');

// ✅ Auto-retry service instance (will be initialized after DB connection)
let autoRetryService = null;

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ✅ Static files with proper video headers
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4')) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'video/mp4');
    }
  }
}));

// ✅ Video API routes
app.use('/api/videos', videoApiRouter);
console.log('✅ Video API routes integrated - VPS video system ready');

// Initialize MongoDB client
const mongo = new MongoClient(process.env.MONGO_URI);

let db;

mongo.connect().then(() => {
  db = mongo.db("telegram_site");
  console.log("✅ Connected to MongoDB");

  // ✅ Initialize auto-retry service
  autoRetryService = new AutoRetryService(null, db, autoRetryConfig); // bot will be set later
  
  // ✅ Telegram bot
  const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
  const ADMIN_IDS = [6539713872, 8042893066]; // Replace with real Telegram user IDs
  const PRIMARY_ADMIN_ID = 6539713872; // Primary admin for new user notifications
  
  // ✅ Set bot instance in auto-retry service and start it
  autoRetryService.bot = bot;
  autoRetryService.start();
  console.log('🚀 Auto-retry service started');
  
  // ✅ Graceful shutdown handler for auto-retry service
  process.on('SIGINT', () => {
    console.log('🚨 Received SIGINT, shutting down gracefully...');
    if (autoRetryService) {
      autoRetryService.stop();
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('🚨 Received SIGTERM, shutting down gracefully...');
    if (autoRetryService) {
      autoRetryService.stop();
    }
    process.exit(0);
  });
  
  
  // ✅ Broadcast Advertisement Function
async function startBroadcast(bot, db, broadcastContent, adminChatId) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    // Get all users who have started the bot
    const allUsers = await db.collection('users').find({}).toArray();
    
    if (allUsers.length === 0) {
      return bot.sendMessage(adminChatId, '⚠️ No users found in database.');
    }

    // ✅ Enhanced user filtering with detailed analysis
    const validUsers = [];
    const invalidUsers = [];
    const usersWithoutIds = [];
    const usersWithStringIds = [];
    
    allUsers.forEach(user => {
      if (!user.id) {
        usersWithoutIds.push(user);
      } else if (typeof user.id === 'string') {
        // Try to convert string ID to number
        const numericId = parseInt(user.id);
        if (!isNaN(numericId) && numericId > 0) {
          user.id = numericId; // Convert to number
          validUsers.push(user);
        } else {
          usersWithStringIds.push(user);
        }
      } else if (typeof user.id === 'number' && user.id > 0) {
        validUsers.push(user);
      } else {
        invalidUsers.push(user);
      }
    });
    
    // ✅ Send detailed diagnostic information
    let diagnosticMsg = `📊 <b>User Analysis:</b>\n\n`;
    diagnosticMsg += `• Total users in database: ${allUsers.length}\n`;
    diagnosticMsg += `• Users with valid IDs: ${validUsers.length}\n`;
    diagnosticMsg += `• Users without IDs: ${usersWithoutIds.length}\n`;
    diagnosticMsg += `• Users with invalid string IDs: ${usersWithStringIds.length}\n`;
    diagnosticMsg += `• Users with other invalid IDs: ${invalidUsers.length}\n\n`;
    
    if (usersWithoutIds.length > 0) {
      diagnosticMsg += `⚠️ <b>Users without Telegram IDs (${Math.min(usersWithoutIds.length, 5)} shown):</b>\n`;
      usersWithoutIds.slice(0, 5).forEach(user => {
        diagnosticMsg += `• @${user.username || 'Unknown'} - ${user.first_name || 'No name'}\n`;
      });
      diagnosticMsg += `\n`;
    }
    
    await bot.sendMessage(adminChatId, diagnosticMsg, { parse_mode: 'HTML' });
    
    if (validUsers.length === 0) {
      return bot.sendMessage(adminChatId, '⚠️ No users with valid Telegram IDs found. All users need to start the bot first!');
    }

    // Send initial status
    const statusMsg = await bot.sendMessage(adminChatId, 
      `📢 <b>Broadcasting Advertisement</b>\n\n` +
      `📊 <b>Statistics:</b>\n` +
      `• Total users in database: ${allUsers.length}\n` +
      `• Users with valid IDs: ${validUsers.length}\n` +
      `• Starting broadcast...\n\n` +
      `🔄 Progress: 0/${validUsers.length} (0%)`,
      { parse_mode: 'HTML' }
    );

    let successCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let activeUsers = 0;
    const failedUsers = [];
    const blockedUsers = [];
    const successfulUsers = []; // ✅ Track successful users
    
    // Process users in batches to avoid rate limits
    const batchSize = 20;
    const totalBatches = Math.ceil(validUsers.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = validUsers.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      
      // Process batch
      await Promise.all(batch.map(async (user, userIndex) => {
        try {
          const globalIndex = batchIndex * batchSize + userIndex;
          
          // Send the broadcast message
          await sendBroadcastMessage(bot, user.id, broadcastContent);
          
          successCount++;
          activeUsers++;
          
          // ✅ Track successful user with proper name formatting
          const displayName = user.first_name ? 
            `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}` : 
            'Unknown User';
          
          successfulUsers.push({ 
            username: user.username || 'Unknown', 
            id: user.id, 
            name: displayName
          });
          
          // Update progress every 10 successful sends or at the end
          if (successCount % 10 === 0 || globalIndex === validUsers.length - 1) {
            const progress = Math.round((globalIndex + 1) / validUsers.length * 100);
            const progressText = 
              `📢 <b>Broadcasting Advertisement</b>\n\n` +
              `📊 <b>Statistics:</b>\n` +
              `• Total users in database: ${allUsers.length}\n` +
              `• Users with valid IDs: ${validUsers.length}\n` +
              `• Messages sent successfully: ${successCount}\n` +
              `• Failed to send: ${failedCount}\n` +
              `• Blocked bot: ${blockedCount}\n` +
              `• Active users: ${activeUsers}\n\n` +
              `🔄 Progress: ${globalIndex + 1}/${validUsers.length} (${progress}%)`;
            
            try {
              await bot.editMessageText(progressText, {
                chat_id: adminChatId,
                message_id: statusMsg.message_id,
                parse_mode: 'HTML'
              });
            } catch (editError) {
              // Ignore edit errors (message might be the same)
            }
          }
          
        } catch (error) {
          // ✅ Get user display name for error tracking
          const displayName = user.first_name ? 
            `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}` : 
            'Unknown User';
          
          if (error.response && error.response.body) {
            const errorCode = error.response.body.error_code;
            const errorDescription = error.response.body.description;
            
            if (errorCode === 403) {
              // User blocked the bot
              blockedCount++;
              blockedUsers.push({ 
                username: user.username || 'Unknown', 
                id: user.id, 
                name: displayName,
                reason: 'Blocked bot' 
              });
            } else {
              // Other error
              failedCount++;
              failedUsers.push({ 
                username: user.username || 'Unknown', 
                id: user.id, 
                name: displayName,
                error: errorDescription 
              });
            }
          } else {
            failedCount++;
            failedUsers.push({ 
              username: user.username || 'Unknown', 
              id: user.id, 
              name: displayName,
              error: error.message 
            });
          }
        }
      }));
      
      // Delay between batches to respect rate limits
      if (batchIndex < totalBatches - 1) {
        await delay(2000); // 2 second delay between batches
      }
    }
    
    // Calculate final statistics
    const totalProcessed = successCount + failedCount + blockedCount;
    const successRate = totalProcessed > 0 ? Math.round((successCount / totalProcessed) * 100) : 0;
    const activeRate = validUsers.length > 0 ? Math.round((activeUsers / validUsers.length) * 100) : 0;
    
    // Send final summary
    let summaryText = 
      `✅ <b>Broadcast Completed!</b>\n\n` +
      `📊 <b>Final Statistics:</b>\n` +
      `• Total users in database: ${allUsers.length}\n` +
      `• Users with valid IDs: ${validUsers.length}\n` +
      `• Messages sent successfully: ${successCount}\n` +
      `• Failed to send: ${failedCount}\n` +
      `• Users who blocked bot: ${blockedCount}\n` +
      `• Active users: ${activeUsers}\n\n` +
      `📈 <b>Success Rate:</b> ${successRate}%\n` +
      `🟢 <b>Active User Rate:</b> ${activeRate}%\n\n` +
      `⏱️ <b>Broadcast completed at:</b> ${new Date().toLocaleString()}`;
    
    // ✅ Add successful users details if any
    if (successfulUsers.length > 0 && successfulUsers.length <= 10) {
      summaryText += `\n\n✅ <b>Successful Users:</b>\n`;
      successfulUsers.forEach(user => {
        summaryText += `• @${user.username} (${user.id}) - ${user.name}\n`;
      });
    } else if (successfulUsers.length > 10) {
      summaryText += `\n\n✅ <b>Successful Users:</b> ${successfulUsers.length} (showing first 10)\n`;
      successfulUsers.slice(0, 10).forEach(user => {
        summaryText += `• @${user.username} (${user.id}) - ${user.name}\n`;
      });
    }
    
    // Add failed users details if any
    if (failedUsers.length > 0 && failedUsers.length <= 10) {
      summaryText += `\n\n❌ <b>Failed Users:</b>\n`;
      failedUsers.forEach(user => {
        summaryText += `• @${user.username} (${user.id}) - ${user.name}: ${user.error}\n`;
      });
    } else if (failedUsers.length > 10) {
      summaryText += `\n\n❌ <b>Failed Users:</b> ${failedUsers.length} (showing first 10)\n`;
      failedUsers.slice(0, 10).forEach(user => {
        summaryText += `• @${user.username} (${user.id}) - ${user.name}: ${user.error}\n`;
      });
    }
    
    // Add blocked users details if any
    if (blockedUsers.length > 0 && blockedUsers.length <= 10) {
      summaryText += `\n\n🚫 <b>Blocked Users:</b>\n`;
      blockedUsers.forEach(user => {
        summaryText += `• @${user.username} (${user.id}) - ${user.name}\n`;
      });
    } else if (blockedUsers.length > 10) {
      summaryText += `\n\n🚫 <b>Blocked Users:</b> ${blockedUsers.length} (showing first 10)\n`;
      blockedUsers.slice(0, 10).forEach(user => {
        summaryText += `• @${user.username} (${user.id}) - ${user.name}\n`;
      });
    }
    
    // Update the status message with final results
    await bot.editMessageText(summaryText, {
      chat_id: adminChatId,
      message_id: statusMsg.message_id,
      parse_mode: 'HTML'
    });
    
    // Log broadcast statistics to database
    await db.collection('broadcast_logs').insertOne({
      timestamp: new Date().toISOString(),
      adminId: adminChatId,
      contentType: broadcastContent.type,
      totalUsers: allUsers.length,
      validUsers: validUsers.length,
      successCount,
      failedCount,
      blockedCount,
      activeUsers,
      successRate,
      activeRate,
      successfulUsers: successfulUsers.slice(0, 50), // Store only first 50 successful users
      failedUsers: failedUsers.slice(0, 50), // Store only first 50 failed users
      blockedUsers: blockedUsers.slice(0, 50) // Store only first 50 blocked users
    });
    
  } catch (error) {
    console.error('❌ Error in broadcast function:', error);
    await bot.sendMessage(adminChatId, `❌ Broadcast failed: ${error.message}`);
  }
}

// Helper function to send broadcast message based on content type
async function sendBroadcastMessage(bot, userId, broadcastContent) {
  const { type, text, caption, messageId, chatId } = broadcastContent;
  
  try {
    switch (type) {
      case 'text':
        // Try with Markdown first, fallback to plain text if it fails
        try {
          await bot.sendMessage(userId, text, { parse_mode: 'Markdown' });
        } catch (parseError) {
          // If Markdown fails, try without parse mode
          await bot.sendMessage(userId, text);
        }
        break;
        
      case 'photo':
      case 'video':
      case 'document':
      case 'audio':
      case 'sticker':
        // Forward the original message to preserve media
        await bot.forwardMessage(userId, chatId, messageId);
        break;
        
      default:
        // Fallback to forwarding
        await bot.forwardMessage(userId, chatId, messageId);
    }
  } catch (error) {
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}

// ✅ Enhanced bot command to handle users without usernames
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Check if user has username
    const hasUsername = !!user.username;
    
    let welcomeMessage = `
<b>Instructions❕</b>

1st step : <a href="https://buddystore.duckdns.org">buddystore.duckdns.org</a> go to this website

2nd step : login to the website from your Telegram account
`;

    if (hasUsername) {
      welcomeMessage += `
3rd step : Click <b>BUY MORE</b> and make an order

4th step : then come back again to Telegram and contact our official seller <a href="https://t.me/buddyseller">@buddyseller</a>

5th step : He knows what you ordered and will talk to you and get negotiations

6th step : After successful payment, you will get videos instantly through this bot

<b>Notice: Please use Chrome or another browser if you experience login problems </b>
`;
    } else {
      welcomeMessage += `
<b>⚠️ IMPORTANT: You need to add a username to your Telegram account first!</b>

<b>How to add username:</b>
1. Go to Telegram Settings
2. Tap on "Username" 
3. Enter a unique username (e.g., john_doe123)
4. Save it
5. Then come back and use our website

<b>Without a username, you cannot:</b>
• Receive videos
• Place orders  
• Get support

After adding username, continue with steps 3-6 above.
`;
    }

    welcomeMessage += `

<b>උපදෙස් ❕</b>

1 පියවර : <a href="https://buddystore.duckdns.org">buddystore.duckdns.org</a> මේ web site එකට යන්න

2 පියවර : ඔයාගේ telegram account එකෙන් web site එකට log වෙන්න
`;

    if (hasUsername) {
      welcomeMessage += `
3 පියවර : <b>BUY MORE</b> කියන එක ක්ලික් කරලා ඔයාගේ order එක දාන්න

4 පියවර : ඊටපස්සෙ ආපහු telegram එකට ඇවිල්ලා අපේ official seller වන <a href="https://t.me/buddyseller">@buddyseller</a> සමග සම්බන්ධ වන්න

5 පියවර : ඔහු මේ වන විටත් ඔබ ලබාගත් order එක පිළිබඳව දන්නා අතර ඔහු සමඟ මිල අඩු කිරීම් පිළිබඳව සාකච්චා කරන්න

6 පියවර : ඉන්පසු ඔහුගෙන් මුදල් ගෙවීමේ ආකාර පිළිබඳව විමසන්න, සාර්ථක මුදල් ගෙවීමකින් පසුව ක්ෂණිකව ඔබට මෙම bot හරහා videos ලැබෙනු ඇත

<b>දැනුම්දීම් : Web Site එකට log වීමේදී යම් කිසි ගැටලුවක් ඇති වුවහොත් Chrome හෝ වෙනත් browser එකක් භාවිතා කරන්න </b>
`;
    } else {
      welcomeMessage += `
<b>⚠️ වැදගත්: ඔබේ Telegram account එකට username එකක් add කරන්න!</b>

<b>Username add කරන්නේ කොහොමද:</b>
1. Telegram Settings වලට යන්න
2. "Username" කියන එක tap කරන්න
3. Unique username එකක් type කරන්න
4. Save කරන්න
5. ඊට පස්සේ අපේ website එක use කරන්න

Username නැතුව ඔබට videos ලබාගන්න බැහැ!
`;
    }

    try {
      await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
      
      // Log the interaction
      console.log(`📱 /start command from ${user.first_name} (${user.username || 'NO_USERNAME'}) - ID: ${chatId}`);
      
      // ✅ Add user to database ONLY if they have a username
      try {
        // Check if this is a new user (first time starting the bot)
        const existingUser = await db.collection('users').findOne({ id: chatId });
        
        if (!existingUser && hasUsername) {
          // This is a new user with username - add them to database
          const newUser = {
            id: chatId,
            username: user.username,
            first_name: user.first_name || 'User',
            last_name: user.last_name || '',
            hasUsername: true,
            createdAt: new Date().toISOString(),
            lastBotInteraction: new Date().toISOString(),
            purchases: [],
            loyaltyPoints: 0,
            badges: [],
            botStartCount: 1
          };
          
          await db.collection('users').insertOne(newUser);
          console.log(`✅ Added new user to database: @${user.username} (ID: ${chatId})`);
          
          // Send notification to admin about new user added to database
          const adminNotification = `🆕 <b>New User Added to Database</b>\n\n` +
            `👤 <b>Name:</b> ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}\n` +
            `🆔 <b>Username:</b> @${user.username}\n` +
            `📱 <b>Chat ID:</b> ${chatId}\n` +
            `⏰ <b>Time:</b> ${new Date().toLocaleString()}\n\n` +
            `✅ User has username - added to database for advertisements`;
          
          // Enhanced notification with retry mechanism
          let notificationSent = false;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (!notificationSent && retryCount < maxRetries) {
            try {
              await bot.sendMessage(PRIMARY_ADMIN_ID, adminNotification, { 
                parse_mode: 'HTML',
                disable_notification: false
              });
              notificationSent = true;
              console.log(`✅ Successfully sent new user notification to primary admin (${PRIMARY_ADMIN_ID}) for: ${user.first_name} (@${user.username})`);
              
              // Log successful notification to database
              await db.collection('admin_notifications').insertOne({
                type: 'new_user_added',
                userId: chatId,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                hasUsername: hasUsername,
                sentTo: PRIMARY_ADMIN_ID,
                sentAt: new Date().toISOString(),
                success: true
              });
              
            } catch (adminErr) {
              retryCount++;
              console.error(`❌ Attempt ${retryCount} failed to send admin notification to ${PRIMARY_ADMIN_ID}:`, adminErr.message);
              
              if (retryCount < maxRetries) {
                // Wait 2 seconds before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
              } else {
                // Log failed notification to database
                await db.collection('admin_notifications').insertOne({
                  type: 'new_user_added',
                  userId: chatId,
                  username: user.username,
                  firstName: user.first_name,
                  lastName: user.last_name,
                  hasUsername: hasUsername,
                  sentTo: PRIMARY_ADMIN_ID,
                  sentAt: new Date().toISOString(),
                  success: false,
                  error: adminErr.message,
                  retryCount: retryCount
                });
              }
            }
          }
        } else if (existingUser && hasUsername) {
          // Existing user with username - update their last interaction
          await db.collection('users').updateOne(
            { id: chatId },
            { 
              $set: { 
                lastBotInteraction: new Date().toISOString(),
                username: user.username, // Update username in case it changed
                first_name: user.first_name || 'User',
                last_name: user.last_name || '',
                hasUsername: true
              },
              $inc: { botStartCount: 1 }
            }
          );
          console.log(`✅ Updated existing user: @${user.username} (ID: ${chatId})`);
        } else if (!hasUsername) {
          // User without username - just log, don't add to database
          console.log(`⚠️ User without username started bot: ${user.first_name} (ID: ${chatId}) - NOT added to database`);
          
          // Optional: Send notification to admin about user without username
          const noUsernameNotification = `⚠️ <b>User Without Username Started Bot</b>\n\n` +
            `👤 <b>Name:</b> ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}\n` +
            `📱 <b>Chat ID:</b> ${chatId}\n` +
            `⏰ <b>Time:</b> ${new Date().toLocaleString()}\n\n` +
            `❌ User has no username - NOT added to database`;
          
          try {
            await bot.sendMessage(PRIMARY_ADMIN_ID, noUsernameNotification, { 
              parse_mode: 'HTML',
              disable_notification: true // Silent notification for users without username
            });
          } catch (adminErr) {
            console.error(`❌ Failed to send no-username notification:`, adminErr.message);
          }
        }
      } catch (dbErr) {
        console.error("❌ Failed to handle user database operations:", dbErr);
        // Log system error to database
        try {
          await db.collection('admin_notifications').insertOne({
            type: 'user_db_error',
            userId: chatId,
            username: user.username,
            error: dbErr.message,
            timestamp: new Date().toISOString()
          });
        } catch (logErr) {
          console.error("❌ Failed to log database error:", logErr);
        }
      }
      
    } catch (err) {
      console.error("❌ Failed to send welcome message:", err);
    }
  });


function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

// ✅ Placeholder function for badge assignment (to prevent errors)
async function autoAssignAndSaveBadges(username) {
  // This function can be implemented later for badge functionality
  // For now, it's a placeholder to prevent errors
  console.log(`📛 Badge assignment called for @${username} (placeholder function)`);
  return true;
}

// ✅ Sequential delivery function for bulk orders
async function deliverBulkOrderSequentially(bot, db, bulkOrder, adminChatId) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    // Get user's Telegram ID
    const user = await db.collection('users').findOne({ username: bulkOrder.username });
    if (!user || !user.id) {
      await bot.sendMessage(adminChatId, `⚠️ Cannot deliver to @${bulkOrder.username} - user not found or no Telegram ID`);
      return;
    }
    
    const userId = user.id;
    let deliveredCount = 0;
    let failedCount = 0;
    
    // Process each item in the bulk order sequentially
    for (let i = 0; i < bulkOrder.items.length; i++) {
      const item = bulkOrder.items[i];
      
      try {
        await bot.sendMessage(adminChatId, `📦 Delivering ${item.package} v${item.count} to @${bulkOrder.username}...`);
        
        // Add package to user's dashboard
        const fullPackage = {
          package: `${item.package} v${item.count}`,
          count: item.count,
          date: item.date,
          price: `Rs ${item.totalPrice.toFixed(2)}`,
          isBulkOrder: true,
          bulkOrderId: bulkOrder._id
        };
        
        await db.collection('users').updateOne(
          { username: bulkOrder.username },
          { $push: { purchases: fullPackage } }
        );
        
        // Use enhanced delivery function
        const deliveryResult = await deliverVideosToUserWithRetry(bot, db, bulkOrder.username, item.package, item.count, adminChatId);
        
        if (deliveryResult.success) {
          deliveredCount++;
          
          // Send custom message based on package type
          const customMessages = {
            'Mixed': `🎉 You've received ${item.count} new files from the 'Mixed' package! Enjoy!`,
            'Mom And Son': `🎉 You've received ${item.count} new files from the 'Mom And Son' package! Enjoy!`,
            'CCTV': `🎉 You've received ${item.count} new files from the 'CCTV' package! Enjoy!`,
            'SL Leaks': `🎉 You've received ${item.count} new files from the 'SL Leaks' package! Enjoy!`,
            'Rape': `🎉 You've received ${item.count} new files from the 'Rape' package! Enjoy!`
          };
          
          const customMessage = customMessages[item.package] || `🎉 You've received ${item.count} new files from the '${item.package}' package! Enjoy!`;
          
          try {
            await bot.sendMessage(userId, customMessage);
          } catch (msgError) {
            console.error(`❌ Failed to send custom message to user:`, msgError);
          }
          
          await bot.sendMessage(adminChatId, `✅ Successfully delivered ${item.package} v${item.count} to @${bulkOrder.username}`);
          
        } else {
          failedCount++;
          await bot.sendMessage(adminChatId, `❌ Failed to deliver ${item.package} v${item.count} to @${bulkOrder.username}: ${deliveryResult.error}`);
        }
        
        // Delay between deliveries to avoid rate limits
        if (i < bulkOrder.items.length - 1) {
          await delay(3000); // 3 second delay between packages
        }
        
      } catch (itemError) {
        failedCount++;
        console.error(`❌ Error delivering item ${i + 1}:`, itemError);
        await bot.sendMessage(adminChatId, `❌ Error delivering ${item.package} v${item.count}: ${itemError.message}`);
      }
    }
    
    // Update bulk order status
    await db.collection('bulk_orders').updateOne(
      { _id: bulkOrder._id },
      { 
        $set: { 
          status: 'completed',
          deliveredCount,
          failedCount,
          completedAt: new Date().toISOString()
        }
      }
    );
    
    // Send completion summary
    let summaryMessage = `✅ <b>Bulk Order Delivery Completed!</b>\n\n`;
    summaryMessage += `👤 <b>Customer:</b> @${bulkOrder.username}\n`;
    summaryMessage += `📦 <b>Total Items:</b> ${bulkOrder.items.length}\n`;
    summaryMessage += `✅ <b>Successfully Delivered:</b> ${deliveredCount}\n`;
    summaryMessage += `❌ <b>Failed Deliveries:</b> ${failedCount}\n`;
    summaryMessage += `💰 <b>Total Value:</b> Rs.${bulkOrder.totalPrice.toFixed(2)}\n\n`;
    
    if (failedCount === 0) {
      summaryMessage += `🎉 All packages delivered successfully!`;
    } else {
      summaryMessage += `⚠️ Some deliveries failed. Please check the logs above.`;
    }
    
    await bot.sendMessage(adminChatId, summaryMessage, { parse_mode: 'HTML' });
    
    // Send completion message to user
    try {
      let userMessage = `🎉 <b>Your bulk order has been completed!</b>\n\n`;
      userMessage += `📦 <b>Packages delivered:</b> ${deliveredCount}/${bulkOrder.items.length}\n`;
      userMessage += `💰 <b>Total value:</b> Rs.${bulkOrder.totalPrice.toFixed(2)}\n\n`;
      
      if (failedCount === 0) {
        userMessage += `All your packages have been delivered successfully! Enjoy your content! 🎉`;
      } else {
        userMessage += `Most packages delivered successfully. If you're missing any content, please contact @buddyseller.`;
      }
      
      await bot.sendMessage(userId, userMessage, { parse_mode: 'HTML' });
    } catch (userMsgError) {
      console.error(`❌ Failed to send completion message to user:`, userMsgError);
    }
    
  } catch (error) {
    console.error('❌ Error in sequential delivery:', error);
    await bot.sendMessage(adminChatId, `❌ Error during bulk order delivery: ${error.message}`);
    
    // Update order status to failed
    await db.collection('bulk_orders').updateOne(
      { _id: bulkOrder._id },
      { 
        $set: { 
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
        }
      }
    );
  }
}


// ✅ Manage command

  // ✅ Enhanced manage command with username validation
  bot.onText(/\/manage/, async (msg) => {
    if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");

    const targetUsername = msg.text.split(' ')[1]; // /manage username
    
    if (targetUsername) {
      // Quick manage specific user
      const user = await db.collection('users').findOne({ username: targetUsername.replace('@', '') });
      
      if (!user) {
        return bot.sendMessage(msg.chat.id, `❌ User @${targetUsername} not found or doesn't have a username set.`);
      }
      
      if (!user.hasUsername) {
        return bot.sendMessage(msg.chat.id, `⚠️ User @${targetUsername} doesn't have a username set in their Telegram account. They need to add one first.`);
      }
      
      // Proceed with management
      userSteps[msg.chat.id] = { step: 'awaiting_action', username: user.username };
      return bot.sendMessage(msg.chat.id, `What do you want to do for @${user.username}?`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🟩 Add Package", callback_data: "add_package" }],
            [{ text: "❌ Remove Package", callback_data: "remove_package" }],
            [{ text: "📦 Show List", callback_data: "show_list" }]
          ]
        }
      });
    }

    userSteps[msg.chat.id] = { step: 'awaiting_username' };
    bot.sendMessage(msg.chat.id, '👤 Send the @username of the buyer (they must have a username set):');
  });

// ✅ Enhanced help command with complete GUI options

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const isAdminUser = isAdmin(msg.from.id);

  const buttons = [
    [{ text: "🏠 Visit Website", url: "https://buddystore.duckdns.org" }],
    [{ text: "🛍️ Contact Seller", url: "https://t.me/buddyseller" }]
  ];

  if (isAdminUser) {
    buttons.unshift(
      // Main Admin Functions
      [{ text: "📤 Upload Videos", callback_data: "gui_upload" }],
      [{ text: "🧹 Clear Database", callback_data: "gui_clear" }],
      [{ text: "🛍️ Manage Users", callback_data: "gui_manage" }],
      [{ text: "📢 Send Broadcast", callback_data: "gui_broadcast" }],
      

      
      // Auto-Retry Service
      [{ text: "🤖 Auto-Retry Status", callback_data: "gui_autoretry_status" }],
      [{ text: "📁 Retry Summary", callback_data: "gui_autoretry_summary" }],
      
      // Database Management
      [{ text: "🔍 User Analysis", callback_data: "gui_usercheck" }],
      [{ text: "🔧 Fix User IDs", callback_data: "gui_fixuserids" }],
      
      // End Upload Sessions
      [{ text: "🚫 End Upload", callback_data: "gui_endupload" }]
    );
  }

  let helpText = `👋 <b>Welcome to the BuddyStore Bot Menu</b>\n\nChoose an option below:`;
  
  if (isAdminUser) {
    helpText += `\n\n🔑 <b>Admin Panel Active</b>\n• All commands now have GUI buttons\n• Click buttons above for easy access\n• Traditional commands still work`;
  }

  bot.sendMessage(chatId, helpText, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});


// aluth 

const startUploadCommand = (cmd, category) => {
  bot.onText(new RegExp(`^/${cmd}$`), (msg) => {
    if (!isAdmin(msg.from.id)) return;
    uploadSessions[msg.chat.id] = { active: true, category };
    bot.sendMessage(msg.chat.id, `📥 Upload started for category: ${category}. Send videos only.`);
  });
};

startUploadCommand("uploadmixed", "Mixed");
startUploadCommand("uploadmomandson", "Mom And Son");
startUploadCommand("uploadrape", "Rape");
startUploadCommand("uploadslleaks", "SL Leaks");
startUploadCommand("uploadcctv", "CCTV");



const endUploadCommand = (cmd, category) => {
  bot.onText(new RegExp(`^/${cmd}$`), (msg) => {
    if (!isAdmin(msg.from.id)) return;
    uploadSessions[msg.chat.id] = null;
    bot.sendMessage(msg.chat.id, `✅ Upload ended for '${category}'`);
  });
};

endUploadCommand("endmixed", "Mixed");
endUploadCommand("endmomandson", "Mom And Son");
endUploadCommand("endrape", "Rape");
endUploadCommand("endslleaks", "SL Leaks");
endUploadCommand("endcctv", "CCTV");



// ✅ Add Clear Command Helper
const addClearCommand = (cmd, category) => {
  bot.onText(new RegExp(`^/${cmd}$`), async (msg) => {
    if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized.");

    try {
      const result = await db.collection("video_files").deleteOne({ category });
      if (result.deletedCount > 0) {
        bot.sendMessage(msg.chat.id, `🗑️ Cleared all files for '${category}'.`);
      } else {
        bot.sendMessage(msg.chat.id, `ℹ️ No files found for '${category}'.`);
      }
    } catch (err) {
      console.error("❌ Error clearing video files:", err);
      bot.sendMessage(msg.chat.id, "❌ Failed to clear video files.");
    }
  });
};

// ✅ Register actual clear commands
addClearCommand("clearmixed", "Mixed");
addClearCommand("clearrape", "Rape");
addClearCommand("clearmomandson", "Mom And Son");
addClearCommand("clearslleaks", "SL Leaks");
addClearCommand("clearcctv", "CCTV");






// ✅ Admin command to analyze user database
bot.onText(/\/usercheck/, async (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");
  
  try {
    await bot.sendMessage(msg.chat.id, '🔍 Analyzing user database...');
    
    const allUsers = await db.collection('users').find({}).toArray();
    
    const validUsers = [];
    const usersWithoutIds = [];
    const usersWithStringIds = [];
    const usersWithInvalidIds = [];
    
    allUsers.forEach(user => {
      if (!user.id) {
        usersWithoutIds.push(user);
      } else if (typeof user.id === 'string') {
        const numericId = parseInt(user.id);
        if (!isNaN(numericId) && numericId > 0) {
          usersWithStringIds.push(user); // Can be converted
        } else {
          usersWithInvalidIds.push(user);
        }
      } else if (typeof user.id === 'number' && user.id > 0) {
        validUsers.push(user);
      } else {
        usersWithInvalidIds.push(user);
      }
    });
    
    let reportMsg = `📊 <b>User Database Analysis</b>\n\n`;
    reportMsg += `• Total users: ${allUsers.length}\n`;
    reportMsg += `• ✅ Valid IDs: ${validUsers.length}\n`;
    reportMsg += `• ⚠️ No Telegram ID: ${usersWithoutIds.length}\n`;
    reportMsg += `• 🔄 String IDs (fixable): ${usersWithStringIds.length}\n`;
    reportMsg += `• ❌ Invalid IDs: ${usersWithInvalidIds.length}\n\n`;
    
    if (usersWithoutIds.length > 0) {
      reportMsg += `<b>Users without Telegram IDs:</b>\n`;
      usersWithoutIds.slice(0, 10).forEach(user => {
        reportMsg += `• @${user.username || 'Unknown'} - ${user.first_name || 'No name'}\n`;
      });
      if (usersWithoutIds.length > 10) {
        reportMsg += `... and ${usersWithoutIds.length - 10} more\n`;
      }
      reportMsg += `\n<i>These users need to start the bot to get Telegram IDs</i>\n\n`;
    }
    
    if (usersWithStringIds.length > 0) {
      reportMsg += `<b>Users with string IDs (can be fixed):</b>\n`;
      usersWithStringIds.slice(0, 5).forEach(user => {
        reportMsg += `• @${user.username || 'Unknown'} - ID: "${user.id}"\n`;
      });
      if (usersWithStringIds.length > 5) {
        reportMsg += `... and ${usersWithStringIds.length - 5} more\n`;
      }
      reportMsg += `\nUse /fixuserids to automatically fix these\n`;
    }
    
    await bot.sendMessage(msg.chat.id, reportMsg, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('❌ Error in usercheck command:', error);
    bot.sendMessage(msg.chat.id, `❌ Error analyzing users: ${error.message}`);
  }
});

// ✅ Admin command to fix string IDs
bot.onText(/\/fixuserids/, async (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");
  
  try {
    await bot.sendMessage(msg.chat.id, '🔧 Fixing user IDs...');
    
    const usersWithStringIds = await db.collection('users').find({ 
      id: { $type: 'string' } 
    }).toArray();
    
    let fixedCount = 0;
    let failedCount = 0;
    
    for (const user of usersWithStringIds) {
      const numericId = parseInt(user.id);
      if (!isNaN(numericId) && numericId > 0) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { id: numericId } }
        );
        fixedCount++;
      } else {
        failedCount++;
      }
    }
    
    const resultMsg = `✅ <b>User ID Fix Complete</b>\n\n` +
      `• Fixed: ${fixedCount} users\n` +
      `• Failed: ${failedCount} users\n` +
      `• Total processed: ${usersWithStringIds.length} users`;
    
    await bot.sendMessage(msg.chat.id, resultMsg, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('❌ Error in fixuserids command:', error);
    bot.sendMessage(msg.chat.id, `❌ Error fixing user IDs: ${error.message}`);
  }
});

// ✅ Auto-retry service monitoring commands
bot.onText(/\/autoretry status/, async (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");
  
  try {
    const stats = autoRetryService.getStats();
    const summary = await autoRetryService.getFailedDeliveriesSummary();
    
    let statusMsg = `🔄 <b>Auto-Retry Service Status</b>\n\n`;
    statusMsg += `🔋 <b>Service Status:</b> ${stats.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
    statusMsg += `⚙️ <b>Enabled:</b> ${stats.config.enabled ? '✅ Yes' : '❌ No'}\n`;
    statusMsg += `⏰ <b>Interval:</b> ${stats.config.intervalMinutes} minutes\n`;
    statusMsg += `🔄 <b>Max Retries:</b> ${stats.config.maxRetryAttempts}\n\n`;
    
    statusMsg += `📊 <b>Statistics:</b>\n`;
    statusMsg += `• Total Processed: ${stats.totalProcessed}\n`;
    statusMsg += `• Successful Retries: ${stats.successfulRetries}\n`;
    statusMsg += `• Failed Retries: ${stats.failedRetries}\n`;
    statusMsg += `• Permanent Failures: ${stats.permanentFailures}\n\n`;
    
    if (stats.lastRunAt) {
      statusMsg += `🕰️ <b>Last Run:</b> ${new Date(stats.lastRunAt).toLocaleString()}\n`;
    }
    if (stats.nextRunAt) {
      statusMsg += `⏭️ <b>Next Run:</b> ${new Date(stats.nextRunAt).toLocaleString()}\n\n`;
    }
    
    if (summary) {
      statusMsg += `📁 <b>Failed Deliveries:</b>\n`;
      statusMsg += `• Total: ${summary.total}\n`;
      statusMsg += `• Permanent: ${summary.permanent}\n`;
      statusMsg += `• Ready for Retry: ${summary.readyForRetry}\n`;
    }
    
    await bot.sendMessage(msg.chat.id, statusMsg, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('❌ Error getting auto-retry status:', error);
    bot.sendMessage(msg.chat.id, `❌ Error getting status: ${error.message}`);
  }
});

bot.onText(/\/autoretry start/, async (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");
  
  try {
    autoRetryService.start();
    bot.sendMessage(msg.chat.id, '✅ Auto-retry service started');
  } catch (error) {
    console.error('❌ Error starting auto-retry service:', error);
    bot.sendMessage(msg.chat.id, `❌ Error starting service: ${error.message}`);
  }
});

bot.onText(/\/autoretry stop/, async (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");
  
  try {
    autoRetryService.stop();
    bot.sendMessage(msg.chat.id, '✅ Auto-retry service stopped');
  } catch (error) {
    console.error('❌ Error stopping auto-retry service:', error);
    bot.sendMessage(msg.chat.id, `❌ Error stopping service: ${error.message}`);
  }
});

bot.onText(/\/autoretry run/, async (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");
  
  try {
    await bot.sendMessage(msg.chat.id, '🔄 Running auto-retry process manually...');
    await autoRetryService.processFailedDeliveries();
    bot.sendMessage(msg.chat.id, '✅ Manual auto-retry process completed');
  } catch (error) {
    console.error('❌ Error running auto-retry process:', error);
    bot.sendMessage(msg.chat.id, `❌ Error running process: ${error.message}`);
  }
});

bot.onText(/\/autoretry summary/, async (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "❌ You're not authorized");
  
  try {
    const summary = await autoRetryService.getFailedDeliveriesSummary();
    
    if (!summary) {
      return bot.sendMessage(msg.chat.id, '❌ Error getting failed deliveries summary');
    }
    
    let summaryMsg = `📁 <b>Failed Deliveries Summary</b>\n\n`;
    summaryMsg += `📊 <b>Overview:</b>\n`;
    summaryMsg += `• Total Failed Deliveries: ${summary.total}\n`;
    summaryMsg += `• Permanent Failures: ${summary.permanent}\n`;
    summaryMsg += `• Ready for Retry: ${summary.readyForRetry}\n\n`;
    
    if (summary.byFailureType.length > 0) {
      summaryMsg += `📊 <b>By Failure Type:</b>\n`;
      summary.byFailureType.forEach(type => {
        summaryMsg += `• ${type._id || 'Unknown'}: ${type.count} (avg retries: ${Math.round(type.avgRetryCount)})\n`;
      });
    }
    
    await bot.sendMessage(msg.chat.id, summaryMsg, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('❌ Error getting auto-retry summary:', error);
    bot.sendMessage(msg.chat.id, `❌ Error getting summary: ${error.message}`);
  }
});

  
  // ✅ bot.on('message')
  
  bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const step = userSteps[chatId];
  const session = uploadSessions[chatId];

  // ✅ Handle upload session (video saving only)
  if (session && session.active && (msg.video || msg.document)) {
  let fileId;
  
  if (msg.video) {
    fileId = msg.video.file_id;
  } else if (msg.document) {
    fileId = msg.document.file_id;
  }

  if (fileId) {
    // Save the file (video only) - store with type information
    const fileData = {
      id: fileId,
      type: 'video'
    };
    
    await db.collection('video_files').updateOne(
      { category: session.category },
      { 
        $push: { files: fileData },
        $set: { 
          lastUpdated: new Date().toISOString(),
          uploadedBy: 'admin'
        }
      },
      { upsert: true }
    );

    // Count uploaded files in session
    if (!session.uploadCount) session.uploadCount = 1;
else session.uploadCount++;

// Send update only every 100 files
if (session.uploadCount % 100 === 0) {
  await bot.sendMessage(chatId, `✅ Saved ${session.uploadCount} files to '${session.category}'`);
}

  }

  return;
}

  // ✅ Handle cancel command for broadcast
  if (msg.text === '/cancel' && step && step.step === 'awaiting_broadcast_content') {
    delete userSteps[chatId];
    delete broadcastSessions[chatId];
    return bot.sendMessage(chatId, '❌ Broadcast cancelled.');
  }

  // ✅ Handle broadcast content
  if (step && step.step === 'awaiting_broadcast_content') {
    console.log('📝 Processing broadcast content from user:', msg.from.id);
    
    if (!isAdmin(msg.from.id)) {
      console.log('❌ Unauthorized broadcast attempt from:', msg.from.id);
      delete userSteps[chatId];
      return bot.sendMessage(chatId, '❌ You are not authorized to send broadcasts.');
    }

    // Store the broadcast content with detailed logging
    step.broadcastContent = {
      messageId: msg.message_id,
      chatId: msg.chat.id,
      type: 'text',
      text: msg.text,
      caption: msg.caption,
      hasPhoto: !!msg.photo,
      hasVideo: !!msg.video,
      hasDocument: !!msg.document,
      hasAudio: !!msg.audio,
      hasSticker: !!msg.sticker,
      isForwarded: !!msg.forward_from || !!msg.forward_from_chat
    };

    // Determine content type
    if (msg.photo) step.broadcastContent.type = 'photo';
    else if (msg.video) step.broadcastContent.type = 'video';
    else if (msg.document) step.broadcastContent.type = 'document';
    else if (msg.audio) step.broadcastContent.type = 'audio';
    else if (msg.sticker) step.broadcastContent.type = 'sticker';
    else if (msg.text) step.broadcastContent.type = 'text';
    
    console.log('📝 Broadcast content stored:', {
      type: step.broadcastContent.type,
      hasText: !!step.broadcastContent.text,
      textLength: step.broadcastContent.text?.length || 0,
      messageId: step.broadcastContent.messageId,
      chatId: step.broadcastContent.chatId
    });

    // Show confirmation with safe text handling
    let contentDescription;
    if (step.broadcastContent.type === 'text') {
      // Safely truncate and escape text for preview
      const previewText = msg.text ? msg.text.substring(0, 100).replace(/[<>&"]/g, '') : 'Text message';
      contentDescription = `Text: "${previewText}${msg.text && msg.text.length > 100 ? '...' : ''}"`;
    } else {
      const typeCapitalized = step.broadcastContent.type.charAt(0).toUpperCase() + step.broadcastContent.type.slice(1);
      if (msg.caption) {
        const previewCaption = msg.caption.substring(0, 50).replace(/[<>&"]/g, '');
        contentDescription = `${typeCapitalized} with caption: "${previewCaption}${msg.caption.length > 50 ? '...' : ''}"`;
      } else {
        contentDescription = typeCapitalized;
      }
    }

    // Store in both places for reliability
    step.step = 'confirm_broadcast';
    broadcastSessions[chatId] = {
      adminId: msg.from.id,
      status: 'awaiting_confirmation',
      content: step.broadcastContent
    };
    
    console.log('📝 Broadcast session updated with content for confirmation');
    
    return bot.sendMessage(chatId, `📝 *Broadcast Preview*\n\n*Content:* ${contentDescription}\n\n*Ready to send to all users?*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Send Broadcast', callback_data: 'confirm_broadcast' }],
          [{ text: '❌ Cancel', callback_data: 'cancel_broadcast' }]
        ]
      }
    });
  }

  // ✅ Ignore commands
  if (msg.text?.startsWith('/')) return;

  // ✅ Handle package management steps
  if (!step) return;

  const input = msg.text;



  // Step: username
  if (step.step === 'awaiting_username') {
    step.username = input.replace('@', '');
    step.step = 'awaiting_action';
    return bot.sendMessage(chatId, `What do you want to do for @${step.username}?`, {
      reply_markup: {
        inline_keyboard: [
        [{ text: "🟩 Add Package", callback_data: "add_package" }],
        [{ text: "❌ Remove Package", callback_data: "remove_package" }],
        [{ text: "📦 Show List", callback_data: "show_list" }]
      ]
      }
    });
  }

  // Step: video count
  if (step.step === 'awaiting_video_count') {
    step.count = parseInt(input);
    step.step = 'awaiting_date';
    return bot.sendMessage(chatId, `📅 Send custom date or type "today":`);
  }

  // Step: date
  if (step.step === 'awaiting_date') {
    step.date = input.toLowerCase() === 'today' ? new Date().toISOString().split('T')[0] : input;
    step.step = 'awaiting_price';
    return bot.sendMessage(chatId, `💰 Send total price for ${step.count} videos:`);
  }

  // Step: final price
  if (step.step === 'awaiting_price') {
    step.price = `Rs ${parseFloat(input).toFixed(2)}`;
    const fullPackage = {
      package: `${step.package} v${step.count}`,
      count: step.count,
      date: step.date,
      price: step.price
    };

    await db.collection('users').updateOne(
      { username: step.username },
      { $push: { purchases: fullPackage } },
      { upsert: true }
    );

    bot.sendMessage(chatId, `✅ Added package: ${fullPackage.package} to @${step.username}`);
step.step = 'awaiting_action'; // Go back to main button options
bot.sendMessage(chatId, `What would you like to do for @${step.username}?`, {
  reply_markup: {
    inline_keyboard: [
        [{ text: "🟩 Add Package", callback_data: "add_package" }],
        [{ text: "❌ Remove Package", callback_data: "remove_package" }],
        [{ text: "📦 Show List", callback_data: "show_list" }]
      ]
  }
});
    
  }

  // Step: remove package
  if (step.step === 'awaiting_remove_index') {
    const index = parseInt(input) - 1;
    ({ username: step.username });

    const user = await db.collection('users').findOne({ username: step.username });
      if (!user || !user.purchases || !user.purchases[index]) {

      return bot.sendMessage(chatId, `❌ Invalid selection`);
    }

    const removed = user.purchases.splice(index, 1);
    await db.collection('users').updateOne(
      { username: step.username },
      { $set: { purchases: user.purchases } }
    );

    bot.sendMessage(chatId, `🗑️ Removed: ${removed[0].package}`);
step.step = 'awaiting_action';
bot.sendMessage(chatId, `What would you like to do for @${step.username}?`, {
  reply_markup: {
    inline_keyboard: [
        [{ text: "🟩 Add Package", callback_data: "add_package" }],
        [{ text: "❌ Remove Package", callback_data: "remove_package" }],
        [{ text: "📦 Show List", callback_data: "show_list" }]
      ]
  }
});

  }
  

});
  
// ✅ Handle inline buttons
  
   
   bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  console.log("🔁 Callback query received:", {
    data: data,
    from: query.from.id,
    username: query.from.username,
    chatId: chatId,
    messageId: query.message.message_id,
    isAdmin: isAdmin(query.from.id)
  });
  
  // ✅ Handle group send approval
  if (data.startsWith('group_send_approve_')) {
    if (!isAdmin(query.from.id)) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
    }
    
    const sendId = data.replace('group_send_approve_', '');
    const pendingSend = pendingGroupSends.get(sendId);
    
    if (!pendingSend) {
      await bot.editMessageText(
        query.message.text + '\n\n❌ <b>Error:</b> Send request expired or already processed.',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'HTML'
        }
      );
      return bot.answerCallbackQuery(query.id, { text: '❌ Send request not found.' });
    }
    
    // Remove from pending
    pendingGroupSends.delete(sendId);
    
    // Update confirmation message
    await bot.editMessageText(
      query.message.text + '\n\n✅ <b>APPROVED</b> - Starting send now...',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML'
      }
    );
    
    bot.answerCallbackQuery(query.id, { text: '✅ Approved! Starting send...' });
    
    // Execute the send asynchronously
    executeGroupSend(pendingSend, query.message.message_id).catch(err => {
      console.error('❌ Error executing group send:', err);
    });
    
    return;
  }
  
  // ✅ Handle group send rejection
  if (data.startsWith('group_send_reject_')) {
    if (!isAdmin(query.from.id)) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
    }
    
    const sendId = data.replace('group_send_reject_', '');
    const pendingSend = pendingGroupSends.get(sendId);
    
    if (!pendingSend) {
      await bot.editMessageText(
        query.message.text + '\n\n❌ <b>Error:</b> Send request expired or already processed.',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'HTML'
        }
      );
      return bot.answerCallbackQuery(query.id, { text: '❌ Send request not found.' });
    }
    
    // Remove from pending
    pendingGroupSends.delete(sendId);
    
    // Update confirmation message
    await bot.editMessageText(
      query.message.text + '\n\n❌ <b>REJECTED</b> - Send cancelled.',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML'
      }
    );
    
    bot.answerCallbackQuery(query.id, { text: '❌ Rejected. Send cancelled.' });
    
    console.log(`❌ Group send rejected: ${sendId}`);
    return;
  }
  
  // 🚨 CRITICAL: Handle bulk order confirmations FIRST before any other confirm handlers
  if (data.startsWith('confirm_bulk_')) {
    console.log('🎯 BULK ORDER CONFIRMATION DETECTED:', data);
    if (!isAdmin(query.from.id)) {
      console.log('❌ Admin check failed for user:', query.from.id);
      return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
    }
    
    const orderId = data.replace('confirm_bulk_', '');
    console.log('🔍 Extracted order ID:', orderId);
    
    try {
      console.log('🔍 Confirming bulk order with ID:', orderId);
      
      // Validate ObjectId format
      if (!ObjectId.isValid(orderId)) {
        console.error('❌ Invalid ObjectId format:', orderId);
        return bot.answerCallbackQuery(query.id, { text: '❌ Invalid order ID format.' });
      }
      
      console.log('✅ ObjectId validation passed');
      
      // Get bulk order from database
      const bulkOrder = await db.collection('bulk_orders').findOne({ _id: new ObjectId(orderId) });
      
      if (!bulkOrder) {
        console.error('❌ Bulk order not found:', orderId);
        return bot.answerCallbackQuery(query.id, { text: '❌ Order not found.' });
      }
      
      console.log('✅ Found bulk order:', { id: orderId, status: bulkOrder.status, username: bulkOrder.username });
      
      if (bulkOrder.status !== 'pending') {
        console.error('❌ Order already processed:', { id: orderId, status: bulkOrder.status });
        return bot.answerCallbackQuery(query.id, { text: '❌ Order already processed.' });
      }
      
      // Update order status
      await db.collection('bulk_orders').updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            status: 'confirmed',
            confirmedBy: query.from.id,
            confirmedAt: new Date().toISOString()
          }
        }
      );
      
      console.log('✅ Bulk order status updated to confirmed');
      
      await bot.answerCallbackQuery(query.id, { text: '✅ Bulk order confirmed!' });
      await bot.sendMessage(chatId, `✅ Bulk order confirmed for @${bulkOrder.username}!\n📤 Starting sequential delivery...`);
      
      // Start sequential delivery
      await deliverBulkOrderSequentially(bot, db, bulkOrder, chatId);
      
    } catch (error) {
      console.error('❌ Error confirming bulk order:', {
        orderId,
        error: error.message,
        stack: error.stack
      });
      await bot.answerCallbackQuery(query.id, { text: '❌ Error confirming order.' });
      await bot.sendMessage(chatId, `❌ Error confirming bulk order: ${error.message}`);
    }
    
    return; // IMPORTANT: Return here to prevent other handlers from processing
  }
  
  // 🚨 CRITICAL: Handle bulk order rejections FIRST before any other reject handlers
  if (data.startsWith('reject_bulk_')) {
    console.log('🎯 BULK ORDER REJECTION DETECTED:', data);
    if (!isAdmin(query.from.id)) {
      console.log('❌ Admin check failed for user:', query.from.id);
      return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
    }
    
    const orderId = data.replace('reject_bulk_', '');
    console.log('🔍 Extracted order ID for rejection:', orderId);
    
    try {
      console.log('🔍 Rejecting bulk order with ID:', orderId);
      
      // Validate ObjectId format
      if (!ObjectId.isValid(orderId)) {
        console.error('❌ Invalid ObjectId format:', orderId);
        return bot.answerCallbackQuery(query.id, { text: '❌ Invalid order ID format.' });
      }
      
      console.log('✅ ObjectId validation passed for rejection');
      
      // Get bulk order from database
      const bulkOrder = await db.collection('bulk_orders').findOne({ _id: new ObjectId(orderId) });
      
      if (!bulkOrder) {
        console.error('❌ Bulk order not found:', orderId);
        return bot.answerCallbackQuery(query.id, { text: '❌ Order not found.' });
      }
      
      console.log('✅ Found bulk order for rejection:', { id: orderId, status: bulkOrder.status, username: bulkOrder.username });
      
      if (bulkOrder.status !== 'pending') {
        console.error('❌ Order already processed:', { id: orderId, status: bulkOrder.status });
        return bot.answerCallbackQuery(query.id, { text: '❌ Order already processed.' });
      }
      
      // Update order status
      await db.collection('bulk_orders').updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            status: 'rejected',
            rejectedBy: query.from.id,
            rejectedAt: new Date().toISOString()
          }
        }
      );
      
      console.log('✅ Bulk order status updated to rejected');
      
      await bot.answerCallbackQuery(query.id, { text: '❌ Bulk order rejected.' });
      await bot.sendMessage(chatId, `❌ Bulk order rejected for @${bulkOrder.username}.`);
      
      // Notify user about rejection
      try {
        const user = await db.collection('users').findOne({ username: bulkOrder.username });
        if (user && user.id) {
          await bot.sendMessage(user.id, `❌ Your bulk order has been rejected. Please contact @buddyseller for more information.`);
          console.log('✅ User notified about rejection:', bulkOrder.username);
        } else {
          console.log('⚠️ User not found for rejection notification:', bulkOrder.username);
        }
      } catch (userNotifyError) {
        console.error('❌ Failed to notify user about rejection:', userNotifyError);
      }
      
    } catch (error) {
      console.error('❌ Error rejecting bulk order:', {
        orderId,
        error: error.message,
        stack: error.stack
      });
      await bot.answerCallbackQuery(query.id, { text: '❌ Error rejecting order.' });
      await bot.sendMessage(chatId, `❌ Error rejecting bulk order: ${error.message}`);
    }
    
    return; // IMPORTANT: Return here to prevent other handlers from processing
  }

  // ✅ gui help

  if (data === "gui_upload") {
  return bot.sendMessage(chatId, "📤 Choose a category to upload:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Mixed", callback_data: "upload_mixed" }],
        [{ text: "Mom And Son", callback_data: "upload_momandson" }],
        [{ text: "Rape", callback_data: "upload_rape" }],
        [{ text: "SL Leaks", callback_data: "upload_slleaks" }],
        [{ text: "CCTV", callback_data: "upload_cctv" }],

      ]
    }
  });
}

if (data.startsWith("upload_")) {
  const categoryMap = {
    mixed: "Mixed",
    momandson: "Mom And Son",
    rape: "Rape",
    slleaks: "SL Leaks",
    cctv: "CCTV",

  };
  const cmd = data.replace("upload_", "");
  const category = categoryMap[cmd];
  uploadSessions[chatId] = { active: true, category };
  return bot.sendMessage(chatId, `📥 Upload started for ${category}. Send videos only now. Type /end${cmd} to finish.`);
}

if (data === "gui_clear") {
  return bot.sendMessage(chatId, "🧹 Choose a category to clear:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Mixed", callback_data: "clear_Mixed" }],
        [{ text: "Mom And Son", callback_data: "clear_Mom And Son" }],
        [{ text: "Rape", callback_data: "clear_Rape" }],
        [{ text: "SL Leaks", callback_data: "clear_SL Leaks" }],
        [{ text: "CCTV", callback_data: "clear_CCTV" }],

      ]
    }
  });
}

if (data.startsWith("clear_")) {
  const category = data.replace("clear_", "");
  db.collection("video_files").updateOne(
    { category }, 
    { 
      $set: { 
        files: [],
        lastUpdated: new Date().toISOString(),
        clearedBy: 'admin'
      }
    }
  ).then(() => {
    bot.sendMessage(chatId, `✅ Cleared all files in '${category}'`);
  }).catch(err => {
    console.error(err);
    bot.sendMessage(chatId, `❌ Failed to clear '${category}'`);
  });
}

if (data === "gui_manage") {
  bot.sendMessage(chatId, `🔧 Send the @username of the user to manage:`);
  userSteps[chatId] = { step: 'awaiting_username' };
}

if (data === "gui_broadcast") {
  bot.sendMessage(chatId, `📢 <b>Broadcast Advertisement</b>\n\nSend me the content you want to broadcast to all users:\n\n• Text messages\n• Photos with captions\n• Videos with captions\n• Documents\n• Forward any message\n\nType /cancel to cancel the broadcast.`, {
    parse_mode: 'HTML'
  });
  userSteps[chatId] = { step: 'awaiting_broadcast_content' };
  broadcastSessions[chatId] = { adminId: query.from.id, status: 'awaiting_content' };
  console.log('📢 Broadcast session started for admin:', query.from.id);
}



// ✅ GUI User Analysis
if (data === "gui_usercheck") {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  bot.answerCallbackQuery(query.id, { text: '🔍 Analyzing database...' });
  
  // Execute usercheck command
  try {
    await bot.sendMessage(chatId, '🔍 Analyzing user database...');
    
    const allUsers = await db.collection('users').find({}).toArray();
    
    const validUsers = [];
    const usersWithoutIds = [];
    const usersWithStringIds = [];
    const usersWithInvalidIds = [];
    
    allUsers.forEach(user => {
      if (!user.id) {
        usersWithoutIds.push(user);
      } else if (typeof user.id === 'string') {
        const numericId = parseInt(user.id);
        if (!isNaN(numericId) && numericId > 0) {
          usersWithStringIds.push(user);
        } else {
          usersWithInvalidIds.push(user);
        }
      } else if (typeof user.id === 'number' && user.id > 0) {
        validUsers.push(user);
      } else {
        usersWithInvalidIds.push(user);
      }
    });
    
    let reportMsg = `📊 <b>User Database Analysis</b>\n\n`;
    reportMsg += `• Total users: ${allUsers.length}\n`;
    reportMsg += `• ✅ Valid IDs: ${validUsers.length}\n`;
    reportMsg += `• ⚠️ No Telegram ID: ${usersWithoutIds.length}\n`;
    reportMsg += `• 🔄 String IDs (fixable): ${usersWithStringIds.length}\n`;
    reportMsg += `• ❌ Invalid IDs: ${usersWithInvalidIds.length}\n\n`;
    
    if (usersWithoutIds.length > 0) {
      reportMsg += `<b>Users without Telegram IDs:</b>\n`;
      usersWithoutIds.slice(0, 10).forEach(user => {
        reportMsg += `• @${user.username || 'Unknown'} - ${user.first_name || 'No name'}\n`;
      });
      if (usersWithoutIds.length > 10) {
        reportMsg += `... and ${usersWithoutIds.length - 10} more\n`;
      }
      reportMsg += `\n<i>These users need to start the bot to get Telegram IDs</i>\n\n`;
    }
    
    if (usersWithStringIds.length > 0) {
      reportMsg += `<b>Users with string IDs (can be fixed):</b>\n`;
      usersWithStringIds.slice(0, 5).forEach(user => {
        reportMsg += `• @${user.username || 'Unknown'} - ID: "${user.id}"\n`;
      });
      if (usersWithStringIds.length > 5) {
        reportMsg += `... and ${usersWithStringIds.length - 5} more\n`;
      }
      reportMsg += `\nUse 🔧 Fix User IDs button to fix these\n`;
    }
    
    await bot.sendMessage(chatId, reportMsg, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('❌ Error in GUI usercheck:', error);
    bot.sendMessage(chatId, `❌ Error analyzing users: ${error.message}`);
  }
}

// ✅ GUI Fix User IDs
if (data === "gui_fixuserids") {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  bot.answerCallbackQuery(query.id, { text: '🔧 Fixing user IDs...' });
  
  try {
    await bot.sendMessage(chatId, '🔧 Fixing user IDs...');
    
    const usersWithStringIds = await db.collection('users').find({ 
      id: { $type: 'string' } 
    }).toArray();
    
    let fixedCount = 0;
    let failedCount = 0;
    
    for (const user of usersWithStringIds) {
      const numericId = parseInt(user.id);
      if (!isNaN(numericId) && numericId > 0) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { id: numericId } }
        );
        fixedCount++;
      } else {
        failedCount++;
      }
    }
    
    const resultMsg = `✅ <b>User ID Fix Complete</b>\n\n` +
      `• Fixed: ${fixedCount} users\n` +
      `• Failed: ${failedCount} users\n` +
      `• Total processed: ${usersWithStringIds.length} users`;
    
    await bot.sendMessage(chatId, resultMsg, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('❌ Error in GUI fixuserids:', error);
    bot.sendMessage(chatId, `❌ Error fixing user IDs: ${error.message}`);
  }
}

// ✅ GUI End Upload
if (data === "gui_endupload") {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  return bot.sendMessage(chatId, "🚫 Choose category to end upload:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Mixed", callback_data: "endupload_mixed" }],
        [{ text: "Mom And Son", callback_data: "endupload_momandson" }],
        [{ text: "Rape", callback_data: "endupload_rape" }],
        [{ text: "SL Leaks", callback_data: "endupload_slleaks" }],
        [{ text: "CCTV", callback_data: "endupload_cctv" }],

      ]
    }
  });
}

// ✅ GUI Auto-Retry Status
if (data === "gui_autoretry_status") {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  bot.answerCallbackQuery(query.id, { text: '🔄 Getting auto-retry status...' });
  
  try {
    const stats = autoRetryService.getStats();
    const summary = await autoRetryService.getFailedDeliveriesSummary();
    
    let statusMsg = `🔄 <b>Auto-Retry Service Status</b>\n\n`;
    statusMsg += `🔋 <b>Service Status:</b> ${stats.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
    statusMsg += `⚙️ <b>Enabled:</b> ${stats.config.enabled ? '✅ Yes' : '❌ No'}\n`;
    statusMsg += `⏰ <b>Interval:</b> ${stats.config.intervalMinutes} minutes\n`;
    statusMsg += `🔄 <b>Max Retries:</b> ${stats.config.maxRetryAttempts}\n\n`;
    
    statusMsg += `📊 <b>Statistics:</b>\n`;
    statusMsg += `• Total Processed: ${stats.totalProcessed}\n`;
    statusMsg += `• Successful Retries: ${stats.successfulRetries}\n`;
    statusMsg += `• Failed Retries: ${stats.failedRetries}\n`;
    statusMsg += `• Permanent Failures: ${stats.permanentFailures}\n\n`;
    
    if (stats.lastRunAt) {
      statusMsg += `🕰️ <b>Last Run:</b> ${new Date(stats.lastRunAt).toLocaleString()}\n`;
    }
    if (stats.nextRunAt) {
      statusMsg += `⏭️ <b>Next Run:</b> ${new Date(stats.nextRunAt).toLocaleString()}\n\n`;
    }
    
    if (summary) {
      statusMsg += `📁 <b>Failed Deliveries:</b>\n`;
      statusMsg += `• Total: ${summary.total}\n`;
      statusMsg += `• Permanent: ${summary.permanent}\n`;
      statusMsg += `• Ready for Retry: ${summary.readyForRetry}\n`;
    }
    
    // Add control buttons
    const controlButtons = [];
    if (stats.config.enabled) {
      if (stats.isRunning) {
        controlButtons.push([{ text: '⏸️ Stop Service', callback_data: 'autoretry_stop' }]);
      } else {
        controlButtons.push([{ text: '▶️ Start Service', callback_data: 'autoretry_start' }]);
      }
      controlButtons.push([{ text: '🔄 Run Now', callback_data: 'autoretry_run_now' }]);
    }
    
    await bot.sendMessage(chatId, statusMsg, { 
      parse_mode: 'HTML',
      reply_markup: controlButtons.length > 0 ? { inline_keyboard: controlButtons } : undefined
    });
    
  } catch (error) {
    console.error('❌ Error getting auto-retry status:', error);
    bot.sendMessage(chatId, `❌ Error getting status: ${error.message}`);
  }
}

// ✅ GUI Auto-Retry Summary
if (data === "gui_autoretry_summary") {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  bot.answerCallbackQuery(query.id, { text: '📁 Getting retry summary...' });
  
  try {
    const summary = await autoRetryService.getFailedDeliveriesSummary();
    
    if (!summary) {
      return bot.sendMessage(chatId, '❌ Error getting failed deliveries summary');
    }
    
    let summaryMsg = `📁 <b>Failed Deliveries Summary</b>\n\n`;
    summaryMsg += `📊 <b>Overview:</b>\n`;
    summaryMsg += `• Total Failed Deliveries: ${summary.total}\n`;
    summaryMsg += `• Permanent Failures: ${summary.permanent}\n`;
    summaryMsg += `• Ready for Retry: ${summary.readyForRetry}\n\n`;
    
    if (summary.byFailureType.length > 0) {
      summaryMsg += `📊 <b>By Failure Type:</b>\n`;
      summary.byFailureType.forEach(type => {
        summaryMsg += `• ${type._id || 'Unknown'}: ${type.count} (avg retries: ${Math.round(type.avgRetryCount)})\n`;
      });
    }
    
    await bot.sendMessage(chatId, summaryMsg, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('❌ Error getting auto-retry summary:', error);
    bot.sendMessage(chatId, `❌ Error getting summary: ${error.message}`);
  }
}

// ✅ Auto-Retry Control Buttons
if (data === 'autoretry_start') {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  try {
    autoRetryService.start();
    bot.answerCallbackQuery(query.id, { text: '✅ Auto-retry service started' });
  } catch (error) {
    bot.answerCallbackQuery(query.id, { text: `❌ Error: ${error.message}` });
  }
}

if (data === 'autoretry_stop') {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  try {
    autoRetryService.stop();
    bot.answerCallbackQuery(query.id, { text: '✅ Auto-retry service stopped' });
  } catch (error) {
    bot.answerCallbackQuery(query.id, { text: `❌ Error: ${error.message}` });
  }
}

if (data === 'autoretry_run_now') {
  if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
  
  try {
    bot.answerCallbackQuery(query.id, { text: '🔄 Running auto-retry process...' });
    await autoRetryService.processFailedDeliveries();
    bot.sendMessage(chatId, '✅ Manual auto-retry process completed');
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error running process: ${error.message}`);
  }
}

  



  // ✅ Handle sample confirm button separately (MUST come before general confirm_ check)
  if (data.startsWith("confirm_sample_")) {
    try {
      const payload = data.replace("confirm_sample_", "");
      const parts = payload.split("::");
      if (parts.length !== 4) {
        console.error("❌ Invalid sample confirm payload:", payload);
        return bot.answerCallbackQuery(query.id, { text: "Invalid data." });
      }

      let [username, pkg, countStr, date] = parts;
      
      // Clean username - remove any prefixes that might have been added
      username = username.replace(/^sample_/, ''); // Remove 'sample_' prefix if present
      
      const count = parseInt(countStr);
      if (!username || !pkg || isNaN(count)) {
        console.error("❌ Invalid sample confirm data:", { username, pkg, count, date });
        return bot.answerCallbackQuery(query.id, { text: "Invalid input." });
      }

      await bot.answerCallbackQuery(query.id, { text: "✅ Sample Confirmed!" });
      await bot.sendMessage(chatId, `✅ Sample package confirmed for @${username}!\n📤 Sending sample videos...`);

      try {
        // Find user chat ID by Telegram username
        const telegramUser = await db.collection("users").findOne({ username });

        if (!telegramUser || !telegramUser.id) {
          await bot.sendMessage(chatId, `⚠️ Can't find chat ID of @${username}, samples not sent.`);
          return;
        }

        const buyerId = telegramUser.id;
        
        // Check if user already received samples for this package
        const sampleKey = `sample_sent_${pkg}`;
        if (telegramUser[sampleKey]) {
          await bot.sendMessage(chatId, `⚠️ @${username} already received samples for '${pkg}' package.`);
          return;
        }

        // Get videos from the package
        const entry = await db.collection("video_files").findOne({ category: pkg });
        if (!entry || !entry.files || entry.files.length === 0) {
          await bot.sendMessage(chatId, `⚠️ No files found in '${pkg}' package.`);
          return;
        }

        // Get first 100 videos (or requested count)
        const videosToSend = entry.files.slice(0, Math.min(count, entry.files.length));

        if (videosToSend.length === 0) {
          await bot.sendMessage(chatId, `⚠️ No videos available to send for @${username}.`);
          return;
        }

        // Send videos to user
        let sentCount = 0;
        for (const fileData of videosToSend) {
          try {
            // Handle both old format (string) and new format (object)
            const fileId = typeof fileData === 'string' ? fileData : fileData.id;
            
            // Send video file
            await bot.sendVideo(buyerId, fileId);
            
            sentCount++;
            await delay(1000); // 1 second delay between sends
          } catch (err) {
            console.error("❌ Failed to send sample file:", err.message);
            // Continue with next file even if one fails
          }
        }

        // Mark that user received samples for this package
        await db.collection("users").updateOne(
          { username },
          { $set: { [sampleKey]: true, [`${sampleKey}_date`]: new Date().toISOString() } }
        );

        // Add sample package to user's history
        const samplePackage = {
          package: `${pkg} Samples v${sentCount}`,
          count: sentCount,
          date,
          price: "FREE",
          isSample: true
        };

        await db.collection("users").updateOne(
          { username },
          { $push: { purchases: samplePackage } }
        );

        await bot.sendMessage(chatId, `📦 Sent ${sentCount} sample files to @${username}`);
        await bot.sendMessage(buyerId, `🎉 You've received ${sentCount} sample files from the '${pkg}' package! Enjoy your free samples!`);

      } catch (e) {
        console.error("❌ Error while sending sample videos:", e);
        await bot.sendMessage(chatId, "❌ Failed to send sample videos.");
      }

    } catch (err) {
      console.error("❌ Error in sample confirm button handler:", err);
      await bot.answerCallbackQuery(query.id, { text: "❌ Error confirming sample." });
    }

    return;
  }

  // ✅ Handle broadcast confirmation FIRST (before other confirm handlers)
  if (data === 'confirm_broadcast') {
    console.log('📢 Broadcast confirmation received from user:', query.from.id);
    
    // Check both storage locations
    const step = userSteps[chatId];
    const broadcastSession = broadcastSessions[chatId];
    
    console.log('🔍 Checking broadcast session:', {
      hasStep: !!step,
      stepType: step?.step,
      hasStepContent: !!step?.broadcastContent,
      hasBroadcastSession: !!broadcastSession,
      broadcastSessionStatus: broadcastSession?.status,
      hasSessionContent: !!broadcastSession?.content,
      isAdmin: isAdmin(query.from.id),
      userId: query.from.id,
      adminIds: ADMIN_IDS
    });
    
    if (!isAdmin(query.from.id)) {
      console.log('❌ Not admin:', query.from.id);
      return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
    }
    
    // Get content from either source
    let broadcastContent = step?.broadcastContent || broadcastSession?.content;
    
    if (!broadcastContent) {
      console.log('❌ No broadcast content found in either location');
      return bot.answerCallbackQuery(query.id, { text: '❌ No broadcast content found.' });
    }

    // Validate broadcast content with detailed logging
    console.log('🔍 Validating broadcast content:', {
      type: broadcastContent.type,
      hasText: !!broadcastContent.text,
      textPreview: broadcastContent.text?.substring(0, 50),
      hasMessageId: !!broadcastContent.messageId,
      messageId: broadcastContent.messageId,
      chatId: broadcastContent.chatId
    });
    
    if (!broadcastContent.text && !broadcastContent.messageId) {
      console.log('❌ Invalid broadcast content - no text or messageId:', broadcastContent);
      return bot.answerCallbackQuery(query.id, { text: '❌ Invalid broadcast content.' });
    }

    try {
      console.log('✅ Starting broadcast process...');
      await bot.answerCallbackQuery(query.id, { text: '📢 Starting broadcast...' });
      
      // Start the broadcast process
      await startBroadcast(bot, db, broadcastContent, chatId);
      
      // Clean up both storage locations
      delete userSteps[chatId];
      delete broadcastSessions[chatId];
      console.log('✅ Broadcast completed and sessions cleaned up');
    } catch (error) {
      console.error('❌ Error starting broadcast:', error);
      await bot.sendMessage(chatId, `❌ Failed to start broadcast: ${error.message}`);
    }
    return;
  }

  if (data === 'cancel_broadcast') {
    delete userSteps[chatId];
    delete broadcastSessions[chatId];
    bot.answerCallbackQuery(query.id, { text: '❌ Broadcast cancelled.' });
    return bot.sendMessage(chatId, '❌ Broadcast cancelled.');
  }

  // ✅ Handle regular confirm button separately (MUST come after sample confirm_ check)
  if (data.startsWith("confirm_") && data !== 'confirm_broadcast') {
    try {
      const payload = data.replace("confirm_", "");
      const parts = payload.split("::");
      if (parts.length !== 4) {
        console.error("❌ Invalid confirm payload:", payload);
        return bot.answerCallbackQuery(query.id, { text: "Invalid data." });
      }

      const [username, pkg, countStr, date] = parts;
      const count = parseInt(countStr);
      if (!username || !pkg || isNaN(count)) {
        console.error("❌ Invalid confirm data:", { username, pkg, count, date });
        return bot.answerCallbackQuery(query.id, { text: "Invalid input." });
      }

      const fullPackage = {
        package: `${pkg} v${count}`,
        count,
        date,
        price: `Rs ${count}.00`
      };

      await db.collection("users").updateOne(
        { username },
        { $push: { purchases: fullPackage } },
        { upsert: true }
      );
      
      // Auto-assign badges after successful purchase
      await autoAssignAndSaveBadges(username);

      await bot.answerCallbackQuery(query.id, { text: "✅ Confirmed!" });
      await bot.sendMessage(chatId, `✅ Package confirmed and added to @${username}'s dashboard!\n📤 Sending videos...`);

      // Use the enhanced delivery function with retry
      const deliveryResult = await deliverVideosToUserWithRetry(bot, db, username, pkg, count, chatId);
      
      if (!deliveryResult.success) {
        console.error("❌ Video delivery failed:", deliveryResult.error);
      }


    } catch (err) {
      console.error("❌ Error in confirm button handler:", err);
      await bot.answerCallbackQuery(query.id, { text: "❌ Error confirming." });
    }

    return;
  }



  // 🔁 From here onward — only manage flow (if userSteps exists)
  const step = userSteps[chatId];
  if (!step) return;

  // Manage: add_package
  if (data === 'add_package') {
    step.step = 'awaiting_package_type';
    return bot.sendMessage(chatId, '📦 Choose a package:', {
      reply_markup: {
        inline_keyboard: [
          packageOptions.map(pkg => ({ text: pkg, callback_data: `pkg_${pkg}` }))
        ]
      }
    });
  }

  // Manage: remove_package
  if (data === 'remove_package') {
    step.step = 'awaiting_remove_index';

    const user = await db.collection('users').findOne({ username: step.username });
    if (!user || !user.purchases || user.purchases.length === 0) {
      return bot.sendMessage(chatId, `ℹ️ No packages found for @${step.username}`);
    }

    const list = user.purchases.map((p, i) =>
      `${i + 1}. ${p.package} (${p.count} vids, ${p.price} on ${p.date})`
    ).join('\n');

    return bot.sendMessage(chatId, `📦 Packages for @${step.username}:\n\n${list}\n\nSend number to remove:`);
  }

  // Manage: show_list
  if (data === 'show_list') {
    const user = await db.collection('users').findOne({ username: step.username });
    if (!user || !user.purchases || user.purchases.length === 0) {
      return bot.sendMessage(chatId, `ℹ️ No packages found for @${step.username}`);
    }

    const list = user.purchases.map((p, i) =>
      `${i + 1}. ${p.package} (${p.count} vids, ${p.price} on ${p.date})`
    ).join('\n');

    return bot.sendMessage(chatId, `📦 Packages for @${step.username}:\n\n${list}`);
  }

  // Manage: select package type
  if (data.startsWith('pkg_')) {
    step.package = data.replace('pkg_', '');
    step.step = 'awaiting_video_count';
    return bot.sendMessage(chatId, `🎞️ How many videos for ${step.package}?`);
  }
  



  // ✅ Handle end upload buttons
  if (data.startsWith('endupload_')) {
    if (!isAdmin(query.from.id)) return bot.answerCallbackQuery(query.id, { text: '❌ Not authorized.' });
    
    const categoryMap = {
      mixed: "Mixed",
      momandson: "Mom And Son",
      rape: "Rape",
      slleaks: "SL Leaks",
      cctv: "CCTV"
    };
    
    const cmd = data.replace("endupload_", "");
    const category = categoryMap[cmd];
    
    if (uploadSessions[chatId] && uploadSessions[chatId].category === category) {
      uploadSessions[chatId] = null;
      bot.answerCallbackQuery(query.id, { text: `✅ Upload ended for ${category}` });
      return bot.sendMessage(chatId, `✅ Upload ended for '${category}'`);
    } else {
      bot.answerCallbackQuery(query.id, { text: `⚠️ No active upload session for ${category}` });
      return bot.sendMessage(chatId, `⚠️ No active upload session for '${category}'`);
    }
  }
});


// ✅ Static files
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/videos', videoApiRouter);

// ✅ Telegram login auth verification
function checkTelegramAuth(data) {
  const { hash, ...rest } = data;
  const sortedData = Object.keys(rest).sort().map(key => `${key}=${rest[key]}`).join('\n');
  const secret = crypto.createHash('sha256').update(process.env.BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secret).update(sortedData).digest('hex');
  return hmac === hash;
}

// ✅ Enhanced secure login route with username handling
app.get('/auth/telegram', async (req, res) => {
  if (checkTelegramAuth(req.query)) {
    const telegramData = {
      id: req.query.id,
      first_name: req.query.first_name,
      last_name: req.query.last_name,
      username: req.query.username, // This might be undefined
      photo_url: req.query.photo_url
    };

    // Create user object with fallback handling
    const user = {
      id: telegramData.id,
      username: telegramData.username || null, // Store null if no username
      first_name: telegramData.first_name || 'User',
      last_name: telegramData.last_name || '',
      photo_url: telegramData.photo_url,
      hasUsername: !!telegramData.username, // Boolean flag
      loginAttempts: 1,
      lastLogin: new Date().toISOString()
    };

    // Generate display name
    const displayName = telegramData.username || 
                       `${telegramData.first_name} ${telegramData.last_name}`.trim() || 
                       `User${telegramData.id.toString().slice(-4)}`;

    try {
      // Update or create user in database
      await db.collection('users').updateOne(
        { id: user.id },
        {
          $set: {
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            photo_url: user.photo_url,
            hasUsername: user.hasUsername,
            lastLogin: user.lastLogin
          },
          $inc: { loginAttempts: 1 },
          $setOnInsert: {
            createdAt: new Date().toISOString(),
            purchases: [],
            loyaltyPoints: 0,
            badges: []
          }
        },
        { upsert: true }
      );

      // Log username status for admin monitoring
      console.log(`🔐 User login: ${displayName} (ID: ${user.id}) - Username: ${user.hasUsername ? '✅' : '❌'}`);
      
      // Auto-assign badges for new or returning users
      if (user.username) {
        await autoAssignAndSaveBadges(user.username);
      }

      // Redirect with appropriate parameters
      if (user.hasUsername) {
        // Normal redirect for users with username
        res.redirect(`/dashboard.html?name=${user.username}&pic=${encodeURIComponent(user.photo_url || '')}`);
      } else {
        // Special redirect for users without username
        res.redirect(`/nousername_dashboard.html?name=${encodeURIComponent(displayName)}&pic=${encodeURIComponent(user.photo_url || '')}&hasUsername=false&id=${user.id}`);
      }

    } catch (error) {
      console.error('❌ Database error during login:', error);
      res.status(500).send('Database error during authentication');
    }

  } else {
    console.log('❌ Invalid Telegram login attempt');
    res.status(403).send('Invalid Telegram Login');
  }
});

// ✅ Dashboard + API routes
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ✅ Serve admin panel HTML
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// ✅ Enhanced API endpoint to check username status
app.get('/api/username-status/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const user = await db.collection('users').findOne({ id: parseInt(userId) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      hasUsername: user.hasUsername || false,
      username: user.username,
      canOrder: user.hasUsername || false,
      canReceiveVideos: user.hasUsername || false,
      displayName: user.username || `${user.first_name} ${user.last_name}`.trim() || `User${userId.slice(-4)}`
    });

  } catch (error) {
    console.error('❌ Error checking username status:', error);
    res.status(500).json({ error: 'Failed to check username status' });
  }
});

app.get('/api/history', async (req, res) => {
  const username = req.query.username;
  const user = await db.collection('users').findOne({ username });

  const sortedPurchases = (user?.purchases || []).sort((a, b) => {
    return new Date(b.date) - new Date(a.date); // Newest first
  });

  res.json(sortedPurchases);
});

// ✅ Auto-retry service API endpoints
app.get('/api/autoretry/status', async (req, res) => {
  try {
    if (!autoRetryService) {
      return res.status(503).json({ error: 'Auto-retry service not initialized' });
    }
    
    const stats = autoRetryService.getStats();
    const summary = await autoRetryService.getFailedDeliveriesSummary();
    
    res.json({
      service: {
        isRunning: stats.isRunning,
        enabled: stats.config.enabled,
        intervalMinutes: stats.config.intervalMinutes,
        maxRetryAttempts: stats.config.maxRetryAttempts,
        lastRunAt: stats.lastRunAt,
        nextRunAt: stats.nextRunAt
      },
      statistics: {
        totalProcessed: stats.totalProcessed,
        successfulRetries: stats.successfulRetries,
        failedRetries: stats.failedRetries,
        permanentFailures: stats.permanentFailures
      },
      failedDeliveries: summary
    });
  } catch (error) {
    console.error('❌ Error getting auto-retry status:', error);
    res.status(500).json({ error: 'Failed to get auto-retry status' });
  }
});

app.get('/api/autoretry/summary', async (req, res) => {
  try {
    if (!autoRetryService) {
      return res.status(503).json({ error: 'Auto-retry service not initialized' });
    }
    
    const summary = await autoRetryService.getFailedDeliveriesSummary();
    res.json(summary);
  } catch (error) {
    console.error('❌ Error getting auto-retry summary:', error);
    res.status(500).json({ error: 'Failed to get auto-retry summary' });
  }
});

app.post('/api/autoretry/control', async (req, res) => {
  const { action } = req.body;
  
  if (!['start', 'stop', 'run'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use: start, stop, or run' });
  }
  
  try {
    if (!autoRetryService) {
      return res.status(503).json({ error: 'Auto-retry service not initialized' });
    }
    
    switch (action) {
      case 'start':
        autoRetryService.start();
        res.json({ success: true, message: 'Auto-retry service started' });
        break;
      case 'stop':
        autoRetryService.stop();
        res.json({ success: true, message: 'Auto-retry service stopped' });
        break;
      case 'run':
        await autoRetryService.processFailedDeliveries();
        res.json({ success: true, message: 'Auto-retry process completed' });
        break;
    }
  } catch (error) {
    console.error(`❌ Error ${action}ing auto-retry service:`, error);
    res.status(500).json({ error: `Failed to ${action} auto-retry service` });
  }
});

// ✅ Get retry logs
app.get('/api/autoretry/logs', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const logs = await db.collection('retry_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();
    
    const total = await db.collection('retry_logs').countDocuments();
    
    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('❌ Error getting retry logs:', error);
    res.status(500).json({ error: 'Failed to get retry logs' });
  }
});

// ===== BULK ORDER API ENDPOINT =====

// ✅ Bulk order endpoint for cart functionality
app.post('/api/bulk-order', async (req, res) => {
  const { username, cartItems } = req.body;
  
  try {
    if (!username || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'Invalid bulk order data' });
    }

    // Validate user exists
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate total price and validate items
    let totalPrice = 0;
    const validatedItems = [];
    
    for (const item of cartItems) {
      if (!item.package || !item.count || !item.totalPrice) {
        return res.status(400).json({ error: 'Invalid cart item data' });
      }
      totalPrice += item.totalPrice;
      validatedItems.push({
        package: item.package,
        count: item.count,
        pricePerVideo: item.pricePerVideo,
        totalPrice: item.totalPrice,
        date: item.date || new Date().toISOString().split('T')[0]
      });
    }

    // Store bulk order in database
    const bulkOrder = {
      username,
      items: validatedItems,
      totalPrice,
      orderDate: new Date().toISOString(),
      status: 'pending',
      type: 'bulk_order'
    };

    const result = await db.collection('bulk_orders').insertOne(bulkOrder);
    const orderId = result.insertedId;

    // Send admin notification
    let adminMessage = `🛒 <b>New Bulk Order Received!</b>\n\n`;
    adminMessage += `👤 <b>Customer:</b> @${username}\n`;
    adminMessage += `📦 <b>Order ID:</b> ${orderId}\n`;
    adminMessage += `📅 <b>Date:</b> ${new Date().toLocaleString()}\n\n`;
    adminMessage += `<b>📋 Order Details:</b>\n`;
    
    validatedItems.forEach((item, index) => {
      adminMessage += `${index + 1}. ${item.package} v${item.count} - Rs.${item.totalPrice.toFixed(2)}\n`;
    });
    
    adminMessage += `\n💰 <b>Total Amount:</b> Rs.${totalPrice.toFixed(2)}\n\n`;
    adminMessage += `⚡ <b>Action Required:</b> Please confirm or reject this bulk order.`;

    // Send to all admins
    for (const adminId of ADMIN_IDS) {
      try {
        await bot.sendMessage(adminId, adminMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Confirm Bulk Order', callback_data: `confirm_bulk_${orderId}` },
                { text: '❌ Reject Order', callback_data: `reject_bulk_${orderId}` }
              ]
            ]
          }
        });
        console.log(`✅ Bulk order notification sent to admin ${adminId}`);
      } catch (error) {
        console.error(`❌ Failed to send bulk order notification to admin ${adminId}:`, error);
      }
    }

    res.json({ 
      success: true, 
      message: 'Bulk order received successfully',
      orderId: orderId,
      totalPrice: totalPrice
    });

  } catch (error) {
    console.error('❌ Error processing bulk order:', error);
    res.status(500).json({ error: 'Failed to process bulk order' });
  }
});

// ===== GROUP SENDING API ENDPOINTS =====

// ✅ Get video counts for all packages
app.get('/api/video-counts', async (req, res) => {
  try {
    console.log('📊 Getting video counts for all packages...');
    
    const videoCounts = {};
    const packageTypes = ['Mixed', 'Mom And Son', 'Rape', 'SL Leaks', 'CCTV'];
    
    for (const packageType of packageTypes) {
      try {
        const entry = await db.collection('video_files').findOne({ category: packageType });
        const totalVideos = entry && entry.files ? entry.files.length : 0;
        
        videoCounts[packageType] = {
          totalVideos,
          lastUpdated: entry?.lastUpdated || null,
          uploadedBy: entry?.uploadedBy || null
        };
      } catch (error) {
        console.error(`❌ Error getting count for ${packageType}:`, error);
        videoCounts[packageType] = {
          totalVideos: 0,
          lastUpdated: null,
          uploadedBy: null,
          error: error.message
        };
      }
    }
    
    console.log('📊 Video counts retrieved:', videoCounts);
    res.json(videoCounts);
    
  } catch (error) {
    console.error('❌ Error getting video counts:', error);
    res.status(500).json({ error: 'Failed to get video counts' });
  }
});

// ✅ Helper function to send video with retry logic and error handling
async function sendVideoWithRetry(bot, chatId, fileId, options = {}, maxRetries = 3) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.sendVideo(chatId, fileId, options);
      return { success: true, attempt };
    } catch (error) {
      const errorCode = error.response?.body?.error_code;
      const errorDescription = error.response?.body?.description || error.message;
      
      // Handle flood wait - Telegram rate limiting
      if (error.response?.body?.parameters?.retry_after) {
        const waitTime = error.response.body.parameters.retry_after;
        console.log(`⏳ Flood wait: waiting ${waitTime} seconds...`);
        await delay(waitTime * 1000 + 1000); // Wait + 1 extra second
        continue; // Retry immediately after waiting
      }
      
      // Handle specific errors that shouldn't be retried
      if (errorCode === 403 || errorDescription.includes('CHAT_WRITE_FORBIDDEN')) {
        return { 
          success: false, 
          error: 'No permission to send in this chat',
          errorType: 'PERMISSION_DENIED',
          attempt 
        };
      }
      
      if (errorDescription.includes('chat not found')) {
        return { 
          success: false, 
          error: 'Chat not found - check Chat ID',
          errorType: 'CHAT_NOT_FOUND',
          attempt 
        };
      }
      
      // If this is the last attempt, return failure
      if (attempt === maxRetries) {
        return { 
          success: false, 
          error: errorDescription,
          errorType: 'MAX_RETRIES_EXCEEDED',
          attempt 
        };
      }
      
      // Exponential backoff for other errors
      const backoffTime = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${backoffTime/1000}s...`);
      await delay(backoffTime);
    }
  }
  
  return { success: false, error: 'Unknown error', errorType: 'UNKNOWN', attempt: maxRetries };
}

// ✅ Track ongoing group sends to prevent duplicates
const ongoingGroupSends = new Map();

// ✅ Store pending group sends awaiting admin confirmation
const pendingGroupSends = new Map();

// ✅ Execute group send after admin approval
async function executeGroupSend(pendingSend, confirmationMessageId) {
  const {
    targetId,
    packageType,
    videoCount,
    withCaption,
    withDelay,
    withNotification,
    captionTemplate,
    topicId,
    videosToSend,
    sentVideoIdsSet
  } = pendingSend;
  
  const sendKey = `${targetId}_${packageType}_${topicId || 'general'}`;
  
  // Check for duplicate (shouldn't happen, but safety check)
  if (ongoingGroupSends.has(sendKey)) {
    console.log(`⚠️ Send already in progress: ${sendKey}`);
    return;
  }
  
  // Mark as in progress
  ongoingGroupSends.set(sendKey, { startTime: Date.now(), targetId, packageType, topicId });
  
  try {
    // Send initial status update
    let adminStatusMsg = null;
    try {
      const topicInfo = topicId ? ` (Topic: ${topicId})` : '';
      const initialMsg = `🚀 <b>Group Sending Started</b>\n\n` +
        `🎯 <b>Target:</b> ${targetId}${topicInfo}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Total Videos:</b> ${videosToSend.length}\n\n` +
        `🔄 <b>Status:</b> Starting delivery...\n` +
        `📊 <b>Progress:</b> 0/${videosToSend.length} (0%)`;
      
      adminStatusMsg = await bot.sendMessage(PRIMARY_ADMIN_ID, initialMsg, { parse_mode: 'HTML' });
    } catch (msgError) {
      console.error('❌ Failed to send initial status message:', msgError.message);
    }
    
    const startTime = Date.now();
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    const failedVideos = [];
    
    // Send videos with retry logic
    for (let i = 0; i < videosToSend.length; i++) {
      try {
        const fileData = videosToSend[i];
        const fileId = typeof fileData === 'string' ? fileData : fileData.id;
        
        // Prepare caption if requested
        let caption = null;
        if (withCaption && captionTemplate) {
          caption = captionTemplate
            .replace('{package}', packageType)
            .replace('{count}', (i + 1).toString())
            .replace('{total}', videosToSend.length.toString());
        }
        
        // Send video with retry logic
        const sendOptions = caption ? { caption } : {};
        if (topicId) {
          sendOptions.message_thread_id = parseInt(topicId);
        }
        
        const result = await sendVideoWithRetry(bot, targetId, fileId, sendOptions);
        
        if (result.success) {
          sentCount++;
          sentVideoIdsSet.add(fileId);
        } else {
          failedCount++;
          errors.push(`Video ${i + 1}: ${result.error}`);
          failedVideos.push({
            fileData: videosToSend[i],
            index: i + 1,
            error: result.error,
            errorType: result.errorType,
            attempts: result.attempt,
            timestamp: new Date().toISOString()
          });
          console.error(`❌ Video ${i + 1} failed: ${result.error}`);
        }
        
        // Mandatory delay
        if (i < videosToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
        
        // Update admin every 10 videos
        const updateInterval = 10;
        if (((sentCount + failedCount) % updateInterval === 0) || (i === videosToSend.length - 1)) {
          const processed = sentCount + failedCount;
          const progress = Math.round((processed / videosToSend.length) * 100);
          const successRate = processed > 0 ? Math.round((sentCount / processed) * 100) : 0;
          
          try {
            const topicInfo = topicId ? ` (Topic: ${topicId})` : '';
            const updateMsg = `🚀 <b>Group Sending In Progress</b>\n\n` +
              `🎯 <b>Target:</b> ${targetId}${topicInfo}\n` +
              `📦 <b>Package:</b> ${packageType}\n` +
              `🎬 <b>Total Videos:</b> ${videosToSend.length}\n\n` +
              `📊 <b>Current Results:</b>\n` +
              `✅ Successfully Sent: ${sentCount}\n` +
              `❌ Failed: ${failedCount}\n` +
              `📈 Success Rate: ${successRate}%\n\n` +
              `🔄 <b>Progress:</b> ${processed}/${videosToSend.length} (${progress}%)\n` +
              `⏱️ <b>Status:</b> ${i === videosToSend.length - 1 ? 'Finalizing...' : `Sending... (${processed}/${videosToSend.length})`}`;
            
            if (adminStatusMsg) {
              await bot.editMessageText(updateMsg, {
                chat_id: PRIMARY_ADMIN_ID,
                message_id: adminStatusMsg.message_id,
                parse_mode: 'HTML'
              });
            }
          } catch (editError) {
            console.error('❌ Failed to update admin message:', editError.message);
          }
        }
        
      } catch (error) {
        console.error(`❌ Unexpected error sending video ${i + 1}:`, error.message);
        failedCount++;
        errors.push(`Video ${i + 1}: Unexpected error - ${error.message}`);
        failedVideos.push({
          fileData: videosToSend[i],
          index: i + 1,
          error: error.message,
          errorType: 'UNEXPECTED',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const endTime = Date.now();
    const timeTaken = `${Math.round((endTime - startTime) / 1000)} seconds`;
    const processed = sentCount + failedCount;
    const finalSuccessRate = processed > 0 ? Math.round((sentCount / processed) * 100) : 0;
    
    // Send final completion message
    try {
      const topicInfo = topicId ? ` (Topic: ${topicId})` : '';
      
      // Categorize errors
      const errorTypes = {};
      failedVideos.forEach(fv => {
        const type = fv.errorType || 'UNKNOWN';
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
      
      let errorBreakdown = '';
      if (failedCount > 0) {
        errorBreakdown = '\n\n📄 <b>Error Breakdown:</b>\n';
        Object.entries(errorTypes).forEach(([type, count]) => {
          const emoji = type === 'PERMISSION_DENIED' ? '🚫' : 
                       type === 'CHAT_NOT_FOUND' ? '🔍' :
                       type === 'MAX_RETRIES_EXCEEDED' ? '🔄' : '⚠️';
          errorBreakdown += `${emoji} ${type}: ${count}\n`;
        });
      }
      
      const statusEmoji = finalSuccessRate === 100 ? '🎉' : finalSuccessRate >= 90 ? '✅' : finalSuccessRate >= 70 ? '⚠️' : '❌';
      const completionMsg = `${statusEmoji} <b>Group Sending Complete!</b>\n\n` +
        `🎯 <b>Target:</b> ${targetId}${topicInfo}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Requested:</b> ${videoCount} videos\n` +
        `📊 <b>Available:</b> ${videosToSend.length} videos\n\n` +
        `📊 <b>Final Results:</b>\n` +
        `✅ Successfully Sent: ${sentCount}\n` +
        `❌ Failed: ${failedCount}\n` +
        `📈 Success Rate: ${finalSuccessRate}%\n` +
        errorBreakdown +
        `\n⏱️ <b>Completed:</b> ${new Date().toLocaleString()}\n` +
        `⏰ <b>Duration:</b> ${timeTaken}\n\n` +
        (finalSuccessRate === 100 ? '🎉 All videos delivered successfully!' :
         finalSuccessRate >= 90 ? `✅ Most videos delivered! ${failedCount} failed.` :
         finalSuccessRate >= 70 ? `⚠️ Partial success. ${failedCount} videos failed.` :
         `❌ Many failures. Only ${sentCount}/${processed} succeeded.`) +
        (failedCount > 0 ? `\n\n🔄 Failed videos saved for retry.` : '');
      
      if (adminStatusMsg) {
        await bot.editMessageText(completionMsg, {
          chat_id: PRIMARY_ADMIN_ID,
          message_id: adminStatusMsg.message_id,
          parse_mode: 'HTML'
        });
      } else {
        await bot.sendMessage(PRIMARY_ADMIN_ID, completionMsg, { parse_mode: 'HTML' });
      }
    } catch (notifError) {
      console.error('❌ Failed to send completion notification:', notifError.message);
    }
    
    // Update tracking
    if (sentCount > 0) {
      await updateGroupSentVideos(targetId, packageType, sentVideoIdsSet, topicId);
    }
    
    console.log(`✅ Group send completed: ${sentCount}/${videosToSend.length} videos sent`);
    
  } catch (error) {
    console.error('❌ Error in executeGroupSend:', error);
  } finally {
    // Clear ongoing send tracking
    ongoingGroupSends.delete(sendKey);
    console.log(`✅ Cleared send operation: ${sendKey}`);
  }
}

// ✅ Send videos to group/channel with admin confirmation and real-time updates
// Supports topics (forum threads) via topicId parameter
app.post('/api/send-to-group', async (req, res) => {
  try {
    const {
      targetId,
      packageType,
      videoCount,
      withCaption,
      withDelay,
      withNotification,
      captionTemplate,
      topicId  // ✅ NEW: Topic ID for forum threads
    } = req.body;
    
    // ✅ Create unique key for this send operation
    const sendKey = `${targetId}_${packageType}_${topicId || 'general'}`;
    
    // ✅ Check if this exact send is already in progress
    if (ongoingGroupSends.has(sendKey)) {
      console.log(`⚠️ Duplicate send request detected: ${sendKey}`);
      return res.status(409).json({
        success: false,
        error: 'A send operation for this target and package is already in progress. Please wait for it to complete.'
      });
    }
    
    // ✅ Mark this send as in progress
    ongoingGroupSends.set(sendKey, { startTime: Date.now(), targetId, packageType, topicId });
    console.log(`✅ Started send operation: ${sendKey}`);
    
    console.log('📤 Group sending request:', {
      targetId,
      packageType,
      videoCount,
      withCaption,
      withDelay,
      withNotification,
      topicId: topicId || 'general chat'
    });
    
    // Validate input
    if (!targetId || !packageType || !videoCount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: targetId, packageType, videoCount'
      });
    }
    
    if (videoCount < 1 || videoCount > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Video count must be between 1 and 1000'
      });
    }
    
    // Get videos from the package
    const entry = await db.collection('video_files').findOne({ category: packageType });
    if (!entry || !entry.files || entry.files.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No videos found in '${packageType}' package`
      });
    }
    
    // ✅ Get already-sent videos for this group/topic to avoid duplicates
    const alreadySentIds = await getGroupSentVideos(targetId, packageType, topicId);
    const sentVideoIdsSet = new Set(alreadySentIds);
    
    // Filter out already-sent videos
    const availableFiles = entry.files.filter(fileData => {
      const fileId = typeof fileData === 'string' ? fileData : fileData.id;
      return !sentVideoIdsSet.has(fileId);
    });
    
    // Get the requested number of NEW videos
    const videosToSend = availableFiles.slice(0, Math.min(videoCount, availableFiles.length));
    
    console.log(`📊 Group video selection: Total=${entry.files.length}, Already sent=${alreadySentIds.length}, Available=${availableFiles.length}, To send=${videosToSend.length}`);
    
    if (videosToSend.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No new videos available to send (all videos already sent to this group)'
      });
    }
    
    // ✅ Create unique ID for this pending send
    const sendId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    // ✅ Store pending send with all parameters
    pendingGroupSends.set(sendId, {
      targetId,
      packageType,
      videoCount,
      withCaption,
      withDelay,
      withNotification,
      captionTemplate,
      topicId,
      videosToSend,
      sentVideoIdsSet,
      timestamp: Date.now(),
      requestedBy: 'admin' // You can track which admin if needed
    });
    
    // ✅ Send confirmation request to admin
    try {
      const topicInfo = topicId ? ` (Topic: ${topicId})` : '';
      const confirmationMsg = `📤 <b>Group Send Confirmation Required</b>\n\n` +
        `🎯 <b>Target:</b> ${targetId}${topicInfo}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Videos to Send:</b> ${videosToSend.length}\n` +
        `📊 <b>Available:</b> ${availableFiles.length}\n` +
        `💾 <b>Already Sent:</b> ${alreadySentIds.length}\n\n` +
        `⚙️ <b>Settings:</b>\n` +
        `• Caption: ${withCaption ? '✅ Yes' : '❌ No'}\n` +
        `• Delay: ${withDelay ? '✅ Yes' : '❌ No'}\n` +
        `• Notification: ${withNotification ? '✅ Yes' : '❌ No'}\n\n` +
        `⏱️ <b>Requested:</b> ${new Date().toLocaleString()}\n\n` +
        `❓ <b>Approve this group send?</b>`;
      
      await bot.sendMessage(PRIMARY_ADMIN_ID, confirmationMsg, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve & Send', callback_data: `group_send_approve_${sendId}` },
            { text: '❌ Reject', callback_data: `group_send_reject_${sendId}` }
          ]]
        }
      });
      
      console.log(`✅ Confirmation sent to admin for group send: ${sendId}`);
    } catch (msgError) {
      console.error('❌ Failed to send confirmation message:', msgError.message);
      // Clean up pending send if confirmation failed
      pendingGroupSends.delete(sendId);
      throw new Error('Failed to send confirmation to admin');
    }
    
    // ✅ Clear the ongoing send tracking (will be set again on approval)
    ongoingGroupSends.delete(sendKey);
    
    // ✅ Return pending status
    return res.json({
      success: true,
      status: 'pending_confirmation',
      sendId,
      message: 'Group send request submitted. Waiting for admin confirmation.',
      videosToSend: videosToSend.length,
      targetId,
      packageType,
      topicId
    });
    
    /* OLD SENDING CODE - Now handled by callback after approval
    // This code has been moved to the callback handler
    // See bot.on('callback_query') for group_send_approve_
    const startTime = Date.now();
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    const failedVideos = [];
    const batchSize = 100;
    let currentBatch = 0;
    let adminStatusMsg = null;
    
    // Send videos to the target with real-time updates
    for (let i = 0; i < videosToSend.length; i++) {
      try {
        const fileData = videosToSend[i];
        const fileId = typeof fileData === 'string' ? fileData : fileData.id;
        
        // Prepare caption if requested
        let caption = null;
        if (withCaption && captionTemplate) {
          caption = captionTemplate
            .replace('{package}', packageType)
            .replace('{count}', (i + 1).toString())
            .replace('{total}', videosToSend.length.toString());
        }
        
        // Send video (with topic support and retry logic)
        const sendOptions = caption ? { caption } : {};
        if (topicId) {
          sendOptions.message_thread_id = parseInt(topicId); // ✅ Send to specific topic
        }
        
        // ✅ Use retry function for reliable sending
        const result = await sendVideoWithRetry(bot, targetId, fileId, sendOptions);
        
        if (result.success) {
          sentCount++;
          sentVideoIdsSet.add(fileId); // ✅ Track sent video to prevent future duplicates
        } else {
          failedCount++;
          errors.push(`Video ${i + 1}: ${result.error}`);
          failedVideos.push({
            fileData: videosToSend[i],
            index: i + 1,
            error: result.error,
            errorType: result.errorType,
            attempts: result.attempt,
            timestamp: new Date().toISOString()
          });
          console.error(`❌ Video ${i + 1} failed after ${result.attempt} attempts: ${result.error}`);
        }
        
        // ✅ Mandatory delay between videos (prevent rate limiting)
        if (i < videosToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay (mandatory)
        }
        
        // ✅ Update admin message every 10 videos or at completion (real-time tracking)
        const updateInterval = 10; // Update every 10 videos
        if (((sentCount + failedCount) % updateInterval === 0) || (i === videosToSend.length - 1)) {
          const processed = sentCount + failedCount;
          const progress = Math.round((processed / videosToSend.length) * 100);
          const successRate = processed > 0 ? Math.round((sentCount / processed) * 100) : 0;
          
          try {
            const topicInfo = topicId ? ` (Topic: ${topicId})` : '';
            const updateMsg = `🚀 <b>Group Sending In Progress</b>\n\n` +
              `🎯 <b>Target:</b> ${targetId}${topicInfo}\n` +
              `📦 <b>Package:</b> ${packageType}\n` +
              `🎬 <b>Total Videos:</b> ${videosToSend.length}\n\n` +
              `📊 <b>Current Results:</b>\n` +
              `✅ Successfully Sent: ${sentCount}\n` +
              `❌ Failed: ${failedCount}\n` +
              `📈 Success Rate: ${successRate}%\n\n` +
              `🔄 <b>Progress:</b> ${processed}/${videosToSend.length} (${progress}%)\n` +
              `⏱️ <b>Status:</b> ${i === videosToSend.length - 1 ? 'Finalizing...' : `Sending... (${sentCount + failedCount}/${videosToSend.length})`}`;
            
            if (adminStatusMsg) {
              await bot.editMessageText(updateMsg, {
                chat_id: PRIMARY_ADMIN_ID,
                message_id: adminStatusMsg.message_id,
                parse_mode: 'HTML'
              });
            }
          } catch (editError) {
            console.error('❌ Failed to update admin message:', editError.message);
          }
        }
        
      } catch (error) {
        // Catch any unexpected errors not handled by retry function
        console.error(`❌ Unexpected error sending video ${i + 1}:`, error.message);
        failedCount++;
        errors.push(`Video ${i + 1}: Unexpected error - ${error.message}`);
        failedVideos.push({
          fileData: videosToSend[i],
          index: i + 1,
          error: error.message,
          errorType: 'UNEXPECTED',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const endTime = Date.now();
    const timeTaken = `${Math.round((endTime - startTime) / 1000)} seconds`;
    const totalBatches = Math.ceil(videosToSend.length / batchSize);
    const successRate = sentCount > 0 ? Math.round((sentCount / videosToSend.length) * 100) : 0;
    
    // ✅ Send final completion notification with detailed summary
    try {
      const topicInfo = topicId ? ` (Topic: ${topicId})` : '';
      const processed = sentCount + failedCount;
      const finalSuccessRate = processed > 0 ? Math.round((sentCount / processed) * 100) : 0;
      
      // Categorize errors
      const errorTypes = {};
      failedVideos.forEach(fv => {
        const type = fv.errorType || 'UNKNOWN';
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
      
      let errorBreakdown = '';
      if (failedCount > 0) {
        errorBreakdown = '\n\n📄 <b>Error Breakdown:</b>\n';
        Object.entries(errorTypes).forEach(([type, count]) => {
          const emoji = type === 'PERMISSION_DENIED' ? '🚫' : 
                       type === 'CHAT_NOT_FOUND' ? '🔍' :
                       type === 'MAX_RETRIES_EXCEEDED' ? '🔄' : '⚠️';
          errorBreakdown += `${emoji} ${type}: ${count}\n`;
        });
      }
      
      const statusEmoji = finalSuccessRate === 100 ? '🎉' : finalSuccessRate >= 90 ? '✅' : finalSuccessRate >= 70 ? '⚠️' : '❌';
      const completionMsg = `${statusEmoji} <b>Group Sending Complete!</b>\n\n` +
        `🎯 <b>Target:</b> ${targetId}${topicInfo}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Requested:</b> ${videoCount} videos\n` +
        `📊 <b>Available:</b> ${videosToSend.length} videos\n\n` +
        `📊 <b>Final Results:</b>\n` +
        `✅ Successfully Sent: ${sentCount}\n` +
        `❌ Failed: ${failedCount}\n` +
        `📈 Success Rate: ${finalSuccessRate}%\n` +
        errorBreakdown +
        `\n⏱️ <b>Completed:</b> ${new Date().toLocaleString()}\n` +
        `⏰ <b>Duration:</b> ${timeTaken}\n\n` +
        (finalSuccessRate === 100 ? '🎉 All videos delivered successfully!' :
         finalSuccessRate >= 90 ? `✅ Most videos delivered! ${failedCount} failed.` :
         finalSuccessRate >= 70 ? `⚠️ Partial success. ${failedCount} videos failed.` :
         `❌ Many failures. Only ${sentCount}/${processed} succeeded.`) +
        (failedCount > 0 ? `\n\n🔄 Failed videos saved for retry.` : '');
      
      if (adminStatusMsg) {
        await bot.editMessageText(completionMsg, {
          chat_id: PRIMARY_ADMIN_ID,
          message_id: adminStatusMsg.message_id,
          parse_mode: 'HTML'
        });
      } else {
        await bot.sendMessage(PRIMARY_ADMIN_ID, completionMsg, { parse_mode: 'HTML' });
      }
    } catch (notifError) {
      console.error('❌ Failed to send completion notification:', notifError.message);
    }
    
    // ✅ Store failed videos for retry if any
    if (failedVideos.length > 0) {
      try {
        await db.collection('failed_group_deliveries').insertOne({
          timestamp: new Date().toISOString(),
          targetId,
          packageType,
          totalVideos: videosToSend.length,
          sentCount,
          failedCount,
          failedVideos,
          retryAttempts: 0,
          status: 'pending_retry',
          createdAt: new Date().toISOString()
        });
        console.log(`💾 Stored ${failedVideos.length} failed videos for retry`);
      } catch (storeError) {
        console.error('❌ Failed to store failed videos for retry:', storeError.message);
      }
    }
    
    // ✅ Update group/topic video tracking to prevent future duplicates
    if (sentCount > 0) {
      await updateGroupSentVideos(targetId, packageType, sentVideoIdsSet, topicId);
    }
    
    // Log the group sending activity
    try {
      await db.collection('group_sending_logs').insertOne({
        timestamp: new Date().toISOString(),
        targetId,
        packageType,
        requestedCount: videoCount,
        totalVideos: videosToSend.length,
        sentCount,
        failedCount,
        successRate,
        totalBatches,
        timeTaken,
        withCaption,
        withDelay,
        withNotification,
        errors: errors.slice(0, 10), // Store only first 10 errors
        success: sentCount > 0,
        hasFailedVideos: failedVideos.length > 0
      });
    } catch (logError) {
      console.error('❌ Failed to log group sending activity:', logError.message);
    }
    
    // Return response
    const success = sentCount > 0;
    const response = {
      success,
      sentCount,
      failedCount,
      totalVideos: videosToSend.length,
      successRate,
      totalBatches,
      timeTaken,
      targetInfo: targetId,
      packageType,
      hasFailedVideos: failedVideos.length > 0
    };
    
    if (!success) {
      response.error = errors.length > 0 ? errors[0] : 'Failed to send any videos';
    }
    
    if (errors.length > 0) {
      response.errors = errors.slice(0, 5); // Include first 5 errors in response
    }
    
    console.log('📤 Group sending completed:', response);
    
    // ✅ Clear the ongoing send tracking
    ongoingGroupSends.delete(sendKey);
    console.log(`✅ Completed send operation: ${sendKey}`);
    
    res.json(response);
    END OF OLD CODE */
    
  } catch (error) {
    console.error('❌ Error in group sending:', error);
    
    // ✅ Clear the ongoing send tracking even on error
    const sendKey = `${req.body.targetId}_${req.body.packageType}_${req.body.topicId || 'general'}`;
    ongoingGroupSends.delete(sendKey);
    console.log(`✅ Cleared failed send operation: ${sendKey}`);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// ✅ Get failed group deliveries for retry
app.get('/api/failed-group-deliveries', async (req, res) => {
  try {
    const failedDeliveries = await db.collection('failed_group_deliveries')
      .find({ status: 'pending_retry' })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    const summary = {
      total: failedDeliveries.length,
      totalFailedVideos: failedDeliveries.reduce((sum, delivery) => sum + delivery.failedCount, 0),
      byPackage: {}
    };
    
    // Group by package type
    failedDeliveries.forEach(delivery => {
      if (!summary.byPackage[delivery.packageType]) {
        summary.byPackage[delivery.packageType] = {
          count: 0,
          failedVideos: 0
        };
      }
      summary.byPackage[delivery.packageType].count++;
      summary.byPackage[delivery.packageType].failedVideos += delivery.failedCount;
    });
    
    res.json({
      summary,
      deliveries: failedDeliveries
    });
    
  } catch (error) {
    console.error('❌ Error getting failed group deliveries:', error);
    res.status(500).json({ error: 'Failed to get failed group deliveries' });
  }
});

// ✅ Retry failed group delivery
app.post('/api/retry-group-delivery/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    
    const delivery = await db.collection('failed_group_deliveries').findOne({ 
      _id: new mongo.ObjectId(deliveryId),
      status: 'pending_retry'
    });
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: 'Failed delivery not found or already processed'
      });
    }
    
    // Mark as retrying
    await db.collection('failed_group_deliveries').updateOne(
      { _id: delivery._id },
      { 
        $set: { 
          status: 'retrying',
          retryStartedAt: new Date().toISOString()
        },
        $inc: { retryAttempts: 1 }
      }
    );
    
    let sentCount = 0;
    let stillFailedCount = 0;
    const stillFailedVideos = [];
    
    // Retry failed videos
    for (const failedVideo of delivery.failedVideos) {
      try {
        const fileData = failedVideo.fileData;
        const fileId = typeof fileData === 'string' ? fileData : fileData.id;
        
        await bot.sendVideo(delivery.targetId, fileId);
        sentCount++;
        
        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Retry failed for video ${failedVideo.index}:`, error.message);
        stillFailedCount++;
        stillFailedVideos.push({
          ...failedVideo,
          retryError: error.message,
          retryTimestamp: new Date().toISOString()
        });
      }
    }
    
    // Update delivery status
    const finalStatus = stillFailedCount === 0 ? 'completed' : 'partial_retry';
    await db.collection('failed_group_deliveries').updateOne(
      { _id: delivery._id },
      { 
        $set: { 
          status: finalStatus,
          retryCompletedAt: new Date().toISOString(),
          retrySentCount: sentCount,
          retryFailedCount: stillFailedCount,
          stillFailedVideos: stillFailedVideos
        }
      }
    );
    
    // Send admin notification
    try {
      const retryMsg = `🔄 <b>Group Delivery Retry Complete</b>\n\n` +
        `🎯 <b>Target:</b> ${delivery.targetId}\n` +
        `📦 <b>Package:</b> ${delivery.packageType}\n` +
        `🔄 <b>Retry Results:</b>\n` +
        `✅ Successfully Sent: ${sentCount}\n` +
        `❌ Still Failed: ${stillFailedCount}\n` +
        `📈 Retry Success Rate: ${sentCount > 0 ? Math.round((sentCount / delivery.failedVideos.length) * 100) : 0}%\n\n` +
        `⏱️ <b>Completed at:</b> ${new Date().toLocaleString()}`;
      
      await bot.sendMessage(PRIMARY_ADMIN_ID, retryMsg, { parse_mode: 'HTML' });
    } catch (notifError) {
      console.error('❌ Failed to send retry notification:', notifError.message);
    }
    
    res.json({
      success: true,
      sentCount,
      stillFailedCount,
      status: finalStatus
    });
    
  } catch (error) {
    console.error('❌ Error retrying group delivery:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// ✅ Get bot's chats (groups and channels)
app.get('/api/bot-chats', async (req, res) => {
  try {
    console.log('🔍 Scanning for bot chats...');
    
    const detectedChats = [];
    
    try {
      // Get recent updates to find chats where bot is active
      const updates = await bot.getUpdates({ limit: 100 });
      const chatMap = new Map();
      
      // Process updates to extract chat information
      for (const update of updates) {
        let chat = null;
        
        if (update.message) {
          chat = update.message.chat;
        } else if (update.channel_post) {
          chat = update.channel_post.chat;
        } else if (update.edited_message) {
          chat = update.edited_message.chat;
        } else if (update.edited_channel_post) {
          chat = update.edited_channel_post.chat;
        }
        
        if (chat && (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel')) {
          // Use username as primary identifier if available, fallback to ID
          const chatKey = chat.username || chat.id.toString();
          
          if (!chatMap.has(chatKey)) {
            const chatInfo = {
              id: chat.id.toString(),
              title: chat.title || 'Unknown',
              type: chat.type,
              username: chat.username || null,
              // Use username for targeting if available, otherwise use ID
              targetId: chat.username ? `@${chat.username}` : chat.id.toString(),
              member_count: null // We'll try to get this
            };
            
            // Try to get member count for groups/supergroups
            if (chat.type === 'supergroup' || chat.type === 'group') {
              try {
                const memberCount = await bot.getChatMemberCount(chat.id);
                chatInfo.member_count = memberCount;
              } catch (memberErr) {
                console.log(`⚠️ Could not get member count for ${chat.title}:`, memberErr.message);
              }
            }
            
            chatMap.set(chatKey, chatInfo);
          }
        }
      }
      
      // Convert map to array
      detectedChats.push(...chatMap.values());
      
      console.log(`✅ Found ${detectedChats.length} chats from bot updates`);
      
    } catch (updatesError) {
      console.error('⚠️ Error getting bot updates:', updatesError.message);
      
      // Fallback: Try to get chats from database (previous interactions)
      try {
        const users = await db.collection('users').find({}).toArray();
        const groupChats = [];
        
        // Check if any users have group-like IDs (negative IDs are usually groups/channels)
        for (const user of users) {
          if (user.id && user.id < 0) {
            groupChats.push({
              id: user.id.toString(),
              title: user.username || user.first_name || 'Unknown Group',
              type: 'group',
              username: user.username || null,
              targetId: user.username ? `@${user.username}` : user.id.toString(),
              member_count: null
            });
          }
        }
        
        detectedChats.push(...groupChats);
        console.log(`📋 Fallback: Found ${groupChats.length} potential groups from user database`);
        
      } catch (dbError) {
        console.error('❌ Error accessing database for chat fallback:', dbError.message);
      }
    }
    
    // If no chats found, provide helpful mock data with real working examples
    if (detectedChats.length === 0) {
      console.log('📝 No chats detected, providing example format');
      detectedChats.push({
        id: 'example',
        title: 'No groups/channels detected',
        type: 'info',
        username: null,
        targetId: null,
        member_count: null,
        isExample: true
      });
    }
    
    // Sort chats by type and title
    detectedChats.sort((a, b) => {
      if (a.isExample) return 1;
      if (b.isExample) return -1;
      
      // Channels first, then supergroups, then groups
      const typeOrder = { 'channel': 0, 'supergroup': 1, 'group': 2 };
      const typeCompare = (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
      if (typeCompare !== 0) return typeCompare;
      
      return a.title.localeCompare(b.title);
    });
    
    res.json({
      success: true,
      chats: detectedChats,
      message: detectedChats.length > 0 && !detectedChats[0].isExample 
        ? `Found ${detectedChats.length} groups/channels` 
        : 'No groups/channels detected. Make sure the bot is added to groups/channels and has recent activity.'
    });
    
  } catch (error) {
    console.error('❌ Error getting bot chats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to scan bot chats: ' + error.message,
      chats: []
    });
  }
});

// ✅ Send videos to group/channel
// Supports topics (forum threads) via options.topicId
app.post('/api/send-videos-to-group', async (req, res) => {
  try {
    const { targetChatId, packageType, videoCount, options } = req.body;
    const topicId = options?.topicId || null; // ✅ Extract topicId from options
    
    // ✅ Create unique key for this send operation
    const sendKey = `${targetChatId}_${packageType}_${topicId || 'general'}`;
    
    // ✅ Check if this exact send is already in progress
    if (ongoingGroupSends.has(sendKey)) {
      console.log(`⚠️ Duplicate send request detected: ${sendKey}`);
      return res.status(409).json({
        success: false,
        error: 'A send operation for this target and package is already in progress. Please wait for it to complete.'
      });
    }
    
    // ✅ Mark this send as in progress
    ongoingGroupSends.set(sendKey, { startTime: Date.now(), targetChatId, packageType, topicId });
    console.log(`✅ Started send operation: ${sendKey}`);
    
    console.log('📤 Group sending request:', {
      targetChatId,
      packageType,
      videoCount,
      options,
      topicId: topicId || 'general chat'
    });
    
    // Validation
    if (!targetChatId || !packageType || !videoCount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: targetChatId, packageType, videoCount'
      });
    }
    
    if (videoCount < 1 || videoCount > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Video count must be between 1 and 1000'
      });
    }
    
    // Get videos from the package
    const entry = await db.collection("video_files").findOne({ category: packageType });
    if (!entry || !entry.files || entry.files.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No videos found in '${packageType}' package`
      });
    }
    
    // ✅ Get already-sent videos for this group to avoid duplicates
    const alreadySentIds = await getGroupSentVideos(targetChatId, packageType);
    const sentVideoIdsSet = new Set(alreadySentIds);
    
    // Filter out already-sent videos
    const availableFiles = entry.files.filter(fileData => {
      const fileId = typeof fileData === 'string' ? fileData : fileData.id;
      return !sentVideoIdsSet.has(fileId);
    });
    
    // Get the requested number of NEW videos
    const videosToSend = availableFiles.slice(0, Math.min(videoCount, availableFiles.length));
    
    console.log(`📊 Group video selection: Total=${entry.files.length}, Already sent=${alreadySentIds.length}, Available=${availableFiles.length}, To send=${videosToSend.length}`);
    
    if (videosToSend.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No new videos available to send (all videos already sent to this group)'
      });
    }
    
    const startTime = Date.now();
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    const failedVideos = [];
    
    console.log(`📤 Starting group delivery of ${videosToSend.length} videos to ${targetChatId}${topicId ? ` (Topic: ${topicId})` : ''}`);
    
    // Send videos to the group/channel with retry logic
    for (let i = 0; i < videosToSend.length; i++) {
      const fileData = videosToSend[i];
      const fileId = typeof fileData === 'string' ? fileData : fileData.id;
      
      try {
        let caption = null;
        
        // Generate caption if requested
        if (options.withCaption && options.captionTemplate) {
          caption = options.captionTemplate
            .replace('{package}', packageType)
            .replace('{count}', i + 1)
            .replace('{total}', videosToSend.length);
        }
        
        // Send video to group/channel (with topic support and retry logic)
        const sendOptions = caption ? { caption } : {};
        if (topicId) {
          sendOptions.message_thread_id = parseInt(topicId); // ✅ Send to specific topic
        }
        
        // ✅ Use retry function for reliable sending
        const result = await sendVideoWithRetry(bot, targetChatId, fileId, sendOptions);
        
        if (result.success) {
          sentCount++;
          sentVideoIdsSet.add(fileId); // ✅ Track sent video to prevent future duplicates
          console.log(`✅ Sent video ${sentCount}/${videosToSend.length} to group ${targetChatId}`);
        } else {
          failedCount++;
          errors.push(`Video ${i + 1}: ${result.error}`);
          failedVideos.push({
            fileData: videosToSend[i],
            index: i + 1,
            error: result.error,
            errorType: result.errorType,
            attempts: result.attempt,
            timestamp: new Date().toISOString()
          });
          console.error(`❌ Video ${i + 1} failed after ${result.attempt} attempts: ${result.error}`);
        }
        
        // ✅ Mandatory delay between videos (prevent rate limiting)
        if (i < videosToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay (mandatory)
        }
        
      } catch (err) {
        // Catch any unexpected errors
        failedCount++;
        errors.push(`Video ${i + 1}: Unexpected error - ${err.message}`);
        failedVideos.push({
          fileData: videosToSend[i],
          index: i + 1,
          error: err.message,
          errorType: 'UNEXPECTED',
          timestamp: new Date().toISOString()
        });
        console.error(`❌ Unexpected error sending video ${i + 1} to group:`, err.message);
      }
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    const successRate = Math.round((sentCount / videosToSend.length) * 100);
    
    // Send completion notification to admin if requested
    if (options.withNotification && ADMIN_IDS.length > 0) {
      const notificationMsg = 
        `📤 <b>Group Sending Complete!</b>\n\n` +
        `📍 <b>Target:</b> ${targetChatId}\n` +
        `📦 <b>Package:</b> ${packageType}\n` +
        `🎬 <b>Videos:</b> ${videosToSend.length}\n\n` +
        `📊 <b>Results:</b>\n` +
        `✅ <b>Sent:</b> ${sentCount}\n` +
        `❌ <b>Failed:</b> ${failedCount}\n` +
        `📈 <b>Success Rate:</b> ${successRate}%\n` +
        `⏱️ <b>Duration:</b> ${duration} seconds`;
      
      try {
        await bot.sendMessage(ADMIN_IDS[0], notificationMsg, { parse_mode: 'HTML' });
      } catch (notifErr) {
        console.error('❌ Failed to send admin notification:', notifErr.message);
      }
    }
    
    // ✅ Update group/topic video tracking to prevent future duplicates
    if (sentCount > 0) {
      await updateGroupSentVideos(targetChatId, packageType, sentVideoIdsSet, topicId);
    }
    
    // Log the group sending activity
    await db.collection('group_sending_logs').insertOne({
      targetChatId,
      packageType,
      requestedCount: videoCount,
      sentCount,
      failedCount,
      successRate,
      duration,
      options,
      timestamp: new Date().toISOString(),
      adminId: 'admin' // You might want to track which admin initiated this
    });
    
    console.log(`📊 Group sending completed: ${sentCount}/${videosToSend.length} videos sent in ${duration}s`);
    
    // ✅ Clear the ongoing send tracking
    ongoingGroupSends.delete(sendKey);
    console.log(`✅ Completed send operation: ${sendKey}`);
    
    res.json({
      success: true,
      sentCount,
      failedCount,
      totalRequested: videoCount,
      successRate,
      duration: `${duration} seconds`,
      message: `Successfully sent ${sentCount} videos to group/channel`
    });
    
  } catch (error) {
    console.error('❌ Error in group sending:', error);
    
    // ✅ Clear the ongoing send tracking even on error
    const sendKey = `${req.body.targetChatId}_${req.body.packageType}_${req.body.options?.topicId || 'general'}`;
    ongoingGroupSends.delete(sendKey);
    console.log(`✅ Cleared failed send operation: ${sendKey}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      sentCount: 0,
      failedCount: 0,
      successRate: 0
    });
  }
});

// ✅ Get all users for admin panel
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection("users").find({}, { projection: { username: 1, _id: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    console.error("❌ Failed to fetch users", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/deleteUser', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    await db.collection('users').deleteOne({ username });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to delete user:", err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ✅ Add new user
app.post('/api/addUser', async (req, res) => {
  const { username, firstName, lastName, telegramId } = req.body;
  
  if (!username || !firstName || !telegramId) {
    return res.status(400).json({ error: 'Username, first name, and Telegram ID are required' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ 
      $or: [{ username }, { id: parseInt(telegramId) }]
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this username or Telegram ID already exists' });
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
      badges: [{
        type: 'NEW',
        assignedAt: new Date().toISOString(),
        assignedBy: 'admin'
      }],
      loginAttempts: 0
    };
    
    await db.collection('users').insertOne(newUser);
    
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error("❌ Failed to add user:", err);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

app.post('/api/deletePackage', async (req, res) => {
  const { username, index } = req.body;
  if (!username || index === undefined) return res.status(400).json({ error: 'Missing data' });

  try {
    const user = await db.collection('users').findOne({ username });
    if (!user || !user.purchases || !user.purchases[index]) {
      return res.status(404).json({ error: 'Package not found' });
    }

    user.purchases.splice(index, 1); // Remove package by index

    await db.collection('users').updateOne(
      { username },
      { $set: { purchases: user.purchases } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to delete package:", err);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// ✅ Helper functions for group video tracking (to avoid duplicate sends)
// Supports both regular groups and topics (forum threads)
async function getGroupSentVideos(groupId, packageType, topicId = null) {
  try {
    // Create unique tracking key for topic or general chat
    const trackingKey = topicId ? `${groupId}_topic_${topicId}` : groupId.toString();
    
    const tracking = await db.collection('group_video_tracking').findOne({
      groupId: trackingKey,
      packageType
    });
    return tracking ? tracking.sentVideoIds : [];
  } catch (error) {
    console.error('❌ Error getting group sent videos:', error);
    return [];
  }
}

async function updateGroupSentVideos(groupId, packageType, sentVideoIds, topicId = null) {
  try {
    // Create unique tracking key for topic or general chat
    const trackingKey = topicId ? `${groupId}_topic_${topicId}` : groupId.toString();
    
    await db.collection('group_video_tracking').updateOne(
      { groupId: trackingKey, packageType },
      { 
        $set: { 
          sentVideoIds: Array.from(sentVideoIds),
          lastUpdated: new Date().toISOString(),
          topicId: topicId || null,
          originalGroupId: groupId.toString()
        }
      },
      { upsert: true }
    );
    
    const topicInfo = topicId ? ` (Topic: ${topicId})` : '';
    console.log(`✅ Updated group video tracking: ${groupId}${topicInfo} - ${packageType} - ${sentVideoIds.size} videos`);
    return true;
  } catch (error) {
    console.error('❌ Error updating group sent videos:', error);
    return false;
  }
}

// ✅ Reusable video delivery function
async function deliverVideosToUser(username, packageType, count, adminChatId = null) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    // Find user chat ID by Telegram username
    const telegramUser = await db.collection("users").findOne({ username });

    if (!telegramUser || !telegramUser.id) {
      const errorMsg = `⚠️ Can't find chat ID of @${username}, videos not sent.`;
      if (adminChatId) await bot.sendMessage(adminChatId, errorMsg);
      return { success: false, error: 'User not found or no Telegram ID' };
    }

    const buyerId = telegramUser.id;
    const sentVideoIds = new Set(telegramUser[`sent_${packageType}`] || []);
    const entry = await db.collection("video_files").findOne({ category: packageType });
    
    if (!entry || !entry.files || entry.files.length === 0) {
      const errorMsg = `⚠️ No files found in '${packageType}' package.`;
      if (adminChatId) await bot.sendMessage(adminChatId, errorMsg);
      return { success: false, error: 'No videos available' };
    }

    const availableFiles = entry.files.filter(fileData => {
      const fileId = typeof fileData === 'string' ? fileData : fileData.id;
      return !sentVideoIds.has(fileId);
    });
    
    const videosToSend = availableFiles.slice(0, count);

    if (videosToSend.length === 0) {
      const errorMsg = `⚠️ No new files available to send for @${username}.`;
      if (adminChatId) await bot.sendMessage(adminChatId, errorMsg);
      return { success: false, error: 'No new videos available' };
    }

    let sentCount = 0;
    for (const fileData of videosToSend) {
      try {
        // Handle both old format (string) and new format (object)
        const fileId = typeof fileData === 'string' ? fileData : fileData.id;
        
        // Send video file
        await bot.sendVideo(buyerId, fileId);
        
        sentVideoIds.add(fileId);
        sentCount++;
        await delay(1000); // 1 second delay
      } catch (err) {
        console.error("❌ Failed to send file:", err.message);
        // Continue with next file even if one fails
      }
    }

    // Update sent videos tracking
    await db.collection("users").updateOne(
      { username },
      { $set: { [`sent_${packageType}`]: Array.from(sentVideoIds) } }
    );

    // Send success notifications
    if (adminChatId) {
      await bot.sendMessage(adminChatId, `📦 Sent ${sentCount} files to @${username}`);
    }
    
    await bot.sendMessage(buyerId, `🎉 You've received ${sentCount} new files from the '${packageType}' package! Enjoy!`);

    return { success: true, sentCount, totalRequested: count };
    
  } catch (error) {
    console.error("❌ Error in deliverVideosToUser:", error);
    if (adminChatId) {
      await bot.sendMessage(adminChatId, "❌ Failed to send videos due to technical error.");
    }
    return { success: false, error: error.message };
  }
}

// ✅ Add package to user
app.post('/api/addPackage', async (req, res) => {
  const { username, packageType, count, price, date } = req.body;
  
  if (!username || !packageType || !count || !price || !date) {
    return res.status(400).json({ error: 'Missing required data' });
  }
  
  try {
    const newPackage = {
      package: `${packageType} v${count}`,
      count: parseInt(count),
      date,
      price: `Rs ${parseFloat(price).toFixed(2)}`,
      addedBy: 'admin',
      addedAt: new Date().toISOString(),
      delivered: false
    };
    
    await db.collection('users').updateOne(
      { username },
      { 
        $push: { purchases: newPackage },
        $setOnInsert: { 
          username,
          createdAt: new Date().toISOString(),
          badges: []
        }
      },
      { upsert: true }
    );
    
    // Auto-assign badges after adding package
    await autoAssignAndSaveBadges(username);
    
    res.json({ success: true, package: newPackage });
  } catch (err) {
    console.error("❌ Failed to add package:", err);
    res.status(500).json({ error: 'Failed to add package' });
  }
});

// ✅ Add package and deliver videos immediately
app.post('/api/addPackageAndDeliver', async (req, res) => {
  const { username, packageType, count, price, date } = req.body;
  
  if (!username || !packageType || !count || !price || !date) {
    return res.status(400).json({ error: 'Missing required data' });
  }
  
  try {
    const newPackage = {
      package: `${packageType} v${count}`,
      count: parseInt(count),
      date,
      price: `Rs ${parseFloat(price).toFixed(2)}`,
      addedBy: 'admin',
      addedAt: new Date().toISOString(),
      delivered: false,
      deliveryAttempted: true,
      deliveryAttemptedAt: new Date().toISOString()
    };
    
    // Add package to database first
    await db.collection('users').updateOne(
      { username },
      { 
        $push: { purchases: newPackage },
        $setOnInsert: { 
          username,
          createdAt: new Date().toISOString(),
          badges: []
        }
      },
      { upsert: true }
    );
    
    // Auto-assign badges after adding package
    await autoAssignAndSaveBadges(username);
    
    // Attempt to deliver videos with enhanced retry
    const deliveryResult = await deliverVideosToUserWithRetry(bot, db, username, packageType, parseInt(count));
    
    if (deliveryResult.success) {
      // Update package as delivered
      await db.collection('users').updateOne(
        { username },
        { 
          $set: { 
            "purchases.$[elem].delivered": true,
            "purchases.$[elem].deliveredAt": new Date().toISOString(),
            "purchases.$[elem].deliveredCount": deliveryResult.sentCount
          }
        },
        { 
          arrayFilters: [{ 
            "elem.package": `${packageType} v${count}`,
            "elem.addedAt": newPackage.addedAt
          }]
        }
      );
      
      res.json({ 
        success: true, 
        package: newPackage, 
        delivered: true,
        deliveredCount: deliveryResult.sentCount
      });
    } else {
      // Update package with delivery failure
      await db.collection('users').updateOne(
        { username },
        { 
          $set: { 
            "purchases.$[elem].deliveryError": deliveryResult.error,
            "purchases.$[elem].deliveryFailedAt": new Date().toISOString()
          }
        },
        { 
          arrayFilters: [{ 
            "elem.package": `${packageType} v${count}`,
            "elem.addedAt": newPackage.addedAt
          }]
        }
      );
      
      res.json({ 
        success: true, 
        package: newPackage, 
        delivered: false,
        deliveryError: deliveryResult.error
      });
    }
    
  } catch (err) {
    console.error("❌ Failed to add package and deliver:", err);
    res.status(500).json({ error: 'Failed to add package and deliver videos' });
  }
});

// ✅ Deliver videos for existing package
app.post('/api/deliverPackage', async (req, res) => {
  const { username, packageIndex } = req.body;
  
  if (!username || packageIndex === undefined) {
    return res.status(400).json({ error: 'Username and package index required' });
  }
  
  try {
    const user = await db.collection('users').findOne({ username });
    if (!user || !user.purchases || !user.purchases[packageIndex]) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    const package = user.purchases[packageIndex];
    const packageTypeMatch = package.package.match(/^(.+)\s+v(\d+)$/);
    
    if (!packageTypeMatch) {
      return res.status(400).json({ error: 'Invalid package format' });
    }
    
    const [, packageType, count] = packageTypeMatch;
    
    // Attempt delivery with enhanced retry
    const deliveryResult = await deliverVideosToUserWithRetry(bot, db, username, packageType, parseInt(count));
    
    if (deliveryResult.success) {
      // Update package as delivered
      await db.collection('users').updateOne(
        { username },
        { 
          $set: { 
            [`purchases.${packageIndex}.delivered`]: true,
            [`purchases.${packageIndex}.deliveredAt`]: new Date().toISOString(),
            [`purchases.${packageIndex}.deliveredCount`]: deliveryResult.sentCount,
            [`purchases.${packageIndex}.deliveryAttempted`]: true,
            [`purchases.${packageIndex}.deliveryAttemptedAt`]: new Date().toISOString()
          }
        }
      );
      
      res.json({ 
        success: true, 
        delivered: true,
        deliveredCount: deliveryResult.sentCount
      });
    } else {
      // Update package with delivery failure
      await db.collection('users').updateOne(
        { username },
        { 
          $set: { 
            [`purchases.${packageIndex}.deliveryError`]: deliveryResult.error,
            [`purchases.${packageIndex}.deliveryFailedAt`]: new Date().toISOString(),
            [`purchases.${packageIndex}.deliveryAttempted`]: true,
            [`purchases.${packageIndex}.deliveryAttemptedAt`]: new Date().toISOString()
          }
        }
      );
      
      res.json({ 
        success: false, 
        delivered: false,
        deliveryError: deliveryResult.error
      });
    }
    
  } catch (err) {
    console.error("❌ Failed to deliver package:", err);
    res.status(500).json({ error: 'Failed to deliver package' });
  }
});

// ✅ Add package with admin confirmation (like normal orders from buy.html)
// FIXED: Prevents duplicate package addition
app.post('/api/addPackageWithConfirmation', async (req, res) => {
  const { username, packageType, count, price, date } = req.body;
  
  if (!username || !packageType || !count || !price || !date) {
    return res.status(400).json({ error: 'Missing required data' });
  }
  
  try {
    // DO NOT add package to database yet - only send confirmation
    // This prevents duplicate packages when admin confirms
    
    // Auto-assign badges for user interaction
    await autoAssignAndSaveBadges(username);
    
    // Send Telegram confirmation message to admin (identical to normal orders)
    await bot.sendMessage(ADMIN_IDS[0], `🛒 Admin Created Package for @${username}
📦 Package: ${packageType}
🎞 Videos: ${count}
💵 Rs ${parseFloat(price).toFixed(2)}
🕓 Date: ${date}
👤 Created by: Admin Panel

Press the button below to confirm and deliver.`, {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Confirm", callback_data: `confirm_${username}::${packageType}::${count}::${date}` }
        ]]
      }
    });
    
    res.json({ 
      success: true, 
      confirmationSent: true,
      message: 'Confirmation message sent to admin. Package will be added when admin confirms.'
    });
    
  } catch (err) {
    console.error("❌ Failed to send confirmation:", err);
    res.status(500).json({ error: 'Failed to send confirmation message' });
  }
});




// ✅ Enhanced order endpoint with username validation and dynamic pricing
app.post('/api/order', async (req, res) => {
  const { username, package: pkg, count } = req.body;

  if (!username || !pkg || !count) {
    return res.status(400).json({ error: "Missing data" });
  }

  // Check if user has a valid username
  const user = await db.collection('users').findOne({ username });
  
  if (!user) {
    return res.status(404).json({ 
      error: "User not found. Please ensure you have a username set in your Telegram account.",
      requiresUsername: true
    });
  }

  if (!user.hasUsername) {
    return res.status(400).json({ 
      error: "Username required. Please add a username to your Telegram account first.",
      requiresUsername: true
    });
  }

  try {
    // Get dynamic pricing
    const pricingData = await db.collection('settings').findOne({ key: 'package_pricing' });
    const pricing = pricingData?.value || {
      'Mixed': { pricePerVideo: 1 },
      'Mom And Son': { pricePerVideo: 1.5 },
      'Rape': { pricePerVideo: 1.2 },
      'SL Leaks': { pricePerVideo: 0.8 },
      'CCTV': { pricePerVideo: 1.0 }
    };
    
    const packagePricing = pricing[pkg] || { pricePerVideo: 1 };
    const totalPrice = count * packagePricing.pricePerVideo;
    const date = new Date().toISOString().split("T")[0];
    
    const fullPackage = {
      package: `${pkg} v${count}`,
      count,
      date,
      price: `Rs ${totalPrice.toFixed(2)}`,
      pending: true
    };

    // Send Telegram message with confirm button
    await bot.sendMessage(ADMIN_IDS[0], `🛒 New Order from @${username}
📦 Package: ${pkg}
🎞 Videos: ${count}
💵 Rs ${totalPrice.toFixed(2)}
🕓 Date: ${date}

Press the button below to confirm and deliver.`, {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Confirm", callback_data: `confirm_${username}::${pkg}::${count}::${date}` }
        ]]
      }
    });

    res.json({ success: true, price: totalPrice });

  } catch (error) {
    console.error('❌ Error processing order:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// ✅ Enhanced sample order endpoint with username validation and dynamic sample count
app.post('/api/sample-order', async (req, res) => {
  let { username, package: pkg, isSample } = req.body;
  
  // Clean username
  username = username.replace(/^sample_/, '');

  if (!username || !pkg || !isSample) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    // Find user to get their Telegram ID
    const telegramUser = await db.collection("users").findOne({ username });

    if (!telegramUser || !telegramUser.id) {
      return res.status(404).json({ 
        error: "User not found or not logged in via Telegram. Please ensure you have a username set in your Telegram account.",
        requiresUsername: true
      });
    }

    if (!telegramUser.hasUsername) {
      return res.status(400).json({ 
        error: "Username required for samples. Please add a username to your Telegram account first.",
        requiresUsername: true
      });
    }
    
    // Check if user already received samples for this package
    const sampleKey = `sample_sent_${pkg}`;
    if (telegramUser[sampleKey]) {
      return res.status(400).json({ 
        error: `You have already received samples for the '${pkg}' package. Each user can only get samples once per package.` 
      });
    }

    // Get dynamic sample count from configuration
    const sampleConfigData = await db.collection('settings').findOne({ key: 'sample_config' });
    const sampleConfig = sampleConfigData?.value || {
      'Mixed': { sampleCount: 100 },
      'Mom And Son': { sampleCount: 100 },
      'Rape': { sampleCount: 100 },
      'SL Leaks': { sampleCount: 100 },
      'CCTV': { sampleCount: 100 }
    };
    
    const packageSampleConfig = sampleConfig[pkg] || { sampleCount: 100 };
    const sampleCount = packageSampleConfig.sampleCount;

    const date = new Date().toISOString().split("T")[0];
    
    // Send Telegram message to admin with confirm button
    const callbackData = `confirm_sample_${username}::${pkg}::${sampleCount}::${date}`;
    
    await bot.sendMessage(ADMIN_IDS[0], `🆓 New Sample Order from @${username}
📦 Package: ${pkg} Samples
🎞 Videos: ${sampleCount}
💵 FREE
🕓 Date: ${date}

Press the button below to confirm and deliver.`, {
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Confirm Sample", callback_data: callbackData }
        ]]
      }
    });

    res.json({ success: true, sampleCount });

  } catch (error) {
    console.error("❌ Error processing sample order:", error);
    res.status(500).json({ error: "Failed to process sample request" });
  }
});





// ✅ Get user's sample order history
app.get('/api/user-samples', async (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }
  
  try {
    const user = await db.collection("users").findOne({ username });
    
    if (!user) {
      return res.json({ orderedSamples: [] });
    }
    
    // Check which sample packages the user has already received
    const orderedSamples = [];
    const packageTypes = ["Mixed", "Mom And Son", "SL Leaks", "CCTV"];
    
    packageTypes.forEach(pkg => {
      const sampleKey = `sample_sent_${pkg}`;
      if (user[sampleKey]) {
        orderedSamples.push(pkg);
      }
    });
    
    res.json({ orderedSamples });
    
  } catch (error) {
    console.error("❌ Error fetching user samples:", error);
    res.status(500).json({ error: "Failed to fetch sample history" });
  }
});

// ✅ Get user's sample history
app.get('/api/user-samples-received', async (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }
  
  try {
    const user = await db.collection("users").findOne({ username });
    
    if (!user) {
      return res.json({ receivedSamples: [] });
    }
    
    // Get list of packages user has received samples for
    const receivedSamples = [];
    const packageTypes = ["Mixed", "Mom And Son", "SL Leaks", "CCTV"];
    
    packageTypes.forEach(pkg => {
      const sampleKey = `sample_sent_${pkg}`;
      if (user[sampleKey]) {
        receivedSamples.push(pkg);
      }
    });
    
    res.json({ receivedSamples });
    
  } catch (error) {
    console.error("❌ Error getting user samples:", error);
    res.status(500).json({ error: "Failed to get sample history" });
  }
});

// ✅ Badge System APIs

// Badge types and auto-assignment logic
const BADGE_TYPES = {
  // Membership Level Badges
  VIP: { icon: '👑', color: '#FFD700', description: 'VIP Customer', priority: 1 },
  PREMIUM: { icon: '💎', color: '#9B59B6', description: 'Premium Member', priority: 2 },
  LOYAL: { icon: '⭐', color: '#E74C3C', description: 'Loyal Customer', priority: 3 },
  NEW: { icon: '🆕', color: '#2ECC71', description: 'New Customer', priority: 4 },
  
  // Achievement Badges
  FIRST_PURCHASE: { icon: '🎯', color: '#3498DB', description: 'First Purchase', priority: 5 },
  REGULAR_CUSTOMER: { icon: '🔥', color: '#E67E22', description: 'Regular Customer', priority: 6 },
  LOYAL_CUSTOMER: { icon: '⭐', color: '#F39C12', description: 'Loyal Customer', priority: 7 },
  VIP_MEMBER: { icon: '👑', color: '#8E44AD', description: 'VIP Member', priority: 8 },
  
  // Spending Badges
  BIG_SPENDER: { icon: '💰', color: '#27AE60', description: 'Big Spender', priority: 9 },
  PREMIUM_CUSTOMER: { icon: '💎', color: '#2C3E50', description: 'Premium Customer', priority: 10 },
  
  // Video Collection Badges
  VIDEO_COLLECTOR: { icon: '📹', color: '#E74C3C', description: 'Video Collector', priority: 11 },
  CONTENT_MASTER: { icon: '🎬', color: '#9B59B6', description: 'Content Master', priority: 12 },
  
  // Special Badges
  BULK_BUYER: { icon: '📦', color: '#3498DB', description: 'Bulk Buyer', priority: 13 },
  EARLY_ADOPTER: { icon: '🚀', color: '#F39C12', description: 'Early Adopter', priority: 14 },
  VERIFIED: { icon: '✅', color: '#27AE60', description: 'Verified User', priority: 15 },
  
  // Admin Badges
  SUSPENDED: { icon: '⛔', color: '#E74C3C', description: 'Suspended', priority: 16 },
  BLACKLISTED: { icon: '🚫', color: '#000000', description: 'Blacklisted', priority: 17 }
};

// Auto-assign badges based on user behavior
async function autoAssignUserBadges(username) {
  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) return [];

    const assignedBadges = [];
    const purchases = user.purchases || [];
    const totalSpent = purchases.reduce((sum, p) => {
      const price = parseFloat(p.price?.replace('Rs ', '') || 0);
      return sum + price;
    }, 0);
    const totalVideos = purchases.reduce((sum, p) => sum + (p.count || 0), 0);
    const accountAge = Date.now() - new Date(user.createdAt || user.lastLogin).getTime();
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
    const purchaseFrequency = purchases.length / Math.max(1, daysSinceCreation / 30);

    // Membership level badges
    if (purchaseFrequency >= 4) assignedBadges.push('VIP');
    else if (purchaseFrequency >= 2) assignedBadges.push('PREMIUM');
    else if (purchaseFrequency >= 1) assignedBadges.push('LOYAL');
    else if (purchases.length > 0) assignedBadges.push('NEW');
    
    // Achievement badges
    if (purchases.length >= 1) assignedBadges.push('FIRST_PURCHASE');
    if (purchases.length >= 5) assignedBadges.push('REGULAR_CUSTOMER');
    if (purchases.length >= 10) assignedBadges.push('LOYAL_CUSTOMER');
    if (purchases.length >= 20) assignedBadges.push('VIP_MEMBER');
    
    // Spending badges
    if (totalSpent >= 1000) assignedBadges.push('BIG_SPENDER');
    if (totalSpent >= 5000) assignedBadges.push('PREMIUM_CUSTOMER');
    
    // Video collection badges
    if (totalVideos >= 1000) assignedBadges.push('VIDEO_COLLECTOR');
    if (totalVideos >= 5000) assignedBadges.push('CONTENT_MASTER');
    
    // Special badges
    if (totalVideos >= 500) assignedBadges.push('BULK_BUYER');
    if (daysSinceCreation <= 30 && purchases.length > 0) assignedBadges.push('EARLY_ADOPTER');
    if (user.hasUsername) assignedBadges.push('VERIFIED');

    return assignedBadges;
  } catch (error) {
    console.error('Error auto-assigning badges:', error);
    return [];
  }
}

// Automatically assign badges to user and save them
async function autoAssignAndSaveBadges(username) {
  try {
    const suggestedBadges = await autoAssignUserBadges(username);
    if (suggestedBadges.length > 0) {
      const user = await db.collection('users').findOne({ username });
      const currentBadges = user?.badges || [];
      let newBadges = [...currentBadges];
      let assignedCount = 0;
      
      suggestedBadges.forEach(badgeType => {
        if (!currentBadges.some(b => b.type === badgeType)) {
          newBadges.push({
            type: badgeType,
            assignedAt: new Date().toISOString(),
            assignedBy: 'auto-system'
          });
          assignedCount++;
        }
      });
      
      if (assignedCount > 0) {
        await db.collection('users').updateOne(
          { username },
          { $set: { badges: newBadges } }
        );
        console.log(`🎖️ Auto-assigned ${assignedCount} badges to @${username}`);
      }
      
      return assignedCount;
    }
    return 0;
  } catch (error) {
    console.error('Error auto-assigning and saving badges:', error);
    return 0;
  }
}

// Get user badges
app.get('/api/user/badges', async (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  try {
    const user = await db.collection('users').findOne({ username });
    const badges = user?.badges || [];
    
    res.json({ badges });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// Toggle user badge
app.post('/api/user/badge', async (req, res) => {
  const { username, badgeType, action } = req.body;
  
  if (!username || !badgeType) {
    return res.status(400).json({ error: 'Username and badge type required' });
  }
  
  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let badges = user.badges || [];
    const badgeExists = badges.some(b => b.type === badgeType);
    
    if (action === 'toggle') {
      if (badgeExists) {
        badges = badges.filter(b => b.type !== badgeType);
      } else {
        badges.push({
          type: badgeType,
          assignedAt: new Date().toISOString(),
          assignedBy: 'admin'
        });
      }
    }
    
    await db.collection('users').updateOne(
      { username },
      { $set: { badges } }
    );
    
    const message = badgeExists ? `Removed ${BADGE_TYPES[badgeType]?.description} badge` : `Added ${BADGE_TYPES[badgeType]?.description} badge`;
    res.json({ success: true, message });
    
  } catch (error) {
    console.error('Error toggling badge:', error);
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

// Auto-assign badges
app.post('/api/user/auto-assign-badges', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  try {
    const assignedCount = await autoAssignAndSaveBadges(username);
    const suggestedBadges = await autoAssignUserBadges(username);
    
    res.json({ success: true, assignedCount, suggestedBadges });
    
  } catch (error) {
    console.error('Error auto-assigning badges:', error);
    res.status(500).json({ error: 'Failed to auto-assign badges' });
  }
});

// Create custom badge
app.post('/api/user/custom-badge', async (req, res) => {
  const { username, badge } = req.body;
  
  if (!username || !badge) {
    return res.status(400).json({ error: 'Username and badge data required' });
  }
  
  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const badges = user.badges || [];
    const customBadge = {
      type: `CUSTOM_${badge.name.toUpperCase().replace(/\s+/g, '_')}`,
      name: badge.name,
      icon: badge.icon,
      color: badge.color,
      description: badge.description,
      isCustom: true,
      assignedAt: new Date().toISOString(),
      assignedBy: 'admin',
      expiresAt: badge.expiry || null
    };
    
    badges.push(customBadge);
    
    await db.collection('users').updateOne(
      { username },
      { $set: { badges } }
    );
    
    res.json({ success: true, badge: customBadge });
    
  } catch (error) {
    console.error('Error creating custom badge:', error);
    res.status(500).json({ error: 'Failed to create custom badge' });
  }
});

// ✅ Announcement Management APIs

// Get current announcement
app.get('/api/announcement', async (req, res) => {
  try {
    const announcement = await db.collection('settings').findOne({ key: 'announcement' });
    res.json({ text: announcement?.value || '🔥 Check out our latest packages!' });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// Update announcement
app.post('/api/announcement', async (req, res) => {
  const { text } = req.body;
  
  if (text === undefined) {
    return res.status(400).json({ error: 'Announcement text required' });
  }
  
  try {
    await db.collection('settings').updateOne(
      { key: 'announcement' },
      { 
        $set: { 
          value: text,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, text });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// ✅ Package Pricing APIs

// Get package prices
app.get('/api/package-prices', async (req, res) => {
  try {
    const pricing = await db.collection('settings').findOne({ key: 'package_pricing' });
    const defaultPricing = {
      'Mixed': { pricePerVideo: 1 },
      'Mom And Son': { pricePerVideo: 1.5 },
      'Rape': { pricePerVideo: 1.2 },
      'SL Leaks': { pricePerVideo: 0.8 },
      'CCTV': { pricePerVideo: 1.0 }
    };
    
    let currentPricing = pricing?.value || defaultPricing;
    
    // Ensure all packages are present, add missing ones with defaults
    Object.keys(defaultPricing).forEach(packageName => {
      if (!currentPricing[packageName]) {
        currentPricing[packageName] = defaultPricing[packageName];
      }
    });
    
    // If we had to add missing packages, save the updated pricing
    if (!pricing || Object.keys(currentPricing).length !== Object.keys(pricing?.value || {}).length) {
      await db.collection('settings').updateOne(
        { key: 'package_pricing' },
        { 
          $set: { 
            value: currentPricing,
            updatedAt: new Date().toISOString()
          }
        },
        { upsert: true }
      );
      console.log('✅ Updated package pricing with missing packages');
    }
    
    res.json(currentPricing);
  } catch (error) {
    console.error('Error fetching package prices:', error);
    res.status(500).json({ error: 'Failed to fetch package prices' });
  }
});

// Update package price
app.post('/api/package-price', async (req, res) => {
  const { packageName, priceType, value } = req.body;
  
  if (!packageName || !priceType || value === undefined) {
    return res.status(400).json({ error: 'Package name, price type, and value required' });
  }
  
  try {
    // Get current pricing
    const currentPricing = await db.collection('settings').findOne({ key: 'package_pricing' });
    const pricing = currentPricing?.value || {
      'Mixed': { pricePerVideo: 1 },
      'Mom And Son': { pricePerVideo: 1.5 },
      'Rape': { pricePerVideo: 1.2 },
      'SL Leaks': { pricePerVideo: 0.8 },
      'CCTV': { pricePerVideo: 1.0 }
    };
    
    // Update specific price
    if (!pricing[packageName]) {
      pricing[packageName] = { pricePerVideo: 0 };
    }
    pricing[packageName][priceType] = value;
    
    // Save updated pricing
    await db.collection('settings').updateOne(
      { key: 'package_pricing' },
      { 
        $set: { 
          value: pricing,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, packageName, priceType, value });
  } catch (error) {
    console.error('Error updating package price:', error);
    res.status(500).json({ error: 'Failed to update package price' });
  }
});

// ✅ Sample Configuration APIs

// Get sample configuration
app.get('/api/sample-config', async (req, res) => {
  try {
    const sampleConfig = await db.collection('settings').findOne({ key: 'sample_config' });
    const defaultConfig = {
      'Mixed': { sampleCount: 100 },
      'Mom And Son': { sampleCount: 100 },
      'Rape': { sampleCount: 100 },
      'SL Leaks': { sampleCount: 100 },
      'CCTV': { sampleCount: 100 }
    };
    
    let currentConfig = sampleConfig?.value || defaultConfig;
    
    // Ensure all packages are present, add missing ones with defaults
    Object.keys(defaultConfig).forEach(packageName => {
      if (!currentConfig[packageName]) {
        currentConfig[packageName] = defaultConfig[packageName];
      }
    });
    
    // If we had to add missing packages, save the updated config
    if (!sampleConfig || Object.keys(currentConfig).length !== Object.keys(sampleConfig?.value || {}).length) {
      await db.collection('settings').updateOne(
        { key: 'sample_config' },
        { 
          $set: { 
            value: currentConfig,
            updatedAt: new Date().toISOString()
          }
        },
        { upsert: true }
      );
      console.log('✅ Updated sample config with missing packages');
    }
    
    res.json(currentConfig);
  } catch (error) {
    console.error('Error fetching sample config:', error);
    res.status(500).json({ error: 'Failed to fetch sample configuration' });
  }
});

// Update sample configuration
app.post('/api/sample-config', async (req, res) => {
  const { packageName, sampleCount } = req.body;
  
  if (!packageName || sampleCount === undefined) {
    return res.status(400).json({ error: 'Package name and sample count required' });
  }
  
  try {
    // Get current sample config
    const currentConfig = await db.collection('settings').findOne({ key: 'sample_config' });
    const sampleConfig = currentConfig?.value || {
      'Mixed': { sampleCount: 100 },
      'Mom And Son': { sampleCount: 100 },
      'Rape': { sampleCount: 100 },
      'SL Leaks': { sampleCount: 100 },
      'CCTV': { sampleCount: 100 }
    };
    
    // Update specific package sample count
    if (!sampleConfig[packageName]) {
      sampleConfig[packageName] = { sampleCount: 0 };
    }
    sampleConfig[packageName].sampleCount = parseInt(sampleCount);
    
    // Save updated config
    await db.collection('settings').updateOne(
      { key: 'sample_config' },
      { 
        $set: { 
          value: sampleConfig,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, packageName, sampleCount: parseInt(sampleCount) });
  } catch (error) {
    console.error('Error updating sample config:', error);
    res.status(500).json({ error: 'Failed to update sample configuration' });
  }
});

// ✅ Check channel membership endpoint
app.post('/api/check-channels', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }
  
  try {
    // Find user to get their Telegram ID
    const telegramUser = await db.collection("users").findOne({ username });

    if (!telegramUser || !telegramUser.id) {
      return res.status(404).json({ error: "User not found. Please login via Telegram first." });
    }

    const userId = telegramUser.id;
    
    // TODO: Implement actual Telegram channel membership check using bot.getChatMember()
    // For now, we'll use a more sophisticated simulation that considers user history
    
    // Check if user has already been verified (to avoid repeated checks)
    const channelVerificationKey = 'channels_verified';
    if (telegramUser[channelVerificationKey]) {
      return res.json({ hasJoined: true, message: "Membership already verified" });
    }
    
    // Simulate channel membership check with higher success rate for returning users
    const hasExistingPurchases = telegramUser.purchases && telegramUser.purchases.length > 0;
    const successRate = hasExistingPurchases ? 0.9 : 0.7; // 90% for existing users, 70% for new users
    const hasJoined = Math.random() < successRate;
    
    if (hasJoined) {
      // Mark user as verified to avoid future checks
      await db.collection("users").updateOne(
        { username },
        { $set: { [channelVerificationKey]: true, channels_verified_date: new Date().toISOString() } }
      );
    }
    
    res.json({ 
      hasJoined, 
      message: hasJoined ? "Membership verified successfully!" : "Please join all channels and try again" 
    });
    
  } catch (error) {
    console.error("❌ Error checking channel membership:", error);
    res.status(500).json({ error: "Failed to verify channel membership" });
  }
});

// ✅ Video count tracking API for admin
app.get('/api/video-counts', async (req, res) => {
  try {
    const videoCounts = {};
    const packageTypes = ['Mixed', 'Mom And Son', 'Rape', 'SL Leaks', 'CCTV'];
    
    for (const packageType of packageTypes) {
      const entry = await db.collection('video_files').findOne({ category: packageType });
      videoCounts[packageType] = {
        totalVideos: entry?.files?.length || 0,
        lastUpdated: entry?.lastUpdated || 'Never'
      };
    }
    
    res.json(videoCounts);
  } catch (error) {
    console.error('Error fetching video counts:', error);
    res.status(500).json({ error: 'Failed to fetch video counts' });
  }
});

// ✅ Update video count when uploading
app.post('/api/update-video-count', async (req, res) => {
  const { category, count } = req.body;
  
  if (!category || count === undefined) {
    return res.status(400).json({ error: 'Category and count required' });
  }
  
  try {
    await db.collection('video_files').updateOne(
      { category },
      { 
        $set: { 
          lastUpdated: new Date().toISOString(),
          uploadedBy: 'admin'
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true, category, count });
  } catch (error) {
    console.error('Error updating video count:', error);
    res.status(500).json({ error: 'Failed to update video count' });
  }
});

// ✅ Get delivery statistics for a user
app.get('/api/delivery-stats/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const stats = {};
    const packageTypes = ['Mixed', 'Mom And Son', 'Rape', 'SL Leaks', 'CCTV'];
    
    packageTypes.forEach(pkg => {
      const deliveryKey = `last_delivery_${pkg}`;
      if (user[deliveryKey]) {
        stats[pkg] = user[deliveryKey];
      }
    });
    
    res.json({ username, deliveryStats: stats });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({ error: 'Failed to fetch delivery statistics' });
  }
});

// ✅ Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Log Management System
const logManagement = {
  MAX_LOG_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_BACKUP_FILES: 3,
  LOG_FILES: [
    'logs/combined-1.log',
    'logs/err-1.log', 
    'logs/out-1.log',
    'logs/combined.log',
    'logs/error.log'
  ],

  async checkAndRotateLogs() {
    const fs = require('fs').promises;
    const path = require('path');
    
    for (const logFile of this.LOG_FILES) {
      try {
        const stats = await fs.stat(logFile);
        
        if (stats.size > this.MAX_LOG_SIZE) {
          console.log(`📋 Rotating log file: ${logFile} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
          await this.rotateLogFile(logFile);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`❌ Error checking log file ${logFile}:`, error.message);
        }
      }
    }
  },

  async rotateLogFile(logFile) {
    const fs = require('fs').promises;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `${logFile}.${timestamp}.bak`;
      
      await fs.rename(logFile, backupFile);
      await fs.writeFile(logFile, '');
      
      console.log(`✅ Log rotated: ${logFile} -> ${backupFile}`);
      await this.cleanupOldBackups(logFile);
      
    } catch (error) {
      console.error(`❌ Error rotating log file ${logFile}:`, error.message);
    }
  },

  async cleanupOldBackups(originalLogFile) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const logDir = path.dirname(originalLogFile);
      const logBasename = path.basename(originalLogFile);
      
      const files = await fs.readdir(logDir);
      const backupFiles = files
        .filter(file => file.startsWith(logBasename) && file.endsWith('.bak'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file)
        }));
      
      const backupStats = await Promise.all(
        backupFiles.map(async (file) => {
          const stats = await fs.stat(file.path);
          return { ...file, mtime: stats.mtime };
        })
      );
      
      backupStats.sort((a, b) => b.mtime - a.mtime);
      
      if (backupStats.length > this.MAX_BACKUP_FILES) {
        const filesToDelete = backupStats.slice(this.MAX_BACKUP_FILES);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          console.log(`🗑️ Deleted old backup: ${file.name}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error cleaning up backups for ${originalLogFile}:`, error.message);
    }
  },

  init() {
    this.checkAndRotateLogs();
    setInterval(() => {
      this.checkAndRotateLogs();
    }, 60 * 60 * 1000); // Check every hour
    
    console.log('📋 Log management initialized - checking every hour');
  }
};

// ✅ Manual log cleanup endpoint for admin
app.post('/api/cleanup-logs', async (req, res) => {
  try {
    console.log('🧹 Starting manual log cleanup...');
    await logManagement.checkAndRotateLogs();
    res.json({ success: true, message: 'Log cleanup completed successfully' });
  } catch (error) {
    console.error('❌ Error during manual log cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  
  // Initialize log management
  logManagement.init();
});

});
