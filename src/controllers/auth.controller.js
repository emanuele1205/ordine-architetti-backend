// src/controllers/auth.controller.js
// Controller per autenticazione e registrazione

const bcrypt = require('bcryptjs');
const { Users, Architects, ActivationTokens } = require('../services/data.service');
const { generateToken } = require('../middleware/auth.middleware');
const authConfig = require('../config/auth');
const { sanitizeUser, generateId } = require('../utils/helpers');
const { ERROR_MESSAGES, HTTP_STATUS, USER_TYPES } = require('../utils/constants');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email.service');

/**
 * POST /api/auth/register
 * Registrazione nuovo utente
 */
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Verifica se l'email esiste già
    const existingUser = Users.findByEmail(email);
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: 'EMAIL_EXISTS',
        message: ERROR_MESSAGES.EMAIL_EXISTS
      });
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, authConfig.bcrypt.rounds);

    // Crea il nuovo utente
    const newUser = Users.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
      userType: USER_TYPES.REGISTERED,
      isVerified: false,
      isActive: true,
      language: 'it',
      settings: {
        notifications: true,
        emailNotifications: true,
        theme: 'light',
        language: 'it',
        privacy: {
          showEmail: false,
          showPhone: false,
          showProjects: true
        }
      }
    });

    // Genera token JWT
    const token = generateToken(newUser);

    // Aggiorna ultimo login
    Users.updateLastLogin(newUser._id);

    console.log('✅ Nuovo utente registrato:', newUser.email);

    // Invia email di benvenuto (non blocca la risposta in caso di errore)
    sendWelcomeEmail(newUser.email, newUser.firstName, newUser.userType)
      .catch(err => console.error('⚠️  Email benvenuto non inviata:', err.message));

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Registrazione completata con successo',
      token,
      user: sanitizeUser(newUser)
    });

  } catch (error) {
    console.error('❌ Errore registrazione:', error);
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login utente
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Trova l'utente
    const user = Users.findByEmail(email);
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Verifica che l'account sia attivo
    if (!user.isActive) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'ACCOUNT_DISABLED',
        message: 'Account disabilitato. Contatta l\'amministratore.'
      });
    }

    // Verifica la password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Genera token JWT
    const token = generateToken(user);

    // Aggiorna ultimo login
    Users.updateLastLogin(user._id);

    // Se è un architetto, carica anche i dati architetto
    let architectData = null;
    if (user.userType === USER_TYPES.ARCHITECT && user.isVerified) {
      architectData = Architects.findByUserId(user._id);
    }

    console.log('✅ Login effettuato:', user.email);

    res.json({
      success: true,
      message: 'Login effettuato con successo',
      token,
      user: {
        ...sanitizeUser(user),
        architect: architectData
      }
    });

  } catch (error) {
    console.error('❌ Errore login:', error);
    next(error);
  }
};

/**
 * POST /api/auth/guest
 * Accesso come ospite
 */
const guestAccess = (req, res) => {
  // Crea un utente guest temporaneo (non salvato nel database)
  const guestUser = {
    _id: `guest_${generateId(8)}`,
    email: null,
    firstName: 'Ospite',
    lastName: '',
    userType: USER_TYPES.GUEST,
    isVerified: false,
    isActive: true
  };

  // Genera token con scadenza breve per guest
  const token = generateToken(guestUser);

  console.log('✅ Accesso guest:', guestUser._id);

  res.json({
    success: true,
    message: 'Accesso come ospite',
    token,
    user: guestUser
  });
};

/**
 * POST /api/auth/activate-architect
 * Attivazione profilo architetto con token
 */
