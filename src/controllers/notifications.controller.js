// src/controllers/notifications.controller.js
const { Notifications } = require('../services/data.service');
const { HTTP_STATUS } = require('../utils/constants');
const { paginate } = require('../utils/helpers');

/**
 * GET /api/notifications
 * Lista notifiche dell'utente corrente
 */
const getMyNotifications = (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    let notifications = Notifications.findByUserId(userId);

    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }

    // Ordina per data più recente
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const result = paginate(notifications, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      ...result,
      unreadCount: Notifications.countUnread(userId)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Segna notifica come letta
 */
const markAsRead = (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = Notifications.findById(id);
    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Notifica non trovata'
      });
    }

    if (notification.userId !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non autorizzato'
      });
    }

    Notifications.markAsRead(id);

    res.json({
      success: true,
      message: 'Notifica segnata come letta'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Segna tutte le notifiche come lette
 */
const markAllAsRead = (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = Notifications.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifiche segnate come lette`
    });

  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Elimina una notifica
 */
const deleteNotification = (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = Notifications.findById(id);
    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Notifica non trovata'
      });
    }

    if (notification.userId !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non autorizzato'
      });
    }

    Notifications.delete(id);

    res.json({
      success: true,
      message: 'Notifica eliminata'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Helper: crea notifica per utente (usato internamente)
 */
const createNotification = (userId, { type, title, message, link }) => {
  return Notifications.create({
    userId,
    type,       // 'message', 'course', 'system', 'news'
    title,
    message,
    link: link || null,
    read: false
  });
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
};
