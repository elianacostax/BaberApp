require("dotenv").config();

const { connectDB, sequelize } = require("../config/db");
require("../models/index");
const { processPendingNotificationJobs } = require("../utils/bookingNotifications");
const { logger } = require("../utils/logger");

async function main() {
  await connectDB();

  const summary = await processPendingNotificationJobs({
    limit: Number(process.env.NOTIFICATION_QUEUE_BATCH_SIZE || 25),
    workerId: process.env.NOTIFICATION_QUEUE_WORKER_ID || `manual-${process.pid}`,
  });

  console.log(
    JSON.stringify(
      {
        message: "Notification queue processed",
        ...summary,
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    logger.error("Notification queue script failed", {
      error: error.message,
      stack: error.stack,
    });
    console.error("Error procesando la cola de notificaciones:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // noop
    }
  });
