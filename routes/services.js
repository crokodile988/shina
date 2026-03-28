const express     = require('express');
const db          = require('../db/database');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

// GET /api/services  (public)
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY sort, id').all());
});

// PATCH /api/services/:id  (admin only)
router.patch('/:id', requireAuth, (req, res) => {
  const { name, desc, price, unit, note } = req.body;

  const info = db.prepare(`
    UPDATE services SET name=?, desc=?, price=?, unit=?, note=? WHERE id=?
  `).run(
    name, desc,
    parseInt(price, 10),
    unit || 'от',
    note,
    req.params.id
  );

  if (!info.changes) return res.status(404).json({ error: 'Услуга не найдена' });
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id));
});

// POST /api/services  (admin only) — добавить услугу
router.post('/', requireAuth, (req, res) => {
  const { name, desc, price, unit, note } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Название и цена обязательны' });

  const maxSort = db.prepare('SELECT MAX(sort) as m FROM services').get().m || 0;
  const result  = db.prepare(
    'INSERT INTO services (name, desc, price, unit, note, sort) VALUES (?,?,?,?,?,?)'
  ).run(name, desc || '', parseInt(price, 10), unit || 'от', note || '', maxSort + 1);

  res.status(201).json(db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid));
});

// DELETE /api/services/:id  (admin only)
router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Услуга не найдена' });
  res.json({ ok: true });
});

module.exports = router;
