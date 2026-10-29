FROM node:18-alpine

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование остального кода
COPY . .

# Создание директории для логов
RUN mkdir -p /var/log/dws

EXPOSE 5001

# Запуск миграций и сервера
CMD ["sh", "-c", "node migrations/run.js && node server.js"]
