// backend/src/middleware/admin.middleware.js
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token di accesso richiesto'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, authConfig.jwt.secret);

    if (decoded.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Privilegi amministratore richiesti'
      });
    }

    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.userType
    };

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sessione scaduta'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token non valido'
    });
  }
};

module.exports = { authenticateAdmin };
