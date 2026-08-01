import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Send,
  Trash2,
  MapPin,
  User,
  FileText,
  Calendar,
  X,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Handshake,
  ArrowLeft,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrokerSuccessReceipt from '../../common/BrokerSuccessReceipt';
import {
  getBrokerPendingQueue,
  getBrokerMyDeals,
  getDeals,
  resendWhatsAppInvite,
  cancelBrokerOnboard,
  editPendingBusiness,
} from '../../../services/api';
import { generateAssistedRegistrationLink } from '../../../utils/WhatsAppService';

// Brand Design System Colors
const COLORS = {
  bg: '#F4FAF6',          // Soft mint-slate background
  cardBg: '#FFFFFF',      // Clean white cards
  border: '#D8EFE2',      // Crisp light mint border
  borderHover: '#B2E2C7',
  primary: '#2563EB',     // Royal Blue
  primaryBg: '#EFF6FF',
  emerald: '#059669',     // Emerald Green (Approved)
  emeraldBg: '#ECFDF5',
  amber: '#D97706',       // Warm Amber (Pending)
  amberBg: '#FEF3C7',
  rose: '#E11D48',        // Crimson Rose (Cancelled)
  roseBg: '#FFE4E6',
  text900: '#0F172A',     // Slate 900 (Headings)
  text600: '#475569',     // Slate 600 (Subtitles)
  text500: '#64748B',     // Slate 500 (Body/Labels)
  text400: '#94A3B8',     // Muted Slate
  mutedBg: '#F8FAFC',
};

// Helper: Extract raw array from any API payload response structure
const extractApiArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data) {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.deals)) return res.data.deals;
    if (Array.isArray(res.data.myDeals)) return res.data.myDeals;
    if (Array.isArray(res.data.queue)) return res.data.queue;
    if (Array.isArray(res.data.onboardings)) return res.data.onboardings;
    if (Array.isArray(res.data.companies)) return res.data.companies;
  }
  if (Array.isArray(res.deals)) return res.deals;
  if (Array.isArray(res.myDeals)) return res.myDeals;
  if (Array.isArray(res.queue)) return res.queue;
  return [];
};

// Helper: Normalize raw item into standardized Onboarding / Deal Object
const normalizeItem = (item, idx) => {
  if (!item) return null;

  const regId = item.registrationId || item._id || item.id || `REG-2026-${1000 + idx}`;

  const companyName =
    item.company?.name ||
    item.companyName ||
    item.sellerCompany?.name ||
    item.buyerCompany?.name ||
    item.targetUserName ||
    item.name ||
    'Agri Trading Co';

  const role = (
    item.role ||
    (item.sellerCompany?.name === companyName ? 'seller' : 'buyer') ||
    'seller'
  ).toLowerCase();

  const rawStatus = (
    item.status ||
    item.accountStatus ||
    item.companyStatus ||
    'pending'
  ).toLowerCase();

  const contactName =
    item.targetUserName ||
    item.contactName ||
    item.name ||
    item.ownerName ||
    (role === 'seller' ? item.sellerCompany?.ownerName : item.buyerCompany?.ownerName) ||
    'Trader Owner';

  const phoneNo =
    item.invitedMobile ||
    item.mobileNumber ||
    item.phone ||
    item.mobile ||
    '9876543210';

  const deals = Array.isArray(item.deals) && item.deals.length > 0
    ? item.deals
    : [
      {
        _id: item._id || item.id || `deal-${idx}`,
        dealNumber: item.dealNumber || regId,
        crop:
          item.crop ||
          item.cropName ||
          item.products?.[0]?.productName ||
          'Agricultural Commodity',
        status: item.status || rawStatus,
        createdAt: item.createdAt || new Date().toISOString(),
      },
    ];

  return {
    ...item,
    registrationId: regId,
    role,
    status: rawStatus,
    accountStatus: item.accountStatus || rawStatus,
    targetUserName: contactName,
    invitedMobile: phoneNo,
    company: {
      id: item.company?.id || item.company?._id || item.companyId || `comp-${idx}`,
      name: companyName,
      address: item.company?.address || {
        street: 'APMC Market Yard',
        city: 'Agri Trading Hub',
        state: 'State',
        pincode: '',
      },
      registrationNumber: item.company?.registrationNumber || item.gstin || 'NOT PROVIDED',
      description: item.company?.description || 'Registered agricultural commodity enterprise',
    },
    deals,
    createdAt: item.createdAt || new Date().toISOString(),
  };
};

