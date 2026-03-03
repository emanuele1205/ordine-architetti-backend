// src/routes/auth.routes.js
// Routes per autenticazione

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRegistration, validateLogin, validateActivation } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Registrazione nuovo utente
 * @access  Public
 */
router.post('/register', 
  validateRegistration,
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login utente
 * @access  Public
 */
router.post('/login',
  validateLogin,
  asyncHandler(authController.login)
);

/**
 * @route   POST /api/auth/guest
 * @desc    Accesso come ospite
 * @access  Public
 */
router.post('/guest',
  authController.guestAccess
);

/**
 * @route   POST /api/auth/activate-architect
 * @desc    Attivazione profilo architetto con token
 * @access  Private (utente autenticato)
 */
router.post('/activate-architect',
  authenticateToken,
  validateActivation,
  asyncHandler(authController.activateArchitect)
);

/**
 * @route   GET /api/auth/me
 * @desc    Ottiene dati utente corrente
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  asyncHandler(authController.getCurrentUser)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Rinnova token JWT
 * @access  Private
 */
router.post('/refresh',
  authenticateToken,
  asyncHandler(authController.refreshToken)
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambio password
 * @access  Private
 */
router.post('/change-password',
  authenticateToken,
  asyncHandler(authController.changePassword)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Richiesta reset password (invia email con token)
 * @access  Public
 */
router.post('/forgot-password',
  asyncHandler(authController.forgotPassword)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password con token
 * @access  Public
 */
router.post('/reset-password',
  asyncHandler(authController.resetPassword)
);

module.exports = router;