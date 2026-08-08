import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import connectDB from './db.js';

import vehicleRoutes from './routes/vehicles.js';
import bookingRoutes from './routes/bookings.js';
import accountingRoutes from './routes/accounting.js';
import authRoutes from './routes/auth.js';
import zoneRoutes from './routes/zones.js';
import userRoutes from './routes/users.js';
import { protect, isolateWorkerData } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();

// ─── Trust Vercel / reverse-proxy headers ────────────────────────────────────
// Required for express-rate-limit to work correctly behind Vercel's proxy.
// Without this, rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and
// crashes the serverless function on every request.
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null; // null = allow all (development only)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, serverless)
    if (!origin) return callback(null, true);
    // In production, restrict to ALLOWED_ORIGINS
    if (ALLOWED_ORIGINS && !ALLOWED_ORIGINS.includes(origin)) {
      return callback(new Error(`CORS: Origin ${origin} is not allowed`), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── NoSQL Injection Prevention ───────────────────────────────────────────────
app.use(mongoSanitize());

// ─── Global Rate Limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

// Stricter limiter for write operations (POST/PUT/PATCH)
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many write requests, please slow down.' }
});

app.use('/api', globalLimiter);
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    writeLimiter(req, res, next);
  } else {
    next();
  }
});

// ─── MongoDB connection middleware (for serverless environments) ───────────────
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      // Non-fatal: continue with in-memory fallback
      console.warn('[Server] DB reconnect failed, continuing in fallback mode.');
    }
  }
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/users', userRoutes);

// Protected routes with Worker Data Isolation
app.use('/api/vehicles', protect, isolateWorkerData, vehicleRoutes);
app.use('/api/bookings', protect, isolateWorkerData, bookingRoutes);
app.use('/api/accounting', protect, isolateWorkerData, accountingRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || 'development'
  });
});

// ─── Database Status (standardized format) ───────────────────────────────────
app.get('/api/system/database-status', (req, res) => {
  const readyState = mongoose.connection.readyState;
  const connected = readyState === 1;

  res.json({
    connected,
    mode: connected ? 'mongodb' : 'memory',
    database: connected ? mongoose.connection.name : null,
    host: connected ? mongoose.connection.host : null,
    readyState
  });
});

// Legacy alias kept for backward compatibility with existing frontend polling
app.get('/api/db-status', (req, res) => {
  const readyState = mongoose.connection.readyState;
  const connected = readyState === 1;
  res.json({
    connected,
    mode: connected ? 'MongoDB Cloud' : 'In-Memory Fallback',
    host: connected ? mongoose.connection.host : 'localhost',
    database: connected ? mongoose.connection.name : null
  });
});

// ─── Root Route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'NX Car Rental API',
    status: 'running',
    version: '1.0.0',
    time: new Date().toISOString(),
    endpoints: {
      vehicles: '/api/vehicles',
      bookings: '/api/bookings',
      accounting: '/api/accounting',
      health: '/health',
      dbStatus: '/api/system/database-status'
    }
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[Server Error]', err.message);
  if (isDev) console.error(err.stack);

  // Handle CORS errors
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

// ─── Seed initial vehicles if DB is empty ────────────────────────────────────
const seedIfEmpty = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const { default: Vehicle } = await import('./models/Vehicle.js');
    const vehicleCount = await Vehicle.countDocuments({});
    if (vehicleCount === 0) {
      const { seedVehicles } = await import('./seeds/vehicles.js');
      await Vehicle.insertMany(seedVehicles);
      console.log(`[Seed] Seeded ${seedVehicles.length} initial vehicles to MongoDB.`);
    }
  } catch (err) {
    console.error('[Seed] Failed to seed vehicles:', err.message);
  }
};

// ─── Server startup ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  // Traditional Node.js: connect first, then listen
  connectDB().then(async () => {
    await seedIfEmpty();
    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  }).catch(err => {
    console.error('[Server] Fatal startup error:', err.message);
    // Still start server in memory-fallback mode if not explicitly disabled
    if (process.env.DISABLE_MEMORY_FALLBACK !== 'true') {
      app.listen(PORT, () => {
        console.warn(`[Server] Running in IN-MEMORY mode on port ${PORT} — data will not persist!`);
      });
    } else {
      process.exit(1);
    }
  });
} else {
  // Serverless (Vercel): connect eagerly on cold start, don't call listen
  connectDB()
    .then(seedIfEmpty)
    .catch(err => console.error('[Server] Vercel startup error:', err.message));
}

export default app;
