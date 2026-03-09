// backend/src/controllers/admin.controller.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { Users, Architects, ActivationTokens, News, Courses } = require('../services/data.service');
const { sanitizeUser, paginate, generateId } = require('../utils/helpers');

// Admin predefinito
const ADMIN_USER = {
  id: 'admin-default-001',
  email: 'admin@ordinearchitetti.cl.it',
  password: '$2b$10$zH0q2RP3AYYBGmlJGqYpbegRs2ub1QbaWk7tMkWbAw74yImIUSPF6', // Admin2024!
  firstName: 'Amministratore',
  lastName: 'Sistema',
  role: 'admin'
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e password richieste'
      });
    }

    if (email.toLowerCase() !== ADMIN_USER.email.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    const isValidPassword = await bcrypt.compare(password, ADMIN_USER.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    const token = jwt.sign(
      { id: ADMIN_USER.id, email: ADMIN_USER.email, role: 'admin' },
      authConfig.jwt.secret,
      { expiresIn: '7d' }
    );

    console.log('✅ Admin login:', email);

    res.json({
      success: true,
      token,
      user: {
        id: ADMIN_USER.id,
        email: ADMIN_USER.email,
        firstName: ADMIN_USER.firstName,
        lastName: ADMIN_USER.lastName,
        role: ADMIN_USER.role
      }
    });

  } catch (error) {
    console.error('❌ Errore login admin:', error);
    res.status(500).json({ success: false, message: 'Errore durante il login' });
  }
};

// ============================================
// UTENTI ADMIN
// ============================================

// GET ALL USERS
const getAllUsers = (req, res) => {
  try {
    const { search, userType, isActive, page = 1, limit = 50 } = req.query;

    let users = Users.findAll();

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u =>
        u.email?.toLowerCase().includes(searchLower) ||
        u.firstName?.toLowerCase().includes(searchLower) ||
        u.lastName?.toLowerCase().includes(searchLower)
      );
    }

    if (userType) {
      users = users.filter(u => u.userType === userType);
    }

    if (isActive !== undefined) {
      const active = isActive === 'true';
      users = users.filter(u => u.isActive === active);
    }

    const result = paginate(users, parseInt(page), parseInt(limit));
    result.data = result.data.map(u => sanitizeUser(u));

    res.json({ success: true, ...result });

  } catch (error) {
    console.error('❌ Errore getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Errore nel caricamento utenti' });
  }
};

// ACTIVATE USER
const activateUser = (req, res) => {
  try {
    const { id } = req.params;
    const user = Users.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    Users.update(id, { isActive: true });
    console.log('✅ Utente attivato:', id);

    res.json({ success: true, message: 'Utente attivato con successo' });

  } catch (error) {
    console.error('❌ Errore activateUser:', error);
    res.status(500).json({ success: false, message: 'Errore' });
  }
};

// DEACTIVATE USER
const deactivateUser = (req, res) => {
  try {
    const { id } = req.params;
    const user = Users.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    if (user.email === 'admin@caltanissetta.it') {
      return res.status(403).json({
        success: false,
        message: 'Non puoi disattivare l\'utente admin principale'
      });
    }

    Users.update(id, { isActive: false });
    console.log('✅ Utente disattivato:', id);

    res.json({ success: true, message: 'Utente disattivato con successo' });

  } catch (error) {
    console.error('❌ Errore deactivateUser:', error);
    res.status(500).json({ success: false, message: 'Errore' });
  }
};

// DELETE USER
const deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const user = Users.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    if (user.email === 'admin@caltanissetta.it') {
      return res.status(403).json({
        success: false,
        message: 'Non puoi eliminare l\'utente admin principale'
      });
    }

    Users.delete(id);
    console.log('✅ Utente eliminato:', id);

    res.json({ success: true, message: 'Utente eliminato con successo' });

  } catch (error) {
    console.error('❌ Errore deleteUser:', error);
    res.status(500).json({ success: false, message: 'Errore' });
  }
};

// ============================================
// ARCHITETTI ADMIN
// ============================================

/**
 * GET /api/admin/architects
 * Lista completa architetti
 */
