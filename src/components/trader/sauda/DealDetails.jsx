import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  FileText,
  CreditCard,
  ChevronRight,
  Check,
  CircleAlert as AlertCircle,
  Clock,
  Briefcase,
  CheckCircle,
  XCircle,
  Share2,
  Edit3,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  Box,
  Percent,
  Calendar,
  User,
  Building2,
} from 'lucide-react-native';
import {
  getDealDetails,
  acceptDeal,
  rejectDeal,
  updateDealStatus,
  getUserProfile,
  recordPayment,
  getPayments,
  getPaymentDashboard,
  updatePaymentStatus,
  getDeliveries,
  updateDeliveryStatus,
} from '../../../services/api';

// Design Tokens Palette
const COLORS = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  navy: '#172554',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  textPrimary: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E5E7EB',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  infoBg: '#EFF6FF',
};

// Reusable Presentational Components
const SectionHeader = ({ title, actionText, onAction }) => (
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionHeading}>{title}</Text>
    {actionText && onAction ? (
      <TouchableOpacity onPress={onAction} accessibilityRole="button">
        <Text style={styles.sectionActionText}>{actionText}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const InfoRow = ({ label, value, valueColor = COLORS.textPrimary, numberOfLines = 1 }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoRowLabel}>{label}</Text>
    <Text style={[styles.infoRowVal, { color: valueColor }]} numberOfLines={numberOfLines}>
      {value}
    </Text>
  </View>
);

const StatusBadge = ({ label, type = 'info' }) => {
  let bg = COLORS.infoBg;
  let text = COLORS.primary;
  if (type === 'success') {
    bg = COLORS.successBg;
    text = COLORS.success;
  } else if (type === 'warning') {
    bg = COLORS.warningBg;
    text = COLORS.warning;
  } else if (type === 'error') {
    bg = COLORS.errorBg;
    text = COLORS.error;
  } else if (type === 'muted') {
    bg = '#F1F5F9';
    text = COLORS.textSecondary;
  }
  return (
    <View style={[styles.badgeContainer, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
};

const ProgressBar = ({ progress = 0, color = COLORS.success }) => {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <View style={styles.progressBarTrack}>
      <View style={[styles.progressBarFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
};

const EmptyState = ({ title, message, actionLabel, onAction }) => (
  <View style={styles.emptyStateBox}>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateMsg}>{message}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity style={styles.emptyStateBtn} onPress={onAction} accessibilityRole="button">
        <Text style={styles.emptyStateBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const DealDetails = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = React.useState(!routeData?.deal);
  const [deal, setDeal] = React.useState(routeData?.deal || null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState(null);
  const [currentUserCompanyIds, setCurrentUserCompanyIds] = React.useState([]);

  // Payment Tracking State
  const [paymentSummary, setPaymentSummary] = React.useState(null);
  const [paymentsHistory, setPaymentsHistory] = React.useState([]);
  const [deliveriesHistory, setDeliveriesHistory] = React.useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(false);
  const [isDeliveriesLoading, setIsDeliveriesLoading] = React.useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = React.useState(false);

  // Payment Logging Modal State
  const [isPaymentModalVisible, setIsPaymentModalVisible] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentType, setPaymentType] = React.useState('sent');
  const [paymentMethod, setPaymentMethod] = React.useState('UPI');
  const [paymentNotes, setPaymentNotes] = React.useState('');
  const [isLoggingPayment, setIsLoggingPayment] = React.useState(false);

  // GST Breakdown Modal State
  const [isGstModalVisible, setIsGstModalVisible] = React.useState(false);

  // Fetch current user identity once on mount
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const response = await getUserProfile(token);
        if (response && response.success && response.data) {
          const user = response.data;
          setCurrentUserId(user._id || user.id);
          const companyIds = (user.companies || []).map((c) =>
            String(c._id || c.id || c)
          );
          setCurrentUserCompanyIds(companyIds);
        }
      } catch (e) {
        console.warn('Failed to fetch current user:', e);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchDealDetails = React.useCallback(async () => {
    const passedDeal = routeData?.deal;
    if (passedDeal) {
      setDeal(passedDeal);
    }
    const id = passedDeal?._id || routeData?.dealId || passedDeal?.id;
    if (!id) {
      setIsLoading(false);
      return;
    }

    const isValidObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await getDealDetails(id, token);
      if (response && response.success && response.data) {
        setDeal(response.data);
      }
    } catch (error) {
      console.warn('Error fetching deal details API, using passed deal fallback:', error);
    } finally {
      setIsLoading(false);
    }
  }, [routeData]);

  React.useEffect(() => {
    fetchDealDetails();
  }, [fetchDealDetails]);

  const fetchPaymentData = React.useCallback(async () => {
    const id = routeData?.dealId || routeData?.deal?._id || (deal && deal._id);
    if (!id || !deal) return;

    const statusLower = String(deal?.status || '').toLowerCase();
    const isApprovedOrCompleted = statusLower === 'approved' || statusLower === 'completed';
    if (!isApprovedOrCompleted) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const normalizeId = (val) => String(val?._id || val?.id || val || '');
      const sCid = normalizeId(deal.sellerCompanyId);
      const bCid = normalizeId(deal.buyerCompanyId);
      const brCid = normalizeId(deal.brokerCompanyId);

      const vRole = deal.viewerRole || deal.currentUserRole || '';
      const cUserRole = deal.currentUserRole || vRole;

      const isS =
        cUserRole === 'seller' ||
        vRole === 'seller' ||
        currentUserCompanyIds.some(
          (cid) => cid && String(cid).toLowerCase() === String(sCid).toLowerCase()
        );
      const isB =
        cUserRole === 'buyer' ||
        vRole === 'buyer' ||
        currentUserCompanyIds.some(
          (cid) => cid && String(cid).toLowerCase() === String(bCid).toLowerCase()
        );
      const isBr =
        cUserRole === 'broker' ||
        vRole === 'broker' ||
        (!!brCid &&
          currentUserCompanyIds.some(
            (cid) => cid && String(cid).toLowerCase() === String(brCid).toLowerCase()
          ));

      const myCompanyId = isS
        ? sCid
        : isB
          ? bCid
          : isBr
            ? brCid
            : currentUserCompanyIds[0] || '';

      setIsDashboardLoading(true);
      setIsHistoryLoading(true);
      setIsDeliveriesLoading(true);

      const [dashRes, histRes, delivRes] = await Promise.all([
        getPaymentDashboard(myCompanyId, id, token).catch((e) => {
          console.warn(e);
          return null;
        }),
        getPayments({ dealId: id, companyId: myCompanyId, limit: 50 }, token).catch((e) => {
          console.warn(e);
          return null;
        }),
        getDeliveries({ dealId: id, limit: 50 }, token).catch((e) => {
          console.warn(e);
          return null;
        }),
      ]);

      if (dashRes && dashRes.success) {
        setPaymentSummary(dashRes.data);
      }
      if (histRes && histRes.success) {
        setPaymentsHistory(
          histRes.data?.data ||
          histRes.data?.payments ||
          (Array.isArray(histRes.data) ? histRes.data : [])
        );
      }
      if (delivRes && delivRes.success) {
        setDeliveriesHistory(
          delivRes.data?.data ||
          delivRes.data?.deliveries ||
          (Array.isArray(delivRes.data) ? delivRes.data : [])
        );
      }
    } catch (e) {
      console.warn('Failed to load payment data:', e);
    } finally {
      setIsDashboardLoading(false);
      setIsHistoryLoading(false);
      setIsDeliveriesLoading(false);
    }
  }, [deal, currentUserCompanyIds, routeData]);

  React.useEffect(() => {
    if (deal && currentUserCompanyIds.length > 0) {
      fetchPaymentData();
    }
  }, [deal, currentUserCompanyIds, fetchPaymentData]);

  const handleAcceptDeal = async () => {
    setIsUpdating(true);
    try {
      const id = deal?._id || routeData?.dealId;
      const role =
        deal?.currentUserRole ||
        (isSeller ? 'seller' : isBuyer ? 'buyer' : isBroker ? 'broker' : '');
      const token = await AsyncStorage.getItem('userToken');
      const response = await acceptDeal(id, role, token);
      if (response && response.success) {
        Alert.alert('Success', 'Deal approved successfully', [
          { text: 'OK', onPress: () => fetchDealDetails() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to approve deal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectDeal = async () => {
    Alert.alert(
      'Decline Deal',
      'Are you sure you want to decline this trade agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const id = deal?._id || routeData?.dealId;
              const role =
                deal?.currentUserRole ||
                (isSeller ? 'seller' : isBuyer ? 'buyer' : isBroker ? 'broker' : '');
              const token = await AsyncStorage.getItem('userToken');
              const response = await rejectDeal(
                id,
                role,
                'Deal terms not acceptable',
                token
              );
              if (response && response.success) {
                Alert.alert('Success', 'Agreement declined successfully', [
                  { text: 'OK', onPress: () => fetchDealDetails() },
                ]);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to decline deal');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const openPaymentModal = () => {
    setPaymentType(isBuyer ? 'sent' : isSeller ? 'received' : 'sent');
    setPaymentAmount('');
    setPaymentMethod('UPI');
    setPaymentNotes('');
    setIsPaymentModalVisible(true);
  };

  const handleLogPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than 0.');
      return;
    }

    const statusLower = String(deal?.status || '').toLowerCase();
    if (statusLower !== 'approved') {
      Alert.alert('Validation Error', 'Payments can only be added to approved deals.');
      return;
    }

    const remainingPayable =
      Number(
        paymentSummary
          ? isSeller
            ? paymentSummary.totalPendingToReceive
            : paymentSummary.totalPendingToPay
          : deal.totalAmount || 0
      ) || 0;
    if (amt > remainingPayable) {
      Alert.alert(
        'Validation Error',
        `Amount cannot exceed the remaining balance of ₹${remainingPayable.toLocaleString(
          'en-IN'
        )}`
      );
      return;
    }

    setIsLoggingPayment(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: deal._id,
        amount: amt,
        paymentType,
        paymentMethod,
        notes: paymentNotes || undefined,
      };

      const res = await recordPayment(payload, token);
      if (res && res.success) {
        Alert.alert('Success', 'Payment entry logged successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setIsPaymentModalVisible(false);
              fetchPaymentData();
              fetchDealDetails();
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Logging Failed', err.message || 'Failed to record payment');
    } finally {
      setIsLoggingPayment(false);
    }
  };

  const canVerifyPayment = (pmt) => {
    if (!pmt || pmt.status !== 'pending') return false;
    const isBuyerCreated = pmt.paymentType === 'sent' || pmt.paymentType === 'given';
    if (isBuyerCreated && isSeller) return true;
    const isSellerCreated = pmt.paymentType === 'received';
    if (isSellerCreated && isBuyer) return true;
    return false;
  };

  const handleUpdatePaymentStatus = async (paymentId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsUpdating(true);
      const res = await updatePaymentStatus(paymentId, status, token);
      if (res && res.success) {
        Alert.alert(
          'Success',
          `Payment request has been ${status === 'approved' ? 'approved' : 'rejected'}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                fetchPaymentData();
                fetchDealDetails();
              },
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        'Failed to update status',
        err.message || 'Failed to update payment status'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmPaymentStatusChange = (pmt, status) => {
    Alert.alert(
      `${status === 'approved' ? 'Approve' : 'Reject'} Payment`,
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'
      } this payment entry of ₹${Number(pmt.amount).toLocaleString('en-IN')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => handleUpdatePaymentStatus(pmt._id || pmt.id, status),
        },
      ]
    );
  };

  const canVerifyDelivery = (deliv) => {
    if (!deliv || deliv.status !== 'pending') return false;
    if (deliv.deliveryType === 'sent' && isBuyer) return true;
    if (deliv.deliveryType === 'received' && isSeller) return true;
    return false;
  };

  const handleUpdateDeliveryStatus = async (deliveryId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsUpdating(true);
      const res = await updateDeliveryStatus(deliveryId, status, token);
      if (res && res.success) {
        Alert.alert(
          'Success',
          `Delivery request has been ${status === 'approved' ? 'approved' : 'rejected'}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                fetchPaymentData();
                fetchDealDetails();
              },
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        'Failed to update status',
        err.message || 'Failed to update delivery status'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDeliveryStatusChange = (deliv, status) => {
    Alert.alert(
      `${status === 'approved' ? 'Approve' : 'Reject'} Delivery`,
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'
      } this delivery entry of ${deliv.quantity} MT?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => handleUpdateDeliveryStatus(deliv._id || deliv.id, status),
        },
      ]
    );
  };

  const combinedHistory = React.useMemo(() => {
    const list = [];
    if (paymentsHistory && Array.isArray(paymentsHistory)) {
      paymentsHistory.forEach((pmt) => {
        list.push({
          ...pmt,
          timelineType: 'payment',
          dateForSort: pmt.createdAt ? new Date(pmt.createdAt) : new Date(0),
        });
      });
    }
    if (deliveriesHistory && Array.isArray(deliveriesHistory)) {
      deliveriesHistory.forEach((deliv) => {
        list.push({
          ...deliv,
          timelineType: 'delivery',
          dateForSort: deliv.createdAt ? new Date(deliv.createdAt) : new Date(0),
        });
      });
    }
    return list.sort((a, b) => b.dateForSort - a.dateForSort);
  }, [paymentsHistory, deliveriesHistory]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching agreement records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!deal) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          title="Deal record not found"
          message="The requested deal record could not be loaded."
          actionLabel="Return to List"
          onAction={() => onNavigate('DealsList')}
        />
      </SafeAreaView>
    );
  }

  const isExpired = String(deal.status || '').toLowerCase() === 'expired';
  const isPending = String(deal.status || '').toLowerCase() === 'pending';
  const isActive =
    String(deal.status || '').toLowerCase() === 'active' ||
    String(deal.status || '').toLowerCase() === 'approved' ||
    String(deal.status || '').toLowerCase() === 'in_progress';
  const isRejected =
    String(deal.status || '').toLowerCase() === 'rejected' ||
    String(deal.status || '').toLowerCase() === 'cancelled';
  const isCompleted = String(deal.status || '').toLowerCase() === 'completed';
  const isActiveOrCompleted = isActive || isCompleted;

  const normalizeId = (val) => String(val?._id || val?.id || val || '');
  const sellerCid = normalizeId(deal.sellerCompanyId);
  const buyerCid = normalizeId(deal.buyerCompanyId);
  const brokerCid = normalizeId(deal.brokerCompanyId);

  const viewerRole = deal.viewerRole || deal.currentUserRole || '';
  const currentUserRole = deal.currentUserRole || viewerRole;

  const isSeller =
    currentUserRole === 'seller' ||
    viewerRole === 'seller' ||
    currentUserCompanyIds.some(
      (id) => id && String(id).toLowerCase() === String(sellerCid).toLowerCase()
    );
  const isBuyer =
    currentUserRole === 'buyer' ||
    viewerRole === 'buyer' ||
    currentUserCompanyIds.some(
      (id) => id && String(id).toLowerCase() === String(buyerCid).toLowerCase()
    );
  const isBroker =
    currentUserRole === 'broker' ||
    viewerRole === 'broker' ||
    (!!brokerCid &&
      currentUserCompanyIds.some(
        (id) => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()
      ));

  const approvalStatus = deal.approvalStatus || {};
  const getPartyApprovalStatus = (partyRole, companyId) => {
    if (approvalStatus[partyRole]) {
      return approvalStatus[partyRole];
    }
    if (deal.acceptedBy && deal.acceptedBy.length > 0 && companyId) {
      const record = deal.acceptedBy.find(
        (r) => normalizeId(r.companyId) === normalizeId(companyId)
      );
      if (record) {
        if (record.status === 'accepted') return 'approved';
        return record.status;
      }
    }
    return 'pending';
  };

  const sellerStatus = getPartyApprovalStatus('seller', deal.sellerCompanyId);
  const buyerStatus = getPartyApprovalStatus('buyer', deal.buyerCompanyId);

  const sellerApproved = sellerStatus === 'approved';
  const buyerApproved = buyerStatus === 'approved';

  const creatorRole = deal.createdByRole || deal.role || 'seller';
  const isCreatorCompany =
    (creatorRole === 'seller' && isSeller) ||
    (creatorRole === 'buyer' && isBuyer) ||
    (creatorRole === 'broker' && isBroker);

  const viewerApprovalStatus =
    deal.viewerApprovalStatus ||
    (isCreatorCompany
      ? 'approved'
      : (isSeller && sellerApproved) || (isBuyer && buyerApproved)
        ? 'approved'
        : 'pending');

  const pendingApprovalFor =
    deal.pendingApprovalFor ||
    (isPending
      ? creatorRole === 'seller'
        ? 'buyer'
        : creatorRole === 'buyer'
          ? 'seller'
          : ''
      : '');

  let showApproveButton = false;
  let showRejectButton = false;

  if (isPending && !isBroker) {
    if (isCreatorCompany) {
      showApproveButton = false;
      showRejectButton = false;
    } else {
      showApproveButton = deal.hasOwnProperty('canApprove') ? !!deal.canApprove : true;
      showRejectButton = deal.hasOwnProperty('canReject') ? !!deal.canReject : true;
    }
  }

  const showActionButtons = showApproveButton || showRejectButton;
  const otherPartyLabel = isSeller ? 'Buyer' : isBuyer ? 'Seller' : 'Other Party';

  const getDealTotals = () => {
    if (deal.products && deal.products.length > 0) {
      let totalQty = 0;
      let totalValueAmt = 0;
      deal.products.forEach((p) => {
        totalQty += Number(p.quantity) || 0;
        totalValueAmt +=
          Number(p.totalAmount || Number(p.quantity) * Number(p.price)) || 0;
      });
      return {
        qty: totalQty,
        totalVal: totalValueAmt,
        firstProductName:
          deal.products[0]?.productId?.name ||
          deal.products[0]?.name ||
          'Commodity Item',
        hasMultiple: deal.products.length > 1,
        count: deal.products.length,
      };
    }

    const firstProd = deal.product || {};
    const qtyVal = Number(firstProd.quantity || deal.qty) || 0;
    const priceVal = Number(firstProd.price || deal.price) || 0;
    const computedTotal =
      deal.totalAmount || firstProd.totalAmount || qtyVal * priceVal || 0;

    return {
      qty: qtyVal || 0,
      totalVal: computedTotal || priceVal || 0,
      firstProductName:
        firstProd.productId?.name ||
        firstProd.name ||
        (typeof firstProd === 'string' ? firstProd : '') ||
        'Commodity Item',
      hasMultiple: false,
      count: 1,
    };
  };

  const dealTotals = getDealTotals();
  const productName = dealTotals.hasMultiple
    ? `${dealTotals.firstProductName} + ${dealTotals.count - 1} more`
    : dealTotals.firstProductName;
  const qty = dealTotals.qty;
  const totalValFormatted =
    typeof dealTotals.totalVal === 'number'
      ? dealTotals.totalVal.toLocaleString('en-IN')
      : dealTotals.totalVal;

  const dealDateDisplay = deal.dealDate
    ? new Date(deal.dealDate).toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : 'N/A';
  const expiryDateRaw = deal.expiryDate || deal.validityDate;
  const validityDateDisplay = expiryDateRaw
    ? new Date(expiryDateRaw).toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    : 'N/A';

  const sellerName =
    deal.sellerCompany?.name ||
    deal.sellerCompanyId?.companyName ||
    deal.sellerCompanyId?.name ||
    deal.party1?.company?.name ||
    deal.party1?.name ||
    'Seller Business';
  const buyerName =
    deal.buyerCompany?.name ||
    deal.buyerCompanyId?.companyName ||
    deal.buyerCompanyId?.name ||
    deal.party2?.company?.name ||
    deal.party2?.name ||
    'Buyer Business';
  const brokerNameDisplay =
    deal.broker?.name ||
    deal.brokerCompanyId?.name ||
    deal.brokerCompanyId?.companyName ||
    'Direct Trade';

  const getGstBreakdown = () => {
    if (!deal)
      return { items: [], baseTotal: 0, discountTotal: 0, gstTotal: 0, grandTotal: 0 };
    let baseTotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    let items = [];

    if (deal.products && deal.products.length > 0) {
      deal.products.forEach((prod, index) => {
        const qtyVal = Number(prod.quantity) || 0;
        const priceVal = Number(prod.price) || 0;
        const discountVal = Number(prod.discount) || 0;
        const gstPercent = Number(prod.gst) || 0;

        const subtotal = qtyVal * priceVal;
        const subtotalAfterDiscount = Math.max(0, subtotal - discountVal);
        const gstAmount = subtotalAfterDiscount * (gstPercent / 100);
        const total = subtotalAfterDiscount + gstAmount;

        baseTotal += subtotal;
        discountTotal += discountVal;
        gstTotal += gstAmount;

        items.push({
          name: prod.productId?.name || prod.name || `Item #${index + 1}`,
          qty: qtyVal,
          price: priceVal,
          discount: discountVal,
          gstPercent,
          gstAmount,
          total,
        });
      });
    } else {
      const firstProd = deal.product || {};
      const qtyVal = Number(firstProd.quantity || deal.qty) || 0;
      const priceVal = Number(firstProd.price || deal.price) || 0;
      const discountVal = Number(deal.discount || firstProd.discount) || 0;
      const gstPercent = Number(deal.gst || firstProd.gst || 0);

      const subtotal = qtyVal * priceVal;
      const subtotalAfterDiscount = Math.max(0, subtotal - discountVal);
      const gstAmount = subtotalAfterDiscount * (gstPercent / 100);
      const total = subtotalAfterDiscount + gstAmount;

      baseTotal = subtotal;
      discountTotal = discountVal;
      gstTotal = gstAmount;

      items.push({
        name: firstProd.productId?.name || firstProd.name || 'Sauda Product',
        qty: qtyVal,
        price: priceVal,
        discount: discountVal,
        gstPercent,
        gstAmount,
        total,
      });
    }

    return {
      items,
      baseTotal,
      discountTotal,
      gstTotal,
      grandTotal: baseTotal - discountTotal + gstTotal,
    };
  };

  const getStatusBadgeType = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'approved':
      case 'in_progress':
        return { label: 'Active Trade', type: 'success' };
      case 'pending':
        return { label: 'Pending Signature', type: 'warning' };
      case 'completed':
        return { label: 'Completed', type: 'info' };
      case 'cancelled':
      case 'rejected':
        return { label: 'Declined', type: 'error' };
      case 'expired':
        return { label: 'Expired', type: 'muted' };
      default:
        return { label: status?.toUpperCase() || 'Pending', type: 'info' };
    }
  };

  const statusBadge = getStatusBadgeType(deal.status);
  const totalDealVal = Number(
    dealTotals.totalVal || deal.grandTotal || deal.totalAmount || 1
  );
  const totalSentVal = paymentSummary
    ? Number(paymentSummary.totalAmountSent || 0)
    : 0;
  const percentPaid = Math.min(100, Math.max(0, (totalSentVal / totalDealVal) * 100));

  const deliveredQty = deal.deliveredQuantity || deal.product?.deliveredQuantity || 0;
  const totalQtyVal = Number(qty) || 1;
  const percentDelivered = Math.min(100, Math.max(0, (deliveredQty / totalQtyVal) * 100));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. COMPACT APP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => onNavigate('pop')}
          accessibilityRole="button"
          accessibilityLabel="Back"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Deal Details
          </Text>
          <Text style={styles.headerSub}>
            #{deal.dealNumber || deal._id?.slice(-6).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerRightRow}>
          {!isExpired && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onNavigate('DealChat', { dealId: deal._id })}
              accessibilityRole="button"
              accessibilityLabel="Chat"
              activeOpacity={0.7}
            >
              <MessageSquare size={19} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* 2. PROMINENT DEAL SUMMARY CARD */}
        <View style={styles.card}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {productName}
            </Text>
            <StatusBadge label={statusBadge.label} type={statusBadge.type} />
          </View>

          <Text style={styles.dealAmount}>₹{totalValFormatted}</Text>

          <View style={styles.divider} />

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <InfoRow label="Quantity" value={`${qty} MT`} />
            </View>
            <View style={styles.gridCol}>
              <InfoRow
                label="Price / Rate"
                value={`₹${Number(deal.price || deal.product?.price || 0).toLocaleString('en-IN')}`}
              />
            </View>
          </View>

          <View style={[styles.gridRow, { marginTop: 12 }]}>
            <View style={styles.gridCol}>
              <InfoRow label="Agreement Date" value={dealDateDisplay} />
            </View>
            <View style={styles.gridCol}>
              <InfoRow label="Broker Facilitator" value={brokerNameDisplay} />
            </View>
          </View>
        </View>

        {/* 3. QUICK ACTIONS ROW */}
        <View style={styles.quickActionsRow}>
          {!isExpired && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => onNavigate('DealChat', { dealId: deal._id })}
              accessibilityRole="button"
            >
              <MessageSquare size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.quickActionLabel}>Chat</Text>
            </TouchableOpacity>
          )}

          {isActiveOrCompleted && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={openPaymentModal}
              accessibilityRole="button"
            >
              <CreditCard size={16} color={COLORS.success} style={{ marginRight: 6 }} />
              <Text style={styles.quickActionLabel}>Record Pay</Text>
            </TouchableOpacity>
          )}

          {isPending && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => onNavigate('CreateDeal', { prefill: deal })}
              accessibilityRole="button"
            >
              <Edit3 size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.quickActionLabel}>Edit</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => setIsGstModalVisible(true)}
            accessibilityRole="button"
          >
            <Percent size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.quickActionLabel}>GST</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => Alert.alert('Share Deal', 'Sharing agreement summary...')}
            accessibilityRole="button"
          >
            <Share2 size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.quickActionLabel}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* 4. APPROVAL OR REJECTION ACTION PANEL */}
        {isPending && showActionButtons && (
          <View style={[styles.card, styles.actionCard]}>
            <Text style={styles.actionCardTitle}>Review this deal</Text>
            <Text style={styles.actionCardSub}>
              Please review trade terms and confirm your approval to activate this agreement.
            </Text>
            <View style={styles.actionBtnRow}>
              {showRejectButton && (
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={handleRejectDeal}
                  disabled={isUpdating}
                  accessibilityRole="button"
                >
                  <Text style={styles.declineBtnText}>
                    {isUpdating ? 'Declining...' : 'Decline'}
                  </Text>
                </TouchableOpacity>
              )}

              {showApproveButton && (
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={handleAcceptDeal}
                  disabled={isUpdating}
                  accessibilityRole="button"
                >
                  <Text style={styles.approveBtnText}>
                    {isUpdating ? 'Approving...' : 'Approve Deal'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Pending Waiting Banner */}
        {isPending && viewerApprovalStatus === 'approved' && !isBroker && (
          <View style={styles.neutralNoticeBox}>
            <Clock size={16} color={COLORS.warning} style={{ marginRight: 8 }} />
            <Text style={styles.neutralNoticeText}>
              Waiting for {pendingApprovalFor ? pendingApprovalFor.toUpperCase() : otherPartyLabel} to approve this deal.
            </Text>
          </View>
        )}

        {/* Declined Banner */}
        {isRejected && (
          <View style={styles.errorNoticeBox}>
            <XCircle size={16} color={COLORS.error} style={{ marginRight: 8 }} />
            <Text style={styles.errorNoticeText}>
              This trade agreement was declined.
            </Text>
          </View>
        )}

        {/* 5. PARTIES SECTION */}
        <View style={styles.card}>
          <SectionHeader title="Parties" />

          {/* Seller Row */}
          <View style={styles.partyRow}>
            <View style={styles.partyIconBadge}>
              <Building2 size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyRoleLabel}>Seller</Text>
              <Text style={styles.partyName}>{sellerName}</Text>
            </View>
            <StatusBadge
              label={sellerApproved ? 'Signed' : 'Pending'}
              type={sellerApproved ? 'success' : 'warning'}
            />
          </View>

          <View style={styles.divider} />

          {/* Buyer Row */}
          <View style={styles.partyRow}>
            <View style={styles.partyIconBadge}>
              <User size={16} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyRoleLabel}>Buyer</Text>
              <Text style={styles.partyName}>{buyerName}</Text>
            </View>
            <StatusBadge
              label={buyerApproved ? 'Signed' : 'Pending'}
              type={buyerApproved ? 'success' : 'warning'}
            />
          </View>

          {/* Broker Row (if applicable) */}
          {deal.broker && (
            <>
              <View style={styles.divider} />
              <View style={styles.partyRow}>
                <View style={styles.partyIconBadge}>
                  <Briefcase size={16} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partyRoleLabel}>Broker</Text>
                  <Text style={styles.partyName}>{brokerNameDisplay}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* 6. PAYMENT OVERVIEW */}
        {isActiveOrCompleted && (
          <View style={styles.card}>
            <SectionHeader
              title="Payment Overview"
              actionText="+ Record Payment"
              onAction={openPaymentModal}
            />

            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>
                Paid: ₹{totalSentVal.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.progressPercent}>{Math.round(percentPaid)}%</Text>
            </View>

            <ProgressBar progress={percentPaid} color={COLORS.success} />

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <InfoRow label="Total Value" value={`₹${totalValFormatted}`} />
              </View>
              <View style={styles.gridCol}>
                <InfoRow
                  label="Remaining Balance"
                  value={`₹${(totalDealVal - totalSentVal).toLocaleString('en-IN')}`}
                />
              </View>
            </View>
          </View>
        )}

        {/* 7. DELIVERY OVERVIEW */}
        {isActiveOrCompleted && (
          <View style={styles.card}>
            <SectionHeader title="Delivery Overview" />

            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>
                Delivered: {deliveredQty} / {qty} MT
              </Text>
              <Text style={styles.progressPercent}>{Math.round(percentDelivered)}%</Text>
            </View>

            <ProgressBar progress={percentDelivered} color={COLORS.primary} />
          </View>
        )}

        {/* 8. TRANSACTION HISTORY LIST */}
        {isActiveOrCompleted && combinedHistory.length > 0 && (
          <View style={styles.card}>
            <SectionHeader title="Activity & Ledger History" />
            {combinedHistory.map((item, idx) => {
              const isLast = idx === combinedHistory.length - 1;
              const itemDate = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString([], {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '';

              const isPmt = item.timelineType === 'payment';
              const isSent = isPmt
                ? item.paymentType === 'sent' || item.paymentType === 'given'
                : item.deliveryType === 'sent';

              const isAppr = item.status === 'approved';
              const isRej = item.status === 'rejected';

              return (
                <View key={`hist-${item._id || idx}`}>
                  <View style={styles.historyRow}>
                    <View style={[
                      styles.historyIconBadge,
                      { backgroundColor: isSent ? (isPmt ? COLORS.infoBg : '#F1F5F9') : COLORS.successBg }
                    ]}>
                      {isPmt ? (
                        isSent ? (
                          <ArrowUpRight size={16} color={COLORS.primary} />
                        ) : (
                          <ArrowDownLeft size={16} color={COLORS.success} />
                        )
                      ) : (
                        <Truck size={16} color={COLORS.primary} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        {isPmt ? `${item.paymentMethod || 'Payment'} (${isSent ? 'Sent' : 'Received'})` : `Delivery (${isSent ? 'Dispatched' : 'Received'})`}
                      </Text>
                      <Text style={styles.historySub}>{itemDate}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.historyAmount}>
                        {isPmt ? `₹${Number(item.amount).toLocaleString('en-IN')}` : `${item.quantity} MT`}
                      </Text>
                      <StatusBadge
                        label={item.status || 'Pending'}
                        type={isAppr ? 'success' : isRej ? 'error' : 'warning'}
                      />
                    </View>
                  </View>

                  {/* Verification Action Buttons */}
                  {isPmt && canVerifyPayment(item) && (
                    <View style={styles.inlineVerifyRow}>
                      <TouchableOpacity
                        style={styles.inlineDeclineBtn}
                        onPress={() => confirmPaymentStatusChange(item, 'rejected')}
                        accessibilityRole="button"
                      >
                        <Text style={styles.inlineDeclineText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.inlineApproveBtn}
                        onPress={() => confirmPaymentStatusChange(item, 'approved')}
                        accessibilityRole="button"
                      >
                        <Text style={styles.inlineApproveText}>Verify Payment</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isPmt && canVerifyDelivery(item) && (
                    <View style={styles.inlineVerifyRow}>
                      <TouchableOpacity
                        style={styles.inlineDeclineBtn}
                        onPress={() => confirmDeliveryStatusChange(item, 'rejected')}
                        accessibilityRole="button"
                      >
                        <Text style={styles.inlineDeclineText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.inlineApproveBtn}
                        onPress={() => confirmDeliveryStatusChange(item, 'approved')}
                        accessibilityRole="button"
                      >
                        <Text style={styles.inlineApproveText}>Verify Delivery</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        )}

        {/* 9. SECONDARY DETAILS */}
        <View style={styles.card}>
          <SectionHeader title="Contract Information" />

          <InfoRow label="Payment Terms" value={deal.paymentTerms || 'Standard Trade Terms'} />
          <View style={styles.divider} />

          <InfoRow label="Delivery Terms" value={deal.deliveryTerms || 'Standard Delivery'} />
          <View style={styles.divider} />

          <InfoRow label="Validity Date" value={validityDateDisplay} />

          {deal.remarks || deal.comments ? (
            <>
              <View style={styles.divider} />
              <InfoRow label="Remarks / Notes" value={deal.remarks || deal.comments} numberOfLines={3} />
            </>
          ) : null}
        </View>

      </ScrollView>

      {/* ─── RECORD PAYMENT MODAL ─── */}
      <Modal
        visible={isPaymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Selection */}
              <Text style={styles.inputLabel}>Payment Direction</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    paymentType === 'sent' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setPaymentType('sent')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      paymentType === 'sent' && styles.segmentTextActive,
                    ]}
                  >
                    Payment Sent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    paymentType === 'received' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setPaymentType('received')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      paymentType === 'received' && styles.segmentTextActive,
                    ]}
                  >
                    Payment Received
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>

              {/* Method Selection */}
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodPillRow}>
                {['UPI', 'Bank Transfer', 'Cash', 'Cheque'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodPill,
                      paymentMethod === m && styles.methodPillActive,
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text
                      style={[
                        styles.methodPillText,
                        paymentMethod === m && styles.methodPillTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes / Reference (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Transaction Ref / Bank Ref Number"
                placeholderTextColor={COLORS.textMuted}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
              />

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleLogPayment}
                disabled={isLoggingPayment}
                accessibilityRole="button"
              >
                {isLoggingPayment ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Submit Payment Entry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── GST BREAKDOWN MODAL ─── */}
      <Modal
        visible={isGstModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsGstModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GST Breakdown</Text>
              <TouchableOpacity onPress={() => setIsGstModalVisible(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {getGstBreakdown().items.map((item, idx) => (
                <View key={idx} style={styles.gstItemCard}>
                  <Text style={styles.gstItemName}>{item.name}</Text>
                  <InfoRow label="Base Value" value={`₹${(item.qty * item.price).toLocaleString('en-IN')}`} />
                  <InfoRow label={`GST Rate (${item.gstPercent}%)`} value={`₹${item.gstAmount.toLocaleString('en-IN')}`} />
                </View>
              ))}

              <View style={styles.gstTotalBox}>
                <Text style={styles.gstTotalLabel}>Grand Total (Incl. GST)</Text>
                <Text style={styles.gstTotalVal}>
                  ₹{Math.round(getGstBreakdown().grandTotal).toLocaleString('en-IN')}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyStateBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyStateMsg: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dealAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoRowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoRowVal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionCard: {
    backgroundColor: COLORS.infoBg,
    borderColor: '#BFDBFE',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  actionCardSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  approveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  neutralNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    borderRadius: 12,
  },
  neutralNoticeText: {
    fontSize: 13,
    color: COLORS.warning,
    flex: 1,
  },
  errorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 12,
  },
  errorNoticeText: {
    fontSize: 13,
    color: COLORS.error,
    flex: 1,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  partyIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partyRoleLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  historyIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historySub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inlineVerifyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  inlineDeclineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.errorBg,
    borderRadius: 6,
  },
  inlineDeclineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  inlineApproveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.success,
    borderRadius: 6,
  },
  inlineApproveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: COLORS.surface,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  methodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  methodPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.infoBg,
  },
  methodPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  methodPillTextActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  primaryActionBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  gstItemCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  gstItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  gstTotalBox: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gstTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  gstTotalVal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default DealDetails;