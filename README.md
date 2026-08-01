# OptimalAI

A full-stack product analysis tool: submit a product identifier, and the app scrapes
relevant data, runs it through an LLM (Google Gemini via LangChain) for analysis, and
presents the results on a dashboard with charts and PDF export.

## Stack

- **Backend**: FastAPI, MongoDB (Motor/PyMongo), JWT auth, BeautifulSoup-based scraper,
  Google Gemini via `langchain-google-genai`
- **Frontend**: React 19 + TypeScript + Vite, React Router, Recharts, jsPDF
- **Testing**: Playwright end-to-end suite covering registration, login/logout, and
  dashboard navigation (see `testing_documentation.md`)

## Structure

```
backend/   FastAPI app — auth, scraper, LLM integration, MongoDB models
frontend/  React dashboard — analysis workflow, charts, PDF export
```

## Running locally

```bash
# Backend
cd backend
pip install -r requirements.txt
python run.py

# Frontend
cd frontend
npm install
npm run dev

# E2E tests (from frontend/, with both servers running)
npm run test:e2e
```

## Team

Built as a team project — backend and LLM integration by asjad2401, frontend by
teammates. See contributors for the full breakdown.
