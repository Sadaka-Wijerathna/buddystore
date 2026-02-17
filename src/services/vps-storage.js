const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { logger, logError } = require('../utils/logger');

class VPSStorageService {
  constructor() {
    this.storagePath = process.env.VPS_STORAGE_PATH || path.join(__dirname, '../../vps-videos');
    this.thumbnailsPath = path.join(this.storagePath, 'thumbnails');
    this.metadataPath = path.join(this.storagePath, 'metadata.json');
    this.categories = ['Mixed', 'Mom_And_Son', 'Rape', 'SL_Leaks', 'CCTV'];
    this.maxStorageSize = 10 * 1024 * 1024 * 1024; // 10GB in bytes
  }

  async initialize() {
    try {
      // Create main storage directory
      await fs.mkdir(this.storagePath, { recursive: true });
      
      // Create category directories
      for (const category of this.categories) {
        await fs.mkdir(path.join(this.storagePath, category), { recursive: true });
      }
      
      // Create thumbnails directory
      await fs.mkdir(this.thumbnailsPath, { recursive: true });
      
      logger.info('VPS storage service initialized');
    } catch (error) {
      logError(error, { context: 'Initializing VPS storage' });
      throw error;
    }
  }

  async getStorageStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        categoryStats: {},
        storageUsed: 0,
        storageAvailable: this.maxStorageSize
      };

      for (const category of this.categories) {
        const categoryPath = path.join(this.storagePath, category);
        const categoryStats = await this.getCategoryStats(categoryPath);
        
        stats.categoryStats[category] = categoryStats;
        stats.totalFiles += categoryStats.fileCount;
        stats.totalSize += categoryStats.totalSize;
      }

      stats.storageUsed = (stats.totalSize / this.maxStorageSize) * 100;
      stats.storageAvailable = this.maxStorageSize - stats.totalSize;

      return stats;
    } catch (error) {
      logError(error, { context: 'Getting storage stats' });
      throw error;
    }
  }

  async getCategoryStats(categoryPath) {
    try {
      const stats = {
        fileCount: 0,
        totalSize: 0,
        files: []
      };

      if (!fsSync.existsSync(categoryPath)) {
        return stats;
      }

      const files = await fs.readdir(categoryPath);
      
      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const fileStat = await fs.stat(filePath);
        
        if (fileStat.isFile()) {
          stats.fileCount++;
          stats.totalSize += fileStat.size;
          stats.files.push({
            name: file,
            size: fileStat.size,
            created: fileStat.birthtime,
            modified: fileStat.mtime
          });
        }
      }

      return stats;
    } catch (error) {
      logError(error, { context: 'Getting category stats', categoryPath });
      return { fileCount: 0, totalSize: 0, files: [] };
    }
  }

  async checkStorageSpace(fileSize) {
    try {
      const stats = await this.getStorageStats();
      const availableSpace = this.maxStorageSize - stats.totalSize;
      
      return {
        hasSpace: fileSize <= availableSpace,
        availableSpace,
        requiredSpace: fileSize,
        storageUsed: stats.storageUsed
      };
    } catch (error) {
      logError(error, { context: 'Checking storage space' });
      return { hasSpace: false, availableSpace: 0, requiredSpace: fileSize, storageUsed: 100 };
    }
  }

  async moveVideoToCategory(sourcePath, category, filename) {
    try {
      const categoryPath = path.join(this.storagePath, category);
      await fs.mkdir(categoryPath, { recursive: true });
      
      const destinationPath = path.join(categoryPath, filename);
      await fs.rename(sourcePath, destinationPath);
      
      logger.info(`Video moved to category: ${filename} -> ${category}`);
      return destinationPath;
    } catch (error) {
      logError(error, { context: 'Moving video to category', sourcePath, category });
      throw error;
    }
  }

  async deleteVideo(filePath) {
    try {
      if (fsSync.existsSync(filePath)) {
        await fs.unlink(filePath);
        logger.info(`Video file deleted: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      logError(error, { context: 'Deleting video file', filePath });
      throw error;
    }
  }

  async deleteThumbnail(videoId) {
    try {
      const thumbnailPath = path.join(this.thumbnailsPath, `${videoId}.jpg`);
      if (fsSync.existsSync(thumbnailPath)) {
        await fs.unlink(thumbnailPath);
        logger.info(`Thumbnail deleted: ${videoId}`);
        return true;
      }
      return false;
    } catch (error) {
      logError(error, { context: 'Deleting thumbnail', videoId });
      return false;
    }
  }

  async generateThumbnail(videoPath, videoId) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const thumbnailPath = path.join(this.thumbnailsPath, `${videoId}.jpg`);
      
      // Use ffmpeg to generate thumbnail at 10% of video duration
      const command = `ffmpeg -i "${videoPath}" -ss 00:00:10 -vframes 1 -y "${thumbnailPath}"`;
      
      await execAsync(command);
      
      if (fsSync.existsSync(thumbnailPath)) {
        logger.info(`Thumbnail generated: ${videoId}`);
        return thumbnailPath;
      }
      
      return null;
    } catch (error) {
      logger.warn(`Could not generate thumbnail for ${videoId}:`, error.message);
      return null;
    }
  }

  async getVideoInfo(filePath) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Get video duration
      const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`;
      const { stdout: durationOutput } = await execAsync(durationCommand);
      const duration = parseFloat(durationOutput.trim());
      
      // Get video resolution
      const resolutionCommand = `ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`;
      const { stdout: resolutionOutput } = await execAsync(resolutionCommand);
      const resolution = resolutionOutput.trim();
      
      // Get file stats
      const stats = await fs.stat(filePath);
      
      return {
        duration: this.formatDuration(duration),
        durationSeconds: duration,
        resolution: resolution || 'Unknown',
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.warn(`Could not get video info for ${filePath}:`, error.message);
      
      // Fallback to basic file stats
      try {
        const stats = await fs.stat(filePath);
        return {
          duration: 'Unknown',
          durationSeconds: 0,
          resolution: 'Unknown',
          size: stats.size,
          sizeFormatted: this.formatFileSize(stats.size),
          created: stats.birthtime,
          modified: stats.mtime
        };
      } catch (statError) {
        throw statError;
      }
    }
  }

  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanupOrphanedFiles() {
    try {
      const metadata = await this.loadMetadata();
      const validFiles = new Set(metadata.map(video => video.filePath));
      
      let cleanedCount = 0;
      
      for (const category of this.categories) {
        const categoryPath = path.join(this.storagePath, category);
        
        if (!fsSync.existsSync(categoryPath)) continue;
        
        const files = await fs.readdir(categoryPath);
        
        for (const file of files) {
          const filePath = path.join(categoryPath, file);
          
          if (!validFiles.has(filePath)) {
            await fs.unlink(filePath);
            cleanedCount++;
            logger.info(`Cleaned up orphaned file: ${filePath}`);
          }
        }
      }
      
      logger.info(`Cleanup completed: ${cleanedCount} orphaned files removed`);
      return cleanedCount;
    } catch (error) {
      logError(error, { context: 'Cleaning up orphaned files' });
      throw error;
    }
  }

  async loadMetadata() {
    try {
      if (fsSync.existsSync(this.metadataPath)) {
        const data = await fs.readFile(this.metadataPath, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      logger.warn('Could not load metadata:', error.message);
      return [];
    }
  }

  async saveMetadata(metadata) {
    try {
      await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2));
      logger.info('Metadata saved successfully');
    } catch (error) {
      logError(error, { context: 'Saving metadata' });
      throw error;
    }
  }

  async validateVideoFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      // Check file size
      if (stats.size === 0) {
        throw new Error('Video file is empty');
      }
      
      if (stats.size > 500 * 1024 * 1024) { // 500MB
        throw new Error('Video file is too large (max 500MB)');
      }
      
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const allowedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.mkv'];
      
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`Invalid file format. Allowed: ${allowedExtensions.join(', ')}`);
      }
      
      return true;
    } catch (error) {
      logError(error, { context: 'Validating video file', filePath });
      throw error;
    }
  }

  async getDirectorySize(dirPath) {
    try {
      let totalSize = 0;
      
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        }
      }
      
      return totalSize;
    } catch (error) {
      logger.warn(`Could not get directory size for ${dirPath}:`, error.message);
      return 0;
    }
  }

  async backupMetadata() {
    try {
      const backupPath = path.join(this.storagePath, `metadata-backup-${Date.now()}.json`);
      const metadata = await this.loadMetadata();
      
      await fs.writeFile(backupPath, JSON.stringify(metadata, null, 2));
      logger.info(`Metadata backed up to: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      logError(error, { context: 'Backing up metadata' });
      throw error;
    }
  }
}

module.exports = new VPSStorageService();