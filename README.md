<img width="69" height="69" alt="image" src="https://github.com/user-attachments/assets/119b3bf3-f38e-40f6-b97c-abe5cf83eac2" />

##  Ayuniq - Hybrid FHIR-AYUSH System

Welcome to **Ayuniq**, an innovative platform that integrates traditional Ayurvedic knowledge with modern healthcare standards using the FHIR (Fast Healthcare Interoperability Resources) framework. This project bridges NAMASTE (Ayurvedic terminology) and ICD-11 (WHO's International Classification of Diseases) systems, enabling seamless data exchange between microservices for FHIR bundle generation and insurance claim processing.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Enabled-green.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-lightgrey.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-informational.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express.js-4.x-black.svg)](https://expressjs.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-yellow.svg)](https://developer.mozilla.org/docs/Web/JavaScript)

##  Overview

Ayuniq is a multi-component system designed to:
- **Generate FHIR Bundles**: Convert Ayurvedic and ICD-11 codes into standardized FHIR resources.
- **Process Insurance Claims**: Handle claim submissions and sync offline data.
- **Provide a User Interface**: Offer a React-based frontend for interaction.
- **Ensure Interoperability**: Connect backend services via Docker containers.

The system consists of:
- **Backend**: Node.js-based API (port 8000).
- **FHIR Service**: Python/FastAPI microservice (port 6000).
- **Insurance Service**: Python/FastAPI microservice (port 3002).
- **Frontend**: React application (port 3000).

##  Tech Stack

| **Category**      | **Technology**         | **Version** | **Purpose**                       |
|-------------------|-------------------------|-------------|-----------------------------------|
| **Backend**       | Node.js                | 18+         | Server-side logic and API         |
|                   | Express.js             | Latest      | Web framework                     |
|                   | Axios                   | Latest      | HTTP requests                     |
| **Microservices** | Python                 | 3.9+        | Service logic                     |
|                   | FastAPI                | 0.103.2     | API framework                     |
|                   | Uvicorn                | 0.23.2      | ASGI server                       |
|                   | FHIR.resources          | 7.0.0       | FHIR resource handling            |
|                   | SQLite3                | Latest      | Local database                    |
| **Frontend**      | React                  | 18+         | User interface                    |
|                   | Tailwind CSS           | Latest      | Styling                           |
| **Containerization** | Docker             | Latest      | Container runtime                 |
|                   | Docker Compose         | Latest      | Multi-container orchestration     |
| **Other**         | Git                    | Latest      | Version control                   |
|                   | CSV Parsing (Node)     | Latest      | Data processing                   |

##  Features
- Dual-table search for NAMASTE and ICD-11 terminologies.
- Manual mapping creation between Ayurvedic and ICD-11 codes.
- Offline data syncing for claims during disconnected sessions.
- Dynamic FHIR bundle generation with condition and claim resources.
- Mock insurance claim processing with persistence.

## Prerequisites
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/) and Docker Compose.
- **Node.js**: Version 18+.
- **Python**: Version 3.9+.
- **Git**: For cloning the repository.

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/HESleagacy/Ayuniq.git
   cd Ayuniq
   ```

2. **Build and Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   - This starts all services: backend (8000), fhir_service (6000), insurance_service (3002), and frontend (3000).

3. **Verify Services**
   - Backend: `http://localhost:8000/api/health`
   - FHIR Service: `http://localhost:6000/fhir/generate`
   - Insurance Service: `http://localhost:3002/insurance/submit`
   - Frontend: `http://localhost:3000`

4. **Stop the Services**
   ```bash
   docker-compose down
   ```

## Usage

### API Endpoints
| Endpoint            | Method | Description                       |
|---------------------|--------|-----------------------------------|
| `/api/health`       | GET    | Check system health               |
| `/api/search`       | GET    | Search NAMASTE and ICD-11 terms   |
| `/api/mapping/create` | POST  | Create manual code mapping        |
| `/api/mapping/list` | GET    | List all mappings                 |
| `/api/generate-fhir-claim` | POST | Generate FHIR bundle and claim    |

### Example Request
Generate a FHIR claim:
```bash
curl -X POST 'http://localhost:8000/api/generate-fhir-claim' \
  -H 'Content-Type: application/json' \
  -d '{"patientId": "DEMO_ID", "diagnosis": "Boils"}'
```

### Offline Sync
- Claims are saved locally during offline sessions.
- Run `POST /sync` on `insurance_service` (port 3002) when online to sync unsynced claims.

## Project Structure
```
Ayuniq/
├── backend/           # Node.js backend
├── frontend/          # React frontend
├── microservices/     # Python microservices
│   ├── fhir_service/
│   └── insurance_service/
├── docker-compose.yml # Orchestration file
├── README.md          # This file
└── .gitignore         # Git ignore file
```

## License
This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it!

## Contact
For questions or support, reach out at [sarvadubey@gmail.com](mailto:sarvadubey@gmail.com).
