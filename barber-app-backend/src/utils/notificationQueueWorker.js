const { logger } = require("./logger");
const { processPendingNotificationJobs } = require("./bookingNotifications");

let intervalId = null;
let running = false;

const startNotificationQueueWorker = () => {
  if (process.env.NOTIFICATION_QUEUE_AUTO_PROCESS !== "true") {
    return;
  }

  if (intervalId) {
    return;
  }

  const intervalMs = Number(process.env.NOTIFICATION_QUEUE_POLL_INTERVAL_MS || 30000);
  const workerId = process.env.NOTIFICATION_QUEUE_WORKER_ID || `server-${process.pid}`;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      const summary = await processPendingNotificationJobs({ workerId });
      if (summary.claimed > 0) {
        logger.info("Notification queue processed", summary);
      }
    } catch (error) {
      logger.error("Notification queue worker failed", {
        error: error.message,
      });
    } finally {
      running = false;
    }
  };

  intervalId = setInterval(tick, intervalMs);
  tick().catch(() => {});
  logger.info("Notification queue worker started", { intervalMs, workerId });
};

module.exports = {
  startNotificationQueueWorker,
};
