# Regattify

Regatta entries, lineups and race-day schedules for rowing coaches, plus tools for clubs that host regattas.

**Live:** https://sammypars.github.io/Regattify/

## Status

Front end only. All data lives in the browser (localStorage) and starts from demo data in `app/src/seed.js`. "Reset demo data" in the app restores it. Payments are simulated: no money moves.

Next step is a backend (Supabase): replace the load/save/update functions in `app/src/store.jsx` with API calls. Pages only talk to the store.

## Layout

- `app/` – source (React + Vite)
  - `src/store.jsx` – data layer and selectors
  - `src/seed.js` – demo data
  - `src/lib.js` – boats, fees, dates, times; `PLATFORM_FEE` is Regattify's own fee (not set yet)
  - `src/pages/` – one file per screen
- `index.html`, `404.html`, `assets/` at the repo root – the built site GitHub Pages serves. Don't edit by hand.

## Develop

```bash
cd app
npm install
npm run dev      # http://localhost:5173/Regattify/
```

## Deploy

GitHub Pages serves the root of `main`. Build into the root, then commit and push:

```bash
cd app
npm run deploy
cd ..
git add -A && git commit -m "Deploy" && git push
```
