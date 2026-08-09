import React, { useEffect, useRef, useState } from 'react';
import Text from '../../../src/components/Text';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { useChatStore } from '../../../src/store/chatStore';
import { Colors } from '../../../src/theme/colors';
import MarkdownView from '../../../src/components/MarkdownView';
import { Message, CragConfirmation } from '../../../src/types';
import { formatConfidenceScore } from '../../../src/lib/formatting';
import { fetchDocuments } from '../../../src/api/documents';
import { fetchKnowledgeBases } from '../../../src/api/kb';

export default function ChatScreen() {
  const { id, documentId: paramDocId, knowledgeBaseId: paramKbId, question, workspaceId: paramWsId } = useLocalSearchParams<{
    id?: string;
    documentId?: string;
    knowledgeBaseId?: string;
    question?: string;
    workspaceId?: string;
  }>();

  const { activeWorkspaceId } = useWorkspaceStore();
  const wsId = paramWsId ?? activeWorkspaceId;

  const {
    activeConversationId,
    setActiveConversation,
    conversations,
    messages,
    isGenerating,
    isLoading,
    sendMessage,
    resolveWebSearch,
  } = useChatStore();

  const [input, setInput] = useState('');
  const listRef = useRef<FlashListRef<any>>(null);

  // Derive active conversation context
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  
  // The context comes from route params (if new chat) OR from the existing conversation metadata
  const resolvedDocId = paramDocId || (activeConversation?.metadata as any)?.documentId || undefined;
  const resolvedKbId = paramKbId || activeConversation?.knowledgeBaseId || undefined;

  // Fetch lists to find names
  const { data: allDocs = [] } = useQuery({
    queryKey: ['documents', wsId],
    queryFn: () => fetchDocuments(wsId!),
    enabled: !!wsId && !!resolvedDocId,
  });
  
  const { data: allKbs = [] } = useQuery({
    queryKey: ['knowledge-bases', wsId],
    queryFn: () => fetchKnowledgeBases(wsId!),
    enabled: !!wsId && !!resolvedKbId,
  });

  const activeDoc = (allDocs as any[]).find((d: any) => d.id === resolvedDocId);
  const activeKb = (allKbs as any[]).find((k: any) => k.id === resolvedKbId);

  // Initialize conversation based on route params
  useEffect(() => {
    if (id) {
      if (activeConversationId !== id) {
        setActiveConversation(id);
      }
    } else if (!activeConversationId) {
      // Only reset if we truly have no active conversation or explicitly requested to clear
      setActiveConversation(null);
      // Pre-fill question if coming from document suggested questions
      if (question) {
        sendMessage(question, wsId!, resolvedKbId, resolvedDocId);
      }
    }
  }, [id, question]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    const content = input.trim();
    setInput('');
    sendMessage(content, wsId!, resolvedKbId, resolvedDocId);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.msgRow, isUser ? styles.msgUserRow : styles.msgAsstRow]}>
        {!isUser && (
          <View style={styles.asstAvatar}>
            <Text style={styles.avatarEmoji}>⚡</Text>
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.msgUser : styles.msgAsst]}>
          {isUser ? (
            <Text style={styles.userText}>{item.content}</Text>
          ) : (
            <>
              {/* Needs confirmation (CRAG Web Search) */}
              {item.needsConfirmation && !item.confirmationResolved && (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmTitle}>🌐 Web Search Suggested</Text>
                  <Text style={styles.confirmText}>{item.needsConfirmation.reason}</Text>
                  <View style={styles.confirmActions}>
                    <TouchableOpacity
                      style={styles.confirmBtnPrimary}
                      onPress={() => resolveWebSearch(item.conversationId, item.needsConfirmation!.pendingId, true)}
                    >
                      <Text style={styles.confirmBtnPrimaryText}>Yes, search</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmBtnSecondary}
                      onPress={() => resolveWebSearch(item.conversationId, item.needsConfirmation!.pendingId, false)}
                    >
                      <Text style={styles.confirmBtnSecondaryText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Streaming state / Content */}
              {item.isStreaming && !item.content && (
                <ActivityIndicator size="small" color={Colors.primary} />
              )}
              {!!item.content && (
                <MarkdownView>{item.content}</MarkdownView>
              )}

              {/* Citations */}
              {item.citations && item.citations.length > 0 && (
                <View style={styles.citationsBox}>
                  <Text style={styles.citationsTitle}>Sources:</Text>
                  {item.citations.map((c, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.citationLink}
                      onPress={() => router.push(`/(app)/documents/${c.docId}` as any)}
                    >
                      <Text style={styles.citationText} numberOfLines={1}>
                        [{i + 1}] {(c.metadata?.title as string) || (c.metadata?.fileName as string) || c.docId}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* RAGAS Metrics */}
              {(item.faithfulness != null || item.answerRelevancy != null) && (
                <View style={styles.metricsRow}>
                  {item.faithfulness != null && (
                    <Text style={styles.metricText}>
                      Faithful: {formatConfidenceScore(item.faithfulness)}
                    </Text>
                  )}
                  {item.answerRelevancy != null && (
                    <Text style={styles.metricText}>
                      Relevant: {formatConfidenceScore(item.answerRelevancy)}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(app)/chat/history' as any)}>
            <Text style={styles.iconText}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>IntelliDoc AI</Text>
            {activeDoc && <Text style={styles.headerSub} numberOfLines={1}>📄 {activeDoc.filename}</Text>}
            {activeKb && <Text style={styles.headerSub} numberOfLines={1}>🧠 {activeKb.name}</Text>}
            {(!activeDoc && !activeKb && (resolvedDocId || resolvedKbId)) && (
              <Text style={styles.headerSub}>Chatting with context</Text>
            )}
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => {
             setActiveConversation(null);
             router.replace('/(app)/chat');
          }}>
            <Text style={styles.iconText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Message List */}
        <View style={styles.listWrap}>
          {isLoading ? (
            <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />
          ) : (
            <FlashList
              ref={listRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  listRef.current?.scrollToEnd({ animated: true });
                }
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  {(!resolvedDocId && !resolvedKbId) ? (
                    <>
                      <Text style={styles.emptyEmoji}>📄</Text>
                      <Text style={styles.emptyTitle}>No Document Selected</Text>
                      <Text style={styles.emptySub}>Please upload or select a PDF to start chatting.</Text>
                      <TouchableOpacity 
                        style={styles.redirectBtn}
                        onPress={() => router.push('/(app)/documents' as any)}
                      >
                        <Text style={styles.redirectBtnText}>Go to Documents</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.emptyEmoji}>👋</Text>
                      <Text style={styles.emptyTitle}>How can I help?</Text>
                      <Text style={styles.emptySub}>Ask me anything about your documents.</Text>
                    </>
                  )}
                </View>
              }
            />
          )}
        </View>

        {/* Input area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder={(!resolvedDocId && !resolvedKbId) ? "Select a document to chat" : "Type a message..."}
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            editable={!!(resolvedDocId || resolvedKbId)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isGenerating || (!resolvedDocId && !resolvedKbId)) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isGenerating || (!resolvedDocId && !resolvedKbId)}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleWrap: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.primary },
  iconBtn: { padding: 8 },
  iconText: { fontSize: 24, color: Colors.text },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 20 },
  loader: { flex: 1, justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', marginTop: 100 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  redirectBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  redirectBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  msgRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  msgUserRow: { justifyContent: 'flex-end' },
  msgAsstRow: { justifyContent: 'flex-start' },
  asstAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarEmoji: { fontSize: 16 },
  msgBubble: {
    maxWidth: '85%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  msgUser: {
    backgroundColor: Colors.primaryDark,
    borderBottomRightRadius: 4,
  },
  userText: { fontSize: 15, color: '#fff', lineHeight: 22 },
  msgAsst: {
    backgroundColor: Colors.bgCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bgDark,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    color: Colors.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  citationsBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  citationsTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 8 },
  citationLink: { marginBottom: 6 },
  citationText: { fontSize: 13, color: Colors.primaryLight },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metricText: { fontSize: 11, color: Colors.statusIndexed, fontWeight: '600' },
  confirmBox: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  confirmTitle: { fontSize: 14, fontWeight: '700', color: Colors.warning, marginBottom: 4 },
  confirmText: { fontSize: 13, color: Colors.text, marginBottom: 12 },
  confirmActions: { flexDirection: 'row', gap: 8 },
  confirmBtnPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  confirmBtnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  confirmBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  confirmBtnSecondaryText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
});
