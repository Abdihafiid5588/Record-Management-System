const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting for auth routes (login/register)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  // production: strict, development: relaxed
  message: {
    error: 'Too many login attempts, please try again after 10 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  // production: safe, development: more generous
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware with custom config
const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  // disable CSP in dev to avoid blocking React hot reload
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  securityHeaders,
};