const getAllArchitects = (req, res, next) => {
  try {
    const {
      search,
      status,
      specialty,
      page = 1,
      limit = 20
    } = req.query;

    let architects = Architects.findAll();

    // Arricchisci con dati utente
    architects = architects.map(arch => {
      const user = Users.findById(arch.userId);
      return {
        ...arch,
        user: user ? {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        } : null
      };
    });

    // Filtro ricerca
    if (search) {
      const searchLower = search.toLowerCase();
      architects = architects.filter(arch =>
        arch.user?.firstName?.toLowerCase().includes(searchLower) ||
        arch.user?.lastName?.toLowerCase().includes(searchLower) ||
        arch.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro status
    if (status === 'pending') {
      architects = architects.filter(arch => !arch.user?.isVerified);
    } else if (status === 'active') {
      architects = architects.filter(arch => arch.user?.isActive);
    } else if (status === 'inactive') {
      architects = architects.filter(arch => !arch.user?.isActive);
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
 * GET /api/admin/architects/pending
 * Architetti in attesa di approvazione
 */
const getPendingArchitects = (req, res, next) => {
  try {
    let architects = Architects.findAll();
    
    architects = architects
      .map(arch => {
        const user = Users.findById(arch.userId);
        return { ...arch, user };
      })
      .filter(arch => arch.user && !arch.user.isVerified);

    res.json({
      success: true,
      architects,
      count: architects.length
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/architects/:id
 * Dettaglio architetto
 */
const getArchitectById = (req, res, next) => {
  try {
    const { id } = req.params;

    const architect = Architects.findById(id);
    if (!architect) {
      return res.status(404).json({
        success: false,
        message: 'Architetto non trovato'
      });
    }

    const user = Users.findById(architect.userId);
    
    res.json({
      success: true,
      architect: {
        ...architect,
        user: user ? {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        } : null
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/architects/:id/approve
 * Approva architetto
 */
const approveArchitect = (req, res, next) => {
  try {
    const { id } = req.params;

    const architect = Architects.findById(id);
    if (!architect) {
      return res.status(404).json({
        success: false,
        message: 'Architetto non trovato'
      });
    }

    // Verifica utente
    Users.update(architect.userId, {
      isVerified: true,
      emailVerified: true,
      isActive: true
    });

    // Rendi profilo visibile
    Architects.update(id, { profileVisible: true });

    console.log('✅ Admin: Architetto approvato:', architect.userId);

    res.json({
      success: true,
      message: 'Architetto approvato con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/architects/:id/reject
 * Rifiuta architetto
 */
const rejectArchitect = (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const architect = Architects.findById(id);
    if (!architect) {
      return res.status(404).json({
        success: false,
        message: 'Architetto non trovato'
      });
    }

    // Disattiva
    Users.update(architect.userId, {
      isActive: false,
      isVerified: false
    });

    Architects.update(id, {
      profileVisible: false,
      acceptMessages: false
    });

    console.log('✅ Admin: Architetto rifiutato:', architect.userId, reason || '');

    res.json({
      success: true,
      message: 'Architetto rifiutato'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/architects/:id
 * Modifica architetto
 */
const updateArchitect = (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const architect = Architects.findById(id);
    if (!architect) {
      return res.status(404).json({
        success: false,
        message: 'Architetto non trovato'
      });
    }

    // Campi modificabili
    const allowedFields = [
      'bio', 'specialties', 'location', 'website',
      'profileVisible', 'acceptMessages', 'isAvailable'
    ];

    const architectUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        architectUpdates[field] = updates[field];
      }
    });

    Architects.update(id, architectUpdates);

    // Aggiorna anche utente se necessario
    if (updates.user) {
      const userUpdates = {};
      if (updates.user.firstName) userUpdates.firstName = updates.user.firstName;
      if (updates.user.lastName) userUpdates.lastName = updates.user.lastName;
      if (updates.user.phone) userUpdates.phone = updates.user.phone;
      
      if (Object.keys(userUpdates).length > 0) {
        Users.update(architect.userId, userUpdates);
      }
    }

    res.json({
      success: true,
      message: 'Architetto aggiornato con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/architects/:id
 * Elimina architetto
 */
const deleteArchitect = (req, res, next) => {
  try {
    const { id } = req.params;

    const architect = Architects.findById(id);
    if (!architect) {
      return res.status(404).json({
        success: false,
        message: 'Architetto non trovato'
      });
    }

    Architects.delete(id);
    Users.delete(architect.userId);

    console.log('✅ Admin: Architetto eliminato:', id);

    res.json({
      success: true,
      message: 'Architetto eliminato definitivamente'
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// TOKEN ADMIN
// ============================================



/**
 * GET /api/admin/tokens
 * Lista tutti i token
 */
const getAllTokens = (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    let tokens = ActivationTokens.findAll();

    // Filtro per status
    if (status === 'used') {
      tokens = tokens.filter(t => t.used === true);
    } else if (status === 'available') {
      tokens = tokens.filter(t => t.used === false);
    }

    // Filtro ricerca
    if (search) {
      const searchLower = search.toLowerCase();
      tokens = tokens.filter(t =>
        t.token?.toLowerCase().includes(searchLower) ||
        t.orderNumber?.toLowerCase().includes(searchLower) ||
        t.architectName?.toLowerCase().includes(searchLower)
      );
    }

    // Ordina per data creazione (più recenti primi)
    tokens.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const result = paginate(tokens, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/tokens/generate
 * Genera un singolo token
 */
const generateToken = (req, res, next) => {
  try {
    const { orderNumber, architectName, email, expiresAt } = req.body;

    if (!orderNumber || !architectName) {
      return res.status(400).json({
        success: false,
        message: 'Numero ordine e nome architetto richiesti'
      });
    }

    // Genera token univoco
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const token = `ARCH-${timestamp}-${random}`;

    const newToken = {
      token,
      orderNumber,
      architectName,
      email: email || null,
      used: false,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    ActivationTokens.create(newToken);

    console.log('✅ Admin: Token generato:', token);

    res.json({
      success: true,
      message: 'Token generato con successo',
      token: newToken
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/tokens/generate-bulk
 * Genera multipli token
 */
const generateBulkTokens = (req, res, next) => {
  try {
    const { count, prefix, expiresAt } = req.body;

    if (!count || count < 1 || count > 100) {
      return res.status(400).json({
        success: false,
        message: 'Inserire un numero tra 1 e 100'
      });
    }

    const tokens = [];
    const timestamp = Date.now().toString(36);

    for (let i = 0; i < count; i++) {
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const token = `${prefix || 'ARCH'}-${timestamp}-${random}`;

      const newToken = {
        token,
        orderNumber: '',
        architectName: 'Da assegnare',
        email: null,
        used: false,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      ActivationTokens.create(newToken);
      tokens.push(newToken);
    }

    console.log(`✅ Admin: ${count} token generati`);

    res.json({
      success: true,
      message: `${count} token generati con successo`,
      tokens
    });

  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/tokens/:token
 * Revoca/Elimina token
 */
const revokeToken = (req, res, next) => {
  try {
    const { token } = req.params;

    const tokenRecord = ActivationTokens.findByToken(token);
    if (!tokenRecord) {
      return res.status(404).json({
        success: false,
        message: 'Token non trovato'
      });
    }

    if (tokenRecord.used) {
      return res.status(400).json({
        success: false,
        message: 'Impossibile eliminare un token già utilizzato'
      });
    }

    ActivationTokens.delete(tokenRecord._id);

    console.log('✅ Admin: Token revocato:', token);

    res.json({
      success: true,
      message: 'Token eliminato con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tokens/stats
 * Statistiche token
 */
const getTokensStats = (req, res, next) => {
  try {
    const allTokens = ActivationTokens.findAll();

    const stats = {
      total: allTokens.length,
      used: allTokens.filter(t => t.used).length,
      available: allTokens.filter(t => !t.used).length,
      expired: allTokens.filter(t => new Date(t.expiresAt) < new Date()).length
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// NEWS ADMIN
// ============================================



/**
 * GET /api/admin/news
 * Lista tutte le news (anche non pubblicate)
 */
const getAllNews = (req, res, next) => {
  try {
    const { search, category, isPublished, page = 1, limit = 20 } = req.query;

    let news = News.findAll();

    // Filtro ricerca
    if (search) {
      const searchLower = search.toLowerCase();
      news = news.filter(n =>
        n.title?.toLowerCase().includes(searchLower) ||
        n.excerpt?.toLowerCase().includes(searchLower) ||
        n.content?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro categoria
    if (category) {
      news = news.filter(n => n.category === category);
    }

    // Filtro pubblicazione
    if (isPublished !== undefined) {
      const published = isPublished === 'true';
      news = news.filter(n => n.isPublished === published);
    }

    // Ordina per data (più recenti prima)
    news.sort((a, b) => new Date(b.date) - new Date(a.date));

    const result = paginate(news, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/news/:id
 * Dettaglio news
 */
const getNewsById = (req, res, next) => {
  try {
    const { id } = req.params;

    const newsItem = News.findById(id);
    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: 'News non trovata'
      });
    }

    res.json({
      success: true,
      news: newsItem
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/news
 * Crea nuova news
 */
const createNews = (req, res, next) => {
  try {
    const { title, excerpt, content, category, author, important, isPublished } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Titolo e contenuto richiesti'
      });
    }

    const newNews = {
      title,
      excerpt: excerpt || '',
      content,
      date: new Date().toISOString(),
      category: category || 'Generica',
      author: author || 'Admin',
      important: Boolean(important),
      isPublished: Boolean(isPublished),
      createdAt: new Date().toISOString()
    };

    const created = News.create(newNews);

    console.log('✅ Admin: News creata:', created._id);

    res.json({
      success: true,
      message: 'News creata con successo',
      news: created
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/news/:id
 * Modifica news
 */
const updateNews = (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const newsItem = News.findById(id);
    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: 'News non trovata'
      });
    }

    const allowedFields = [
      'title', 'excerpt', 'content', 'category', 
      'author', 'important', 'isPublished', 'date'
    ];

    const newsUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        newsUpdates[field] = updates[field];
      }
    });

    const updated = News.update(id, newsUpdates);

    console.log('✅ Admin: News aggiornata:', id);

    res.json({
      success: true,
      message: 'News aggiornata con successo',
      news: updated
    });

  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/news/:id
 * Elimina news
 */
const deleteNews = (req, res, next) => {
  try {
    const { id } = req.params;

    const newsItem = News.findById(id);
    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: 'News non trovata'
      });
    }

    News.delete(id);

    console.log('✅ Admin: News eliminata:', id);

    res.json({
      success: true,
      message: 'News eliminata con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/news/:id/publish
 * Pubblica news
 */
const publishNews = (req, res, next) => {
  try {
    const { id } = req.params;

    const newsItem = News.findById(id);
    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: 'News non trovata'
      });
    }

    News.update(id, { isPublished: true });

    console.log('✅ Admin: News pubblicata:', id);

    res.json({
      success: true,
      message: 'News pubblicata con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/news/:id/unpublish
 * Nascondi news
 */
const unpublishNews = (req, res, next) => {
  try {
    const { id } = req.params;

    const newsItem = News.findById(id);
    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: 'News non trovata'
      });
    }

    News.update(id, { isPublished: false });

    console.log('✅ Admin: News nascosta:', id);

    res.json({
      success: true,
      message: 'News nascosta con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/news/stats
 * Statistiche news
 */
const getNewsStats = (req, res, next) => {
  try {
    const allNews = News.findAll();

    const stats = {
      total: allNews.length,
      published: allNews.filter(n => n.isPublished).length,
      draft: allNews.filter(n => !n.isPublished).length,
      important: allNews.filter(n => n.important).length
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// CORSI ADMIN
// ============================================



/**
 * GET /api/admin/courses
 * Lista tutti i corsi
 */
const getAllCourses = (req, res, next) => {
  try {
    const { search, status, online, page = 1, limit = 20 } = req.query;

    let courses = Courses.findAll();

    // Filtro ricerca
    if (search) {
      const searchLower = search.toLowerCase();
      courses = courses.filter(c =>
        c.title?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower) ||
        c.instructor?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro status
    if (status) {
      courses = courses.filter(c => c.status === status);
    }

    // Filtro online
    if (online !== undefined) {
      const isOnline = online === 'true';
      courses = courses.filter(c => c.online === isOnline);
    }

    // Ordina per data (più recenti prima)
    courses.sort((a, b) => new Date(a.date) - new Date(b.date));

    const result = paginate(courses, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/courses/:id
 * Dettaglio corso
 */
const getCourseById = (req, res, next) => {
  try {
    const { id } = req.params;

    const course = Courses.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Corso non trovato'
      });
    }

    res.json({
      success: true,
      course
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/courses
 * Crea nuovo corso
 */
const createCourse = (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      cfpCredits,
      price,
      totalSeats,
      instructor,
      location,
      online,
      status
    } = req.body;

    if (!title || !date || !cfpCredits) {
      return res.status(400).json({
        success: false,
        message: 'Titolo, data e crediti CFP richiesti'
      });
    }

    const newCourse = {
      title,
      description: description || '',
      date,
      cfpCredits: parseInt(cfpCredits),
      price: parseFloat(price) || 0,
      seatsAvailable: parseInt(totalSeats) || 0,
      totalSeats: parseInt(totalSeats) || 0,
      instructor: instructor || '',
      location: location || '',
      online: Boolean(online),
      status: status || 'scheduled',
      createdAt: new Date().toISOString()
    };

    const created = Courses.create(newCourse);

    console.log('✅ Admin: Corso creato:', created._id);

    res.json({
      success: true,
      message: 'Corso creato con successo',
      course: created
    });

  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/courses/:id
 * Modifica corso
 */
const updateCourse = (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const course = Courses.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Corso non trovato'
      });
    }

    const allowedFields = [
      'title', 'description', 'date', 'cfpCredits', 
      'price', 'totalSeats', 'seatsAvailable', 'instructor', 
      'location', 'online', 'status'
    ];

    const courseUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        courseUpdates[field] = updates[field];
      }
    });

    const updated = Courses.update(id, courseUpdates);

    console.log('✅ Admin: Corso aggiornato:', id);

    res.json({
      success: true,
      message: 'Corso aggiornato con successo',
      course: updated
    });

  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/courses/:id
 * Elimina corso
 */
const deleteCourse = (req, res, next) => {
  try {
    const { id } = req.params;

    const course = Courses.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Corso non trovato'
      });
    }

    Courses.delete(id);

    console.log('✅ Admin: Corso eliminato:', id);

    res.json({
      success: true,
      message: 'Corso eliminato con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/courses/stats
 * Statistiche corsi
 */
const getCoursesStats = (req, res, next) => {
  try {
    const allCourses = Courses.findAll();

    const stats = {
      total: allCourses.length,
      scheduled: allCourses.filter(c => c.status === 'scheduled').length,
      completed: allCourses.filter(c => c.status === 'completed').length,
      cancelled: allCourses.filter(c => c.status === 'cancelled').length,
      totalCFP: allCourses.reduce((sum, c) => sum + (c.cfpCredits || 0), 0)
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// STATISTICHE ADMIN
// ============================================

/**
 * GET /api/admin/statistics
 * Statistiche generali sistema
 */
const getSystemStatistics = (req, res, next) => {
  try {
    const allUsers = Users.findAll();
    const allArchitects = Architects.findAll();
    const allTokens = ActivationTokens.findAll();
    const allNews = News.findAll();
    const allCourses = Courses.findAll();

    // Statistiche Utenti
    const usersStats = {
      total: allUsers.length,
      active: allUsers.filter(u => u.isActive).length,
      verified: allUsers.filter(u => u.isVerified).length,
      architects: allUsers.filter(u => u.userType === 'architect').length,
      citizens: allUsers.filter(u => u.userType === 'citizen').length
    };

    // Statistiche Architetti
    const architectsStats = {
      total: allArchitects.length,
      visible: allArchitects.filter(a => a.profileVisible).length,
      acceptingMessages: allArchitects.filter(a => a.acceptMessages).length,
      available: allArchitects.filter(a => a.isAvailable).length,
      totalCFP: allArchitects.reduce((sum, a) => sum + (a.cfpCredits || 0), 0),
      totalProjects: allArchitects.reduce((sum, a) => sum + (a.projects || 0), 0)
    };

    // Statistiche Token
    const tokensStats = {
      total: allTokens.length,
      used: allTokens.filter(t => t.used).length,
      available: allTokens.filter(t => !t.used).length,
      expired: allTokens.filter(t => new Date(t.expiresAt) < new Date()).length
    };

    // Statistiche News
    const newsStats = {
      total: allNews.length,
      published: allNews.filter(n => n.isPublished).length,
      draft: allNews.filter(n => !n.isPublished).length,
      important: allNews.filter(n => n.important).length
    };

    // Statistiche Corsi
    const coursesStats = {
      total: allCourses.length,
      scheduled: allCourses.filter(c => c.status === 'scheduled').length,
      completed: allCourses.filter(c => c.status === 'completed').length,
      totalCFP: allCourses.reduce((sum, c) => sum + (c.cfpCredits || 0), 0),
      totalSeats: allCourses.reduce((sum, c) => sum + (c.totalSeats || 0), 0),
      availableSeats: allCourses.reduce((sum, c) => sum + (c.seatsAvailable || 0), 0)
    };

    // Iscrizioni per mese (ultimi 6 mesi)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentUsers = allUsers.filter(u => 
      u.createdAt && new Date(u.createdAt) > sixMonthsAgo
    );

    const monthlyRegistrations = {};
    recentUsers.forEach(u => {
      const month = new Date(u.createdAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'short' });
      monthlyRegistrations[month] = (monthlyRegistrations[month] || 0) + 1;
    });

    res.json({
      success: true,
      statistics: {
        users: usersStats,
        architects: architectsStats,
        tokens: tokensStats,
        news: newsStats,
        courses: coursesStats,
        monthlyRegistrations
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getAllUsers,
  activateUser,
  deactivateUser,
  deleteUser,
  getAllArchitects,
  getPendingArchitects,
  getArchitectById,
  approveArchitect,
  rejectArchitect,
  updateArchitect,
  deleteArchitect,
  getAllTokens,
  generateToken,
  generateBulkTokens,
  revokeToken,
  getTokensStats,
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  publishNews,
  unpublishNews,
  getNewsStats,
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesStats,
  getSystemStatistics
};