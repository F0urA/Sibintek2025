# Локальный AD-чекер

`checker.py` ставит флаг через обычный API сервиса и затем проверяет его чтение.
Нужен Python 3.9+; сторонних библиотек у чекера нет. Каждый `put` создаёт
отдельного пользователя и объект, поэтому флаги разных раундов не затираются.

Для запуска API всех четырёх сервисов из корня репозитория:

```bash
python3 AD_training/training.py up
```

Скрипт один раз создаёт `AD_training/.env.training` со случайными локальными
секретами. `python3 AD_training/training.py down` останавливает стек, сохраняя
Docker volumes.
Compose открывает порты только на `127.0.0.1` и сохраняет данные в
Docker volumes. DNK_web запускается без MinIO: текущий образ
`minio/minio:latest` из исходного Compose больше не скачивается; слоты
`operation` и `route` MinIO не используют.

## Слоты

| Сервис | URL по умолчанию | Слоты и поле флага |
| --- | --- | --- |
| `news` | `http://127.0.0.1:3000` | `report` → `confidential_data`; `private_news` → `content` |
| `smp` | `http://127.0.0.1:7000` | `message` → `content`; `pigeon` → `description` |
| `web` | `http://127.0.0.1:5001` | `operation` → `notes`; `route` → `notes`, читается через `/api/routes/{id}/gps` |
| `blackline` | `http://127.0.0.1:8080` | `profile` → `profile_flag`; `fleet` → `secret_token`; `finance` → `role_fin_flag`; `audit` → `log_flag`; `retail` → `role_retail_flag` |

При необходимости передайте `--url http://127.0.0.1:PORT`. Для контейнера
чекера укажите доступный ему адрес сервиса вместо `127.0.0.1`.

## Пример раунда

Из корня репозитория после запуска нужного сервиса:

```bash
python3 AD_training/checker.py check smp
python3 AD_training/checker.py put smp --slot message --flag 'FLAG{local_example}' > /tmp/sibintek-round1.json
python3 AD_training/checker.py get smp --slot message --flag 'FLAG{local_example}' --state @/tmp/sibintek-round1.json
```

Для остальных сервисов замените имя и слот. `put` возвращает JSON с `state`:
учётными данными чекера и ID объекта. Сохраните этот JSON для вызова `get`
в следующих раундах. Поле `attack_data` содержит только подсказки, которые
можно выдать атакующей стороне: ID новости/отчёта/рейса/вебхука или имя
пользователя. Оба действия завершаются кодом 0 при успехе и 1 при
ошибке; ответ также содержит `status: ok` или `status: fail`. Параметр
`--timeout` задаёт таймаут HTTP в секундах (по умолчанию 5).
`check` и `health` проверяют доступность сервиса.

Файлы состояния содержат пароли и должны оставаться локальными. Можно
хранить их вне репозитория либо в приватном хранилище вашего AD-движка.

Слоты соответствуют целям атак из
[райтапов](<../writeups/WriteUps_Pathes Финал SIBCTF_2025.pdf>).
Чекер кладёт и проверяет свои флаги штатными запросами, без эксплуатации
уязвимостей. Для `web/route` он использует грузовик с ID 1, который добавляет
миграция сервиса.
