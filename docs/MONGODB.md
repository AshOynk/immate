# Connecting MongoDB

The app uses **MONGODB_URI** (or **MONGO_URI**) in the backend. Use either **MongoDB Atlas** (cloud, free tier) or **local MongoDB**.

---

## Option 1: MongoDB Atlas (recommended)

1. **Sign up**  
   Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.

2. **Create a cluster**  
   - Create a new project (e.g. “Compliance App”).  
   - Create a **cluster** (e.g. M0 free tier).  
   - Choose a region close to you.

3. **Create a database user**  
   - In the left sidebar: **Database Access** → **Add New Database User**.  
   - Choose **Password** auth; set a username and a strong password (save them).  
   - Role: **Atlas admin** or **Read and write to any database**.

4. **Allow network access**  
   - **Network Access** → **Add IP Address**.  
   - For local dev: **Allow Access from Anywhere** (`0.0.0.0/0`).  
   - For production, restrict to your server IPs (e.g. Railway IPs) if you prefer.

5. **Get the connection string**  
   - Go back to **Database** → your cluster → **Connect**.  
   - Choose **Connect your application** → **Driver: Node.js**.  
   - Copy the URI. It looks like:
     ```text
     mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `USERNAME` and `PASSWORD` with your DB user.  
   - Add a database name (e.g. `compliance`) before the `?`:
     ```text
     mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/compliance?retryWrites=true&w=majority
     ```

6. **Put it in `.env` (local)**  
   In the **project root** (same folder as `package.json`):

   ```bash
   # Create .env from example if you haven't
   cp .env.example .env

   # Edit .env and set (use your real URI; no quotes needed)
   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/compliance?retryWrites=true&w=majority
   ```

   If the password has special characters (e.g. `#`, `@`, `%`), URL-encode them or wrap the value in single quotes in `.env`.

7. **Restart the server**  
   Stop `npm run dev` (Ctrl+C) and start it again so it loads the new env.

---

## Option 2: Local MongoDB

If MongoDB is installed locally (e.g. via Homebrew: `brew install mongodb-community`):

1. Start MongoDB (e.g. `brew services start mongodb-community`).
2. In the project root, create or edit `.env`:

   ```bash
   MONGODB_URI=mongodb://localhost:27017/compliance
   ```

3. Restart the server.

---

## Verify

- With **Atlas**: In the Atlas UI, **Database** → your cluster → **Browse Collections**. After you use the app (create a task, submit proof, etc.), you should see databases/collections like `compliance` and documents there.
- In the **app**: When the server starts, you should see **MongoDB connected** in the terminal instead of *No MONGODB_URI set*.

---

## Production (Railway / Vercel)

- **Backend on Railway**: In the Railway project, open your service → **Variables** → add **MONGODB_URI** with the same Atlas URI (use a dedicated DB user and restrict IPs to Railway if you want).
- The **frontend on Vercel** does not need MongoDB; only the Node server (Railway) uses it.
