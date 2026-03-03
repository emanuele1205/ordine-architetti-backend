// src/routes/users.routes.js
// Routes per gestione utenti

const express = require('express');
const router = express.Router();

const usersController = require('../controllers/users.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateProfileUpdate, validateId } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/users/:id
 * @desc    Ottiene profilo utente
 * @access  Private (solo proprio profilo o admin)
 */
router.get('/:id',
  authenticateToken,
  validateId('id'),
  asyncHandler(usersController.getUserById)
);

/**
 * @route   PUT /api/users/:id
 * @desc    Aggiorna profilo utente
 * @access  Private (solo proprio profilo)
 */
router.put('/:id',
  authenticateToken,
  validateId('id'),
  validateProfileUpdate,
  asyncHandler(usersController.updateUser)
);

/**
 * @route   PUT /api/users/:id/settings
 * @desc    Aggiorna impostazioni utente
 * @access  Private (solo proprio profilo)
 */
router.put('/:id/settings',
  authenticateToken,
  validateId('id'),
  asyncHandler(usersController.updateSettings)
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Disattiva account utente
 * @access  Private (solo proprio profilo o admin)
 */
router.delete('/:id',
  authenticateToken,
  validateId('id'),
  asyncHandler(usersController.deleteUser)
);

module.exports = router;