const TelegramBot = require('node-telegram-bot-api');
const { logger, logBot, logError } = require('../utils/logger');
const database = require('./database');

class TelegramService {
  constructor() {
    this.bot = null;
    this.ADMIN_IDS = [6539713872, 8042893066]; // Move to environment variables
    this.userSteps = {};
    this.uploadSessions = {};
    this.packageOptions = ['Mixed', 'Mom And Son', 'Rape', 'SL Leaks'];
  }

  initialize() {
    try {
      this.bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
      this.setupCommands();
      this.setupMessageHandlers();
      this.setupCallbackHandlers();
      logger.info('Telegram bot initialized successfully');
    } catch (error) {
      logError(error, { context: 'Telegram bot initialization' });
      throw error;
    }
  }

  setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      logBot('start_command', { chatId, username: msg.from.username });

      const welcomeMessage = `
<b>Instructions❕</b>

1st step : <a href="https://buddystore.duckdns.org">buddystore.duckdns.org</a> go to this website

2nd step : login to the website from your Telegram account

3rd step : Click <b>BUY MORE</b> and make an order

4th step : then come back again to Telegram and contact our official seller <a href="https://t.me/buddyseller">@buddyseller</a>

5th step : He knows what you ordered and will talk to you and get negotiations

6th step : After successful payment, you will get videos instantly through this bot

<b>Notice: Please use Chrome or another browser if you experience login problems </b>


<b>උපදෙස් ❕</b>

1 පියවර : <a href="https://buddystore.duckdns.org">buddystore.duckdns.org</a> මේ web site එකට යන්න

2 පියවර : ඔයාගේ telegram account එකෙන් web site එකට log වෙන්න

3 පියවර : <b>BUY MORE</b> කියන එක ක්ලික් කරලා ඔයාගේ order එක දාන්න

4 පියවර : ඊටපස්සෙ ආපහු telegram එකට ඇවිල්ලා අපේ official seller වන <a href="https://t.me/buddyseller">@buddyseller</a> සමග සම්බන්ධ වන්න

5 පියවර : ඔහු මේ වන විටත් ඔබ ලබාගත් order එක පිළිබඳව දන්නා අතර ඔහු සමඟ මිල අඩු කිරීම් පිළිබඳව සාකච්චා කරන්න

6 පියවර : ඉන්පසු ඔහුගෙන් මුදල් ගෙවීමේ ආකාර පිළිබඳව විමසන්න, සාර්ථක මුදල් ගෙවීමකින් පසුව ක්ෂණිකව ඔබට මෙම bot හරහා videos ලැබෙනු ඇත

<b>දැනුම්දීම් : Web Site එකට log වීමේදී යම් කිසි ගැටලුවක් ඇති වුවහොත් Chrome හෝ වෙනත් browser එකක් භාවිතා කරන්න </b>
      `;

      try {
        await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
      } catch (err) {
        logError(err, { context: 'Sending welcome message', chatId });
      }
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const isAdminUser = this.isAdmin(msg.from.id);

      logBot('help_command', { chatId, username: msg.from.username, isAdmin: isAdminUser });

      const buttons = [
        [{ text: "🏠 Visit Website", url: "https://buddystore.duckdns.org" }],
        [{ text: "🛍️ Contact Seller", url: "https://t.me/buddyseller" }]
      ];

      if (isAdminUser) {
        buttons.unshift(
          [{ text: "📤 Upload", callback_data: "gui_upload" }],
          [{ text: "🧹 Clear", callback_data: "gui_clear" }],
          [{ text: "🛠️ Manage Users", callback_data: "gui_manage" }]
        );
      }

