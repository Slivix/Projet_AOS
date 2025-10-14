# backend/game-service/Dockerfile
FROM python:3.9-slim

WORKDIR /srv
ENV PIP_NO_CACHE_DIR=1 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install -r requirements.txt

# copie le paquet
COPY app ./app
ENV PYTHONPATH=/srv

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]