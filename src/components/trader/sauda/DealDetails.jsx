import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Share2,
  MoreVertical,
  CheckCircle2,
  Check,
  ArrowLeftRight,
  Phone,
  Mail,
  Package,
  Calendar,
  CreditCard,
  MapPin,
  FileText,
  Download,
  Edit3,
  Sparkles,
  Home,
  FileSpreadsheet,
  Clock,
  Truck,
  X,
  MessageSquare,
  Percent,
  Mic,
  PieChart,
  Grid,
  ShieldCheck,
  Building2,
  User,
  ChevronRight,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import {
  getDealDetails,
  getCompanyDetails,
  acceptDeal,
  rejectDeal,
  updateDealStatus,
  recreateExpiredDeal,
  deleteDeal,
  getUserProfile,
  recordPayment,
  getPayments,
  getPaymentDashboard,
  updatePaymentStatus,
  getDeliveries,
  updateDeliveryStatus,
  resolveImageUrl,
} from '../../../services/api';

// Number to Indian Currency Words Formatter
function numberToIndianWords(num) {
  if (!num || isNaN(num)) return '';
  const n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return '(Zero Rupees Only)';

  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const inWords = (val) => {
    let str = '';
    if (val > 19) {
      str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : '');
    } else {
      str += a[val];
    }
    return str;
  };

  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = Math.floor(rem / 100);
  const rest = rem % 100;

  let result = '';
  if (crore > 0) result += inWords(crore) + ' Crore ';
  if (lakh > 0) result += inWords(lakh) + ' Lakh ';
  if (thousand > 0) result += inWords(thousand) + ' Thousand ';
  if (hundred > 0) result += inWords(hundred) + ' Hundred ';
  if (rest > 0) {
    result += inWords(rest) + ' ';
  }

  return `(${result.trim()} Only)`;
}

