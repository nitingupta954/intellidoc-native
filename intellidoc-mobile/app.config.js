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
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    eas: {
      projectId: "a1c11814-13f9-44f8-945d-3b2ccc377b2b"
    }
  },
});
