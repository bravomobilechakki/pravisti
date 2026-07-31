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
import BrokerSuccessReceipt from '../../common/BrokerSuccessReceipt';
import { getBrokerPendingQueue, resendWhatsAppInvite, cancelBrokerOnboard } from '../../../services/api';
import { generateAssistedRegistrationLink } from '../../../utils/WhatsAppService';

const MOCK_PENDING_QUEUE = [
  {
    registrationId: '6a672bea44958e688fcf56b2',
    role: 'seller',
    status: 'pending',
    invitedMobile: '9876543210',
    targetUserName: 'Rahul Sharma',
    company: {
      id: '6a672bea44958e688fcf56ad',
      name: 'ABC Traders',
      address: { street: '123 Metal Lane', city: 'Mumbai', state: 'Maharashtra' },
      registrationNumber: '27ABCDE1234F1Z5',
      description: 'Dealers in high-grade aluminium ingots',
    },
    deals: [],
    createdAt: '2026-07-27T09:59:06.636Z',
  },
  {
    registrationId: '6a6459d1db25d9655acfeaca',
    role: 'buyer',
    status: 'approved',
    invitedMobile: '8949056321',
    targetUserName: 'Monu didi',
    company: {
      id: '6a6459d1db25d9655acfeac7',
      name: 'Microsoft',
      address: { street: 'Jaipur Rajasthan', city: 'Jaipur', state: 'Rajasthan' },
      registrationNumber: 'GSRTY_355364564',
    },
    deals: [
      {
        _id: '6a645a5adb25d9655acfeb13',
        dealNumber: 'DEAL-0001',
        status: 'pending',
        createdAt: '2026-07-25T06:40:26.227Z',
      },
    ],
    createdAt: '2026-07-25T06:38:09.690Z',
  },
];

const BrokerPendingQueue = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successReceipt, setSuccessReceipt] = useState({ visible: false });

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await getBrokerPendingQueue(token);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setQueue(res.data);
      } else {
        setQueue(MOCK_PENDING_QUEUE);
      }
    } catch (err) {
      setQueue(MOCK_PENDING_QUEUE);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const filteredQueue = queue.filter(item => {
    if (activeTab === 'WAITING_SELLER') return item.role === 'seller' && item.status === 'pending';
    if (activeTab === 'WAITING_BUYER') return item.role === 'buyer' && item.status === 'pending';
    if (activeTab === 'REJECTED') return item.status === 'rejected';
    if (activeTab === 'APPROVED') return item.status === 'approved';
    return true;
  });

  const handleResendInvite = async (item) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (item.registrationId) {
        await resendWhatsAppInvite(item.registrationId, token);
      }
    } catch (e) {
      console.warn('API resend failed, opening native link fallback:', e);
    }
    const link = generateAssistedRegistrationLink({
      partyType: item.role === 'seller' ? 'Seller' : 'Buyer',
      ownerName: item.targetUserName,
      companyName: item.company?.name || item.targetUserName,
      brokerName: 'Ramesh Sharma',
      brokerCompany: 'Ganesha Commodity Brokers',
      mobileNumber: item.invitedMobile,
      dealRef: item.deals && item.deals[0] ? item.deals[0].dealNumber : item.registrationId,
    });
    Linking.openURL(link);
  };

  const handleCancelOnboard = async (item) => {
    Alert.alert(
      'Cancel Registration',
      `Are you sure you want to cancel the registration for ${item.company?.name || item.targetUserName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const regId = item.registrationId || item._id;
              if (regId) {
                await cancelBrokerOnboard(regId, token);
                setSuccessReceipt({
                  visible: true,
                  actionType: 'dealDeclined',
                  title: 'Registration Cancelled',
                  message: `Registration for ${item.company?.name || item.targetUserName} has been cancelled.`,
                  referenceId: regId,
                  details: [
                    { label: 'Target Party', value: item.targetUserName || 'N/A' },
                    { label: 'Firm Name', value: item.company?.name || 'N/A' },
                    { label: 'Role', value: item.role ? item.role.toUpperCase() : 'N/A' },
                  ],
                });
                fetchQueue();
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to cancel registration');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3465EA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('pop')} style={styles.backBtn}>
          <ArrowLeft size={20} color="#FFFFFF" />
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
          filteredQueue.map(item => {
            const regId = item.registrationId || item.id || 'REG-001';
            const roleName = (item.role || 'seller').toUpperCase();
            const partyName = item.company?.name || item.targetUserName || item.sellerName || 'Target Business';
            const mobileNo = item.invitedMobile || item.sellerMobile || item.buyerMobile || 'Mobile';
            const statusVal = (item.status || item.sellerStatus || 'pending').toLowerCase();

            const isApproved = statusVal === 'approved';
            const isRejected = statusVal === 'rejected';

            const dealNumber = item.deals && item.deals[0] ? item.deals[0].dealNumber : (item.id || 'ONBOARD-QUEUE');

            return (
              <View key={regId} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.dealIdBox}>
                    <Handshake size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                    <Text style={styles.dealIdText}>{dealNumber}</Text>
                  </View>
                  <Text style={styles.dateText}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}
                  </Text>
                </View>

                <Text style={styles.commodityText}>{partyName}</Text>
                <Text style={styles.qtyRateText}>
                  Owner: {item.targetUserName || partyName} • +91 {mobileNo}
                  {item.company?.registrationNumber ? ` • GST: ${item.company.registrationNumber}` : ''}
                  {item.company?.address?.city ? ` • ${item.company.address.city}` : ''}
                </Text>

                {/* Dual Status Box */}
                <View style={styles.dualStatusBox}>
                  <View style={styles.statusRowItem}>
                    <Text style={styles.partyRoleLabel}>{roleName}:</Text>
                    <Text style={styles.partyNameText} numberOfLines={1}>{partyName}</Text>
                    <View style={[
                      styles.badgePill,
                      { backgroundColor: isApproved ? '#DCFCE7' : isRejected ? '#FEF2F2' : '#FEF3C7' }
                    ]}>
                      <Text style={[
                        styles.badgePillText,
                        { color: isApproved ? '#15803D' : isRejected ? '#DC2626' : '#D97706' }
                      ]}>
                        {isApproved ? '🟢 Approved' : isRejected ? '🔴 Rejected' : '🟡 Pending Owner Sign'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  {!isApproved && !isRejected && (
                    <>
                      <TouchableOpacity
                        style={styles.resendBtn}
                        onPress={() => handleResendInvite(item)}
                      >
                        <Share2 size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                        <Text style={styles.resendBtnText}>Resend Invite</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.resendBtn, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleCancelOnboard(item)}
                      >
                        <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />
                        <Text style={[styles.resendBtnText, { color: '#DC2626' }]}>Cancel</Text>
                      </TouchableOpacity>
                    </>
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
            );
          })
        )}
      </ScrollView>

      <BrokerSuccessReceipt
        visible={successReceipt.visible}
        actionType={successReceipt.actionType || 'dealDeclined'}
        title={successReceipt.title}
        message={successReceipt.message}
        referenceId={successReceipt.referenceId}
        details={successReceipt.details}
        onDone={() => setSuccessReceipt({ visible: false })}
        onClose={() => setSuccessReceipt({ visible: false })}
      />
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
    backgroundColor: '#3465EA',
    borderBottomWidth: 1,
    borderBottomColor: '#2554D7',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 18 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  tabsWrapper: { backgroundColor: '#FFFFFF', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsScroll: { paddingHorizontal: 20, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabChipActive: { backgroundColor: '#3465EA' },
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
