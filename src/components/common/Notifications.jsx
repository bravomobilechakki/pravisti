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
  CheckCheck,
  DollarSign,
  Trash2,
  X,
  ShieldCheck,
  MessageSquare,
  Truck,
} from 'lucide-react-native';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  getDealDetails,
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

const extractEntityIds = (n) => {
  const meta = n?.metadata || {};
  const link = String(n?.link || '').trim();

  // 1. Deal ID extraction
  let dealId =
    meta.dealId ||
    meta.deal_id ||
    meta.deal?._id ||
    meta.deal?.id ||
    n?.dealId ||
    n?.deal?._id ||
    n?.deal?.id;

  if (!dealId && typeof meta.deal === 'string' && meta.deal.length >= 10) {
    dealId = meta.deal;
  }
  if (!dealId && typeof n?.deal === 'string' && n.deal.length >= 10) {
    dealId = n.deal;
  }
  if (!dealId && link) {
    const match = link.match(/(?:deals|sauda|deal)\/([a-f0-9]{24}|[a-zA-Z0-9_-]+)/i);
    if (match) dealId = match[1];
  }
  if (dealId && typeof dealId === 'object') {
    dealId = dealId._id || dealId.id || null;
  }
  dealId = dealId ? String(dealId).trim() : null;
  if (dealId === 'undefined' || dealId === 'null' || dealId === '') {
    dealId = null;
  }

  // 2. Company ID extraction
  let companyId =
    meta.companyId ||
    meta.company_id ||
    meta.company?._id ||
    meta.company?.id ||
    n?.companyId ||
    n?.company?._id ||
    n?.company?.id;
  if (companyId && typeof companyId === 'object') {
    companyId = companyId._id || companyId.id || null;
  }
  companyId = companyId ? String(companyId).trim() : null;

  // 3. Payment ID extraction
  let paymentId =
    meta.paymentId ||
    meta.payment_id ||
    meta.payment?._id ||
    meta.payment?.id ||
    n?.paymentId;
  if (paymentId && typeof paymentId === 'object') {
    paymentId = paymentId._id || paymentId.id || null;
  }
  paymentId = paymentId ? String(paymentId).trim() : null;

  // 4. Delivery ID extraction
  let deliveryId =
    meta.deliveryId ||
    meta.delivery_id ||
    meta.delivery?._id ||
    meta.delivery?.id ||
    n?.deliveryId;
  if (deliveryId && typeof deliveryId === 'object') {
    deliveryId = deliveryId._id || deliveryId.id || null;
  }
  deliveryId = deliveryId ? String(deliveryId).trim() : null;

  // 5. Conversation ID extraction
  let conversationId =
    meta.conversationId ||
    meta.conversation_id ||
    meta.conversation?._id ||
    meta.conversation?.id ||
    n?.conversationId;
  if (conversationId && typeof conversationId === 'object') {
    conversationId = conversationId._id || conversationId.id || null;
  }
  conversationId = conversationId ? String(conversationId).trim() : null;

  // 6. Project ID extraction
  let projectId =
    meta.projectId ||
    meta.project_id ||
    meta.project?._id ||
    meta.project?.id ||
    n?.projectId;
  if (projectId && typeof projectId === 'object') {
    projectId = projectId._id || projectId.id || null;
  }
  projectId = projectId ? String(projectId).trim() : null;

  // 7. Deal Number extraction
  const dealNumber = meta.dealNumber || meta.dealNo || meta.saudaNo || n?.dealNumber || null;

  return { dealId, companyId, paymentId, deliveryId, conversationId, projectId, dealNumber };
};

