import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Modal,
  Platform,
  Animated,
  PermissionsAndroid,
  FlatList,
} from 'react-native';
import Contacts from 'react-native-contacts';
import BrokerSuccessReceipt from '../../common/BrokerSuccessReceipt';
import {
  ArrowLeft,
  Bell,
  Search,
  Plus,
  Building2,
  User,
  Handshake,
  Box,
  ShieldCheck,
  CheckCircle2,
  CircleAlert as AlertCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  PackagePlus,
  Share2,
  BookUser,
  RotateCcw,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDeal,
  getUserProfile,
  searchCounterpartyUser,
  getProducts,
  getCategories,
  createCategory,
  createProduct,
  getUnits,
} from '../../../services/api';
import { generateAssistedRegistrationLink } from '../../../utils/WhatsAppService';
import BrokerAssistedOnboardingModal from './BrokerAssistedOnboardingModal';

// --- COLOR SYSTEM (Electric Royal Blue Theme) ---
const COLORS = {
  primary: '#3B3CFF',
  primaryDark: '#3B3CFF',
  headerMiddle: '#4D3EFF',
  headerEnd: '#5143EB',
  primaryLight: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  success: '#059669',
  successDark: '#15803D',
  successLight: '#DCFCE7',
  successBorder: '#86EFAC',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  errorBorder: '#FCA5A5',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textPlaceholder: '#94A3B8',
  bgMain: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
};

// --- HELPER FORMATTING UTILS ---
const formatIndianCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
};

