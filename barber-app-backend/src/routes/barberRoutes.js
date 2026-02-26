const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const { getBarbers, getBarberLocations, getBarberClients, getBarberServices } = require('../controllers/barberController');

// Obtener lista de barberos con información completa
router.get('/', protect, getBarbers);

// Obtener ubicaciones de barberías para filtros
router.get('/locations', protect, getBarberLocations);

// Obtener clientes de un barbero específico
router.get('/me/clients', protect, authorizeRoles('barber'), getBarberClients);

// Obtener servicios de un barbero específico
router.get('/me/services', protect, authorizeRoles('barber'), getBarberServices);

module.exports = router;
