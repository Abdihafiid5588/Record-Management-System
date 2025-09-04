const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Limit each IP to 15 login requests per windowMs
  message: {
    error: 'Too many login attempts, please try again after 10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
const securityHeaders = helmet();

module.exports = {
  authLimiter,
  apiLimiter,
  securityHeaders
};
