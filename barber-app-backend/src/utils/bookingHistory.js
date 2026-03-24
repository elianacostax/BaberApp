const HISTORY_MARKER = "[BOOKING_HISTORY]";

const parseBookingHistory = (notes = "") => {
  if (!notes || typeof notes !== "string") {
    return { cleanNotes: "", history: [] };
  }

  const markerIndex = notes.lastIndexOf(HISTORY_MARKER);
  if (markerIndex === -1) {
    return { cleanNotes: notes, history: [] };
  }

  const cleanNotes = notes.slice(0, markerIndex).trimEnd();
  const rawHistory = notes.slice(markerIndex + HISTORY_MARKER.length).trim();

  try {
    const parsed = JSON.parse(rawHistory);
    return { cleanNotes, history: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { cleanNotes: notes, history: [] };
  }
};

const composeNotesWithHistory = (cleanNotes, history) => {
  const normalizedNotes = (cleanNotes || "").trimEnd();
  const serializedHistory = `${HISTORY_MARKER}${JSON.stringify(history)}`;
  return normalizedNotes ? `${normalizedNotes}\n${serializedHistory}` : serializedHistory;
};

const appendBookingHistory = (booking, event) => {
  const { cleanNotes, history } = parseBookingHistory(booking.notes || "");
  history.push({
    at: new Date().toISOString(),
    ...event,
  });
  booking.notes = composeNotesWithHistory(cleanNotes, history);
};

const hasBookingHistoryEvent = (bookingLike, predicate) => {
  const { history } = parseBookingHistory(bookingLike?.notes || "");
  return history.some(predicate);
};

module.exports = {
  HISTORY_MARKER,
  parseBookingHistory,
  composeNotesWithHistory,
  appendBookingHistory,
  hasBookingHistoryEvent,
};
