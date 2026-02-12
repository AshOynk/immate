# Why login fails and how to fix it

Your app has **two parts**:

| Part | What it does | Where yours is |
|------|----------------|-----------------|
| **Frontend** | The black UI you see (pages, login form, dashboard) | ✅ **Vercel** → immate.oynk.co.uk |
| **Backend** | Logins, database, API (the server that checks your password) | ❌ **Not set up yet** |

When you tap “Sign in” on your phone, the frontend tries to talk to the **backend**. Right now there is no backend online, so the request fails and you see “Login failed”.

**Railway** is a free, simple place to run your backend (the Node/Express server in this repo). You put the same GitHub repo on Railway, add a few env vars, and it runs your server 24/7 so login works from your phone.

---

## Get login working in about 10 minutes

### 1. MongoDB (database for users)

You need a database. Easiest free option: **MongoDB Atlas**.

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a **free cluster** (e.g. M0).
3. **Database Access** → Add user (username + password; remember the password).
4. **Network Access** → Add IP: **0.0.0.0/0** (allow from anywhere, so Railway can connect).
5. **Database** → Connect → **Connect your application** → copy the connection string.
6. **Your cluster** is `immate.yr0jqnl.mongodb.net`. Use this as **MONGODB_URI** (replace `USERNAME` and `PASSWORD` with your Atlas database user and password):

   ```
   mongodb+srv://USERNAME:PASSWORD@immate.yr0jqnl.mongodb.net/compliance?retryWrites=true&w=majority
   ```

   Example: if your DB user is `Ash` and password is `yourDbPassword`, then:
   `mongodb+srv://Ash:yourDbPassword@immate.yr0jqnl.mongodb.net/compliance?retryWrites=true&w=majority`

### 2. Railway (run the backend)

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. **New Project** → **Deploy from GitHub repo** → choose **AshOynk/immate**.
3. Railway will deploy. Click the new **service**.
4. **Variables** tab → add:

   | Name | Value |
   |------|--------|
   | `MONGODB_URI` | Your full Atlas connection string from step 1 |
   | `JWT_SECRET` | Any long random string (e.g. `immate-secret-xyz-123`) |
   | `SEED_LOGIN_PASSWORD` | The password you want for **ash@oynk.co.uk** (e.g. `Lolislawa2`) |

5. **Settings** tab → under **Deploy**:
   - **Start Command**: `node server/index.js`  
     (Railway may already detect this; if it does, leave it.)
6. Wait for the deploy to finish. Open **Settings** → **Networking** → **Generate Domain**. Copy the URL (e.g. `https://immate-production-xxxx.up.railway.app`).

### 3. Point the frontend at the backend (Vercel)

1. Go to [vercel.com](https://vercel.com) → your **immate** project.
2. **Settings** → **Environment Variables**.
3. Add:
   - **Name:** `VITE_API_URL`  
   - **Value:** your Railway URL from step 2 (e.g. `https://immate-production-xxxx.up.railway.app`) — **no trailing slash**.
4. **Redeploy**: Deployments → … on latest → **Redeploy**.

### 4. Log in on your phone

1. Open **https://immate.oynk.co.uk**.
2. **Log in** → Email: **ash@oynk.co.uk** → Password: **the same as SEED_LOGIN_PASSWORD** (e.g. `Lolislawa2`).
3. Tap **Sign in**.

---

## Summary

- **Railway** = where the backend (Node server) runs so that login and the API work.
- **Vercel** = where the frontend (what you see at immate.oynk.co.uk) runs.
- **MongoDB Atlas** = where user accounts and data are stored.
- After setting up Railway + Atlas and adding `VITE_API_URL` on Vercel, login on your phone will work.
