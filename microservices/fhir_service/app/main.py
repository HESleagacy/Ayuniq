from fastapi import FastAPI
from app.routes import router  

app = FastAPI(
    title="FHIR Microservice",
    description="Handles FHIR bundle generation, validation, and offline sync."
)

# Include the API router from routes.py
app.include_router(router, prefix="/fhir") #Used to make URL - "/fhir/{routes in routes.py}"