const activateArchitect = async (req, res, next) => {
    try {
      const { activationToken, orderNumber } = req.body;
      const userId = req.user.id;
      
      console.log('🔍 ATTIVAZIONE BACKEND:');
      console.log('  Token ricevuto:', activationToken, typeof activationToken);
      console.log('  Numero ricevuto:', orderNumber, typeof orderNumber);
      console.log('  User ID:', userId);

    // Trova l'utente
    const user = Users.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    // Verifica che non sia già un architetto verificato
    if (user.userType === USER_TYPES.ARCHITECT && user.isVerified) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'ALREADY_VERIFIED',
        message: 'Profilo architetto già attivato'
      });
    }

    // Cerca il token di attivazione
    const tokenRecord = ActivationTokens.findByToken(activationToken);
    
    if (!tokenRecord) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: ERROR_MESSAGES.INVALID_ACTIVATION_TOKEN
      });
    }

    // Verifica che il token non sia già usato
    if (tokenRecord.used) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'TOKEN_USED',
        message: 'Token di attivazione già utilizzato'
      });
    }

    // Verifica che il numero ordine corrisponda (solo se il token ha un ordine associato)
    // I token batch hanno orderNumber vuoto: l'utente può usare qualsiasi numero ordine
    if (tokenRecord.orderNumber && tokenRecord.orderNumber !== orderNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'ORDER_MISMATCH',
        message: 'Numero ordine non corrispondente al token'
      });
    }

    // Aggiorna l'utente
    const updatedUser = Users.update(userId, {
      userType: USER_TYPES.ARCHITECT,
      isVerified: true,
      orderNumber: orderNumber
    });

    // Crea il profilo architetto
    const architectProfile = Architects.create({
      userId: userId,
      orderNumber: orderNumber,
      specialties: [],
      location: 'Caltanissetta',
      bio: '',
      profileVisible: true,
      acceptMessages: true,
      isAvailable: true,
      isApproved: true,
      cfpCredits: 0,
      projects: 0,
      rating: null,
      services: [],
      portfolio: [],
      certifications: []
    });

    // Marca il token come usato
    ActivationTokens.markAsUsed(activationToken, userId);

    // Genera nuovo token con i dati aggiornati
    const newToken = generateToken(updatedUser);

    console.log('✅ Architetto attivato:', user.email, 'Ordine:', orderNumber);

    res.json({
      success: true,
      message: 'Profilo architetto attivato con successo!',
      token: newToken,
      user: {
        ...sanitizeUser(updatedUser),
        architect: architectProfile
      }
    });

  } catch (error) {
    console.error('❌ Errore attivazione architetto:', error);
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Ottiene i dati dell'utente corrente
 */
const getCurrentUser = (req, res, next) => {
  try {
    const userId = req.user.id;

    // Se è un guest, ritorna i dati base
    if (req.user.userType === USER_TYPES.GUEST) {
      return res.json({
        success: true,
        user: {
          id: userId,
          userType: USER_TYPES.GUEST,
          firstName: 'Ospite',
          lastName: ''
        }
      });
    }

    // Trova l'utente nel database
    const user = Users.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    // Carica dati architetto se applicabile
    let architectData = null;
    if (user.userType === USER_TYPES.ARCHITECT && user.isVerified) {
      architectData = Architects.findByUserId(userId);
    }

    res.json({
      success: true,
      user: {
        ...sanitizeUser(user),
        architect: architectData
      }
    });

  } catch (error) {
    console.error('❌ Errore getCurrentUser:', error);
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Rinnova il token JWT
 */
const refreshToken = (req, res, next) => {
  try {
    const userId = req.user.id;

    // Se è un guest, genera un nuovo token guest
    if (req.user.userType === USER_TYPES.GUEST) {
      const token = generateToken(req.user);
      return res.json({
        success: true,
        token
      });
    }

    // Trova l'utente
    const user = Users.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    // Genera nuovo token
    const token = generateToken(user);

    res.json({
      success: true,
      token
    });

  } catch (error) {
    console.error('❌ Errore refresh token:', error);
    next(error);
  }
};

/**
 * POST /api/auth/change-password
 * Cambio password
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validazione
    if (!currentPassword || !newPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password attuale e nuova password richieste'
      });
    }

    if (newPassword.length < 6) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La nuova password deve essere almeno 6 caratteri'
      });
    }

    // Trova l'utente
    const user = Users.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    // Verifica password attuale
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'Password attuale non corretta'
      });
    }

    // Hash nuova password
    const hashedPassword = await bcrypt.hash(newPassword, authConfig.bcrypt.rounds);

    // Aggiorna password
    Users.update(userId, { password: hashedPassword });

    console.log('✅ Password cambiata per:', user.email);

    res.json({
      success: true,
      message: 'Password aggiornata con successo'
    });

  } catch (error) {
    console.error('❌ Errore cambio password:', error);
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Richiesta reset password - genera token e lo salva (senza email per ora)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email richiesta'
      });
    }

    // Trova utente (non rivelare se esiste o meno per sicurezza)
    const user = Users.findByEmail(email);

    if (user) {
      // Genera token reset (valido 1 ora)
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // Salva token nell'utente
      Users.update(user._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      // Invia email con link reset (non blocca la risposta in caso di errore)
      sendPasswordResetEmail(user.email, resetToken, user.firstName)
        .then(result => {
          if (result.mock) {
            console.log(`[DEV-ONLY] Reset password per ${email} — configura SMTP_USER/SMTP_PASS in .env per inviare email reali`);
          }
        })
        .catch(err => console.error('⚠️  Email reset non inviata:', err.message));
    }

    // Risposta sempre positiva per non rivelare se l'email esiste
    res.json({
      success: true,
      message: 'Se l\'email è registrata, riceverai le istruzioni per il reset della password.'
    });

  } catch (error) {
    console.error('❌ Errore forgot password:', error);
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password con token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Token e nuova password richiesti'
      });
    }

    if (newPassword.length < 6) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La password deve essere almeno 6 caratteri'
      });
    }

    // Trova utente con questo token
    const allUsers = Users.findAll();
    const user = allUsers.find(u =>
      u.passwordResetToken === token &&
      u.passwordResetExpires &&
      new Date(u.passwordResetExpires) > new Date()
    );

    if (!user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token non valido o scaduto'
      });
    }

    // Hash nuova password
    const hashedPassword = await bcrypt.hash(newPassword, authConfig.bcrypt.rounds);

    // Aggiorna password e rimuovi token reset
    Users.update(user._id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    console.log('✅ Password resettata per:', user.email);

    res.json({
      success: true,
      message: 'Password aggiornata con successo. Puoi ora effettuare il login.'
    });

  } catch (error) {
    console.error('❌ Errore reset password:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  guestAccess,
  activateArchitect,
  getCurrentUser,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword
};