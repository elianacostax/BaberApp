// routes/availabilityRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const {createAvailabilityBlock, getAvailabilityBlocks, deleteAvailabilityBlock, updateAvailabilityBlock} = require("../controllers/availabilityController");

// Solo barberos o admins pueden crear bloqueos
router.post("/", protect, authorizeRoles("barber", "admin"), createAvailabilityBlock);
router.get("/", protect, getAvailabilityBlocks); // Consultar bloqueos (admin o barbero)
router.delete("/:id", protect, authorizeRoles("barber", "admin"), deleteAvailabilityBlock);
router.put("/:id", protect, authorizeRoles("barber", "admin"),updateAvailabilityBlock);

module.exports = router;