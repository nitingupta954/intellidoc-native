import React, { useState } from 'react';
import Text from '../../../src/components/Text';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { fetchDocument } from '../../../src/api/documents';
import { Colors } from '../../../src/theme/colors';
import { statusLabel, formatFileSize, formatDate, formatMimeType } from '../../../src/lib/formatting';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.statusPending,
  PROCESSING: Colors.statusProcessing,
  INDEXED: Colors.statusIndexed,
  ERROR: Colors.statusError,
  CANCELLED: Colors.statusPending,
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: doc, isLoading, refetch } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === 'PENDING' || d?.status === 'PROCESSING' ? 3000 : false;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!doc) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Document not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* File info card */}
        <View style={styles.card}>
          <View style={styles.fileIconRow}>
            <View style={styles.fileBadge}>
              <Text style={styles.fileBadgeText}>{formatMimeType(doc.mimeType)}</Text>
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={2}>{doc.filename}</Text>
              <Text style={styles.fileMeta}>
                {formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[doc.status]}22` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[doc.status] }]}>
                {statusLabel(doc.status)}
              </Text>
            </View>
          </View>

          {/* Processing progress */}
          {doc.status === 'PROCESSING' && (
            <View style={styles.progressSection}>
              <Text style={styles.progressStep}>⚙️ {doc.currentStep ?? 'Processing…'}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${doc.progress ?? 10}%` }]} />
              </View>
              <Text style={styles.progressPct}>{doc.progress ?? 0}%</Text>
            </View>
          )}

          {/* Error */}
          {doc.status === 'ERROR' && doc.errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorMsg}>❌ {doc.errorMessage}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {doc.status === 'INDEXED' && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{doc.chunkCount ?? 0}</Text>
              <Text style={styles.statLabel}>Chunks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{doc.suggestedQuestions?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Suggested Q's</Text>
            </View>
          </View>
        )}

        {/* AI Summary */}
        {doc.summary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🤖 AI Summary</Text>
            <Text style={styles.summaryText}>{doc.summary}</Text>
          </View>
        )}

        {/* Suggested Questions */}
        {doc.suggestedQuestions && doc.suggestedQuestions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Suggested Questions</Text>
            {doc.suggestedQuestions.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={styles.questionChip}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/chat',
                    params: { documentId: doc.id, question: q, workspaceId: doc.workspaceId },
                  } as any)
                }
              >
                <Text style={styles.questionText} numberOfLines={2}>{q}</Text>
                <Text style={styles.questionArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Chat button */}
        {doc.status === 'INDEXED' && (
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() =>
              router.push({
                pathname: '/(app)/chat',
                params: { documentId: doc.id, workspaceId: doc.workspaceId },
              } as any)
            }
          >
            <Text style={styles.chatBtnText}>💬 Chat with this Document</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: Colors.bgDark, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.error, fontSize: 16 },
  header: { marginBottom: 20 },
  backBtn: {},
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  fileBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}22`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fileBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  fileMeta: { fontSize: 12, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  progressSection: { marginTop: 16 },
  progressStep: { fontSize: 13, color: Colors.statusProcessing, marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressPct: { fontSize: 12, color: Colors.textMuted, marginTop: 6, textAlign: 'right' },
  errorBox: {
    marginTop: 12,
    backgroundColor: `${Colors.error}18`,
    borderRadius: 12,
    padding: 12,
  },
  errorMsg: { color: Colors.error, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textMuted },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  summaryText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  questionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  questionText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 18 },
  questionArrow: { fontSize: 16, color: Colors.primary, marginLeft: 8 },
  chatBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  chatBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
