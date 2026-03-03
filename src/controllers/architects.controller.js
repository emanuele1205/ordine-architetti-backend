// src/controllers/architects.controller.js
// Controller per gestione architetti e albo professionale

const { Users, Architects } = require('../services/data.service');
const { sanitizeUser, paginate } = require('../utils/helpers');
const { HTTP_STATUS, USER_TYPES, ARCHITECT_SPECIALTIES } = require('../utils/constants');

/**
 * GET /api/architects
 * Lista architetti visibili (albo)
 */
const getArchitects = (req, res, next) => {
  try {
    const { 
      search, 
      specialty, 
      location, 
      available,
      page = 1,
      limit = 20 
    } = req.query;

    // Carica tutti gli architetti visibili
    let architects = Architects.findVisible();

    // Arricchisci con i dati utente
    architects = architects.map(arch => {
      const user = Users.findById(arch.userId);
      return {
        ...arch,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.settings?.privacy?.showEmail ? user.email : null,
        phone: user?.settings?.privacy?.showPhone ? user.phone : null
      };
    });

    // Filtro per ricerca testuale
    if (search) {
      const searchLower = search.toLowerCase();
      architects = architects.filter(arch => 
        arch.firstName?.toLowerCase().includes(searchLower) ||
        arch.lastName?.toLowerCase().includes(searchLower) ||
        arch.specialties?.some(s => s.toLowerCase().includes(searchLower)) ||
        arch.bio?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro per specializzazione
    if (specialty) {
      architects = architects.filter(arch =>
        arch.specialties?.some(s => 
          s.toLowerCase().includes(specialty.toLowerCase())
        )
      );
    }

    // Filtro per località
    if (location) {
      architects = architects.filter(arch =>
        arch.location?.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filtro per disponibilità
    if (available === 'true') {
      architects = architects.filter(arch => arch.isAvailable);
    }

    // Paginazione
    const result = paginate(architects, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/architects/me
 * Ottieni il proprio profilo architetto completo
 */
const getMyProfile = (req, res, next) => {
  try {
    const userId = req.user.id;

    if (req.user.userType !== USER_TYPES.ARCHITECT) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Solo gli architetti hanno un profilo professionale'
      });
    }

    const architect = Architects.findByUserId(userId);
    if (!architect) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Profilo architetto non trovato'
      });
    }

    const user = Users.findById(userId);

    const fullProfile = {
      ...architect,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      phone: user?.phone
    };

    res.json({
      success: true,
      architect: fullProfile
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/architects/:id
 * Dettaglio architetto
 */
const getArchitectById = (req, res, next) => {
  try {
    const { id } = req.params;

    const architect = Architects.findById(id);
    if (!architect) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Architetto non trovato'
      });
    }

    // Verifica che il profilo sia visibile (o che sia il proprietario)
    if (!architect.profileVisible && req.user?.id !== architect.userId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Profilo non disponibile'
      });
    }

    // Carica dati utente
    const user = Users.findById(architect.userId);
    
    const publicProfile = {
      ...architect,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.settings?.privacy?.showEmail ? user.email : null,
      phone: user?.settings?.privacy?.showPhone ? user.phone : null
    };

    res.json({
      success: true,
      architect: publicProfile
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/architects/me
 * Aggiorna il proprio profilo architetto
 */
const updateMyProfile = (req, res, next) => {
  try {
    const userId = req.user.id;

    // Verifica che sia un architetto
    if (req.user.userType !== USER_TYPES.ARCHITECT) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Solo gli architetti possono modificare il profilo professionale'
      });
    }

    const architect = Architects.findByUserId(userId);
    if (!architect) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Profilo architetto non trovato'
      });
    }

    // Campi aggiornabili
    const {
      specialties,
      location,
      bio,
      profileVisible,
      acceptMessages,
      isAvailable,
      services,
      certifications
    } = req.body;

    const updates = {};
    
    if (specialties !== undefined) {
      // Valida specialties
      if (Array.isArray(specialties)) {
        updates.specialties = specialties.filter(s => 
          typeof s === 'string' && s.trim().length > 0
        );
      }
    }
    
    if (location !== undefined) updates.location = location;
    if (bio !== undefined) updates.bio = bio;
    if (profileVisible !== undefined) updates.profileVisible = Boolean(profileVisible);
    if (acceptMessages !== undefined) updates.acceptMessages = Boolean(acceptMessages);
    if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
    
    if (services !== undefined && Array.isArray(services)) {
      updates.services = services.filter(s => typeof s === 'string' && s.trim().length > 0);
    }
    
    if (certifications !== undefined && Array.isArray(certifications)) {
      updates.certifications = certifications.filter(c => typeof c === 'string' && c.trim().length > 0);
    }

    const updatedArchitect = Architects.update(architect._id, updates);

    console.log('✅ Profilo architetto aggiornato:', userId);

    res.json({
      success: true,
      message: 'Profilo aggiornato con successo',
      architect: updatedArchitect
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/architects/specialties
 * Lista specializzazioni disponibili
 */
const getSpecialties = (req, res) => {
  res.json({
    success: true,
    specialties: ARCHITECT_SPECIALTIES
  });
};

/**
 * GET /api/architects/stats
 * Statistiche architetti (per dashboard)
 */
const getStats = (req, res, next) => {
  try {
    const allArchitects = Architects.findAll();
    const visibleArchitects = Architects.findVisible();
    const availableArchitects = Architects.findAvailable();

    res.json({
      success: true,
      stats: {
        total: allArchitects.length,
        visible: visibleArchitects.length,
        available: availableArchitects.length
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getArchitects,
  getArchitectById,
  getMyProfile,
  updateMyProfile,
  getSpecialties,
  getStats
};
