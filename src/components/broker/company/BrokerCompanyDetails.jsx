import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Home,
  ArrowLeft,
  Building2,
  ShieldCheck,
  MapPin,
  Percent,
  Phone,
  Plus,
  Handshake,
  Share2,
  Award,
  CheckCircle2,
  MessageSquare,
  Clock,
  Users,
  ChevronRight,
  FileText,
  Bot,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyDetails, getBrokerMyDeals, getDeals, getBrokerProductAccessRequests, getBrokerPendingQueue, resolveImageUrl } from '../../../services/api';
import ProductAccessRequestModal from '../../common/ProductAccessRequestModal';
import AIBotFloatingButton from '../../common/AIBotFloatingButton';

const COLORS = {
  primaryDark: '#2327D8',   // Royal Blue (Login & Signup Theme)
  headerMiddle: '#1B1FA7',  // Hover Blue
  headerEnd: '#1E1C38',     // Dark Navy
  primary: '#2327D8',       // Accent Royal Blue
  primaryLight: '#EEF2FE',
  primaryBorder: '#C7D2FE',
  cyan: '#2327D8',
  cyanLight: '#EEF2FE',
  indigo: '#1E1C38',
  indigoLight: '#EEF2FE',
  success: '#059669',
  successDark: '#15803D',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  bgMain: '#F4F6FB',        // Login & Signup background
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
};

const toSafeStr = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.companyName === 'string') return val.companyName;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.city === 'string') return val.city;
    if (typeof val.state === 'string') return val.state;
  }
  return fallback;
};

const extractCompanyIdsFromDeal = (d) => {
  if (!d) return [];
  const ids = [];
  const add = (val) => {
    if (!val) return;
    if (typeof val === 'string' || typeof val === 'number') {
      ids.push(String(val));
    } else if (typeof val === 'object') {
      if (val._id) ids.push(String(val._id));
      if (val.id) ids.push(String(val.id));
      if (val.companyId) ids.push(String(val.companyId));
    }
  };

  add(d.brokerCompanyId);
  add(d.brokerCompany);
  add(d.companyId);
  add(d.company);
  add(d.buyerCompanyId);
  add(d.buyerCompany);
  add(d.sellerCompanyId);
  add(d.sellerCompany);
  add(d.creatorCompanyId);
  add(d.createdByCompany);
  add(d.party1CompanyId);
  add(d.party2CompanyId);
  add(d.buyerParty?.companyId);
  add(d.sellerParty?.companyId);

  return ids;
};

const extractCompanyNamesFromDeal = (d) => {
  if (!d) return [];
  const names = [];
  const add = (val) => {
    if (!val) return;
    if (typeof val === 'string' && val !== '[object Object]') {
      names.push(val.trim().toLowerCase());
    } else if (typeof val === 'object') {
      if (val.name) names.push(String(val.name).trim().toLowerCase());
      if (val.companyName) names.push(String(val.companyName).trim().toLowerCase());
      if (val.businessName) names.push(String(val.businessName).trim().toLowerCase());
      if (val.tradeName) names.push(String(val.tradeName).trim().toLowerCase());
    }
  };

  add(d.brokerCompanyName);
  add(d.brokerCompany);
  add(d.brokerCompanyId);
  add(d.companyName);
  add(d.company);
  add(d.companyId);
  add(d.buyerCompanyName);
  add(d.buyerCompany);
  add(d.buyerCompanyId);
  add(d.buyer);
  add(d.buyerName);
  add(d.buyerParty?.company);
  add(d.sellerCompanyName);
  add(d.sellerCompany);
  add(d.sellerCompanyId);
  add(d.seller);
  add(d.sellerName);
  add(d.sellerParty?.company);

  return names;
};

