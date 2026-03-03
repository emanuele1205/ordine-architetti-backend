// src/routes/notifications.routes.js
const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Tutte le route richiedono autenticazione
router.use(authenticateToken);

router.get('/', asyncHandler(notificationsController.getMyNotifications));
router.patch('/read-all', asyncHandler(notificationsController.markAllAsRead));
router.patch('/:id/read', asyncHandler(notificationsController.markAsRead));
router.delete('/:id', asyncHandler(notificationsController.deleteNotification));

module.exports = router;
