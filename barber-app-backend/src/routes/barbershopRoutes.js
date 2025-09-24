const express = require("express");
const router = express.Router();
const { createBarbershop, getAllBarbershops, updateBookingHours, addServiceToBarbershop, updateServiceInBarbershop, deleteServiceFromBarbershop, getBarbershopServices } = require("../controllers/barbershopController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { validateSchema, schemas } = require("../middlewares/validateBody");



router.post("/", protect, authorizeRoles("admin"), validateSchema(schemas.barbershopCreate), createBarbershop);
router.get("/", getAllBarbershops);
router.patch("/:id/hours", protect, authorizeRoles("admin"), validateSchema(schemas.barbershopHoursUpdate), updateBookingHours);
router.post('/:id/services', protect, authorizeRoles("admin"), validateSchema(schemas.serviceCreate), addServiceToBarbershop);
router.put('/:id/services/:serviceId', protect, authorizeRoles("admin"), validateSchema(schemas.serviceCreate), updateServiceInBarbershop);
router.delete('/:id/services/:serviceId', protect, authorizeRoles("admin"), deleteServiceFromBarbershop);
router.get('/:id/services', getBarbershopServices);

module.exports = router;