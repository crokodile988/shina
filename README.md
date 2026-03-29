# ШинМастер — сайт шиномонтажа

Полноценный сайт с панелью администратора. Node.js + Express, данные хранятся в JSON-файлах.

## Структура

```
shinmaster/
├── server.js          # Express сервер + все API
├── package.json
├── .gitignore
├── data/              # создаётся автоматически при первом запуске
│   ├── orders.json
│   ├── services.json
│   ├── contacts.json
│   ├── gallery.json
│   └── settings.json
└── public/
    ├── index.html     # сайт для клиентов
    └── admin.html     # панель управления
```

## Локальный запуск

```bash
npm install
npm start
# Открыть http://localhost:3000
```

## Деплой на Railway

1. Залить папку `shinmaster` в GitHub репозиторий
2. На [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Выбрать репозиторий
4. В настройках Railway добавить переменную окружения:
   - `ANTHROPIC_API_KEY` = ваш ключ от Anthropic (для AI-подтверждений заявок)
5. Railway автоматически запустит `npm start`

## Переменные окружения

| Переменная | Описание |
|---|---|
| `ANTHROPIC_API_KEY` | Ключ API Claude (опционально, для персональных подтверждений) |
| `PORT` | Порт сервера (Railway подставляет автоматически) |

## Вход в админку

- URL: `/admin.html`
- Пароль по умолчанию: `admin`
- **Обязательно смените пароль** после первого входа в разделе «Настройки»

## API endpoints

### Публичные (без авторизации)
- `GET  /api/services` — список услуг
- `GET  /api/contacts` — контактные данные
- `GET  /api/gallery`  — галерея
- `POST /api/orders`   — создать заявку
- `POST /api/auth/login` — вход в админку
- `POST /api/confirm`  — AI-подтверждение заявки

### Административные (заголовок `x-admin-token`)
- `GET    /api/admin/orders`        — все заявки
- `PATCH  /api/admin/orders/:id`    — изменить статус
- `DELETE /api/admin/orders/:id`    — удалить заявку
- `DELETE /api/admin/orders`        — удалить все / по статусу
- `PATCH  /api/admin/services/:id`  — обновить услугу
- `PUT    /api/admin/contacts`      — обновить контакты
- `POST   /api/admin/gallery`       — добавить фото
- `PATCH  /api/admin/gallery/:id`   — обновить фото
- `DELETE /api/admin/gallery/:id`   — удалить фото
- `PUT    /api/admin/settings`      — сменить пароль / уведомления
