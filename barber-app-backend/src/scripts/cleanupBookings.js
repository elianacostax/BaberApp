require("dotenv").config();
const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const Booking = require("../models/Booking");


const MONGO_URI = 'mongodb://localhost:27017/barberApp'; //

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 Conectado a MongoDB");
  } catch (err) {
    console.error("❌ Error al conectar a MongoDB:", err);
    process.exit(1);
  }
};

const cleanBookings = async () => {
  try {
    const allBookings = await Booking.find({});

    let toDelete = [];
    let toFix = [];

    for (const booking of allBookings) {
      const {
        date,
        startTime,
        barber,
        barbershop,
        servicePrice
      } = booking;

      // Validación de campos esenciales
      const hasMissingFields = !date || !startTime || !barber || !barbershop;
      const hasInvalidDate = !DateTime.fromISO(date).isValid;
      const hasInvalidTime = !DateTime.fromJSDate(startTime).isValid;
      const invalidPrice = typeof servicePrice !== "number" || servicePrice < 0;

      if (hasMissingFields || hasInvalidDate || hasInvalidTime || invalidPrice) {
        toDelete.push(booking._id);
      } else if (!booking.servicePrice && booking.services?.[0]?.price) {
        // Caso corregible: mover precio de services a servicePrice
        booking.servicePrice = booking.services[0].price;
        toFix.push(booking);
      }
    }

    if (toFix.length > 0) {
      await Promise.all(toFix.map((b) => b.save()));
      console.log(`🛠️ Se corrigieron ${toFix.length} reservas con precio faltante`);
    }

    if (toDelete.length > 0) {
      await Booking.deleteMany({ _id: { $in: toDelete } });
      console.log(`🗑️ Se eliminaron ${toDelete.length} reservas corruptas`);
    } else {
      console.log("✅ No se encontraron reservas inválidas para eliminar");
    }

    process.exit();
  } catch (err) {
    console.error("❌ Error durante limpieza:", err);
    process.exit(1);
  }
};

connectDB().then(cleanBookings);
