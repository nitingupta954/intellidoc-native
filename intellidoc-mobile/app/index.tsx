import { Redirect } from 'expo-router';
import { useSessionStore } from '../src/store/sessionStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../src/theme/colors';

export default function Index() {
  const { isAuthenticated, hasHydrated } = useSessionStore();

  // Wait for _layout.tsx's restoreSession() to complete before redirecting.
  // We deliberately do NOT call restoreSession() here again to avoid a race condition.
  if (!hasHydrated) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/home" />;
  } else {
    return <Redirect href="/onboarding" />;
  }
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

