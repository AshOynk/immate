# Run iMmate on your device

## Competition: use on your phone right now

**Fastest (no install):** On your phone, open the browser (Safari or Chrome) and go to:

**https://immate.oynk.co.uk**

Log in with **ash@oynk.co.uk** and your password. Use the app as normal.

**Make it app-like:** In Safari, tap **Share** → **Add to Home Screen** → name it “iMmate”. An icon appears on your home screen and opens the app full screen for the competition.

**If you want it in an app shell:** Install **Expo Go** from the App Store, then see **Option 2A** below (same URL in a full-screen app).

---

## Option 1: Web app on your phone (same Wi‑Fi, local dev)

Use the app in the browser on your iPhone/Android. Your phone and computer must be on the same Wi‑Fi.

### 1. Start the app on your computer

```bash
cd /Users/ash/Desktop/hackathon
npm run dev
```

Wait until you see something like:

```text
➜  Local:   http://localhost:3000/
➜  Network: http://192.168.x.x:3000/
```

### 2. Get the “Network” URL

In the terminal, Vite prints a **Network** URL (e.g. `http://192.168.1.5:3000/`).  
If it doesn’t, find your Mac’s IP:

- **System Settings → Network → Wi‑Fi → Details** (or run `ipconfig getifaddr en0` in Terminal).

Your URL is: **`http://YOUR_MAC_IP:3000`** (e.g. `http://192.168.1.5:3000`).

### 3. Open it on your phone

On your phone’s browser (Safari, Chrome, etc.), go to that URL:

**`http://YOUR_MAC_IP:3000`**

Example: `http://192.168.1.5:3000`

The app will load. API requests go to your Mac, so keep `npm run dev` running.

---

## Option 2: Native app on your iPhone (Expo)

This runs the **iMmate** app that opens the web app in a full‑screen WebView.

### A. Use the deployed web app (recommended)

1. Deploy the web app (e.g. Vercel + Railway) and note the URL (e.g. `https://immate.oynk.co.uk`).

2. On your computer:

   ```bash
   cd mobile
   npm install
   echo "EXPO_PUBLIC_WEB_APP_URL=https://immate.oynk.co.uk" > .env
   npx expo start
   ```

3. On your iPhone:
   - Install **Expo Go** from the App Store.
   - Scan the QR code shown in the terminal (or in the browser Expo opens).
   - The iMmate app opens in Expo Go and loads your deployed site.

### B. Use your local dev server (same Wi‑Fi)

1. Start the web app on your Mac (see Option 1) and note the **Network** URL, e.g. `http://192.168.1.5:3000`.

2. In `mobile/`:

   ```bash
   cd mobile
   npm install
   echo "EXPO_PUBLIC_WEB_APP_URL=http://YOUR_MAC_IP:3000" > .env
   npx expo start
   ```

   Replace `YOUR_MAC_IP` with your Mac’s IP (e.g. `192.168.1.5`).

3. Open the project in Expo Go on your iPhone (scan the QR code). The app will load the web app from your Mac; keep `npm run dev` running.

### C. Install a real build on your iPhone (no Expo Go)

1. Connect your iPhone with a cable and have Xcode installed.

2. In `mobile/`:

   ```bash
   cd mobile
   npm install
   # Set EXPO_PUBLIC_WEB_APP_URL in .env to your deployed URL (or local IP for testing)
   npx expo prebuild --platform ios
   npx expo run:ios --device
   ```

3. Pick your iPhone when prompted. The app installs and runs on the device.

---

## Summary

| Goal                         | What to do |
|-----------------------------|------------|
| Use the app in the browser on your phone | Option 1: `npm run dev`, then open `http://YOUR_MAC_IP:3000` on the phone. |
| Open the “app” on iPhone (Expo Go)       | Option 2A or 2B: `cd mobile`, set URL in `.env`, `npx expo start`, scan QR with Expo Go. |
| Install iMmate on iPhone (no Expo Go)   | Option 2C: `cd mobile`, then `npx expo prebuild` and `npx expo run:ios --device`. |
