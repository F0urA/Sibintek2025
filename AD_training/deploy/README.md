# Деплой через systemd

## Жюри

На VM жюри (конфиг `AD_training/jury.json` уже создан через `jury init`):

```bash
cd <repo>/AD_training/deploy
# Подставить пользователя и путь к репозиторию
sed -e "s|<user>|$USER|" -e "s|<repo>|$(cd .. && cd .. && pwd)|" \
    sibintek-jury.service | sudo tee /etc/systemd/system/sibintek-jury.service
sudo systemctl daemon-reload
sudo systemctl enable --now sibintek-jury
journalctl -u sibintek-jury -f        # логи и ход раундов
```

Проверить синтаксис до установки: `systemd-analyze verify ./sibintek-jury.service`
(после подстановки путей). Юнит перезапускается при падении (`Restart=on-failure`)
и стартует после сети и Docker.

## Вулнбокс

Отдельный юнит обычно не нужен: сервисы поднимает Docker, если задана
restart-policy и включён демон:

```bash
sudo systemctl enable docker
SIBINTEK_BIND=<internal-ip> python3 <repo>/AD_training/training.py up --restart unless-stopped
```

После `reboot` контейнеры поднимутся сами; `unless-stopped` ретраит старт, пока
внутренний интерфейс не встанет. Проверить: `reboot`, затем
`python3 AD_training/training.py ps` — все сервисы `Up`.

Если внутренний IP поднимается заметно позже Docker и ретраев не хватает,
используйте oneshot-юнит, который дожидается сети и вызывает `training.py up`:

```ini
[Unit]
Description=Sibintek AD vulnbox services
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=<repo>/AD_training
Environment=SIBINTEK_BIND=<internal-ip>
ExecStart=/usr/bin/python3 <repo>/AD_training/training.py up --restart unless-stopped
ExecStop=/usr/bin/python3 <repo>/AD_training/training.py down

[Install]
WantedBy=multi-user.target
```
