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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
} from 'lucide-react-native';
import { getPendingInvitations, getDeals } from '../../services/api';

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

const Notifications = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const list = [];

      // 1. Fetch pending deal invitations
      try {
        const invRes = await getPendingInvitations(token);
        if (invRes && invRes.success && Array.isArray(invRes.data)) {
          invRes.data.forEach((inv, index) => {
            const draft = inv.dealDraft || {};
            const pName = draft.products?.[0]?.productName || draft.crop || 'Agricultural Sauda';
            list.push({
              id: `inv-${inv._id || index}`,
              type: 'deal_invite',
              category: 'Deals',
              title: 'New Sauda Sign Invitation',
              message: `${inv.senderName || 'A counterparty'} sent you a Sauda contract invitation for ${pName}. Review & sign to lock the deal.`,
              timestamp: inv.createdAt ? new Date(inv.createdAt) : new Date(),
              isRead: false,
              rawItem: inv,
              targetScreen: 'DealsList',
              targetData: { filter: 'Invitations' },
              actionLabel: 'Review & Sign Sauda',
              badgeText: 'Action Needed',
              badgeColor: '#D97706',
              badgeBg: '#FEF3C7',
            });
          });
        }
      } catch (e) {
        console.warn('Error fetching invitations for notifications:', e);
      }

      // 2. Fetch recent active deals for deal updates
      try {
        const dealRes = await getDeals(token, 1, 20);
        if (dealRes && dealRes.success) {
          const rawDeals = Array.isArray(dealRes.data)
            ? dealRes.data
            : (dealRes.data?.deals || dealRes.data?.myDeals || []);

          rawDeals.forEach((d, idx) => {
            const status = (d.status || '').toLowerCase();
            const pName = d.products?.[0]?.productName || d.crop || 'Sauda Contract';
            const dealId = d._id || d.id;

            if (status === 'confirmed' || status === 'approved') {
              list.push({
                id: `deal-appr-${dealId || idx}`,
                type: 'deal_confirmed',
                category: 'Deals',
                title: 'Sauda Contract Confirmed',
                message: `Sauda #${d.dealNumber || 'Agreement'} for ${pName} has been fully confirmed by both parties.`,
                timestamp: d.updatedAt || d.createdAt ? new Date(d.updatedAt || d.createdAt) : new Date(),
                isRead: true,
                rawItem: d,
                targetScreen: 'DealDetails',
                targetData: { dealId, deal: d },
                actionLabel: 'View Contract',
                badgeText: 'Confirmed',
                badgeColor: '#059669',
                badgeBg: '#ECFDF5',
              });
            } else if (status === 'pending') {
              list.push({
                id: `deal-pend-${dealId || idx}`,
                type: 'deal_pending',
                category: 'Deals',
                title: 'Pending Signature',
                message: `Sauda #${d.dealNumber || 'Contract'} is currently awaiting signature confirmation from counterparty.`,
                timestamp: d.createdAt ? new Date(d.createdAt) : new Date(),
                isRead: false,
                rawItem: d,
                targetScreen: 'DealDetails',
                targetData: { dealId, deal: d },
                actionLabel: 'Check Status',
                badgeText: 'Pending',
                badgeColor: '#0284C7',
                badgeBg: '#E0F2FE',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Error fetching deals for notifications:', e);
      }

      // 3. Fallback mock notifications if list is sparse
      if (list.length < 3) {
        list.push(
          {
            id: 'mock-1',
            type: 'system',
            category: 'Alerts',
            title: 'Welcome to Pravisti Trade Ledger',
            message: 'Your account is active. Create or accept Sauda contracts to start digital mandi trading securely.',
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
            isRead: false,
            targetScreen: 'Dashboard',
            actionLabel: 'Go to Dashboard',
            badgeText: 'Welcome',
            badgeColor: '#4F46E5',
            badgeBg: '#EEF2FF',
          },
          {
            id: 'mock-2',
            type: 'deal_invite',
            category: 'Deals',
            title: 'Wheat (Gehun) Contract Pending',
            message: 'M/s Laxmi Agro Industries invited you to lock a 50 MT Wheat Sauda deal at ₹2,450/Qtl.',
            timestamp: new Date(Date.now() - 1000 * 60 * 120),
            isRead: false,
            targetScreen: 'DealsList',
            targetData: { filter: 'Invitations' },
            actionLabel: 'Review & Sign Sauda',
            badgeText: 'Action Needed',
            badgeColor: '#D97706',
            badgeBg: '#FEF3C7',
          },
          {
            id: 'mock-3',
            type: 'payment',
            category: 'Payments',
            title: 'Brokerage Payment Clearance',
            message: 'Payment clearance receipt for Sauda #PRV-8821 generated successfully.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
            isRead: true,
            targetScreen: 'MyCompanies',
            actionLabel: 'View Receipt',
            badgeText: 'Cleared',
            badgeColor: '#7C3AED',
            badgeBg: '#F3E8FF',
          }
        );
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
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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
          setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)));
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
        >
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} Unread Alerts` : 'All caught up'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={markAllRead}
          activeOpacity={0.75}
        >
          <CheckCheck size={18} color="#FFFFFF" />
        </TouchableOpacity>
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
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
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
