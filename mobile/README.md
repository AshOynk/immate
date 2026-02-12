# iOS wrapper for Compliance web app

This Expo app loads your **deployed web app** (Vercel URL) in a full-screen WebView so you can ship it as a native iOS app.

## Prerequisites

- Web app already deployed (Vercel frontend + Railway backend).
- Node 18+.
- For local iOS run: Xcode and iOS Simulator (or a device).
- For EAS Build: Expo account (`npx eas login`).

## Setup

```bash
cd mobile
npm install
```

Set your deployed web app URL (replace with your actual Vercel URL):

```bash
echo "EXPO_PUBLIC_WEB_APP_URL=https://immate.oynk.co.uk" > .env
```

Or create `.env` with:

```
EXPO_PUBLIC_WEB_APP_URL=https://immate.oynk.co.uk
```

## Run

```bash
npx expo start
```

Then press `i` for iOS simulator, or scan the QR code with Expo Go on a device (Expo Go will load the WebView; for a standalone build see below).

## Build to iOS

**Option 1 – Local (Xcode)**

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

**Option 2 – EAS Build (cloud, for TestFlight / App Store)**

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
```

After the build completes, download the IPA or submit to TestFlight from the EAS dashboard.

## URL

The app reads the web app URL from:

1. `app.config.js` → `extra.webAppUrl` (from `EXPO_PUBLIC_WEB_APP_URL`)
2. `.env` → `EXPO_PUBLIC_WEB_APP_URL`
3. Fallback: `https://immate.oynk.co.uk` (set in `app.config.js` or override with env before building).

Rebuild the app if you change the URL.
