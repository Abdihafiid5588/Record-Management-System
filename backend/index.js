const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Your routes
const recordsRoutes = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Middleware
const { authLimiter, apiLimiter, securityHeaders } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { auth: authenticateToken } = require('./middleware/auth');
dotenv.config();

const app = express();

// ------------------ Trust Proxy ------------------ //
app.set('trust proxy', 1);

// ------------------ Security Middleware ------------------ //
app.use(securityHeaders);

// Apply limiters only where needed
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

// ------------------ CORS Configuration ------------------ //
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'https://record-management-system-pi.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// ------------------ Protected Uploads ------------------ //
app.get('/uploads/*', authenticateToken, (req, res, next) => {
  try {
    const relPath = req.params[0];
    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(__dirname, 'uploads', safePath);

    const uploadsDir = path.resolve(path.join(__dirname, 'uploads'));
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(uploadsDir)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// ------------------ Safe mounting for API Routes ------------------ //
// Use this wrapper to identify which route file causes path-to-regexp errors
function safeMount(mountPath, routerOrModule, name) {
  try {
    console.log(`Mounting ${name || mountPath} -> ${mountPath}`);
    app.use(mountPath, routerOrModule);
    console.log(`Mounted ${name || mountPath} OK`);
  } catch (err) {
    console.error(`\nFailed mounting ${name || mountPath} -> ${mountPath}`);
    console.error('Error message:', err && err.message);
    console.error('Full error:', err);
    // Exit so you can inspect logs and fix the offending file
    process.exit(1);
  }
}

// Mount routes using safeMount (copy-paste updated mounting)
safeMount('/api/auth', authRoutes, 'authRoutes');
safeMount('/api/user', userRoutes, 'userRoutes');
safeMount('/api/admin', adminRoutes, 'adminRoutes');
safeMount('/api/records', recordsRoutes, 'recordsRoutes');
safeMount('/api/dashboard', dashboardRoutes, 'dashboardRoutes');

// Basic route
app.get('/api', (req, res) => {
  res.json({ message: 'Government Records API' });
});

// ------------------ Error Handler ------------------ //
app.use(errorHandler);

// ------------------ Start Server ------------------ //
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
