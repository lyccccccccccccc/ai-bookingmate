# Day 1 Setup

## What Was Created

- Root Git repository
- `frontend/` React + TypeScript app created with Vite
- `backend/` NestJS + TypeScript app created with npm
- `ai-service/` placeholder for the future Python FastAPI AI assistant service
- `docs/` project documentation folder
- Root `README.md`
- Root `.gitignore`
- Root `package.json` with simple convenience scripts

## Run the Frontend

From the repository root:

```bash
npm --prefix frontend run dev
```

Or from the frontend folder:

```bash
cd frontend
npm run dev
```

## Run the Backend

From the repository root:

```bash
npm --prefix backend run start:dev
```

Or from the backend folder:

```bash
cd backend
npm run start:dev
```

## Day 1 Acceptance Criteria

- Git is initialized at the repository root.
- The root project structure exists:
  - `frontend/`
  - `backend/`
  - `ai-service/`
  - `docs/`
  - `README.md`
  - `.gitignore`
- The frontend is a Vite React TypeScript app.
- The backend is a NestJS TypeScript app.
- npm is used as the package manager.
- No separate Git repository exists inside `backend/`.
- The future AI service folder has a placeholder README.
- Setup documentation exists in `docs/day-01-setup.md`.
- The frontend dev server can start.
- The backend dev server can start.
