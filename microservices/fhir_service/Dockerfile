FROM python:3.9-slim
WORKDIR /app
COPY app/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ .
EXPOSE 6000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6000", "--reload"]
