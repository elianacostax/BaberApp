const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { updateUserSchedule, updateBarberProfile, getUserProfile, listUsers, getMyFavorites, updateMyFavorites } = require('../controllers/userController');

// Actualizar horario del barbero
router.put('/me/schedule', protect, authorizeRoles("barber"), updateUserSchedule);
// Actualizar perfil extendido del barbero
router.put('/me/profile', protect, authorizeRoles("barber"), updateBarberProfile);
// Favoritos del usuario
router.get('/me/favorites', protect, getMyFavorites);
router.post('/me/favorites', protect, updateMyFavorites);
//Consulta perfiles
router.get('/:id/profile', protect, getUserProfile);
// Listado de usuarios (público para permitir seleccionar barberos en reservas)
router.get('/', listUsers);
module.exports = router;
