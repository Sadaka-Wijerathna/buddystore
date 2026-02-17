const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const router = express.Router();

// Database for storing likes/dislikes and video stats
const dbPath = path.join(__dirname, '../../data');
const videoStatsFile = path.join(dbPath, 'video-stats.json');
const userInteractionsFile = path.join(dbPath, 'user-interactions.json');

// Ensure data directory exists
if (!fsSync.existsSync(dbPath)) {
    fsSync.mkdirSync(dbPath, { recursive: true });
}

// Initialize database files if they don't exist
if (!fsSync.existsSync(videoStatsFile)) {
    fsSync.writeFileSync(videoStatsFile, JSON.stringify({}));
}

if (!fsSync.existsSync(userInteractionsFile)) {
    fsSync.writeFileSync(userInteractionsFile, JSON.stringify({}));
}

// Helper functions for database operations
function loadVideoStats() {
    try {
        const data = fsSync.readFileSync(videoStatsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading video stats:', error);
        return {};
    }
}

function saveVideoStats(stats) {
    try {
        fsSync.writeFileSync(videoStatsFile, JSON.stringify(stats, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving video stats:', error);
        return false;
    }
}

function loadUserInteractions() {
    try {
        const data = fsSync.readFileSync(userInteractionsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading user interactions:', error);
        return {};
    }
}

function saveUserInteractions(interactions) {
    try {
        fsSync.writeFileSync(userInteractionsFile, JSON.stringify(interactions, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving user interactions:', error);
        return false;
    }
}

// Get or initialize video stats
function getVideoStats(videoId) {
    const stats = loadVideoStats();
    if (!stats[videoId]) {
        stats[videoId] = {
            likes: Math.floor(Math.random() * 500) + 50, // Start with random likes
            dislikes: Math.floor(Math.random() * 20) + 5, // Start with random dislikes
            views: Math.floor(Math.random() * 10000) + 1000 // Start with random views
        };
        saveVideoStats(stats);
    }
    return stats[videoId];
}

// VPS video storage path - you can change this to your actual VPS path
const VPS_VIDEO_PATH = process.env.VPS_VIDEO_PATH || path.join(__dirname, '../../Videos');
console.log('📁 VPS Video Path:', VPS_VIDEO_PATH);
console.log('📁 Path exists:', fsSync.existsSync(VPS_VIDEO_PATH));

// Test path access on startup
try {
    if (fsSync.existsSync(VPS_VIDEO_PATH)) {
        const testRead = fsSync.readdirSync(VPS_VIDEO_PATH);
        console.log('✅ Successfully read video directory. Found:', testRead.length, 'items');
        console.log('📂 Items:', testRead);
    } else {
        console.error('❌ Video directory does not exist:', VPS_VIDEO_PATH);
    }
} catch (error) {
    console.error('❌ Error accessing video directory:', error.message);
}

// Supported video formats
const SUPPORTED_FORMATS = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm'];

// Helper function to get video duration (basic implementation)
function getVideoDuration(filePath) {
    try {
        // This is a placeholder - in production you might want to use ffprobe
        // For now, we'll return a random duration for demo purposes
        const durations = ['1:30', '2:15', '3:45', '4:20', '2:50', '1:45', '3:10'];
        return durations[Math.floor(Math.random() * durations.length)];
    } catch (error) {
        return '0:00';
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to scan directory for videos
async function scanVideoDirectory(categoryPath, category) {
    try {
        const files = await fs.readdir(categoryPath);
        const videos = [];

        for (const file of files) {
            const filePath = path.join(categoryPath, file);
            const ext = path.extname(file).toLowerCase();
            
            if (SUPPORTED_FORMATS.includes(ext)) {
                try {
                    const stats = await fs.stat(filePath);
                    const video = {
                        id: `${category}_${file.replace(ext, '')}`.replace(/[^a-zA-Z0-9_]/g, '_'),
                        title: `${category.replace(/_/g, ' ')} - ${file.replace(ext, '').replace(/_/g, ' ')}`,
                        category: category,
                        filename: file,
                        filePath: filePath,
                        duration: getVideoDuration(filePath),
                        size: formatFileSize(stats.size),
                        uploadDate: stats.mtime.toISOString(),
                        description: `Free preview video from ${category.replace(/_/g, ' ')} category`,
                        channelName: 'BuddyStore'
                    };
                    videos.push(video);
                } catch (statError) {
                    console.warn(`Could not get stats for ${file}:`, statError.message);
                }
            }
        }

        return videos;
    } catch (error) {
        console.warn(`Could not scan directory ${categoryPath}:`, error.message);
        return [];
    }
}

// GET /api/videos - List all videos from VPS storage
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const categories = ['Mixed', 'Mom_And_Son', 'Rape', 'SL_Leaks', 'CCTV'];
        let allVideos = [];

        // Scan each category directory
        for (const cat of categories) {
            if (category && category !== 'all' && category !== cat) {
                continue; // Skip if filtering by specific category
            }

            const categoryPath = path.join(VPS_VIDEO_PATH, cat);
            
            // Check if directory exists
            try {
                await fs.access(categoryPath);
                const categoryVideos = await scanVideoDirectory(categoryPath, cat);
                allVideos = allVideos.concat(categoryVideos);
            } catch (error) {
                console.warn(`Category directory ${cat} not found or not accessible`);
            }
        }

        // Sort videos by upload date (newest first)
        allVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        res.json(allVideos);
    } catch (error) {
        console.error('Error listing videos:', error);
        res.status(500).json({ error: 'Failed to list videos' });
    }
});

// GET /api/videos/:id/stream - Stream video file
router.get('/:id/stream', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the video file by scanning directories
        const categories = ['Mixed', 'Mom_And_Son', 'Rape', 'SL_Leaks', 'CCTV'];
        let videoPath = null;

        for (const category of categories) {
            const categoryPath = path.join(VPS_VIDEO_PATH, category);
            
            try {
                const files = await fs.readdir(categoryPath);
                
                for (const file of files) {
                    const fileId = `${category}_${file.replace(path.extname(file), '')}`.replace(/[^a-zA-Z0-9_]/g, '_');
                    
                    if (fileId === id) {
                        videoPath = path.join(categoryPath, file);
                        break;
                    }
                }
                
                if (videoPath) break;
            } catch (error) {
                continue;
            }
        }

        if (!videoPath || !fsSync.existsSync(videoPath)) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const stat = fsSync.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Support for video seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const file = fsSync.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'public, max-age=3600'
            };
            
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Stream entire file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'public, max-age=3600'
            };
            
            res.writeHead(200, head);
            fsSync.createReadStream(videoPath).pipe(res);
        }

        console.log(`Video streamed: ${videoPath}`);
    } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).json({ error: 'Failed to stream video' });
    }
});

