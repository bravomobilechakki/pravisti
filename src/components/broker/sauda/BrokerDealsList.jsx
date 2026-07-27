import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import {
  Handshake,
  Plus,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import Navbar from '../../navbar/navbar';

const DEMO_BROKER_DEALS = [
  {
    id: 'DEAL-901',
    crop: 'Cotton Bales (Shankar 6)',
    quantity: '100 Bales (170kg each)',
    rate: '₹58,500 / candy',
    buyer: 'Vardhman Textiles Ltd',
    seller: 'Surat Ginning & Pressing Mill',
    status: 'Confirmed',
    date: '27 Jul 2026',
    commission: '₹11,700',
  },
  {
    id: 'DEAL-899',
    crop: 'Desi Chana (Chickpeas)',
    quantity: '25 Metric Tonnes',
    rate: '₹6,400 / quintal',
    buyer: 'Rajkot Agri Foods Pvt Ltd',
    seller: 'Indore Processing Industries',
    status: 'In Transit',
    date: '26 Jul 2026',
    commission: '₹16,000',
  },
  {
    id: 'DEAL-894',
    crop: 'Soya Doc / Meal',
    quantity: '50 Metric Tonnes',
    rate: '₹38,200 / MT',
    buyer: 'National Feed Mills',
    seller: 'Dewas Solvent Extraction',
    status: 'Pending Buyer Sign',
    date: '25 Jul 2026',
    commission: '₹19,100',
  },
];

const BrokerDealsList = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeals = DEMO_BROKER_DEALS.filter(deal => {
    const matchesSearch =
      deal.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'Confirmed') return matchesSearch && deal.status === 'Confirmed';
    if (activeTab === 'Pending') return matchesSearch && deal.status.toLowerCase().includes('pending');
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Navbar onNavigate={onNavigate} user={routeData?.user} />

      {/* Action Header Bar */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.pageTitle}>Broker Sauda Ledger 🤝</Text>
          <Text style={styles.pageSubtitle}>Manage and issue sauda chitti contracts</Text>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.85}
          onPress={() => onNavigate('CreateBrokerDeal')}
        >
          <Plus size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>New Sauda</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop, buyer or seller..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {['All', 'Confirmed', 'Pending'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab} Saudas
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Deals List */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {filteredDeals.map((deal) => {
          const isPending = deal.status.toLowerCase().includes('pending');
          return (
            <TouchableOpacity
              key={deal.id}
              style={styles.dealCard}
              activeOpacity={0.85}
              onPress={() => onNavigate('DealDetails', { dealId: deal.id, deal })}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.cropBadge}>
                  <Handshake size={14} color="#4F46E5" style={{ marginRight: 6 }} />
                  <Text style={styles.cropName}>{deal.crop}</Text>
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

              {/* Counterparty Information */}
              <View style={styles.partyContainer}>
                <View style={styles.partyBox}>
                  <Text style={styles.partyRole}>BUYER</Text>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {deal.buyer}
                  </Text>
                </View>
                <View style={styles.partyDivider} />
                <View style={styles.partyBox}>
                  <Text style={styles.partyRole}>SELLER</Text>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {deal.seller}
                  </Text>
                </View>
              </View>

              {/* Deal Details Row */}
              <View style={styles.detailsGrid}>
                <View>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailVal}>{deal.quantity}</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>Rate</Text>
                  <Text style={styles.detailVal}>{deal.rate}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailLabel}>Brokerage</Text>
                  <Text style={[styles.detailVal, { color: '#4F46E5', fontWeight: '800' }]}>
                    {deal.commission}
                  </Text>
                </View>
              </View>

              {/* Footer Row */}
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>Dated: {deal.date}</Text>
                <View style={styles.viewDetailRow}>
                  <Text style={styles.viewDetailText}>View Chitti</Text>
                  <ArrowRight size={14} color="#4F46E5" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 2,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 20,
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
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  tabItemActive: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cropName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#312E81',
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
    color: '#1E293B',
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
    color: '#4F46E5',
    marginRight: 4,
  },
});

export default BrokerDealsList;
