// src/routes/courses.routes.js
// Routes per gestione corsi CFP

const express = require('express');
const router = express.Router();

const coursesController = require('../controllers/courses.controller');
const { authenticateToken, optionalAuth, blockGuest } = require('../middleware/auth.middleware');
const { validatePagination, validateId } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/courses
 * @desc    Lista corsi disponibili
 * @access  Public (con info iscrizione se autenticato)
 */
router.get('/',
  optionalAuth,
  validatePagination,
  asyncHandler(coursesController.getCourses)
);

/**
 * @route   GET /api/courses/my-enrollments
 * @desc    Lista iscrizioni dell'utente
 * @access  Private
 */
router.get('/my-enrollments',
  authenticateToken,
  blockGuest,
  asyncHandler(coursesController.getMyEnrollments)
);

/**
 * @route   GET /api/courses/:id
 * @desc    Dettaglio corso
 * @access  Public
 */
router.get('/:id',
  optionalAuth,
  validateId('id'),
  asyncHandler(coursesController.getCourseById)
);

/**
 * @route   POST /api/courses/:id/enroll
 * @desc    Iscrizione a un corso
 * @access  Private (no guest)
 */
router.post('/:id/enroll',
  authenticateToken,
  blockGuest,
  validateId('id'),
  asyncHandler(coursesController.enrollCourse)
);

/**
 * @route   DELETE /api/courses/:id/enroll
 * @desc    Cancella iscrizione
 * @access  Private
 */
router.delete('/:id/enroll',
  authenticateToken,
  validateId('id'),
  asyncHandler(coursesController.cancelEnrollment)
);

module.exports = router;