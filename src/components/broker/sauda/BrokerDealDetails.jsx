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
} from 'lucide-react-native';
import { getDealDetails, acceptDeal, rejectDeal } from '../../../services/api';
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
      const isValidObjectId = typeof dealId === 'string' && /^[0-9a-fA-F]{24}$/.test(dealId);
      if (isValidObjectId && token) {
        try {
          const res = await getDealDetails(dealId, token);
          if (res && res.success && res.data) {
            setDeal(res.data);
            AsyncStorage.setItem(`deal_cache_${dealId}`, JSON.stringify(res.data)).catch(() => {});
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
        } catch (e) {}
      }
      fetchDetails();
    };

    loadDealFast();

    return () => {
      isMounted = false;
    };
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
  const _p0 = deal.products?.[0];
  const _pid0 = _p0?.productId;
  const cropName = deal.crop || deal.productName || deal.cropName
    || _p0?.name
    || (_pid0 && typeof _pid0 === 'object' ? (_pid0.name || _pid0.productName || _pid0.title || _pid0.cropName) : null)
    || _p0?.title
    || 'Commodity Item';

  // Dynamic Product Image from deal data (no hardcoded image URL)
  const productImg = (typeof _p0?.image === 'string' && _p0.image.trim())
    || (typeof _p0?.productImage === 'string' && _p0.productImage.trim())
    || (_pid0 && typeof _pid0 === 'object' && typeof _pid0.image === 'string' && _pid0.image.trim())
    || (typeof deal.image === 'string' && deal.image.trim())
    || null;

  // Extract quantity & rate ONLY from actual data
  const unitStr = _p0?.unitName || _p0?.unitShortName || (_p0?.unitId && typeof _p0.unitId === 'object' ? (_p0.unitId.name || _p0.unitId.shortName) : null) || _p0?.unit || '';
  const quantity = deal.quantity ? String(deal.quantity).replace(/\s*units?/gi, '').trim() : (_p0?.quantity ? `${_p0.quantity} ${unitStr}`.trim() : '—');
  const rate = deal.rate || (_p0?.price ? `₹${parseFloat(_p0.price).toLocaleString('en-IN')}/unit` : '—');

  // Total amount from API
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

  // Subtotal, Discount & GST breakdown from actual deal data
  const rawSubtotal = deal.subtotal || deal.totalSubtotal || _p0?.subtotal || numericTotal;
  const subtotalDisplay = parseNum(rawSubtotal) > 0 ? `₹${parseNum(rawSubtotal).toLocaleString('en-IN')}` : totalVal;

  const discountVal = parseNum(deal.discount || deal.totalDiscount || _p0?.discount || 0);
  const gstVal = parseNum(deal.gstAmount || deal.totalGSTAmount || _p0?.gstAmount || 0);

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

  // Seller & Buyer & Broker Details from actual deal data
  const sellerCo = deal.sellerCompanyId || deal.sellerCompany || deal.sellerId || (typeof deal.seller === 'object' ? deal.seller : {});
  const sellerName = extractName(sellerCo) || extractName(deal.seller) || deal.sellerCompanyName || deal.sellerName || 'Seller Business';

  const buyerCo = deal.buyerCompanyId || deal.buyerCompany || deal.buyerId || (typeof deal.buyer === 'object' ? deal.buyer : {});
  const buyerName = extractName(buyerCo) || extractName(deal.buyer) || deal.buyerCompanyName || deal.buyerName || 'Buyer Business';

  const brokerCo = deal.brokerCompanyId || deal.brokerCompany || deal.brokerId || (typeof deal.broker === 'object' ? deal.broker : {});
  const brokerName = extractName(brokerCo) || extractName(deal.broker) || deal.brokerCompanyName || deal.brokerName || 'Brokerage Firm';

  const creatorName = deal.createdBy?.name || deal.creatorName || sellerName;
  const createdByRole = deal.createdByRole ? (deal.createdByRole.charAt(0).toUpperCase() + deal.createdByRole.slice(1)) : 'Seller';

  // ── Approval Flow Extraction ──
  const appStatusObj = deal.approvalStatus || {};
  const acceptedByArr = Array.isArray(deal.acceptedBy) ? deal.acceptedBy : [];

  const sellerAppStatus = (appStatusObj.seller || acceptedByArr.find(a => String(a.companyId) === String(sellerCo._id || sellerCo.id))?.status || deal.sellerStatus || 'approved').toLowerCase();
  const buyerAppStatus = (appStatusObj.buyer || acceptedByArr.find(a => String(a.companyId) === String(buyerCo._id || buyerCo.id))?.status || deal.buyerStatus || 'pending').toLowerCase();
  const brokerAppStatus = (appStatusObj.broker || acceptedByArr.find(a => String(a.companyId) === String(brokerCo._id || brokerCo.id))?.status || deal.brokerStatus || 'pending').toLowerCase();

  const isBrokerApproved = brokerAppStatus === 'approved' || brokerAppStatus === 'accepted';
  const isFullyApproved = status.toLowerCase() === 'approved' || status.toLowerCase() === 'active' || status.toLowerCase() === 'completed' ||
    (sellerAppStatus === 'approved' && buyerAppStatus === 'approved' && brokerAppStatus === 'approved');

  const dateStr = deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'July 31, 2026';
  const timeStr = deal.createdAt ? new Date(deal.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '10:45 AM';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0284C7" />

      {/* 1. TOP SKY BLUE APP HEADER (#0284C7) */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.appBarTitle}>Sauda Details</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleShareSauda} activeOpacity={0.7}>
            <Share2 size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.userAvatarCircle}>
            <User size={14} color="#0284C7" />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {isLoading && !hasDataToRender ? (
          <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={{ marginTop: 12, fontSize: 14, color: '#0284C7', fontWeight: '700' }}>Loading Sauda Contract...</Text>
          </View>
        ) : (
          <>
        {/* 2. TOP DEAL ID CARD (Soft Pastel Light Blue Container) */}
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

        {/* 3. APPROVAL WORKFLOW CARD */}
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

        {/* 4. PRODUCT / COMMODITY SUMMARY CARD */}
        <View style={styles.cardSection}>
          <View style={styles.productSummaryRow}>
            {productImg ? (
              <Image source={{ uri: productImg }} style={styles.productImageThumb} resizeMode="cover" />
            ) : (
              <View style={styles.productFallbackBox}>
                <Package size={32} color="#0D52ED" />
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
        </View>

        {/* 5. CREATOR & VERIFICATION BANNER */}
        <View style={styles.creatorBannerCard}>
          <View style={styles.creatorShieldIconBox}>
            <ShieldCheck size={20} color="#0D52ED" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.creatorBannerTitle}>
              Created by <Text style={{ fontWeight: '800', color: '#0F172A' }}>{creatorName}</Text>
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

        {/* 6. FINANCIAL BREAKDOWN CARD */}
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

        {/* 7. HISTORY & TIMELINE CARD */}
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
                <Text style={styles.timelineNodeSub}>Initiated by {createdByRole} ({creatorName})</Text>
              </View>
            </View>

            {/* Step 2: Approval Status */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineLeftCol}>
                <View style={isFullyApproved ? styles.blueDotNode : styles.greyDotNode} />
              </View>
              <View style={styles.timelineContentBox}>
                <Text style={styles.timelineNodeTitle}>
                  {isFullyApproved ? 'Deal Fully Approved' : 'Awaiting Broker Approval'}
                </Text>
                <Text style={[styles.timelineNodeSub, { fontStyle: 'italic' }]}>
                  {isFullyApproved ? 'Active trade contract finalized' : 'In progress...'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 8. BOTTOM ACTION BUTTONS BAR */}
        <View style={styles.bottomActionBar}>
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
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#0D52ED',
    fontWeight: '600',
  },

  /* 1. TOP SKY BLUE HEADER (#0284C7) */
  appBar: {
    height: 58,
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#0D52ED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  userAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    padding: 14,
    paddingBottom: 120,
    gap: 12,
  },

  /* 2. TOP DEAL ID CARD */
  dealIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF4FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dealIdLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dealIdValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: -0.2,
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusPillPending: {
    backgroundColor: '#FFEDD5',
  },
  statusPillApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusPillRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusPillBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  textPending: { color: '#C2410C' },
  textApproved: { color: '#16A34A' },
  textRejected: { color: '#DC2626' },

  /* 3. CARD SECTION */
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  /* APPROVAL WORKFLOW GRID */
  workflowGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  workflowBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  wfBoxApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  wfBoxPending: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  wfBoxRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  wfIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  wfIconCircleApproved: { backgroundColor: '#16A34A' },
  wfIconCirclePending: { backgroundColor: '#F97316' },
  wfIconCircleRejected: { backgroundColor: '#DC2626' },

  wfPartyName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 1,
    textAlign: 'center',
  },
  wfRoleSubText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  wfStatusText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  textGreen: { color: '#15803D' },
  textOrange: { color: '#C2410C' },
  textRed: { color: '#B91C1C' },

  /* 4. PRODUCT / COMMODITY SUMMARY */
  productSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageThumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productFallbackBox: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  productTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  commodityCategoryPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  commodityCategoryText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 0.4,
  },
  productGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  prodGridLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  prodGridVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  prodPriceVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0D9488',
  },

  /* 5. CREATOR BANNER */
  creatorBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  creatorShieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorBannerTitle: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  verifiedTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 0.3,
  },

  /* 6. FINANCIAL BREAKDOWN */
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  finLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  finVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dottedDivider: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1D4ED8',
  },

  /* 7. HISTORY & TIMELINE */
  timelineWrapper: {
    marginTop: 4,
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeftCol: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  blueDotNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1D4ED8',
  },
  greyDotNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    width: 2,
    height: 28,
    backgroundColor: '#CBD5E1',
    marginTop: 2,
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
    fontWeight: '600',
  },
  timelineNodeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* 8. BOTTOM ACTION BUTTONS */
  bottomActionBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rejectSaudaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DC2626',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  rejectSaudaBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626',
  },
  approveSaudaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D52ED',
    borderRadius: 14,
    paddingVertical: 14,
    elevation: 3,
    shadowColor: '#0D52ED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  approveSaudaBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

export default BrokerDealDetails;
