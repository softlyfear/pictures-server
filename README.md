# 📷 Pictures Server

Высокопроизводительный сервер для хранения и обработки изображений с валидацией, оптимизацией и API для управления файлами.

## 🚀 Возможности

- ✅ Загрузка изображений через API
- ✅ Автоматическая валидация и оптимизация изображений
- ✅ Генерация уникальных имен файлов
- ✅ Защита от вредоносных файлов и Path Traversal атак
- ✅ Контейнеризация с Docker для простого развертывания
- ✅ Клиентский интерфейс для загрузки и просмотра изображений

## 📋 Требования

- Python 3.8+
- Docker и Docker Compose
- Linux/macOS/Windows с поддержкой Docker (Docker Desktop для macOS/Windows)

## 🛠 Технологический стек

### Backend
- **Python 3.8+**: Основной язык разработки
- **Flask**: Веб-фреймворк
- **Pillow**: Обработка изображений
- **Loguru**: Продвинутое логирование
- **Werkzeug**: Утилиты для Flask

### Frontend
- **JavaScript**: Клиентская логика (drag-and-drop, IndexedDB)
- **HTML/CSS**: Интерфейс и стили
- **Font Awesome**: Иконки для интерфейса

### DevOps & Tools
- **Docker**: Контейнеризация
- **Nginx**: Reverse proxy и статика
- **UV**: Быстрый менеджер пакетов Python
- **Ruff**: Линтер и форматтер кода

## 📦 Установка

### 1. Обновление сервера (Ubuntu/Debian)
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка Docker (Ubuntu/Debian)
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install the Docker packages
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

> **Примечание**: Для macOS/Windows установите [Docker Desktop](https://www.docker.com/products/docker-desktop/).

### 3. Клонирование репозитория
```bash
git clone https://github.com/softlyfear/pictures-server
cd pictures-server/
```

### 4. Запуск сервера
```bash
# Сборка Docker-образа
sudo docker compose build

# Запуск в фоновом режиме
sudo docker compose up -d
```

### 5. Дополнительные команды
```bash
# Остановить работающие контейнеры
sudo docker compose stop

# Остановить и удалить контейнеры, сети и тома
sudo docker compose down

# Запустить уже созданные контейнеры
sudo docker compose start

# Перезапустить сервисы
sudo docker compose restart

# Показать логи сервисов
sudo docker compose logs

# Показать потоковые логи сервисов
sudo docker compose logs -f
```

## 📂 Структура проекта

- `main.py`: Основной файл приложения Flask
- `Dockerfile`: Конфигурация для создания Docker-образа
- `docker-compose.yml`: Настройки для запуска с Docker Compose
- `nginx.conf`: Конфигурация Nginx
- `static/`: Директория для хранения статических файлов
- `templates/`: Шаблоны для рендеринга
- `logs/`: Директория для логов приложения
- `pyproject.toml`: Настройки проекта и зависимости
- `.dockerignore`: Файл игнорирования для Docker
- `.gitignore`: Файл игнорирования для Git

## 🛣️ Маршруты API

- **GET /images/{filename}**: Возвращает изображение по имени из директории `images`. Проверяет валидность имени файла, расширение (.jpg, .jpeg, .png, .gif) и наличие файла. Возвращает 400 при неверном имени, 404 при отсутствии файла.
- **GET /api/images**: Возвращает список имен изображений из директории `images` с поддержкой параметров `limit` и `offset`. Сортирует по времени модификации (новые — первыми). Возвращает 500 при ошибке.
- **POST /api/upload**: Загружает изображение в директорию `images`. Проверяет расширение, размер (макс. 5 МБ), валидность изображения через Pillow. Сохраняет с уникальным именем (UUID). Возвращает JSON с именем файла и URL или 400/500 при ошибке.