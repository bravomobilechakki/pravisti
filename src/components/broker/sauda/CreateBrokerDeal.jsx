import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Plus,
  Building2,
  User,
  Handshake,
  Box,
  DollarSign,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Share2,
  Clock,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDeal, getUserProfile } from '../../../services/api';
import { generateAssistedRegistrationLink } from '../../../utils/WhatsAppService';
import BrokerAssistedOnboardingModal from './BrokerAssistedOnboardingModal';

const CreateBrokerDeal = ({ onNavigate, routeData }) => {
  const [currentUser, setCurrentUser] = useState(routeData?.user || null);
  const [isLoading, setIsLoading] = useState(false);

  // Seller State
  const [sellerMobile, setSellerMobile] = useState('');
  const [sellerParty, setSellerParty] = useState(null); // { user, company, products, isAssisted }
  const [sellerStatus, setSellerStatus] = useState('Pending'); // 'Approved' or 'Pending'

  // Buyer State
  const [buyerMobile, setBuyerMobile] = useState('');
  const [buyerParty, setBuyerParty] = useState(null); // { user, company, isAssisted }
  const [buyerStatus, setBuyerStatus] = useState('Pending'); // 'Approved' or 'Pending'

  // Deal Terms State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Bales (170kg)');
  const [rate, setRate] = useState('');
  const [commissionRate, setCommissionRate] = useState('1.0');
  const [paymentTerms, setPaymentTerms] = useState('7 Days Credit');
  const [deliveryLocation, setDeliveryLocation] = useState('Surat Ginning Mandi');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [onboardingPartyType, setOnboardingPartyType] = useState('Seller');

  useEffect(() => {
    const fetchBrokerProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const res = await getUserProfile(token);
          if (res && res.success) setCurrentUser(res.data);
        }
      } catch (err) {
        console.warn('Error fetching broker profile:', err);
      }
    };
    fetchBrokerProfile();
  }, []);

  // Search Seller Mock/API
  const handleSearchSeller = () => {
    if (sellerMobile.length !== 10) {
      Alert.alert('Search Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    // Simulate search
    if (sellerMobile === '9876543210') {
      setSellerParty({
        user: { name: 'Surat Ginning Corp', mobileNumber: sellerMobile },
        company: { companyName: 'Surat Ginning & Pressing Mill', address: 'Surat, Gujarat' },
        products: [{ name: 'Cotton Shankar 6' }, { name: 'Cotton Bales' }],
        isAssisted: false,
      });
      setSellerStatus('Approved');
    } else {
      Alert.alert(
        'Seller Not Registered',
        `No registered Seller found for mobile +91 ${sellerMobile}. Would you like to create a temporary business account for this Seller?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Seller Business',
            onPress: () => {
              setOnboardingPartyType('Seller');
              setModalVisible(true);
            },
          },
        ]
      );
    }
  };

  // Search Buyer Mock/API
  const handleSearchBuyer = () => {
    if (buyerMobile.length !== 10) {
      Alert.alert('Search Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    if (buyerMobile === '9123456789') {
      setBuyerParty({
        user: { name: 'Vardhman Mills', mobileNumber: buyerMobile },
        company: { companyName: 'Vardhman Textiles Ltd', address: 'Ludhiana, Punjab' },
        isAssisted: false,
      });
      setBuyerStatus('Approved');
    } else {
      Alert.alert(
        'Buyer Not Registered',
        `No registered Buyer found for mobile +91 ${buyerMobile}. Would you like to create a temporary business account for this Buyer?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Buyer Business',
            onPress: () => {
              setOnboardingPartyType('Buyer');
              setModalVisible(true);
            },
          },
        ]
      );
    }
  };

  const handleAssistedOnboardingSuccess = (data) => {
    if (onboardingPartyType === 'Seller') {
      setSellerParty({
        user: data.user,
        company: data.company,
        products: data.products || [],
        isAssisted: true,
      });
      setSellerStatus('Pending');
      if (data.products && data.products.length > 0) {
        setSelectedProduct(data.products[0].name);
      }
    } else {
      setBuyerParty({
        user: data.user,
        company: data.company,
        isAssisted: true,
      });
      setBuyerStatus('Pending');
    }
  };

  const handleCreateSauda = async () => {
    if (!sellerParty) {
      Alert.alert('Validation Error', 'Please select or create Seller Business');
      return;
    }
    if (!buyerParty) {
      Alert.alert('Validation Error', 'Please select or create Buyer Business');
      return;
    }
    if (!selectedProduct) {
      Alert.alert('Validation Error', 'Please select or enter Commodity Product');
      return;
    }
    if (!quantity || !rate) {
      Alert.alert('Validation Error', 'Please enter Quantity and Rate');
      return;
    }

    setIsLoading(true);
    try {
      const dealRef = 'SAUDA-' + Math.floor(100 + Math.random() * 900);
      const dealPayload = {
        dealRef,
        sellerCompanyId: sellerParty.company._id || sellerParty.company.companyName,
        sellerName: sellerParty.company.companyName,
        buyerCompanyId: buyerParty.company._id || buyerParty.company.companyName,
        buyerName: buyerParty.company.companyName,
        productName: selectedProduct,
        quantity: `${quantity} ${unit}`,
        rate: `₹${rate}`,
        commissionRate: `${commissionRate}%`,
        paymentTerms,
        deliveryLocation,
        // Dual Status Tracking
        accountVerificationStatus: {
          seller: sellerStatus,
          buyer: buyerStatus,
        },
        dealStatus: 'Draft',
        // Audit Metadata
        createdByBroker: true,
        brokerUserId: currentUser?._id || 'BROKER-CURR',
        brokerName: currentUser?.name || 'Ramesh Sharma',
        brokerCompany: currentUser?.company || 'Ganesha Commodity Brokers',
      };

      const res = await createDeal(dealPayload);

      // Prepare WhatsApp invite if any party is unverified/assisted
      const isUnverified = sellerStatus === 'Pending' || buyerStatus === 'Pending';
      const unverifiedParty = sellerStatus === 'Pending' ? sellerParty : buyerParty;

      Alert.alert(
        'Sauda Chitti Issued! 🎉',
        `Sauda ${dealRef} created successfully.${isUnverified ? ' WhatsApp invitation links are ready to send to unverified parties.' : ''}`,
        [
          {
            text: 'View Pending Queue',
            onPress: () => onNavigate('BrokerPendingQueue'),
          },
          {
            text: 'Share WhatsApp Invite',
            onPress: () => {
              if (unverifiedParty) {
                const link = generateAssistedRegistrationLink({
                  partyType: sellerStatus === 'Pending' ? 'Seller' : 'Buyer',
                  ownerName: unverifiedParty.user.name,
                  companyName: unverifiedParty.company.companyName,
                  brokerName: currentUser?.name || 'Ramesh Sharma',
                  brokerCompany: currentUser?.company || 'Ganesha Commodity Brokers',
                  mobileNumber: unverifiedParty.user.mobileNumber,
                  dealRef,
                });
                Linking.openURL(link);
              }
              onNavigate('BrokerDashboard');
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create sauda deal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => onNavigate('pop')} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Broker Sauda Chitti</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerBox}>
          <ShieldCheck size={20} color="#4F46E5" style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>
            Issue digital sauda contracts even for unregistered buyers & sellers.
          </Text>
        </View>

        {/* ─── 1. SELLER SELECTION SECTION ─── */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <Building2 size={20} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>1. Select Seller Business (Supplier)</Text>
          </View>

          {!sellerParty ? (
            <View>
              <Text style={styles.inputLabel}>Enter Seller Mobile Number</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter 10-digit mobile"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={sellerMobile}
                  onChangeText={setSellerMobile}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSeller}>
                  <Search size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.createBusinessBtn}
                onPress={() => {
                  setOnboardingPartyType('Seller');
                  setModalVisible(true);
                }}
              >
                <Plus size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                <Text style={styles.createBusinessBtnText}>Create Unregistered Seller Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectedPartyBox}>
              <View style={styles.partyTop}>
                <Text style={styles.partyName}>{sellerParty.company.companyName}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: sellerStatus === 'Approved' ? '#DCFCE7' : '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: sellerStatus === 'Approved' ? '#15803D' : '#D97706' },
                    ]}
                  >
                    {sellerStatus === 'Approved' ? '🟢 Verified' : '🟡 Pending Owner Sign'}
                  </Text>
                </View>
              </View>

              <Text style={styles.partySub}>
                Owner: {sellerParty.user.name} (+91 {sellerParty.user.mobileNumber})
              </Text>
              <Text style={styles.partyAddr}>{sellerParty.company.address}</Text>

              <TouchableOpacity onPress={() => setSellerParty(null)} style={styles.changePartyBtn}>
                <Text style={styles.changePartyText}>Change Seller</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── 2. BUYER SELECTION SECTION ─── */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <User size={20} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>2. Select Buyer Business (Client)</Text>
          </View>

          {!buyerParty ? (
            <View>
              <Text style={styles.inputLabel}>Enter Buyer Mobile Number</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter 10-digit mobile"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={buyerMobile}
                  onChangeText={setBuyerMobile}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearchBuyer}>
                  <Search size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.createBusinessBtn}
                onPress={() => {
                  setOnboardingPartyType('Buyer');
                  setModalVisible(true);
                }}
              >
                <Plus size={16} color="#4F46E5" style={{ marginRight: 6 }} />
                <Text style={styles.createBusinessBtnText}>Create Unregistered Buyer Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectedPartyBox}>
              <View style={styles.partyTop}>
                <Text style={styles.partyName}>{buyerParty.company.companyName}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: buyerStatus === 'Approved' ? '#DCFCE7' : '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: buyerStatus === 'Approved' ? '#15803D' : '#D97706' },
                    ]}
                  >
                    {buyerStatus === 'Approved' ? '🟢 Verified' : '🟡 Pending Owner Sign'}
                  </Text>
                </View>
              </View>

              <Text style={styles.partySub}>
                Owner: {buyerParty.user.name} (+91 {buyerParty.user.mobileNumber})
              </Text>
              <Text style={styles.partyAddr}>{buyerParty.company.address}</Text>

              <TouchableOpacity onPress={() => setBuyerParty(null)} style={styles.changePartyBtn}>
                <Text style={styles.changePartyText}>Change Buyer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── 3. SAUDA CONTRACT TERMS ─── */}
        <View style={styles.cardSection}>
          <Text style={styles.cardTitle}>3. Commodity & Contract Terms</Text>

          <Text style={styles.inputLabel}>Commodity / Product Name *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Cotton Shankar 6 Bales / Desi Chana"
            value={selectedProduct}
            onChangeText={setSelectedProduct}
          />

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Quantity *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 100"
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Agreed Rate (₹) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 58500"
                keyboardType="number-pad"
                value={rate}
                onChangeText={setRate}
              />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Broker Commission (%)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1.0"
                keyboardType="decimal-pad"
                value={commissionRate}
                onChangeText={setCommissionRate}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Payment Terms</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 7 Days Credit"
                value={paymentTerms}
                onChangeText={setPaymentTerms}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Delivery Location / Mandi</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Surat Ginning Mandi"
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
          />

          <TouchableOpacity style={styles.issueSaudaBtn} onPress={handleCreateSauda} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Handshake size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.issueSaudaBtnText}>Issue Digital Sauda Chitti</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Assisted Onboarding Modal */}
      <BrokerAssistedOnboardingModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        partyType={onboardingPartyType}
        mobileNumber={onboardingPartyType === 'Seller' ? sellerMobile : buyerMobile}
        brokerUser={currentUser}
        onSuccess={handleAssistedOnboardingSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: {
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  bannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  bannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#3730A3', lineHeight: 18 },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 10 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBusinessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  createBusinessBtnText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  selectedPartyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  partyName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  partySub: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  partyAddr: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  changePartyBtn: { marginTop: 10, alignSelf: 'flex-start' },
  changePartyText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  twoColRow: { flexDirection: 'row', gap: 12 },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  issueSaudaBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  issueSaudaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

export default CreateBrokerDeal;
