const Review = require("../models/Review");
const User = require("../models/User");
const Booking = require("../models/Booking");
const { handleError } = require("../utils/errorHandler");
const { Op } = require("sequelize");

// Crear reseña
const createReview = async (req, res) => {
    try {
        const { barber, booking, rating, comment } = req.body;
        const userId = req.user.id;

        const bookingRecord = await Booking.findByPk(booking);
        if (!bookingRecord) {
            return res.status(404).json({ message: "Reserva no encontrada" });
        }

        if (bookingRecord.userId !== userId) {
            return res.status(403).json({ message: "No autorizado para calificar esta reserva" });
        }

        if (bookingRecord.barberId !== barber) {
            return res.status(400).json({ message: "La reserva no corresponde al barbero seleccionado" });
        }

        if (bookingRecord.status !== "completed") {
            return res.status(400).json({ message: "Solo puedes calificar reservas completadas" });
        }

        const existingReview = await Review.findOne({ where: { bookingId: booking } });
        if (existingReview) {
            return res.status(400).json({ message: "Ya has calificado esta reserva" });
        }

        const review = await Review.create({
            userId: userId,
            barberId: barber,
            bookingId: booking,
            rating,
            comment
        });

        res.status(201).json({ message: "Reseña creada", review });
    } catch (err) {
        handleError(res, 'Error al crear reseña', 500, err);
    }
};

// Obtener reseñas por barbero
const getReviewsByBarber = async (req, res) => {
    try {
        const { barberId } = req.params;
        const reviews = await Review.findAll({
            where: { barberId },
            include: [{
                model: User,
                as: "user",
                attributes: ["id", "name"]
            }],
            order: [["createdAt", "DESC"]]
        });

        res.json(reviews);
    } catch (err) {
        handleError(res, 'Error al obtener reseñas', 500, err);
    }
};

// Obtener promedio de calificaciones por barbero
const getBarberRating = async (req, res) => {
    try {
        const { barberId } = req.params;

        const reviews = await Review.findAll({
            where: { barberId },
            attributes: ["rating"]
        });

        if (reviews.length === 0) {
            return res.json({ averageRating: 0, totalReviews: 0 });
        }

        const totalReviews = reviews.length;
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

        res.json({
            _id: barberId,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews
        });
    } catch (err) {
        handleError(res, 'Error al obtener promedio de calificaciones', 500, err);
    }
};

// Obtener reseñas del barbero actual
const getMyReviews = async (req, res) => {
    try {
        const barberId = req.user.id;
        const reviews = await Review.findAll({
            where: { barberId },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "name", "email"]
                },
                {
                    model: Booking,
                    as: "booking",
                    attributes: ["id", "date", "serviceName", "servicePrice"]
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        res.json(reviews);
    } catch (err) {
        handleError(res, 'Error al obtener reseñas', 500, err);
    }
};

// Obtener estadísticas de reseñas del barbero actual
const getMyReviewStats = async (req, res) => {
    try {
        const barberId = req.user.id;

        const reviews = await Review.findAll({
            where: { barberId },
            attributes: ["rating", "createdAt"]
        });

        if (reviews.length === 0) {
            return res.json({
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                recentReviews: 0,
                monthlyGrowth: 0
            });
        }

        const totalReviews = reviews.length;
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
        
        // Calcular distribución de calificaciones
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
            distribution[review.rating] = (distribution[review.rating] || 0) + 1;
        });

        // Calcular reseñas recientes (últimos 30 días)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentReviews = reviews.filter(r => r.createdAt >= thirtyDaysAgo).length;

        // Calcular crecimiento mensual (simplificado)
        const monthlyGrowth = 0; // Placeholder - se implementaría con datos históricos

        res.json({
            totalReviews,
            averageRating: Math.round(averageRating * 10) / 10,
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
