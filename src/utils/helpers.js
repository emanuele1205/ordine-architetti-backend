// src/utils/helpers.js
// Funzioni helper riutilizzabili

const crypto = require('crypto');

/**
 * Genera un ID univoco
 * @param {number} length - Lunghezza dell'ID (default: 16)
 * @returns {string} ID generato
 */
const generateId = (length = 16) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Genera un token sicuro
 * @param {number} length - Lunghezza del token (default: 32)
 * @returns {string} Token generato
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Formatta una data in italiano
 * @param {Date|string} date - Data da formattare
 * @returns {string} Data formattata
 */
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatta data e ora in italiano
 * @param {Date|string} date - Data da formattare
 * @returns {string} Data e ora formattate
 */
const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Sanitizza una stringa per uso sicuro
 * @param {string} str - Stringa da sanitizzare
 * @returns {string} Stringa sanitizzata
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Valida formato email
 * @param {string} email - Email da validare
 * @returns {boolean} true se valida
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Crea uno slug da una stringa
 * @param {string} text - Testo da convertire
 * @returns {string} Slug generato
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Pagina un array
 * @param {Array} array - Array da paginare
 * @param {number} page - Numero pagina (1-based)
 * @param {number} limit - Elementi per pagina
 * @returns {Object} Oggetto con dati paginati e metadata
 */
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < array.length,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Filtra campi sensibili da un oggetto utente
 * @param {Object} user - Oggetto utente
 * @returns {Object} Utente senza campi sensibili
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  
  const { password, password_hash, activationToken, ...safeUser } = user;
  return safeUser;
};

/**
 * Delay asincrono (utile per testing)
 * @param {number} ms - Millisecondi
 * @returns {Promise}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  generateId,
  generateToken,
  formatDate,
  formatDateTime,
  sanitizeString,
  isValidEmail,
  slugify,
  paginate,
  sanitizeUser,
  delay
};