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
  Linking,
  Image,
  Alert,
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
  Lock,
  CheckCircle,
  XCircle,
  Package,
  Receipt,
  Tag,
  UserCheck,
  AlertCircle,
  Info,
  User,
  Check,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import {
  getDealDetails,
  acceptDeal,
  rejectDeal,
  completeBrokerDraftDeal,
  recreateExpiredDeal,
  deleteDeal,
} from '../../../services/api';
import Footer from '../../footer/footer';

const BrokerDealDetails = ({ onNavigate, routeData }) => {
  const passedDeal = routeData?.deal || {};
  const dealId = routeData?.dealId || passedDeal._id || passedDeal.id;
  const hasPassedData = Boolean(passedDeal && (passedDeal._id || passedDeal.id || passedDeal.dealNumber || passedDeal.crop || passedDeal.products || passedDeal.seller || passedDeal.buyer));

  const [deal, setDeal] = useState(passedDeal);
  const [isLoading, setIsLoading] = useState(!hasPassedData);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const isValidId = typeof dealId === 'string' && dealId.trim().length > 0;
      if (isValidId && token) {
        try {
          const res = await getDealDetails(dealId, token);
          if (res && res.success && res.data) {
            setDeal(res.data);
            AsyncStorage.setItem(`deal_cache_${dealId}`, JSON.stringify(res.data)).catch(() => { });
          }
        } catch (apiErr) {
          console.warn('API fetch fail, using fallback:', apiErr);
        }
      }
    } catch (err) {
      console.warn('Error fetching broker deal details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDealFast = async () => {
      if (!hasPassedData && dealId) {
        try {
          const cachedStr = await AsyncStorage.getItem(`deal_cache_${dealId}`);
          if (cachedStr && isMounted) {
            const cachedObj = JSON.parse(cachedStr);
            setDeal(cachedObj);
            setIsLoading(false);
          }
        } catch (e) { }
      }
      fetchDetails();
    };

    loadDealFast();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const handleApprove = async () => {
    try {
      setIsActionLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      let res = await acceptDeal(dealId, 'broker', token);
      if (!res || !res.success) {
        res = await acceptDeal(dealId, token);
      }
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
      let res = await rejectDeal(dealId, 'broker', 'Rejected from Broker details', token);
      if (!res || !res.success) {
        res = await rejectDeal(dealId, 'Rejected from Broker details', token);
      }
      if (res && res.success) {
        await fetchDetails();
      }
    } catch (err) {
      console.warn('Error rejecting deal:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteDraft = async () => {
    try {
      setIsActionLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await completeBrokerDraftDeal(dealId, { notes: 'Completing draft deal' }, token);
      if (res && res.success) {
        Alert.alert('Success', 'Draft deal completed successfully!', [
          { text: 'OK', onPress: () => fetchDetails() },
        ]);
      } else {
        Alert.alert('Error', res?.message || 'Failed to complete draft deal');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to complete draft deal');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Deal', 'Are you sure you want to delete this deal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsActionLoading(true);
          try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await deleteDeal(dealId, token);
            if (res && res.success) {
              Alert.alert('Success', 'Deal deleted', [{ text: 'OK', onPress: () => onNavigate('BrokerPendingQueue') }]);
            } else {
              Alert.alert('Error', res?.message || 'Failed to delete deal');
            }
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete deal');
          } finally {
            setIsActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleRecreate = async () => {
    setIsActionLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const recreatePayload = {
        expiryDate: futureDate.toISOString(),
        notes: 'Recreated expired deal',
        products: deal.products || [],
      };
      const res = await recreateExpiredDeal(dealId, recreatePayload, token);
      if (res && res.success) {
        Alert.alert('Success', 'Expired deal recreated successfully', [{ text: 'OK', onPress: () => fetchDetails() }]);
      } else {
        Alert.alert('Error', res?.message || 'Failed to recreate deal');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to recreate deal');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleShareSauda = async () => {
    try {
      const saudaNo = deal.dealNumber || deal.id || `SAUDA-${dealId?.slice(-6) || ''}`;
      const p0 = deal.products?.[0];
      const pid0 = p0?.productId;
      const crop = deal.crop || deal.productName || deal.cropName
        || (pid0 && typeof pid0 === 'object' ? (pid0.name || pid0.productName || pid0.title || pid0.cropName) : null)
        || p0?.productName || p0?.name || p0?.crop || p0?.cropName || p0?.title
        || '—';
      const qty = deal.quantity ? String(deal.quantity) : (deal.products?.[0]?.quantity ? `${deal.products[0].quantity}` : '—');
      const rateStr = deal.rate || (deal.products?.[0]?.price ? `₹${parseFloat(deal.products[0].price).toLocaleString('en-IN')}` : '—');
      const buyer = deal.buyerCompany?.name || deal.buyerCompany?.companyName || deal.buyer || '—';
      const seller = deal.sellerCompany?.name || deal.sellerCompany?.companyName || deal.seller || '—';

      await Share.share({
        message: `OFFICIAL SAUDA CONTRACT\nContract No: ${saudaNo}\nCommodity: ${crop}\nQuantity: ${qty}\nRate: ${rateStr}\nSeller: ${seller}\nBuyer: ${buyer}\nStatus: ${deal.status || 'Pending'}\n\nIssued via Pravisti B2B Platform.`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const hasDataToRender = Boolean(deal && (deal._id || deal.id || deal.crop || deal.products || deal.productName || deal.seller || deal.buyer || deal.dealNumber));

  const parseNum = (strOrNum) => {
    if (typeof strOrNum === 'number') return strOrNum;
    if (!strOrNum) return 0;
    const cleaned = String(strOrNum).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const saudaNo = deal.dealNumber || deal.id || (deal._id ? `DEAL-${deal._id.slice(-4).toUpperCase()}` : 'DEAL-0001');

  // Extract crop name ONLY from actual data
  const productsList = Array.isArray(deal.products) && deal.products.length > 0 ? deal.products : [];
  const _p0 = productsList[0];
  const _pid0 = _p0?.productId;
  const cropName = deal.crop || deal.productName || deal.cropName
    || _p0?.name
    || (_pid0 && typeof _pid0 === 'object' ? (_pid0.name || _pid0.productName || _pid0.title || _pid0.cropName) : null)
    || _p0?.title
    || 'Commodity Item';

  const productImg = (typeof _p0?.image === 'string' && _p0.image.trim())
    || (typeof _p0?.productImage === 'string' && _p0.productImage.trim())
    || (_pid0 && typeof _pid0 === 'object' && typeof _pid0.image === 'string' && _pid0.image.trim())
    || (typeof deal.image === 'string' && deal.image.trim())
    || null;

  const unitStr = _p0?.unitName || _p0?.unitShortName || (_p0?.unitId && typeof _p0.unitId === 'object' ? (_p0.unitId.name || _p0.unitId.shortName) : null) || _p0?.unit || '';
  const quantity = deal.quantity ? String(deal.quantity).replace(/\s*units?/gi, '').trim() : (_p0?.quantity ? `${_p0.quantity} ${unitStr}`.trim() : '—');
  const rate = deal.rate || (_p0?.price ? `₹${parseFloat(_p0.price).toLocaleString('en-IN')}/unit` : '—');

  // Total amounts from API
  const rawTotal = deal.grandTotal || deal.totalAmount || deal.totalValue || deal.totalPrice || _p0?.totalAmount || _p0?.subtotal || _p0?.totalPrice;
  let numericTotal = parseNum(rawTotal);
  if (!numericTotal) {
    const qNum = parseNum(deal.quantity || _p0?.quantity);
    const rNum = parseNum(deal.rate || _p0?.price);
    if (qNum > 0 && rNum > 0) {
      numericTotal = qNum * rNum;
    }
  }

  const totalVal = numericTotal > 0
    ? `₹${numericTotal.toLocaleString('en-IN')}`
    : (deal.totalAmount || deal.totalValue ? `₹${deal.totalAmount || deal.totalValue}` : '—');

  const rawSubtotal = deal.totalSubtotal || deal.subtotal || _p0?.subtotal || numericTotal;
  const subtotalDisplay = parseNum(rawSubtotal) > 0 ? `₹${parseNum(rawSubtotal).toLocaleString('en-IN')}` : totalVal;

  const discountVal = parseNum(deal.totalDiscount || deal.discount || _p0?.discount || 0);
  const gstVal = parseNum(deal.totalGSTAmount || deal.gstAmount || _p0?.gstAmount || 0);

  const status = deal.status ? (deal.status.charAt(0).toUpperCase() + deal.status.slice(1)) : 'Pending';

  const extractName = (co, fallbackStr = '') => {
    if (!co) return fallbackStr;
    if (typeof co === 'string') return co;
    if (typeof co === 'object') {
      return (
        co.name ||
        co.companyName ||
        co.firmName ||
        co.businessName ||
        co.title ||
        fallbackStr
      );
    }
    return fallbackStr;
  };

  // Seller, Buyer & Broker Company Details
  const sellerCo = deal.sellerCompanyId || deal.sellerCompany || deal.sellerId || (typeof deal.seller === 'object' ? deal.seller : {});
  const sellerName = extractName(sellerCo) || extractName(deal.seller) || deal.sellerCompanyName || deal.sellerName || 'Seller Business';

  const buyerCo = deal.buyerCompanyId || deal.buyerCompany || deal.buyerId || (typeof deal.buyer === 'object' ? deal.buyer : {});
  const buyerName = extractName(buyerCo) || extractName(deal.buyer) || deal.buyerCompanyName || deal.buyerName || 'Buyer Business';

  const brokerCo = deal.brokerCompanyId || deal.brokerCompany || deal.brokerId || (typeof deal.broker === 'object' ? deal.broker : {});
  const brokerName = extractName(brokerCo) || extractName(deal.broker) || deal.brokerCompanyName || deal.brokerName || 'mnc Agro Limiteds';

  const creatorName = deal.createdBy?.name || deal.creatorName || sellerName;
  const createdByRole = deal.createdByRole ? (deal.createdByRole.charAt(0).toUpperCase() + deal.createdByRole.slice(1)) : 'Broker';

  // Approval Flow Extraction
  const appStatusObj = deal.approvalStatus || {};
  const acceptedByArr = Array.isArray(deal.acceptedBy) ? deal.acceptedBy : [];

  const isCreatedByBroker = deal.createdByRole?.toLowerCase() === 'broker' || deal.creatorRole?.toLowerCase() === 'broker' || deal.role?.toLowerCase() === 'broker' || deal.isBrokerDeal === true || deal.isAssisted === true;

  const sellerAppStatus = (appStatusObj.seller || acceptedByArr.find(a => String(a.companyId) === String(sellerCo._id || sellerCo.id))?.status || deal.sellerStatus || 'pending').toLowerCase();
  const buyerAppStatus = (appStatusObj.buyer || acceptedByArr.find(a => String(a.companyId) === String(buyerCo._id || buyerCo.id))?.status || deal.buyerStatus || 'pending').toLowerCase();
  const brokerAppStatus = (appStatusObj.broker || acceptedByArr.find(a => String(a.companyId) === String(brokerCo._id || brokerCo.id))?.status || deal.brokerStatus || (isCreatedByBroker ? 'approved' : 'pending')).toLowerCase();

  const isBrokerApproved = brokerAppStatus === 'approved' || brokerAppStatus === 'accepted' || isCreatedByBroker;
  const isFullyApproved = status.toLowerCase() === 'approved' || status.toLowerCase() === 'active' || status.toLowerCase() === 'completed' ||
    (sellerAppStatus === 'approved' && buyerAppStatus === 'approved' && brokerAppStatus === 'approved');

  const dateStr = deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
  const timeStr = deal.createdAt ? new Date(deal.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '10:45 AM';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />

      {/* 1. TOP APP HEADER */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.appBarTitle}>Sauda Details</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => onNavigate('DealChat', { dealId: deal._id || deal.id || dealId, deal })}
            activeOpacity={0.7}
          >
            <MessageSquare size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleShareSauda} activeOpacity={0.7}>
            <Share2 size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.userAvatarCircle}>
            <User size={14} color="#2563EB" />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {isLoading && !hasDataToRender ? (
          <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ marginTop: 12, fontSize: 14, color: '#2563EB', fontWeight: '700' }}>Loading Sauda Contract...</Text>
          </View>
        ) : (
          <>
            {/* 2. TOP DEAL ID CARD */}
            <View style={styles.dealIdCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealIdLabel}>DEAL ID</Text>
                <Text style={styles.dealIdValue}>{saudaNo}</Text>
              </View>

              <View style={[
                styles.statusPillBadge,
                isFullyApproved ? styles.statusPillApproved : status.toLowerCase().includes('reject') ? styles.statusPillRejected : styles.statusPillPending
              ]}>
                {isFullyApproved ? (
                  <CheckCircle2 size={13} color="#16A34A" style={{ marginRight: 4 }} />
                ) : status.toLowerCase().includes('reject') ? (
                  <XCircle size={13} color="#DC2626" style={{ marginRight: 4 }} />
                ) : (
                  <Clock size={13} color="#C2410C" style={{ marginRight: 4 }} />
                )}
                <Text style={[
                  styles.statusPillBadgeText,
                  isFullyApproved ? styles.textApproved : status.toLowerCase().includes('reject') ? styles.textRejected : styles.textPending
                ]}>
                  {isFullyApproved ? 'Approved' : status.toLowerCase().includes('reject') ? 'Rejected' : 'Pending Approval'}
                </Text>
              </View>
            </View>

            {/* 3. CONTRACTING PARTIES & BROKERAGE FIRM CARD */}
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>CONTRACTING PARTIES & BROKERAGE</Text>

              {/* Originating Brokerage Firm Banner */}
              <View style={styles.brokerPartyBanner}>
                <View style={styles.brokerPartyIconBox}>
                  <Building2 size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.brokerPartySub}>ORIGINATING BROKERAGE FIRM</Text>
                  <Text style={styles.brokerPartyName}>{brokerName}</Text>
                  {brokerCo?.phone || deal.createdBy?.mobileNumber ? (
                    <Text style={styles.partyPhoneText}>📞 +91 {brokerCo?.phone || deal.createdBy?.mobileNumber}</Text>
                  ) : null}
                </View>
                <View style={styles.brokerVerifiedTag}>
                  <ShieldCheck size={12} color="#2563EB" style={{ marginRight: 3 }} />
                  <Text style={styles.brokerVerifiedTagText}>Broker</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {/* Seller Company Card */}
                <View style={[styles.partySmallBox, { flex: 1, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={[styles.partySmallRole, { color: '#2563EB' }]}>SELLER FIRM</Text>
                  <Text style={styles.partySmallName} numberOfLines={1}>{sellerName}</Text>
                  {sellerCo?.phone ? (
                    <Text style={styles.partySmallPhone} numberOfLines={1}>📞 +91 {sellerCo.phone}</Text>
                  ) : null}
                </View>

                {/* Buyer Company Card */}
                <View style={[styles.partySmallBox, { flex: 1, backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                  <Text style={[styles.partySmallRole, { color: '#15803D' }]}>BUYER FIRM</Text>
                  <Text style={styles.partySmallName} numberOfLines={1}>{buyerName}</Text>
                  {buyerCo?.phone ? (
                    <Text style={styles.partySmallPhone} numberOfLines={1}>📞 +91 {buyerCo.phone}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* 4. APPROVAL WORKFLOW CARD */}
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>APPROVAL WORKFLOW</Text>

              <View style={styles.workflowGrid}>
                {/* Seller Workflow Box */}
                <View style={[
                  styles.workflowBox,
                  sellerAppStatus === 'approved' ? styles.wfBoxApproved : sellerAppStatus === 'rejected' ? styles.wfBoxRejected : styles.wfBoxPending
                ]}>
                  <View style={[
                    styles.wfIconCircle,
                    sellerAppStatus === 'approved' ? styles.wfIconCircleApproved : sellerAppStatus === 'rejected' ? styles.wfIconCircleRejected : styles.wfIconCirclePending
                  ]}>
                    {sellerAppStatus === 'approved' ? (
                      <CheckCircle size={18} color="#FFFFFF" />
                    ) : sellerAppStatus === 'rejected' ? (
                      <XCircle size={18} color="#FFFFFF" />
                    ) : (
                      <Clock size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.wfPartyName} numberOfLines={1}>
                    {sellerName}
                  </Text>
                  <Text style={[styles.wfRoleSubText, { color: '#2563EB', fontWeight: '800' }]}>Seller</Text>
                  <Text style={[
                    styles.wfStatusText,
                    sellerAppStatus === 'approved' ? styles.textGreen : sellerAppStatus === 'rejected' ? styles.textRed : styles.textOrange
                  ]}>
                    {(sellerAppStatus || 'PENDING').toUpperCase()}
                  </Text>
                </View>

                {/* Buyer Workflow Box */}
                <View style={[
                  styles.workflowBox,
                  buyerAppStatus === 'approved' ? styles.wfBoxApproved : buyerAppStatus === 'rejected' ? styles.wfBoxRejected : styles.wfBoxPending
                ]}>
                  <View style={[
                    styles.wfIconCircle,
                    buyerAppStatus === 'approved' ? styles.wfIconCircleApproved : buyerAppStatus === 'rejected' ? styles.wfIconCircleRejected : styles.wfIconCirclePending
                  ]}>
                    {buyerAppStatus === 'approved' ? (
                      <CheckCircle size={18} color="#FFFFFF" />
                    ) : buyerAppStatus === 'rejected' ? (
                      <XCircle size={18} color="#FFFFFF" />
                    ) : (
                      <Clock size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.wfPartyName} numberOfLines={1}>
                    {buyerName}
                  </Text>
                  <Text style={[styles.wfRoleSubText, { color: '#059669', fontWeight: '800' }]}>Buyer</Text>
                  <Text style={[
                    styles.wfStatusText,
                    buyerAppStatus === 'approved' ? styles.textGreen : buyerAppStatus === 'rejected' ? styles.textRed : styles.textOrange
                  ]}>
                    {(buyerAppStatus || 'PENDING').toUpperCase()}
                  </Text>
                </View>

                {/* Broker / MNC Workflow Box */}
                <View style={[
                  styles.workflowBox,
                  brokerAppStatus === 'approved' ? styles.wfBoxApproved : brokerAppStatus === 'rejected' ? styles.wfBoxRejected : styles.wfBoxPending
                ]}>
                  <View style={[
                    styles.wfIconCircle,
                    brokerAppStatus === 'approved' ? styles.wfIconCircleApproved : brokerAppStatus === 'rejected' ? styles.wfIconCircleRejected : styles.wfIconCirclePending
                  ]}>
                    {brokerAppStatus === 'approved' ? (
                      <CheckCircle size={18} color="#FFFFFF" />
                    ) : brokerAppStatus === 'rejected' ? (
                      <XCircle size={18} color="#FFFFFF" />
                    ) : (
                      <Clock size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.wfPartyName} numberOfLines={1}>
                    {brokerName}
                  </Text>
                  <Text style={[styles.wfRoleSubText, { color: '#7C3AED', fontWeight: '800' }]}>Broker</Text>
                  <Text style={[
                    styles.wfStatusText,
                    brokerAppStatus === 'approved' ? styles.textGreen : brokerAppStatus === 'rejected' ? styles.textRed : styles.textOrange
                  ]}>
                    {(brokerAppStatus || 'PENDING').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. COMMODITY PRODUCTS SUMMARY CARD */}
            <View style={styles.cardSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardSectionTitle}>COMMODITY PRODUCTS ({productsList.length > 0 ? productsList.length : 1})</Text>
              </View>

              {productsList.length > 0 ? (
                productsList.map((prod, idx) => {
                  const pObj = typeof prod.productId === 'object' ? prod.productId : {};
                  const pName = prod.name || pObj.name || cropName;
                  const pQty = prod.quantity || deal.quantity || '—';
                  const pUnit = prod.unitName || prod.unitShortName || (pObj.unitId && typeof pObj.unitId === 'object' ? (pObj.unitId.name || pObj.unitId.shortName) : null) || 'unit';
                  const pPrice = prod.price ? `₹${parseFloat(prod.price).toLocaleString('en-IN')}` : rate;
                  const pSubtotal = prod.subtotal ? `₹${parseFloat(prod.subtotal).toLocaleString('en-IN')}` : null;
                  const pDiscount = prod.discount ? `₹${parseFloat(prod.discount).toLocaleString('en-IN')}` : null;
                  const pGst = prod.gstAmount ? `₹${parseFloat(prod.gstAmount).toLocaleString('en-IN')} (${prod.gst}%)` : null;
                  const pTotal = prod.totalAmount ? `₹${parseFloat(prod.totalAmount).toLocaleString('en-IN')}` : null;
                  const pTerms = prod.paymentTerms || deal.paymentTerms || null;

                  return (
                    <View key={prod._id || idx} style={styles.productBlockItemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={styles.productBlockTitle}>{pName}</Text>
                        <View style={styles.productBlockBadge}>
                          <Text style={styles.productBlockBadgeText}>Item #{idx + 1}</Text>
                        </View>
                      </View>

                      <View style={styles.productDetailGrid}>
                        <View style={styles.productDetailCol}>
                          <Text style={styles.productDetailLabel}>QUANTITY</Text>
                          <Text style={styles.productDetailVal}>{pQty} {pUnit}</Text>
                        </View>
                        <View style={styles.productDetailCol}>
                          <Text style={styles.productDetailLabel}>RATE / PRICE</Text>
                          <Text style={styles.productDetailVal}>{pPrice}</Text>
                        </View>
                        {pSubtotal ? (
                          <View style={styles.productDetailCol}>
                            <Text style={styles.productDetailLabel}>SUBTOTAL</Text>
                            <Text style={styles.productDetailVal}>{pSubtotal}</Text>
                          </View>
                        ) : null}
                      </View>

                      {pDiscount || pGst || pTerms ? (
                        <View style={styles.productExtraDetailsRow}>
                          {pDiscount ? (
                            <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>Discount: -{pDiscount}</Text>
                          ) : null}
                          {pGst ? (
                            <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>GST: +{pGst}</Text>
                          ) : null}
                          {pTerms ? (
                            <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>Terms: {pTerms}</Text>
                          ) : null}
                        </View>
                      ) : null}

                      {pTotal ? (
                        <View style={styles.productNetTotalRow}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>Item Net Total:</Text>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: '#2563EB' }}>{pTotal}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <View style={styles.productSummaryRow}>
                  {productImg ? (
                    <Image source={{ uri: productImg }} style={styles.productImageThumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.productFallbackBox}>
                      <Package size={32} color="#2563EB" />
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.productTitleText} numberOfLines={1}>{cropName}</Text>
                      <View style={styles.commodityCategoryPill}>
                        <Text style={styles.commodityCategoryText}>COMMODITY</Text>
                      </View>
                    </View>

                    <View style={styles.productGridRow}>
                      <View>
                        <Text style={styles.prodGridLabel}>QUANTITY</Text>
                        <Text style={styles.prodGridVal}>{quantity}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.prodGridLabel}>PRICE</Text>
                        <Text style={styles.prodPriceVal}>{rate}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 6. CREATOR & VERIFICATION BANNER */}
            <View style={styles.creatorBannerCard}>
              <View style={styles.creatorShieldIconBox}>
                <ShieldCheck size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.creatorBannerTitle}>
                  Created by <Text style={{ fontWeight: '800', color: '#0F172A' }}>{creatorName}</Text> ({brokerName})
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <CheckCircle2 size={11} color="#16A34A" />
                    <Text style={styles.verifiedTagText}>BUYER VERIFIED</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#CBD5E1' }}>•</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <CheckCircle2 size={11} color="#16A34A" />
                    <Text style={styles.verifiedTagText}>SELLER VERIFIED</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 6.5 SAUDA TRADE CHAT BANNER CARD */}
            <TouchableOpacity
              style={styles.chatBannerCard}
              onPress={() => onNavigate('DealChat', { dealId: deal._id || deal.id || dealId, deal })}
              activeOpacity={0.85}
            >
              <View style={styles.chatIconBox}>
                <MessageSquare size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.chatBannerTitle}>Sauda Trade Chat</Text>
                <Text style={styles.chatBannerSubtitle}>Open real-time negotiation & messages</Text>
              </View>
              <ChevronRight size={18} color="#2563EB" />
            </TouchableOpacity>

            {/* 7. FINANCIAL BREAKDOWN CARD */}
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>FINANCIAL BREAKDOWN</Text>

              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Subtotal</Text>
                <Text style={styles.finVal}>{subtotalDisplay}</Text>
              </View>

              <View style={styles.finRow}>
                <Text style={styles.finLabel}>
                  Discount {discountVal > 0 && parseNum(rawSubtotal) > 0 ? `(${Math.round((discountVal / parseNum(rawSubtotal)) * 100)}%)` : ''}
                </Text>
                <Text style={[styles.finVal, { color: discountVal > 0 ? '#DC2626' : '#64748B' }]}>
                  {discountVal > 0 ? `-₹${discountVal.toLocaleString('en-IN')}` : '₹0'}
                </Text>
              </View>

              <View style={styles.finRow}>
                <Text style={styles.finLabel}>
                  GST {gstVal > 0 && parseNum(rawSubtotal) > 0 ? `(${Math.round((gstVal / parseNum(rawSubtotal)) * 100)}%)` : ''}
                </Text>
                <Text style={[styles.finVal, { color: gstVal > 0 ? '#16A34A' : '#64748B' }]}>
                  {gstVal > 0 ? `+₹${gstVal.toLocaleString('en-IN')}` : '₹0'}
                </Text>
              </View>

              <View style={styles.dottedDivider} />

              <View style={[styles.finRow, { marginTop: 6 }]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalVal}>{totalVal}</Text>
              </View>
            </View>

            {/* 8. HISTORY & TIMELINE CARD */}
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>HISTORY & TIMELINE</Text>

              <View style={styles.timelineWrapper}>
                {/* Step 1: Created */}
                <View style={styles.timelineRow}>
                  <View style={styles.timelineLeftCol}>
                    <View style={styles.blueDotNode} />
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.timelineContentBox}>
                    <Text style={styles.timelineNodeTitle}>Deal Created</Text>
                    <Text style={styles.timelineNodeTime}>{dateStr} • {timeStr}</Text>
                    <Text style={styles.timelineNodeSub}>Initiated by {createdByRole} ({creatorName} - {brokerName})</Text>
                  </View>
                </View>

                {/* Step 2: Approval Status */}
                <View style={styles.timelineRow}>
                  <View style={styles.timelineLeftCol}>
                    <View style={isFullyApproved ? styles.blueDotNode : styles.greyDotNode} />
                  </View>
                  <View style={styles.timelineContentBox}>
                    <Text style={styles.timelineNodeTitle}>
                      {isFullyApproved ? 'Deal Fully Approved' : 'Awaiting Buyer & Seller Approval'}
                    </Text>
                    <Text style={[styles.timelineNodeSub, { fontStyle: 'italic' }]}>
                      {isFullyApproved ? 'Active trade contract finalized' : 'In progress...'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 9. BOTTOM ACTION BUTTONS BAR */}
            <View style={styles.bottomActionBar}>
              {String(deal.status || '').toLowerCase() === 'draft' ? (
                <>
                  <TouchableOpacity
                    style={styles.rejectSaudaBtn}
                    onPress={handleDelete}
                    disabled={isActionLoading}
                    activeOpacity={0.8}
                  >
                    <X size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.rejectSaudaBtnText}>Delete Draft</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveSaudaBtn}
                    onPress={handleCompleteDraft}
                    disabled={isActionLoading}
                    activeOpacity={0.85}
                  >
                    {isActionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.approveSaudaBtnText}>Complete Draft</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : String(deal.status || '').toLowerCase() === 'expired' ? (
                <>
                  <TouchableOpacity
                    style={styles.rejectSaudaBtn}
                    onPress={handleDelete}
                    disabled={isActionLoading}
                    activeOpacity={0.8}
                  >
                    <X size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.rejectSaudaBtnText}>Delete Deal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveSaudaBtn}
                    onPress={handleRecreate}
                    disabled={isActionLoading}
                    activeOpacity={0.85}
                  >
                    {isActionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.approveSaudaBtnText}>Recreate Deal</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {(!isBrokerApproved && !isCreatedByBroker && !isFullyApproved) ? (
                    <>
                      <TouchableOpacity
                        style={styles.rejectSaudaBtn}
                        onPress={handleReject}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        <X size={18} color="#DC2626" style={{ marginRight: 6 }} />
                        <Text style={styles.rejectSaudaBtnText}>Reject Sauda</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveSaudaBtn}
                        onPress={handleApprove}
                        disabled={isActionLoading}
                        activeOpacity={0.85}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.approveSaudaBtnText}>Approve Sauda</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={{ width: '100%', paddingVertical: 10, alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0' }}>
                      <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700' }}>
                        ✓ Deal Created & Approved by Broker ({brokerName})
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

          </>
        )}

      </ScrollView>

      <Footer onNavigate={onNavigate} activeScreen="BrokerDealDetails" isBroker={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* 1. APP BAR */
  appBar: {
    height: 56,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },

  /* 2. TOP DEAL ID CARD */
  dealIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  dealIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dealIdValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusPillRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusPillPending: {
    backgroundColor: '#FFEDD5',
  },
  statusPillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textApproved: { color: '#16A34A' },
  textRejected: { color: '#DC2626' },
  textPending: { color: '#C2410C' },

  /* CARDS & SECTIONS */
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  /* BROKER & PARTIES CARDS */
  brokerPartyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  brokerPartyIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brokerPartySub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  brokerPartyName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  partyPhoneText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  brokerVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  brokerVerifiedTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  partySmallBox: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  partySmallRole: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  partySmallName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  partySmallPhone: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 1,
  },

  /* APPROVAL WORKFLOW GRID */
  workflowGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  workflowBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  wfBoxApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  wfBoxRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  wfBoxPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  wfIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  wfIconCircleApproved: { backgroundColor: '#16A34A' },
  wfIconCircleRejected: { backgroundColor: '#DC2626' },
  wfIconCirclePending: { backgroundColor: '#F59E0B' },
  wfPartyName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  wfRoleSubText: {
    fontSize: 9.5,
    marginTop: 1,
  },
  wfStatusText: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },
  textGreen: { color: '#16A34A' },
  textRed: { color: '#DC2626' },
  textOrange: { color: '#D97706' },

  /* PRODUCTS MULTI-ITEM CARDS */
  productBlockItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  productBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  productBlockBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  productBlockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  productDetailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  productDetailCol: {
    flex: 1,
  },
  productDetailLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  productDetailVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  productExtraDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  productNetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  productSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  productFallbackBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  commodityCategoryPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  commodityCategoryText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  productGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  prodGridLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  prodGridVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  prodPriceVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },

  /* CREATOR BANNER */
  creatorBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  creatorShieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorBannerTitle: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },
  verifiedTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#16A34A',
  },

  /* CHAT BANNER */
  chatBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  chatIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  chatBannerSubtitle: {
    fontSize: 11.5,
    color: '#4338CA',
    marginTop: 1,
  },

  /* FINANCIAL BREAKDOWN */
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  finLabel: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  finVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 6,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  grandTotalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#059669',
  },

  /* HISTORY TIMELINE */
  timelineWrapper: {
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeftCol: {
    width: 24,
    alignItems: 'center',
  },
  blueDotNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    marginTop: 3,
  },
  greyDotNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    marginTop: 3,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  timelineContentBox: {
    flex: 1,
    marginLeft: 8,
  },
  timelineNodeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineNodeTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  timelineNodeSub: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },

  /* BOTTOM ACTION BAR */
  bottomActionBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  rejectSaudaBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectSaudaBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  approveSaudaBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveSaudaBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default BrokerDealDetails;
