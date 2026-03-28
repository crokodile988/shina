# ШинМастер — сайт шиномонтажки

Express + SQLite + Nodemailer + JWT. Деплой на Railway одной командой.

---

## Структура

```
shinmaster/
├── server.js              # Express-сервер
├── mailer.js              # Email-уведомления (Nodemailer)
├── package.json
├── railway.toml           # Конфиг Railway
├── .env.example           # Шаблон переменных окружения
├── db/
│   └── database.js        # SQLite, схема, seed
├── middleware/
│   └── auth.js            # JWT-проверка
├── routes/
│   ├── auth.js            # POST /api/auth/login, /change-password
│   ├── orders.js          # CRUD заявок
│   └── services.js        # CRUD услуг
└── public/
    ├── index.html         # Сайт (API + Яндекс.Карты)
    └── admin.html         # Панель управления (JWT)
```

---

## Локальный запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Создать `.env`

```bash
cp .env.example .env
```

Отредактировать `.env`:

```env
PORT=3000
JWT_SECRET=любая_длинная_случайная_строка_48_символов
ADMIN_PASSWORD=ваш_пароль

# Email (необязательно для локального теста)
MAIL_PROVIDER=gmail
MAIL_USER=your@gmail.com
MAIL_PASS=xxxx_xxxx_xxxx_xxxx
NOTIFY_EMAIL=your@gmail.com

# Яндекс.Карты (необязательно)
YANDEX_MAPS_KEY=ваш_ключ
MAP_LAT=55.7558
MAP_LNG=37.6173
MAP_ADDRESS=ул. Шинная, д. 14, стр. 2
```

> **JWT_SECRET** — сгенерируй:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 3. Запуск

```bash
npm start
# или для авто-перезапуска:
npm run dev
```

Открыть: http://localhost:3000  
Админка: http://localhost:3000/admin.html  
Логин: `admin` / пароль из `ADMIN_PASSWORD`

---

## Деплой на Railway

### 1. Залить на GitHub

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/ВАШ_НИК/shinmaster.git
git push -u origin main
```

### 2. Создать проект на Railway

1. Зайди на [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Выбери репозиторий `shinmaster`
3. Railway автоматически определит Node.js и запустит `node server.js`

### 3. Добавить Volume (для SQLite)

1. В проекте на Railway: **+ New** → **Volume**
2. Подключи к сервису, `Mount Path` = `/app/data`
3. Без Volume база данных сбрасывается при каждом деплое!

### 4. Задать переменные окружения

В Railway → твой сервис → вкладка **Variables**:

| Переменная        | Значение                          |
|-------------------|-----------------------------------|
| `JWT_SECRET`      | случайная строка 48+ символов     |
| `ADMIN_PASSWORD`  | пароль администратора             |
| `MAIL_PROVIDER`   | `gmail` / `yandex` / `mail`       |
| `MAIL_USER`       | почта для отправки писем          |
| `MAIL_PASS`       | пароль приложения (не основной!)  |
| `NOTIFY_EMAIL`    | куда слать уведомления о заявках  |
| `YANDEX_MAPS_KEY` | ключ Яндекс.Карт                  |
| `MAP_LAT`         | широта точки на карте             |
| `MAP_LNG`         | долгота точки на карте            |
| `MAP_ADDRESS`     | адрес для подписи метки           |
| `SITE_URL`        | ваш домен (напр. `https://shinmaster.up.railway.app`) |

### 5. Деплой

После добавления переменных Railway автоматически передеплоит сервис.  
URL будет вида: `https://shinmaster-production-xxxx.up.railway.app`

---

## Email: Gmail

1. Включи **Двухэтапную аутентификацию** в аккаунте Google
2. Зайди: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Создай пароль приложения → скопируй 16 символов → вставь в `MAIL_PASS`

## Email: Яндекс

1. Включи IMAP в настройках почты
2. Создай пароль приложения в разделе «Безопасность»
3. `MAIL_PROVIDER=yandex`

---

## Яндекс.Карты

1. Зарегистрируйся: [developer.tech.yandex.ru](https://developer.tech.yandex.ru/)
2. Создай API-ключ для JS API и HTTP Geocoder
3. Бесплатный лимит: **1 000 запросов/день** — для шиномонтажки хватит с запасом

---

## API endpoints

| Метод    | URL                        | Доступ  | Описание                  |
|----------|----------------------------|---------|---------------------------|
| `POST`   | `/api/auth/login`          | public  | Получить JWT-токен        |
| `POST`   | `/api/auth/change-password`| admin   | Сменить пароль            |
| `GET`    | `/api/services`            | public  | Список услуг              |
| `PATCH`  | `/api/services/:id`        | admin   | Обновить услугу           |
| `POST`   | `/api/services`            | admin   | Добавить услугу           |
| `DELETE` | `/api/services/:id`        | admin   | Удалить услугу            |
| `POST`   | `/api/orders`              | public  | Создать заявку (+ email)  |
| `GET`    | `/api/orders`              | admin   | Список заявок             |
| `GET`    | `/api/orders/stats`        | admin   | Статистика                |
| `PATCH`  | `/api/orders/:id/status`   | admin   | Сменить статус            |
| `DELETE` | `/api/orders/:id`          | admin   | Удалить заявку            |
| `DELETE` | `/api/orders?status=done`  | admin   | Удалить по статусу        |
| `GET`    | `/api/config`              | public  | Ключ карты и координаты   |
