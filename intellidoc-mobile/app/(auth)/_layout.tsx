import { Stack, Redirect } from 'expo-router';
import { useSessionStore } from '../../src/store/sessionStore';
import { Colors } from '../../src/theme/colors';

export default function AuthLayout() {
  const { isAuthenticated } = useSessionStore();

  if (isAuthenticated) {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgDark },
        animation: 'fade',
      }}
    />
  );
}
