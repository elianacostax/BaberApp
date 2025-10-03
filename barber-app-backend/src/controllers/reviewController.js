const Review = require("../models/Review");
const mongoose = require('mongoose');
const { handleError } = require("../utils/errorHandler");

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

// Obtener reseñas del barbero actual
const getMyReviews = async (req, res) => {
    try {
        const barberId = req.user.id;
        const reviews = await Review.find({ barber: barberId })
            .populate("user", "name email")
            .populate("booking", "date serviceName servicePrice")
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        handleError(res, 'Error al obtener reseñas', 500, err);
    }
};

// Obtener estadísticas de reseñas del barbero actual
const getMyReviewStats = async (req, res) => {
    try {
        const barberId = req.user.id;

        const result = await Review.aggregate([
            { $match: { barber: new mongoose.Types.ObjectId(barberId) } },
            { $group: {
                _id: "$barber",
                totalReviews: { $sum: 1 },
                averageRating: { $avg: "$rating" },
                ratingDistribution: {
                    $push: "$rating"
                }
            }}
        ]);

        if (result.length === 0) {
            return res.json({
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                recentReviews: 0,
                monthlyGrowth: 0
            });
        }

        const data = result[0];
        
        // Calcular distribución de calificaciones
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        data.ratingDistribution.forEach(rating => {
            distribution[rating] = (distribution[rating] || 0) + 1;
        });

        // Calcular reseñas recientes (últimos 30 días)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentReviews = await Review.countDocuments({
            barber: barberId,
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Calcular crecimiento mensual (simplificado)
        const monthlyGrowth = 0; // Placeholder - se implementaría con datos históricos

        res.json({
            totalReviews: data.totalReviews,
            averageRating: Math.round(data.averageRating * 10) / 10,
            ratingDistribution: distribution,
            recentReviews,
            monthlyGrowth
        });
    } catch (err) {
        handleError(res, 'Error al obtener estadísticas de reseñas', 500, err);
    }
};

module.exports = {
    createReview,
    getReviewsByBarber,
    getBarberRating,
    getMyReviews,
    getMyReviewStats
};
