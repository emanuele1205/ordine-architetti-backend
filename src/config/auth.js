// src/config/auth.js
// Configurazione specifica per autenticazione

const config = require('./index');

module.exports = {
  jwt: {
    secret: config.jwtSecret,
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256'
  },
  
  bcrypt: {
    rounds: config.bcryptRounds
  },
  
  // Token di attivazione predefiniti per architetti
  // In produzione questi verranno dal database
  defaultActivationTokens: [
    { token: 'ARCH-2025-001', orderNumber: '1234', used: false },
    { token: 'ARCH-2025-002', orderNumber: '5678', used: false },
    { token: 'ARCH-2025-003', orderNumber: '9012', used: false },
    { token: 'ARCH-2025-TEST', orderNumber: '0000', used: false }
  ],
  
  // Tipi utente permessi
  userTypes: ['guest', 'registered', 'architect', 'admin'],
  
  // Permessi per tipo utente
  permissions: {
    guest: ['read:public'],
    registered: ['read:public', 'read:courses', 'enroll:courses', 'send:messages'],
    architect: ['read:public', 'read:courses', 'enroll:courses', 'send:messages', 'manage:profile'],
    admin: ['*'] // tutti i permessi
  }
};