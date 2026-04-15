import React, { useState, useRef } from 'react';
import Text from '../../src/components/Text';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../../src/store/sessionStore';
import { Colors } from '../../src/theme/colors';

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<TextInput[]>([]);
  const { verifyOtp, isLoading, clearError } = useSessionStore();

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 filled
    if (index === 5 && newOtp.every(Boolean)) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    clearError();
    const finalCode = code ?? otp.join('');
    if (finalCode.length !== 6) {
      Alert.alert('Validation', 'Please enter the 6-digit code.');
      return;
    }
    try {
      await verifyOtp(email!, finalCode);
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.message ?? 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>✉️</Text>
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          {/* OTP inputs */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { if (ref) inputRefs.current[index] = ref; }}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                value={digit}
                onChangeText={(v) => handleChange(v, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, isLoading && styles.btnDisabled]}
            onPress={() => handleVerify()}
            disabled={isLoading}
          >
            <Text style={styles.verifyBtnText}>
              {isLoading ? 'Verifying…' : 'Verify Email'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.resendNote}>
            Didn't receive it? Check your spam folder or go back and resend.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  backBtn: { marginBottom: 32 },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 40 },
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
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: { color: Colors.primary, fontWeight: '600' },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.bgCardLight,
  },
  verifyBtn: {
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
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendNote: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
});
