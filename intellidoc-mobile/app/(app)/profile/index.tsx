import React, { useEffect, useState } from 'react';
import Text from '../../../src/components/Text';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSessionStore } from '../../../src/store/sessionStore';
import { useChatStore } from '../../../src/store/chatStore';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { Colors } from '../../../src/theme/colors';
import { formatCredits } from '../../../src/lib/formatting';

export default function ProfileScreen() {
  const { user, logout, isLoading } = useSessionStore();
  const { walletBalance, isBYOK, fetchWalletBalance } = useChatStore();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const performLogout = async () => {
    setIsLogoutModalVisible(false);
    try {
      await logout();
    } catch (e) {
      console.log('Logout API error:', e);
    }
    // Clear other stores regardless of API success
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: null });
    useChatStore.setState({ 
      conversations: [], 
      messages: [],
      activeConversationId: null,
      walletBalance: null 
    });
    // Explicitly force navigation
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    setIsLogoutModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Wallet & Billing */}
        <Text style={styles.sectionTitle}>Billing & Usage</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIconBox}>
              <Text style={styles.rowIcon}>🪙</Text>
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Credit Balance</Text>
              <Text style={styles.rowSub}>
                {isBYOK
                  ? 'Unlimited (Bring Your Own Key)'
                  : walletBalance != null
                  ? `${formatCredits(walletBalance)} credits remaining`
                  : 'Loading…'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(app)/profile/api-keys')}>
            <View style={[styles.rowIconBox, { backgroundColor: `${Colors.info}22` }]}>
              <Text style={styles.rowIcon}>🔑</Text>
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>API Keys (BYOK)</Text>
              <Text style={styles.rowSub}>
                {isBYOK ? 'Active' : 'Not configured'}
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Links */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(app)/profile/workspaces')}>
            <View style={[styles.rowIconBox, { backgroundColor: `${Colors.accent}22` }]}>
              <Text style={styles.rowIcon}>👥</Text>
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Workspaces</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(app)/profile/join')}>
            <View style={[styles.rowIconBox, { backgroundColor: `${Colors.success}22` }]}>
              <Text style={styles.rowIcon}>➕</Text>
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Join Workspace</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(app)/profile/members')}>
            <View style={[styles.rowIconBox, { backgroundColor: `${Colors.primary}22` }]}>
              <Text style={styles.rowIcon}>🤝</Text>
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Team Members</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(app)/profile/security')}>
            <View style={[styles.rowIconBox, { backgroundColor: `${Colors.warning}22` }]}>
              <Text style={styles.rowIcon}>🔒</Text>
            </View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Security</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.version}>IntelliDoc Mobile v1.0.0</Text>
      </ScrollView>

      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={() => setIsLogoutModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalLogoutButton]} 
                onPress={performLogout}
              >
                <Text style={styles.modalLogoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 24, letterSpacing: -0.5 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1, alignItems: 'flex-start' },
  userName: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  userEmail: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  roleBadge: {
    backgroundColor: `${Colors.primary}22`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { color: Colors.primaryLight, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  rowIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.success}22`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rowIcon: { fontSize: 18 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  rowSub: { fontSize: 13, color: Colors.textMuted },
  chevron: { fontSize: 16, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  logoutBtn: {
    backgroundColor: `${Colors.error}15`,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutText: { color: Colors.error, fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', color: Colors.textMuted, fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: `${Colors.textSecondary}22`,
  },
  modalCancelText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  modalLogoutButton: {
    backgroundColor: Colors.error,
  },
  modalLogoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
