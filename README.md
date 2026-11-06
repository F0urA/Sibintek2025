# Sibintek 2025 — локальная AD-тренировка

В репозитории находятся четыре сервиса с Sibintek CTF 2025, райтапы и локальный
чекер. Чекер создаёт объекты с флагами через API сервисов, а затем проверяет,
что флаги сохранились. Это позволяет проводить раунды attack/defense локально.

## Состав проекта

| Каталог | Сервис | Стек | Порт API в тренировке |
| --- | --- | --- | --- |
| [DNK_news](DNK_news/README.md) | Новости и внутренние отчёты | Flask, SQLite | `3000` |
| [DNK_web](DNK_web/README.md) | Нефтебазы, операции и рейсы | Express, PostgreSQL | `5001` |
| [SMP](SMP/README.md) | Голуби и сообщения | Rust/Rocket, SQLite | `7000` |
| [DNK_blackLine](DNK_blackLine/README.md) | Профиль, флот, финансы и аудит | Go, файловое хранилище | `8080` |

- [AD_training](AD_training/README.md) — чекер, самопроверка `selftest.py`, Docker
  Compose и скрипт запуска.
- [writeups](<writeups/WriteUps_Pathes Финал SIBCTF_2025.pdf>) — райтапы, по
  которым выбраны места хранения флагов.

Каждый сервис также можно запускать отдельно по инструкции в его каталоге.
Тренировочный Compose поднимает API, нужные для сценариев из райтапов; веб-интерфейсы
в него не включены.

## Быстрый старт

Нужны Docker с Compose и Python 3.9+. Из корня репозитория:

```bash
python3 AD_training/training.py up
python3 AD_training/checker.py check smp
python3 AD_training/checker.py put smp --slot message --flag 'FLAG{example}' > /tmp/sibintek-round.json
python3 AD_training/checker.py get smp --slot message --flag 'FLAG{example}' --state @/tmp/sibintek-round.json
```

Полная самопроверка — `put` каждого слота и извлечение флага настоящим
эксплойтом из райтапа:

```bash
python3 AD_training/selftest.py
```

Если порт занят, задайте его перед запуском, например
`SIBINTEK_BLACKLINE_PORT=8085 python3 AD_training/training.py up` (и передайте
`--blackline-url http://127.0.0.1:8085` чекеру/selftest). Полный список
переменных — в [инструкции чекера](AD_training/README.md).

`put` возвращает JSON с приватным `state` для будущих проверок и отдельным
`attack_data`, которое можно передать атакующим. Все 11 слотов и формат ответа
описаны в [инструкции чекера](AD_training/README.md).

Остановить сервисы:

```bash
python3 AD_training/training.py down
```

Данные сохраняются в Docker volumes. Локальные секреты создаются в
`AD_training/.env.training`; файл игнорируется Git. Порты тренировочного стека
слушают только `127.0.0.1`. Сервисы намеренно содержат уязвимости из CTF,
поэтому не публикуйте их в интернете.

## Ограничения

Тренировочный DNK_web запускается без MinIO: образ из исходного Compose не
загружается, а сценарии `operation` и `route` от MinIO не зависят. Для задач,
использующих хранилище документов, понадобится отдельный S3-совместимый сервис.

## Лицензия

Лицензия в исходном репозитории не указана.
