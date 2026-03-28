const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

// На Railway файловая система эфемерна — используем Volume (mountPath = /app/data)
// Локально кладём рядом с проектом в ./data/
const dataDir = process.env.RAILWAY_ENVIRONMENT
  ? '/app/data'
  : path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'shinmaster.db'));

// WAL-mode — лучше для concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    desc  TEXT,
    price INTEGER NOT NULL,
    unit  TEXT DEFAULT 'от',
    note  TEXT,
    sort  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    service    TEXT NOT NULL,
    car_type   TEXT,
    car        TEXT,
    date       TEXT,
    time       TEXT,
    comment    TEXT,
    status     TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ── Seed admin ────────────────────────────────────────────────────────────────

const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const rawPwd = process.env.ADMIN_PASSWORD || 'admin123';
  const hash   = bcrypt.hashSync(rawPwd, 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
  console.log('[DB] Создан администратор. Пароль из ADMIN_PASSWORD.');
}

// ── Seed services ─────────────────────────────────────────────────────────────

const svcCount = db.prepare('SELECT COUNT(*) as c FROM services').get().c;
if (svcCount === 0) {
  const insert = db.prepare(
    'INSERT INTO services (name, desc, price, unit, note, sort) VALUES (?,?,?,?,?,?)'
  );
  const seed = db.transaction(() => {
    insert.run('Сезонная замена',  'Снятие, монтаж и балансировка 4 колёс', 1800, 'от', 'до R20',    1);
    insert.run('Балансировка',     'Балансировка одного колеса на стенде',    250,  'от', '1 колесо', 2);
    insert.run('Шиномонтаж',       'Монтаж/демонтаж шины без балансировки',   350,  'от', '1 колесо', 3);
    insert.run('Хранение шин',     'Сезонное хранение комплекта колёс',      2400, 'от', 'сезон',    4);
    insert.run('Подкачка / TPMS',  'Регулировка давления, сброс датчика',     100,  'от', '1 колесо', 5);
    insert.run('Ремонт прокола',   'Ремонт шины грибком или жгутом',          450,  'от', '1 прокол', 6);
  });
  seed();
  console.log('[DB] Услуги созданы (seed).');
}

module.exports = db;
