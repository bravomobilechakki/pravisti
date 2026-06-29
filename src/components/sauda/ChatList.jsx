import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConversations, getUserProfile } from '../../services/api';
import { ArrowLeft, MessageSquare, Handshake } from 'lucide-react-native';

const ChatList = ({ onNavigate }) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const fetchConversations = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      // 1. Get current user profile
      const userRes = await getUserProfile(token);
      let myUserId = '';
      if (userRes && userRes.success && userRes.data) {
        myUserId = userRes.data._id || userRes.data.id;
        setCurrentUserId(myUserId);
      }

      // 2. Fetch conversations
      const response = await getConversations(token, 1, 50);
      if (response && response.success && response.data?.data) {
        setConversations(response.data.data);
        await AsyncStorage.setItem('cached_conversations', JSON.stringify(response.data.data));
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadCachedConversations = async () => {
      try {
        const cached = await AsyncStorage.getItem('cached_conversations');
        if (cached) {
          setConversations(JSON.parse(cached));
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('Failed to load cached conversations:', e);
      }
    };
    loadCachedConversations();
    fetchConversations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const getCounterpartyName = (participants) => {
    if (!participants || participants.length === 0) return 'Counterparty';
    // Find the participant whose userId is NOT the current logged-in user
    const otherPart = participants.find(
      (p) => String(p.userId?._id || p.userId?.id || p.userId) !== String(currentUserId)
    );
    return otherPart?.userId?.name || otherPart?.userId?.mobileNumber || 'Counterparty';
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { label: 'ACTIVE', color: '#10B981', bg: '#ECFDF5' };
      case 'completed':
        return { label: 'COMPLETED', color: '#6366F1', bg: '#EEF2FF' };
      case 'pending':
        return { label: 'PENDING', color: '#F59E0B', bg: '#FFFBEB' };
      default:
        return { label: status?.toUpperCase() || 'CHAT', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Loading trade chats...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('Dashboard')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deal Chats</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterTab, styles.filterTabActive]}>
          <Text style={[styles.filterText, styles.filterTextActive]}>
            All ({conversations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={{ marginBottom: 16 }}>
              <MessageSquare size={48} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Active Chats</Text>
            <Text style={styles.emptySubtitle}>
              Conversations will appear once you have approved trade agreements between counterparties.
            </Text>
          </View>
        ) : (
          conversations.map((conv) => {
            const counterparty = getCounterpartyName(conv.participants);
            const statusCfg = getStatusConfig(conv.status);
            const lastMsgText = conv.lastMessage?.content || 'No messages yet';
            const lastMsgTime = formatMessageTime(conv.lastMessage?.sentAt || conv.updatedAt);
            const dealNo = conv.dealId?.dealNumber || 'DL-TEMP';
            const subject = conv.subject || `Chat for Deal #${dealNo}`;

            return (
              <TouchableOpacity
                key={conv._id || conv.id}
                style={styles.chatCard}
                onPress={() => onNavigate('DealChat', { dealId: conv.dealId?._id || conv.dealId, conversationId: conv._id || conv.id })}
                activeOpacity={0.7}
              >
                <View style={styles.chatIconContainer}>
                  <Handshake size={24} color="#4F46E5" />
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.chatTopRow}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {subject}
                    </Text>
                    <Text style={styles.chatTime}>{lastMsgTime}</Text>
                  </View>
                  <Text style={styles.chatParty}>{counterparty} • Deal: #{dealNo}</Text>
                  <Text style={styles.chatLastMsg} numberOfLines={1}>
                    {lastMsgText}
                  </Text>
                </View>

                <View style={styles.chatRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusCfg.bg },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                  {conv.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{conv.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            Select a deal chat thread to start negotiating with the party
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatIcon: {
    fontSize: 24,
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  chatParty: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
    marginBottom: 4,
  },
  chatLastMsg: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '400',
  },
  chatRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  bottomHint: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  hintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#25D366', // WhatsApp green
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});

export default ChatList;
