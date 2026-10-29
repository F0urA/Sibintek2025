# Multi-stage build для оптимизации размера образа
FROM rust:1.91-slim-bullseye as builder

# Установка зависимостей для сборки
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Создание рабочей директории
WORKDIR /app

# Копирование файлов манифеста
COPY Cargo.toml ./

# Создание dummy проекта для кеширования зависимостей
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo build --release

#RUN rm -rf /app/src

# Копирование исходного кода
COPY src /app/src

# Сборка реального приложения
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    touch src/main.rs && cargo build --release

# Финальный образ
FROM debian:bullseye-slim

# Создание пользователя для запуска приложения
RUN useradd -m -u 1000 dnamail && \
    mkdir -p /app/data && \
    chown -R dnamail:dnamail /app

WORKDIR /app

# Копирование бинарника из builder
COPY --from=builder /app/target/release/SMP /app/SMP
COPY ./Rocket.toml /app/Rocket.toml

# Копирование статических файлов
COPY static /app/static

# Создание пустой базы данных (если не существует)
RUN touch /app/data/pigeons.db && \
    chown -R dnamail:dnamail /app

# Переключение на непривилегированного пользователя
USER dnamail

# Порт приложения
EXPOSE 7000

# Переменные окружения
ENV ROCKET_ADDRESS=0.0.0.0
ENV ROCKET_PORT=7000

# Запуск приложения
CMD ["/app/SMP"]

