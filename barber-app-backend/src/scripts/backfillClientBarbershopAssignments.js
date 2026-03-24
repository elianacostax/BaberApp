require("dotenv").config();

const { connectDB, sequelize } = require("../config/db");
const { User, Booking } = require("../models");
const { Op } = require("sequelize");

async function main() {
  await connectDB();

  const clients = await User.findAll({
    where: {
      role: "client",
      [Op.or]: [{ barbershopId: null }, { barbershopId: { [Op.is]: null } }],
    },
    attributes: ["id", "email", "barbershopId"],
  });

  let updated = 0;

  for (const client of clients) {
    const latestBooking = await Booking.findOne({
      where: {
        userId: client.id,
        barbershopId: { [Op.ne]: null },
      },
      order: [["createdAt", "DESC"]],
      attributes: ["barbershopId"],
    });

    if (!latestBooking?.barbershopId) {
      continue;
    }

    client.barbershopId = latestBooking.barbershopId;
    await client.save();
    updated += 1;
  }

  console.log(`Clientes actualizados: ${updated}`);
  await sequelize.close();
}

main().catch(async (error) => {
  console.error("Error en backfill de clientes por barbería:", error);
  await sequelize.close();
  process.exit(1);
});
