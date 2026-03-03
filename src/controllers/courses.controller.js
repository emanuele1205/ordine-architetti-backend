// src/controllers/courses.controller.js
// Controller per gestione corsi CFP

const { Courses, Enrollments, Users } = require('../services/data.service');
const { paginate } = require('../utils/helpers');
const { HTTP_STATUS, USER_TYPES, COURSE_STATUS, ENROLLMENT_STATUS } = require('../utils/constants');

/**
 * GET /api/courses
 * Lista corsi disponibili
 */
const getCourses = (req, res, next) => {
  try {
    const { 
      status,
      online,
      category,
      upcoming,
      page = 1,
      limit = 20
    } = req.query;

    let courses = Courses.findAll();

    // Filtro per stato
    if (status) {
      courses = courses.filter(c => c.status === status);
    } else {
      // Di default, escludi i cancellati
      courses = courses.filter(c => c.status !== COURSE_STATUS.CANCELLED);
    }

    // Filtro online/presenza
    if (online === 'true') {
      courses = courses.filter(c => c.online === true);
    } else if (online === 'false') {
      courses = courses.filter(c => c.online === false);
    }

    // Filtro categoria
    if (category) {
      courses = courses.filter(c => 
        c.category?.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Solo corsi futuri
    if (upcoming === 'true') {
      const now = new Date();
      courses = courses.filter(c => new Date(c.date) >= now);
    }

    // Ordina per data
    courses.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Aggiungi informazione se l'utente è iscritto
    if (req.user && req.user.userType !== USER_TYPES.GUEST) {
      courses = courses.map(course => ({
        ...course,
        isEnrolled: Enrollments.isEnrolled(req.user.id, course._id)
      }));
    }

    // Paginazione
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
 * GET /api/courses/:id
 * Dettaglio corso
 */
const getCourseById = (req, res, next) => {
  try {
    const { id } = req.params;

    const course = Courses.findById(id);
    if (!course) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Corso non trovato'
      });
    }

    // Aggiungi info iscrizione se utente autenticato
    let isEnrolled = false;
    let enrollment = null;
    
    if (req.user && req.user.userType !== USER_TYPES.GUEST) {
      const userEnrollment = Enrollments.findAll({ 
        userId: req.user.id, 
        courseId: id 
      })[0];
      
      if (userEnrollment) {
        isEnrolled = true;
        enrollment = userEnrollment;
      }
    }

    res.json({
      success: true,
      course: {
        ...course,
        isEnrolled,
        enrollment
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/courses/:id/enroll
 * Iscrizione a un corso
 */
const enrollCourse = (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verifica che non sia un guest
    if (req.user.userType === USER_TYPES.GUEST) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Gli ospiti non possono iscriversi ai corsi'
      });
    }

    // Verifica che il corso esista
    const course = Courses.findById(id);
    if (!course) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Corso non trovato'
      });
    }

    // Verifica che ci siano posti disponibili
    if (course.seatsAvailable <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'COURSE_FULL',
        message: 'Nessun posto disponibile per questo corso'
      });
    }

    // Verifica che non sia già iscritto
    if (Enrollments.isEnrolled(userId, id)) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: 'ALREADY_ENROLLED',
        message: 'Sei già iscritto a questo corso'
      });
    }

    // Verifica stato corso
    if (course.status === COURSE_STATUS.CANCELLED) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'COURSE_CANCELLED',
        message: 'Questo corso è stato cancellato'
      });
    }

    if (course.status === COURSE_STATUS.COMPLETED) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'COURSE_COMPLETED',
        message: 'Questo corso è già terminato'
      });
    }

    // Per corsi a pagamento, qui andrebbe la logica di pagamento
    // Per ora assumiamo pagamento completato se price > 0
    const paymentStatus = course.price > 0 ? 'pending' : 'paid';

    // Crea iscrizione
    const enrollment = Enrollments.create({
      courseId: id,
      userId: userId,
      status: course.price > 0 ? ENROLLMENT_STATUS.PENDING : ENROLLMENT_STATUS.CONFIRMED,
      paymentStatus: paymentStatus,
      enrolledAt: new Date().toISOString()
    });

    // Decrementa posti disponibili
    Courses.decrementSeats(id);

    console.log('✅ Iscrizione corso:', { userId, courseId: id });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: course.price > 0 
        ? 'Iscrizione registrata. Completa il pagamento per confermare.'
        : 'Iscrizione completata con successo!',
      enrollment,
      course: Courses.findById(id)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/courses/:id/enroll
 * Cancella iscrizione
 */
const cancelEnrollment = (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Trova iscrizione
    const enrollments = Enrollments.findAll({ userId, courseId: id });
    const enrollment = enrollments[0];

    if (!enrollment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Iscrizione non trovata'
      });
    }

    // Verifica che si possa ancora cancellare
    if (enrollment.status === ENROLLMENT_STATUS.ATTENDED) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'CANNOT_CANCEL',
        message: 'Non puoi cancellare un\'iscrizione a un corso già frequentato'
      });
    }

    // Aggiorna iscrizione
    Enrollments.update(enrollment._id, {
      status: ENROLLMENT_STATUS.CANCELLED,
      cancelledAt: new Date().toISOString()
    });

    // Ripristina posto disponibile
    const course = Courses.findById(id);
    if (course) {
      Courses.update(id, { 
        seatsAvailable: course.seatsAvailable + 1 
      });
    }

    console.log('✅ Iscrizione cancellata:', { userId, courseId: id });

    res.json({
      success: true,
      message: 'Iscrizione cancellata con successo'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/courses/my-enrollments
 * Lista iscrizioni dell'utente corrente
 */
const getMyEnrollments = (req, res, next) => {
  try {
    const userId = req.user.id;

    const enrollments = Enrollments.findByUser(userId);

    // Arricchisci con i dati dei corsi
    const enrichedEnrollments = enrollments.map(enrollment => {
      const course = Courses.findById(enrollment.courseId);
      return {
        ...enrollment,
        course
      };
    });

    // Ordina per data corso
    enrichedEnrollments.sort((a, b) => {
      if (!a.course || !b.course) return 0;
      return new Date(a.course.date) - new Date(b.course.date);
    });

    res.json({
      success: true,
      enrollments: enrichedEnrollments
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  enrollCourse,
  cancelEnrollment,
  getMyEnrollments
};