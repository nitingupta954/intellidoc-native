import { useEffect } from 'react';
import { Tabs, Redirect, router } from 'expo-router';
import Text from '../../src/components/Text';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';

import { useSessionStore } from '../../src/store/sessionStore';
import { useWorkspaceStore } from '../../src/store/workspaceStore';
import { Colors } from '../../src/theme/colors';
import { Feather } from '@expo/vector-icons';

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Feather>['name']; focused: boolean }) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
      <Feather name={name} size={22} color={focused ? Colors.primary : Colors.textMuted} />
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, logout } = useSessionStore();
  const { bootstrapWorkspace, isLoading: wsLoading } = useWorkspaceStore();

  useEffect(() => {
    if (isAuthenticated) {
      bootstrapWorkspace();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (wsLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Setting up your workspace…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgDark }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarShowLabel: true,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            href: '/(app)/home',
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            href: null, // Might need to create this screen
            title: 'Stats',
            tabBarIcon: ({ focused }) => <TabIcon name="bar-chart-2" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="documents/index"
          options={{
            href: '/(app)/documents',
            title: 'Files',
            tabBarIcon: ({ focused }) => <TabIcon name="copy" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="knowledge-bases/index"
          options={{
            href: '/(app)/knowledge-bases',
            title: 'KBs',
            tabBarIcon: ({ focused }) => <TabIcon name="database" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chat/index"
          options={{
            href: '/(app)/chat',
            title: 'Chat',
            tabBarIcon: ({ focused }) => <TabIcon name="message-square" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="billing"
          options={{
            href: '/(app)/billing', // Might need to create this screen
            title: 'Billing',
            tabBarIcon: ({ focused }) => <TabIcon name="credit-card" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            href: '/(app)/profile',
            title: 'Settings',
            tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="logout"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="chat/history"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="documents/[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="knowledge-bases/[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="documents/upload"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/api-keys"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/workspaces"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/security"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  tabBar: {
    backgroundColor: Colors.bgCard,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 85 : 70, // dynamic height for different platforms
    paddingBottom: Platform.OS === 'ios' ? 24 : 10, // less padding on web/android
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
});
