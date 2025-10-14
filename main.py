import os
import sys
from io import BytesIO
from uuid import uuid4

from flask import Flask, abort, jsonify, render_template, request, send_from_directory
from loguru import logger
from PIL import Image, ImageOps
from werkzeug.utils import secure_filename
from database import init_database, test_connection


STATIC_FILES_DIR = "static"
TEMPLATES_FILES_DIR = "templates"
UPLOAD_DIR = "images"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
LOGS_DIR = "logs/app.logs"

logger.remove()
logger.add(sys.stderr, level="INFO")
logger.add(LOGS_DIR, level="DEBUG", rotation="1 week")

os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.debug(f"Directory {UPLOAD_DIR} is ready")

app = Flask(__name__)


@app.route("/")
def index():
    """Загрузка главной страницы."""
    logger.info("Index page is requested")
    return render_template("index.html")


@app.route("/images/<path:filename>", methods=["GET"])
def serve_image(filename: str):
    """
    Отдача изображения по имени из UPLOAD_DIR.
    Включает базовую валидацию имени и расширения по белому списку.
    """
    # Валидация имени файла и защита от path traversal
    safe_name = secure_filename(filename)
    if safe_name != os.path.basename(safe_name):
        logger.warning(
            "Invalid filename (traversal attempt)",
            filename=filename,
            safe=safe_name,
            path=request.path,
        )
        abort(400, "Invalid file name")

    # Разрешённые расширения
    ext = os.path.splitext(safe_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        logger.warning(
            "Disallowed extension", filename=safe_name, ext=ext, path=request.path
        )
        abort(404, "Not Found")

    # Файл должен существовать в папке загрузок
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.isfile(file_path):
        logger.warning("File not found", filename=safe_name, path=request.path)
        abort(404, "Not Found")

    # Успешная отдача файла
    logger.info("Serving image")
    return send_from_directory(UPLOAD_DIR, safe_name)


@app.route("/api/images", methods=["GET"])
def list_images():
    """Возвращает список имён изображений из UPLOAD_DIR."""
    try:
        limit = request.args.get("limit", type=int)
        offset = request.args.get("offset", default=0, type=int)

        entries = []
        for name in os.listdir(UPLOAD_DIR):
            path = os.path.join(UPLOAD_DIR, name)
            if not os.path.isfile(path):
                continue
            ext = os.path.splitext(name)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue
            # Собираем время модификации для сортировки
            entries.append((name, os.path.getmtime(path)))

        entries.sort(key=lambda x: x[1], reverse=True)
        names = [n for n, _ in entries]

        if offset:
            names = names[offset:]
        if limit is not None:
            names = names[:limit]

        logger.info("Images listed", count=len(names), total=len(entries))
        return jsonify(names)
    except Exception as exc:
        logger.exception("Failed to list images", exc)
        abort(500, "Internal Server Error")


@app.route("/api/upload", methods=["POST"])
def upload_image():
    """Реализация загрузки файла в директорию UPLOAD_DIR"""
    if "file" not in request.files:
        logger.warning("File not found", path=request.path)
        abort(400, "No file")
    file = request.files["file"]
    if file.filename == "":
        logger.warning("Empty filename")
        abort(400, "Empty filename")

    # Проверка расширения
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        abort(400, "Unsupported extension")

    # Читаем в память, проверяем размер
    data = file.read()
    if len(data) == 0:
        logger.warning("Empty file", filename=file.filename, path=request.path)
        abort(400, "Empty file")
    if len(data) > MAX_FILE_SIZE:
        logger.warning("File too large", filename=file.filename, path=request.path)
        abort(400, "File too large")

    # Верификация и нормализация изображения через Pillow
    try:
        img = Image.open(BytesIO(data))
        img.verify()  # Проверка структуры файла
    except Exception:
        logger.warning("Invalid image", filename=file.filename, path=request.path)
        abort(400, "Invalid image")

    # Повторно открыть для сохранения после verify()
    img = Image.open(BytesIO(data))
    img = ImageOps.exif_transpose(img)

    # Конвертации для корректного сохранения
    if ext in (".jpg", ".jpeg"):
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
    elif img.mode == "P":
        img = img.convert("RGBA")

    # Имя файла и сохранение
    filename = f"{uuid4().hex}{ext}"
    out_path = os.path.join(UPLOAD_DIR, filename)

    try:
        if ext in (".jpg", ".jpeg"):
            img.save(out_path, format="JPEG", quality=90, optimize=True)
        elif ext == ".png":
            img.save(out_path, format="PNG", optimize=True)
        else:
            img.save(out_path)
    except Exception:
        logger.warning("Save failed", filename=file.filename, path=request.path)
        abort(500, "Save failed")

    logger.info("Uploaded image", filename=filename, size=len(data))
    return jsonify({"filename": filename, "url": f"/images/{filename}"})


@app.errorhandler(400)
def bad_request(error):
    """Обработчик ошибки 400"""
    logger.warning("400 Bad Request", error=str(error), path=request.path)
    return "Bad Request", 400


@app.errorhandler(404)
def not_found(error):
    """Обработчик ошибки 404"""
    logger.info("404 Not Found", error=str(error), path=request.path)
    return "This page does not exist", 404


@app.errorhandler(500)
def internal_error(e):
    """Обработчик ошибки 500"""
    logger.opt(exception=True).error("Unhandled 500 error")
    return "Internal Server Error", 500


if not test_connection():
    logger.error("Не удалось подключиться к базе данных")
    sys.exit(1)

if not init_database():
    logger.error("Не удалось инициализировать базу данных")
    sys.exit(1)

logger.info("База данных готова к работе")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
