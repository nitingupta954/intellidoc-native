import React, { useState } from 'react';
import Text from '../../../src/components/Text';
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { fetchKnowledgeBases, deleteKnowledgeBase, createKnowledgeBase } from '../../../src/api/kb';
import { Colors } from '../../../src/theme/colors';
import { KnowledgeBase } from '../../../src/types';
import { formatDate } from '../../../src/lib/formatting';

export default function KnowledgeBasesScreen() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: kbs = [], refetch, isLoading } = useQuery({
    queryKey: ['knowledge-bases', activeWorkspaceId],
    queryFn: () => fetchKnowledgeBases(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Knowledge Base',
      `Are you sure you want to delete "${name}"? This will not delete the associated documents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteKnowledgeBase(id);
              queryClient.invalidateQueries({ queryKey: ['knowledge-bases', activeWorkspaceId] });
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete knowledge base.');
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!newName.trim() || !activeWorkspaceId) return;
    setIsCreating(true);
    try {
      await createKnowledgeBase(newName, newDescription, activeWorkspaceId);
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', activeWorkspaceId] });
      setCreateModalVisible(false);
      setNewName('');
      setNewDescription('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create knowledge base.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Knowledge</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>What are Knowledge Bases?</Text>
            <Text style={styles.infoText}>
              Group related documents together so you can chat with all of them at once.
            </Text>
          </View>
        </View>

        {kbs.map((kb: KnowledgeBase) => (
          <TouchableOpacity 
            key={kb.id} 
            style={styles.kbCard}
            onPress={() => router.push(`/(app)/knowledge-bases/${kb.id}` as any)}
          >
            <View style={styles.kbHeader}>
              <View style={styles.kbIconBox}>
                <Text style={styles.kbIconText}>🧠</Text>
              </View>
              <View style={styles.kbInfo}>
                <Text style={styles.kbName}>{kb.name}</Text>
                <Text style={styles.kbMeta}>
                  {kb._count?.documents ?? 0} documents · Updated {formatDate(kb.updatedAt)}
                </Text>
              </View>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(kb.id, kb.name)}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {kb.description ? (
              <Text style={styles.kbDesc}>{kb.description}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => router.push(`/(app)/chat?knowledgeBaseId=${kb.id}` as any)}
            >
              <Text style={styles.chatBtnText}>💬 Chat with {kb.name}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {!isLoading && kbs.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Knowledge Bases</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Create" button above to organize your documents into a new collection.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Knowledge Base</Text>
            
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Q3 Financial Reports"
              placeholderTextColor={Colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.modalLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Earnings calls, balance sheets..."
              placeholderTextColor={Colors.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalCreateBtn, (!newName.trim() || isCreating) && { opacity: 0.5 }]} 
                onPress={handleCreate}
                disabled={!newName.trim() || isCreating}
              >
                {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalCreateText}>Create</Text>}
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
    paddingTop: 20,
    paddingBottom: 16,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: `${Colors.primary}15`,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${Colors.primary}33`,
  },
  infoIcon: { fontSize: 24, marginRight: 12 },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  infoText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  kbCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kbHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  kbIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kbIconText: { fontSize: 24 },
  kbInfo: { flex: 1 },
  kbName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  kbMeta: { fontSize: 12, color: Colors.textMuted },
  delBtn: { padding: 8 },
  delBtnText: { color: Colors.textMuted, fontSize: 18 },
  kbDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16, lineHeight: 22 },
  chatBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderFocus,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chatBtnText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    color: Colors.text,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalCancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { color: Colors.text, fontWeight: '600', fontSize: 16 },
  modalCreateBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.primary, marginLeft: 8 },
  modalCreateText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
