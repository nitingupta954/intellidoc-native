import React from 'react';
import Text from '../../src/components/Text';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSessionStore } from '../../src/store/sessionStore';
import { useWorkspaceStore } from '../../src/store/workspaceStore';
import { fetchDocuments } from '../../src/api/documents';
import { fetchConversations } from '../../src/api/conversations';
import { Colors } from '../../src/theme/colors';

// Simple relative time helper (replaces date-fns)
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

// ─── Stat Card (matches web StatCard component) ─────────────────────────────
function StatCard({
  title,
  value,
  change,
  iconBg,
  iconChar,
  iconColor,
}: {
  title: string;
  value: string;
  change: string;
  iconBg: string;
  iconChar: string;
  iconColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardTop}>
        <Text style={styles.statCardTitle}>{title}</Text>
        <View style={[styles.statIconBox, { backgroundColor: iconBg }]}>
          <Text style={[styles.statIconChar, { color: iconColor }]}>{iconChar}</Text>
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statChangePill}>
        <Text style={styles.statChangeText}>{change}</Text>
      </View>
    </View>
  );
}

// ─── Activity Row ────────────────────────────────────────────────────────────
function ActivityRow({
  title,
  meta,
  isLast,
}: {
  title: string;
  meta: string;
  isLast: boolean;
}) {
  return (
    <View style={[styles.activityRow, !isLast && styles.activityRowBorder]}>
      <View style={styles.activityIconBox}>
        <Text style={styles.activityIcon}>💬</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.activityMeta}>{meta}</Text>
      </View>
    </View>
  );
}

// ─── Workspace Selector ──────────────────────────────────────────────────────
function WorkspaceSelector() {
  const { activeWorkspaceId, workspaces, setActiveWorkspace } = useWorkspaceStore();
  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  const [modalVisible, setModalVisible] = React.useState(false);

  return (
    <>
      <TouchableOpacity 
        style={styles.workspaceBtn} 
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.workspaceIconBox}>
          <Text style={styles.workspaceIcon}>🏢</Text>
        </View>
        <Text style={styles.workspaceName} numberOfLines={1}>
          {active?.name ?? 'Workspace'}
        </Text>
        <Text style={styles.workspaceChevron}>⌄</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Workspace</Text>
            {workspaces.map((ws) => (
              <TouchableOpacity
                key={ws.id}
                style={[
                  styles.workspaceItem,
                  ws.id === activeWorkspaceId && styles.workspaceItemActive
                ]}
                onPress={() => {
                  setActiveWorkspace(ws.id);
                  setModalVisible(false);
                }}
              >
                <Text style={[
                  styles.workspaceItemText,
                  ws.id === activeWorkspaceId && styles.workspaceItemTextActive
                ]}>{ws.name}</Text>
                {ws.id === activeWorkspaceId && (
                  <Text style={styles.workspaceItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useSessionStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  const {
    data: docs = [],
    isLoading: docsLoading,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['documents', activeWorkspaceId],
    queryFn: () => fetchDocuments(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    staleTime: 60_000,
  });

  const {
    data: convos = [],
    isLoading: convosLoading,
    refetch: refetchConvos,
  } = useQuery({
    queryKey: ['conversations', activeWorkspaceId],
    queryFn: () => fetchConversations(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    staleTime: 60_000,
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDocs(), refetchConvos()]);
    setRefreshing(false);
  };

  const isLoading = docsLoading || convosLoading;
  const aiQueries = convos.reduce((acc, c) => acc + (c.messageCount ?? 0), 0);
  const timeSaved = Math.round((aiQueries * 5) / 60);

  const activity = [
    ...convos.slice(0, 4).map((c) => ({
      id: c.id,
      title: `Asked about '${c.title}'`,
      date: new Date(c.updatedAt),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);

  const initials = (user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.topBarRight}>

            {/* Workspace selector */}
            <WorkspaceSelector />
          </View>
        </View>

        {/* ── Dashboard heading + Upload button ── */}
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>Overview of your intelligent document workspace.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => router.push('/(app)/documents' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.uploadBtnIcon}>📄</Text>
          <Text style={styles.uploadBtnText}>Upload Document</Text>
        </TouchableOpacity>

        {/* ── Stat Cards ── */}
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginVertical: 24 }}
          />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Documents"
              value={docs.length.toString()}
              change="+0%"
              iconBg="rgba(59,130,246,0.08)"
              iconChar="📄"
              iconColor="#3b82f6"
            />
            <StatCard
              title="AI Queries"
              value={aiQueries.toString()}
              change="+0%"
              iconBg="rgba(168,85,247,0.08)"
              iconChar="💬"
              iconColor="#a855f7"
            />
            <StatCard
              title="Avg Confidence"
              value="N/A"
              change="+0%"
              iconBg="rgba(245,158,11,0.08)"
              iconChar="⚡"
              iconColor="#f59e0b"
            />
            <StatCard
              title="Time Saved"
              value={`${timeSaved} hrs`}
              change="+0%"
              iconBg="rgba(20,184,166,0.08)"
              iconChar="🕐"
              iconColor="#14b8a6"
            />
          </View>
        )}

        {/* ── Recent Activity ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Knowledge Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/documents' as any)}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            {activity.length > 0 ? (
              activity.map((act, idx) => (
                <ActivityRow
                  key={act.id}
                  title={act.title}
                  meta={`${timeAgo(act.date)} • By ${user?.name ?? 'You'}`}
                  isLast={idx === activity.length - 1}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No recent activity. Upload a document to get started!</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    maxWidth: 140,
  },
  workspaceIconBox: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceIcon: { fontSize: 13 },
  workspaceName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  workspaceChevron: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Heading
  headingRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dashboardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Upload button
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  uploadBtnIcon: { fontSize: 16 },
  uploadBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconChar: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  statChangePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statChangeText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
  },

  // Activity section
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  viewAll: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activityCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    paddingHorizontal: 14,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIcon: { fontSize: 14 },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  workspaceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  workspaceItemActive: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  workspaceItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  workspaceItemTextActive: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  workspaceItemCheck: {
    fontSize: 16,
    color: Colors.primaryLight,
    fontWeight: '700',
  },
});