      this.bot.sendMessage(chatId, `👋 <b>Welcome to the BuddyStore Bot Menu</b>\\n\\nChoose an option below:`, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: buttons
        }
      });
    });

    // Manage command
    this.bot.onText(/\/manage/, (msg) => {
      if (!this.isAdmin(msg.from.id)) {
        return this.bot.sendMessage(msg.chat.id, "❌ You're not authorized");
      }

      logBot('manage_command', { chatId: msg.chat.id, username: msg.from.username });

      this.userSteps[msg.chat.id] = { step: 'awaiting_username' };
      this.bot.sendMessage(msg.chat.id, '👤 Send the @username of the buyer:');
    });

    // Upload commands
    this.setupUploadCommands();
    
    // Clear commands
    this.setupClearCommands();
  }

  setupUploadCommands() {
    const categories = [
      { cmd: 'uploadmixed', category: 'Mixed' },
      { cmd: 'uploadmomandson', category: 'Mom And Son' },
      { cmd: 'uploadrape', category: 'Rape' },
      { cmd: 'uploadslleaks', category: 'SL Leaks' }
    ];

    categories.forEach(({ cmd, category }) => {
      this.bot.onText(new RegExp(`^/${cmd}$`), (msg) => {
        if (!this.isAdmin(msg.from.id)) return;
        
        this.uploadSessions[msg.chat.id] = { active: true, category };
        this.bot.sendMessage(msg.chat.id, `📥 Upload started for category: ${category}.`);
        
        logBot('upload_start', { chatId: msg.chat.id, category });
      });

      // End upload commands
      const endCmd = cmd.replace('upload', 'end');
      this.bot.onText(new RegExp(`^/${endCmd}$`), (msg) => {
        if (!this.isAdmin(msg.from.id)) return;
        
        this.uploadSessions[msg.chat.id] = null;
        this.bot.sendMessage(msg.chat.id, `✅ Upload ended for '${category}'`);
        
        logBot('upload_end', { chatId: msg.chat.id, category });
      });
    });
  }

  setupClearCommands() {
    // ✅ Add Clear Command Helper (EXACTLY like original)
    const addClearCommand = (cmd, category) => {
      this.bot.onText(new RegExp(`^/${cmd}$`), async (msg) => {
        if (!this.isAdmin(msg.from.id)) {
          return this.bot.sendMessage(msg.chat.id, "❌ You're not authorized.");
        }

        try {
          await database.clearVideoFiles(category);
          this.bot.sendMessage(msg.chat.id, `🗑️ Cleared all video file IDs for '${category}'.`);
          logBot('clear_command', { chatId: msg.chat.id, category });
        } catch (err) {
          logError(err, { context: 'Clearing video files', category });
          this.bot.sendMessage(msg.chat.id, "❌ Failed to clear video files.");
        }
      });
    };

    // ✅ Register actual clear commands (EXACTLY like original)
    addClearCommand("clearmixed", "Mixed");
    addClearCommand("clearrape", "Rape");
    addClearCommand("clearmomandson", "Mom And Son");
    addClearCommand("clearslleaks", "SL Leaks");
  }

  setupMessageHandlers() {
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const step = this.userSteps[chatId];
      const session = this.uploadSessions[chatId];

      try {
        // ✅ Handle upload session (video saving) - EXACTLY like original
        if (session && session.active && (msg.video || msg.document)) {
          await this.handleVideoUpload(msg, session);
          return;
        }

        // Ignore commands
        if (msg.text?.startsWith('/')) return;

        // Handle package management steps
        if (step) {
          await this.handleManagementStep(msg, step);
        }
      } catch (error) {
        logError(error, { context: 'Message handling', chatId, messageType: msg.video ? 'video' : 'text' });
      }
    });
  }

  async handleVideoUpload(msg, session) {
    const fileId = msg.video?.file_id || msg.document?.file_id;
    const chatId = msg.chat.id;

    if (fileId) {
      try {
        await database.addVideoFile(session.category, fileId);

        // Count uploaded videos in session
        if (!session.uploadCount) session.uploadCount = 1;
        else session.uploadCount++;

        // Send update only every 100 videos (EXACTLY like original)
        if (session.uploadCount % 100 === 0) {
          await this.bot.sendMessage(chatId, `✅ Saved ${session.uploadCount} videos to '${session.category}'`);
        }

        logBot('video_uploaded', { 
          chatId, 
          category: session.category, 
          count: session.uploadCount 
        });
      } catch (error) {
        logError(error, { context: 'Video upload', chatId, category: session.category });
      }
    }
  }

  async handleManagementStep(msg, step) {
    const chatId = msg.chat.id;
    const input = msg.text;

    try {
      switch (step.step) {
        case 'awaiting_username':
          step.username = input.replace('@', '');
          step.step = 'awaiting_action';
          return this.bot.sendMessage(chatId, `What do you want to do for @${step.username}?`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🟩 Add Package", callback_data: "add_package" }],
                [{ text: "❌ Remove Package", callback_data: "remove_package" }],
                [{ text: "📦 Show List", callback_data: "show_list" }]
              ]
            }
          });

        case 'awaiting_video_count':
          step.count = parseInt(input);
          step.step = 'awaiting_date';
          return this.bot.sendMessage(chatId, `📅 Send custom date or type "today":`);

        case 'awaiting_date':
          step.date = input.toLowerCase() === 'today' ? new Date().toISOString().split('T')[0] : input;
          step.step = 'awaiting_price';
          return this.bot.sendMessage(chatId, `💰 Send total price for ${step.count} videos:`);

        case 'awaiting_price':
          await this.handlePriceStep(msg, step);
          break;

        case 'awaiting_remove_index':
          await this.handleRemovePackage(msg, step);
          break;
      }
    } catch (error) {
      logError(error, { context: 'Management step handling', chatId, step: step.step });
    }
  }

  async handlePriceStep(msg, step) {
    const chatId = msg.chat.id;
    const input = msg.text;

    step.price = `Rs ${parseFloat(input).toFixed(2)}`;
    const fullPackage = {
      package: `${step.package} v${step.count}`,
      count: step.count,
      date: step.date,
      price: step.price
    };

    await database.addPurchase(step.username, fullPackage);

    this.bot.sendMessage(chatId, `✅ Added package: ${fullPackage.package} to @${step.username}`);
    step.step = 'awaiting_action';
    
    this.bot.sendMessage(chatId, `What would you like to do for @${step.username}?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🟩 Add Package", callback_data: "add_package" }],
          [{ text: "❌ Remove Package", callback_data: "remove_package" }],
          [{ text: "📦 Show List", callback_data: "show_list" }]
        ]
      }
    });

    logBot('package_added', { 
      chatId, 
      username: step.username, 
      package: fullPackage.package 
    });
  }

  async handleRemovePackage(msg, step) {
    const chatId = msg.chat.id;
    const index = parseInt(msg.text) - 1;

    try {
      await database.deletePurchase(step.username, index);
      
      this.bot.sendMessage(chatId, `🗑️ Package removed successfully`);
      step.step = 'awaiting_action';
      
      this.bot.sendMessage(chatId, `What would you like to do for @${step.username}?`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🟩 Add Package", callback_data: "add_package" }],
            [{ text: "❌ Remove Package", callback_data: "remove_package" }],
            [{ text: "📦 Show List", callback_data: "show_list" }]
          ]
        }
      });

      logBot('package_removed', { 
        chatId, 
        username: step.username, 
        index 
      });
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Failed to remove package`);
      logError(error, { context: 'Package removal', username: step.username, index });
    }
  }

  setupCallbackHandlers() {
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;

      try {
        logBot('callback_query', { chatId, data });

        if (data.startsWith("confirm_")) {
          await this.handleConfirmOrder(query);
        } else {
          await this.handleOtherCallbacks(query);
        }
      } catch (error) {
        logError(error, { context: 'Callback handling', chatId, data });
        await this.bot.answerCallbackQuery(query.id, { text: "❌ An error occurred" });
      }
    });
  }

  async handleConfirmOrder(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
      const payload = data.replace("confirm_", "");
      const parts = payload.split("::");
      
      if (parts.length !== 4) {
        throw new Error("Invalid confirm payload");
      }

      const [username, pkg, countStr, date] = parts;
      const count = parseInt(countStr);
      
      if (!username || !pkg || isNaN(count)) {
        throw new Error("Invalid confirm data");
      }

      const fullPackage = {
        package: `${pkg} v${count}`,
        count,
        date,
        price: `Rs ${count}.00`
      };

      await database.addPurchase(username, fullPackage);
      await this.bot.answerCallbackQuery(query.id, { text: "✅ Confirmed!" });
      await this.bot.sendMessage(chatId, `✅ Package confirmed and added to @${username}'s dashboard!\\n📤 Sending videos...`);

      // ✅ Send videos to user (EXACTLY like original)
      await this.sendVideosToUser(username, pkg, count, chatId);

      logBot('order_confirmed', { 
        chatId, 
        username, 
        package: pkg, 
        count 
      });
    } catch (error) {
      logError(error, { context: 'Order confirmation', chatId });
      await this.bot.answerCallbackQuery(query.id, { text: "❌ Error confirming order" });
    }
  }

  async sendVideosToUser(username, pkg, count, adminChatId) {
    try {
      // Find user chat ID by Telegram username (EXACTLY like original)
      const user = await database.getUserByUsername(username);
      
      if (!user || !user.id) {
        await this.bot.sendMessage(adminChatId, `⚠️ Can't find chat ID of @${username}, videos not sent.`);
        return;
      }

      const buyerId = user.id;
      const sentVideoIds = new Set(user[`sent_${pkg}`] || []);
      const availableFiles = await database.getVideoFiles(pkg);
      
      if (availableFiles.length === 0) {
        await this.bot.sendMessage(adminChatId, `⚠️ No videos found in '${pkg}' package.`);
        return;
      }

      const newFiles = availableFiles.filter(id => !sentVideoIds.has(id));
      const videosToSend = newFiles.slice(0, count);

      if (videosToSend.length === 0) {
        await this.bot.sendMessage(adminChatId, `⚠️ No new videos available to send for @${username}.`);
        return;
      }

      // ✅ Send videos with delay (EXACTLY like original)
      for (const fileId of videosToSend) {
        try {
          await this.bot.sendVideo(buyerId, fileId);
          sentVideoIds.add(fileId);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        } catch (err) {
          logError(err, { context: 'Sending individual video', fileId, buyerId });
        }
      }

      // Update sent videos record
      await database.getDb().collection("users").updateOne(
        { username },
        { $set: { [`sent_${pkg}`]: Array.from(sentVideoIds) } }
      );

      await this.bot.sendMessage(adminChatId, `📦 Sent ${videosToSend.length} videos to @${username}`);
      await this.bot.sendMessage(buyerId, `🎉 You've received ${videosToSend.length} new videos from the '${pkg}' package! Enjoy!`);

      logBot('videos_sent', { 
        username, 
        package: pkg, 
        count: videosToSend.length 
      });
    } catch (error) {
      logError(error, { context: 'Sending videos to user', username, pkg });
      await this.bot.sendMessage(adminChatId, "❌ Failed to send videos.");
    }
  }

  async handleOtherCallbacks(query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    const step = this.userSteps[chatId];

    // Handle GUI callbacks
    if (data === "gui_upload") {
      return this.bot.sendMessage(chatId, "📤 Choose a category to upload:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Mixed", callback_data: "upload_mixed" }],
            [{ text: "Mom And Son", callback_data: "upload_momandson" }],
            [{ text: "Rape", callback_data: "upload_rape" }],
            [{ text: "SL Leaks", callback_data: "upload_slleaks" }]
          ]
        }
      });
    }

    if (data.startsWith("upload_")) {
      const categoryMap = {
        mixed: "Mixed",
        momandson: "Mom And Son",
        rape: "Rape",
        slleaks: "SL Leaks"
      };
      const cmd = data.replace("upload_", "");
      const category = categoryMap[cmd];
      this.uploadSessions[chatId] = { active: true, category };
      return this.bot.sendMessage(chatId, `📥 Upload started for ${category}. Send videos now. Type /end${cmd} to finish.`);
    }

    if (data === "gui_clear") {
      return this.bot.sendMessage(chatId, "🧹 Choose a category to clear:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Mixed", callback_data: "clear_Mixed" }],
            [{ text: "Mom And Son", callback_data: "clear_Mom And Son" }],
            [{ text: "Rape", callback_data: "clear_Rape" }],
            [{ text: "SL Leaks", callback_data: "clear_SL Leaks" }]
          ]
        }
      });
    }

    if (data.startsWith("clear_")) {
      const category = data.replace("clear_", "");
      try {
        await database.clearVideoFiles(category);
        this.bot.sendMessage(chatId, `✅ Cleared all videos in '${category}'`);
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Failed to clear '${category}'`);
      }
    }

    if (data === "gui_manage") {
      this.bot.sendMessage(chatId, `🔧 Send the @username of the user to manage:`);
      this.userSteps[chatId] = { step: 'awaiting_username' };
    }

    // Handle management callbacks
    if (step) {
      await this.handleManagementCallbacks(query, step);
    }
  }

  async handleManagementCallbacks(query, step) {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'add_package') {
      step.step = 'awaiting_package_type';
      return this.bot.sendMessage(chatId, '📦 Choose a package:', {
        reply_markup: {
          inline_keyboard: [
            this.packageOptions.map(pkg => ({ text: pkg, callback_data: `pkg_${pkg}` }))
          ]
        }
      });
    }

    if (data === 'remove_package') {
      step.step = 'awaiting_remove_index';
      
      try {
        const purchases = await database.getUserPurchases(step.username);
        
        if (purchases.length === 0) {
          return this.bot.sendMessage(chatId, `ℹ️ No packages found for @${step.username}`);
        }

        const list = purchases.map((p, i) =>
          `${i + 1}. ${p.package} (${p.count} vids, ${p.price} on ${p.date})`
        ).join('\\n');

        return this.bot.sendMessage(chatId, `📦 Packages for @${step.username}:\\n\\n${list}\\n\\nSend number to remove:`);
      } catch (error) {
        logError(error, { context: 'Getting packages for removal', username: step.username });
        return this.bot.sendMessage(chatId, `❌ Error retrieving packages`);
      }
    }

    if (data === 'show_list') {
      try {
        const purchases = await database.getUserPurchases(step.username);
        
        if (purchases.length === 0) {
          return this.bot.sendMessage(chatId, `ℹ️ No packages found for @${step.username}`);
        }

        const list = purchases.map((p, i) =>
          `${i + 1}. ${p.package} (${p.count} vids, ${p.price} on ${p.date})`
        ).join('\\n');

        return this.bot.sendMessage(chatId, `📦 Packages for @${step.username}:\\n\\n${list}`);
      } catch (error) {
        logError(error, { context: 'Showing package list', username: step.username });
        return this.bot.sendMessage(chatId, `❌ Error retrieving packages`);
      }
    }

    if (data.startsWith('pkg_')) {
      step.package = data.replace('pkg_', '');
      step.step = 'awaiting_video_count';
      return this.bot.sendMessage(chatId, `🎞️ How many videos for ${step.package}?`);
    }
  }

  isAdmin(userId) {
    return this.ADMIN_IDS.includes(userId);
  }

  async sendOrderNotification(orderData) {
    try {
      const { username, package: pkg, count, price, date } = orderData;
      
      const message = `🛒 New Order from @${username}
📦 Package: ${pkg}
🎞 Videos: ${count}
💵 ${price}
🕓 Date: ${date}

Press the button below to confirm and deliver.`;

      await this.bot.sendMessage(this.ADMIN_IDS[0], message, {
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Confirm", callback_data: `confirm_${username}::${pkg}::${count}::${date}` }
          ]]
        }
      });

      logBot('order_notification_sent', orderData);
    } catch (error) {
      logError(error, { context: 'Sending order notification', orderData });
      throw error;
    }
  }

  getBot() {
    return this.bot;
  }
}

module.exports = new TelegramService();