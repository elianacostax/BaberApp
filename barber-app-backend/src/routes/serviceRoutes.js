const express = require("express");
const router = express.Router();
const { 
    getBarberServices, 
    getAvailableServices, 
    createCustomService, 
    updateCustomService, 
    deleteCustomService, 
    setCustomPrice, 
    removeCustomPrice 
} = require("../controllers/serviceController");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { validateSchema, schemas } = require("../middlewares/validateBody");

// Obtener servicios del barbero (barbería + personalizados)
router.get("/barber", protect, authorizeRoles("barber"), getBarberServices);

// Obtener servicios disponibles para reserva (cliente)
router.get("/available", protect, getAvailableServices);

// Crear servicio personalizado (barbero)
router.post("/custom", protect, authorizeRoles("barber"), validateSchema(schemas.customServiceCreate), createCustomService);

// Actualizar servicio personalizado (barbero)
router.put("/custom/:serviceId", protect, authorizeRoles("barber"), validateSchema(schemas.customServiceUpdate), updateCustomService);

// Eliminar servicio personalizado (barbero)
router.delete("/custom/:serviceId", protect, authorizeRoles("barber"), deleteCustomService);

// Establecer precio personalizado para servicio de barbería (barbero)
router.post("/custom-price/:serviceId", protect, authorizeRoles("barber"), validateSchema(schemas.customPriceSet), setCustomPrice);

// Eliminar precio personalizado (barbero)
router.delete("/custom-price/:serviceId", protect, authorizeRoles("barber"), removeCustomPrice);

module.exports = router;
