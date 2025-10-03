const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { updateUserSchedule, updateBarberProfile, getUserProfile, addBlockedTime, listUsers } = require('../controllers/userController');

// Actualizar horario del barbero
router.put('/me/schedule', protect, authorizeRoles("barber"), updateUserSchedule);
// Actualizar perfil extendido del barbero
router.put('/me/profile', protect, authorizeRoles("barber"), updateBarberProfile);
//Consulta perfiles
router.get('/:id/profile', protect, getUserProfile);
  // Listado de usuarios
router.get('/', protect, listUsers);
module.exports = router;