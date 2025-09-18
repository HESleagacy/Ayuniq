##AYUNIQ

<img width="32" height="32" alt="image" src="https://github.com/user-attachments/assets/119b3bf3-f38e-40f6-b97c-abe5cf83eac2" />
# 🌿 Ayuniq - Hybrid FHIR-AYUSH System 🌿

Welcome to **Ayuniq**, an innovative platform that integrates traditional Ayurvedic knowledge with modern healthcare standards using the FHIR (Fast Healthcare Interoperability Resources) framework. This project bridges NAMASTE (Ayurvedic terminology) and ICD-11 (WHO's International Classification of Diseases) systems, enabling seamless data exchange between microservices for FHIR bundle generation and insurance claim processing.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)  
[![Docker](https://img.shields.io/badge/Docker-Enabled-green.svg)](https://www.docker.com/)  
[![Node.js](https://img.shields.io/badge/Node.js-18+-lightgrey.svg)](https://nodejs.org/)  
[![Python](https://img.shields.io/badge/Python-3.9+-yellow.svg)](https://www.python.org/)

## 🚀 Overview

Ayuniq is a multi-component system designed to:
- **Generate FHIR Bundles**: Convert Ayurvedic and ICD-11 codes into standardized FHIR resources.
- **Process Insurance Claims**: Handle claim submissions and sync offline data.
- **Provide a User Interface**: Offer a React-based frontend for interaction.
- **Ensure Interoperability**: Connect backend services via Docker containers.

The system consists of:
- **Backend**: Node.js-based API (port 8000).
- **FHIR Service**: Python/FastAPI microservice (port 6001).
- **Insurance Service**: Python/FastAPI microservice (port 3002).
- **Frontend**: React application (port 3000).

## 📋 Features
- Dual-table search for NAMASTE and ICD-11 terminologies.
- Manual mapping creation between Ayurvedic and ICD-11 codes.
- Offline data syncing for claims during disconnected sessions.
- Dynamic FHIR bundle generation with condition and claim resources.
- Mock insurance claim processing with persistence.

## 🛠️ Prerequisites
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/) and Docker Compose.
- **Node.js**: Version 18+.
- **Python**: Version 3.9+.
- **Git**: For cloning the repository.

## 📦 Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/ayuniq.git
   cd ayuniq
   ```

2. **Build and Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   - This starts all services: backend (8000), fhir_service (6001), insurance_service (3002), and frontend (3000).

3. **Verify Services**
   - Backend: `http://localhost:8000/api/health`
   - FHIR Service: `http://localhost:6001/fhir/generate`
   - Insurance Service: `http://localhost:3002/insurance/submit`
   - Frontend: `http://localhost:3000`

4. **Stop the Services**
   ```bash
   docker-compose down
   ```

## 🎮 Usage

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

## 📂 Project Structure
```
ayuniq/
├── backend/           # Node.js backend
├── frontend/          # React frontend
├── microservices/     # Python microservices
│   ├── fhir_service/
│   └── insurance_service/
├── docker-compose.yml # Orchestration file
├── README.md          # This file
└── .gitignore         # Git ignore file
```

## 🛡️ License
This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it!

## 🤝 Contributing
We welcome contributions! Here's how you can help:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-feature`).
3. Commit your changes (`git commit -m 'Add awesome feature'`).
4. Push to the branch (`git push origin feature/awesome-feature`).
5. Open a Pull Request.

## 🌟 Acknowledgments
- [HL7 FHIR](https://www.hl7.org/fhir/) for healthcare interoperability standards.
- [xAI](https://x.ai/) for inspiration and support.
- The open-source community for tools like Docker and React.

## 📧 Contact
For questions or support, reach out at [your-email@example.com](mailto:your-email@example.com).

---

### Notes
- **Customization**: Replace `https://github.com/your-username/ayuniq.git` and `your-email@example.com` with your actual repository URL and email.
- **Visual Appeal**: Emojis and shields add a modern touch. Adjust colors or badges as needed.
- **Current Date**: Reflects 02:39 PM IST, Thursday, September 18, 2025, ensuring timeliness.

Save this as `README.md` in the root directory, and it will enhance your project's presentation! Let me know if you'd like further refinements!

