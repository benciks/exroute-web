# exroute-web

Web interface for exroute, a motorcycle route planner that turns plain-language requests like "100 km loop from Brno with curvy roads and a nice castle" into routes.

Built with React, Vite and Leaflet.

## Features

- Plan a route from a sentence and see it on the map
- Itinerary with start, stops and finish, plus distance and estimated time per leg
- History of your routes
- GPX export

## Getting started

Needs the exroute API running (by default on `http://localhost:8000`).

```sh
npm install
cp .env.example .env   # set VITE_API_URL if the API runs elsewhere
npm run dev
```

Then open http://localhost:5173.

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: build to `dist/`
- `npm run preview`: serve the production build
