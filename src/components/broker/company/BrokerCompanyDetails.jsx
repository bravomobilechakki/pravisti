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
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyDetails, getBrokerMyDeals, getDeals, getBrokerProductAccessRequests } from '../../../services/api';
import ProductAccessRequestModal from '../../common/ProductAccessRequestModal';
import { fontSize, moderateScale, scale, isTablet } from '../../../utils/responsive';

const COLORS = {
  primaryDark: '#3465EA', // Cobalt Royal Blue Header
  headerMiddle: '#2554D7',
  headerEnd: '#1E46C6',
  primary: '#3465EA',     // Accent
  primaryLight: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  cyan: '#06B6D4',
  cyanLight: '#ECFEFF',
  indigo: '#6366F1',
  indigoLight: '#EEF2FF',
  success: '#059669',
  successDark: '#15803D',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  bgMain: '#F0F9FF',
  cardBg: '#FFFFFF',
  border: '#E0F2FE',
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
        // productId can be a populated object from MongoDB
        const pid = p.productId;
        if (pid && typeof pid === 'object') {
          cropName = pid.name || pid.productName || pid.title || pid.cropName || cropName;
        } else if (typeof pid === 'string' && pid) {
          // Not populated — fall through to other fields
        }
        // Check direct fields on the product item
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

      const [compResResult, brokerDealsRes, allDealsRes] = await Promise.allSettled([
        effectiveCompId ? getCompanyDetails(effectiveCompId) : Promise.resolve(null),
        token ? getBrokerMyDeals(effectiveCompId, token) : Promise.resolve(null),
        token ? getDeals(token, 1, 100, effectiveCompId) : Promise.resolve(null),
      ]);

      let updatedComp = { ...passedComp, ...company };
      if (compResResult.status === 'fulfilled' && compResResult.value?.success && compResResult.value?.data) {
        updatedComp = { ...updatedComp, ...compResResult.value.data };
        setCompany(updatedComp);
      }

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

  const quickActions = [
    {
      id: 'create_sauda',
      label: 'New Sauda',
      icon: <Plus size={20} color="#FFFFFF" />,
      circleBg: COLORS.primary,
      onPress: () => onNavigate('CreateBrokerDeal', { company, companyId: company._id || company.id || companyId }),
    },
    {
      id: 'view_saudas',
      label: 'All Saudas',
      icon: <Handshake size={20} color="#FFFFFF" />,
      circleBg: COLORS.cyan,
      onPress: () => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName }),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare size={20} color="#FFFFFF" />,
      circleBg: COLORS.indigo,
      onPress: () => onNavigate('ChatList', { company, companyId: company._id || company.id || companyId }),
    },
    {
      id: 'share_firm',
      label: 'Share Firm',
      icon: <Share2 size={20} color="#FFFFFF" />,
      circleBg: '#2563EB',
      onPress: handleShareFirm,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284C7" />

      {/* ─── HERO HEADER SECTION (Unified Identity + Integrated Stats Strip) ─── */}
      <View style={styles.heroSection}>
        {/* Top Navbar */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.navBackBtn}
            onPress={() => onNavigate('pop')}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.navTitleContainer}>
            <Text style={styles.navTitleText}>Brokerage Company</Text>
            <Text style={styles.navSubTitleText}>Company Details & Verification</Text>
          </View>

          <TouchableOpacity style={styles.navShareBtn} onPress={handleShareFirm}>
            <Share2 size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Company Identity Header */}
        <View style={styles.companyIdentityCard}>
          <View style={styles.identityTopRow}>
            <View style={styles.firmAvatarBox}>
              <Building2 size={26} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.firmNameText} numberOfLines={1}>
                {firmName}
              </Text>
              <Text style={styles.firmSubtitleText}>
                {firmType}
              </Text>
            </View>
          </View>

          {/* Integrated Metrics Strip inside Hero Card */}
          <View style={styles.heroMetricsStrip}>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricVal}>{commRate}</Text>
              <Text style={styles.heroMetricLabel}>Commission %</Text>
            </View>
            <View style={styles.heroMetricDivider} />
            <TouchableOpacity
              style={styles.heroMetricItem}
              onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}
            >
              <Text style={styles.heroMetricVal}>{firmDeals.length}</Text>
              <Text style={styles.heroMetricLabel}>view Saudas →</Text>
            </TouchableOpacity>
            <View style={styles.heroMetricDivider} />
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricVal} numberOfLines={1}>{city}</Text>
              <Text style={styles.heroMetricLabel}>location</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── QUICK ACTION BAR (Dashboard Style) ─── */}
        <View style={styles.quickServicesContainer}>
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('CreateBrokerDeal', { company, companyId: company._id || company.id || companyId })}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#2563EB' }]}>
              <Plus size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>Issue Sauda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#4F46E5' }]}>
              <Handshake size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>View Saudas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('BrokerDashboard', { company, companyId: company._id || company.id || companyId })}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#10B981' }]}>
              <MessageSquare size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('BrokerPendingQueue', { company, companyId: company._id || company.id || companyId })}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#06B6D4' }]}>
              <Clock size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>Onboard Deals</Text>
          </TouchableOpacity>
        </View>

        {/* ─── COMPANY SAUDAS LIST SECTION ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Company Saudas ({firmDeals.length})
            </Text>
            {firmDeals.length > 0 && (
              <TouchableOpacity onPress={() => onNavigate('BrokerCreatedDeals', { company, companyId: company._id || company.id || companyId, companyName: firmName })}>
                <Text style={styles.seeAllText}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading && firmDeals.length === 0 ? (
            <View style={[styles.emptySaudaCard, { paddingVertical: 24 }]}>
              <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 8 }} />
              <Text style={styles.emptySaudaSub}>Loading company saudas...</Text>
            </View>
          ) : firmDeals.length === 0 ? (
            <View style={styles.emptySaudaCard}>
              <Handshake size={32} color="#0284C7" style={{ marginBottom: 8 }} />
              <Text style={styles.emptySaudaTitle}>No Saudas Issued Yet</Text>
              <Text style={styles.emptySaudaSub}>
                Saudas issued for {firmName} will appear here.
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

              const cardBg = isPending ? '#FFFBEB' : isCancelled ? '#FEF2F2' : '#F0FDF4';
              const cardBorder = isPending ? '#FDE68A' : isCancelled ? '#FECACA' : '#BBF7D0';

              const badgeBg = isPending ? '#FEF3C7' : isCancelled ? '#FEE2E2' : '#DCFCE7';
              const badgeBorder = isPending ? '#FDE68A' : isCancelled ? '#FECACA' : '#BBF7D0';
              const badgeText = isPending ? '#B45309' : isCancelled ? '#B91C1C' : '#15803D';

              const rateColor = isPending ? '#D97706' : isCancelled ? '#DC2626' : '#16A34A';
              const viewTextColor = isPending ? '#D97706' : isCancelled ? '#DC2626' : '#15803D';

              return (
                <TouchableOpacity
                  key={deal.id || deal._id || idx}
                  style={[styles.compactDealCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  activeOpacity={0.85}
                  onPress={() => onNavigate('BrokerDealDetails', { dealId: deal._id || deal.id, deal, company })}
                >
                  {/* Top Row: Crop Badge + Rate + Status Pill */}
                  <View style={styles.compactHeaderRow}>
                    <View style={[styles.cropBadge, { backgroundColor: badgeBg, borderColor: badgeBorder, flexShrink: 1, maxWidth: '55%' }]}>
                      <Text style={[styles.cropBadgeText, { color: badgeText }]} numberOfLines={1}>
                        {deal.crop}
                      </Text>
                    </View>
                    <Text style={[styles.compactRateText, { color: rateColor }]} numberOfLines={1}>
                      {deal.rate}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.statusPillText, { color: badgeText }]}>
                        {deal.status}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Row: Inline Seller ↔ Buyer */}
                  <View style={styles.compactPartyRow}>
                    <Text style={styles.compactPartyText} numberOfLines={1}>
                      <Text style={styles.roleTag}>SEL: </Text>{deal.seller}
                    </Text>
                    <Text style={styles.compactVsText}>↔</Text>
                    <Text style={styles.compactPartyText} numberOfLines={1}>
                      <Text style={styles.roleTag}>BUY: </Text>{deal.buyer}
                    </Text>
                  </View>

                  {/* Footer Row */}
                  <View style={styles.compactFooterRow}>
                    <Text style={styles.compactDateText}>Ref: {deal.id} • {deal.date}</Text>
                    <Text style={[styles.compactViewText, { color: viewTextColor }]}>View →</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ─── UNIFIED COMPANY PROFILE & APMC VERIFICATION ─── */}
        <View style={styles.unifiedProfileCard}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#E0F2FE' }]}>
              <Award size={18} color="#0284C7" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>Company Profile</Text>

            </View>

            <View style={styles.verifiedBadgeRow}>
              <ShieldCheck size={14} color="#16A34A" />
              <Text style={styles.verifiedBadgeText}>APMC Verified</Text>
            </View>
          </View>

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

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Office Address</Text>
            <Text style={styles.infoValue}>{street}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Mobile</Text>
            <TouchableOpacity onPress={handleCallMandi}>
              <Text style={[styles.infoValueBold, { color: '#0284C7', textDecorationLine: 'underline' }]}>
                {phone}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ─── BOTTOM ACTION FOOTER (Broker Dashboard style) ─── */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  heroSection: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  navSubTitleText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  navShareBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyIdentityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  firmAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  firmNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  firmSubtitleText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 2,
    fontWeight: '500',
  },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroMetricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 2,
  },
  heroMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 160,
  },

  actionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  primaryActionPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  primaryActionPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  iconActionPill: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0C4A6E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  unifiedProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    elevation: 2,
    shadowColor: '#0C4A6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
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
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    marginLeft: 3,
  },

  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  emptySaudaCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7DD3FC',
    elevation: 2,
    shadowColor: '#0C4A6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  emptySaudaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C4A6E',
    marginBottom: 4,
  },
  emptySaudaSub: {
    fontSize: 12,
    color: '#0369A1',
    textAlign: 'center',
    marginBottom: 14,
  },
  emptySaudaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptySaudaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactDealCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
    elevation: 2,
    shadowColor: '#0C4A6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cropBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7DD3FC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cropBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  compactRateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
  },
  compactQtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextConfirmed: {
    color: '#15803D',
  },
  statusTextPending: {
    color: '#D97706',
  },
  compactPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginVertical: 4,
  },
  compactPartyText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  compactVsText: {
    fontSize: 11,
    color: '#0284C7',
    marginHorizontal: 6,
  },
  compactFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
  },
  compactDateText: {
    fontSize: 10,
    color: '#0369A1',
    fontWeight: '600',
  },
  compactViewText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '800',
  },
  dealPartiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
  },
  partyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  partyValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 1,
  },
  vsText: {
    fontSize: 12,
    color: '#64748B',
    marginHorizontal: 8,
  },
  dealFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  dealRateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  dealQtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dealDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // Quick Actions Grid (Broker Dashboard Theme)
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  actionItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCardItem: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTrendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
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

  // Bottom Footer
  bottomFooter: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
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
    height: 48,
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
    height: 48,
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
  quickServicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  serviceItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
});

export default BrokerCompanyDetails;
