import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
  Building2,
  User,
  Handshake,
  ChevronRight,
  Filter,
  RefreshCw,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAssistedRegistrationLink } from '../../../utils/WhatsAppService';

const MOCK_PENDING_QUEUE = [
  {
    id: 'SAUDA-912',
    commodity: 'Cotton Bales (Shankar 6)',
    quantity: '100 Bales',
    rate: '₹58,500 / candy',
    sellerName: 'Surat Ginning & Pressing Mill',
    sellerMobile: '9876543210',
    sellerStatus: 'Approved', // 'Approved', 'Pending', 'Rejected'
    buyerName: 'Nature Fresh Foods Pvt Ltd',
    buyerMobile: '9800000002',
    buyerStatus: 'Pending',
    dealStatus: 'Pending Verification',
    createdAt: 'Today, 11:20 AM',
  },
  {
    id: 'SAUDA-910',
    commodity: 'Desi Chana (Chickpeas)',
    quantity: '25 MT',
    rate: '₹6,420 / qtl',
    sellerName: 'MP Farmers Corp',
    sellerMobile: '9800000001',
    sellerStatus: 'Rejected',
    buyerName: 'Rajkot Agri Foods Pvt Ltd',
    buyerMobile: '9123456789',
    buyerStatus: 'Approved',
    dealStatus: 'Rejected by Owner',
    createdAt: 'Yesterday',
  },
];

