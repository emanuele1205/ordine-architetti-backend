// src/services/email.service.js
// Servizio email con Nodemailer

const nodemailer = require('nodemailer');

// Configurazione trasporter da variabili d'ambiente
// Supporta: Gmail, Outlook, SMTP generico, Mailtrap (test)
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE; // 'gmail', 'outlook', ecc.

  if (!user || !pass) {
    console.warn('⚠️  Email non configurata: variabili SMTP_USER e SMTP_PASS mancanti.');
    return null;
  }

  const config = service
    ? { service, auth: { user, pass } }
    : { host: host || 'smtp.gmail.com', port, secure: port === 465, auth: { user, pass } };

  return nodemailer.createTransport(config);
};

// Mittente email
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Ordine Architetti Caltanissetta';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@ordine-architetti-cl.it';

/**
 * Invia email generica
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[EMAIL-MOCK] To: ${to} | Subject: ${subject}`);
    return { success: true, mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });
    console.log(`✅ Email inviata a ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Errore invio email a ${to}:`, error.message);
    throw error;
  }
};

/**
 * Template: Reset password
 */
const sendPasswordResetEmail = async (to, resetToken, firstName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}?resetToken=${resetToken}`;
  const expireMinutes = 60;

  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#6366f1;padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Ordine Architetti P.P.C.</h1>
      <p style="color:#c7d2fe;margin:4px 0 0;">Provincia di Caltanissetta</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#1a1a2e;margin-top:0;">Ciao${firstName ? ` ${firstName}` : ''},</h2>
      <p style="color:#444;line-height:1.6;">Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account.</p>
      <p style="color:#444;line-height:1.6;">Clicca il pulsante qui sotto per creare una nuova password. Il link scadrà tra <strong>${expireMinutes} minuti</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}"
           style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
          Reimposta Password
        </a>
      </div>
      <p style="color:#888;font-size:13px;">Oppure copia questo link nel browser:</p>
      <p style="color:#6366f1;font-size:13px;word-break:break-all;">${resetUrl}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#888;font-size:13px;">Se non hai richiesto il reset della password, ignora questa email. La tua password rimarrà invariata.</p>
    </div>
    <div style="background:#f9f9f9;padding:16px 24px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">© 2025 Ordine Architetti P.P.C. Caltanissetta — Tutti i diritti riservati</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: 'Reimposta la tua password — Ordine Architetti Caltanissetta',
    html
  });
};

/**
 * Template: Benvenuto nuovo utente
 */
const sendWelcomeEmail = async (to, firstName, userType) => {
  const isArchitect = userType === 'architect';
  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#6366f1;padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Benvenuto!</h1>
      <p style="color:#c7d2fe;margin:4px 0 0;">Ordine Architetti P.P.C. Caltanissetta</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#1a1a2e;margin-top:0;">Ciao ${firstName},</h2>
      <p style="color:#444;line-height:1.6;">La tua registrazione è avvenuta con successo!</p>
      ${isArchitect
        ? '<p style="color:#444;line-height:1.6;">Per attivare il tuo profilo professionale, usa il <strong>Token di Attivazione</strong> ricevuto dall\'Ordine nella sezione "Attiva Profilo".</p>'
        : '<p style="color:#444;line-height:1.6;">Puoi ora consultare l\'albo, iscriverti ai corsi di formazione e contattare gli architetti iscritti.</p>'
      }
    </div>
    <div style="background:#f9f9f9;padding:16px 24px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">© 2025 Ordine Architetti P.P.C. Caltanissetta</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: 'Benvenuto nell\'Ordine Architetti Caltanissetta',
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
