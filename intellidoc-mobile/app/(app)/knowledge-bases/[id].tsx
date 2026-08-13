import React, { useState, useCallback } from 'react';
import Text from '../../../src/components/Text';
import { View, StyleSheet, TouchableOpacity, RefreshControl, Alert, Modal, ActivityIndicator } from 'react-native';

import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { fetchDocuments } from '../../../src/api/documents';
import { attachDocumentsToKb } from '../../../src/api/kb';
import { Colors } from '../../../src/theme/colors';
import { Document, KnowledgeBase } from '../../../src/types';
import { formatFileSize, formatMimeType, formatDate, statusLabel } from '../../../src/lib/formatting';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.statusPending,
  UPLOADED: Colors.statusPending,
  PROCESSING: Colors.statusProcessing,
  INDEXED: Colors.statusIndexed,
  ERROR: Colors.statusError,
  CANCELLED: Colors.statusPending,
};

export default function KnowledgeBaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isLinking, setIsLinking] = useState(false);

  // 1. Get KB Details
  const { data: kbs = [] } = useQuery({
    queryKey: ['knowledge-bases', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
  });
  const kb = (kbs as KnowledgeBase[]).find((k: KnowledgeBase) => k.id === id);

  // 2. Fetch KB Documents
  const {
    data: docs = [],
    refetch: refetchDocs,
    isLoading: loadingDocs,
  } = useQuery({
    queryKey: ['kb-documents', activeWorkspaceId, id],
    queryFn: () => fetchDocuments(activeWorkspaceId!, id),
    enabled: !!activeWorkspaceId && !!id,
    refetchInterval: (query) => {
      const currentDocs = query.state.data ?? [];
      const hasPending = currentDocs.some(
        (d: Document) => d.status === 'PENDING' || d.status === 'UPLOADED' || d.status === 'PROCESSING',
      );
      return hasPending ? 3000 : false;
    },
  });

  // 3. Fetch Workspace Documents for Modal
  const {
    data: workspaceDocs = [],
  } = useQuery({
    queryKey: ['documents', activeWorkspaceId],
    queryFn: () => fetchDocuments(activeWorkspaceId!),
    enabled: !!activeWorkspaceId && addModalVisible, // only fetch when modal is open
  });
  
  // Filter out docs already in this KB
  const availableDocs = workspaceDocs.filter((d: Document) => d.knowledgeBaseId !== id);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchDocs();
    setRefreshing(false);
  };

  const handleLinkDocuments = async () => {
    if (selectedDocs.size === 0) return;
    setIsLinking(true);
    try {
      await attachDocumentsToKb(id!, Array.from(selectedDocs));
      queryClient.invalidateQueries({ queryKey: ['kb-documents', activeWorkspaceId, id] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', activeWorkspaceId] }); // Update counts
      setAddModalVisible(false);
      setSelectedDocs(new Set());
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add documents.');
    } finally {
      setIsLinking(false);
    }
  };

  const toggleDocSelection = (docId: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(docId)) {
      newSet.delete(docId);
    } else {
      newSet.add(docId);
    }
    setSelectedDocs(newSet);
  };

  const renderDoc = useCallback(
    ({ item }: { item: Document }) => (
      <TouchableOpacity
        style={styles.docCard}
        onPress={() => router.push(`/(app)/documents/${item.id}` as any)}
      >
        <View style={styles.fileBadge}>
          <Text style={styles.fileBadgeText}>{formatMimeType(item.mimeType)}</Text>
        </View>

        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>
            {item.filename}
          </Text>
          {(item.status === 'PROCESSING' || item.status === 'UPLOADED') ? (
            <Text style={styles.docStep} numberOfLines={1}>
              ⚙️ {item.currentStep ?? 'Processing...'}
            </Text>
          ) : (
            <Text style={styles.docMeta}>
              {formatFileSize(item.fileSize)} · {formatDate(item.createdAt)}
            </Text>
          )}
          {(item.status === 'PROCESSING' || item.status === 'UPLOADED') && (
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

        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}22` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {statusLabel(item.status)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  const renderAvailableDoc = ({ item }: { item: Document }) => {
    const isSelected = selectedDocs.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.docCard, isSelected && styles.docCardSelected]}
        onPress={() => toggleDocSelection(item.id)}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>{item.filename}</Text>
          <Text style={styles.docMeta}>{formatFileSize(item.fileSize)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!kb) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const aiReadyCount = docs.filter((d: Document) => d.status === 'INDEXED').length;
  const totalSize = docs.reduce((a: number, b: Document) => a + (b.fileSize || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setSelectedDocs(new Set());
              setAddModalVisible(true);
            }}
          >
            <Text style={styles.addBtnText}>+ Add Existing</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.kbDetails}>
        <Text style={styles.title}>{kb.name}</Text>
        {kb.description ? <Text style={styles.description}>{kb.description}</Text> : null}
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{docs.length}</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.statusIndexed }]}>{aiReadyCount}</Text>
            <Text style={styles.statLabel}>AI Ready</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{(totalSize / 1024 / 1024).toFixed(2)} MB</Text>
            <Text style={styles.statLabel}>Storage</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.chatBtn}
          onPress={() => router.push(`/(app)/chat?knowledgeBaseId=${kb.id}` as any)}
        >
          <Text style={styles.chatBtnText}>💬 Chat with this Knowledge Base</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        <FlashList
          data={docs}
          renderItem={renderDoc}
          keyExtractor={(item) => item.id}
          // @ts-ignore
          estimatedItemSize={70}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>No documents</Text>
              <Text style={styles.emptySubtitle}>Tap "+ Add Existing" to link documents.</Text>
            </View>
          }
        />
      </View>

      {/* Add Existing Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Existing Documents</Text>
            
            <View style={styles.modalListWrap}>
              {availableDocs.length === 0 ? (
                <Text style={styles.emptySubtitle}>No available documents in workspace.</Text>
              ) : (
                <FlashList
                  data={availableDocs}
                  renderItem={renderAvailableDoc}
                  keyExtractor={(item) => item.id}
                  // @ts-ignore
                  estimatedItemSize={70}
                />
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalCreateBtn, (selectedDocs.size === 0 || isLinking) && { opacity: 0.5 }]} 
                onPress={handleLinkDocuments}
                disabled={selectedDocs.size === 0 || isLinking}
              >
                {isLinking ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalCreateText}>Add ({selectedDocs.size})</Text>}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 12 },
  addBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderFocus,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
  kbDetails: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, marginBottom: 4 },
  description: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  statBox: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  statLabel: { fontSize: 12, color: Colors.textMuted },
  chatBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  listContainer: { flex: 1 },
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
  docCardSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}11` },
  fileBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}22`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fileBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  docMeta: { fontSize: 12, color: Colors.textMuted },
  docStep: { fontSize: 11, color: Colors.statusProcessing, marginBottom: 4 },
  progressBar: { height: 3, backgroundColor: Colors.border, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, height: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  modalListWrap: { flex: 1, marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalCancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { color: Colors.text, fontWeight: '600', fontSize: 16 },
  modalCreateBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.primary, marginLeft: 8 },
  modalCreateText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
