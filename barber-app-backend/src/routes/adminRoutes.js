const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { getDashboardStats, createUser, updateBarberSchedule } = require("../controllers/adminController");
const { validateSchema, schemas } = require("../middlewares/validateBody");

router.get("/dashboard", protect, authorizeRoles("admin"), getDashboardStats);

// Crear usuario con rol (incl. barber) - solo admin
router.post("/users", protect, authorizeRoles("admin"), validateSchema(schemas.adminUserCreate), createUser);

// Actualizar horario de un barbero
router.put("/barbers/:barberId/schedule", protect, authorizeRoles("admin"), validateSchema(schemas.adminUpdateSchedule), updateBarberSchedule);

module.exports = router;