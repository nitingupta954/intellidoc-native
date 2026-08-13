import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Text from '../../../src/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSessionStore } from '../../../src/store/sessionStore';
import { getInvitePreview, acceptInvite } from '../../../src/api/workspaces';
import { Colors } from '../../../src/theme/colors';
import { Feather } from '@expo/vector-icons';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';

export default function JoinWorkspaceScreen() {
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { user } = useSessionStore();
  const { loadWorkspaces } = useWorkspaceStore();

  const handlePreview = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    
    setLoadingPreview(true);
    setInvite(null);
    try {
      const inviteData = await getInvitePreview(cleanCode);
      if (inviteData.email !== user?.email) {
        Alert.alert('Error', `This invitation was sent to ${inviteData.email}, but you are logged in as ${user?.email}.`);
      } else {
        setInvite(inviteData);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Invalid or expired invite code');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAccept = async () => {
    if (!invite) return;
    setAccepting(true);
    try {
      await acceptInvite(code.trim().toUpperCase());
      await loadWorkspaces();
      Alert.alert('Success', 'You have joined the workspace!');
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Join Workspace</Text>
          </View>

          {!invite ? (
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Feather name="users" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.subtitle}>Enter the 6-character code from your invitation email.</Text>
              
              <TextInput
                style={styles.input}
                placeholder="e.g. A1B2C3"
                placeholderTextColor={Colors.textMuted}
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={handlePreview}
              />
              
              <TouchableOpacity 
                style={[styles.btnPrimary, (!code.trim() || loadingPreview) && { opacity: 0.5 }]} 
                onPress={handlePreview}
                disabled={!code.trim() || loadingPreview}
              >
                {loadingPreview ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Find Workspace</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={[styles.iconBox, { backgroundColor: `${Colors.success}22` }]}>
                <Feather name="check-circle" size={32} color={Colors.success} />
              </View>
              <Text style={styles.inviteTitle}>Invitation Found!</Text>
              <Text style={styles.inviteSubtitle}>
                You have been invited to join a workspace as <Text style={{ fontWeight: 'bold', color: Colors.text }}>{invite.role}</Text>.
              </Text>
              
              <TouchableOpacity 
                style={[styles.btnPrimary, accepting && { opacity: 0.7 }]} 
                onPress={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Accept & Join</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.btnSecondary} 
                onPress={() => setInvite(null)}
                disabled={accepting}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  container: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { position: 'absolute', top: 24, left: 24, right: 24, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 8, marginRight: 8, marginLeft: -8 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  card: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  iconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${Colors.primary}22`, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  input: { width: '100%', height: 56, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 24, fontWeight: '700', color: Colors.text, textAlign: 'center', letterSpacing: 4, marginBottom: 24 },
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 12 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: { backgroundColor: Colors.surface, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnSecondaryText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  inviteTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  inviteSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
});
