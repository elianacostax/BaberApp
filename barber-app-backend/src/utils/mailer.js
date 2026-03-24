const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  FRONTEND_URL,
} = process.env;

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: SMTP_SECURE === 'true',
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

function isMailConfigured() {
  return Boolean(SMTP_HOST);
}

async function sendResetPasswordEmail(to, token) {
  const url = `${FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}`;
  const mailOptions = {
    from: SMTP_FROM || 'no-reply@barberapp.local',
    to,
    subject: 'Restablecer tu contraseña',
    html: `
      <p>Has solicitado restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para continuar (expira en 15 minutos):</p>
      <p><a href="${url}">${url}</a></p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `,
  };
  const tx = await getTransporter().sendMail(mailOptions);
  return tx.messageId;
}

async function sendBookingNotificationEmail({ to, subject, html, text }) {
  if (!isMailConfigured() || !to) {
    return null;
  }

  const tx = await getTransporter().sendMail({
    from: SMTP_FROM || 'no-reply@barberapp.local',
    to,
    subject,
    html,
    text,
  });

  return tx.messageId;
}

module.exports = {
  isMailConfigured,
  sendResetPasswordEmail,
  sendBookingNotificationEmail,
};

