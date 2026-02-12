// Set EXPO_PUBLIC_WEB_APP_URL to your deployed app URL (default: immate.oynk.co.uk)
export default {
  expo: {
    name: 'iMmate',
    slug: 'immate',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    ios: {
      bundleIdentifier: 'app.compliance.wrapper',
      supportsTablet: true,
    },
    extra: {
      webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://immate.oynk.co.uk',
    },
  },
};
