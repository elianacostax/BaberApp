const express = require("express");
const router = express.Router();
const { createBarbershop, getAllBarbershops, updateBarbershop, deleteBarbershop, updateBookingHours, addServiceToBarbershop, updateServiceInBarbershop, deleteServiceFromBarbershop, getBarbershopServices } = require("../controllers/barbershopController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { validateSchema, schemas } = require("../middlewares/validateBody");



router.post("/", protect, authorizeRoles("admin"), validateSchema(schemas.barbershopCreate), createBarbershop);
router.get("/", getAllBarbershops);
router.put("/:id", protect, authorizeRoles("admin", "owner"), validateSchema(schemas.barbershopUpdate), updateBarbershop);
router.delete("/:id", protect, authorizeRoles("admin", "owner"), deleteBarbershop);
router.patch("/:id/hours", protect, authorizeRoles("admin", "owner"), validateSchema(schemas.barbershopHoursUpdate), updateBookingHours);
router.post('/:id/services', protect, authorizeRoles("admin", "owner"), validateSchema(schemas.serviceCreate), addServiceToBarbershop);
router.put('/:id/services/:serviceId', protect, authorizeRoles("admin", "owner"), validateSchema(schemas.serviceCreate), updateServiceInBarbershop);
router.delete('/:id/services/:serviceId', protect, authorizeRoles("admin", "owner"), deleteServiceFromBarbershop);
router.get('/:id/services', getBarbershopServices);

module.exports = router;
