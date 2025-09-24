const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
    createReview,
    getReviewsByBarber,
    getBarberRating
} = require("../controllers/reviewController");

router.post("/", protect, createReview);
router.get("/barber/:barberId", getReviewsByBarber);
router.get("/barber/:barberId/average", getBarberRating);

module.exports = router;