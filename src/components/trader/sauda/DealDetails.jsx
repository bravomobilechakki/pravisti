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
  AlertCircle,
  Clock,
  Briefcase,
  CheckCircle,
  XCircle,
  PenTool,
  RefreshCw,
  Share2,
  Edit3,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  Box,
  Percent,
  Calendar,
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
  updateDeliveryStatus
} from '../../../services/api';

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
          // Collect all company IDs this user belongs to
          const companyIds = (user.companies || []).map(
            (c) => String(c._id || c.id || c)
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
    const id = routeData?.dealId || routeData?.deal?._id;
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await getDealDetails(id, token);
      if (response && response.success) {
        setDeal(response.data);
      }
    } catch (error) {
      console.error('Error fetching deal details:', error);
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

      const isS = (cUserRole === 'seller' || vRole === 'seller') || currentUserCompanyIds.some(cid => cid && String(cid).toLowerCase() === String(sCid).toLowerCase());
      const isB = (cUserRole === 'buyer' || vRole === 'buyer') || currentUserCompanyIds.some(cid => cid && String(cid).toLowerCase() === String(bCid).toLowerCase());
      const isBr = (cUserRole === 'broker' || vRole === 'broker') || (!!brCid && currentUserCompanyIds.some(cid => cid && String(cid).toLowerCase() === String(brCid).toLowerCase()));

      const myCompanyId = isS ? sCid : isB ? bCid : isBr ? brCid : (currentUserCompanyIds[0] || '');

      setIsDashboardLoading(true);
      setIsHistoryLoading(true);
      setIsDeliveriesLoading(true);

      const [dashRes, histRes, delivRes] = await Promise.all([
        getPaymentDashboard(myCompanyId, id, token).catch(e => { console.warn(e); return null; }),
        getPayments({ dealId: id, companyId: myCompanyId, limit: 50 }, token).catch(e => { console.warn(e); return null; }),
        getDeliveries({ dealId: id, limit: 50 }, token).catch(e => { console.warn(e); return null; })
      ]);

      if (dashRes && dashRes.success) {
        setPaymentSummary(dashRes.data);
      }
      if (histRes && histRes.success) {
        setPaymentsHistory(histRes.data?.data || histRes.data?.payments || (Array.isArray(histRes.data) ? histRes.data : []));
      }
      if (delivRes && delivRes.success) {
        setDeliveriesHistory(delivRes.data?.data || delivRes.data?.deliveries || (Array.isArray(delivRes.data) ? delivRes.data : []));
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
      const role = deal?.currentUserRole || (isSeller ? 'seller' : isBuyer ? 'buyer' : isBroker ? 'broker' : '');
      const token = await AsyncStorage.getItem('userToken');
      const response = await acceptDeal(id, role, token);
      if (response && response.success) {
        Alert.alert('Success', 'Deal approved successfully', [
          { text: 'OK', onPress: () => fetchDealDetails() }
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
              const role = deal?.currentUserRole || (isSeller ? 'seller' : isBuyer ? 'buyer' : isBroker ? 'broker' : '');
              const token = await AsyncStorage.getItem('userToken');
              const response = await rejectDeal(id, role, 'Deal terms not acceptable', token);
              if (response && response.success) {
                Alert.alert('Success', 'Agreement declined successfully', [
                  { text: 'OK', onPress: () => fetchDealDetails() }
                ]);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to decline deal');
            } finally {
              setIsUpdating(false);
            }
          }
        }
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

    const remainingPayable = Number(paymentSummary ? (isSeller ? paymentSummary.totalPendingToReceive : paymentSummary.totalPendingToPay) : (deal.totalAmount || 0)) || 0;
    if (amt > remainingPayable) {
      Alert.alert('Validation Error', `Amount cannot exceed the remaining balance of ₹${remainingPayable.toLocaleString('en-IN')}`);
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
            }
          }
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

    // Buyer Created Payment (paymentType == sent) AND Current User represents Seller Company
    const isBuyerCreated = pmt.paymentType === 'sent' || pmt.paymentType === 'given';
    if (isBuyerCreated && isSeller) {
      return true;
    }

    // Seller Created Payment (paymentType == received) AND Current User represents Buyer Company
    const isSellerCreated = pmt.paymentType === 'received';
    if (isSellerCreated && isBuyer) {
      return true;
    }

    return false;
  };

  const handleUpdatePaymentStatus = async (paymentId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsUpdating(true);
      const res = await updatePaymentStatus(paymentId, status, token);
      if (res && res.success) {
        Alert.alert('Success', `Payment request has been ${status === 'approved' ? 'approved' : 'rejected'}.`, [
          {
            text: 'OK',
            onPress: () => {
              fetchPaymentData();
              fetchDealDetails();
            }
          }
        ]);
      }
    } catch (err) {
      Alert.alert('Failed to update status', err.message || 'Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmPaymentStatusChange = (pmt, status) => {
    Alert.alert(
      `${status === 'approved' ? 'Approve' : 'Reject'} Payment`,
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this payment entry of ₹${Number(pmt.amount).toLocaleString('en-IN')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => handleUpdatePaymentStatus(pmt._id || pmt.id, status) }
      ]
    );
  };

  // Delivery Verification Helpers
  const canVerifyDelivery = (deliv) => {
    if (!deliv || deliv.status !== 'pending') return false;

    // Sent delivery created by seller (dispatched) -> Buyer verifies/approves
    if (deliv.deliveryType === 'sent' && isBuyer) {
      return true;
    }

    // Received delivery created by buyer (receipt confirmed) -> Seller verifies/approves
    if (deliv.deliveryType === 'received' && isSeller) {
      return true;
    }

    return false;
  };

  const handleUpdateDeliveryStatus = async (deliveryId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsUpdating(true);
      const res = await updateDeliveryStatus(deliveryId, status, token);
      if (res && res.success) {
        Alert.alert('Success', `Delivery request has been ${status === 'approved' ? 'approved' : 'rejected'}.`, [
          {
            text: 'OK',
            onPress: () => {
              fetchPaymentData();
              fetchDealDetails();
            }
          }
        ]);
      }
    } catch (err) {
      Alert.alert('Failed to update status', err.message || 'Failed to update delivery status');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDeliveryStatusChange = (deliv, status) => {
    Alert.alert(
      `${status === 'approved' ? 'Approve' : 'Reject'} Delivery`,
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this delivery entry of ${deliv.quantity} MT?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => handleUpdateDeliveryStatus(deliv._id || deliv.id, status) }
      ]
    );
  };

  const combinedHistory = React.useMemo(() => {
    const list = [];
    if (paymentsHistory && Array.isArray(paymentsHistory)) {
      paymentsHistory.forEach(pmt => {
        list.push({
          ...pmt,
          timelineType: 'payment',
          dateForSort: pmt.createdAt ? new Date(pmt.createdAt) : new Date(0),
        });
      });
    }
    if (deliveriesHistory && Array.isArray(deliveriesHistory)) {
      deliveriesHistory.forEach(deliv => {
        list.push({
          ...deliv,
          timelineType: 'delivery',
          dateForSort: deliv.createdAt ? new Date(deliv.createdAt) : new Date(0),
        });
      });
    }
    return list.sort((a, b) => b.dateForSort - a.dateForSort);
  }, [paymentsHistory, deliveriesHistory]);

  const renderTimelineItem = (item, idx) => {
    const isLast = idx === combinedHistory.length - 1;
    const itemDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';

    const getStatusConfig = (status) => {
      switch (status?.toLowerCase()) {
        case 'approved':
          return { label: 'APPROVED', bgColor: '#ECFDF5', textColor: '#047857', border: '#A7F3D0' };
        case 'rejected':
          return { label: 'REJECTED', bgColor: '#FEF2F2', textColor: '#B91C1C', border: '#FCA5A5' };
        case 'pending':
        default:
          return { label: 'PENDING', bgColor: '#FFFBEB', textColor: '#B45309', border: '#FDE68A' };
      }
    };
    const cfg = getStatusConfig(item.status);

    if (item.timelineType === 'payment') {
      const isSent = item.paymentType === 'sent' || item.paymentType === 'given';
      return (
        <View key={`pmt-${item._id || idx}`} style={styles.timelineItem}>
          <View style={styles.timelineLeftColumn}>
            <View style={[styles.timelineNode, isSent ? styles.timelineNodeSent : styles.timelineNodeReceived]}>
              {isSent ? (
                <ArrowUpRight size={14} color="#EF4444" />
              ) : (
                <ArrowDownLeft size={14} color="#10B981" />
              )}
            </View>
            {!isLast && <View style={styles.timelineConnectorLine} />}
          </View>

          <View style={styles.timelineContentCard}>
            <View style={styles.timelineContentHeader}>
              <Text style={styles.timelineMethodText}>{item.paymentMethod || 'Payment'}</Text>
              <Text style={[styles.timelineAmountText, isSent ? styles.timelineAmountSent : styles.timelineAmountReceived]}>
                {isSent ? '-' : '+'}₹{Number(item.amount).toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.pmtDetailsRow}>
              <Text style={styles.pmtDetailText}>Type: {String(item.paymentType || '').toUpperCase()}</Text>
              <Text style={styles.pmtDetailText}>By: {item.createdBy?.name || item.createdBy || 'N/A'}</Text>
            </View>

            {item.notes ? (
              <Text style={styles.timelineNotesText} numberOfLines={2}>{item.notes}</Text>
            ) : null}

            <View style={styles.pmtFooterRow}>
              <Text style={styles.timelineDateText}>{itemDate}</Text>
              <View style={[
                styles.pmtStatusBadge,
                { backgroundColor: cfg.bgColor, borderColor: cfg.border }
              ]}>
                <Text style={[styles.pmtStatusText, { color: cfg.textColor }]}>
                  {cfg.label}
                </Text>
              </View>
            </View>

            {canVerifyPayment(item) && (
              <View style={styles.verifyButtonsRow}>
                <TouchableOpacity
                  style={[styles.verifyBtn, styles.declineVerifyBtn]}
                  onPress={() => confirmPaymentStatusChange(item, 'rejected')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <XCircle size={14} color="#EF4444" />
                    <Text style={styles.declineVerifyBtnText}>Reject</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.verifyBtn, styles.approveVerifyBtn]}
                  onPress={() => confirmPaymentStatusChange(item, 'approved')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} color="#10B981" />
                    <Text style={styles.approveVerifyBtnText}>Verify</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    } else {
      const isSent = item.deliveryType === 'sent';

      let prodName = 'Product';
      if (deal.products && deal.products.length > 0) {
        const matchedProd = deal.products.find(p => {
          const pId = p.productId?._id || p.productId || p._id || p.id;
          const dpId = item.productId?._id || item.productId;
          return String(pId) === String(dpId);
        });
        if (matchedProd) {
          prodName = matchedProd.productId?.name || matchedProd.name || 'Product';
        }
      } else if (deal.product) {
        prodName = deal.product?.productId?.name || deal.product?.name || (typeof deal.product === 'string' ? deal.product : 'Product');
      }

      return (
        <View key={`deliv-${item._id || idx}`} style={styles.timelineItem}>
          <View style={styles.timelineLeftColumn}>
            <View style={[styles.timelineNode, isSent ? styles.timelineNodeSentBlue : styles.timelineNodeReceivedGreen]}>
              {isSent ? (
                <Truck size={14} color="#4F46E5" />
              ) : (
                <Box size={14} color="#059669" />
              )}
            </View>
            {!isLast && <View style={styles.timelineConnectorLine} />}
          </View>

          <View style={styles.timelineContentCard}>
            <View style={styles.timelineContentHeader}>
              <Text style={styles.timelineMethodText}>{prodName}</Text>
              <Text style={[styles.timelineAmountText, isSent ? styles.timelineAmountSentBlue : styles.timelineAmountReceivedGreen]}>
                {isSent ? 'Dispatched' : 'Received'}: {item.quantity} MT
              </Text>
            </View>

            <View style={styles.pmtDetailsRow}>
              <Text style={styles.pmtDetailText}>Type: {isSent ? 'DISPATCHED' : 'RECEIVED'}</Text>
            </View>

            {item.notes ? (
              <Text style={styles.timelineNotesText} numberOfLines={2}>Notes: {item.notes}</Text>
            ) : null}

            <View style={styles.pmtFooterRow}>
              <Text style={styles.timelineDateText}>{itemDate}</Text>
              <View style={[
                styles.pmtStatusBadge,
                { backgroundColor: cfg.bgColor, borderColor: cfg.border }
              ]}>
                <Text style={[styles.pmtStatusText, { color: cfg.textColor }]}>
                  {cfg.label}
                </Text>
              </View>
            </View>

            {canVerifyDelivery(item) && (
              <View style={styles.verifyButtonsRow}>
                <TouchableOpacity
                  style={[styles.verifyBtn, styles.declineVerifyBtn]}
                  onPress={() => confirmDeliveryStatusChange(item, 'rejected')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <XCircle size={14} color="#EF4444" />
                    <Text style={styles.declineVerifyBtnText}>Reject</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.verifyBtn, styles.approveVerifyBtn]}
                  onPress={() => confirmDeliveryStatusChange(item, 'approved')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} color="#10B981" />
                    <Text style={styles.approveVerifyBtnText}>Verify</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Fetching agreement records...</Text>
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Deal record not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('DealsList')}>
          <Text style={styles.backBtnText}>Return to List</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isExpired = String(deal.status || '').toLowerCase() === 'expired';
  const isPending = String(deal.status || '').toLowerCase() === 'pending';
  const isActive = String(deal.status || '').toLowerCase() === 'active' || String(deal.status || '').toLowerCase() === 'approved' || String(deal.status || '').toLowerCase() === 'in_progress';
  const isRejected = String(deal.status || '').toLowerCase() === 'rejected' || String(deal.status || '').toLowerCase() === 'cancelled';
  const isCompleted = String(deal.status || '').toLowerCase() === 'completed';
  const isActiveOrCompleted = isActive || isCompleted;

  // ── Deal Approval Flow — Spec Implementation ─────────────────────────
  const normalizeId = (val) => String(val?._id || val?.id || val || '');
  const sellerCid = normalizeId(deal.sellerCompanyId);
  const buyerCid = normalizeId(deal.buyerCompanyId);
  const brokerCid = normalizeId(deal.brokerCompanyId);

  // Specs compliance: Retrieve current user's role from backend details or calculate
  const viewerRole = deal.viewerRole || deal.currentUserRole || '';
  const currentUserRole = deal.currentUserRole || viewerRole;

  const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());
  const isBuyer = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(buyerCid).toLowerCase());
  const isBroker = (currentUserRole === 'broker' || viewerRole === 'broker') || (!!brokerCid && currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()));

  // Fallback to acceptedBy array if approvalStatus is not populated
  const approvalStatus = deal.approvalStatus || {};
  const getPartyApprovalStatus = (partyRole, companyId) => {
    if (approvalStatus[partyRole]) {
      return approvalStatus[partyRole];
    }
    if (deal.acceptedBy && deal.acceptedBy.length > 0 && companyId) {
      const record = deal.acceptedBy.find(r => normalizeId(r.companyId) === normalizeId(companyId));
      if (record) {
        if (record.status === 'accepted') return 'approved';
        return record.status; // 'pending' or 'rejected'
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

  const viewerApprovalStatus = deal.viewerApprovalStatus || (isCreatorCompany ? 'approved' : (((isSeller && sellerApproved) || (isBuyer && buyerApproved)) ? 'approved' : 'pending'));
  const pendingApprovalFor = deal.pendingApprovalFor || (
    isPending ? (creatorRole === 'seller' ? 'buyer' : creatorRole === 'buyer' ? 'seller' : '') : ''
  );

  // Determine visibility of buttons: creator company doesn't see buttons, other party sees them
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

  const otherPartyApprovedLabel = isBuyer && sellerApproved
    ? 'Seller Side Approved'
    : isSeller && buyerApproved
      ? 'Buyer Side Approved'
      : null;

  const getDealTotals = () => {
    if (deal.products && deal.products.length > 0) {
      let totalQty = 0;
      let totalValueAmt = 0;

      deal.products.forEach(p => {
        totalQty += Number(p.quantity) || 0;
        totalValueAmt += Number(p.totalAmount || (Number(p.quantity) * Number(p.price))) || 0;
      });

      return {
        qty: totalQty,
        totalVal: totalValueAmt,
        firstProductName: deal.products[0]?.productId?.name || deal.products[0]?.name || 'Unknown Product',
        hasMultiple: deal.products.length > 1,
        count: deal.products.length
      };
    }

    const firstProd = deal.product || {};
    const qtyVal = Number(firstProd.quantity || deal.qty) || 0;
    const priceVal = Number(firstProd.price || deal.price) || 0;
    const computedTotal = deal.totalAmount || firstProd.totalAmount || (qtyVal * priceVal) || 0;

    return {
      qty: qtyVal || 0,
      totalVal: computedTotal || priceVal || 0,
      firstProductName: firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || 'Unknown Product',
      hasMultiple: false,
      count: 1
    };
  };

  const dealTotals = getDealTotals();
  const productName = dealTotals.hasMultiple
    ? `${dealTotals.firstProductName} + ${dealTotals.count - 1} more items`
    : dealTotals.firstProductName;
  const qty = dealTotals.qty;
  const totalVal = typeof dealTotals.totalVal === 'number' ? dealTotals.totalVal.toLocaleString('en-IN') : dealTotals.totalVal;
  const dealDateDisplay = deal.dealDate ? new Date(deal.dealDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  const expiryDateRaw = deal.expiryDate || deal.validityDate;
  const validityDateDisplay = expiryDateRaw ? new Date(expiryDateRaw).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  const getGstBreakdown = () => {
    if (!deal) return { items: [], baseTotal: 0, discountTotal: 0, gstTotal: 0, grandTotal: 0 };
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
          gstPercent: gstPercent,
          gstAmount: gstAmount,
          total: total
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
        gstPercent: gstPercent,
        gstAmount: gstAmount,
        total: total
      });
    }

    return {
      items,
      baseTotal,
      discountTotal,
      gstTotal,
      grandTotal: baseTotal - discountTotal + gstTotal
    };
  };

  const sellerName = deal.sellerCompany?.name || deal.sellerCompanyId?.companyName || deal.sellerCompanyId?.name || deal.party1?.company?.name || deal.party1?.companyId?.name || deal.party1?.name || 'Seller';
  const buyerName = deal.buyerCompany?.name || deal.buyerCompanyId?.companyName || deal.buyerCompanyId?.name || deal.party2?.company?.name || deal.party2?.companyId?.name || deal.party2?.name || 'Buyer';

  const getInitials = (name) => {
    return name
      ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
      : '??';
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'approved':
      case 'in_progress':
        return { label: 'ACTIVE TRADE', bgColor: '#ECFDF5', textColor: '#047857', border: '#A7F3D0', dotColor: '#10B981' };
      case 'pending':
        return { label: 'PENDING APPROVAL', bgColor: '#FFFBEB', textColor: '#B45309', border: '#FDE68A', dotColor: '#F59E0B' };
      case 'completed':
        return { label: 'COMPLETED', bgColor: '#EFF6FF', textColor: '#1D4ED8', border: '#BFDBFE', dotColor: '#3B82F6' };
      case 'cancelled':
      case 'rejected':
        return { label: 'REJECTED', bgColor: '#FEF2F2', textColor: '#B91C1C', border: '#FCA5A5', dotColor: '#EF4444' };
      case 'expired':
        return { label: 'EXPIRED', bgColor: '#F8FAFC', textColor: '#475569', border: '#CBD5E1', dotColor: '#64748B' };
      default:
        return { label: status?.toUpperCase() || 'UNKNOWN', bgColor: '#F8FAFC', textColor: '#475569', border: '#CBD5E1', dotColor: '#64748B' };
    }
  };

  const statusCfg = getStatusConfig(deal.status);

  const totalDealVal = Number(dealTotals.totalVal || deal.grandTotal || deal.totalAmount || 1);
  const totalSentVal = paymentSummary ? Number(paymentSummary.totalAmountSent || 0) : 0;
  const percentPaid = Math.min(100, Math.max(0, (totalSentVal / totalDealVal) * 100));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 📋 PREMIUM COMPACT HEADER BAR (No cover image) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            Sauda Details
          </Text>
          <Text style={styles.headerSubtitleText}>
            #{deal.dealNumber || deal._id?.slice(-6).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          {!isExpired && (
            <TouchableOpacity
              style={styles.premiumHeaderChatButton}
              onPress={() => onNavigate('DealChat', { dealId: deal._id })}
              activeOpacity={0.7}
            >
              <MessageSquare size={18} color="#4F46E5" />
              <View style={styles.chatNotificationDot} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Validity Status Bar */}
        <View style={[styles.statusBanner, isExpired ? styles.statusBannerExpired : styles.statusBannerActive, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
          {isExpired ? (
            <AlertTriangle size={14} color="#EF4444" />
          ) : (
            <ShieldCheck size={14} color="#10B981" />
          )}
          <Text style={[styles.statusBannerText, isExpired ? styles.statusTextExpired : styles.statusTextActive]}>
            {isExpired ? 'Agreement Expired' : 'Legally Active & Enforceable until'} {validityDateDisplay}
          </Text>
        </View>

        {/* Fintech Quick Actions Row (inspired by reference screen quick buttons) */}
        <View style={styles.fintechActionsRow}>
          {/* Action 1: Chat Discussion */}
          {!isExpired && (
            <View style={styles.fintechActionItem}>
              <TouchableOpacity
                style={[styles.fintechActionButton, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
                onPress={() => onNavigate('DealChat', { dealId: deal._id })}
                activeOpacity={0.8}
              >
                <MessageSquare size={20} color="#4F46E5" />
              </TouchableOpacity>
              <Text style={styles.fintechActionLabel}>Trade Chat</Text>
            </View>
          )}

          {/* Action 2: Sign Agreement (if pending and has action buttons) */}
          {isPending && showActionButtons && (
            <View style={styles.fintechActionItem}>
              <TouchableOpacity
                style={[styles.fintechActionButton, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                onPress={handleAcceptDeal}
                activeOpacity={0.8}
              >
                <PenTool size={20} color="#059669" />
              </TouchableOpacity>
              <Text style={styles.fintechActionLabel}>Sign Deal</Text>
            </View>
          )}

          {/* Action 3: Log Payment (if approved/completed) */}
          {isActiveOrCompleted && (
            <View style={styles.fintechActionItem}>
              <TouchableOpacity
                style={[styles.fintechActionButton, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
                onPress={openPaymentModal}
                activeOpacity={0.8}
              >
                <CreditCard size={20} color="#D97706" />
              </TouchableOpacity>
              <Text style={styles.fintechActionLabel}>Log Pay</Text>
            </View>
          )}

          {/* Action 4: Edit Terms */}
          {isPending && (
            <View style={styles.fintechActionItem}>
              <TouchableOpacity
                style={[styles.fintechActionButton, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}
                onPress={() => {
                  onNavigate('CreateDeal', { prefill: deal });
                }}
                activeOpacity={0.8}
              >
                <Edit3 size={20} color="#7C3AED" />
              </TouchableOpacity>
              <Text style={styles.fintechActionLabel}>Edit Terms</Text>
            </View>
          )}

          {/* Action 5: Share Sauda */}
          <View style={styles.fintechActionItem}>
            <TouchableOpacity
              style={[styles.fintechActionButton, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
              onPress={() => {
                Alert.alert("Share Sauda", "Sharing sauda contract terms...");
              }}
              activeOpacity={0.8}
            >
              <Share2 size={20} color="#4F46E5" />
            </TouchableOpacity>
            <Text style={styles.fintechActionLabel}>Share</Text>
          </View>

          {/* Action 5b: GST Details */}
          <View style={styles.fintechActionItem}>
            <TouchableOpacity
              style={[styles.fintechActionButton, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}
              onPress={() => setIsGstModalVisible(true)}
              activeOpacity={0.8}
            >
              <Percent size={20} color="#E11D48" />
            </TouchableOpacity>
            <Text style={styles.fintechActionLabel}>GST</Text>
          </View>

          {/* Action 6: Trade Ledger / History */}
          <View style={styles.fintechActionItem}>
            <TouchableOpacity
              style={[styles.fintechActionButton, { backgroundColor: '#EBFDF5', borderColor: '#A7F3D0' }]}
              onPress={() => {
                onNavigate('TransactionHistory', { dealId: deal._id, deal });
              }}
              activeOpacity={0.8}
            >
              <FileText size={20} color="#059669" />
            </TouchableOpacity>
            <Text style={styles.fintechActionLabel}>Ledger</Text>
          </View>
        </View>

        {/* ACTION COMPLIANCE PANEL (Pending approvals decision overlay) */}
        {isPending && (showActionButtons || (viewerApprovalStatus === 'approved' && !isBroker) || isBroker) && (
          <View style={styles.actionPanelContainer}>
            {/* Action Required: Receiver Decision Buttons */}
            {showActionButtons && (
              <View style={styles.actionDecisionCard}>
                {otherPartyApprovedLabel && (
                  <View style={styles.decisionStatusBadgeRow}>
                    <View style={[styles.counterpartyApprovedBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Check size={12} color="#065F46" />
                      <Text style={styles.counterpartyApprovedBadgeText}>{otherPartyApprovedLabel}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.decisionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 }}>
                    <Clock size={10} color="#B45309" />
                    <Text style={{ fontSize: 9, fontWeight: '950', color: '#B45309' }}>PENDING SIGNATURE</Text>
                  </View>
                  <View style={styles.myRoleIndicatorBadge}>
                    <Text style={styles.myRoleIndicatorText}>
                      My Role: {isSeller ? 'SELLER' : isBuyer ? 'BUYER' : isBroker ? 'BROKER' : ''}
                    </Text>
                  </View>
                  <Text style={styles.decisionTitle}>Sign Trade Agreement</Text>
                  <Text style={styles.decisionDesc}>
                    Your formal approval is strictly required to activate this Sauda contract. Please carefully verify the pricing ledgers before signing.
                  </Text>
                </View>

                <View style={styles.decisionButtonsRow}>
                  {showRejectButton && (
                    <TouchableOpacity
                      style={[styles.decisionBtn, styles.declineBtn]}
                      onPress={handleRejectDeal}
                      disabled={isUpdating}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.declineBtnText}>
                        {isUpdating ? 'Declining...' : 'Decline Terms'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {showApproveButton && (
                    <TouchableOpacity
                      style={[styles.decisionBtn, styles.approveBtn]}
                      onPress={handleAcceptDeal}
                      disabled={isUpdating}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.approveBtnText}>
                        {isUpdating ? 'Approving...' : 'Sign & Approve'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Waiting State: Creator View */}
            {viewerApprovalStatus === 'approved' && deal.status === 'pending' && !isBroker && (
              <View style={styles.waitingCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <Text style={styles.waitingSingleText}>
                    My Role: <Text style={styles.approvedHighlight}>{isSeller ? 'SELLER' : isBuyer ? 'BUYER' : isBroker ? 'BROKER' : ''} (Approved)</Text>  ·  <Text style={styles.pendingHighlight}>Waiting for {pendingApprovalFor ? pendingApprovalFor.toUpperCase() : otherPartyLabel}</Text>
                  </Text>
                  <Clock size={12} color="#B45309" />
                </View>
              </View>
            )}

            {/* Read-Only State: Broker View */}
            {isBroker && (
              <View style={styles.brokerCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Briefcase size={16} color="#4F46E5" />
                  <Text style={[styles.brokerCardTitle, { marginBottom: 0 }]}>Broker Agreement Overview</Text>
                </View>
                <Text style={styles.brokerCardDesc}>
                  Seller Signature: {sellerApproved ? 'Signed' : 'Pending'}  |  Buyer Signature: {buyerApproved ? 'Signed' : 'Pending'}
                </Text>
              </View>
            )}
          </View>
        )}



        {/* Rejected Alert Card */}
        {isRejected && (
          <View style={styles.rejectedCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <XCircle size={20} color="#B91C1C" />
              <Text style={[styles.rejectedCardTitle, { marginBottom: 0 }]}>Deal Declined</Text>
            </View>
            <Text style={styles.rejectedCardDesc}>
              This agreement was rejected. You may recreate this Sauda ledger to coordinate with the party under revised terms.
            </Text>
          </View>
        )}

        {/* UNIFIED SAUDA DETAILS CARD */}
        <View style={styles.passportCard}>
          <View style={styles.passportHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FileText size={14} color="#4F46E5" />
              <Text style={styles.passportTag}>SAUDA AGREEMENT PASSPORT</Text>
            </View>
            <Text style={styles.passportId}>#{deal.dealNumber || deal._id?.slice(-6).toUpperCase()}</Text>
          </View>

          <Text style={styles.passportTitle}>{productName}</Text>

          <View style={styles.divider} />

          {/* Agreement & Validity Details Grid */}
          <View style={styles.passportGrid}>
            <View style={styles.passportGridCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Calendar size={11} color="#64748B" />
                <Text style={styles.passportLabel}>AGREEMENT DATE</Text>
              </View>
              <Text style={styles.passportValue}>{dealDateDisplay}</Text>
            </View>
            <View style={styles.passportGridCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Clock size={11} color="#64748B" />
                <Text style={styles.passportLabel}>VALIDITY TERMS</Text>
              </View>
              <Text style={[styles.passportValue, isExpired && { color: '#EF4444' }]}>
                {isExpired ? 'Expired' : `Until ${validityDateDisplay}`}
              </Text>
            </View>
          </View>

          <View style={styles.passportGrid}>
            <View style={styles.passportGridCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Briefcase size={11} color="#64748B" />
                <Text style={styles.passportLabel}>FACILITATOR</Text>
              </View>
              <Text style={styles.passportValue}>{deal.broker?.name || 'DIRECT'}</Text>
            </View>
            <View style={styles.passportGridCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <CheckCircle size={11} color="#64748B" />
                <Text style={styles.passportLabel}>DEAL STATUS</Text>
              </View>
              <View style={[styles.statusBadgeInline, { backgroundColor: statusCfg.bgColor, borderColor: statusCfg.border }]}>
                <View style={[styles.statusDot, { backgroundColor: statusCfg.dotColor }]} />
                <Text style={[styles.statusBadgeTextInline, { color: statusCfg.textColor }]}>{statusCfg.label}</Text>
              </View>
            </View>
          </View>

          {/* Product Commercial Details */}
          {/* Product Commercial Details */}
          {!deal.products || deal.products.length === 0 ? (
            <View style={styles.unifiedProductSection}>
              <View style={styles.divider} />
              <View style={styles.passportGrid}>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportLabel}>QUANTITY</Text>
                  <Text style={styles.passportValue}>{deal.qty || deal.product?.quantity || 0} MT</Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportLabel}>BASE RATE</Text>
                  <Text style={styles.passportValue}>₹{Number(deal.price || deal.product?.price || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Delivery Qty Progress (Only show if deal is approved/completed) */}
              {isActiveOrCompleted && (
                <View style={styles.deliveryProgressCard}>
                  <View style={styles.deliveryProgressHeader}>
                    <Text style={styles.deliveryProgressTitle}>DELIVERY PROGRESS</Text>
                    <Text style={styles.deliveryProgressQty}>
                      {deal.deliveredQuantity || deal.product?.deliveredQuantity || 0} / {deal.qty || deal.product?.quantity || 0} MT Sent
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, ((deal.deliveredQuantity || deal.product?.deliveredQuantity || 0) / (deal.qty || deal.product?.quantity || 1)) * 100))}%`,
                          backgroundColor: '#4F46E5' // Indigo for delivery progress
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.deliveryProgressFooter}>
                    <Text style={[styles.deliveryProgressText, { color: '#059669' }]}>
                      Delivered: {deal.deliveredQuantity || deal.product?.deliveredQuantity || 0} MT
                    </Text>
                    <Text style={[styles.deliveryProgressText, { color: '#EF4444' }]}>
                      Remaining: {Math.max(0, (deal.qty || deal.product?.quantity || 0) - (deal.deliveredQuantity || deal.product?.deliveredQuantity || 0))} MT
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.ledgerTotalRow}>
                <Text style={styles.ledgerTotalLabel}>Computed Item Net Value</Text>
                <Text style={styles.ledgerTotalValue}>
                  ₹{Number(deal.totalAmount || (Number(deal.qty || 0) * Number(deal.price || 0))).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ) : (
            deal.products.map((prod, idx) => {
              const itemTotal = Number(prod.totalAmount || (Number(prod.quantity) * Number(prod.price))) || 0;
              return (
                <View key={prod._id || idx} style={styles.unifiedProductSection}>
                  <View style={styles.divider} />

                  {deal.products.length > 1 && (
                    <Text style={styles.itemTitle}>Item #{idx + 1}: {prod.productId?.name || prod.name || 'Product'}</Text>
                  )}

                  <View style={styles.passportGrid}>
                    <View style={styles.passportGridCol}>
                      <Text style={styles.passportLabel}>QUANTITY</Text>
                      <Text style={styles.passportValue}>{prod.quantity} MT</Text>
                    </View>
                    <View style={styles.passportGridCol}>
                      <Text style={styles.passportLabel}>BASE RATE</Text>
                      <Text style={styles.passportValue}>₹{Number(prod.price).toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  <View style={styles.passportGrid}>
                    <View style={styles.passportGridCol}>
                      <Text style={styles.passportLabel}>GST APPLIED</Text>
                      <Text style={styles.passportValue}>{Number(prod.gst || 0) > 0 ? `${prod.gst}%` : '0%'}</Text>
                    </View>
                    <View style={styles.passportGridCol}>
                      <Text style={styles.passportLabel}>DISCOUNT</Text>
                      <Text style={[styles.passportValue, Number(prod.discount || 0) > 0 && { color: '#10B981' }]}>
                        {Number(prod.discount || 0) > 0 ? `-₹${Number(prod.discount).toLocaleString('en-IN')}` : '₹0'}
                      </Text>
                    </View>
                  </View>

                  {/* Delivery Qty Progress (Only show if deal is approved/completed) */}
                  {isActiveOrCompleted && (
                    <View style={styles.deliveryProgressCard}>
                      <View style={styles.deliveryProgressHeader}>
                        <Text style={styles.deliveryProgressTitle}>DELIVERY PROGRESS</Text>
                        <Text style={styles.deliveryProgressQty}>
                          {prod.deliveredQuantity || 0} / {prod.quantity} MT Sent
                        </Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(100, Math.max(0, ((prod.deliveredQuantity || 0) / (prod.quantity || 1)) * 100))}%`,
                              backgroundColor: '#4F46E5' // Indigo for delivery progress
                            }
                          ]}
                        />
                      </View>
                      <View style={styles.deliveryProgressFooter}>
                        <Text style={[styles.deliveryProgressText, { color: '#059669' }]}>
                          Delivered: {prod.deliveredQuantity || 0} MT
                        </Text>
                        <Text style={[styles.deliveryProgressText, { color: '#EF4444' }]}>
                          Remaining: {Math.max(0, (prod.quantity || 0) - (prod.deliveredQuantity || 0))} MT
                        </Text>
                      </View>
                    </View>
                  )}

                  {prod.paymentTerms ? (
                    <View style={[styles.ledgerTermsBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <CreditCard size={12} color="#475569" />
                      <Text style={styles.ledgerTermsText}>Payment Terms: {prod.paymentTerms}</Text>
                    </View>
                  ) : null}

                  <View style={styles.ledgerTotalRow}>
                    <Text style={styles.ledgerTotalLabel}>Computed Item Net Value</Text>
                    <Text style={styles.ledgerTotalValue}>₹{itemTotal.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 📜 DIGITAL CONTRACT SIGNATURE MATRIX */}
        {deal.approvalStatus && (
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Dual-Signature Escrow Stamp</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <ShieldCheck size={12} color="#4F46E5" />
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#4F46E5' }}>SECURE LOCK</Text>
              </View>
            </View>

            <View style={styles.signatureSealsContainer}>
              {/* Seller Seal */}
              <View style={[
                styles.compactSealCard,
                sellerApproved ? styles.sealApproved : sellerStatus === 'rejected' ? styles.sealRejected : styles.sealPending
              ]}>
                <View style={[
                  styles.compactSealCircle,
                  sellerApproved ? styles.sealCircleApproved : sellerStatus === 'rejected' ? styles.sealCircleRejected : sellerStatus === 'approved' ? styles.sealCircleApproved : styles.sealCirclePending
                ]}>
                  {sellerApproved ? (
                    <PenTool size={14} color="#047857" />
                  ) : sellerStatus === 'rejected' ? (
                    <X size={14} color="#B91C1C" />
                  ) : (
                    <Clock size={14} color="#B45309" />
                  )}
                </View>
                <View style={styles.compactSealInfo}>
                  <Text style={styles.compactSealRole}>SELLER</Text>
                  <Text style={styles.compactSealCompany} numberOfLines={1}>{sellerName}</Text>
                  <Text style={[
                    styles.compactSealStatusText,
                    { color: sellerApproved ? '#047857' : sellerStatus === 'rejected' ? '#B91C1C' : '#B45309' }
                  ]}>
                    {sellerApproved ? 'Signed' : sellerStatus === 'rejected' ? 'Declined' : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* Buyer Seal */}
              <View style={[
                styles.compactSealCard,
                buyerApproved ? styles.sealApproved : buyerStatus === 'rejected' ? styles.sealRejected : styles.sealPending
              ]}>
                <View style={[
                  styles.compactSealCircle,
                  buyerApproved ? styles.sealCircleApproved : buyerStatus === 'rejected' ? styles.sealCircleRejected : buyerStatus === 'approved' ? styles.sealCircleApproved : buyerStatus === 'pending' ? styles.sealCirclePending : styles.sealCirclePending
                ]}>
                  {buyerApproved ? (
                    <PenTool size={14} color="#047857" />
                  ) : buyerStatus === 'rejected' ? (
                    <X size={14} color="#B91C1C" />
                  ) : (
                    <Clock size={14} color="#B45309" />
                  )}
                </View>
                <View style={styles.compactSealInfo}>
                  <Text style={styles.compactSealRole}>BUYER</Text>
                  <Text style={styles.compactSealCompany} numberOfLines={1}>{buyerName}</Text>
                  <Text style={[
                    styles.compactSealStatusText,
                    { color: buyerApproved ? '#047857' : buyerStatus === 'rejected' ? '#B91C1C' : '#B45309' }
                  ]}>
                    {buyerApproved ? 'Signed' : buyerStatus === 'rejected' ? 'Declined' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* 💳 LOG PAYMENT MODAL */}
      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Payment Entry</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              {/* Amount input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Amount (INR)*</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter amount (e.g. 50000)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>

              {/* Payment Type Selection */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Type*</Text>
                <View style={styles.modalSelectorRow}>
                  <TouchableOpacity
                    style={[styles.modalSelectorBtn, paymentType === 'sent' && styles.modalSelectorBtnActive]}
                    onPress={() => setPaymentType('sent')}
                  >
                    <Text style={[styles.modalSelectorBtnText, paymentType === 'sent' && styles.modalSelectorBtnTextActive]}>
                      Sent (Paid)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSelectorBtn, paymentType === 'received' && styles.modalSelectorBtnActive]}
                    onPress={() => setPaymentType('received')}
                  >
                    <Text style={[styles.modalSelectorBtnText, paymentType === 'received' && styles.modalSelectorBtnTextActive]}>
                      Received
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Method Grid Selector */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Method*</Text>
                <View style={styles.methodGrid}>
                  {['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'RTGS', 'NEFT', 'IMPS'].map(method => {
                    const isActive = paymentMethod === method;
                    return (
                      <TouchableOpacity
                        key={method}
                        style={[styles.methodGridItem, isActive && styles.methodGridItemActive]}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Text style={[styles.methodGridText, isActive && styles.methodGridTextActive]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Transaction Notes (Optional)</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="e.g. Advance payment / Milestone 1"
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={3}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalCancelBtn]}
                  onPress={() => setIsPaymentModalVisible(false)}
                  disabled={isLoggingPayment}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalSubmitBtn]}
                  onPress={handleLogPayment}
                  disabled={isLoggingPayment}
                >
                  {isLoggingPayment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Log Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🧾 GST BREAKDOWN MODAL */}
      <Modal
        visible={isGstModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsGstModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Percent size={18} color="#E11D48" />
                <Text style={styles.modalTitle}>GST Invoice Breakdown</Text>
              </View>
              <TouchableOpacity onPress={() => setIsGstModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              {(() => {
                const breakdown = getGstBreakdown();
                return (
                  <View style={{ gap: 16 }}>
                    {/* Itemized Table */}
                    <Text style={[styles.modalInputLabel, { marginBottom: 4 }]}>Itemized Commercials</Text>
                    {breakdown.items.map((item, index) => (
                      <View key={index} style={styles.gstItemCard}>
                        <Text style={styles.gstItemName}>{item.name}</Text>

                        <View style={styles.gstGridRow}>
                          <View style={styles.gstGridCol}>
                            <Text style={styles.gstGridLabel}>Qty</Text>
                            <Text style={styles.gstGridValue}>{item.qty} MT</Text>
                          </View>
                          <View style={styles.gstGridCol}>
                            <Text style={styles.gstGridLabel}>Price/MT</Text>
                            <Text style={styles.gstGridValue}>₹{item.price.toLocaleString('en-IN')}</Text>
                          </View>
                          <View style={styles.gstGridCol}>
                            <Text style={styles.gstGridLabel}>GST Rate</Text>
                            <Text style={styles.gstGridValue}>{item.gstPercent}%</Text>
                          </View>
                        </View>

                        <View style={[styles.gstGridRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }]}>
                          <View style={styles.gstGridCol}>
                            <Text style={styles.gstGridLabel}>Discount</Text>
                            <Text style={[styles.gstGridValue, { color: item.discount > 0 ? '#10B981' : '#64748B' }]}>
                              -₹{item.discount.toLocaleString('en-IN')}
                            </Text>
                          </View>
                          <View style={styles.gstGridCol}>
                            <Text style={styles.gstGridLabel}>GST Tax</Text>
                            <Text style={[styles.gstGridValue, { color: '#E11D48' }]}>
                              +₹{Math.round(item.gstAmount).toLocaleString('en-IN')}
                            </Text>
                          </View>
                          <View style={styles.gstGridCol}>
                            <Text style={styles.gstGridLabel}>Net Amount</Text>
                            <Text style={[styles.gstGridValue, { fontWeight: '800', color: '#0F172A' }]}>
                              ₹{Math.round(item.total).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    {/* Tax Division Box (CGST/SGST/IGST breakdown) */}
                    <View style={styles.taxDivisionCard}>
                      <Text style={styles.taxDivisionTitle}>Tax Liability Split</Text>

                      <View style={styles.taxSplitRow}>
                        <Text style={styles.taxSplitLabel}>Central GST (CGST) - 50%</Text>
                        <Text style={styles.taxSplitValue}>₹{Math.round(breakdown.gstTotal / 2).toLocaleString('en-IN')}</Text>
                      </View>

                      <View style={styles.taxSplitRow}>
                        <Text style={styles.taxSplitLabel}>State GST (SGST) - 50%</Text>
                        <Text style={styles.taxSplitValue}>₹{Math.round(breakdown.gstTotal / 2).toLocaleString('en-IN')}</Text>
                      </View>

                      <View style={[styles.taxSplitRow, { borderTopWidth: 1, borderTopColor: '#FFE4E6', paddingTop: 8, marginTop: 4 }]}>
                        <Text style={[styles.taxSplitLabel, { fontWeight: '700', color: '#E11D48' }]}>Total Tax Value (GST)</Text>
                        <Text style={[styles.taxSplitValue, { fontWeight: '800', color: '#E11D48' }]}>₹{Math.round(breakdown.gstTotal).toLocaleString('en-IN')}</Text>
                      </View>
                    </View>

                    {/* Financial Summary */}
                    <View style={styles.financialSummaryCard}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Base Value</Text>
                        <Text style={styles.summaryValue}>₹{breakdown.baseTotal.toLocaleString('en-IN')}</Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Deducted Discounts</Text>
                        <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                          -₹{breakdown.discountTotal.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Taxable Value</Text>
                        <Text style={styles.summaryValue}>₹{(breakdown.baseTotal - breakdown.discountTotal).toLocaleString('en-IN')}</Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Applied GST Tax</Text>
                        <Text style={[styles.summaryValue, { color: '#E11D48' }]}>
                          +₹{Math.round(breakdown.gstTotal).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, marginTop: 4 }]}>
                        <Text style={[styles.summaryLabel, { fontSize: 14, fontWeight: '900', color: '#0F172A' }]}>Grand Gross Total</Text>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#4F46E5' }}>
                          ₹{Math.round(breakdown.grandTotal).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Disclaimer Banner */}
                    <View style={styles.disclaimerBanner}>
                      <Text style={styles.disclaimerText}>
                        * These figures are computed dynamically based on the verified quantity, rates, and active discount/GST policies signed in this Sauda.
                      </Text>
                    </View>

                    {/* Close Action */}
                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.modalSubmitBtn, { backgroundColor: '#E11D48', marginTop: 8 }]}
                      onPress={() => setIsGstModalVisible(false)}
                    >
                      <Text style={styles.modalSubmitBtnText}>Got it</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  /* COMPACT HEADER BAR */
  header: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
    letterSpacing: -0.2,
  },
  headerTitleText: {
    fontSize: 15,
    fontWeight: '805',
    color: '#0F172A',
  },
  headerSubtitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumHeaderChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chatNotificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerChatIcon: {
    fontSize: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* TRADE PASSPORT CARD */
  passportCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },
  passportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passportTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: 1.2,
  },
  statusBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    gap: 4,
  },
  statusBadgeTextInline: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  passportId: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  passportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  passportGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  passportGridCol: {
    flex: 1,
  },
  passportLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  passportValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  unifiedProductSection: {
    marginTop: 8,
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },

  /* STATS ROW */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  statValueSmall: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* SECTION & CARDS */
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
    letterSpacing: 0.2,
  },



  /* COMMERCIAL LEDGER CARD */
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  ledgerIndexBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ledgerIndexText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0284C7',
  },
  ledgerName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  ledgerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  ledgerCol: {
    minWidth: 70,
  },
  ledgerColLabel: {
    fontSize: 8,
    fontWeight: '850',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  ledgerColValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginTop: 2,
  },
  ledgerTermsBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ledgerTermsText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  ledgerTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginTop: 12,
  },
  ledgerTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  ledgerTotalValue: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#4F46E5',
  },

  /* DIGITAL STAMPS VALIDATION PANEL */
  signatureSealsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  compactSealCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  sealApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderStyle: 'solid',
  },
  sealPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  sealRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderStyle: 'solid',
  },
  compactSealCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sealCircleApproved: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.2,
  },
  sealCirclePending: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.1,
  },
  sealCircleRejected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.15,
  },
  compactSealInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  compactSealRole: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  compactSealCompany: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  compactSealStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  /* VALIDITY STATUS BANNER */
  statusBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBannerActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderLeftColor: '#10B981',
  },
  statusBannerExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftColor: '#EF4444',
  },
  statusBannerText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextExpired: {
    color: '#DC2626',
  },

  /* ACTION PANELS Decision center */
  actionPanelContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  actionDecisionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  decisionStatusBadgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  counterpartyApprovedBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  counterpartyApprovedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
  },
  decisionHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  decisionTag: {
    fontSize: 9,
    fontWeight: '950',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  decisionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#78350F',
    textAlign: 'center',
  },
  decisionDesc: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  decisionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#059669',
    borderColor: '#047857',
    borderWidth: 1,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  declineBtn: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  declineBtnText: {
    color: '#E11D48',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.2,
  },

  /* Waiting Card - Creator APPROVED */
  waitingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingSingleText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
  },
  approvedHighlight: {
    color: '#059669',
  },
  pendingHighlight: {
    color: '#D97706',
  },
  myRoleIndicatorBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  myRoleIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },

  /* Broker Card read only */
  brokerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  brokerCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
  brokerCardDesc: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },

  /* Celebrations APPROVED */
  approvedCelebrationCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  approvedCelebrationTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065F46',
  },
  approvedCelebrationDesc: {
    fontSize: 11,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 4,
  },


  /* Rejected style */
  rejectedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
  },
  rejectedCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#991B1B',
    textAlign: 'center',
  },
  rejectedCardDesc: {
    fontSize: 11,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 4,
  },

  /* Primary Open chat button */
  primaryActionBtn: {
    backgroundColor: '#4F46E5',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  /* Quick share row */
  shareRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  shareCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  shareLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '800',
  },

  /* DYNAMIC PROGRESS BAR */
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },

  /* PAYMENT METRIC CARD */
  paymentMetricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    alignItems: 'flex-start',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  paymentMetricLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  paymentMetricValue: {
    fontSize: 14,
    fontWeight: '900',
  },

  /* LOG TRANSACTION BUTTON */
  logPaymentActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logPaymentActionBtnText: {
    color: '#4F46E5',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  /* LEDGER TIMELINE STREAM */
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 36,
  },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 2,
  },
  timelineNodeSent: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  timelineNodeReceived: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  timelineNodeIcon: {
    fontSize: 12,
  },
  timelineConnectorLine: {
    width: 2,
    backgroundColor: '#E2E8F0',
    position: 'absolute',
    top: 32,
    bottom: -16,
    zIndex: 1,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineMethodText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  timelineAmountText: {
    fontSize: 12.5,
    fontWeight: '900',
  },
  timelineAmountSent: {
    color: '#E11D48',
  },
  timelineAmountReceived: {
    color: '#059669',
  },
  timelineNotesText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDateText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* MODAL OVERLAY & CONTAINER */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseIcon: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 10,
    fontWeight: '850',
    color: '#475569',
    letterSpacing: 0.2,
  },
  modalTextInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  modalSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  modalSelectorBtnActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  modalSelectorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSelectorBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodGridItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  methodGridItemActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodGridText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  methodGridTextActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontWeight: '900',
    fontSize: 12,
  },
  modalSubmitBtn: {
    backgroundColor: '#4F46E5',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  pmtDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pmtDetailText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  pmtFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  pmtStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pmtStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  verifyButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  verifyBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  declineVerifyBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  declineVerifyBtnText: {
    color: '#B91C1C',
    fontSize: 10.5,
    fontWeight: '800',
  },
  approveVerifyBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  approveVerifyBtnText: {
    color: '#047857',
    fontSize: 10.5,
    fontWeight: '800',
  },
  /* Delivery Progress Styles */
  deliveryProgressCard: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  deliveryProgressTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  deliveryProgressQty: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  deliveryProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  deliveryProgressText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  emptyTimelineText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  /* Timeline Node Sent/Received Custom Colors */
  timelineNodeSentBlue: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  timelineNodeReceivedGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  timelineAmountSentBlue: {
    color: '#4F46E5',
  },
  timelineAmountReceivedGreen: {
    color: '#059669',
  },
  /* FINTECH ACTIONS ROW */
  fintechActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  fintechActionItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fintechActionButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  fintechActionLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 6,
  },
  /* GST BREAKDOWN MODAL STYLES */
  gstItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  gstItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  gstGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gstGridCol: {
    flex: 1,
  },
  gstGridLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  gstGridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  taxDivisionCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  taxDivisionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E11D48',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taxSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  taxSplitLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  taxSplitValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  financialSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  disclaimerBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  disclaimerText: {
    fontSize: 9,
    color: '#64748B',
    lineHeight: 14,
    fontStyle: 'italic',
  },
});

export default DealDetails;