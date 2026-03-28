const nodemailer = require('nodemailer');

function createTransport() {
  const provider = (process.env.MAIL_PROVIDER || 'gmail').toLowerCase();

  const presets = {
    gmail: { service: 'gmail' },
    yandex: { host: 'smtp.yandex.ru',   port: 465, secure: true },
    mail:   { host: 'smtp.mail.ru',     port: 465, secure: true },
    smtp:   {
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
    },
  };

  const cfg = presets[provider] || presets.gmail;

  return nodemailer.createTransport({
    ...cfg,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

async function sendOrderNotification(order) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS || !process.env.NOTIFY_EMAIL) {
    console.log('[Mailer] Email не настроен — уведомление пропущено.');
    return;
  }

  const transport = createTransport();

  const statusDate = order.date
    ? `${order.date} в ${order.time || '—'}`
    : 'дата не указана';

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 24px; }
    .card { background: #fff; border-top: 4px solid #C0001D; padding: 28px 32px; max-width: 520px; margin: 0 auto; }
    h2 { font-size: 22px; color: #111; margin: 0 0 6px; }
    .sub { font-size: 13px; color: #888; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .row:last-of-type { border-bottom: none; }
    .lbl { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: .05em; }
    .val { font-size: 14px; color: #111; font-weight: 500; text-align: right; }
    .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔔 Новая заявка #${order.id}</h2>
    <p class="sub">Получена через сайт ШинМастер</p>
    <div class="row"><span class="lbl">Клиент</span>     <span class="val">${order.name}</span></div>
    <div class="row"><span class="lbl">Телефон</span>    <span class="val">${order.phone}</span></div>
    <div class="row"><span class="lbl">Услуга</span>     <span class="val">${order.service}</span></div>
    <div class="row"><span class="lbl">Автомобиль</span> <span class="val">${[order.car_type, order.car].filter(Boolean).join(' — ') || '—'}</span></div>
    <div class="row"><span class="lbl">Запись</span>     <span class="val">${statusDate}</span></div>
    ${order.comment ? `<div class="row"><span class="lbl">Комментарий</span><span class="val">${order.comment}</span></div>` : ''}
    <p class="footer">ШинМастер · Панель управления: <a href="${process.env.SITE_URL || ''}/admin.html">/admin.html</a></p>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from:    `"ШинМастер" <${process.env.MAIL_USER}>`,
    to:      process.env.NOTIFY_EMAIL,
    subject: `[ШинМастер] Новая заявка #${order.id} — ${order.name}`,
    html,
  });

  console.log(`[Mailer] Уведомление о заявке #${order.id} отправлено на ${process.env.NOTIFY_EMAIL}`);
}

module.exports = { sendOrderNotification };
