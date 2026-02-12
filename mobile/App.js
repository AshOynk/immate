import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const WEB_APP_URL =
  Constants.expoConfig?.extra?.webAppUrl ||
  process.env.EXPO_PUBLIC_WEB_APP_URL ||
  'https://immate.oynk.co.uk';

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
        allowsFullscreenVideo
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
