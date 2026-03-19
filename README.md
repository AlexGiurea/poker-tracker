## Poker Tracker

Track poker sessions, player buy-ins, chip values, and profits across multiple days.
Includes interactive statistics, player profiles, and full player pages with session history.

### Features
- Sessions dashboard with draggable settled players
- Interactive statistics with ROI wheel and player leaderboards
- Player profiles and full-profile pages

### Run locally
```bash
npm install
npm run dev
```

### Chat Security
- The public site should use the server-side `/api/chat` endpoint.
- Set `OPENAI_API_KEY` in Vercel project environment variables.
- Optionally set `OPENAI_MODEL` if you want to override the default.
- Do not expose `VITE_OPENAI_API_KEY` in the browser for a public deployment.

### Deploy Notes
- This repo includes a Vercel-compatible serverless function at `api/chat.js`.
- The chat endpoint applies request caps, message-length caps, and output-token caps.
- If your current OpenAI key has ever been exposed client-side, rotate it before going live.

### Build
```bash
npm run build
```
