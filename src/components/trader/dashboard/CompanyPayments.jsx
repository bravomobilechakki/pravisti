import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  Truck,
  Box,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Building2,
  Calendar,
  Check,
  RefreshCw,
} from 'lucide-react-native';
import {
  getPayments,
  recordPayment,
  getPaymentDashboard,
  updatePaymentStatus,
  getDeliveries,
  createDelivery,
  updateDeliveryStatus,
  getDeals,
  getUserProfile,
  getCompanies,
} from '../../../services/api';

const CompanyPayments = ({ onNavigate, routeData }) => {
  const initialCompany = routeData?.company || {};
  const initialCompanyId = String(routeData?.companyId || initialCompany?._id || initialCompany?.id || '').trim();
  const initialCompanyName = routeData?.companyName || initialCompany?.name || initialCompany?.businessName || 'Company';

  const [userCompanies, setUserCompanies] = useState(initialCompany._id ? [initialCompany] : []);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [selectedCompanyName, setSelectedCompanyName] = useState(initialCompanyName);
  const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);

  // Tabs: 'payments' | 'delivery'
  const [activeTab, setActiveTab] = useState(routeData?.initialTab === 'delivery' ? 'delivery' : 'payments');

  // Core Data
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);

  // Filter & Search
  const [selectedDealId, setSelectedDealId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isDealPickerOpen, setIsDealPickerOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    dealId: '',
    amount: '',
    paymentType: 'sent', // 'sent' | 'received'
    paymentMethod: 'NEFT / RTGS', // 'NEFT / RTGS', 'UPI', 'Cheque', 'Cash', 'Net Banking'
    referenceNumber: '',
    notes: '',
  });

  // Delivery Form
  const [deliveryForm, setDeliveryForm] = useState({
    dealId: '',
    productId: '',
    productName: '',
    quantity: '',
    deliveryType: 'sent', // 'sent' | 'received'
    vehicleNumber: '',
    biltyNumber: '',
    notes: '',
  });

  const normalizeId = (val) => String(val?._id || val?.id || val || '').trim();

  /* ── Filter Helper: Is Payment for Company? ── */
  const isPaymentForCompany = (item, targetCompId, dealMap, dealIdSet) => {
    const normTarget = normalizeId(targetCompId).toLowerCase();
    if (!normTarget) return true;

    // Direct company IDs
    const pCid = normalizeId(item.companyId?._id || item.companyId).toLowerCase();
    if (pCid && pCid === normTarget) return true;

    const payerCid = normalizeId(item.payerCompanyId?._id || item.payerCompanyId).toLowerCase();
    if (payerCid && payerCid === normTarget) return true;

    const receiverCid = normalizeId(item.receiverCompanyId?._id || item.receiverCompanyId).toLowerCase();
    if (receiverCid && receiverCid === normTarget) return true;

    const sellerCid = normalizeId(item.sellerCompanyId?._id || item.sellerCompanyId).toLowerCase();
    if (sellerCid && sellerCid === normTarget) return true;

    const buyerCid = normalizeId(item.buyerCompanyId?._id || item.buyerCompanyId).toLowerCase();
    if (buyerCid && buyerCid === normTarget) return true;

    // Deal relationship
    const pDealId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId).toLowerCase();
    if (pDealId && dealIdSet && dealIdSet.has(pDealId)) {
      return true;
    }

    if (item.dealId && typeof item.dealId === 'object') {
      const s = normalizeId(item.dealId.sellerCompanyId?._id || item.dealId.sellerCompanyId).toLowerCase();
      const b = normalizeId(item.dealId.buyerCompanyId?._id || item.dealId.buyerCompanyId).toLowerCase();
      const c = normalizeId(item.dealId.companyId?._id || item.dealId.companyId).toLowerCase();
      const br = normalizeId(item.dealId.brokerCompanyId?._id || item.dealId.brokerCompanyId).toLowerCase();
      if (s === normTarget || b === normTarget || c === normTarget || br === normTarget) {
        return true;
      }
    }

    return false;
  };

  /* ── Filter Helper: Is Delivery for Company? ── */
  const isDeliveryForCompany = (item, targetCompId, dealMap, dealIdSet) => {
    const normTarget = normalizeId(targetCompId).toLowerCase();
    if (!normTarget) return true;

    const dCid = normalizeId(item.companyId?._id || item.companyId).toLowerCase();
    if (dCid && dCid === normTarget) return true;

    const dDealId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId).toLowerCase();
    if (dDealId && dealIdSet && dealIdSet.has(dDealId)) {
      return true;
    }

    if (item.dealId && typeof item.dealId === 'object') {
      const s = normalizeId(item.dealId.sellerCompanyId?._id || item.dealId.sellerCompanyId).toLowerCase();
      const b = normalizeId(item.dealId.buyerCompanyId?._id || item.dealId.buyerCompanyId).toLowerCase();
      const c = normalizeId(item.dealId.companyId?._id || item.dealId.companyId).toLowerCase();
      const br = normalizeId(item.dealId.brokerCompanyId?._id || item.dealId.brokerCompanyId).toLowerCase();
      if (s === normTarget || b === normTarget || c === normTarget || br === normTarget) {
        return true;
      }
    }

    return false;
  };

  /* ── Load Deals, Payments & Deliveries strictly filtered by Company ── */
  const fetchData = useCallback(async (isPullToRefresh = false, targetCid = selectedCompanyId) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const currentTargetCid = targetCid || selectedCompanyId || '';

    try {
      const token = await AsyncStorage.getItem('userToken');

      // 0. Load User's Companies List if available
      try {
        const compRes = await getCompanies(1, 50);
        if (compRes?.success && compRes.data) {
          const cList = compRes.data.companies || (Array.isArray(compRes.data) ? compRes.data : []);
          if (cList.length > 0) {
            setUserCompanies(cList);
          }
        }
      } catch (e) {
        console.warn('Could not load user companies:', e);
      }

      // 1. Fetch Company Deals
      let rawDeals = [];
      try {
        const dealsRes = await getDeals(token, 1, 100, currentTargetCid || undefined);
        if (dealsRes?.success && dealsRes.data) {
          rawDeals = Array.isArray(dealsRes.data)
            ? dealsRes.data
            : dealsRes.data.deals || dealsRes.data.data || [];
        }
      } catch (err) {
        console.warn('Could not load company deals:', err);
      }

      // Fallback: if no deals returned from company filter, fetch all user deals and filter
      if (rawDeals.length === 0) {
        try {
          const fallbackRes = await getDeals(token, 1, 100);
          if (fallbackRes?.success && fallbackRes.data) {
            rawDeals = Array.isArray(fallbackRes.data)
              ? fallbackRes.data
              : fallbackRes.data.deals || fallbackRes.data.data || [];
          }
        } catch (e) {
          console.warn('Fallback deals error:', e);
        }
      }

      // Filter deals strictly for currentTargetCid
      let companyDeals = rawDeals;
      if (currentTargetCid) {
        const targetNorm = normalizeId(currentTargetCid).toLowerCase();
        companyDeals = rawDeals.filter((d) => {
          const s = normalizeId(d.sellerCompanyId).toLowerCase();
          const b = normalizeId(d.buyerCompanyId).toLowerCase();
          const c = normalizeId(d.companyId).toLowerCase();
          const br = normalizeId(d.brokerCompanyId).toLowerCase();
          return s === targetNorm || b === targetNorm || c === targetNorm || br === targetNorm;
        });

        // Fallback matching by name if IDs differ
        if (companyDeals.length === 0 && rawDeals.length > 0) {
          const cNameNorm = String(selectedCompanyName || '').toLowerCase();
          if (cNameNorm) {
            companyDeals = rawDeals.filter((d) => {
              const sName = String(d.sellerCompanyId?.name || d.sellerCompanyName || '').toLowerCase();
              const bName = String(d.buyerCompanyId?.name || d.buyerCompanyName || '').toLowerCase();
              return sName.includes(cNameNorm) || bName.includes(cNameNorm);
            });
          }
          if (companyDeals.length === 0) {
            companyDeals = rawDeals;
          }
        }
      }
      setDeals(companyDeals);

      const dealIdSet = new Set(companyDeals.map((d) => normalizeId(d._id || d.id).toLowerCase()));
      const dealMap = {};
      companyDeals.forEach((d) => {
        dealMap[normalizeId(d._id || d.id).toLowerCase()] = d;
      });

      // 2. Fetch Payments strictly for this company
      let allRawPayments = [];
      try {
        const paymentParams = { limit: 100 };
        if (currentTargetCid) paymentParams.companyId = currentTargetCid;
        const paymentsRes = await getPayments(paymentParams, token);
        if (paymentsRes?.success && paymentsRes.data) {
          const list = Array.isArray(paymentsRes.data)
            ? paymentsRes.data
            : paymentsRes.data.payments || paymentsRes.data.data || [];
          allRawPayments = [...list];
        } else if (Array.isArray(paymentsRes)) {
          allRawPayments = [...paymentsRes];
        }
      } catch (err) {
        console.warn('Error fetching payments:', err);
      }

      // Fetch payments for each deal of this company in parallel
      if (companyDeals.length > 0) {
        try {
          const dealPayResults = await Promise.allSettled(
            companyDeals.slice(0, 15).map((d) => getPayments({ dealId: d._id || d.id }, token))
          );
          dealPayResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value?.success && r.value.data) {
              const list = Array.isArray(r.value.data)
                ? r.value.data
                : r.value.data.payments || r.value.data.data || [];
              list.forEach((p) => {
                allRawPayments.push({ ...p, dealId: p.dealId || companyDeals[idx] });
              });
            }
          });
        } catch (e) {}
      }

      // Extract embedded payments from deals
      companyDeals.forEach((d) => {
        if (Array.isArray(d.payments)) {
          d.payments.forEach((p) => allRawPayments.push({ ...p, dealId: p.dealId || d }));
        }
      });

      // Deduplicate payments by unique ID
      const seenPayIds = new Set();
      const uniquePayments = [];
      allRawPayments.forEach((p) => {
        const id = normalizeId(p._id || p.id || `${p.amount}-${p.createdAt}-${p.paymentMethod}`);
        if (!seenPayIds.has(id)) {
          seenPayIds.add(id);
          uniquePayments.push(p);
        }
      });

      // STRICT COMPANY FILTER FOR PAYMENTS
      const companyFilteredPayments = uniquePayments.filter((item) =>
        isPaymentForCompany(item, currentTargetCid, dealMap, dealIdSet)
      );
      setPayments(companyFilteredPayments);

      // 3. Fetch Deliveries strictly for this company
      let allRawDeliveries = [];
      try {
        const deliveryParams = { limit: 100 };
        if (currentTargetCid) deliveryParams.companyId = currentTargetCid;
        const deliveryRes = await getDeliveries(deliveryParams, token);
        if (deliveryRes?.success && deliveryRes.data) {
          const list = Array.isArray(deliveryRes.data)
            ? deliveryRes.data
            : deliveryRes.data.deliveries || deliveryRes.data.data || [];
          allRawDeliveries = [...list];
        } else if (Array.isArray(deliveryRes)) {
          allRawDeliveries = [...deliveryRes];
        }
      } catch (err) {
        console.warn('Error fetching deliveries:', err);
      }

      // Deal specific deliveries
      if (companyDeals.length > 0) {
        try {
          const dealDelivResults = await Promise.allSettled(
            companyDeals.slice(0, 15).map((d) => getDeliveries({ dealId: d._id || d.id }, token))
          );
          dealDelivResults.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value?.success && r.value.data) {
              const list = Array.isArray(r.value.data)
                ? r.value.data
                : r.value.data.deliveries || r.value.data.data || [];
              list.forEach((del) => {
                allRawDeliveries.push({ ...del, dealId: del.dealId || companyDeals[idx] });
              });
            }
          });
        } catch (e) {}
      }

      // Extract embedded deliveries from deals
      companyDeals.forEach((d) => {
        if (Array.isArray(d.deliveries)) {
          d.deliveries.forEach((del) => allRawDeliveries.push({ ...del, dealId: del.dealId || d }));
        }
      });

      // Deduplicate deliveries
      const seenDelivIds = new Set();
      const uniqueDeliveries = [];
      allRawDeliveries.forEach((del) => {
        const id = normalizeId(del._id || del.id || `${del.quantity}-${del.createdAt}`);
        if (!seenDelivIds.has(id)) {
          seenDelivIds.add(id);
          uniqueDeliveries.push(del);
        }
      });

      // STRICT COMPANY FILTER FOR DELIVERIES
      const companyFilteredDeliveries = uniqueDeliveries.filter((item) =>
        isDeliveryForCompany(item, currentTargetCid, dealMap, dealIdSet)
      );
      setDeliveries(companyFilteredDeliveries);

      // 4. Fetch Dashboard Summary
      try {
        if (currentTargetCid) {
          const dashRes = await getPaymentDashboard(currentTargetCid, '', token);
          if (dashRes?.success && dashRes.data) {
            setDashboardSummary(dashRes.data);
          }
        }
      } catch (err) {}
    } catch (error) {
      console.error('Error fetching company ledger:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCompanyId, selectedCompanyName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Filtered Payments & Deliveries ── */
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Deal filter
      if (selectedDealId !== 'all') {
        const itemDealId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId);
        if (itemDealId !== normalizeId(selectedDealId)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const method = (item.paymentMethod || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        const refNo = (item.referenceNumber || item.utrNumber || '').toLowerCase();
        const amt = String(item.amount || '');
        const dealCode = String(item.dealId?.dealNumber || item.dealId?._id || '').toLowerCase();
        return method.includes(q) || notes.includes(q) || refNo.includes(q) || amt.includes(q) || dealCode.includes(q);
      }
      return true;
    });
  }, [payments, selectedDealId, searchQuery]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((item) => {
      // Deal filter
      if (selectedDealId !== 'all') {
        const itemDealId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId);
        if (itemDealId !== normalizeId(selectedDealId)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        const prod = String(item.productId?.name || item.productName || '').toLowerCase();
        const qty = String(item.quantity || '');
        const status = (item.status || '').toLowerCase();
        const dealCode = String(item.dealId?.dealNumber || item.dealId?._id || '').toLowerCase();
        return notes.includes(q) || prod.includes(q) || qty.includes(q) || status.includes(q) || dealCode.includes(q);
      }
      return true;
    });
  }, [deliveries, selectedDealId, searchQuery]);

  /* ── Statistics calculated strictly from Filtered Data ── */
  const stats = useMemo(() => {
    let totalReceived = 0;
    let totalPaid = 0;
    let pendingCount = 0;

    filteredPayments.forEach((p) => {
      const amt = Number(p.amount || 0);
      const isSent = p.paymentType === 'sent' || p.paymentType === 'given' || p.type === 'debit';
      if (isSent) {
        totalPaid += amt;
      } else {
        totalReceived += amt;
      }
      if (String(p.status).toLowerCase() === 'pending') {
        pendingCount++;
      }
    });

    let totalDispatchedQty = 0;
    let totalDeliveredQty = 0;
    let pendingDeliveryCount = 0;

    filteredDeliveries.forEach((d) => {
      const qty = Number(d.quantity || 0);
      const status = String(d.status || 'pending').toLowerCase();
      if (status === 'delivered') {
        totalDeliveredQty += qty;
      } else {
        totalDispatchedQty += qty;
        pendingDeliveryCount++;
      }
    });

    return {
      totalReceived,
      totalPaid,
      pendingCount,
      totalDispatchedQty,
      totalDeliveredQty,
      pendingDeliveryCount,
    };
  }, [filteredPayments, filteredDeliveries]);

  /* ── Modal Open Handlers ── */
  const openRecordPaymentModal = () => {
    const defaultDealId = selectedDealId !== 'all' ? selectedDealId : deals[0]?._id || deals[0]?.id || '';
    setPaymentForm({
      dealId: defaultDealId,
      amount: '',
      paymentType: 'sent',
      paymentMethod: 'NEFT / RTGS',
      referenceNumber: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const openLogDeliveryModal = () => {
    const defaultDeal = selectedDealId !== 'all' ? deals.find((d) => (d._id || d.id) === selectedDealId) || deals[0] : deals[0];
    const dealId = defaultDeal?._id || defaultDeal?.id || '';
    let productId = '';
    let productName = '';
    if (defaultDeal?.products && defaultDeal.products.length > 0) {
      productId = defaultDeal.products[0]?.productId?._id || defaultDeal.products[0]?.productId || '';
      productName = defaultDeal.products[0]?.productId?.name || defaultDeal.products[0]?.name || '';
    } else if (defaultDeal?.product) {
      productId = defaultDeal.product?.productId?._id || defaultDeal.product?.productId || '';
      productName = defaultDeal.product?.productId?.name || defaultDeal.product?.name || '';
    }

    setDeliveryForm({
      dealId,
      productId,
      productName,
      quantity: '',
      deliveryType: 'sent',
      vehicleNumber: '',
      biltyNumber: '',
      notes: '',
    });
    setShowDeliveryModal(true);
  };

  /* ── Handle Submit Payment Entry ── */
  const handleRecordPayment = async () => {
    const amt = Number(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount greater than ₹0.');
      return;
    }
    if (!paymentForm.dealId) {
      Alert.alert('Validation Error', 'Please select a deal to record this payment against.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: paymentForm.dealId,
        amount: amt,
        paymentType: paymentForm.paymentType,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      };

      const res = await recordPayment(payload, token);
      if (res?.success) {
        Alert.alert('Success 🎉', 'Payment transaction recorded successfully!');
        setShowPaymentModal(false);
        fetchData(false);
      } else {
        Alert.alert('Error', res?.message || 'Could not record payment. Please try again.');
      }
    } catch (err) {
      Alert.alert('Payment Error', err.message || 'Network error occurred while recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Handle Submit Delivery Entry ── */
  const handleLogDelivery = async () => {
    const qty = Number(deliveryForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid delivery quantity.');
      return;
    }
    if (!deliveryForm.dealId) {
      Alert.alert('Validation Error', 'Please select a deal for this delivery.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const notesArray = [
        deliveryForm.vehicleNumber ? `Vehicle: ${deliveryForm.vehicleNumber.trim()}` : '',
        deliveryForm.biltyNumber ? `LR/Bilty: ${deliveryForm.biltyNumber.trim()}` : '',
        deliveryForm.notes ? deliveryForm.notes.trim() : '',
      ].filter(Boolean);

      const payload = {
        dealId: deliveryForm.dealId,
        productId: deliveryForm.productId || undefined,
        quantity: qty,
        deliveryType: deliveryForm.deliveryType,
        notes: notesArray.join(' | ') || undefined,
      };

      const res = await createDelivery(payload, token);
      if (res?.success) {
        Alert.alert('Success 🚚', 'Delivery entry logged successfully!');
        setShowDeliveryModal(false);
        fetchData(false);
      } else {
        Alert.alert('Error', res?.message || 'Could not record delivery. Please try again.');
      }
    } catch (err) {
      Alert.alert('Delivery Error', err.message || 'Network error occurred while logging delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Quick Update Status ── */
  const handleUpdatePaymentStatus = async (paymentId, status) => {
    setActionInProgressId(paymentId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await updatePaymentStatus(paymentId, status, token);
      if (res?.success) {
        Alert.alert('Status Updated', `Payment marked as ${status}.`);
        fetchData(false);
      } else {
        Alert.alert('Error', res?.message || 'Failed to update payment status.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update status.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleUpdateDeliveryStatus = async (deliveryId, status) => {
    setActionInProgressId(deliveryId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await updateDeliveryStatus(deliveryId, status, token);
      if (res?.success) {
        Alert.alert('Status Updated', `Delivery marked as ${status}.`);
        fetchData(false);
      } else {
        Alert.alert('Error', res?.message || 'Failed to update delivery status.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update delivery status.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Helper to get deal label
  const getDealLabel = (deal) => {
    if (!deal) return 'General';
    const dealCode = deal.dealNumber ? `#${deal.dealNumber}` : deal._id ? `#${deal._id.slice(-6).toUpperCase()}` : '';
    const counterparty =
      deal.sellerCompanyId?.name ||
      deal.buyerCompanyId?.name ||
      deal.sellerCompanyName ||
      deal.buyerCompanyName ||
      'Trade Deal';
    return `${dealCode} • ${counterparty}`;
  };

  // Selected Deal in Form
  const currentFormDeal = useMemo(() => {
    return deals.find((d) => (d._id || d.id) === (activeTab === 'payments' ? paymentForm.dealId : deliveryForm.dealId));
  }, [deals, activeTab, paymentForm.dealId, deliveryForm.dealId]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP ROYAL BLUE THEMED HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => onNavigate('pop')}
            activeOpacity={0.7}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <ArrowLeft size={20} color="#1541D8" strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Payments & Delivery</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsSearchVisible(!isSearchVisible)}
            activeOpacity={0.75}
          >
            <Search size={18} color="#1541D8" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Top Add Entry Button */}
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={activeTab === 'payments' ? openRecordPaymentModal : openLogDeliveryModal}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.headerActionBtnText}>
              {activeTab === 'payments' ? 'Payment' : 'Delivery'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 2. SEARCH BAR (COLLAPSIBLE) ─── */}
      {isSearchVisible && (
        <View style={styles.searchBarContainer}>
          <Search size={16} color="#64748B" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'payments' ? 'Search by method, amount, UTR, deal...' : 'Search by product, quantity, vehicle...'}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── 3. SEGMENTED TABS (Payments & Delivery) ─── */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'payments' && styles.tabButtonActive]}
          onPress={() => setActiveTab('payments')}
          activeOpacity={0.8}
        >
          <View style={[styles.tabIconBadge, activeTab === 'payments' && styles.tabIconBadgeActive]}>
            <CreditCard
              size={16}
              color={activeTab === 'payments' ? '#FFFFFF' : '#64748B'}
              strokeWidth={2.2}
            />
          </View>
          <Text style={[styles.tabButtonText, activeTab === 'payments' && styles.tabButtonTextActive]}>
            Payments
          </Text>
          <View style={[styles.countPill, activeTab === 'payments' && styles.countPillActive]}>
            <Text style={[styles.countPillText, activeTab === 'payments' && styles.countPillTextActive]}>
              {payments.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'delivery' && styles.tabButtonActive]}
          onPress={() => setActiveTab('delivery')}
          activeOpacity={0.8}
        >
          <View style={[styles.tabIconBadge, activeTab === 'delivery' && styles.tabIconBadgeActive]}>
            <Truck
              size={16}
              color={activeTab === 'delivery' ? '#FFFFFF' : '#64748B'}
              strokeWidth={2.2}
            />
          </View>
          <Text style={[styles.tabButtonText, activeTab === 'delivery' && styles.tabButtonTextActive]}>
            Delivery
          </Text>
          <View style={[styles.countPill, activeTab === 'delivery' && styles.countPillActive]}>
            <Text style={[styles.countPillText, activeTab === 'delivery' && styles.countPillTextActive]}>
              {deliveries.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── 4. DEAL FILTER CHIPS BAR ─── */}
      {deals.length > 0 && (
        <View style={styles.dealFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dealFilterScroll}
          >
            <TouchableOpacity
              style={[styles.dealChip, selectedDealId === 'all' && styles.dealChipActive]}
              onPress={() => setSelectedDealId('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.dealChipText, selectedDealId === 'all' && styles.dealChipTextActive]}>
                All Deals ({deals.length})
              </Text>
            </TouchableOpacity>

            {deals.map((d) => {
              const dId = d._id || d.id;
              const isSelected = selectedDealId === dId;
              const label = d.dealNumber ? `#${d.dealNumber}` : `#${dId.slice(-4).toUpperCase()}`;
              return (
                <TouchableOpacity
                  key={dId}
                  style={[styles.dealChip, isSelected && styles.dealChipActive]}
                  onPress={() => setSelectedDealId(dId)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dealChipText, isSelected && styles.dealChipTextActive]}>
                    Deal {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── 5. SCROLLABLE CONTENT ─── */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchData(true)}
            colors={['#1541D8']}
            tintColor="#1541D8"
          />
        }
      >
        {/* ── METRIC SUMMARY CARDS ── */}
        {activeTab === 'payments' ? (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryIconBoxGreen}>
                  <ArrowDownLeft size={12} color="#059669" strokeWidth={2.5} />
                </View>
                <Text style={styles.summaryLabel} numberOfLines={1}>Inflow</Text>
              </View>
              <Text style={styles.summaryValueGreen} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(stats.totalReceived)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryIconBoxRed}>
                  <ArrowUpRight size={12} color="#DC2626" strokeWidth={2.5} />
                </View>
                <Text style={styles.summaryLabel} numberOfLines={1}>Outflow</Text>
              </View>
              <Text style={styles.summaryValueRed} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(stats.totalPaid)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryIconBoxAmber}>
                  <Clock size={12} color="#D97706" strokeWidth={2.5} />
                </View>
                <Text style={styles.summaryLabel} numberOfLines={1}>Pending</Text>
              </View>
              <Text style={styles.summaryValueAmber} numberOfLines={1}>
                {stats.pendingCount}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryIconBoxBlue}>
                  <Truck size={12} color="#1541D8" strokeWidth={2.5} />
                </View>
                <Text style={styles.summaryLabel} numberOfLines={1}>Dispatched</Text>
              </View>
              <Text style={styles.summaryValueBlue} numberOfLines={1} adjustsFontSizeToFit>
                {stats.totalDispatchedQty} MT
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryIconBoxGreen}>
                  <CheckCircle2 size={12} color="#059669" strokeWidth={2.5} />
                </View>
                <Text style={styles.summaryLabel} numberOfLines={1}>Delivered</Text>
              </View>
              <Text style={styles.summaryValueGreen} numberOfLines={1} adjustsFontSizeToFit>
                {stats.totalDeliveredQty} MT
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryIconBoxPurple}>
                  <Box size={12} color="#7C3AED" strokeWidth={2.5} />
                </View>
                <Text style={styles.summaryLabel} numberOfLines={1}>Shipments</Text>
              </View>
              <Text style={styles.summaryValuePurple} numberOfLines={1}>
                {deliveries.length}
              </Text>
            </View>
          </View>
        )}

        {/* ── SECTION HEADER WITH QUICK ENTRY BUTTON ── */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionHeaderTitle}>
              {activeTab === 'payments' ? 'Payment Transactions' : 'Delivery Dispatches'}
            </Text>
            <Text style={styles.sectionHeaderSub}>
              {activeTab === 'payments'
                ? `Showing ${filteredPayments.length} transactions`
                : `Showing ${filteredDeliveries.length} shipments`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addEntryBtn}
            onPress={activeTab === 'payments' ? openRecordPaymentModal : openLogDeliveryModal}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#1541D8" strokeWidth={2.5} />
            <Text style={styles.addEntryBtnText}>
              {activeTab === 'payments' ? 'Record' : 'Add Entry'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── LOADING STATE ── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1541D8" />
            <Text style={styles.loadingText}>Fetching transaction records...</Text>
          </View>
        ) : null}

        {/* ── PAYMENTS TAB CONTENT ── */}
        {!isLoading && activeTab === 'payments' && (
          filteredPayments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Wallet size={36} color="#1541D8" strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>No Payment Transactions Found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedDealId !== 'all'
                  ? 'No payment entries recorded for this selected deal yet.'
                  : 'Start recording deals and payments to track complete cashflow.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={openRecordPaymentModal}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.emptyActionBtnText}>Record First Payment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPayments.map((item, index) => {
              const isSent = item.paymentType === 'sent' || item.paymentType === 'given' || item.type === 'debit';
              const status = String(item.status || 'pending').toLowerCase();
              const isPending = status === 'pending';
              const isApproved = status === 'approved';
              const isRejected = status === 'rejected';

              return (
                <View key={item._id || item.id || `pay-${index}`} style={styles.transactionCard}>
                  {/* Card Header */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.transactionTypePill,
                          isSent ? styles.typePillSent : styles.typePillReceived,
                        ]}
                      >
                        {isSent ? (
                          <ArrowUpRight size={12} color="#DC2626" strokeWidth={2.5} />
                        ) : (
                          <ArrowDownLeft size={12} color="#059669" strokeWidth={2.5} />
                        )}
                        <Text
                          style={[
                            styles.transactionTypePillText,
                            isSent ? styles.typeTextSent : styles.typeTextReceived,
                          ]}
                        >
                          {isSent ? 'SENT / PAID' : 'RECEIVED'}
                        </Text>
                      </View>

                      <Text style={styles.dealReferenceText} numberOfLines={1}>
                        {item.dealId?.dealNumber
                          ? `Deal #${item.dealId.dealNumber}`
                          : item.dealId?._id
                          ? `Deal #${item.dealId._id.slice(-6).toUpperCase()}`
                          : 'Deal Transaction'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.transactionAmount,
                        isSent ? styles.amountSent : styles.amountReceived,
                      ]}
                    >
                      {isSent ? '-' : '+'}{formatCurrency(item.amount)}
                    </Text>
                  </View>

                  {/* Card Details */}
                  <View style={styles.cardDetailsRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Method</Text>
                      <Text style={styles.detailValue}>{item.paymentMethod || 'Bank Transfer'}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{formatDate(item.createdAt || item.date)}</Text>
                    </View>

                    <View style={styles.detailItemRight}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isApproved && styles.statusBadgeApproved,
                          isRejected && styles.statusBadgeRejected,
                          isPending && styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isApproved && styles.statusTextApproved,
                            isRejected && styles.statusTextRejected,
                            isPending && styles.statusTextPending,
                          ]}
                        >
                          {status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* UTR / Reference / Notes */}
                  {(item.referenceNumber || item.utrNumber || item.notes) ? (
                    <View style={styles.cardFooterNotes}>
                      <FileText size={12} color="#64748B" strokeWidth={2} />
                      <Text style={styles.notesText} numberOfLines={2}>
                        {[
                          item.referenceNumber || item.utrNumber ? `Ref/UTR: ${item.referenceNumber || item.utrNumber}` : '',
                          item.notes ? item.notes : '',
                        ].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  ) : null}

                  {/* Pending Approval Action Buttons */}
                  {isPending && (
                    <View style={styles.actionButtonRow}>
                      <TouchableOpacity
                        style={[styles.quickStatusBtn, styles.approveBtn]}
                        onPress={() => handleUpdatePaymentStatus(item._id || item.id, 'approved')}
                        disabled={actionInProgressId === (item._id || item.id)}
                        activeOpacity={0.7}
                      >
                        {actionInProgressId === (item._id || item.id) ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Check size={14} color="#FFFFFF" strokeWidth={2.4} />
                            <Text style={styles.approveBtnText}>Approve Payment</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickStatusBtn, styles.rejectBtn]}
                        onPress={() => handleUpdatePaymentStatus(item._id || item.id, 'rejected')}
                        disabled={actionInProgressId === (item._id || item.id)}
                        activeOpacity={0.7}
                      >
                        <X size={14} color="#DC2626" strokeWidth={2.4} />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )
        )}

        {/* ── DELIVERY TAB CONTENT ── */}
        {!isLoading && activeTab === 'delivery' && (
          filteredDeliveries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Truck size={36} color="#1541D8" strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>No Delivery Logs Found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedDealId !== 'all'
                  ? 'No dispatch records logged for this selected deal yet.'
                  : 'Start recording vehicle dispatches, LR numbers, and delivery milestones.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={openLogDeliveryModal}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.emptyActionBtnText}>Log First Delivery</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredDeliveries.map((item, index) => {
              const isSent = item.deliveryType === 'sent' || item.type === 'dispatch';
              const status = String(item.status || 'in-transit').toLowerCase();
              const isDelivered = status === 'delivered';
              const isPending = status === 'pending' || status === 'in-transit';

              const prodName = item.productId?.name || item.productName || item.product?.name || 'Commodity Material';

              return (
                <View key={item._id || item.id || `del-${index}`} style={styles.transactionCard}>
                  {/* Card Header */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.transactionTypePill,
                          isSent ? styles.typePillBlue : styles.typePillReceived,
                        ]}
                      >
                        <Truck size={12} color={isSent ? '#1541D8' : '#059669'} strokeWidth={2.5} />
                        <Text
                          style={[
                            styles.transactionTypePillText,
                            isSent ? styles.typeTextBlue : styles.typeTextReceived,
                          ]}
                        >
                          {isSent ? 'DISPATCHED' : 'RECEIVED'}
                        </Text>
                      </View>

                      <Text style={styles.dealReferenceText} numberOfLines={1}>
                        {item.dealId?.dealNumber
                          ? `Deal #${item.dealId.dealNumber}`
                          : item.dealId?._id
                          ? `Deal #${item.dealId._id.slice(-6).toUpperCase()}`
                          : 'Deal Shipment'}
                      </Text>
                    </View>

                    <Text style={styles.deliveryQtyText}>
                      {item.quantity} MT
                    </Text>
                  </View>

                  {/* Product Name Banner */}
                  <View style={styles.productBanner}>
                    <Box size={14} color="#1541D8" strokeWidth={2} />
                    <Text style={styles.productBannerText} numberOfLines={1}>
                      {prodName}
                    </Text>
                  </View>

                  {/* Card Details */}
                  <View style={styles.cardDetailsRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Dispatched On</Text>
                      <Text style={styles.detailValue}>{formatDate(item.createdAt || item.date)}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{isSent ? 'Outward' : 'Inward'}</Text>
                    </View>

                    <View style={styles.detailItemRight}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isDelivered ? styles.statusBadgeApproved : styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isDelivered ? styles.statusTextApproved : styles.statusTextPending,
                          ]}
                        >
                          {status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Notes / Vehicle / Bilty Info */}
                  {item.notes ? (
                    <View style={styles.cardFooterNotes}>
                      <Truck size={12} color="#64748B" strokeWidth={2} />
                      <Text style={styles.notesText} numberOfLines={2}>
                        {item.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Mark Delivered Action */}
                  {!isDelivered && (
                    <View style={styles.actionButtonRow}>
                      <TouchableOpacity
                        style={[styles.quickStatusBtn, styles.approveBtn]}
                        onPress={() => handleUpdateDeliveryStatus(item._id || item.id, 'delivered')}
                        disabled={actionInProgressId === (item._id || item.id)}
                        activeOpacity={0.7}
                      >
                        {actionInProgressId === (item._id || item.id) ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.4} />
                            <Text style={styles.approveBtnText}>Mark as Delivered</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )
        )}
      </ScrollView>

      {/* ─── MODAL 1: RECORD PAYMENT ENTRY ─── */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrap}>
                  <CreditCard size={20} color="#1541D8" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Record Payment</Text>
                  <Text style={styles.modalSubtitle}>Log deal transaction entry</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Select Deal */}
              <Text style={styles.formLabel}>Select Deal *</Text>
              {deals.length === 0 ? (
                <View style={styles.noDealWarning}>
                  <AlertCircle size={14} color="#D97706" />
                  <Text style={styles.noDealWarningText}>
                    No deals found for this company yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.dealPickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dealPickerScroll}>
                    {deals.map((d) => {
                      const dId = d._id || d.id;
                      const isSelected = paymentForm.dealId === dId;
                      return (
                        <TouchableOpacity
                          key={dId}
                          style={[styles.dealPickerCard, isSelected && styles.dealPickerCardSelected]}
                          onPress={() => setPaymentForm({ ...paymentForm, dealId: dId })}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.dealPickerNumber, isSelected && styles.dealPickerTextSelected]}>
                            {d.dealNumber ? `#${d.dealNumber}` : `#${dId.slice(-4).toUpperCase()}`}
                          </Text>
                          <Text style={[styles.dealPickerParty, isSelected && styles.dealPickerTextSelected]} numberOfLines={1}>
                            {d.sellerCompanyId?.name || d.buyerCompanyId?.name || 'Deal'}
                          </Text>
                          {d.totalAmount ? (
                            <Text style={[styles.dealPickerAmount, isSelected && styles.dealPickerTextSelected]}>
                              ₹{Number(d.totalAmount).toLocaleString('en-IN')}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Payment Type: Sent vs Received */}
              <Text style={styles.formLabel}>Payment Direction *</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, paymentForm.paymentType === 'sent' && styles.toggleBtnActiveSent]}
                  onPress={() => setPaymentForm({ ...paymentForm, paymentType: 'sent' })}
                  activeOpacity={0.8}
                >
                  <ArrowUpRight
                    size={16}
                    color={paymentForm.paymentType === 'sent' ? '#FFFFFF' : '#DC2626'}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      paymentForm.paymentType === 'sent' && styles.toggleBtnTextActive,
                    ]}
                  >
                    I Paid / Sent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, paymentForm.paymentType === 'received' && styles.toggleBtnActiveReceived]}
                  onPress={() => setPaymentForm({ ...paymentForm, paymentType: 'received' })}
                  activeOpacity={0.8}
                >
                  <ArrowDownLeft
                    size={16}
                    color={paymentForm.paymentType === 'received' ? '#FFFFFF' : '#059669'}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      paymentForm.paymentType === 'received' && styles.toggleBtnTextActive,
                    ]}
                  >
                    I Received
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount (₹) */}
              <Text style={styles.formLabel}>Amount (₹) *</Text>
              <View style={styles.inputWithIcon}>
                <Text style={styles.rupeePrefix}>₹</Text>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="e.g. 50000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={paymentForm.amount}
                  onChangeText={(val) => setPaymentForm({ ...paymentForm, amount: val })}
                />
              </View>

              {/* Payment Method */}
              <Text style={styles.formLabel}>Payment Method</Text>
              <View style={styles.chipsRow}>
                {['NEFT / RTGS', 'UPI', 'Cheque', 'Cash', 'Net Banking'].map((method) => {
                  const isSelected = paymentForm.paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodChip, isSelected && styles.methodChipSelected]}
                      onPress={() => setPaymentForm({ ...paymentForm, paymentMethod: method })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.methodChipText,
                          isSelected && styles.methodChipTextSelected,
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* UTR / Reference No */}
              <Text style={styles.formLabel}>UTR / Reference / Cheque No.</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. UTR123498762 or CHQ-0012"
                placeholderTextColor="#94A3B8"
                value={paymentForm.referenceNumber}
                onChangeText={(val) => setPaymentForm({ ...paymentForm, referenceNumber: val })}
              />

              {/* Notes */}
              <Text style={styles.formLabel}>Notes / Remarks</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add optional transaction remarks or bank details..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={paymentForm.notes}
                onChangeText={(val) => setPaymentForm({ ...paymentForm, notes: val })}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleRecordPayment}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.submitButtonText}>Confirm & Record Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL 2: LOG DELIVERY ENTRY ─── */}
      <Modal
        visible={showDeliveryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrapBlue}>
                  <Truck size={20} color="#1541D8" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Log Delivery Dispatch</Text>
                  <Text style={styles.modalSubtitle}>Record vehicle shipment & quantities</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowDeliveryModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Select Deal */}
              <Text style={styles.formLabel}>Select Deal *</Text>
              {deals.length === 0 ? (
                <View style={styles.noDealWarning}>
                  <AlertCircle size={14} color="#D97706" />
                  <Text style={styles.noDealWarningText}>
                    No deals found for this company yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.dealPickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dealPickerScroll}>
                    {deals.map((d) => {
                      const dId = d._id || d.id;
                      const isSelected = deliveryForm.dealId === dId;
                      return (
                        <TouchableOpacity
                          key={dId}
                          style={[styles.dealPickerCard, isSelected && styles.dealPickerCardSelected]}
                          onPress={() => {
                            let prodId = '';
                            let prodName = '';
                            if (d.products && d.products.length > 0) {
                              prodId = d.products[0]?.productId?._id || d.products[0]?.productId || '';
                              prodName = d.products[0]?.productId?.name || d.products[0]?.name || '';
                            } else if (d.product) {
                              prodId = d.product?.productId?._id || d.product?.productId || '';
                              prodName = d.product?.productId?.name || d.product?.name || '';
                            }
                            setDeliveryForm({
                              ...deliveryForm,
                              dealId: dId,
                              productId: prodId,
                              productName: prodName,
                            });
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.dealPickerNumber, isSelected && styles.dealPickerTextSelected]}>
                            {d.dealNumber ? `#${d.dealNumber}` : `#${dId.slice(-4).toUpperCase()}`}
                          </Text>
                          <Text style={[styles.dealPickerParty, isSelected && styles.dealPickerTextSelected]} numberOfLines={1}>
                            {d.sellerCompanyId?.name || d.buyerCompanyId?.name || 'Deal'}
                          </Text>
                          {d.totalAmount ? (
                            <Text style={[styles.dealPickerAmount, isSelected && styles.dealPickerTextSelected]}>
                              ₹{Number(d.totalAmount).toLocaleString('en-IN')}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Delivery Type: Sent (Dispatched) vs Received */}
              <Text style={styles.formLabel}>Shipment Direction *</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, deliveryForm.deliveryType === 'sent' && styles.toggleBtnActiveBlue]}
                  onPress={() => setDeliveryForm({ ...deliveryForm, deliveryType: 'sent' })}
                  activeOpacity={0.8}
                >
                  <Truck
                    size={16}
                    color={deliveryForm.deliveryType === 'sent' ? '#FFFFFF' : '#1541D8'}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      deliveryForm.deliveryType === 'sent' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Outward (Dispatched)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, deliveryForm.deliveryType === 'received' && styles.toggleBtnActiveReceived]}
                  onPress={() => setDeliveryForm({ ...deliveryForm, deliveryType: 'received' })}
                  activeOpacity={0.8}
                >
                  <Box
                    size={16}
                    color={deliveryForm.deliveryType === 'received' ? '#FFFFFF' : '#059669'}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      deliveryForm.deliveryType === 'received' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Inward (Received)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Product Selection if Deal has multiple */}
              {currentFormDeal?.products && currentFormDeal.products.length > 1 && (
                <>
                  <Text style={styles.formLabel}>Select Product</Text>
                  <View style={styles.chipsRow}>
                    {currentFormDeal.products.map((p, pIdx) => {
                      const pId = p.productId?._id || p.productId || `p-${pIdx}`;
                      const pName = p.productId?.name || p.name || `Product ${pIdx + 1}`;
                      const isSelected = deliveryForm.productId === pId;
                      return (
                        <TouchableOpacity
                          key={pId}
                          style={[styles.methodChip, isSelected && styles.methodChipSelected]}
                          onPress={() => setDeliveryForm({ ...deliveryForm, productId: pId, productName: pName })}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.methodChipText, isSelected && styles.methodChipTextSelected]}>
                            {pName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Quantity (MT) */}
              <Text style={styles.formLabel}>Quantity (MT) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 25.5"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={deliveryForm.quantity}
                onChangeText={(val) => setDeliveryForm({ ...deliveryForm, quantity: val })}
              />

              {/* Vehicle / Truck Number */}
              <Text style={styles.formLabel}>Vehicle / Truck Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. MH 12 AB 1234 or RJ 14 GC 9876"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={deliveryForm.vehicleNumber}
                onChangeText={(val) => setDeliveryForm({ ...deliveryForm, vehicleNumber: val })}
              />

              {/* Bilty / LR Number */}
              <Text style={styles.formLabel}>LR / Bilty Number / Driver Phone</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. LR-89127 or Driver: 9876543210"
                placeholderTextColor="#94A3B8"
                value={deliveryForm.biltyNumber}
                onChangeText={(val) => setDeliveryForm({ ...deliveryForm, biltyNumber: val })}
              />

              {/* Notes */}
              <Text style={styles.formLabel}>Dispatch Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add destination warehouse, weight slip info, or inspection notes..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={deliveryForm.notes}
                onChangeText={(val) => setDeliveryForm({ ...deliveryForm, notes: val })}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleLogDelivery}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.submitButtonText}>Confirm & Log Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ─── MODAL 3: SELECT COMPANY FILTER ─── */}
      <Modal
        visible={isCompanyPickerOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCompanyPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setIsCompanyPickerOpen(false)}
        >
          <View style={styles.companyPickerModal}>
            <View style={styles.companyPickerHeader}>
              <View style={styles.modalTitleRow}>
                <Building2 size={18} color="#1541D8" strokeWidth={2.2} />
                <Text style={styles.modalTitle}>Filter by Company</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCompanyPickerOpen(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {userCompanies.map((c) => {
                const cId = c._id || c.id;
                const cName = c.name || c.businessName || 'Company';
                const isSelected = String(selectedCompanyId).toLowerCase() === String(cId).toLowerCase();
                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.companyPickerItem, isSelected && styles.companyPickerItemSelected]}
                    onPress={() => {
                      setSelectedCompanyId(cId);
                      setSelectedCompanyName(cName);
                      setSelectedDealId('all');
                      setIsCompanyPickerOpen(false);
                      fetchData(false, cId);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.companyPickerItemLeft}>
                      <View style={[styles.companyAvatarBox, isSelected && styles.companyAvatarBoxSelected]}>
                        <Text style={[styles.companyAvatarText, isSelected && styles.companyAvatarTextSelected]}>
                          {cName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.companyPickerItemName, isSelected && styles.companyPickerItemNameSelected]} numberOfLines={1}>
                          {cName}
                        </Text>
                        <Text style={styles.companyPickerItemRole}>
                          {c.role ? `${c.role.toUpperCase()} • ` : ''}{c.city || 'Verified Trader'}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check size={18} color="#1541D8" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default CompanyPayments;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* ── 1. Top Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerCompanyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#1541D8',
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  companyPickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  companyPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  companyPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  companyPickerItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1541D8',
  },
  companyPickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  companyAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyAvatarBoxSelected: {
    backgroundColor: '#1541D8',
  },
  companyAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  companyAvatarTextSelected: {
    color: '#FFFFFF',
  },
  companyPickerItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  companyPickerItemNameSelected: {
    color: '#1541D8',
    fontWeight: '700',
  },
  companyPickerItemRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1541D8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  headerActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* ── 2. Collapsible Search Bar ── */
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },

  /* ── 3. Segmented Top Tabs ── */
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#1541D8',
  },
  tabIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBadgeActive: {
    backgroundColor: '#1541D8',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#1541D8',
    fontWeight: '700',
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
  },
  countPillActive: {
    backgroundColor: '#1541D8',
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  countPillTextActive: {
    color: '#FFFFFF',
  },

  /* ── 4. Deal Filter Chips ── */
  dealFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dealFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dealChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dealChipActive: {
    backgroundColor: '#1541D8',
    borderColor: '#1541D8',
  },
  dealChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dealChipTextActive: {
    color: '#FFFFFF',
  },

  /* ── 5. Scroll Content ── */
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  /* ── Metric Summary Cards ── */
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  summaryIconBoxGreen: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBoxRed: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBoxAmber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBoxBlue: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBoxPurple: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  summaryValueGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  summaryValueRed: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  summaryValueAmber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  summaryValueBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1541D8',
  },
  summaryValuePurple: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },

  /* ── Section Header ── */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addEntryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
  },

  /* ── Loading & Empty States ── */
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1541D8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* ── Transaction Card ── */
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  transactionTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  typePillSent: {
    backgroundColor: '#FEF2F2',
  },
  typePillReceived: {
    backgroundColor: '#ECFDF5',
  },
  typePillBlue: {
    backgroundColor: '#EFF6FF',
  },
  transactionTypePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  typeTextSent: {
    color: '#DC2626',
  },
  typeTextReceived: {
    color: '#059669',
  },
  typeTextBlue: {
    color: '#1541D8',
  },
  dealReferenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  amountSent: {
    color: '#DC2626',
  },
  amountReceived: {
    color: '#059669',
  },
  deliveryQtyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1541D8',
  },
  productBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flex: 1,
  },
  detailItemRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextApproved: {
    color: '#15803D',
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextRejected: {
    color: '#B91C1C',
  },
  cardFooterNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    gap: 6,
  },
  notesText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveBtn: {
    backgroundColor: '#15803D',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },

  /* ── Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconWrapBlue: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  noDealWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noDealWarningText: {
    fontSize: 12,
    color: '#B45309',
    flex: 1,
  },
  dealPickerContainer: {
    marginBottom: 4,
  },
  dealPickerScroll: {
    gap: 8,
  },
  dealPickerCard: {
    width: 120,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dealPickerCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1541D8',
  },
  dealPickerNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  dealPickerParty: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  dealPickerAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1541D8',
  },
  dealPickerTextSelected: {
    color: '#1541D8',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  toggleBtnActiveSent: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  toggleBtnActiveReceived: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  toggleBtnActiveBlue: {
    backgroundColor: '#1541D8',
    borderColor: '#1541D8',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  rupeePrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1541D8',
    marginRight: 6,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1541D8',
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  methodChipTextSelected: {
    color: '#1541D8',
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1541D8',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 22,
    marginBottom: 20,
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
