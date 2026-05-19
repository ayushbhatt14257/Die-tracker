require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { startAlertCron } = require('./services/alertService');

const app = express();

app.set('trust proxy', 1);


// ======================
// Security Middleware
// ======================

app.use(helmet());

app.use(mongoSanitize());


// ======================
// Rate Limiting
// ======================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many login attempts.',
  },
});

app.use('/api/auth/login', authLimiter);


// ======================
// CORS
// ======================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);


// ======================
// Body Parsers
// ======================

app.use(express.json({ limit: '10kb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);


// ======================
// Logging
// ======================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// ======================
// Health Route
// ======================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Die Tracker API running',
    env: process.env.NODE_ENV,
  });
});


// ======================
// API Routes
// ======================

app.use('/api', routes);


// ======================
// Frontend Static Files
// ======================

const frontendDist = path.join(__dirname, '../../frontend/dist');

console.log('====================================');
console.log('Frontend Path:', frontendDist);
console.log(
  'Index Exists:',
  fs.existsSync(path.join(frontendDist, 'index.html'))
);
console.log('====================================');

app.use(
  express.static(frontendDist, {
    index: false,
  })
);


// ======================
// React Catch-All Route
// ======================

app.get('*', (req, res) => {
  const indexPath = path.join(frontendDist, 'index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Check Render build command.');
  }
});


// ======================
// Error Middleware
// ======================

app.use(notFound);

app.use(errorHandler);


// ======================
// Server Start
// ======================

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('\n========================================');
      console.log(`Die Tracker API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log('========================================\n');

      startAlertCron();
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

module.exports = app;