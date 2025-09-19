import express, { Request, Response, NextFunction } from "express";
import { connectDB } from "./config/database";
import { validateEnvironment } from "./config/envValidator";
import sessionCleanupService from "./services/sessionCleanupService";
import User from "./models/user";
import cookieParser from 'cookie-parser';
import cors from "cors";
import session from 'express-session';
import passport from './config/oauth';
import { userAuth } from "./middlewares/authmiddleware";
import { apiLimiter } from "./middlewares/rateLimiting";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import userRouter from "./routes/user";
import testGenerationRouter from "./routes/testGeneration";
import multer from "multer";
import path from "path";
import { 
  UploadedFile, 
  FileCacheData, 
  UploadResponse, 
  CacheStatsResponse,
  AuthenticatedRequest 
} from "./types";
import openaiService from "./services/openaiService";

// Validate environment variables before starting the app
validateEnvironment();

const app: express.Application = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// In-Memory File Storage
const fileCache = new Map<string, FileCacheData>();
console.log("💾 Memory-based file storage initialized");

// File type validation
const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
const fileTypes = /pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar/;

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE ?? '10485760'), // Default 10MB
    files: parseInt(process.env.MAX_FILES ?? '10') // Default 10 files
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (imageTypes.test(ext) || fileTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and documents are allowed!"));
    }
  }
});

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [process.env.CLIENT_URL!];

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));

// JSON parsing middleware that only parses for POST/PUT/PATCH requests
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    // Skip JSON parsing for GET, DELETE, HEAD, and OPTIONS requests
    next();
  } else if (req.get('Content-Type') && req.get('Content-Type')?.includes('application/json')) {
    express.json()(req, res, next);
  } else {
    next();
  }
});

app.use(cookieParser());

// Apply general API rate limiting
app.use(apiLimiter);

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
app.use((req: Request, res: Response, next: NextFunction) => {
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

// Routes
app.use("/auth", authRouter);
app.use("/", profileRouter);
app.use("/", userRouter);
app.use("/api/test-generation", testGenerationRouter);

app.get("/feed", userAuth, async (req: any, res: Response): Promise<void> => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (error) {
    res.status(500).send("Error fetching feed: " + (error as Error).message);
  }
});

// Upload endpoint - Store in memory and extract content
app.post("/upload", upload.array("files", 10), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("📤 Upload request received");

    if (!req.files || req.files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const fileInfos: UploadedFile[] = [];
    
    // Process files sequentially to extract content
    for (const file of req.files as Express.Multer.File[]) {
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

      // Extract text content for test generation
      let extractedContent = '';
      try {
        if (!isImage) {
          extractedContent = await openaiService.extractTextFromFile(
            file.buffer, 
            file.originalname, 
            file.mimetype
          );
          console.log(`📝 Content extracted from ${file.originalname}: ${extractedContent.length} characters`);
        }
      } catch (contentError) {
        console.warn(`⚠️ Failed to extract content from ${file.originalname}:`, contentError);
        extractedContent = `[Content extraction failed for ${file.originalname}]`;
      }

      const fileInfo: UploadedFile = {
        id: filename.split('.')[0],
        filename: filename,
        originalName: file.originalname,
        size: file.size,
        type: isImage ? 'image' : 'file',
        mimetype: file.mimetype,
        url: `/file/${filename}`,
        uploadedAt: new Date().toISOString(),
        extractedContent: extractedContent // Add extracted content to file info
      };

      fileInfos.push(fileInfo);
    }

    console.log(`🎉 ${req.files.length} file(s) cached in memory`);
    console.log(`📊 Cache size: ${fileCache.size} files`);

    const response: UploadResponse = {
      success: true,
      message: `${req.files.length} file(s) uploaded successfully`,
      files: fileInfos,
      cacheInfo: {
        totalFiles: fileCache.size,
        memoryUsage: process.memoryUsage()
      }
    };

    res.json(response);

  } catch (error) {
    console.error("❌ Upload failed:", (error as Error).message);
    res.status(500).json({ error: "Upload failed: " + (error as Error).message });
  }
});

// Serve files from memory
app.get("/file/:filename", (req: Request, res: Response): void => {
  try {
    const filename = req.params.filename;
    const fileData = fileCache.get(filename);

    if (!fileData) {
      res.status(404).json({ error: "File not found in cache" });
      return;
    }

    // Set appropriate headers
    res.set({
      'Content-Type': fileData.mimetype,
      'Content-Length': fileData.size.toString(),
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Disposition': `inline; filename="${fileData.originalName}"`
    });

    console.log(`📤 Serving from memory: ${filename}`);
    res.send(fileData.buffer);

  } catch (error) {
    console.error(`❌ Error serving file ${req.params.filename}:`, (error as Error).message);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// Get all cached files
app.get("/files", (req: Request, res: Response): void => {
  try {
    const files: UploadedFile[] = [];

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
    res.status(500).json({ error: "Failed to retrieve files: " + (error as Error).message });
  }
});

// Delete file from memory
app.delete("/delete/:filename", (req: Request, res: Response): void => {
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
      error: "Failed to delete file: " + (error as Error).message
    });
  }
});

// Clear all cache
app.delete("/clear-cache", (req: Request, res: Response): void => {
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
      error: "Failed to clear cache: " + (error as Error).message
    });
  }
});

// Cache statistics
app.get("/cache-stats", (req: Request, res: Response): void => {
  try {
    let totalSize = 0;
    const fileTypes: Record<string, number> = {};

    fileCache.forEach((fileData, filename) => {
      totalSize += fileData.size;
      const type = fileData.type;
      fileTypes[type] = (fileTypes[type] || 0) + 1;
    });

    const response: CacheStatsResponse = {
      success: true,
      stats: {
        totalFiles: fileCache.size,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        fileTypes: fileTypes,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Failed to get cache stats" });
  }
});

// Health check with cache info
app.get("/health", (req: Request, res: Response): void => {
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

connectDB()
  .then(() => {
    console.log("Database connected successfully");
    
    // Start session cleanup cron job
    sessionCleanupService.startCronJob();
    
    app.listen(process.env.PORT, () => {
      console.log("Server is running on port " + process.env.PORT);
      console.log("🧹 Session cleanup service started");
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
  });

export default app;
