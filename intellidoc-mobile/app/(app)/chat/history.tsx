import React, { useEffect, useState } from 'react';
import Text from '../../../src/components/Text';
import { View, StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';

import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useChatStore } from '../../../src/store/chatStore';
import { useWorkspaceStore } from '../../../src/store/workspaceStore';
import { Colors } from '../../../src/theme/colors';
import { Conversation } from '../../../src/types';
import { formatDate } from '../../../src/lib/formatting';

export default function ChatHistoryScreen() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const { conversations, loadConversations, deleteConversation, setActiveConversation } = useChatStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadConversations(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const onRefresh = async () => {
    if (!activeWorkspaceId) return;
    setRefreshing(true);
    await loadConversations(activeWorkspaceId);
    setRefreshing(false);
  };

  const filtered = conversations.filter(
    (c) => !search || c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setActiveConversation(id);
    router.navigate('/(app)/chat'); // Navigate to the chat room
  };

  const handleDelete = (id: string) => {
    deleteConversation(id);
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelect(item.id)}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>💬</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title || 'New Chat'}
        </Text>
        <Text style={styles.date}>{formatDate(item.updatedAt)}</Text>
      </View>
      <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.id)}>
        <Text style={styles.delText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(app)/chat')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat History</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No previous chats found.</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 60 },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  searchInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.bgCardLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 18 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  date: { fontSize: 13, color: Colors.textMuted },
  delBtn: { padding: 8 },
  delText: { color: Colors.textMuted, fontSize: 18 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
});
