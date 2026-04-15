import React, { useState } from 'react';
import Text from '../../../src/components/Text';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { uploadDocument } from '../../../src/api/upload';
import { Colors } from '../../../src/theme/colors';
import { PickedFile } from '../../../src/types';
import { formatFileSize } from '../../../src/lib/formatting';

export default function UploadScreen() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets[0];

      if (asset.size && asset.size > 20 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select a file smaller than 20MB.');
        return;
      }

      setFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? 0,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleUpload = async () => {
    if (!file || !activeWorkspaceId) return;
    setIsUploading(true);
    setProgress(0);

    try {
      await uploadDocument(file, {
        workspaceId: activeWorkspaceId,
        onProgress: (p) => setProgress(p),
      });
      // Invalidate so list shows the new PENDING document
      queryClient.invalidateQueries({ queryKey: ['documents', activeWorkspaceId] });
      router.replace('/(app)/documents');
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message ?? 'An error occurred.');
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleArea}>
          <Text style={styles.title}>Upload Document</Text>
          <Text style={styles.subtitle}>
            Supported: PDF, DOCX, CSV, TXT, MD (Max 20MB)
          </Text>
        </View>

        {!file ? (
          <TouchableOpacity style={styles.dropzone} onPress={handlePick}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>📄</Text>
            </View>
            <Text style={styles.dropzoneText}>Tap to select a document</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedCard}>
            <View style={styles.fileInfo}>
              <Text style={styles.fileIcon}>📝</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
              </View>
              {!isUploading && (
                <TouchableOpacity onPress={() => setFile(null)}>
                  <Text style={styles.cancelText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {isUploading && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {progress === 100 ? 'Finishing…' : `Uploading ${progress}%`}
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.uploadBtn,
            (!file || isUploading) && styles.uploadBtnDisabled,
          ]}
          onPress={handleUpload}
          disabled={!file || isUploading}
        >
          <Text style={styles.uploadBtnText}>
            {isUploading ? 'Uploading…' : 'Start Upload'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: {},
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  titleArea: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  dropzone: {
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}22`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 32 },
  dropzoneText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  selectedCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIcon: { fontSize: 24 },
  fileName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  fileSize: { fontSize: 13, color: Colors.textMuted },
  cancelText: { fontSize: 20, color: Colors.textMuted, padding: 4 },
  progressSection: { marginTop: 20 },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
