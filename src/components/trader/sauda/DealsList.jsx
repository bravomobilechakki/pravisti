import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDeals,
  deleteDeal,
  getUserProfile,
  getCompanyDetails,
} from '../../../services/api';

import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Calendar,
  MoreVertical,
  Plus,
  Package,
  FolderTree,
  MessageSquare,
  CheckCircle2,
  Clock,
  FileText,
  FilePlus,
  Tag,
  ArrowRight,
  Filter,
  Check,
  X,
  Share2,
  Eye,
  Trash2,
} from 'lucide-react-native';

const DealsList = ({ onNavigate, routeData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterTab, setSelectedFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'DRAFT' | 'CANCELLED'
  const [sortOrder, setSortOrder] = useState('LATEST'); // 'LATEST' | 'PRICE_HIGH' | 'PRICE_LOW' | 'NAME'
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [actionSheetDeal, setActionSheetDeal] = useState(null);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [activeCompanyId, setActiveCompanyId] = useState(
    routeData?.companyId || routeData?.company?._id || routeData?.company?.id || null
  );
  const [companyNames, setCompanyNames] = useState({});

  const resolveName = useCallback(
    (company, fallback = 'Company') => {
      if (!company) return fallback;
      if (typeof company === 'object') {
        return (
          company.name ||
          company.companyName ||
          company.businessName ||
          company.title ||
          (company.companyId && (company.companyId.name || company.companyId.companyName)) ||
          company.ownerName ||
          fallback
        );
      }
      if (companyNames[company]) {
        return companyNames[company];
      }
      return String(company);
    },
    [companyNames]
  );

  // Fetch Missing Company Names for buyer/seller display
  React.useEffect(() => {
    const fetchMissingCompanyNames = async () => {
      try {
        const missingIds = new Set();
        deals.forEach((deal) => {
          const bId = deal.buyerCompanyId?._id || deal.buyerCompanyId;
          const sId = deal.sellerCompanyId?._id || deal.sellerCompanyId;

          if (typeof bId === 'string' && bId.match(/^[0-9a-fA-F]{24}$/) && !companyNames[bId]) {
            missingIds.add(bId);
          }
          if (typeof sId === 'string' && sId.match(/^[0-9a-fA-F]{24}$/) && !companyNames[sId]) {
            missingIds.add(sId);
          }
        });

        if (missingIds.size === 0) return;
        const newNames = { ...companyNames };
        let updated = false;

        await Promise.all(
          Array.from(missingIds).map(async (id) => {
            try {
              const res = await getCompanyDetails(id);
              if (res && res.success && res.data) {
                newNames[id] = res.data.name || res.data.companyName || 'Company';
                updated = true;
              }
            } catch (e) {
              console.warn(`Failed to fetch company details for ${id}:`, e);
            }
          })
        );

        if (updated) {
          setCompanyNames(newNames);
        }
      } catch (err) {
        console.warn('Error fetching missing company names:', err);
      }
    };

    if (deals && deals.length > 0) {
      fetchMissingCompanyNames();
    }
  }, [deals, companyNames]);

  // Fetch Deals
  const fetchDeals = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const cacheKey = `trader_deals_cache_${activeCompanyId || 'all'}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDeals(parsed);
            setIsLoading(false);
          }
        } catch (e) { }
      }

      const response = await getDeals(token, 1, 100, activeCompanyId);
      if (response && response.success) {
        const dealList = Array.isArray(response.data?.deals)
          ? response.data.deals
          : Array.isArray(response.data)
            ? response.data
            : [];
        setDeals(dealList);
        if (dealList.length > 0) {
          AsyncStorage.setItem(cacheKey, JSON.stringify(dealList)).catch(() => { });
        }
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeCompanyId]);

  React.useEffect(() => {
    fetchDeals();
  }, [fetchDeals, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  // Delete Deal
  const handleDeleteDeal = (deal) => {
    Alert.alert('Delete Deal', 'Are you sure you want to delete this deal contract?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await deleteDeal(deal._id || deal.id, token);
            if (res && res.success) {
              fetchDeals();
            } else {
              Alert.alert('Error', res?.message || 'Failed to delete deal');
            }
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  // Metrics Calculations
  const totalDealsCount = deals.length;
  const activeDealsCount = useMemo(
    () => deals.filter((d) => ['active', 'confirmed', 'approved'].includes((d.status || '').toLowerCase())).length,
    [deals]
  );
  const inProgressCount = useMemo(
    () =>
      deals.filter((d) =>
        ['in progress', 'inprogress', 'pending', 'negotiation', 'processing'].includes(
          (d.status || '').toLowerCase()
        )
      ).length,
    [deals]
  );
  const completedCount = useMemo(
    () => deals.filter((d) => ['completed', 'settled', 'delivered'].includes((d.status || '').toLowerCase())).length,
    [deals]
  );

  const activePct = totalDealsCount > 0 ? Math.round((activeDealsCount / totalDealsCount) * 100) : 0;
  const inProgressPct = totalDealsCount > 0 ? Math.round((inProgressCount / totalDealsCount) * 100) : 0;
  const completedPct = totalDealsCount > 0 ? Math.round((completedCount / totalDealsCount) * 100) : 0;

  // Filter & Sort Logic
  const filteredDeals = useMemo(() => {
    let list = [...deals];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((deal) => {
        const prodName = deal.products?.[0]?.productId?.name || deal.product?.name || deal.productName || '';
        const dealNo = deal.dealNumber || deal.dealNo || deal.saudaNumber || String(deal._id);
        const buyer = resolveName(deal.buyerCompanyId);
        const seller = resolveName(deal.sellerCompanyId);
        return (
          prodName.toLowerCase().includes(q) ||
          dealNo.toLowerCase().includes(q) ||
          buyer.toLowerCase().includes(q) ||
          seller.toLowerCase().includes(q)
        );
      });
    }

    // Status Tab Filter
    if (selectedFilterTab === 'ACTIVE') {
      list = list.filter((d) =>
        ['active', 'confirmed', 'approved'].includes((d.status || '').toLowerCase())
      );
    } else if (selectedFilterTab === 'IN_PROGRESS') {
      list = list.filter((d) =>
        ['in progress', 'inprogress', 'pending', 'negotiation', 'processing'].includes(
          (d.status || '').toLowerCase()
        )
      );
    } else if (selectedFilterTab === 'COMPLETED') {
      list = list.filter((d) =>
        ['completed', 'settled', 'delivered'].includes((d.status || '').toLowerCase())
      );
    } else if (selectedFilterTab === 'DRAFT') {
      list = list.filter((d) => ['draft', 'created'].includes((d.status || '').toLowerCase()));
    } else if (selectedFilterTab === 'CANCELLED') {
      list = list.filter((d) => ['cancelled', 'rejected', 'expired'].includes((d.status || '').toLowerCase()));
    }

    // Sort order
    if (sortOrder === 'PRICE_HIGH') {
      list.sort((a, b) => Number(b.totalAmount || b.totalPrice || 0) - Number(a.totalAmount || a.totalPrice || 0));
    } else if (sortOrder === 'PRICE_LOW') {
      list.sort((a, b) => Number(a.totalAmount || a.totalPrice || 0) - Number(b.totalAmount || b.totalPrice || 0));
    } else if (sortOrder === 'NAME') {
      list.sort((a, b) => {
        const nameA = a.products?.[0]?.productId?.name || a.productName || '';
        const nameB = b.products?.[0]?.productId?.name || b.productName || '';
        return nameA.localeCompare(nameB);
      });
    } else {
      // Latest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [deals, searchQuery, selectedFilterTab, sortOrder, resolveName]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP LIGHT WHITE HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1541D8" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Deals</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setIsSearchOpen((prev) => !prev)}
            activeOpacity={0.75}
          >
            <Search size={19} color="#1E293B" strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setIsSortModalVisible(true)}
            activeOpacity={0.75}
          >
            <Filter size={19} color="#1E293B" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1541D8']}
            tintColor="#1541D8"
          />
        }
      >
        {/* ─── 2. TOP 4 SUMMARY METRIC CARDS (Exact Reference Match) ─── */}
        <View style={styles.metricsRow}>
          {/* 1. Total Deals */}
          <TouchableOpacity
            style={[styles.metricCard, selectedFilterTab === 'ALL' && styles.metricCardSelected]}
            onPress={() => setSelectedFilterTab('ALL')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Package size={17} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Total Deals
            </Text>
            <Text style={styles.metricValue}>{totalDealsCount}</Text>
            <Text style={styles.metricSubtext}>All Time</Text>
          </TouchableOpacity>

          {/* 2. Active Deals */}
          <TouchableOpacity
            style={[styles.metricCard, selectedFilterTab === 'ACTIVE' && styles.metricCardSelected]}
            onPress={() => setSelectedFilterTab('ACTIVE')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle2 size={17} color="#16A34A" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Active Deals
            </Text>
            <Text style={[styles.metricValue, { color: '#16A34A' }]}>{activeDealsCount}</Text>
            <Text style={[styles.metricSubtext, { color: '#16A34A' }]}>{activePct}% of Total</Text>
          </TouchableOpacity>

          {/* 3. In Progress */}
          <TouchableOpacity
            style={[styles.metricCard, selectedFilterTab === 'IN_PROGRESS' && styles.metricCardSelected]}
            onPress={() => setSelectedFilterTab('IN_PROGRESS')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Clock size={17} color="#EA580C" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              In Progress
            </Text>
            <Text style={[styles.metricValue, { color: '#EA580C' }]}>{inProgressCount}</Text>
            <Text style={[styles.metricSubtext, { color: '#EA580C' }]}>{inProgressPct}% of Total</Text>
          </TouchableOpacity>

          {/* 4. Completed */}
          <TouchableOpacity
            style={[styles.metricCard, selectedFilterTab === 'COMPLETED' && styles.metricCardSelected]}
            onPress={() => setSelectedFilterTab('COMPLETED')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#F5F3FF' }]}>
              <FileText size={17} color="#7C3AED" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Completed
            </Text>
            <Text style={[styles.metricValue, { color: '#7C3AED' }]}>{completedCount}</Text>
            <Text style={[styles.metricSubtext, { color: '#7C3AED' }]}>{completedPct}% of Total</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 3. SEARCH & CONTROLS BAR ─── */}
        <View style={styles.controlsBarRow}>
          {/* Search Input Box */}
          <View style={styles.searchBarBox}>
            <Search size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search deals by name, ID, product..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Calendar Button */}
          <TouchableOpacity
            style={styles.controlIconBtn}
            onPress={() => {
              // Toggle sorting by date
              setSortOrder((prev) => (prev === 'LATEST' ? 'NAME' : 'LATEST'));
            }}
            activeOpacity={0.75}
          >
            <Calendar size={18} color="#475569" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Sort Dropdown Button */}
          <TouchableOpacity
            style={styles.sortDropdownBtn}
            onPress={() => setIsSortModalVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.sortDropdownBtnText}>
              {sortOrder === 'PRICE_HIGH' ? 'Price ↓' : sortOrder === 'PRICE_LOW' ? 'Price ↑' : 'Sort'}
            </Text>
            <SlidersHorizontal size={13} color="#475569" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* ─── 4. SEGMENTED FILTER TABS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
          style={styles.tabsContainer}
        >
          {[
            { label: 'All Deals', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'In Progress', value: 'IN_PROGRESS' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Cancelled', value: 'CANCELLED' },
          ].map((tab) => {
            const isSelected = selectedFilterTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
                onPress={() => setSelectedFilterTab(tab.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabPillText, isSelected && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── 5. DEALS LIST SECTION ─── */}
        <View style={styles.dealsSection}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#1541D8" />
              <Text style={styles.loadingText}>Loading deals and contracts...</Text>
            </View>
          ) : filteredDeals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Package size={38} color="#94A3B8" strokeWidth={1.8} />
              <Text style={styles.emptyTitle}>No Deals Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No contracts match your search filters.'
                  : 'Tap "+ Create Deal" button to start your first trade.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => onNavigate('CreateDeal')}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.emptyAddBtnText}>Create Deal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredDeals.map((deal, idx) => {
              const dealId = deal._id || deal.id || idx;
              const firstProd = deal.products?.[0] || {};
              const prodObj = firstProd.productId || deal.product || {};
              const productName =
                deal.title ||
                deal.dealName ||
                prodObj?.name ||
                deal.productName ||
                (firstProd?.name ? firstProd.name : 'Deal');

              // Category tag
              const categoryName =
                prodObj?.categoryId?.name ||
                prodObj?.categoryName ||
                deal.categoryName ||
                '';

              // Deal ID string
              const dealNumber =
                deal.dealNumber ||
                deal.dealNo ||
                deal.saudaNumber ||
                deal.contractNumber ||
                `#${String(deal._id || '').substring(Math.max(0, String(deal._id || '').length - 6)).toUpperCase()}`;

              // Buyer & Seller
              const sellerName = resolveName(deal.sellerCompanyId, 'Seller');
              const buyerName = resolveName(deal.buyerCompanyId, 'Buyer');

              // Amount & Date
              const totalAmt = deal.totalAmount || deal.totalPrice || deal.estimatedAmount || 0;
              const formattedPrice = totalAmt ? `₹${Number(totalAmt).toLocaleString('en-IN')}` : '₹0';

              const dealDate = deal.dealDate || deal.createdAt || new Date();
              const formattedDate = new Date(dealDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              // Status normalization
              const rawStatus = (deal.status || 'Active').toLowerCase();
              let statusLabel = 'Active';
              let statusBg = '#E8F8F0';
              let statusColor = '#10B981';

              if (['completed', 'settled', 'delivered'].includes(rawStatus)) {
                statusLabel = 'Completed';
                statusBg = '#F1F5F9';
                statusColor = '#64748B';
              } else if (['in progress', 'inprogress', 'pending', 'negotiation', 'processing'].includes(rawStatus)) {
                statusLabel = 'In Progress';
                statusBg = '#EFF6FF';
                statusColor = '#2563EB';
              } else if (['draft', 'created'].includes(rawStatus)) {
                statusLabel = 'Draft';
                statusBg = '#FEF3C7';
                statusColor = '#D97706';
              } else if (['cancelled', 'rejected', 'expired'].includes(rawStatus)) {
                statusLabel = 'Cancelled';
                statusBg = '#FEF2F2';
                statusColor = '#EF4444';
              }

              // Commodity Avatar Color Themes
              const themeColor =
                idx % 4 === 0
                  ? { bg: '#EFF6FF', icon: '#2563EB' }
                  : idx % 4 === 1
                    ? { bg: '#FFFBEB', icon: '#D97706' }
                    : idx % 4 === 2
                      ? { bg: '#F0FDF4', icon: '#16A34A' }
                      : { bg: '#F5F3FF', icon: '#7C3AED' };

              return (
                <TouchableOpacity
                  key={dealId}
                  style={styles.dealCard}
                  onPress={() => onNavigate('DealChat', { dealId: deal._id || deal.id, deal })}
                  activeOpacity={0.85}
                >
                  {/* Left: Commodity Avatar */}
                  <View style={[styles.dealAvatarCircle, { backgroundColor: themeColor.bg }]}>
                    {prodObj?.image ? (
                      <Image source={{ uri: prodObj.image }} style={styles.dealAvatarImg} />
                    ) : (
                      <Package size={22} color={themeColor.icon} strokeWidth={2.2} />
                    )}
                  </View>

                  {/* Center: Details */}
                  <View style={styles.dealCenterDetails}>
                    <Text style={styles.dealTitle} numberOfLines={1}>
                      {productName}
                    </Text>

                    <Text style={styles.dealNumberText} numberOfLines={1}>
                      {dealNumber}
                    </Text>

                    <View style={styles.partiesRow}>
                      <Text style={styles.partyName} numberOfLines={1}>
                        {sellerName}
                      </Text>
                      <ArrowRight size={11} color="#94A3B8" style={{ marginHorizontal: 4 }} />
                      <Text style={styles.partyName} numberOfLines={1}>
                        {buyerName}
                      </Text>
                    </View>

                    {/* Category Tag Badge */}
                    {categoryName ? (
                      <View style={styles.categoryTagPill}>
                        <Text style={styles.categoryTagText}>{categoryName}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Right: Status, Price, Date & Menu */}
                  <View style={styles.dealRightDetails}>
                    <View style={styles.rightTopRow}>
                      <View style={[styles.statusBadgePill, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {statusLabel}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.moreBtn}
                        onPress={() => setActionSheetDeal(deal)}
                        activeOpacity={0.7}
                      >
                        <MoreVertical size={16} color="#64748B" strokeWidth={2.2} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.dealPriceText}>{formattedPrice}</Text>
                    <Text style={styles.dealDateText}>{formattedDate}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Results Summary text */}
          {filteredDeals.length > 0 && (
            <View style={styles.resultsSummaryRow}>
              <Text style={styles.resultsSummaryText}>
                Showing 1 to {filteredDeals.length} of {totalDealsCount} deals
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── 6. CREATE NEW DEAL BOTTOM BANNER (Exact Screenshot Match) ─── */}
      <View style={styles.createDealBannerWrapper}>
        <TouchableOpacity
          style={styles.createDealBannerCard}
          onPress={() => onNavigate('CreateDeal')}
          activeOpacity={0.9}
        >
          {/* Mascot Character Image */}
          <Image
            source={require('../../../images/createdeal.png')}
            style={styles.createDealMascotImg}
            resizeMode="contain"
          />

          {/* Center Text */}
          <View style={styles.createDealTextContainer}>
            <Text style={styles.createDealBannerTitle}>Create New Deal</Text>
            <Text style={styles.createDealBannerSubtitle}>
              Add a new deal quickly and manage everything digitally.
            </Text>
          </View>

          {/* Right White Plus Button Box */}
          <View style={styles.createDealPlusBtnBox}>
            <Plus size={22} color="#0048DA" strokeWidth={2.8} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ─── 7. DEAL ACTION SHEET MODAL ─── */}
      <Modal
        visible={actionSheetDeal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetDeal(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActionSheetDeal(null)}
        >
          <View style={styles.actionSheetCard}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionSheetDeal?.dealNumber || actionSheetDeal?.productName || 'Deal Actions'}
            </Text>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const d = actionSheetDeal;
                setActionSheetDeal(null);
                onNavigate('DealChat', { dealId: d._id || d.id, deal: d });
              }}
              activeOpacity={0.7}
            >
              <MessageSquare size={18} color="#1541D8" />
              <Text style={styles.actionSheetItemText}>Open Deal Chat & Ledger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const d = actionSheetDeal;
                setActionSheetDeal(null);
                onNavigate('DealDetails', { dealId: d._id || d.id, deal: d });
              }}
              activeOpacity={0.7}
            >
              <Eye size={18} color="#2563EB" />
              <Text style={styles.actionSheetItemText}>View Contract Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const d = actionSheetDeal;
                setActionSheetDeal(null);
                onNavigate('CreateDeal', { prefillDeal: d });
              }}
              activeOpacity={0.7}
            >
              <FilePlus size={18} color="#16A34A" />
              <Text style={styles.actionSheetItemText}>Recreate Similar Sauda</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 }} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const d = actionSheetDeal;
                setActionSheetDeal(null);
                handleDeleteDeal(d);
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="#DC2626" />
              <Text style={[styles.actionSheetItemText, { color: '#DC2626', fontWeight: '700' }]}>
                Delete Deal Contract
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 8. SORT MODAL ─── */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalHeading}>Sort Deals By</Text>

            {[
              { label: 'Latest Date (Newest First)', value: 'LATEST' },
              { label: 'Deal Amount: High to Low', value: 'PRICE_HIGH' },
              { label: 'Deal Amount: Low to High', value: 'PRICE_LOW' },
              { label: 'Product Name (A-Z)', value: 'NAME' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortOptionItem, sortOrder === opt.value && styles.sortOptionItemSelected]}
                onPress={() => {
                  setSortOrder(opt.value);
                  setIsSortModalVisible(false);
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortOrder === opt.value && styles.sortOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {sortOrder === opt.value && <Check size={16} color="#1541D8" strokeWidth={2.5} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsSortModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DealsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  /* ── 1. Top Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 6,
    flex: 1,
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── 2. Top Summary Metric Cards (4 Tiles) ── */
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1.5,
    gap: 4,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  metricCardSelected: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  metricSubtext: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },

  /* ── 3. Search & Controls Bar ── */
  controlsBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    padding: 0,
  },
  controlIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 4,
  },
  sortDropdownBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },

  /* ── 4. Segmented Filter Tabs ── */
  tabsContainer: {
    marginBottom: 10,
  },
  tabsScrollContent: {
    gap: 6,
  },
  tabPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#1541D8',
    borderColor: '#1541D8',
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* ── 5. Deals List Section ── */
  dealsSection: {
    marginBottom: 20,
  },
  dealCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1.5,
    alignItems: 'center',
  },
  dealAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  dealAvatarImg: {
    width: '100%',
    height: '100%',
  },
  dealCenterDetails: {
    flex: 1,
    paddingRight: 6,
  },
  dealTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  dealNumberText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  partiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  partyName: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
    maxWidth: '45%',
  },
  categoryTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 5,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Right Details */
  dealRightDetails: {
    alignItems: 'flex-end',
  },
  rightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  moreBtn: {
    padding: 2,
  },
  dealPriceText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 5,
  },
  dealDateText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },

  resultsSummaryRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resultsSummaryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
  },

  /* ── 6. Create Deal Bottom Banner ── */
  createDealBannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  createDealBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0048DA',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0048DA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  createDealMascotImg: {
    width: 60,
    height: 60,
    marginRight: 10,
  },
  createDealTextContainer: {
    flex: 1,
    paddingRight: 6,
  },
  createDealBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  createDealBannerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#E0E7FF',
    lineHeight: 15,
  },
  createDealPlusBtnBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  /* Loading & Empty */
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1541D8',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
    gap: 6,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionSheetCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  actionSheetItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  sortOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  sortOptionItemSelected: {
    borderColor: '#1541D8',
    backgroundColor: '#EFF6FF',
  },
  sortOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  sortOptionTextSelected: {
    fontWeight: '800',
    color: '#1541D8',
  },
  modalCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
