const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Storage ──────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function dbPath(name) { return path.join(DATA_DIR, name + '.json'); }

function readDB(name, def) {
  try {
    if (fs.existsSync(dbPath(name))) {
      return JSON.parse(fs.readFileSync(dbPath(name), 'utf8'));
    }
  } catch(e) {}
  return def;
}

function writeDB(name, data) {
  fs.writeFileSync(dbPath(name), JSON.stringify(data, null, 2));
}

// ── Defaults ──────────────────────────────────────────────
const DEFAULT_SERVICES = [
  { id:1, name:'Сезонная замена',  desc:'Снятие, монтаж и балансировка 4 колёс', price:1800, unit:'от', note:'до R20' },
  { id:2, name:'Балансировка',     desc:'Балансировка одного колеса на стенде',   price:250,  unit:'от', note:'1 колесо' },
  { id:3, name:'Шиномонтаж',       desc:'Монтаж/демонтаж шины без балансировки',  price:350,  unit:'от', note:'1 колесо' },
  { id:4, name:'Хранение шин',     desc:'Сезонное хранение комплекта колёс',      price:2400, unit:'от', note:'сезон' },
  { id:5, name:'Подкачка / TPMS',  desc:'Регулировка давления, сброс датчика',    price:100,  unit:'от', note:'1 колесо' },
  { id:6, name:'Ремонт прокола',   desc:'Ремонт шины грибком или жгутом',         price:450,  unit:'от', note:'1 прокол' },
];

const DEFAULT_CONTACTS = {
  phone:      '+7 (495) 000-00-00',
  address:    'ул. Шинная, д. 14, стр. 2',
  addressSub: '500 м от ст. м. Автозаводская',
  telegram:   '@shinmaster_msk',
  hours:      'Пн–Вс: 08:00 — 21:00',
  whatsapp:   '+74950000000',
};

const DEFAULT_GALLERY = [
  { id:1, url:'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800&q=80', caption:'Главный зал' },
  { id:2, url:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',    caption:'Оборудование' },
  { id:3, url:'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&q=80', caption:'Балансировка' },
  { id:4, url:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', caption:'Приёмка авто' },
  { id:5, url:'https://images.unsplash.com/photo-1634714579048-c9c3d2e3ebf7?w=800&q=80', caption:'Хранение шин' },
];

const DEFAULT_SETTINGS = {
  password: 'admin',
  notif: { email:'', swNew:true, swStatus:false, swDaily:false }
};

// Init DBs if first run
if (!fs.existsSync(dbPath('services'))) writeDB('services', DEFAULT_SERVICES);
if (!fs.existsSync(dbPath('orders')))   writeDB('orders',   []);
if (!fs.existsSync(dbPath('contacts'))) writeDB('contacts', DEFAULT_CONTACTS);
if (!fs.existsSync(dbPath('gallery')))  writeDB('gallery',  DEFAULT_GALLERY);
if (!fs.existsSync(dbPath('settings'))) writeDB('settings', DEFAULT_SETTINGS);

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Simple auth middleware for admin routes ───────────────
function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  const settings = readDB('settings', DEFAULT_SETTINGS);
  if (token && token === settings.password) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ════════════════════════════════════════════════
//  PUBLIC ROUTES (no auth)
// ════════════════════════════════════════════════

// GET services
app.get('/api/services', (req, res) => {
  res.json(readDB('services', DEFAULT_SERVICES));
});

// GET contacts
app.get('/api/contacts', (req, res) => {
  res.json(readDB('contacts', DEFAULT_CONTACTS));
});

// GET gallery
app.get('/api/gallery', (req, res) => {
  res.json(readDB('gallery', DEFAULT_GALLERY));
});

// POST new order (from booking form)
app.post('/api/orders', (req, res) => {
  const { name, phone, service, carType, car, date, time, comment } = req.body;
  if (!name || !phone || !service) {
    return res.status(400).json({ error: 'Заполните обязательные поля' });
  }
  const orders = readDB('orders', []);
  const id = orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;
  const now = new Date();
  const order = {
    id, name, phone, service,
    carType: carType || '',
    car:     car     || '',
    date:    date    || '',
    time:    time    || '',
    comment: comment || '',
    status:  'new',
    created: now.toLocaleDateString('ru') + ' ' + now.toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' })
  };
  orders.unshift(order);
  writeDB('orders', orders);
  res.json({ ok: true, id });
});

// POST login → returns token (=password) on success
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const settings = readDB('settings', DEFAULT_SETTINGS);
  if (password === settings.password) {
    res.json({ ok: true, token: password });
  } else {
    res.status(401).json({ error: 'Неверный пароль' });
  }
});

