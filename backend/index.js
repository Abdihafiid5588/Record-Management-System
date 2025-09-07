// index.js (replace your current file with this)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const { authLimiter, apiLimiter, securityHeaders } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { auth: authenticateToken } = require('./middleware/auth');

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
    if (!origin) return callback(null, true);
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

// ------------------ Helpers to safely require + mount routes ------------------ //
function requireRoute(modulePath) {
  try {
    console.log(`Requiring route module: ${modulePath}`);
    const mod = require(modulePath);
    console.log(`Required: ${modulePath}`);
    return mod;
  } catch (err) {
    console.error(`ERROR while requiring ${modulePath}`);
    console.error(err && err.stack ? err.stack : err);
    // Re-throw so caller knows it failed
    throw err;
  }
}

function safeMount(mountPath, modulePath, name) {
  try {
    console.log(`\n--> Attempting to load & mount ${name || modulePath} at ${mountPath}`);
    const router = requireRoute(modulePath);
    app.use(mountPath, router);
    console.log(`✅ Mounted ${name || modulePath} at ${mountPath}`);
  } catch (err) {
    console.error(`❌ Failed to load or mount ${name || modulePath} at ${mountPath}`);
    console.error('Error message:', err && err.message);
    // Exit so logs remain obvious in your deploy logs
    process.exit(1);
  }
}

// ------------------ Mount your routes (lazy require + safe mount) ------------------ //
safeMount('/api/auth', './routes/auth', 'authRoutes');
safeMount('/api/user', './routes/user', 'userRoutes');
safeMount('/api/admin', './routes/admin', 'adminRoutes');
safeMount('/api/records', './routes/records', 'recordsRoutes');
safeMount('/api/dashboard', './routes/dashboard', 'dashboardRoutes');

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
