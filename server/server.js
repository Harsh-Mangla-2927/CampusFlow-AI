const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { validateEnv } = require('./config/envValidator');
const { securityHeaders } = require('./middleware/securityMiddleware');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const academicRecordRoutes = require('./routes/academicRecordRoutes');
const taskRoutes = require('./routes/taskRoutes');
const examRoutes = require('./routes/examRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const intelligenceRoutes = require('./routes/intelligenceRoutes');
const contactRoutes = require('./routes/contactRoutes');

dotenv.config();

// Validate critical environment variables
validateEnv();

// Connect to MongoDB
connectDB();

const app = express();

// Apply Security Headers
app.use(securityHeaders);

// --- Core Middleware ---
// Support comma-separated CLIENT_URL list in production with trailing slash normalization
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (configuredOrigins.length === 0 || configuredOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed in production`));
    }
  : (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      // Allow any localhost port in development
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    };

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Static Uploads ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusFlow AI API is running.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/records', academicRecordRoutes);
app.use('/api/academic-records', academicRecordRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', intelligenceRoutes); // /api/dashboard, /api/analytics, etc.

// --- Error Handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
const mongoose = require('mongoose');

const server = app.listen(PORT, () => {
  console.log(`\n🚀 CampusFlow AI Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown handler
const handleGracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnection:', err.message);
      process.exit(1);
    }
  });

  // Force close if graceful shutdown exceeds 10 seconds
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcefully terminating.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

module.exports = app;
