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
const { auth: authenticateToken } = require('./middleware/auth');// your auth middleware
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------ Security Middleware ------------------ //
app.use(securityHeaders); // Add security headers early
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter); // General API rate limiting

app.use(cors());
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
