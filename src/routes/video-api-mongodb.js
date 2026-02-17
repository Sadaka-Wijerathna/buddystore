const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { MongoClient } = require('mongodb');
const router = express.Router();

// MongoDB connection - use the same connection as server.js
let db;

// Initialize MongoDB connection
const initializeDB = async () => {
    try {
        if (!db) {
            const mongo = new MongoClient(process.env.MONGO_URI);
            await mongo.connect();
            db = mongo.db("telegram_site");
            console.log('✅ Video API connected to MongoDB');
        }
        return db;
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB in video API:', error);
        throw error;
    }
};

// Helper function to get or create video stats
async function getVideoStats(videoId) {
    try {
        const database = await initializeDB();
        
        // Check if video stats exist
        let videoStats = await database.collection('video_stats').findOne({ videoId });
        
        if (!videoStats) {
            // Create new video stats with initial random values for realism
            videoStats = {
                videoId,
                likes: Math.floor(Math.random() * 500) + 50,
                dislikes: Math.floor(Math.random() * 20) + 5,
                views: Math.floor(Math.random() * 10000) + 1000,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            await database.collection('video_stats').insertOne(videoStats);
            console.log(`📊 Created new video stats for ${videoId}:`, videoStats);
        }
        
        return videoStats;
    } catch (error) {
        console.error('❌ Error getting video stats:', error);
        // Return default stats if database fails
        return {
            videoId,
            likes: Math.floor(Math.random() * 500) + 50,
            dislikes: Math.floor(Math.random() * 20) + 5,
            views: Math.floor(Math.random() * 10000) + 1000
        };
    }
}

// Helper function to get user interaction with a video
async function getUserVideoInteraction(username, videoId) {
    try {
        const database = await initializeDB();
        
        const interaction = await database.collection('user_video_interactions').findOne({
            username,
            videoId
        });
        
        return interaction || { username, videoId, liked: false, disliked: false };
    } catch (error) {
        console.error('❌ Error getting user interaction:', error);
        return { username, videoId, liked: false, disliked: false };
    }
}

// Helper function to save user interaction
async function saveUserVideoInteraction(username, videoId, liked, disliked) {
    try {
        const database = await initializeDB();
        
        await database.collection('user_video_interactions').updateOne(
            { username, videoId },
            {
                $set: {
                    username,
                    videoId,
                    liked,
                    disliked,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
        
        console.log(`💾 Saved interaction: @${username} ${liked ? 'liked' : disliked ? 'disliked' : 'neutral'} ${videoId}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving user interaction:', error);
        return false;
    }
}

// Helper function to update video stats
async function updateVideoStats(videoId, likes, dislikes, views) {
    try {
        const database = await initializeDB();
        
        await database.collection('video_stats').updateOne(
            { videoId },
            {
                $set: {
                    likes,
                    dislikes,
                    views,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        
        return true;
    } catch (error) {
        console.error('❌ Error updating video stats:', error);
        return false;
    }
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

// POST /api/video/like - Like a video
router.post('/like', async (req, res) => {
    try {
        const { videoId, username } = req.body;
        
        if (!videoId || !username) {
            return res.status(400).json({ error: 'Video ID and username are required' });
        }
        
        // Get current user interaction
        const currentInteraction = await getUserVideoInteraction(username, videoId);
        const wasLiked = currentInteraction.liked || false;
        const wasDisliked = currentInteraction.disliked || false;
        
        // Get current video stats
        const videoStats = await getVideoStats(videoId);
        let newLikes = videoStats.likes;
        let newDislikes = videoStats.dislikes;
        
        // Toggle like logic
        let newLiked, newDisliked;
        
        if (wasLiked) {
            // Remove like
            newLiked = false;
            newDisliked = false;
            newLikes = Math.max(0, newLikes - 1);
        } else {
            // Add like
            newLiked = true;
            newDisliked = false;
            newLikes = newLikes + 1;
            
            // Remove dislike if it was disliked
            if (wasDisliked) {
                newDislikes = Math.max(0, newDislikes - 1);
            }
        }
        
        // Save user interaction
        await saveUserVideoInteraction(username, videoId, newLiked, newDisliked);
        
        // Update video stats
        await updateVideoStats(videoId, newLikes, newDislikes, videoStats.views);
        
        console.log(`👍 User @${username} ${newLiked ? 'liked' : 'unliked'} video ${videoId}`);
        
        res.json({
            success: true,
            liked: newLiked,
            disliked: newDisliked,
            totalLikes: newLikes,
            totalDislikes: newDislikes
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
        
        // Get current user interaction
        const currentInteraction = await getUserVideoInteraction(username, videoId);
        const wasLiked = currentInteraction.liked || false;
        const wasDisliked = currentInteraction.disliked || false;
        
        // Get current video stats
        const videoStats = await getVideoStats(videoId);
        let newLikes = videoStats.likes;
        let newDislikes = videoStats.dislikes;
        
        // Toggle dislike logic
        let newLiked, newDisliked;
        
        if (wasDisliked) {
            // Remove dislike
            newLiked = false;
            newDisliked = false;
            newDislikes = Math.max(0, newDislikes - 1);
        } else {
            // Add dislike
            newLiked = false;
            newDisliked = true;
            newDislikes = newDislikes + 1;
            
            // Remove like if it was liked
            if (wasLiked) {
                newLikes = Math.max(0, newLikes - 1);
            }
        }
        
        // Save user interaction
        await saveUserVideoInteraction(username, videoId, newLiked, newDisliked);
        
        // Update video stats
        await updateVideoStats(videoId, newLikes, newDislikes, videoStats.views);
        
        console.log(`👎 User @${username} ${newDisliked ? 'disliked' : 'undisliked'} video ${videoId}`);
        
        res.json({
            success: true,
            liked: newLiked,
            disliked: newDisliked,
            totalLikes: newLikes,
            totalDislikes: newDislikes
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
        
        const interaction = await getUserVideoInteraction(username, id);
        const videoStats = await getVideoStats(id);
        
        res.json({
            liked: interaction.liked || false,
            disliked: interaction.disliked || false,
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
        const stats = await getVideoStats(id);
        
        res.json({
            likes: stats.likes,
            dislikes: stats.dislikes,
            views: stats.views
        });
    } catch (error) {
        console.error('Error getting video stats:', error);
        res.status(500).json({ error: 'Failed to get video stats' });
    }
});

// POST /api/videos/:id/view - Log video view (for analytics)
router.post('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const { timestamp } = req.body;
        
        // Get current stats and increment view count
        const videoStats = await getVideoStats(id);
        const newViews = videoStats.views + 1;
        
        // Update video stats
        await updateVideoStats(id, videoStats.likes, videoStats.dislikes, newViews);
        
        console.log(`Video view logged: ${id} at ${timestamp || new Date().toISOString()}`);
        
        res.json({ success: true, views: newViews });
    } catch (error) {
        console.error('Error logging view:', error);
        res.status(500).json({ error: 'Failed to log view' });
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

module.exports = router;