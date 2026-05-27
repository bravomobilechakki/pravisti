import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeals, getExpiredDeals, getPendingInvitations } from '../../services/api';

const DealsList = ({ onNavigate, routeData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Active');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);

  const [activeCompanyId, setActiveCompanyId] = useState(routeData?.companyId || null);
  const [activeCompanyName, setActiveCompanyName] = useState(routeData?.companyName || null);

  React.useEffect(() => {
    if (routeData?.companyId) {
      setActiveCompanyId(routeData.companyId);
      setActiveCompanyName(routeData.companyName);
    }
  }, [routeData]);

  const fetchDeals = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      let response;
      if (filter === 'Active') {
        response = await getDeals(token, 1, 50);
      } else if (filter === 'Expired') {
        response = await getExpiredDeals(token, 1, 50);
      } else if (filter === 'Invitations') {
        response = await getPendingInvitations(token);
      }

      if (response && response.success) {
        if (filter === 'Invitations') {
          setDeals(response.data || []);
        } else {
          setDeals(response.data.deals || []);
        }
      } else {
        setDeals([]);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      setDeals([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  React.useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const filteredDeals = deals.filter(deal => {
    let pName = '';
    if (filter === 'Invitations') {
      const firstProd = deal.dealDraft?.products?.[0];
      pName = firstProd?.productId?.name || firstProd?.productName || '';
    } else {
      const firstProd = deal.products?.[0] || deal.product || {};
      pName = firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || '';
    }
    const matchesSearch =
      String(pName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(deal.dealNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (activeCompanyId) {
      if (filter === 'Invitations') {
        const senderCompanyId = deal.senderCompanyId?._id || deal.senderCompanyId?.id || deal.senderCompanyId;
        return matchesSearch && String(senderCompanyId) === String(activeCompanyId);
      } else {
        const p1CompanyId = deal.party1?.companyId?._id || deal.party1?.companyId || deal.party1?.company?._id || deal.party1?.company?.id;
        const p2CompanyId = deal.party2?.companyId?._id || deal.party2?.companyId || deal.party2?.company?._id || deal.party2?.company?.id;
        const sellerCompanyId = deal.sellerCompany?._id || deal.sellerCompany?.id || deal.sellerCompanyId?._id || deal.sellerCompanyId?.id || deal.sellerCompanyId;
        const buyerCompanyId = deal.buyerCompany?._id || deal.buyerCompany?.id || deal.buyerCompanyId?._id || deal.buyerCompanyId?.id || deal.buyerCompanyId;
        const isAssociated =
          String(p1CompanyId) === String(activeCompanyId) ||
          String(p2CompanyId) === String(activeCompanyId) ||
          String(sellerCompanyId) === String(activeCompanyId) ||
          String(buyerCompanyId) === String(activeCompanyId);
        return matchesSearch && isAssociated;
      }
    }
    return matchesSearch;
  });

  const handleReshareInvite = (invite) => {
    const url = `https://wa.me/${invite.receiverMobileNumber}?text=Hi%20${encodeURIComponent(invite.receiverName)}%2C%20join%20me%20on%20Pravisti%20to%20do%20deals%20together%20and%20view%20my%20deals!%20Download%20the%20app%3A%20https%3A%2F%2Fpravisti.com%2Fdownload`;
    Linking.openURL(url).catch(e => console.warn('Could not launch WhatsApp', e));
  };

  // Compute summary stats
  const totalValue = deals.reduce((sum, d) => {
    const v = d.totalAmount || d.products?.[0]?.totalAmount || 0;
    return sum + Number(v);
  }, 0);

  const renderDealItem = ({ item }) => {
    if (filter === 'Invitations') {
      const draft = item.dealDraft || {};
      const firstProd = draft.products?.[0] || {};
      const pName = firstProd.productId?.name || firstProd.productName || 'Unknown Product';
      const qty = firstProd.quantity || 'N/A';
      const price = firstProd.price || 'N/A';
      const totalAmt = firstProd.totalAmount || (qty !== 'N/A' && price !== 'N/A' ? qty * price : null);
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';
      const inviteCode = item.inviteCode || 'N/A';
      const receiverName = item.receiverName || 'Buyer';
      const receiverMobile = item.receiverMobileNumber || '';

      return (
        <View style={[styles.dealCard, { borderLeftColor: '#059669' }]}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBubble, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.iconEmoji}>📨</Text>
            </View>
            <View style={styles.cardMain}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.productName} numberOfLines={1}>{pName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.statusText, { color: '#059669' }]}>INVITE</Text>
                </View>
              </View>
              <Text style={styles.partiesText} numberOfLines={1}>👤 {receiverName}  •  {receiverMobile}</Text>
            </View>
          </View>

          {/* Unified Sleek Stats Container */}
          <View style={styles.sleekStatsContainer}>
            <View style={styles.sleekStatBlock}>
              <Text style={styles.sleekStatLabel}>QTY</Text>
              <Text style={styles.sleekStatValue}>{qty}</Text>
            </View>
            <View style={styles.sleekStatSeparator} />
            <View style={styles.sleekStatBlock}>
              <Text style={styles.sleekStatLabel}>PRICE</Text>
              <Text style={styles.sleekStatValue}>₹{price}</Text>
            </View>
            {totalAmt ? (
              <>
                <View style={styles.sleekStatSeparator} />
                <View style={styles.sleekStatBlock}>
                  <Text style={styles.sleekStatLabel}>TOTAL VALUE</Text>
                  <Text style={[styles.sleekStatValue, { color: '#059669', fontWeight: '900' }]}>
                    ₹{Number(totalAmt).toLocaleString('en-IN')}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.inviteCodeBadge}>
              <Text style={styles.inviteCodeText}>#{inviteCode}</Text>
            </View>
            <View style={styles.footerRight}>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>📅 {date}</Text>
              </View>
              <TouchableOpacity style={styles.reshareBtn} onPress={() => handleReshareInvite(item)} activeOpacity={0.7}>
                <Text style={styles.reshareBtnText}>💬 Reshare</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    const isActive = item.status === 'active' || item.status === 'pending';
    const isCompleted = item.status === 'completed';
    const accentColor = isActive ? '#0284C7' : isCompleted ? '#059669' : '#EF4444';

    const firstProd = item.products?.[0] || item.product || {};
    const pName = firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || item.dealNumber || 'Sauda Agreement';
    const qty = firstProd.quantity || item.qty || 'N/A';
    const price = firstProd.price || item.price || 'N/A';
    const totalAmt = item.totalAmount || firstProd.totalAmount || (qty !== 'N/A' && price !== 'N/A' ? Number(qty) * Number(price) : null);

    const dealId = item._id || item.id;
    const date = item.createdAt || item.dealDate ? new Date(item.createdAt || item.dealDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';
    const sellerName = item.sellerCompany?.name || item.sellerCompanyId?.companyName || item.sellerCompanyId?.name || item.party1?.company?.name || (item.role === 'seller' ? 'My Firm' : 'Seller');
    const buyerName = item.buyerCompany?.name || item.buyerCompanyId?.companyName || item.buyerCompanyId?.name || item.party2?.company?.name || (item.role === 'buyer' ? 'My Firm' : 'Buyer');

    const emoji = isActive ? '📦' : isCompleted ? '✅' : '📜';
    const bgColor = isActive ? '#E0F2FE' : isCompleted ? '#ECFDF5' : '#FEE2E2';
    const statusTextColor = isActive ? '#0284C7' : isCompleted ? '#059669' : '#EF4444';
    const statusBorderColor = isActive ? '#BAE6FD' : isCompleted ? '#A7F3D0' : '#FECACA';

    return (
      <TouchableOpacity
        style={[styles.dealCard, { borderLeftColor: accentColor }]}
        onPress={() => onNavigate('DealDetails', { dealId, deal: item })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconBubble, { backgroundColor: bgColor }]}>
            <Text style={styles.iconEmoji}>{emoji}</Text>
          </View>
          <View style={styles.cardMain}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.productName} numberOfLines={1}>{pName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: bgColor, borderColor: statusBorderColor }]}>
                <Text style={[styles.statusText, { color: statusTextColor }]}>
                  {(item.status || 'UNKNOWN').toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.partiesText} numberOfLines={1}>
              🟢 {sellerName}  →  🔵 {buyerName}
            </Text>
          </View>
        </View>

        {/* Unified Sleek Stats Container */}
        <View style={styles.sleekStatsContainer}>
          <View style={styles.sleekStatBlock}>
            <Text style={styles.sleekStatLabel}>QTY</Text>
            <Text style={styles.sleekStatValue}>{String(qty)}</Text>
          </View>
          <View style={styles.sleekStatSeparator} />
          <View style={styles.sleekStatBlock}>
            <Text style={styles.sleekStatLabel}>PRICE</Text>
            <Text style={styles.sleekStatValue}>₹{String(price)}</Text>
          </View>
          {totalAmt ? (
            <>
              <View style={styles.sleekStatSeparator} />
              <View style={styles.sleekStatBlock}>
                <Text style={styles.sleekStatLabel}>VALUE</Text>
                <Text style={[styles.sleekStatValue, { color: '#0F172A', fontWeight: '900' }]}>
                  ₹{Number(totalAmt).toLocaleString('en-IN')}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dealNumber}>{item.dealNumber || 'NO-REF'}</Text>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>📅 {date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sauda Exchange</Text>
          <Text style={styles.headerSubtitle}>Your digital trade ledger</Text>
        </View>
        <TouchableOpacity style={styles.newDealBtn} onPress={() => onNavigate('CreateDeal')} activeOpacity={0.8}>
          <Text style={styles.newDealBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* STATS BAR */}
      {!isLoading && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{deals.length}</Text>
            <Text style={styles.statLabel}>{filter === 'Invitations' ? 'Pending' : filter}</Text>
          </View>
          <View style={styles.statDivider} />
          {filter !== 'Invitations' && totalValue > 0 ? (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#0284C7' }]}>
                ₹{(totalValue / 100000).toFixed(1)}L
              </Text>
              <Text style={styles.statLabel}>Total Value</Text>
            </View>
          ) : (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{filteredDeals.length}</Text>
              <Text style={styles.statLabel}>Filtered</Text>
            </View>
          )}
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              {deals.filter(d => d.status === 'active' || d.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      )}

      {/* SEARCH */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchLens}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search product, company, deal ID..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Text style={{ color: '#0284C7', fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ACTIVE COMPANY FILTER BADGE */}
      {activeCompanyId && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>🏢 {activeCompanyName}</Text>
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => { setActiveCompanyId(null); setActiveCompanyName(null); }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFilterText}>✕ Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB FILTERS */}
      <View style={styles.tabBar}>
        {[
          { key: 'Active', emoji: '📦', label: 'Active' },
          { key: 'Expired', emoji: '📜', label: 'Expired' },
          { key: 'Invitations', emoji: '📨', label: 'Invitations' },
        ].map((t) => {
          const isActive = filter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => { setIsLoading(true); setFilter(t.key); }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>{t.label}</Text>
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Synchronizing trades...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeals}
          renderItem={renderDealItem}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" colors={['#0284C7']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>🌑</Text>
              </View>
              <Text style={styles.emptyTitle}>No Saudas Found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'Invitations'
                  ? 'No pending invitations for your contacts yet.'
                  : `No ${filter.toLowerCase()} deals to show. Start your first trade!`}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => onNavigate('CreateDeal')} activeOpacity={0.8}>
                <Text style={styles.emptyBtnText}>🤝 Create First Deal</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: '#0F172A', fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },
  newDealBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  newDealBtnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },

  // STATS BAR
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },

  // SEARCH
  searchSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchLens: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },

  // FILTER BADGE
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  filterBadgeText: { fontSize: 13, color: '#0284C7', fontWeight: '700' },
  clearFilterBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearFilterText: { fontSize: 11, fontWeight: '800', color: '#0284C7' },

  // TAB BAR
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    position: 'relative',
    borderRadius: 10,
  },
  activeTab: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  activeTabText: { color: '#0284C7' },
  tabIndicator: {
    position: 'absolute',
    bottom: -1.5,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#0284C7',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // LIST
  listContent: { padding: 16, paddingBottom: 48 },

  // DEAL CARD
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    padding: 13,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 9,
  },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 19 },
  cardMain: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyStyle: 'space-between' },
  productName: { fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 6, letterSpacing: -0.2 },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  partiesText: { fontSize: 11, fontWeight: '600', color: '#64748B' },

  // SLEEK STATS ROW
  sleekStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  sleekStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  sleekStatLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  sleekStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  sleekStatSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },

  // CARD FOOTER
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dealNumber: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  datePill: { backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  datePillText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // INVITE
  inviteCodeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inviteCodeText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  reshareBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  reshareBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  // LOADER
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748B', fontWeight: '600' },

  // EMPTY STATE
  emptyWrap: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 6, letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 22, fontWeight: '500' },
  emptyBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 13,
    shadowColor: '#0284C7',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});

export default DealsList;
