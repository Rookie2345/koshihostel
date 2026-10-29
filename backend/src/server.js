require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { prisma } = require('./prisma');
const { errorHandler } = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const feeGroupRoutes = require('./routes/feeGroups');
const billingRoutes = require('./routes/billing');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const studentSelfRoutes = require('./routes/studentSelf');

const app = express();

// Security Headers
app.use(helmet());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!corsOrigin || corsOrigin === '*') return callback(null, true);
      const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
      if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  }
});
app.use('/api', generalLimiter);

// Stricter Rate Limiter for Authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 authentication attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh', authLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Koshi Hostel Management API is operating normally',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fee-groups', feeGroupRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/me', studentSelfRoutes);

// 404 Route Handler for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

// Global Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 5000;

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🚀 Koshi Hostel Backend Server running on port ${PORT}`);
    console.log(`🌐 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);

    // Ensure 'amoon67' is automatically migrated to 'admin'
    try {
      const oldAdmin = await prisma.user.findUnique({ where: { username: 'amoon67' } });
      if (oldAdmin) {
        await prisma.user.update({
          where: { id: oldAdmin.id },
          data: { username: 'admin' }
        });
        console.log(`[BOOT] Migrated admin username from "amoon67" to "admin".`);
      }
    } catch (err) {
      console.warn(`[BOOT] Admin username check:`, err.message);
    }
  });
}

// Graceful Shutdown
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await prisma.$disconnect();
      console.log('Database connections closed.');
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
