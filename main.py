import os
import sys

from flask import Flask, render_template
from loguru import logger

STATIC_FILES_DIR = "static"
TEMPLATES_FILES_DIR = "templates"
UPLOAD_DIR = "images"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"]
LOGS_DIR = "logs/app.logs"

logger.remove()
logger.add(sys.stderr, level="INFO")
logger.add(LOGS_DIR, level="DEBUG", rotation="1 week")

os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.debug(f"Directory {UPLOAD_DIR} is ready")

app = Flask(__name__)


@app.route("/")
def index():
    logger.info(f"Uploaded \"/\" directory")
    return render_template("index.html")


@app.route("/upload")
def func():
    pass


if __name__ == "__main__":
    app.run(debug=True)
