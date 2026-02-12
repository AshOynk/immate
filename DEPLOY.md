# Deployment & iOS Wrap

## Publish on a subdomain of your own website (recommended for phone access)

Using a subdomain (e.g. **immate.oynk.co.uk**) is usually **easier for using the app on your phone**:

- **One stable URL** — open it on any device, any network; no IP addresses or “same WiFi” setup.
- **Log in anywhere** — same URL on phone and desktop; no reconfig when your IP or network changes.
- **Uses your existing domain** — you only add DNS and point the subdomain at your deployed app.

### Steps

1. **Deploy as usual** — Backend on Railway, frontend on Vercel (see checklist below). You’ll have URLs like `https://your-app.vercel.app` and `https://your-app.railway.app`.
2. **Add your subdomain in Vercel**  
   - Vercel project → **Settings → Domains** → Add domain.  
   - Enter your subdomain, e.g. `immate.oynk.co.uk`.
3. **Point DNS at Vercel**  
   - In your domain’s DNS (where you manage oynk.co.uk), add a **CNAME** record:  
     - **Name**: `immate` (or whatever subdomain you chose).  
     - **Value**: `cname.vercel-dns.com` (or the exact target Vercel shows you).  
   - Wait for DNS to propagate (often a few minutes).
4. **Optional: API on a subdomain**  
   - Railway supports custom domains. If you want e.g. `api.oynk.co.uk` for the backend, add that domain in Railway and set a CNAME from `api` to Railway’s target. Then set **VITE_API_URL** in Vercel to `https://api.oynk.co.uk` and redeploy.  
   - If you’re fine with the default Railway URL, keep **VITE_API_URL** as `https://your-app.railway.app`; the app will work the same.
5. **Use it on your phone**  
   - Open **https://immate.oynk.co.uk** in the browser, log in, and use the app. No Expo or native build required for web-only access.

The iOS wrapper (Section 2) uses this URL by default (`EXPO_PUBLIC_WEB_APP_URL=https://immate.oynk.co.uk`) so the native app loads the subdomain.

---

## 0. Push the project to GitHub (so Vercel can “load via GitHub”)

Vercel expects the app to come from a GitHub repo. Do this once:

1. **Create a new repo on GitHub**  
   - [github.com/new](https://github.com/new)  
   - Name it e.g. `immate` or `hackathon`.  
   - Don’t add a README, .gitignore, or license (this project already has them).  
   - Create the repo.

2. **Push this project to it** (from the project folder):

   ```bash
   cd /Users/ash/Desktop/hackathon
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name. If GitHub asks for auth, use a **Personal Access Token** as the password, or set up SSH and use the `git@github.com:...` URL.

3. **In Vercel**: **Add New… → Project** → **Import Git Repository** → choose your GitHub repo → Continue. Then set build settings and env (step 1 below).

---

## 1. Finish the web app (deployment checklist)

- [ ] **MongoDB Atlas**: Create cluster, get connection string.
- [ ] **Railway (backend)**  
  - New project → Deploy from this repo (e.g. “Deploy from GitHub repo” and select the same repo, or connect GitHub and choose it).  
  - **Root Directory**: leave default (repo root).  
  - **Build**: Nixpacks will run `npm install`. No separate build step for server.  
  - **Start Command**: `node server/index.js` (or set in Railway dashboard; `railway.json` already sets this).  
  - **Env**: `MONGODB_URI`, optionally `ANTHROPIC_API_KEY`, `EUFY_WEBHOOK_URL`, `WEEKLY_STAR_TARGET`, `VOUCHER_TIERS`, `JWT_SECRET`.  
  - Deploy and copy the public URL (e.g. `https://your-app.railway.app`).
- [ ] **Vercel (frontend)**  
  - **Add New… → Project** → **Import** your GitHub repo (the one you pushed in step 0).  
  - **Framework Preset**: Vite (or Other).  
  - **Build Command**: `npm run build`  
  - **Output Directory**: `dist`  
  - **Env**: `VITE_API_URL` = your Railway URL (e.g. `https://your-app.railway.app`) — **no trailing slash**.  
  - Deploy. Copy the Vercel URL (e.g. `https://your-app.vercel.app`).
- [ ] **Verify**: Open Vercel URL → Dashboard → enter a resident ID; submit flow and rewards should call the Railway API.

Once the web app is live on Vercel (and API on Railway), proceed to wrap it for iOS.

---

## 2. Wrap for iOS (after web app is live)

The mobile app is a thin native shell that loads your deployed web app in a full-screen WebView. You can either use the pre-made `mobile` folder in this repo or create a new Expo app and point it at your URL.

### Option A: Use the included `mobile` wrapper

From the **repo root**:

```bash
cd mobile
npm install
```

Set your deployed web app URL (required for the WebView):

```bash
# Create .env and set (replace with your Vercel URL)
echo "EXPO_PUBLIC_WEB_APP_URL=https://immate.oynk.co.uk" > .env
```

Then run and build for iOS:

```bash
# Run in simulator / device
npx expo start

# Build for iOS (requires EAS or local Xcode)
npx expo prebuild --platform ios
npx expo run:ios
```

For a production iOS build (e.g. TestFlight / App Store), use EAS Build:

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
```

### Option B: Create a new Expo app and point at your URL

From the **repo root** (or any folder):

```bash
npx create-expo-app@latest ios-wrap --template blank
cd ios-wrap
npx expo install react-native-webview expo-constants
```

Replace `App.js` with a single full-screen WebView that loads your deployed site:

```javascript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const WEB_APP_URL = Constants.expoConfig?.extra?.webAppUrl 
  || process.env.EXPO_PUBLIC_WEB_APP_URL 
  || 'https://immate.oynk.co.uk';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
```

Set the URL in `app.config.js` (create it and export config with `extra.webAppUrl`) or in `.env` as `EXPO_PUBLIC_WEB_APP_URL=https://immate.oynk.co.uk`.

Then build to iOS:

```bash
npx expo prebuild --platform ios
npx expo run:ios
# Or: eas build --platform ios
```

---

## 3. Summary

| Step | What |
|------|------|
| 1 | Deploy backend to Railway (env: `MONGODB_URI`, etc.). |
| 2 | Deploy frontend to Vercel (env: `VITE_API_URL` = Railway URL). |
| 3 | Open `mobile/`, set `EXPO_PUBLIC_WEB_APP_URL` to your Vercel URL, then run `npx expo run:ios` (or use Option B with `create-expo-app`). |

The web app stays the single source of truth; the iOS app is a wrapper that loads it after deployment.
