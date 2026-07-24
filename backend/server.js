const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Security Middlewares
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const socketHelper = require('./config/socketHelper');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Setup socket helper
socketHelper.init(io);

// Database connection handled during server startup block below

// Create uploads folder if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Security Headers Configuration (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP for dev static file rendering, enable other protections
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Rate Limiting to prevent spam queries (Brute force protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// 3. XSS Sanitization protection
app.use(xss());

// Standard middleware
app.use(cors());
app.use(express.json({ limit: '15mb' })); // Support base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static uploaded files
app.use('/uploads', express.static(uploadsDir));

// Multer storage engine for image uploads (Local fallback)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Images only (jpeg, jpg, png, webp)'));
  }
});

// Image Upload API endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imageUrl: fileUrl });
});

// Routes configuration
app.use('/api/auth', require('./routes/auth'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

const { getApiDocsHtml } = require('./config/apiDocs');

// Root endpoint
app.get('/', (req, res) => {
  res.send('🥗 FoodBridge Production API is running...');
});

// API Documentation Endpoint
app.get('/api/docs', (req, res) => {
  res.send(getApiDocsHtml());
});

// Socket.io connection setup
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Register socket helper event handlers (location updates and rooms chat)
  socketHelper.registerSocketEvents(socket);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Production Server running on port ${PORT}`);
  });
};
startServer();
