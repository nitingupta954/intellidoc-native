import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '../../../src/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { useSessionStore } from '../../../src/store/sessionStore';
import { fetchMembers, removeMember, inviteMember } from '../../../src/api/workspaces';
import { WorkspaceMember, WorkspaceRole } from '../../../src/types';
import { Colors } from '../../../src/theme/colors';

export default function MembersScreen() {
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const { user } = useSessionStore();
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const memberMe = members.find(m => m.userId === user?.id);
  const currentUserRole = activeWorkspace?.role || memberMe?.role;
  const isOwnerOrAdmin = activeWorkspace?.ownerId === user?.id || currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const loadMembers = async () => {
    if (!activeWorkspaceId) return;
    setIsLoading(true);
    try {
      const data = await fetchMembers(activeWorkspaceId);
      setMembers(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [activeWorkspaceId])
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !activeWorkspaceId) return;
    setIsInviting(true);
    try {
      await inviteMember(activeWorkspaceId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setModalVisible(false);
      Alert.alert('Success', 'Invitation sent successfully.');
      loadMembers(); // Reload members list
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = (member: WorkspaceMember) => {
    if (!activeWorkspaceId) return;
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name || member.user?.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(activeWorkspaceId, member.userId);
              setMembers(prev => prev.filter(m => m.id !== member.id));
              Alert.alert('Success', 'Member removed successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  if (!activeWorkspaceId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Members</Text>
        </View>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: Colors.textSecondary }}>No workspace selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Members</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.infoBox}>
          <Feather name="users" size={20} color={Colors.info} />
          <Text style={styles.infoText}>
            Manage members and roles for {activeWorkspace?.name || 'your workspace'}.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
          
          {members.length === 0 && !isLoading && (
            <Text style={{ color: Colors.textMuted, marginVertical: 12 }}>No members found.</Text>
          )}

          {members.map((member, index) => {
            const isMe = member.userId === user?.id;
            const canRemove = isOwnerOrAdmin && !isMe && member.role !== 'OWNER' && (currentUserRole === 'OWNER' || (currentUserRole === 'ADMIN' && member.role !== 'ADMIN'));

            return (
              <View key={member.id} style={[styles.memberRow, index === members.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(member.user?.name?.[0] || member.user?.email?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberTextWrap}>
                  <Text style={styles.memberName}>
                    {member.user?.name || 'Unknown User'} {isMe && <Text style={styles.youBadge}>(You)</Text>}
                  </Text>
                  <Text style={styles.memberEmail}>{member.user?.email}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
                {canRemove && (
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(member)}>
                    <Feather name="trash-2" size={18} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {isOwnerOrAdmin && (
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setModalVisible(true)}>
            <Feather name="user-plus" size={20} color="#fff" />
            <Text style={styles.inviteBtnText}>Invite Member</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Invite Member Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Invite Member</Text>
              <Text style={styles.modalSub}>Invite a new member to {activeWorkspace?.name}.</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={Colors.textMuted}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.roleSelector}>
                <Text style={styles.roleSelectorLabel}>Role:</Text>
                <View style={styles.roleOptions}>
                  <TouchableOpacity 
                    style={[styles.roleOption, inviteRole === 'MEMBER' && styles.roleOptionActive]}
                    onPress={() => setInviteRole('MEMBER')}
                  >
                    <Text style={[styles.roleOptionText, inviteRole === 'MEMBER' && styles.roleOptionTextActive]}>Member</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.roleOption, inviteRole === 'ADMIN' && styles.roleOptionActive]}
                    onPress={() => setInviteRole('ADMIN')}
                  >
                    <Text style={[styles.roleOptionText, inviteRole === 'ADMIN' && styles.roleOptionTextActive]}>Admin</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)} disabled={isInviting}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalSubmit, (!inviteEmail.trim() || isInviting) && { opacity: 0.5 }]} 
                  onPress={handleInvite} 
                  disabled={!inviteEmail.trim() || isInviting}
                >
                  {isInviting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Send Invite</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  memberAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  memberTextWrap: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  youBadge: { color: Colors.textMuted, fontSize: 14, fontWeight: 'normal' },
  memberEmail: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  memberRole: { fontSize: 11, fontWeight: '700', color: Colors.primaryLight, textTransform: 'uppercase' },
  removeBtn: { padding: 8, backgroundColor: `${Colors.error}15`, borderRadius: 8 },
  inviteBtn: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  inviteBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  modalSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  input: { backgroundColor: Colors.bgDark, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, fontSize: 15, color: Colors.text, marginBottom: 16 },
  roleSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  roleSelectorLabel: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  roleOptions: { flexDirection: 'row', flex: 1, gap: 8 },
  roleOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: Colors.bgDark, borderWidth: 1, borderColor: Colors.border },
  roleOptionActive: { backgroundColor: `${Colors.primary}22`, borderColor: Colors.primary },
  roleOptionText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  roleOptionTextActive: { color: Colors.primary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.surface },
  modalCancelText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  modalSubmit: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: Colors.primary, minWidth: 100, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