// ════════════════════════════════════════════════
//  ADMIN ROUTES (auth required)
// ════════════════════════════════════════════════

// GET all orders
app.get('/api/admin/orders', requireAuth, (req, res) => {
  res.json(readDB('orders', []));
});

// PATCH order status
app.patch('/api/admin/orders/:id', requireAuth, (req, res) => {
  const orders = readDB('orders', []);
  const o = orders.find(x => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (req.body.status) o.status = req.body.status;
  writeDB('orders', orders);
  res.json({ ok: true });
});

// DELETE order
app.delete('/api/admin/orders/:id', requireAuth, (req, res) => {
  let orders = readDB('orders', []);
  orders = orders.filter(o => o.id !== Number(req.params.id));
  writeDB('orders', orders);
  res.json({ ok: true });
});

// DELETE completed orders
app.delete('/api/admin/orders', requireAuth, (req, res) => {
  const { status } = req.query;
  let orders = readDB('orders', []);
  if (status) orders = orders.filter(o => o.status !== status);
  else orders = [];
  writeDB('orders', orders);
  res.json({ ok: true });
});

// PUT services (replace all)
app.put('/api/admin/services', requireAuth, (req, res) => {
  writeDB('services', req.body);
  res.json({ ok: true });
});

// PATCH single service
app.patch('/api/admin/services/:id', requireAuth, (req, res) => {
  const services = readDB('services', DEFAULT_SERVICES);
  const s = services.find(x => x.id === Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Not found' });
  Object.assign(s, req.body);
  writeDB('services', services);
  res.json({ ok: true });
});

// PUT contacts
app.put('/api/admin/contacts', requireAuth, (req, res) => {
  writeDB('contacts', req.body);
  res.json({ ok: true });
});

// GET gallery (admin – same as public)
app.get('/api/admin/gallery', requireAuth, (req, res) => {
  res.json(readDB('gallery', DEFAULT_GALLERY));
});

// POST gallery item
app.post('/api/admin/gallery', requireAuth, (req, res) => {
  const items = readDB('gallery', DEFAULT_GALLERY);
  const id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  const item = { id, url: req.body.url, caption: req.body.caption || 'Фото ' + id };
  items.push(item);
  writeDB('gallery', items);
  res.json({ ok: true, item });
});

// PATCH gallery item
app.patch('/api/admin/gallery/:id', requireAuth, (req, res) => {
  const items = readDB('gallery', DEFAULT_GALLERY);
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  Object.assign(item, req.body);
  writeDB('gallery', items);
  res.json({ ok: true });
});

// DELETE gallery item
app.delete('/api/admin/gallery/:id', requireAuth, (req, res) => {
  const items = readDB('gallery', DEFAULT_GALLERY).filter(i => i.id !== Number(req.params.id));
  writeDB('gallery', items);
  res.json({ ok: true });
});

// PUT settings (password + notif)
app.put('/api/admin/settings', requireAuth, (req, res) => {
  const settings = readDB('settings', DEFAULT_SETTINGS);
  if (req.body.newPassword) {
    if (req.body.currentPassword !== settings.password) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }
    if (req.body.newPassword.length < 6) {
      return res.status(400).json({ error: 'Минимум 6 символов' });
    }
    settings.password = req.body.newPassword;
    // Return new token so client updates it
  }
  if (req.body.notif) settings.notif = req.body.notif;
  writeDB('settings', settings);
  res.json({ ok: true, token: settings.password });
});

// POST confirm — Claude генерирует персональный ответ (API ключ только на сервере)
app.post('/api/confirm', async (req, res) => {
  const { name, service, date, time, car, orderId } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  let text = `Заявка #${orderId} принята. Мы перезвоним вам в течение 15 минут.`;

  if (ANTHROPIC_KEY) {
    try {
      const prompt = `Ты — вежливый администратор шиномонтажа «ШинМастер». Клиент ${name} только что записался на услугу «${service}»${date ? ' на ' + date + ' в ' + time : ''}${car ? ' (' + car + ')' : ''}. Напиши короткое тёплое подтверждение (2 предложения, без markdown). Упомяни что перезвоним в течение 15 минут.`;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-api-key':     ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      if (d.content?.[0]?.text) text = d.content[0].text;
    } catch(e) { /* fallback to default */ }
  }

  res.json({ text });
});

// ── Fallback → index.html ────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ШинМастер сервер запущен на порту ${PORT}`);
});
