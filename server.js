// Загружаем .env только локально (на Railway переменные задаются в UI)
if (!process.env.RAILWAY_ENVIRONMENT) {
  require('fs').existsSync('.env') && require('fs')
    .readFileSync('.env', 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && !k.startsWith('#') && !(k.trim() in process.env))
        process.env[k.trim()] = v.join('=').trim();
    });
}

const express = require('express');
const cors    = require('express').Router; // не нужен cors отдельно — раздаём с одного origin
const path    = require('path');

// Инициализируем БД (создаём таблицы и seed при первом запуске)
require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздаём public/ как статику
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/services', require('./routes/services'));

// Конфиг для фронтенда (Яндекс-ключ и координаты карты)
app.get('/api/config', (req, res) => {
  res.json({
    mapsKey:    process.env.YANDEX_MAPS_KEY || '',
    mapLat:     parseFloat(process.env.MAP_LAT  || '55.7558'),
    mapLng:     parseFloat(process.env.MAP_LNG  || '37.6173'),
    mapAddress: process.env.MAP_ADDRESS || 'ул. Шинная, д. 14, стр. 2',
  });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
// index.html и admin.html уже в public/, браузер запросит их напрямую

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ ШинМастер запущен → http://localhost:${PORT}`);
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET не задан! Задайте его в .env или Railway Variables.');
  }
});
