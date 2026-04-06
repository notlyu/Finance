const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify().catch(() => {
  console.warn('Email transport not configured. Reset emails will be logged to console.');
});

async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Восстановление пароля</h2>
      <p style="color: #555;">Вы запросили восстановление пароля для аккаунта ${email}.</p>
      <p style="color: #555;">Перейдите по ссылке для создания нового пароля:</p>
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">Сбросить пароль</a>
      <p style="color: #888; font-size: 14px;">Ссылка действительна 1 час. Если вы не запрашивали восстановление — проигнорируйте это письмо.</p>
    </div>
  `;

  const mailOptions = {
    from: `"Финансы" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Восстановление пароля',
    html,
  };

  if (!process.env.SMTP_HOST) {
    console.log('\n=== PASSWORD RESET EMAIL (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('========================================\n');
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('SMTP send failed:', err.message);
  }
}

module.exports = { sendPasswordResetEmail };
