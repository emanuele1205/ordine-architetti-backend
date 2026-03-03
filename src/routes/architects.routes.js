// src/routes/architects.routes.js
// Routes per gestione architetti e albo

const express = require('express');
const router = express.Router();

const architectsController = require('../controllers/architects.controller');
const { authenticateToken, optionalAuth, requireUserType } = require('../middleware/auth.middleware');
const { validatePagination } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/architects
 * @desc    Lista architetti (albo pubblico)
 * @access  Public
 */
router.get('/',
  optionalAuth,
  validatePagination,
  asyncHandler(architectsController.getArchitects)
);

/**
 * @route   GET /api/architects/specialties
 * @desc    Lista specializzazioni disponibili
 * @access  Public
 */
router.get('/specialties',
  architectsController.getSpecialties
);

/**
 * @route   GET /api/architects/stats
 * @desc    Statistiche architetti
 * @access  Public
 */
router.get('/stats',
  asyncHandler(architectsController.getStats)
);

/**
 * @route   GET /api/architects/me
 * @desc    Ottieni il proprio profilo architetto
 * @access  Private (solo architetti)
 */
router.get('/me',
  authenticateToken,
  requireUserType('architect'),
  asyncHandler(architectsController.getMyProfile)
);

/**
 * @route   GET /api/architects/:id
 * @desc    Dettaglio architetto
 * @access  Public
 */
router.get('/:id',
  optionalAuth,
  asyncHandler(architectsController.getArchitectById)
);

/**
 * @route   PUT /api/architects/me
 * @desc    Aggiorna proprio profilo architetto
 * @access  Private (solo architetti)
 */
router.put('/me',
  authenticateToken,
  requireUserType('architect'),
  asyncHandler(architectsController.updateMyProfile)
);

module.exports = router;
