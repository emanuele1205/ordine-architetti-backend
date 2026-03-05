// src/services/data.service.js
// Service centralizzato per la gestione dei dati
// Attualmente usa file JSON, preparato per migrazione a database

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { generateId } = require('../utils/helpers');

// Percorsi dei file dati
const DATA_FILES = {
  users: path.join(config.dataDir, 'users.json'),
  architects: path.join(config.dataDir, 'architects.json'),
  activationTokens: path.join(config.dataDir, 'activation-tokens.json'),
  courses: path.join(config.dataDir, 'courses.json'),
  news: path.join(config.dataDir, 'news.json'),
  messages: path.join(config.dataDir, 'messages.json'),
  conversations: path.join(config.dataDir, 'conversations.json'),
  enrollments: path.join(config.dataDir, 'enrollments.json'),
  notifications: path.join(config.dataDir, 'notifications.json')
};

// Cache in memoria per performance
let dataCache = {
  users: null,
  architects: null,
  activationTokens: null,
  courses: null,
  news: null,
  messages: null,
  conversations: null,
  enrollments: null,
  notifications: null
};

// ============================================
// FUNZIONI BASE DI LETTURA/SCRITTURA
// ============================================

/**
 * Assicura che la cartella data esista
 */
const ensureDataDir = () => {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
    console.log('📁 Cartella data creata:', config.dataDir);
  }
};

/**
 * Carica dati da file JSON
 * @param {string} collection - Nome della collezione
 * @returns {Array} Array di dati
 */
const loadData = (collection) => {
  try {
    // Se in cache, ritorna dalla cache
    if (dataCache[collection] !== null) {
      return dataCache[collection];
    }

    const filePath = DATA_FILES[collection];
    
    if (!filePath) {
      console.error(`❌ Collezione sconosciuta: ${collection}`);
      return [];
    }

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      dataCache[collection] = JSON.parse(data);
      return dataCache[collection];
    }

    // File non esiste, ritorna array vuoto
    dataCache[collection] = [];
    return [];
  } catch (error) {
    console.error(`❌ Errore caricamento ${collection}:`, error.message);
    return [];
  }
};

/**
 * Salva dati su file JSON
 * @param {string} collection - Nome della collezione
 * @param {Array} data - Dati da salvare
 * @returns {boolean} Successo operazione
 */
