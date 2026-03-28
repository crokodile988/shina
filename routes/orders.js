const express     = require('express');
const db          = require('../db/database');
const requireAuth = require('../middleware/auth');
const { sendOrderNotification } = require('../mailer');
const router      = express.Router();

// GET /api/orders  (admin only)
router.get('/', requireAuth, (req, res) => {
  const { status, q } = req.query;

  let sql    = 'SELECT * FROM orders';
  const args = [];
  const where = [];

  if (status && status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (q) {
    where.push('(name LIKE ? OR phone LIKE ? OR car LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY id DESC';

  res.json(db.prepare(sql).all(...args));
});

// GET /api/orders/stats  (admin only)
router.get('/stats', requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(status='new')        as new_count,
      SUM(status='inprogress') as inprogress_count,
      SUM(status='done')       as done_count
    FROM orders
  `).get();
  res.json(row);
});

// POST /api/orders  (public — форма с сайта)
router.post('/', async (req, res) => {
  const { name, phone, service, car_type, car, date, time, comment } = req.body;

  if (!name || !phone || !service) {
    return res.status(400).json({ error: 'Заполните обязательные поля: имя, телефон, услуга' });
  }

  const result = db.prepare(`
    INSERT INTO orders (name, phone, service, car_type, car, date, time, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, service, car_type || null, car || null, date || null, time || null, comment || null);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

  // Отправляем email асинхронно — не блокируем ответ клиенту
  sendOrderNotification(order).catch(err =>
    console.error('[Mailer] Ошибка отправки:', err.message)
  );

  res.status(201).json({ id: order.id, ok: true });
});

// PATCH /api/orders/:id/status  (admin only)
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'inprogress', 'done'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?')
    .run(status, req.params.id);

  if (!info.changes) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json({ ok: true });
});

// DELETE /api/orders/:id  (admin only)
router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json({ ok: true });
});

// DELETE /api/orders  (bulk: ?status=done)  (admin only)
router.delete('/', requireAuth, (req, res) => {
  const { status } = req.query;
  let info;
  if (status && status !== 'all') {
    info = db.prepare('DELETE FROM orders WHERE status = ?').run(status);
  } else {
    info = db.prepare('DELETE FROM orders').run();
  }
  res.json({ deleted: info.changes });
});

module.exports = router;
