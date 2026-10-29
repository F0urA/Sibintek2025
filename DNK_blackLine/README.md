# DNK BlackLine

Демонстрационная система управления автопарком, финансами и розничными операциями.

## Запуск через Docker Compose

1. Скопируйте `.env.example` в `.env`.
2. Замените `POSTGRES_PASSWORD` и пароль в `DATABASE_URL` на одинаковое случайное значение.
3. Запустите `docker compose up --build` из каталога `DNK_blackLine`. Backend создаёт JWT-ключи при первом запуске; храните их в локальном каталоге `backend/keys` и не добавляйте в Git.

Веб-интерфейс будет доступен на `http://localhost:8081`, API — на `http://localhost:8080`.

## Структура

- `backend/` — Go API и PostgreSQL-хранилище.
- `frontend/` — React + TypeScript интерфейс.

Для сборки frontend локально: `cd frontend`, `npm ci`, `npm run build`.
