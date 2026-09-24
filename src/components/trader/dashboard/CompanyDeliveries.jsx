import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  X,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Truck,
  FileText,
  Phone,
  User,
  Package,
  MapPin,
  TrendingUp,
  Hash,
  RefreshCw,
  Camera,
  Check,
  Eye,
  Layers,
} from 'lucide-react-native';
import {
  getDeliveries,
  createDelivery,
  updateDeliveryStatus,
  getDeals,
  getDealDetails,
  getUserProfile,
  getCompanies,
  getUnits,
  resolveImageUrl,
} from '../../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const extractUnitFromNotes = (notes) => {
  if (!notes || typeof notes !== 'string') return '';
  const unitMatch = notes.match(/Unit:\s*([^|\n\r,()]+)/i);
  if (unitMatch && unitMatch[1]?.trim()) {
    const val = unitMatch[1].trim();
    if (val && !/^(null|undefined)$/i.test(val)) return val;
  }
  const qtyUnitMatch = notes.match(/\(\s*\d+(?:\.\d+)?\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s*\)/);
  if (qtyUnitMatch && qtyUnitMatch[1]?.trim()) {
    return qtyUnitMatch[1].trim();
  }
  const atMatch = notes.match(/\d+(?:\.\d+)?\s+([a-zA-Z\u0900-\u097F]+)\s*@/);
  if (atMatch && atMatch[1]?.trim()) {
    return atMatch[1].trim();
  }
  return '';
};

export const resolveActualUnit = (dealOrItem, product, unitsList = []) => {
  const isObjectId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);

  const getFromUnitObjOrId = (val) => {
    if (!val) return '';
    if (typeof val === 'object') {
      return val.name || val.unitName || val.label || val.shortName || '';
    }
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '';
    if (isObjectId(str)) {
      const found = unitsList.find((u) => String(u._id || u.id) === str);
      if (found) return found.name || found.unitName || found.label || found.shortName || '';
      return '';
    }
    return str;
  };

  const p = product || dealOrItem?.products?.[0] || dealOrItem?.product || {};
  const d = dealOrItem || {};

  // 1. Exact unit from product (what user chose during create deal)
  let candidate =
    getFromUnitObjOrId(p.unit) ||
    getFromUnitObjOrId(p.unitName) ||
    getFromUnitObjOrId(p.quantityUnit) ||
    getFromUnitObjOrId(p.unitId) ||
    getFromUnitObjOrId(p.productId?.unitId) ||
    getFromUnitObjOrId(p.productId?.unit);

  if (candidate && !isObjectId(candidate)) return candidate;

  // 2. Direct unit fields on deal or delivery item
  candidate =
    getFromUnitObjOrId(d.unit) ||
    getFromUnitObjOrId(d.unitName) ||
    getFromUnitObjOrId(d.quantityUnit) ||
    getFromUnitObjOrId(d.unitId);

  if (candidate && !isObjectId(candidate)) return candidate;

  // 3. If delivery has linked dealId
  if (d.dealId && typeof d.dealId === 'object') {
    const dProd = d.dealId.products?.[0] || d.dealId.product || {};
    candidate =
      getFromUnitObjOrId(dProd.unit) ||
      getFromUnitObjOrId(dProd.unitName) ||
      getFromUnitObjOrId(dProd.quantityUnit) ||
      getFromUnitObjOrId(dProd.unitId) ||
      getFromUnitObjOrId(d.dealId.unit) ||
      getFromUnitObjOrId(d.dealId.unitName) ||
      getFromUnitObjOrId(d.dealId.quantityUnit);

    if (candidate && !isObjectId(candidate)) return candidate;

    const dealNoteUnit = extractUnitFromNotes(d.dealId.notes);
    if (dealNoteUnit) return dealNoteUnit;
  }

  // 4. Notes on product, deal, or delivery
  const noteCandidate =
    extractUnitFromNotes(p.notes) ||
    extractUnitFromNotes(d.notes) ||
    extractUnitFromNotes(d.description);

  if (noteCandidate) return noteCandidate;

  // 5. Fallback to shortName only if no name was present
  const shortCandidate =
    getFromUnitObjOrId(p.unitShortName) ||
    getFromUnitObjOrId(d.unitShortName);

  if (shortCandidate && !isObjectId(shortCandidate)) return shortCandidate;

  return '';
};

