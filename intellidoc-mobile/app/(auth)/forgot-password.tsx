import React, { useState } from 'react';
import Text from '../../src/components/Text';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';

import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../../src/store/sessionStore';
import { Colors } from '../../src/theme/colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const { forgotPassword, isLoading } = useSessionStore();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Please enter your email address.');
      return;
    }
    try {
      await forgotPassword(email.trim().toLowerCase());
      // Navigate to the reset-password OTP screen, passing the email
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email: email.trim().toLowerCase() }
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send reset email.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a code to reset your password.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@company.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.btnText}>
              {isLoading ? 'Sending…' : 'Send Reset Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  backBtn: { marginBottom: 32 },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 36 },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconText: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  inputGroup: { marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  successIcon: { fontSize: 56 },
  successTitle: { fontSize: 24, fontWeight: '700', color: Colors.text },
  successMsg: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
