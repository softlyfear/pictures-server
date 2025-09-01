"""Реализация простого сервера картинок через встроенную библиотеку http.server."""

import http.server
import json
import os
import uuid
from urllib.parse import urlparse

from loguru import logger

STATIC_FILES_DIR = "frontend"
UPLOAD_DIR = "images"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"]
LOG_DIR = "logs"

logger.add("logs/app.log", rotation="1 week")

if not os.path.exists(UPLOAD_DIR):
    logger.info(f"Директория {UPLOAD_DIR} не существует")
    os.mkdir(UPLOAD_DIR)
    logger.info(f"Директория {UPLOAD_DIR} создана")


class ImageHostingHandler(http.server.BaseHTTPRequestHandler):
    """Базовый класс для работы с сервером"""

    def _set_headers(self, status_code=200, content_type="text/html"):
        """Устанавливает HTTP-заголовки ответа.
        
        Args:
            status_code (int): HTTP-код статуса ответа
            content_type (str): MIME-тип содержимого
        """
        self.send_response(status_code)
        self.send_header("Content-type", content_type)
        self.end_headers()

    def _get_content_type(self, file_path):
        """Определяет MIME-тип файла на основе его расширения.
        
        Args:
            file_path (str): Путь к файлу
            
        Returns:
            str: MIME-тип файла
        """
        if file_path.endswith(".html"):
            return "text/html"
        elif file_path.endswith(".css"):
            return "text/css"
        elif file_path.endswith(".js"):
            return "text/js"
        elif file_path.endswith((".png", ".jpg", ".jpeg", ".gif")):
            return "image/" + file_path.split('.')[-1]
        else:
            return "application/octet-stream"

    def do_GET(self):
        """Обрабатывает HTTP GET-запросы.
        
        Поддерживает:
        - Корневой маршрут '/' - отдает index.html
        - Статические файлы из папки frontend
        - Маршрут '/static/' для статических ресурсов
        """
        parsed_path = urlparse(self.path)
        request_path = parsed_path.path

        if request_path == '/':
            file_path = os.path.join(STATIC_FILES_DIR, 'index.html')
            content_type = 'text/html'

        elif request_path.startswith('/static/'):
            file_path = request_path[1:]
            content_type = self._get_content_type(file_path)

        else:
            file_path = os.path.join(STATIC_FILES_DIR, request_path.lstrip('/'))
            content_type = self._get_content_type(file_path)

        if os.path.exists(file_path) and os.path.isfile(file_path):
            try:
                with open(file_path, 'rb') as f:
                    self._set_headers(200, content_type)
                    self.wfile.write(f.read())
                logger.info(f"Действие: Отдан статический файл: {request_path}")
                return
            except Exception as e:
                logger.error(f"Ошибка при отдаче файла {file_path}: {e}")
                self._set_headers(500, 'text/plain')
                self.wfile.write(b"500 Internal Server Error")
                return

        logger.warning(f"Действие: Файл не найден: {request_path}")
        self._set_headers(404, 'text/plain')
        self.wfile.write(b"404 Not Found")

    def do_POST(self):
        """Обрабатывает HTTP POST-запросы.
        
        Поддерживает:
        - Маршрут '/upload' для загрузки изображений (заглушка)
        
        Note:
            В текущей реализации используется заглушка с тестовыми данными.
            Реальная обработка файлов не реализована.
        """
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/upload':
            test_file_name = "test_image.jpg"
            test_file_size = 3 * 1024 * 1024
            file_extension = os.path.splitext(test_file_name)[1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                logger.warning(f"Действие: Ошибка загрузки - неподдерживаемый формат файла ({test_file_name})")
                self._set_headers(400, 'application/json')
                response = {"status": "error",
                            "message": f"Неподдерживаемый формат файла. Допустимы: {', '.join(ALLOWED_EXTENSIONS)}"}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return
            if test_file_size > MAX_FILE_SIZE:
                logger.warning(f"Действие: Ошибка загрузки - файл превышает максимальный размер ({test_file_name})")
                self._set_headers(400, 'application/json')
                response = {"status": "error",
                            "message": f"Файл превышает максимальный размер {MAX_FILE_SIZE / (1024 * 1024):.0f}MB."}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            target_path = os.path.join(UPLOAD_DIR, unique_filename)

            try:
                with open(target_path, 'wb') as f:
                    pass

                file_url = f"/images/{unique_filename}"
                logger.info(
                    f"Действие: Изображение '{test_file_name}' (сохранено как '{unique_filename}') успешно загружено. Ссылка: {file_url}")
                self._set_headers(200, 'application/json')
                response = {
                    "status": "success",
                    "message": "Файл успешно загружен (заглушка)",
                    "filename": unique_filename,
                    "url": file_url
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                logger.error(f"Ошибка при сохранении файла-заглушки: {e}")
                self._set_headers(500, 'application/json')
                response = {"status": "error", "message": "Произошла ошибка при сохранении файла."}
                self.wfile.write(json.dumps(response).encode('utf-8'))

        else:
            self._set_headers(404, 'text/plain')
            self.wfile.write(b"404 Not Found")


def run_server(server_class=http.server.HTTPServer, handler_class=ImageHostingHandler, port=8000):
    """Запускает HTTP-сервер для хостинга изображений.
    
    Args:
        server_class: Класс HTTP-сервера (по умолчанию http.server.HTTPServer)
        handler_class: Класс-обработчик запросов (по умолчанию ImageHostingHandler)
        port (int): Порт для запуска сервера (по умолчанию 8000)
    """
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    logger.info(f"Сервер запущен на порту {port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    logger.info("Сервер остановлен.")


if __name__ == '__main__':
    run_server()