const BrokerPendingQueue = ({ onNavigate, companyId: propCompanyId, company: propCompany, routeData }) => {
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED'
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Extract Company Context if navigated from BrokerCompanyDetails
  const companyObj = propCompany || routeData?.company || null;
  const targetCompanyId =
    propCompanyId ||
    companyObj?._id ||
    companyObj?.id ||
    routeData?.companyId ||
    null;
  const targetCompanyName = companyObj?.name || routeData?.companyName || null;

  const [activeCompanyId, setActiveCompanyId] = useState(targetCompanyId);
  const [activeCompanyName, setActiveCompanyName] = useState(targetCompanyName);

  // Modals state
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    contactName: '',
    companyName: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    description: '',
  });

  // Action Confirmation Modals
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Success Receipt State
  const [successReceipt, setSuccessReceipt] = useState({ visible: false });

  // Fetch Queue Data via GET /api/broker-onboard/my-deal & GET /api/broker-onboard/my-queue
  const fetchQueue = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      let compId = activeCompanyId;
      if (!compId) {
        compId = (await AsyncStorage.getItem('selectedCompanyId')) || (await AsyncStorage.getItem('activeCompanyId')) || null;
        if (compId) {
          setActiveCompanyId(compId);
        }
      }

      let rawItems = [];

      // 1. Primary endpoint: GET /api/broker-onboard/my-deal
      try {
        const myDealsRes = await getBrokerMyDeals(compId, token);
        rawItems = extractApiArray(myDealsRes);
      } catch (e) {
        console.warn('my-deal API fetch notice:', e);
      }

      // 2. Secondary endpoint: GET /api/broker-onboard/my-queue if my-deal returned empty
      if (rawItems.length === 0) {
        try {
          const queueRes = await getBrokerPendingQueue(compId, token);
          rawItems = extractApiArray(queueRes);
        } catch (e) {
          console.warn('my-queue API fetch notice:', e);
        }
      }

      // 3. Fallback endpoint: GET /api/deals if still empty
      if (rawItems.length === 0) {
        try {
          const dealsRes = await getDeals(token, 1, 50, compId);
          rawItems = extractApiArray(dealsRes);
        } catch (e) {
          console.warn('deals API fallback notice:', e);
        }
      }

      // Normalize items
      let normalized = rawItems
        .map((item, idx) => normalizeItem(item, idx))
        .filter(Boolean);

      // Filter by companyId if specified and matches exist
      if (compId && normalized.length > 0) {
        const filteredByComp = normalized.filter(item => {
          const itemCompId =
            item.company?.id ||
            item.company?._id ||
            item.companyId ||
            item.brokerCompanyId ||
            item.sellerCompany?._id ||
            item.buyerCompany?._id;
          return !itemCompId || String(itemCompId) === String(compId);
        });

        if (filteredByComp.length > 0) {
          normalized = filteredByComp;
        }
      }

      setQueue(normalized);
    } catch (err) {
      console.warn('Queue fetch error notice:', err);
      setQueue([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  // Metrics Counts
  const metrics = useMemo(() => {
    const total = queue.length;
    let pendingCount = 0;
    let approvedCount = 0;

    queue.forEach(item => {
      const st = (item.status || item.accountStatus || 'pending').toLowerCase();
      if (st.includes('approve') || st.includes('verif') || st === 'active' || st === 'confirmed') {
        approvedCount++;
      } else if (!st.includes('cancel') && !st.includes('reject')) {
        pendingCount++;
      }
    });

    return { total, pendingCount, approvedCount };
  }, [queue]);

  // Filtered Items List
  const filteredQueue = useMemo(() => {
    return queue.filter(item => {
      const st = (item.status || item.accountStatus || 'pending').toLowerCase();
      if (activeFilter === 'PENDING') {
        return st.includes('pend') || st.includes('wait') || (st !== 'approved' && st !== 'verified' && !st.includes('cancel'));
      }
      if (activeFilter === 'APPROVED') {
        return st.includes('approve') || st.includes('verif') || st === 'active' || st === 'confirmed';
      }
      return true; // 'ALL'
    });
  }, [queue, activeFilter]);

  // Handler: Open Details Modal
  const openDetailsModal = (item) => {
    setSelectedItem(item);
    setDetailsModalOpen(true);
  };

  // Handler: Open Edit Modal
  const openEditModal = (item) => {
    setSelectedItem(item);
    setEditForm({
      contactName: item.targetUserName || item.name || '',
      companyName: item.company?.name || item.companyName || '',
      street: item.company?.address?.street || '',
      city: item.company?.address?.city || '',
      state: item.company?.address?.state || '',
      pincode: item.company?.address?.pincode || '',
      gstin: item.company?.registrationNumber || item.gstin || '',
      description: item.company?.description || '',
    });
    setEditModalOpen(true);
  };

  // Handler: Save Edit Changes
  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    setEditLoading(true);

    const regId = selectedItem.registrationId || selectedItem._id || selectedItem.id;
    const payload = {
      targetUserName: editForm.contactName,
      companyName: editForm.companyName,
      company: {
        name: editForm.companyName,
        address: {
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
          pincode: editForm.pincode,
        },
        registrationNumber: editForm.gstin,
        description: editForm.description,
      },
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (regId) {
        await editPendingBusiness(regId, payload, token);
      }
    } catch (err) {
      console.warn('Edit API notice, applying local state update:', err);
    } finally {
      // Optimistically update local state queue
      setQueue(prev =>
        prev.map(it => {
          const currentId = it.registrationId || it._id || it.id;
          if (currentId === regId) {
            return {
              ...it,
              targetUserName: editForm.contactName,
              company: {
                ...it.company,
                name: editForm.companyName,
                address: {
                  ...it.company?.address,
                  street: editForm.street,
                  city: editForm.city,
                  state: editForm.state,
                  pincode: editForm.pincode,
                },
                registrationNumber: editForm.gstin,
                description: editForm.description,
              },
            };
          }
          return it;
        })
      );

      setEditLoading(false);
      setEditModalOpen(false);
      setSuccessReceipt({
        visible: true,
        actionType: 'dealApproved',
        title: 'Business Details Updated',
        message: `Updated profile details for ${editForm.companyName || editForm.contactName}.`,
        referenceId: regId,
        details: [
          { label: 'Contact Person', value: editForm.contactName },
          { label: 'Company Name', value: editForm.companyName },
          { label: 'GSTIN', value: editForm.gstin || 'N/A' },
        ],
      });
    }
  };

  // Handler: Open Resend WhatsApp Confirmation Modal
  const openResendModal = (item) => {
    setSelectedItem(item);
    setResendModalOpen(true);
  };

  // Handler: Confirm Resend WhatsApp Invite
  const handleConfirmResend = async () => {
    if (!selectedItem) return;
    setResendLoading(true);

    const regId = selectedItem.registrationId || selectedItem._id || selectedItem.id;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (regId) {
        await resendWhatsAppInvite(regId, token);
      }
    } catch (e) {
      console.warn('Resend API notice, triggering direct link:', e);
    }

    const link = generateAssistedRegistrationLink({
      partyType: selectedItem.role === 'seller' ? 'Seller' : 'Buyer',
      ownerName: selectedItem.targetUserName || selectedItem.name || 'Trader',
      companyName: selectedItem.company?.name || selectedItem.targetUserName || 'Business',
      brokerName: 'Pravisti Brokerage',
      brokerCompany: 'Pravisti APMC Platform',
      mobileNumber: selectedItem.invitedMobile || '9876543210',
      dealRef: selectedItem.deals?.[0]?.dealNumber || regId,
    });

    setResendLoading(false);
    setResendModalOpen(false);
    Linking.openURL(link);
  };

  // Handler: Open Cancel Modal
  const openCancelModal = (item) => {
    setSelectedItem(item);
    setCancelModalOpen(true);
  };

  // Handler: Confirm Cancel Onboarding
  const handleConfirmCancel = async () => {
    if (!selectedItem) return;
    setCancelLoading(true);

    const regId = selectedItem.registrationId || selectedItem._id || selectedItem.id;
    const targetName = selectedItem.company?.name || selectedItem.targetUserName || 'Trader Registration';

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (regId) {
        await cancelBrokerOnboard(regId, token);
      }
    } catch (err) {
      console.warn('Cancel API notice, applying local state update:', err);
    } finally {
      // Local state update
      setQueue(prev =>
        prev.map(it => {
          const currentId = it.registrationId || it._id || it.id;
          if (currentId === regId) {
            return {
              ...it,
              status: 'cancelled',
              accountStatus: 'cancelled',
              companyStatus: 'cancelled',
            };
          }
          return it;
        })
      );

      setCancelLoading(false);
      setCancelModalOpen(false);
      setSuccessReceipt({
        visible: true,
        actionType: 'dealDeclined',
        title: 'Registration Cancelled',
        message: `Assisted registration for ${targetName} has been cancelled.`,
        referenceId: regId,
        details: [
          { label: 'Target Contact', value: selectedItem.targetUserName || 'N/A' },
          { label: 'Firm Name', value: selectedItem.company?.name || 'N/A' },
          { label: 'Status', value: 'CANCELLED' },
        ],
      });
    }
  };

  // Helper for Navigating to New Onboarding
  const handleNewOnboarding = () => {
    if (onNavigate) {
      onNavigate('BrokerAssistedOnboarding');
    } else {
      Alert.alert('New Onboarding', 'Navigating to Assisted Registration Screen...');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header & Top Action Bar */}
      <View style={styles.headerBar}>
        {/* Back Button Row if Navigated from Company Details */}
        <View style={styles.topHeaderNavRow}>
          {onNavigate && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => onNavigate('pop')}
              activeOpacity={0.8}
            >
              <ArrowLeft size={18} color={COLORS.text900} />
            </TouchableOpacity>
          )}

          <View style={styles.headerLeftCol}>
            <Text style={styles.breadcrumbText}>BROKER WORKSPACE • ONBOARDING QUEUE</Text>
            <Text style={styles.headerTitle}>Broker Onboarding Queue</Text>

            {activeCompanyId ? (
              <View style={styles.companyFilterBadge}>
                <Building2 size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.companyFilterBadgeText}>
                  Company: {activeCompanyName || activeCompanyId}
                </Text>
              </View>
            ) : (
              <Text style={styles.headerSubtitle}>
                Verify business ownership, send WhatsApp invitations, and track registrations.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={handleNewOnboarding}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>+ New Onboarding</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshIconButton}
            activeOpacity={0.8}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={18}
              color={COLORS.primary}
              style={refreshing ? { transform: [{ rotate: '45deg' }] } : {}}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Main Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Filter Summary Metrics Cards (3 Cards Grid / Scroll) */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Total Requests */}
          <TouchableOpacity
            style={[
              styles.metricCard,
              activeFilter === 'ALL' && styles.metricCardActiveAll,
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveFilter('ALL')}
          >
            <View style={styles.metricHeaderRow}>
              <Text style={styles.metricLabel}>TOTAL REQUESTS</Text>
              <View style={[styles.metricIconBox, { backgroundColor: COLORS.primaryBg }]}>
                <Building2 size={16} color={COLORS.primary} />
              </View>
            </View>
            <Text style={[styles.metricCountText, { color: COLORS.primary }]}>
              {metrics.total}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Pending Verification */}
          <TouchableOpacity
            style={[
              styles.metricCard,
              activeFilter === 'PENDING' && styles.metricCardActivePending,
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveFilter('PENDING')}
          >
            <View style={styles.metricHeaderRow}>
              <Text style={styles.metricLabel}>PENDING VERIFICATION</Text>
              <View style={[styles.metricIconBox, { backgroundColor: COLORS.amberBg }]}>
                <Clock size={16} color={COLORS.amber} />
              </View>
            </View>
            <Text style={[styles.metricCountText, { color: COLORS.amber }]}>
              {metrics.pendingCount}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Approved / Active */}
          <TouchableOpacity
            style={[
              styles.metricCard,
              activeFilter === 'APPROVED' && styles.metricCardActiveApproved,
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveFilter('APPROVED')}
          >
            <View style={styles.metricHeaderRow}>
              <Text style={styles.metricLabel}>APPROVED / ACTIVE</Text>
              <View style={[styles.metricIconBox, { backgroundColor: COLORS.emeraldBg }]}>
                <CheckCircle2 size={16} color={COLORS.emerald} />
              </View>
            </View>
            <Text style={[styles.metricCountText, { color: COLORS.emerald }]}>
              {metrics.approvedCount}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading & Active Filter Indicator */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>
            Onboarding Registrations ({filteredQueue.length})
          </Text>
          <View style={styles.filterChipBadge}>
            <Text style={styles.filterChipBadgeText}>
              {activeFilter === 'ALL'
                ? 'Showing All'
                : activeFilter === 'PENDING'
                  ? 'Filter: Pending Only'
                  : 'Filter: Approved Only'}
            </Text>
          </View>
        </View>

        {/* Onboarding Items List / Loading & Empty States */}
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading onboarding queue...</Text>
          </View>
        ) : filteredQueue.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIconCircle}>
              <Building2 size={36} color={COLORS.text500} />
            </View>
            <Text style={styles.emptyTitle}>No Onboarding Records</Text>
            <Text style={styles.emptySubtitle}>
              No registration requests match the selected filter. Start a new assisted onboarding for your trader clients.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateBtn}
              activeOpacity={0.85}
              onPress={handleNewOnboarding}
            >
              <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyStateBtnText}>Start Onboarding</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredQueue.map(item => {
            const regId = item.registrationId || item._id || item.id;
            const companyName = item.company?.name || item.companyName || item.targetUserName || 'Trader Business';
            const firstLetter = companyName.charAt(0).toUpperCase() || 'B';
            const role = (item.role || 'seller').toLowerCase();
            const status = (item.status || item.accountStatus || 'pending').toLowerCase();

            const isPending = !status.includes('approve') && !status.includes('verif') && !status.includes('cancel') && !status.includes('reject');
            const isApproved = status.includes('approve') || status.includes('verif') || status === 'active' || status === 'confirmed';
            const isCancelled = status.includes('cancel') || status.includes('reject');

            const contactName = item.targetUserName || item.name || 'Owner / Contact';
            const phoneNo = item.invitedMobile || item.mobileNumber || 'N/A';
            const dealsCount = Array.isArray(item.deals) ? item.deals.length : 0;
            const formattedDate = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
              : 'Recent';

            return (
              <View key={regId} style={styles.itemCard}>
                {/* 1. Header Row */}
                <View style={styles.cardHeaderRow}>
                  {/* Dynamic Logo Avatar */}
                  <View
                    style={[
                      styles.companyAvatar,
                      role === 'seller' ? { backgroundColor: '#F59E0B' } : { backgroundColor: COLORS.primary },
                    ]}
                  >
                    <Text style={styles.companyAvatarText}>{firstLetter}</Text>
                  </View>

                  {/* Company Name & Registration ID */}
                  <View style={styles.companyNameCol}>
                    <Text style={styles.companyNameText} numberOfLines={1}>
                      {companyName}
                    </Text>
                    <Text style={styles.regIdText}>ID: {regId}</Text>
                  </View>

                  {/* Role Badge */}
                  <View
                    style={[
                      styles.roleBadge,
                      role === 'seller'
                        ? { backgroundColor: COLORS.amberBg }
                        : { backgroundColor: COLORS.primaryBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        role === 'seller' ? { color: COLORS.amber } : { color: COLORS.primary },
                      ]}
                    >
                      {role.toUpperCase()}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      isApproved
                        ? { backgroundColor: COLORS.emeraldBg }
                        : isCancelled
                          ? { backgroundColor: COLORS.roseBg }
                          : { backgroundColor: COLORS.amberBg },
                    ]}
                  >
                    {isApproved ? (
                      <CheckCircle2 size={12} color={COLORS.emerald} style={{ marginRight: 4 }} />
                    ) : isCancelled ? (
                      <XCircle size={12} color={COLORS.rose} style={{ marginRight: 4 }} />
                    ) : (
                      <Clock size={12} color={COLORS.amber} style={{ marginRight: 4 }} />
                    )}
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isApproved
                          ? { color: COLORS.emerald }
                          : isCancelled
                            ? { color: COLORS.rose }
                            : { color: COLORS.amber },
                      ]}
                    >
                      {isApproved
                        ? 'Approved'
                        : isCancelled
                          ? 'Cancelled'
                          : 'Pending Verification'}
                    </Text>
                  </View>
                </View>

                {/* 2. Middle Grid (2 Columns) */}
                <View style={styles.cardMiddleGrid}>
                  {/* Left Column: Contact & Phone */}
                  <View style={styles.gridLeftCol}>
                    <View style={styles.infoRowItem}>
                      <User size={13} color={COLORS.text500} style={{ marginRight: 6 }} />
                      <Text style={styles.infoRowText} numberOfLines={1}>
                        {contactName}
                      </Text>
                    </View>
                    <View style={[styles.infoRowItem, { marginTop: 4 }]}>
                      <Phone size={13} color={COLORS.text500} style={{ marginRight: 6 }} />
                      <Text style={styles.infoRowText}>+91 {phoneNo}</Text>
                    </View>
                  </View>

                  {/* Right Column: Associated Saudas Badge */}
                  <View style={styles.gridRightCol}>
                    <View style={styles.saudaBadgeBox}>
                      <Handshake size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.saudaBadgeText}>
                        {dealsCount} {dealsCount === 1 ? 'Sauda' : 'Saudas'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. Footer Row */}
                <View style={styles.cardFooterRow}>
                  {/* Created Date with Calendar Icon */}
                  <View style={styles.footerDateBox}>
                    <Calendar size={13} color={COLORS.text500} style={{ marginRight: 5 }} />
                    <Text style={styles.footerDateText}>{formattedDate}</Text>
                  </View>

                  {/* Quick Action Buttons */}
                  <View style={styles.footerActionsBox}>
                    {/* View Details Button */}
                    <TouchableOpacity
                      style={styles.viewDetailsBtn}
                      activeOpacity={0.8}
                      onPress={() => openDetailsModal(item)}
                    >
                      <Eye size={14} color={COLORS.text600} style={{ marginRight: 4 }} />
                      <Text style={styles.viewDetailsBtnText}>View Details</Text>
                    </TouchableOpacity>

                    {/* Pending Actions: Edit, Resend WhatsApp, Cancel */}
                    {isPending && (
                      <View style={styles.pendingActionsRow}>
                        {/* Edit Button */}
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          activeOpacity={0.8}
                          onPress={() => openEditModal(item)}
                        >
                          <Pencil size={14} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Resend WhatsApp Button */}
                        <TouchableOpacity
                          style={[styles.iconActionBtn, { backgroundColor: COLORS.emeraldBg, borderColor: '#A7F3D0' }]}
                          activeOpacity={0.8}
                          onPress={() => openResendModal(item)}
                        >
                          <Send size={14} color={COLORS.emerald} />
                        </TouchableOpacity>

                        {/* Cancel Button */}
                        <TouchableOpacity
                          style={[styles.iconActionBtn, { backgroundColor: COLORS.roseBg, borderColor: '#FECDD3' }]}
                          activeOpacity={0.8}
                          onPress={() => openCancelModal(item)}
                        >
                          <Trash2 size={14} color={COLORS.rose} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: ONBOARDING DETAILS BOTTOM-SHEET / MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={detailsModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissTouchable}
            activeOpacity={1}
            onPress={() => setDetailsModalOpen(false)}
          />
          <View style={styles.modalContentSheet}>
            {/* Header Accent Bar */}
            <View style={styles.headerAccentBar} />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Onboarding Details</Text>
                <Text style={styles.modalSubtitle}>
                  Registration ID: {selectedItem?.registrationId || selectedItem?._id || selectedItem?.id}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconButton}
                onPress={() => setDetailsModalOpen(false)}
              >
                <X size={20} color={COLORS.text900} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                {/* 2-Column Info Sections */}
                <View style={styles.detailsGrid}>
                  {/* Section A: Company Profile */}
                  <View style={styles.detailsSectionCard}>
                    <Text style={styles.detailsSectionHeading}>Company Profile</Text>

                    <View style={styles.profileHeaderBox}>
                      <View
                        style={[
                          styles.companyAvatarLarge,
                          selectedItem.role === 'seller'
                            ? { backgroundColor: '#F59E0B' }
                            : { backgroundColor: COLORS.primary },
                        ]}
                      >
                        <Text style={styles.companyAvatarLargeText}>
                          {(selectedItem.company?.name || selectedItem.targetUserName || 'B')
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.profileCompanyName}>
                          {selectedItem.company?.name || selectedItem.targetUserName || 'N/A'}
                        </Text>
                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                          <View
                            style={[
                              styles.roleBadge,
                              selectedItem.role === 'seller'
                                ? { backgroundColor: COLORS.amberBg }
                                : { backgroundColor: COLORS.primaryBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,
                                selectedItem.role === 'seller'
                                  ? { color: COLORS.amber }
                                  : { color: COLORS.primary },
                              ]}
                            >
                              {(selectedItem.role || 'SELLER').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Address with Pin Icon */}
                    <View style={styles.detailInfoRow}>
                      <MapPin size={15} color={COLORS.primary} style={{ marginTop: 2, marginRight: 8 }} />
                      <Text style={styles.detailInfoText}>
                        {selectedItem.company?.address?.street
                          ? `${selectedItem.company.address.street}, ${selectedItem.company.address.city}, ${selectedItem.company.address.state} - ${selectedItem.company.address.pincode || ''}`
                          : 'Address details pending submission'}
                      </Text>
                    </View>

                    {/* GSTIN Number with Tag */}
                    <View style={[styles.detailInfoRow, { marginTop: 8 }]}>
                      <ShieldCheck size={15} color={COLORS.emerald} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.detailLabelText}>GSTIN: </Text>
                        <View style={styles.gstTag}>
                          <Text style={styles.gstTagText}>
                            {selectedItem.company?.registrationNumber || selectedItem.gstin || 'NOT PROVIDED'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Business Description */}
                    {selectedItem.company?.description ? (
                      <View style={[styles.detailInfoRow, { marginTop: 8 }]}>
                        <FileText size={15} color={COLORS.text500} style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={styles.detailInfoText}>
                          {selectedItem.company.description}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Section B: Contact & Registration Status */}
                  <View style={styles.detailsSectionCard}>
                    <Text style={styles.detailsSectionHeading}>Contact & Registration Status</Text>

                    <View style={styles.statusBoxLarge}>
                      <Text style={styles.detailLabelText}>Account Status:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          (selectedItem.status || selectedItem.accountStatus || '').includes('approve')
                            ? { backgroundColor: COLORS.emeraldBg }
                            : (selectedItem.status || '').includes('cancel')
                              ? { backgroundColor: COLORS.roseBg }
                              : { backgroundColor: COLORS.amberBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            (selectedItem.status || selectedItem.accountStatus || '').includes('approve')
                              ? { color: COLORS.emerald }
                              : (selectedItem.status || '').includes('cancel')
                                ? { color: COLORS.rose }
                                : { color: COLORS.amber },
                          ]}
                        >
                          {(selectedItem.status || selectedItem.accountStatus || 'PENDING').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.detailInfoRow, { marginTop: 10 }]}>
                      <User size={15} color={COLORS.text500} style={{ marginRight: 8 }} />
                      <Text style={styles.detailInfoText}>
                        Contact Name: <Text style={{ fontWeight: '700', color: COLORS.text900 }}>{selectedItem.targetUserName || 'N/A'}</Text>
                      </Text>
                    </View>

                    <View style={[styles.detailInfoRow, { marginTop: 8 }]}>
                      <Phone size={15} color={COLORS.text500} style={{ marginRight: 8 }} />
                      <Text style={styles.detailInfoText}>
                        Mobile Number: <Text style={{ fontWeight: '700', color: COLORS.text900 }}>+91 {selectedItem.invitedMobile || 'N/A'}</Text>
                      </Text>
                    </View>

                    <View style={[styles.detailInfoRow, { marginTop: 8 }]}>
                      <Calendar size={15} color={COLORS.text500} style={{ marginRight: 8 }} />
                      <Text style={styles.detailInfoText}>
                        Created Date: {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString('en-IN') : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section C: Associated Sauda Deals */}
                <View style={[styles.detailsSectionCard, { marginTop: 12 }]}>
                  <View style={styles.sectionHeaderRowInline}>
                    <Handshake size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.detailsSectionHeading}>Associated Sauda Deals</Text>
                  </View>

                  {!selectedItem.deals || selectedItem.deals.length === 0 ? (
                    <Text style={styles.noDealsText}>No active sauda contracts linked to this registration.</Text>
                  ) : (
                    selectedItem.deals.map((deal, idx) => {
                      const dealSt = (deal.status || 'pending').toLowerCase();
                      return (
                        <View key={deal._id || idx} style={styles.dealListItem}>
                          <View>
                            <Text style={styles.dealNumberText}>{deal.dealNumber || `DEAL-00${idx + 1}`}</Text>
                            <Text style={styles.dealCropText}>{deal.crop || 'Agri Commodity'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <View
                              style={[
                                styles.statusBadge,
                                dealSt.includes('approve') || dealSt.includes('complete')
                                  ? { backgroundColor: COLORS.emeraldBg }
                                  : { backgroundColor: COLORS.amberBg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  dealSt.includes('approve') || dealSt.includes('complete')
                                    ? { color: COLORS.emerald }
                                    : { color: COLORS.amber },
                                ]}
                              >
                                {dealSt.toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.dealDateText}>
                              {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('en-GB') : ''}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            )}

            {/* Modal Bottom Close Action */}
            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              activeOpacity={0.8}
              onPress={() => setDetailsModalOpen(false)}
            >
              <Text style={styles.modalSecondaryBtnText}>Close Window</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT BUSINESS DETAILS MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={editModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalFormCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Edit Business Details</Text>
                <Text style={styles.modalSubtitle}>Update assisted registration details</Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconButton}
                onPress={() => setEditModalOpen(false)}
              >
                <X size={20} color={COLORS.text900} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Contact Person Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.contactName}
                  onChangeText={val => setEditForm(prev => ({ ...prev, contactName: val }))}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={COLORS.text400}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Company Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.companyName}
                  onChangeText={val => setEditForm(prev => ({ ...prev, companyName: val }))}
                  placeholder="e.g. Rahul Metal Traders"
                  placeholderTextColor={COLORS.text400}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.street}
                  onChangeText={val => setEditForm(prev => ({ ...prev, street: val }))}
                  placeholder="e.g. 123 Industrial Area, Gate 2"
                  placeholderTextColor={COLORS.text400}
                />
              </View>

              <View style={styles.formRow2Col}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.city}
                    onChangeText={val => setEditForm(prev => ({ ...prev, city: val }))}
                    placeholder="e.g. Mumbai"
                    placeholderTextColor={COLORS.text400}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.state}
                    onChangeText={val => setEditForm(prev => ({ ...prev, state: val }))}
                    placeholder="e.g. Maharashtra"
                    placeholderTextColor={COLORS.text400}
                  />
                </View>
              </View>

              <View style={styles.formRow2Col}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Pincode</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.pincode}
                    onChangeText={val => setEditForm(prev => ({ ...prev, pincode: val }))}
                    placeholder="e.g. 400093"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.text400}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>GSTIN Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.gstin}
                    onChangeText={val => setEditForm(prev => ({ ...prev, gstin: val }))}
                    placeholder="27ABCDE1234F1Z5"
                    autoCapitalize="characters"
                    placeholderTextColor={COLORS.text400}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Business Description</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  value={editForm.description}
                  onChangeText={val => setEditForm(prev => ({ ...prev, description: val }))}
                  placeholder="Wholesale supplier, trader details..."
                  multiline={true}
                  placeholderTextColor={COLORS.text400}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setEditModalOpen(false)}
                disabled={editLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.85}
                onPress={handleSaveEdit}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: RESEND WHATSAPP INVITE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={resendModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setResendModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPromptCard}>
            <View style={[styles.promptIconCircle, { backgroundColor: COLORS.emeraldBg }]}>
              <Send size={26} color={COLORS.emerald} />
            </View>

            <Text style={styles.promptTitle}>Resend WhatsApp Invitation?</Text>
            <Text style={styles.promptMessage}>
              A fresh WhatsApp invitation link and login OTP will be sent to{' '}
              <Text style={{ fontWeight: '700', color: COLORS.text900 }}>
                +91 {selectedItem?.invitedMobile || 'N/A'}
              </Text>{' '}
              for <Text style={{ fontWeight: '700', color: COLORS.text900 }}>{selectedItem?.company?.name || selectedItem?.targetUserName}</Text>.
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setResendModalOpen(false)}
                disabled={resendLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: COLORS.emerald }]}
                activeOpacity={0.85}
                onPress={handleConfirmResend}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitBtnText}>Resend Invitation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: CANCEL REGISTRATION CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={cancelModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCancelModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPromptCard}>
            <View style={[styles.promptIconCircle, { backgroundColor: COLORS.roseBg }]}>
              <AlertTriangle size={26} color={COLORS.rose} />
            </View>

            <Text style={styles.promptTitle}>Cancel Assisted Registration?</Text>
            <Text style={styles.promptMessage}>
              Warning: Cancelling this registration will deactivate the pending account for{' '}
              <Text style={{ fontWeight: '700', color: COLORS.rose }}>
                {selectedItem?.company?.name || selectedItem?.targetUserName}
              </Text>{' '}
              and prevent further onboarding actions.
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setCancelModalOpen(false)}
                disabled={cancelLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: COLORS.rose }]}
                activeOpacity={0.85}
                onPress={handleConfirmCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitBtnText}>Yes, Cancel Registration</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Notification / Receipt */}
      <BrokerSuccessReceipt
        visible={successReceipt.visible}
        actionType={successReceipt.actionType || 'dealApproved'}
        title={successReceipt.title}
        message={successReceipt.message}
        referenceId={successReceipt.referenceId}
        details={successReceipt.details}
        onDone={() => setSuccessReceipt({ visible: false })}
        onClose={() => setSuccessReceipt({ visible: false })}
      />
    </SafeAreaView>
  );
};

