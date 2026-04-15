import { useEffect } from 'react';
import { Tabs, Redirect, router } from 'expo-router';
import Text from '../../src/components/Text';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

import { useSessionStore } from '../../src/store/sessionStore';
import { useWorkspaceStore } from '../../src/store/workspaceStore';
import { Colors } from '../../src/theme/colors';
import { Feather } from '@expo/vector-icons';

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Feather>['name']; focused: boolean }) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
      <Feather name={name} size={22} color={focused ? Colors.primary : '#94a3b8'} />
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
    <View style={{ flex: 1, paddingTop: 40, backgroundColor: Colors.bgDark }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: '#94a3b8',
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
            href: '/(app)/stats', // Might need to create this screen
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
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              logout();
            },
          }}
          options={{
            href: '/(app)/home',
            title: 'Logout',
            tabBarIcon: ({ focused }) => <TabIcon name="log-out" focused={focused} />,
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
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 15,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 24, // added extra padding for safe area
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
    backgroundColor: 'rgba(30,45,90,0.08)',
  },
});
