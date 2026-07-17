const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta para el registro de usuarios: POST /api/auth/register
router.post('/register', authController.register);

// Ruta para el inicio de sesión: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;
