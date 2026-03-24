const axios = require("axios");

const normalizePhone = (value) => {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+") && cleaned.length >= 8) return cleaned;
  if (/^\d{8,15}$/.test(cleaned)) return `+${cleaned}`;
  return null;
};

const isWhatsAppConfigured = () => {
  const provider = (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();

  if (provider === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
    );
  }

  if (provider === "webhook") {
    return Boolean(process.env.WHATSAPP_WEBHOOK_URL);
  }

  return false;
};

const sendViaTwilio = async ({ to, message }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  const payload = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    Body: message,
  });

  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    payload.toString(),
    {
      auth: {
        username: accountSid,
        password: authToken,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    }
  );

  return response.data?.sid || null;
};

const sendViaWebhook = async ({ to, message, metadata }) => {
  const response = await axios.post(
    process.env.WHATSAPP_WEBHOOK_URL,
    {
      to,
      message,
      metadata,
    },
    {
      timeout: 10000,
      headers: process.env.WHATSAPP_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.WHATSAPP_WEBHOOK_TOKEN}` }
        : undefined,
    }
  );

  return response.data?.id || response.data?.messageId || null;
};

async function sendWhatsAppMessage({ to, message, metadata = {} }) {
  const provider = (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
  const normalizedPhone = normalizePhone(to);

  if (!normalizedPhone || !message || !provider) {
    return null;
  }

  if (provider === "twilio") {
    return sendViaTwilio({ to: normalizedPhone, message });
  }

  if (provider === "webhook") {
    return sendViaWebhook({ to: normalizedPhone, message, metadata });
  }

  return null;
}

module.exports = {
  normalizePhone,
  isWhatsAppConfigured,
  sendWhatsAppMessage,
};
