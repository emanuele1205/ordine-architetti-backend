// src/utils/constants.js
// Costanti dell'applicazione

module.exports = {
  // Informazioni Ordine
  ORDINE_INFO: {
    name: 'Ordine degli Architetti P.P.C.',
    province: 'Provincia di Caltanissetta',
    fullName: 'Ordine degli Architetti, Pianificatori, Paesaggisti e Conservatori della Provincia di Caltanissetta',
    address: 'Via E. De Nicola n.17',
    cap: '93100',
    city: 'Caltanissetta',
    phone: '0934 55 30 40',
    mobile: '327 1431252',
    email: 'architetti@caltanissetta.archiworld.it',
    pec: 'oappc.caltanissetta@archiworldpec.it',
    website: 'www.architetti.caltanissetta.it',
    fiscalCode: '80001930857'
  },

  // Categorie news
  NEWS_CATEGORIES: [
    'Normative',
    'Eventi',
    'Concorsi',
    'Formazione',
    'Comunicazioni',
    'Avvisi',
    'Assemblee'
  ],

  // Categorie corsi
  COURSE_CATEGORIES: [
    'BIM',
    'Sostenibilità',
    'Restauro',
    'Urbanistica',
    'Sicurezza',
    'Normativa',
    'Software',
    'Progettazione'
  ],

  // Stati corso
  COURSE_STATUS: {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  // Stati iscrizione
  ENROLLMENT_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    ATTENDED: 'attended',
    CANCELLED: 'cancelled'
  },

  // Stati pagamento
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    REFUNDED: 'refunded'
  },

  // Specializzazioni architetti
  ARCHITECT_SPECIALTIES: [
    'Progettazione Architettonica',
    'Design Interni',
    'Restauro',
    'Urbanistica',
    'Sostenibilità',
    'BIM',
    'Paesaggistica',
    'Conservazione'
  ],

  // Tipi utente
  USER_TYPES: {
    GUEST: 'guest',
    REGISTERED: 'registered',
    ARCHITECT: 'architect',
    ADMIN: 'admin'
  },

  // Messaggi di errore standard
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Non autorizzato',
    FORBIDDEN: 'Accesso negato',
    NOT_FOUND: 'Risorsa non trovata',
    VALIDATION_ERROR: 'Errore di validazione',
    SERVER_ERROR: 'Errore interno del server',
    INVALID_CREDENTIALS: 'Credenziali non valide',
    EMAIL_EXISTS: 'Email già registrata',
    TOKEN_EXPIRED: 'Token scaduto',
    TOKEN_INVALID: 'Token non valido',
    INVALID_ACTIVATION_TOKEN: 'Token di attivazione non valido',
    COURSE_FULL: 'Corso al completo',
    ALREADY_ENROLLED: 'Già iscritto a questo corso'
  },

  // HTTP Status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    SERVER_ERROR: 500
  }
};