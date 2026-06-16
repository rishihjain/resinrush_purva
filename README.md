# ResinRush Project

This repository contains a Node backend plus a React frontend for ResinRush.

## Project structure

- `/server.js` — backend API and server entrypoint
- `/package.json` — backend dependencies and scripts
- `/data/` — local JSON storage fallback for orders, contacts, and products
- `/uploads/` — uploaded files
- `/frontend/` — React app source and build output
  - `/frontend/src/` — React source code
  - `/frontend/public/` — public static assets for the React app
  - `/frontend/dist/` — built production output served by Vercel
- `/legacy/` — old static site files moved here and no longer used by the active app

## How it works

- `frontend/dist/` is the deployed site content
- The Express server serves API routes under `/api/*`
- The React app includes the public store and the admin page at `/admin`

## Run locally

1. Install backend dependencies:

```bash
npm install
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Build the frontend:

```bash
npm run build
```

4. Start the backend from the repo root:

```bash
npm start
```

5. Open `http://localhost:3000`

## Notes

- Do not edit files inside `/frontend/dist/`; they are generated from `/frontend/src/`.
- The old root site files are kept in `/legacy/` for reference only.
- The admin interface is available at `/admin` in the React app.