const DealDetails = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = useState(!routeData?.deal);
  const [deal, setDeal] = useState(routeData?.deal || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserCompanyIds, setCurrentUserCompanyIds] = useState([]);

  // Payment Tracking State
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [deliveriesHistory, setDeliveriesHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isDeliveriesLoading, setIsDeliveriesLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  // State for fetching seller and buyer company details & images
  const [sellerCompanyDetails, setSellerCompanyDetails] = useState(null);
  const [buyerCompanyDetails, setBuyerCompanyDetails] = useState(null);
  const [sellerImgError, setSellerImgError] = useState(false);
  const [buyerImgError, setBuyerImgError] = useState(false);
  const [productImgError, setProductImgError] = useState(false);

  // Modals
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('sent');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  const [isGstModalVisible, setIsGstModalVisible] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);

  // Fetch current user identity once on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const response = await getUserProfile(token);
        if (response && response.success && response.data) {
          const user = response.data;
          setCurrentUserId(user._id || user.id);
          const companyIds = (user.companies || []).map((c) =>
            String(c._id || c.id || c)
          );
          setCurrentUserCompanyIds(companyIds);
        }
      } catch (e) {
        console.warn('Failed to fetch current user:', e);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchDealDetails = useCallback(async () => {
    const passedDeal = routeData?.deal;
    if (passedDeal) {
      setDeal(passedDeal);
    }
    const id = passedDeal?._id || routeData?.dealId || passedDeal?.id;
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await getDealDetails(id, token);
      if (response && response.success && response.data) {
        setDeal(response.data);
      }
    } catch (error) {
      console.warn('Error fetching deal details API, using fallback:', error);
    } finally {
      setIsLoading(false);
    }
  }, [routeData]);

  useEffect(() => {
    fetchDealDetails();
  }, [fetchDealDetails]);

  // Fetch seller and buyer company details when deal is loaded
  useEffect(() => {
    if (!deal) return;
    setSellerImgError(false);
    setBuyerImgError(false);
    setProductImgError(false);

    const extractId = (val) => {
      if (!val) return null;
      if (typeof val === 'string' && val.trim().length === 24) return val.trim();
      if (typeof val === 'object') {
        const id = val._id || val.id;
        if (typeof id === 'string' && id.trim().length === 24) return id.trim();
      }
      return null;
    };

    const sId =
      extractId(deal.sellerCompanyId) ||
      extractId(deal.sellerCompany) ||
      extractId(deal.seller?.companyId) ||
      extractId(deal.seller?.company) ||
      extractId(deal.party1?.company) ||
      extractId(deal.party1);

    const bId =
      extractId(deal.buyerCompanyId) ||
      extractId(deal.buyerCompany) ||
      extractId(deal.buyer?.companyId) ||
      extractId(deal.buyer?.company) ||
      extractId(deal.party2?.company) ||
      extractId(deal.party2);

    if (sId) {
      getCompanyDetails(sId)
        .then((res) => {
          if (res && res.success && res.data) {
            setSellerCompanyDetails(res.data);
          }
        })
        .catch((err) => console.warn('Failed to load seller company:', err));
    }

    if (bId) {
      getCompanyDetails(bId)
        .then((res) => {
          if (res && res.success && res.data) {
            setBuyerCompanyDetails(res.data);
          }
        })
        .catch((err) => console.warn('Failed to load buyer company:', err));
    }
  }, [deal]);

  const fetchPaymentData = useCallback(async () => {
    const id = routeData?.dealId || routeData?.deal?._id || (deal && deal._id);
    if (!id || !deal) return;

    const statusLower = String(deal?.status || '').toLowerCase();
    const isApprovedOrCompleted =
      statusLower === 'approved' || statusLower === 'completed' || statusLower === 'active';
    if (!isApprovedOrCompleted) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const normalizeId = (val) => String(val?._id || val?.id || val || '');
      const sCid = normalizeId(deal.sellerCompanyId);
      const bCid = normalizeId(deal.buyerCompanyId);
      const brCid = normalizeId(deal.brokerCompanyId);

      const vRole = deal.viewerRole || deal.currentUserRole || '';
      const cUserRole = deal.currentUserRole || vRole;

      const isS =
        cUserRole === 'seller' ||
        vRole === 'seller' ||
        currentUserCompanyIds.some(
          (cid) => cid && String(cid).toLowerCase() === String(sCid).toLowerCase()
        );
      const isB =
        cUserRole === 'buyer' ||
        vRole === 'buyer' ||
        currentUserCompanyIds.some(
          (cid) => cid && String(cid).toLowerCase() === String(bCid).toLowerCase()
        );
      const isBr =
        cUserRole === 'broker' ||
        vRole === 'broker' ||
        (!!brCid &&
          currentUserCompanyIds.some(
            (cid) => cid && String(cid).toLowerCase() === String(brCid).toLowerCase()
          ));

      const myCompanyId = isS
        ? sCid
        : isB
          ? bCid
          : isBr
            ? brCid
            : currentUserCompanyIds[0] || '';

      setIsDashboardLoading(true);
      setIsHistoryLoading(true);
      setIsDeliveriesLoading(true);

      const [dashRes, histRes, delivRes] = await Promise.all([
        getPaymentDashboard(myCompanyId, id, token).catch((e) => {
          console.warn(e);
          return null;
        }),
        getPayments({ dealId: id, companyId: myCompanyId, limit: 50 }, token).catch((e) => {
          console.warn(e);
          return null;
        }),
        getDeliveries({ dealId: id, limit: 50 }, token).catch((e) => {
          console.warn(e);
          return null;
        }),
      ]);

      if (dashRes && dashRes.success) {
        setPaymentSummary(dashRes.data);
      }
      if (histRes && histRes.success) {
        setPaymentsHistory(
          histRes.data?.data ||
          histRes.data?.payments ||
          (Array.isArray(histRes.data) ? histRes.data : [])
        );
      }
      if (delivRes && delivRes.success) {
        setDeliveriesHistory(
          delivRes.data?.data ||
          delivRes.data?.deliveries ||
          (Array.isArray(delivRes.data) ? delivRes.data : [])
        );
      }
    } catch (e) {
      console.warn('Failed to load payment data:', e);
    } finally {
      setIsDashboardLoading(false);
      setIsHistoryLoading(false);
      setIsDeliveriesLoading(false);
    }
  }, [deal, currentUserCompanyIds, routeData]);

  useEffect(() => {
    if (deal && currentUserCompanyIds.length > 0) {
      fetchPaymentData();
    }
  }, [deal, currentUserCompanyIds, fetchPaymentData]);

  // Derived Properties & Roles
  const normalizeId = (val) => String(val?._id || val?.id || val || '');
  const sellerCid = normalizeId(deal?.sellerCompanyId);
  const buyerCid = normalizeId(deal?.buyerCompanyId);
  const brokerCid = normalizeId(deal?.brokerCompanyId);

  const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
  const currentUserRole = deal?.currentUserRole || viewerRole;

  const isSeller =
    currentUserRole === 'seller' ||
    viewerRole === 'seller' ||
    currentUserCompanyIds.some(
      (id) => id && String(id).toLowerCase() === String(sellerCid).toLowerCase()
    );
  const isBuyer =
    currentUserRole === 'buyer' ||
    viewerRole === 'buyer' ||
    currentUserCompanyIds.some(
      (id) => id && String(id).toLowerCase() === String(buyerCid).toLowerCase()
    );
  const isBroker =
    currentUserRole === 'broker' ||
    viewerRole === 'broker' ||
    (!!brokerCid &&
      currentUserCompanyIds.some(
        (id) => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()
      ));

  const isExpired = String(deal?.status || '').toLowerCase() === 'expired';
  const isPending = String(deal?.status || '').toLowerCase() === 'pending';
  const isActive =
    String(deal?.status || '').toLowerCase() === 'active' ||
    String(deal?.status || '').toLowerCase() === 'approved' ||
    String(deal?.status || '').toLowerCase() === 'in_progress';
  const isRejected =
    String(deal?.status || '').toLowerCase() === 'rejected' ||
    String(deal?.status || '').toLowerCase() === 'cancelled';
  const isCompleted = String(deal?.status || '').toLowerCase() === 'completed';
  const isActiveOrCompleted = isActive || isCompleted;

  const creatorRole = deal?.createdByRole || deal?.creatorRole || deal?.role || 'seller';
  const approvalStatus = deal?.approvalStatus || {};

  const getPartyApprovalStatus = (partyRole, companyId) => {
    if (approvalStatus[partyRole]) return String(approvalStatus[partyRole]).toLowerCase();
    if (deal?.acceptedBy && deal.acceptedBy.length > 0 && companyId) {
      const record = deal.acceptedBy.find(
        (r) => normalizeId(r.companyId) === normalizeId(companyId)
      );
      if (record) {
        if (record.status === 'accepted') return 'approved';
        return String(record.status).toLowerCase();
      }
    }
    if (creatorRole === partyRole) return 'approved';
    return 'pending';
  };

  const rawSellerStatus = getPartyApprovalStatus('seller', deal?.sellerCompanyId);
  const rawBuyerStatus = getPartyApprovalStatus('buyer', deal?.buyerCompanyId);

  const sellerApproved =
    rawSellerStatus === 'approved' ||
    rawSellerStatus === 'accepted' ||
    isActiveOrCompleted ||
    creatorRole === 'seller';
  const sellerRejected = rawSellerStatus === 'rejected' || (isRejected && deal?.rejectedByRole === 'seller');

  const buyerApproved =
    rawBuyerStatus === 'approved' ||
    rawBuyerStatus === 'accepted' ||
    isActiveOrCompleted ||
    creatorRole === 'buyer';
  const buyerRejected = rawBuyerStatus === 'rejected' || (isRejected && deal?.rejectedByRole === 'buyer');

  const bothApproved = (sellerApproved && buyerApproved) || isActiveOrCompleted;

  const isCreatorCompany =
    (creatorRole === 'seller' && isSeller) ||
    (creatorRole === 'buyer' && isBuyer) ||
    (creatorRole === 'broker' && isBroker);

  let showApproveButton = false;
  let showRejectButton = false;
  if (isPending && !isBroker) {
    if (!isCreatorCompany) {
      showApproveButton = deal?.hasOwnProperty('canApprove') ? !!deal.canApprove : true;
      showRejectButton = deal?.hasOwnProperty('canReject') ? !!deal.canReject : true;
    }
  }

  // Deal Calculations
  const getDealTotals = () => {
    if (!deal) return { qty: 0, totalVal: 0, firstProductName: '', hasMultiple: false, count: 0 };
    if (deal.products && deal.products.length > 0) {
      let totalQty = 0;
      let totalValueAmt = 0;
      deal.products.forEach((p) => {
        totalQty += Number(p.quantity) || 0;
        totalValueAmt +=
          Number(p.totalAmount || Number(p.quantity) * Number(p.price)) || 0;
      });
      return {
        qty: totalQty,
        totalVal: totalValueAmt,
        firstProductName:
          deal.products[0]?.productId?.name ||
          deal.products[0]?.name ||
          deal.title ||
          deal.dealName ||
          deal.productName ||
          '',
        hasMultiple: deal.products.length > 1,
        count: deal.products.length,
      };
    }

    const firstProd = deal.product || {};
    const qtyVal = Number(firstProd.quantity || deal.quantity || deal.qty) || 0;
    const priceVal = Number(firstProd.price || deal.price || deal.rate) || 0;
    const computedTotal =
      Number(deal.totalAmount || deal.grandTotal || firstProd.totalAmount) ||
      (qtyVal && priceVal ? qtyVal * priceVal : priceVal) ||
      0;

    return {
      qty: qtyVal,
      totalVal: computedTotal,
      firstProductName:
        firstProd.productId?.name ||
        firstProd.name ||
        (typeof firstProd === 'string' ? firstProd : '') ||
        deal.title ||
        deal.dealName ||
        deal.productName ||
        '',
      hasMultiple: false,
      count: 1,
    };
  };

  const dealTotals = getDealTotals();
  const productName = dealTotals.firstProductName || deal?.title || deal?.dealName || deal?.productName || 'Deal Product';
  const qty = dealTotals.qty;
  const totalVal = Number(deal?.totalAmount || deal?.grandTotal || dealTotals.totalVal || 0);
  const totalValFormatted = totalVal ? totalVal.toLocaleString('en-IN') : '0';
  const ratePerUnit = Number(deal?.price || deal?.rate || deal?.product?.price || (qty && totalVal ? totalVal / qty : 0));
  const rateFormatted = ratePerUnit ? ratePerUnit.toLocaleString('en-IN') : '0';
  const unitName = deal?.unit || deal?.product?.unit || deal?.products?.[0]?.unit || 'Units';

  // Date Formats
  const rawDealDate = deal?.dealDate || deal?.createdAt;
  const dealDateObj = rawDealDate ? new Date(rawDealDate) : new Date();
  const formattedDealDate = rawDealDate
    ? dealDateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : '—';
  const formattedDealTime = rawDealDate
    ? dealDateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    : '';

  const deliveryDateRaw = deal?.deliveryDate || deal?.expiryDate || deal?.validityDate;
  const formattedDeliveryDate = deliveryDateRaw
    ? new Date(deliveryDateRaw).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : '';

  // Deal ID display
  const dealIdStr =
    deal?.dealNumber ||
    deal?.saudaNumber ||
    deal?.dealNo ||
    (deal?._id ? `PRV-${String(deal._id).slice(-8).toUpperCase()}` : '');

  // Parties info
  const rawSellerCompany =
    (typeof deal?.sellerCompanyId === 'object' && deal?.sellerCompanyId !== null ? deal?.sellerCompanyId : null) ||
    (typeof deal?.sellerCompany === 'object' && deal?.sellerCompany !== null ? deal?.sellerCompany : null) ||
    (typeof deal?.seller?.companyId === 'object' && deal?.seller?.companyId !== null ? deal?.seller?.companyId : null) ||
    (typeof deal?.seller?.company === 'object' && deal?.seller?.company !== null ? deal?.seller?.company : null) ||
    (typeof deal?.party1?.company === 'object' && deal?.party1?.company !== null ? deal?.party1?.company : null) ||
    (typeof deal?.party1 === 'object' && deal?.party1 !== null ? deal?.party1 : null) ||
    {};
  const sellerCompany = sellerCompanyDetails || rawSellerCompany;

  const sellerName =
    sellerCompanyDetails?.name ||
    sellerCompanyDetails?.companyName ||
    sellerCompanyDetails?.businessName ||
    rawSellerCompany.name ||
    rawSellerCompany.companyName ||
    rawSellerCompany.businessName ||
    deal?.sellerName ||
    deal?.sellerCompanyName ||
    'Seller';

  const sellerLogo =
    sellerCompanyDetails?.logo ||
    sellerCompanyDetails?.logoUrl ||
    sellerCompanyDetails?.image ||
    sellerCompanyDetails?.companyLogo ||
    sellerCompanyDetails?.avatar ||
    rawSellerCompany.logo ||
    rawSellerCompany.logoUrl ||
    rawSellerCompany.image ||
    rawSellerCompany.companyLogo ||
    rawSellerCompany.avatar ||
    deal?.sellerLogo ||
    deal?.sellerCompanyLogo;

  const rawSellerPhone =
    sellerCompanyDetails?.phone ||
    sellerCompanyDetails?.mobileNumber ||
    sellerCompanyDetails?.mobile ||
    sellerCompanyDetails?.ownerPhone ||
    rawSellerCompany.phone ||
    rawSellerCompany.mobileNumber ||
    rawSellerCompany.mobile ||
    rawSellerCompany.ownerPhone ||
    deal?.sellerPhone ||
    '';
  const sellerPhone =
    rawSellerPhone && rawSellerPhone !== '—' && rawSellerPhone !== 'undefined' && rawSellerPhone !== 'null'
      ? String(rawSellerPhone).trim()
      : '';

  const sellerHasGst = !!(
    sellerCompany?.registrationNumber ||
    sellerCompany?.gstin ||
    sellerCompany?.gstNumber ||
    sellerCompanyDetails?.registrationNumber ||
    sellerCompanyDetails?.gstin ||
    sellerCompany?.isGstVerified ||
    sellerCompany?.isVerified
  );

  const sellerEmail =
    sellerCompanyDetails?.email && sellerCompanyDetails.email !== '—'
      ? sellerCompanyDetails.email
      : rawSellerCompany.email && rawSellerCompany.email !== '—'
        ? rawSellerCompany.email
        : '';

  const rawBuyerCompany =
    (typeof deal?.buyerCompanyId === 'object' && deal?.buyerCompanyId !== null ? deal?.buyerCompanyId : null) ||
    (typeof deal?.buyerCompany === 'object' && deal?.buyerCompany !== null ? deal?.buyerCompany : null) ||
    (typeof deal?.buyer?.companyId === 'object' && deal?.buyer?.companyId !== null ? deal?.buyer?.companyId : null) ||
    (typeof deal?.buyer?.company === 'object' && deal?.buyer?.company !== null ? deal?.buyer?.company : null) ||
    (typeof deal?.party2?.company === 'object' && deal?.party2?.company !== null ? deal?.party2?.company : null) ||
    (typeof deal?.party2 === 'object' && deal?.party2 !== null ? deal?.party2 : null) ||
    {};
  const buyerCompany = buyerCompanyDetails || rawBuyerCompany;

  const buyerName =
    buyerCompanyDetails?.name ||
    buyerCompanyDetails?.companyName ||
    buyerCompanyDetails?.businessName ||
    rawBuyerCompany.name ||
    rawBuyerCompany.companyName ||
    rawBuyerCompany.businessName ||
    deal?.buyerName ||
    deal?.buyerCompanyName ||
    'Buyer';

  const buyerLogo =
    buyerCompanyDetails?.logo ||
    buyerCompanyDetails?.logoUrl ||
    buyerCompanyDetails?.image ||
    buyerCompanyDetails?.companyLogo ||
    buyerCompanyDetails?.avatar ||
    rawBuyerCompany.logo ||
    rawBuyerCompany.logoUrl ||
    rawBuyerCompany.image ||
    rawBuyerCompany.companyLogo ||
    rawBuyerCompany.avatar ||
    deal?.buyerLogo ||
    deal?.buyerCompanyLogo;

  const rawBuyerPhone =
    buyerCompanyDetails?.phone ||
    buyerCompanyDetails?.mobileNumber ||
    buyerCompanyDetails?.mobile ||
    buyerCompanyDetails?.ownerPhone ||
    rawBuyerCompany.phone ||
    rawBuyerCompany.mobileNumber ||
    rawBuyerCompany.mobile ||
    rawBuyerCompany.ownerPhone ||
    deal?.buyerPhone ||
    '';
  const buyerPhone =
    rawBuyerPhone && rawBuyerPhone !== '—' && rawBuyerPhone !== 'undefined' && rawBuyerPhone !== 'null'
      ? String(rawBuyerPhone).trim()
      : '';

  const buyerHasGst = !!(
    buyerCompany?.registrationNumber ||
    buyerCompany?.gstin ||
    buyerCompany?.gstNumber ||
    buyerCompanyDetails?.registrationNumber ||
    buyerCompanyDetails?.gstin ||
    buyerCompany?.isGstVerified ||
    buyerCompany?.isVerified
  );

  const buyerEmail =
    buyerCompanyDetails?.email && buyerCompanyDetails.email !== '—'
      ? buyerCompanyDetails.email
      : rawBuyerCompany.email && rawBuyerCompany.email !== '—'
        ? rawBuyerCompany.email
        : '';

  // Commodity variety, HSN, location & terms
  const firstProd = deal?.products?.[0] || deal?.product || {};
  const prodObj = firstProd.productId || firstProd || {};
  const productImageUri =
    prodObj?.image ||
    prodObj?.imageUrl ||
    firstProd?.image ||
    firstProd?.imageUrl ||
    deal?.productImage ||
    deal?.image ||
    deal?.images?.[0] ||
    deal?.product?.image;

  const varietyText =
    deal?.variety ||
    deal?.quality ||
    firstProd.grade ||
    firstProd.variety ||
    deal?.productDescription ||
    prodObj?.variety ||
    '';
  const hsnCode = firstProd.hsn || prodObj.hsnCode || deal?.hsnCode || '';
  const paymentTerms =
    deal?.paymentTerms && deal.paymentTerms !== '—'
      ? String(deal.paymentTerms).trim()
      : deal?.terms && deal.terms !== '—'
        ? String(deal.terms).trim()
        : '';

  const rawDeliveryLocation =
    deal?.deliveryLocation ||
    deal?.deliveryAddress ||
    deal?.location ||
    deal?.placeOfDelivery ||
    deal?.deliveryCity ||
    '';
  const deliveryLocation =
    rawDeliveryLocation &&
      rawDeliveryLocation !== '—' &&
      rawDeliveryLocation !== 'undefined' &&
      rawDeliveryLocation !== 'null'
      ? String(rawDeliveryLocation).trim()
      : '';

  // Payment Status
  const paymentStatusStr = String(deal?.paymentStatus || paymentSummary?.status || '').toLowerCase();
  const paidAmt = Number(deal?.paidAmount || paymentSummary?.paidAmount || 0);
  const isPaymentDone =
    paymentStatusStr === 'paid' ||
    paymentStatusStr === 'completed' ||
    paymentStatusStr === 'full' ||
    (paymentSummary && Number(paymentSummary.paidAmount) >= Number(paymentSummary.totalAmount) && Number(paymentSummary.totalAmount) > 0) ||
    (paymentsHistory && paymentsHistory.some((p) => (p.status === 'completed' || p.status === 'success') && Number(p.amount) >= totalVal));

  const isPaymentPartial =
    !isPaymentDone &&
    (paymentStatusStr === 'partial' ||
      paymentStatusStr === 'in_progress' ||
      paidAmt > 0 ||
      (paymentsHistory && paymentsHistory.length > 0));

  // Delivery Status
  const deliveryStatusStr = String(deal?.deliveryStatus || deal?.dispatchStatus || '').toLowerCase();
  const isDeliveryDone =
    deliveryStatusStr === 'delivered' ||
    deliveryStatusStr === 'completed' ||
    (deliveriesHistory && deliveriesHistory.some((d) => d.status === 'delivered' || d.status === 'completed'));

  const isDeliveryInTransit =
    !isDeliveryDone &&
    (deliveryStatusStr === 'in_transit' ||
      deliveryStatusStr === 'dispatched' ||
      deliveryStatusStr === 'shipped' ||
      (deliveriesHistory && deliveriesHistory.length > 0));

  const isDealCompleted = isCompleted || (bothApproved && isPaymentDone && isDeliveryDone);

  // Status mapping for top header
  let statusHeaderTitle = 'Deal Confirmed';
  if (isPending) statusHeaderTitle = 'Pending Approval';
  else if (isCompleted || isDealCompleted) statusHeaderTitle = 'Deal Completed';
  else if (isRejected) statusHeaderTitle = 'Deal Cancelled';
  else if (isExpired) statusHeaderTitle = 'Deal Expired';
  else if (isActive) statusHeaderTitle = 'Deal Confirmed';

  const latestPaymentDate = useMemo(() => {
    if (paymentsHistory && paymentsHistory.length > 0) {
      const d = paymentsHistory[0]?.paymentDate || paymentsHistory[0]?.createdAt;
      if (d) return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    return null;
  }, [paymentsHistory]);

  const latestDeliveryDate = useMemo(() => {
    if (deliveriesHistory && deliveriesHistory.length > 0) {
      const d = deliveriesHistory[0]?.deliveryDate || deliveriesHistory[0]?.createdAt;
      if (d) return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    return null;
  }, [deliveriesHistory]);

  // Dynamic 6-step Deal Timeline configuration
  const timelineSteps = useMemo(() => {
    // Step 1: Created
    const step1 = {
      id: 'created',
      title: 'Created',
      status: 'completed',
      date: formattedDealDate,
      inactiveIcon: <Check size={14} color="#FFFFFF" strokeWidth={3} />,
    };

    // Step 2: Seller Approved
    let step2Status = 'inactive';
    let step2Date = 'Pending';
    if (sellerRejected) {
      step2Status = 'rejected';
      step2Date = 'Rejected';
    } else if (sellerApproved) {
      step2Status = 'completed';
      step2Date = formattedDealDate;
    } else if (isPending) {
      step2Status = 'in_progress';
      step2Date = 'Pending';
    }
    const step2 = {
      id: 'seller_approved',
      title: 'Seller Approved',
      status: step2Status,
      date: step2Date,
      inProgressIcon: <Clock size={14} color="#FFFFFF" strokeWidth={2.5} />,
      inactiveIcon: <Check size={14} color="#94A3B8" strokeWidth={2.5} />,
    };

    // Step 3: Buyer Approved
    let step3Status = 'inactive';
    let step3Date = 'Pending';
    if (buyerRejected) {
      step3Status = 'rejected';
      step3Date = 'Rejected';
    } else if (buyerApproved) {
      step3Status = 'completed';
      step3Date = formattedDealDate;
    } else if (isPending) {
      step3Status = 'in_progress';
      step3Date = 'Pending';
    }
    const step3 = {
      id: 'buyer_approved',
      title: 'Buyer Approved',
      status: step3Status,
      date: step3Date,
      inProgressIcon: <Clock size={14} color="#FFFFFF" strokeWidth={2.5} />,
      inactiveIcon: <Check size={14} color="#94A3B8" strokeWidth={2.5} />,
    };

    // Step 4: Payment
    let step4Status = 'inactive';
    let step4Date = 'Pending';
    if (isPaymentDone) {
      step4Status = 'completed';
      step4Date = latestPaymentDate || 'Paid';
    } else if (isPaymentPartial) {
      step4Status = 'in_progress';
      step4Date = 'Partial';
    } else if (bothApproved && !isRejected && !isExpired) {
      step4Status = 'in_progress';
      step4Date = 'Pending';
    }
    const step4 = {
      id: 'payment',
      title: 'Payment',
      status: step4Status,
      date: step4Date,
      inProgressIcon: <CreditCard size={14} color="#FFFFFF" strokeWidth={2.2} />,
      inactiveIcon: <CreditCard size={14} color="#94A3B8" strokeWidth={2} />,
    };

    // Step 5: Delivery
    let step5Status = 'inactive';
    let step5Date = 'Pending';
    if (isDeliveryDone) {
      step5Status = 'completed';
      step5Date = latestDeliveryDate || 'Delivered';
    } else if (isDeliveryInTransit) {
      step5Status = 'in_progress';
      step5Date = 'In Transit';
    } else if ((isPaymentDone || isPaymentPartial) && !isRejected && !isExpired) {
      step5Status = 'in_progress';
      step5Date = 'Pending';
    }
    const step5 = {
      id: 'delivery',
      title: 'Delivery',
      status: step5Status,
      date: step5Date,
      inProgressIcon: <Truck size={14} color="#FFFFFF" strokeWidth={2.2} />,
      inactiveIcon: <Truck size={14} color="#94A3B8" strokeWidth={2} />,
    };

    // Step 6: Completed
    let step6Status = 'inactive';
    let step6Date = 'Pending';
    if (isDealCompleted) {
      step6Status = 'completed';
      step6Date = formattedDeliveryDate !== '—' ? formattedDeliveryDate : formattedDealDate;
    }
    const step6 = {
      id: 'completed',
      title: 'Completed',
      status: step6Status,
      date: step6Date,
      inProgressIcon: <Check size={14} color="#FFFFFF" strokeWidth={3} />,
      inactiveIcon: <Check size={14} color="#94A3B8" strokeWidth={2.5} />,
    };

    return [step1, step2, step3, step4, step5, step6];
  }, [
    formattedDealDate,
    formattedDeliveryDate,
    sellerApproved,
    sellerRejected,
    buyerApproved,
    buyerRejected,
    isPending,
    bothApproved,
    isPaymentDone,
    isPaymentPartial,
    latestPaymentDate,
    isDeliveryDone,
    isDeliveryInTransit,
    latestDeliveryDate,
    isDealCompleted,
    isRejected,
    isExpired,
  ]);

  // Handler functions
  const handleAcceptDeal = async () => {
    setIsUpdating(true);
    try {
      const id = deal?._id || routeData?.dealId;
      const role =
        deal?.currentUserRole ||
        (isSeller ? 'seller' : isBuyer ? 'buyer' : isBroker ? 'broker' : '');
      const token = await AsyncStorage.getItem('userToken');
      const response = await acceptDeal(id, role, token);
      if (response && response.success) {
        Alert.alert('Success', 'Deal approved successfully', [
          { text: 'OK', onPress: () => fetchDealDetails() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to approve deal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectDeal = async () => {
    Alert.alert(
      'Decline Deal',
      'Are you sure you want to decline this trade agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const id = deal?._id || routeData?.dealId;
              const role =
                deal?.currentUserRole ||
                (isSeller ? 'seller' : isBuyer ? 'buyer' : isBroker ? 'broker' : '');
              const token = await AsyncStorage.getItem('userToken');
              const response = await rejectDeal(
                id,
                role,
                'Deal terms not acceptable',
                token
              );
              if (response && response.success) {
                Alert.alert('Success', 'Agreement declined successfully', [
                  { text: 'OK', onPress: () => fetchDealDetails() },
                ]);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to decline deal');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const openPaymentModal = () => {
    setPaymentType(isBuyer ? 'sent' : isSeller ? 'received' : 'sent');
    setPaymentAmount('');
    setPaymentMethod('UPI');
    setPaymentNotes('');
    setIsPaymentModalVisible(true);
  };

  const handleLogPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than 0.');
      return;
    }

    setIsLoggingPayment(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: deal._id,
        amount: amt,
        paymentType,
        paymentMethod,
        notes: paymentNotes || undefined,
      };

      const res = await recordPayment(payload, token);
      if (res && res.success) {
        Alert.alert('Success', 'Payment entry logged successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setIsPaymentModalVisible(false);
              fetchPaymentData();
              fetchDealDetails();
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Logging Failed', err.message || 'Failed to record payment');
    } finally {
      setIsLoggingPayment(false);
    }
  };

  // GST Breakdown calculations
  const getGstBreakdown = () => {
    if (!deal) return { items: [], baseTotal: 0, discountTotal: 0, gstTotal: 0, grandTotal: 0 };
    let baseTotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    let items = [];

    if (deal.products && deal.products.length > 0) {
      deal.products.forEach((prod, index) => {
        const qtyVal = Number(prod.quantity) || 0;
        const priceVal = Number(prod.price) || 0;
        const discountVal = Number(prod.discount) || 0;
        const gstPercent = Number(prod.gst) || 0;

        const subtotal = qtyVal * priceVal;
        const subtotalAfterDiscount = Math.max(0, subtotal - discountVal);
        const gstAmount = subtotalAfterDiscount * (gstPercent / 100);
        const total = subtotalAfterDiscount + gstAmount;

        baseTotal += subtotal;
        discountTotal += discountVal;
        gstTotal += gstAmount;

        items.push({
          name: prod.productId?.name || prod.name || `Item #${index + 1}`,
          qty: qtyVal,
          price: priceVal,
          discount: discountVal,
          gstPercent,
          gstAmount,
          total,
        });
      });
    } else {
      const qtyVal = Number(qty) || 1;
      const priceVal = Number(ratePerUnit) || 0;
      const discountVal = Number(deal.discount || 0);
      const gstPercent = Number(deal.gst || 5);

      const subtotal = qtyVal * priceVal;
      const subtotalAfterDiscount = Math.max(0, subtotal - discountVal);
      const gstAmount = subtotalAfterDiscount * (gstPercent / 100);
      const total = subtotalAfterDiscount + gstAmount;

      baseTotal = subtotal;
      discountTotal = discountVal;
      gstTotal = gstAmount;

      items.push({
        name: productName,
        qty: qtyVal,
        price: priceVal,
        discount: discountVal,
        gstPercent,
        gstAmount,
        total,
      });
    }

    return {
      items,
      baseTotal,
      discountTotal,
      gstTotal,
      grandTotal: baseTotal - discountTotal + gstTotal,
    };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1541D8" />
          <Text style={styles.loadingText}>Fetching deal details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!deal) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerBox}>
          <Package size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Deal record not found</Text>
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => onNavigate('pop')}
          >
            <Text style={styles.returnBtnText}>Return to Deals</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP NAVIGATION HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={19} color="#1E293B" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitleMain}>Deal Details</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => Alert.alert('Share Deal', `Sharing agreement ${dealIdStr}`)}
            activeOpacity={0.7}
          >
            <Share2 size={18} color="#1E293B" strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerCircleBtn, { marginLeft: 8 }]}
            onPress={() => setIsMoreMenuVisible(true)}
            activeOpacity={0.7}
          >
            <MoreVertical size={18} color="#1E293B" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── 2. DEAL CONFIRMED / STATUS CARD ─── */}
        <View style={styles.dealStatusCard}>
          <View style={styles.dealStatusLeft}>
            <View style={isPending ? styles.checkCircleOrange : styles.checkCircleGreen}>
              {isPending ? (
                <Clock size={18} color="#FFFFFF" strokeWidth={2.8} />
              ) : (
                <Check size={18} color="#FFFFFF" strokeWidth={3.2} />
              )}
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.dealStatusTitle}>{statusHeaderTitle}</Text>
              <Text style={styles.dealStatusSubtitle}>
                {formattedDealDate}{formattedDealTime ? ` • ${formattedDealTime}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.dealStatusRight}>
            <Text style={styles.dealIdLabel}>DEAL ID</Text>
            <Text style={styles.dealIdValue}>{dealIdStr}</Text>
          </View>
        </View>

        {/* ─── 3. SELLER & BUYER DUAL COLUMN CARD ─── */}
        <View style={styles.partiesCard}>
          {/* Seller Column */}
          <View style={styles.partyColumn}>
            <Text style={styles.partyRoleBadge}>Seller</Text>
            <View style={styles.partyIdentityRow}>
              <View style={[styles.avatarCircle, { backgroundColor: '#E0F2FE' }]}>
                {sellerLogo && !sellerImgError ? (
                  <Image
                    source={{ uri: resolveImageUrl(sellerLogo) }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                    onError={() => setSellerImgError(true)}
                  />
                ) : (
                  <Text style={[styles.avatarLetter, { color: '#0284C7' }]}>
                    {sellerName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={styles.partyCompanyName} numberOfLines={1}>
                {sellerName}
              </Text>
            </View>

            {sellerHasGst ? (
              <View style={styles.verifiedRow}>
                <Check size={12} color="#10B981" strokeWidth={3} />
                <Text style={styles.verifiedText}>GST Verified</Text>
              </View>
            ) : null}

            {sellerPhone ? (
              <View style={styles.contactRow}>
                <Phone size={13} color="#64748B" />
                <Text style={styles.contactText}>{sellerPhone}</Text>
              </View>
            ) : null}
          </View>

          {/* Center Vertical Divider */}
          <View style={styles.verticalDivider} />

          {/* Buyer Column */}
          <View style={styles.partyColumn}>
            <Text style={styles.partyRoleBadge}>Buyer</Text>
            <View style={styles.partyIdentityRow}>
              <View style={[styles.avatarCircle, { backgroundColor: '#DCFCE7' }]}>
                {buyerLogo && !buyerImgError ? (
                  <Image
                    source={{ uri: resolveImageUrl(buyerLogo) }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                    onError={() => setBuyerImgError(true)}
                  />
                ) : (
                  <Text style={[styles.avatarLetter, { color: '#16A34A' }]}>
                    {buyerName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={styles.partyCompanyName} numberOfLines={1}>
                {buyerName}
              </Text>
            </View>

            {buyerHasGst ? (
              <View style={styles.verifiedRow}>
                <Check size={12} color="#10B981" strokeWidth={3} />
                <Text style={styles.verifiedText}>GST Verified</Text>
              </View>
            ) : null}

            {buyerPhone ? (
              <View style={styles.contactRow}>
                <Phone size={13} color="#64748B" />
                <Text style={styles.contactText}>{buyerPhone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ─── 4. COMMODITY & DETAILS CARD ─── */}
        <View style={styles.commodityCard}>
          {/* Header with Product Image and Name */}
          <View style={styles.commodityHeaderRow}>
            {productImageUri && !productImgError ? (
              <Image
                source={{ uri: resolveImageUrl(productImageUri) }}
                style={styles.commodityImage}
                resizeMode="cover"
                onError={() => setProductImgError(true)}
              />
            ) : (
              <View style={[styles.commodityImage, styles.commodityImagePlaceholder]}>
                <Package size={26} color="#2563EB" strokeWidth={2.2} />
              </View>
            )}

            <View style={styles.commodityTitleBox}>
              <Text style={styles.commodityTitleText} numberOfLines={1}>
                {productName}
              </Text>
              {varietyText ? (
                <Text style={styles.commodityVarietyText}>{varietyText}</Text>
              ) : null}
              {hsnCode ? (
                <View style={styles.hsnBadge}>
                  <Text style={styles.hsnText}>HSN: {hsnCode}</Text>
                </View>
              ) : null}
            </View>

            {qty > 0 ? (
              <View style={styles.quantityBox}>
                <Text style={styles.quantityValText}>
                  {qty} {unitName}
                </Text>
                <Text style={styles.quantitySubLabel}>Quantity</Text>
              </View>
            ) : null}
          </View>

          {/* Key Value Rows with Light-Blue Icon Circles */}
          {/* Row 1: Rate */}
          {rateFormatted && rateFormatted !== '0' ? (
            <>
              <View style={styles.cardDivider} />
              <View style={styles.specRow}>
                <View style={styles.specLeft}>
                  <View style={styles.specIconCircle}>
                    <Text style={styles.rupeeIconText}>₹</Text>
                  </View>
                  <Text style={styles.specLabel}>Rate (per Unit)</Text>
                </View>
                <Text style={styles.specValueBold}>₹ {rateFormatted}</Text>
              </View>
            </>
          ) : null}

          {/* Row 2: Total Deal Value */}
          {totalValFormatted && totalValFormatted !== '0' ? (
            <>
              <View style={styles.cardDivider} />
              <View style={styles.specRow}>
                <View style={styles.specLeft}>
                  <View style={styles.specIconCircle}>
                    <FileSpreadsheet size={16} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.specLabel}>Total Deal Value</Text>
                </View>
                <Text style={styles.specValueBold}>₹ {totalValFormatted}</Text>
              </View>
            </>
          ) : null}

          {/* Row 3: Delivery Date */}
          {formattedDeliveryDate ? (
            <>
              <View style={styles.cardDivider} />
              <View style={styles.specRow}>
                <View style={styles.specLeft}>
                  <View style={styles.specIconCircle}>
                    <Calendar size={16} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.specLabel}>Delivery Date</Text>
                </View>
                <Text style={styles.specValueBold}>{formattedDeliveryDate}</Text>
              </View>
            </>
          ) : null}

          {/* Row 4: Payment Terms */}
          {paymentTerms ? (
            <>
              <View style={styles.cardDivider} />
              <View style={styles.specRow}>
                <View style={styles.specLeft}>
                  <View style={styles.specIconCircle}>
                    <CreditCard size={16} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.specLabel}>Payment Terms</Text>
                </View>
                <Text style={styles.specValueBold}>{paymentTerms}</Text>
              </View>
            </>
          ) : null}

          {/* Row 5: Delivery Location */}
          {deliveryLocation ? (
            <>
              <View style={styles.cardDivider} />
              <View style={[styles.specRow, { alignItems: 'flex-start' }]}>
                <View style={[styles.specLeft, { marginTop: 2 }]}>
                  <View style={styles.specIconCircle}>
                    <MapPin size={16} color="#2563EB" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.specLabel}>Delivery Location</Text>
                </View>
                <Text style={styles.locationValText}>{deliveryLocation}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* ─── 5. DEAL TIMELINE STEPPER ─── */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Deal Timeline</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepperContainer}
          >
            {timelineSteps.map((step, idx) => {
              const isFirst = idx === 0;
              const prevStep = idx > 0 ? timelineSteps[idx - 1] : null;
              const isLineActive =
                prevStep &&
                prevStep.status === 'completed' &&
                (step.status === 'completed' || step.status === 'in_progress');

              return (
                <React.Fragment key={step.id}>
                  {/* Connecting line before this node */}
                  {!isFirst && (
                    <View
                      style={[
                        styles.stepLine,
                        isLineActive ? styles.stepLineActive : styles.stepLineInactive,
                      ]}
                    />
                  )}

                  {/* Step Node */}
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        step.status === 'completed' && styles.stepCircleCompleted,
                        step.status === 'in_progress' && styles.stepCirclePending,
                        step.status === 'rejected' && styles.stepCircleRejected,
                        step.status === 'inactive' && styles.stepCircleInactive,
                      ]}
                    >
                      {step.status === 'completed' ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : step.status === 'in_progress' ? (
                        step.inProgressIcon || <Clock size={14} color="#FFFFFF" strokeWidth={2.5} />
                      ) : step.status === 'rejected' ? (
                        <X size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        step.inactiveIcon || <Clock size={14} color="#94A3B8" />
                      )}
                    </View>
                    <Text style={styles.stepTitle} numberOfLines={1}>
                      {step.title}
                    </Text>
                    <Text style={styles.stepDate} numberOfLines={1}>
                      {step.date}
                    </Text>
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 6. DOCUMENTS SECTION ─── */}
        <View style={styles.documentsSection}>
          <View style={styles.documentsHeaderRow}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => setIsGstModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.docsScroll}
          >
            {/* Doc 1: Proforma Invoice */}
            <View style={styles.docCard}>
              <View style={styles.docIconBadgeRed}>
                <Text style={styles.docBadgeTextRed}>PDF</Text>
              </View>
              <View style={styles.docInfoBox}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  Proforma Invoice
                </Text>
                <Text style={styles.docSize}>{dealIdStr}</Text>
              </View>
              <TouchableOpacity
                style={styles.docDownloadBtn}
                onPress={() => setIsGstModalVisible(true)}
              >
                <Download size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>

            {/* Doc 2: Price Sheet */}
            <View style={styles.docCard}>
              <View style={styles.docIconBadgeGreen}>
                <Text style={styles.docBadgeTextGreen}>XLS</Text>
              </View>
              <View style={styles.docInfoBox}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  Price Sheet
                </Text>
                <Text style={styles.docSize}>Deal Pricing</Text>
              </View>
              <TouchableOpacity
                style={styles.docDownloadBtn}
                onPress={() => Alert.alert('Price Sheet', 'Opening deal pricing sheet...')}
              >
                <Download size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>

            {/* Doc 3: Terms & Conditions */}
            <View style={styles.docCard}>
              <View style={styles.docIconBadgeRed}>
                <Text style={styles.docBadgeTextRed}>PDF</Text>
              </View>
              <View style={styles.docInfoBox}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  Terms & Conditions
                </Text>
                <Text style={styles.docSize}>Contract Terms</Text>
              </View>
              <TouchableOpacity
                style={styles.docDownloadBtn}
                onPress={() => Alert.alert('Terms & Conditions', 'Opening contract terms & conditions...')}
              >
                <Download size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* ─── 7. PENDING APPROVAL ACTION BUTTONS (If in review) ─── */}
        {isPending && (showApproveButton || showRejectButton) && (
          <View style={styles.actionButtonsRow}>
            {showRejectButton && (
              <TouchableOpacity
                style={styles.declineOutlineBtn}
                onPress={handleRejectDeal}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                <X size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.declineOutlineText}>
                  {isUpdating ? 'Declining...' : 'Decline Deal'}
                </Text>
              </TouchableOpacity>
            )}

            {showApproveButton && (
              <TouchableOpacity
                style={styles.primaryApproveBtn}
                onPress={handleAcceptDeal}
                disabled={isUpdating}
                activeOpacity={0.85}
              >
                <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryApproveText}>
                  {isUpdating ? 'Approving...' : 'Approve Deal'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── 8. PRIMARY ACTION BUTTONS: EDIT DEAL & VIEW INVOICE ─── */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.editDealBtn}
            onPress={() => onNavigate('CreateDeal', { prefillDeal: deal, prefill: deal })}
            activeOpacity={0.85}
          >
            <Edit3 size={18} color="#1541D8" style={{ marginRight: 8 }} />
            <Text style={styles.editDealBtnText}>Edit Deal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewInvoiceBtn}
            onPress={() => setIsGstModalVisible(true)}
            activeOpacity={0.85}
          >
            <FileText size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.viewInvoiceBtnText}>View Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 9. NEED HELP? PRAVISTI AI BANNER ─── */}
        <View style={styles.aiHelpCard}>
          <View style={styles.aiHelpLeft}>
            <Image
              source={require('../../../images/charter.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
            <View style={styles.aiHelpTextBox}>
              <Text style={styles.aiHelpTitle}>Need Help?</Text>
              <Text style={styles.aiHelpSubtitle}>
                Our AI Assistant is here to help with your deal.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.askAiBtn}
            onPress={() => onNavigate('DealChat', { dealId: deal._id || deal.id, deal })}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#1541D8" style={{ marginRight: 6 }} />
            <Text style={styles.askAiBtnText}>Ask Pravisti AI</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ─── 10. BOTTOM NAVIGATION BAR ─── */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('Dashboard')}
          activeOpacity={0.7}
        >
          <Home size={22} color="#64748B" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('DealsList')}
          activeOpacity={0.7}
        >
          <FileText size={22} color="#1541D8" />
          <Text style={[styles.tabLabel, { color: '#1541D8', fontWeight: '700' }]}>
            Deals
          </Text>
          <View style={styles.activeTabIndicator} />
        </TouchableOpacity>

        {/* Center Mic Button */}
        <TouchableOpacity
          style={styles.micCircleButton}
          onPress={() => onNavigate('DealChat', { dealId: deal._id || deal.id, deal })}
          activeOpacity={0.9}
        >
          <Mic size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('TransactionHistory', { dealId: deal._id })}
          activeOpacity={0.7}
        >
          <PieChart size={22} color="#64748B" />
          <Text style={styles.tabLabel}>Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setIsMoreMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Grid size={22} color="#64748B" />
          <Text style={styles.tabLabel}>More</Text>
        </TouchableOpacity>
      </View>

      {/* ─── MORE OPTIONS ACTION SHEET MODAL ─── */}
      <Modal
        visible={isMoreMenuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsMoreMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsMoreMenuVisible(false)}
        >
          <View style={styles.actionSheetCard}>
            <Text style={styles.actionSheetTitle}>Deal Options</Text>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setIsMoreMenuVisible(false);
                onNavigate('DealChat', { dealId: deal._id || deal.id, deal });
              }}
            >
              <MessageSquare size={18} color="#1541D8" />
              <Text style={styles.actionSheetItemText}>Open Deal Chat & Ledger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setIsMoreMenuVisible(false);
                openPaymentModal();
              }}
            >
              <CreditCard size={18} color="#16A34A" />
              <Text style={styles.actionSheetItemText}>Record Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setIsMoreMenuVisible(false);
                setIsGstModalVisible(true);
              }}
            >
              <Percent size={18} color="#2563EB" />
              <Text style={styles.actionSheetItemText}>GST & Invoice Summary</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 }} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                setIsMoreMenuVisible(false);
                Alert.alert('Download Contract', 'Downloading verified PDF contract...');
              }}
            >
              <Download size={18} color="#475569" />
              <Text style={styles.actionSheetItemText}>Download PDF Contract</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── RECORD PAYMENT MODAL ─── */}
      <Modal
        visible={isPaymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Payment Direction</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    paymentType === 'sent' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setPaymentType('sent')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      paymentType === 'sent' && styles.segmentTextActive,
                    ]}
                  >
                    Payment Sent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    paymentType === 'received' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setPaymentType('received')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      paymentType === 'received' && styles.segmentTextActive,
                    ]}
                  >
                    Payment Received
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>

              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodPillRow}>
                {['UPI', 'Bank Transfer', 'Cash', 'Cheque'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodPill,
                      paymentMethod === m && styles.methodPillActive,
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text
                      style={[
                        styles.methodPillText,
                        paymentMethod === m && styles.methodPillTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Notes / Reference (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Transaction Ref / Bank Ref Number"
                placeholderTextColor="#94A3B8"
                value={paymentNotes}
                onChangeText={setPaymentNotes}
              />

              <TouchableOpacity
                style={styles.primarySubmitBtn}
                onPress={handleLogPayment}
                disabled={isLoggingPayment}
              >
                {isLoggingPayment ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primarySubmitBtnText}>Submit Payment Entry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── GST BREAKDOWN MODAL ─── */}
      <Modal
        visible={isGstModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsGstModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tax & Invoice Summary</Text>
              <TouchableOpacity onPress={() => setIsGstModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {getGstBreakdown().items.map((item, idx) => (
                <View key={idx} style={styles.gstItemCard}>
                  <Text style={styles.gstItemName}>{item.name}</Text>
                  <View style={styles.gstRow}>
                    <Text style={styles.gstLabel}>Base Value</Text>
                    <Text style={styles.gstVal}>
                      ₹{(item.qty * item.price).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.gstRow}>
                    <Text style={styles.gstLabel}>GST Rate ({item.gstPercent}%)</Text>
                    <Text style={styles.gstVal}>
                      ₹{item.gstAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              ))}

              <View style={styles.gstTotalBox}>
                <Text style={styles.gstTotalLabel}>Grand Total (Incl. GST)</Text>
                <Text style={styles.gstTotalVal}>
                  ₹{Math.round(getGstBreakdown().grandTotal).toLocaleString('en-IN')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.downloadInvoiceBtn}
                onPress={() => {
                  setIsGstModalVisible(false);
                  Alert.alert('Invoice Generated', 'Downloading Proforma Invoice PDF...');
                }}
              >
                <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.downloadInvoiceBtnText}>Download Tax Invoice</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  returnBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1541D8',
    borderRadius: 8,
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // 1. Header
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleMain: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // 2. Deal Confirmed Status Card
  dealStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dealStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleOrange: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dealStatusSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  dealStatusRight: {
    alignItems: 'flex-end',
  },
  dealIdLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.4,
  },
  dealIdValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
    marginTop: 2,
  },

  // 3. Parties Dual Column Card
  partiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  partyColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  partyRoleBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  partyIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarLetter: {
    fontSize: 13,
    fontWeight: '700',
  },
  partyCompanyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },

  // 4. Commodity & Details Card
  commodityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  commodityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commodityImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  commodityImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  commodityTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  commodityTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  commodityVarietyText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  hsnBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  hsnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  quantityBox: {
    alignItems: 'flex-end',
  },
  quantityValText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  quantitySubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rupeeIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  specValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  amountWordsText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  locationValText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
    lineHeight: 17,
  },

  // 5. Timeline Stepper
  timelineSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  stepItem: {
    alignItems: 'center',
    width: 78,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleCompleted: {
    backgroundColor: '#1541D8',
  },
  stepCirclePending: {
    backgroundColor: '#F59E0B',
  },
  stepCircleRejected: {
    backgroundColor: '#EF4444',
  },
  stepCircleInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepLine: {
    height: 2.5,
    width: 22,
    marginTop: 13,
    borderRadius: 1.25,
  },
  stepLineActive: {
    backgroundColor: '#1541D8',
  },
  stepLineInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 13,
  },
  stepDate: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },

  // 6. Documents Section
  documentsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  documentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginRight: 2,
  },
  docsScroll: {
    gap: 10,
  },
  docCard: {
    width: 175,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docIconBadgeRed: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 4,
  },
  docBadgeTextRed: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  docIconBadgeGreen: {
    backgroundColor: '#10B981',
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 4,
  },
  docBadgeTextGreen: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  docInfoBox: {
    flex: 1,
    marginHorizontal: 8,
  },
  docTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSize: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  docDownloadBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 7. Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editDealBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1541D8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editDealBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1541D8',
  },
  viewInvoiceBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1541D8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  viewInvoiceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineOutlineBtn: {
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
  declineOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  primaryApproveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryApproveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 8. Pravisti AI Help Banner
  aiHelpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  aiHelpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  mascotImage: {
    width: 44,
    height: 44,
  },
  aiHelpTextBox: {
    marginLeft: 10,
    flex: 1,
  },
  aiHelpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiHelpSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  askAiBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1541D8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  askAiBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
  },

  // 9. Bottom Navigation Bar
  bottomTabBar: {
    height: 62,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 60,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#1541D8',
  },
  micCircleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1541D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modals & Action Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionSheetItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentTextActive: {
    fontWeight: '700',
    color: '#1541D8',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  methodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  methodPillActive: {
    borderColor: '#1541D8',
    backgroundColor: '#EFF6FF',
  },
  methodPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  methodPillTextActive: {
    fontWeight: '700',
    color: '#1541D8',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  primarySubmitBtn: {
    backgroundColor: '#1541D8',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  primarySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  gstItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  gstItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  gstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gstLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  gstVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  gstTotalBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gstTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  gstTotalVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1541D8',
  },
  downloadInvoiceBtn: {
    backgroundColor: '#1541D8',
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  downloadInvoiceBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DealDetails;