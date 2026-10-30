import React, { useState, useCallback, useEffect } from 'react';
import Text from '../../../src/components/Text';
import { View, StyleSheet, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';

import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { fetchDocuments, deleteDocument, processDocument, cancelDocumentProcessing } from '../../../src/api/documents';
import { Colors } from '../../../src/theme/colors';
import { Document } from '../../../src/types';
import {
  formatFileSize,
  formatMimeType,
  formatDate,
  statusLabel,
} from '../../../src/lib/formatting';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.statusPending,
  UPLOADED: Colors.statusPending,
  PROCESSING: Colors.statusProcessing,
  INDEXED: Colors.statusIndexed,
  ERROR: Colors.error,
  CANCELLED: Colors.warning,
};

export default function DocumentsScreen() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: allDocs = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['documents', activeWorkspaceId],
    queryFn: () => fetchDocuments(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      const isActivelyProcessing = docs.some(
        (d: Document) => d.status === 'PROCESSING',
      );
      return isActivelyProcessing ? 3000 : false;
    },
    staleTime: 10_000,
  });

  // Client-side search filter
  const docs = allDocs.filter(
    (d) =>
      !search ||
      d.filename.toLowerCase().includes(search.toLowerCase()) ||
      d.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleProcess = async (doc: Document) => {
    try {
      await processDocument(doc.id);
      Alert.alert('Processing Initiated', `Asynchronous processing started for "${doc.filename}".`);
      queryClient.invalidateQueries({ queryKey: ['documents', activeWorkspaceId] });
    } catch (err: any) {
      Alert.alert('Processing Error', err?.response?.data?.error || err.message || 'Failed to trigger processing.');
    }
  };

  const handleCancel = (doc: Document) => {
    Alert.alert(
      'Cancel Processing',
      `Are you sure you want to cancel processing for "${doc.filename}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelDocumentProcessing(doc.id);
              queryClient.invalidateQueries({ queryKey: ['documents', activeWorkspaceId] });
            } catch (err: any) {
              Alert.alert('Cancel Failed', err?.response?.data?.error || err.message || 'Could not cancel processing.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (doc: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.filename}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(doc.id);
              queryClient.invalidateQueries({ queryKey: ['documents', activeWorkspaceId] });
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.response?.data?.error || err.message || 'Could not delete document.');
            }
          },
        },
      ],
    );
  };

  const renderDoc = useCallback(
    ({ item }: { item: Document }) => (
      <TouchableOpacity
        style={styles.docCard}
        onPress={() => router.push(`/(app)/documents/${item.id}` as any)}
        onLongPress={() => handleDelete(item)}
      >
        {/* File type badge */}
        <View style={styles.fileBadge}>
          <Text style={styles.fileBadgeText}>{formatMimeType(item.mimeType)}</Text>
        </View>

        {/* Info */}
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>
            {item.filename}
          </Text>
          {item.status === 'PROCESSING' ? (
            <Text style={styles.docStep} numberOfLines={1}>
              ⚙️ {item.currentStep ?? 'Processing...'}
            </Text>
          ) : item.status === 'CANCELLED' ? (
            <Text style={[styles.docMeta, { color: Colors.warning }]}>
              ⏹️ Cancelled · {formatFileSize(item.fileSize)}
            </Text>
          ) : (
            <Text style={styles.docMeta}>
              {formatFileSize(item.fileSize)} · {formatDate(item.createdAt)}
            </Text>
          )}
          {item.status === 'PROCESSING' && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${item.progress ?? 10}%` },
                ]}
              />
            </View>
          )}
        </View>

        {/* Action column */}
        <View style={styles.cardActions}>
          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}22` }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {statusLabel(item.status)}
            </Text>
          </View>

          <View style={styles.btnRow}>
            {item.status === 'PROCESSING' ? (
              <TouchableOpacity
                style={styles.cancelChip}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCancel(item);
                }}
              >
                <Text style={styles.cancelChipText}>✕ Cancel</Text>
              </TouchableOpacity>
            ) : (item.status === 'UPLOADED' || item.status === 'ERROR' || item.status === 'PENDING' || item.status === 'CANCELLED') && (
              <TouchableOpacity
                style={styles.quickProcessBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={(e) => {
                  e.stopPropagation();
                  handleProcess(item);
                }}
              >
                <Text style={styles.quickProcessText}>
                  {item.status === 'CANCELLED' ? '⚡ Retry' : '⚡ Process'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.trashBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
            >
              <Text style={styles.trashText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [activeWorkspaceId],
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => router.push('/(app)/documents/upload' as any)}
        >
          <Text style={styles.uploadBtnText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      <FlashList
        data={docs}
        renderItem={renderDoc}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySubtitle}>
              Upload your first document to start asking AI questions.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(app)/documents/upload' as any)}
            >
              <Text style={styles.emptyBtnText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 24, marginBottom: 12 },
  searchInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  listContent: { paddingHorizontal: 24, paddingBottom: 32 },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  fileBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}22`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fileBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  docMeta: { fontSize: 12, color: Colors.textMuted },
  docStep: { fontSize: 11, color: Colors.statusProcessing, marginBottom: 4 },
  progressBar: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickProcessBtn: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: `${Colors.primary}60`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quickProcessText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  trashBtn: {
    padding: 3,
  },
  trashText: {
    fontSize: 14,
  },
  cancelChip: {
    backgroundColor: `${Colors.warning}20`,
    borderWidth: 1,
    borderColor: `${Colors.warning}60`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cancelChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
  },
});
