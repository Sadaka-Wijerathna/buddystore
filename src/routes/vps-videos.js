const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const { logger, logError } = require('../utils/logger');

const router = express.Router();

// VPS storage configuration
const VPS_STORAGE_PATH = process.env.VPS_STORAGE_PATH || path.join(__dirname, '../../vps-videos');
const VPS_THUMBNAILS_PATH = path.join(VPS_STORAGE_PATH, 'thumbnails');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_FORMATS = ['mp4', 'avi', 'mov', 'wmv', 'mkv'];

// Ensure VPS storage directories exist
async function ensureDirectories() {
  try {
    const categories = ['Mixed', 'Mom_And_Son', 'Rape', 'SL_Leaks', 'CCTV'];
    
    // Create main storage directory
    await fs.mkdir(VPS_STORAGE_PATH, { recursive: true });
    
    // Create category directories
    for (const category of categories) {
      await fs.mkdir(path.join(VPS_STORAGE_PATH, category), { recursive: true });
    }
    
    // Create thumbnails directory
    await fs.mkdir(VPS_THUMBNAILS_PATH, { recursive: true });
    
    logger.info('VPS storage directories ensured');
  } catch (error) {
    logError(error, { context: 'Ensuring VPS directories' });
  }
}

// Initialize directories
ensureDirectories();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const category = req.body.category || 'Mixed';
      const categoryPath = path.join(VPS_STORAGE_PATH, category);
      await fs.mkdir(categoryPath, { recursive: true });
      cb(null, categoryPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (ALLOWED_FORMATS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file format. Allowed: ${ALLOWED_FORMATS.join(', ')}`));
    }
  }
});

// Video metadata storage (in production, use a database)
let videoMetadata = [];

// Load existing metadata
async function loadMetadata() {
  try {
    const metadataPath = path.join(VPS_STORAGE_PATH, 'metadata.json');
    if (fsSync.existsSync(metadataPath)) {
      const data = await fs.readFile(metadataPath, 'utf8');
      videoMetadata = JSON.parse(data);
    }
  } catch (error) {
    logger.warn('Could not load video metadata:', error.message);
    videoMetadata = [];
  }
}

// Save metadata
async function saveMetadata() {
  try {
    const metadataPath = path.join(VPS_STORAGE_PATH, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(videoMetadata, null, 2));
  } catch (error) {
    logError(error, { context: 'Saving video metadata' });
  }
}

// Load metadata on startup
loadMetadata();

// Get video duration using ffprobe (if available)
async function getVideoDuration(filePath) {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
    const duration = parseFloat(stdout.trim());
    
    if (duration && !isNaN(duration)) {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    logger.warn('Could not get video duration:', error.message);
  }
  
  return 'Unknown';
}

// Get file size in MB
function getFileSize(filePath) {
  try {
    const stats = fsSync.statSync(filePath);
    return (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
  } catch (error) {
    return 'Unknown';
  }
}

// Routes

// GET /api/vps-videos - List all videos
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    let videos = videoMetadata;
    
    if (category && category !== 'all') {
      videos = videos.filter(video => video.category === category);
    }
    
    // Add streaming URLs
    videos = videos.map(video => ({
      ...video,
      videoUrl: `/api/vps-video-stream/${video.id}`,
      thumbnailUrl: video.thumbnail ? `/api/vps-video-thumbnail/${video.id}` : null
    }));
    
    res.json(videos);
  } catch (error) {
    logError(error, { context: 'Listing VPS videos' });
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

// POST /api/vps-videos/upload - Upload new video
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    const { title, category, description } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }
    
    const videoId = uuidv4();
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Get video metadata
    const duration = await getVideoDuration(filePath);
    const size = getFileSize(filePath);
    
    const videoData = {
      id: videoId,
      title: title.trim(),
      category: category,
      description: description?.trim() || '',
      duration: duration,
      size: size,
      format: fileExt.slice(1).toUpperCase(),
      filename: fileName,
      filePath: filePath,
      uploadDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    
    // Add to metadata
    videoMetadata.push(videoData);
    await saveMetadata();
    
    logger.info(`Video uploaded: ${title} (${category}) - ${size}`);
    
    res.json({
      success: true,
      video: {
        ...videoData,
        videoUrl: `/api/vps-video-stream/${videoId}`
      }
    });
    
  } catch (error) {
    logError(error, { context: 'Uploading VPS video' });
    
    // Clean up uploaded file if error occurred
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('Could not clean up uploaded file:', cleanupError.message);
      }
    }
    
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// GET /api/vps-video-stream/:id - Stream video file
router.get('/stream/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = videoMetadata.find(v => v.id === id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const filePath = video.filePath;
    
    // Check if file exists
    if (!fsSync.existsSync(filePath)) {
      logger.error(`Video file not found: ${filePath}`);
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    const stat = fsSync.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Support for video seeking
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const file = fsSync.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Stream entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(200, head);
      fsSync.createReadStream(filePath).pipe(res);
    }
    
    // Log video view
    logger.info(`Video streamed: ${video.title} (${video.category})`);
    
  } catch (error) {
    logError(error, { context: 'Streaming VPS video', videoId: req.params.id });
    res.status(500).json({ error: 'Streaming failed' });
  }
});

// GET /api/vps-video-thumbnail/:id - Get video thumbnail
router.get('/thumbnail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const video = videoMetadata.find(v => v.id === id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const thumbnailPath = path.join(VPS_THUMBNAILS_PATH, `${id}.jpg`);
    
    if (fsSync.existsSync(thumbnailPath)) {
      res.sendFile(thumbnailPath);
    } else {
      // Generate placeholder thumbnail
      res.status(404).json({ error: 'Thumbnail not found' });
    }
    
  } catch (error) {
    logError(error, { context: 'Getting VPS video thumbnail', videoId: req.params.id });
    res.status(500).json({ error: 'Thumbnail failed' });
  }
});

// DELETE /api/vps-videos/:id - Delete video
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const videoIndex = videoMetadata.findIndex(v => v.id === id);
    
    if (videoIndex === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const video = videoMetadata[videoIndex];
    
    // Delete video file
    try {
      await fs.unlink(video.filePath);
    } catch (error) {
      logger.warn(`Could not delete video file: ${video.filePath}`, error.message);
    }
    
    // Delete thumbnail if exists
    const thumbnailPath = path.join(VPS_THUMBNAILS_PATH, `${id}.jpg`);
    try {
      await fs.unlink(thumbnailPath);
    } catch (error) {
      // Thumbnail might not exist, ignore error
    }
    
    // Remove from metadata
    videoMetadata.splice(videoIndex, 1);
    await saveMetadata();
    
    logger.info(`Video deleted: ${video.title} (${video.category})`);
    
    res.json({ success: true, message: 'Video deleted successfully' });
    
  } catch (error) {
    logError(error, { context: 'Deleting VPS video', videoId: req.params.id });
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/vps-videos/view - Log video view (analytics)
router.post('/view', async (req, res) => {
  try {
    const { videoId, category, timestamp } = req.body;
    
    // In production, you would store this in a database
    logger.info(`Video view logged: ${videoId} (${category}) at ${timestamp}`);
    
    res.json({ success: true });
  } catch (error) {
    logError(error, { context: 'Logging video view' });
    res.status(500).json({ error: 'Failed to log view' });
  }
});

// GET /api/vps-videos/stats - Get video statistics
router.get('/stats', async (req, res) => {
  try {
    const totalVideos = videoMetadata.length;
    const categoryCounts = {};
    let totalSize = 0;
    
    videoMetadata.forEach(video => {
      categoryCounts[video.category] = (categoryCounts[video.category] || 0) + 1;
      
      // Parse size (assuming format like "45.2 MB")
      const sizeMatch = video.size.match(/(\d+\.?\d*)/);
      if (sizeMatch) {
        totalSize += parseFloat(sizeMatch[1]);
      }
    });
    
    res.json({
      totalVideos,
      totalSize: totalSize.toFixed(2) + ' MB',
      categoryCounts,
      categories: Object.keys(categoryCounts),
      storageUsed: Math.min((totalSize / 10000) * 100, 100) // Assuming 10GB limit
    });
    
  } catch (error) {
    logError(error, { context: 'Getting VPS video stats' });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /api/vps-videos/categories - Get available categories
router.get('/categories', (req, res) => {
  try {
    const categories = ['Mixed', 'Mom_And_Son', 'Rape', 'SL_Leaks', 'CCTV'];
    res.json(categories);
  } catch (error) {
    logError(error, { context: 'Getting VPS video categories' });
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
    }
  }
  
  logError(error, { context: 'VPS videos router error' });
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;