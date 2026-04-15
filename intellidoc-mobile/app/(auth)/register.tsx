import React, { useState } from 'react';
import Text from '../../src/components/Text';
import { Ionicons } from '@expo/vector-icons';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';

import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../../src/store/sessionStore';
import { Colors } from '../../src/theme/colors';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading, clearError } = useSessionStore();

  const handleRegister = async () => {
    clearError();
    setErrorMsg(null);
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.push(`/(auth)/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Glow */}
            <View style={styles.glowBlob} pointerEvents="none" />

            {/* Logo */}
            <View style={styles.logoWrap}>
              <View style={[styles.logoIcon, { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' }]}>
                <Text style={styles.logoEmoji}>🧠</Text>
              </View>
            </View>

            {/* Heading */}
            <View style={styles.headingWrap}>
              <Text style={styles.title}>Create an account</Text>
              <Text style={styles.subtitle}>Join IntelliDoc AI to build your knowledge base</Text>
            </View>

            {/* Error */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, nameFocused && styles.inputFocused]}
                placeholder="John Doe"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder="name@example.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, passwordFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder=""
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signUpBtn, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signUpBtnText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#334155',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
    elevation: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: { fontSize: 24 },
  headingWrap: { alignItems: 'center', marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
  field: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 44,
    backgroundColor: 'rgba(241,245,249,0.7)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 44,
    backgroundColor: 'rgba(241,245,249,0.7)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  signUpBtn: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.7 },
  signUpBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { fontSize: 14, color: '#64748b' },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
