import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Building2,
  User,
  Share2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeals, getBrokerMyDeals } from '../../../services/api';

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

      // 1. INSTANT LOCAL RENDER (0.01s) - Render stored/cached deals immediately
      setDeals(localDeals);
      setIsLoading(false);

      // 2. PARALLEL BACKGROUND API FETCH for fast updates
      const [brokerResResult, dealsResResult] = await Promise.allSettled([
        getBrokerMyDeals(token),
        getDeals(token, 1, 50, companyId || null),
      ]);

      let fetchedDeals = [];

      if (brokerResResult.status === 'fulfilled' && brokerResResult.value?.success) {
        const brokerRes = brokerResResult.value;
        const rawList = Array.isArray(brokerRes.data)
          ? brokerRes.data
          : (brokerRes.data?.deals || brokerRes.data?.myDeals || []);

        const mapped = rawList.map(d => {
          const unitStr = d.products?.[0]?.unit ? ` ${d.products[0].unit}` : ' units';
          return {
            id: d.dealNumber || d._id || `SAUDA-${Math.floor(100 + Math.random() * 900)}`,
            _id: d._id || d.id,
            crop: d.products?.[0]?.productName || d.cropName || d.crop || d.notes || 'Agricultural Commodity',
            quantity: d.products?.[0]?.quantity ? `${d.products[0].quantity}${unitStr}` : (d.quantity || '100 units'),
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
        fetchedDeals = [...mapped];
      }

      if (dealsResResult.status === 'fulfilled' && dealsResResult.value?.success) {
        const res = dealsResResult.value;
        const rawDeals = Array.isArray(res.data) ? res.data : (res.data?.deals || []);
        const apiMapped = rawDeals.map(d => {
          const unitStr = d.products?.[0]?.unit ? ` ${d.products[0].unit}` : ' units';
          return {
            id: d.dealNumber || d._id,
            _id: d._id || d.id,
            crop: d.products?.[0]?.productName || d.cropName || d.crop || d.notes || 'Agricultural Commodity',
            quantity: d.products?.[0]?.quantity ? `${d.products[0].quantity}${unitStr}` : (d.quantity || '100 units'),
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

        apiMapped.forEach(item => {
          if (!fetchedDeals.some(f => (f.id && f.id === item.id) || (f._id && f._id === item._id))) {
            fetchedDeals.push(item);
          }
        });
      }

      // Merge local created broker deals + parallel API deals
      const combined = [...localDeals];
      fetchedDeals.forEach(fD => {
        if (!combined.some(c => (c.id && (c.id === fD.id || c.id === fD._id)) || (c._id && (c._id === fD.id || c._id === fD._id)))) {
          combined.push(fD);
        }
      });

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

  const companyFilteredDeals = deals.filter(deal => {
    // 1. Company Filter (If opened from a specific Broker Company)
    if (companyId || companyName) {
      const dCompId = extractCompanyId(deal);
      const dCompName = extractCompanyName(deal);

      const matchesId = Boolean(companyId && dCompId && String(dCompId) === String(companyId));
      const matchesName = Boolean(companyName && dCompName && String(dCompName).trim().toLowerCase() === String(companyName).trim().toLowerCase());

      if (matchesId || matchesName) {
        return true;
      } else if (!dCompId && !dCompName) {
        return true; // Unassigned/local deal fallback
      } else {
        return false;
      }
    }
    return true;
  });

  const filteredDeals = companyFilteredDeals.filter(deal => {
    // 2. Search query filter
    const matchesSearch =
      (deal.crop && deal.crop.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.buyer && deal.buyer.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.seller && deal.seller.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal.id && deal.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deal._id && deal._id.toLowerCase().includes(searchQuery.toLowerCase()));

    const statusLower = (deal.status || '').toLowerCase();
    if (activeTab === 'Confirmed') return matchesSearch && (statusLower === 'confirmed' || statusLower === 'approved');
    if (activeTab === 'Pending') return matchesSearch && statusLower.includes('pending');
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C4A6E" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('pop')}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.pageTitle} numberOfLines={1}>
            {companyName ? `${companyName} Saudas` : 'My Created Saudas'}
          </Text>
          {companyName ? (
            <Text style={{ fontSize: 11, color: '#BAE6FD', fontWeight: '600', marginTop: 1 }}>
              🏢 {companyName}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.85}
          onPress={() => onNavigate('CreateBrokerDeal', targetCompany ? { company: targetCompany } : undefined)}
        >
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop, buyer, seller or Sauda Ref..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {['All', 'Confirmed', 'Pending'].map((tab) => {
          const count = companyFilteredDeals.filter(d => {
            const sLower = (d.status || '').toLowerCase();
            if (tab === 'All') return true;
            if (tab === 'Confirmed') return sLower === 'confirmed' || sLower === 'approved';
            return sLower.includes('pending');
          }).length;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Created Deals ScrollView */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} tintColor="#0284C7" />}
      >
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 10 }}>Fetching Broker Saudas...</Text>
          </View>
        ) : filteredDeals.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Handshake size={38} color="#94A3B8" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No Broker Sauda Found</Text>
            <Text style={styles.emptySub}>Issue a real trade contract for buyers and sellers.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => onNavigate('CreateBrokerDeal')}>
              <Text style={styles.emptyBtnText}>+ Create Sauda Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredDeals.map((deal, idx) => {
            const isPending = deal.status && deal.status.toLowerCase().includes('pending');
            return (
              <TouchableOpacity
                key={deal.id || idx}
                style={styles.dealCard}
                activeOpacity={0.85}
                onPress={() => onNavigate('BrokerDealDetails', { dealId: deal._id || deal.id, deal })}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cropBadge}>
                    <Handshake size={14} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={styles.cropName}>{deal.crop || deal.productName}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isPending ? '#FEF3C7' : '#DCFCE7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isPending ? '#D97706' : '#15803D' },
                      ]}
                    >
                      {deal.status}
                    </Text>
                  </View>
                </View>

                {/* Parties Row */}
                <View style={styles.partyContainer}>
                  <View style={styles.partyBox}>
                    <Text style={styles.partyRole}>BUYER (खरीदार)</Text>
                    <Text style={styles.partyName} numberOfLines={1}>
                      {deal.buyer}
                    </Text>
                  </View>
                  <View style={styles.partyDivider} />
                  <View style={styles.partyBox}>
                    <Text style={styles.partyRole}>SELLER (विक्रेता)</Text>
                    <Text style={styles.partyName} numberOfLines={1}>
                      {deal.seller}
                    </Text>
                  </View>
                </View>

                {/* Grid Details */}
                <View style={styles.detailsGrid}>
                  <View>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailVal}>{deal.quantity}</Text>
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Agreed Rate</Text>
                    <Text style={[styles.detailVal, { color: '#0284C7' }]}>{deal.rate}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.detailLabel}>Brokerage Comm.</Text>
                    <Text style={[styles.detailVal, { color: '#0284C7', fontWeight: '800' }]}>
                      {deal.commission}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>Ref: {deal.id} • {deal.date}</Text>
                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailText}>View Contract</Text>
                    <ArrowRight size={14} color="#0284C7" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#3465EA',
    borderBottomWidth: 1,
    borderBottomColor: '#2554D7',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    marginLeft: 12,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pageSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.30)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
    elevation: 1,
    shadowColor: '#3B3CFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabItemActive: {
    backgroundColor: '#3465EA',
    borderColor: '#3465EA',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0C4A6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 16, textAlign: 'center' },
  emptyBtn: { backgroundColor: '#0284C7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0C4A6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cropName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  partyContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  partyBox: {
    flex: 1,
  },
  partyRole: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  partyDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
    marginRight: 4,
  },
});

export default BrokerCreatedDeals;
