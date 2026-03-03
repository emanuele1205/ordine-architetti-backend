// src/controllers/news.controller.js
// Controller per gestione news e comunicazioni

const { News } = require('../services/data.service');
const { paginate } = require('../utils/helpers');
const { HTTP_STATUS, NEWS_CATEGORIES } = require('../utils/constants');

/**
 * GET /api/news
 * Lista news pubblicate
 */
const getNews = (req, res, next) => {
  try {
    const {
      category,
      important,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Carica news pubblicate
    let news = News.findPublished();

    // Filtro per categoria
    if (category) {
      news = news.filter(n => 
        n.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Filtro per importanza
    if (important === 'true') {
      news = news.filter(n => n.important === true);
    }

    // Ricerca testuale
    if (search) {
      const searchLower = search.toLowerCase();
      news = news.filter(n =>
        n.title?.toLowerCase().includes(searchLower) ||
        n.excerpt?.toLowerCase().includes(searchLower) ||
        n.content?.toLowerCase().includes(searchLower)
      );
    }

    // Paginazione
    const result = paginate(news, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/news/:id
 * Dettaglio singola news
 */
const getNewsById = (req, res, next) => {
  try {
    const { id } = req.params;

    const newsItem = News.findById(id);
    if (!newsItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'News non trovata'
      });
    }

    // Verifica che sia pubblicata (o admin)
    if (!newsItem.isPublished && req.user?.userType !== 'admin') {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'News non trovata'
      });
    }

    res.json({
      success: true,
      news: newsItem
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/news/categories
 * Lista categorie disponibili
 */
const getCategories = (req, res) => {
  res.json({
    success: true,
    categories: NEWS_CATEGORIES
  });
};

/**
 * GET /api/news/latest
 * Ultime 5 news importanti per dashboard
 */
const getLatestNews = (req, res, next) => {
  try {
    const { count = 5 } = req.query;

    let news = News.findPublished();
    
    // Prendi le prime N
    news = news.slice(0, parseInt(count));

    res.json({
      success: true,
      news
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNews,
  getNewsById,
  getCategories,
  getLatestNews
};