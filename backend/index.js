// index.js - path-to-regexp trace wrapper + diagnostic
// COPY-PASTE OVER YOUR index.js

// wrap very early: load path-to-regexp and patch its parse to log offending input
try {
  const p2r = require('path-to-regexp');
  if (p2r && typeof p2r.parse === 'function') {
    const origParse = p2r.parse;
    p2r.parse = function patchedParse(str, opts) {
      try {
        if (typeof str === 'string' && /^https?:\/\//i.test(str)) {
          console.error('\n=== path-to-regexp.parse called with a URL-like string ===');
          console.error('Value:', str);
          console.error('Call stack:\n', new Error().stack);
        }
        // also log if str contains an isolated ":" that would cause missing parameter
        if (typeof str === 'string' && /(^|[^A-Za-z0-9_]):(\s|$|\/)/.test(str)) {
          console.error('\n=== path-to-regexp.parse called with a suspicious route string (colon with no name) ===');
          console.error('Value:', str);
          console.error('Call stack:\n', new Error().stack);
        }
      } catch (e) {
        console.error('Error inside patched parse logger', e && e.stack ? e.stack : e);
      }
      return origParse.call(this, str, opts);
    };
    console.log('Patched path-to-regexp.parse for diagnostics');
  } else {
    console.log('path-to-regexp.parse not found (unexpected), continuing');
  }
} catch (e) {
  // if require fails (unlikely), continue without patch
  console.error('Could not require path-to-regexp for patching:', e && e.stack ? e.stack : e);
}

/* --- normal diagnostic server below --- */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

