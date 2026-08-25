import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Handshake,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  X,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeals, getBrokerMyDeals } from '../../../services/api';

// --- PRAVISTI COLOR SYSTEM ---
const COLORS = {
  primary: '#1463FF',
  primaryDark: '#0B4DD8',
  navy: '#071B3A',
  textPrimary: '#071B3A',
  textSecondary: '#66758F',
  textMuted: '#94A3B8',
  bgMain: '#F6F8FC',
  cardBg: '#FFFFFF',
  border: '#E6EBF2',
  softBlue: '#EFF6FF',

  // Status colors
  confirmedBg: '#EAFBF1',
  confirmedBorder: '#B8F0CB',
  confirmedText: '#07883F',

  pendingBg: '#FFF7E6',
  pendingBorder: '#FFD88A',
  pendingText: '#D17A00',

  draftBg: '#F1F5F9',
  draftBorder: '#DCE3EA',
  draftText: '#64748B',

  rejectedBg: '#FFF1F2',
  rejectedBorder: '#FCA5A5',
  rejectedText: '#D92D20',
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

const BrokerCreatedDeals = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const targetCompany = routeData?.company;
  const companyId = targetCompany?._id || targetCompany?.id || routeData?.companyId;
  const companyName = targetCompany?.name || targetCompany?.companyName || routeData?.companyName;

  const fetchBrokerCreatedDeals = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storedDealsStr = await AsyncStorage.getItem('broker_deals_storage');
      const localDeals = storedDealsStr ? JSON.parse(storedDealsStr) : [];

      // 1. INSTANT LOCAL RENDER (0.001s) - Render stored/cached deals immediately
      setDeals(localDeals);
      setIsLoading(false);

      // 2. PARALLEL BACKGROUND API FETCH for fast updates including status=draft deals
      const [brokerResResult, dealsResResult, draftDealsResult] = await Promise.allSettled([
        getBrokerMyDeals(token),
        getDeals(token, 1, 50, companyId || null),
        getDeals(token, 1, 50, companyId || null, 'draft'),
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

      const processDealsArray = (rawDeals) => {
        return rawDeals.map(d => {
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
      };

      if (dealsResResult.status === 'fulfilled' && dealsResResult.value?.success) {
        const rawDeals = Array.isArray(dealsResResult.value.data) ? dealsResResult.value.data : (dealsResResult.value.data?.deals || []);
        fetchedDeals.push(...processDealsArray(rawDeals));
      }

      if (draftDealsResult.status === 'fulfilled' && draftDealsResult.value?.success) {
        const rawDrafts = Array.isArray(draftDealsResult.value.data) ? draftDealsResult.value.data : (draftDealsResult.value.data?.deals || []);
        fetchedDeals.push(...processDealsArray(rawDrafts));
      }

      // Fast O(N) deduplication using ju                                                              
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
      console.warn('Error loading broker created deals:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrokerCreatedDeals();
  }, [routeData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBrokerCreatedDeals();
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
    const query = searchQuery.trim().toLowerCase();
    return companyFilteredDeals.filter(deal => {
      const matchesSearch = !query ||
        (deal.crop && deal.crop.toLowerCase().includes(query)) ||
        (deal.buyer && deal.buyer.toLowerCase().includes(query)) ||
        (deal.seller && deal.seller.toLowerCase().includes(query)) ||
        (deal.id && deal.id.toLowerCase().includes(query)) ||
        (deal._id && deal._id.toLowerCase().includes(query));

      const statusLower = (deal.status || '').toLowerCase();
      if (activeTab === 'Confirmed') return matchesSearch && (statusLower === 'confirmed' || statusLower === 'approved');
      if (activeTab === 'Pending') return matchesSearch && statusLower.includes('pending');
      if (activeTab === 'Draft') return matchesSearch && statusLower.includes('draft');
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
  const draftCount = companyFilteredDeals.filter(d => (d.status || '').toLowerCase().includes('draft')).length;

  // Render FlatList Header
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <ArrowLeft size={18} color={COLORS.navy} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
          <Text style={styles.pageTitle} numberOfLines={1}>
            {companyName ? `${companyName} Saudas` : 'My Created Saudas'}
          </Text>
          {companyName ? (
            <Text style={styles.companySubTitle} numberOfLines={1}>
              🏢 {companyName}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.85}
          onPress={() => onNavigate('CreateBrokerDeal', targetCompany ? { company: targetCompany } : undefined)}
        >
          <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Sauda, buyer, seller..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs (Horizontal Scrollable Strip) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
        style={styles.tabsWrapper}
      >
        {[
          { key: 'All', label: 'ALL', count: totalCount },
          { key: 'Confirmed', label: 'CONFIRMED', count: confirmedCount },
          { key: 'Pending', label: 'PENDING', count: pendingCount },
          { key: 'Draft', label: 'DRAFT', count: draftCount },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabPill, isActive ? styles.tabPillActive : styles.tabPillInactive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabelText, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {tab.label}
              </Text>
              <View style={[styles.countBadge, isActive ? styles.countBadgeActive : styles.countBadgeInactive]}>
                <Text style={[styles.countBadgeText, isActive ? styles.countTextActive : styles.countTextInactive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Render Deal Card Item
  const renderDealItem = ({ item }) => {
    const statusLower = (item.status || '').toLowerCase();
    const isPending = statusLower.includes('pending');
    const isDraft = statusLower.includes('draft');
    const isRejected = statusLower.includes('reject');

    let statusStyle = {
      bg: COLORS.confirmedBg,
      border: COLORS.confirmedBorder,
      text: COLORS.confirmedText,
      label: 'CONFIRMED',
    };

    if (isDraft) {
      statusStyle = {
        bg: COLORS.draftBg,
        border: COLORS.draftBorder,
        text: COLORS.draftText,
        label: 'DRAFT',
      };
    } else if (isPending) {
      statusStyle = {
        bg: COLORS.pendingBg,
        border: COLORS.pendingBorder,
        text: COLORS.pendingText,
        label: 'PENDING',
      };
    } else if (isRejected) {
      statusStyle = {
        bg: COLORS.rejectedBg,
        border: COLORS.rejectedBorder,
        text: COLORS.rejectedText,
        label: 'REJECTED',
      };
    }

    const dealNo = item.id || (item._id ? `#SD-${item._id.slice(-4).toUpperCase()}` : '#SD-9042');
    const dateDisplay = item.date || 'Today';

    const rawTotal = item.rawDeal?.grandTotal || item.rawDeal?.totalAmount || item.rawDeal?.totalValue || item.totalAmount || item.totalValue;
    let totalValStr = '';
    if (typeof rawTotal === 'number' && rawTotal > 0) {
      totalValStr = `₹${rawTotal.toLocaleString('en-IN')}`;
    } else if (typeof rawTotal === 'string' && rawTotal.trim().length > 0) {
      totalValStr = rawTotal.startsWith('₹') ? rawTotal : `₹${rawTotal}`;
    } else {
      totalValStr = item.rate || '—';
    }

    return (
      <TouchableOpacity
        style={styles.dealCard}
        activeOpacity={0.88}
        onPress={() => onNavigate('BrokerDealDetails', { dealId: item._id || item.id, deal: item })}
      >
        {/* Top Row: Deal ID, Date & Status Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, marginRight: 8 }}>
            <Text style={styles.dealNoText} numberOfLines={1}>{dealNo}</Text>
            <Text style={styles.dealDateText}>{dateDisplay}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        {/* Buyer → Seller Flow Boxes */}
        <View style={styles.buyerSellerFlowRow}>
          {/* Buyer Box */}
          <View style={styles.partyBox}>
            <Text style={styles.partyRoleLabel}>BUYER</Text>
            <Text style={styles.partyNameText} numberOfLines={1}>
              {item.buyer || 'Buyer Business'}
            </Text>
          </View>

          {/* Center Arrow */}
          <View style={styles.flowArrowCircle}>
            <ArrowRight size={15} color={COLORS.primary} />
          </View>

          {/* Seller Box */}
          <View style={styles.partyBox}>
            <Text style={[styles.partyRoleLabel, { color: '#7790B5' }]}>SELLER</Text>
            <Text style={styles.partyNameText} numberOfLines={1}>
              {item.seller || 'Seller Business'}
            </Text>
          </View>
        </View>

        {/* Product Chips Row */}
        <View style={styles.productChipsRow}>
          <View style={styles.cropChip}>
            <Text style={styles.cropChipText} numberOfLines={1}>
              {item.crop || item.productName || 'Commodity'}
            </Text>
          </View>

          {item.quantity ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{String(item.quantity).replace(/ units/gi, '')}</Text>
            </View>
          ) : null}

          {item.rate ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{item.rate}</Text>
            </View>
          ) : null}
        </View>

        {/* Card Divider */}
        <View style={styles.cardDivider} />

        {/* Card Footer Row: Total Value & Action Arrow */}
        <View style={styles.cardFooterRow}>
          <View>
            <Text style={styles.totalLabel}>Total Value</Text>
            <Text style={styles.totalValText}>{totalValStr}</Text>
          </View>

          <ChevronRight size={18} color="#94A3B8" />
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
          <Text style={styles.loadingText}>Loading Saudas...</Text>
        </View>
      );
    }

    if (deals.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBadge}>
            <Handshake size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Saudas Found</Text>
          <Text style={styles.emptyDesc}>
            Issue a real trade contract for buyers and sellers.
          </Text>
          <TouchableOpacity
            style={styles.emptyCreateBtn}
            onPress={() => onNavigate('CreateBrokerDeal', targetCompany ? { company: targetCompany } : undefined)}
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
        <Text style={styles.emptyTitle}>No Saudas Found</Text>
        <Text style={styles.emptyDesc}>
          Try changing the search query or status filter.
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

      <FlatList
        data={filteredDeals}
        keyExtractor={(item, index) => (item.id || item._id || index).toString()}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
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

// --- STYLES SYSTEM ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  listContentContainer: {
    paddingBottom: 60,
  },
  headerContainer: {
    backgroundColor: COLORS.bgMain,
    marginBottom: 8,
  },

  // ─── TOP HEADER ───
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: -0.2,
  },
  companySubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ─── SEARCH BAR ───
  searchSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
  },

  // ─── FILTER TABS (E-COMMERCE SYSTEM PILLS WITH COUNTS) ───
  tabsWrapper: {
    marginTop: 10,
    marginBottom: 10,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#1463FF',
    borderColor: '#1463FF',
  },
  tabPillInactive: {
    backgroundColor: '#F4F6F9',
    borderColor: '#E2E8F0',
  },
  tabLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabLabelInactive: {
    color: '#5F6F86',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  countBadgeInactive: {
    backgroundColor: '#E8EDF3',
  },
  countBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  countTextInactive: {
    color: '#64748B',
  },

  // ─── COMPACT DEAL CARD ───
  dealCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7ECF2',
    elevation: 1,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealNoText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.navy,
  },
  dealDateText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // BUYER → SELLER FLOW BOXES
  buyerSellerFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E7ECF2',
  },
  partyRoleLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#90A0B8',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  partyNameText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.navy,
  },
  flowArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: '#D7E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },

  // PRODUCT CHIPS
  productChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  cropChip: {
    backgroundColor: COLORS.softBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cropChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  metaChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E7ECF2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // CARD DIVIDER
  cardDivider: {
    height: 1,
    backgroundColor: '#EDF1F5',
    marginVertical: 10,
  },

  // CARD FOOTER
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  totalValText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
    marginTop: 1,
  },

  // ─── EMPTY & LOADING STATES ───
  emptyContainer: {
    paddingVertical: 60,
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
    backgroundColor: COLORS.softBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.navy,
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
    height: 42,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyResetBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default BrokerCreatedDeals;
