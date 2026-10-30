module.exports = ({ config }) => ({
  ...config,
  name: 'IntelliDoc',
  slug: 'intellidoc-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0f0f23',
  },
  scheme: 'intellidoc',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.intellidoc.mobile',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0f0f23',
    },
    package: 'com.intellidoc.mobile',
    // @ts-ignore
    usesCleartextTraffic: true, // required for LAN dev (http)
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#6c47ff',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://doc-management-native.vercel.app',
    eas: {
      projectId: '04ca3ef4-3145-45f1-8007-8d67823f0c67',
    },
  },
});
