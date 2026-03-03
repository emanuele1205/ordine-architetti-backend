// src/middleware/auth.middleware.js
// Middleware per autenticazione e autorizzazione

const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

/**
 * Middleware per verificare il token JWT
 * Estrae il token dall'header Authorization e verifica la validità
 */
const authenticateToken = (req, res, next) => {
  // Estrai il token dall'header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Token di accesso richiesto'
    });
  }

  try {
    // Verifica il token
    const decoded = jwt.verify(token, authConfig.jwt.secret);
    
    // Aggiungi i dati dell'utente alla request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      userType: decoded.userType,
      isVerified: decoded.isVerified
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_MESSAGES.TOKEN_EXPIRED,
        message: 'Il token è scaduto, effettua nuovamente il login'
      });
    }
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_MESSAGES.TOKEN_INVALID,
      message: 'Token non valido'
    });
  }
};

/**
 * Middleware opzionale per autenticazione
 * Se c'è un token valido, aggiunge l'utente alla request
 * Se non c'è token o non è valido, continua comunque
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, authConfig.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      userType: decoded.userType,
      isVerified: decoded.isVerified
    };
  } catch (error) {
    req.user = null;
  }
  
  next();
};

/**
 * Factory per middleware che richiede un tipo utente specifico
 * @param {...string} allowedTypes - Tipi utente permessi
 * @returns {Function} Middleware
 */
const requireUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: 'Autenticazione richiesta'
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_MESSAGES.FORBIDDEN,
        message: `Accesso riservato a: ${allowedTypes.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware che richiede utente verificato (architetto verificato)
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Autenticazione richiesta'
    });
  }

  if (!req.user.isVerified) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_MESSAGES.FORBIDDEN,
      message: 'Account non verificato'
    });
  }

  next();
};

/**
 * Middleware per bloccare gli utenti guest
 */
const blockGuest = (req, res, next) => {
  if (!req.user || req.user.userType === 'guest') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_MESSAGES.FORBIDDEN,
      message: 'Funzionalità non disponibile per utenti ospiti'
    });
  }
  next();
};

/**
 * Middleware per admin only
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.userType !== 'admin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_MESSAGES.FORBIDDEN,
      message: 'Accesso riservato agli amministratori'
    });
  }
  next();
};

/**
 * Genera un token JWT per un utente
 * @param {Object} user - Dati utente
 * @returns {string} Token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      userType: user.userType,
      isVerified: user.isVerified || false
    },
    authConfig.jwt.secret,
    { expiresIn: authConfig.jwt.expiresIn }
  );
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireUserType,
  requireVerified,
  blockGuest,
  requireAdmin,
  generateToken
};