import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Share2,
  Building2,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  MapPin,
  FileText,
  Phone,
  Briefcase,
  UserCheck,
  Lock,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { getDealDetails, acceptDeal, rejectDeal } from '../../../services/api';

const BrokerDealDetails = ({ onNavigate, routeData }) => {
  const passedDeal = routeData?.deal || {};
  const dealId = routeData?.dealId || passedDeal._id || passedDeal.id;

  const [deal, setDeal] = useState(passedDeal);
  const [isLoading, setIsLoading] = useState(!routeData?.deal);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      // Validate MongoDB ObjectId (24 hex characters)
      const isValidObjectId = typeof dealId === 'string' && /^[0-9a-fA-F]{24}$/.test(dealId);
      if (isValidObjectId) {
        try {
          const res = await getDealDetails(dealId, token);
          if (res && res.success && res.data) {
            setDeal(res.data);
          }
        } catch (apiErr) {
          console.warn('API fetch fail, using routeData fallback:', apiErr);
        }
      }
    } catch (err) {
      console.warn('Error fetching broker deal details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [dealId]);

  const handleApprove = async () => {
    try {
      setIsActionLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await acceptDeal(dealId, token);
      if (res && res.success) {
        await fetchDetails();
      }
    } catch (err) {
      console.warn('Error approving deal:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsActionLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await rejectDeal(dealId, 'Rejected from Broker details', token);
      if (res && res.success) {
        await fetchDetails();
      }
    } catch (err) {
      console.warn('Error rejecting deal:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleShareSauda = async () => {
    try {
      const saudaNo = deal.dealNumber || deal.id || `SAUDA-CONTRACT`;
      const crop = deal.crop || deal.products?.[0]?.productName || 'Agricultural Commodity';
      const qty = deal.quantity || `${deal.products?.[0]?.quantity || 100} units`;
      const rate = deal.rate || `₹${deal.products?.[0]?.price || '60,000'}`;
      const buyer = deal.buyer || deal.buyerCompany?.name || 'Buyer Business';
      const seller = deal.seller || deal.sellerCompany?.name || 'Seller Business';

      await Share.share({
        message: `OFFICIAL SAUDA CONTRACT\nContract No: ${saudaNo}\n\nCommodity: ${crop}\nQuantity: ${qty}\nRate: ${rate}\n\nSeller: ${seller}\nBuyer: ${buyer}\n\nIssued via Pravisti B2B Broker Platform.`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading Sauda Contract Details...</Text>
      </SafeAreaView>
    );
  }

  const parseNum = (strOrNum) => {
    if (typeof strOrNum === 'number') return strOrNum;
    if (!strOrNum) return 0;
    const cleaned = String(strOrNum).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const saudaNo = deal.dealNumber || deal.id || `SAUDA-${Math.floor(1000 + Math.random() * 9000)}`;
  const cropName = deal.crop || deal.productName || deal.products?.[0]?.productName || deal.notes || 'Agricultural Commodity';
  const quantity = deal.quantity || (deal.products?.[0]?.quantity ? `${deal.products[0].quantity} Quintal` : '—');
  const rate = deal.rate || (deal.products?.[0]?.price ? `₹${parseFloat(deal.products[0].price).toLocaleString('en-IN')}` : '—');

  // Extract or calculate total contract value
  const rawTotal = deal.totalAmount || deal.totalValue || deal.totalPrice || deal.products?.[0]?.totalPrice;
  let numericTotal = parseNum(rawTotal);

  if (!numericTotal) {
    const qNum = parseNum(deal.quantity || deal.products?.[0]?.quantity);
    const rNum = parseNum(deal.rate || deal.products?.[0]?.price);
    if (qNum > 0 && rNum > 0) {
      numericTotal = qNum * rNum;
    }
  }

  const totalVal = numericTotal > 0
    ? `₹${numericTotal.toLocaleString('en-IN')}`
    : (deal.totalAmount || deal.totalValue || '—');

  const rawCommission = deal.commission || deal.brokerage || deal.brokerageAmount;
  let numericCommission = parseNum(rawCommission);
  if (!numericCommission && numericTotal > 0) {
    const ratePerc = parseNum(deal.brokerageRate || deal.brokeragePercent) || 1;
    numericCommission = Math.round((numericTotal * ratePerc) / 100);
  }

  const commission = numericCommission > 0
    ? `₹${numericCommission.toLocaleString('en-IN')}`
    : (deal.commission || '—');

  const status = deal.status ? (deal.status.charAt(0).toUpperCase() + deal.status.slice(1)) : 'Confirmed';
  const dateStr = deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (deal.date || 'Today');
  const mandi = deal.mandi || deal.mandiName || deal.city || deal.buyerCompany?.city || 'APMC Mandi Yard';

  // Seller details
  const sellerCo = deal.sellerCompany || {};
  const sellerName = deal.seller || sellerCo.name || sellerCo.companyName || sellerCo.firmName || 'Seller Business';
  const sellerGST = sellerCo.gstNumber || sellerCo.gstin || sellerCo.gst;
  const sellerCity = sellerCo.city || sellerCo.address?.city || sellerCo.location;
  const sellerPhone = sellerCo.phone || sellerCo.mobile || sellerCo.contact;

  // Buyer details
  const buyerCo = deal.buyerCompany || {};
  const buyerName = deal.buyer || buyerCo.name || buyerCo.companyName || buyerCo.firmName || 'Buyer Business';
  const buyerGST = buyerCo.gstNumber || buyerCo.gstin || buyerCo.gst;
  const buyerCity = buyerCo.city || buyerCo.address?.city || buyerCo.location;
  const buyerPhone = buyerCo.phone || buyerCo.mobile || buyerCo.contact;

  const isConfirmed = status.toLowerCase().includes('confirm') || status.toLowerCase().includes('active');

  const sellerStatusStr = (deal.sellerStatus || deal.sellerVerificationStatus || sellerCo.status || '').toLowerCase();
  const buyerStatusStr = (deal.buyerStatus || deal.buyerVerificationStatus || buyerCo.status || '').toLowerCase();
  const dealStatusStr = (deal.status || '').toLowerCase();

  const isSellerVerified = sellerStatusStr === 'verified' || sellerStatusStr === 'approved' || sellerStatusStr === 'confirmed' || sellerCo.isVerified === true || deal.sellerVerified === true;
  const isBuyerVerified = buyerStatusStr === 'verified' || buyerStatusStr === 'approved' || buyerStatusStr === 'confirmed' || buyerCo.isVerified === true || deal.buyerVerified === true;

  const isBothVerified = isConfirmed || (isSellerVerified && isBuyerVerified) || (!sellerStatusStr && !buyerStatusStr && dealStatusStr !== 'pending' && dealStatusStr !== 'pending sign');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sticky Responsive Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 8 }}>
          <View style={styles.headerTitleRow}>
            <FileText size={15} color="#4F46E5" style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Sauda Contract Details</Text>
          </View>
          <Text style={styles.headerSubtitle}>{saudaNo}</Text>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShareSauda} activeOpacity={0.8}>
          <Share2 size={18} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Header Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroContractBox}>
              <FileText size={14} color="#818CF8" style={{ marginRight: 5 }} />
              <Text style={styles.heroContractNo}>{saudaNo}</Text>
            </View>
            <View style={[styles.statusBadge, isConfirmed ? styles.statusConfirmed : styles.statusPending]}>
              {isConfirmed ? (
                <CheckCircle2 size={12} color="#4ADE80" style={{ marginRight: 4 }} />
              ) : (
                <Clock size={12} color="#FBBF24" style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.statusBadgeText, isConfirmed ? styles.statusConfirmedText : styles.statusPendingText]}>
                {status}
              </Text>
            </View>
          </View>

          <Text style={styles.heroCropName} numberOfLines={2}>{cropName}</Text>
          <Text style={styles.heroMandiText}>Issued at {mandi} • {dateStr}</Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroMetricsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroMetricLabel}>Total Contract Value</Text>
              <Text style={styles.heroMetricVal} numberOfLines={1}>{totalVal}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.heroMetricLabel}>Brokerage Earned</Text>
              <Text style={[styles.heroMetricVal, { color: '#4ADE80' }]} numberOfLines={1}>{commission}</Text>
            </View>
          </View>
        </View>

        {/* Counterparty Trading Businesses */}
        <View style={styles.partiesCard}>
          <View style={styles.sectionTitleRow}>
            <Building2 size={16} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.cardSectionTitle}>Matched Counterparties</Text>
          </View>

          {/* Seller Box */}
          <View style={styles.partyBox}>
            <View style={styles.partyHeaderRow}>
              <View style={[styles.partyRoleTag, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.partyRoleText, { color: '#15803D' }]}>SELLER / VENDOR</Text>
              </View>
              <ShieldCheck size={14} color="#16A34A" />
            </View>
            <Text style={styles.partyName}>{sellerName}</Text>
            {sellerCity ? (
              <View style={styles.partyDetailRow}>
                <MapPin size={11} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.partyDetailText}>{sellerCity}</Text>
              </View>
            ) : null}
            {sellerGST ? (
              <View style={styles.partyDetailRow}>
                <FileText size={11} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.partyDetailText}>GST: {sellerGST}</Text>
              </View>
            ) : null}
            {sellerPhone ? (
              <View style={styles.partyDetailRow}>
                <Phone size={11} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.partyDetailText}>{sellerPhone}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.partyDividerLine} />

          {/* Buyer Box */}
          <View style={styles.partyBox}>
            <View style={styles.partyHeaderRow}>
              <View style={[styles.partyRoleTag, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.partyRoleText, { color: '#4F46E5' }]}>BUYER / PURCHASER</Text>
              </View>
              <ShieldCheck size={14} color="#4F46E5" />
            </View>
            <Text style={styles.partyName}>{buyerName}</Text>
            {buyerCity ? (
              <View style={styles.partyDetailRow}>
                <MapPin size={11} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.partyDetailText}>{buyerCity}</Text>
              </View>
            ) : null}
            {buyerGST ? (
              <View style={styles.partyDetailRow}>
                <FileText size={11} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.partyDetailText}>GST: {buyerGST}</Text>
              </View>
            ) : null}
            {buyerPhone ? (
              <View style={styles.partyDetailRow}>
                <Phone size={11} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.partyDetailText}>{buyerPhone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Commodity & Contract Specs */}
        <View style={styles.detailsCard}>
          <View style={styles.sectionTitleRow}>
            <Briefcase size={16} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.cardSectionTitle}>Sauda Contract Terms</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Commodity Crop</Text>
            <Text style={styles.infoVal}>{cropName}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quantity Matched</Text>
            <Text style={styles.infoVal}>{quantity}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contract Rate</Text>
            <Text style={styles.infoVal}>{rate}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Trade Amount</Text>
            <Text style={[styles.infoVal, { color: '#4F46E5' }]}>{totalVal}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Brokerage Earned</Text>
            <Text style={[styles.infoVal, { color: '#16A34A' }]}>{commission}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Yard</Text>
            <Text style={styles.infoVal}>{mandi}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 12, marginTop: 4 }}>
          {isBothVerified ? (
            <TouchableOpacity
              style={styles.chatBtn}
              activeOpacity={0.88}
              onPress={() => onNavigate('DealChat', { dealId, deal })}
            >
              <MessageSquare size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.chatBtnText}>Open Deal Chat Window</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.chatLockedBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Lock size={16} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.chatLockedTitle}>Chat Locked — Verification Pending</Text>
              </View>
              <Text style={styles.chatLockedSubText}>
                Chat window will unlock once both Seller ({sellerName}) and Buyer ({buyerName}) verify their accounts & deals on Pravisti.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.shareFullBtn}
            activeOpacity={0.88}
            onPress={handleShareSauda}
          >
            <Share2 size={18} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.shareFullBtnText}>Share Official Contract PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── HEADER STYLES ──
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },

  // ── SCROLL CONTENT ──
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 54,
    gap: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  // ── HERO CARD ──
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 20,
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroContractBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroContractNo: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E0E7FF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
  },
  statusConfirmedText: {
    color: '#4ADE80',
  },
  statusPending: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
  },
  statusPendingText: {
    color: '#FBBF24',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroCropName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroMandiText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    fontWeight: '500',
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroMetricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  heroMetricVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // ── PARTIES CARD ──
  partiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EFFE',
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  partyBox: {
    paddingVertical: 4,
  },
  partyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  partyRoleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  partyRoleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  partyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  partyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  partyDetailText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  partyDividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },

  // ── DETAILS CARD ──
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EFFE',
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
    maxWidth: '55%',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // ── ACTION BUTTONS ──
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    height: 54,
    elevation: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chatBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  shareFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 16,
    height: 54,
  },
  shareFullBtnText: {
    color: '#4F46E5',
    fontSize: 15,
    fontWeight: '800',
  },
  chatLockedBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
  },
  chatLockedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  chatLockedSubText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
    fontWeight: '500',
  },
});

export default BrokerDealDetails;