const CompanyDeliveries = ({ onNavigate, routeData }) => {
  const initialCompany = routeData?.company || {};
  const normalizeId = (val) => String(val?._id || val?.id || val || '').trim();

  const initialCompanyId = normalizeId(routeData?.companyId || initialCompany?._id || initialCompany?.id || routeData?.company);
  const initialCompanyName = String(routeData?.companyName || initialCompany?.name || initialCompany?.businessName || initialCompany?.companyName || '').trim();

  const [userCompanies, setUserCompanies] = useState(initialCompany._id ? [initialCompany] : []);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [selectedCompanyName, setSelectedCompanyName] = useState(initialCompanyName);
  const [unitsList, setUnitsList] = useState([]);
  const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);

  // Status Filter: 'all' | 'pending' | 'in_transit' | 'delivered'
  const [statusFilter, setStatusFilter] = useState('all');

  // View Mode: 'saudas' (All Saudas / Deals) | 'dispatches' (Dispatches & Logistics)
  const [viewMode, setViewMode] = useState('saudas');

  // Core Data
  const [deals, setDeals] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  // Filter
  const [selectedDealId, setSelectedDealId] = useState('all');
  const [isDealDropdownExpanded, setIsDealDropdownExpanded] = useState(false);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);

  // Modals
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isDeliveryDealDropdownExpanded, setIsDeliveryDealDropdownExpanded] = useState(false);
  const [isDeliveryProductDropdownExpanded, setIsDeliveryProductDropdownExpanded] = useState(false);
  const [selectedDeliveryDetail, setSelectedDeliveryDetail] = useState(null);
  const [currentUser, setCurrentUser] = useState(routeData?.user || null);

  // Delivery Form State
  const [deliveryForm, setDeliveryForm] = useState({
    dealId: '',
    productId: '',
    deliveryType: 'sent',
    quantity: '',
    unit: '',
    vehicleNumber: '',
    transportName: '',
    driverName: '',
    driverPhone: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryAddress: '',
    trackingNumber: '',
    notes: '',
  });

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
        console.warn('Error fetching user profile in CompanyDeliveries:', e);
      }
    };
    fetchUser();
  }, []);

  // Sync state if routeData changes
  useEffect(() => {
    const comp = routeData?.company || {};
    const cid = normalizeId(routeData?.companyId || comp?._id || comp?.id || routeData?.company);
    const cname = String(routeData?.companyName || comp?.name || comp?.businessName || comp?.companyName || '').trim();
    if (cid && cid !== selectedCompanyId) {
      setSelectedCompanyId(cid);
      setSelectedCompanyName(cname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData?.companyId, routeData?.company]);

  /* ── Filter Helper: Is Deal for this Company? ── */
  const isDealForCompany = (deal, targetCompId, targetCompName) => {
    if (!deal) return false;
    const normTarget = normalizeId(targetCompId).toLowerCase();
    const normName = String(targetCompName || '').trim().toLowerCase();

    if (normTarget) {
      const sId = normalizeId(deal.sellerCompanyId?._id || deal.sellerCompanyId?.id || deal.sellerCompanyId).toLowerCase();
      const bId = normalizeId(deal.buyerCompanyId?._id || deal.buyerCompanyId?.id || deal.buyerCompanyId).toLowerCase();
      const brId = normalizeId(deal.brokerCompanyId?._id || deal.brokerCompanyId?.id || deal.brokerCompanyId).toLowerCase();
      const cId = normalizeId(deal.companyId?._id || deal.companyId?.id || deal.companyId).toLowerCase();
      const p1Id = normalizeId(deal.party1?.companyId?._id || deal.party1?.companyId || deal.party1?.company).toLowerCase();
      const p2Id = normalizeId(deal.party2?.companyId?._id || deal.party2?.companyId || deal.party2?.company).toLowerCase();

      if (
        sId === normTarget ||
        bId === normTarget ||
        brId === normTarget ||
        cId === normTarget ||
        p1Id === normTarget ||
        p2Id === normTarget
      ) {
        return true;
      }
    }

    if (normName && normName !== 'company') {
      const sName = String(deal.sellerCompany?.name || deal.sellerCompanyId?.name || '').trim().toLowerCase();
      const bName = String(deal.buyerCompany?.name || deal.buyerCompanyId?.name || '').trim().toLowerCase();
      const cName = String(deal.companyName || deal.company?.name || '').trim().toLowerCase();
      if (sName === normName || bName === normName || cName === normName) {
        return true;
      }
    }

    return false;
  };

  /* ── Filter Helper: Is Delivery for this Company? ── */
  const isDeliveryForCompany = (item, targetCompId, targetCompName, dealIdSet) => {
    if (!item) return false;
    const normTarget = normalizeId(targetCompId).toLowerCase();
    const normName = String(targetCompName || '').trim().toLowerCase();

    const dDealId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId).toLowerCase();
    if (dDealId && dealIdSet && dealIdSet.has(dDealId)) {
      return true;
    }

    if (normTarget) {
      const dCid = normalizeId(item.companyId?._id || item.companyId).toLowerCase();
      const sellerCid = normalizeId(item.sellerCompanyId?._id || item.sellerCompanyId || item.dealId?.sellerCompanyId?._id || item.dealId?.sellerCompanyId).toLowerCase();
      const buyerCid = normalizeId(item.buyerCompanyId?._id || item.buyerCompanyId || item.dealId?.buyerCompanyId?._id || item.dealId?.buyerCompanyId).toLowerCase();

      if (dCid === normTarget || sellerCid === normTarget || buyerCid === normTarget) {
        return true;
      }
    }

    if (normName && normName !== 'company') {
      const cName = String(item.companyName || item.company?.name || item.dealId?.sellerCompany?.name || item.dealId?.buyerCompany?.name || '').trim().toLowerCase();
      if (cName && (cName === normName || cName.includes(normName) || normName.includes(cName))) return true;
    }

    if (!normTarget && !normName) return true;

    return false;
  };

  /* ── Load Deals & Deliveries strictly filtered by Company ── */
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

      // 1. Load User's Companies List
      try {
        const compRes = await getCompanies(1, 50);
        if (compRes?.success && compRes?.data?.companies) {
          setUserCompanies(compRes.data.companies);
          if (!currentTargetCid && compRes.data.companies.length > 0) {
            const first = compRes.data.companies[0];
            setSelectedCompanyId(normalizeId(first._id || first.id));
            setSelectedCompanyName(first.name || first.businessName || '');
          }
        }
      } catch (ce) {
        console.warn('Error loading companies in CompanyDeliveries:', ce);
      }

      // 2. Load Deals for this company
      let myDeals = [];
      const dealIdSet = new Set();
      try {
        const dealsRes = await getDeals(token, 1, 100, currentTargetCid);
        const rawDeals = dealsRes?.data?.deals || (Array.isArray(dealsRes?.data) ? dealsRes.data : []);
        myDeals = rawDeals.filter((d) => isDealForCompany(d, currentTargetCid, currentTargetName));
        myDeals.forEach((d) => {
          const idStr = normalizeId(d._id || d.id).toLowerCase();
          if (idStr) dealIdSet.add(idStr);
        });
        setDeals(myDeals);
      } catch (de) {
        console.warn('Error loading deals for deliveries:', de);
      }

      // 3. Load Active Units
      try {
        const uRes = await getUnits('active', token);
        if (uRes && (uRes.success || Array.isArray(uRes.data))) {
          const uData = Array.isArray(uRes.data) ? uRes.data : uRes.data?.data || [];
          setUnitsList(uData);
        }
      } catch (ue) {
        console.warn('Error loading units in CompanyDeliveries:', ue);
      }

      // 3. Load Deliveries
      try {
        const delRes = await getDeliveries({ companyId: currentTargetCid, limit: 100 }, token);
        let rawDel = delRes?.data?.data || delRes?.data?.deliveries || (Array.isArray(delRes?.data) ? delRes.data : []);

        // Fallback: if querying by companyId returned empty, fetch all user deliveries and filter locally
        if (!rawDel || rawDel.length === 0) {
          const fallbackRes = await getDeliveries({ limit: 100 }, token);
          const fallbackList = fallbackRes?.data?.data || fallbackRes?.data?.deliveries || (Array.isArray(fallbackRes?.data) ? fallbackRes.data : []);
          if (fallbackList && fallbackList.length > 0) {
            rawDel = fallbackList;
          }
        }

        const filteredDel = rawDel.filter((del) => isDeliveryForCompany(del, currentTargetCid, currentTargetName, dealIdSet));
        setDeliveries(filteredDel.length > 0 ? filteredDel : rawDel);
      } catch (dle) {
        console.warn('Error loading deliveries:', dle);
      }
    } catch (err) {
      console.warn('Failed to load delivery data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, selectedCompanyName, initialCompanyId, initialCompanyName]);

  useEffect(() => {
    fetchData(false, selectedCompanyId, selectedCompanyName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  /* ── Group Deliveries By Sauda (Deal) ── */
  const deliveriesBySauda = useMemo(() => {
    const map = new Map();

    // First initialize with all user's Saudas
    deals.forEach((deal) => {
      const did = normalizeId(deal._id || deal.id);
      map.set(did, {
        deal,
        deliveries: [],
      });
    });

    // Populate deliveries into respective Saudas
    deliveries.forEach((del) => {
      const did = normalizeId(del.dealId?._id || del.dealId?.id || del.dealId);
      if (map.has(did)) {
        map.get(did).deliveries.push(del);
      } else {
        // Delivery with unmapped deal
        map.set(did || `custom_${del._id}`, {
          deal: typeof del.dealId === 'object' ? del.dealId : { _id: did, dealNumber: del.dealNumber || 'SAUDA' },
          deliveries: [del],
        });
      }
    });

    return Array.from(map.values());
  }, [deals, deliveries]);

  /* ── Delivery Stats ── */
  const stats = useMemo(() => {
    const totalSaudas = deals.length;
    const totalDeliveries = deliveries.length;
    const deliveredCount = deliveries.filter((d) => (d.status || '').toLowerCase() === 'delivered' || (d.status || '').toLowerCase() === 'completed').length;
    const inTransitCount = deliveries.filter((d) => (d.status || '').toLowerCase() === 'in_transit' || (d.status || '').toLowerCase() === 'dispatched').length;

    const pendingDeliveries = deliveries.filter((d) => (d.status || '').toLowerCase() === 'pending').length;
    const pendingSaudas = (deliveriesBySauda || []).filter(({ deal, deliveries: saudaDelivs }) => {
      const totalQty = Number(deal?.products?.[0]?.quantity || deal?.totalQuantity || deal?.quantity || 0);
      const dispatchedQty = (saudaDelivs || []).reduce((acc, curr) => acc + (Number(curr?.quantity) || 0), 0);
      return (saudaDelivs || []).length === 0 || (totalQty > 0 && dispatchedQty < totalQty);
    }).length;
    const pendingCount = pendingDeliveries > 0 ? pendingDeliveries : pendingSaudas;

    return {
      totalSaudas,
      totalDeliveries,
      deliveredCount,
      inTransitCount,
      pendingCount,
    };
  }, [deals, deliveries, deliveriesBySauda]);

  /* ── Filtered Deliveries List ── */
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((item) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        const itemStatus = (item.status || '').toLowerCase();
        if (statusFilter === 'delivered' && itemStatus !== 'delivered' && itemStatus !== 'completed') return false;
        if (statusFilter === 'in_transit' && itemStatus !== 'in_transit' && itemStatus !== 'dispatched') return false;
        if (statusFilter === 'pending' && itemStatus !== 'pending') return false;
      }

      // 2. Deal ID Filter
      if (selectedDealId !== 'all') {
        const dId = normalizeId(item.dealId?._id || item.dealId?.id || item.dealId);
        if (dId !== selectedDealId) return false;
      }

      return true;
    });
  }, [deliveries, statusFilter, selectedDealId]);

  /* ── Selected Deal & Products for Dispatch Form ── */
  const currentSelectedDeal = useMemo(() => {
    if (!deliveryForm.dealId) return null;
    return deals.find((d) => normalizeId(d._id || d.id) === deliveryForm.dealId) || null;
  }, [deals, deliveryForm.dealId]);

  const dealProductsList = useMemo(() => {
    if (!currentSelectedDeal) return [];
    const prods = Array.isArray(currentSelectedDeal.products) && currentSelectedDeal.products.length > 0
      ? currentSelectedDeal.products
      : (currentSelectedDeal.product ? [currentSelectedDeal.product] : []);

    return prods.map((p, idx) => {
      const pid = normalizeId(
        (p.productId && typeof p.productId === 'object' ? (p.productId._id || p.productId.id) : p.productId) ||
        p._id ||
        p.id ||
        (currentSelectedDeal.productId && typeof currentSelectedDeal.productId === 'object' ? (currentSelectedDeal.productId._id || currentSelectedDeal.productId.id) : currentSelectedDeal.productId) ||
        `prod_${idx}`
      );
      const name = p.productName || p.name || p.productId?.name || p.productId?.title || currentSelectedDeal.productName || '';
      const unit = resolveActualUnit(currentSelectedDeal, p, unitsList);
      const qty = p.quantity || currentSelectedDeal.totalQuantity || currentSelectedDeal.quantity || 0;
      return {
        id: pid,
        productId: pid,
        name,
        unit,
        quantity: qty,
      };
    });
  }, [currentSelectedDeal, unitsList]);

  const onSelectDealForDelivery = (selectedDeal) => {
    if (!selectedDeal) return;
    const dId = normalizeId(selectedDeal._id || selectedDeal.id);
    const prods = Array.isArray(selectedDeal.products) && selectedDeal.products.length > 0
      ? selectedDeal.products
      : (selectedDeal.product ? [selectedDeal.product] : []);
    const firstP = prods[0];
    const pId = normalizeId(
      (firstP?.productId && typeof firstP.productId === 'object' ? (firstP.productId._id || firstP.productId.id) : firstP?.productId) ||
      firstP?._id ||
      firstP?.id ||
      (selectedDeal.productId && typeof selectedDeal.productId === 'object' ? (selectedDeal.productId._id || selectedDeal.productId.id) : selectedDeal.productId)
    );
    const defUnit = resolveActualUnit(selectedDeal, firstP, unitsList);
    const isBuyer = normalizeId(selectedDeal.buyerCompanyId?._id || selectedDeal.buyerCompanyId?.id || selectedDeal.buyerCompanyId) === selectedCompanyId;

    setDeliveryForm((prev) => ({
      ...prev,
      dealId: dId,
      productId: pId || prev.productId,
      unit: defUnit || prev.unit,
      deliveryType: isBuyer ? 'received' : 'sent',
    }));
    setIsDeliveryDealDropdownExpanded(false);
  };

  /* ── Submit New Delivery / Record Dispatch ── */
  const handleCreateDelivery = async () => {
    if (!deliveryForm.dealId) {
      Alert.alert('Required', 'Please select a Sauda / Deal.');
      return;
    }
    if (!deliveryForm.quantity || Number(deliveryForm.quantity) <= 0) {
      Alert.alert('Required', 'Please enter a valid dispatch quantity.');
      return;
    }

    // 10-Digit Driver Mobile Validation
    const cleanPhone = String(deliveryForm.driverPhone || '').replace(/\D/g, '');
    if (deliveryForm.driverPhone && cleanPhone.length > 0 && cleanPhone.length !== 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number for the driver.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const targetDeal = currentSelectedDeal || deals.find((d) => normalizeId(d._id || d.id) === deliveryForm.dealId);

      // Resolve productId with full fallbacks
      let resolvedProductId = deliveryForm.productId;
      if (!resolvedProductId && targetDeal) {
        const prods = Array.isArray(targetDeal.products) && targetDeal.products.length > 0
          ? targetDeal.products
          : (targetDeal.product ? [targetDeal.product] : []);
        const firstP = prods[0];
        resolvedProductId = normalizeId(
          (firstP?.productId && typeof firstP.productId === 'object' ? (firstP.productId._id || firstP.productId.id) : firstP?.productId) ||
          firstP?._id ||
          firstP?.id ||
          (targetDeal.productId && typeof targetDeal.productId === 'object' ? (targetDeal.productId._id || targetDeal.productId.id) : targetDeal.productId)
        );
      }

      // If still missing, attempt fetching full deal details from API
      if (!resolvedProductId && deliveryForm.dealId && token) {
        try {
          const detailRes = await getDealDetails(deliveryForm.dealId, token);
          const fullD = detailRes?.data?.deal || detailRes?.data;
          if (fullD) {
            const prods = Array.isArray(fullD.products) && fullD.products.length > 0
              ? fullD.products
              : (fullD.product ? [fullD.product] : []);
            const firstP = prods[0];
            resolvedProductId = normalizeId(
              (firstP?.productId && typeof firstP.productId === 'object' ? (firstP.productId._id || firstP.productId.id) : firstP?.productId) ||
              firstP?._id ||
              firstP?.id ||
              (fullD.productId && typeof fullD.productId === 'object' ? (fullD.productId._id || fullD.productId.id) : fullD.productId)
            );
          }
        } catch (detailErr) {
          console.warn('Could not fetch deal details for productId resolution:', detailErr);
        }
      }

      if (!resolvedProductId) {
        Alert.alert('Product Required', 'Could not determine Product ID for this Sauda. Please select a valid Sauda with products.');
        setIsSubmitting(false);
        return;
      }

      // Determine deliveryType ('sent' vs 'received')
      const isBuyer = normalizeId(targetDeal?.buyerCompanyId?._id || targetDeal?.buyerCompanyId?.id || targetDeal?.buyerCompanyId) === selectedCompanyId;
      const deliveryType = deliveryForm.deliveryType || (isBuyer ? 'received' : 'sent');

      const extraNotes = [
        deliveryForm.vehicleNumber ? `Vehicle: ${deliveryForm.vehicleNumber.trim().toUpperCase()}` : null,
        deliveryForm.transportName ? `Transport: ${deliveryForm.transportName.trim()}` : null,
        deliveryForm.driverName ? `Driver: ${deliveryForm.driverName.trim()}${cleanPhone ? ` (${cleanPhone})` : ''}` : (cleanPhone ? `Driver Phone: ${cleanPhone}` : null),
        deliveryForm.trackingNumber ? `Bilty/LR: ${deliveryForm.trackingNumber.trim()}` : null,
        deliveryForm.deliveryAddress ? `Destination: ${deliveryForm.deliveryAddress.trim()}` : null,
        deliveryForm.deliveryDate ? `Date: ${deliveryForm.deliveryDate}` : null,
        deliveryForm.unit ? `Unit: ${deliveryForm.unit}` : null,
        deliveryForm.notes ? `Remarks: ${deliveryForm.notes.trim()}` : null,
      ].filter(Boolean).join(' | ');

      // Only send backend-accepted schema fields to prevent "unit is not allowed" or unknown field errors
      const payload = {
        dealId: deliveryForm.dealId,
        productId: resolvedProductId,
        quantity: Number(deliveryForm.quantity),
        deliveryType,
        notes: extraNotes || undefined,
      };

      const res = await createDelivery(payload, token);
      if (res?.success) {
        Alert.alert('Success', 'Delivery / dispatch recorded successfully!');
        setShowDeliveryModal(false);
        setDeliveryForm({
          dealId: '',
          productId: '',
          deliveryType: 'sent',
          quantity: '',
          unit: '',
          vehicleNumber: '',
          transportName: '',
          driverName: '',
          driverPhone: '',
          deliveryDate: new Date().toISOString().split('T')[0],
          deliveryAddress: '',
          trackingNumber: '',
          notes: '',
        });
        setViewMode('dispatches');
        setStatusFilter('all');
        setSelectedDealId('all');
        fetchData(true);
      } else {
        Alert.alert('Notice', res?.message || 'Failed to record delivery.');
      }
    } catch (err) {
      console.warn('Error recording dispatch:', err);
      Alert.alert('Error', err?.message || 'Failed to record delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Update Delivery Status ── */
  const handleUpdateStatus = async (deliveryId, newStatus) => {
    setActionInProgressId(deliveryId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await updateDeliveryStatus(deliveryId, newStatus, token);
      if (res?.success) {
        Alert.alert('Updated', `Delivery status updated to ${newStatus.toUpperCase()}`);
        fetchData(true);
      } else {
        Alert.alert('Notice', res?.message || 'Status updated.');
        fetchData(true);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update status.');
    } finally {
      setActionInProgressId(null);
    }
  };

  /* ── Share Delivery Details ── */
  const handleShareDelivery = (item) => {
    const dealObj = (typeof item.dealId === 'object' ? item.dealId : null) || deals.find((d) => normalizeId(d._id || d.id) === normalizeId(item.dealId)) || {};
    const dealNo = dealObj?.dealNumber || dealObj?.saudaNumber || item.dealNumber || 'SAUDA';
    const unitVal = resolveActualUnit(item, null, unitsList) || (dealObj ? resolveActualUnit(dealObj, null, unitsList) : '');
    const message = `Pravisti Delivery Update:\nSauda: ${dealNo}\nQuantity: ${item.quantity || ''}${unitVal ? ` ${unitVal}` : ''}\nVehicle: ${item.vehicleNumber || 'N/A'}\nTransport: ${item.transportName || 'N/A'}\nDriver: ${item.driverName || 'N/A'} (${item.driverPhone || 'N/A'})\nStatus: ${(item.status || 'Dispatched').toUpperCase()}\nDate: ${item.deliveryDate ? item.deliveryDate.split('T')[0] : 'N/A'}`;
    Share.share({ message }).catch(() => { });
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') {
      return { label: 'Delivered', bg: '#DCFCE7', text: '#15803D', icon: <CheckCircle2 size={13} color="#15803D" /> };
    }
    if (s === 'in_transit' || s === 'dispatched') {
      return { label: 'In Transit', bg: '#DBEAFE', text: '#1D4ED8', icon: <Truck size={13} color="#1D4ED8" /> };
    }
    return { label: 'Pending', bg: '#FEF3C7', text: '#B45309', icon: <Clock size={13} color="#B45309" /> };
  };

  /* ── Filtered Saudas List (Deals + Delivery Progress) ── */
  const filteredSaudas = useMemo(() => {
    return deliveriesBySauda.filter(({ deal, deliveries: saudaDelivs }) => {
      // 1. Deal ID Filter
      if (selectedDealId !== 'all') {
        const dId = normalizeId(deal._id || deal.id);
        if (dId !== selectedDealId) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        const totalQty = Number(deal.products?.[0]?.quantity || deal.totalQuantity || deal.quantity || 0);
        const dispatchedQty = saudaDelivs.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
        const isDelivered = (totalQty > 0 && dispatchedQty >= totalQty) || (saudaDelivs.length > 0 && saudaDelivs.every((d) => (d.status || '').toLowerCase() === 'delivered'));
        const hasInTransit = saudaDelivs.some((d) => (d.status || '').toLowerCase() === 'in_transit' || (d.status || '').toLowerCase() === 'dispatched');

        if (statusFilter === 'delivered' && !isDelivered) return false;
        if (statusFilter === 'in_transit' && (!hasInTransit || isDelivered)) return false;
        if (statusFilter === 'pending' && (saudaDelivs.length > 0 || isDelivered)) return false;
      }

      return true;
    });
  }, [deliveriesBySauda, selectedDealId, statusFilter]);

  /* ── Sauda Delivery Badge Helper ── */
  const getSaudaDeliveryStatusBadge = (deal, saudaDelivs) => {
    const totalQty = Number(deal.products?.[0]?.quantity || deal.totalQuantity || deal.quantity || 0);
    const dispatchedQty = saudaDelivs.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    if (totalQty > 0 && dispatchedQty >= totalQty) {
      return { label: 'Delivered', bg: '#DCFCE7', text: '#15803D', icon: <CheckCircle2 size={12} color="#15803D" /> };
    }
    if (saudaDelivs.length > 0) {
      const anyInTransit = saudaDelivs.some((d) => (d.status || '').toLowerCase() === 'in_transit' || (d.status || '').toLowerCase() === 'dispatched');
      if (anyInTransit) {
        return { label: 'In Transit', bg: '#DBEAFE', text: '#1D4ED8', icon: <Truck size={12} color="#1D4ED8" /> };
      }
      return { label: 'Partial Dispatch', bg: '#E0E7FF', text: '#4338CA', icon: <Package size={12} color="#4338CA" /> };
    }
    return { label: 'Pending Dispatch', bg: '#FEF3C7', text: '#B45309', icon: <Clock size={12} color="#B45309" /> };
  };

  /* ── Open Dispatch Modal pre-selected for specific Sauda ── */
  const handleOpenDispatchForSauda = (deal) => {
    onSelectDealForDelivery(deal);
    setShowDeliveryModal(true);
  };

  /* ── View Dispatches for specific Sauda ── */
  const handleViewDispatchesForSauda = (dealId) => {
    setSelectedDealId(dealId);
    setViewMode('dispatches');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── 1. TOP HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => onNavigate('CompanyDetails', { companyId: selectedCompanyId, company: initialCompany })}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Deliveries & Dispatch</Text>
            <TouchableOpacity
              style={styles.companySelectorRow}
              onPress={() => setIsCompanyPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Building2 size={13} color="#1541D8" style={{ marginRight: 4 }} />
              <Text style={styles.companySelectorText} numberOfLines={1}>
                {selectedCompanyName || 'Select Company'}
              </Text>
              <ChevronDown size={13} color="#1541D8" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: '#1541D8' }]}
            onPress={() => setShowDeliveryModal(true)}
            activeOpacity={0.85}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchData(true)}
            colors={['#1541D8']}
            tintColor="#1541D8"
          />
        }
      >
        {/* ─── 3. COMPACT OVERVIEW STATS CARDS ─── */}
        <View style={styles.statsRow}>
          {/* Total Saudas */}
          <TouchableOpacity
            style={[
              styles.statCard,
              viewMode === 'saudas' && statusFilter === 'all' && styles.statCardActive,
            ]}
            onPress={() => {
              setViewMode('saudas');
              setStatusFilter('all');
              setSelectedDealId('all');
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#EFF6FF' }]}>
              <Layers size={11} color="#1541D8" />
            </View>
            <Text style={styles.statValue}>{stats.totalSaudas}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Total Saudas</Text>
          </TouchableOpacity>

          {/* In Transit */}
          <TouchableOpacity
            style={[
              styles.statCard,
              statusFilter === 'in_transit' && styles.statCardActive,
            ]}
            onPress={() => {
              setViewMode('dispatches');
              setStatusFilter('in_transit');
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#E0F2FE' }]}>
              <Truck size={11} color="#0284C7" />
            </View>
            <Text style={styles.statValue}>{stats.inTransitCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>In Transit</Text>
          </TouchableOpacity>

          {/* Delivered */}
          <TouchableOpacity
            style={[
              styles.statCard,
              statusFilter === 'delivered' && styles.statCardActive,
            ]}
            onPress={() => {
              setViewMode('dispatches');
              setStatusFilter('delivered');
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#DCFCE7' }]}>
              <CheckCircle2 size={11} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>{stats.deliveredCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Delivered</Text>
          </TouchableOpacity>

          {/* Pending */}
          <TouchableOpacity
            style={[
              styles.statCard,
              statusFilter === 'pending' && styles.statCardActive,
            ]}
            onPress={() => {
              setViewMode('dispatches');
              setStatusFilter('pending');
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={11} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Pending</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 4. VIEW MODE TABS (ALL SAUDAS vs DISPATCHES) ─── */}
        <View style={styles.viewModeTabsRow}>
          <TouchableOpacity
            style={[styles.viewModeTab, viewMode === 'saudas' && styles.viewModeTabActive]}
            onPress={() => setViewMode('saudas')}
            activeOpacity={0.8}
          >
            <Layers size={13} color={viewMode === 'saudas' ? '#1541D8' : '#64748B'} style={{ marginRight: 5 }} />
            <Text style={[styles.viewModeTabText, viewMode === 'saudas' && styles.viewModeTabTextActive]}>
              All Saudas
            </Text>
            <View style={[styles.countBadge, viewMode === 'saudas' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, viewMode === 'saudas' && styles.countBadgeTextActive]}>
                {deals.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeTab, viewMode === 'dispatches' && styles.viewModeTabActive]}
            onPress={() => setViewMode('dispatches')}
            activeOpacity={0.8}
          >
            <Truck size={13} color={viewMode === 'dispatches' ? '#1541D8' : '#64748B'} style={{ marginRight: 5 }} />
            <Text style={[styles.viewModeTabText, viewMode === 'dispatches' && styles.viewModeTabTextActive]}>
              Dispatches
            </Text>
            <View style={[styles.countBadge, viewMode === 'dispatches' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, viewMode === 'dispatches' && styles.countBadgeTextActive]}>
                {deliveries.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── 5. ACTION BUTTON HERO ─── */}
        <TouchableOpacity
          style={styles.heroDispatchBtn}
          onPress={() => setShowDeliveryModal(true)}
          activeOpacity={0.88}
        >
          <View style={styles.heroDispatchLeft}>
            <View style={styles.heroDispatchIconBadge}>
              <Truck size={18} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.heroDispatchTitle}>Record New Dispatch</Text>
              <Text style={styles.heroDispatchSub}>Add vehicle, goods quantity & tracking slip</Text>
            </View>
          </View>
          <Plus size={18} color="#FFFFFF" strokeWidth={2.6} />
        </TouchableOpacity>

        {/* ─── 6A. ALL SAUDAS VIEW ─── */}
        {viewMode === 'saudas' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Saudas & Delivery Tracking</Text>
              <Text style={styles.sectionHeaderBadge}>{filteredSaudas.length} Saudas</Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1541D8" />
                <Text style={styles.loadingText}>Loading company saudas...</Text>
              </View>
            ) : filteredSaudas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Layers size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Saudas Found</Text>
                <Text style={styles.emptySubtitle}>
                  No Saudas/deals found for this company yet.
                </Text>
              </View>
            ) : (
              filteredSaudas.map(({ deal, deliveries: saudaDelivs }, idx) => {
                const dId = normalizeId(deal._id || deal.id || `sauda_${idx}`);
                const rawDealNo = String(deal.dealNumber || deal.saudaNumber || dId.slice(-4)).replace(/^#+/, '');
                const dealNumber = rawDealNo.toUpperCase();
                const dealDate = deal.createdAt
                  ? deal.createdAt.split('T')[0]
                  : deal.date
                    ? deal.date.split('T')[0]
                    : '';
                const productName =
                  deal.products?.[0]?.productName ||
                  deal.products?.[0]?.name ||
                  deal.productName ||
                  deal.product?.name ||
                  deal.title ||
                  '';
                const totalQty = Number(deal.products?.[0]?.quantity || deal.totalQuantity || deal.quantity || 0);
                const unit = resolveActualUnit(deal, null, unitsList);
                const rate = deal.products?.[0]?.rate || deal.rate || 0;
                const totalAmount = deal.totalAmount || deal.amount || (rate && totalQty ? rate * totalQty : 0);

                const buyerName = deal.buyerCompanyId?.name || deal.buyerCompanyName || deal.buyer?.name || '';
                const sellerName = deal.sellerCompanyId?.name || deal.sellerCompanyName || deal.seller?.name || '';
                const isBuyer =
                  normalizeId(deal.buyerCompanyId?._id || deal.buyerCompanyId?.id || deal.buyerCompanyId) ===
                  selectedCompanyId;
                const counterParty = isBuyer ? (sellerName || 'Seller') : (buyerName || 'Buyer');
                const roleText = isBuyer ? 'Buying from' : 'Selling to';

                const dispatchedQty = saudaDelivs.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
                const percentDispatched = totalQty > 0 ? Math.min(Math.round((dispatchedQty / totalQty) * 100), 100) : 0;
                const badge = getSaudaDeliveryStatusBadge(deal, saudaDelivs);

                return (
                  <View key={dId} style={styles.saudaCard}>
                    {/* Top Header: Deal ID & Status Badge */}
                    <View style={styles.saudaCardHeader}>
                      <View style={styles.saudaHeaderLeft}>
                        <View style={styles.dealBadgeWrap}>
                          <Hash size={11} color="#1541D8" style={{ marginRight: 2 }} />
                          <Text style={styles.dealBadgeText}>{dealNumber}</Text>
                        </View>
                        {dealDate ? (
                          <View style={styles.dateWrap}>
                            <Calendar size={11} color="#94A3B8" style={{ marginRight: 3 }} />
                            <Text style={styles.saudaDateText}>{dealDate}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        {badge.icon}
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    {/* Product & Counterparty Info */}
                    <View style={styles.saudaBodyRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.saudaProductTitle} numberOfLines={1}>{productName}</Text>
                        <Text style={styles.saudaPartySubtitle} numberOfLines={1}>
                          {roleText} <Text style={{ fontWeight: '700', color: '#1E293B' }}>{counterParty}</Text>
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.saudaQtyMain}>{totalQty ? `${totalQty}${unit ? ` ${unit}` : ''}` : 'Open Qty'}</Text>
                        {totalAmount ? (
                          <Text style={styles.saudaAmountSub}>₹{Number(totalAmount).toLocaleString('en-IN')}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Dispatch Progress */}
                    <View style={styles.deliveryProgressWrap}>
                      <View style={styles.deliveryProgressHeader}>
                        <Text style={styles.deliveryProgressLabel}>Dispatch Progress</Text>
                        <Text style={styles.deliveryProgressValue}>
                          {dispatchedQty} / {totalQty || '—'}{unit ? ` ${unit}` : ''} ({percentDispatched}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${percentDispatched}%` }]} />
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.saudaActionsRow}>
                      <TouchableOpacity
                        style={styles.saudaDispatchBtn}
                        onPress={() => handleOpenDispatchForSauda(deal)}
                        activeOpacity={0.8}
                      >
                        <Truck size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.saudaDispatchBtnText}>+ Dispatch</Text>
                      </TouchableOpacity>

                      {saudaDelivs.length > 0 && (
                        <TouchableOpacity
                          style={styles.saudaViewDeliveriesBtn}
                          onPress={() => handleViewDispatchesForSauda(dId)}
                          activeOpacity={0.8}
                        >
                          <Eye size={13} color="#1541D8" style={{ marginRight: 4 }} />
                          <Text style={styles.saudaViewDeliveriesBtnText}>
                            {saudaDelivs.length} Dispatch{saudaDelivs.length > 1 ? 'es' : ''}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ─── 6B. DISPATCHES & LOGISTICS VIEW ─── */}
        {viewMode === 'dispatches' && (
          <View>
            {/* Status Filter Chips */}
            <View style={styles.statusChipsRow}>
              {[
                { id: 'all', label: 'All Dispatches' },
                { id: 'in_transit', label: 'In Transit' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'pending', label: 'Pending' },
              ].map((chip) => {
                const isActive = statusFilter === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[styles.statusChip, isActive && styles.statusChipActive]}
                    onPress={() => setStatusFilter(chip.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Vehicle Dispatches & Tracking</Text>
              <Text style={styles.sectionHeaderBadge}>{filteredDeliveries.length} items</Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1541D8" />
                <Text style={styles.loadingText}>Loading delivery dispatches...</Text>
              </View>
            ) : filteredDeliveries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Truck size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Dispatches Found</Text>
                <Text style={styles.emptySubtitle}>
                  No vehicle dispatches recorded yet for this company.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCreateBtn}
                  onPress={() => setShowDeliveryModal(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyCreateBtnText}>Record First Dispatch</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredDeliveries.map((item, idx) => {
                const badge = getStatusBadge(item.status);
                const dealObj = (typeof item.dealId === 'object' ? item.dealId : null) || deals.find((d) => normalizeId(d._id || d.id) === normalizeId(item.dealId)) || {};
                const dealNo = dealObj?.dealNumber || dealObj?.saudaNumber || item.dealNumber || `SAUDA-${idx + 1}`;
                const productName =
                  item.productName ||
                  dealObj?.products?.[0]?.productName ||
                  dealObj?.products?.[0]?.name ||
                  dealObj?.productName ||
                  dealObj?.product?.name ||
                  dealObj?.title ||
                  '';
                const isDelivered = (item.status || '').toLowerCase() === 'delivered';

                const vehicleNo = item.vehicleNumber || item.notes?.match(/Vehicle:\s*([^|]+)/i)?.[1]?.trim() || '';
                const transName = item.transportName || item.notes?.match(/Transport:\s*([^|]+)/i)?.[1]?.trim() || '';
                const dName = item.driverName || item.notes?.match(/Driver:\s*([^|()]+)/i)?.[1]?.trim() || '';
                const dPhone = item.driverPhone || item.notes?.match(/Driver:[^|]*\(([^)]+)\)/i)?.[1]?.trim() || item.notes?.match(/Driver Phone:\s*([^|]+)/i)?.[1]?.trim() || '';
                const dateVal = item.deliveryDate ? item.deliveryDate.split('T')[0] : (item.notes?.match(/Date:\s*([^|]+)/i)?.[1]?.trim() || (item.createdAt ? item.createdAt.split('T')[0] : ''));
                const trackNo = item.trackingNumber || item.notes?.match(/Bilty\/LR:\s*([^|]+)/i)?.[1]?.trim() || '';
                const destAddr = item.deliveryAddress || item.notes?.match(/Destination:\s*([^|]+)/i)?.[1]?.trim() || '';
                const unitVal = resolveActualUnit(item, null, unitsList) || (dealObj ? resolveActualUnit(dealObj, null, unitsList) : '');

                return (
                  <View key={item._id || item.id || `del_${idx}`} style={styles.deliveryCard}>
                    {/* Top Row: Deal ID & Status Badge */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.dealBadgeWrap}>
                        <Hash size={13} color="#1541D8" style={{ marginRight: 2 }} />
                        <Text style={styles.dealBadgeText}>{dealNo}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        {badge.icon}
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    {/* Product & Quantity */}
                    <View style={styles.productRow}>
                      <Package size={17} color="#475569" style={{ marginRight: 8 }} />
                      <Text style={styles.productNameText} numberOfLines={1}>{productName || 'Sauda Delivery'}</Text>
                      <Text style={styles.quantityText}>
                        {item.quantity ? `${item.quantity}${unitVal ? ` ${unitVal}` : ''}` : 'Full Sauda'}
                      </Text>
                    </View>

                    {/* Transport & Vehicle Details */}
                    <View style={styles.detailsGrid}>
                      {vehicleNo ? (
                        <View style={styles.detailItem}>
                          <Truck size={13} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.detailLabel}>Vehicle:</Text>
                          <Text style={styles.detailValue} numberOfLines={1}>{vehicleNo}</Text>
                        </View>
                      ) : null}

                      {transName ? (
                        <View style={styles.detailItem}>
                          <Layers size={13} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.detailLabel}>Transport:</Text>
                          <Text style={styles.detailValue} numberOfLines={1}>{transName}</Text>
                        </View>
                      ) : null}

                      {dateVal ? (
                        <View style={styles.detailItem}>
                          <Calendar size={13} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.detailLabel}>Date:</Text>
                          <Text style={styles.detailValue}>{dateVal}</Text>
                        </View>
                      ) : null}

                      {trackNo ? (
                        <View style={styles.detailItem}>
                          <FileText size={13} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.detailLabel}>Tracking / LR:</Text>
                          <Text style={styles.detailValue}>{trackNo}</Text>
                        </View>
                      ) : null}

                      {destAddr ? (
                        <View style={[styles.detailItem, { width: '100%' }]}>
                          <MapPin size={13} color="#64748B" style={{ marginRight: 4 }} />
                          <Text style={styles.detailLabel}>Destination:</Text>
                          <Text style={styles.detailValue} numberOfLines={1}>{destAddr}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Driver Info if present */}
                    {dName ? (
                      <View style={styles.driverRow}>
                        <User size={13} color="#64748B" style={{ marginRight: 5 }} />
                        <Text style={styles.driverNameText}>{dName}</Text>
                        {dPhone ? (
                          <View style={styles.driverPhoneWrap}>
                            <Phone size={11} color="#059669" style={{ marginRight: 3 }} />
                            <Text style={styles.driverPhoneText}>{dPhone}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Bottom Actions Row */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.cardShareBtn}
                        onPress={() => handleShareDelivery(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cardShareBtnText}>Share Status</Text>
                      </TouchableOpacity>

                      {!isDelivered ? (
                        <TouchableOpacity
                          style={styles.cardMarkDeliveredBtn}
                          onPress={() => handleUpdateStatus(item._id || item.id, 'delivered')}
                          disabled={actionInProgressId === (item._id || item.id)}
                          activeOpacity={0.8}
                        >
                          {actionInProgressId === (item._id || item.id) ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Check size={14} color="#FFFFFF" strokeWidth={2.6} style={{ marginRight: 4 }} />
                              <Text style={styles.cardMarkDeliveredBtnText}>Mark Delivered</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.deliveredCheckBadge}>
                          <CheckCircle2 size={15} color="#16A34A" style={{ marginRight: 4 }} />
                          <Text style={styles.deliveredCheckText}>Completed</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── 7. RECORD DISPATCH / DELIVERY MODAL ─── */}
      <Modal
        visible={showDeliveryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Truck size={20} color="#1541D8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Record New Dispatch</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeliveryModal(false)} activeOpacity={0.7}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* Select Deal */}
              <Text style={styles.fieldLabel}>Select Sauda / Deal *</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setIsDeliveryDealDropdownExpanded(!isDeliveryDealDropdownExpanded)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownSelectorText, !deliveryForm.dealId && { color: '#94A3B8' }]}>
                  {deliveryForm.dealId
                    ? deals.find((d) => normalizeId(d._id || d.id) === deliveryForm.dealId)?.dealNumber || 'Selected Deal'
                    : 'Choose Sauda...'}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              {isDeliveryDealDropdownExpanded && (
                <View style={styles.dropdownMenu}>
                  {deals.map((d) => {
                    const did = normalizeId(d._id || d.id);
                    const isSelected = deliveryForm.dealId === did;
                    const dNo = d.dealNumber || d.saudaNumber || `SAUDA-${did.slice(-4)}`;
                    const prod = d.products?.[0]?.productName || d.product?.name || '';
                    return (
                      <TouchableOpacity
                        key={did}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                        onPress={() => onSelectDealForDelivery(d)}
                      >
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                          {dNo} {prod ? `(${prod})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Select Commodity / Product */}
              {dealProductsList.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.fieldLabel}>Product / Commodity *</Text>
                  {dealProductsList.length === 1 ? (
                    <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#F8FAFC' }]}>
                      <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '500' }}>
                        {dealProductsList[0].name} ({dealProductsList[0].quantity}{dealProductsList[0].unit ? ` ${dealProductsList[0].unit}` : ''})
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.dropdownSelector}
                        onPress={() => setIsDeliveryProductDropdownExpanded(!isDeliveryProductDropdownExpanded)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dropdownSelectorText, !deliveryForm.productId && { color: '#94A3B8' }]}>
                          {dealProductsList.find((p) => p.productId === deliveryForm.productId)?.name || 'Choose Product...'}
                        </Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>

                      {isDeliveryProductDropdownExpanded && (
                        <View style={styles.dropdownMenu}>
                          {dealProductsList.map((p) => {
                            const isSelected = deliveryForm.productId === p.productId;
                            return (
                              <TouchableOpacity
                                key={p.productId}
                                style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                                onPress={() => {
                                  setDeliveryForm((prev) => ({
                                    ...prev,
                                    productId: p.productId,
                                    unit: p.unit || prev.unit,
                                  }));
                                  setIsDeliveryProductDropdownExpanded(false);
                                }}
                              >
                                <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                                  {p.name} {p.quantity ? `(${p.quantity}${p.unit ? ` ${p.unit}` : ''})` : ''}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Quantity & Unit */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Quantity Dispatched *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 50"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={deliveryForm.quantity}
                    onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, quantity: txt }))}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. MT, Bags, Kg"
                    placeholderTextColor="#94A3B8"
                    value={deliveryForm.unit}
                    onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, unit: txt }))}
                  />
                </View>
              </View>

              {/* Transport Name */}
              <Text style={styles.fieldLabel}>Transport / Logistics Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Navkar Roadlines"
                placeholderTextColor="#94A3B8"
                value={deliveryForm.transportName}
                onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, transportName: txt }))}
              />

              {/* Vehicle Number */}
              <Text style={styles.fieldLabel}>Vehicle Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. RJ 14 GA 5521"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={deliveryForm.vehicleNumber}
                onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, vehicleNumber: txt }))}
              />

              {/* Driver Details */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Driver Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Driver full name"
                    placeholderTextColor="#94A3B8"
                    value={deliveryForm.driverName}
                    onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, driverName: txt }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Driver Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={deliveryForm.driverPhone}
                    onChangeText={(txt) => {
                      const cleaned = txt.replace(/[^0-9]/g, '').slice(0, 10);
                      setDeliveryForm((prev) => ({ ...prev, driverPhone: cleaned }));
                    }}
                  />
                  {deliveryForm.driverPhone && deliveryForm.driverPhone.length > 0 && deliveryForm.driverPhone.length < 10 ? (
                    <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>
                      Must be 10 digits ({deliveryForm.driverPhone.length}/10)
                    </Text>
                  ) : null}
                  {deliveryForm.driverPhone && deliveryForm.driverPhone.length === 10 ? (
                    <Text style={{ fontSize: 11, color: '#10B981', marginTop: 3 }}>
                      ✓ 10 digits entered
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Tracking / LR Number */}
              <Text style={styles.fieldLabel}>Bilty / LR / Tracking No.</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. LR-998822"
                placeholderTextColor="#94A3B8"
                value={deliveryForm.trackingNumber}
                onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, trackingNumber: txt }))}
              />

              {/* Delivery Address */}
              <Text style={styles.fieldLabel}>Delivery / Mandi Destination</Text>
              <TextInput
                style={styles.input}
                placeholder="Warehouse or unloading mandi address"
                placeholderTextColor="#94A3B8"
                value={deliveryForm.deliveryAddress}
                onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, deliveryAddress: txt }))}
              />

              {/* Notes / Remarks */}
              <Text style={styles.fieldLabel}>Notes / Remarks</Text>
              <TextInput
                style={styles.input}
                placeholder="Any special remarks or instructions"
                placeholderTextColor="#94A3B8"
                value={deliveryForm.notes}
                onChangeText={(txt) => setDeliveryForm((prev) => ({ ...prev, notes: txt }))}
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeliveryModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateDelivery}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Dispatch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── 8. COMPANY PICKER MODAL ─── */}
      <Modal
        visible={isCompanyPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCompanyPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCompanyPickerOpen(false)}
        >
          <View style={styles.companyModalContainer}>
            <View style={styles.companyModalHeader}>
              <Text style={styles.companyModalTitle}>Select Company</Text>
              <TouchableOpacity onPress={() => setIsCompanyPickerOpen(false)} activeOpacity={0.7}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {userCompanies.map((comp) => {
                const cid = normalizeId(comp._id || comp.id);
                const isSelected = cid === selectedCompanyId;
                return (
                  <TouchableOpacity
                    key={cid}
                    style={[styles.companyModalItem, isSelected && styles.companyModalItemActive]}
                    onPress={() => {
                      setSelectedCompanyId(cid);
                      setSelectedCompanyName(comp.name || comp.businessName || '');
                      setIsCompanyPickerOpen(false);
                    }}
                  >
                    <Building2 size={16} color={isSelected ? '#1541D8' : '#64748B'} style={{ marginRight: 10 }} />
                    <Text style={[styles.companyModalItemText, isSelected && styles.companyModalItemTextActive]}>
                      {comp.name || comp.businessName || 'Company'}
                    </Text>
                    {isSelected && <Check size={16} color="#1541D8" style={{ marginLeft: 'auto' }} />}
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

export default CompanyDeliveries;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  companySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  companySelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1541D8',
    maxWidth: 160,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* ── Search Bar ── */
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },

  /* ── Stats Row (Compact) ── */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 1.5,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statCardActive: {
    borderColor: '#1541D8',
    backgroundColor: '#EFF6FF',
  },
  statIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 16,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },

  /* ── View Mode Tabs (All Saudas vs Dispatches) ── */
  viewModeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewModeTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  viewModeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewModeTabTextActive: {
    color: '#1541D8',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 5,
  },
  countBadgeActive: {
    backgroundColor: '#EFF6FF',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  countBadgeTextActive: {
    color: '#1541D8',
  },

  /* ── Sauda Cards ── */
  saudaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  saudaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saudaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saudaDateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  saudaBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  saudaProductTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  saudaPartySubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  saudaQtyMain: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1541D8',
    marginBottom: 2,
  },
  saudaAmountSub: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  deliveryProgressWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  deliveryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  deliveryProgressValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1541D8',
    borderRadius: 3,
  },
  saudaActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  saudaDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1541D8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  saudaDispatchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saudaViewDeliveriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  saudaViewDeliveriesBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1541D8',
  },

  /* ── Status Chips ── */
  statusChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipActive: {
    backgroundColor: '#1541D8',
    borderColor: '#1541D8',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },

  /* ── Hero Dispatch Button ── */
  heroDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1541D8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#1541D8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heroDispatchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDispatchIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  heroDispatchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroDispatchSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#BFDBFE',
    marginTop: 1,
  },

  /* ── Section Header ── */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionHeaderBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  /* ── Delivery Card ── */
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dealBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dealBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1541D8',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 3,
  },
  detailValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  driverNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  driverPhoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  driverPhoneText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardShareBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cardShareBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  cardMarkDeliveredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardMarkDeliveredBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deliveredCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveredCheckText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },

  /* ── Empty & Loading ── */
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1541D8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Modal Styles ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 140,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 12.5,
    color: '#334155',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#1541D8',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1541D8',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Company Modal ── */
  companyModalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  companyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  companyModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  companyModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  companyModalItemActive: {
    backgroundColor: '#EFF6FF',
  },
  companyModalItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  companyModalItemTextActive: {
    fontWeight: '700',
    color: '#1541D8',
  },
});
