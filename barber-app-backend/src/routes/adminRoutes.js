const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { getDashboardStats } = require("../controllers/adminController");

router.get("/dashboard", protect, authorizeRoles("admin"), getDashboardStats);

module.exports = router;