// GET /api/videos/:id/thumbnail - Get video thumbnail
router.get('/:id/thumbnail', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if thumbnail exists in Thumbnails directory
        const thumbnailPath = path.join(VPS_VIDEO_PATH, 'Thumbnails', `${id}.jpg`);
        
        if (fsSync.existsSync(thumbnailPath)) {
            res.sendFile(thumbnailPath);
        } else {
            // Return a default thumbnail or 404
            res.status(404).json({ error: 'Thumbnail not found' });
        }
    } catch (error) {
        console.error('Error getting thumbnail:', error);
        res.status(500).json({ error: 'Failed to get thumbnail' });
    }
});

// GET /api/videos/categories - Get available categories
router.get('/categories', async (req, res) => {
    try {
        const categories = ['Mixed', 'Mom_And_Son', 'Rape', 'SL_Leaks', 'CCTV'];
        const availableCategories = [];

        for (const category of categories) {
            const categoryPath = path.join(VPS_VIDEO_PATH, category);
            
            try {
                await fs.access(categoryPath);
                const files = await fs.readdir(categoryPath);
                const videoCount = files.filter(file => 
                    SUPPORTED_FORMATS.includes(path.extname(file).toLowerCase())
                ).length;
                
                if (videoCount > 0) {
                    availableCategories.push({
                        name: category,
                        displayName: category.replace('_', ' & '),
                        videoCount: videoCount
                    });
                }
            } catch (error) {
                // Category directory doesn't exist or is not accessible
            }
        }

        res.json(availableCategories);
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// GET /api/videos/stats - Get video statistics
router.get('/stats', async (req, res) => {
    try {
        const categories = ['Mixed', 'Mom_And_Son', 'Rape', 'SL_Leaks', 'CCTV'];
        const stats = {
            totalVideos: 0,
            totalSize: 0,
            categories: {}
        };

        for (const category of categories) {
            const categoryPath = path.join(VPS_VIDEO_PATH, category);
            
            try {
                const files = await fs.readdir(categoryPath);
                let categorySize = 0;
                let categoryCount = 0;

                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    
                    if (SUPPORTED_FORMATS.includes(ext)) {
                        try {
                            const filePath = path.join(categoryPath, file);
                            const stat = await fs.stat(filePath);
                            categorySize += stat.size;
                            categoryCount++;
                        } catch (statError) {
                            // Skip files that can't be accessed
                        }
                    }
                }

                if (categoryCount > 0) {
                    stats.categories[category] = {
                        count: categoryCount,
                        size: formatFileSize(categorySize)
                    };
                    stats.totalVideos += categoryCount;
                    stats.totalSize += categorySize;
                }
            } catch (error) {
                // Category directory doesn't exist
            }
        }

        stats.totalSize = formatFileSize(stats.totalSize);
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// POST /api/videos/:id/view - Log video view (for analytics)
router.post('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const { timestamp } = req.body;
        
        // Log the view and increment view count
        const stats = loadVideoStats();
        if (!stats[id]) {
            stats[id] = getVideoStats(id);
        }
        stats[id].views = (stats[id].views || 0) + 1;
        saveVideoStats(stats);
        
        console.log(`Video view logged: ${id} at ${timestamp || new Date().toISOString()}`);
        
        res.json({ success: true, views: stats[id].views });
    } catch (error) {
        console.error('Error logging view:', error);
        res.status(500).json({ error: 'Failed to log view' });
    }
});

// POST /api/video/like - Like a video
router.post('/like', async (req, res) => {
    try {
        const { videoId, username } = req.body;
        
        if (!videoId || !username) {
            return res.status(400).json({ error: 'Video ID and username are required' });
        }
        
        const interactions = loadUserInteractions();
        const stats = loadVideoStats();
        
        // Initialize user interactions if not exists
        if (!interactions[username]) {
            interactions[username] = {};
        }
        
        // Initialize video stats if not exists
        if (!stats[videoId]) {
            stats[videoId] = getVideoStats(videoId);
        }
        
        const userVideoInteraction = interactions[username][videoId] || {};
        const wasLiked = userVideoInteraction.liked || false;
        const wasDisliked = userVideoInteraction.disliked || false;
        
        // Toggle like
        if (wasLiked) {
            // Remove like
            userVideoInteraction.liked = false;
            stats[videoId].likes = Math.max(0, stats[videoId].likes - 1);
        } else {
            // Add like
            userVideoInteraction.liked = true;
            stats[videoId].likes = (stats[videoId].likes || 0) + 1;
            
            // Remove dislike if it was disliked
            if (wasDisliked) {
                userVideoInteraction.disliked = false;
                stats[videoId].dislikes = Math.max(0, stats[videoId].dislikes - 1);
            }
        }
        
        // Save interactions
        interactions[username][videoId] = userVideoInteraction;
        saveUserInteractions(interactions);
        saveVideoStats(stats);
        
        console.log(`👍 User @${username} ${userVideoInteraction.liked ? 'liked' : 'unliked'} video ${videoId}`);
        
        res.json({
            success: true,
            liked: userVideoInteraction.liked,
            disliked: userVideoInteraction.disliked,
            totalLikes: stats[videoId].likes,
            totalDislikes: stats[videoId].dislikes
        });
        
    } catch (error) {
        console.error('Error handling like:', error);
        res.status(500).json({ error: 'Failed to process like' });
    }
});

// POST /api/video/dislike - Dislike a video
router.post('/dislike', async (req, res) => {
    try {
        const { videoId, username } = req.body;
        
        if (!videoId || !username) {
            return res.status(400).json({ error: 'Video ID and username are required' });
        }
        
        const interactions = loadUserInteractions();
        const stats = loadVideoStats();
        
        // Initialize user interactions if not exists
        if (!interactions[username]) {
            interactions[username] = {};
        }
        
        // Initialize video stats if not exists
        if (!stats[videoId]) {
            stats[videoId] = getVideoStats(videoId);
        }
        
        const userVideoInteraction = interactions[username][videoId] || {};
        const wasLiked = userVideoInteraction.liked || false;
        const wasDisliked = userVideoInteraction.disliked || false;
        
        // Toggle dislike
        if (wasDisliked) {
            // Remove dislike
            userVideoInteraction.disliked = false;
            stats[videoId].dislikes = Math.max(0, stats[videoId].dislikes - 1);
        } else {
            // Add dislike
            userVideoInteraction.disliked = true;
            stats[videoId].dislikes = (stats[videoId].dislikes || 0) + 1;
            
            // Remove like if it was liked
            if (wasLiked) {
                userVideoInteraction.liked = false;
                stats[videoId].likes = Math.max(0, stats[videoId].likes - 1);
            }
        }
        
        // Save interactions
        interactions[username][videoId] = userVideoInteraction;
        saveUserInteractions(interactions);
        saveVideoStats(stats);
        
        console.log(`👎 User @${username} ${userVideoInteraction.disliked ? 'disliked' : 'undisliked'} video ${videoId}`);
        
        res.json({
            success: true,
            liked: userVideoInteraction.liked,
            disliked: userVideoInteraction.disliked,
            totalLikes: stats[videoId].likes,
            totalDislikes: stats[videoId].dislikes
        });
        
    } catch (error) {
        console.error('Error handling dislike:', error);
        res.status(500).json({ error: 'Failed to process dislike' });
    }
});

// GET /api/video/:id/interactions - Get user's interactions with a video
router.get('/:id/interactions', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }
        
        const interactions = loadUserInteractions();
        const stats = loadVideoStats();
        
        const userInteraction = interactions[username]?.[id] || {};
        const videoStats = stats[id] || getVideoStats(id);
        
        res.json({
            liked: userInteraction.liked || false,
            disliked: userInteraction.disliked || false,
            totalLikes: videoStats.likes,
            totalDislikes: videoStats.dislikes,
            totalViews: videoStats.views
        });
        
    } catch (error) {
        console.error('Error getting interactions:', error);
        res.status(500).json({ error: 'Failed to get interactions' });
    }
});

