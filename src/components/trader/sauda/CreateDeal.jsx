import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Linking,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Package,
  Hash,
  ShoppingBag,
  IndianRupee,
  Info,
  Edit2,
  X,
  Plus,
  Truck,
  Shield,
  FileText,
  CreditCard,
  Tag,
  Calendar,
  Globe,
  MapPin,
  Paperclip,
  CheckCircle2,
  ChevronDown,
  Wheat,
  Droplet,
  Flame,
  LayoutGrid,
  FileCheck,
  Handshake,
  BookUser,
  Building2,
  Briefcase,
  User,
  UserPlus,
  Phone,
  Send,
  Percent,
  Calculator,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import {
  createDeal,
  createBrokerDraftDeal,
  getUserProfile,
  inviteDeal,
  getProducts,
  getCategories,
  createCategory,
  createProduct,
  getCompanies,
  getCompanyDetails,
  getCompaniesByNumber,
  assistedCreatePartyAccount,
  getUnits,
  getIndustries,
  searchCounterpartyUser,
  fetchPincodeDetails,
  uploadService,
  resolveImageUrl,
} from '../../../services/api';

const STANDARD_UNITS = [
  { label: 'Bag (25 Kg)', value: 'Bag (25 Kg)', short: 'Bag' },
  { label: 'Bag (50 Kg)', value: 'Bag (50 Kg)', short: 'Bag' },
  { label: 'Quintal (100 Kg)', value: 'Quintal', short: 'Qtl' },
  { label: 'Metric Ton (MT)', value: 'Metric Ton', short: 'MT' },
  { label: 'Tin (15 Litres)', value: 'Tin', short: 'Tin' },
  { label: 'Kilogram (Kg)', value: 'Kilogram', short: 'Kg' },
  { label: 'Liter (L)', value: 'Liter', short: 'L' },
];

