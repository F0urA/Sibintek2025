FROM python:3.9-slim

# Установка curl для SSRF уязвимости
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем requirements и устанавливаем зависимости
COPY service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код сервиса
COPY service/ .

# Создаем директорию для базы данных
RUN mkdir -p /app/instance

# Переменные окружения
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["python", "app.py"]
