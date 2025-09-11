const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory File Storage
const fileCache = new Map(); // Store files in memory

// File type validation
const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
const fileTypes = /pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar/;

// Configure multer for memory storage
const storage = multer.memoryStorage(); // Store in memory instead of disk

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (imageTypes.test(ext) || fileTypes.test(ext)) {
      console.log(`✅ File accepted: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`❌ File rejected: ${file.originalname}`);
      cb(new Error("Only images and documents are allowed!"), false);
    }
  }
});

// Upload endpoint - Store in memory
app.post("/upload", upload.array("files", 10), (req, res) => {
  try {
    console.log("📤 Upload request received");
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const fileInfos = req.files.map(file => {
      const ext = path.extname(file.originalname).toLowerCase().slice(1);
      const isImage = imageTypes.test(ext);
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const filename = "file-" + uniqueSuffix + path.extname(file.originalname);
      
      // Store file in memory cache
      fileCache.set(filename, {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalName: file.originalname,
        size: file.size,
        type: isImage ? 'image' : 'file',
        uploadedAt: new Date().toISOString()
      });
      
      console.log(`💾 File cached in memory: ${filename} (${file.size} bytes)`);
      
      return {
        id: filename.split('.')[0],
        filename: filename,
        originalName: file.originalname,
        size: file.size,
        type: isImage ? 'image' : 'file',
        mimetype: file.mimetype,
        url: `/file/${filename}`,
        uploadedAt: new Date().toISOString()
      };
    });

    console.log(`🎉 ${req.files.length} file(s) cached in memory`);
    console.log(`📊 Cache size: ${fileCache.size} files`);

    res.json({ 
      success: true,
      message: `${req.files.length} file(s) uploaded successfully`,
      files: fileInfos,
      cacheInfo: {
        totalFiles: fileCache.size,
        memoryUsage: process.memoryUsage()
      }
    });

  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

// Serve files from memory
app.get("/file/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const fileData = fileCache.get(filename);
    
    if (!fileData) {
      return res.status(404).json({ error: "File not found in cache" });
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': fileData.mimetype,
      'Content-Length': fileData.size,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Disposition': `inline; filename="${fileData.originalName}"`
    });
    
    console.log(`📤 Serving from memory: ${filename}`);
    res.send(fileData.buffer);
    
  } catch (error) {
    console.error(`❌ Error serving file ${req.params.filename}:`, error.message);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// Get all cached files
app.get("/files", (req, res) => {
  try {
    const files = [];
    
    fileCache.forEach((fileData, filename) => {
      files.push({
        id: filename.split('.')[0],
        filename: filename,
        originalName: fileData.originalName,
        size: fileData.size,
        type: fileData.type,
        mimetype: fileData.mimetype,
        url: `/file/${filename}`,
        uploadedAt: fileData.uploadedAt
      });
    });
    
    res.json({
      success: true,
      files: files,
      cacheInfo: {
        totalFiles: fileCache.size,
        memoryUsage: process.memoryUsage()
      }
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve files: " + error.message });
  }
});

// Delete file from memory
app.delete("/delete/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (fileCache.has(filename)) {
      fileCache.delete(filename);
      console.log(`🗑️ File removed from cache: ${filename}`);
      res.json({ 
        success: true, 
        message: "File deleted successfully",
        cacheInfo: {
          totalFiles: fileCache.size
        }
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: "File not found in cache" 
      });
    }

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete file: " + error.message 
    });
  }
});

// Clear all cache
app.delete("/clear-cache", (req, res) => {
  try {
    const fileCount = fileCache.size;
    fileCache.clear();
    console.log(`Cache cleared: ${fileCount} files removed`);
    
    res.json({
      success: true,
      message: `Cache cleared successfully. ${fileCount} files removed.`,
      cacheInfo: {
        totalFiles: fileCache.size,
        memoryUsage: process.memoryUsage()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: "Failed to clear cache: " + error.message 
    });
  }
});

// Cache statistics
app.get("/cache-stats", (req, res) => {
  try {
    let totalSize = 0;
    const fileTypes = {};
    
    fileCache.forEach((fileData, filename) => {
      totalSize += fileData.size;
      const type = fileData.type;
      fileTypes[type] = (fileTypes[type] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats: {
        totalFiles: fileCache.size,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        fileTypes: fileTypes,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get cache stats" });
  }
});

// Health check with cache info
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cacheInfo: {
      totalFiles: fileCache.size,
      memoryUsage: process.memoryUsage()
    }
  });
});

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log(` Memory-based file server running on port ${PORT}`);
  console.log(` Files stored in: RAM (Memory Cache)`);
  console.log(` Server URL: http://localhost:${PORT}`);
  console.log(` Upload endpoint: http://localhost:${PORT}/upload`);
  console.log(` Cache stats: http://localhost:${PORT}/cache-stats`);
  console.log(` Note: Files will be lost when server restarts!`);
});