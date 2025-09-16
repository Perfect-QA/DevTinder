const express = require("express");
const { connectDB } = require("./config/database");
const app = express();
const User = require("./models/user");
var cookieParser = require('cookie-parser')
const cors = require("cors");
const session = require('express-session');
const passport = require('./config/oauth');
const { userAuth } = require("./middlewares/authmiddleware");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const userRouter = require("./routes/user");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require('dotenv').config();

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
// JSON parsing middleware that only parses for POST/PUT/PATCH requests
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    // Skip JSON parsing for GET, DELETE, HEAD, and OPTIONS requests
    next();
  } else if (req.get('Content-Type') && req.get('Content-Type').includes('application/json')) {
    express.json()(req, res, next);
  } else {
    next();
  }
});
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// In-Memory File Storage
const fileCache = new Map(); // Store files in memory

console.log("💾 Memory-based file storage initialized");

// File type validation
const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
const fileTypes = /pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar/;

// Configure multer for memory storage
const storage = multer.memoryStorage(); // Store in memory instead of disk

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (imageTypes.test(ext) || fileTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and documents are allowed!"), false);
    }
  }
});

// Routes
app.use("/auth", authRouter);
app.use("/", profileRouter);
app.use("/", userRouter);

app.get("/feed", userAuth , async (req, res) => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (error) {
    res.status(500).send("Error fetching feed: " + error.message);
  }
});

// Upload endpoint - Store in memory
app.post("/upload", upload.array("files", 10), (req, res) => {
  try {
    console.log("📤 Upload request received");
    
    if (!req.files || req.files.length === 0) {
      console.log("❌ No files in request");
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log(`📊 Processing ${req.files.length} file(s)`);

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

connectDB()
  .then(() => {
    console.log("Database connected successfully");
    app.listen(process.env.PORT, () => {
      console.log("Server is running on port " + process.env.PORT);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
  });
