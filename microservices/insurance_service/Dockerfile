FROM python:3.9-slim
WORKDIR /app
COPY app/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ .
EXPOSE 3002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3002", "--reload"]