const BrokerPendingQueue = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [queue, setQueue] = useState(MOCK_PENDING_QUEUE);

  const filteredQueue = queue.filter(item => {
    if (activeTab === 'WAITING_SELLER') return item.sellerStatus === 'Pending';
    if (activeTab === 'WAITING_BUYER') return item.buyerStatus === 'Pending';
    if (activeTab === 'REJECTED') return item.sellerStatus === 'Rejected' || item.buyerStatus === 'Rejected';
    if (activeTab === 'APPROVED') return item.sellerStatus === 'Approved' && item.buyerStatus === 'Approved';
    return true;
  });

  const handleResendInvite = (item, partyType) => {
    const isSeller = partyType === 'Seller';
    const link = generateAssistedRegistrationLink({
      partyType,
      ownerName: isSeller ? item.sellerName : item.buyerName,
      companyName: isSeller ? item.sellerName : item.buyerName,
      brokerName: 'Ramesh Sharma',
      brokerCompany: 'Ganesha Commodity Brokers',
      mobileNumber: isSeller ? item.sellerMobile : item.buyerMobile,
      dealRef: item.id,
    });
    Linking.openURL(link);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('pop')} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Owner Verification Queue</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'ALL' && styles.tabChipActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabChipText, activeTab === 'ALL' && styles.tabChipTextActive]}>
              All ({queue.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'WAITING_SELLER' && styles.tabChipActive]}
            onPress={() => setActiveTab('WAITING_SELLER')}
          >
            <Text style={[styles.tabChipText, activeTab === 'WAITING_SELLER' && styles.tabChipTextActive]}>
              🟡 Waiting Seller
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'WAITING_BUYER' && styles.tabChipActive]}
            onPress={() => setActiveTab('WAITING_BUYER')}
          >
            <Text style={[styles.tabChipText, activeTab === 'WAITING_BUYER' && styles.tabChipTextActive]}>
              🟡 Waiting Buyer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'REJECTED' && styles.tabChipActive]}
            onPress={() => setActiveTab('REJECTED')}
          >
            <Text style={[styles.tabChipText, activeTab === 'REJECTED' && styles.tabChipTextActive]}>
              🔴 Rejected
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'APPROVED' && styles.tabChipActive]}
            onPress={() => setActiveTab('APPROVED')}
          >
            <Text style={[styles.tabChipText, activeTab === 'APPROVED' && styles.tabChipTextActive]}>
              🟢 Both Approved
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Queue List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredQueue.length === 0 ? (
          <View style={styles.emptyBox}>
            <Clock size={40} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Deals in Queue</Text>
            <Text style={styles.emptySub}>No pending owner verification deals match this filter.</Text>
          </View>
        ) : (
          filteredQueue.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.dealIdBox}>
                  <Handshake size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                  <Text style={styles.dealIdText}>{item.id}</Text>
                </View>
                <Text style={styles.dateText}>{item.createdAt}</Text>
              </View>

              <Text style={styles.commodityText}>{item.commodity}</Text>
              <Text style={styles.qtyRateText}>{item.quantity} • {item.rate}</Text>

              {/* Dual Status Box */}
              <View style={styles.dualStatusBox}>
                <View style={styles.statusRowItem}>
                  <Text style={styles.partyRoleLabel}>SELLER:</Text>
                  <Text style={styles.partyNameText} numberOfLines={1}>{item.sellerName}</Text>
                  <View style={[
                    styles.badgePill,
                    { backgroundColor: item.sellerStatus === 'Approved' ? '#DCFCE7' : item.sellerStatus === 'Pending' ? '#FEF3C7' : '#FEF2F2' }
                  ]}>
                    <Text style={[
                      styles.badgePillText,
                      { color: item.sellerStatus === 'Approved' ? '#15803D' : item.sellerStatus === 'Pending' ? '#D97706' : '#DC2626' }
                    ]}>
                      {item.sellerStatus === 'Approved' ? '🟢 Verified' : item.sellerStatus === 'Pending' ? '🟡 Pending' : '🔴 Rejected'}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusRowItem}>
                  <Text style={styles.partyRoleLabel}>BUYER:</Text>
                  <Text style={styles.partyNameText} numberOfLines={1}>{item.buyerName}</Text>
                  <View style={[
                    styles.badgePill,
                    { backgroundColor: item.buyerStatus === 'Approved' ? '#DCFCE7' : item.buyerStatus === 'Pending' ? '#FEF3C7' : '#FEF2F2' }
                  ]}>
                    <Text style={[
                      styles.badgePillText,
                      { color: item.buyerStatus === 'Approved' ? '#15803D' : item.buyerStatus === 'Pending' ? '#D97706' : '#DC2626' }
                    ]}>
                      {item.buyerStatus === 'Approved' ? '🟢 Verified' : item.buyerStatus === 'Pending' ? '🟡 Pending' : '🔴 Rejected'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {item.sellerStatus === 'Pending' && (
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={() => handleResendInvite(item, 'Seller')}
                  >
                    <Share2 size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                    <Text style={styles.resendBtnText}>Resend Seller Invite</Text>
                  </TouchableOpacity>
                )}

                {item.buyerStatus === 'Pending' && (
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={() => handleResendInvite(item, 'Buyer')}
                  >
                    <Share2 size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                    <Text style={styles.resendBtnText}>Resend Buyer Invite</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.viewDealBtn}
                  onPress={() => onNavigate('DealDetails', { deal: item })}
                >
                  <Text style={styles.viewDealBtnText}>View Details</Text>
                  <ChevronRight size={14} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  tabsWrapper: { backgroundColor: '#FFFFFF', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsScroll: { paddingHorizontal: 20, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabChipActive: { backgroundColor: '#4F46E5' },
  tabChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabChipTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#475569', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#94A3B8' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dealIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dealIdText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
  dateText: { fontSize: 11, color: '#94A3B8' },
  commodityText: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  qtyRateText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 12 },
  dualStatusBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  statusRowItem: { flexDirection: 'row', alignItems: 'center' },
  partyRoleLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', width: 55 },
  partyNameText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1E293B', marginRight: 6 },
  badgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgePillText: { fontSize: 10, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', alignItems: 'center' },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resendBtnText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  viewDealBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6 },
  viewDealBtnText: { fontSize: 12, fontWeight: '700', color: '#475569', marginRight: 2 },
});

export default BrokerPendingQueue;
