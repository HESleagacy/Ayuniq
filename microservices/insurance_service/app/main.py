from fastapi import FastAPI
from app.routes import router


app = FastAPI(
    title="Insurance Microservice",
    description="Handles insurance claim submission, status, and offline sync.",
    version="0.1.0"
)

app.include_router(router, prefix="/insurance")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=6000, reload=True)
