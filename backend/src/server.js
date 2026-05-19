require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');


const connectDB = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { startAlertCron } = require('./services/alertService');

const app = express();
app.set('trust proxy', 1);
// ── Security middleware ─────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts.' },
});
app.use('/api/auth/login', authLimiter);

// ── CORS ────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body parsing ────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Logging ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ success: true, message: 'Die Tracker API running', env: process.env.NODE_ENV }));

// ── Routes ──────────────────────────────────────────────
app.use('/api', routes);


// Serve React frontend
// const frontendDist = path.resolve(process.cwd(), 'frontend', 'dist');
// const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const frontendDist = path.resolve(process.cwd(), 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});



// ── Error handling ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Die Tracker API running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV}`);
    console.log(`========================================\n`);
    startAlertCron();
  });
});

module.exports = app;
