const Review = require("../models/Review");
const mongoose = require('mongoose');

// Crear reseña
const createReview = async (req, res) => {
    try {
        const { barber, booking, rating, comment } = req.body;
        const userId = req.user.id;

        const existingReview = await Review.findOne({ booking });
        if (existingReview) {
            return res.status(400).json({ message: "Ya has calificado esta reserva" });
        }

        const review = new Review({
            user: userId,
            barber,
            booking,
            rating,
            comment
        });

        await review.save();
        res.status(201).json({ message: "Reseña creada", review });
    } catch (err) {
        handleError(res, 'Error al crear reseña', 500, err);
    }
};

// Obtener reseñas por barbero
const getReviewsByBarber = async (req, res) => {
    try {
        const { barberId } = req.params;
        const reviews = await Review.find({ barber: barberId })
            .populate("user", "name")
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        handleError(res, 'Error al obtener reseñas', 500, err);
    }
};

// Obtener promedio de calificaciones por barbero
const getBarberRating = async (req, res) => {
    try {
        const { barberId } = req.params;

        const result = await Review.aggregate([
            { $match: { barber: new mongoose.Types.ObjectId(barberId) } },
            { $group: {
                _id: "$barber",
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
            }}
        ]);

        if (result.length === 0) {
            return res.json({ averageRating: 0, totalReviews: 0 });
        }

        res.json(result[0]);
    } catch (err) {
        handleError(res, 'Error al obtener promedio de calificaciones', 500, err);
    }
};

module.exports = {
    createReview,
    getReviewsByBarber,
    getBarberRating
};