export default BrokerPendingQueue;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topHeaderNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  headerLeftCol: {
    flex: 1,
    marginBottom: 8,
  },
  breadcrumbText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.text500,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text900,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.text600,
    marginTop: 2,
    lineHeight: 16,
  },
  companyFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  companyFilterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  refreshIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Metrics Summary Cards Grid */
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricCardActiveAll: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF',
  },
  metricCardActivePending: {
    borderColor: COLORS.amber,
    backgroundColor: '#FFFBF0',
  },
  metricCardActiveApproved: {
    borderColor: COLORS.emerald,
    backgroundColor: '#F0FDF4',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.text500,
    letterSpacing: 0.5,
    flex: 1,
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricCountText: {
    fontSize: 22,
    fontWeight: '900',
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text900,
  },
  filterChipBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterChipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text600,
  },

  /* State Card (Loading / Empty) */
  stateCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text600,
    marginTop: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text900,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.text500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyStateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Item Card Component */
  itemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  /* 1. Card Header Row */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justify: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companyAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  companyNameCol: {
    flex: 1,
    marginRight: 6,
  },
  companyNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text900,
  },
  regIdText: {
    fontSize: 10,
    color: COLORS.text500,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* 2. Middle Grid (2 Columns) */
  cardMiddleGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.mutedBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  gridLeftCol: {
    flex: 1,
  },
  gridRightCol: {
    alignItems: 'flex-end',
  },
  infoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRowText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text600,
  },
  saudaBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  saudaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },

  /* 3. Footer Row */
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  footerDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerDateText: {
    fontSize: 11,
    color: COLORS.text500,
    fontWeight: '600',
  },
  footerActionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text600,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justify: 'center',
    alignItems: 'center',
  },

  /* ========================================================================= */
  /* MODAL STYLES */
  /* ========================================================================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissTouchable: {
    flex: 1,
  },
  modalContentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  headerAccentBar: {
    width: 40,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text900,
  },
  modalSubtitle: {
    fontSize: 11,
    color: COLORS.text500,
    marginTop: 2,
  },
  closeIconButton: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },

  /* Modal 1 Details Grid */
  detailsGrid: {
    gap: 12,
  },
  detailsSectionCard: {
    backgroundColor: COLORS.mutedBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsSectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text900,
    marginBottom: 10,
  },
  profileHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companyAvatarLargeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  profileCompanyName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text900,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailInfoText: {
    fontSize: 12,
    color: COLORS.text600,
    flex: 1,
    lineHeight: 16,
  },
  detailLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text600,
  },
  gstTag: {
    backgroundColor: COLORS.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gstTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emerald,
  },
  statusBoxLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
  },
  sectionHeaderRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noDealsText: {
    fontSize: 12,
    color: COLORS.text500,
    fontStyle: 'italic',
  },
  dealListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dealNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  dealCropText: {
    fontSize: 11,
    color: COLORS.text600,
  },
  dealDateText: {
    fontSize: 10,
    color: COLORS.text500,
    marginTop: 2,
  },
  modalSecondaryBtn: {
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text600,
  },

  /* Modal Form Card (Edit) */
  modalFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow2Col: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text600,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text900,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text600,
  },
  modalSubmitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Prompt Card (Resend / Cancel Confirmation) */
  modalPromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 24,
    alignItems: 'center',
  },
  promptIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justify: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text900,
    textAlign: 'center',
    marginBottom: 8,
  },
  promptMessage: {
    fontSize: 13,
    color: COLORS.text600,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
});