const mapBackendNotification = (n, currentCompanyId, routeContext = {}) => {
  if (!n) return null;
  const eventType = String(n.metadata?.eventType || n.type || '').toLowerCase();
  const notifType = String(n.type || 'info').toLowerCase();
  const title = String(n.title || '').trim();
  const message = String(n.message || '').trim();
  const link = String(n.link || '').toLowerCase();

  const { dealId, companyId, paymentId, deliveryId, conversationId, projectId, dealNumber } = extractEntityIds(n);
  const effectiveCompanyId = companyId || currentCompanyId;

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

  // Domain checks
  const isDealDomain =
    eventType.startsWith('deal_') ||
    eventType.startsWith('draft_deal') ||
    eventType.includes('sauda') ||
    link.includes('deal') ||
    link.includes('sauda') ||
    title.toLowerCase().includes('deal') ||
    title.toLowerCase().includes('sauda');

  const isChatDomain =
    eventType === 'chat_message' ||
    eventType.includes('chat') ||
    eventType.includes('message') ||
    link.includes('chat');

  const isPaymentDomain =
    eventType.startsWith('payment_') ||
    Boolean(paymentId) ||
    link.includes('payment') ||
    title.toLowerCase().includes('payment');

  const isDeliveryDomain =
    eventType.startsWith('delivery_') ||
    Boolean(deliveryId) ||
    link.includes('delivery') ||
    title.toLowerCase().includes('delivery') ||
    title.toLowerCase().includes('dispatch');

  const isProjectDomain =
    eventType.startsWith('project_') ||
    Boolean(projectId) ||
    link.includes('project') ||
    title.toLowerCase().includes('project');

  const isOnboardDomain =
    eventType.includes('onboard') ||
    eventType.includes('verified') ||
    eventType.includes('kyc') ||
    title.toLowerCase().includes('verified') ||
    title.toLowerCase().includes('kyc');

  // --- ENTITY INTEGRITY CHECK: DO NOT SHOW NOTIFICATIONS IF REFERENCED ENTITY DOES NOT EXIST ---
  // If notification claims to be about a deal, but dealId is missing -> phantom deal, hide it!
  if (isDealDomain && !dealId) {
    return null;
  }

  // If notification is a chat message, but has neither dealId nor conversationId -> hide it!
  if (isChatDomain && !dealId && !conversationId) {
    return null;
  }

  // If notification is about a payment, but has no paymentId and no dealId and no companyId -> hide it!
  if (isPaymentDomain && !dealId && !paymentId && !effectiveCompanyId) {
    return null;
  }

  // If notification is about a delivery, but has no deliveryId and no dealId and no companyId -> hide it!
  if (isDeliveryDomain && !dealId && !deliveryId && !effectiveCompanyId) {
    return null;
  }

  // 1. Deals / Sauda (Route to DealDetails)
  if (isDealDomain || dealId) {
    category = 'Deals';
    itemType = notifType === 'success' ? 'deal_confirmed' : 'deal_pending';
    targetScreen = 'DealDetails';
    targetData = {
      dealId,
      dealNumber,
      companyId: effectiveCompanyId,
      company: routeContext?.company,
      role: routeContext?.role,
      user: routeContext?.user,
    };
    actionLabel = eventType.includes('expired') || eventType.includes('cancelled')
      ? 'View Deal'
      : eventType.includes('approved') || eventType.includes('confirmed')
        ? 'View Contract'
        : 'Review Deal';
    if (!badgeText || badgeText === 'Alert') {
      badgeText = eventType.includes('approved') || eventType.includes('confirmed') ? 'Confirmed' : 'Sauda';
    }
  }
  // 2. Chat Messages (Route to DealChat)
  else if (isChatDomain) {
    category = 'Deals';
    itemType = 'chat';
    targetScreen = dealId ? 'DealChat' : 'ChatList';
    targetData = {
      dealId,
      conversationId,
      companyId: effectiveCompanyId,
      company: routeContext?.company,
      role: routeContext?.role,
      user: routeContext?.user,
    };
    actionLabel = 'Open Chat';
    badgeText = 'New Message';
    badgeColor = '#EA580C';
    badgeBg = '#FFF7ED';
  }
  // 3. Payments (Route to CompanyPayments or TransactionHistory)
  else if (isPaymentDomain) {
    category = 'Payments';
    itemType = 'payment';
    targetScreen = 'CompanyPayments';
    targetData = {
      companyId: effectiveCompanyId,
      paymentId,
      dealId,
      company: routeContext?.company,
      role: routeContext?.role,
      user: routeContext?.user,
    };
    actionLabel = 'View Payments';
    badgeText = 'Payment';
    badgeColor = '#7C3AED';
    badgeBg = '#F3E8FF';
  }
  // 4. Deliveries (Route to CompanyDeliveries)
  else if (isDeliveryDomain) {
    category = 'Deals';
    itemType = 'delivery';
    targetScreen = 'CompanyDeliveries';
    targetData = {
      companyId: effectiveCompanyId,
      deliveryId,
      dealId,
      company: routeContext?.company,
      role: routeContext?.role,
      user: routeContext?.user,
    };
    actionLabel = 'View Deliveries';
    badgeText = 'Delivery';
    badgeColor = '#059669';
    badgeBg = '#ECFDF5';
  }
  // 5. Onboarding / Verification (Route to CompanyProfileDetails)
  else if (isOnboardDomain) {
    category = 'Alerts';
    itemType = 'system';
    targetScreen = 'CompanyProfileDetails';
    targetData = {
      companyId: effectiveCompanyId,
      company: routeContext?.company,
      role: routeContext?.role,
      user: routeContext?.user,
    };
    actionLabel = 'View Profile';
    badgeText = 'Verified';
    badgeColor = '#059669';
    badgeBg = '#ECFDF5';
  }
  // 6. Projects (Route to ProjectDetails or ProjectsList)
  else if (isProjectDomain) {
    category = 'Alerts';
    itemType = 'system';
    targetScreen = projectId ? 'ProjectDetails' : 'ProjectsList';
    targetData = {
      projectId,
      companyId: effectiveCompanyId,
      company: routeContext?.company,
      role: routeContext?.role,
      user: routeContext?.user,
    };
    actionLabel = 'View Project';
    badgeText = 'Project';
    badgeColor = '#0284C7';
    badgeBg = '#E0F2FE';
  }

  return {
    id: n._id || String(Math.random()),
    rawId: n._id,
    type: itemType,
    category,
    title: title || 'Notification',
    message: message || '',
    timestamp: n.createdAt ? new Date(n.createdAt) : new Date(),
    isRead: Boolean(n.isRead),
    targetScreen,
    targetData,
    actionLabel,
    badgeText,
    badgeColor,
    badgeBg,
    rawItem: n,
    hasEntity: true,
  };
};