const saveData = (collection, data) => {
  try {
    ensureDataDir();
    
    const filePath = DATA_FILES[collection];
    
    if (!filePath) {
      console.error(`❌ Collezione sconosciuta: ${collection}`);
      return false;
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    dataCache[collection] = data; // Aggiorna cache
    
    return true;
  } catch (error) {
    console.error(`❌ Errore salvataggio ${collection}:`, error.message);
    return false;
  }
};

/**
 * Invalida la cache per una collezione
 * @param {string} collection - Nome della collezione (opzionale, se omesso invalida tutto)
 */
const invalidateCache = (collection = null) => {
  if (collection) {
    dataCache[collection] = null;
  } else {
    Object.keys(dataCache).forEach(key => {
      dataCache[key] = null;
    });
  }
};

// ============================================
// OPERAZIONI CRUD GENERICHE
// ============================================

/**
 * Trova tutti i documenti in una collezione
 * @param {string} collection - Nome della collezione
 * @param {Object} filter - Filtro opzionale
 * @returns {Array} Documenti trovati
 */
const findAll = (collection, filter = null) => {
  const data = loadData(collection);
  
  if (!filter) {
    return data;
  }

  return data.filter(item => {
    return Object.keys(filter).every(key => {
      if (filter[key] === undefined) return true;
      return item[key] === filter[key];
    });
  });
};

/**
 * Trova un documento per ID
 * @param {string} collection - Nome della collezione
 * @param {string} id - ID del documento
 * @returns {Object|null} Documento trovato o null
 */
const findById = (collection, id) => {
  const data = loadData(collection);
  return data.find(item => item._id === id || item.id === id) || null;
};

/**
 * Trova un documento che matcha i criteri
 * @param {string} collection - Nome della collezione
 * @param {Object} criteria - Criteri di ricerca
 * @returns {Object|null} Primo documento trovato o null
 */
const findOne = (collection, criteria) => {
  const data = loadData(collection);
  
  return data.find(item => {
    return Object.keys(criteria).every(key => {
      return item[key] === criteria[key];
    });
  }) || null;
};

/**
 * Crea un nuovo documento
 * @param {string} collection - Nome della collezione
 * @param {Object} document - Documento da creare
 * @returns {Object} Documento creato con ID
 */
const create = (collection, document) => {
  const data = loadData(collection);
  
  const newDoc = {
    _id: generateId(),
    ...document,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  data.push(newDoc);
  saveData(collection, data);
  
  console.log(`✅ Creato in ${collection}:`, newDoc._id);
  return newDoc;
};

/**
 * Aggiorna un documento per ID
 * @param {string} collection - Nome della collezione
 * @param {string} id - ID del documento
 * @param {Object} updates - Campi da aggiornare
 * @returns {Object|null} Documento aggiornato o null
 */
const updateById = (collection, id, updates) => {
  const data = loadData(collection);
  const index = data.findIndex(item => item._id === id || item.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Non permettere di modificare _id e createdAt
  const { _id, createdAt, ...safeUpdates } = updates;
  
  data[index] = {
    ...data[index],
    ...safeUpdates,
    updatedAt: new Date().toISOString()
  };
  
  saveData(collection, data);
  console.log(`✅ Aggiornato in ${collection}:`, id);
  
  return data[index];
};

/**
 * Aggiorna documenti che matchano i criteri
 * @param {string} collection - Nome della collezione
 * @param {Object} criteria - Criteri di ricerca
 * @param {Object} updates - Campi da aggiornare
 * @returns {number} Numero di documenti aggiornati
 */
const updateMany = (collection, criteria, updates) => {
  const data = loadData(collection);
  let count = 0;
  
  const { _id, createdAt, ...safeUpdates } = updates;
  
  data.forEach((item, index) => {
    const matches = Object.keys(criteria).every(key => item[key] === criteria[key]);
    
    if (matches) {
      data[index] = {
        ...item,
        ...safeUpdates,
        updatedAt: new Date().toISOString()
      };
      count++;
    }
  });
  
  if (count > 0) {
    saveData(collection, data);
    console.log(`✅ Aggiornati ${count} documenti in ${collection}`);
  }
  
  return count;
};

/**
 * Elimina un documento per ID
 * @param {string} collection - Nome della collezione
 * @param {string} id - ID del documento
 * @returns {boolean} Successo operazione
 */
const deleteById = (collection, id) => {
  const data = loadData(collection);
  const index = data.findIndex(item => item._id === id || item.id === id);
  
  if (index === -1) {
    return false;
  }
  
  data.splice(index, 1);
  saveData(collection, data);
  
  console.log(`✅ Eliminato da ${collection}:`, id);
  return true;
};

/**
 * Elimina documenti che matchano i criteri
 * @param {string} collection - Nome della collezione
 * @param {Object} criteria - Criteri di ricerca
 * @returns {number} Numero di documenti eliminati
 */
const deleteMany = (collection, criteria) => {
  const data = loadData(collection);
  const initialLength = data.length;
  
  const filteredData = data.filter(item => {
    return !Object.keys(criteria).every(key => item[key] === criteria[key]);
  });
  
  const deletedCount = initialLength - filteredData.length;
  
  if (deletedCount > 0) {
    saveData(collection, filteredData);
    console.log(`✅ Eliminati ${deletedCount} documenti da ${collection}`);
  }
  
  return deletedCount;
};

/**
 * Conta documenti in una collezione
 * @param {string} collection - Nome della collezione
 * @param {Object} filter - Filtro opzionale
 * @returns {number} Numero di documenti
 */
const count = (collection, filter = null) => {
  const data = findAll(collection, filter);
  return data.length;
};

// ============================================
// FUNZIONI SPECIFICHE PER UTENTI
// ============================================

const Users = {
  findAll: (filter) => findAll('users', filter),
  findById: (id) => findById('users', id),
  findByEmail: (email) => findOne('users', { email: email.toLowerCase() }),
  create: (userData) => create('users', { ...userData, email: userData.email.toLowerCase() }),
  update: (id, updates) => updateById('users', id, updates),
  delete: (id) => deleteById('users', id),
  count: (filter) => count('users', filter),
  
  // Aggiorna ultimo login
  updateLastLogin: (id) => updateById('users', id, { lastLogin: new Date().toISOString() })
};

// ============================================
// FUNZIONI SPECIFICHE PER ARCHITETTI
// ============================================

const Architects = {
  findAll: (filter) => findAll('architects', filter),
  findById: (id) => findById('architects', id),
  findByUserId: (userId) => findOne('architects', { userId }),
  findByOrderNumber: (orderNumber) => findOne('architects', { orderNumber }),
  create: (architectData) => create('architects', architectData),
  update: (id, updates) => updateById('architects', id, updates),
  delete: (id) => deleteById('architects', id),
  
  // Trova architetti visibili
  findVisible: () => findAll('architects', { profileVisible: true }),
  
  // Trova architetti disponibili
  findAvailable: () => {
    const architects = loadData('architects');
    return architects.filter(a => a.profileVisible && a.isAvailable);
  }
};

// ============================================
// FUNZIONI SPECIFICHE PER TOKEN DI ATTIVAZIONE
// ============================================

const ActivationTokens = {
  findAll: () => findAll('activationTokens'),
  findByToken: (token) => findOne('activationTokens', { token: token.toUpperCase() }),
  create: (tokenData) => create('activationTokens', { ...tokenData, token: tokenData.token.toUpperCase() }),
  delete: (id) => deleteById('activationTokens', id),
  markAsUsed: (token, userId) => {
    const data = loadData('activationTokens');
    const index = data.findIndex(t => t.token === token.toUpperCase());

    if (index !== -1) {
      data[index].used = true;
      data[index].usedBy = userId;
      data[index].usedAt = new Date().toISOString();
      saveData('activationTokens', data);
      return true;
    }
    return false;
  }
};

// ============================================
// FUNZIONI SPECIFICHE PER CORSI
// ============================================

const Courses = {
  findAll: (filter) => findAll('courses', filter),
  findById: (id) => findById('courses', id),
  create: (courseData) => create('courses', courseData),
  update: (id, updates) => updateById('courses', id, updates),
  delete: (id) => deleteById('courses', id),
  
  // Trova corsi attivi (non cancellati, con posti disponibili)
  findActive: () => {
    const courses = loadData('courses');
    return courses.filter(c => 
      c.status !== 'cancelled' && 
      new Date(c.date) >= new Date()
    );
  },
  
  // Decrementa posti disponibili
  decrementSeats: (id) => {
    const course = findById('courses', id);
    if (course && course.seatsAvailable > 0) {
      return updateById('courses', id, { seatsAvailable: course.seatsAvailable - 1 });
    }
    return null;
  }
};

// ============================================
// FUNZIONI SPECIFICHE PER NEWS
// ============================================

const News = {
  findAll: (filter) => findAll('news', filter),
  findById: (id) => findById('news', id),
  create: (newsData) => create('news', newsData),
  update: (id, updates) => updateById('news', id, updates),
  delete: (id) => deleteById('news', id),
  
  // Trova news pubblicate, ordinate per data
  findPublished: () => {
    const news = loadData('news');
    return news
      .filter(n => n.isPublished !== false)
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }
};

// ============================================
// FUNZIONI SPECIFICHE PER MESSAGGI
// ============================================

const Messages = {
  findAll: (filter) => findAll('messages', filter),
  findById: (id) => findById('messages', id),
  create: (messageData) => create('messages', messageData),
  update: (id, updates) => updateById('messages', id, updates),
  delete: (id) => deleteById('messages', id),
  
  // Trova messaggi di una conversazione
  findByConversation: (conversationId) => {
    const messages = loadData('messages');
    return messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },
  
  // Trova messaggi di un utente
  findByUser: (userId) => {
    const messages = loadData('messages');
    return messages.filter(m => m.senderId === userId || m.recipientId === userId);
  }
};

// ============================================
// FUNZIONI SPECIFICHE PER CONVERSAZIONI
// ============================================

const Conversations = {
  findAll: (filter) => findAll('conversations', filter),
  findById: (id) => findById('conversations', id),
  create: (convData) => create('conversations', convData),
  update: (id, updates) => updateById('conversations', id, updates),
  delete: (id) => deleteById('conversations', id),
  
  // Trova conversazioni di un utente
  findByUser: (userId) => {
    const conversations = loadData('conversations');
    return conversations.filter(c => 
      c.participants && c.participants.includes(userId)
    );
  },
  
  // Trova o crea conversazione diretta tra due utenti
  findOrCreateDirect: (userId1, userId2) => {
    const conversations = loadData('conversations');
    
    // Cerca conversazione esistente
    const existing = conversations.find(c => 
      c.type === 'direct' &&
      c.participants &&
      c.participants.includes(userId1) &&
      c.participants.includes(userId2)
    );
    
    if (existing) {
      return existing;
    }
    
    // Crea nuova conversazione
    return create('conversations', {
      type: 'direct',
      participants: [userId1, userId2]
    });
  }
};

// ============================================
// FUNZIONI SPECIFICHE PER ISCRIZIONI CORSI
// ============================================

const Enrollments = {
  findAll: (filter) => findAll('enrollments', filter),
  findById: (id) => findById('enrollments', id),
  create: (enrollmentData) => create('enrollments', enrollmentData),
  update: (id, updates) => updateById('enrollments', id, updates),
  delete: (id) => deleteById('enrollments', id),
  
  // Trova iscrizioni di un utente
  findByUser: (userId) => findAll('enrollments', { userId }),
  
  // Trova iscrizioni a un corso
  findByCourse: (courseId) => findAll('enrollments', { courseId }),
  
  // Verifica se utente è iscritto a un corso
  isEnrolled: (userId, courseId) => {
    return findOne('enrollments', { userId, courseId }) !== null;
  }
};

// ============================================
// FUNZIONI SPECIFICHE PER NOTIFICHE
// ============================================

const Notifications = {
  findAll: (filter) => findAll('notifications', filter),
  findById: (id) => findById('notifications', id),
  findByUserId: (userId) => findAll('notifications', { userId }),
  findUnreadByUserId: (userId) => findAll('notifications', { userId, read: false }),
  create: (data) => create('notifications', data),
  update: (id, updates) => updateById('notifications', id, updates),
  markAsRead: (id) => updateById('notifications', id, { read: true, readAt: new Date().toISOString() }),
  markAllAsRead: (userId) => {
    const data = loadData('notifications');
    let updated = 0;
    data.forEach((n, i) => {
      if (n.userId === userId && !n.read) {
        data[i].read = true;
        data[i].readAt = new Date().toISOString();
        updated++;
      }
    });
    if (updated > 0) saveData('notifications', data);
    return updated;
  },
  delete: (id) => deleteById('notifications', id),
  countUnread: (userId) => findAll('notifications', { userId, read: false }).length
};

// ============================================
// INIZIALIZZAZIONE DATI DI DEFAULT
// ============================================

/**
 * Inizializza i dati di default se i file non esistono
 */
const initializeDefaultData = () => {
  ensureDataDir();
  
  // Token di attivazione di default
  if (!fs.existsSync(DATA_FILES.activationTokens)) {
    const defaultTokens = [
      { _id: generateId(), token: 'ARCH-2025-001', orderNumber: '1234', used: false, createdAt: new Date().toISOString() },
      { _id: generateId(), token: 'ARCH-2025-002', orderNumber: '5678', used: false, createdAt: new Date().toISOString() },
      { _id: generateId(), token: 'ARCH-2025-003', orderNumber: '9012', used: false, createdAt: new Date().toISOString() },
      { _id: generateId(), token: 'ARCH-2025-TEST', orderNumber: '0000', used: false, createdAt: new Date().toISOString() }
    ];
    saveData('activationTokens', defaultTokens);
    console.log('📝 Token di attivazione di default creati');
  }
  
  // Corsi di default
  if (!fs.existsSync(DATA_FILES.courses)) {
    const defaultCourses = [
      {
        _id: generateId(),
        title: 'BIM e Progettazione Digitale',
        description: 'Corso avanzato su Building Information Modeling',
        date: new Date('2025-02-15').toISOString(),
        cfpCredits: 8,
        price: 150,
        seatsAvailable: 25,
        totalSeats: 30,
        instructor: 'Ing. Marco Bianchi',
        location: 'Caltanissetta - Sede Ordine',
        online: false,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      },
      {
        _id: generateId(),
        title: 'Sostenibilità e Certificazioni Energetiche',
        description: 'Normative e tecniche per l\'efficienza energetica',
        date: new Date('2025-02-20').toISOString(),
        cfpCredits: 6,
        price: 120,
        seatsAvailable: 12,
        totalSeats: 25,
        instructor: 'Arch. Laura Verdi',
        location: 'Online',
        online: true,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      },
      {
        _id: generateId(),
        title: 'Restauro e Conservazione',
        description: 'Tecniche moderne di restauro conservativo',
        date: new Date('2025-03-01').toISOString(),
        cfpCredits: 10,
        price: 200,
        seatsAvailable: 0,
        totalSeats: 20,
        instructor: 'Prof. Giuseppe Rossi',
        location: 'Caltanissetta - Sede Ordine',
        online: false,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      }
    ];
    saveData('courses', defaultCourses);
    console.log('📝 Corsi di default creati');
  }
  
  // News di default
  if (!fs.existsSync(DATA_FILES.news)) {
    const defaultNews = [
      {
        _id: generateId(),
        title: 'Nuovo Regolamento Edilizio Comunale',
        excerpt: 'Approvate le modifiche al regolamento edilizio...',
        content: 'Il Consiglio Comunale ha approvato importanti modifiche al regolamento edilizio che entreranno in vigore dal 1° marzo 2025. Le principali novità riguardano le procedure di approvazione per interventi di ristrutturazione e le nuove norme sulla sostenibilità energetica.',
        date: new Date('2025-01-20').toISOString(),
        category: 'Normative',
        author: 'Segreteria Ordine',
        important: true,
        isPublished: true,
        createdAt: new Date().toISOString()
      },
      {
        _id: generateId(),
        title: 'Assemblea Generale degli Iscritti',
        excerpt: 'Convocazione assemblea ordinaria per il 28 febbraio...',
        content: 'È convocata l\'assemblea generale degli iscritti per discutere il bilancio consuntivo 2024 e le attività programmate per il 2025. L\'assemblea si terrà presso la sede dell\'Ordine alle ore 15:00.',
        date: new Date('2025-01-18').toISOString(),
        category: 'Assemblee',
        author: 'Presidente Ordine',
        important: true,
        isPublished: true,
        createdAt: new Date().toISOString()
      },
      {
        _id: generateId(),
        title: 'Bando Concorso Progettazione Piazza Garibaldi',
        excerpt: 'Pubblicato il bando per la riqualificazione...',
        content: 'Il Comune di Caltanissetta ha pubblicato il bando per il concorso di progettazione della nuova Piazza Garibaldi. La scadenza per la presentazione delle proposte è fissata al 30 aprile 2025.',
        date: new Date('2025-01-15').toISOString(),
        category: 'Concorsi',
        author: 'Redazione',
        important: false,
        isPublished: true,
        createdAt: new Date().toISOString()
      }
    ];
    saveData('news', defaultNews);
    console.log('📝 News di default create');
  }
  
  // Inizializza file vuoti se non esistono
  ['users', 'architects', 'messages', 'conversations', 'enrollments', 'notifications'].forEach(collection => {
    if (!fs.existsSync(DATA_FILES[collection])) {
      saveData(collection, []);
      console.log(`📝 File ${collection}.json creato`);
    }
  });
  
  console.log('✅ Inizializzazione dati completata');
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  // Funzioni base
  loadData,
  saveData,
  invalidateCache,
  
  // CRUD generiche
  findAll,
  findById,
  findOne,
  create,
  updateById,
  updateMany,
  deleteById,
  deleteMany,
  count,

  // Collections specifiche
  Users,
  Architects,
  ActivationTokens,
  Courses,
  News,
  Messages,
  Conversations,
  Enrollments,
  Notifications,

  // Inizializzazione
  initializeDefaultData,

  // Costanti
  DATA_FILES
};

// ─── AUTO-SWITCH A MONGODB SE DISPONIBILE ────────────────────────────────────
// Usa mongodb-sync.service.js che ha la stessa API sincrona del JSON service
// ma persiste i dati su MongoDB. I controller NON necessitano di await.
const mongoSyncService = require('./mongodb-sync.service');

// Proxy dinamico: usa MongoDB sync se inizializzato, altrimenti JSON
const createProxy = (jsonService, mongoCollection) => {
  return new Proxy(jsonService, {
    get(target, prop) {
      if (mongoSyncService.isInitialized() && mongoCollection[prop] !== undefined) {
        return mongoCollection[prop];
      }
      return target[prop];
    }
  });
};

module.exports.Users = createProxy(module.exports.Users, mongoSyncService.Users);
module.exports.Architects = createProxy(module.exports.Architects, mongoSyncService.Architects);
module.exports.ActivationTokens = createProxy(module.exports.ActivationTokens, mongoSyncService.ActivationTokens);
module.exports.Courses = createProxy(module.exports.Courses, mongoSyncService.Courses);
module.exports.News = createProxy(module.exports.News, mongoSyncService.News);
module.exports.Messages = createProxy(module.exports.Messages, mongoSyncService.Messages);
module.exports.Conversations = createProxy(module.exports.Conversations, mongoSyncService.Conversations);
module.exports.Enrollments = createProxy(module.exports.Enrollments, mongoSyncService.Enrollments);
module.exports.Notifications = createProxy(module.exports.Notifications, mongoSyncService.Notifications);
