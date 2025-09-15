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
