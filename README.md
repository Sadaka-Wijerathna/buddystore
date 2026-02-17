# BuddyStore - Professional Video Streaming Platform

A comprehensive video streaming and e-commerce platform with Telegram bot integration.

## 🚀 Features

- **Video Streaming**: Professional video delivery system with multiple package categories
- **Telegram Bot Integration**: Automated video delivery through Telegram
- **User Management**: Complete user dashboard with purchase history
- **Admin Panel**: Comprehensive admin controls for managing content and users
- **Auto-Retry Service**: Automatic retry mechanism for failed video deliveries
- **Broadcast System**: Send announcements to all users
- **Multiple Package Categories**: Mixed, Mom And Son, Rape, SL Leaks, CCTV

## 📋 Prerequisites

- Node.js >= 18.x
- MongoDB Atlas account
- Telegram Bot Token
- Vercel account (for deployment)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/Sadaka-Wijerathna/buddystore.git
cd buddystore
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with the following variables:

```env
BOT_TOKEN=your_telegram_bot_token
MONGO_URI=your_mongodb_connection_string
DEBUG=true

# Web Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret

# Auto-Retry Service Configuration
AUTO_RETRY_ENABLED=true
AUTO_RETRY_INTERVAL_MINUTES=15
AUTO_RETRY_MAX_ATTEMPTS=5
AUTO_RETRY_CLEANUP_DAYS=7
AUTO_RETRY_ADMIN_THRESHOLD=3
PRIMARY_ADMIN_ID=your_telegram_admin_id
AUTO_RETRY_BATCH_SIZE=10
AUTO_RETRY_DETAILED_LOGGING=true
AUTO_RETRY_NOTIFY_ADMIN_ERRORS=true
AUTO_RETRY_NOTIFICATION_COOLDOWN=6

# VPS Video Storage Path
VPS_VIDEO_PATH=/path/to/public/Videos
```

## 🚀 Deployment to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add all variables from your `.env` file

## 💻 Local Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 📱 Telegram Bot Commands

### User Commands:
- `/start` - Start the bot and get instructions
- `/help` - Show help menu with available options

### Admin Commands:
- `/manage` - Manage user packages
- `/uploadmixed` - Upload videos to Mixed category
- `/uploadmomandson` - Upload videos to Mom And Son category
- `/uploadrape` - Upload videos to Rape category
- `/uploadslleaks` - Upload videos to SL Leaks category
- `/uploadcctv` - Upload videos to CCTV category
- `/usercheck` - Analyze user database
- `/fixuserids` - Fix user ID format issues
- `/autoretry status` - Check auto-retry service status
- `/autoretry summary` - Get failed deliveries summary

## 🔧 Configuration

### MongoDB Collections:
- `users` - User information and purchase history
- `video_files` - Video file storage by category
- `bulk_orders` - Bulk order management
- `broadcast_logs` - Broadcast history
- `admin_notifications` - Admin notification logs
- `failed_deliveries` - Failed delivery tracking for auto-retry

### Admin IDs:
Update the `ADMIN_IDS` array in `server.js` with your Telegram user IDs:
```javascript
const ADMIN_IDS = [your_telegram_id_1, your_telegram_id_2];
```

## 📊 Project Structure

```
buddystore/
├── public/              # Static files
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   ├── images/         # Images
│   ├── pages/          # HTML pages
│   └── Videos/         # Video storage
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── validators/     # Input validation
├── server.js           # Main server file
├── package.json        # Dependencies
├── vercel.json         # Vercel configuration
└── .env               # Environment variables
```

## 🔒 Security

- All sensitive data is stored in environment variables
- JWT tokens for authentication
- Session management with express-session
- Rate limiting on API endpoints
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **BuddySeller** - Initial work

## 🙏 Acknowledgments

- Express.js for the web framework
- MongoDB for database
- Telegram Bot API for bot integration
- Vercel for hosting

## 📞 Support

For support, contact [@buddyseller](https://t.me/buddyseller) on Telegram.

## 🔄 Version History

- **2.0.0** - Major upgrade with Vercel deployment support
  - Updated all dependencies to latest versions
  - Added Vercel configuration
  - Improved documentation
  - Enhanced security features

- **1.0.0** - Initial release
  - Basic video streaming functionality
  - Telegram bot integration
  - User management system
