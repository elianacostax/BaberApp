const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getBarbers, getBarberLocations } = require('../controllers/barberController');

// Obtener lista de barberos con información completa
router.get('/', protect, getBarbers);

// Obtener ubicaciones de barberías para filtros
router.get('/locations', protect, getBarberLocations);

module.exports = router;
