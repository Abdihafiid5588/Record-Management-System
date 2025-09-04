const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Routes
const recordsRoutes = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Middleware
const { authLimiter, apiLimiter, securityHeaders } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { auth: authenticateToken } = require('./middleware/auth'); // your auth middleware
dotenv.config();

const app = express();

// ------------------ Trust Proxy ------------------ //
// Needed for express-rate-limit to read X-Forwarded-For correctly on Render
app.set('trust proxy', 1);

// ------------------ Security Middleware ------------------ //
app.use(securityHeaders); // Add security headers early

// Apply limiters only where needed
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter); // General API limiter

// ------------------ CORS ------------------ //
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://record-management-system-pi.vercel.app' // replace with your real frontend URL
    : '*',
  credentials: true,
}));

app.use(express.json());

// ------------------ Protected Uploads ------------------ //
// Only authenticated users (users or admins) can access images
app.get('/uploads/:filename', authenticateToken, (req, res, next) => {
  try {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// ------------------ API Routes ------------------ //
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
