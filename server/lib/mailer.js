import nodemailer from 'nodemailer';

let transport;

export async function sendMail({ to, subject, text }) {
  if (!process.env.SMTP_URL) {
    // Development fallback: no mail server configured, so log the message for the operator.
    console.log(`[mail] To: ${to}\n[mail] Subject: ${subject}\n${text}\n`);
    return;
  }
  transport ??= nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: process.env.MAIL_FROM || 'AILOGRACER <no-reply@ailogracer.local>', to, subject, text });
}
