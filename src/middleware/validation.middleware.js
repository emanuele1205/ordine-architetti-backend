// src/middleware/validation.middleware.js
// Middleware per validazione input

const { HTTP_STATUS } = require('../utils/constants');
const { isValidEmail, sanitizeString } = require('../utils/helpers');

/**
 * Valida i dati di registrazione utente
 */
const validateRegistration = (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  const errors = [];

  // Email
  if (!email) {
    errors.push('Email obbligatoria');
  } else if (!isValidEmail(email)) {
    errors.push('Formato email non valido');
  }

  // Password
  if (!password) {
    errors.push('Password obbligatoria');
  } else if (password.length < 6) {
    errors.push('Password deve essere almeno 6 caratteri');
  }

  // Nome
  if (!firstName || firstName.trim().length < 2) {
    errors.push('Nome obbligatorio (minimo 2 caratteri)');
  }

  // Cognome
  if (!lastName || lastName.trim().length < 2) {
    errors.push('Cognome obbligatorio (minimo 2 caratteri)');
  }

  if (errors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Errori di validazione',
      details: errors
    });
  }

  // Sanitizza i dati
  req.body.email = email.toLowerCase().trim();
  req.body.firstName = sanitizeString(firstName);
  req.body.lastName = sanitizeString(lastName);

  next();
};

/**
 * Valida i dati di login
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email obbligatoria');
  } else if (!isValidEmail(email)) {
    errors.push('Formato email non valido');
  }

  if (!password) {
    errors.push('Password obbligatoria');
  }

  if (errors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Errori di validazione',
      details: errors
    });
  }

  req.body.email = email.toLowerCase().trim();

  next();
};

/**
 * Valida token di attivazione architetto
 */
const validateActivation = (req, res, next) => {
  const { activationToken, orderNumber } = req.body;
  const errors = [];

  if (!activationToken || activationToken.trim().length < 5) {
    errors.push('Token di attivazione obbligatorio');
  }

  if (!orderNumber || orderNumber.trim().length < 3) {
    errors.push('Numero ordine obbligatorio');
  }

  if (errors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Errori di validazione',
      details: errors
    });
  }

  req.body.activationToken = activationToken.trim().toUpperCase();
  req.body.orderNumber = orderNumber.trim();

  next();
};

/**
 * Valida dati aggiornamento profilo
 */
const validateProfileUpdate = (req, res, next) => {
  const { firstName, lastName, phone, bio } = req.body;
  const errors = [];

  if (firstName !== undefined && firstName.trim().length < 2) {
    errors.push('Nome deve essere almeno 2 caratteri');
  }

  if (lastName !== undefined && lastName.trim().length < 2) {
    errors.push('Cognome deve essere almeno 2 caratteri');
  }

  if (phone !== undefined && phone.trim().length > 0) {
    // Validazione base numero telefono (solo numeri, spazi, +, -)
    const phoneRegex = /^[\d\s\+\-\.]+$/;
    if (!phoneRegex.test(phone)) {
      errors.push('Formato telefono non valido');
    }
  }

  if (bio !== undefined && bio.length > 1000) {
    errors.push('Bio non può superare 1000 caratteri');
  }

  if (errors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Errori di validazione',
      details: errors
    });
  }

  // Sanitizza
  if (firstName) req.body.firstName = sanitizeString(firstName);
  if (lastName) req.body.lastName = sanitizeString(lastName);
  if (phone) req.body.phone = phone.trim();
  if (bio) req.body.bio = sanitizeString(bio);

  next();
};

/**
 * Valida dati messaggio
 */
const validateMessage = (req, res, next) => {
  const { content, recipientId } = req.body;
  const errors = [];

  if (!content || content.trim().length === 0) {
    errors.push('Contenuto messaggio obbligatorio');
  } else if (content.length > 5000) {
    errors.push('Messaggio troppo lungo (max 5000 caratteri)');
  }

  if (!recipientId) {
    errors.push('Destinatario obbligatorio');
  }

  if (errors.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Errori di validazione',
      details: errors
    });
  }

  req.body.content = content.trim();

  next();
};

/**
 * Valida ID parametro
 */
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || id.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `${paramName} obbligatorio`
      });
    }

    next();
  };
};

/**
 * Valida parametri di paginazione
 */
const validatePagination = (req, res, next) => {
  let { page, limit } = req.query;

  // Default values
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  // Limiti
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  req.pagination = { page, limit };

  next();
};

/**
 * Sanitizza tutti i campi string nel body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateActivation,
  validateProfileUpdate,
  validateMessage,
  validateId,
  validatePagination,
  sanitizeBody
};