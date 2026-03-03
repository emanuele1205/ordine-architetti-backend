// src/middleware/error.middleware.js
// Middleware centralizzato per la gestione degli errori

const config = require('../config');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Classe per errori personalizzati dell'applicazione
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Errore previsto, non un bug
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errori predefiniti comuni
 */
const createError = {
  badRequest: (message = ERROR_MESSAGES.VALIDATION_ERROR) => 
    new AppError(message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST'),
  
  unauthorized: (message = ERROR_MESSAGES.UNAUTHORIZED) => 
    new AppError(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED'),
  
  forbidden: (message = ERROR_MESSAGES.FORBIDDEN) => 
    new AppError(message, HTTP_STATUS.FORBIDDEN, 'FORBIDDEN'),
  
  notFound: (message = ERROR_MESSAGES.NOT_FOUND) => 
    new AppError(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND'),
  
  conflict: (message = 'Conflitto con risorsa esistente') => 
    new AppError(message, HTTP_STATUS.CONFLICT, 'CONFLICT'),
  
  validation: (message = ERROR_MESSAGES.VALIDATION_ERROR) => 
    new AppError(message, HTTP_STATUS.UNPROCESSABLE, 'VALIDATION_ERROR'),
  
  internal: (message = ERROR_MESSAGES.SERVER_ERROR) => 
    new AppError(message, HTTP_STATUS.SERVER_ERROR, 'INTERNAL_ERROR')
};

/**
 * Middleware per gestire le route non trovate (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Endpoint non trovato: ${req.method} ${req.originalUrl}`,
    HTTP_STATUS.NOT_FOUND,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Middleware principale per la gestione degli errori
 * Deve essere l'ultimo middleware registrato
 */
const errorHandler = (err, req, res, next) => {
  // Log dell'errore
  console.error('🔥 Error:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default values
  let statusCode = err.statusCode || HTTP_STATUS.SERVER_ERROR;
  let message = err.message || ERROR_MESSAGES.SERVER_ERROR;
  let errorCode = err.errorCode || 'UNKNOWN_ERROR';

  // Gestione errori specifici
  
  // Errore di validazione Mongoose/MongoDB
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = Object.values(err.errors).map(e => e.message).join(', ');
    errorCode = 'VALIDATION_ERROR';
  }

  // Errore di cast MongoDB (ID non valido)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'ID non valido';
    errorCode = 'INVALID_ID';
  }

  // Errore duplicato MongoDB
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} già esistente`;
    errorCode = 'DUPLICATE_ERROR';
  }

  // Errore JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token non valido';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token scaduto';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Errore di sintassi JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'JSON non valido nel body della richiesta';
    errorCode = 'INVALID_JSON';
  }

  // Risposta
  const response = {
    success: false,
    error: errorCode,
    message: message
  };

  // In development, aggiungi stack trace
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
    response.details = err.details || null;
  }

  res.status(statusCode).json(response);
};

/**
 * Wrapper per gestire errori async nelle route
 * Evita di dover scrivere try/catch in ogni controller
 * @param {Function} fn - Funzione async del controller
 * @returns {Function} Middleware Express
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  createError,
  notFoundHandler,
  errorHandler,
  asyncHandler
};