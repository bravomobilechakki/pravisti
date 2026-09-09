import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import {
  ArrowLeft,
  Bell,
  Handshake,
  CheckCircle2,
  Clock,
  CircleAlert as AlertCircle,
  Building2,
  FileText,
  ChevronRight,
  CheckCheck,
  DollarSign,
  Mail,
  Trash2,
  X,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Truck,
} from 'lucide-react-native';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from '../../services/api';
import { backendDomain } from '../../common';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const mapBackendNotification = (n, currentCompanyId) => {
  const eventType = String(n.metadata?.eventType || '').toLowerCase();
  const notifType = String(n.type || 'info').toLowerCase();
  const dealId = n.metadata?.dealId;
  const dealNumber = n.metadata?.dealNumber;
  const link = String(n.link || '');

  let category = 'Alerts';
  let targetScreen = null;
  let targetData = {};
  let actionLabel = null;
  let itemType = 'system';
  let badgeText = 'Alert';
  let badgeColor = '#2563EB';
  let badgeBg = '#EFF6FF';

  // Severity badges
  if (notifType === 'success') {
    badgeColor = '#059669';
    badgeBg = '#ECFDF5';
    badgeText = 'Success';
  } else if (notifType === 'warning') {
    badgeColor = '#D97706';
    badgeBg = '#FEF3C7';
    badgeText = 'Notice';
  } else if (notifType === 'error') {
    badgeColor = '#DC2626';
    badgeBg = '#FEE2E2';
    badgeText = 'Attention';
  }

  // 1. Deals / Sauda
  if (
    eventType.startsWith('deal_') ||
    eventType.startsWith('draft_deal') ||
    dealId ||
    link.includes('sauda') ||
    link.includes('deals')
  ) {
    category = 'Deals';
    itemType = notifType === 'success' ? 'deal_confirmed' : 'deal_pending';
    targetScreen = dealId ? 'DealDetails' : 'DealsList';
    targetData = {
      dealId,
      dealNumber,
      companyId: n.companyId || currentCompanyId,
    };
    actionLabel = eventType.includes('expired')
      ? 'View Deal'
      : eventType.includes('approved')
        ? 'View Contract'
        : 'Review Deal';
    if (!badgeText || badgeText === 'Alert') {
      badgeText = eventType.includes('approved') ? 'Confirmed' : 'Sauda';
    }
  }
  // 2. Payments
  else if (eventType.startsWith('payment_') || n.metadata?.paymentId || link.includes('payment')) {
    category = 'Payments';
    itemType = 'payment';
    targetScreen = 'TransactionHistory';
    targetData = {
      companyId: n.companyId || currentCompanyId,
    };
    actionLabel = 'View Transactions';
    badgeText = 'Payment';
    badgeColor = '#7C3AED';
    badgeBg = '#F3E8FF';
  }
  // 3. Chat Messages
  else if (eventType === 'chat_message' || n.metadata?.conversationId || link.includes('chat')) {
    category = 'Deals';
    itemType = 'deal_pending';
    targetScreen = dealId ? 'DealChat' : 'ChatList';
    targetData = {
      dealId,
      conversationId: n.metadata?.conversationId,
      companyId: n.companyId || currentCompanyId,
    };
    actionLabel = 'Open Chat';
    badgeText = 'New Message';
    badgeColor = '#EA580C';
    badgeBg = '#FFF7ED';
  }
  // 4. Deliveries
  else if (eventType.startsWith('delivery_') || n.metadata?.deliveryId || link.includes('delivery')) {
    category = 'Deals';
    itemType = 'deal_confirmed';
    targetScreen = dealId ? 'DealDetails' : 'DealsList';
    targetData = {
      dealId,
      companyId: n.companyId || currentCompanyId,
    };
    actionLabel = 'View Delivery';
    badgeText = 'Delivery';
  }
  // 5. Onboarding / Verification
  else if (eventType.includes('onboard') || eventType.includes('verified')) {
    category = 'Alerts';
    itemType = 'system';
    targetScreen = 'CompanyProfileDetails';
    targetData = {
      companyId: n.companyId || currentCompanyId,
    };
    actionLabel = 'View Profile';
    badgeText = 'Verified';
    badgeColor = '#059669';
    badgeBg = '#ECFDF5';
  }

  return {
    id: n._id || String(Math.random()),
    rawId: n._id,
    type: itemType,
    category,
    title: n.title || 'Notification',
    message: n.message || '',
    timestamp: n.createdAt ? new Date(n.createdAt) : new Date(),
    isRead: Boolean(n.isRead),
    targetScreen,
    targetData,
    actionLabel,
    badgeText,
    badgeColor,
    badgeBg,
    rawItem: n,
  };
};

