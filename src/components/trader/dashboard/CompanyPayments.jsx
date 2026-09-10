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
  Image,
  Linking,
  Share,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
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
  Download,
  Share2,
  Paperclip,
  ExternalLink,
  Eye,
  Camera,
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
  uploadImage,
  resolveImageUrl,
} from '../../../services/api';
import { downloadFileToDevice } from '../../../utils/fileDownloader';

const CompanyPayments = ({ onNavigate, routeData }) => {
  const initialCompany = routeData?.company || {};
  const normalizeId = (val) => String(val?._id || val?.id || val || '').trim();

  const initialCompanyId = normalizeId(routeData?.companyId || initialCompany?._id || initialCompany?.id || routeData?.company);
  const initialCompanyName = String(routeData?.companyName || initialCompany?.name || initialCompany?.businessName || initialCompany?.companyName || '').trim();

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

  // Modals & Inline Dropdowns
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isDealDropdownExpanded, setIsDealDropdownExpanded] = useState(false);
  const [isPaymentDealDropdownExpanded, setIsPaymentDealDropdownExpanded] = useState(false);
  const [isDeliveryDealDropdownExpanded, setIsDeliveryDealDropdownExpanded] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(routeData?.user || null);

  // Load Current User Identity
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await getUserProfile(token);
        if (res?.success && res.data) {
          setCurrentUser(res.data);
        }
      } catch (e) {
        console.warn('Error fetching user profile in CompanyPayments:', e);
      }
    };
    fetchUser();
  }, []);

  // Sync state if routeData changes (e.g. user opens different company details)
  useEffect(() => {
    const comp = routeData?.company || {};
    const cid = normalizeId(routeData?.companyId || comp?._id || comp?.id || routeData?.company);
    const cname = String(routeData?.companyName || comp?.name || comp?.businessName || comp?.companyName || '').trim();
    if (cid && cid !== selectedCompanyId) {
      setSelectedCompanyId(cid);
      setSelectedCompanyName(cname);
    }
  }, [routeData?.companyId, routeData?.company]);

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

  // Proof & Attachment States
  const [fullPreviewImage, setFullPreviewImage] = useState(null);
  const [paymentAttachmentUrl, setPaymentAttachmentUrl] = useState('');
  const [paymentAttachmentAsset, setPaymentAttachmentAsset] = useState(null);
  const [isUploadingPaymentAttachment, setIsUploadingPaymentAttachment] = useState(false);

  const [deliveryAttachmentUrl, setDeliveryAttachmentUrl] = useState('');
  const [deliveryAttachmentAsset, setDeliveryAttachmentAsset] = useState(null);
  const [isUploadingDeliveryAttachment, setIsUploadingDeliveryAttachment] = useState(false);

  /* ── Filter Helper: Is Deal for Company? (Strict) ── */
  const isDealForThisCompany = (deal, targetCompId, targetCompName) => {
    if (!deal) return false;
    const tId = normalizeId(targetCompId).toLowerCase();
    const tName = String(targetCompName || '').trim().toLowerCase();

    if (!tId && !tName) return false;

    const extract = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val.trim().toLowerCase();
      return normalizeId(val._id || val.id || val).toLowerCase();
    };

    const sellerCid = extract(deal.sellerCompanyId);
    const buyerCid = extract(deal.buyerCompanyId);
    const brokerCid = extract(deal.brokerCompanyId);
    const p1Cid = extract(deal.party1?.companyId || deal.party1?.company);
    const p2Cid = extract(deal.party2?.companyId || deal.party2?.company);
    const creatorCid = extract(deal.creatorCompanyId);
    const targetDealCid = extract(deal.targetCompanyId);
    const directCid = extract(deal.companyId);

    if (tId) {
      if (
        sellerCid === tId ||
        buyerCid === tId ||
        brokerCid === tId ||
        p1Cid === tId ||
        p2Cid === tId ||
        creatorCid === tId ||
        targetDealCid === tId ||
        directCid === tId
      ) {
        return true;
      }
    }

    if (tName && tName !== 'company') {
      const sName = String(deal.sellerCompany?.name || deal.sellerCompanyId?.name || deal.sellerCompanyName || '').trim().toLowerCase();
      const bName = String(deal.buyerCompany?.name || deal.buyerCompanyId?.name || deal.buyerCompanyName || '').trim().toLowerCase();
      const p1Name = String(deal.party1?.company?.name || deal.party1?.name || '').trim().toLowerCase();
      const p2Name = String(deal.party2?.company?.name || deal.party2?.name || '').trim().toLowerCase();
      const dName = String(deal.companyName || deal.company?.name || '').trim().toLowerCase();
      if (
        (sName && sName === tName) ||
        (bName && bName === tName) ||
        (p1Name && p1Name === tName) ||
        (p2Name && p2Name === tName) ||
        (dName && dName === tName)
      ) {
        return true;
      }
    }

    return false;
  };

  /* ── Filter Helper: Is Payment for Company? (Strict) ── */
  const isPaymentForCompany = (item, targetCompId, targetCompName, dealIdSet) => {
    if (!item) return false;
    const normTarget = normalizeId(targetCompId).toLowerCase();
    const normName = String(targetCompName || '').trim().toLowerCase();

    // 1. Check if linked to one of this company's validated deals
    const pDealId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId).toLowerCase();
    if (pDealId && dealIdSet && dealIdSet.has(pDealId)) {
      return true;
    }

    // 2. Direct company IDs on payment
    if (normTarget) {
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

      const brokerCid = normalizeId(item.brokerCompanyId?._id || item.brokerCompanyId).toLowerCase();
      if (brokerCid && brokerCid === normTarget) return true;

      // Check inside item.dealId if populated
      if (item.dealId && typeof item.dealId === 'object') {
        const dSellerCid = normalizeId(item.dealId.sellerCompanyId?._id || item.dealId.sellerCompanyId).toLowerCase();
        const dBuyerCid = normalizeId(item.dealId.buyerCompanyId?._id || item.dealId.buyerCompanyId).toLowerCase();
        const dBrokerCid = normalizeId(item.dealId.brokerCompanyId?._id || item.dealId.brokerCompanyId).toLowerCase();
        const dCompCid = normalizeId(item.dealId.companyId?._id || item.dealId.companyId).toLowerCase();
        const dP1Cid = normalizeId(item.dealId.party1?.companyId || item.dealId.party1?.company).toLowerCase();
        const dP2Cid = normalizeId(item.dealId.party2?.companyId || item.dealId.party2?.company).toLowerCase();
        if (
          dSellerCid === normTarget ||
          dBuyerCid === normTarget ||
          dBrokerCid === normTarget ||
          dCompCid === normTarget ||
          dP1Cid === normTarget ||
          dP2Cid === normTarget
        ) {
          return true;
        }
      }
    }

    // 3. Match by company name
    if (normName && normName !== 'company') {
      const payerName = String(item.payerCompanyName || item.payerCompany?.name || '').trim().toLowerCase();
      const receiverName = String(item.receiverCompanyName || item.receiverCompany?.name || '').trim().toLowerCase();
      const cName = String(item.companyName || item.company?.name || '').trim().toLowerCase();
      if (
        (payerName && payerName === normName) ||
        (receiverName && receiverName === normName) ||
        (cName && cName === normName)
      ) {
        return true;
      }

      if (item.dealId && typeof item.dealId === 'object') {
        const dSellerName = String(item.dealId.sellerCompany?.name || item.dealId.sellerCompanyId?.name || item.dealId.sellerCompanyName || '').trim().toLowerCase();
        const dBuyerName = String(item.dealId.buyerCompany?.name || item.dealId.buyerCompanyId?.name || item.dealId.buyerCompanyName || '').trim().toLowerCase();
        if ((dSellerName && dSellerName === normName) || (dBuyerName && dBuyerName === normName)) {
          return true;
        }
      }
    }

    return false;
  };

  /* ── Filter Helper: Is Delivery for Company? (Strict) ── */
  const isDeliveryForCompany = (item, targetCompId, targetCompName, dealIdSet) => {
    if (!item) return false;
    const normTarget = normalizeId(targetCompId).toLowerCase();
    const normName = String(targetCompName || '').trim().toLowerCase();

    // 1. Linked to one of this company's validated deals
    const dDealId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId).toLowerCase();
    if (dDealId && dealIdSet && dealIdSet.has(dDealId)) {
      return true;
    }

    // 2. Direct company IDs
    if (normTarget) {
      const dCid = normalizeId(item.companyId?._id || item.companyId).toLowerCase();
      if (dCid && dCid === normTarget) return true;

      const sellerCid = normalizeId(item.sellerCompanyId?._id || item.sellerCompanyId).toLowerCase();
      if (sellerCid && sellerCid === normTarget) return true;

      const buyerCid = normalizeId(item.buyerCompanyId?._id || item.buyerCompanyId).toLowerCase();
      if (buyerCid && buyerCid === normTarget) return true;

      const brokerCid = normalizeId(item.brokerCompanyId?._id || item.brokerCompanyId).toLowerCase();
      if (brokerCid && brokerCid === normTarget) return true;

      if (item.dealId && typeof item.dealId === 'object') {
        const dSellerCid = normalizeId(item.dealId.sellerCompanyId?._id || item.dealId.sellerCompanyId).toLowerCase();
        const dBuyerCid = normalizeId(item.dealId.buyerCompanyId?._id || item.dealId.buyerCompanyId).toLowerCase();
        const dBrokerCid = normalizeId(item.dealId.brokerCompanyId?._id || item.dealId.brokerCompanyId).toLowerCase();
        const dCompCid = normalizeId(item.dealId.companyId?._id || item.dealId.companyId).toLowerCase();
        const dP1Cid = normalizeId(item.dealId.party1?.companyId || item.dealId.party1?.company).toLowerCase();
        const dP2Cid = normalizeId(item.dealId.party2?.companyId || item.dealId.party2?.company).toLowerCase();
        if (
          dSellerCid === normTarget ||
          dBuyerCid === normTarget ||
          dBrokerCid === normTarget ||
          dCompCid === normTarget ||
          dP1Cid === normTarget ||
          dP2Cid === normTarget
        ) {
          return true;
        }
      }
    }

    // 3. Name check
    if (normName && normName !== 'company') {
      const cName = String(item.companyName || item.company?.name || '').trim().toLowerCase();
      if (cName && cName === normName) return true;

      if (item.dealId && typeof item.dealId === 'object') {
        const dSellerName = String(item.dealId.sellerCompany?.name || item.dealId.sellerCompanyId?.name || '').trim().toLowerCase();
        const dBuyerName = String(item.dealId.buyerCompany?.name || item.dealId.buyerCompanyId?.name || '').trim().toLowerCase();
        if ((dSellerName && dSellerName === normName) || (dBuyerName && dBuyerName === normName)) {
          return true;
        }
      }
    }

    return false;
  };

  /* ── Check if Entry was Created By Current User/Company ── */
  const isEntryCreatedByMe = (item) => {
    if (!item) return false;

    const myUserId = normalizeId(currentUser?._id || currentUser?.id || routeData?.user?._id || routeData?.user?.id).toLowerCase();
    const myCompanyId = normalizeId(selectedCompanyId || initialCompanyId).toLowerCase();

    // 1. Check User ID match
    const creatorUserId = normalizeId(
      item.createdBy?._id ||
      item.createdBy?.id ||
      item.createdBy ||
      item.userId ||
      item.creatorId ||
      item.recordedBy?._id ||
      item.recordedBy
    ).toLowerCase();

    if (myUserId && creatorUserId && myUserId === creatorUserId) {
      return true;
    }

    // 2. Check Creator Company ID match
    const creatorCompanyId = normalizeId(
      item.creatorCompanyId?._id ||
      item.creatorCompanyId ||
      item.creatorCompany?._id ||
      item.creatorCompany ||
      item.companyId?._id ||
      item.companyId
    ).toLowerCase();

    if (myCompanyId && creatorCompanyId && myCompanyId === creatorCompanyId) {
      return true;
    }

    // 3. Direction match for Payments:
    // If sent, the payer entered it. If my company is the payer, I created it!
    const payerCompanyId = normalizeId(item.payerCompanyId?._id || item.payerCompanyId).toLowerCase();
    const receiverCompanyId = normalizeId(item.receiverCompanyId?._id || item.receiverCompanyId).toLowerCase();
    const paymentType = String(item.paymentType || item.type || '').toLowerCase();

    if (myCompanyId) {
      if ((paymentType === 'sent' || paymentType === 'debit') && payerCompanyId && myCompanyId === payerCompanyId) {
        return true;
      }
      if ((paymentType === 'received' || paymentType === 'credit') && receiverCompanyId && myCompanyId === receiverCompanyId) {
        return true;
      }
    }

    // 4. Direction match for Delivery:
    const sellerCompanyId = normalizeId(item.sellerCompanyId?._id || item.sellerCompanyId).toLowerCase();
    const buyerCompanyId = normalizeId(item.buyerCompanyId?._id || item.buyerCompanyId).toLowerCase();
    const deliveryType = String(item.deliveryType || item.type || '').toLowerCase();

    if (myCompanyId) {
      if (deliveryType === 'sent' && sellerCompanyId && myCompanyId === sellerCompanyId) {
        return true;
      }
      if (deliveryType === 'received' && buyerCompanyId && myCompanyId === buyerCompanyId) {
        return true;
      }
    }

    return false;
  };

  /* ── Load Deals, Payments & Deliveries strictly filtered by Company ── */
  const fetchData = useCallback(async (isPullToRefresh = false, targetCid = selectedCompanyId, targetName = selectedCompanyName) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const currentTargetCid = String(targetCid || selectedCompanyId || initialCompanyId || '').trim();
    const currentTargetName = String(targetName || selectedCompanyName || initialCompanyName || '').trim();

    try {
      const token = await AsyncStorage.getItem('userToken');

      // 0. Load User's Companies List
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

      // Seed from pre-passed deals from CompanyDetails if available
      if (Array.isArray(routeData?.deals) && routeData.deals.length > 0) {
        rawDeals = [...routeData.deals];
      }

      // Fetch deals for this company via API
      try {
        const dealsRes = await getDeals(token, 1, 100, currentTargetCid || undefined);
        if (dealsRes?.success && dealsRes.data) {
          const list = Array.isArray(dealsRes.data)
            ? dealsRes.data
            : dealsRes.data.deals || dealsRes.data.data || [];
          if (list.length > 0) {
            const seenDids = new Set(rawDeals.map((d) => normalizeId(d._id || d.id).toLowerCase()));
            list.forEach((d) => {
              const did = normalizeId(d._id || d.id).toLowerCase();
              if (!seenDids.has(did)) {
                seenDids.add(did);
                rawDeals.push(d);
              }
            });
          }
        }
      } catch (err) {
        console.warn('Could not load company deals:', err);
      }

      // Fallback: if no deals found, fetch general deals to check if any belong to this company
      if (rawDeals.length === 0) {
        try {
          const fallbackRes = await getDeals(token, 1, 100);
          if (fallbackRes?.success && fallbackRes.data) {
            const list = Array.isArray(fallbackRes.data)
              ? fallbackRes.data
              : fallbackRes.data.deals || fallbackRes.data.data || [];
            rawDeals = list;
          }
        } catch (e) {
          console.warn('Fallback deals error:', e);
        }
      }

      // Filter deals strictly for this specific company
      const companyDeals = rawDeals.filter((d) => isDealForThisCompany(d, currentTargetCid, currentTargetName));

      // CRITICAL: NEVER fallback to rawDeals! If 0 deals, deals remains empty!
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
            companyDeals.slice(0, 20).map((d) => getPayments({ dealId: d._id || d.id, limit: 50 }, token))
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
        isPaymentForCompany(item, currentTargetCid, currentTargetName, dealIdSet)
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
            companyDeals.slice(0, 20).map((d) => getDeliveries({ dealId: d._id || d.id, limit: 50 }, token))
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
        isDeliveryForCompany(item, currentTargetCid, currentTargetName, dealIdSet)
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
  }, [selectedCompanyId, selectedCompanyName, initialCompanyId, initialCompanyName, routeData?.deals]);

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

  /* ── Pick & Upload Attachment Helpers ── */
  const pickPaymentReceipt = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1600,
        maxHeight: 1600,
      });

      if (res.didCancel || !res.assets || !res.assets[0]) return;
      const asset = res.assets[0];
      setPaymentAttachmentAsset(asset);
      setIsUploadingPaymentAttachment(true);
      try {
        const uploadedUrl = await uploadImage(asset);
        if (uploadedUrl) {
          setPaymentAttachmentUrl(uploadedUrl);
        }
      } catch (uploadErr) {
        Alert.alert('Upload Notice', 'Failed to upload receipt slip. Please try again.');
        setPaymentAttachmentAsset(null);
      } finally {
        setIsUploadingPaymentAttachment(false);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const pickDeliveryDocument = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1600,
        maxHeight: 1600,
      });

      if (res.didCancel || !res.assets || !res.assets[0]) return;
      const asset = res.assets[0];
      setDeliveryAttachmentAsset(asset);
      setIsUploadingDeliveryAttachment(true);
      try {
        const uploadedUrl = await uploadImage(asset);
        if (uploadedUrl) {
          setDeliveryAttachmentUrl(uploadedUrl);
        }
      } catch (uploadErr) {
        Alert.alert('Upload Notice', 'Failed to upload delivery document. Please try again.');
        setDeliveryAttachmentAsset(null);
      } finally {
        setIsUploadingDeliveryAttachment(false);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  /* ── Export Ledger as CSV / Report ── */
  const handleExportLedger = async () => {
    try {
      const companyLabel = selectedCompanyName || 'Company';
      const dateStr = new Date().toISOString().slice(0, 10);

      if (activeTab === 'payments') {
        if (!filteredPayments || filteredPayments.length === 0) {
          Alert.alert('Export Ledger', 'No payment records found to export.');
          return;
        }

        let totalSent = 0;
        let totalReceived = 0;
        filteredPayments.forEach((p) => {
          const amt = Number(p.amount) || 0;
          if (p.paymentType === 'sent') totalSent += amt;
          else if (p.paymentType === 'received') totalReceived += amt;
        });

        const csvRows = [
          `"PRAVISTI - PAYMENT & FINANCIAL LEDGER"`,
          `"Company: ${companyLabel}","Export Date: ${dateStr}"`,
          `"Total Sent: ₹${totalSent.toLocaleString('en-IN')}","Total Received: ₹${totalReceived.toLocaleString('en-IN')}","Net Balance: ₹${(totalReceived - totalSent).toLocaleString('en-IN')}"`,
          `""`,
          `"Date","Deal #","Type","Amount (INR)","Payment Method","Status","Ref / UTR","Notes","Receipt Link"`,
        ];

        filteredPayments.forEach((p) => {
          const pDate = (p.createdAt || p.date || '').slice(0, 10);
          const dealNo = p.dealId?.dealNumber || (p.dealId?._id ? `DL-${p.dealId._id.slice(-6).toUpperCase()}` : 'N/A');
          const pType = (p.paymentType || 'sent').toUpperCase();
          const amt = Number(p.amount) || 0;
          const method = p.paymentMethod || 'Bank Transfer';
          const status = (p.status || 'pending').toUpperCase();
          const ref = (p.referenceNumber || p.paymentTransactionId || p.utrNumber || '').replace(/"/g, '""');
          const notes = (p.notes || '').replace(/"/g, '""');
          const receipt = p.attachmentUrl || p.receiptUrl ? resolveImageUrl(p.attachmentUrl || p.receiptUrl) : '';

          csvRows.push(
            `"${pDate}","${dealNo}","${pType}","${amt}","${method}","${status}","${ref}","${notes}","${receipt}"`
          );
        });

        const csvContent = csvRows.join('\n');
        await Share.share({
          title: `${companyLabel}_Payment_Ledger_${dateStr}.csv`,
          message: csvContent,
        });
      } else {
        if (!filteredDeliveries || filteredDeliveries.length === 0) {
          Alert.alert('Export Deliveries', 'No delivery records found to export.');
          return;
        }

        const csvRows = [
          `"PRAVISTI - DELIVERY & DISPATCH REPORT"`,
          `"Company: ${companyLabel}","Export Date: ${dateStr}"`,
          `""`,
          `"Date","Deal #","Delivery Type","Product","Quantity","Vehicle #","Bilty #","Status","Notes","Proof Link"`,
        ];

        filteredDeliveries.forEach((d) => {
          const dDate = (d.createdAt || d.date || '').slice(0, 10);
          const dealNo = d.dealId?.dealNumber || (d.dealId?._id ? `DL-${d.dealId._id.slice(-6).toUpperCase()}` : 'N/A');
          const dType = (d.deliveryType || 'sent').toUpperCase();
          const product = (d.productId?.name || d.productName || 'Agri Commodity').replace(/"/g, '""');
          const qty = `${d.quantity || 0} ${d.unit || 'MT'}`;
          const vehicle = (d.vehicleNumber || '').replace(/"/g, '""');
          const bilty = (d.biltyNumber || '').replace(/"/g, '""');
          const status = (d.status || 'pending').toUpperCase();
          const notes = (d.notes || '').replace(/"/g, '""');
          const proof = d.attachmentUrl || d.receiptUrl ? resolveImageUrl(d.attachmentUrl || d.receiptUrl) : '';

          csvRows.push(
            `"${dDate}","${dealNo}","${dType}","${product}","${qty}","${vehicle}","${bilty}","${status}","${notes}","${proof}"`
          );
        });

        const csvContent = csvRows.join('\n');
        await Share.share({
          title: `${companyLabel}_Delivery_Report_${dateStr}.csv`,
          message: csvContent,
        });
      }
    } catch (err) {
      console.warn('Error exporting ledger:', err);
    }
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

      // Normalize paymentMethod to match backend schema ('UPI', 'Bank Transfer', 'Cash', 'Cheque')
      let normalizedMethod = 'Bank Transfer';
      const m = (paymentForm.paymentMethod || '').toLowerCase();
      if (m.includes('upi')) {
        normalizedMethod = 'UPI';
      } else if (m.includes('cash')) {
        normalizedMethod = 'Cash';
      } else if (m.includes('cheque') || m.includes('check')) {
        normalizedMethod = 'Cheque';
      } else {
        normalizedMethod = 'Bank Transfer';
      }

      // STRICT BACKEND SCHEMA: dealId, amount, paymentType, paymentMethod, notes, attachmentUrl
      const payload = {
        dealId: paymentForm.dealId,
        amount: amt,
        paymentType: paymentForm.paymentType === 'received' ? 'received' : 'sent',
        paymentMethod: normalizedMethod,
        notes: paymentForm.notes ? paymentForm.notes.trim() : undefined,
        attachmentUrl: paymentAttachmentUrl || undefined,
      };

      const res = await recordPayment(payload, token);
      if (res?.success) {
        Alert.alert('Success 🎉', 'Payment transaction recorded successfully!');
        setShowPaymentModal(false);
        setPaymentAttachmentUrl('');
        setPaymentAttachmentAsset(null);
        setPaymentForm({
          dealId: '',
          amount: '',
          paymentType: 'sent',
          paymentMethod: 'Bank Transfer',
          referenceNumber: '',
          notes: '',
        });
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

      // Find selected deal to ensure valid productId if not set
      let prodId = deliveryForm.productId;
      if (!prodId) {
        const foundDeal = deals.find((d) => normalizeId(d._id || d.id) === normalizeId(deliveryForm.dealId));
        if (foundDeal) {
          if (foundDeal.products && foundDeal.products.length > 0) {
            prodId = foundDeal.products[0]?.productId?._id || foundDeal.products[0]?.productId || '';
          } else if (foundDeal.product) {
            prodId = foundDeal.product?.productId?._id || foundDeal.product?.productId || '';
          }
        }
      }

      // STRICT BACKEND SCHEMA: dealId, productId, quantity, deliveryType, notes, attachmentUrl
      const payload = {
        dealId: deliveryForm.dealId,
        productId: prodId || undefined,
        quantity: qty,
        deliveryType: deliveryForm.deliveryType === 'received' ? 'received' : 'sent',
        notes: notesArray.join(' | ') || undefined,
        attachmentUrl: deliveryAttachmentUrl || undefined,
      };

      const res = await createDelivery(payload, token);
      if (res?.success) {
        Alert.alert('Success 🚚', 'Delivery entry logged successfully!');
        setShowDeliveryModal(false);
        setDeliveryAttachmentUrl('');
        setDeliveryAttachmentAsset(null);
        setDeliveryForm({
          dealId: '',
          productId: '',
          productName: '',
          quantity: '',
          deliveryType: 'sent',
          vehicleNumber: '',
          biltyNumber: '',
          notes: '',
        });
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

  // Helper to get deal status badge info
  const getDealStatusBadge = (status) => {
    const s = String(status || 'active').toLowerCase().replace(/_/g, ' ');
    if (s.includes('pend')) {
      return { label: 'PENDING', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
    }
    if (s.includes('accept') || s.includes('complet') || s.includes('approv') || s.includes('deliver')) {
      return { label: s.toUpperCase(), bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    }
    if (s.includes('reject') || s.includes('cancel')) {
      return { label: s.toUpperCase(), bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
    }
    return { label: s.toUpperCase(), bg: '#EFF6FF', color: '#1541D8', border: '#BFDBFE' };
  };

  // Selected Deal in Form
  const currentFormDeal = useMemo(() => {
    return deals.find((d) => (d._id || d.id) === (activeTab === 'payments' ? paymentForm.dealId : deliveryForm.dealId));
  }, [deals, activeTab, paymentForm.dealId, deliveryForm.dealId]);

  const currentPaymentDeal = useMemo(() => {
    return deals.find((d) => normalizeId(d._id || d.id) === normalizeId(paymentForm.dealId));
  }, [deals, paymentForm.dealId]);

  // Selected Deal Label for Filter Dropdown
  const selectedDealLabel = useMemo(() => {
    if (selectedDealId === 'all') {
      return `All Deals (${deals.length})`;
    }
    const found = deals.find((d) => normalizeId(d._id || d.id) === normalizeId(selectedDealId));
    if (!found) return `All Deals (${deals.length})`;
    return getDealLabel(found);
  }, [deals, selectedDealId]);

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
            onPress={handleExportLedger}
            activeOpacity={0.75}
            accessibilityLabel="Export Ledger"
          >
            <Download size={18} color="#1541D8" strokeWidth={2.2} />
          </TouchableOpacity>

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

      {/* ─── 4. INLINE ON-SCREEN DEAL DROPDOWN ─── */}
      {deals.length > 0 && (
        <View style={styles.dealDropdownContainer}>
          <TouchableOpacity
            style={[
              styles.dealDropdownButton,
              isDealDropdownExpanded && styles.dealDropdownButtonExpanded,
            ]}
            onPress={() => setIsDealDropdownExpanded(!isDealDropdownExpanded)}
            activeOpacity={0.75}
          >
            <View style={styles.dealDropdownLeft}>
              <View style={styles.dealDropdownIconBox}>
                <FileText size={15} color="#1541D8" strokeWidth={2.2} />
              </View>
              <View style={styles.dealDropdownTextWrap}>
                <Text style={styles.dealDropdownLabel}>Filter by Deal</Text>
                <Text style={styles.dealDropdownSelectedText} numberOfLines={1}>
                  {selectedDealLabel}
                </Text>
              </View>
            </View>

            <View style={styles.dealDropdownRight}>
              {selectedDealId !== 'all' && (
                <TouchableOpacity
                  style={styles.dealDropdownClearBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedDealId('all');
                    setIsDealDropdownExpanded(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={13} color="#64748B" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              <ChevronDown
                size={18}
                color="#1541D8"
                strokeWidth={2.2}
                style={{
                  transform: [{ rotate: isDealDropdownExpanded ? '180deg' : '0deg' }],
                }}
              />
            </View>
          </TouchableOpacity>

          {/* Inline on-screen list (No popup modal!) */}
          {isDealDropdownExpanded && (
            <View style={styles.inlineDropdownMenu}>
              <ScrollView
                style={styles.inlineDropdownScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {/* Option: All Deals */}
                <TouchableOpacity
                  style={[
                    styles.inlineOptionItem,
                    selectedDealId === 'all' && styles.inlineOptionItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedDealId('all');
                    setIsDealDropdownExpanded(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.inlineOptionLeft}>
                    <View
                      style={[
                        styles.inlineOptionBadge,
                        selectedDealId === 'all' && styles.inlineOptionBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inlineOptionBadgeText,
                          selectedDealId === 'all' && styles.inlineOptionBadgeTextActive,
                        ]}
                      >
                        ALL
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.inlineOptionTitle,
                          selectedDealId === 'all' && styles.inlineOptionTitleActive,
                        ]}
                      >
                        All Deals ({deals.length})
                      </Text>
                      <Text style={styles.inlineOptionSubtitle}>
                        Show transactions for all deals
                      </Text>
                    </View>
                  </View>
                  {selectedDealId === 'all' && (
                    <Check size={16} color="#1541D8" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {/* Individual Deals */}
                {deals.map((deal) => {
                  const dId = normalizeId(deal._id || deal.id);
                  const isSelected = normalizeId(selectedDealId) === dId;
                  const dealNumber = deal.dealNumber
                    ? `#${deal.dealNumber}`
                    : `#${dId.slice(-4).toUpperCase()}`;
                  const party =
                    deal.sellerCompanyId?.name ||
                    deal.buyerCompanyId?.name ||
                    deal.sellerCompanyName ||
                    deal.buyerCompanyName ||
                    'Deal';
                  const product =
                    deal.products?.[0]?.name ||
                    deal.productName ||
                    deal.product?.name ||
                    'Commodity';
                  const amount = deal.totalAmount || deal.amount;

                  return (
                    <TouchableOpacity
                      key={dId}
                      style={[
                        styles.inlineOptionItem,
                        isSelected && styles.inlineOptionItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedDealId(dId);
                        setIsDealDropdownExpanded(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.inlineOptionLeft}>
                        <View
                          style={[
                            styles.inlineOptionBadge,
                            isSelected && styles.inlineOptionBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.inlineOptionBadgeText,
                              isSelected && styles.inlineOptionBadgeTextActive,
                            ]}
                          >
                            {dealNumber}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.inlineOptionTitle,
                              isSelected && styles.inlineOptionTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {product} • {party}
                          </Text>
                          <View style={styles.inlineOptionMetaRow}>
                            {amount ? (
                              <Text style={styles.inlineOptionAmount}>
                                ₹{Number(amount).toLocaleString('en-IN')}
                              </Text>
                            ) : null}
                            {deal.status ? (
                              <View
                                style={[
                                  styles.dealStatusMiniPill,
                                  {
                                    backgroundColor: getDealStatusBadge(deal.status).bg,
                                    borderColor: getDealStatusBadge(deal.status).border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.dealStatusMiniText,
                                    { color: getDealStatusBadge(deal.status).color },
                                  ]}
                                >
                                  {getDealStatusBadge(deal.status).label}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                      {isSelected && (
                        <Check size={16} color="#1541D8" strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
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
            <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addEntryBtnText}>
              {activeTab === 'payments' ? 'Add Payment' : 'Add Entry'}
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
                <Text style={styles.emptyActionBtnText}>Add Payment</Text>
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
                <View
                  key={item._id || item.id || `pay-${index}`}
                  style={[
                    styles.transactionCard,
                    isPending && styles.transactionCardPending,
                    isApproved && styles.transactionCardApproved,
                    isRejected && styles.transactionCardRejected,
                  ]}
                >
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

                  {/* Proof / Receipt Attachment Row with Visible Image Thumbnail */}
                  {(item.attachmentUrl || item.receiptUrl || item.attachment || item.proofUrl || item.slipUrl || item.paymentProof) && (() => {
                    const rawAttach = item.attachmentUrl || item.receiptUrl || item.attachment || item.proofUrl || item.slipUrl || item.paymentProof;
                    const attachUrl = resolveImageUrl(rawAttach);
                    const isImg = attachUrl && (attachUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i) || !attachUrl.toLowerCase().endsWith('.pdf'));

                    return (
                      <View style={styles.cardAttachmentRow}>
                        <TouchableOpacity
                          style={styles.cardAttachmentBtn}
                          onPress={() => {
                            if (isImg) {
                              setFullPreviewImage(attachUrl);
                            } else {
                              Linking.openURL(attachUrl).catch(() => Alert.alert('Receipt', 'Unable to open document'));
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          {isImg ? (
                            <Image
                              source={{ uri: attachUrl }}
                              style={styles.cardAttachmentThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.cardAttachmentDocBadge}>
                              <Text style={styles.cardAttachmentDocText}>DOC</Text>
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.cardAttachmentBtnText} numberOfLines={1}>
                              Payment Receipt / Slip
                            </Text>
                            <Text style={styles.cardAttachmentSubText}>
                              {isImg ? 'Tap to view full image' : 'Tap to open document'}
                            </Text>
                          </View>
                          <Eye size={15} color="#1541D8" style={{ marginRight: 4 }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardAttachmentDownloadBtn}
                          onPress={() => downloadFileToDevice(attachUrl, null, 'Payment_Receipt')}
                          activeOpacity={0.7}
                        >
                          <Download size={15} color="#1541D8" />
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  {/* Pending Approval Action Buttons (Only shown to counterparty, NOT entry creator!) */}
                  {isPending && !isEntryCreatedByMe(item) && (
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

                  {/* Creator awaiting confirmation badge */}
                  {isPending && isEntryCreatedByMe(item) && (
                    <View style={styles.pendingAwaitingBox}>
                      <Clock size={13} color="#D97706" strokeWidth={2.2} />
                      <Text style={styles.pendingAwaitingText}>
                        Entry recorded by you • Awaiting counterparty approval
                      </Text>
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
                <View
                  key={item._id || item.id || `del-${index}`}
                  style={[
                    styles.transactionCard,
                    isPending && styles.transactionCardPending,
                    isDelivered && styles.transactionCardApproved,
                  ]}
                >
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

                  {/* Proof / Bilty Attachment Row with Visible Image Thumbnail */}
                  {(item.attachmentUrl || item.receiptUrl || item.biltyUrl || item.attachment || item.deliveryProof || item.proofUrl) && (() => {
                    const rawAttach = item.attachmentUrl || item.receiptUrl || item.biltyUrl || item.attachment || item.deliveryProof || item.proofUrl;
                    const attachUrl = resolveImageUrl(rawAttach);
                    const isImg = attachUrl && (attachUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i) || !attachUrl.toLowerCase().endsWith('.pdf'));

                    return (
                      <View style={styles.cardAttachmentRow}>
                        <TouchableOpacity
                          style={[styles.cardAttachmentBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                          onPress={() => {
                            if (isImg) {
                              setFullPreviewImage(attachUrl);
                            } else {
                              Linking.openURL(attachUrl).catch(() => Alert.alert('Delivery Proof', 'Unable to open document'));
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          {isImg ? (
                            <Image
                              source={{ uri: attachUrl }}
                              style={styles.cardAttachmentThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.cardAttachmentDocBadge, { backgroundColor: '#059669' }]}>
                              <Text style={styles.cardAttachmentDocText}>DOC</Text>
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.cardAttachmentBtnText, { color: '#065F46' }]} numberOfLines={1}>
                              Delivery Proof / Bilty
                            </Text>
                            <Text style={[styles.cardAttachmentSubText, { color: '#047857' }]}>
                              {isImg ? 'Tap to view full image' : 'Tap to open document'}
                            </Text>
                          </View>
                          <Eye size={15} color="#059669" style={{ marginRight: 4 }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.cardAttachmentDownloadBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                          onPress={() => downloadFileToDevice(attachUrl, null, 'Delivery_Bilty')}
                          activeOpacity={0.7}
                        >
                          <Download size={15} color="#059669" />
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  {/* Mark Delivered Action (Only shown to counterparty, NOT entry creator!) */}
                  {!isDelivered && !isEntryCreatedByMe(item) && (
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

                  {/* Creator dispatched awaiting confirmation */}
                  {!isDelivered && isEntryCreatedByMe(item) && (
                    <View style={styles.pendingAwaitingBox}>
                      <Clock size={13} color="#D97706" strokeWidth={2.2} />
                      <Text style={styles.pendingAwaitingText}>
                        Dispatched by you • Awaiting receiver confirmation
                      </Text>
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
                  <Text style={styles.modalTitle}>Add Payment</Text>
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
                <View style={{ marginBottom: 16 }}>
                  <TouchableOpacity
                    style={[
                      styles.formDropdownButton,
                      isPaymentDealDropdownExpanded && styles.formDropdownButtonExpanded,
                    ]}
                    onPress={() => setIsPaymentDealDropdownExpanded(!isPaymentDealDropdownExpanded)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.formDropdownLeft}>
                      <FileText size={16} color="#1541D8" strokeWidth={2.2} />
                      <Text style={styles.formDropdownValue} numberOfLines={1}>
                        {paymentForm.dealId
                          ? getDealLabel(deals.find((d) => normalizeId(d._id || d.id) === normalizeId(paymentForm.dealId)))
                          : 'Select a deal...'}
                      </Text>
                    </View>
                    <ChevronDown
                      size={18}
                      color="#64748B"
                      style={{
                        transform: [{ rotate: isPaymentDealDropdownExpanded ? '180deg' : '0deg' }],
                      }}
                    />
                  </TouchableOpacity>

                  {isPaymentDealDropdownExpanded && (
                    <View style={styles.formInlineDropdownList}>
                      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator>
                        {deals.map((d) => {
                          const dId = normalizeId(d._id || d.id);
                          const isSelected = normalizeId(paymentForm.dealId) === dId;
                          const dealNumber = d.dealNumber ? `#${d.dealNumber}` : `#${dId.slice(-4).toUpperCase()}`;
                          const party = d.sellerCompanyId?.name || d.buyerCompanyId?.name || d.sellerCompanyName || d.buyerCompanyName || 'Deal';
                          const prod = d.products?.[0]?.name || d.productName || d.product?.name || 'Commodity';
                          const amt = d.totalAmount || d.amount;
                          const statusInfo = getDealStatusBadge(d.status);

                          return (
                            <TouchableOpacity
                              key={dId}
                              style={[styles.formInlineOption, isSelected && styles.formInlineOptionSelected]}
                              onPress={() => {
                                setPaymentForm({ ...paymentForm, dealId: dId });
                                setIsPaymentDealDropdownExpanded(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                  <View style={styles.inlineOptionBadge}>
                                    <Text style={styles.inlineOptionBadgeText}>{dealNumber}</Text>
                                  </View>
                                  <View style={[styles.dealStatusMiniPill, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
                                    <Text style={[styles.dealStatusMiniText, { color: statusInfo.color }]}>
                                      {statusInfo.label}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={[styles.formInlineOptionText, isSelected && styles.formInlineOptionTextSelected]} numberOfLines={1}>
                                  {prod} • {party}
                                </Text>
                                {amt ? (
                                  <Text style={styles.inlineOptionAmount}>
                                    Value: ₹{Number(amt).toLocaleString('en-IN')}
                                  </Text>
                                ) : null}
                              </View>
                              {isSelected && <Check size={16} color="#1541D8" strokeWidth={2.4} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Selected Deal Summary Banner */}
                  {currentPaymentDeal && !isPaymentDealDropdownExpanded && (
                    <View style={styles.selectedDealCard}>
                      <View style={styles.selectedDealTopRow}>
                        <View style={styles.selectedDealBadge}>
                          <Text style={styles.selectedDealBadgeText}>
                            {currentPaymentDeal.dealNumber ? `#${currentPaymentDeal.dealNumber}` : `#${normalizeId(currentPaymentDeal._id || currentPaymentDeal.id).slice(-4).toUpperCase()}`}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.dealStatusMiniPill,
                            {
                              backgroundColor: getDealStatusBadge(currentPaymentDeal.status).bg,
                              borderColor: getDealStatusBadge(currentPaymentDeal.status).border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dealStatusMiniText,
                              { color: getDealStatusBadge(currentPaymentDeal.status).color },
                            ]}
                          >
                            {getDealStatusBadge(currentPaymentDeal.status).label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.selectedDealPartyText} numberOfLines={1}>
                        {currentPaymentDeal.sellerCompanyId?.name || currentPaymentDeal.buyerCompanyId?.name || currentPaymentDeal.sellerCompanyName || currentPaymentDeal.buyerCompanyName || 'Counterparty'}
                      </Text>
                      <View style={styles.selectedDealMetaRow}>
                        <Text style={styles.selectedDealProductText}>
                          {currentPaymentDeal.products?.[0]?.name || currentPaymentDeal.productName || currentPaymentDeal.product?.name || 'Commodity Material'}
                        </Text>
                        {(currentPaymentDeal.totalAmount || currentPaymentDeal.amount) ? (
                          <Text style={styles.selectedDealAmountText}>
                            ₹{Number(currentPaymentDeal.totalAmount || currentPaymentDeal.amount).toLocaleString('en-IN')}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}
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
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={paymentForm.amount}
                  onChangeText={(val) => setPaymentForm({ ...paymentForm, amount: val })}
                />
              </View>

              {/* Payment Method */}
              <Text style={styles.formLabel}>Payment Method</Text>
              <View style={styles.chipsRow}>
                {['Bank Transfer', 'UPI', 'Cheque', 'Cash'].map((method) => {
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

              {/* Payment Proof / Slip Attachment */}
              <Text style={styles.formLabel}>Attach Receipt / Payment Proof (Optional)</Text>
              {paymentAttachmentUrl ? (
                <View style={styles.proofAttachmentCard}>
                  <Image
                    source={{ uri: resolveImageUrl(paymentAttachmentUrl) }}
                    style={styles.proofAttachmentThumbnail}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.proofAttachmentName} numberOfLines={1}>
                      {paymentAttachmentAsset?.fileName || 'Receipt_Slip.jpg'}
                    </Text>
                    <Text style={styles.proofAttachmentStatus}>Uploaded Successfully ✓</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.proofRemoveBtn}
                    onPress={() => {
                      setPaymentAttachmentUrl('');
                      setPaymentAttachmentAsset(null);
                    }}
                  >
                    <X size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.proofUploadBtn}
                  onPress={pickPaymentReceipt}
                  disabled={isUploadingPaymentAttachment}
                  activeOpacity={0.8}
                >
                  {isUploadingPaymentAttachment ? (
                    <ActivityIndicator size="small" color="#1541D8" />
                  ) : (
                    <>
                      <Paperclip size={16} color="#1541D8" />
                      <Text style={styles.proofUploadBtnText}>Attach Bank Slip / Screenshot</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled, { marginTop: 24 }]}
                onPress={handleRecordPayment}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.submitButtonText}>Confirm & Add Payment</Text>
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
                <View style={{ marginBottom: 16 }}>
                  <TouchableOpacity
                    style={[styles.formDropdownButton, isDeliveryDealDropdownExpanded && styles.formDropdownButtonExpanded]}
                    onPress={() => setIsDeliveryDealDropdownExpanded(!isDeliveryDealDropdownExpanded)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.formDropdownLeft}>
                      <FileText size={16} color="#1541D8" strokeWidth={2.2} />
                      <Text style={styles.formDropdownValue} numberOfLines={1}>
                        {deliveryForm.dealId
                          ? getDealLabel(deals.find((d) => normalizeId(d._id || d.id) === normalizeId(deliveryForm.dealId)))
                          : 'Select a deal...'}
                      </Text>
                    </View>
                    <ChevronDown
                      size={18}
                      color="#64748B"
                      style={{
                        transform: [{ rotate: isDeliveryDealDropdownExpanded ? '180deg' : '0deg' }],
                      }}
                    />
                  </TouchableOpacity>

                  {isDeliveryDealDropdownExpanded && (
                    <View style={styles.formInlineDropdownList}>
                      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator>
                        {deals.map((d) => {
                          const dId = normalizeId(d._id || d.id);
                          const isSelected = normalizeId(deliveryForm.dealId) === dId;
                          const dealNumber = d.dealNumber ? `#${d.dealNumber}` : `#${dId.slice(-4).toUpperCase()}`;
                          const party = d.sellerCompanyId?.name || d.buyerCompanyId?.name || d.sellerCompanyName || d.buyerCompanyName || 'Deal';
                          const prod = d.products?.[0]?.name || d.productName || d.product?.name || 'Commodity';
                          const statusInfo = getDealStatusBadge(d.status);

                          return (
                            <TouchableOpacity
                              key={dId}
                              style={[styles.formInlineOption, isSelected && styles.formInlineOptionSelected]}
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
                                setIsDeliveryDealDropdownExpanded(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                  <View style={styles.inlineOptionBadge}>
                                    <Text style={styles.inlineOptionBadgeText}>{dealNumber}</Text>
                                  </View>
                                  <View style={[styles.dealStatusMiniPill, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
                                    <Text style={[styles.dealStatusMiniText, { color: statusInfo.color }]}>
                                      {statusInfo.label}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={[styles.formInlineOptionText, isSelected && styles.formInlineOptionTextSelected]} numberOfLines={1}>
                                  {prod} • {party}
                                </Text>
                              </View>
                              {isSelected && <Check size={16} color="#1541D8" strokeWidth={2.4} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
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

              {/* Delivery Proof / Bilty Attachment */}
              <Text style={styles.formLabel}>Attach Bilty / Delivery Slip (Optional)</Text>
              {deliveryAttachmentUrl ? (
                <View style={styles.proofAttachmentCard}>
                  <Image
                    source={{ uri: resolveImageUrl(deliveryAttachmentUrl) }}
                    style={styles.proofAttachmentThumbnail}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.proofAttachmentName} numberOfLines={1}>
                      {deliveryAttachmentAsset?.fileName || 'Delivery_Document.jpg'}
                    </Text>
                    <Text style={styles.proofAttachmentStatus}>Uploaded Successfully ✓</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.proofRemoveBtn}
                    onPress={() => {
                      setDeliveryAttachmentUrl('');
                      setDeliveryAttachmentAsset(null);
                    }}
                  >
                    <X size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.proofUploadBtn}
                  onPress={pickDeliveryDocument}
                  disabled={isUploadingDeliveryAttachment}
                  activeOpacity={0.8}
                >
                  {isUploadingDeliveryAttachment ? (
                    <ActivityIndicator size="small" color="#1541D8" />
                  ) : (
                    <>
                      <Paperclip size={16} color="#1541D8" />
                      <Text style={styles.proofUploadBtnText}>Attach Bilty / LR Document</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

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

      {/* ─── FULL IMAGE PREVIEW MODAL ─── */}
      <Modal
        visible={Boolean(fullPreviewImage)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullPreviewImage(null)}
      >
        <SafeAreaView style={styles.imageViewerOverlay}>
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              onPress={() => setFullPreviewImage(null)}
              style={styles.imageViewerCloseBtn}
              activeOpacity={0.8}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  if (fullPreviewImage) {
                    downloadFileToDevice(fullPreviewImage, null, 'Attachment');
                  }
                }}
                style={[styles.imageViewerActionBtn, { backgroundColor: '#2563EB', marginRight: 8 }]}
                activeOpacity={0.8}
              >
                <Download size={16} color="#FFFFFF" />
                <Text style={styles.imageViewerActionText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (fullPreviewImage) {
                    Linking.openURL(fullPreviewImage).catch(() => Alert.alert('Error', 'Cannot open link'));
                  }
                }}
                style={styles.imageViewerActionBtn}
                activeOpacity={0.8}
              >
                <ExternalLink size={16} color="#FFFFFF" />
                <Text style={styles.imageViewerActionText}>Open Original</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.imageViewerBody}>
            {fullPreviewImage ? (
              <Image
                source={{ uri: fullPreviewImage }}
                style={styles.imageViewerContent}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </SafeAreaView>
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

  /* ── 4. Deal Filter Dropdown ── */
  dealDropdownContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dealDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dealDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  dealDropdownIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dealDropdownTextWrap: {
    flex: 1,
  },
  dealDropdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  dealDropdownSelectedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dealDropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealDropdownClearBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },

  /* ── Main Screen Inline Deal Dropdown (No Popup Modal) ── */
  inlineDropdownMenu: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  inlineDropdownScroll: {
    maxHeight: 240,
  },
  inlineOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  inlineOptionItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  inlineOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  inlineOptionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  inlineOptionBadgeActive: {
    backgroundColor: '#1541D8',
  },
  inlineOptionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  inlineOptionBadgeTextActive: {
    color: '#FFFFFF',
  },
  inlineOptionTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  inlineOptionTitleActive: {
    color: '#1541D8',
    fontWeight: '700',
  },
  inlineOptionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  inlineOptionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  inlineOptionAmount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  inlineOptionStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  /* ── Form Modal Inline Deal Dropdown ── */
  formDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
  },
  formDropdownButtonExpanded: {
    borderColor: '#1541D8',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  formDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  formDropdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  formInlineDropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#CBD5E1',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  formInlineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formInlineOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  formInlineOptionText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  formInlineOptionTextSelected: {
    color: '#1541D8',
    fontWeight: '700',
  },

  /* ── Creator Pending Approval Badge (when I created entry) ── */
  pendingAwaitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingAwaitingText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },

  /* ── Deal Status Mini Pill ── */
  dealStatusMiniPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dealStatusMiniText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Selected Deal Preview Card (in Form) ── */
  selectedDealCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 8,
  },
  selectedDealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  selectedDealBadge: {
    backgroundColor: '#1541D8',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  selectedDealBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedDealPartyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  selectedDealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDealProductText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  selectedDealAmountText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },

  /* ── Quick Amount Presets ── */
  amountPresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  amountPresetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountPresetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
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
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addEntryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
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
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionCardPending: {
    borderColor: '#F59E0B',
    borderWidth: 1.2,
    backgroundColor: '#FFFCF5',
  },
  transactionCardApproved: {
    borderColor: '#10B981',
    borderWidth: 1.2,
    backgroundColor: '#F8FDFB',
  },
  transactionCardRejected: {
    borderColor: '#EF4444',
    borderWidth: 1.2,
    backgroundColor: '#FFFBFB',
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
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
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

  /* ── Proof & Attachment Card Styles ── */
  cardAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  cardAttachmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  cardAttachmentThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  cardAttachmentDocBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1541D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAttachmentDocText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardAttachmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
  },
  cardAttachmentSubText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  cardAttachmentDownloadBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  proofAttachmentThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  proofAttachmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  proofAttachmentStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  proofRemoveBtn: {
    padding: 6,
  },
  proofUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    backgroundColor: '#EFF6FF',
    marginTop: 6,
    marginBottom: 12,
    gap: 8,
  },
  proofUploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1541D8',
  },

  /* ── Image Viewer Modal ── */
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageViewerCloseBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  imageViewerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  imageViewerActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  imageViewerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
  },
});
