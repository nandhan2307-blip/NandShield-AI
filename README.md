# NandShield AI

**Break the Weakness. Build the Defense.**

NandShield AI is a local security-testing dashboard prototype that demonstrates how common chatbot vulnerabilities can be identified, reviewed, and documented.

## Features

- Automated simulated security scans
- Vulnerability detection and severity classification
- Detailed findings and mitigation recommendations
- Scan history stored in the browser
- Compare saved scan reports
- Filter results by status and severity
- Export security reports
- Cinematic intro animation and dashboard UI

## Tech Stack

- Python
- FastAPI and Uvicorn
- HTML, CSS, and JavaScript
- Pytest
- Browser local storage

## Project Structure

```text
nandshield-ai/
├── backend/
│   ├── main.py
│   ├── security_engine.py
│   └── test_security_engine.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .gitignore
├── requirements.txt
└── README.md
```

## Getting Started

### 1. Create a virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

### 3. Start the backend

```powershell
python -m uvicorn backend.main:app --reload
```

Health check: http://127.0.0.1:8000/health

API documentation: http://127.0.0.1:8000/docs

### 4. Open the frontend

Open `frontend/index.html` in your browser while the backend is running.

## Run Tests

```powershell
python -m pytest backend\test_security_engine.py -v
```

## Current Limitations

This is a demonstration prototype. The security engine uses a simulated chatbot and predefined test scenarios. It does not yet perform comprehensive penetration testing against real AI systems.

Scan history and comparison data are stored in browser local storage.

## Responsible Use

Only test real systems that you own or have explicit permission to assess.

## License

No license has been selected yet. Choose a license before publicly distributing the project.