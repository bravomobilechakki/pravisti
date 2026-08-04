import React, { useState, useEffect, useCallback } from 'react';
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
  Filter,
  DollarSign,
  TrendingUp,
  Mail,
  Trash2,
} from 'lucide-react-native';
import { getPendingInvitations, getDeals } from '../../services/api';

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
              message: `${inv.senderName || 'A counterparty'} sent you a Sauda invitation for ${pName}.`,
              timestamp: inv.createdAt ? new Date(inv.createdAt) : new Date(),
              isRead: false,
              rawItem: inv,
              targetScreen: 'DealsList',
              targetData: { filter: 'Invitations' },
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
                message: `Sauda #${d.dealNumber || 'Agreement'} for ${pName} has been confirmed by both parties.`,
                timestamp: d.updatedAt || d.createdAt ? new Date(d.updatedAt || d.createdAt) : new Date(),
                isRead: true,
                rawItem: d,
                targetScreen: 'DealDetails',
                targetData: { dealId, deal: d },
              });
            } else if (status === 'pending') {
              list.push({
                id: `deal-pend-${dealId || idx}`,
                type: 'deal_pending',
                category: 'Deals',
                title: 'Pending Signature',
                message: `Sauda #${d.dealNumber || 'Contract'} is awaiting signature confirmation.`,
                timestamp: d.createdAt ? new Date(d.createdAt) : new Date(),
                isRead: false,
                rawItem: d,
                targetScreen: 'DealDetails',
                targetData: { dealId, deal: d },
              });
            }
          });
        }
      } catch (e) {
        console.warn('Error fetching deals for notifications:', e);
      }

      // 3. Fallback mock notifications if list is sparse
      if (list.length === 0) {
        list.push(
          {
            id: 'mock-1',
            type: 'system',
            category: 'Alerts',
            title: 'Welcome to Pravisti Trade Ledger',
            message: 'Your account is active. Create or accept Sauda contracts to start digital mandi trading.',
            timestamp: new Date(),
            isRead: false,
            targetScreen: 'Dashboard',
          },
          {
            id: 'mock-2',
            type: 'payment',
            category: 'Payments',
            title: 'Payment Status Alert',
            message: 'Track brokerage payments and invoice clearings directly under deal contracts.',
            timestamp: new Date(Date.now() - 3600000 * 2),
            isRead: true,
            targetScreen: 'MyCompanies',
          }
        );
      }

      // Sort by latest timestamp
      list.sort((a, b) => b.timestamp - a.timestamp);
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

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'All') return true;
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotificationItem = ({ item }) => {
    let iconBg = '#EFF6FF';
    let iconColor = '#1A56DB';
    let IconComponent = Bell;

    if (item.type === 'deal_invite') {
      iconBg = '#FEF3C7';
      iconColor = '#D97706';
      IconComponent = Mail;
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
      iconColor = '#8B5CF6';
      IconComponent = DollarSign;
    }

    const timeAgoStr = item.timestamp
      ? new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Just now';

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.unreadNotifCard]}
        activeOpacity={0.85}
        onPress={() => {
          setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
          if (item.targetScreen) {
            onNavigate(item.targetScreen, item.targetData || {});
          }
        }}
      >
        {!item.isRead && <View style={styles.unreadBlueIndicator} />}

        {/* Icon Bubble */}
        <View style={[styles.iconBubble, { backgroundColor: iconBg }]}>
          <IconComponent size={20} color={iconColor} />
        </View>

        {/* Main Content */}
        <View style={styles.notifMainContent}>
          <View style={styles.notifHeaderRow}>
            <Text style={styles.notifTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{timeAgoStr}</Text>
          </View>

          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>

          {item.type === 'deal_invite' && (
            <View style={styles.actionChipRow}>
              <View style={styles.reviewChip}>
                <Text style={styles.reviewChipText}>Review & Sign Sauda →</Text>
              </View>
            </View>
          )}
        </View>

        <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    padding: 16,
    paddingBottom: 90,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  unreadNotifCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#BFDBFE',
  },
  unreadBlueIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#1A56DB',
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifMainContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 14,
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
  actionChipRow: {
    marginTop: 8,
  },
  reviewChip: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  reviewChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
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
