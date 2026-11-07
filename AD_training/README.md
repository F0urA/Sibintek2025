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

## Вердикты чекера

`put`/`get`/`check` возвращают JSON с полем `verdict` в формате ForcAD, которое
жюри превращает в статус сервиса на борде:

| Вердикт | Когда | Чья вина |
| --- | --- | --- |
| `UP` | всё прошло (`status: ok`) | — |
| `DOWN` | нет соединения или таймаут | команды (сервис лежит) |
| `MUMBLE` | ответил, но не так: HTTP-ошибка на `put`, кривой JSON, нет полей | команды |
| `CORRUPT` | на `get` не входят сохранённые учётки, объект исчез или флаг не совпал | команды (флаг потерян) |
| `CHECK_FAILED` | чекер вызван неверно или сам упал | жюри (в SLA не считается) |

Коды выхода (0 успех, 1 ошибка) и поле `status` не изменились — старые вызовы
из примеров и `selftest.py` работают как раньше.

## Жюри: раунды, приём флагов, борда

`jury/` — единый процесс (stdlib + SQLite, без зависимостей): крутит раунды,
дёргает `checker.py` подпроцессом, принимает флаги в формате ForcAD и отдаёт
борду. Запускается как каталог: `python3 AD_training/jury <команда>`.

### Настройка

```bash
# Сгенерировать конфиг с 4 командами и случайными токенами
python3 AD_training/jury init --teams 4 --ip-template 10.60.{n}.2
# Напечатать токены для раздачи командам
python3 AD_training/jury tokens
# Запустить игру (борда и приём флагов)
python3 AD_training/jury run
```

`init` пишет `AD_training/jury.json` (игнорируется Git, права 600) и печатает
токены. Образец со всеми полями — [jury.example.json](jury.example.json).
Основные параметры: `round_time` (длина раунда, с), `flag_lifetime` (сколько
раундов флаг принимается), `checker_timeout`, `default_score`, `hardness`
(базовые очки за флаг), `start_time`/`end_time` (ISO 8601 или unix; `null` —
старт при первом `run` и игра без конца), `listen.http`/`listen.tcp`.

Адрес сервиса команды — `http://<ip>:<порт сервиса>`. Поле `urls` у команды
переопределяет адрес отдельных сервисов — так несколько локальных копий гоняются
на одной машине для отладки (см. `Local debug` в примере).

Игра хранится в `AD_training/jury/data/jury.sqlite`. Перезапуск `run`
продолжает с того же раунда и счёта; чтобы начать заново, удалите этот файл.
Раунд N стартует в `start_time + N*round_time`; в каждом раунде для каждой пары
«команда × сервис»: `check` → `put` нового флага (слоты сервиса чередуются) →
`get` случайного ещё живого флага прошлых раундов. Статус раунда — худший из
вердиктов.

### Сдача флагов (совместимо с ForcAD)

Формат флага — `[A-Z0-9]{31}=`. Два способа, оба отвечают строкой
`[<флаг>] <текст>` с формулировками ForcAD, так что фермы S4DFarm/DestructiveFarm
с протоколом `forcad_http` работают без правок.

HTTP `PUT /flags`, токен в заголовке `X-Team-Token`, тело — JSON-массив флагов
(до 100):

```bash
curl -s -X PUT -H 'X-Team-Token: <ваш токен>' \
     -d '["ABCDEFGHIJKLMNOPQRSTUVWXYZ01234="]' http://<jury>:8000/flags
# [{"msg": "[...] Flag accepted! Earned 10 flag points!", "flag": "..."}]
```

TCP `:31337` — первая строка токен, дальше по флагу на строку:

```bash
printf '%s\n%s\n' '<ваш токен>' '<флаг>' | nc <jury> 31337
```

Тексты ответов: `Flag accepted! Earned X flag points!`, `Flag is invalid or
too old`, `Flag is your own`, `Flag already stolen`, `Game not started`,
`Game is over`. Неверный токен по HTTP — `403`.

Настройка фермы (S4DFarm/DestructiveFarm): протокол `forcad_http`, адрес жюри
`http://<jury>:8000`, токен своей команды. Цели ферма берёт из `attack_data`.

### API для борды и ферм

- `GET /` — борда: таблица «команды × сервисы», цвет = статус, FP, SLA %,
  украдено/потеряно, номер раунда и таймер до следующего (опрос раз в 5 с).
- `GET /api/client/scoreboard` — те же данные в JSON.
- `GET /api/client/attack_data` — в формате ForcAD
  `{сервис: {team_ip: [{slot, round, ...подсказки}]}}` за последние
  `flag_lifetime` раундов. Подсказки — публичная часть из `attack_data` чекера
  (ID новости/рейса/вебхука, `user_id`, `tank_id`, имена).
- `GET /api/client/teams`, `GET /api/client/config` — список команд и параметры.

### Подсчёт очков

Старт — `default_score` FP у каждой пары «команда × сервис». За украденный флаг
атакующий получает `hardness * sqrt(fp_жертвы / fp_атакующего)` (не больше 3×),
жертва теряет столько же, но не ниже нуля. `SLA = UP-раунды / проверенные
раунды` (раунды `CHECK_FAILED` не в счёт). Итог команды — `Σ(FP × SLA)` по
сервисам. Вся формула в [jury/scoring.py](jury/scoring.py), её легко заменить.

### Тесты жюри

```bash
python3 -m unittest discover -s AD_training/jury
```

Гоняют раунды, сдачу (принят/свой/повтор/протух/мусор), подсчёт, SLA, HTTP+TCP
и поиск танка на SQLite в памяти с фейковым чекером — Docker не нужен.
