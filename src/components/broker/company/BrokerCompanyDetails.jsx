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
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyDetails, getBrokerMkyDeals, getDeals } from '../../../services/api';

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

const extractCompanyId = (d) => {
  if (!d) return null;
  const rawId = d.brokerCompanyId || d.companyId || d.brokerCompany?._id || d.brokerCompany?.id || d.company?._id || d.company?.id;
  if (rawId && typeof rawId !== 'object') return String(rawId);
  return null;
};

const extractCompanyName = (d) => {
  if (!d) return null;
  if (typeof d.brokerCompanyName === 'string' && d.brokerCompanyName && d.brokerCompanyName !== '[object Object]') return d.brokerCompanyName;
  if (typeof d.companyName === 'string' && d.companyName && d.companyName !== '[object Object]') return d.companyName;
  if (typeof d.company === 'string' && d.company && d.company !== '[object Object]') return d.company;
  if (typeof d.brokerCompany === 'string' && d.brokerCompany && d.brokerCompany !== '[object Object]') return d.brokerCompany;

  if (d.brokerCompany && typeof d.brokerCompany === 'object') {
    if (d.brokerCompany.name) return d.brokerCompany.name;
    if (d.brokerCompany.companyName) return d.brokerCompany.companyName;
  }
  if (d.company && typeof d.company === 'object') {
    if (d.company.name) return d.company.name;
    if (d.company.companyName) return d.company.companyName;
  }
  return null;
};

