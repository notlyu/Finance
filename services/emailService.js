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

async function sendPasswordResetEmail(email, code) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Восстановление пароля</h2>
      <p style="color: #555;">Код для сброса пароля:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">${code}</div>
      <p style="color: #888; font-size: 14px;">Код действителен 15 минут. Если вы не запрашивали восстановление — проигнорируйте это письмо.</p>
    </div>
  `;

  const mailOptions = {
    from: `"Финансы" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Код для восстановления пароля',
    html,
  };

  if (!process.env.SMTP_HOST) {
    console.log('\n=== PASSWORD RESET CODE (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Code: ${code}`);
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
