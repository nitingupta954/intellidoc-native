import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import Text from '../../../src/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { Colors } from '../../../src/theme/colors';

export default function WorkspacesScreen() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, createAndSetWorkspace, deleteWorkspace } = useWorkspaceStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleDeleteWorkspace = (id: string, name: string) => {
    Alert.alert(
      "Delete Workspace",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteWorkspace(id);
              Alert.alert("Success", "Workspace deleted.");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete workspace");
            }
          } 
        }
      ]
    );
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setIsCreating(true);
    try {
      await createAndSetWorkspace(newWorkspaceName);
      setNewWorkspaceName('');
      setModalVisible(false);
      Alert.alert('Success', 'Workspace created and activated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workspaces</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.infoBox}>
          <Feather name="info" size={20} color={Colors.info} />
          <Text style={styles.infoText}>
            Workspaces allow you to isolate documents, chat histories, and knowledge bases between different projects or teams.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Workspaces</Text>
          {workspaces.map((ws, index) => {
            const isActive = ws.id === activeWorkspaceId;
            return (
              <TouchableOpacity
                key={ws.id}
                style={[styles.wsRow, index === workspaces.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  if (!isActive) setActiveWorkspace(ws.id);
                }}
              >
                <View style={[styles.wsIconBox, isActive ? { backgroundColor: `${Colors.primary}22` } : { backgroundColor: Colors.surface }]}>
                  <Text style={styles.wsIconText}>{ws.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.wsTextWrap}>
                  <Text style={styles.wsTitle}>{ws.name}</Text>
                  <Text style={styles.wsRole}>{(ws.role === 'ADMIN' || ws.role === 'OWNER') ? 'Admin' : 'Member'}</Text>
                </View>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
                {ws.role === 'OWNER' && (
                  <TouchableOpacity 
                    style={{ padding: 8, marginLeft: 8 }} 
                    onPress={() => handleDeleteWorkspace(ws.id, ws.name)}
                  >
                    <Feather name="trash-2" size={18} color={Colors.error || '#ef4444'} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create New Workspace</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create Workspace Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Workspace</Text>
            <Text style={styles.modalSub}>Enter a name for your new workspace.</Text>
            <TextInput
              style={styles.input}
              placeholder="Workspace Name"
              placeholderTextColor={Colors.textMuted}
              value={newWorkspaceName}
              onChangeText={setNewWorkspaceName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)} disabled={isCreating}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, !newWorkspaceName.trim() && { opacity: 0.5 }]} onPress={handleCreateWorkspace} disabled={!newWorkspaceName.trim() || isCreating}>
                {isCreating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Create</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.bgCard },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  container: { padding: 16, paddingBottom: 40 },
  infoBox: { flexDirection: 'row', backgroundColor: `${Colors.info}15`, padding: 16, borderRadius: 12, marginBottom: 24, gap: 12 },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 16 },
  wsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  wsIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  wsIconText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  wsTextWrap: { flex: 1 },
  wsTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  wsRole: { fontSize: 13, color: Colors.textMuted },
  activeBadge: { backgroundColor: `${Colors.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  createBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  modalSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  input: { backgroundColor: Colors.bgDark, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, fontSize: 15, color: Colors.text, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.surface },
  modalCancelText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  modalSubmit: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: Colors.primary, minWidth: 90, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
