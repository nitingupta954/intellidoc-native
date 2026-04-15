import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '../../../src/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../../src/api/client';
import { Colors } from '../../../src/theme/colors';

export default function SecurityScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Mock 2FA for UI parity with web
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please enter both current and new passwords.');
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await api.post('/api/user/password', { currentPassword, newPassword });
      if (res.data.success) {
        Alert.alert('Success', 'Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        Alert.alert('Error', res.data.error || 'Failed to update password');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = () => {
    const nextVal = !is2FAEnabled;
    setIs2FAEnabled(nextVal);
    // Real implementation would call API
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security & Access</Text>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${Colors.warning}22` }]}>
                <Feather name="lock" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.cardTitle}>Change Password</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, (!currentPassword || !newPassword) && styles.saveBtnDisabled]} 
              onPress={handleUpdatePassword} 
              disabled={!currentPassword || !newPassword || isSaving}
            >
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${Colors.primary}22` }]}>
                <Feather name="shield" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Two-Factor Auth (2FA)</Text>
                <Text style={styles.cardSub}>Add an extra layer of security</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.toggle, is2FAEnabled ? styles.toggleOn : styles.toggleOff]} 
                onPress={handleToggle2FA}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleKnob, is2FAEnabled ? styles.toggleKnobOn : styles.toggleKnobOff]} />
              </TouchableOpacity>
            </View>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: Colors.bgDark, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, fontSize: 15, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  
  // Custom Toggle Switch Styles
  toggle: { width: 50, height: 28, borderRadius: 14, justifyContent: 'center', padding: 2 },
  toggleOn: { backgroundColor: Colors.success },
  toggleOff: { backgroundColor: Colors.border },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleKnobOn: { transform: [{ translateX: 22 }] },
  toggleKnobOff: { transform: [{ translateX: 0 }] },
});
