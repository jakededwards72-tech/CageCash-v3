# CageCash

Mobile-first MMA simulation and betting intelligence desk.

## Deploy to a brand-new GitHub repo + Vercel
1. Upload the contents of this folder to the root of a new GitHub repository.
2. Import the repository into Vercel.
3. Framework preset: Vite (Vercel should auto-detect the project).
4. Build command: `npm run build`.
5. Add environment variables only if you enable external providers.
6. Deploy.

## Local development
`npm install` then `npm run dev`.

## What is included
- Desk: card-first MMA dashboard with simulations and best-value surfaces.
- Scanner: sortable value/trap board.
- Fight pages: tape, lines, simulation distributions and replay.
- Lab: custom matchups.
- Model: methodology and assumptions.
- Bankroll/Kelly settings and local bet slip.

The bundled fight dataset is a demonstration dataset. Production deployment should connect licensed/current event, fighter and sportsbook feeds before treating results as current market analysis.
