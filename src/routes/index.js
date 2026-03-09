// src/routes/index.js
// Aggregatore di tutte le routes

const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const architectsRoutes = require('./architects.routes');
const coursesRoutes = require('./courses.routes');
const newsRoutes = require('./news.routes');
const messagesRoutes = require('./messages.routes');
const adminRoutes = require('./admin/admin.routes');
const uploadRoutes = require('./upload.routes');
const notificationsRoutes = require('./notifications.routes');

// Costanti per info ordine
const { ORDINE_INFO } = require('../utils/constants');

/**
 * @route   GET /api
 * @desc    API info e health check
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Ordine Architetti P.P.C. Caltanissetta',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      architects: '/api/architects',
      courses: '/api/courses',
      news: '/api/news',
      messages: '/api/messages',
      admin: '/api/admin',
      notifications: '/api/notifications',
      info: '/api/info',
      stats: '/api/stats'
    }
  });
});

/**
 * @route   GET /api/health
 * @desc    Health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  const { isMongoConnected } = require('../config/db');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isMongoConnected() ? 'mongodb' : 'json-files'
  });
});

/**
 * @route   GET /api/info
 * @desc    Informazioni Ordine
 * @access  Public
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    info: ORDINE_INFO
  });
});

/**
 * @route   GET /api/stats
 * @desc    Statistiche generali
 * @access  Public
 */
router.get('/stats', (req, res) => {
  const { Users, Architects, Courses, News } = require('../services/data.service');
  
  const stats = {
    architects: {
      total: Architects.findAll().length,
      visible: Architects.findVisible().length,
      available: Architects.findAvailable().length
    },
    users: {
      total: Users.findAll().length,
      active: Users.findAll({ isActive: true }).length
    },
    courses: {
      total: Courses.findAll().length,
      upcoming: Courses.findActive().length
    },
    news: {
      total: News.findAll().length,
      published: News.findPublished().length
    }
  };
  
  res.json({
    success: true,
    stats
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/architects', architectsRoutes);
router.use('/courses', coursesRoutes);
router.use('/news', newsRoutes);
router.use('/messages', messagesRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/notifications', notificationsRoutes);

module.exports = router;