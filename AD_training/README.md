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

Если какой-то порт занят, переопределите публикуемый порт перед `training.py up`
переменной окружения (значения по умолчанию в скобках):
`SIBINTEK_NEWS_PORT` (3000), `SIBINTEK_SMP_PORT` (7000), `SIBINTEK_WEB_PORT` (5001),
`SIBINTEK_BLACKLINE_PORT` (8080). Пример: `SIBINTEK_BLACKLINE_PORT=8085 python3
AD_training/training.py up`, затем для чекера/selftest укажите `--url`/`--blackline-url`.

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
можно выдать атакующей стороне, — ровно то, что нужно эксплойту из райтапа:
ID новости/отчёта (`id`), ID рейса (`route_id`), ID вебхука (`webhook_id`),
имя пользователя (`usernames`), `user_id` для profile/finance, а также
`tank_id` для retail. Оба действия завершаются кодом 0 при успехе и 1 при
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

## Самопроверка (selftest)

`selftest.py` доказывает, что чекер кладёт флаг именно туда, откуда его достаёт
атакующий. Для каждого из 11 слотов он делает `put`, забирает только публичный
`attack_data` и вытаскивает флаг **настоящим эксплойтом из райтапа** (SSRF, XFF,
SQLi, IDOR, подделка JWT, грэп логов), после чего сверяет значение. Зависимостей
нет — только стандартная библиотека.

```bash
python3 AD_training/selftest.py                      # все сервисы
python3 AD_training/selftest.py smp blackline        # подмножество
python3 AD_training/selftest.py --blackline-url http://127.0.0.1:8085
```

Опции `--news-url/--smp-url/--web-url/--blackline-url` переопределяют адреса
(полезно при смене портов). Вывод — таблица `PASS/FAIL` по слотам; код возврата
0, если все 11 слотов подтверждены эксплойтом, иначе 1. Это основной способ
убедиться, что чекер и сервисы согласованы после изменений.
