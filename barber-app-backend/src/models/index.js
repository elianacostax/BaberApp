const User = require("./User");
const Barbershop = require("./Barbershop");
const Booking = require("./Booking");
const Review = require("./Review");
const AvailabilityBlock = require("./AvailabilityBlock");

// Relaciones User - Barbershop
User.belongsTo(Barbershop, {
  foreignKey: "barbershopId",
  as: "barbershop",
});
Barbershop.hasMany(User, {
  foreignKey: "barbershopId",
  as: "barbers",
});

// Relaciones Barbershop - Owner
Barbershop.belongsTo(User, {
  foreignKey: "ownerId",
  as: "owner",
});
User.hasMany(Barbershop, {
  foreignKey: "ownerId",
  as: "ownedBarbershops",
});

// Relaciones Booking
Booking.belongsTo(Barbershop, {
  foreignKey: "barbershopId",
  as: "barbershop",
});
Barbershop.hasMany(Booking, {
  foreignKey: "barbershopId",
  as: "bookings",
});

Booking.belongsTo(User, {
  foreignKey: "barberId",
  as: "barber",
});
User.hasMany(Booking, {
  foreignKey: "barberId",
  as: "barberBookings",
});

Booking.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});
User.hasMany(Booking, {
  foreignKey: "userId",
  as: "clientBookings",
});

Booking.belongsTo(User, {
  foreignKey: "createdById",
  as: "createdBy",
});
User.hasMany(Booking, {
  foreignKey: "createdById",
  as: "createdBookings",
});

Booking.belongsTo(User, {
  foreignKey: "modifiedById",
  as: "modifiedBy",
});
User.hasMany(Booking, {
  foreignKey: "modifiedById",
  as: "modifiedBookings",
});

// Relaciones Review
Review.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});
User.hasMany(Review, {
  foreignKey: "userId",
  as: "reviewsGiven",
});

Review.belongsTo(User, {
  foreignKey: "barberId",
  as: "barber",
});
User.hasMany(Review, {
  foreignKey: "barberId",
  as: "reviewsReceived",
});

Review.belongsTo(Booking, {
  foreignKey: "bookingId",
  as: "booking",
});
Booking.hasOne(Review, {
  foreignKey: "bookingId",
  as: "review",
});

// Relaciones AvailabilityBlock
AvailabilityBlock.belongsTo(User, {
  foreignKey: "barberId",
  as: "barber",
});
User.hasMany(AvailabilityBlock, {
  foreignKey: "barberId",
  as: "availabilityBlocks",
});

AvailabilityBlock.belongsTo(User, {
  foreignKey: "createdById",
  as: "createdBy",
});
User.hasMany(AvailabilityBlock, {
  foreignKey: "createdById",
  as: "createdAvailabilityBlocks",
});

module.exports = {
  User,
  Barbershop,
  Booking,
  Review,
  AvailabilityBlock,
};
