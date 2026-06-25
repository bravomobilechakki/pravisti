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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  CreditCard,
  Box,
  FileText,
} from 'lucide-react-native';
import {
  getDealDetails,
  getUserProfile,
  recordPayment,
  getPayments,
  getPaymentDashboard,
  updatePaymentStatus,
  getDeliveries,
  createDelivery,
  updateDeliveryStatus
} from '../../services/api';

const TransactionHistory = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = React.useState(!routeData?.deal);
  const [deal, setDeal] = React.useState(routeData?.deal || null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState(null);
  const [currentUserCompanyIds, setCurrentUserCompanyIds] = React.useState([]);

  // Metrics Data States
  const [paymentSummary, setPaymentSummary] = React.useState(null);
  const [paymentsHistory, setPaymentsHistory] = React.useState([]);
  const [deliveriesHistory, setDeliveriesHistory] = React.useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(false);
  const [isDeliveriesLoading, setIsDeliveriesLoading] = React.useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = React.useState(false);

  // Modal control states
  const [isPaymentModalVisible, setIsPaymentModalVisible] = React.useState(false);
  const [isDeliveryModalVisible, setIsDeliveryModalVisible] = React.useState(false);

  // Payment Log Input States
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentType, setPaymentType] = React.useState('sent');
  const [paymentMethod, setPaymentMethod] = React.useState('UPI');
  const [paymentNotes, setPaymentNotes] = React.useState('');
  const [isLoggingPayment, setIsLoggingPayment] = React.useState(false);

  // Delivery Log Input States
  const [deliveryQuantity, setDeliveryQuantity] = React.useState('');
  const [deliveryType, setDeliveryType] = React.useState('sent');
  const [deliveryNotes, setDeliveryNotes] = React.useState('');
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [isLoggingDelivery, setIsLoggingDelivery] = React.useState(false);

  // Filter tab selection
  const [activeTab, setActiveTab] = React.useState('all'); // 'all', 'deliveries', 'payments'

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
      console.warn('Failed to load ledger data:', e);
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

  const normalizeId = (val) => String(val?._id || val?.id || val || '');
  const sellerCid = deal ? normalizeId(deal.sellerCompanyId) : '';
  const buyerCid = deal ? normalizeId(deal.buyerCompanyId) : '';
  const brokerCid = deal ? normalizeId(deal.brokerCompanyId) : '';

  const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
  const currentUserRole = deal?.currentUserRole || viewerRole;

  const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());
  const isBuyer = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(buyerCid).toLowerCase());

  const openPaymentModal = () => {
    setPaymentType(isBuyer ? 'sent' : isSeller ? 'received' : 'sent');
    setPaymentAmount('');
    setPaymentMethod('UPI');
    setPaymentNotes('');
    setIsPaymentModalVisible(true);
  };

  const openDeliveryModal = () => {
    setDeliveryType(isSeller ? 'sent' : isBuyer ? 'received' : 'sent');
    setDeliveryQuantity('');
    setDeliveryNotes('');
    if (deal.products && deal.products.length > 0) {
      setSelectedProductId(normalizeId(deal.products[0].productId));
    } else if (deal.product) {
      setSelectedProductId(normalizeId(deal.product.productId));
    }
    setIsDeliveryModalVisible(true);
  };

  const handleLogPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than 0.');
      return;
    }

    const remainingPayable = Number(paymentSummary ? (isSeller ? paymentSummary.totalPendingToReceive : paymentSummary.totalPendingToPay) : (deal.totalAmount || 0)) || 0;
    if (amt > remainingPayable) {
      Alert.alert('Validation Error', `Amount cannot exceed outstanding balance of ₹${remainingPayable.toLocaleString('en-IN')}`);
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
        Alert.alert('Success', 'Payment transaction logged successfully!', [
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

  const handleLogDelivery = async () => {
    const qty = Number(deliveryQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation Error', 'Delivery quantity must be greater than 0 MT.');
      return;
    }

    let limit = 999999;
    if (deal.products && deal.products.length > 0) {
      const matched = deal.products.find(p => normalizeId(p.productId) === selectedProductId);
      if (matched) {
        limit = Math.max(0, Number(matched.quantity || 0) - Number(matched.deliveredQuantity || 0));
      }
    } else if (deal.product) {
      limit = Math.max(0, Number(deal.qty || deal.product.quantity || 0) - Number(deal.deliveredQuantity || deal.product.deliveredQuantity || 0));
    }

    if (qty > limit) {
      Alert.alert('Validation Error', `Quantity cannot exceed remaining pending delivery of ${limit} MT.`);
      return;
    }

    setIsLoggingDelivery(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: deal._id,
        productId: selectedProductId,
        quantity: qty,
        deliveryType,
        notes: deliveryNotes || undefined,
      };

      const res = await createDelivery(payload, token);
      if (res && res.success) {
        Alert.alert('Success', 'Delivery entry logged successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setIsDeliveryModalVisible(false);
              fetchPaymentData();
              fetchDealDetails();
            }
          }
        ]);
      }
    } catch (err) {
      Alert.alert('Logging Failed', err.message || 'Failed to record delivery');
    } finally {
      setIsLoggingDelivery(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsUpdating(true);
      const res = await updatePaymentStatus(paymentId, status, token);
      if (res && res.success) {
        Alert.alert('Success', `Payment status updated to ${status === 'approved' ? 'approved' : 'rejected'}.`, [
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

  const handleUpdateDeliveryStatus = async (deliveryId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsUpdating(true);
      const res = await updateDeliveryStatus(deliveryId, status, token);
      if (res && res.success) {
        Alert.alert('Success', `Delivery status updated to ${status === 'approved' ? 'approved' : 'rejected'}.`, [
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

  const canVerifyPayment = (pmt) => {
    if (!pmt || pmt.status !== 'pending') return false;
    const isBuyerCreated = pmt.paymentType === 'sent' || pmt.paymentType === 'given';
    if (isBuyerCreated && isSeller) return true;
    const isSellerCreated = pmt.paymentType === 'received';
    if (isSellerCreated && isBuyer) return true;
    return false;
  };

  const canVerifyDelivery = (deliv) => {
    if (!deliv || deliv.status !== 'pending') return false;
    if (deliv.deliveryType === 'sent' && isBuyer) return true;
    if (deliv.deliveryType === 'received' && isSeller) return true;
    return false;
  };

  const combinedHistory = React.useMemo(() => {
    const list = [];
    if (activeTab === 'all' || activeTab === 'payments') {
      if (paymentsHistory && Array.isArray(paymentsHistory)) {
        paymentsHistory.forEach(pmt => {
          list.push({
            ...pmt,
            timelineType: 'payment',
            dateForSort: pmt.createdAt ? new Date(pmt.createdAt) : new Date(0),
          });
        });
      }
    }
    if (activeTab === 'all' || activeTab === 'deliveries') {
      if (deliveriesHistory && Array.isArray(deliveriesHistory)) {
        deliveriesHistory.forEach(deliv => {
          list.push({
            ...deliv,
            timelineType: 'delivery',
            dateForSort: deliv.createdAt ? new Date(deliv.createdAt) : new Date(0),
          });
        });
      }
    }
    return list.sort((a, b) => b.dateForSort - a.dateForSort);
  }, [paymentsHistory, deliveriesHistory, activeTab]);

  const qtyTotals = React.useMemo(() => {
    if (!deal) return { total: 0, done: 0, left: 0 };
    if (deal.products && deal.products.length > 0) {
      let totalQty = 0;
      let totalDelivered = 0;
      deal.products.forEach(p => {
        totalQty += Number(p.quantity || 0);
        totalDelivered += Number(p.deliveredQuantity || 0);
      });
      return {
        total: totalQty,
        done: totalDelivered,
        left: Math.max(0, totalQty - totalDelivered)
      };
    }
    const firstProd = deal.product || {};
    const totalQty = Number(firstProd.quantity || deal.qty || 0);
    const totalDelivered = Number(deal.deliveredQuantity || firstProd.deliveredQuantity || 0);
    return {
      total: totalQty,
      done: totalDelivered,
      left: Math.max(0, totalQty - totalDelivered)
    };
  }, [deal]);

  const totalDealVal = deal ? Number(deal.grandTotal || deal.totalAmount || 0) : 0;
  const totalSentVal = paymentSummary ? Number(paymentSummary.totalAmountSent || 0) : 0;
  const percentPaid = totalDealVal > 0 ? Math.min(100, Math.max(0, (totalSentVal / totalDealVal) * 100)) : 0;
  const pendingPaymentVal = paymentSummary ? (isSeller ? paymentSummary.totalPendingToReceive : paymentSummary.totalPendingToPay) : totalDealVal;

  if (isLoading || !deal) {
    return (
      <View style={[styles.loaderContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading ledger...</Text>
      </View>
    );
  }

  const getCreatedByName = (item) => {
    if (!item) return 'N/A';

    // 1. If it's already an object with a name, use it
    if (item.createdBy && typeof item.createdBy === 'object') {
      if (item.createdBy.name) return item.createdBy.name;
    }

    const createdByIdStr = String(item.createdBy?._id || item.createdBy?.id || item.createdBy || '').trim().toLowerCase();

    if (!createdByIdStr) return 'N/A';

    // 2. If it matches current logged in user
    const loggedInIdStr = String(currentUserId || '').trim().toLowerCase();
    if (loggedInIdStr && createdByIdStr === loggedInIdStr) {
      return 'You';
    }

    // 3. Match against deal companies or roles
    const normalizeId = (val) => String(val?._id || val?.id || val || '').trim().toLowerCase();

    // Resolve company names
    const sellerName = deal?.sellerCompany?.name || deal?.sellerCompanyId?.companyName || deal?.sellerCompanyId?.name || 'Seller';
    const buyerName = deal?.buyerCompany?.name || deal?.buyerCompanyId?.companyName || deal?.buyerCompanyId?.name || 'Buyer';
    const brokerName = deal?.brokerCompany?.name || deal?.brokerCompanyId?.companyName || deal?.brokerCompanyId?.name || 'Broker';

    // Check if createdBy matches company owner IDs
    const sellerOwnerId = normalizeId(deal?.sellerCompany?.owner || deal?.sellerCompanyId?.owner);
    const buyerOwnerId = normalizeId(deal?.buyerCompany?.owner || deal?.buyerCompanyId?.owner);
    const brokerOwnerId = normalizeId(deal?.brokerCompany?.owner || deal?.brokerCompanyId?.owner);

    if (sellerOwnerId && createdByIdStr === sellerOwnerId) {
      return sellerName;
    }
    if (buyerOwnerId && createdByIdStr === buyerOwnerId) {
      return buyerName;
    }
    if (brokerOwnerId && createdByIdStr === brokerOwnerId) {
      return brokerName;
    }

    // Check if createdBy matches broker user ID
    const brokerUserId = normalizeId(deal?.brokerId || deal?.brokerUserId || deal?.createdBy);
    if (brokerUserId && createdByIdStr === brokerUserId) {
      return brokerName;
    }

    // 4. Fallback to transaction metadata role/type
    if (item.timelineType === 'payment') {
      const isSent = item.paymentType === 'sent' || item.paymentType === 'given';
      return isSent ? buyerName : sellerName;
    } else {
      const isSent = item.deliveryType === 'sent';
      return isSent ? sellerName : buyerName;
    }
  };

  const renderHistoryRow = (item, idx) => {
    const isPayment = item.timelineType === 'payment';
    const status = String(item.status || 'pending').toLowerCase();

    let icon = null;
    let title = 'Logistics';
    let value = '';
    let valueColor = '#0F172A';
    let statusLabel = 'PENDING';
    let statusColor = '#B45309';

    if (status === 'approved') {
      statusLabel = 'APPROVED';
      statusColor = '#047857';
    } else if (status === 'rejected') {
      statusLabel = 'REJECTED';
      statusColor = '#B91C1C';
    }

    if (isPayment) {
      const isSent = item.paymentType === 'sent' || item.paymentType === 'given';
      title = item.paymentMethod || 'Payment';
      value = `${isSent ? '-' : '+'}₹${Number(item.amount).toLocaleString('en-IN')}`;
      valueColor = isSent ? '#EF4444' : '#10B981';
      icon = isSent ? (
        <ArrowUpRight size={14} color="#EF4444" />
      ) : (
        <ArrowDownLeft size={14} color="#10B981" />
      );
    } else {
      const isSent = item.deliveryType === 'sent';
      if (deal.products && deal.products.length > 0) {
        const matchedProd = deal.products.find(p => normalizeId(p.productId) === normalizeId(item.productId));
        if (matchedProd) {
          title = matchedProd.productId?.name || matchedProd.name || 'Product';
        }
      } else if (deal.product) {
        title = deal.product?.productId?.name || deal.product?.name || 'Product';
      }
      value = `${item.quantity} MT`;
      valueColor = '#3B82F6';
      icon = isSent ? (
        <Truck size={14} color="#3B82F6" />
      ) : (
        <Box size={14} color="#3B82F6" />
      );
    }

    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'N/A';

    return (
      <View key={`${item.timelineType}-${item._id || idx}`} style={styles.timelineItemRow}>
        {/* Timeline Line & Node */}
        <View style={styles.timelineIndicatorCol}>
          <View style={[styles.timelineLine, idx === 0 && { backgroundColor: 'transparent' }]} />
          <View style={[styles.timelineNode, { backgroundColor: isPayment ? '#ECFDF5' : '#EFF6FF', borderColor: isPayment ? '#A7F3D0' : '#DBEAFE' }]}>
            {icon}
          </View>
          <View style={[styles.timelineLine, idx === combinedHistory.length - 1 && { backgroundColor: 'transparent' }]} />
        </View>

        {/* Timeline Content */}
        <View style={styles.timelineContentCol}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle} numberOfLines={1}>{title}</Text>
            <Text style={[styles.timelineValue, { color: valueColor }]}>{value}</Text>
          </View>

          <View style={styles.timelineMetaRow}>
            <Text style={styles.timelineMetaText}>
              {dateStr} • By: {getCreatedByName(item)}
            </Text>
            <Text style={[styles.timelineStatusText, { color: statusColor }]}>
              ● {statusLabel}
            </Text>
          </View>

          {item.notes ? (
            <View style={styles.timelineNotesContainer}>
              <FileText size={10} color="#64748B" />
              <Text style={styles.timelineNotes}>{item.notes}</Text>
            </View>
          ) : null}


        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sleek Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trade Execution Ledger</Text>
          <Text style={styles.headerSubtitle}>Sauda #{deal.dealNumber || deal._id?.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 📊 COMBINED MINIMALIST PROGRESS DASHBOARD */}
        <View style={styles.metricRow}>
          {/* Logistics Progress */}
          <View style={[styles.metricCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
            <View style={styles.metricHeader}>
              <Truck size={16} color="#1E40AF" />
              <Text style={[styles.metricTitle, { color: '#1E40AF' }]}>Logistics</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#1E3A8A' }]} adjustsFontSizeToFit numberOfLines={1}>
              {qtyTotals.left} MT left
            </Text>
            <View style={styles.metricProgressTrack}>
              <View style={[styles.metricProgressBar, { width: `${qtyTotals.total > 0 ? (qtyTotals.done / qtyTotals.total) * 100 : 0}%`, backgroundColor: '#3B82F6' }]} />
            </View>
            <Text style={[styles.metricSub, { color: '#2563EB' }]}>
              {qtyTotals.done} / {qtyTotals.total} MT done
            </Text>
          </View>

          {/* Settlement Progress */}
          <View style={[styles.metricCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
            <View style={styles.metricHeader}>
              <CreditCard size={16} color="#065F46" />
              <Text style={[styles.metricTitle, { color: '#065F46' }]}>Settlement</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#064E3B' }]} adjustsFontSizeToFit numberOfLines={1}>
              ₹{pendingPaymentVal.toLocaleString('en-IN')} left
            </Text>
            <View style={styles.metricProgressTrack}>
              <View style={[styles.metricProgressBar, { width: `${percentPaid}%`, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={[styles.metricSub, { color: '#10B981' }]}>
              ₹{totalSentVal.toLocaleString('en-IN')} settled
            </Text>
          </View>
        </View>

        {/* 🔒 TIMELINE SECTION */}
        <View style={styles.timelineHeaderRow}>
          <Text style={styles.timelineHeaderTitle}>History Records</Text>
          {/* Subtab selection */}
          <View style={styles.filterTabs}>
            {[
              { id: 'all', label: 'All' },
              { id: 'deliveries', label: 'Logistics' },
              { id: 'payments', label: 'Paid' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterTab, activeTab === tab.id && styles.filterTabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.filterTabText, activeTab === tab.id && styles.filterTabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isHistoryLoading || isDeliveriesLoading ? (
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 32 }} />
        ) : combinedHistory.length > 0 ? (
          <View style={styles.timelineContainer}>
            {combinedHistory.map((item, idx) => renderHistoryRow(item, idx))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <FileText size={24} color="#94A3B8" />
            <Text style={styles.emptyText}>No logs recorded for this tab filter yet.</Text>
          </View>
        )}

      </ScrollView>



      {/* 💳 LOG PAYMENT MODAL */}
      <Modal visible={isPaymentModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Payment Transaction</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
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

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Type*</Text>
                <View style={styles.modalTypeRow}>
                  <TouchableOpacity
                    style={[styles.modalTypeTab, paymentType === 'sent' && styles.modalTypeTabActive]}
                    onPress={() => setPaymentType('sent')}
                  >
                    <Text style={[styles.modalTypeTabText, paymentType === 'sent' && styles.modalTypeTabTextActive]}>Sent / Given</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalTypeTab, paymentType === 'received' && styles.modalTypeTabActive]}
                    onPress={() => setPaymentType('received')}
                  >
                    <Text style={[styles.modalTypeTabText, paymentType === 'received' && styles.modalTypeTabTextActive]}>Received</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Method*</Text>
                <View style={styles.modalTypeRow}>
                  {['UPI', 'RTGS/NEFT', 'Cheque', 'Cash'].map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modalMethodChip, paymentMethod === m && styles.modalMethodChipActive]}
                      onPress={() => setPaymentMethod(m)}
                    >
                      <Text style={[styles.modalMethodChipText, paymentMethod === m && styles.modalMethodChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Remarks / Reference (Optional)</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
                  placeholder="Reference number or transaction ID..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                />
              </View>

              <TouchableOpacity style={[styles.modalSubmitBtn, isLoggingPayment && styles.modalSubmitBtnDisabled]} onPress={handleLogPayment} disabled={isLoggingPayment}>
                {isLoggingPayment ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalSubmitBtnText}>Submit Payment Entry</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚚 LOG DELIVERY MODAL */}
      <Modal visible={isDeliveryModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsDeliveryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Dispatch / Delivery</Text>
              <TouchableOpacity onPress={() => setIsDeliveryModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              {deal.products && deal.products.length > 1 && (
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Select Product*</Text>
                  <View style={styles.productSelectorChipsRow}>
                    {deal.products.map(p => {
                      const isSel = selectedProductId === normalizeId(p.productId);
                      const prodName = p.productId?.name || p.name || 'Product';
                      return (
                        <TouchableOpacity
                          key={p._id}
                          style={[styles.productSelectChip, isSel && styles.productSelectChipActive]}
                          onPress={() => setSelectedProductId(normalizeId(p.productId))}
                        >
                          <Text style={[styles.productSelectChipText, isSel && styles.productSelectChipTextActive]}>{prodName}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Delivered Quantity (Metric Tons / MT)*</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter quantity in MT (e.g. 15)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={deliveryQuantity}
                  onChangeText={setDeliveryQuantity}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Logistics Action Type*</Text>
                <View style={styles.modalTypeRow}>
                  <TouchableOpacity
                    style={[styles.modalTypeTab, deliveryType === 'sent' && styles.modalTypeTabActive]}
                    onPress={() => setDeliveryType('sent')}
                  >
                    <Text style={[styles.modalTypeTabText, deliveryType === 'sent' && styles.modalTypeTabTextActive]}>Dispatched / Sent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalTypeTab, deliveryType === 'received' && styles.modalTypeTabActive]}
                    onPress={() => setDeliveryType('received')}
                  >
                    <Text style={[styles.modalTypeTabText, deliveryType === 'received' && styles.modalTypeTabTextActive]}>Receipt Confirmed</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Remarks / Logistics details (Optional)</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
                  placeholder="Truck number, transporter info..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                />
              </View>

              <TouchableOpacity style={[styles.modalSubmitBtn, isLoggingDelivery && styles.modalSubmitBtnDisabled]} onPress={handleLogDelivery} disabled={isLoggingDelivery}>
                {isLoggingDelivery ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalSubmitBtnText}>Submit Delivery Log</Text>}
              </TouchableOpacity>
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
    backgroundColor: '#F8FAFC',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 120, // Extra padding at bottom to avoid overlapping with sticky footer
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricEmoji: {
    fontSize: 16,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  metricProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
  },
  metricProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  metricSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: -4,
  },
  timelineHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
  },
  filterTabText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineItemRow: {
    flexDirection: 'row',
    minHeight: 70,
  },
  timelineIndicatorCol: {
    width: 32,
    alignItems: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#F1F5F9',
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    marginVertical: 4,
  },
  timelineNodeEmoji: {
    fontSize: 13,
  },
  timelineContentCol: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  timelineValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  timelineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  timelineMetaText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  timelineStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  timelineNotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#EDF2F7',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  timelineNotes: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  timelineVerifyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timelineVerifyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  timelineDeclineBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  timelineDeclineBtnText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '700',
  },
  timelineApproveBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  timelineApproveBtnText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 24,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
  },
  stickyFooterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stickyFooterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseIcon: {
    fontSize: 16,
    color: '#64748B',
    padding: 4,
    fontWeight: '800',
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalTextInput: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  modalTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalTypeTab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTypeTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modalTypeTabText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  modalTypeTabTextActive: {
    color: '#FFFFFF',
  },
  modalMethodChip: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMethodChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  modalMethodChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  modalMethodChipTextActive: {
    color: '#FFFFFF',
  },
  modalSubmitBtn: {
    height: 50,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  productSelectorChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  productSelectChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  productSelectChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  productSelectChipTextActive: {
    color: '#3B82F6',
  },
});

export default TransactionHistory;

