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
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyDetails, getBrokerMyDeals, getDeals, getBrokerProductAccessRequests, getBrokerPendingQueue, resolveImageUrl } from '../../../services/api';
import ProductAccessRequestModal from '../../common/ProductAccessRequestModal';

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
    }
  };

  add(d.brokerCompanyName);
  add(d.brokerCompany);
  add(d.companyName);
  add(d.company);
  add(d.buyerCompanyName);
  add(d.buyerCompany);
  add(d.buyer);
  add(d.buyerName);
  add(d.sellerCompanyName);
  add(d.sellerCompany);
  add(d.seller);
  add(d.sellerName);

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
    let cropName = 'Agricultural Commodity';
    if (typeof d.crop === 'string' && d.crop) cropName = d.crop;
    else if (typeof d.productName === 'string' && d.productName) cropName = d.productName;
    else if (typeof d.cropName === 'string' && d.cropName) cropName = d.cropName;
    else if (d.products && d.products.length > 0) {
      const p = d.products[0];
      if (typeof p === 'string') {
        cropName = p;
      } else if (p) {
        const pid = p.productId;
        if (pid && typeof pid === 'object') {
          cropName = pid.name || pid.productName || pid.title || pid.cropName || cropName;
        }
        if (cropName === 'Agricultural Commodity') {
          cropName = p.name || p.productName || p.crop || p.cropName || p.title || cropName;
        }
      }
    }

    let sellerName = 'Seller Business';
    if (typeof d.seller === 'string' && d.seller) sellerName = d.seller;
    else if (d.sellerCompany) {
      if (typeof d.sellerCompany === 'string') sellerName = d.sellerCompany;
      else if (d.sellerCompany.name) sellerName = d.sellerCompany.name;
      else if (d.sellerCompany.companyName) sellerName = d.sellerCompany.companyName;
    } else if (d.sellerName) sellerName = d.sellerName;

    let buyerName = 'Buyer Business';
    if (typeof d.buyer === 'string' && d.buyer) buyerName = d.buyer;
    else if (d.buyerCompany) {
      if (typeof d.buyerCompany === 'string') buyerName = d.buyerCompany;
      else if (d.buyerCompany.name) buyerName = d.buyerCompany.name;
      else if (d.buyerCompany.companyName) buyerName = d.buyerCompany.companyName;
    } else if (d.buyerName) buyerName = d.buyerName;

    let rateStr = '₹60,000';
    if (d.rate) rateStr = String(d.rate);
    else if (d.totalAmount) rateStr = `₹${parseFloat(d.totalAmount).toLocaleString('en-IN')}`;
    else if (d.grandTotal) rateStr = `₹${parseFloat(d.grandTotal).toLocaleString('en-IN')}`;
    else if (d.products?.[0]?.price) rateStr = `₹${parseFloat(d.products[0].price).toLocaleString('en-IN')}`;

    let statusStr = 'Confirmed';
    if (typeof d.status === 'string' && d.status) {
      statusStr = d.status.charAt(0).toUpperCase() + d.status.slice(1);
    }

    let dateStr = 'Today';
    if (d.date) dateStr = String(d.date);
    else if (d.createdAt) {
      try {
        dateStr = new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        dateStr = 'Today';
      }
    }

    return {
      id: toSafeStr(d.dealNumber || d.id || d._id, `SAUDA-${Math.floor(100 + Math.random() * 900)}`),
      _id: String(d._id || d.id || ''),
      crop: toSafeStr(cropName, 'Agricultural Commodity'),
      quantity: d.quantity ? String(d.quantity).replace(/\s*units?/gi, '').trim() : (d.products?.[0]?.quantity ? `${d.products[0].quantity}` : '100'),
      rate: toSafeStr(rateStr, '₹60,000'),
      buyer: toSafeStr(buyerName, 'Buyer Business'),
      seller: toSafeStr(sellerName, 'Seller Business'),
      status: toSafeStr(statusStr, 'Confirmed'),
      date: toSafeStr(dateStr, 'Today'),
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
        const matchesId = Boolean(targetIdStr && dealIds.includes(targetIdStr));

        const dealNames = extractCompanyNamesFromDeal(d);
        const matchesName = Boolean(
          targetNameClean &&
          dealNames.some(n => n === targetNameClean || n.includes(targetNameClean) || targetNameClean.includes(n))
        );

        return matchesId || matchesName;
      })
      .map(formatDeal);
  };

  const loadCompanyData = async () => {
    const passedComp = routeData?.company || routeData?.firm || routeData?.data?.company || {};
    const effectiveCompId = companyId || routeData?.companyId || routeData?.firmId || routeData?.id || routeData?._id || passedComp._id || passedComp.id || passedComp.companyId || passedComp.brokerCompanyId || company._id || company.id;
    const effectiveCompName = passedComp.name || passedComp.companyName || company.name || company.companyName;

    try {
      // 1. INSTANT LOCAL HYDRATION
      const storedDealsStr = await AsyncStorage.getItem('broker_deals_storage');
      const localDeals = storedDealsStr ? JSON.parse(storedDealsStr) : [];
      setFirmDeals(filterDealsForFirm(localDeals, effectiveCompId, effectiveCompName));
      checkProductAccessRequests(effectiveCompId);

      // 2. PARALLEL BACKGROUND API SYNC
      const token = await AsyncStorage.getItem('userToken');

      const [compResResult, brokerDealsRes, allDealsRes, pendingQueueRes] = await Promise.allSettled([
        effectiveCompId ? getCompanyDetails(effectiveCompId) : Promise.resolve(null),
        token ? getBrokerMyDeals(effectiveCompId, token) : Promise.resolve(null),
        token ? getDeals(token, 1, 100, effectiveCompId) : Promise.resolve(null),
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
        if (!item) return;
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
        apiDeals = [...apiDeals, ...list];
      }

      if (allDealsRes.status === 'fulfilled' && allDealsRes.value?.success) {
        const aRes = allDealsRes.value;
        const list = Array.isArray(aRes.data) ? aRes.data : (aRes.data?.deals || aRes.data?.myDeals || []);
        apiDeals = [...apiDeals, ...list];
      }

      // Fast O(N) deduplication using Map
      const dealMap = new Map();
      localDeals.forEach(d => {
        if (!d) return;
        const key = d._id || d.id || d.dealNumber;
        if (key) dealMap.set(String(key), d);
      });
      apiDeals.forEach(d => {
        if (!d) return;
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* ─── UNIFIED INTEGRATED HERO HEADER SECTION ─── */}
      <View style={styles.heroSection}>
        {/* Unified Company Identity Card (Single Row Header Layout) */}
        <View style={styles.companyIdentityCard}>
          <View style={styles.identityTopRow}>
            {/* Firm Logo / Avatar */}
            <View style={styles.firmAvatarBox}>
              {companyLogo ? (
                <Image
                  source={{ uri: resolveImageUrl(companyLogo) }}
                  style={styles.firmLogoImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.firmAvatarInitial}>
                  {(firmName || 'C').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            {/* Firm Info */}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.firmNameText} numberOfLines={2}>
                {firmName}
              </Text>
              <Text style={styles.firmSubtitleText} numberOfLines={1}>{firmType}</Text>
            </View>
          </View>

          {/* ─── 5. BUSINESS OVERVIEW METRICS STRIP ─── */}
          <View style={styles.heroMetricsStrip}>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricLabel}>COMMISSION</Text>
              <Text style={styles.heroMetricVal}>{commRate}</Text>
            </View>

            <View style={styles.heroMetricDivider} />

            <TouchableOpacity
              style={styles.heroMetricItem}
              onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}
              activeOpacity={0.75}
            >
              <Text style={styles.heroMetricLabel}>SAUDAS</Text>
              <Text style={styles.heroMetricVal}>{firmDeals.length}</Text>
            </TouchableOpacity>

            <View style={styles.heroMetricDivider} />

            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricLabel}>LOCATION</Text>
              <Text style={styles.heroMetricVal} numberOfLines={1}>{city}</Text>
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
                  activeOpacity={0.85}
                  onPress={() => onNavigate('BrokerDealDetails', { dealId: deal._id || deal.id, deal, company })}
                >
                  {/* Top Row: Crop Name + Status Pill */}
                  <View style={styles.txHeaderRow}>
                    <Text style={styles.txCropNameText} numberOfLines={1}>
                      {deal.crop}
                    </Text>
                    <View style={[styles.txStatusPill, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.txStatusPillText, { color: badgeText }]}>
                        ● {statusPillText}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Flow: Seller -> Buyer */}
                  <View style={styles.txFlowContainer}>
                    <View style={styles.txPartyRow}>
                      <Text style={styles.txRoleLabel}>Seller Company</Text>
                      <Text style={styles.txPartyName} numberOfLines={1}>{deal.seller}</Text>
                    </View>

                    <View style={styles.txFlowArrowRow}>
                      <Text style={styles.txArrowText}>↓</Text>
                    </View>

                    <View style={styles.txPartyRow}>
                      <Text style={styles.txRoleLabel}>Buyer Company</Text>
                      <Text style={styles.txPartyName} numberOfLines={1}>{deal.buyer}</Text>
                    </View>
                  </View>

                  {/* Footer Row: Rate / Amount + Date + Ref ID */}
                  <View style={styles.txFooterRow}>
                    <View>
                      <Text style={styles.txRateText}>{deal.rate}</Text>
                      <Text style={styles.txRefIdText}>Ref #{deal.id}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.txDateText}>{deal.date}</Text>
                      <Text style={styles.txViewLinkText}>View →</Text>
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
            <Text style={styles.infoLabel} numberOfLines={1}>Contact Mobile</Text>
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

      {/* ─── 17. STICKY BOTTOM ACTION BAR (Fintech Action Bar) ─── */}
      <View style={styles.bottomFooter}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}
          activeOpacity={0.82}
        >
          <Handshake size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.secondaryBtnText}>View Saudas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onNavigate('CreateBrokerDeal', { company, companyId: company._id || company.id || companyId })}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>Issue Sauda</Text>
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
    backgroundColor: COLORS.bgMain,
  },
  heroSection: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 26) : 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  cardBackBtnInline: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardShareBtnInline: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  companyIdentityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  firmAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    overflow: 'hidden',
  },
  firmLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  firmAvatarInitial: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  firmNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  firmSubtitleText: {
    fontSize: 13,
    color: '#E0E7FF',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  apmcTagInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  apmcTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  heroMetricVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroMetricDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txCropNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  txStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  txStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  txFlowContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  txPartyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txRoleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  txPartyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  txFlowArrowRow: {
    alignItems: 'center',
    marginVertical: 2,
  },
  txArrowText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '900',
  },
  txFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  txRateText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  txRefIdText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  txDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  txViewLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
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

  // STICKY BOTTOM FOOTER
  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    gap: 10,
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
});

export default BrokerCompanyDetails;
