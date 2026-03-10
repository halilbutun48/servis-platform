FROM python:3.11-slim

WORKDIR /app

# Keep it deterministic & small
RUN pip install --no-cache-dir --default-timeout=180 --retries 8 "fastapi==0.115.6" "uvicorn[standard]==0.32.1" "ortools==9.10.4067"

COPY app.py /app/app.py

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
