// routes/availabilityRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { validateSchema, schemas } = require("../middlewares/validateBody");
const {createAvailabilityBlock, getAvailabilityBlocks, deleteAvailabilityBlock, updateAvailabilityBlock} = require("../controllers/availabilityController");

// Staff de barbería: barbero, owner o admin global
router.post("/", 
  protect, 
  authorizeRoles("barber", "owner", "admin"), 
  validateSchema(schemas.availabilityBlockCreate), 
  createAvailabilityBlock
);

router.get("/", protect, authorizeRoles("barber", "owner", "admin"), getAvailabilityBlocks);

router.delete("/:id", protect, authorizeRoles("barber", "owner", "admin"), deleteAvailabilityBlock);

router.put("/:id", 
  protect, 
  authorizeRoles("barber", "owner", "admin"),
  validateSchema(schemas.availabilityBlockUpdate), 
  updateAvailabilityBlock
);

module.exports = router;
