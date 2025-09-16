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

// Create upload directories
const uploadDir = path.join(__dirname, "uploads");
const imagesDir = path.join(uploadDir, "images");
const filesDir = path.join(uploadDir, "files");

[uploadDir, imagesDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// File type validation
const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
const fileTypes = /pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar/;

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (imageTypes.test(ext)) {
      cb(null, imagesDir);
    } else if (fileTypes.test(ext)) {
      cb(null, filesDir);
    } else {
      cb(new Error("Unsupported file type"), null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

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

// Upload endpoint
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
      
      console.log(`✅ File saved: ${file.filename} (${file.size} bytes)`);
      
      return {
        id: file.filename.split('.')[0],
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        type: isImage ? 'image' : 'file',
        mimetype: file.mimetype,
        url: `/${isImage ? 'images' : 'files'}/${file.filename}`,
        uploadedAt: new Date().toISOString()
      };
    });

    console.log(`🎉 Upload successful!`);

    res.json({ 
      success: true,
      message: `${req.files.length} file(s) uploaded successfully`,
      files: fileInfos 
    });

  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

// Serve static files
app.use("/images", express.static(imagesDir));
app.use("/files", express.static(filesDir));

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
