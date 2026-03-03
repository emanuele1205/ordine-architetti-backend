// src/routes/messages.routes.js
// Routes per gestione messaggi

const express = require('express');
const router = express.Router();

const messagesController = require('../controllers/messages.controller');
const { authenticateToken, blockGuest } = require('../middleware/auth.middleware');
const { validateMessage, validateId } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/messages/conversations
 * @desc    Lista conversazioni utente
 * @access  Private (no guest)
 */
router.get('/conversations',
  authenticateToken,
  blockGuest,
  asyncHandler(messagesController.getConversations)
);

/**
 * @route   GET /api/messages/unread-count
 * @desc    Conta messaggi non letti
 * @access  Private (no guest)
 */
router.get('/unread-count',
  authenticateToken,
  blockGuest,
  asyncHandler(messagesController.getUnreadCount)
);

/**
 * @route   POST /api/messages/conversations
 * @desc    Crea nuova conversazione
 * @access  Private (no guest)
 */
router.post('/conversations',
  authenticateToken,
  blockGuest,
  asyncHandler(messagesController.createConversation)
);

/**
 * @route   GET /api/messages/conversations/:id
 * @desc    Messaggi di una conversazione
 * @access  Private
 */
router.get('/conversations/:id',
  authenticateToken,
  blockGuest,
  validateId('id'),
  asyncHandler(messagesController.getConversationMessages)
);

/**
 * @route   POST /api/messages/conversations/:id/messages
 * @desc    Invia messaggio in conversazione
 * @access  Private (no guest)
 */
router.post('/conversations/:id/messages',
  authenticateToken,
  blockGuest,
  validateId('id'),
  asyncHandler(messagesController.sendMessage)
);

module.exports = router;