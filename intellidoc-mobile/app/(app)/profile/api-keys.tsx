import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '../../../src/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../../src/api/client';
import { Colors } from '../../../src/theme/colors';

export default function ApiKeysScreen() {
  const [loading, setLoading] = useState(true);
  
  // OpenAI
  const [openApiKey, setOpenApiKey] = useState('');
  const [maskedOpenApiKey, setMaskedOpenApiKey] = useState<string | null>(null);
  const [savingOpenAI, setSavingOpenAI] = useState(false);

  // Gemini
  const [geminiKey, setGeminiKey] = useState('');
  const [maskedGeminiKey, setMaskedGeminiKey] = useState<string | null>(null);
  const [isSystemGemini, setIsSystemGemini] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api/user/key');
      const data = res.data;
      if (data.hasOpenAIKey) setMaskedOpenApiKey(data.maskedOpenAIKey);
      if (data.hasGeminiKey) {
        setMaskedGeminiKey(data.maskedGeminiKey);
        setIsSystemGemini(data.isSystemGeminiKey);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpenAI = async () => {
    if (!openApiKey.trim()) return;
    setSavingOpenAI(true);
    try {
      const res = await api.post('/api/user/key', { openaiKey: openApiKey });
      if (res.data.success) {
        setMaskedOpenApiKey(openApiKey.length > 8 ? `sk-...${openApiKey.slice(-4)}` : "sk-...****");
        setOpenApiKey('');
        Alert.alert('Success', 'OpenAI API Key saved successfully');
      } else {
        Alert.alert('Error', res.data.error || 'Failed to save key');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSavingOpenAI(false);
    }
  };

  const handleRevokeOpenAI = () => {
    Alert.alert('Revoke Key', 'Are you sure you want to revoke your OpenAI API Key?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
          setSavingOpenAI(true);
          try {
            const res = await api.delete('/api/user/key', { data: { type: 'openai' } });
            if (res.data.success) {
              setMaskedOpenApiKey(null);
              Alert.alert('Success', 'OpenAI API Key revoked');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setSavingOpenAI(false);
          }
      }}
    ]);
  };

  const handleSaveGemini = async () => {
    if (!geminiKey.trim()) return;
    setSavingGemini(true);
    try {
      const res = await api.post('/api/user/key', { geminiKey });
      if (res.data.success) {
        setMaskedGeminiKey(geminiKey.length > 8 ? `...${geminiKey.slice(-4)}` : "...****");
        setIsSystemGemini(false);
        setGeminiKey('');
        Alert.alert('Success', 'Gemini API Key saved successfully');
      } else {
        Alert.alert('Error', res.data.error || 'Failed to save key');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSavingGemini(false);
    }
  };

  const handleRevokeGemini = () => {
    Alert.alert('Revoke Key', 'Are you sure you want to revoke your Gemini API Key?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
          setSavingGemini(true);
          try {
            const res = await api.delete('/api/user/key', { data: { type: 'gemini' } });
            if (res.data.success) {
              fetchKeys(); // Re-fetch to see if system key is used
              Alert.alert('Success', 'Gemini API Key revoked');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setSavingGemini(false);
          }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>API Keys (BYOK)</Text>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.infoBox}>
            <Feather name="info" size={20} color={Colors.info} />
            <Text style={styles.infoText}>
              Bring Your Own Key (BYOK) allows you to use your own API keys for AI models. You will not be charged credits while using your own keys.
            </Text>
          </View>

          {/* OpenAI Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#10a37f22' }]}>
                <Feather name="cpu" size={20} color="#10a37f" />
              </View>
              <Text style={styles.cardTitle}>OpenAI API Key</Text>
            </View>

            {maskedOpenApiKey ? (
              <View style={styles.keyActiveBox}>
                <View>
                  <Text style={styles.keyActiveTitle}>Custom Key Active</Text>
                  <Text style={styles.maskedKey}>{maskedOpenApiKey}</Text>
                </View>
                <TouchableOpacity style={styles.revokeBtn} onPress={handleRevokeOpenAI} disabled={savingOpenAI}>
                  {savingOpenAI ? <ActivityIndicator size="small" color={Colors.error} /> : <Text style={styles.revokeText}>Revoke</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>sk-...</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste your OpenAI API key"
                  placeholderTextColor={Colors.textMuted}
                  value={openApiKey}
                  onChangeText={setOpenApiKey}
                  secureTextEntry
                />
                <TouchableOpacity style={[styles.saveBtn, !openApiKey && styles.saveBtnDisabled]} onPress={handleSaveOpenAI} disabled={!openApiKey || savingOpenAI}>
                  {savingOpenAI ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Key</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Gemini Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#4285f422' }]}>
                <Feather name="cpu" size={20} color="#4285f4" />
              </View>
              <Text style={styles.cardTitle}>Google Gemini API Key</Text>
            </View>

            {maskedGeminiKey && !isSystemGemini ? (
              <View style={styles.keyActiveBox}>
                <View>
                  <Text style={styles.keyActiveTitle}>Custom Key Active</Text>
                  <Text style={styles.maskedKey}>{maskedGeminiKey}</Text>
                </View>
                <TouchableOpacity style={styles.revokeBtn} onPress={handleRevokeGemini} disabled={savingGemini}>
                  {savingGemini ? <ActivityIndicator size="small" color={Colors.error} /> : <Text style={styles.revokeText}>Revoke</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formGroup}>
                {isSystemGemini && (
                  <View style={styles.systemKeyBadge}>
                    <Text style={styles.systemKeyText}>Using System Key. You can override it with your own.</Text>
                  </View>
                )}
                <Text style={styles.label}>AIza...</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste your Gemini API key"
                  placeholderTextColor={Colors.textMuted}
                  value={geminiKey}
                  onChangeText={setGeminiKey}
                  secureTextEntry
                />
                <TouchableOpacity style={[styles.saveBtn, !geminiKey && styles.saveBtnDisabled]} onPress={handleSaveGemini} disabled={!geminiKey || savingGemini}>
                  {savingGemini ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Key</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  container: { padding: 16, paddingBottom: 40 },
  infoBox: { flexDirection: 'row', backgroundColor: `${Colors.info}15`, padding: 16, borderRadius: 12, marginBottom: 24, gap: 12 },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  keyActiveBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bgDark, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  keyActiveTitle: { fontSize: 14, fontWeight: '600', color: Colors.success, marginBottom: 4 },
  maskedKey: { fontSize: 13, color: Colors.textSecondary, fontFamily: 'Courier' },
  revokeBtn: { backgroundColor: `${Colors.error}15`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  revokeText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  input: { backgroundColor: Colors.bgDark, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, fontSize: 15, color: Colors.text, fontFamily: 'Courier' },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  systemKeyBadge: { backgroundColor: `${Colors.warning}15`, padding: 12, borderRadius: 8, marginBottom: 12 },
  systemKeyText: { color: Colors.warning, fontSize: 12, fontWeight: '500' },
});
