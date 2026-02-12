# Logins (iMmate)

## Overview

- **Residents** can use the app without logging in (enter resident ID on the dashboard). They can optionally **register** and log in; if their account has a `residentId`, the dashboard can use it.
- **Management** must **log in** to access the **Review** dashboard (pass/fail submissions) and to create tasks via the API.

## First-time setup: create an admin

1. Open the app and go to **Log in** (or `/login`).
2. Click **Register**.
3. Choose a **username** and **password** (at least 6 characters).
4. Set **Role** to **Admin (management)**.
5. Click **Create account**.
6. You are now logged in as admin. Use **Review** in the header to open the compliance review dashboard.

You can create more admins or residents the same way (role: Resident or Admin).

## Resident ID for you

Use this resident ID when the app asks for one (dashboard, submit proof, rewards):

- **RES-ASH**

Use it anywhere you’re prompted for “Resident ID” (e.g. on the dashboard or compliance submit page).

## API: creating tasks (admin only)

Only logged-in admins can create tasks. Send the JWT in the request:

```bash
# First log in to get a token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-admin","password":"your-password"}' | jq -r '.token')

# Then create a task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Clean the kitchen","windowStart":"2025-02-12T00:00:00Z","windowEnd":"2025-02-13T23:59:59Z","starsAwarded":1}'
```

## Env

- **JWT_SECRET** – Used to sign login tokens. Set a long random value in production (e.g. `openssl rand -base64 32`).