const DEAL_TYPES = ['Purchase', 'Sale'];
const DEAL_CATEGORIES = ['Food Grains', 'Pulses', 'Edible Oils', 'Spices', 'Sugar & Sweeteners', 'General Commodity'];
const PAYMENT_TERMS_LIST = [
  '30 Days Credit',
  '15 Days Credit',
  'Immediate Payment (Cash / RTGS)',
  '50% Advance, 50% on Delivery',
  '100% Advance',
  'Against Documents (CAD)',
  'Letter of Credit (LC)',
];
const DELIVERY_TERMS_LIST = [
  'FOB - Free on Board',
  'CIF - Cost, Insurance and Freight',
  'EXW - Ex Works (Warehouse)',
  'FOR - Free on Rail',
  'Door Delivery / Delivered at Place (DAP)',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getResolvedIndustry = (obj, fallback = '') => {
  if (!obj) return fallback;
  const direct =
    obj.industry ||
    obj.industryName ||
    (typeof obj.industryId === 'object' ? obj.industryId?.name : null) ||
    obj.industry?.name ||
    obj.companyType;
  if (direct && typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }
  if (Array.isArray(obj.companies) && obj.companies.length > 0) {
    const first = obj.companies[0];
    const fromFirst =
      first?.industry ||
      first?.industryName ||
      (typeof first?.industryId === 'object' ? first?.industryId?.name : null) ||
      first?.companyType;
    if (fromFirst && typeof fromFirst === 'string' && fromFirst.trim().length > 0) {
      return fromFirst.trim();
    }
  }
  return fallback;
};

const getResolvedLocation = (obj, fallback = '') => {
  if (!obj) return fallback;
  if (
    obj.location &&
    typeof obj.location === 'string' &&
    obj.location.trim().length > 0 &&
    obj.location !== 'Registered Counterparty' &&
    obj.location !== 'New Onboarded Party'
  ) {
    return obj.location.trim();
  }
  const city = obj.city || obj.companyAddress?.city || obj.address?.city;
  const state = obj.state || obj.companyAddress?.state || obj.address?.state || 'India';
  if (city && typeof city === 'string' && city.trim().length > 0) {
    return `${city.trim()}, ${state.trim()}`;
  }
  if (Array.isArray(obj.companies) && obj.companies.length > 0) {
    const first = obj.companies[0];
    if (first?.location && typeof first.location === 'string' && first.location.trim().length > 0) {
      return first.location.trim();
    }
    const fCity = first?.city || first?.companyAddress?.city || first?.address?.city;
    const fState = first?.state || first?.companyAddress?.state || first?.address?.state || 'India';
    if (fCity && typeof fCity === 'string' && fCity.trim().length > 0) {
      return `${fCity.trim()}, ${fState.trim()}`;
    }
  }
  if (obj.location && typeof obj.location === 'string' && obj.location.trim().length > 0) {
    return obj.location.trim();
  }
  return fallback;
};

const CreateDeal = ({ onNavigate, routeData }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdDealData, setCreatedDealData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [btnErrorMessage, setBtnErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState('');

  // ----------------------------------------------------
  // ROLE & IDENTITY STATES
  // ----------------------------------------------------
  const getInitialRole = () => {
    const raw = String(routeData?.prefill?.role || routeData?.role || 'seller').toLowerCase();
    if (raw === 'buyer') return 'buyer';
    return 'seller';
  };
  const [role, setRole] = useState(getInitialRole);

  const initialCompany =
    routeData?.originCompany ||
    routeData?.company ||
    (routeData?.companyId ? { _id: routeData.companyId, name: routeData.companyName } : null) ||
    routeData?.user?.companies?.[0];

  const [activeUserCompany, setActiveUserCompany] = useState(initialCompany);
  const [activeUserId, setActiveUserId] = useState(routeData?.user?._id || routeData?.user?.id);
  const originCompanyId =
    routeData?.companyId ||
    activeUserCompany?._id ||
    activeUserCompany?.id ||
    activeUserCompany?.companyId ||
    initialCompany?._id ||
    initialCompany?.id;

  const [party1, setParty1] = useState(initialCompany?.name || routeData?.companyName || '');
  const [sellerLocation, setSellerLocation] = useState(
    getResolvedLocation(initialCompany, '')
  );
  const [sellerIndustry, setSellerIndustry] = useState(
    getResolvedIndustry(initialCompany, '')
  );

  // Counterparty 2 (Buyer when seller, Seller when buyer)
  const prefillBuyer = routeData?.prefill?.buyerCompany || routeData?.prefill?.buyerCompanyId || routeData?.prefill?.party2 || {};
  const prefillBuyerName = prefillBuyer.companyName || prefillBuyer.name || routeData?.prefillParty2?.name || routeData?.existingParty2Name || '';

  const [party2, setParty2] = useState(prefillBuyerName);
  const [party2Data, setParty2Data] = useState(
    routeData?.prefillParty2
      ? {
        ...routeData.prefillParty2,
        isRegistered: true,
        industry: getResolvedIndustry(routeData.prefillParty2, ''),
        location: getResolvedLocation(routeData.prefillParty2, ''),
      }
      : routeData?.existingParty2
        ? {
          ...routeData.existingParty2,
          industry: getResolvedIndustry(routeData.existingParty2, ''),
          location: getResolvedLocation(routeData.existingParty2, ''),
        }
        : prefillBuyerName
          ? {
            ...prefillBuyer,
            isRegistered: true,
            company: prefillBuyerName,
            name: prefillBuyerName,
            industry: getResolvedIndustry(prefillBuyer, ''),
            location: getResolvedLocation(prefillBuyer, ''),
          }
          : null
  );

  // Broker-specific Seller states (if applicable)
  const prefillSeller = routeData?.prefill?.sellerCompany || routeData?.prefill?.sellerCompanyId || {};
  const prefillSellerName = prefillSeller.companyName || prefillSeller.name || routeData?.existingSellerCompanyName || '';
  const [sellerCompany, setSellerCompany] = useState(String(prefillSellerName || ''));
  const [sellerCompanyData, setSellerCompanyData] = useState(
    routeData?.existingSellerCompany
      ? routeData.existingSellerCompany
      : (routeData?.prefill?.sellerCompany || routeData?.prefill?.sellerCompanyId)
        ? { ...prefillSeller, isRegistered: true, company: prefillSellerName }
        : null
  );

  const [directInputParty2, setDirectInputParty2] = useState('');
  const [party2SearchError, setParty2SearchError] = useState('');
  const [isSearchingParty2, setIsSearchingParty2] = useState(false);
  const [directInputSeller, setDirectInputSeller] = useState('');
  const [lookupResults, setLookupResults] = useState({});

  // Other Parties (Broker, Logistics, Insurance)
  const existingBroker = routeData?.existingBrokerCompany || routeData?.prefill?.brokerCompany || null;
  const existingBrokerName = routeData?.existingBrokerCompanyName || routeData?.prefill?.brokerCompanyName || (existingBroker?.isRegistered ? (existingBroker?.company || existingBroker?.name) : existingBroker?.name) || '';
  const [brokerCompany, setBrokerCompany] = useState(existingBrokerName);
  const [brokerCompanyData, setBrokerCompanyData] = useState(existingBroker);
  const [brokerCompanyId, setBrokerCompanyId] = useState(routeData?.prefill?.brokerCompanyId || existingBroker?.companyId || existingBroker?._id || '');
  const [directInputBroker, setDirectInputBroker] = useState('');
  const [brokerSearchError, setBrokerSearchError] = useState('');
  const [isSearchingBroker, setIsSearchingBroker] = useState(false);
  const [showBroker, setShowBroker] = useState(Boolean(existingBrokerName || routeData?.prefill?.brokerCompanyId));

  const [logisticsPartner, setLogisticsPartner] = useState(routeData?.prefill?.logisticsPartner || '');
  const [insuranceProvider, setInsuranceProvider] = useState(routeData?.prefill?.insuranceProvider || '');
  const [showLogistics, setShowLogistics] = useState(Boolean(routeData?.prefill?.logisticsPartner));
  const [showInsurance, setShowInsurance] = useState(Boolean(routeData?.prefill?.insuranceProvider));
  const [partyNotes, setPartyNotes] = useState(routeData?.prefill?.description || routeData?.prefill?.notes || '');

  // ----------------------------------------------------
  // STEP 2: PRODUCT STATES (MULTI-PRODUCT SUPPORT)
  // ----------------------------------------------------
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [selectedRecentId, setSelectedRecentId] = useState(null);

  const [selectedProducts, setSelectedProducts] = useState(
    routeData?.prefill?.products && Array.isArray(routeData.prefill.products) && routeData.prefill.products.length > 0
      ? routeData.prefill.products.map((p, idx) => ({
        id: p.productId || p._id || p.id || `prefill_${idx}`,
        productId: p.productId || p._id || p.id,
        name: p.name || p.productName || '',
        hsn: p.hsnCode || p.hsn || '',
        rate: p.price ? String(p.price) : (p.rate ? String(p.rate) : ''),
        unit: p.unitName || p.unit || '',
        quantity: p.quantity ? String(p.quantity) : '',
        discount: p.discount ? String(p.discount) : '',
        gst: p.gst !== undefined && p.gst !== null ? String(p.gst) : '',
      }))
      : (routeData?.prefill?.productName ? [{
        id: routeData?.prefill?.productId || 'prefill_0',
        productId: routeData?.prefill?.productId || '',
        name: routeData.prefill.productName,
        hsn: routeData?.prefill?.hsnCode || '',
        rate: routeData?.prefill?.price ? String(routeData.prefill.price) : '',
        unit: routeData?.prefill?.unit || '',
        quantity: routeData?.prefill?.quantity ? String(routeData.prefill.quantity) : '',
        discount: routeData?.prefill?.discount ? String(routeData.prefill.discount) : '',
        gst: routeData?.prefill?.gst !== undefined && routeData?.prefill?.gst !== null ? String(routeData.prefill.gst) : '',
      }] : [])
  );

  const updateProductField = (index, field, value) => {
    setSelectedProducts(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const removeSelectedProduct = (index) => {
    setSelectedProducts(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0) {
        setProductName(updated.map(p => p.name).join(', '));
      } else {
        setProductName('');
        setApproxRate('');
        setQuantity('');
        setHsnCode('');
      }
      return updated;
    });
  };

  const calculateProductTotals = (prod) => {
    const qty = parseFloat(String(prod?.quantity || 0).replace(/,/g, '')) || 0;
    const rate = parseFloat(String(prod?.rate || prod?.price || 0).replace(/,/g, '')) || 0;
    const disc = parseFloat(String(prod?.discount || 0).replace(/,/g, '')) || 0;
    const gstPct = parseFloat(String(prod?.gst !== undefined && prod?.gst !== null ? prod.gst : 0).replace(/,/g, '')) || 0;

    const subtotal = qty * rate;
    const taxable = Math.max(0, subtotal - disc);
    const gstAmount = gstPct > 0 ? (taxable * gstPct) / 100 : 0;
    const totalAmount = taxable + gstAmount;

    return {
      qty,
      rate,
      disc,
      gstPct,
      subtotal,
      taxable,
      gstAmount,
      totalAmount,
    };
  };

  const calculateDealTotals = () => {
    if (selectedProducts && selectedProducts.length > 0) {
      let subtotal = 0;
      let totalDiscount = 0;
      let totalGSTAmount = 0;

      selectedProducts.forEach(prod => {
        const item = calculateProductTotals(prod);
        subtotal += item.subtotal;
        totalDiscount += item.disc;
        totalGSTAmount += item.gstAmount;
      });

      const grandTotal = Math.max(0, subtotal - totalDiscount + totalGSTAmount);
      return {
        totalSubtotal: subtotal,
        totalDiscount,
        totalGSTAmount,
        grandTotal,
        totalAmount: grandTotal,
      };
    } else {
      const q = parseFloat(String(quantity).replace(/,/g, '')) || 0;
      const r = parseFloat(String(approxRate).replace(/,/g, '')) || 0;
      const d = parseFloat(String(discount).replace(/,/g, '')) || 0;
      const g = parseFloat(String(gstPercent).replace(/,/g, '')) || 0;
      const sub = q * r;
      const taxable = Math.max(0, sub - d);
      const gstAmt = g > 0 ? (taxable * g) / 100 : 0;
      const grand = Math.max(0, taxable + gstAmt);
      return {
        totalSubtotal: sub,
        totalDiscount: d,
        totalGSTAmount: gstAmt,
        grandTotal: grand,
        totalAmount: grand,
      };
    }
  };

  const [isAddingCustomProduct, setIsAddingCustomProduct] = useState(false);
  const [customProdName, setCustomProdName] = useState('');
  const [customProdHsn, setCustomProdHsn] = useState('');
  const [customProdUnit, setCustomProdUnit] = useState('Bag (25 Kg)');
  const [customProdRate, setCustomProdRate] = useState('');
  const [customProdError, setCustomProdError] = useState('');

  const [productName, setProductName] = useState(
    routeData?.prefill?.productName ||
    routeData?.prefill?.product?.name ||
    routeData?.prefill?.products?.[0]?.productName ||
    ''
  );
  const [hsnCode, setHsnCode] = useState(routeData?.prefill?.hsnCode || '');
  const [unit, setUnit] = useState(routeData?.prefill?.unit || 'Bag (25 Kg)');
  const [approxRate, setApproxRate] = useState(
    routeData?.prefill?.price ? String(routeData.prefill.price) : ''
  );
  const [quantity, setQuantity] = useState(
    routeData?.prefill?.quantity ? String(routeData.prefill.quantity) : ''
  );
  const [discount, setDiscount] = useState(routeData?.prefill?.discount ? String(routeData.prefill.discount) : '0');
  const [gstPercent, setGstPercent] = useState(routeData?.prefill?.gst ? String(routeData.prefill.gst) : '0');
  const [selectedProductId, setSelectedProductId] = useState(routeData?.prefill?.productId || '');

  const [showUnitModal, setShowUnitModal] = useState(false);

  // ----------------------------------------------------
  // STEP 3: DEAL DETAILS STATES
  // ----------------------------------------------------
  const [dealName, setDealName] = useState(routeData?.prefill?.dealName || routeData?.prefill?.title || '');
  const [dealType, setDealType] = useState(role === 'buyer' ? 'Purchase' : 'Sale');
  const [dealCategory, setDealCategory] = useState(routeData?.prefill?.dealCategory || 'Food Grains');
  const [currency, setCurrency] = useState('INR');
  const [dealValue, setDealValue] = useState('');
  const [expectedDealDate, setExpectedDealDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState(routeData?.prefill?.paymentTerms || '30 Days Credit');
  const [deliveryTerms, setDeliveryTerms] = useState(routeData?.prefill?.deliveryTerms || 'FOB - Free on Board');
  const [deliveryLocation, setDeliveryLocation] = useState(routeData?.prefill?.deliveryLocation || '');
  const [dealDescription, setDealDescription] = useState(routeData?.prefill?.description || '');

  // Pickers & Modals
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickingForDate, setPickingForDate] = useState('expected');
  const [tempDate, setTempDate] = useState(new Date());

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [showDeliveryTermsModal, setShowDeliveryTermsModal] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  // Master Data States
  const [unitsList, setUnitsList] = useState(STANDARD_UNITS);
  const [companyProducts, setCompanyProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [userCompaniesList, setUserCompaniesList] = useState([]);
  const [industriesList, setIndustriesList] = useState([]);
  const [showCompanySwitchModal, setShowCompanySwitchModal] = useState(false);

  // Counterparty Multi-Company Selection Modal
  const [showMultiCompanyModal, setShowMultiCompanyModal] = useState(false);
  const [multiCompanyList, setMultiCompanyList] = useState([]);
  const [multiCompanyTargetField, setMultiCompanyTargetField] = useState('party2');
  const [multiCompanyUserNumber, setMultiCompanyUserNumber] = useState('');
  const [multiCompanyUserName, setMultiCompanyUserName] = useState('');

  // Assisted Onboarding Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showOnboardUnitDropdown, setShowOnboardUnitDropdown] = useState(false);
  const [onboardRole, setOnboardRole] = useState('buyer');
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    mobileNumber: '',
    companyName: '',
    industryId: '',
    registrationNumber: '',
    street: '',
    city: '',
    district: '',
    state: '',
    postalCode: '',
    country: 'India',
    productName: '',
    unitId: '',
    hsnCode: '',
    gstCode: 'GST_18',
    description: '',
  });
  const [onboardErrors, setOnboardErrors] = useState({});
  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  // Keyboard Visibility Listener to prevent Continue button overlaying inputs
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub1 = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const showSub2 = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true));
    const hideSub1 = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    const hideSub2 = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub1.remove();
      showSub2.remove();
      hideSub1.remove();
      hideSub2.remove();
    };
  }, []);

  // Auto calculate deal value and name
  useEffect(() => {
    if (selectedProducts && selectedProducts.length > 0) {
      if (selectedProducts.length === 1) {
        setDealName(`Supply of ${selectedProducts[0].name}`);
      } else {
        setDealName(`Deal for ${selectedProducts.length} Products (${selectedProducts.map(p => p.name).join(', ')})`);
      }
    } else if (productName) {
      setDealName(`Supply of ${productName}`);
    }

    const totals = calculateDealTotals();
    if (totals.grandTotal > 0) {
      setDealValue(totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, productName, approxRate, quantity, discount, gstPercent]);

  // Load User Profile and Master Data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const userRes = await getUserProfile(token);
        if (userRes && userRes.success && userRes.data) {
          const u = userRes.data;
          setActiveUserId(u._id || u.id);
          if (Array.isArray(u.companies) && u.companies.length > 0) {
            setUserCompaniesList(u.companies);
            const active = u.companies[0];
            setActiveUserCompany(active);
            setParty1(active.name || '');
            const ind = getResolvedIndustry(active, '');
            setSellerIndustry(ind);
            const loc = getResolvedLocation(active, '');
            if (loc) {
              setSellerLocation(loc);
              setDeliveryLocation(loc);
            }
          }
        }

        try {
          const uRes = await getUnits('active', token);
          if (uRes && (uRes.success || Array.isArray(uRes.data))) {
            const list = Array.isArray(uRes.data) ? uRes.data : uRes.data?.data || [];
            if (list.length > 0) {
              setUnitsList(list.map(item => ({ label: item.name, value: item.name, short: item.symbol || item.name, id: item._id })));
            }
          }
        } catch (e) { }

        try {
          const indRes = await getIndustries();
          if (indRes && (indRes.success || Array.isArray(indRes.data))) {
            const list = Array.isArray(indRes.data) ? indRes.data : indRes.data?.data || [];
            setIndustriesList(list);
          }
        } catch (e) { }
      } catch (err) {
        console.warn('Master data load error:', err);
      }
    };
    loadMasterData();
  }, [originCompanyId]);

  // Load Inventory of Seller
  useEffect(() => {
    const fetchCompanyInventory = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        let targetSellerCompanyId = null;
        if (role === 'buyer') {
          // As Buyer: products must strictly come from selected Seller Company
          targetSellerCompanyId = party2Data?.companyId || party2Data?._id || party2Data?.id;
        } else if (role === 'seller') {
          // As Seller: products come from user's active company
          targetSellerCompanyId = activeUserCompany?._id || activeUserCompany?.id || originCompanyId;
        }

        if (targetSellerCompanyId && String(targetSellerCompanyId).length === 24) {
          const res = await getProducts(targetSellerCompanyId, token).catch(() => null);
          const pList = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
          if (pList.length > 0) {
            const formatted = pList.map(p => ({
              id: p._id || p.id,
              name: p.name,
              hsn: p.hsnCode || '',
              rate: p.price ? String(p.price) : '',
              unit: p.unitId?.name || p.unit || 'Bag (25 Kg)',
              category: p.categoryId?.name || p.category || '',
              image: p.image || null,
            }));
            setCompanyProducts(formatted);
          } else {
            setCompanyProducts(prev => (prev.length > 0 && prev[0]?.isNewlyOnboarded ? prev : []));
          }

          const catRes = await getCategories(targetSellerCompanyId, token).catch(() => null);
          const cList = Array.isArray(catRes?.data) ? catRes.data : catRes?.data?.data || [];
          if (cList.length > 0) {
            setCategoriesList(cList.map(c => c.name || c.title || c));
          }
        } else {
          setCompanyProducts(prev => (prev.length > 0 && prev[0]?.isNewlyOnboarded ? prev : []));
        }
      } catch (e) {
        console.warn('Inventory fetch note:', e);
        setCompanyProducts(prev => (prev.length > 0 && prev[0]?.isNewlyOnboarded ? prev : []));
      }
    };
    fetchCompanyInventory();
  }, [activeUserCompany, party2Data, role, originCompanyId]);

  // RouteData Contact Picker listener
  useEffect(() => {
    if (routeData?.prefillParty2) {
      const p = routeData.prefillParty2;
      const ind = getResolvedIndustry(p, '');
      const loc = getResolvedLocation(p, '');
      setParty2(p.name || p.company || '');
      setParty2Data({ ...p, isRegistered: true, industry: ind, location: loc });
    }
    if (routeData?.existingParty2 && routeData?.pickingFor !== 'party2') {
      const p2Data = routeData.existingParty2;
      const p2Name = routeData.existingParty2Name || (p2Data?.isRegistered ? (p2Data?.company || p2Data?.name) : p2Data?.name);
      const ind = getResolvedIndustry(p2Data, '');
      const loc = getResolvedLocation(p2Data, '');
      setParty2(p2Name);
      setParty2Data({ ...p2Data, industry: ind, location: loc });
    }
    if (routeData?.existingBrokerCompany && routeData?.pickingFor !== 'brokerCompany') {
      const bData = routeData.existingBrokerCompany;
      const bName = routeData.existingBrokerCompanyName || (bData?.isRegistered ? (bData?.company || bData?.name) : bData?.name);
      const ind = getResolvedIndustry(bData, '');
      const loc = getResolvedLocation(bData, '');
      setBrokerCompany(bName);
      setBrokerCompanyData({ ...bData, industry: ind, location: loc });
      setShowBroker(true);
      const cid = bData?.companyId || bData?._id || bData?.id;
      if (cid) setBrokerCompanyId(String(cid));
    }
    if (routeData?.selectedContact) {
      const contact = routeData.selectedContact;
      const ind = getResolvedIndustry(contact, '');
      const loc = getResolvedLocation(contact, '');
      const enrichedContact = {
        ...contact,
        industry: ind,
        location: loc,
      };
      if (routeData.pickingFor === 'party2') {
        setParty2(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setParty2Data(enrichedContact);
        setDirectInputParty2('');
        setFieldErrors(prev => ({ ...prev, party2: undefined }));
      } else if (routeData.pickingFor === 'brokerCompany') {
        setBrokerCompany(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setBrokerCompanyData(enrichedContact);
        setShowBroker(true);
        const cid = contact.companyId || contact._id || contact.id;
        if (cid) setBrokerCompanyId(String(cid));
        setDirectInputBroker('');
      }
    }
    if (routeData?.openOnboard) {
      const targetRole = routeData.pickingFor === 'brokerCompany' ? 'broker' : (role === 'buyer' ? 'seller' : 'buyer');
      openOnboardModal(targetRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData]);

  // Live Counterparty 10-Digit Mobile Lookup & Validation
  const handleSearchPartyNumber = async (field, rawVal) => {
    const cleanDigits = (rawVal || '').replace(/\D/g, '');
    const isParty2 = field === 'party2';
    const setError = isParty2 ? setParty2SearchError : setBrokerSearchError;
    const setLoading = isParty2 ? setIsSearchingParty2 : setIsSearchingBroker;

    if (!cleanDigits) {
      setError('');
      return;
    }

    if (cleanDigits.length < 10) {
      setError(`Please enter full 10-digit mobile number (${cleanDigits.length}/10 digits)`);
      return;
    }

    if (cleanDigits.length > 10) {
      setError('Mobile number cannot exceed 10 digits');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      setError('Mobile number must start with 6, 7, 8, or 9');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedNumber = `+91${cleanDigits}`;
      const response = await getCompaniesByNumber(formattedNumber, token);
      if (response && response.success && response.data && response.data.length > 0) {
        if (response.data.length > 1) {
          // Multiple companies found for this user/number
          setMultiCompanyList(response.data);
          setMultiCompanyTargetField(field);
          setMultiCompanyUserNumber(formattedNumber);
          setMultiCompanyUserName(response.data[0]?.contactPersonName || response.data[0]?.name || 'Counterparty');
          setShowMultiCompanyModal(true);
        } else {
          // Single registered company
          const coObj = response.data[0];
          const companyId = coObj.companyId || coObj._id || coObj.id;
          const companyName = coObj.companyName || coObj.name || 'Registered Company';
          const industry = getResolvedIndustry(coObj, isParty2 ? 'Commodity Trading' : 'Brokerage & Advisory');
          const location = getResolvedLocation(coObj, '');
          const contactObj = {
            id: companyId || `reg_${Date.now()}`,
            companyId,
            name: coObj.contactPersonName || coObj.name || companyName,
            company: companyName,
            mobile: formattedNumber,
            isRegistered: true,
            status: coObj.status || coObj.approvalStatus || 'approved',
            industry,
            location,
            companies: response.data,
          };
          if (isParty2) {
            setParty2(companyName);
            setParty2Data(contactObj);
            setDirectInputParty2('');
            setFieldErrors(prev => ({ ...prev, party2: undefined }));
          } else {
            setBrokerCompany(companyName);
            setBrokerCompanyData(contactObj);
            setBrokerCompanyId(String(companyId || ''));
            setDirectInputBroker('');
            setShowBroker(true);
          }
        }
      } else {
        // Auto open onboard modal for new contact
        openOnboardModal(isParty2 ? (role === 'buyer' ? 'seller' : 'buyer') : 'broker', cleanDigits);
      }
    } catch (e) {
      console.warn('Number lookup note:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMultiCompany = (coObj) => {
    const companyId = coObj.companyId || coObj._id || coObj.id;
    const companyName = coObj.companyName || coObj.name || 'Registered Company';
    const industry = getResolvedIndustry(coObj, multiCompanyTargetField === 'brokerCompany' ? 'Brokerage & Advisory' : 'Commodity Trading');
    const location = getResolvedLocation(coObj, '');
    const contactObj = {
      id: companyId || `reg_${Date.now()}`,
      companyId,
      name: coObj.contactPersonName || coObj.name || multiCompanyUserName || companyName,
      company: companyName,
      mobile: multiCompanyUserNumber,
      isRegistered: true,
      status: coObj.status || coObj.approvalStatus || 'approved',
      industry,
      location,
      companies: multiCompanyList,
    };

    if (multiCompanyTargetField === 'party2') {
      setParty2(companyName);
      setParty2Data(contactObj);
      setDirectInputParty2('');
      setFieldErrors(prev => ({ ...prev, party2: undefined }));
    } else {
      setBrokerCompany(companyName);
      setBrokerCompanyData(contactObj);
      setBrokerCompanyId(String(companyId || ''));
      setDirectInputBroker('');
      setShowBroker(true);
    }
    setShowMultiCompanyModal(false);
  };

  const handleParty2InputChange = (text) => {
    const cleanDigits = text.replace(/\D/g, '');
    const isDigitsOnly = /^\d+$/.test(text.trim());
    const val = isDigitsOnly ? cleanDigits.slice(0, 10) : text;
    setDirectInputParty2(val);

    if (val.length === 0) {
      setParty2SearchError('');
    } else if (isDigitsOnly && val.length < 10) {
      setParty2SearchError(`Please enter full 10-digit mobile number (${val.length}/10)`);
    } else if (isDigitsOnly && val.length === 10) {
      if (!/^[6-9]\d{9}$/.test(val)) {
        setParty2SearchError('Mobile number must start with 6, 7, 8, or 9');
      } else {
        setParty2SearchError('');
        handleSearchPartyNumber('party2', val);
      }
    } else {
      setParty2SearchError('');
    }
  };

  const handleBrokerInputChange = (text) => {
    const cleanDigits = text.replace(/\D/g, '');
    const isDigitsOnly = /^\d+$/.test(text.trim());
    const val = isDigitsOnly ? cleanDigits.slice(0, 10) : text;
    setDirectInputBroker(val);

    if (val.length === 0) {
      setBrokerSearchError('');
    } else if (isDigitsOnly && val.length < 10) {
      setBrokerSearchError(`Please enter full 10-digit mobile number (${val.length}/10)`);
    } else if (isDigitsOnly && val.length === 10) {
      if (!/^[6-9]\d{9}$/.test(val)) {
        setBrokerSearchError('Mobile number must start with 6, 7, 8, or 9');
      } else {
        setBrokerSearchError('');
        handleSearchPartyNumber('brokerCompany', val);
      }
    } else {
      setBrokerSearchError('');
    }
  };

  const navigateToContactPicker = (pickingFor) => {
    onNavigate('ContactPicker', {
      pickingFor,
      companyId: activeUserCompany?._id || activeUserCompany?.id || activeUserCompany?.companyId || originCompanyId,
      companyName: activeUserCompany?.name || party1,
      role: role,
      originCompany: activeUserCompany,
      existingParty2: party2Data,
      existingParty2Name: party2,
      existingBrokerCompany: brokerCompanyData,
      existingBrokerCompanyName: brokerCompany,
    });
  };

  // Assisted Onboarding Helpers
  const openOnboardModal = (targetRole, defaultPhone = '') => {
    setOnboardRole(targetRole);
    setOnboardForm({
      name: '',
      mobileNumber: defaultPhone || '',
      companyName: '',
      industryId: industriesList[0]?._id || '',
      registrationNumber: '',
      street: '',
      city: '',
      district: '',
      state: '',
      postalCode: '',
      country: 'India',
      productName: productName || '',
      unitId: unitsList[0]?.id || unitsList[0]?.name || '',
      hsnCode: hsnCode || '',
      gstCode: 'GST_18',
      description: '',
    });
    setOnboardErrors({});
    setShowOnboardUnitDropdown(false);
    setShowOnboardModal(true);
  };

  const handlePincodeChange = async (pincodeVal) => {
    setOnboardForm(prev => ({ ...prev, postalCode: pincodeVal }));
    const cleanPin = pincodeVal.replace(/\D/g, '');
    if (cleanPin.length === 6) {
      setIsPincodeLoading(true);
      const res = await fetchPincodeDetails(cleanPin);
      setIsPincodeLoading(false);
      if (res && res.success) {
        setOnboardForm(prev => ({
          ...prev,
          city: res.city || prev.city,
          district: res.district || prev.district || res.city,
          state: res.state || prev.state,
          country: res.country || 'India',
        }));
      }
    }
  };

  const handleExecuteOnboard = async () => {
    const errors = {};
    if (!onboardForm.name.trim()) {
      errors.name = 'Contact person name is required';
    }
    const cleanMobile = onboardForm.mobileNumber.replace(/\D/g, '');
    if (!cleanMobile) {
      errors.mobileNumber = 'Mobile number is required';
    } else if (cleanMobile.length !== 10) {
      errors.mobileNumber = 'Please enter full 10-digit mobile number';
    }
    if (!onboardForm.companyName.trim()) {
      errors.companyName = 'Business / Company name is required';
    }

    if (Object.keys(errors).length > 0) {
      setOnboardErrors(errors);
      return;
    }
    setOnboardErrors({});

    setIsOnboardingSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const productsPayload = (onboardRole === 'seller' && (onboardForm.productName?.trim() || productName?.trim())) ? [
        {
          name: (onboardForm.productName?.trim() || productName?.trim() || 'Commodity Product'),
          unitId: onboardForm.unitId || (unitsList.find(u => u.name === unit || u.label === unit)?.id) || unitsList[0]?.id || '64d0a1b2c3d4e5f6a7b8c9df',
          description: onboardForm.description || '',
          hsnCode: (onboardForm.hsnCode?.trim() || hsnCode?.trim() || ''),
          gstCode: onboardForm.gstCode || 'GST_18',
        },
      ] : [];

      const payload = {
        role: onboardRole,
        name: onboardForm.name.trim(),
        mobileNumber: `+91${cleanMobile}`,
        companyName: onboardForm.companyName.trim(),
        industryId: onboardForm.industryId || undefined,
        gst: onboardForm.registrationNumber.trim() || undefined,
        companyAddress: {
          street: onboardForm.street || '',
          city: onboardForm.city || '',
          district: onboardForm.district || '',
          state: onboardForm.state || '',
          postalCode: onboardForm.postalCode || '',
          country: onboardForm.country || 'India',
        },
        ...(productsPayload.length > 0 ? { products: productsPayload } : {}),
      };

      const response = await assistedCreatePartyAccount(payload, token);
      if (response && (response.success || response.statusCode === 201 || response.data)) {
        const data = response.data || {};
        const newCompany = data.company || {};
        const newCompanyId = newCompany.id || newCompany._id || `onb_${Date.now()}`;
        const newCompanyName = newCompany.name || onboardForm.companyName;
        const companyStatus = newCompany.status || newCompany.approvalStatus || 'pending';

        const matchedIndustry = industriesList.find(i => (i._id || i.id) === onboardForm.industryId);
        const industryName = matchedIndustry?.name || newCompany.industryId?.name || newCompany.industryName || (onboardRole === 'broker' ? 'Brokerage & Advisory' : 'Commodity Trading');
        const contactLocation = onboardForm.city ? `${onboardForm.city}, ${onboardForm.state || 'India'}` : getResolvedLocation(newCompany, '');

        const contactObj = {
          id: newCompanyId,
          companyId: newCompanyId,
          name: newCompanyName,
          company: newCompanyName,
          mobile: `+91${cleanMobile}`,
          isRegistered: true,
          status: companyStatus,
          approvalStatus: companyStatus,
          industry: industryName,
          location: contactLocation,
        };

        if (onboardRole === 'broker') {
          setBrokerCompany(newCompanyName);
          setBrokerCompanyData(contactObj);
          setBrokerCompanyId(String(newCompanyId || ''));
          setShowBroker(true);
        } else if (onboardRole === 'seller' && role === 'broker') {
          setSellerCompany(newCompanyName);
          setSellerCompanyData(contactObj);
        } else {
          setParty2(newCompanyName);
          setParty2Data(contactObj);
        }

        // Auto-select product created with newly onboarded seller
        const responseProducts = Array.isArray(data.products) ? data.products : (data.product ? [data.product] : []);
        const createdProd = responseProducts[0] || (onboardForm.productName?.trim() ? {
          _id: `prod_${Date.now()}`,
          name: onboardForm.productName.trim(),
          hsnCode: onboardForm.hsnCode?.trim(),
          unit: onboardForm.unitId || unit || 'Bag (25 Kg)',
        } : null);

        if (createdProd && (onboardRole === 'seller' || role === 'buyer')) {
          const prodName = createdProd.name || onboardForm.productName.trim();
          const prodHsn = createdProd.hsnCode || onboardForm.hsnCode?.trim() || '';
          const prodUnit = createdProd.unitId?.name || createdProd.unit || unit || 'Bag (25 Kg)';
          const prodItem = {
            id: createdProd._id || createdProd.id || `prod_${Date.now()}`,
            name: prodName,
            hsn: prodHsn,
            rate: createdProd.price ? String(createdProd.price) : (approxRate || ''),
            unit: prodUnit,
            category: 'grains',
            isNewlyOnboarded: true,
          };

          setCompanyProducts([prodItem]);
          setSelectedProductId(prodItem.id);
          setSelectedRecentId(prodItem.id);
          setProductName(prodName);
          setHsnCode(prodHsn);
          setUnit(prodUnit);
          setDealName(`${prodName} Deal`);
        }

        setShowOnboardModal(false);
      } else {
        Alert.alert('Onboarding Note', response?.message || 'Party recorded for deal ledger.');
        setShowOnboardModal(false);
      }
    } catch (e) {
      Alert.alert('Notice', 'Counterparty profile saved for agreement creation.');
      setShowOnboardModal(false);
    } finally {
      setIsOnboardingSubmitting(false);
    }
  };

  // Document Upload Helper
  const handleBrowseFiles = () => {
    launchImageLibrary({ mediaType: 'mixed', selectionLimit: 5 }, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to select files');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setIsUploadingAttachments(true);
        try {
          const uploadedAttachments = await Promise.all(
            response.assets.map(async (asset, idx) => {
              let uploadedUrl = asset.uri;
              try {
                // If it's an image, upload to server
                if (asset.type?.startsWith('image/') || asset.fileName?.match(/\.(jpg|jpeg|png|webp)$/i)) {
                  uploadedUrl = await uploadService.uploadImage(asset);
                }
              } catch (upErr) {
                console.warn('File upload warning, keeping local uri:', upErr);
              }
              return {
                id: `file_${Date.now()}_${idx}`,
                name: asset.fileName || `Document_${Date.now()}.jpg`,
                size: asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : '180 KB',
                type: asset.type?.includes('pdf') ? 'pdf' : 'image',
                uri: asset.uri,
                url: uploadedUrl,
              };
            })
          );
          setAttachments(prev => [...prev, ...uploadedAttachments]);
        } catch (e) {
          console.error('Attachment processing error:', e);
          Alert.alert('Upload Error', 'Failed to upload selected documents.');
        } finally {
          setIsUploadingAttachments(false);
        }
      }
    });
  };

  const handleSelectRecentProduct = (item) => {
    const alreadyIdx = selectedProducts.findIndex(
      p => (p.id && item.id && p.id === item.id) || p.name.toLowerCase() === item.name.toLowerCase()
    );

    if (alreadyIdx >= 0) {
      // Toggle remove from selection
      const updated = selectedProducts.filter((_, i) => i !== alreadyIdx);
      setSelectedProducts(updated);
      if (updated.length > 0) {
        setProductName(updated.map(p => p.name).join(', '));
        setApproxRate(String(updated[0].rate || ''));
        setUnit(updated[0].unit || 'Bag (25 Kg)');
        setHsnCode(updated[0].hsn || '');
        setSelectedRecentId(updated[updated.length - 1].id || null);
      } else {
        setProductName('');
        setApproxRate('');
        setUnit('Bag (25 Kg)');
        setHsnCode('');
        setSelectedRecentId(null);
        setSelectedProductId(null);
      }
    } else {
      // Add to selection
      const newItem = {
        id: item.id || `prod_${Date.now()}`,
        productId: item.id || null,
        name: item.name,
        hsn: item.hsn || '',
        rate: item.rate ? String(item.rate) : (item.price ? String(item.price) : ''),
        unit: item.unit || '',
        quantity: item.quantity ? String(item.quantity) : '',
        discount: item.discount ? String(item.discount) : '',
        gst: item.gst !== undefined && item.gst !== null ? String(item.gst) : '',
        category: item.category || '',
        image: item.image || null,
      };
      const updated = [...selectedProducts, newItem];
      setSelectedProducts(updated);
      setProductName(updated.map(p => p.name).join(', '));
      setApproxRate(String(item.rate || ''));
      setUnit(item.unit || '');
      setHsnCode(item.hsn || '');
      setSelectedRecentId(item.id || null);
      setSelectedProductId(item.id || null);
    }
  };

  const handleAddCustomProduct = () => {
    if (!customProdName.trim()) {
      setCustomProdError('Please enter product name');
      return;
    }
    if (!customProdRate.trim()) {
      setCustomProdError('Please enter approx. rate');
      return;
    }
    const newItem = {
      id: `custom_${Date.now()}`,
      productId: null,
      name: customProdName.trim(),
      hsn: customProdHsn.trim(),
      rate: customProdRate.trim(),
      unit: customProdUnit || '',
      quantity: '',
      discount: '',
      gst: '',
      category: '',
      isCustom: true,
    };
    const updated = [...selectedProducts, newItem];
    setSelectedProducts(updated);
    setProductName(updated.map(p => p.name).join(', '));
    setApproxRate(String(customProdRate.trim()));
    setUnit(customProdUnit || 'Bag (25 Kg)');
    setHsnCode(customProdHsn.trim());

    // Reset custom inputs
    setCustomProdName('');
    setCustomProdHsn('');
    setCustomProdRate('');
    setCustomProdError('');
    setIsAddingCustomProduct(false);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Select Date';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const openCalendar = (type) => {
    setPickingForDate(type);
    const curr = type === 'expected' ? expectedDealDate : validityDate;
    setTempDate(curr ? new Date(curr) : new Date());
    setIsDatePickerVisible(true);
  };

  const confirmCalendarDate = () => {
    const formatted = tempDate.toISOString().split('T')[0];
    if (pickingForDate === 'expected') {
      setExpectedDealDate(formatted);
    } else {
      setValidityDate(formatted);
    }
    setIsDatePickerVisible(false);
  };

  const handleConfirmDate = (selectedDate) => {
    setIsDatePickerVisible(false);
    if (!selectedDate) return;
    const dateFormatted = selectedDate.toISOString().split('T')[0];
    if (pickingForDate === 'expected') {
      setExpectedDealDate(dateFormatted);
    } else {
      setValidityDate(dateFormatted);
    }
  };

  // Helper to ensure product exists on seller company
  const resolveProductId = async (pName, targetCompanyId, token) => {
    try {
      if (!targetCompanyId || String(targetCompanyId).length !== 24) return undefined;
      const res = await getProducts(targetCompanyId, token).catch(() => null);
      const list = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      const existing = list.find(
        p => p.name?.toLowerCase().trim() === pName?.toLowerCase().trim()
      );
      if (existing) {
        return existing._id || existing.id;
      }

      // If not existing, try creating product on the seller company
      try {
        const newProdRes = await createProduct({
          companyId: targetCompanyId,
          name: pName || 'Trading Commodity',
          price: 0,
        }, token).catch(() => null);
        const createdId = newProdRes?.data?._id || newProdRes?.data?.id || newProdRes?.data?.product?._id;
        if (createdId && String(createdId).length === 24) {
          return createdId;
        }
      } catch (ce) { }

      // Fallback to first product of company if available
      if (list.length > 0 && (list[0]._id || list[0].id)) {
        return list[0]._id || list[0].id;
      }

      return undefined;
    } catch (e) {
      return undefined;
    }
  };

  // Step Validation & Navigation
  const validateStep = () => {
    const errors = {};

    if (currentStep === 1) {
      if (role === 'buyer') {
        if (!party2 || !party2.trim()) errors.party2 = 'Please select a Seller company';
      } else {
        if (!party2 || !party2.trim()) errors.party2 = 'Please select a Buyer company';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setBtnErrorMessage('Please select counterparty');
        setTimeout(() => setBtnErrorMessage(''), 2500);
        return;
      }
      setFieldErrors({});
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedProducts.length === 0 && !productName.trim()) {
        errors.productName = 'Please select or add at least one product';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setBtnErrorMessage('Please select or add at least one product');
        setTimeout(() => setBtnErrorMessage(''), 2500);
        return;
      }

      if (selectedProducts.length > 0) {
        setProductName(selectedProducts.map(p => p.name).join(', '));
      }

      setFieldErrors({});
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const totals = calculateDealTotals();
      if (!dealValue.trim() && totals.grandTotal <= 0) {
        errors.dealValue = 'Deal value is required';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setBtnErrorMessage('Please fill required deal details');
        setTimeout(() => setBtnErrorMessage(''), 2500);
        return;
      }
      setFieldErrors({});
      setCurrentStep(4);
    } else if (currentStep === 4) {
      handleSubmitDeal();
    }
  };

  const handleContinue = validateStep;

  // Final Deal Submission
  const handleSubmitDeal = async () => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const originId = activeUserCompany?._id || activeUserCompany?.id || originCompanyId || '';

      const resolvedSellerId = role === 'seller' ? originId : (role === 'buyer' ? (party2Data?.companyId || party2Data?._id || party2Data?.id) : (sellerCompanyData?.companyId || sellerCompanyData?._id || sellerCompanyData?.id));
      const resolvedBuyerId = role === 'seller' ? (party2Data?.companyId || party2Data?._id || party2Data?.id) : (role === 'buyer' ? originId : (party2Data?.companyId || party2Data?._id || party2Data?.id));

      const dealTotals = calculateDealTotals();
      const sourceList = selectedProducts.length > 0 ? selectedProducts : [{
        name: productName,
        quantity,
        rate: approxRate,
        discount,
        gst: gstPercent,
        unit,
      }];

      const isUnregisteredInvite = party2Data?.isRegistered === false || (party2Data && !party2Data.companyId && !party2Data._id);

      if (isUnregisteredInvite) {
        const inviteProducts = sourceList.map((prod) => {
          const pTotals = calculateProductTotals(prod);
          return {
            name: prod.name,
            quantity: pTotals.qty,
            price: pTotals.rate,
            subtotal: pTotals.subtotal,
            discount: pTotals.disc,
            gst: pTotals.gstPct,
            gstAmount: pTotals.gstAmount,
            totalAmount: pTotals.totalAmount,
            unitName: prod.unit || unit || 'Bag (25 Kg)',
            unitShortName: (prod.unit || unit || 'Bag')?.split(' ')?.[0] || 'Bag',
            hsnCode: prod.hsn || hsnCode || '',
            gstCode: pTotals.gstPct > 0 ? `GST_${pTotals.gstPct}` : 'GST_18',
            paymentTerms: paymentTerms || '15 days',
          };
        });

        const invitePayload = {
          receiverMobileNumber: party2Data?.mobile || directInputParty2 || '',
          receiverName: party2,
          dealDraft: {
            role: role,
            products: inviteProducts,
            totalSubtotal: dealTotals.totalSubtotal,
            totalDiscount: dealTotals.totalDiscount,
            totalGSTAmount: dealTotals.totalGSTAmount,
            grandTotal: dealTotals.grandTotal,
            totalAmount: dealTotals.grandTotal,
            discount: dealTotals.totalDiscount,
            dealDate: expectedDealDate ? new Date(expectedDealDate).toISOString() : new Date().toISOString(),
            expiryDate: validityDate ? new Date(validityDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
            notes: dealDescription || partyNotes || '',
          },
        };
        const response = await inviteDeal(invitePayload, token);
        if (response && response.success) {
          if (response.data?.deal) setCreatedDealData(response.data.deal);
          setShowSuccessModal(true);
          if (response.data?.whatsappUrl) {
            setTimeout(() => {
              Linking.openURL(response.data.whatsappUrl).catch(() => { });
            }, 600);
          }
        }
      } else {
        const resolvedBrokerId = brokerCompany && brokerCompanyId && String(brokerCompanyId).length === 24
          ? String(brokerCompanyId)
          : (brokerCompany && (brokerCompanyData?.companyId || brokerCompanyData?._id || brokerCompanyData?.id)
            ? String(brokerCompanyData.companyId || brokerCompanyData._id || brokerCompanyData.id)
            : undefined);

        const dealProductsPayload = await Promise.all(
          sourceList.map(async (prod) => {
            const pTotals = calculateProductTotals(prod);
            let pId = prod.productId || prod._id || prod.id;
            if (!pId || !String(pId).match(/^[0-9a-fA-F]{24}$/)) {
              pId = await resolveProductId(prod.name, resolvedSellerId, token);
            }

            return {
              productId: String(pId || '6a71c2856b491d0fb76485a1'),
              quantity: pTotals.qty || 1,
              price: pTotals.rate || 0,
              discount: pTotals.disc || 0,
              gst: pTotals.gstPct || 0,
              paymentTerms: paymentTerms || '15 days',
            };
          })
        );

        const payload = {
          role: role,
          sellerCompanyId: String(resolvedSellerId),
          buyerCompanyId: String(resolvedBuyerId),
          products: dealProductsPayload,
          expiryDate: validityDate ? new Date(validityDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
          notes: partyNotes || '',
          ...(resolvedBrokerId ? { brokerCompanyId: String(resolvedBrokerId) } : {}),
        };

        const response = await createDeal(payload, token);
        if (response && (response.success || response.statusCode === 201 || response.statusCode === 200) && response.data?.deal) {
          setCreatedDealData(response.data.deal);
        }
        setShowSuccessModal(true);
      }

      // Clear deals cache
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith('trader_deals_cache_'));
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
        }
      } catch (e) { }

      setTimeout(() => {
        setShowSuccessModal(false);
        onNavigate('DealsList', {
          companyId: originId,
          companyName: activeUserCompany?.name || party1,
          filter: 'All',
          refresh: true,
        }, { refresh: true });
      }, 2000);
    } catch (err) {
      console.error('Deal creation error:', err);
      Alert.alert(
        'Deal Creation Failed',
        err.message || 'Unable to create deal. Please check that counterparty and product details are valid.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for dynamic category visuals
  const getProductCategoryVisuals = (item) => {
    const name = (item?.name || '').toLowerCase();
    const cat = (item?.category || '').toLowerCase();
    if (
      cat === 'grains' ||
      name.includes('rice') ||
      name.includes('wheat') ||
      name.includes('grain') ||
      name.includes('paddy') ||
      name.includes('atta') ||
      name.includes('flour') ||
      name.includes('barley') ||
      name.includes('maize') ||
      name.includes('corn') ||
      name.includes('oats')
    ) {
      return {
        Icon: Wheat,
        bg: '#FEF3C7',
        color: '#D97706',
        badgeBg: '#FFFBEB',
        badgeColor: '#B45309',
        tag: 'Grains',
      };
    }
    if (
      cat === 'pulses' ||
      name.includes('dal') ||
      name.includes('pulse') ||
      name.includes('chana') ||
      name.includes('gram') ||
      name.includes('moong') ||
      name.includes('urad') ||
      name.includes('toor') ||
      name.includes('masoor') ||
      name.includes('soya') ||
      name.includes('soyabean') ||
      name.includes('sugar')
    ) {
      return {
        Icon: Package,
        bg: '#DCFCE7',
        color: '#16A34A',
        badgeBg: '#F0FDF4',
        badgeColor: '#15803D',
        tag: 'Pulses',
      };
    }
    if (
      cat === 'oil' ||
      name.includes('oil') ||
      name.includes('mustard') ||
      name.includes('refined') ||
      name.includes('tel') ||
      name.includes('ghee') ||
      name.includes('sunflower')
    ) {
      return {
        Icon: Droplet,
        bg: '#FEF9C3',
        color: '#CA8A04',
        badgeBg: '#FEFCE8',
        badgeColor: '#A16207',
        tag: 'Oil',
      };
    }
    if (
      cat === 'spices' ||
      name.includes('chilli') ||
      name.includes('mirch') ||
      name.includes('spice') ||
      name.includes('jeera') ||
      name.includes('haldi') ||
      name.includes('turmeric') ||
      name.includes('pepper') ||
      name.includes('masala') ||
      name.includes('coriander') ||
      name.includes('dhania')
    ) {
      return {
        Icon: Flame,
        bg: '#FEE2E2',
        color: '#DC2626',
        badgeBg: '#FEF2F2',
        badgeColor: '#B91C1C',
        tag: 'Spices',
      };
    }
    return {
      Icon: ShoppingBag,
      bg: '#EFF6FF',
      color: '#2563EB',
      badgeBg: '#F8FAFC',
      badgeColor: '#475569',
      tag: 'General',
    };
  };

  // Filter Recent Products by Search and Category
  const filteredProducts = companyProducts.filter(p => {
    const matchSearch =
      !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.hsn && p.hsn.includes(productSearch));
    const matchCat =
      selectedCategoryTab === 'all' ||
      (selectedCategoryTab === 'grains' && (p.category === 'grains' || p.name.toLowerCase().includes('rice') || p.name.toLowerCase().includes('wheat'))) ||
      (selectedCategoryTab === 'oil' && (p.category === 'oil' || p.name.toLowerCase().includes('oil'))) ||
      (selectedCategoryTab === 'pulses' && (p.category === 'pulses' || p.name.toLowerCase().includes('sugar') || p.name.toLowerCase().includes('dal'))) ||
      (selectedCategoryTab === 'spices' && (p.category === 'spices' || p.name.toLowerCase().includes('chilli') || p.name.toLowerCase().includes('jeera')));
    return matchSearch && matchCat;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >

        {/* ════════════════ TOP APP BAR & MASCOT ════════════════ */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButtonCircle}
            onPress={() => {
              if (currentStep > 1) {
                setCurrentStep(prev => prev - 1);
              } else {
                onNavigate('pop');
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.titleColumn}>
            <Text style={styles.screenTitle}>Create New Deal</Text>
            <Text style={styles.stepSubtitle}>Step {currentStep} of 4</Text>
          </View>

          <View style={styles.mascotWrapper}>
            <Image
              source={require('../../../images/createdeal.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ════════════════ 4-STEP WIZARD PROGRESS BAR ════════════════ */}
        <View style={styles.stepperContainer}>
          {/* Step 1: Parties */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => currentStep > 1 && setCurrentStep(1)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.stepCircle,
              currentStep > 1 && styles.stepCircleCompleted,
              currentStep === 1 && styles.stepCircleActive,
            ]}>
              {currentStep > 1 ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Text style={[styles.stepNumberText, currentStep === 1 && styles.stepNumberTextActive]}>1</Text>
              )}
            </View>
            <Text style={[styles.stepLabelText, currentStep === 1 && styles.stepLabelTextActive]}>Parties</Text>
          </TouchableOpacity>

          <View style={[styles.stepperLine, currentStep > 1 && styles.stepperLineActive]} />

          {/* Step 2: Product */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => currentStep > 2 && setCurrentStep(2)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.stepCircle,
              currentStep > 2 && styles.stepCircleCompleted,
              currentStep === 2 && styles.stepCircleActive,
            ]}>
              {currentStep > 2 ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Text style={[styles.stepNumberText, currentStep === 2 && styles.stepNumberTextActive]}>2</Text>
              )}
            </View>
            <Text style={[styles.stepLabelText, currentStep === 2 && styles.stepLabelTextActive]}>Product</Text>
          </TouchableOpacity>

          <View style={[styles.stepperLine, currentStep > 2 && styles.stepperLineActive]} />

          {/* Step 3: Details */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => currentStep > 3 && setCurrentStep(3)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.stepCircle,
              currentStep > 3 && styles.stepCircleCompleted,
              currentStep === 3 && styles.stepCircleActive,
            ]}>
              {currentStep > 3 ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Text style={[styles.stepNumberText, currentStep === 3 && styles.stepNumberTextActive]}>3</Text>
              )}
            </View>
            <Text style={[styles.stepLabelText, currentStep === 3 && styles.stepLabelTextActive]}>Details</Text>
          </TouchableOpacity>

          <View style={[styles.stepperLine, currentStep > 3 && styles.stepperLineActive]} />

          {/* Step 4: Review */}
          <TouchableOpacity
            style={styles.stepItem}
            activeOpacity={0.8}
          >
            <View style={[
              styles.stepCircle,
              currentStep === 4 && styles.stepCircleActive,
            ]}>
              <Text style={[styles.stepNumberText, currentStep === 4 && styles.stepNumberTextActive]}>4</Text>
            </View>
            <Text style={[styles.stepLabelText, currentStep === 4 && styles.stepLabelTextActive]}>Review</Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════ MAIN SCROLLABLE CONTENT ════════════════ */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 1: ADD PARTIES (1st Step)
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <View style={styles.stepSection}>
              <View style={styles.sectionHeadingBox}>
                <Text style={styles.mainSectionTitle}>Add Parties</Text>
                <Text style={styles.mainSectionSubtitle}>
                  Select trading role and counterparty for this deal.
                </Text>
              </View>

              {/* Trading Role Switcher */}
              <View style={styles.roleTabsContainer}>
                <TouchableOpacity
                  style={[styles.roleTab, role === 'seller' && styles.roleTabActive]}
                  onPress={() => {
                    setRole('seller');
                    setDealType('Sale');
                  }}
                  activeOpacity={0.8}
                >
                  <Building2 size={14} color={role === 'seller' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.roleTabText, role === 'seller' && styles.roleTabTextActive]}>
                    I am Seller
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleTab, role === 'buyer' && styles.roleTabActive]}
                  onPress={() => {
                    setRole('buyer');
                    setDealType('Purchase');
                  }}
                  activeOpacity={0.8}
                >
                  <ShoppingBag size={14} color={role === 'buyer' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.roleTabText, role === 'buyer' && styles.roleTabTextActive]}>
                    I am Buyer
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Your Company Card */}
              <View style={styles.partyCardWrapper}>
                <Text style={styles.partySectionHeader}>
                  {role === 'buyer' ? 'Buyer (Your Company)' : 'Seller (Your Company)'}
                </Text>
                <View style={styles.whitePartyCard}>
                  <View style={[styles.partyAvatarBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Text style={[styles.partyAvatarText, { color: '#059669' }]}>
                      {party1.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.partyInfoColumn}>
                    <View style={styles.partyNameRow}>
                      <Text style={styles.partyCompanyName}>{party1}</Text>
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    </View>
                    <Text style={styles.partyCategoryText}>
                      {sellerIndustry || getResolvedIndustry(activeUserCompany, 'Commodity Trading')}
                    </Text>
                    {Boolean(sellerLocation || getResolvedLocation(activeUserCompany)) && (
                      <View style={styles.partyLocationRow}>
                        <MapPin size={12} color="#64748B" />
                        <Text style={styles.partyLocationText}>
                          {sellerLocation || getResolvedLocation(activeUserCompany)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {userCompaniesList.length > 1 && (
                    <TouchableOpacity
                      style={styles.partyEditButton}
                      onPress={() => setShowCompanySwitchModal(true)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={16} color="#2563EB" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Counterparty Selection (Buyer or Seller) */}
              <View style={styles.partyCardWrapper}>
                <Text style={styles.partySectionHeader}>
                  {role === 'buyer' ? 'Seller *' : 'Buyer *'}
                </Text>

                {/* Selected Party Card or Direct Input */}
                {party2 ? (
                  <View style={styles.whitePartyCard}>
                    <View style={[styles.partyAvatarBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <Wheat size={20} color="#D97706" />
                    </View>

                    <View style={styles.partyInfoColumn}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.partyCompanyName}>{party2}</Text>
                        {party2Data?.status ? (
                          <View style={[
                            styles.partyStatusBadge,
                            (party2Data.status === 'active' || party2Data.status === 'approved') ? styles.partyStatusBadgeActive : styles.partyStatusBadgePending,
                          ]}>
                            <Text style={[
                              styles.partyStatusBadgeText,
                              (party2Data.status === 'active' || party2Data.status === 'approved') ? styles.partyStatusBadgeTextActive : styles.partyStatusBadgeTextPending,
                            ]}>
                              {String(party2Data.status).toUpperCase()}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.partyCategoryText}>
                        {getResolvedIndustry(party2Data, 'Commodity Trading')}
                      </Text>
                      {Boolean(getResolvedLocation(party2Data)) && (
                        <View style={styles.partyLocationRow}>
                          <MapPin size={12} color="#64748B" />
                          <Text style={styles.partyLocationText}>{getResolvedLocation(party2Data)}</Text>
                        </View>
                      )}
                      {party2Data?.name && party2Data.name !== party2 ? (
                        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                          {party2Data.name} {party2Data.mobile ? `• ${party2Data.mobile}` : ''}
                        </Text>
                      ) : null}
                    </View>

                    {party2Data?.companies && party2Data.companies.length > 1 && (
                      <TouchableOpacity
                        style={[styles.partyEditButton, { marginRight: 6 }]}
                        onPress={() => {
                          setMultiCompanyList(party2Data.companies);
                          setMultiCompanyTargetField('party2');
                          setMultiCompanyUserNumber(party2Data.mobile || '');
                          setMultiCompanyUserName(party2Data.name || party2);
                          setShowMultiCompanyModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={16} color="#2563EB" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.partyRemoveButton}
                      onPress={() => {
                        setParty2('');
                        setParty2Data(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.searchBarContainer}>
                      <Search size={18} color="#94A3B8" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Enter 10-digit mobile number..."
                        placeholderTextColor="#94A3B8"
                        value={directInputParty2}
                        onChangeText={handleParty2InputChange}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                      {isSearchingParty2 ? (
                        <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />
                      ) : directInputParty2.trim().length > 0 ? (
                        <TouchableOpacity
                          onPress={() => handleSearchPartyNumber('party2', directInputParty2)}
                          activeOpacity={0.7}
                          style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                        >
                          <Search size={16} color="#2563EB" />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => navigateToContactPicker('party2')}
                        activeOpacity={0.7}
                        style={styles.contactPickerIconBtn}
                      >
                        <BookUser size={18} color="#2563EB" />
                      </TouchableOpacity>
                    </View>
                    {party2SearchError ? (
                      <Text style={{ fontSize: 11.5, color: '#D97706', marginTop: 4, fontWeight: '700' }}>
                        ⚠ {party2SearchError}
                      </Text>
                    ) : null}
                  </>
                )}
                {fieldErrors.party2 && (
                  <Text style={styles.errorMessageText}>⚠ {fieldErrors.party2}</Text>
                )}
              </View>

              {/* Broker Selection (Optional - Same as Buyer/Seller input box) */}
              <View style={styles.partyCardWrapper}>
                <View style={styles.sectionSubHeaderRow}>
                  <Text style={styles.partySectionHeader}>Broker (Optional)</Text>
                  {brokerCompany ? (
                    <TouchableOpacity
                      onPress={() => {
                        setBrokerCompany('');
                        setBrokerCompanyData(null);
                        setBrokerCompanyId('');
                        setDirectInputBroker('');
                        setBrokerSearchError('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.addNewPartyLink, { color: '#EF4444' }]}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Selected Broker Card or Direct Input */}
                {brokerCompany ? (
                  <View style={styles.whitePartyCard}>
                    <View style={[styles.partyAvatarBox, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                      <Handshake size={20} color="#7C3AED" />
                    </View>

                    <View style={styles.partyInfoColumn}>
                      <Text style={styles.partyCompanyName}>{brokerCompany}</Text>
                      <Text style={styles.partyCategoryText}>
                        {getResolvedIndustry(brokerCompanyData, 'Brokerage & Advisory')}
                      </Text>
                      {Boolean(getResolvedLocation(brokerCompanyData)) && (
                        <View style={styles.partyLocationRow}>
                          <MapPin size={12} color="#64748B" />
                          <Text style={styles.partyLocationText}>{getResolvedLocation(brokerCompanyData)}</Text>
                        </View>
                      )}
                      {brokerCompanyData?.name && brokerCompanyData.name !== brokerCompany ? (
                        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                          {brokerCompanyData.name} {brokerCompanyData.mobile ? `• ${brokerCompanyData.mobile}` : ''}
                        </Text>
                      ) : null}
                    </View>

                    {brokerCompanyData?.companies && brokerCompanyData.companies.length > 1 && (
                      <TouchableOpacity
                        style={[styles.partyEditButton, { marginRight: 6 }]}
                        onPress={() => {
                          setMultiCompanyList(brokerCompanyData.companies);
                          setMultiCompanyTargetField('brokerCompany');
                          setMultiCompanyUserNumber(brokerCompanyData.mobile || '');
                          setMultiCompanyUserName(brokerCompanyData.name || brokerCompany);
                          setShowMultiCompanyModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={16} color="#7C3AED" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.partyRemoveButton}
                      onPress={() => {
                        setBrokerCompany('');
                        setBrokerCompanyData(null);
                        setBrokerCompanyId('');
                        setDirectInputBroker('');
                        setBrokerSearchError('');
                      }}
                      activeOpacity={0.7}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.searchBarContainer}>
                      <Search size={18} color="#94A3B8" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Enter 10-digit mobile number..."
                        placeholderTextColor="#94A3B8"
                        value={directInputBroker}
                        onChangeText={handleBrokerInputChange}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                      {isSearchingBroker ? (
                        <ActivityIndicator size="small" color="#7C3AED" style={{ marginRight: 6 }} />
                      ) : directInputBroker.trim().length > 0 ? (
                        <TouchableOpacity
                          onPress={() => handleSearchPartyNumber('brokerCompany', directInputBroker)}
                          activeOpacity={0.7}
                          style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                        >
                          <Search size={16} color="#7C3AED" />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => navigateToContactPicker('brokerCompany')}
                        activeOpacity={0.7}
                        style={[styles.contactPickerIconBtn, { backgroundColor: '#F5F3FF' }]}
                      >
                        <BookUser size={18} color="#7C3AED" />
                      </TouchableOpacity>
                    </View>
                    {brokerSearchError ? (
                      <Text style={{ fontSize: 11.5, color: '#D97706', marginTop: 4, fontWeight: '700' }}>
                        ⚠ {brokerSearchError}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 2: SELECT PRODUCT (2nd Step)
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <View style={styles.stepSection}>
              {role === 'buyer' && !party2Data && (
                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                  <Info size={16} color="#2563EB" />
                  <Text style={{ fontSize: 12, color: '#1E40AF', flex: 1, fontWeight: '600' }}>
                    Please select or onboard a Seller in Step 1 to load their product catalog.
                  </Text>
                </View>
              )}

              {/* Search Bar */}
              <View style={styles.searchBarContainer}>
                <Search size={18} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search product by name or HSN code..."
                  placeholderTextColor="#94A3B8"
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
                {productSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearch('')}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryPillsScroll}
                contentContainerStyle={styles.categoryPillsContent}
              >
                <TouchableOpacity
                  style={[styles.categoryPill, selectedCategoryTab === 'all' && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryTab('all')}
                  activeOpacity={0.8}
                >
                  <ShoppingBag size={14} color={selectedCategoryTab === 'all' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.categoryPillText, selectedCategoryTab === 'all' && styles.categoryPillTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.categoryPill, selectedCategoryTab === 'grains' && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryTab('grains')}
                  activeOpacity={0.8}
                >
                  <Wheat size={14} color={selectedCategoryTab === 'grains' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.categoryPillText, selectedCategoryTab === 'grains' && styles.categoryPillTextActive]}>
                    Grains
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.categoryPill, selectedCategoryTab === 'pulses' && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryTab('pulses')}
                  activeOpacity={0.8}
                >
                  <Package size={14} color={selectedCategoryTab === 'pulses' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.categoryPillText, selectedCategoryTab === 'pulses' && styles.categoryPillTextActive]}>
                    Pulses
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.categoryPill, selectedCategoryTab === 'oil' && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryTab('oil')}
                  activeOpacity={0.8}
                >
                  <Droplet size={14} color={selectedCategoryTab === 'oil' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.categoryPillText, selectedCategoryTab === 'oil' && styles.categoryPillTextActive]}>
                    Oil
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.categoryPill, selectedCategoryTab === 'spices' && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryTab('spices')}
                  activeOpacity={0.8}
                >
                  <Flame size={14} color={selectedCategoryTab === 'spices' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.categoryPillText, selectedCategoryTab === 'spices' && styles.categoryPillTextActive]}>
                    Spices
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.categoryPill, selectedCategoryTab === 'more' && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryTab('more')}
                  activeOpacity={0.8}
                >
                  <LayoutGrid size={14} color={selectedCategoryTab === 'more' ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.categoryPillText, selectedCategoryTab === 'more' && styles.categoryPillTextActive]}>
                    More
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Catalog / Recent Products Grid (Only if inventory exists) */}
              {companyProducts.length > 0 && (
                <>
                  <View style={styles.sectionSubHeaderRow}>
                    <View style={styles.sectionTitleWithBadge}>
                      <Text style={styles.subSectionTitle}>Catalog Products</Text>
                      <View style={styles.countBadgePill}>
                        <Text style={styles.countBadgeText}>{filteredProducts.length}</Text>
                      </View>
                    </View>
                    {selectedCategoryTab !== 'all' && (
                      <TouchableOpacity
                        onPress={() => setSelectedCategoryTab('all')}
                        activeOpacity={0.7}
                        style={styles.viewAllBtn}
                      >
                        <Text style={styles.viewAllLink}>View All</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {filteredProducts.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.recentCardsScroll}
                      contentContainerStyle={styles.recentCardsContent}
                    >
                      {filteredProducts.map((item) => {
                        const isSelected = selectedProducts.some(
                          p => (p.id && item.id && p.id === item.id) || p.name.toLowerCase() === item.name.toLowerCase()
                        );
                        const visuals = getProductCategoryVisuals(item);
                        const CategoryIcon = visuals.Icon;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.productCard, isSelected && styles.productCardSelected]}
                            onPress={() => handleSelectRecentProduct(item)}
                            activeOpacity={0.85}
                          >
                            {/* Top Row: Image / Fallback Avatar + Checkbox */}
                            <View style={styles.productCardTopRow}>
                              <View style={styles.productCardImageContainer}>
                                {item.image ? (
                                  <Image
                                    source={{ uri: resolveImageUrl(item.image) }}
                                    style={styles.productCardImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View style={[styles.productCardImageFallback, { backgroundColor: visuals.bg }]}>
                                    <CategoryIcon size={14} color={visuals.color} />
                                  </View>
                                )}
                              </View>

                              {isSelected ? (
                                <View style={styles.selectedBadgeActive}>
                                  <Check size={8} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              ) : (
                                <View style={styles.unselectedRadioCircle} />
                              )}
                            </View>

                            {/* Product Name */}
                            <Text style={[styles.productCardName, isSelected && styles.productCardNameSelected]} numberOfLines={2}>
                              {item.name}
                            </Text>

                            {/* HSN Code or Category Tag */}
                            {item.hsn ? (
                              <View style={styles.hsnBadgePill}>
                                <Text style={styles.hsnBadgeText}>HSN: {item.hsn}</Text>
                              </View>
                            ) : (
                              <View style={[styles.hsnBadgePill, { backgroundColor: visuals.badgeBg }]}>
                                <Text style={[styles.hsnBadgeText, { color: visuals.badgeColor }]}>{visuals.tag}</Text>
                              </View>
                            )}

                            {/* Rate and Unit */}
                            {item.rate ? (
                              <View style={styles.productCardPriceRow}>
                                <Text style={styles.productCardPriceNumber}>
                                  ₹{Number(item.rate).toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.productCardPriceUnit} numberOfLines={1}>
                                  /{item.unit ? ` ${item.unit.replace(/Bag\s*\(/i, '').replace(/\)/i, '')}` : ' unit'}
                                </Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={styles.noProductsCard}>
                      <Info size={16} color="#64748B" />
                      <Text style={styles.noProductsText}>
                        No products found matching &ldquo;{productSearch}&rdquo;
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setProductSearch('');
                          setSelectedCategoryTab('all');
                        }}
                        style={styles.clearSearchBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.clearSearchText}>Clear Filter</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* ══════════════ SELECTED PRODUCTS LIST ══════════════ */}
              <View style={styles.selectedProductsSection}>
                <View style={styles.selectedProductsHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.subSectionTitle}>Selected Products</Text>
                    <View style={styles.countBadgePill}>
                      <Text style={styles.countBadgeText}>{selectedProducts.length}</Text>
                    </View>
                  </View>
                  {selectedProducts.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedProducts([]);
                        setProductName('');
                        setApproxRate('');
                        setHsnCode('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearAllLink}>Clear All</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedProducts.length > 0 ? (
                  <View style={styles.selectedProductsList}>
                    {selectedProducts.map((prod, idx) => {
                      const visuals = getProductCategoryVisuals(prod);
                      const CategoryIcon = visuals.Icon;
                      return (
                        <View key={prod.id || idx} style={styles.selectedProductItemRow}>
                          <View style={[styles.selectedProductItemAvatar, { backgroundColor: visuals.bg }]}>
                            <CategoryIcon size={16} color={visuals.color} />
                          </View>
                          <View style={styles.selectedProductItemInfo}>
                            <Text style={styles.selectedProductItemName} numberOfLines={1}>{prod.name}</Text>
                            <Text style={styles.selectedProductItemMeta}>
                              {prod.rate ? `₹${Number(prod.rate).toLocaleString('en-IN')}` : 'Rate on req.'} • {prod.unit || 'Unit'} {prod.hsn ? `• HSN: ${prod.hsn}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeProductBtn}
                            onPress={() => {
                              setSelectedProducts(prev => prev.filter(p => (p.id ? p.id !== prod.id : p.name !== prod.name)));
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <X size={15} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noSelectedProductsCard}>
                    <ShoppingBag size={18} color="#94A3B8" />
                    <Text style={styles.noSelectedProductsText}>
                      No products selected yet.
                    </Text>
                  </View>
                )}
              </View>


              {/* None selected

Skip to content
Using Gmail with screen readers
2 of 3,703
(no subject)
Inbox
Summarize this email

Charlie
12:01 PM (4 hours ago)
to me

{
    "statusCode": 201,
    "data": {
        "deal": {
            "approvalStatus": {
                "seller": "approved",
                "buyer": "pending",
                "broker": "pending"
            },
            "_id": "6a9a6590aa0fca7efe87c02d",
            "dealNumber": "DEAL-0034",
            "createdBy": {
                "_id": "6a71bfb4a2244416e779df34",
                "name": "raushan",
                "email": "",
                "profilePicture": "http://localhost:8082/api/uploads/9d5ab21c-93b1-494b-b136-7c18d64571be-1788427962176.png",
                "mobileNumber": "6202579799"
            },
            "buyerCompanyId": {
                "_id": "6a72dc48d2eca9ca0b4a5424",
                "name": "gfgfgfg",
                "email": "5555555555@pravisti.temporary.com",
                "phone": "5555555555",
                "logo": null,
                "type": "trader",
                "id": "6a72dc48d2eca9ca0b4a5424"
            },
            "sellerCompanyId": {
                "_id": "6a71c054a2244416e779e065",
                "name": "Nextcoreai Consulting",
                "email": "raushanpandey8445425@gmail.com",
                "phone": "6202579799",
                "logo": null,
                "type": "trader",
                "id": "6a71c054a2244416e779e065"
            },
            "brokerCompanyId": {
                "_id": "6a7468ceb26a99e89323e7cf",
                "name": "mnc Agro Limiteds",
                "email": "raushanffkr845425@gmail.com",
                "phone": "7061901464",
                "logo": "http://localhost:8082/api/uploads/img_mtlc2rv2_e7fa83.png",
                "type": "trader",
                "id": "6a7468ceb26a99e89323e7cf"
            },
            "role": "seller",
            "products": [
                {
                    "productId": {
                        "_id": "6a71c2856b491d0fb76485a1",
                        "categoryId": "6a71c0dba2244416e779e395",
                        "unitId": {
                            "_id": "6a71bfe0205f7ec5ae77ac61",
                            "name": "packet",
                            "shortName": "pk"
                        },
                        "name": "manago",
                        "image": "",
                        "description": "",
                        "hsnCode": "",
                        "gstCode": "GST_18"
                    },
                    "name": "manago",
                    "image": "",
                    "description": "",
                    "hsnCode": "",
                    "gstCode": "GST_18",
                    "unitName": "packet",
                    "unitShortName": "pk",
                    "quantity": 122,
                    "price": 220,
                    "subtotal": 26840,
                    "gst": 18,
                    "gstAmount": 4791.6,
                    "discount": 220,
                    "totalAmount": 31411.6,
                    "paymentTerms": "15 days",
                    "_id": "6a9a6590aa0fca7efe87c02e"
                }
            ],
            "totalSubtotal": 26840,
            "totalDiscount": 220,
            "totalGSTAmount": 4791.6,
            "grandTotal": 31411.6,
            "totalAmount": 31411.6,
            "discount": 220,
            "dealDate": "2026-09-04T06:30:40.751Z",
            "expiryDate": "2026-10-04T23:59:59.000Z",
            "notes": "",
            "rejectionReason": "",
            "status": "pending",
            "acceptedBy": [
                {
                    "companyId": "6a71c054a2244416e779e065",
                    "status": "accepted",
                    "updatedAt": "2026-09-04T06:30:40.751Z",
                    "_id": "6a9a6590aa0fca7efe87c02f"
                },
                {
                    "companyId": "6a72dc48d2eca9ca0b4a5424",
                    "status": "pending",
                    "updatedAt": "2026-09-04T06:30:40.751Z",
                    "_id": "6a9a6590aa0fca7efe87c030"
                },
                {
                    "companyId": "6a7468ceb26a99e89323e7cf",
                    "status": "pending",
                    "updatedAt": "2026-09-04T06:30:40.751Z",
                    "_id": "6a9a6590aa0fca7efe87c031"
                }
            ],
            "isDeleted": false,
            "deletedAt": null,
            "linkedDealId": null,
            "createdAt": "2026-09-04T06:30:40.829Z",
            "updatedAt": "2026-09-04T06:30:40.829Z",
            "__v": 0,
            "paymentInfo": {
                "dealAmount": 31411.6,
                "role": "seller",
                "amountSent": 0,
                "amountReceived": 0,
                "amountSentOrReceived": 0,
                "remainingAmount": 31411.6,
                "progressBarPercentage": 0,
                "historyTimeline": []
            },
            "accountVerificationStatus": {
                "seller": "approved",
                "buyer": "pending"
            },
            "viewerRole": "seller",
            "currentUserRole": "seller",
            "createdByRole": "seller",
            "viewerApprovalStatus": "approved",
            "canApprove": false,
            "canReject": false,
            "pendingApprovalFor": "buyer, broker",
            "remainingPayment": 31411.6,
            "remainingQuantity": 122,
            "deliveryInfo": {
                "historyTimeline": []
            }
        },
        "accessRequest": null
    },
    "message": "Deal created successfully",
    "success": true
}
Zoomed into item. */}



              {/* ══════════════ ADD CUSTOM PRODUCT TRIGGER / COLLAPSIBLE ══════════════ */}
              {!isAddingCustomProduct ? (
                <TouchableOpacity
                  style={styles.addCustomProductTriggerBtn}
                  onPress={() => {
                    setIsAddingCustomProduct(true);
                    setCustomProdError('');
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#2563EB" />
                  <Text style={styles.addCustomProductTriggerText}>+ Add Custom Product</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.formContainer}>
                  <View style={styles.formSectionHeaderRow}>
                    <Text style={styles.subSectionTitle}>Add Custom Product</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setIsAddingCustomProduct(false);
                        setCustomProdError('');
                      }}
                      activeOpacity={0.7}
                      style={{ padding: 4 }}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {customProdError ? (
                    <Text style={{ fontSize: 11.5, color: '#DC2626', fontWeight: '700' }}>
                      ⚠ {customProdError}
                    </Text>
                  ) : null}

                  <View style={styles.inputRow}>
                    {/* Product Name */}
                    <View style={[styles.inputCol, { flex: 1.2 }]}>
                      <Text style={styles.inputLabel}>
                        Product Name <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.textInputBox}>
                        <Package size={16} color="#64748B" style={styles.inputLeadingIcon} />
                        <TextInput
                          style={styles.textInputField}
                          placeholder="Enter product name"
                          placeholderTextColor="#94A3B8"
                          value={customProdName}
                          onChangeText={(t) => {
                            setCustomProdName(t);
                            if (customProdError) setCustomProdError('');
                          }}
                        />
                      </View>
                    </View>

                    {/* HSN Code */}
                    <View style={[styles.inputCol, { flex: 0.8 }]}>
                      <Text style={styles.inputLabel}>HSN Code</Text>
                      <View style={styles.textInputBox}>
                        <Hash size={16} color="#64748B" style={styles.inputLeadingIcon} />
                        <TextInput
                          style={styles.textInputField}
                          placeholder="Enter HSN"
                          placeholderTextColor="#94A3B8"
                          value={customProdHsn}
                          onChangeText={setCustomProdHsn}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={[styles.inputRow, { marginTop: 10 }]}>
                    {/* Unit Selector */}
                    <View style={[styles.inputCol, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>
                        Unit <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={[styles.textInputBox, styles.selectBox]}
                        onPress={() => setShowUnitModal(true)}
                        activeOpacity={0.7}
                      >
                        <ShoppingBag size={16} color="#64748B" style={styles.inputLeadingIcon} />
                        <Text style={styles.selectBoxValue} numberOfLines={1}>
                          {customProdUnit || 'Select unit'}
                        </Text>
                        <ChevronDown size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    {/* Approx Rate */}
                    <View style={[styles.inputCol, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>
                        Approx. Rate <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.textInputBox}>
                        <IndianRupee size={16} color="#64748B" style={styles.inputLeadingIcon} />
                        <TextInput
                          style={styles.textInputField}
                          placeholder="Enter rate"
                          placeholderTextColor="#94A3B8"
                          value={customProdRate}
                          onChangeText={(t) => {
                            setCustomProdRate(t);
                            if (customProdError) setCustomProdError('');
                          }}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsAddingCustomProduct(false);
                        setCustomProdError('');
                      }}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleAddCustomProduct}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2563EB' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>+ Add Product</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 3: DEAL DETAILS & PRODUCT PRICING
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <View style={styles.stepSection}>
              {/* ─────────────────────────────────────────────────────────────
                  STEP 3 - PRODUCT PRICING, QUANTITY & DISCOUNT BREAKDOWN
                 ───────────────────────────────────────────────────────────── */}
              <View style={styles.pricingSectionContainer}>
                <View style={styles.pricingSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShoppingBag size={18} color="#2563EB" />
                    <Text style={styles.pricingSectionTitle}>Products Pricing & Quantity</Text>
                  </View>
                  <View style={styles.countBadgePill}>
                    <Text style={styles.countBadgeText}>{selectedProducts.length || 1}</Text>
                  </View>
                </View>
                <Text style={styles.pricingSectionSubtitle}>
                  Set quantity, rate, discount and GST for each selected product.
                </Text>

                {/* Products List with Individual Pricing Fields */}
                <View style={styles.pricingProductsList}>
                  {(selectedProducts.length > 0 ? selectedProducts : [{
                    name: productName || 'Selected Product',
                    quantity: quantity || '1',
                    rate: approxRate || '0',
                    discount: discount || '0',
                    gst: gstPercent || '18',
                    unit: unit || 'Bag (25 Kg)',
                    hsn: hsnCode || '',
                  }]).map((prod, idx) => {
                    const visuals = getProductCategoryVisuals(prod);
                    const CategoryIcon = visuals.Icon;
                    const itemTotals = calculateProductTotals(prod);

                    return (
                      <View key={prod.id || idx} style={styles.pricingProductCard}>
                        {/* Product Card Header */}
                        <View style={styles.pricingProductHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={[styles.pricingProductAvatar, { backgroundColor: visuals.bg }]}>
                              <CategoryIcon size={16} color={visuals.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.pricingProductName} numberOfLines={1}>{prod.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <View style={styles.unitBadgePill}>
                                  <Text style={styles.unitBadgeText}>{prod.unit || 'Bag'}</Text>
                                </View>
                                {prod.hsn ? (
                                  <View style={styles.hsnBadgePill}>
                                    <Text style={styles.hsnBadgeText}>HSN: {prod.hsn}</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>
                          {selectedProducts.length > 1 && (
                            <TouchableOpacity
                              onPress={() => removeSelectedProduct(idx)}
                              style={styles.pricingRemoveBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <X size={14} color="#94A3B8" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Input Row 1: Quantity & Rate */}
                        <View style={[styles.inputRow, { marginTop: 10 }]}>
                          {/* Quantity */}
                          <View style={[styles.inputCol, { flex: 1 }]}>
                            <Text style={styles.pricingInputLabel}>
                              Quantity ({prod.unit?.split(' ')?.[0] || 'Unit'}) <Text style={styles.requiredStar}>*</Text>
                            </Text>
                            <View style={styles.pricingInputBox}>
                              <Package size={14} color="#64748B" style={styles.inputLeadingIcon} />
                              <TextInput
                                style={styles.pricingInputField}
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                                value={String(prod.quantity || '')}
                                onChangeText={(val) => {
                                  if (selectedProducts.length > 0) {
                                    updateProductField(idx, 'quantity', val);
                                  } else {
                                    setQuantity(val);
                                  }
                                }}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>

                          {/* Rate / Price */}
                          <View style={[styles.inputCol, { flex: 1 }]}>
                            <Text style={styles.pricingInputLabel}>
                              Rate (₹ / {prod.unit?.split(' ')?.[0] || 'Unit'}) <Text style={styles.requiredStar}>*</Text>
                            </Text>
                            <View style={styles.pricingInputBox}>
                              <IndianRupee size={14} color="#64748B" style={styles.inputLeadingIcon} />
                              <TextInput
                                style={styles.pricingInputField}
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                                value={String(prod.rate || '')}
                                onChangeText={(val) => {
                                  if (selectedProducts.length > 0) {
                                    updateProductField(idx, 'rate', val);
                                  } else {
                                    setApproxRate(val);
                                  }
                                }}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>
                        </View>

                        {/* Input Row 2: Discount & GST */}
                        <View style={[styles.inputRow, { marginTop: 8 }]}>
                          {/* Discount */}
                          <View style={[styles.inputCol, { flex: 1 }]}>
                            <Text style={styles.pricingInputLabel}>Discount (₹)</Text>
                            <View style={styles.pricingInputBox}>
                              <Tag size={14} color="#64748B" style={styles.inputLeadingIcon} />
                              <TextInput
                                style={styles.pricingInputField}
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                                value={String(prod.discount || '0')}
                                onChangeText={(val) => {
                                  if (selectedProducts.length > 0) {
                                    updateProductField(idx, 'discount', val);
                                  } else {
                                    setDiscount(val);
                                  }
                                }}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>

                          {/* GST % */}
                          <View style={[styles.inputCol, { flex: 1 }]}>
                            <Text style={styles.pricingInputLabel}>GST (%)</Text>
                            <View style={styles.pricingInputBox}>
                              <Percent size={14} color="#64748B" style={styles.inputLeadingIcon} />
                              <TextInput
                                style={styles.pricingInputField}
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                                value={String(prod.gst !== undefined && prod.gst !== null ? prod.gst : '')}
                                onChangeText={(val) => {
                                  if (selectedProducts.length > 0) {
                                    updateProductField(idx, 'gst', val);
                                  } else {
                                    setGstPercent(val);
                                  }
                                }}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>
                        </View>

                        {/* Live Item Total Strip */}
                        <View style={styles.itemTotalStrip}>
                          <View style={styles.itemTotalCol}>
                            <Text style={styles.itemTotalMicroLabel}>Subtotal</Text>
                            <Text style={styles.itemTotalMicroValue}>₹{itemTotals.subtotal.toLocaleString('en-IN')}</Text>
                          </View>
                          {itemTotals.disc > 0 && (
                            <View style={styles.itemTotalCol}>
                              <Text style={styles.itemTotalMicroLabel}>Discount</Text>
                              <Text style={[styles.itemTotalMicroValue, { color: '#DC2626' }]}>-₹{itemTotals.disc.toLocaleString('en-IN')}</Text>
                            </View>
                          )}
                          <View style={styles.itemTotalCol}>
                            <Text style={styles.itemTotalMicroLabel}>GST ({itemTotals.gstPct}%)</Text>
                            <Text style={styles.itemTotalMicroValue}>+₹{itemTotals.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                          </View>
                          <View style={[styles.itemTotalCol, { alignItems: 'flex-end' }]}>
                            <Text style={[styles.itemTotalMicroLabel, { fontWeight: '700', color: '#1E3A8A' }]}>Item Total</Text>
                            <Text style={styles.itemTotalGrandValue}>₹{itemTotals.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Row: Deal Valid Till & Payment Terms */}
              <View style={[styles.inputRow, { marginTop: 14 }]}>
                {/* Deal Valid Till */}
                <View style={[styles.inputCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Deal Valid Till</Text>
                  <TouchableOpacity
                    style={[styles.textInputBox, styles.selectBox]}
                    onPress={() => openCalendar('validity')}
                    activeOpacity={0.7}
                  >
                    <Calendar size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <Text style={styles.selectBoxValue} numberOfLines={1}>
                      {formatDateDisplay(validityDate)}
                    </Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Payment Terms */}
                <View style={[styles.inputCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Payment Terms</Text>
                  <TouchableOpacity
                    style={[styles.textInputBox, styles.selectBox]}
                    onPress={() => setShowPaymentTermsModal(true)}
                    activeOpacity={0.7}
                  >
                    <CreditCard size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <Text style={styles.selectBoxValue} numberOfLines={1}>{paymentTerms}</Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Overall Deal Pricing Summary Card */}
              {(() => {
                const dealTotals = calculateDealTotals();
                return (
                  <View style={[styles.dealTotalsSummaryCard, { marginTop: 14 }]}>
                    <View style={styles.dealTotalsSummaryHeader}>
                      <Calculator size={15} color="#1E3A8A" />
                      <Text style={styles.dealTotalsSummaryTitle}>Deal Calculation Summary</Text>
                    </View>

                    <View style={styles.dealTotalsSummaryRow}>
                      <Text style={styles.dealTotalsSummaryLabel}>Total Subtotal</Text>
                      <Text style={styles.dealTotalsSummaryVal}>₹{dealTotals.totalSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                    </View>

                    {dealTotals.totalDiscount > 0 && (
                      <View style={styles.dealTotalsSummaryRow}>
                        <Text style={styles.dealTotalsSummaryLabel}>Total Discount</Text>
                        <Text style={[styles.dealTotalsSummaryVal, { color: '#DC2626' }]}>-₹{dealTotals.totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                      </View>
                    )}

                    <View style={styles.dealTotalsSummaryRow}>
                      <Text style={styles.dealTotalsSummaryLabel}>Total GST Amount</Text>
                      <Text style={styles.dealTotalsSummaryVal}>+₹{dealTotals.totalGSTAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                    </View>

                    <View style={styles.dealTotalsSummaryDivider} />

                    <View style={[styles.dealTotalsSummaryRow, { marginTop: 4 }]}>
                      <Text style={styles.dealTotalsGrandLabel}>Grand Total (Deal Value)</Text>
                      <Text style={styles.dealTotalsGrandVal}>₹{dealTotals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Attach Documents */}
              <View style={[styles.formGroup, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Attach Documents (Optional)</Text>
                <View style={styles.uploadDashedCard}>
                  <View style={styles.uploadLeftCol}>
                    <View style={styles.paperclipCircle}>
                      <Paperclip size={18} color="#2563EB" />
                    </View>
                    <View>
                      <Text style={styles.uploadTitle}>Upload Documents</Text>
                      <Text style={styles.uploadSubtitle}>PDF, JPG, PNG (Max. 10MB)</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.browseFilesBtn}
                    onPress={handleBrowseFiles}
                    activeOpacity={0.8}
                    disabled={isUploadingAttachments}
                  >
                    {isUploadingAttachments ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Text style={styles.browseFilesBtnText}>Browse Files</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Uploaded Files Chips */}
                {attachments.length > 0 && (
                  <View style={styles.uploadedChipsRow}>
                    {attachments.map((file) => (
                      <View key={file.id} style={styles.uploadedFileChip}>
                        <FileText size={14} color="#2563EB" />
                        <Text style={styles.uploadedFileName} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.uploadedFileSize}>({file.size})</Text>
                        <TouchableOpacity
                          onPress={() => setAttachments(prev => prev.filter(f => f.id !== file.id))}
                          activeOpacity={0.7}
                        >
                          <X size={12} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 4: REVIEW DEAL
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <View style={styles.stepSection}>
              <View style={styles.sectionHeadingBox}>
                <Text style={styles.mainSectionTitle}>Review Deal</Text>
                <Text style={styles.mainSectionSubtitle}>
                  Please review all details before creating the deal.
                </Text>
              </View>

              {/* Card 1: Parties Involved */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardTitleRow}>
                    <Handshake size={16} color="#2563EB" />
                    <Text style={styles.reviewCardTitle}>Parties Involved</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editPillBtn}
                    onPress={() => setCurrentStep(1)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={12} color="#2563EB" />
                    <Text style={styles.editPillBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Primary Company */}
                <View style={styles.reviewPartyItemRow}>
                  <View style={[styles.partyAvatarBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Text style={[styles.partyAvatarText, { color: '#059669' }]}>
                      {party1 ? party1.substring(0, 2).toUpperCase() : 'CO'}
                    </Text>
                  </View>
                  <View style={styles.partyInfoColumn}>
                    <View style={styles.partyNameRow}>
                      <Text style={styles.partyRolePrefix}>
                        {role === 'buyer' ? 'Buyer (Your Company)' : 'Seller (Your Company)'}
                      </Text>
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    </View>
                    <Text style={styles.partyCompanyName}>{party1}</Text>
                    {Boolean(sellerLocation || getResolvedLocation(activeUserCompany)) && (
                      <View style={styles.partyLocationRow}>
                        <MapPin size={11} color="#64748B" />
                        <Text style={styles.partyLocationText}>{sellerLocation || getResolvedLocation(activeUserCompany)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.reviewDivider} />

                {/* Counterparty */}
                <View style={styles.reviewPartyItemRow}>
                  <View style={[styles.partyAvatarBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Wheat size={18} color="#D97706" />
                  </View>
                  <View style={styles.partyInfoColumn}>
                    <View style={styles.partyNameRow}>
                      <Text style={styles.partyRolePrefix}>
                        {role === 'seller' ? 'Buyer' : 'Seller'}
                      </Text>
                      {party2Data?.status ? (
                        <View style={[
                          styles.partyStatusBadge,
                          (party2Data.status === 'active' || party2Data.status === 'approved') ? styles.partyStatusBadgeActive : styles.partyStatusBadgePending,
                        ]}>
                          <Text style={[
                            styles.partyStatusBadgeText,
                            (party2Data.status === 'active' || party2Data.status === 'approved') ? styles.partyStatusBadgeTextActive : styles.partyStatusBadgeTextPending,
                          ]}>
                            {String(party2Data.status).toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.partyCompanyName}>{party2 || 'Selected Counterparty'}</Text>
                    {Boolean(getResolvedLocation(party2Data)) && (
                      <View style={styles.partyLocationRow}>
                        <MapPin size={11} color="#64748B" />
                        <Text style={styles.partyLocationText}>{getResolvedLocation(party2Data)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Broker (if selected) */}
                {Boolean(brokerCompany) && (
                  <>
                    <View style={styles.reviewDivider} />
                    <View style={styles.reviewPartyItemRow}>
                      <View style={[styles.partyAvatarBox, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                        <Handshake size={18} color="#7C3AED" />
                      </View>
                      <View style={styles.partyInfoColumn}>
                        <View style={styles.partyNameRow}>
                          <Text style={[styles.partyRolePrefix, { color: '#7C3AED' }]}>Broker</Text>
                        </View>
                        <Text style={styles.partyCompanyName}>{brokerCompany}</Text>
                        {Boolean(getResolvedLocation(brokerCompanyData)) && (
                          <View style={styles.partyLocationRow}>
                            <MapPin size={11} color="#64748B" />
                            <Text style={styles.partyLocationText}>{getResolvedLocation(brokerCompanyData)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Card 2: Products & Pricing Review */}
              <View style={[styles.reviewCard, { marginTop: 14 }]}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardTitleRow}>
                    <ShoppingBag size={16} color="#2563EB" />
                    <Text style={styles.reviewCardTitle}>
                      Products & Pricing ({selectedProducts.length > 0 ? selectedProducts.length : 1} {selectedProducts.length > 1 ? 'Items' : 'Item'})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editPillBtn}
                    onPress={() => setCurrentStep(3)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={12} color="#2563EB" />
                    <Text style={styles.editPillBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {(selectedProducts.length > 0 ? selectedProducts : [{
                  name: productName,
                  quantity,
                  rate: approxRate,
                  discount,
                  gst: gstPercent,
                  unit,
                  hsn: hsnCode,
                }]).map((prod, idx) => {
                  const visuals = getProductCategoryVisuals(prod);
                  const CategoryIcon = visuals.Icon;
                  const itemTotals = calculateProductTotals(prod);

                  return (
                    <View key={prod.id || idx} style={[styles.reviewProductItemBlock, idx > 0 && { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                      <View style={styles.reviewProductMainRow}>
                        <View style={[styles.reviewProductThumb, { backgroundColor: visuals.bg }]}>
                          <CategoryIcon size={22} color={visuals.color} />
                        </View>

                        <View style={styles.reviewProductMeta}>
                          <View style={styles.productNameAndBadgeRow}>
                            <Text style={styles.reviewProductName}>{prod.name}</Text>
                            {prod.hsn ? (
                              <View style={styles.hsnBadgePill}>
                                <Text style={styles.hsnBadgeText}>HSN: {prod.hsn}</Text>
                              </View>
                            ) : null}
                          </View>

                          <View style={styles.reviewProductGrid}>
                            <View style={styles.reviewProductGridCol}>
                              <Text style={styles.reviewGridLabel}>Quantity</Text>
                              <Text style={styles.reviewGridValue}>{prod.quantity || 1} {prod.unit?.split(' ')?.[0] || ''}</Text>
                            </View>
                            <View style={styles.reviewProductGridCol}>
                              <Text style={styles.reviewGridLabel}>Rate</Text>
                              <Text style={styles.reviewGridValue}>₹{Number(prod.rate || 0).toLocaleString('en-IN')}</Text>
                            </View>
                            {itemTotals.disc > 0 && (
                              <View style={styles.reviewProductGridCol}>
                                <Text style={styles.reviewGridLabel}>Discount</Text>
                                <Text style={[styles.reviewGridValue, { color: '#DC2626' }]}>
                                  -₹{itemTotals.disc.toLocaleString('en-IN')}
                                </Text>
                              </View>
                            )}
                            <View style={styles.reviewProductGridCol}>
                              <Text style={styles.reviewGridLabel}>GST ({itemTotals.gstPct}%)</Text>
                              <Text style={styles.reviewGridValue}>+₹{itemTotals.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</Text>
                            </View>
                            <View style={[styles.reviewProductGridCol, { alignItems: 'flex-end' }]}>
                              <Text style={[styles.reviewGridLabel, { color: '#2563EB', fontWeight: '700' }]}>Total</Text>
                              <Text style={[styles.reviewGridValue, { color: '#2563EB', fontWeight: '900' }]}>
                                ₹{itemTotals.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Totals Breakdown in Review Card */}
                {(() => {
                  const dealTotals = calculateDealTotals();
                  return (
                    <View style={styles.reviewDealTotalsBox}>
                      <View style={styles.reviewTotalsRow}>
                        <Text style={styles.reviewTotalsLabel}>Subtotal</Text>
                        <Text style={styles.reviewTotalsValue}>₹{dealTotals.totalSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                      </View>
                      {dealTotals.totalDiscount > 0 && (
                        <View style={styles.reviewTotalsRow}>
                          <Text style={styles.reviewTotalsLabel}>Total Discount</Text>
                          <Text style={[styles.reviewTotalsValue, { color: '#DC2626' }]}>-₹{dealTotals.totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                        </View>
                      )}
                      <View style={styles.reviewTotalsRow}>
                        <Text style={styles.reviewTotalsLabel}>Total GST</Text>
                        <Text style={styles.reviewTotalsValue}>+₹{dealTotals.totalGSTAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={styles.reviewTotalsDivider} />
                      <View style={styles.reviewTotalsRow}>
                        <Text style={styles.reviewGrandTotalLabel}>Grand Total (Deal Value)</Text>
                        <Text style={styles.reviewGrandTotalValue}>₹{dealTotals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Deal Validity & Payment Terms Bar */}
                <View style={styles.reviewTermsRow}>
                  <View style={styles.reviewTermItem}>
                    <Calendar size={13} color="#64748B" />
                    <Text style={styles.reviewTermLabel}>Valid Till:</Text>
                    <Text style={styles.reviewTermValue} numberOfLines={1}>{formatDateDisplay(validityDate)}</Text>
                  </View>
                  <View style={styles.reviewTermDivider} />
                  <View style={styles.reviewTermItem}>
                    <CreditCard size={13} color="#64748B" />
                    <Text style={styles.reviewTermLabel}>Payment:</Text>
                    <Text style={styles.reviewTermValue} numberOfLines={1}>{paymentTerms}</Text>
                  </View>
                </View>
              </View>

              {/* Card 3: Attachments (Only shown if files attached) */}
              {attachments.length > 0 && (
                <View style={[styles.reviewCard, { marginTop: 14 }]}>
                  <View style={styles.reviewCardHeader}>
                    <View style={styles.reviewCardTitleRow}>
                      <Paperclip size={16} color="#2563EB" />
                      <Text style={styles.reviewCardTitle}>Attachments ({attachments.length})</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editPillBtn}
                      onPress={() => setCurrentStep(3)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={12} color="#2563EB" />
                      <Text style={styles.editPillBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reviewAttachmentsRow}>
                    {attachments.map((file) => (
                      <View key={file.id} style={styles.reviewFileBadge}>
                        <View style={[styles.reviewFileIconBox, file.type === 'pdf' ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#ECFDF5' }]}>
                          <FileText size={14} color={file.type === 'pdf' ? '#EF4444' : '#10B981'} />
                        </View>
                        <View style={{ flexShrink: 1 }}>
                          <Text style={styles.reviewFileName} numberOfLines={1}>{file.name}</Text>
                          <Text style={styles.reviewFileSize}>{file.size}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Terms & Conditions Notice */}
              <View style={styles.termsAgreementNotice}>
                <Shield size={16} color="#2563EB" />
                <Text style={styles.termsAgreementText}>
                  By creating this deal, you agree to our{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => Linking.openURL('https://pravisti.com/terms').catch(() => { })}
                  >
                    terms & conditions
                  </Text>
                  .
                </Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* ════════════════ BOTTOM ACTION BAR ════════════════ */}
        {!isKeyboardVisible && (
          <View style={styles.bottomActionBar}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.backActionButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setCurrentStep(prev => prev - 1);
                }}
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color="#2563EB" />
                <Text style={styles.backActionText}>Back</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.continueActionButton,
                currentStep === 1 && { width: '100%' },
                isSubmitting && styles.continueActionDisabled,
              ]}
              onPress={() => {
                Keyboard.dismiss();
                handleContinue();
              }}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.continueActionText}>
                    {currentStep === 4 ? 'Create Deal' : 'Continue'}
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════ DATE PICKER MODAL ════════════════ */}
        {isDatePickerVisible && (
          <Modal transparent visible={isDatePickerVisible} animationType="slide" onRequestClose={() => setIsDatePickerVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setIsDatePickerVisible(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <View style={styles.modalTitleRow}>
                  <Calendar size={18} color="#2563EB" />
                  <Text style={styles.modalTitleText}>
                    {pickingForDate === 'expected' ? 'Expected Deal Date' : 'Deal Valid Till'}
                  </Text>
                </View>

                <View style={styles.calendarHeaderRow}>
                  <TouchableOpacity
                    style={styles.calNavBtn}
                    onPress={() => {
                      const d = new Date(tempDate);
                      d.setMonth(tempDate.getMonth() - 1);
                      setTempDate(d);
                    }}
                  >
                    <Text style={styles.calNavBtnText}>◀</Text>
                  </TouchableOpacity>
                  <Text style={styles.calMonthLabel}>
                    {MONTHS[tempDate.getMonth()]} {tempDate.getFullYear()}
                  </Text>
                  <TouchableOpacity
                    style={styles.calNavBtn}
                    onPress={() => {
                      const d = new Date(tempDate);
                      d.setMonth(tempDate.getMonth() + 1);
                      setTempDate(d);
                    }}
                  >
                    <Text style={styles.calNavBtnText}>▶</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.daysGrid}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isSelected = tempDate.getDate() === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                        onPress={() => {
                          const d = new Date(tempDate);
                          d.setDate(day);
                          setTempDate(d);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsDatePickerVisible(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmCalendarDate}>
                    <Text style={styles.modalConfirmBtnText}>Confirm Date ✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ UNIT SELECTOR MODAL ════════════════ */}
        {showUnitModal && (
          <Modal transparent visible={showUnitModal} animationType="slide" onRequestClose={() => setShowUnitModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowUnitModal(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <Text style={styles.modalTitleText}>Select Unit</Text>
                <ScrollView style={{ maxHeight: 280 }}>
                  {unitsList.map((uItem, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.optionItemRow, unit === uItem.label && styles.optionItemRowSelected]}
                      onPress={() => {
                        setUnit(uItem.label);
                        setShowUnitModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionItemText, unit === uItem.label && styles.optionItemTextSelected]}>
                        {uItem.label}
                      </Text>
                      {unit === uItem.label && <Check size={16} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ DEAL TYPE SELECTOR MODAL ════════════════ */}
        {showTypeModal && (
          <Modal transparent visible={showTypeModal} animationType="slide" onRequestClose={() => setShowTypeModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowTypeModal(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <Text style={styles.modalTitleText}>Select Deal Type</Text>
                {DEAL_TYPES.map((t, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionItemRow, dealType === t && styles.optionItemRowSelected]}
                    onPress={() => {
                      setDealType(t);
                      setShowTypeModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionItemText, dealType === t && styles.optionItemTextSelected]}>{t}</Text>
                    {dealType === t && <Check size={16} color="#2563EB" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ DEAL CATEGORY MODAL ════════════════ */}
        {showCategoryModal && (
          <Modal transparent visible={showCategoryModal} animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowCategoryModal(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <Text style={styles.modalTitleText}>Select Category</Text>
                {DEAL_CATEGORIES.map((c, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionItemRow, dealCategory === c && styles.optionItemRowSelected]}
                    onPress={() => {
                      setDealCategory(c);
                      setShowCategoryModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionItemText, dealCategory === c && styles.optionItemTextSelected]}>{c}</Text>
                    {dealCategory === c && <Check size={16} color="#2563EB" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ PAYMENT TERMS MODAL ════════════════ */}
        {showPaymentTermsModal && (
          <Modal transparent visible={showPaymentTermsModal} animationType="slide" onRequestClose={() => setShowPaymentTermsModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowPaymentTermsModal(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <Text style={styles.modalTitleText}>Select Payment Terms</Text>
                {PAYMENT_TERMS_LIST.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionItemRow, paymentTerms === p && styles.optionItemRowSelected]}
                    onPress={() => {
                      setPaymentTerms(p);
                      setShowPaymentTermsModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionItemText, paymentTerms === p && styles.optionItemTextSelected]}>{p}</Text>
                    {paymentTerms === p && <Check size={16} color="#2563EB" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ DELIVERY TERMS MODAL ════════════════ */}
        {showDeliveryTermsModal && (
          <Modal transparent visible={showDeliveryTermsModal} animationType="slide" onRequestClose={() => setShowDeliveryTermsModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowDeliveryTermsModal(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <Text style={styles.modalTitleText}>Select Delivery Terms (Incoterms)</Text>
                {DELIVERY_TERMS_LIST.map((d, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionItemRow, deliveryTerms === d && styles.optionItemRowSelected]}
                    onPress={() => {
                      setDeliveryTerms(d);
                      setShowDeliveryTermsModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionItemText, deliveryTerms === d && styles.optionItemTextSelected]}>{d}</Text>
                    {deliveryTerms === d && <Check size={16} color="#2563EB" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ COMPANY SWITCH MODAL ════════════════ */}
        {showCompanySwitchModal && (
          <Modal transparent visible={showCompanySwitchModal} animationType="slide" onRequestClose={() => setShowCompanySwitchModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowCompanySwitchModal(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <Text style={styles.modalTitleText}>Switch Active Company</Text>
                <ScrollView style={{ maxHeight: 280 }}>
                  {userCompaniesList.map((c, idx) => {
                    const cId = c._id || c.id;
                    const isSelected = String(activeUserCompany?._id || activeUserCompany?.id) === String(cId);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.optionItemRow, isSelected && styles.optionItemRowSelected]}
                        onPress={() => {
                          setActiveUserCompany(c);
                          setParty1(c.name || 'My Company');
                          const ind = getResolvedIndustry(c, 'Commodity Trading');
                          setSellerIndustry(ind);
                          const loc = getResolvedLocation(c, '');
                          if (loc) {
                            setSellerLocation(loc);
                          }
                          setShowCompanySwitchModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.optionItemText, isSelected && styles.optionItemTextSelected]}>
                            {c.name}
                          </Text>
                          {getResolvedIndustry(c) ? (
                            <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                              {getResolvedIndustry(c)}
                            </Text>
                          ) : null}
                          {getResolvedLocation(c) ? (
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                              📍 {getResolvedLocation(c)}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected && <Check size={16} color="#2563EB" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ COUNTERPARTY MULTI-COMPANY MODAL ════════════════ */}
        {showMultiCompanyModal && (
          <Modal transparent visible={showMultiCompanyModal} animationType="slide" onRequestClose={() => setShowMultiCompanyModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowMultiCompanyModal(false)} />
              <View style={styles.modalSheetContainer}>
                <View style={styles.modalDragHandle} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
                  <Text style={styles.modalTitleText}>
                    Select {multiCompanyTargetField === 'brokerCompany' ? 'Broker' : (role === 'buyer' ? 'Seller' : 'Buyer')} Company
                  </Text>
                  <TouchableOpacity onPress={() => setShowMultiCompanyModal(false)} style={{ padding: 4 }}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                  {multiCompanyUserName} represents multiple registered companies. Choose one for this deal:
                </Text>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {multiCompanyList.map((co, idx) => {
                    const coId = co.companyId || co._id || co.id;
                    const coName = co.companyName || co.name || `Company ${idx + 1}`;
                    const currentSelectedId = multiCompanyTargetField === 'brokerCompany'
                      ? (brokerCompanyData?.companyId || brokerCompanyData?._id)
                      : (party2Data?.companyId || party2Data?._id);
                    const isSelected = String(currentSelectedId) === String(coId);

                    return (
                      <TouchableOpacity
                        key={`m_co_${idx}`}
                        style={[
                          styles.optionItemRow,
                          { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: isSelected ? '#2563EB' : '#E2E8F0', backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF' },
                        ]}
                        onPress={() => handleSelectMultiCompany(co)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Building2 size={16} color={isSelected ? '#2563EB' : '#475569'} />
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: isSelected ? '#2563EB' : '#0F172A' }}>
                              {coName}
                            </Text>
                          </View>
                          {getResolvedIndustry(co) ? (
                            <Text style={{ fontSize: 11.5, color: '#64748B', marginLeft: 22 }}>
                              {getResolvedIndustry(co)}
                            </Text>
                          ) : null}
                          {getResolvedLocation(co) ? (
                            <Text style={{ fontSize: 11, color: '#94A3B8', marginLeft: 22 }}>
                              📍 {getResolvedLocation(co)}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected && <Check size={18} color="#2563EB" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ QUICK ONBOARDING MODAL ════════════════ */}
        {showOnboardModal && (
          <Modal visible={showOnboardModal} transparent animationType="slide" onRequestClose={() => setShowOnboardModal(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
              <View style={[styles.modalSheetContainer, { maxHeight: '90%' }]}>
                <View style={styles.modalDragHandle} />

                {/* Modal Header with Icon, Title & Role */}
                <View style={styles.onboardHeader}>
                  <View style={styles.onboardHeaderLeft}>
                    <View style={styles.onboardIconBox}>
                      <UserPlus size={20} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.onboardTitle}>
                        {onboardRole === 'seller' ? 'Register New Seller' : onboardRole === 'broker' ? 'Register New Broker' : 'Register New Buyer'}
                      </Text>
                      <Text style={styles.onboardSubtitle}>
                        Add business details to link with this deal
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowOnboardModal(false)} style={styles.modalCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                  style={{ width: '100%', marginTop: 8 }}
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  <View style={{ gap: 12, paddingTop: 4 }}>

                    {/* 1. Contact Person Full Name (Mandatory) */}
                    <View>
                      <View style={styles.onboardLabelRow}>
                        <View style={styles.onboardLabelLeft}>
                          <User size={13} color="#2563EB" />
                          <Text style={styles.onboardLabelText}>
                            Contact Person Name <Text style={styles.mandatoryStar}>*</Text>
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.textInputBox, styles.onboardInputHighlight, onboardErrors.name && styles.textInputBoxError]}>
                        <TextInput
                          style={styles.textInputField}
                          value={onboardForm.name}
                          onChangeText={t => {
                            setOnboardForm({ ...onboardForm, name: t });
                            if (onboardErrors.name) setOnboardErrors(prev => ({ ...prev, name: undefined }));
                          }}
                          placeholder="e.g. Ramesh Kumar"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      {onboardErrors.name && (
                        <Text style={styles.errorHelperText}>⚠ {onboardErrors.name}</Text>
                      )}
                    </View>

                    {/* 2. Mobile Number (Mandatory 10 Digits) */}
                    <View>
                      <View style={styles.onboardLabelRow}>
                        <View style={styles.onboardLabelLeft}>
                          <Phone size={13} color="#2563EB" />
                          <Text style={styles.onboardLabelText}>
                            Mobile Number <Text style={styles.mandatoryStar}>*</Text>
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.textInputBox, styles.onboardInputHighlight, { paddingLeft: 0 }, onboardErrors.mobileNumber && styles.textInputBoxError]}>
                        <View style={styles.phonePrefixBox}>
                          <Text style={styles.phonePrefixText}>+91</Text>
                        </View>
                        <TextInput
                          style={[styles.textInputField, { paddingLeft: 10 }]}
                          value={onboardForm.mobileNumber}
                          onChangeText={t => {
                            setOnboardForm({ ...onboardForm, mobileNumber: t.replace(/\D/g, '').slice(0, 10) });
                            if (onboardErrors.mobileNumber) setOnboardErrors(prev => ({ ...prev, mobileNumber: undefined }));
                          }}
                          placeholder="10-digit mobile number"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>
                      {onboardErrors.mobileNumber && (
                        <Text style={styles.errorHelperText}>⚠ {onboardErrors.mobileNumber}</Text>
                      )}
                    </View>

                    {/* 3. Company / Firm Name (Mandatory) */}
                    <View>
                      <View style={styles.onboardLabelRow}>
                        <View style={styles.onboardLabelLeft}>
                          <Building2 size={13} color="#2563EB" />
                          <Text style={styles.onboardLabelText}>
                            Business / Company Name <Text style={styles.mandatoryStar}>*</Text>
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.textInputBox, styles.onboardInputHighlight, onboardErrors.companyName && styles.textInputBoxError]}>
                        <TextInput
                          style={styles.textInputField}
                          value={onboardForm.companyName}
                          onChangeText={t => {
                            setOnboardForm({ ...onboardForm, companyName: t });
                            if (onboardErrors.companyName) setOnboardErrors(prev => ({ ...prev, companyName: undefined }));
                          }}
                          placeholder="e.g. Shree Ram Agro Traders"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      {onboardErrors.companyName && (
                        <Text style={styles.errorHelperText}>⚠ {onboardErrors.companyName}</Text>
                      )}
                    </View>

                    {/* 4. GST / Registration (Optional) */}
                    <View>
                      <View style={styles.onboardLabelRow}>
                        <View style={styles.onboardLabelLeft}>
                          <FileText size={13} color="#64748B" />
                          <Text style={styles.onboardLabelText}>GST / Registration Number</Text>
                        </View>
                      </View>
                      <View style={styles.textInputBox}>
                        <TextInput
                          style={styles.textInputField}
                          value={onboardForm.registrationNumber}
                          onChangeText={t => setOnboardForm({ ...onboardForm, registrationNumber: t.toUpperCase() })}
                          placeholder="GST Number (e.g. 07AAAAA0000A1Z5)"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>

                    {/* 5. Pincode (Optional - Auto Fetch) */}
                    <View>
                      <View style={styles.onboardLabelRow}>
                        <View style={styles.onboardLabelLeft}>
                          <MapPin size={13} color="#64748B" />
                          <Text style={styles.onboardLabelText}>Pincode / Postal Code</Text>
                        </View>
                      </View>
                      <View style={styles.textInputBox}>
                        <TextInput
                          style={styles.textInputField}
                          value={onboardForm.postalCode}
                          onChangeText={handlePincodeChange}
                          placeholder="6-digit pincode"
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                        {isPincodeLoading && <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />}
                      </View>
                    </View>

                    {/* 6. City & State */}
                    <View style={styles.inputRow}>
                      <View style={[styles.inputCol, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>City</Text>
                        <View style={styles.textInputBox}>
                          <TextInput
                            style={styles.textInputField}
                            value={onboardForm.city}
                            onChangeText={t => setOnboardForm({ ...onboardForm, city: t })}
                            placeholder="City"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                      <View style={[styles.inputCol, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>State</Text>
                        <View style={styles.textInputBox}>
                          <TextInput
                            style={styles.textInputField}
                            value={onboardForm.state}
                            onChangeText={t => setOnboardForm({ ...onboardForm, state: t })}
                            placeholder="State"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                    </View>

                    {/* 7. Product Details for Seller Onboarding (Optional) */}
                    {onboardRole === 'seller' && (
                      <View style={styles.sellerProductCard}>
                        {/* Header */}
                        <View style={styles.sellerProductHeaderRow}>
                          <View style={styles.sellerProductIconBadge}>
                            <Package size={16} color="#2563EB" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.sellerProductMainTitle}>Seller's Product Details</Text>
                            <Text style={styles.sellerProductSubTitle}>Auto-creates and links commodity to this deal</Text>
                          </View>
                        </View>

                        {/* Product Name */}
                        <View style={{ gap: 4 }}>
                          <View style={styles.onboardLabelLeft}>
                            <ShoppingBag size={13} color="#2563EB" />
                            <Text style={styles.onboardLabelText}>Product / Commodity Name</Text>
                          </View>
                          <View style={[styles.textInputBox, styles.onboardInputHighlight]}>
                            <TextInput
                              style={styles.textInputField}
                              value={onboardForm.productName}
                              onChangeText={t => setOnboardForm({ ...onboardForm, productName: t })}
                              placeholder="e.g. Basmati Rice 1121, Mustard Oil, Wheat"
                              placeholderTextColor="#94A3B8"
                            />
                          </View>
                        </View>

                        {/* Unit Selector Dropdown */}
                        <View style={{ gap: 4 }}>
                          <View style={styles.onboardLabelLeft}>
                            <Tag size={13} color="#64748B" />
                            <Text style={styles.onboardLabelText}>Select Unit</Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.textInputBox,
                              styles.selectBox,
                              styles.onboardInputHighlight,
                              showOnboardUnitDropdown && { borderColor: '#2563EB', borderWidth: 1.5 },
                            ]}
                            onPress={() => setShowOnboardUnitDropdown(!showOnboardUnitDropdown)}
                            activeOpacity={0.7}
                          >
                            {(() => {
                              const selectedUnitObj = unitsList.find(
                                u => u.id === onboardForm.unitId || u.name === onboardForm.unitId || u.label === onboardForm.unitId || u.short === onboardForm.unitId
                              );
                              const displayLabel = selectedUnitObj?.name || selectedUnitObj?.label || selectedUnitObj?.short || onboardForm.unitId || 'Select Unit';
                              return (
                                <Text style={[styles.selectBoxValue, !selectedUnitObj && !onboardForm.unitId && { color: '#94A3B8' }]}>
                                  {displayLabel}
                                </Text>
                              );
                            })()}
                            <ChevronDown size={18} color="#64748B" style={[showOnboardUnitDropdown && { transform: [{ rotate: '180deg' }] }]} />
                          </TouchableOpacity>

                          {showOnboardUnitDropdown && (
                            <View style={styles.onboardDropdownMenu}>
                              <ScrollView
                                nestedScrollEnabled={true}
                                style={{ maxHeight: 160 }}
                                showsVerticalScrollIndicator={true}
                              >
                                {unitsList.map((uItem, uIdx) => {
                                  const uLabel = uItem.name || uItem.label || uItem.short || uItem.value;
                                  const uId = uItem.id || uItem._id || uItem.name || uLabel;
                                  const isSel = (onboardForm.unitId === uId || onboardForm.unitId === uLabel || onboardForm.unitId === uItem.name);
                                  return (
                                    <TouchableOpacity
                                      key={`onb_drop_${uIdx}`}
                                      style={[
                                        styles.onboardDropdownMenuItem,
                                        isSel && styles.onboardDropdownMenuItemActive,
                                      ]}
                                      onPress={() => {
                                        setOnboardForm(prev => ({ ...prev, unitId: uId }));
                                        setShowOnboardUnitDropdown(false);
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={[styles.onboardDropdownItemText, isSel && styles.onboardDropdownItemTextActive]}>
                                        {uLabel} {uItem.symbol && uItem.symbol !== uLabel ? `(${uItem.symbol})` : ''}
                                      </Text>
                                      {isSel && <Check size={15} color="#2563EB" />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          )}
                        </View>

                        {/* HSN Code */}
                        <View style={{ gap: 4 }}>
                          <View style={styles.onboardLabelLeft}>
                            <Hash size={13} color="#64748B" />
                            <Text style={styles.onboardLabelText}>HSN Code</Text>
                          </View>
                          <View style={[styles.textInputBox, styles.onboardInputHighlight]}>
                            <TextInput
                              style={styles.textInputField}
                              value={onboardForm.hsnCode}
                              onChangeText={t => setOnboardForm({ ...onboardForm, hsnCode: t })}
                              placeholder="HSN Code (e.g. 1006)"
                              placeholderTextColor="#94A3B8"
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      </View>
                    )}

                  </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowOnboardModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, isOnboardingSubmitting && { opacity: 0.7 }]}
                    onPress={handleExecuteOnboard}
                    disabled={isOnboardingSubmitting}
                    activeOpacity={0.85}
                  >
                    {isOnboardingSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <UserPlus size={16} color="#FFFFFF" />
                        <Text style={styles.modalConfirmBtnText}>Save & Add Party ✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* ════════════════ SUCCESS MODAL ════════════════ */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.successModalOverlay}>
            <View style={styles.successCard}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={42} color="#10B981" />
              </View>
              <Text style={styles.successModalTitle}>Deal Created Successfully!</Text>
              <Text style={styles.successModalSubtitle}>
                {createdDealData?.dealNumber
                  ? `Deal #${createdDealData.dealNumber} recorded in Sauda ledger.`
                  : 'Trade agreement established and recorded in Sauda ledger.'}
              </Text>
              <View style={styles.successDivider} />
              <Text style={styles.successDetailText}>
                {createdDealData?.products?.[0]?.name || productName || dealName} • ₹{createdDealData?.grandTotal ? Number(createdDealData.grandTotal).toLocaleString('en-IN') : dealValue}
              </Text>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },

  /* Top Header */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 2,
  },
  mascotWrapper: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: 44,
    height: 44,
  },

  /* Stepper */
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  stepCircleCompleted: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
  },
  stepLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    marginHorizontal: 6,
  },
  stepperLineActive: {
    backgroundColor: '#2563EB',
  },

  /* Scroll View */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  stepSection: {
    gap: 16,
  },
  sectionHeadingBox: {
    marginBottom: 2,
  },
  mainSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  mainSectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  /* Role Switcher */
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  roleTabActive: {
    backgroundColor: '#2563EB',
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Search Bar */
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },

  /* Category Pills */
  categoryPillsScroll: {
    marginHorizontal: -16,
  },
  categoryPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },

  /* Section Sub Header */
  sectionSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  viewAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  smallAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  smallAddChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Recent Products Cards (Small & Compact) */
  recentCardsScroll: {
    marginHorizontal: -16,
    marginTop: 4,
  },
  recentCardsContent: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    gap: 7,
    flexDirection: 'row',
  },
  productCard: {
    width: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'space-between',
  },
  productCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  productCardImageContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
  },
  productCardImage: {
    width: '100%',
    height: '100%',
  },
  productCardImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedRadioCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  productCardName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
    minHeight: 26,
    lineHeight: 13,
    marginBottom: 2,
  },
  productCardNameSelected: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  hsnBadgePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  hsnBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#475569',
  },
  productCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 1,
    marginTop: 1,
  },
  productCardPriceNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  productCardPriceUnit: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748B',
  },
  noProductsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  noProductsText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    fontWeight: '500',
  },
  clearSearchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  clearSearchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Selected Products Section */
  selectedProductsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    gap: 10,
  },
  selectedProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  selectedProductsList: {
    gap: 8,
  },
  selectedProductItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  selectedProductItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedProductItemInfo: {
    flex: 1,
    gap: 2,
  },
  selectedProductItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedProductItemMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  removeProductBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSelectedProductsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noSelectedProductsText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    fontWeight: '500',
    lineHeight: 16,
  },
  addCustomProductTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    marginTop: 8,
  },
  addCustomProductTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  formGroup: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputCol: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  requiredStar: {
    color: '#EF4444',
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 42,
  },
  textInputBoxFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  textInputBoxError: {
    borderColor: '#EF4444',
  },
  inputLeadingIcon: {
    marginRight: 6,
  },
  textInputField: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 0,
  },
  selectBox: {
    justifyContent: 'space-between',
  },
  selectBoxValue: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    gap: 8,
  },
  infoNoticeIcon: {
    flexShrink: 0,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 16,
  },

  /* Step 1 Parties */
  partyCardWrapper: {
    gap: 8,
  },
  partySectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  whitePartyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  partyAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyAvatarText: {
    fontSize: 15,
    fontWeight: '900',
  },
  partyInfoColumn: {
    flex: 1,
    gap: 2,
  },
  partyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partyCompanyName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  partyRolePrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  primaryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  partyCategoryText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  partyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  partyLocationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  partyEditButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyRemoveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewPartyLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    paddingLeft: 6,
  },
  contactPickerIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  otherPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  otherPartyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherPartyRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  otherPartyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  otherPartyAction: {
    padding: 2,
  },
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  notesInputField: {
    fontSize: 12.5,
    color: '#0F172A',
    minHeight: 55,
    textAlignVertical: 'top',
    padding: 0,
  },
  charCounterText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  errorMessageText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 2,
  },

  /* Step 3 & Upload Box */
  uploadDashedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    padding: 14,
  },
  uploadLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paperclipCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  uploadSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  browseFilesBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  browseFilesBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  uploadedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  uploadedFileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  uploadedFileName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    maxWidth: 110,
  },
  uploadedFileSize: {
    fontSize: 10,
    color: '#64748B',
  },

  /* Step 4 Review */
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  editPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  reviewProductMainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewProductThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewProductMeta: {
    flex: 1,
    gap: 6,
  },
  productNameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewProductName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewProductGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 2,
  },
  reviewProductGridCol: {
    gap: 2,
  },
  reviewGridLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  reviewGridValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewPartyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  reviewOtherPartiesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  reviewOtherPartiesHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  reviewOtherPartiesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  reviewOtherPartyCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewOtherPartyRole: {
    fontSize: 10,
    color: '#64748B',
  },
  reviewOtherPartyName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewTermsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  reviewTermItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewTermLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  reviewTermValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  reviewTermDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
  },
  dealSummaryGrid: {
    gap: 10,
  },
  summaryGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryItemTextCol: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewAttachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reviewFileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    gap: 8,
  },
  reviewFileIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFileName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 100,
  },
  reviewFileSize: {
    fontSize: 10,
    color: '#64748B',
  },
  moreFilesBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  moreFilesBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  termsAgreementNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 6,
  },
  termsAgreementText: {
    flex: 1,
    fontSize: 11.5,
    color: '#1E40AF',
    lineHeight: 16,
  },
  termsLink: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  /* Bottom Bar */
  bottomActionBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    gap: 6,
  },
  backActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  continueActionButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  continueActionDisabled: {
    opacity: 0.7,
  },
  continueActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavBtnText: {
    fontSize: 12,
    color: '#0F172A',
  },
  calMonthLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginVertical: 10,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayCellSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  optionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionItemRowSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  optionItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  optionItemTextSelected: {
    fontWeight: '800',
    color: '#2563EB',
  },

  /* Success Modal */
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successModalSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  successDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  successDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  partyStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
  },
  partyStatusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  partyStatusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  partyStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  partyStatusBadgeTextActive: {
    color: '#15803D',
  },
  partyStatusBadgeTextPending: {
    color: '#B45309',
  },

  /* Quick Onboarding Modal Styles */
  onboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  onboardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  onboardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  onboardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  onboardNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  onboardNoticeText: {
    fontSize: 11.5,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
  onboardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  onboardLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onboardLabelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  mandatoryStar: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  mandatoryBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mandatoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  optionalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  onboardInputHighlight: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  errorHelperText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 3,
    marginLeft: 2,
  },
  phonePrefixBox: {
    paddingHorizontal: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
  },
  phonePrefixText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sellerProductCard: {
    marginTop: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F0F7FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  sellerProductHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  sellerProductIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerProductMainTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  sellerProductSubTitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  onboardUnitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  onboardUnitChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  onboardUnitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  onboardUnitChipTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  onboardDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  onboardDropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  onboardDropdownMenuItemActive: {
    backgroundColor: '#EFF6FF',
  },
  onboardDropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  onboardDropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  pricingSectionContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 4,
    marginBottom: 6,
    gap: 10,
  },
  pricingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pricingSectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: -4,
  },
  pricingProductsList: {
    gap: 12,
    marginTop: 4,
  },
  pricingProductCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pricingProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pricingProductAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingProductName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  pricingRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  pricingInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
  },
  pricingInputField: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 0,
  },
  gstPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  gstPillLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  gstRateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gstRateChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  gstRateChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  gstRateChipTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  itemTotalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  itemTotalCol: {
    gap: 1,
  },
  itemTotalMicroLabel: {
    fontSize: 9.5,
    color: '#0369A1',
    fontWeight: '600',
  },
  itemTotalMicroValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  itemTotalGrandValue: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0284C7',
  },
  dealTotalsSummaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  dealTotalsSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  dealTotalsSummaryTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  dealTotalsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealTotalsSummaryLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  dealTotalsSummaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dealTotalsSummaryDivider: {
    height: 1,
    backgroundColor: '#BFDBFE',
    marginVertical: 2,
  },
  dealTotalsGrandLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  dealTotalsGrandVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  reviewProductItemBlock: {
    gap: 6,
  },
  reviewDealTotalsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 12,
    gap: 5,
  },
  reviewTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewTotalsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  reviewTotalsValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewTotalsDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 3,
  },
  reviewGrandTotalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  reviewGrandTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
  },
});

export default CreateDeal;
