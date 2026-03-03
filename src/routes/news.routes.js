// src/routes/news.routes.js
// Routes per gestione news

const express = require('express');
const router = express.Router();

const newsController = require('../controllers/news.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const { validatePagination, validateId } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/news
 * @desc    Lista news pubblicate
 * @access  Public
 */
router.get('/',
  optionalAuth,
  validatePagination,
  asyncHandler(newsController.getNews)
);

/**
 * @route   GET /api/news/categories
 * @desc    Lista categorie news
 * @access  Public
 */
router.get('/categories',
  newsController.getCategories
);

/**
 * @route   GET /api/news/latest
 * @desc    Ultime news per dashboard
 * @access  Public
 */
router.get('/latest',
  asyncHandler(newsController.getLatestNews)
);

/**
 * @route   GET /api/news/:id
 * @desc    Dettaglio news
 * @access  Public
 */
router.get('/:id',
  optionalAuth,
  validateId('id'),
  asyncHandler(newsController.getNewsById)
);

module.exports = router;