// global uncaught exception handler to dump useful info
process.on('uncaughtException', (err) => {
  console.error('\n=== UNCAUGHT EXCEPTION ===');
  console.error(err && err.stack ? err.stack : err);
  try {
    console.error('\n=== Last 40 require.cache keys ===');
    Object.keys(require.cache).slice(-40).forEach((k) => console.error('  ', k));
  } catch (e) {
    console.error('Could not list require.cache', e && e.stack ? e.stack : e);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('\n=== UNHANDLED REJECTION ===');
  console.error('Promise:', p);
  console.error('Reason:', reason && reason.stack ? reason.stack : reason);
});

const app = express();

console.log('== path-to-regexp DIAGNOSTIC server starting ==');
console.log('cwd:', process.cwd());
const routesDir = path.join(__dirname, 'routes');
try {
  const files = fs.existsSync(routesDir) ? fs.readdirSync(routesDir) : [];
  console.log('routes folder listing:', files);
} catch (err) {
  console.error('Could not read routes directory:', err && err.stack);
}

// print envs that often cause problems
console.log('=== Some environment variables (if set) ===');
['BASE_URL','API_URL','CLIENT_URL','FRONTEND_URL','PUBLIC_URL','APP_URL','MOUNT_PATH'].forEach(k => {
  if (process.env[k]) console.log(`  ${k}=${process.env[k]}`);
});
console.log('=========================================');

// wrap app.use early to catch direct URL uses
(function wrapAppUse(appInstance) {
  const originalUse = appInstance.use;
  appInstance.use = function wrappedUse(...args) {
    try {
      if (args.length > 0 && typeof args[0] === 'string' && /^https?:\/\//i.test(args[0])) {
        console.error('\n=== Detected app.use called with a full URL string ===');
        console.error('Value passed to app.use():', args[0]);
        console.error('Call stack (where app.use was invoked):\n', new Error().stack);
        process.exit(1);
      }
    } catch (e) {
      console.error('Error inspecting app.use args', e && e.stack ? e.stack : e);
    }
    return originalUse.apply(this, args);
  };
})(app);

// wrap Router methods to catch URL-like strings
(function wrapRouterMethods() {
  const Router = express.Router;
  const proto = Router && Router().constructor && Router().constructor.prototype
    ? Router().constructor.prototype
    : express.Router && express.Router.prototype;
  if (!proto) return;

  const methodsToWrap = ['use', 'get', 'post', 'put', 'delete', 'patch', 'all'];
  methodsToWrap.forEach((m) => {
    if (!proto[m]) return;
    const original = proto[m];
    proto[m] = function wrappedRouterMethod(...args) {
      try {
        if (args.length > 0 && typeof args[0] === 'string' && /^https?:\/\//i.test(args[0])) {
          console.error(`\n=== Detected router.${m} called with a full URL string ===`);
          console.error(`Value passed to router.${m}():`, args[0]);
          console.error('Call stack (where router method was invoked):\n', new Error().stack);
          process.exit(1);
        }
        // also catch colon-without-name suspicious patterns quickly
        if (args.length > 0 && typeof args[0] === 'string' && /(^|[^A-Za-z0-9_]):(\s|$|\/)/.test(args[0])) {
          console.error(`\n=== Detected router.${m} called with suspicious route string (colon with no name) ===`);
          console.error(`Value passed to router.${m}():`, args[0]);
          console.error('Call stack (where router method was invoked):\n', new Error().stack);
          // don't exit here immediately — let path-to-regexp show its error for full stack too
        }
      } catch (e) {
        console.error('Error inspecting router args', e && e.stack ? e.stack : e);
      }
      return original.apply(this, args);
    };
  });
})();

const { authLimiter, apiLimiter, securityHeaders } = (function safeRequireSecurity() {
  try {
    console.log('Requiring middleware/security');
    const m = require('./middleware/security');
    console.log('✅ Required middleware/security');
    return m;
  } catch (e) {
    console.error('Failed to require ./middleware/security:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();

const errorHandler = (function safeRequireErrorHandler() {
  try {
    console.log('Requiring middleware/errorHandler');
    const m = require('./middleware/errorHandler');
    console.log('✅ Required middleware/errorHandler');
    return m;
  } catch (e) {
    console.error('Failed to require ./middleware/errorHandler:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();

const { auth: authenticateToken } = (function safeRequireAuth() {
  try {
    console.log('Requiring middleware/auth');
    const m = require('./middleware/auth');
    console.log('✅ Required middleware/auth');
    return m;
  } catch (e) {
    console.error('Failed to require ./middleware/auth:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();

app.set('trust proxy', 1);
app.use(securityHeaders || ((req,res,next)=>next()));

app.use('/api/auth/login', authLimiter || ((req,res,next)=>next()));
app.use('/api/auth/register', authLimiter || ((req,res,next)=>next()));
app.use('/api', apiLimiter || ((req,res,next)=>next()));

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

function safeRequire(modulePath) {
  try {
    console.log('Requiring:', modulePath);
    const m = require(modulePath);
    console.log('✅ Required:', modulePath);
    return m;
  } catch (err) {
    console.error('❌ Require failed for', modulePath);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

function safeMount(mountPath, modulePath, name) {
  console.log(`\n-- mounting ${name || modulePath} -> ${mountPath}`);
  const router = safeRequire(modulePath);
  try {
    app.use(mountPath, router);
    console.log(`✅ Mounted ${name || modulePath} at ${mountPath}`);
  } catch (err) {
    console.error(`❌ Failed mounting ${name || modulePath} at ${mountPath}`);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

// mount routes (this will trigger our logging if something is wrong)
safeMount('/api/auth', './routes/auth', 'authRoutes');
safeMount('/api/user', './routes/user', 'userRoutes');
safeMount('/api/admin', './routes/admin', 'adminRoutes');
safeMount('/api/records', './routes/records', 'recordsRoutes');
safeMount('/api/dashboard', './routes/dashboard', 'dashboardRoutes');

app.get('/api', (req, res) => res.json({ message: 'Government Records API' }));

app.use(errorHandler || ((err, req, res, next) => {
  console.error('Global error handler triggered:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal Server Error' });
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