const BrokerCompanyDetails = ({ onNavigate, routeData }) => {
  const passedCompany = routeData?.company || {};
  const companyId = routeData?.companyId || passedCompany._id || passedCompany.id;

  const [company, setCompany] = useState(passedCompany);
  const [firmDeals, setFirmDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompanyData = async () => {
    const currentCompId = passedCompany._id || passedCompany.id || company._id || company.id || companyId;
    const currentCompName = passedCompany.name || passedCompany.companyName || company.name || company.companyName;

    const filterDealsForFirm = (dealList) => {
      return dealList.map(d => ({
        id: d.dealNumber || d.id || d._id || `SAUDA-${Math.floor(100 + Math.random() * 900)}`,
        _id: d._id || d.id,
        crop: d.crop || d.productName || d.products?.[0]?.productName || d.notes || 'Agricultural Commodity',
        quantity: d.quantity || (d.products?.[0]?.quantity ? `${d.products[0].quantity} units` : '100 units'),
        rate: d.rate || (d.products?.[0]?.price ? `₹${parseFloat(d.products[0].price).toLocaleString('en-IN')}` : '₹60,000'),
        buyer: d.buyer || d.buyerCompany?.name || d.buyerCompany?.companyName || d.buyerName || 'Buyer Business',
        seller: d.seller || d.sellerCompany?.name || d.sellerCompany?.companyName || d.sellerName || 'Seller Business',
        status: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1)) : 'Confirmed',
        date: d.date || (d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'),
        brokerCompanyId: extractCompanyId(d),
        brokerCompanyName: extractCompanyName(d),
      })).filter(d => {
        if (!currentCompId && !currentCompName) return true;
        const dId = d.brokerCompanyId;
        const dName = d.brokerCompanyName;
        const mId = currentCompId && dId && String(dId) === String(currentCompId);
        const mName = currentCompName && dName && String(dName).trim().toLowerCase() === String(currentCompName).trim().toLowerCase();
        if (mId || mName) return true;
        if (!dId && !dName) return true;
        return false;
      });
    };

    try {
      // 1. INSTANT LOCAL HYDRATION (0.01s)
      const storedDealsStr = await AsyncStorage.getItem('broker_deals_storage');
      const localDeals = storedDealsStr ? JSON.parse(storedDealsStr) : [];
      setFirmDeals(filterDealsForFirm(localDeals));
      setIsLoading(false);

      // 2. PARALLEL BACKGROUND API SYNC
      const token = await AsyncStorage.getItem('userToken');
      const isValidObjectId = typeof companyId === 'string' && /^[0-9a-fA-F]{24}$/.test(companyId);

      const [compResResult, brokerDealsRes, userDealsRes] = await Promise.allSettled([
        isValidObjectId ? getCompanyDetails(companyId) : Promise.resolve(null),
        token ? getBrokerMyDeals(token) : Promise.resolve(null),
        token ? getDeals(token, 1, 50, companyId || null) : Promise.resolve(null),
      ]);

      if (compResResult.status === 'fulfilled' && compResResult.value?.success && compResResult.value?.data) {
        setCompany(compResResult.value.data);
      }

      let apiDeals = [];
      if (brokerDealsRes.status === 'fulfilled' && brokerDealsRes.value?.success) {
        const bRes = brokerDealsRes.value;
        const bDeals = Array.isArray(bRes.data) ? bRes.data : (bRes.data?.deals || bRes.data?.myDeals || []);
        apiDeals = [...bDeals];
      }

      if (userDealsRes.status === 'fulfilled' && userDealsRes.value?.success) {
        const uRes = userDealsRes.value;
        const uDeals = Array.isArray(uRes.data) ? uRes.data : (uRes.data?.deals || []);
        uDeals.forEach(uD => {
          if (!apiDeals.some(a => (a._id && (a._id === uD._id || a._id === uD.id)) || (a.id && (a.id === uD.id || a.id === uD.dealNumber)))) {
            apiDeals.push(uD);
          }
        });
      }

      const combined = [...localDeals];
      apiDeals.forEach(aD => {
        if (!combined.some(c => (c._id && (c._id === aD._id || c._id === aD.id)) || (c.id && (c.id === aD.dealNumber || c.id === aD.id)))) {
          combined.push(aD);
        }
      });

      setFirmDeals(filterDealsForFirm(combined));
    } catch (err) {
      console.warn('Error loading broker company details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [companyId, routeData]);

  const handleShareFirm = async () => {
    try {
      await Share.share({
        message: `🏢 *${company.name || company.companyName || 'Brokerage Firm'}*\nAPMC License: ${company.apmcLicense || company.registrationNumber || 'N/A'}\nCity: ${company.city || company.address?.city || 'N/A'}\nCommission Rate: ${commRate}\nRegistered on Pravisti B2B Platform.`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handleCallMandi = () => {
    const mobile = company.phone || company.ownerMobile || '9876543210';
    Linking.openURL(`tel:${mobile}`);
  };

  const firmName = company.name || company.companyName || 'Brokerage Firm';
  const firmType = company.firmType || company.companyType || 'Registered APMC Brokerage';
  const city = company.city || company.address?.city || 'Surat APMC Mandi';
  const state = company.state || company.address?.state || 'Gujarat';
  const apmcLicense = company.apmcLicense || company.registrationNumber || 'APMC/REG/2026/89';
  const commRate = company.commissionRate ? `${company.commissionRate}%` : 'N/A';
  const industry = company.industryName || 'Agro & Commodities';
  const phone = company.phone || company.ownerMobile || '+91 98765 43210';
  const street = company.street || company.address?.street || 'Shop No. 12, APMC Market Yard';

  const quickActions = [
    {
      id: 'create_sauda',
      label: 'New Sauda',
      icon: <Plus size={20} color="#FFFFFF" />,
      circleBg: COLORS.primary,
      onPress: () => onNavigate('CreateBrokerDeal', { company }),
    },
    {
      id: 'view_saudas',
      label: 'All Saudas',
      icon: <Handshake size={20} color="#FFFFFF" />,
      circleBg: COLORS.cyan,
      onPress: () => onNavigate('BrokerCreatedDeals', { company }),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare size={20} color="#FFFFFF" />,
      circleBg: COLORS.indigo,
      onPress: () => onNavigate('ChatList', { company }),
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
      <StatusBar barStyle="light-content" backgroundColor="#0C4A6E" />

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
              onPress={() => onNavigate('BrokerCreatedDeals', { company })}
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
            onPress={() => onNavigate('CreateBrokerDeal', { company })}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#2563EB' }]}>
              <Plus size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>Issue Sauda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('BrokerCreatedDeals', { company })}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#4F46E5' }]}>
              <Handshake size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>View Saudas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('ChatList', { company })}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#10B981' }]}>
              <MessageSquare size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceItem}
            onPress={handleShareFirm}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#06B6D4' }]}>
              <Share2 size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceLabel} numberOfLines={1}>Share Firm</Text>
          </TouchableOpacity>
        </View>

        {/* ─── COMPANY SAUDAS LIST SECTION ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Company Saudas ({firmDeals.length})
            </Text>
            {firmDeals.length > 0 && (
              <TouchableOpacity onPress={() => onNavigate('BrokerCreatedDeals', { company })}>
                <Text style={styles.seeAllText}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {firmDeals.length === 0 ? (
            <View style={styles.emptySaudaCard}>
              <Handshake size={32} color="#0284C7" style={{ marginBottom: 8 }} />
              <Text style={styles.emptySaudaTitle}>No Saudas Issued Yet</Text>
              <Text style={styles.emptySaudaSub}>
                Saudas issued for {firmName} will appear here.
              </Text>
              <TouchableOpacity
                style={styles.emptySaudaBtn}
                onPress={() => onNavigate('CreateBrokerDeal', { company })}
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
                  onPress={() => onNavigate('BrokerDealDetails', { dealId: deal._id || deal.id, deal })}
                >
                  {/* Top Row: Crop Badge + Rate + Status Pill */}
                  <View style={styles.compactHeaderRow}>
                    <View style={[styles.cropBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                      <Text style={[styles.cropBadgeText, { color: badgeText }]}>{deal.crop}</Text>
                    </View>
                    <Text style={[styles.compactRateText, { color: rateColor }]}>
                      {deal.rate} <Text style={styles.compactQtyText}>({deal.quantity})</Text>
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
          onPress={() => onNavigate('BrokerCreatedDeals', { company })}
          activeOpacity={0.82}
        >
          <Handshake size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.secondaryBtnText}>View Saudas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onNavigate('CreateBrokerDeal', { company })}
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
    backgroundColor: COLORS.primaryDark,
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
    bottom: 60,
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
