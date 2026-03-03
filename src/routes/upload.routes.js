// src/routes/upload.routes.js
// Routes per upload file (foto profilo, documenti)

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth.middleware');
const { Users, Architects } = require('../services/data.service');
const config = require('../config');

// Assicura che la cartella uploads esista
const uploadsDir = config.uploadsDir || path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurazione multer per storage locale
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileDir = path.join(uploadsDir, 'profiles');
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    // Usa userId come nome file per sovrascrivere la vecchia foto
    const userId = req.user.id;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${userId}${ext}`);
  }
});

// Filtro per file immagine
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo file non supportato. Usa JPG, PNG o WebP.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

/**
 * POST /api/upload/profile-photo
 * Upload foto profilo utente
 * @access Private
 */
router.post('/profile-photo',
  authenticateToken,
  upload.single('photo'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nessun file caricato'
        });
      }

      const userId = req.user.id;
      const photoUrl = `/uploads/profiles/${req.file.filename}`;

      // Aggiorna URL foto nel profilo utente
      Users.update(userId, { photoUrl });

      // Se è un architetto, aggiorna anche il profilo architetto
      if (req.user.userType === 'architect') {
        const architect = Architects.findByUserId(userId);
        if (architect) {
          Architects.update(architect._id, { photoUrl });
        }
      }

      console.log(`✅ Foto profilo caricata per utente ${userId}: ${photoUrl}`);

      res.json({
        success: true,
        message: 'Foto profilo aggiornata con successo',
        photoUrl
      });

    } catch (error) {
      console.error('❌ Errore upload foto:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Errore durante il caricamento della foto'
      });
    }
  }
);

/**
 * DELETE /api/upload/profile-photo
 * Rimuove foto profilo utente
 * @access Private
 */
router.delete('/profile-photo',
  authenticateToken,
  (req, res) => {
    try {
      const userId = req.user.id;
      const user = Users.findById(userId);

      if (user && user.photoUrl) {
        // Elimina il file fisico
        const filePath = path.join(__dirname, '..', '..', user.photoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        // Rimuovi URL dal database
        Users.update(userId, { photoUrl: null });
        if (req.user.userType === 'architect') {
          const architect = Architects.findByUserId(userId);
          if (architect) Architects.update(architect._id, { photoUrl: null });
        }
      }

      res.json({
        success: true,
        message: 'Foto profilo rimossa'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Errore durante la rimozione della foto'
      });
    }
  }
);

module.exports = router;