const Notifications = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validatingId, setValidatingId] = useState(null);

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
            const mapped = mapBackendNotification(n, currentCompanyId, routeData);
            if (mapped) {
              list.push(mapped);
            }
          });
        }
      } catch (be) {
        console.warn('Backend notification fetch error:', be);
      }

      // Check existence of referenced deals so notifications pointing to deleted/missing deals are NOT shown
      const dealIdsToCheck = [
        ...new Set(
          list
            .filter((item) => item.targetData?.dealId)
            .map((item) => item.targetData.dealId)
        ),
      ];

      if (dealIdsToCheck.length > 0) {
        const dealCheckResults = await Promise.allSettled(
          dealIdsToCheck.map(async (dId) => {
            try {
              const dRes = await getDealDetails(dId, token);
              const dealObj = dRes?.data?.deal || dRes?.data;
              if (dRes && (dRes.success || dRes.statusCode === 200 || dRes.statusCode === 201) && dealObj && (dealObj._id || dealObj.id)) {
                return { dealId: dId, exists: true, deal: dealObj };
              }
              return { dealId: dId, exists: false };
            } catch (err) {
              const status = err?.response?.status || err?.status;
              const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();
              if (status === 404 || msg.includes('not found') || msg.includes('deleted')) {
                return { dealId: dId, exists: false };
              }
              return { dealId: dId, exists: true };
            }
          })
        );

        const invalidDealIds = new Set();
        const dealDataMap = new Map();

        dealCheckResults.forEach((res) => {
          if (res.status === 'fulfilled') {
            if (!res.value.exists) {
              invalidDealIds.add(res.value.dealId);
            } else if (res.value.deal) {
              dealDataMap.set(res.value.dealId, res.value.deal);
            }
          }
        });

        // Filter out notifications whose referenced deal does not exist
        const validatedList = list
          .filter((item) => {
            const dId = item.targetData?.dealId;
            if (dId && invalidDealIds.has(dId)) {
              return false;
            }
            return true;
          })
          .map((item) => {
            const dId = item.targetData?.dealId;
            if (dId && dealDataMap.has(dId)) {
              return {
                ...item,
                targetData: {
                  ...item.targetData,
                  deal: dealDataMap.get(dId),
                },
              };
            }
            return item;
          });

        list.length = 0;
        list.push(...validatedList);
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
  }, [currentCompanyId, routeData]);

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

        socket.on('notification', async (newNotif) => {
          if (!newNotif) return;
          const mapped = mapBackendNotification(newNotif, currentCompanyId, routeData);
          if (!mapped) return;

          // If deal notification, verify existence before displaying
          if (mapped.targetData?.dealId) {
            try {
              const dRes = await getDealDetails(mapped.targetData.dealId, token);
              const dealObj = dRes?.data?.deal || dRes?.data;
              if (!dRes || (!dRes.success && !dealObj) || !dealObj?._id) {
                return;
              }
              mapped.targetData.deal = dealObj;
            } catch (err) {
              const status = err?.response?.status || err?.status;
              const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();
              if (status === 404 || msg.includes('not found') || msg.includes('deleted')) {
                return;
              }
            }
          }

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
  }, [currentCompanyId, routeData]);

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

  const handleNotificationPress = async (item) => {
    if (!item) return;

    // Mark as read in local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    // Mark as read in backend
    if (item.rawId) {
      AsyncStorage.getItem('userToken')
        .then((token) => {
          if (token) markNotificationAsRead(item.rawId, token).catch(() => {});
        })
        .catch(() => {});
    }

    if (!item.targetScreen) {
      return;
    }

    const targetData = { ...(item.targetData || {}) };

    // Verify entity existence before navigation for deals and chat
    if (
      item.targetScreen === 'DealDetails' ||
      item.targetScreen === 'BrokerDealDetails' ||
      item.targetScreen === 'DealChat'
    ) {
      const dealId = targetData.dealId;
      if (!dealId) {
        Alert.alert('Notice', 'No valid deal reference found for this notification.');
        return;
      }

      setValidatingId(item.id);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const dealRes = await getDealDetails(dealId, token);
        const dealObj = dealRes?.data?.deal || dealRes?.data;
        const exists =
          dealRes &&
          (dealRes.success || dealRes.statusCode === 200 || dealRes.statusCode === 201) &&
          dealObj &&
          (dealObj._id || dealObj.id);

        if (!exists) {
          // Entity does not exist: remove notification and alert user
          setNotifications((prev) => prev.filter((n) => n.id !== item.id));
          Alert.alert(
            'Deal Not Available',
            'This deal record does not exist or has been removed.'
          );
          return;
        }

        // Attach populated deal object
        targetData.deal = dealObj;
      } catch (err) {
        const status = err?.response?.status || err?.status;
        const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();
        if (status === 404 || msg.includes('not found') || msg.includes('deleted')) {
          setNotifications((prev) => prev.filter((n) => n.id !== item.id));
          Alert.alert(
            'Deal Not Available',
            'This deal record does not exist or has been removed.'
          );
          return;
        }
      } finally {
        setValidatingId(null);
      }
    }

    // Determine correct fallback routing
    let finalScreen = item.targetScreen;
    if (finalScreen === 'CompanyProfileDetails' && !targetData.companyId) {
      finalScreen = 'Profile';
    } else if (finalScreen === 'CompanyPayments' && !targetData.companyId) {
      finalScreen = 'TransactionHistory';
    } else if (finalScreen === 'CompanyDeliveries' && !targetData.companyId) {
      finalScreen = 'Deliveries';
    }

    onNavigate(finalScreen, targetData);
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
    } else if (item.type === 'chat') {
      iconBg = '#FFF7ED';
      iconColor = '#EA580C';
      IconComponent = MessageSquare;
    } else if (item.type === 'payment') {
      iconBg = '#F3E8FF';
      iconColor = '#7C3AED';
      IconComponent = DollarSign;
    } else if (item.type === 'delivery') {
      iconBg = '#ECFDF5';
      iconColor = '#059669';
      IconComponent = Truck;
    } else if (item.type === 'system') {
      iconBg = '#EEF2FF';
      iconColor = '#4F46E5';
      IconComponent = ShieldCheck;
    }

    const timeAgoStr = formatRelativeTime(item.timestamp);
    const isValidating = validatingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.unreadNotifCard]}
        activeOpacity={0.85}
        disabled={isValidating}
        onPress={() => handleNotificationPress(item)}
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
          {isValidating ? (
            <ActivityIndicator size="small" color="#1A56DB" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => deleteNotification(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color="#94A3B8" />
              </TouchableOpacity>
              {!item.isRead && <View style={styles.unreadDot} />}
            </>
          )}
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
