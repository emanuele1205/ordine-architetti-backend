// backend/src/routes/admin/admin.routes.js
const express = require('express');
const router = express.Router();

const { authenticateAdmin } = require('../../middleware/admin.middleware');
const adminController = require('../../controllers/admin.controller');
const { asyncHandler } = require('../../middleware/error.middleware');

// Login admin (senza autenticazione)
router.post('/auth/login', adminController.login);

// Tutte le altre route richiedono autenticazione admin
router.use(authenticateAdmin);

// ============================================
// ROUTES UTENTI
// ============================================
router.get('/users', adminController.getAllUsers);
router.post('/users/:id/activate', adminController.activateUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.delete('/users/:id', adminController.deleteUser);

// ============================================
// ROUTES ARCHITETTI
// ============================================
// IMPORTANTE: Routes specifiche PRIMA di quelle con parametri dinamici (:id)
router.get('/architects/pending', asyncHandler(adminController.getPendingArchitects));
router.get('/architects', asyncHandler(adminController.getAllArchitects));
router.post('/architects/:id/approve', asyncHandler(adminController.approveArchitect));
router.post('/architects/:id/reject', asyncHandler(adminController.rejectArchitect));
router.get('/architects/:id', adminController.getArchitectById);
router.put('/architects/:id', asyncHandler(adminController.updateArchitect));
router.delete('/architects/:id', asyncHandler(adminController.deleteArchitect));
// ============================================
// ROUTES TOKEN
// ============================================
router.get('/tokens/stats', asyncHandler(adminController.getTokensStats));
router.get('/tokens', asyncHandler(adminController.getAllTokens));
router.post('/tokens/generate', asyncHandler(adminController.generateToken));
router.post('/tokens/generate-bulk', asyncHandler(adminController.generateBulkTokens));
router.delete('/tokens/:token', asyncHandler(adminController.revokeToken));

// ============================================
// ROUTES NEWS
// ============================================
router.get('/news/stats', asyncHandler(adminController.getNewsStats));
router.get('/news', asyncHandler(adminController.getAllNews));
router.post('/news', asyncHandler(adminController.createNews));
router.get('/news/:id', asyncHandler(adminController.getNewsById));
router.put('/news/:id', asyncHandler(adminController.updateNews));
router.delete('/news/:id', asyncHandler(adminController.deleteNews));
router.post('/news/:id/publish', asyncHandler(adminController.publishNews));
router.post('/news/:id/unpublish', asyncHandler(adminController.unpublishNews));
// ============================================
// ROUTES CORSI
// ============================================
router.get('/courses/stats', asyncHandler(adminController.getCoursesStats));
router.get('/courses', asyncHandler(adminController.getAllCourses));
router.post('/courses', asyncHandler(adminController.createCourse));
router.get('/courses/:id', asyncHandler(adminController.getCourseById));
router.put('/courses/:id', asyncHandler(adminController.updateCourse));
router.delete('/courses/:id', asyncHandler(adminController.deleteCourse));
// ============================================
// ROUTES STATISTICHE
// ============================================
router.get('/statistics', asyncHandler(adminController.getSystemStatistics));

module.exports = router;