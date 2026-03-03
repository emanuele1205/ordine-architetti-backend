// server.js - Backend Ordine Architetti Caltanissetta - VERSIONE COMPLETA E CORRETTA
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const validator = require('validator');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
// =====================================
// FILE-BASED PERSISTENCE SYSTEM
// =====================================

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ARCHITECTS_FILE = path.join(DATA_DIR, 'architects.json');
const ACTIVATION_TOKENS_FILE = path.join(DATA_DIR, 'activation-tokens.json');

// Crea cartella data se non esiste
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory');
}

// Funzioni di persistenza
const saveData = (filename, data) => {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filename}:`, error);
    return false;
  }
};

const loadData = (filename, defaultData) => {
  try {
    if (fs.existsSync(filename)) {
      const data = fs.readFileSync(filename, 'utf8');
      return JSON.parse(data);
    }
    return defaultData;
  } catch (error) {
    console.error(`❌ Error loading ${filename}:`, error);
    return defaultData;
  }
};

// Wrapper per auto-save - VERSIONE SEMPLIFICATA
const createPersistedArray = (filename, defaultData) => {
  // Carica o usa default
  let data = loadData(filename, defaultData);
  
  // Salva immediatamente i dati iniziali
  saveData(filename, data);
  console.log(`💾 Initialized: ${filename}`);
  
  return data;
};

// Intercetta modifiche agli array
const persistOnChange = (array, filename) => {
  const originalPush = array.push;
  array.push = function(...args) {
    const result = originalPush.apply(this, args);
    saveData(filename, array);
    console.log(`💾 Saved after push: ${filename}`);
    return result;
  };
  
  const originalSplice = array.splice;
  array.splice = function(...args) {
    const result = originalSplice.apply(this, args);
    saveData(filename, array);
    console.log(`💾 Saved after splice: ${filename}`);
    return result;
  };
  
  return array;
};

// JWT Secret - IMPORTANTE: in produzione usare una variabile d'ambiente
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-key-only');
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET non configurato in produzione!');
  process.exit(1);
}
// Rate limiter in-memory per attivazione architetti
const activationAttempts = new Map(); // IP -> { count, resetTime }
const checkActivationRateLimit = (ip) => {
  const now = Date.now();
  const attempt = activationAttempts.get(ip);
  if (!attempt || now > attempt.resetTime) {
    activationAttempts.set(ip, { count: 1, resetTime: now + 3600000 }); // 1 ora
    return true;
  }
  return attempt.count++ < 5;
};

// SECURITY MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: false // Disabilitato per sviluppo
}));

// COMPRESSION
app.use(compression());

// RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // Limite di 100 richieste per finestra
  message: {
    error: 'Troppe richieste, riprova più tardi',
    retryAfter: '15 minuti'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit specifico per auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 5, // Max 5 tentativi di login
  message: {
    error: 'Troppi tentativi di login, riprova tra 15 minuti'
  },
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// BODY PARSING
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// STATIC FILES
app.use('/uploads', express.static('uploads'));

// LOGGING
app.use(morgan('combined'));

// REQUEST LOGGING MIDDLEWARE
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// UTILITY FUNCTIONS
const generateId = () => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

const generateActivationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  return input;
};

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// DATABASE SIMULATO CON DATI COMPLETI

// Token di attivazione per architetti
// Token di attivazione per architetti
// Carica da env o usa defaults per dev
const tokensList = process.env.ACTIVATION_TOKENS ? 
  process.env.ACTIVATION_TOKENS.split(',').map((t, i) => ({
    token: t.trim(),
    orderNumber: `${1234 + i * 1000}`,
    architectName: `Architetto ${i + 1}`,
    email: null,
    used: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 anno
  })) : 
  (process.env.NODE_ENV !== 'production' ? [
    { token: 'DEV-TOKEN-1234', orderNumber: '1234', architectName: 'Test Arch', email: null, used: false, createdAt: new Date(), expiresAt: new Date('2025-12-31') }
  ] : []);
const activationTokens = persistOnChange(createPersistedArray(ACTIVATION_TOKENS_FILE, tokensList), ACTIVATION_TOKENS_FILE);
saveData(ACTIVATION_TOKENS_FILE, activationTokens);
// Log solo il conteggio, mai i token in chiaro per sicurezza
console.log('🔑 Token di attivazione caricati:', activationTokens.length > 0 ? `${activationTokens.length} token` : 'Nessun token configurato');

// ORDINE INFO
const ordineInfo = {
  name: 'Ordine Architetti P.P.C. Caltanissetta',
  address: 'Via E. De Nicola n.17',
  city: 'Caltanissetta',
  postalCode: '93100',
  phone: '0934 55 30 40',
  mobile: '327 1431252',
  email: 'architetti@caltanissetta.archiworld.it',
  pec: 'oappc.caltanissetta@archiworldpec.it',
  website: 'www.architetti.caltanissetta.it',
  president: 'Arch. Giuseppe Amico',
  established: '1923',
  region: 'Sicilia'
};

// Hash delle password di test
const createTestPassword = () => {
  return bcrypt.hashSync('password123', 12);
};

// Storage in memoria per sviluppo - UTENTI COMPLETI
let defaultUsers = [
  {
    _id: '1',
    email: 'mario.rossi@test.it',
    password: createTestPassword(),
    firstName: 'Mario',
    lastName: 'Rossi',
    userType: 'architect', // Architetto verificato
    orderNumber: '1234',
    phone: '+39 0934 123456',
    language: 'it',
    isVerified: true, // Architetto verificato
    activationToken: 'TOKEN-ARCH-1234-2025', // Token usato per attivazione
    settings: {
      notifications: true,
      emailNotifications: true,
      theme: 'light',
      language: 'it',
      privacy: {
        showEmail: true,
        showPhone: true,
        showProjects: true
      }
    },
    createdAt: new Date('2024-01-15'),
    isActive: true,
    lastLogin: null
  },
  {
    _id: '2',
    email: 'laura.bianchi@test.it',
    password: createTestPassword(),
    firstName: 'Laura',
    lastName: 'Bianchi',
    userType: 'architect', // Architetto verificato
    orderNumber: '5678',
    phone: '+39 0934 654321',
    language: 'it',
    isVerified: true, // Architetto verificato
    activationToken: 'TOKEN-ARCH-5678-2025',
    settings: {
      notifications: true,
      emailNotifications: false,
      theme: 'light',
      language: 'it',
      privacy: {
        showEmail: false,
        showPhone: true,
        showProjects: true
      }
    },
    createdAt: new Date('2024-02-20'),
    isActive: true,
    lastLogin: null
  },
  {
    _id: '3',
    email: 'giuseppe.verdi@test.it',
    password: createTestPassword(),
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    userType: 'registered', // Utente registrato normale
    phone: '+39 333 1234567',
    language: 'it',
    isVerified: false, // Non è un architetto
    settings: {
      notifications: true,
      emailNotifications: true,
      theme: 'dark',
      language: 'it'
    },
    createdAt: new Date('2024-03-10'),
    isActive: true,
    lastLogin: null
  },
  {
    _id: '4',
    email: 'architetto.nonverificato@test.it',
    password: createTestPassword(),
    firstName: 'Paolo',
    lastName: 'Neri',
    userType: 'registered', // Registrato ma non verificato come architetto
    orderNumber: '9999', // Ha numero d'ordine ma non ha attivato il profilo
    phone: '+39 333 9999999',
    language: 'it',
    isVerified: false, // NON ancora verificato
    settings: {
      notifications: true,
      emailNotifications: true,
      theme: 'light',
      language: 'it'
    },
    createdAt: new Date('2024-04-01'),
    isActive: true,
    lastLogin: null
  }
];

const users = persistOnChange(createPersistedArray(USERS_FILE, defaultUsers), USERS_FILE);
saveData(USERS_FILE, users);

// ARCHITECTS DATA ESTESO
let defaultArchitects = [
  {
    _id: 'arch1',
    userId: '1',
    orderNumber: '1234',
    specialties: ['Progettazione Architettonica', 'Restauro', 'Sostenibilità'],
    location: 'Caltanissetta',
    bio: 'Architetto specializzato in progettazione sostenibile e restauro di edifici storici. Con oltre 15 anni di esperienza nel settore.',
    profileVisible: true,
    acceptMessages: true,
    cfpCredits: 120,
    projects: 45,
    rating: 4.8,
    isAvailable: true,
    services: [
      'Progettazione residenziale',
      'Direzione lavori',
      'Consulenza energetica',
      'Restauro conservativo'
    ],
    portfolio: [
      {
        title: 'Villa Moderna Caltanissetta',
        year: 2023,
        type: 'Residenziale',
        image: '/uploads/portfolio/villa1.jpg'
      },
      {
        title: 'Restauro Palazzo Storico',
        year: 2022,
        type: 'Restauro',
        image: '/uploads/portfolio/palazzo1.jpg'
      }
    ],
    certifications: [
      'Certificatore energetico',
      'Esperto CasaClima',
      'Tecnico competente in acustica'
    ]
  },
  {
    _id: 'arch2',
    userId: '2',
    orderNumber: '5678',
    specialties: ['Design Interni', 'Urbanistica', 'BIM'],
    location: 'Caltanissetta',
    bio: 'Specializzata in design d\'interni e progetti BIM. Approccio innovativo e sostenibile alla progettazione.',
    profileVisible: true,
    acceptMessages: true,
    cfpCredits: 95,
    projects: 32,
    rating: 4.9,
    isAvailable: false,
    services: [
      'Interior design',
      'Progettazione BIM',
      'Pianificazione urbana',
      'Rendering 3D'
    ],
    portfolio: [],
    certifications: [
      'BIM Specialist',
      'LEED AP'
    ]
  }
];
const architects = persistOnChange(createPersistedArray(ARCHITECTS_FILE, defaultArchitects), ARCHITECTS_FILE);
saveData(ARCHITECTS_FILE, architects);

// AUTHENTICATION MIDDLEWARE MIGLIORATO
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Token non fornito',
      requiresAuth: true 
    });
  }

jwt.verify(token, JWT_SECRET, {
  issuer: 'ordine-architetti-cl',
  audience: 'app-frontend'
}, (err, decoded) => {    if (err) {
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token scaduto',
      code: 'TOKEN_EXPIRED',
      tokenExpired: true
    });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({ 
      error: 'Token non valido',
      code: 'INVALID_TOKEN'
    });
  }
  return res.status(403).json({ 
    error: 'Errore di autenticazione',
    code: 'AUTH_ERROR'
  });
}
    
    req.user = decoded;
    
    // Trova l'utente completo dal database
    const user = users.find(u => u._id === decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Aggiungi informazioni complete dell'utente
    req.user.fullData = user;
    req.user.isArchitect = user.userType === 'architect' && user.isVerified;
    req.user.isRegistered = user.userType === 'registered' || user.userType === 'architect';
    
    next();
  });
};

// MIDDLEWARE PER VERIFICARE SE L'UTENTE È UN ARCHITETTO VERIFICATO
const requireVerifiedArchitect = (req, res, next) => {
  if (!req.user || !req.user.isArchitect) {
    return res.status(403).json({ 
      error: 'Accesso riservato agli architetti verificati',
      requiresArchitectVerification: true
    });
  }
  next();
};

// =================
// ROUTES
// =================

// AUTH ROUTES

// LOGIN MIGLIORATO
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password } = req.body;
    
    // Validazione input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e password sono obbligatori' 
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Email non valida' 
      });
    }
    
    // Trova utente
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        error: 'Credenziali non valide' 
      });
    }
    
    // Verifica password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        error: 'Credenziali non valide' 
      });
    }
    
    // Aggiorna ultimo login
    user.lastLogin = new Date();
    
    // Prepara dati architetto se applicabile
    let architectInfo = null;
    if (user.userType === 'architect' && user.isVerified) {
      const architect = architects.find(a => a.userId === user._id);
      if (architect) {
        architectInfo = {
          orderNumber: architect.orderNumber,
          specialties: architect.specialties,
          cfpCredits: architect.cfpCredits,
          profileVisible: architect.profileVisible,
          acceptMessages: architect.acceptMessages,
          isAvailable: architect.isAvailable
        };
      }
    }
    
    // Genera token JWT
    const token = jwt.sign(
  {
    id: user._id,
    email: user.email,
    userType: user.userType,
    isVerified: user.isVerified
  },
  JWT_SECRET,
  { 
    expiresIn: JWT_EXPIRATION,  // Usa la costante invece di '30d'
    issuer: 'ordine-architetti-cl',
    audience: 'app-frontend'
  }
);
    
    // Prepara risposta
    const responseUser = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      isVerified: user.isVerified,
      language: user.language,
      settings: user.settings,
      architect: architectInfo
    };
    
    console.log('✅ Login successful:', email, '- Type:', user.userType, '- Verified:', user.isVerified);
    
    res.json({
      token,
      user: responseUser,
      message: 'Login effettuato con successo'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Errore durante il login' 
    });
  }
});

// REGISTRAZIONE MIGLIORATA CON GESTIONE ARCHITETTI
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);
    
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      userType = 'registered',
      orderNumber,
      activationToken
    } = req.body;
    
    // Validazioni
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Tutti i campi obbligatori devono essere compilati' 
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Email non valida' 
      });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'La password deve essere di almeno 6 caratteri' 
      });
    }
    
    // Controlla se l'email esiste già
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Email già registrata' 
      });
    }
    
    // Se si registra come architetto, verifica il token di attivazione
    let isVerifiedArchitect = false;
    let usedToken = null;
    
    if (userType === 'architect' && activationToken) {
      const tokenData = activationTokens.find(t => 
        t.token === activationToken && 
        !t.used && 
        t.expiresAt > new Date()
      );
      
      if (!tokenData) {
        return res.status(400).json({ 
          error: 'Token di attivazione non valido o scaduto' 
        });
      }
      
      if (tokenData.orderNumber !== orderNumber) {
        return res.status(400).json({ 
          error: 'Il token non corrisponde al numero d\'ordine fornito' 
        });
      }
      
      // Marca il token come usato
      tokenData.used = true;
      tokenData.email = email;
      isVerifiedArchitect = true;
      usedToken = activationToken;
      
      console.log('✅ Architect token validated:', activationToken);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Crea nuovo utente
    const newUser = {
      _id: generateId(),
      email: sanitizeInput(email.toLowerCase()),
      password: hashedPassword,
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      phone: phone ? sanitizeInput(phone) : null,
      userType: userType,
      orderNumber: orderNumber || null,
      isVerified: isVerifiedArchitect,
      activationToken: usedToken,
      language: 'it',
      settings: {
        notifications: true,
        emailNotifications: true,
        theme: 'light',
        language: 'it',
        privacy: {
          showEmail: userType === 'architect',
          showPhone: false,
          showProjects: userType === 'architect'
        }
      },
      createdAt: new Date(),
      isActive: true,
      lastLogin: null
    };
    
    // Salva utente
    users.push(newUser);
    
    // Se è un architetto verificato, crea il profilo architetto
    if (isVerifiedArchitect) {
      const newArchitect = {
        _id: 'arch' + generateId(),
        userId: newUser._id,
        orderNumber: orderNumber,
        specialties: [],
        location: 'Caltanissetta',
        bio: '',
        profileVisible: true,
        acceptMessages: true,
        cfpCredits: 0,
        projects: 0,
        rating: 0,
        isAvailable: true,
        services: [],
        portfolio: [],
        certifications: []
      };
      
      architects.push(newArchitect);
      console.log('✅ Architect profile created for:', email);
    }
    
    console.log('✅ Registration successful:', email, '- Type:', userType, '- Verified:', isVerifiedArchitect);
    
    res.status(201).json({
      message: isVerifiedArchitect ? 
        'Registrazione completata! Profilo architetto attivato.' : 
        'Registrazione completata con successo!',
      userType: userType,
      isVerified: isVerifiedArchitect
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Errore durante la registrazione' 
    });
  }
});

// GUEST ACCESS
app.post('/api/auth/guest', (req, res) => {
  console.log('👤 Guest access requested');
  
  const guestUser = {
    id: 'guest_' + generateId(),
    email: null,
    firstName: 'Ospite',
    lastName: '',
    userType: 'guest',
    isVerified: false,
    language: req.body.language || 'it',
    settings: {
      notifications: false,
      emailNotifications: false,
      theme: 'light',
      language: req.body.language || 'it'
    }
  };
  
  const token = jwt.sign(
  {
    id: guestUser.id,
    userType: 'guest',
    isGuest: true
  },
  JWT_SECRET,
  { 
    expiresIn: '7d',  // Guest hanno scadenza più breve
    issuer: 'ordine-architetti-cl',
    audience: 'app-frontend'
  }
);
  
  console.log('✅ Guest token generated');
  
  res.json({
    token,
    user: guestUser,
    message: 'Accesso ospite concesso'
  });
});

// ATTIVAZIONE PROFILO ARCHITETTO (per utenti già registrati)
app.post('/api/auth/activate-architect', authenticateToken, async (req, res) => {
  try {
    const { activationToken, orderNumber } = req.body;
    const userId = req.user.id;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Rate limit check
    if (!checkActivationRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Troppi tentativi. Riprova tra un\'ora.' });
    }
    
    // Trova l'utente
    const user = users.find(u => u._id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Se è già un architetto verificato
    if (user.isVerified && user.userType === 'architect') {
      return res.status(400).json({ 
        error: 'Profilo architetto già attivato' 
      });
    }
    
    // Verifica il token
    const tokenData = activationTokens.find(t => 
      t.token === activationToken && 
      !t.used && 
      t.expiresAt > new Date()
    );
    
    if (!tokenData) {
      return res.status(400).json({ 
        error: 'Token di attivazione non valido o scaduto' 
      });
    }
    
    if (tokenData.orderNumber !== orderNumber) {
      return res.status(400).json({ 
        error: 'Il token non corrisponde al numero d\'ordine fornito' 
      });
    }
    
    // Attiva il profilo architetto
    user.userType = 'architect';
    user.isVerified = true;
    user.orderNumber = orderNumber;
    user.activationToken = activationToken;
    
    // Marca il token come usato
    tokenData.used = true;
    tokenData.email = user.email;
    
    // Crea profilo architetto
    const newArchitect = {
      _id: 'arch' + generateId(),
      userId: user._id,
      orderNumber: orderNumber,
      specialties: [],
      location: 'Caltanissetta',
      bio: '',
      profileVisible: true,
      acceptMessages: true,
      cfpCredits: 0,
      projects: 0,
      rating: 0,
      isAvailable: true,
      services: [],
      portfolio: [],
      certifications: []
    };
    
    architects.push(newArchitect);
    
    console.log('✅ Architect profile activated for user:', user.email);
    
    res.json({
      message: 'Profilo architetto attivato con successo!',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        isVerified: user.isVerified,
        orderNumber: user.orderNumber
      }
    });
    
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ 
      error: 'Errore durante l\'attivazione del profilo' 
    });
  }
});

// VERIFICA TOKEN DI ATTIVAZIONE
app.post('/api/auth/verify-activation-token', (req, res) => {
  const { token, orderNumber } = req.body;
  
  const tokenData = activationTokens.find(t => 
    t.token === token && 
    !t.used && 
    t.expiresAt > new Date()
  );
  
  if (!tokenData) {
    return res.status(400).json({ 
      valid: false,
      error: 'Token non valido o scaduto' 
    });
  }
  
  if (tokenData.orderNumber !== orderNumber) {
    return res.status(400).json({ 
      valid: false,
      error: 'Il token non corrisponde al numero d\'ordine' 
    });
  }
  
  res.json({
    valid: true,
    architectName: tokenData.architectName,
    orderNumber: tokenData.orderNumber,
    expiresAt: tokenData.expiresAt
  });
});

// ARCHITECTS ROUTES

// GET ALL ARCHITECTS (con filtri)
app.get('/api/architects', (req, res) => {
  const { search, location, specialty, available } = req.query;
  
  // Filtra solo architetti con profilo visibile
  let filteredArchitects = architects.filter(a => a.profileVisible);
  
  // Applica filtri
  if (search) {
    const searchLower = search.toLowerCase();
    filteredArchitects = filteredArchitects.filter(arch => {
      const user = users.find(u => u._id === arch.userId);
      if (!user) return false;
      
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const specialtiesString = arch.specialties.join(' ').toLowerCase();
      
      return fullName.includes(searchLower) || 
             specialtiesString.includes(searchLower) ||
             arch.bio.toLowerCase().includes(searchLower);
    });
  }
  
  if (location) {
    filteredArchitects = filteredArchitects.filter(a => 
      a.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  if (specialty) {
    filteredArchitects = filteredArchitects.filter(a => 
      a.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
    );
  }
  
  if (available === 'true') {
    filteredArchitects = filteredArchitects.filter(a => a.isAvailable);
  }
  
  // Mappa con dati utente
  const architectsWithUserData = filteredArchitects.map(arch => {
    const user = users.find(u => u._id === arch.userId);
    return {
      ...arch,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.settings?.privacy?.showEmail ? user?.email : null,
      phone: user?.settings?.privacy?.showPhone ? user?.phone : null
    };
  });
  
  console.log(`📋 Returning ${architectsWithUserData.length} architects`);
  res.json(architectsWithUserData);
});

// GET SINGLE ARCHITECT
app.get('/api/architects/:id', (req, res) => {
  const architect = architects.find(a => a._id === req.params.id);
  
  if (!architect) {
    return res.status(404).json({ error: 'Architetto non trovato' });
  }
  
  const user = users.find(u => u._id === architect.userId);
  
  const architectData = {
    ...architect,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.settings?.privacy?.showEmail ? user?.email : null,
    phone: user?.settings?.privacy?.showPhone ? user?.phone : null
  };
  
  res.json(architectData);
});

// UPDATE ARCHITECT PROFILE (solo per architetti verificati)
app.put('/api/architects/:id', authenticateToken, requireVerifiedArchitect, async (req, res) => {
  try {
    const architectId = req.params.id;
    const userId = req.user.id;
    
    // Trova l'architetto
    const architect = architects.find(a => a._id === architectId);
    if (!architect) {
      return res.status(404).json({ error: 'Profilo architetto non trovato' });
    }
    
    // Verifica che l'utente sia il proprietario del profilo
    if (architect.userId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questo profilo' });
    }
    
    // Aggiorna i dati
    const updates = req.body;
    
    // Campi aggiornabili
    const allowedUpdates = [
      'specialties', 'location', 'bio', 'profileVisible', 
      'acceptMessages', 'isAvailable', 'services', 'certifications'
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        architect[field] = updates[field];
      }
    });
    
    console.log('✅ Architect profile updated:', architectId);
    
    res.json({
      message: 'Profilo aggiornato con successo',
      architect
    });
    
  } catch (error) {
    console.error('Update architect error:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento' });
  }
});

// USERS ROUTES

// GET USER PROFILE
app.get('/api/users/:id', authenticateToken, (req, res) => {
  const requestedUserId = req.params.id;
  const currentUserId = req.user.id;
  
  // Un utente può vedere solo il proprio profilo
  if (requestedUserId !== currentUserId) {
    return res.status(403).json({ 
      error: 'Non autorizzato a vedere questo profilo' 
    });
  }
  
  const user = users.find(u => u._id === requestedUserId);
  
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }
  
  // Prepara dati architetto se applicabile
  let architectInfo = null;
  if (user.userType === 'architect' && user.isVerified) {
    const architect = architects.find(a => a.userId === user._id);
    if (architect) {
      architectInfo = architect;
    }
  }
  
  const userData = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    userType: user.userType,
    isVerified: user.isVerified,
    orderNumber: user.orderNumber,
    language: user.language,
    settings: user.settings,
    architect: architectInfo,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
  
  res.json(userData);
});

// UPDATE USER PROFILE
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const requestedUserId = req.params.id;
    const currentUserId = req.user.id;
    
    if (requestedUserId !== currentUserId) {
      return res.status(403).json({ 
        error: 'Non autorizzato a modificare questo profilo' 
      });
    }
    
    const user = users.find(u => u._id === requestedUserId);
    
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    const updates = req.body;
    
    // Campi aggiornabili
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'language'
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = sanitizeInput(updates[field]);
      }
    });
    
    // Se sta cambiando la password
    if (updates.password && updates.currentPassword) {
      const isPasswordValid = await bcrypt.compare(updates.currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Password attuale non corretta' 
        });
      }
      
      if (!validatePassword(updates.password)) {
        return res.status(400).json({ 
          error: 'La nuova password deve essere di almeno 6 caratteri' 
        });
      }
      
      user.password = await bcrypt.hash(updates.password, 12);
    }
    
    console.log('✅ User profile updated:', user.email);
    
    res.json({
      message: 'Profilo aggiornato con successo',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        userType: user.userType,
        isVerified: user.isVerified,
        language: user.language
      }
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento' });
  }
});

// UPDATE USER SETTINGS
app.put('/api/users/:id/settings', authenticateToken, (req, res) => {
  const requestedUserId = req.params.id;
  const currentUserId = req.user.id;
  
  if (requestedUserId !== currentUserId) {
    return res.status(403).json({ 
      error: 'Non autorizzato' 
    });
  }
  
  const user = users.find(u => u._id === requestedUserId);
  
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }
  
  const { settings } = req.body;
  
  // Aggiorna le impostazioni
  user.settings = {
    ...user.settings,
    ...settings
  };
  
  // Se cambia la lingua, aggiorna anche il campo principale
  if (settings.language) {
    user.language = settings.language;
  }
  
  console.log('✅ User settings updated:', user.email);
  
  res.json({
    message: 'Impostazioni aggiornate',
    settings: user.settings
  });
});

// COURSES ROUTES
app.get('/api/courses', (req, res) => {
  const courses = [
    {
      id: '1',
      title: 'BIM e Progettazione Digitale',
      description: 'Corso avanzato su Building Information Modeling',
      date: new Date('2025-02-15'),
      cfpCredits: 8,
      price: 150,
      seatsAvailable: 5,
      totalSeats: 30,
      instructor: 'Ing. Marco Bianchi',
      location: 'Caltanissetta - Sede Ordine',
      online: false
    },
    {
      id: '2',
      title: 'Sostenibilità e Certificazioni Energetiche',
      description: 'Normative e tecniche per l\'efficienza energetica',
      date: new Date('2025-02-20'),
      cfpCredits: 6,
      price: 120,
      seatsAvailable: 12,
      totalSeats: 25,
      instructor: 'Arch. Laura Verdi',
      location: 'Online',
      online: true
    },
    {
      id: '3',
      title: 'Restauro e Conservazione',
      description: 'Tecniche moderne di restauro conservativo',
      date: new Date('2025-03-01'),
      cfpCredits: 10,
      price: 200,
      seatsAvailable: 0,
      totalSeats: 20,
      instructor: 'Prof. Giuseppe Rossi',
      location: 'Caltanissetta - Sede Ordine',
      online: false
    }
  ];
  
  res.json(courses);
});

// ISCRIZIONE AI CORSI CON VALIDAZIONE PAGAMENTO
app.post('/api/courses/:id/enroll', authenticateToken, (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;
  const { paymentToken, amount } = req.body;
  
  console.log('📚 Tentativo iscrizione corso:', { courseId, userId });
  
  // Blocca i guest
  if (req.user.userType === 'guest') {
    return res.status(403).json({ 
      error: 'Gli utenti guest non possono iscriversi ai corsi' 
    });
  }
  
  // Lista dei corsi (la stessa della GET sopra)
  const courses = [
    {
      id: '1',
      title: 'BIM e Progettazione Digitale',
      price: 150,
      seatsAvailable: 5
    },
    {
      id: '2',
      title: 'Sostenibilità e Certificazioni Energetiche',
      price: 120,
      seatsAvailable: 12
    },
    {
      id: '3',
      title: 'Restauro e Conservazione',
      price: 200,
      seatsAvailable: 0
    }
  ];
  
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: 'Corso non trovato' });
  }
  
  if (course.seatsAvailable <= 0) {
    return res.status(400).json({ error: 'Nessun posto disponibile' });
  }
  
  // Validazione pagamento
  if (course.price > 0) {
    if (!paymentToken) {
      return res.status(400).json({ 
        error: 'Token di pagamento richiesto' 
      });
    }
    
    if (amount !== course.price) {
      return res.status(400).json({ 
        error: 'Importo non corretto' 
      });
    }
    
    if (!paymentToken.startsWith('demo-payment-token-')) {
      return res.status(400).json({ 
        error: 'Token di pagamento non valido' 
      });
    }
  }
  
  console.log('✅ Utente iscritto al corso:', { userId, courseId });
  
  res.json({
    success: true,
    message: 'Iscrizione completata con successo',
    courseId,
    enrollmentId: generateId()
  });
});


// NEWS ROUTES
app.get('/api/news', (req, res) => {
  const news = [
    {
      id: '1',
      title: 'Nuovo Regolamento Edilizio Comunale',
      excerpt: 'Approvate le modifiche al regolamento edilizio...',
      content: 'Il Consiglio Comunale ha approvato importanti modifiche al regolamento edilizio che entreranno in vigore dal 1° marzo 2025...',
      date: new Date('2025-01-20'),
      category: 'Normative',
      author: 'Segreteria Ordine',
      image: '/uploads/news/regolamento.jpg',
      important: true
    },
    {
      id: '2',
      title: 'Assemblea Generale degli Iscritti',
      excerpt: 'Convocazione assemblea ordinaria per il 28 febbraio...',
      content: 'È convocata l\'assemblea generale degli iscritti per discutere il bilancio e le attività 2025...',
      date: new Date('2025-01-18'),
      category: 'Eventi',
      author: 'Presidente Ordine',
      important: true
    },
    {
      id: '3',
      title: 'Bando Concorso Progettazione Piazza Garibaldi',
      excerpt: 'Pubblicato il bando per la riqualificazione...',
      content: 'Il Comune di Caltanissetta ha pubblicato il bando per il concorso di progettazione della nuova Piazza Garibaldi...',
      date: new Date('2025-01-15'),
      category: 'Concorsi',
      author: 'Redazione',
      important: false
    }
  ];
  
  res.json(news);
});

// STATISTICS ROUTES
app.get('/api/stats', authenticateToken, (req, res) => {
  const stats = {
    totalArchitects: architects.filter(a => a.profileVisible).length,
    totalUsers: users.filter(u => u.isActive).length,
    totalProjects: architects.reduce((sum, a) => sum + a.projects, 0),
    upcomingCourses: 3,
    availableArchitects: architects.filter(a => a.isAvailable && a.profileVisible).length,
    recentNews: 3,
    cfpCoursesThisMonth: 5,
    averageRating: 4.8
  };
  
  res.json(stats);
});

// INFO ROUTE
app.get('/api/info', (req, res) => {
  res.json(ordineInfo);
});

// MESSAGES ROUTES (Base implementation)
app.get('/api/messages', authenticateToken, (req, res) => {
  // Simulazione messaggi
  const messages = [
    {
      id: '1',
      from: 'Mario Rossi',
      subject: 'Richiesta informazioni progetto',
      preview: 'Buongiorno, avrei bisogno di informazioni riguardo...',
      date: new Date('2025-01-20'),
      unread: true
    },
    {
      id: '2',
      from: 'Segreteria Ordine',
      subject: 'Convocazione assemblea',
      preview: 'Si comunica che l\'assemblea è convocata per...',
      date: new Date('2025-01-18'),
      unread: false
    }
  ];
  
  res.json(messages);
});

// SEND MESSAGE
app.post('/api/messages', authenticateToken, (req, res) => {
  const { to, subject, message } = req.body;
  
  if (!to || !subject || !message) {
    return res.status(400).json({ 
      error: 'Tutti i campi sono obbligatori' 
    });
  }
  
  // Qui andrebbe implementata la logica per salvare il messaggio
  console.log('📧 New message from:', req.user.id, 'to:', to);
  
  res.json({
    message: 'Messaggio inviato con successo',
    messageId: generateId()
  });
});

// ERROR HANDLING MIDDLEWARE
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err);
  
  res.status(500).json({
    error: 'Si è verificato un errore del server',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint non trovato',
    path: req.path,
    method: req.method
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log('=====================================');
  console.log('🏛️  ORDINE ARCHITETTI CALTANISSETTA');
  console.log('=====================================');
  console.log(`✅ Server avviato su porta ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log('=====================================');
  console.log('📧 Account di test disponibili:');
  console.log('-----------------------------------');
  console.log('🏗️  ARCHITETTI VERIFICATI:');
  console.log('   mario.rossi@test.it | password123');
  console.log('   laura.bianchi@test.it | password123');
  console.log('');
  console.log('👤 UTENTE REGISTRATO:');
  console.log('   giuseppe.verdi@test.it | password123');
  console.log('');
  console.log('🎫 Token di attivazione configurati:', activationTokens.length > 0 ? '✅' : '❌ (Nessuno)');
  console.log('=====================================');
  console.log('🔐 JWT Secret configurato:', JWT_SECRET ? '✓' : '✗');
  console.log('🛡️  Security middleware: ✓');
  console.log('📊 Rate limiting: ✓');
  console.log('🔄 CORS configurato: ✓');
  console.log('=====================================');
});