// GET /api/video/:id/stats - Get video statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const stats = getVideoStats(id);
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting video stats:', error);
        res.status(500).json({ error: 'Failed to get video stats' });
    }
});

// GET /api/videos/file/:category/:filename - Direct file serving with proper streaming
router.get('/file/:category/:filename', async (req, res) => {
    try {
        const { category, filename } = req.params;
        let videoPath = path.join(VPS_VIDEO_PATH, category, filename);
        
        console.log('📹 Direct video request:', {
            category,
            filename,
            fullPath: videoPath,
            exists: fsSync.existsSync(videoPath)
        });
        
        // If the exact file doesn't exist, try to find it with different extensions or naming
        if (!fsSync.existsSync(videoPath)) {
            console.log('🔍 File not found, searching for alternatives...');
            
            // Try to find the file in the category directory
            const categoryPath = path.join(VPS_VIDEO_PATH, category);
            if (fsSync.existsSync(categoryPath)) {
                const files = fsSync.readdirSync(categoryPath);
                console.log('📁 Available files in', category, ':', files);
                
                // Look for exact match first
                let foundFile = files.find(file => file === filename);
                
                // If not found, try without extension and add .mp4
                if (!foundFile) {
                    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
                    foundFile = files.find(file => file === `${nameWithoutExt}.mp4`);
                }
                
                // If still not found, try to match by number (e.g., "2.mp4" for "2.mp4")
                if (!foundFile) {
                    const numberMatch = filename.match(/\d+/);
                    if (numberMatch) {
                        foundFile = files.find(file => file === `${numberMatch[0]}.mp4`);
                    }
                }
                
                if (foundFile) {
                    videoPath = path.join(categoryPath, foundFile);
                    console.log('✅ Found alternative file:', foundFile);
                } else {
                    console.error('❌ No matching file found for:', filename);
                    return res.status(404).json({ 
                        error: 'Video file not found',
                        requested: filename,
                        available: files
                    });
                }
            } else {
                console.error('❌ Category directory not found:', categoryPath);
                return res.status(404).json({ error: 'Category directory not found' });
            }
        }
        
        if (!fsSync.existsSync(videoPath)) {
            console.error('❌ Final video file not found:', videoPath);
            return res.status(404).json({ error: 'Video file not found' });
        }

        const stat = fsSync.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        console.log('📹 Serving video:', {
            path: videoPath,
            size: formatFileSize(fileSize),
            hasRange: !!range
        });

        if (range) {
            // Support for video seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const file = fsSync.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'public, max-age=3600'
            };
            
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            // Stream entire file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'public, max-age=3600',
                'Accept-Ranges': 'bytes'
            };
            
            res.writeHead(200, head);
            fsSync.createReadStream(videoPath).pipe(res);
        }

        console.log(`✅ Video served successfully: ${path.basename(videoPath)}`);
    } catch (error) {
        console.error('❌ Error serving video file:', error);
        res.status(500).json({ error: 'Failed to serve video file', details: error.message });
    }
});

// GET /api/videos/debug/:category - Debug route to see available files
router.get('/debug/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const categoryPath = path.join(VPS_VIDEO_PATH, category);
        
        console.log('🔍 Debug request for category:', category);
        console.log('📁 Category path:', categoryPath);
        
        if (!fsSync.existsSync(categoryPath)) {
            return res.status(404).json({ 
                error: 'Category not found',
                path: categoryPath,
                vpsPath: VPS_VIDEO_PATH
            });
        }
        
        const files = fsSync.readdirSync(categoryPath);
        const videoFiles = files.filter(file => SUPPORTED_FORMATS.includes(path.extname(file).toLowerCase()));
        
        const fileDetails = videoFiles.map(file => {
            const filePath = path.join(categoryPath, file);
            const stats = fsSync.statSync(filePath);
            return {
                filename: file,
                size: formatFileSize(stats.size),
                modified: stats.mtime.toISOString(),
                fullPath: filePath
            };
        });
        
        res.json({
            category,
            categoryPath,
            totalFiles: files.length,
            videoFiles: videoFiles.length,
            allFiles: files,
            videoDetails: fileDetails
        });
        
    } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({ error: 'Debug failed', details: error.message });
    }
});

module.exports = router;