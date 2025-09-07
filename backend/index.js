const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Import middleware
const { authLimiter, apiLimiter, securityHeaders } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { auth: authenticateToken } = require('./middleware/auth');

// Security middleware
app.set('trust proxy', 1);
app.use(securityHeaders);

// Rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'https://record-management-system-pi.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}));

app.options('*', cors());
app.use(express.json());

// Serve uploaded files
app.get('/uploads/*', authenticateToken, (req, res, next) => {
  try {
    const relPath = req.params[0];
    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(__dirname, 'uploads', safePath);
    const uploadsDir = path.resolve(path.join(__dirname, 'uploads'));
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(uploadsDir)) return res.status(400).json({ message: 'Invalid file path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/records', require('./routes/records'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api', (req, res) => res.json({ message: 'Government Records API' }));

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});