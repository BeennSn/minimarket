const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const enviarCorreo = async ({ para, asunto, html }) => {
  await transporter.sendMail({
    from: `"Minimarket" <${process.env.SMTP_USER}>`,
    to: para,
    subject: asunto,
    html,
  });
};

module.exports = { enviarCorreo };
