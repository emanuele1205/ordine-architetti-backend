// src/app.js
// Configurazione applicazione Express

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { initializeDefaultData } = require('./services/data.service');

// Crea app Express
const app = express();

// ============================================
// MIDDLEWARE DI SICUREZZA
// ============================================

// Helmet - headers di sicurezza
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disabilita CSP per development
}));

// CORS - Configurazione completa per evitare problemi con Service Worker
app.use(cors({
  origin: function(origin, callback) {
    // Permetti richieste senza origin (come Postman) o da localhost
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'Pragma', 
    'Expires', 
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400 // 24 ore
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Troppe richieste, riprova tra qualche minuto'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ============================================
// MIDDLEWARE GENERALI
// ============================================

// Compressione risposte
app.use(compression());

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (solo in development)
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// File statici - uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// File statici - frontend build (per produzione)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================
// ROUTES API
// ============================================

// Mount tutte le routes API
app.use('/api', routes);

// ============================================
// ROUTE TEST
// ============================================

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server funzionante!',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// ============================================
// FRONTEND FALLBACK (SPA)
// ============================================

// Per produzione: serve il frontend React per tutte le route non-API
app.get('*', (req, res, next) => {
  // Se è una richiesta API, passa al 404 handler
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Altrimenti serve index.html (SPA)
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // In development senza build, mostra messaggio
    res.json({
      success: true,
      message: 'Backend API attivo. Il frontend è su http://localhost:3000',
      api: 'http://localhost:5000/api'
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 per routes API non trovate
app.use(notFoundHandler);

// Error handler globale
app.use(errorHandler);

// ============================================
// INIZIALIZZAZIONE
// ============================================

// Inizializza dati di default
initializeDefaultData();

module.exports = app;