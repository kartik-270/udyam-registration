Udyam Registration Application
This repository contains a multi-step Udyam Registration form with a React frontend, a FastAPI backend, and a PostgreSQL database.
🚀 Getting Started
Follow these steps to set up and run the application on your local machine.
Prerequisites
Before you begin, ensure you have the following installed:
Node.js & npm (or Yarn/pnpm): For the React frontend.
Download from: https://nodejs.org/
Python 3.8+ & pip: For the FastAPI backend.
Download from: https://www.python.org/downloads/
PostgreSQL Database: The backend requires a running PostgreSQL instance.
Download from: https://www.postgresql.org/download/
Docker & Docker Compose: For containerizing and orchestrating the entire application.
Download from: https://www.docker.com/products/docker-desktop/
📦 Project Structure
Make sure your project is structured as follows:
.
├── docker-compose.yml
├── backend_folder/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile.backend
└── frontend_folder/
    ├── src/
    │   └── App.tsx
    ├── package.json
    ├── package-lock.json (or yarn.lock/pnpm-lock.yaml)
    └── Dockerfile.frontend



Note: Replace backend_folder and frontend_folder with your actual directory names.
⚙️ Setup Instructions
1. PostgreSQL Database Setup
Your application uses a PostgreSQL database. The docker-compose.yml file will set up a PostgreSQL container for you automatically.
No Manual Table Creation Needed: The FastAPI backend uses SQLAlchemy to automatically create the udyam_registrations table when it starts, as long as the database exists.
2. Backend Setup (FastAPI)
Navigate to the backend folder:
cd backend_folder



Create and activate a Python virtual environment:
python -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate



Install Python dependencies:
Ensure you have a requirements.txt file in your backend_folder with the following content:
fastapi
uvicorn
psycopg2-binary
sqlalchemy
pydantic


Then, install them:
pip install -r requirements.txt



3. Frontend Setup (Next.js)
Navigate to the frontend folder:
cd ../frontend_folder # Adjust path if needed



Install Node.js dependencies:
npm install # Or `yarn install` or `pnpm install`



▶️ Running the Application (Using Docker Compose - Recommended)
This is the easiest way to run all services (database, backend, frontend) together.
Navigate to the root directory of your project (where docker-compose.yml is located).
cd your_project_root_directory



Build and start all services:
docker-compose up --build



The --build flag will build the Docker images for your backend and frontend. You can remove this flag on subsequent runs if you haven't made changes to the Dockerfiles or dependencies.
This command will also start the PostgreSQL database container.
Access the application:
Once all services are up and running, open your web browser and go to:
http://localhost:3000
The FastAPI backend will be accessible internally within Docker at http://backend:8000 (from the frontend container) and externally via http://localhost:8000 on your host machine.
🧪 Running Backend Tests
To run the backend unit tests:
Ensure your backend virtual environment is activated (cd backend_folder and source venv/bin/activate).
Install pytest:
pip install pytest



Execute tests:
pytest



Enjoy your Udyam Registration application! 📝