const Notifications = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentCompanyId = routeData?.companyId || routeData?.company?._id || routeData?.company?.id || null;

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const list = [];
      // Fetch live notifications strictly from Backend API (no hardcoded data)
      try {
        const notifRes = await getUserNotifications(token, currentCompanyId);
        if (notifRes && notifRes.success && Array.isArray(notifRes.data)) {
          notifRes.data.forEach((n) => {
            list.push(mapBackendNotification(n, currentCompanyId));
          });
        }
      } catch (be) {
        console.warn('Backend notification fetch error:', be);
      }

      // Sort by latest timestamp
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [currentCompanyId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time Socket.IO notification listener
  useEffect(() => {
    let socket = null;
    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        let socketUrl = backendDomain;
        if (socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1')) {
          if (Platform.OS === 'android') {
            socketUrl = socketUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
          }
        }

        socket = io(socketUrl, {
          auth: { token },
          extraHeaders: { Authorization: `Bearer ${token}` },
          transports: ['websocket'],
        });

        socket.on('notification', (newNotif) => {
          if (!newNotif) return;
          const mapped = mapBackendNotification(newNotif, currentCompanyId);
          setNotifications((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
        });
      } catch (e) {
        console.warn('Socket notification listener notice:', e);
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentCompanyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const token = await AsyncStorage.getItem('userToken');
      await markAllNotificationsAsRead(token, currentCompanyId);
    } catch (e) {
      console.warn('Error marking all notifications as read:', e);
    }
  };

  const deleteNotification = async (id) => {
    const item = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (item?.rawId) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        markNotificationAsRead(item.rawId, token).catch(() => { });
      } catch (e) { }
    }
  };

  const clearAll = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            try {
              const token = await AsyncStorage.getItem('userToken');
              await clearAllNotifications(token, currentCompanyId);
            } catch (e) {
              console.warn('Error clearing notifications:', e);
            }
          },
        },
      ]
    );
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'All') return true;
      return n.category === activeTab;
    });
  }, [notifications, activeTab]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const renderNotificationItem = ({ item }) => {
    let iconBg = '#EFF6FF';
    let iconColor = '#1A56DB';
    let IconComponent = Bell;

    if (item.type === 'deal_invite') {
      iconBg = '#FEF3C7';
      iconColor = '#D97706';
      IconComponent = Handshake;
    } else if (item.type === 'deal_confirmed') {
      iconBg = '#ECFDF5';
      iconColor = '#059669';
      IconComponent = CheckCircle2;
    } else if (item.type === 'deal_pending') {
      iconBg = '#E0F2FE';
      iconColor = '#0284C7';
      IconComponent = Clock;
    } else if (item.type === 'payment') {
      iconBg = '#F3E8FF';
      iconColor = '#7C3AED';
      IconComponent = DollarSign;
    } else if (item.type === 'system') {
      iconBg = '#EEF2FF';
      iconColor = '#4F46E5';
      IconComponent = ShieldCheck;
    }

    const timeAgoStr = formatRelativeTime(item.timestamp);

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.unreadNotifCard]}
        activeOpacity={0.85}
        onPress={() => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
          );
          if (item.rawId) {
            AsyncStorage.getItem('userToken')
              .then((token) => {
                if (token) markNotificationAsRead(item.rawId, token).catch(() => { });
              })
              .catch(() => { });
          }
          if (item.targetScreen) {
            onNavigate(item.targetScreen, item.targetData || {});
          }
        }}
      >
        {/* Left Icon */}
        <View style={[styles.iconBubble, { backgroundColor: iconBg }]}>
          <IconComponent size={18} color={iconColor} />
        </View>

        {/* Center Main Content */}
        <View style={styles.notifMainContent}>
          <View style={styles.titleRow}>
            <Text style={styles.notifTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{timeAgoStr}</Text>
          </View>

          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>

          {item.actionLabel && (
            <View style={styles.actionRow}>
              <Text style={[styles.actionLinkText, item.type === 'deal_invite' && styles.actionLinkAmber]}>
                {item.actionLabel} →
              </Text>
            </View>
          )}
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => deleteNotification(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color="#94A3B8" />
          </TouchableOpacity>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A56DB" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} Unread Alerts` : 'All caught up'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={markAllRead}
            activeOpacity={0.75}
          >
            <CheckCheck size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={clearAll}
            activeOpacity={0.75}
          >
            <Trash2 size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Category Tabs ── */}
      <View style={styles.tabsContainer}>
        {['All', 'Deals', 'Payments', 'Alerts'].map(tabKey => {
          const isActive = activeTab === tabKey;
          return (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tabKey)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tabKey}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Notification List ── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A56DB" />
          <Text style={styles.loadingText}>Fetching your notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={item => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1A56DB']}
              tintColor="#1A56DB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={36} color="#1A56DB" />
              </View>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                You're all caught up! New Sauda invitations and deal updates will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1A56DB',


  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  markReadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Category Tabs */
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: '#1A56DB',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  /* List & Cards */
  listContentContainer: {
    padding: 12,
    paddingBottom: 90,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotifCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#93C5FD',
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notifMainContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  notifMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    fontWeight: '500',
  },
  actionRow: {
    marginTop: 4,
  },
  actionLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A56DB',
  },
  actionLinkAmber: {
    color: '#D97706',
  },
  rightActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 6,
  },
  dismissBtn: {
    padding: 2,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#1A56DB',
    marginTop: 8,
  },

  /* Empty & Loading States */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
