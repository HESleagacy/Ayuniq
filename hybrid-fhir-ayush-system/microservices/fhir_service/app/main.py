from fastapi import FastAPI
from app.routes import router  

app = FastAPI(
    title="FHIR Microservice",
    description="Handles FHIR bundle generation, validation, and offline sync."
)

# Include the API router from routes.py
app.include_router(router, prefix="/fhir") #Used to make URL - "/fhir/{routes in routes.py}"


#Of no use
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=6000, reload=True)