const CreateBrokerDeal = ({ onNavigate, routeData }) => {
  const [currentUser, setCurrentUser] = useState(routeData?.user || null);
  const [selectedBrokerCompany, setSelectedBrokerCompany] = useState(routeData?.company || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadDefaultBrokerCompany = async () => {
      if (!routeData?.company) {
        try {
          const storedStr = await AsyncStorage.getItem('broker_companies_storage');
          if (storedStr) {
            const list = JSON.parse(storedStr);
            if (Array.isArray(list) && list.length > 0) {
              setSelectedBrokerCompany(list[0]);
            }
          }
        } catch (e) {
          console.warn('Could not auto-load broker company:', e);
        }
      }
    };
    loadDefaultBrokerCompany();
  }, [routeData]);

  // Wizard Step State (1: Seller, 2: Buyer, 3: Deal Details)
  const [currentStep, setCurrentStep] = useState(1);

  // Seller State
  const [sellerMobile, setSellerMobile] = useState('');
  const [sellerParty, setSellerParty] = useState(null); // { user, company, products, isAssisted }
  const [sellerStatus, setSellerStatus] = useState('Pending');
  const [sellerProducts, setSellerProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [sellerNotFound, setSellerNotFound] = useState(false);
  const [sellerSearchError, setSellerSearchError] = useState('');

  // Buyer State
  const [buyerMobile, setBuyerMobile] = useState('');
  const [buyerParty, setBuyerParty] = useState(null); // { user, company, isAssisted }
  const [buyerStatus, setBuyerStatus] = useState('Pending');
  const [buyerNotFound, setBuyerNotFound] = useState(false);
  const [buyerSearchError, setBuyerSearchError] = useState('');

  // Backend Units State (Default units initialized for instant render)
  const DEFAULT_UNITS = [
    { _id: '6a0eac4cd59663585920f09c', name: 'Quintal', shortName: 'qtl' },
    { _id: '6a0eac4cd59663585920f09d', name: 'Bales', shortName: 'bales' },
    { _id: '6a0eac4cd59663585920f09e', name: 'Kilogram', shortName: 'kg' },
    { _id: '6a0eac4cd59663585920f09f', name: 'Metric Ton', shortName: 'MT' },
  ];
  const [apiUnits, setApiUnits] = useState(DEFAULT_UNITS);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnitObj, setSelectedUnitObj] = useState(DEFAULT_UNITS[0]);

  // Deal Details State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  // Inline Feedback Toast / Error Banner State
  const [toastMsg, setToastMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Custom Alert Modal State
  const [alertModalConfig, setAlertModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    primaryText: 'OK',
    onPrimary: null,
    secondaryText: '',
    onSecondary: null,
  });

  // Onboarding Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [onboardingPartyType, setOnboardingPartyType] = useState('Seller');

  // Create Product Modal State
  const [createProductModalVisible, setCreateProductModalVisible] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductHsn, setNewProductHsn] = useState('');
  const [newProductGst, setNewProductGst] = useState('18');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Success inline card state (shown after party is set, auto-navigates next step)
  const [partyJustAdded, setPartyJustAdded] = useState(null); // 'seller' | 'buyer' | null

  // Multi-Company Selection State (when counterparty has >1 registered companies)
  const [companySelectModalVisible, setCompanySelectModalVisible] = useState(false);
  const [availableCompaniesList, setAvailableCompaniesList] = useState([]);
  const [companySelectTarget, setCompanySelectTarget] = useState(null); // { role: 'Seller' | 'Buyer', user: obj, products: arr }

  const selectSellerCompany = (sellerComp, userObj, sellerProds = []) => {
    setCompanySelectModalVisible(false);
    const partyObj = {
      user: userObj || { name: 'Seller', mobileNumber: sellerMobile },
      company: sellerComp,
      products: sellerProds,
      isAssisted: false,
    };
    setSellerParty(partyObj);
    setSellerStatus('Approved');
    setSellerNotFound(false);

    const compId = sellerComp._id || sellerComp.id || sellerComp.companyId;
    if (compId) {
      fetchSellerProducts(compId);
    } else if (sellerProds.length > 0) {
      setSellerProducts(sellerProds);
    }

    setPartyJustAdded('seller');
    setTimeout(() => {
      setPartyJustAdded(null);
    }, 1200);
  };

  const selectBuyerCompany = (bComp, userObj) => {
    setCompanySelectModalVisible(false);
    setBuyerParty({
      user: userObj || { name: 'Buyer', mobileNumber: buyerMobile },
      company: bComp,
      isAssisted: false,
    });
    setBuyerStatus('Approved');
    setBuyerNotFound(false);

    setPartyJustAdded('buyer');
    setTimeout(() => {
      setPartyJustAdded(null);
    }, 1200);
  };

  // Device Contacts Modal State
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [targetRoleForContacts, setTargetRoleForContacts] = useState('Seller');

  const openDeviceContactsModal = async (targetRole) => {
    setTargetRoleForContacts(targetRole);
    setContactsModalVisible(true);
    setContactsLoading(true);
    setContactSearchQuery('');
    try {
      let granted = true;
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Access',
            message: `Pravisti needs access to your contacts to select ${targetRole.toLowerCase()} phone numbers.`,
            buttonPositive: 'Allow Access',
          }
        );
        granted = permission === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (granted) {
        const rawContacts = await Contacts.getAll();
        const formatted = [];
        rawContacts.forEach(c => {
          const fullName = [c.givenName, c.familyName].filter(Boolean).join(' ') || c.displayName || 'Unnamed Contact';
          (c.phoneNumbers || []).forEach(p => {
            const cleanDigits = (p.number || '').replace(/[^0-9]/g, '');
            const mobile10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';
            if (mobile10.length === 10 && !formatted.some(item => item.mobile === mobile10)) {
              formatted.push({
                id: (c.recordID || Math.random().toString()) + mobile10,
                name: fullName,
                mobile: mobile10,
                fullPhone: p.number,
              });
            }
          });
        });
        formatted.sort((a, b) => a.name.localeCompare(b.name));
        setDeviceContacts(formatted);
      } else {
        showToast('Permission denied to access device contacts');
      }
    } catch (err) {
      console.warn('Error reading device contacts:', err);
      showToast('Could not load device contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const handleSelectContactItem = (item) => {
    setContactsModalVisible(false);
    if (targetRoleForContacts === 'Seller') {
      setSellerMobile(item.mobile);
      handleSearchSeller(item.mobile);
    } else {
      setBuyerMobile(item.mobile);
      handleSearchBuyer(item.mobile);
    }
  };

  // Animated Success Modal State for Sauda Creation
  const [createdDealModal, setCreatedDealModal] = useState(null);
  const animScale = useRef(new Animated.Value(0.85)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  const triggerSuccessAnimation = () => {
    animScale.setValue(0.85);
    animOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(animScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Initial Load: Broker Profile & Backend Units (Parallelized for instant loading)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const [userResResult, unitsResResult] = await Promise.allSettled([
          getUserProfile(token),
          getUnits('active', token),
        ]);

        if (userResResult.status === 'fulfilled' && userResResult.value?.success) {
          setCurrentUser(userResResult.value.data);
        }

        if (unitsResResult.status === 'fulfilled' && unitsResResult.value?.success && Array.isArray(unitsResResult.value.data) && unitsResResult.value.data.length > 0) {
          setApiUnits(unitsResResult.value.data);
          setSelectedUnitObj(prev => prev || unitsResResult.value.data[0]);
        }
      } catch (err) {
        console.warn('Initial data load error:', err);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch real products for seller company from API
  const fetchSellerProducts = async (companyId) => {
    if (!companyId) return;
    setProductsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await getProducts(companyId, token);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSellerProducts(res.data);
      } else {
        setSellerProducts([]);
        setSelectedProduct('');
        setSelectedProductId('');
      }
    } catch (err) {
      console.warn('Could not fetch seller products:', err);
      setSellerProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // Search Seller API Integration
  const handleSearchSeller = async (targetMobile) => {
    const mobileToSearch = targetMobile || sellerMobile;
    setSellerNotFound(false);
    setSellerSearchError('');
    setFormError('');

    if (!mobileToSearch || mobileToSearch.length === 0) {
      openDeviceContactsModal('Seller');
      return;
    }

    if (mobileToSearch.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await searchCounterpartyUser(mobileToSearch, token);
      if (res && res.success && res.data && res.data.registered) {
        const userObj = res.data.user || { name: 'Seller', mobileNumber: mobileToSearch };
        const userRole = (userObj.role || res.data.role || res.data.userType || '').toLowerCase();

        if (userRole === 'broker') {
          setSellerSearchError(`This mobile number (+91 ${mobileToSearch}) is registered as a Broker and cannot be onboarded as a seller or buyer.`);
          return;
        }

        const companies = res.data.companies || [];
        const prods = res.data.products || [];

        if (companies.length > 1) {
          // Multiple companies -> Show selector modal
          setAvailableCompaniesList(companies);
          setCompanySelectTarget({
            role: 'Seller',
            user: userObj,
            products: prods,
          });
          setCompanySelectModalVisible(true);
        } else {
          // Single company or fallback -> Auto select
          const sellerComp = companies[0] || { companyName: userObj.name || 'Seller Business', address: 'Mandi Address' };
          selectSellerCompany(sellerComp, userObj, prods);
        }
      } else if (
        (res && res.data && res.data.registered === false) ||
        (res && res.message && ['no registered', 'not registered', 'onboard', 'not found'].some(k => res.message.toLowerCase().includes(k)))
      ) {
        setSellerNotFound(true);
        setSellerSearchError('');
      } else if (res && res.message) {
        setSellerSearchError(res.message);
      } else {
        setSellerNotFound(true);
        setSellerSearchError('');
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg && (errMsg.toLowerCase().includes('broker') || errMsg.toLowerCase().includes('cannot be onboarded') || errMsg.toLowerCase().includes('already registered'))) {
        setSellerSearchError(errMsg);
      } else {
        setSellerNotFound(true);
        setSellerSearchError('');
      }
    }
  };

  const handleSellerMobileChange = (text) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setSellerMobile(cleanText);
    setSellerNotFound(false);
    setSellerSearchError('');
    setFormError('');
    if (cleanText.length === 10) {
      handleSearchSeller(cleanText);
    }
  };

  // Search Buyer API Integration
  const handleSearchBuyer = async (targetMobile) => {
    const mobileToSearch = targetMobile || buyerMobile;
    setBuyerNotFound(false);
    setBuyerSearchError('');
    setFormError('');

    if (!mobileToSearch || mobileToSearch.length === 0) {
      openDeviceContactsModal('Buyer');
      return;
    }

    if (mobileToSearch.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await searchCounterpartyUser(mobileToSearch, token);
      if (res && res.success && res.data && res.data.registered) {
        const userObj = res.data.user || { name: 'Buyer', mobileNumber: mobileToSearch };
        const userRole = (userObj.role || res.data.role || res.data.userType || '').toLowerCase();

        if (userRole === 'broker') {
          setBuyerSearchError(`This mobile number (+91 ${mobileToSearch}) is registered as a Broker and cannot be onboarded as a seller or buyer.`);
          return;
        }

        const companies = res.data.companies || [];

        if (companies.length > 1) {
          // Multiple companies -> Show selector modal
          setAvailableCompaniesList(companies);
          setCompanySelectTarget({
            role: 'Buyer',
            user: userObj,
          });
          setCompanySelectModalVisible(true);
        } else {
          // Single company or fallback -> Auto select
          const bComp = companies[0] || { companyName: userObj.name || 'Buyer Business', address: 'Client Location' };
          selectBuyerCompany(bComp, userObj);
        }
      } else if (
        (res && res.data && res.data.registered === false) ||
        (res && res.message && ['no registered', 'not registered', 'onboard', 'not found'].some(k => res.message.toLowerCase().includes(k)))
      ) {
        setBuyerNotFound(true);
        setBuyerSearchError('');
      } else if (res && res.message) {
        setBuyerSearchError(res.message);
      } else {
        setBuyerNotFound(true);
        setBuyerSearchError('');
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg && (errMsg.toLowerCase().includes('broker') || errMsg.toLowerCase().includes('cannot be onboarded') || errMsg.toLowerCase().includes('already registered'))) {
        setBuyerSearchError(errMsg);
      } else {
        setBuyerNotFound(true);
        setBuyerSearchError('');
      }
    }
  };

  const handleBuyerMobileChange = (text) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setBuyerMobile(cleanText);
    setBuyerNotFound(false);
    setBuyerSearchError('');
    setFormError('');
    if (cleanText.length === 10) {
      handleSearchBuyer(cleanText);
    }
  };

  const handleAssistedOnboardingSuccess = (data) => {
    setFormError('');
    if (onboardingPartyType === 'Seller') {
      const prods = data.products || [];
      const partyObj = {
        user: data.user,
        company: data.company,
        products: prods,
        isAssisted: true,
      };
      setSellerParty(partyObj);
      setSellerStatus('Pending');
      setSellerProducts(prods);
      setSellerNotFound(false);

      setPartyJustAdded('seller');
      setTimeout(() => {
        setPartyJustAdded(null);
      }, 1200);
    } else {
      setBuyerParty({
        user: data.user,
        company: data.company,
        isAssisted: true,
      });
      setBuyerStatus('Pending');
      setBuyerNotFound(false);

      setPartyJustAdded('buyer');
      setTimeout(() => {
        setPartyJustAdded(null);
      }, 1200);
    }
  };

  // Create Product in Trader Company dynamically via API
  const handleCreateProductForSeller = async () => {
    if (!newProductName.trim()) {
      setFormError('Please enter a product name');
      return;
    }
    if (!sellerParty) {
      setFormError('Please select or onboard a Seller first before creating a product');
      return;
    }

    setIsCreatingProduct(true);
    setFormError('');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const traderCompanyId = sellerParty.company?.id || sellerParty.company?._id || sellerParty.company?.companyId || '64d0a2f1c3d4e5f6a7b8c9e2';

      // 1. Resolve Category ID
      let categoryId = '6a0d8779f1732529c7e2522b';
      try {
        const catRes = await getCategories(traderCompanyId, token);
        if (catRes && catRes.success && Array.isArray(catRes.data) && catRes.data.length > 0) {
          categoryId = catRes.data[0]._id || catRes.data[0].id;
        } else {
          const newCatRes = await createCategory({ name: 'Commodities', companyId: traderCompanyId }, token);
          if (newCatRes && newCatRes.success && newCatRes.data) {
            categoryId = newCatRes.data._id || newCatRes.data.id;
          }
        }
      } catch (catErr) {
        console.warn('Category resolution error:', catErr);
      }

      // 2. Create Product via API for Trader Company
      const selectedUnitId = selectedUnitObj?._id || '6a0eac4cd59663585920f09c';
      const productPayload = {
        name: newProductName.trim(),
        companyId: traderCompanyId,
        categoryId,
        unitId: selectedUnitId,
        hsnCode: newProductHsn.trim() || '7601',
        gstCode: newProductGst ? `GST_${newProductGst}` : 'GST_18',
        description: `Commodity product for trader ${sellerParty.company?.companyName || sellerParty.company?.name}`,
      };

      let createdProdObj = {
        _id: 'PROD-' + Math.random().toString(36).substring(2, 9),
        name: newProductName.trim(),
        companyId: traderCompanyId,
      };

      try {
        const prodRes = await createProduct(productPayload, token);
        if (prodRes && prodRes.success && prodRes.data) {
          createdProdObj = prodRes.data;
        }
      } catch (prodErr) {
        console.warn('API createProduct fallback:', prodErr);
      }

      setSellerProducts(prev => [createdProdObj, ...prev]);
      setSelectedProduct(createdProdObj.name);
      setSelectedProductId(createdProdObj._id || createdProdObj.id || '');

      setCreateProductModalVisible(false);
      setNewProductName('');
      setNewProductHsn('');

      // Show Clean Alert Modal
      setAlertModalConfig({
        visible: true,
        title: 'Product Added',
        message: 'The product has been added and selected for this Sauda.',
        primaryText: 'Continue',
        onPrimary: () => setAlertModalConfig(prev => ({ ...prev, visible: false })),
      });
    } catch (err) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Real-time calculation
  const numQty = parseFloat(quantity) || 0;
  const numRate = parseFloat(rate) || 0;
  const totalValue = numQty * numRate;
  const numCommPct = parseFloat(commissionRate) || 0;
  const commAmount = (totalValue * numCommPct) / 100;

  const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

  // Submit Deal handler
  const handleCreateSauda = async () => {
    setFormError('');
    if (!sellerParty) {
      setFormError('Please select Seller (Step 1)');
      return;
    }
    if (!buyerParty) {
      setFormError('Please select Buyer (Step 2)');
      return;
    }
    if (!selectedProduct) {
      setFormError('Please select a Product for this deal');
      return;
    }
    if (!quantity || !rate) {
      setFormError('Please enter Quantity and Rate');
      return;
    }

    setIsLoading(true);
    try {
      const dealRef = 'SAUDA-' + Math.floor(100 + Math.random() * 900);
      const token = await AsyncStorage.getItem('userToken');

      const rawSellerCompId = sellerParty.company?.id || sellerParty.company?._id || sellerParty.company?.companyId;
      const rawBuyerCompId = buyerParty.company?.id || buyerParty.company?._id || buyerParty.company?.companyId;
      const userComps = currentUser?.companies || currentUser?.company || [];
      const brokerCompObj = Array.isArray(userComps) ? userComps[0] : userComps;
      const rawBrokerCompId = brokerCompObj?._id || brokerCompObj?.id || currentUser?.companyId;

      const sellerCompId = isValidObjectId(rawSellerCompId) ? rawSellerCompId : '64d0a2f1c3d4e5f6a7b8c9e2';
      const buyerCompId = isValidObjectId(rawBuyerCompId) ? rawBuyerCompId : '64d0a2f1c3d4e5f6a7b8c9e3';

      const defaultProductId = isValidObjectId(selectedProductId) ? selectedProductId : '64d0a1b2c3d4e5f6a7b8c9df';
      const unitLabel = selectedUnitObj?.shortName || selectedUnitObj?.name || 'unit';

      const dealPayload = {
        role: 'broker',
        sellerCompanyId: sellerCompId,
        buyerCompanyId: buyerCompId,
        products: [
          {
            productId: defaultProductId,
            quantity: numQty,
            price: numRate,
            gst: parseFloat(commissionRate) || 18,
            discount: 0,
            paymentTerms: paymentTerms || '7 Days Credit',
          },
        ],
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Broker Sauda (${dealRef}) created for ${selectedProduct} (${quantity} ${unitLabel} @ ₹${rate}). Location: ${deliveryLocation}`,
      };

      if (isValidObjectId(rawBrokerCompId)) {
        dealPayload.myCompanyId = rawBrokerCompId;
      }

      const res = await createDeal(dealPayload, token);

      const isUnverified = sellerStatus === 'Pending' || buyerStatus === 'Pending';
      const unverifiedParty = sellerStatus === 'Pending' ? sellerParty : buyerParty;

      const targetComp = routeData?.company || selectedBrokerCompany || routeData?.firm;
      const targetCompId = targetComp?._id || targetComp?.id || routeData?.companyId || routeData?.firmId;
      const targetCompName = targetComp?.name || targetComp?.companyName || routeData?.companyName;

      const dealRecord = {
        id: dealRef,
        _id: res?.data?._id || res?.data?.deal?._id || 'DEAL-' + Math.floor(1000 + Math.random() * 9000),
        crop: selectedProduct,
        productName: selectedProduct,
        quantity: `${quantity} ${unitLabel}`,
        rate: `₹${parseFloat(rate).toLocaleString('en-IN')}`,
        price: parseFloat(rate),
        totalAmount: totalValue,
        totalValue: `₹${totalValue.toLocaleString('en-IN')}`,
        buyer: buyerParty.company?.companyName || buyerParty.company?.name || 'Buyer Business',
        seller: sellerParty.company?.companyName || sellerParty.company?.name || 'Seller Business',
        status: isUnverified ? 'Pending Sign' : 'Confirmed',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        commission: `₹${commAmount ? commAmount.toLocaleString('en-IN') : '0'}`,
        brokerCompanyId: targetCompId,
        brokerCompanyName: targetCompName,
        createdAt: new Date().toISOString(),
      };

      try {
        const storedDealsStr = await AsyncStorage.getItem('broker_deals_storage');
        const storedDeals = storedDealsStr ? JSON.parse(storedDealsStr) : [];
        await AsyncStorage.setItem('broker_deals_storage', JSON.stringify([dealRecord, ...storedDeals]));
      } catch (stErr) {
        console.warn('Storage save error:', stErr);
      }

      setCreatedDealModal({
        dealRecord,
        unverifiedParty,
        dealRef,
        sellerName: sellerParty.company?.companyName || sellerParty.company?.name || 'Seller Business',
        buyerName: buyerParty.company?.companyName || buyerParty.company?.name || 'Buyer Business',
        productName: selectedProduct,
        quantity: `${quantity} ${unitLabel}`,
        rate: formatIndianCurrency(rate),
        totalValue: formatIndianCurrency(totalValue),
        commission: commAmount ? formatIndianCurrency(commAmount) : null,
      });
      triggerSuccessAnimation();
    } catch (err) {
      setFormError(err.message || 'Failed to create Sauda');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* FLOATING TOAST FEEDBACK BANNER */}
      {toastMsg ? (
        <View style={styles.toastBanner}>
          <CheckCircle2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      {/* ─── SKY BLUE TOP HEADER (#0284C7) ─── */}
      <View style={styles.topHeaderBlue}>
        <StatusBar barStyle="light-content" backgroundColor="#0284C7" />
        <TouchableOpacity onPress={() => onNavigate('pop')} style={styles.backBtnBlue} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitleBlue}>Issue Sauda</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#E0F2FE', letterSpacing: 0.4, marginTop: 1 }}>
            STEP {currentStep} OF 3
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.headerIconBtnBlue} activeOpacity={0.7}>
            <Bell size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.userAvatarCircleBlue}>
            <User size={13} color="#0284C7" />
          </View>
        </View>
      </View>

      {/* ─── 3-STEP PROGRESS TRACKER HEADER ─── */}
      <View style={styles.progressTrackerContainerBlue}>
        {/* Step 1: Parties */}
        <TouchableOpacity
          style={styles.stepNode}
          activeOpacity={0.8}
          onPress={() => { setFormError(''); setCurrentStep(1); }}
        >
          <View style={[
            styles.stepCircle,
            currentStep > 1 ? styles.stepCircleCompleted : currentStep === 1 ? styles.stepCircleActiveBlue : styles.stepCirclePending,
          ]}>
            {currentStep > 1 ? (
              <Check size={13} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepCircleNumber, currentStep === 1 && styles.stepCircleNumberActive]}>1</Text>
            )}
          </View>
          <Text style={[styles.stepNodeLabel, currentStep === 1 && styles.stepNodeLabelActiveBlue]}>Parties</Text>
        </TouchableOpacity>

        <View style={[styles.stepLine, currentStep > 1 ? styles.stepLineCompleted : styles.stepLinePending]} />

        {/* Step 2: Commodity */}
        <TouchableOpacity
          style={styles.stepNode}
          activeOpacity={0.8}
          onPress={() => {
            if (!sellerParty || !buyerParty) {
              setFormError('Please select both Seller and Buyer in Step 1 first.');
              return;
            }
            setFormError('');
            setCurrentStep(2);
          }}
        >
          <View style={[
            styles.stepCircle,
            currentStep > 2 ? styles.stepCircleCompleted : currentStep === 2 ? styles.stepCircleActiveBlue : styles.stepCirclePending,
          ]}>
            {currentStep > 2 ? (
              <Check size={13} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepCircleNumber, currentStep === 2 && styles.stepCircleNumberActive]}>2</Text>
            )}
          </View>
          <Text style={[styles.stepNodeLabel, currentStep === 2 && styles.stepNodeLabelActiveBlue]}>Commodity</Text>
        </TouchableOpacity>

        <View style={[styles.stepLine, currentStep > 2 ? styles.stepLineCompleted : styles.stepLinePending]} />

        {/* Step 3: Review */}
        <TouchableOpacity
          style={styles.stepNode}
          activeOpacity={0.8}
          onPress={() => {
            if (!sellerParty || !buyerParty) {
              setFormError('Please select both Seller and Buyer before reviewing.');
              return;
            }
            setFormError('');
            setCurrentStep(3);
          }}
        >
          <View style={[
            styles.stepCircle,
            currentStep === 3 ? styles.stepCircleActiveBlue : styles.stepCirclePending,
          ]}>
            <Text style={[styles.stepCircleNumber, currentStep === 3 && styles.stepCircleNumberActive]}>3</Text>
          </View>
          <Text style={[styles.stepNodeLabel, currentStep === 3 && styles.stepNodeLabelActiveBlue]}>Review</Text>
        </TouchableOpacity>
      </View>

      {/* ─── MAIN SCROLLVIEW ─── */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* INLINE FORM ERROR BANNER */}
        {formError ? (
          <View style={styles.inlineErrorBanner}>
            <AlertCircle size={15} color={COLORS.error} style={{ marginRight: 6 }} />
            <Text style={styles.inlineErrorText}>{formError}</Text>
          </View>
        ) : null}

        {/* STEP 1: SELECT PARTIES (BOTH SELLER & BUYER IN ONE STEP) */}
        {currentStep === 1 && (
          <View style={{ gap: 14 }}>
            {/* ORIGINATING BROKER CARD */}
            <View style={styles.originatingBrokerCard}>
              <View style={styles.brokerIconCircle}>
                <Building2 size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.originatingBrokerSub}>ORIGINATING BROKER</Text>
                <Text style={styles.originatingBrokerName}>
                  {selectedBrokerCompany?.companyName || selectedBrokerCompany?.name || 'MNC'}
                </Text>
              </View>
              <View style={styles.verifiedBlueBadge}>
                <CheckCircle2 size={12} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedBlueBadgeText}>Verified</Text>
              </View>
            </View>

            {/* CARD 1: SELECT SELLER */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Building2 size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionTitle}>Select Seller</Text>
                </View>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>* Required</Text>
                </View>
              </View>

              {!sellerParty ? (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.searchInputBoxContainer}>
                    <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInputBoxText}
                      placeholder="Search by name, ID or phone..."
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={sellerMobile}
                      onChangeText={handleSellerMobileChange}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.pickFromContactsPillBtn}
                    onPress={() => openDeviceContactsModal('Seller')}
                    activeOpacity={0.82}
                  >
                    <BookUser size={15} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={styles.pickFromContactsPillText}>Choose from Contacts</Text>
                    <ChevronRight size={15} color="#2563EB" />
                  </TouchableOpacity>

                  {/* SEARCH ERROR STATE */}
                  {sellerSearchError ? (
                    <View style={[styles.notFoundCard, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
                      <View style={styles.notFoundHeaderRow}>
                        <AlertCircle size={18} color={COLORS.error} style={{ marginRight: 8 }} />
                        <Text style={[styles.notFoundTitle, { color: COLORS.error }]}>Notice / Cannot Select User</Text>
                      </View>
                      <Text style={[styles.notFoundDesc, { color: '#991B1B' }]}>
                        {sellerSearchError}
                      </Text>
                    </View>
                  ) : sellerNotFound ? (
                    <View style={styles.notFoundCard}>
                      <View style={styles.notFoundHeaderRow}>
                        <AlertCircle size={18} color={COLORS.warning} style={{ marginRight: 8 }} />
                        <Text style={styles.notFoundTitle}>No Registered User Found</Text>
                      </View>
                      <Text style={styles.notFoundDesc}>
                        This mobile number (+91 {sellerMobile}) is not registered. Create a profile to continue.
                      </Text>
                      <TouchableOpacity
                        style={styles.registerUserBtn}
                        onPress={() => { setOnboardingPartyType('Seller'); setModalVisible(true); }}
                      >
                        <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.registerUserBtnText}>+ Create Company</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.selectedPartyProfileCard}>
                  <View style={styles.profileCardTopRow}>
                    <Text style={styles.profileBusinessName} numberOfLines={1}>
                      {sellerParty.company?.companyName || sellerParty.company?.name || 'Seller Business'}
                    </Text>
                    <View style={styles.statusBadgePillGreen}>
                      <ShieldCheck size={12} color="#15803D" style={{ marginRight: 4 }} />
                      <Text style={styles.statusBadgeTextGreen}>Selected Seller</Text>
                    </View>
                  </View>
                  <Text style={styles.profileOwnerInfo}>
                    Owner: {sellerParty.user?.name || 'Seller'} (+91 {sellerParty.user?.mobileNumber || sellerMobile})
                  </Text>
                  <TouchableOpacity
                    onPress={() => { setSellerParty(null); setSellerProducts([]); setSelectedProduct(''); }}
                    style={styles.changePartyLinkBtn}
                  >
                    <Text style={styles.changePartyLinkText}>Change Seller</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* CARD 2: SELECT BUYER */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <User size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionTitle}>Select Buyer</Text>
                </View>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>* Required</Text>
                </View>
              </View>

              {!buyerParty ? (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.searchInputBoxContainer}>
                    <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInputBoxText}
                      placeholder="Search for purchasing entity..."
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={buyerMobile}
                      onChangeText={handleBuyerMobileChange}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.pickFromContactsPillBtn}
                    onPress={() => openDeviceContactsModal('Buyer')}
                    activeOpacity={0.82}
                  >
                    <BookUser size={15} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.pickFromContactsPillText}>Choose from Contacts</Text>
                    <ChevronRight size={15} color="#059669" />
                  </TouchableOpacity>

                  {/* SEARCH ERROR STATE */}
                  {buyerSearchError ? (
                    <View style={[styles.notFoundCard, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
                      <View style={styles.notFoundHeaderRow}>
                        <AlertCircle size={18} color={COLORS.error} style={{ marginRight: 8 }} />
                        <Text style={[styles.notFoundTitle, { color: COLORS.error }]}>Notice / Cannot Select User</Text>
                      </View>
                      <Text style={[styles.notFoundDesc, { color: '#991B1B' }]}>
                        {buyerSearchError}
                      </Text>
                    </View>
                  ) : buyerNotFound ? (
                    <View style={styles.notFoundCard}>
                      <View style={styles.notFoundHeaderRow}>
                        <AlertCircle size={18} color={COLORS.warning} style={{ marginRight: 8 }} />
                        <Text style={styles.notFoundTitle}>No Registered User Found</Text>
                      </View>
                      <Text style={styles.notFoundDesc}>
                        This mobile number (+91 {buyerMobile}) is not registered. Create a profile to continue.
                      </Text>
                      <TouchableOpacity
                        style={styles.registerUserBtn}
                        onPress={() => { setOnboardingPartyType('Buyer'); setModalVisible(true); }}
                      >
                        <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.registerUserBtnText}>+ Create Company</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.selectedPartyProfileCard}>
                  <View style={styles.profileCardTopRow}>
                    <Text style={styles.profileBusinessName} numberOfLines={1}>
                      {buyerParty.company?.companyName || buyerParty.company?.name || 'Buyer Business'}
                    </Text>
                    <View style={styles.statusBadgePillGreen}>
                      <ShieldCheck size={12} color="#15803D" style={{ marginRight: 4 }} />
                      <Text style={styles.statusBadgeTextGreen}>Selected Buyer</Text>
                    </View>
                  </View>
                  <Text style={styles.profileOwnerInfo}>
                    Owner: {buyerParty.user?.name || 'Buyer'} (+91 {buyerParty.user?.mobileNumber || buyerMobile})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setBuyerParty(null)}
                    style={styles.changePartyLinkBtn}
                  >
                    <Text style={styles.changePartyLinkText}>Change Buyer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* STEP 2: COMMODITY DETAILS */}
        {currentStep === 2 && (
          <View style={{ gap: 16 }}>
            {/* Commodity Product Group */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardSectionTitle}>Commodity Product</Text>
                {sellerParty && (
                  <TouchableOpacity
                    style={styles.inlineActionBtn}
                    onPress={() => setCreateProductModalVisible(true)}
                  >
                    <Plus size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.inlineActionBtnText}>Add New Product</Text>
                  </TouchableOpacity>
                )}
              </View>

              {productsLoading ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading products...</Text>
                </View>
              ) : sellerProducts.length === 0 ? (
                <View style={styles.emptyProductsCard}>
                  <Box size={24} color={COLORS.textMuted} style={{ marginBottom: 6 }} />
                  <Text style={styles.emptyProductsTitle}>No Products Available</Text>
                  <Text style={styles.emptyProductsSub}>Add a commodity product to create this Sauda.</Text>
                  <TouchableOpacity
                    style={styles.createProductPrimaryBtn}
                    onPress={() => setCreateProductModalVisible(true)}
                  >
                    <PackagePlus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.createProductPrimaryBtnText}>Add New Product</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.productChipsWrap}>
                    {sellerProducts.map((p, idx) => {
                      const pName = typeof p === 'string' ? p : p.name;
                      const pId = typeof p === 'object' ? (p._id || p.id || '') : '';
                      const isSel = selectedProduct === pName;
                      return (
                        <TouchableOpacity
                          key={pId || idx}
                          style={[styles.productSelectChip, isSel && styles.productSelectChipActive]}
                          onPress={() => {
                            setSelectedProduct(pName);
                            setSelectedProductId(pId);
                          }}
                        >
                          <Box size={13} color={isSel ? '#FFFFFF' : COLORS.primary} style={{ marginRight: 6 }} />
                          <Text style={[styles.productSelectChipText, isSel && styles.productSelectChipTextActive]}>
                            {pName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.activeProductBanner}>
                    <ShieldCheck size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.activeProductText}>
                      Selected Commodity: <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{selectedProduct || 'None'}</Text>
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Quantity & Rate Group */}
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>Quantity & Rate</Text>

              <View style={styles.formRowTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Quantity <Text style={styles.requiredStar}>*</Text></Text>
                  <TextInput
                    style={styles.fintechInput}
                    placeholder="e.g. 100"
                    placeholderTextColor={COLORS.textPlaceholder}
                    keyboardType="number-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Rate <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.currencyInputContainer}>
                    <View style={styles.currencySymbolBox}>
                      <Text style={styles.currencySymbolText}>₹</Text>
                    </View>
                    <TextInput
                      style={styles.currencyInput}
                      placeholder="62,500"
                      placeholderTextColor={COLORS.textPlaceholder}
                      keyboardType="number-pad"
                      value={rate}
                      onChangeText={setRate}
                    />
                  </View>
                </View>
              </View>

              {/* Unit Selection */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Unit of Measurement</Text>
              {unitsLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 6 }} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitChipsScroll}>
                  {apiUnits.map((uItem, idx) => {
                    const uName = uItem.name || uItem.shortName || 'unit';
                    const isSel = selectedUnitObj?._id === uItem._id || selectedUnitObj?.name === uItem.name;
                    return (
                      <TouchableOpacity
                        key={uItem._id || idx}
                        style={[styles.unitChipItem, isSel && styles.unitChipItemActive]}
                        onPress={() => setSelectedUnitObj(uItem)}
                      >
                        <Text style={[styles.unitChipItemText, isSel && styles.unitChipItemTextActive]}>
                          {uName} ({uItem.shortName || 'unit'})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Additional Terms Group */}
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>Additional Terms</Text>

              <View style={styles.formRowTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Brokerage (%)</Text>
                  <TextInput
                    style={styles.fintechInput}
                    placeholder="1.0"
                    placeholderTextColor={COLORS.textPlaceholder}
                    keyboardType="decimal-pad"
                    value={commissionRate}
                    onChangeText={setCommissionRate}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Payment Terms</Text>
                  <TextInput
                    style={styles.fintechInput}
                    placeholder="7 Days Credit"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={paymentTerms}
                    onChangeText={setPaymentTerms}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Delivery Location</Text>
              <TextInput
                style={styles.fintechInput}
                placeholder="Surat APMC Mandi"
                placeholderTextColor={COLORS.textPlaceholder}
                value={deliveryLocation}
                onChangeText={setDeliveryLocation}
              />
            </View>

            {/* SAUDA SUMMARY CARD */}
            <View style={styles.summaryCardContainer}>
              <View style={styles.summaryTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Handshake size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.summaryCardTitle}>Sauda Summary</Text>
                </View>
                <View style={styles.secureBadgeTag}>
                  <ShieldCheck size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.secureBadgeText}>Verified Trade</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Seller:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {sellerParty?.company?.companyName || sellerParty?.company?.name || 'Not Selected'}
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Buyer:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {buyerParty?.company?.companyName || buyerParty?.company?.name || 'Not Selected'}
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Product:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {selectedProduct || 'None'} ({quantity} {selectedUnitObj?.shortName || selectedUnitObj?.name})
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Agreed Rate:</Text>
                <Text style={styles.summaryDataValue}>{formatIndianCurrency(rate)} / {selectedUnitObj?.shortName || 'unit'}</Text>
              </View>

              <View style={styles.totalValueHighlightBox}>
                <Text style={styles.totalValueHighlightLabel}>Total Value:</Text>
                <Text style={styles.totalValueHighlightVal}>{formatIndianCurrency(totalValue)}</Text>
              </View>

              {numCommPct > 0 && (
                <View style={styles.summaryDataRow}>
                  <Text style={styles.summaryDataLabel}>Brokerage ({numCommPct}%):</Text>
                  <Text style={[styles.summaryDataValue, { color: COLORS.success, fontWeight: '700' }]}>
                    {formatIndianCurrency(commAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Payment Terms:</Text>
                <Text style={styles.summaryDataValue}>{paymentTerms || '7 Days Credit'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: REVIEW & ISSUE SAUDA */}
        {currentStep === 3 && (
          <View style={{ gap: 16 }}>
            {/* SAUDA SUMMARY CARD */}
            <View style={styles.summaryCardContainer}>
              <View style={styles.summaryTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Handshake size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.summaryCardTitle}>Contract Summary</Text>
                </View>
                <View style={styles.secureBadgeTag}>
                  <ShieldCheck size={12} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.secureBadgeText}>Verified Trade</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Broker:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {selectedBrokerCompany?.companyName || selectedBrokerCompany?.name || 'MNC'}
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Seller:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {sellerParty?.company?.companyName || sellerParty?.company?.name || 'Not Selected'}
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Buyer:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {buyerParty?.company?.companyName || buyerParty?.company?.name || 'Not Selected'}
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Product:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {selectedProduct || 'None'} ({quantity} {selectedUnitObj?.shortName || selectedUnitObj?.name})
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Agreed Rate:</Text>
                <Text style={styles.summaryDataValue}>{formatIndianCurrency(rate)} / {selectedUnitObj?.shortName || 'unit'}</Text>
              </View>

              <View style={styles.totalValueHighlightBox}>
                <Text style={styles.totalValueHighlightLabel}>Total Value:</Text>
                <Text style={styles.totalValueHighlightVal}>{formatIndianCurrency(totalValue)}</Text>
              </View>

              {numCommPct > 0 && (
                <View style={styles.summaryDataRow}>
                  <Text style={styles.summaryDataLabel}>Brokerage ({numCommPct}%):</Text>
                  <Text style={[styles.summaryDataValue, { color: COLORS.success, fontWeight: '700' }]}>
                    {formatIndianCurrency(commAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Payment Terms:</Text>
                <Text style={styles.summaryDataValue}>{paymentTerms || '7 Days Credit'}</Text>
              </View>

              {deliveryLocation ? (
                <View style={styles.summaryDataRow}>
                  <Text style={styles.summaryDataLabel}>Delivery Location:</Text>
                  <Text style={styles.summaryDataValue}>{deliveryLocation}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── BOTTOM ACTION FOOTER BAR ─── */}
      <View style={styles.bottomActionFooter}>
        {currentStep === 1 && (
          <View style={styles.twoBtnActionRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.3 }}>
                Selected Parties
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                {(sellerParty ? 1 : 0) + (buyerParty ? 1 : 0)} / 2
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { flex: 1.5, backgroundColor: '#0284C7' },
                (!sellerParty || !buyerParty) && styles.actionBtnDisabled
              ]}
              onPress={() => {
                if (!sellerParty) {
                  setFormError('Please select a Seller (*Required)');
                  return;
                }
                if (!buyerParty) {
                  setFormError('Please select a Buyer (*Required)');
                  return;
                }
                setFormError('');
                setCurrentStep(2);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionBtnText}>Next Step</Text>
              <ChevronRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.twoBtnActionRow}>
            <TouchableOpacity style={styles.secondaryOutlineBtn} onPress={() => { setFormError(''); setCurrentStep(1); }}>
              <ChevronLeft size={16} color={COLORS.textSecondary} />
              <Text style={styles.secondaryOutlineBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { flex: 1, backgroundColor: '#0284C7' }]}
              onPress={() => {
                if (!selectedProduct) {
                  setFormError('Please select a Commodity/Product');
                  return;
                }
                if (!quantity || !rate) {
                  setFormError('Please enter Quantity and Rate');
                  return;
                }
                setFormError('');
                setCurrentStep(3);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionBtnText}>Next Step</Text>
              <ChevronRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.twoBtnActionRow}>
            <TouchableOpacity style={styles.secondaryOutlineBtn} onPress={() => { setFormError(''); setCurrentStep(2); }}>
              <ChevronLeft size={16} color={COLORS.textSecondary} />
              <Text style={styles.secondaryOutlineBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { flex: 1, backgroundColor: '#0284C7' },
                (!sellerParty || !buyerParty || !selectedProduct || isLoading) && styles.actionBtnDisabled,
              ]}
              disabled={!sellerParty || !buyerParty || !selectedProduct || isLoading}
              onPress={handleCreateSauda}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryActionBtnText}>Issue Sauda Now</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── ALERT MODAL ─── */}
      <Modal
        visible={alertModalConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertModalConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.alertCard}>
            <CheckCircle2 size={36} color={COLORS.success} style={{ marginBottom: 12 }} />
            <Text style={styles.alertTitle}>{alertModalConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertModalConfig.message}</Text>

            <TouchableOpacity
              style={styles.alertPrimaryBtn}
              onPress={() => {
                if (alertModalConfig.onPrimary) alertModalConfig.onPrimary();
                else setAlertModalConfig(prev => ({ ...prev, visible: false }));
              }}
            >
              <Text style={styles.alertPrimaryBtnText}>{alertModalConfig.primaryText || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── FINAL SAUDA CREATED SUCCESS RECEIPT MODAL ─── */}
      <BrokerSuccessReceipt
        visible={!!createdDealModal}
        actionType="dealCreated"
        title="Deal Created Successfully!"
        message="The deal has been created and sent to the selected parties for confirmation."
        referenceId={createdDealModal?.dealRef || 'SAUDA-101'}
        primaryAmount={createdDealModal?.totalValue}
        amountLabel="Total Deal Value"
        summaryItems={[
          { label: 'Seller Firm', value: createdDealModal?.sellerName },
          { label: 'Buyer Firm', value: createdDealModal?.buyerName },
          { label: 'Product Name', value: createdDealModal?.productName },
          { label: 'Quantity', value: createdDealModal?.quantity },
          { label: 'Rate', value: createdDealModal?.rate },
        ]}
        details={[
          { label: 'Commission', value: createdDealModal?.commission },
          { label: 'Payment Terms', value: paymentTerms || 'Standard APMC Terms' },
          { label: 'Delivery Location', value: deliveryLocation || 'Mandi Premises' },
          { label: 'Seller Verification', value: sellerStatus || 'Approved' },
          { label: 'Buyer Verification', value: buyerStatus || 'Approved' },
        ]}
        showDetails={true}
        primaryButtonLabel="View Deal"
        onDone={() => {
          const dealData = createdDealModal?.dealRecord;
          setCreatedDealModal(null);
          onNavigate('BrokerDealDetails', { dealId: dealData?._id || dealData?.id, deal: dealData });
        }}
        onClose={() => {
          setCreatedDealModal(null);
          onNavigate('BrokerDealsList');
        }}
      />

      {/* ─── MULTI-COMPANY SELECTION MODAL ─── */}
      <Modal
        visible={companySelectModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCompanySelectModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            {/* Drag Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 }} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                  <Building2 size={16} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Select {companySelectTarget?.role} Company</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{companySelectTarget?.user?.name || 'User'} · {availableCompaniesList.length} companies found</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setCompanySelectModalVisible(false)}
                style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
              >
                <X size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 12 }} />

            <FlatList
              data={availableCompaniesList}
              keyExtractor={(item, index) => item._id || item.id || item.companyId || index.toString()}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const compName = item.companyName || item.name || 'Business';
                const compCity = item.city || (item.address && (item.address.city || item.address)) || '';
                const compState = item.state || (item.address && item.address.state) || '';
                const compLocation = [compCity, compState].filter(Boolean).join(', ') || 'Registered Business';
                const compGst = item.gstin || item.gst || item.registrationNumber || '';
                const compPhone = item.phone || '';
                return (
                  <TouchableOpacity
                    style={styles.companySelectItemCard}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (companySelectTarget?.role === 'Seller') {
                        selectSellerCompany(item, companySelectTarget.user, companySelectTarget.products);
                      } else {
                        selectBuyerCompany(item, companySelectTarget.user);
                      }
                    }}
                  >
                    <View style={styles.companySelectIconBadge}>
                      <Building2 size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.companySelectItemName} numberOfLines={1}>{compName}</Text>
                      {compLocation ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 }}>
                          <Text style={{ fontSize: 10, color: COLORS.textMuted }}>📍</Text>
                          <Text style={styles.companySelectItemAddr} numberOfLines={1}>{compLocation}</Text>
                        </View>
                      ) : null}
                      {compGst ? (
                        <View style={{ marginTop: 4 }}>
                          <View style={{ alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={styles.companySelectItemGst}>GST: {compGst}</Text>
                          </View>
                        </View>
                      ) : null}
                      {compPhone ? (
                        <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>📞 {compPhone}</Text>
                      ) : null}
                    </View>
                    <View style={{ paddingLeft: 8, alignItems: 'center', gap: 4 }}>
                      <View style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Select</Text>
                      </View>
                      <ChevronRight size={14} color={COLORS.textPlaceholder} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ─── DEVICE CONTACTS SELECTION MODAL ─── */}
      <Modal
        visible={contactsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setContactsModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookUser size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Choose {targetRoleForContacts} Contact</Text>
              </View>
              <TouchableOpacity onPress={() => setContactsModalVisible(false)} pth={8}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.contactSearchBarContainer}>
              <Search size={15} color={COLORS.textPlaceholder} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.contactSearchInput}
                placeholder="Search by name or mobile number..."
                placeholderTextColor={COLORS.textPlaceholder}
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
                autoFocus={true}
              />
              {contactSearchQuery ? (
                <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                  <X size={15} color={COLORS.textPlaceholder} />
                </TouchableOpacity>
              ) : null}
            </View>

            {contactsLoading ? (
              <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ marginTop: 8, fontSize: 13, color: COLORS.textMuted }}>
                  Reading contacts address book...
                </Text>
              </View>
            ) : (
              <FlatList
                data={deviceContacts.filter(c =>
                  c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                  c.mobile.includes(contactSearchQuery)
                )}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingVertical: 4 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contactItemCard}
                    onPress={() => handleSelectContactItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contactAvatarCircle}>
                      <Text style={styles.contactAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactItemName}>{item.name}</Text>
                      <Text style={styles.contactItemPhone}>+91 {item.mobile}</Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.textPlaceholder} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                      No matching contacts found
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ─── ASSISTED ONBOARDING MODAL ─── */}
      <BrokerAssistedOnboardingModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        partyType={onboardingPartyType}
        mobileNumber={onboardingPartyType === 'Seller' ? sellerMobile : buyerMobile}
        brokerUser={currentUser}
        onSuccess={handleAssistedOnboardingSuccess}
      />

      {/* ─── ADD NEW PRODUCT MODAL ─── */}
      <Modal
        visible={createProductModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateProductModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <PackagePlus size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Add New Product</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateProductModalVisible(false)}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubText}>
              Adding product for: <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{sellerParty?.company?.companyName || sellerParty?.company?.name || 'Seller Business'}</Text>
            </Text>

            <Text style={styles.fieldLabel}>Product Name <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.fintechInput}
              placeholder="e.g. Cotton Shankar-6 / Desi Chana"
              placeholderTextColor={COLORS.textPlaceholder}
              value={newProductName}
              onChangeText={setNewProductName}
            />

            <View style={styles.formRowTwoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>HSN Code (Optional)</Text>
                <TextInput
                  style={styles.fintechInput}
                  placeholder="7601"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="number-pad"
                  value={newProductHsn}
                  onChangeText={setNewProductHsn}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>GST Rate (%)</Text>
                <TextInput
                  style={styles.fintechInput}
                  placeholder="18"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="number-pad"
                  value={newProductGst}
                  onChangeText={setNewProductGst}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateProductModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1 }]}
                onPress={handleCreateProductForSeller}
                disabled={isCreatingProduct}
              >
                {isCreatingProduct ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Add Product</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- STYLES SYSTEM ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  // ─── ROYAL BLUE HEADER & STEPPER STYLES (Matching Screenshot) ───
  topHeaderBlue: {
    height: 60,
    backgroundColor: '#0D52ED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backBtnBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerIconBtnBlue: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarCircleBlue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },

  progressTrackerContainerBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D52ED',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 6,
  },
  stepCircleActiveBlue: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stepNodeLabelActiveBlue: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  stepBannerCardBlue: {
    backgroundColor: '#0D52ED',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    marginTop: -12,
    marginHorizontal: -16,
    elevation: 4,
    shadowColor: '#0D52ED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  stepBannerTitleBlue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  stepBannerSubBlue: {
    fontSize: 12,
    color: '#DBEAFE',
    marginTop: 4,
    fontWeight: '600',
  },

  /* ORIGINATING BROKER CARD */
  originatingBrokerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: -8,
  },
  brokerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originatingBrokerSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  originatingBrokerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  verifiedBlueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  verifiedBlueBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0D52ED',
  },

  /* REQUIRED BADGE */
  requiredBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },

  /* SEARCH INPUT BOX */
  searchInputBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  searchInputBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },

  /* QUICK CHIPS */
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickChipPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },

  statusBadgePillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeTextGreen: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },

  /* REGISTER NEW PARTY DASHED BTN */
  registerNewPartyDashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#93C5FD',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  registerNewPartyDashedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D52ED',
  },
  toastBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 12,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── HEADER ───
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.successDark,
  },

  // ─── STEP PROGRESS TRACKER ───
  progressTrackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepNode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success,
  },
  stepCirclePending: {
    backgroundColor: COLORS.bgMain,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  stepCircleNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepCircleNumberActive: {
    color: '#FFFFFF',
  },
  stepNodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepNodeLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.success,
  },
  stepLinePending: {
    backgroundColor: COLORS.border,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 150,
    gap: 12,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  inlineErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
    flex: 1,
  },

  // ─── CARDS & SECTIONS ───
  cardSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 10,
  },
  cardHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardSectionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  // ─── INPUTS ───
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  requiredStar: {
    color: COLORS.error,
  },
  phoneSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 48,
    overflow: 'hidden',
  },
  countryCodePrefix: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
  },
  searchIconButton: {
    width: 46,
    height: '100%',
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },

  // ─── CONTACTS BUTTON PILL ───
  pickFromContactsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  contactsBtnIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pickFromContactsPillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ─── NOT FOUND STATE ───
  notFoundCard: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  notFoundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notFoundTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notFoundDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  notFoundBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  registerUserBtn: {
    backgroundColor: COLORS.indigo,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerUserBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tryAnotherBtn: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tryAnotherBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // ─── SELECTED PARTY CARD ───
  successPartyCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.indigoBorder,
    backgroundColor: COLORS.indigoLight,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  successCheckCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  successPartyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  successPartySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  selectedPartyProfileCard: {
    backgroundColor: COLORS.bgMain,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  companySelectItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  companySelectIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companySelectItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  companySelectItemAddr: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  companySelectItemGst: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  profileCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  profileBusinessName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  profileOwnerInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  profileAddressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  changePartyLinkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  changePartyLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },

  // ─── DEAL DETAILS FORM ───
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inlineActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyProductsCard: {
    backgroundColor: COLORS.bgMain,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyProductsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  emptyProductsSub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 2, marginBottom: 10 },
  createProductPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createProductPrimaryBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  productChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  productSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productSelectChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  productSelectChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  productSelectChipTextActive: { color: '#FFFFFF' },
  activeProductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  activeProductText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  fintechInput: {
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 48,
    overflow: 'hidden',
  },
  currencySymbolBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  currencySymbolText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  currencyInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: 10,
  },
  unitChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  unitChipItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitChipItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitChipItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  unitChipItemTextActive: {
    color: '#FFFFFF',
  },

  // ─── SAUDA SUMMARY CARD ───
  summaryCardContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  secureBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  summaryDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryDataLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  summaryDataValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  totalValueHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 6,
  },
  totalValueHighlightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  totalValueHighlightVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // ─── BOTTOM FOOTER ───
  bottomActionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 40,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 99,
  },
  primaryActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  twoBtnActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  secondaryOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
  },
  secondaryOutlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // ─── MODALS ───
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  alertPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  alertPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Success Modal
  successModalCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  successModalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  snapshotBox: {
    width: '100%',
    backgroundColor: COLORS.bgMain,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snapshotLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  snapshotValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    maxWidth: '65%',
  },
  snapshotTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  snapshotTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  snapshotTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  modalPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  modalSecondaryBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  modalGhostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  modalGhostBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  // Bottom Sheet Modal
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Contact Picker
  contactSearchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactSearchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  contactItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgMain,
  },
  contactAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contactAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contactItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  contactItemPhone: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});

export default CreateBrokerDeal;
