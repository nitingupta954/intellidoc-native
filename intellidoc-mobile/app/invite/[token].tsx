import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import Text from '../../src/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSessionStore } from '../../src/store/sessionStore';
import { getInvitePreview, acceptInvite } from '../../src/api/workspaces';
import { Colors } from '../../src/theme/colors';
import { Feather } from '@expo/vector-icons';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { isAuthenticated, user } = useSessionStore();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      getInvitePreview(token)
        .then(setInvite)
        .catch(() => {
          // ignore, handled in render
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await acceptInvite(token);
      Alert.alert('Success', 'You have joined the workspace!');
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginRedirect = () => {
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading invitation…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!invite) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={Colors.error} style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Invalid Invitation</Text>
          <Text style={styles.subtitle}>This invitation link is invalid or has expired.</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.replace('/(app)/home')}>
            <Text style={styles.btnSecondaryText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Feather name="mail" size={48} color={Colors.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Workspace Invitation</Text>
        <Text style={styles.subtitle}>
          You have been invited to join a workspace as <Text style={{ fontWeight: 'bold' }}>{invite.role}</Text>.
        </Text>

        {!isAuthenticated ? (
          <View style={styles.actionBox}>
            <Text style={styles.warningText}>You need to be logged in to accept this invitation.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleLoginRedirect}>
              <Text style={styles.btnPrimaryText}>Log In or Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : user?.email !== invite.email ? (
          <View style={styles.actionBox}>
            <Text style={styles.errorText}>
              This invitation was sent to {invite.email}, but you are logged in as {user?.email}.
            </Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleLoginRedirect}>
              <Text style={styles.btnSecondaryText}>Switch Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionBox}>
            <TouchableOpacity 
              style={[styles.btnPrimary, accepting && { opacity: 0.7 }]} 
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Accept Invitation</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => router.replace('/(app)/home')}>
              <Text style={styles.btnSecondaryText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: Colors.textSecondary, marginTop: 16, fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  actionBox: { width: '100%', maxWidth: 400, alignItems: 'center' },
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 12 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnSecondary: { backgroundColor: Colors.surface, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnSecondaryText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  warningText: { color: Colors.warning, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center', marginBottom: 16 },
});
