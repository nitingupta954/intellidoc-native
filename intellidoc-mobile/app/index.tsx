import { Redirect } from 'expo-router';
import { useSessionStore } from '../src/store/sessionStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../src/theme/colors';
import { useEffect, useState } from 'react';

export default function Index() {
  const { isAuthenticated, isLoading, restoreSession } = useSessionStore();
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    restoreSession().then(() => setSessionRestored(true));
  }, []);

  if (isLoading || !sessionRestored) {
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
