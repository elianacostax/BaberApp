const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
    createReview,
    getReviewsByBarber,
    getBarberRating,
    getMyReviews,
    getMyReviewStats
} = require("../controllers/reviewController");

router.post("/", protect, createReview);
router.get("/barber", protect, getMyReviews);
router.get("/barber/stats", protect, getMyReviewStats);
router.get("/barber/:barberId/average", getBarberRating);
router.get("/barber/:barberId", getReviewsByBarber);

module.exports = router;