const BrokerCompanyDetails = ({ onNavigate, routeData }) => {
  const passedCompany = routeData?.company || routeData?.firm || routeData?.data?.company || {};
  const companyId = routeData?.companyId || routeData?.firmId || routeData?.id || routeData?._id || passedCompany._id || passedCompany.id || passedCompany.companyId || passedCompany.brokerCompanyId;

  const [company, setCompany] = useState(passedCompany);
  const [firmDeals, setFirmDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardedQueueUsers, setOnboardedQueueUsers] = useState([]);

  const [accessRequests, setAccessRequests] = useState([]);
  const [isAccessModalVisible, setIsAccessModalVisible] = useState(false);

  const checkProductAccessRequests = async (compTargetId) => {
    if (!compTargetId) return;
    try {
      const res = await getBrokerProductAccessRequests(compTargetId);
      if (res && res.success && Array.isArray(res.data)) {
        const pending = res.data.filter(r => r.status === 'pending');
        setAccessRequests(res.data);
        if (pending.length > 0) {
          setIsAccessModalVisible(true);
        } else {
          setIsAccessModalVisible(false);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch broker product access requests:', err);
    }
  };

  const formatDeal = (d) => {
    let cropName = '';
    if (typeof d.crop === 'string' && d.crop) cropName = d.crop;
    else if (typeof d.productName === 'string' && d.productName) cropName = d.productName;
    else if (typeof d.cropName === 'string' && d.cropName) cropName = d.cropName;
    else if (d.products && d.products.length > 0) {
      const p = d.products[0];
      if (typeof p === 'string') cropName = p;
      else if (p) {
        const pid = p.productId;
        if (pid && typeof pid === 'object') {
          cropName = pid.name || pid.productName || pid.title || pid.cropName || '';
        }
        if (!cropName) {
          cropName = p.name || p.productName || p.crop || p.cropName || p.title || '';
        }
      }
    }
    if (!cropName) cropName = null;

    // Quantity & Unit
    let quantityStr = '';
    const noteUnit =
      d.notes?.match(/Unit:\s*([^|\n\r,()]+)/i)?.[1]?.trim() ||
      d.notes?.match(/\(\s*\d+(?:\.\d+)?\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s*\)/)?.[1]?.trim() ||
      d.notes?.match(/\d+(?:\.\d+)?\s+([a-zA-Z\u0900-\u097F]+)\s*@/)?.[1]?.trim() ||
      '';
    if (d.products?.[0]?.quantity) {
      const p0 = d.products[0];
      const u = p0.unit || p0.unitName || p0.selectedUnitObj?.name || d.unit || d.unitName || noteUnit || p0.unitShortName || p0.selectedUnitObj?.shortName || '';
      quantityStr = `${p0.quantity}${u ? ` ${u}` : ''}`;
    } else if (d.quantity) {
      // Include unit from top-level fields if present
      const topUnit = d.unit || d.unitName || d.quantityUnit || noteUnit || d.unitShortName || '';
      const cleanQty = String(d.quantity).replace(/\s*units?/gi, '').trim();
      quantityStr = cleanQty ? `${cleanQty}${topUnit ? ` ${topUnit}` : ''}` : '';
    }

    const targetCompId = companyId || routeData?.companyId || routeData?.firmId || company?._id || company?.id;
    const targetCompName = company?.name || company?.companyName || firmName;

    // Resolve Seller Company Name
    const rawSellerComp = d.sellerCompanyId || d.sellerCompany || d.seller;
    let sellerName = '';
    if (typeof rawSellerComp === 'object' && rawSellerComp !== null) {
      sellerName = rawSellerComp.companyName || rawSellerComp.name || rawSellerComp.businessName || rawSellerComp.tradeName || '';
    } else if (typeof rawSellerComp === 'string' && rawSellerComp.trim() && rawSellerComp.trim() !== '[object Object]') {
      const isHexId = /^[0-9a-fA-F]{24}$/.test(rawSellerComp.trim());
      if (!isHexId) sellerName = rawSellerComp.trim();
    }
    if (!sellerName && typeof d.sellerCompanyName === 'string' && d.sellerCompanyName.trim()) {
      sellerName = d.sellerCompanyName.trim();
    }
    if (!sellerName && typeof d.sellerName === 'string' && d.sellerName.trim()) {
      sellerName = d.sellerName.trim();
    }
    if (!sellerName && d.sellerParty?.company) {
      sellerName = d.sellerParty.company.companyName || d.sellerParty.company.name || d.sellerParty.company.businessName || '';
    }
    if (!sellerName && d.sellerParty?.name) {
      sellerName = d.sellerParty.name;
    }
    if (!sellerName && d.party1) {
      sellerName = (typeof d.party1 === 'object' ? (d.party1.companyName || d.party1.name) : d.party1) || '';
    }
    if (!sellerName && d.party1CompanyName) {
      sellerName = d.party1CompanyName;
    }

    // Check if seller matches current firm
    const sId = typeof rawSellerComp === 'object' ? (rawSellerComp?._id || rawSellerComp?.id) : rawSellerComp;
    const isSellerThisFirm = Boolean(
      (sId && targetCompId && String(sId) === String(targetCompId)) ||
      (sellerName && targetCompName && sellerName.toLowerCase() === targetCompName.toLowerCase())
    );
    if ((!sellerName || sellerName === 'Seller Business') && isSellerThisFirm) {
      sellerName = targetCompName;
    }
    if (!sellerName || sellerName === 'Seller Business') sellerName = 'Seller Company';

    // Resolve Buyer Company Name
    const rawBuyerComp = d.buyerCompanyId || d.buyerCompany || d.buyer;
    let buyerName = '';
    if (typeof rawBuyerComp === 'object' && rawBuyerComp !== null) {
      buyerName = rawBuyerComp.companyName || rawBuyerComp.name || rawBuyerComp.businessName || rawBuyerComp.tradeName || '';
    } else if (typeof rawBuyerComp === 'string' && rawBuyerComp.trim() && rawBuyerComp.trim() !== '[object Object]') {
      const isHexId = /^[0-9a-fA-F]{24}$/.test(rawBuyerComp.trim());
      if (!isHexId) buyerName = rawBuyerComp.trim();
    }
    if (!buyerName && typeof d.buyerCompanyName === 'string' && d.buyerCompanyName.trim()) {
      buyerName = d.buyerCompanyName.trim();
    }
    if (!buyerName && typeof d.buyerName === 'string' && d.buyerName.trim()) {
      buyerName = d.buyerName.trim();
    }
    if (!buyerName && d.buyerParty?.company) {
      buyerName = d.buyerParty.company.companyName || d.buyerParty.company.name || d.buyerParty.company.businessName || '';
    }
    if (!buyerName && d.buyerParty?.name) {
      buyerName = d.buyerParty.name;
    }
    if (!buyerName && d.party2) {
      buyerName = (typeof d.party2 === 'object' ? (d.party2.companyName || d.party2.name) : d.party2) || '';
    }
    if (!buyerName && d.party2CompanyName) {
      buyerName = d.party2CompanyName;
    }

    // Check if buyer matches current firm
    const bId = typeof rawBuyerComp === 'object' ? (rawBuyerComp?._id || rawBuyerComp?.id) : rawBuyerComp;
    const isBuyerThisFirm = Boolean(
      (bId && targetCompId && String(bId) === String(targetCompId)) ||
      (buyerName && targetCompName && buyerName.toLowerCase() === targetCompName.toLowerCase())
    );
    if ((!buyerName || buyerName === 'Buyer Business') && isBuyerThisFirm) {
      buyerName = targetCompName;
    }
    if (!buyerName || buyerName === 'Buyer Business') buyerName = 'Buyer Company';

    // Financial calculations
    let totalAmt = 0;
    if (d.totalAmount) totalAmt = parseFloat(d.totalAmount) || 0;
    else if (d.grandTotal) totalAmt = parseFloat(d.grandTotal) || 0;
    else if (d.totalValue) {
      totalAmt = parseFloat(String(d.totalValue).replace(/[^0-9.]/g, '')) || 0;
    } else if (d.products?.[0]) {
      const q = parseFloat(d.products[0].quantity) || 0;
      const p = parseFloat(d.products[0].price) || 0;
      totalAmt = q * p;
    }

    let rateStr = totalAmt > 0 ? `₹${totalAmt.toLocaleString('en-IN')}` : (d.rate ? String(d.rate) : null);

    let statusStr = null;
    if (typeof d.status === 'string' && d.status) {
      statusStr = d.status.charAt(0).toUpperCase() + d.status.slice(1);
    }

    let dateStr = null;
    if (d.date) dateStr = String(d.date);
    else if (d.createdAt) {
      try {
        dateStr = new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        dateStr = null;
      }
    }

    return {
      id: d.dealNumber || d.id || d._id || null,
      _id: String(d._id || d.id || ''),
      crop: cropName || null,
      quantity: quantityStr || null,
      rate: rateStr,
      formattedTotal: totalAmt > 0 ? `₹${totalAmt.toLocaleString('en-IN')}` : rateStr,
      buyer: buyerName || null,
      seller: sellerName || null,
      isSellerThisFirm,
      isBuyerThisFirm,
      status: statusStr,
      date: dateStr,
      rawDeal: d,
    };
  };

  const filterDealsForFirm = (dealList, targetId, targetName) => {
    const targetIdStr = targetId ? String(targetId) : null;
    const targetNameClean = targetName ? String(targetName).trim().toLowerCase() : null;

    return dealList
      .filter(d => {
        if (!d) return false;
        if (!targetIdStr && !targetNameClean) return true;

        const dealIds = extractCompanyIdsFromDeal(d);

        // If we have a target ID and the deal has any company IDs, match strictly by ID only.
        // Do NOT fall through to name matching — that causes cross-company leaks.
        if (targetIdStr) {
          if (dealIds.length > 0) {
            return dealIds.includes(targetIdStr);
          }
          // Deal has no IDs at all (pure local draft) — allow name fallback below
        }

        // Name fallback: only for deals with zero company IDs (pure local drafts)
        if (targetNameClean && dealIds.length === 0) {
          const dealNames = extractCompanyNamesFromDeal(d);
          return dealNames.some(n => n === targetNameClean);
        }

        return false;
      })
      .map(formatDeal);
  };

  const loadCompanyData = async () => {
    const passedComp = routeData?.company || routeData?.firm || routeData?.data?.company || {};
    const effectiveCompId = companyId || routeData?.companyId || routeData?.firmId || routeData?.id || routeData?._id || passedComp._id || passedComp.id || passedComp.companyId || passedComp.brokerCompanyId || company._id || company.id;
    const effectiveCompName = passedComp.name || passedComp.companyName || company.name || company.companyName;

    try {
      // 1. INSTANT LOCAL HYDRATION
      const delStr = await AsyncStorage.getItem('deleted_deal_ids');
      const deletedIds = delStr ? JSON.parse(delStr) : [];

      const isNotDeleted = (d) => {
        if (!d) return false;
        if (d.isDeleted === true || d.deleted === true) return false;
        const st = String(d.status || '').toLowerCase();
        if (st === 'deleted' || st === 'cancelled_deleted') return false;
        const id1 = String(d._id || '');
        const id2 = String(d.id || '');
        const id3 = String(d.dealNumber || '');
        if (deletedIds.includes(id1) || (id2 && deletedIds.includes(id2)) || (id3 && deletedIds.includes(id3))) {
          return false;
        }
        return true;
      };

      // 1. INSTANT LOCAL HYDRATION — only use cache if we have no companyId to avoid stale cross-company data
      const storedDealsStr = await AsyncStorage.getItem('broker_deals_storage');
      if (!effectiveCompId) {
        // No company filter — safe to show cached deals immediately
        const localDeals = (storedDealsStr ? JSON.parse(storedDealsStr) : []).filter(isNotDeleted);
        setFirmDeals(filterDealsForFirm(localDeals, effectiveCompId, effectiveCompName));
      }
      // When effectiveCompId is known, skip stale cache — wait for API to return the correct deals
      checkProductAccessRequests(effectiveCompId);

      // 2. PARALLEL BACKGROUND API SYNC
      const token = await AsyncStorage.getItem('userToken');

      const [compResResult, brokerDealsRes, allDealsRes, pendingQueueRes] = await Promise.allSettled([
        effectiveCompId ? getCompanyDetails(effectiveCompId) : Promise.resolve(null),
        token ? getBrokerMyDeals(effectiveCompId, token) : Promise.resolve(null),
        token ? getDeals(token, 1, 50, effectiveCompId) : Promise.resolve(null),
        token ? getBrokerPendingQueue(effectiveCompId, token) : Promise.resolve(null),
      ]);

      let updatedComp = { ...passedComp, ...company };
      if (compResResult.status === 'fulfilled' && compResResult.value?.success && compResResult.value?.data) {
        updatedComp = { ...updatedComp, ...compResResult.value.data };
        setCompany(updatedComp);
      }

      const queueList = [];
      const seenQueueIds = new Set();
      const addQueueItem = (item) => {
        if (!item || !isNotDeleted(item)) return;
        const qid = item._id || item.id || item.registrationId || item.mobileNumber || item.name;
        if (qid && !seenQueueIds.has(String(qid))) {
          seenQueueIds.add(String(qid));
          queueList.push(item);
        }
      };

      if (pendingQueueRes.status === 'fulfilled' && pendingQueueRes.value) {
        const qVal = pendingQueueRes.value;
        const qArr = Array.isArray(qVal) ? qVal : (qVal.data ? (Array.isArray(qVal.data) ? qVal.data : qVal.data.queue || qVal.data.onboardings || []) : []);
        qArr.forEach(addQueueItem);
      }

      if (brokerDealsRes.status === 'fulfilled' && brokerDealsRes.value) {
        const bVal = brokerDealsRes.value;
        const bArr = Array.isArray(bVal) ? bVal : (bVal.data ? (Array.isArray(bVal.data) ? bVal.data : bVal.data.myDeals || bVal.data.deals || []) : []);
        bArr.forEach(addQueueItem);
      }

      setOnboardedQueueUsers(queueList);

      let apiDeals = [];
      if (brokerDealsRes.status === 'fulfilled' && brokerDealsRes.value?.success) {
        const bRes = brokerDealsRes.value;
        const list = Array.isArray(bRes.data) ? bRes.data : (bRes.data?.deals || bRes.data?.myDeals || []);
        apiDeals = [...apiDeals, ...list.filter(isNotDeleted)];
      }

      if (allDealsRes.status === 'fulfilled' && allDealsRes.value?.success) {
        const aRes = allDealsRes.value;
        const list = Array.isArray(aRes.data) ? aRes.data : (aRes.data?.deals || aRes.data?.myDeals || []);
        apiDeals = [...apiDeals, ...list.filter(isNotDeleted)];
      }

      // Fast O(N) deduplication using Map
      // When effectiveCompId is known, the API already filtered by companyId — use API data only.
      // Merging the local cache would leak other companies' deals into the count.
      const dealMap = new Map();

      if (!effectiveCompId) {
        // No company filter — merge local cache (safe since no cross-company concern)
        const localDeals2 = (storedDealsStr ? JSON.parse(storedDealsStr) : []).filter(isNotDeleted);
        localDeals2.forEach(d => {
          if (!isNotDeleted(d)) return;
          const key = d._id || d.id || d.dealNumber;
          if (key) dealMap.set(String(key), d);
        });
      }

      apiDeals.forEach(d => {
        if (!isNotDeleted(d)) return;
        const key = d._id || d.id || d.dealNumber;
        if (key) dealMap.set(String(key), d);
      });

      const combined = Array.from(dealMap.values());
      const finalCompId = effectiveCompId || updatedComp._id || updatedComp.id;
      const finalCompName = updatedComp.name || updatedComp.companyName || effectiveCompName;
      setFirmDeals(filterDealsForFirm(combined, finalCompId, finalCompName));
    } catch (err) {
      console.warn('Error loading broker company details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, routeData]);

  const rawFirmName = company.name || company.companyName || company.brokerCompanyName || passedCompany.name || passedCompany.companyName;
  const firmName = toSafeStr(rawFirmName, 'Brokerage Firm');

  const rawFirmType = company.firmType || company.companyType || company.entityType || passedCompany.firmType;
  const firmType = toSafeStr(rawFirmType, 'Registered APMC Brokerage');

  const rawCity = company.city || company.address?.city || company.mandiCity || passedCompany.city || passedCompany.address?.city;
  const city = toSafeStr(rawCity, 'Surat APMC Mandi');

  const rawState = company.state || company.address?.state || passedCompany.state;
  const state = toSafeStr(rawState, 'Gujarat');

  const rawApmc = company.apmcLicense || company.registrationNumber || company.gstin || company.licenseNumber || passedCompany.apmcLicense;
  const apmcLicense = toSafeStr(rawApmc, 'APMC/REG/2026/89');

  const commVal = company.commissionRate !== undefined && company.commissionRate !== null ? company.commissionRate : (company.commission !== undefined && company.commission !== null ? company.commission : passedCompany.commissionRate);
  const commRate = commVal !== undefined && commVal !== null ? (typeof commVal === 'object' ? `${toSafeStr(commVal, 'N/A')}%` : `${commVal}%`) : 'N/A';

  const rawIndustry = company.industryName || (typeof company.industry === 'string' ? company.industry : company.industry?.name) || company.primaryMarket || passedCompany.industryName;
  const industry = toSafeStr(rawIndustry, 'Agro & Commodities');

  const rawPhone = company.phone || company.ownerMobile || company.mobileNumber || company.contactNumber || passedCompany.phone;
  const phone = toSafeStr(rawPhone, '+91 98765 43210');

  const rawStreet = company.street || company.address?.street || company.address?.line1 || company.addressLine || passedCompany.street;
  const street = toSafeStr(rawStreet, 'Shop No. 12, APMC Market Yard');

  const companyLogo = company.logo || company.logoUrl || company.image || company.avatar || company.photo || passedCompany.logo || passedCompany.logoUrl;

  const handleShareFirm = async () => {
    try {
      await Share.share({
        message: `🏢 *${firmName}*\nAPMC License: ${apmcLicense}\nCity: ${city}\nCommission Rate: ${commRate}\nRegistered on Pravisti B2B Platform.`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleCallMandi = () => {
    const mobile = company.phone || company.ownerMobile || company.mobileNumber || company.contactNumber || '9876543210';
    Linking.openURL(`tel:${mobile}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── PREMIUM HERO HEADER SECTION ─── */}
      <View style={styles.heroSection}>
        {/* Top Navigation Bar */}
        <View style={styles.topNavBar}>
          <TouchableOpacity
            style={styles.navBackBtn}
            onPress={() => onNavigate('pop')}
            activeOpacity={0.75}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color="#0F172A" strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.navScreenTitle} numberOfLines={1}>Company Details</Text>

          <View style={styles.navRightActions}>
            <TouchableOpacity
              style={styles.navActionBtn}
              onPress={handleShareFirm}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Share2 size={17} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navActionBtn}
              onPress={handleCallMandi}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Phone size={17} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Elevated Royal Blue Modern Company Card */}
        <View style={styles.companyHeroCard}>
          {/* Identity Header */}
          <View style={styles.heroCardHeaderRow}>
            <View style={styles.firmAvatarWrapper}>
              {companyLogo ? (
                <Image
                  source={{ uri: resolveImageUrl(companyLogo) }}
                  style={styles.firmLogoImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.firmAvatarFallback}>
                  <Text style={styles.firmAvatarInitial}>
                    {(firmName || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.firmInfoCol}>
              <View style={styles.firmTitleRow}>
                <Text style={styles.firmNameText} numberOfLines={1}>
                  {firmName}
                </Text>
                <View style={styles.activeStatusPill}>
                  <View style={styles.activeStatusDot} />
                  <Text style={styles.activeStatusText}>Active</Text>
                </View>
              </View>

              <View style={styles.firmLocationRow}>
                <MapPin size={11} color="#BFDBFE" />
                <Text style={styles.firmLocationText} numberOfLines={1}>
                  {city}{state ? `, ${state}` : ''}
                </Text>
              </View>

              <View style={styles.firmBadgesRow}>
                <View style={styles.verifiedPill}>
                  <ShieldCheck size={11} color="#4ADE80" strokeWidth={2.4} />
                  <Text style={styles.verifiedPillText}>APMC Verified</Text>
                </View>
                <View style={styles.firmTypePill}>
                  <Text style={styles.firmTypePillText} numberOfLines={1}>{firmType}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Clean 3-Column Fintech Metrics Strip */}
          <View style={styles.heroMetricsStrip}>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricLabel}>COMMISSION</Text>
              <Text style={styles.heroMetricValPrimary}>{commRate}</Text>
            </View>

            <View style={styles.heroMetricDivider} />

            <TouchableOpacity
              style={styles.heroMetricItem}
              onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}
              activeOpacity={0.75}
            >
              <Text style={styles.heroMetricLabel}>TOTAL SAUDAS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={styles.heroMetricVal}>{firmDeals.length}</Text>
                <Text style={styles.heroMetricSubHint}>Deals →</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.heroMetricDivider} />

            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricLabel}>APMC LICENSE</Text>
              <Text style={styles.heroMetricVal} numberOfLines={1}>{apmcLicense || 'Registered'}</Text>
            </View>
          </View>
        </View>

      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ─── 6. BROKER ACTION CENTER (2x2 Grid) ─── */}
        <View style={styles.actionGridContainer}>
          {/* Row 1 */}
          <View style={styles.actionGridRow}>
            {/* Create Sauda - Dominant Primary CTA */}
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardPrimary]}
              onPress={() => onNavigate('CreateBrokerDeal', { company, companyId: company._id || company.id || companyId })}
              activeOpacity={0.85}
            >
              <View style={styles.actionCardTop}>
                <View style={styles.actionIconPrimary}>
                  <Plus size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.primaryBadgeTag}>PRIMARY</Text>
              </View>
              <Text style={styles.actionTitlePrimary}>Create Sauda</Text>
              <Text style={styles.actionSubPrimary}>Create transaction</Text>
            </TouchableOpacity>

            {/* Messages */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('ChatList', { company, companyId: company._id || company.id || companyId })}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconStandard, { backgroundColor: '#059669' }]}>
                <MessageSquare size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitleStandard}>Messages</Text>
              <Text style={styles.actionSubStandard}>Direct chat</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.actionGridRow}>
            {/* Onboard Users */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('BrokerPendingQueue', { company, companyId: company._id || company.id || companyId })}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconStandard, { backgroundColor: '#1E1C38' }]}>
                <Users size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitleStandard}>Onboard Users</Text>
              <Text style={styles.actionSubStandard}>Customer queue</Text>
            </TouchableOpacity>

            {/* My Deals / View Saudas */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconStandard, { backgroundColor: '#1B1FA7' }]}>
                <Handshake size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitleStandard}>My Deals</Text>
              <Text style={styles.actionSubStandard}>View all saudas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 7. COMPANY SAUDAS (CORE TRANSACTION WORKSPACE) ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Company Saudas</Text>
              <Text style={styles.sectionSubtitle}>{firmDeals.length} transactions</Text>
            </View>

            {firmDeals.length > 0 && (
              <TouchableOpacity onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}>
                <Text style={styles.seeAllText}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading && firmDeals.length === 0 ? (
            <View style={[styles.emptySaudaCard, { paddingVertical: 24 }]}>
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.emptySaudaSub}>Loading company saudas...</Text>
            </View>
          ) : firmDeals.length === 0 ? (
            /* ─── 9. FINTECH EMPTY SAUDA STATE ─── */
            <View style={styles.emptySaudaCard}>
              <View style={styles.emptyIconCircle}>
                <Handshake size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.emptySaudaTitle}>No Saudas Yet</Text>
              <Text style={styles.emptySaudaSub}>
                Saudas created for {firmName} will appear here.
              </Text>
              <TouchableOpacity
                style={styles.emptySaudaBtn}
                onPress={() => onNavigate('CreateBrokerDeal', { company, companyId: company._id || company.id || companyId })}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.emptySaudaBtnText}>+ Issue First Sauda</Text>
              </TouchableOpacity>
            </View>
          ) : (
            firmDeals.slice(0, 5).map((deal, idx) => {
              const statusLower = (deal.status || '').toLowerCase();
              const isPending = statusLower.includes('pending');
              const isCancelled = statusLower.includes('cancel') || statusLower.includes('reject');

              const cardBg = isPending ? '#FFFBEB' : isCancelled ? '#FEF2F2' : '#FFFFFF';
              const cardBorder = isPending ? '#FDE68A' : isCancelled ? '#FECACA' : '#E2E8F0';

              const badgeBg = isPending ? '#FEF3C7' : isCancelled ? '#FEE2E2' : '#DCFCE7';
              const badgeText = isPending ? '#B45309' : isCancelled ? '#B91C1C' : '#15803D';
              const statusPillText = isPending ? 'PENDING' : isCancelled ? 'CANCELLED' : 'ACTIVE';

              return (
                <TouchableOpacity
                  key={deal.id || deal._id || idx}
                  style={[styles.transactionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  activeOpacity={0.88}
                  onPress={() => onNavigate('BrokerDealDetails', { dealId: deal._id || deal.id, deal: deal.rawDeal || deal, company })}
                >
                  {/* Top Row: Crop Name & Quantity + Amount & Status */}
                  <View style={styles.txHeaderRow}>
                    <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.txCropNameText} numberOfLines={1}>
                          {deal.crop}
                        </Text>
                        {deal.quantity ? (
                          <View style={styles.txQuantityBadge}>
                            <Text style={styles.txQuantityBadgeText}>{deal.quantity}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.txRefIdText}>#{deal.id} • {deal.date}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.txRateText}>{deal.formattedTotal || deal.rate}</Text>
                      <View style={[styles.txStatusPill, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.txStatusPillText, { color: badgeText }]}>
                          ● {statusPillText}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Compact Side-by-Side Trade Bridge: Seller ➔ Buyer */}
                  <View style={styles.txCompactTradeRow}>
                    <View style={styles.txPartySideCol}>
                      <View style={styles.txPartyBadgeNameRow}>
                        <Text style={styles.txRoleLabelSeller}>SELLER</Text>
                        {deal.isSellerThisFirm && (
                          <View style={styles.thisFirmTag}>
                            <Text style={styles.thisFirmTagText}>This Firm</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.txPartyNameText} numberOfLines={1}>
                        {deal.seller}
                      </Text>
                    </View>

                    <View style={styles.txFlowArrowCircle}>
                      <ArrowRight size={11} color="#2327D8" strokeWidth={2.2} />
                    </View>

                    <View style={styles.txPartySideCol}>
                      <View style={styles.txPartyBadgeNameRow}>
                        <Text style={styles.txRoleLabelBuyer}>BUYER</Text>
                        {deal.isBuyerThisFirm && (
                          <View style={styles.thisFirmTag}>
                            <Text style={styles.thisFirmTagText}>This Firm</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.txPartyNameText} numberOfLines={1}>
                        {deal.buyer}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ─── 10. ONBOARDING CUSTOMERS SECTION ─── */}
        <View style={[styles.sectionContainer, { marginTop: 16 }]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Onboarded Customers</Text>
              <Text style={sectionSubtitleStyle}>{onboardedQueueUsers.length} people</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('BrokerPendingQueue', { company, companyId: company._id || company.id || companyId })}>
              <Text style={styles.seeAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {onboardedQueueUsers.length === 0 ? (
            <View style={[styles.emptySaudaCard, { paddingVertical: 16 }]}>
              <Users size={24} color="#94A3B8" style={{ marginBottom: 6 }} />
              <Text style={styles.emptySaudaSub}>No pending onboardings for this company</Text>
            </View>
          ) : (
            onboardedQueueUsers.slice(0, 3).map((usr, uIdx) => {
              const uName = usr.targetUserName || usr.name || usr.user?.name || 'Unnamed Account';
              const uMobile = usr.invitedMobile || usr.mobileNumber || usr.phone || 'N/A';
              const uRole = (usr.role || usr.userRole || 'Trader').toUpperCase();
              const uStatus = String(usr.status || usr.accountStatus || 'pending').toLowerCase();
              const isVer = uStatus.includes('verified') || uStatus.includes('approved') || uStatus.includes('active');

              return (
                <View key={usr._id || usr.id || uIdx} style={styles.onboardRowCard}>
                  <View style={styles.onboardAvatarCircle}>
                    <Text style={styles.onboardAvatarChar}>
                      {uName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.onboardUserNameText} numberOfLines={1}>
                      {uName}
                    </Text>
                    <Text style={styles.onboardUserSubText}>
                      {uRole} • 📞 {uMobile}
                    </Text>
                  </View>

                  <View style={[styles.onboardStatusBadge, { backgroundColor: isVer ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Text style={[styles.onboardStatusText, { color: isVer ? '#15803D' : '#D97706' }]}>
                      {isVer ? '✓ VERIFIED' : 'PENDING'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ─── 11 & 12. BUSINESS INFORMATION (KYC PROFILE PANEL) ─── */}
        <View style={styles.unifiedProfileCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIcon}>
              <Award size={18} color={COLORS.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>Business Information</Text>
              <Text style={styles.cardHeaderSub}>Verified Registration & KYC</Text>
            </View>

            <View style={styles.verifiedBadgeRow}>
              <ShieldCheck size={13} color="#15803D" style={{ marginRight: 3 }} />
              <Text style={styles.verifiedBadgeText}>APMC Verified</Text>
            </View>
          </View>

          {/* Group 1: Registration */}
          <Text style={styles.kycGroupHeader}>REGISTRATION</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>APMC License / GSTIN</Text>
            <Text style={styles.infoValueBold}>{apmcLicense}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Entity Type</Text>
            <Text style={styles.infoValue}>{firmType}</Text>
          </View>
          <View style={styles.divider} />

          {/* Group 2: Business */}
          <Text style={[styles.kycGroupHeader, { marginTop: 12 }]}>BUSINESS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Market</Text>
            <Text style={styles.infoValue}>{industry}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mandi Location</Text>
            <Text style={styles.infoValueBold}>{city}, {state}</Text>
          </View>
          <View style={styles.divider} />

          {/* Group 3: Contact */}
          <Text style={[styles.kycGroupHeader, { marginTop: 12 }]}>CONTACT</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Office Address</Text>
            <Text style={styles.infoValue}>{street}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel} numberOfLines={1}>Mobile No.</Text>
            <TouchableOpacity
              onPress={handleCallMandi}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1, marginLeft: 10 }}
            >
              <Text style={[styles.infoValueBold, { color: COLORS.primary, textDecorationLine: 'underline', maxWidth: '100%' }]} numberOfLines={1}>
                {phone}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ─── BOTTOM FOOTER TAB BAR ─── */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('BrokerDashboard', { company, companyId: company._id || company.id || companyId })}
          activeOpacity={0.7}
        >
          <Home size={22} color="#64748B" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() =>
            onNavigate('BrokerCreatedDeals', {
              company,
              companyId: company._id || company.id || companyId,
              companyName: firmName,
            })
          }
          activeOpacity={0.7}
        >
          <Handshake size={22} color="#64748B" />
          <Text style={styles.tabLabel}>Saudas</Text>
        </TouchableOpacity>

        {/* Center Quick Action (Issue Sauda) */}
        <TouchableOpacity
          style={styles.centerCircleButton}
          onPress={() => onNavigate('CreateBrokerDeal', { company, companyId: company._id || company.id || companyId })}
          activeOpacity={0.85}
        >
          <Plus size={26} color="#FFFFFF" strokeWidth={2.8} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() =>
            onNavigate('BrokerPendingQueue', {
              company,
              companyId: company._id || company.id || companyId,
            })
          }
          activeOpacity={0.7}
        >
          <Users size={22} color="#64748B" />
          <Text style={styles.tabLabel}>Onboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() =>
            onNavigate('ChatList', {
              company,
              companyId: company._id || company.id || companyId,
            })
          }
          activeOpacity={0.7}
        >
          <MessageSquare size={22} color="#64748B" />
          <Text style={styles.tabLabel}>Chats</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const sectionSubtitleStyle = {
  fontSize: 11,
  color: '#64748B',
  fontWeight: '500',
  marginTop: 1,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 6 : 4,
    paddingBottom: 12,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 2,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navScreenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyHeroCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  firmAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    overflow: 'hidden',
  },
  firmLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  firmAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  firmAvatarInitial: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E40AF',
  },
  firmInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  firmTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  firmNameText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    flex: 1,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 4,
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  firmLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  firmLocationText: {
    fontSize: 11.5,
    color: '#DBEAFE',
    fontWeight: '500',
    flex: 1,
  },
  firmBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 3,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  firmTypePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  firmTypePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EFF6FF',
  },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BFDBFE',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroMetricValPrimary: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMetricSubHint: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#93C5FD',
  },
  heroMetricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 100,
  },

  // BROKER ACTION CENTER (2x2 GRID)
  actionGridContainer: {
    marginBottom: 20,
    gap: 10,
  },
  actionGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  actionCardPrimary: {
    backgroundColor: '#EEF2FE',
    borderColor: '#C7D2FE',
    borderWidth: 1.5,
  },
  actionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIconPrimary: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBadgeTag: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionIconStandard: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitlePrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  actionSubPrimary: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  actionTitleStandard: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionSubStandard: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  // SECTIONS
  sectionContainer: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },

  // TRANSACTION CARDS
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  txCropNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  txQuantityBadge: {
    backgroundColor: '#EEF2FE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  txQuantityBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2327D8',
  },
  txRefIdText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  txRateText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  txStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txStatusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  txCompactTradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txPartySideCol: {
    flex: 1,
    minWidth: 0,
  },
  txPartyBadgeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  txRoleLabelSeller: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  txRoleLabelBuyer: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#2327D8',
    letterSpacing: 0.4,
  },
  txPartyNameText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  thisFirmTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  thisFirmTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#92400E',
  },
  txFlowArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EEF2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  // EMPTY STATE
  emptySaudaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptySaudaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySaudaSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
  },
  emptySaudaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptySaudaBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ONBOARDING ROW
  onboardRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  onboardAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardAvatarChar: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  onboardUserNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  onboardUserSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  onboardStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  onboardStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // BUSINESS PROFILE / KYC
  unifiedProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  kycGroupHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  infoValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },

  /* ── Bottom Navigation Tab Bar ── */
  bottomTabBar: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 62,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
  centerCircleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  primaryBtn: {
    flex: 1.2,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiAssistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  aiAssistantIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAssistantTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiAssistantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  aiAssistantBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  aiAssistantSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  aiAssistantArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});

export default BrokerCompanyDetails;
