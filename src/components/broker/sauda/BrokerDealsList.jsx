import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Handshake,
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  CircleAlert as AlertCircle,
  User,
  Building2,
  X,
  RotateCcw,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from '../../navbar/navbar';
import { getDeals, getBrokerMyDeals } from '../../../services/api';

// --- COLOR SYSTEM (Cobalt Royal Blue Theme) ---
const COLORS = {
  primary: '#3465EA',
  primaryDark: '#3465EA',
  headerMiddle: '#2554D7',
  headerEnd: '#1E46C6',
  primaryLight: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  cyan: '#06B6D4',
  buyerBlue: '#0284C7',
  buyerBlueLight: '#E0F2FE',
  sellerPurple: '#7C3AED',
  sellerPurpleLight: '#F5F3FF',
  success: '#059669',
  successDark: '#15803D',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textPlaceholder: '#94A3B8',
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

const BrokerDealsList = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const targetCompany = routeData?.company;
  const companyId = targetCompany?._id || targetCompany?.id || routeData?.companyId;
  const companyName = targetCompany?.name || targetCompany?.companyName || routeData?.companyName;

  const fetchBrokerDeals = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storedDealsStr = await AsyncStorage.getItem('broker_deals_storage');
      const localDeals = storedDealsStr ? JSON.parse(storedDealsStr) : [];

      // 1. INSTANT LOCAL RENDER (0.001s) - Render stored/cached deals immediately
      setDeals(localDeals);
      setIsLoading(false);

      // 2. PARALLEL BACKGROUND API FETCH for fast updates
      const [brokerResResult, dealsResResult] = await Promise.allSettled([
        getBrokerMyDeals(token),
        getDeals(token, 1, 1000, companyId || null),
      ]);

      let fetchedDeals = [];

      if (brokerResResult.status === 'fulfilled' && brokerResResult.value?.success) {
        const brokerRes = brokerResResult.value;
        const rawList = Array.isArray(brokerRes.data)
          ? brokerRes.data
          : (brokerRes.data?.deals || brokerRes.data?.myDeals || []);

        fetchedDeals = rawList.map(d => {
          const unitStr = d.products?.[0]?.unit ? ` ${d.products[0].unit}` : '';
          const p0 = d.products?.[0];
          const pid0 = p0?.productId;
          const cropName0 = d.crop || d.productName || d.cropName
            || (pid0 && typeof pid0 === 'object' ? (pid0.name || pid0.productName || pid0.title || pid0.cropName) : null)
            || p0?.productName || p0?.name || p0?.crop || p0?.cropName || p0?.title
            || 'Agricultural Commodity';
          return {
            id: d.dealNumber || d._id || `SAUDA-${Math.floor(100 + Math.random() * 900)}`,
            _id: d._id || d.id,
            crop: cropName0,
            quantity: d.products?.[0]?.quantity ? `${d.products[0].quantity}${unitStr}` : (d.quantity ? String(d.quantity).replace(/ units/gi, '') : '100'),
            rate: d.products?.[0]?.price ? `₹${parseFloat(d.products[0].price).toLocaleString('en-IN')}` : (d.rate || '₹60,000'),
            buyer: d.buyerCompany?.name || d.buyerCompany?.companyName || d.buyerName || d.buyer || 'Buyer Business',
            seller: d.sellerCompany?.name || d.sellerCompany?.companyName || d.sellerName || d.seller || 'Seller Business',
            status: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1)) : 'Confirmed',
            date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (d.date || 'Today'),
            commission: d.totalAmount ? `₹${(d.totalAmount * 0.01).toFixed(0)}` : (d.commission || '₹10,000'),
            brokerCompanyId: extractCompanyId(d),
            brokerCompanyName: extractCompanyName(d),
            rawDeal: d,
          };
        });
      }

      if (dealsResResult.status === 'fulfilled' && dealsResResult.value?.success) {
        const res = dealsResResult.value;
        const rawDeals = Array.isArray(res.data) ? res.data : (res.data?.deals || []);
        const apiMapped = rawDeals.map(d => {
          const unitStr = d.products?.[0]?.unit ? ` ${d.products[0].unit}` : '';
          const p0 = d.products?.[0];
          const pid0 = p0?.productId;
          const cropName0 = d.crop || d.productName || d.cropName
            || (pid0 && typeof pid0 === 'object' ? (pid0.name || pid0.productName || pid0.title || pid0.cropName) : null)
            || p0?.productName || p0?.name || p0?.crop || p0?.cropName || p0?.title
            || 'Agricultural Commodity';
          return {
            id: d.dealNumber || d._id,
            _id: d._id || d.id,
            crop: cropName0,
            quantity: d.products?.[0]?.quantity ? `${d.products[0].quantity}${unitStr}` : (d.quantity ? String(d.quantity).replace(/ units/gi, '') : '100'),
            rate: d.products?.[0]?.price ? `₹${parseFloat(d.products[0].price).toLocaleString('en-IN')}` : (d.rate || '₹60,000'),
            buyer: d.buyerCompany?.name || d.buyerCompany?.companyName || d.buyerName || d.buyer || 'Buyer Business',
            seller: d.sellerCompany?.name || d.sellerCompany?.companyName || d.sellerName || d.seller || 'Seller Business',
            status: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1)) : 'Confirmed',
            date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (d.date || 'Today'),
            commission: d.totalAmount ? `₹${(d.totalAmount * 0.01).toFixed(0)}` : (d.commission || '₹10,000'),
            brokerCompanyId: extractCompanyId(d),
            brokerCompanyName: extractCompanyName(d),
            rawDeal: d,
          };
        });
        fetchedDeals.push(...apiMapped);
      }

      // Fast O(N) deduplication using Map
      const dealMap = new Map();
      localDeals.forEach(d => {
        const key = d._id || d.id || d.dealNumber;
        if (key) dealMap.set(String(key), d);
      });
      fetchedDeals.forEach(fD => {
        const key = fD._id || fD.id || fD.dealNumber;
        if (key) dealMap.set(String(key), fD);
      });

      const combined = Array.from(dealMap.values());
      setDeals(combined);
      if (combined.length > 0) {
        AsyncStorage.setItem('broker_deals_storage', JSON.stringify(combined)).catch(() => { });
      }
    } catch (err) {
      console.warn('Error loading broker deals:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrokerDeals();
  }, [routeData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBrokerDeals();
  };

  const companyFilteredDeals = useMemo(() => {
    const compIdStr = companyId ? String(companyId) : null;
    const compNameClean = companyName ? String(companyName).trim().toLowerCase() : null;

    return deals.filter(deal => {
      if (compIdStr || compNameClean) {
        const dCompId = deal.brokerCompanyId || extractCompanyId(deal);
        const dCompName = deal.brokerCompanyName || extractCompanyName(deal);

        const matchesId = Boolean(compIdStr && dCompId && String(dCompId) === compIdStr);
        const matchesName = Boolean(compNameClean && dCompName && String(dCompName).trim().toLowerCase() === compNameClean);

        if (matchesId || matchesName) {
          return true;
        } else if (!dCompId && !dCompName) {
          return true;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [deals, companyId, companyName]);

  const filteredDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return companyFilteredDeals.filter(deal => {
      const matchesSearch = !q ||
        (deal.crop && deal.crop.toLowerCase().includes(q)) ||
        (deal.buyer && deal.buyer.toLowerCase().includes(q)) ||
        (deal.seller && deal.seller.toLowerCase().includes(q)) ||
        (deal.id && deal.id.toLowerCase().includes(q)) ||
        (deal._id && deal._id.toLowerCase().includes(q));

      const statusLower = (deal.status || '').toLowerCase();
      if (activeTab === 'Confirmed') return matchesSearch && (statusLower === 'confirmed' || statusLower === 'approved');
      if (activeTab === 'Pending') return matchesSearch && statusLower.includes('pending');
      return matchesSearch;
    });
  }, [companyFilteredDeals, searchQuery, activeTab]);

  // Calculate Stat Counts
  const totalCount = companyFilteredDeals.length;
  const confirmedCount = companyFilteredDeals.filter(d => {
    const s = (d.status || '').toLowerCase();
    return s === 'confirmed' || s === 'approved';
  }).length;
  const pendingCount = companyFilteredDeals.filter(d => (d.status || '').toLowerCase().includes('pending')).length;

  // Render Header Section for FlatList
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Hero Header Banner */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.pageTitle}>My Sauda Ledger</Text>
          <Text style={styles.pageSubtitle}>Manage active contracts & mandi trades</Text>
        </View>

        <TouchableOpacity
          style={styles.newSaudaBtn}
          activeOpacity={0.85}
          onPress={() => onNavigate('CreateBrokerDeal')}
        >
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.newSaudaBtnText}>New Sauda</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Statistics Strip */}
      <View style={styles.statsStripRow}>
        <View style={[styles.statCardBox, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder }]}>
          <View style={styles.statIconCircle}>
            <TrendingUp size={14} color={COLORS.primary} />
          </View>
          <View>
            <Text style={[styles.statCountText, { color: COLORS.primaryDark }]}>{totalCount}</Text>
            <Text style={styles.statLabelText}>Total Sauda</Text>
          </View>
        </View>

        <View style={[styles.statCardBox, { backgroundColor: COLORS.successLight, borderColor: '#A7F3D0' }]}>
          <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
            <CheckCircle2 size={14} color={COLORS.success} />
          </View>
          <View>
            <Text style={[styles.statCountText, { color: COLORS.successDark }]}>{confirmedCount}</Text>
            <Text style={styles.statLabelText}>Confirmed</Text>
          </View>
        </View>

        <View style={[styles.statCardBox, { backgroundColor: COLORS.warningLight, borderColor: '#FDE68A' }]}>
          <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Clock size={14} color={COLORS.warning} />
          </View>
          <View>
            <Text style={[styles.statCountText, { color: COLORS.warning }]}>{pendingCount}</Text>
            <Text style={styles.statLabelText}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.textPlaceholder} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop, buyer, seller or Sauda ID"
            placeholderTextColor={COLORS.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={COLORS.textPlaceholder} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'All', label: `All (${totalCount})` },
          { key: 'Confirmed', label: `Confirmed (${confirmedCount})` },
          { key: 'Pending', label: `Pending (${pendingCount})` },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Render Each Premium Modern Card
  const renderDealItem = ({ item }) => {
    const statusLower = (item.status || '').toLowerCase();
    const isPending = statusLower.includes('pending');

    return (
      <TouchableOpacity
        style={styles.dealCard}
        activeOpacity={0.88}
        onPress={() => onNavigate('BrokerDealDetails', { dealId: item._id || item.id, deal: item })}
      >
        {/* Card Header Row: Commodity Name & Status Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.commodityNameBadge}>
            <View style={styles.commodityIconBox}>
              <Handshake size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.commodityNameText} numberOfLines={1}>
              {item.crop || item.productName || 'Agricultural Commodity'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: isPending ? COLORS.warningLight : COLORS.successLight }]}>
            {isPending ? (
              <Clock size={11} color={COLORS.warning} style={{ marginRight: 4 }} />
            ) : (
              <ShieldCheck size={11} color={COLORS.successDark} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.statusText, { color: isPending ? COLORS.warning : COLORS.successDark }]}>
              {isPending ? 'Pending Sign' : 'Confirmed'}
            </Text>
          </View>
        </View>

        {/* Counterparty Buyer & Seller Info Box */}
        <View style={styles.partiesContainerBox}>
          <View style={styles.partyColumn}>
            <View style={styles.partyRoleLabelRow}>
              <View style={[styles.partyAvatarCircle, { backgroundColor: COLORS.buyerBlueLight }]}>
                <User size={10} color={COLORS.buyerBlue} />
              </View>
              <Text style={styles.partyRoleText}>BUYER</Text>
            </View>
            <Text style={styles.buyerNameText} numberOfLines={1}>
              {item.buyer || 'Buyer Business'}
            </Text>
          </View>

          <View style={styles.partyDividerLine} />

          <View style={styles.partyColumn}>
            <View style={styles.partyRoleLabelRow}>
              <View style={[styles.partyAvatarCircle, { backgroundColor: COLORS.sellerPurpleLight }]}>
                <Building2 size={10} color={COLORS.sellerPurple} />
              </View>
              <Text style={styles.partyRoleText}>SELLER</Text>
            </View>
            <Text style={styles.sellerNameText} numberOfLines={1}>
              {item.seller || 'Seller Business'}
            </Text>
          </View>
        </View>

        {/* Deal Values Grid: Quantity, Rate, Brokerage */}
        <View style={styles.detailsGridBox}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{item.quantity ? String(item.quantity).replace(/ units/gi, '') : '100'}</Text>
          </View>

          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Agreed Rate</Text>
            <Text style={styles.rateValueText}>{item.rate || '₹0'}</Text>
          </View>

          <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.detailLabel}>Brokerage</Text>
            <Text style={styles.brokerageValText}>
              {item.commission || '₹0'}
            </Text>
          </View>
        </View>

        {/* Card Footer Row: Reference ID, Date & Action Button */}
        <View style={styles.cardFooterRow}>
          <Text style={styles.referenceDateText}>
            Ref: {item.id || 'SAUDA'} • {item.date || 'Today'}
          </Text>

          <View style={styles.viewDetailBtnRow}>
            <Text style={styles.viewDetailBtnText}>View Contract</Text>
            <ArrowRight size={13} color={COLORS.primary} style={{ marginLeft: 4 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Empty State
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your Sauda...</Text>
        </View>
      );
    }

    if (deals.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBadge}>
            <Handshake size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Sauda yet</Text>
          <Text style={styles.emptyDesc}>
            Create your first Sauda to start managing buyer and seller transactions.
          </Text>
          <TouchableOpacity
            style={styles.emptyCreateBtn}
            onPress={() => onNavigate('CreateBrokerDeal')}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.emptyCreateBtnText}>Create New Sauda</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBadge}>
          <Search size={24} color={COLORS.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No matching Sauda</Text>
        <Text style={styles.emptyDesc}>
          Try changing your search query or status filter.
        </Text>
        <TouchableOpacity
          style={styles.emptyResetBtn}
          onPress={() => { setSearchQuery(''); setActiveTab('All'); }}
          activeOpacity={0.8}
        >
          <RotateCcw size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.emptyResetBtnText}>Clear Search & Filters</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Navbar onNavigate={onNavigate} user={routeData?.user} />

      <FlatList
        data={filteredDeals}
        keyExtractor={(item, index) => (item.id || item._id || index).toString()}
        ListHeaderComponent={renderListHeader}
        renderItem={renderDealItem}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      />
    </SafeAreaView>
  );
};

// --- STYLES SYSTEM (Premium Modern Cards) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  listContentContainer: {
    paddingBottom: 40,
  },
  headerContainer: {
    backgroundColor: COLORS.bgMain,
    paddingBottom: 4,
  },

  // ─── HEADER ───
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  newSaudaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newSaudaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── STATS STRIP CARDS ───
  statsStripRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  statCardBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCountText: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ─── SEARCH SECTION ───
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // ─── TABS ───
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // ─── ELEVATED MODERN CARDS ───
  dealCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commodityNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  commodityIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commodityNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Parties Box
  partiesContainerBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EFFE',
  },
  partyColumn: {
    flex: 1,
  },
  partyRoleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  partyAvatarCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  partyRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  buyerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.buyerBlue,
  },
  sellerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.sellerPurple,
  },
  partyDividerLine: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },

  // Details Grid Box
  detailsGridBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFBFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EFFE',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rateValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  brokerageValText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // Card Footer Row
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  referenceDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  viewDetailBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ─── EMPTY & LOADING STATES ───
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 10,
  },
  emptyIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 280,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 12,
    elevation: 3,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BrokerDealsList;
