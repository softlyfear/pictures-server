FROM python:3.13-alpine AS builder

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv pip install --system --no-cache .

FROM python:3.13-alpine

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin/uv /usr/local/bin/uv

COPY main.py .
COPY static/ ./static/
COPY templates/ ./templates/

CMD ["uv", "run", "python3", "main.py"]