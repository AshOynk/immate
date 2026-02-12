# CodePath

**Duolingo for code** — Learn programming with encouraging, achievable lessons. Built for people with non-traditional backgrounds.

## Quick Start

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Features

- **5 beginner lessons**: Variables, Functions, Loops, Conditionals, Arrays
- **Monaco code editor** with Run button
- **Automated test validation** for each challenge
- **Progress tracking** and lesson completion
- **Badges**: First Step, On Fire, Graduate

## Resident Compliance (Tasks, Proof, Rewards, Eufy)

Residents prove they completed **random tasks** (e.g. clean the kitchen) **within a time window** by submitting a live video. Management validates each task; **Eufy** is notified so it can show what’s been done and trigger checks. Every validated task awards **stars**; stars stack and can be exchanged for **vouchers**.

- **Dashboard** (ChatGPT-style): [/dashboard](/dashboard) — Resident enters ID (or opens from notification link). Shows **task messages** (“Complete: Clean the kitchen by … — Submit proof”), **rewards bagged** (“View my rewards”), and a **gamified XP line**: “You’ve earned X stars this week” with progress bar. **Weekly target**: hit Y stars by end of week for **bonus voucher** + **double XP**. Claim bonus and **choose rewards** (redeem stars for vouchers).
- **Submit**: [/compliance](/compliance) — Choose a **task** (or open from dashboard “Submit proof”), enter resident ID, **record live** (no file uploads). Submissions notify Eufy and run the AI quality check.
- **Review**: [/compliance/dashboard](/compliance/dashboard) — List by task, Pass/Fail. On **Pass**, the resident gets stars and Eufy is notified (check triggered).
- **Stars & vouchers**: [/compliance/rewards](/compliance/rewards) — Resident enters ID to see **stars** and **tasks validated**. Redeem stars for voucher tiers; backend returns a voucher code.
- **Welfare check-in**: [/welfare](/welfare) — “How are you today, {name}?” → resident taps a **mood icon** (sad → happy). AI then chats with them: if **low/sad** it encourages them to open up; if **happy** it leans in (“what went well?”, help them recognise positive signals). **Voice**: optional mic input (speech-to-text) and “read replies aloud”; text is fine and AI handles spelling/dyslexia. For notifications: link to `/welfare?name=Jamie` (or `?residentId=RES-001`) so the app opens with name/ID pre-filled.

### API (backend)

- **Tasks**: `GET /api/tasks?active=true&inWindow=true`, `GET /api/tasks/:id`, `POST /api/tasks` (name, windowStart, windowEnd, starsAwarded, eufyTaskId).
- **Submit**: `POST /api/submit` — Body: `{ taskId, residentId, timestamp, recordedAt, videoBase64, framesBase64[] }`. Task must be active and in window; Eufy notified on submit.
- **Submissions**: `GET /api/submissions`, `GET /api/submissions/:id`, `PATCH /api/submissions/:id` (`status: "pass" | "fail"`). On pass: stars awarded, Eufy notified.
- **Rewards**: `GET /api/rewards/:residentId` — stars, totalValidated.
- **Vouchers**: `GET /api/vouchers` — tiers (stars → value/label). `POST /api/vouchers/redeem` — Body: `{ residentId, tierIndex }` — returns voucher code and remaining stars.
- **Welfare**: `POST /api/welfare/checkin` — Body: `{ residentId, name?, mood }` (mood: sad | low | neutral | good | happy). Returns first AI message. `POST /api/welfare/checkin/:id/message` — Body: `{ text }` — user message (typed or voice transcript), returns AI reply. `GET /api/welfare/checkin/:id` — get session.
- **Resident dashboard**: `GET /api/resident/dashboard?residentId=...&name=...` — tasks in window, starsThisWeek, weeklyTarget, totalStars, bonusUnlocked, bonusClaimedThisWeek, weekEnds. `POST /api/resident/claim-bonus` — Body: `{ residentId }` — if weekly target met and not yet claimed, awards double XP (stars this week added again) + bonus voucher code.

### Eufy integration

Set `EUFY_WEBHOOK_URL` (or `CUFY_WEBHOOK_URL` for backward compatibility) and optionally `EUFY_API_KEY`. The app sends:

- **submission_received** — when a resident submits proof (management sees what’s been done).
- **check_triggered** — when a submission is validated (pass/fail), so Eufy can run its check.

Payload includes taskId, taskName, residentId, submissionId, status, starsAwarded (on pass).

### Env (backend)

- `MONGODB_URI` — Required.
- `ANTHROPIC_API_KEY` — Optional; enables AI quality + live-recording check.
- `EUFY_WEBHOOK_URL` or `EUFY_API_URL` (or `CUFY_*`) — Optional; Eufy webhook for submission/validation events.
- `VOUCHER_TIERS` — Optional; JSON array of `{ stars, value, label }`. Default: 5/12/25/50 stars → £5/£10/£25/£50.
- `WEEKLY_STAR_TARGET` — Optional; stars to earn in a week to unlock bonus (default 10). Hit target → claim double XP + bonus voucher.

**Connecting MongoDB:** See **[docs/MONGODB.md](./docs/MONGODB.md)** for step-by-step setup (Atlas or local) and setting `MONGODB_URI` in `.env`.

### Deployment (Vercel + Railway)

1. **MongoDB Atlas**: Create a cluster, get connection string, set as `MONGODB_URI`.
2. **Railway (backend)** — New project from this repo; set env `MONGODB_URI` (and optional `ANTHROPIC_API_KEY`, `EUFY_WEBHOOK_URL`, etc.); start command `node server/index.js`. Note the public URL.
3. **Vercel (frontend)** — Import this repo; build `npm run build`, output `dist`; set env `VITE_API_URL` = Railway URL (no trailing slash). Deploy.

See **[DEPLOY.md](./DEPLOY.md)** for the full checklist and for **wrapping the live web app for iOS** (Expo WebView → build to iOS).

## Tech Stack

- **Frontend**: React, Vite, Monaco Editor, React Router
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Styling**: CSS custom properties, DM Sans + JetBrains Mono
