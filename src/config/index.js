// src/config/index.js
// Configurazione centralizzata dell'applicazione

require('dotenv').config();
const path = require('path');

const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'ordine-architetti-caltanissetta-secret-key-2025',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Paths - usiamo path.join per compatibilità Windows
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads'),
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5000'],
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: process.env.RATE_LIMIT_MAX || 100
  },
  
  // Bcrypt
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  
  // App Info
  appName: 'Ordine Architetti P.P.C. Caltanissetta',
  appVersion: '1.0.0'
};

// Validazione configurazione in produzione
if (config.nodeEnv === 'production') {
  if (config.jwtSecret === 'ordine-architetti-caltanissetta-secret-key-2025') {
    console.error('⚠️  ATTENZIONE: Stai usando il JWT secret di default in produzione!');
    console.error('   Imposta la variabile d\'ambiente JWT_SECRET');
  }
}

module.exports = config;