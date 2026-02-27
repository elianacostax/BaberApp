const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { getDashboardStats, getTopBarbers, getMonthlyData, changeUserRole, createBarbershop, listUsersAdmin, listBarbershopsAdmin } = require("../controllers/adminController");
const { createUser, updateUser, deleteUser } = require("../controllers/adminController");

router.get("/dashboard", protect, authorizeRoles("admin", "owner"), getDashboardStats);

// Obtener top barberos del mes
router.get("/top-barbers", protect, authorizeRoles("admin", "owner"), getTopBarbers);

// Obtener datos mensuales para resumen
router.get("/monthly-data", protect, authorizeRoles("admin", "owner"), getMonthlyData);

// Listados admin
router.get("/users", protect, authorizeRoles("admin", "owner"), listUsersAdmin);
router.get("/barbershops", protect, authorizeRoles("admin", "owner"), listBarbershopsAdmin);

// Gestión de usuarios
router.post("/users", protect, authorizeRoles("admin", "owner"), createUser);
router.put("/users/:id", protect, authorizeRoles("admin", "owner"), updateUser);
router.delete("/users/:id", protect, authorizeRoles("admin", "owner"), deleteUser);

// Endpoint temporal para cambiar roles
router.put("/users/:userId/role", protect, authorizeRoles("admin"), changeUserRole);

// Endpoint temporal para crear barberías
router.post("/barbershops", protect, authorizeRoles("admin"), createBarbershop);

module.exports = router;
