// src/controllers/users.controller.js
// Controller per gestione utenti e profili

const { Users, Architects } = require('../services/data.service');
const { sanitizeUser } = require('../utils/helpers');
const { HTTP_STATUS, USER_TYPES } = require('../utils/constants');

/**
 * GET /api/users/:id
 * Ottiene il profilo di un utente
 */
const getUserById = (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Un utente può vedere solo il proprio profilo (tranne admin)
    if (id !== requestingUserId && req.user.userType !== USER_TYPES.ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non autorizzato a visualizzare questo profilo'
      });
    }

    const user = Users.findById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    // Carica dati architetto se applicabile
    let architectData = null;
    if (user.userType === USER_TYPES.ARCHITECT && user.isVerified) {
      architectData = Architects.findByUserId(id);
    }

    res.json({
      success: true,
      user: {
        ...sanitizeUser(user),
        architect: architectData
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 * Aggiorna il profilo utente
 */
const updateUser = (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Un utente può modificare solo il proprio profilo
    if (id !== requestingUserId && req.user.userType !== USER_TYPES.ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non autorizzato a modificare questo profilo'
      });
    }

    const user = Users.findById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    // Campi consentiti per l'aggiornamento
    const { firstName, lastName, phone, bio, language } = req.body;

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (language !== undefined) {
      updates.language = language;
      // Aggiorna anche nelle settings
      if (user.settings) {
        updates.settings = { ...user.settings, language };
      }
    }

    const updatedUser = Users.update(id, updates);

    console.log('✅ Profilo aggiornato:', updatedUser.email);

    res.json({
      success: true,
      message: 'Profilo aggiornato con successo',
      user: sanitizeUser(updatedUser)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/settings
 * Aggiorna le impostazioni utente
 */
const updateSettings = (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    if (id !== requestingUserId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non autorizzato'
      });
    }

    const user = Users.findById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    const { settings } = req.body;

    // Merge delle settings esistenti con le nuove
    const newSettings = {
      ...user.settings,
      ...settings
    };

    // Se cambia la lingua, aggiorna anche il campo principale
    const updates = { settings: newSettings };
    if (settings.language) {
      updates.language = settings.language;
    }

    const updatedUser = Users.update(id, updates);

    console.log('✅ Impostazioni aggiornate:', user.email);

    res.json({
      success: true,
      message: 'Impostazioni aggiornate',
      settings: updatedUser.settings
    });

  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Disattiva un account utente
 */
const deleteUser = (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    if (id !== requestingUserId && req.user.userType !== USER_TYPES.ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non autorizzato'
      });
    }

    const user = Users.findById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Utente non trovato'
      });
    }

    // Invece di eliminare, disattiviamo l'account
    Users.update(id, { isActive: false });

    // Se è un architetto, nascondi anche il profilo
    if (user.userType === USER_TYPES.ARCHITECT) {
      const architect = Architects.findByUserId(id);
      if (architect) {
        Architects.update(architect._id, { 
          profileVisible: false,
          acceptMessages: false 
        });
      }
    }

    console.log('✅ Account disattivato:', user.email);

    res.json({
      success: true,
      message: 'Account disattivato con successo'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserById,
  updateUser,
  updateSettings,
  deleteUser
};