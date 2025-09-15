const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors"); // ← ADD THIS LINE (you were missing this import)

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create upload directories with logging
const uploadDir = path.join(__dirname, "uploads");
const imagesDir = path.join(uploadDir, "images");
const filesDir = path.join(uploadDir, "files");

[uploadDir, imagesDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// File type validation
const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
const fileTypes = /pdf|doc|docx|txt|xls|xlsx|ppt|pptx|zip|rar/;

// Configure multer storage - FIXED PATHS
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (imageTypes.test(ext)) {
      console.log(`📂 Saving image to: ${imagesDir}`);
      cb(null, imagesDir); // ← FIXED: Use absolute path instead of "uploads/images/"
    } else if (fileTypes.test(ext)) {
      console.log(`📂 Saving file to: ${filesDir}`);
      cb(null, filesDir); // ← FIXED: Use absolute path instead of "uploads/files/"
    } else {
      cb(new Error("Unsupported file type"), null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
    console.log(`📝 Generated filename: ${filename}`);
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
      console.log(`✅ File accepted: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`❌ File rejected: ${file.originalname}`);
      cb(new Error("Only images (jpeg, jpg, png, gif, webp, svg) and files (pdf, doc, docx, txt, xls, xlsx, ppt, pptx, zip, rar) are allowed!"), false);
    }
  }
});

// Upload endpoint with logging
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
      
      // Verify file exists after upload
      if (!fs.existsSync(file.path)) {
        console.error(`❌ File not saved: ${file.path}`);
        throw new Error(`File not saved properly: ${file.filename}`);
      }
      
      console.log(`✅ File saved: ${file.filename} (${file.size} bytes)`);
      
      return {
        id: file.filename.split('.')[0], // Use filename without extension as ID
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

// Get all uploaded files
app.get("/files", (req, res) => {
  try {
    const getAllFiles = (dir, type) => {
      if (!fs.existsSync(dir)) return [];
      
      return fs.readdirSync(dir).map(filename => {
        const filePath = path.join(dir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          id: filename.split('.')[0],
          filename: filename,
          size: stats.size,
          type: type,
          url: `/${type === 'image' ? 'images' : 'files'}/${filename}`,
          uploadedAt: stats.birthtime.toISOString()
        };
      });
    };

    const images = getAllFiles(imagesDir, 'image');
    const files = getAllFiles(filesDir, 'file');
    
    res.json({
      success: true,
      files: [...images, ...files]
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve files: " + error.message });
  }
});

// Delete file endpoint
app.delete("/delete/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Check in images directory first
    let filePath = path.join(imagesDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ 
        success: true, 
        message: "Image deleted successfully" 
      });
    }
    
    // Check in files directory
    filePath = path.join(filesDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ 
        success: true, 
        message: "File deleted successfully" 
      });
    }
    
    // File not found
    res.status(404).json({ 
      success: false, 
      error: "File not found" 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete file: " + error.message 
    });
  }
});

// Delete multiple files
app.delete("/delete-multiple", (req, res) => {
  try {
    const { filenames } = req.body;
    
    if (!filenames || !Array.isArray(filenames)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid filenames array" 
      });
    }

    const results = [];
    
    filenames.forEach(filename => {
      let deleted = false;
      
      // Try images directory
      let filePath = path.join(imagesDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      } else {
        // Try files directory
        filePath = path.join(filesDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleted = true;
        }
      }
      
      results.push({
        filename: filename,
        deleted: deleted
      });
    });

    res.json({
      success: true,
      message: "Batch deletion completed",
      results: results
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete files: " + error.message 
    });
  }
});

// Serve static files
app.use("/images", express.static(imagesDir));
app.use("/files", express.static(filesDir));

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name.' });
    }
  }
  
  res.status(500).json({ error: error.message });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log(`🚀 File upload server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
  console.log(`🖼️  Images directory: ${imagesDir}`);
  console.log(`📄 Files directory: ${filesDir}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/upload`);
});