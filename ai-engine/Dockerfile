FROM python:3.10-slim
WORKDIR /app
# System deps for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
EXPOSE 5002
CMD ["python", "-u", "main.py"]
