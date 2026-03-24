type BookingHistoryEntry = {
  type?: string;
  eventType?: string;
  assignmentMode?: string;
  reminderWindowMinutes?: number;
};

type BookingWithHistory = {
  history?: BookingHistoryEntry[];
};

const getHistory = (booking: BookingWithHistory) =>
  Array.isArray(booking?.history) ? booking.history : [];

export const isAutoAssignedBooking = (booking: BookingWithHistory) =>
  getHistory(booking).some(
    (entry) =>
      (entry.type === "created" || entry.type === "created_by_staff") &&
      entry.assignmentMode === "auto"
  );

export const getSentReminderWindows = (booking: BookingWithHistory) => {
  const windows = getHistory(booking)
    .filter(
      (entry) =>
        entry.type === "notification_sent" &&
        entry.eventType === "booking_reminder" &&
        Number.isFinite(Number(entry.reminderWindowMinutes))
    )
    .map((entry) => Number(entry.reminderWindowMinutes))
    .sort((a, b) => b - a);

  return [...new Set(windows)];
};

export const formatReminderWindow = (minutes: number) => {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours}h`;
  }

  return `${minutes}m`;
};
