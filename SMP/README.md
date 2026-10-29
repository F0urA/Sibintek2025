# SMP

Веб-приложение на Rust с Rocket и SQLite.

## Запуск

Требуется Rust toolchain. Из каталога `SMP` выполните `cargo run`; параметры Rocket находятся в `Rocket.toml`. Для контейнерного запуска используйте `docker compose up --build`.

База данных и локальные секреты не должны попадать в Git.
