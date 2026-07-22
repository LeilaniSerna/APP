const express = require('express');
const router = express.Router();
const routineController = require('../controllers/routineController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas protegidas con el authMiddleware existente
router.get('/', authMiddleware, routineController.getRoutines);
router.post('/', authMiddleware, routineController.createRoutine);

module.exports = router;
