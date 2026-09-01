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
  Trash2,
  Sparkles,
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
  filterContacts,
} from '../../../services/api';
import { generateAssistedRegistrationLink } from '../../../utils/WhatsAppService';
import BrokerAssistedOnboardingModal from './BrokerAssistedOnboardingModal';

// --- CLEAN FINTECH COLOR PALETTE ---
const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  accent: '#3B82F6',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  success: '#16A34A',
  successDark: '#15803D',
  successLight: '#F0FDF4',
  successBorder: '#86EFAC',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorBorder: '#FCA5A5',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textPlaceholder: '#94A3B8',
  bgMain: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  shadowColor: '#0F172A',
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

  // Wizard Step State (1: Parties, 2: Commodity, 3: Review)
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

  // Backend Units State
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
  const [addedProductsList, setAddedProductsList] = useState([]);
  const [dealProductBlocks, setDealProductBlocks] = useState([
    {
      id: 'block_1',
      selectedProduct: '',
      selectedProductId: '',
      quantity: '',
      rate: '',
      discount: '',
      gst: '18',
      paymentTerms: '7 Days Credit',
      selectedUnitObj: DEFAULT_UNITS[0],
    },
  ]);
  const [commissionRate, setCommissionRate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  // Inline Feedback Toast / Error Banner State
  const [toastMsg, setToastMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Product Picker Modal State
  const [productPickerModalVisible, setProductPickerModalVisible] = useState(false);
  const [activeProductBlockId, setActiveProductBlockId] = useState(null);
  const [productPickerSearchQuery, setProductPickerSearchQuery] = useState('');

  const openProductPickerModal = (blockId) => {
    setActiveProductBlockId(blockId);
    setProductPickerSearchQuery('');
    setProductPickerModalVisible(true);
  };

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

  // Success inline card state
  const [partyJustAdded, setPartyJustAdded] = useState(null);

  // Multi-Company Selection State
  const [companySelectModalVisible, setCompanySelectModalVisible] = useState(false);
  const [availableCompaniesList, setAvailableCompaniesList] = useState([]);
  const [companySelectTarget, setCompanySelectTarget] = useState(null);

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
  const [contactsActiveTab, setContactsActiveTab] = useState('all'); // 'all' | 'registered' | 'unregistered'

  const openDeviceContactsModal = async (targetRole) => {
    setTargetRoleForContacts(targetRole);
    setContactsModalVisible(true);
    setContactsLoading(true);
    setContactSearchQuery('');
    setContactsActiveTab('all');
    try {
      let granted = true;
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Access',
            message: `Pravisti needs access to your contacts to select ${targetRole.toLowerCase()} phone numbers and check registered entities.`,
            buttonPositive: 'Allow Access',
          }
        );
        granted = permission === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const permission = await Contacts.requestPermission();
        granted = permission === 'authorized';
      }

      if (granted) {
        const rawContacts = await Contacts.getAll();
        const formatted = [];
        const contactsToSend = [];

        (rawContacts || []).forEach(c => {
          const fullName = [c.givenName, c.familyName].filter(Boolean).join(' ') || c.displayName || 'Unnamed Contact';
          (c.phoneNumbers || []).forEach(p => {
            const cleanDigits = (p.number || '').replace(/[^0-9]/g, '');
            const mobile10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';
            if (mobile10.length === 10 && !formatted.some(item => item.mobile === mobile10)) {
              let phoneWithCode = '+91' + mobile10;
              formatted.push({
                id: (c.recordID || Math.random().toString()) + mobile10,
                name: fullName,
                mobile: mobile10,
                fullPhone: p.number,
                phoneWithCode,
                isRegistered: false,
                companies: [],
              });
              contactsToSend.push({
                name: fullName,
                phone: phoneWithCode,
              });
            }
          });
        });

        // Call Pravisti filterContacts API to find registered businesses & users
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token && contactsToSend.length > 0) {
            const response = await filterContacts(contactsToSend, token);
            if (response && response.success && Array.isArray(response.data)) {
              const registeredMap = new Map();
              response.data.forEach(item => {
                const rawPh = (item.phone || '').replace(/[^0-9]/g, '');
                const m10 = rawPh.slice(-10);
                if (m10) {
                  registeredMap.set(m10, item);
                }
              });

              formatted.forEach(c => {
                const regInfo = registeredMap.get(c.mobile);
                if (regInfo) {
                  c.isRegistered = Boolean(regInfo.isRegistered);
                  c.companies = regInfo.companies || [];
                  c.registeredName = regInfo.registeredName || regInfo.name || c.name;
                  if (regInfo.name) c.name = regInfo.name;
                  if (regInfo.companies && regInfo.companies.length > 0) {
                    c.primaryCompanyName = regInfo.companies[0].companyName;
                    c.primaryCompanyId = regInfo.companies[0].companyId;
                  }
                }
              });
            }
          }
        } catch (apiErr) {
          console.warn('Pravisti filterContacts API error:', apiErr);
        }

        // Sort: Registered on Pravisti first, then alphabetically by name
        formatted.sort((a, b) => {
          if (a.isRegistered && !b.isRegistered) return -1;
          if (!a.isRegistered && b.isRegistered) return 1;
          return a.name.localeCompare(b.name);
        });

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

  // Animated Success Modal State
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

  // Initial Load
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

  // Fetch real products
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
          setAvailableCompaniesList(companies);
          setCompanySelectTarget({
            role: 'Seller',
            user: userObj,
            products: prods,
          });
          setCompanySelectModalVisible(true);
        } else {
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
          setAvailableCompaniesList(companies);
          setCompanySelectTarget({
            role: 'Buyer',
            user: userObj,
          });
          setCompanySelectModalVisible(true);
        } else {
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
  const handleCreateProductForSeller = async (keepModalOpen = false) => {
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

      let categoryId = null;
      try {
        const catRes = await getCategories(traderCompanyId, token);
        if (catRes && catRes.success && Array.isArray(catRes.data) && catRes.data.length > 0) {
          categoryId = catRes.data[0]._id || catRes.data[0].id;
        } else if (catRes && Array.isArray(catRes) && catRes.length > 0) {
          categoryId = catRes[0]._id || catRes[0].id;
        } else {
          const newCatRes = await createCategory({ name: 'Commodities', description: 'General Commodities', companyId: traderCompanyId }, token);
          if (newCatRes) {
            categoryId = newCatRes.data?._id || newCatRes.data?.id || newCatRes.category?._id || newCatRes.category?.id || newCatRes._id || newCatRes.id || null;
          }
        }
      } catch (catErr) {
        console.warn('Category resolution error:', catErr);
      }

      if (!categoryId) {
        try {
          const fallbackCat = await createCategory({ name: 'Commodities', companyId: traderCompanyId }, token);
          categoryId = fallbackCat?.data?._id || fallbackCat?.data?.id || fallbackCat?.category?._id || fallbackCat?._id || null;
        } catch (fbErr) {
          console.warn('Fallback category creation notice:', fbErr);
        }
      }

      const selectedUnitId = selectedUnitObj?._id || '6a0eac4cd59663585920f09c';
      const productPayload = {
        name: newProductName.trim(),
        companyId: traderCompanyId,
        unitId: selectedUnitId,
        hsnCode: newProductHsn.trim() || '7601',
        gstCode: newProductGst ? `GST_${newProductGst}` : 'GST_18',
        description: `Commodity product for trader ${sellerParty.company?.companyName || sellerParty.company?.name}`,
      };

      if (categoryId) {
        productPayload.categoryId = categoryId;
      }

      let createdProdObj = {
        _id: 'PROD-' + Math.random().toString(36).substring(2, 9),
        name: newProductName.trim(),
        companyId: traderCompanyId,
      };

      try {
        const prodRes = await createProduct(productPayload, token);
        if (prodRes && prodRes.success && (prodRes.data || prodRes.product)) {
          createdProdObj = prodRes.data || prodRes.product;
        } else if (prodRes && (prodRes._id || prodRes.id)) {
          createdProdObj = prodRes;
        }
      } catch (prodErr) {
        console.warn('API createProduct retry notice:', prodErr);
        if (prodErr?.message && (prodErr.message.toLowerCase().includes('category') || prodErr.message.toLowerCase().includes('categories'))) {
          try {
            const freshCatRes = await createCategory({ name: 'General Commodities', companyId: traderCompanyId }, token);
            const freshCatId = freshCatRes?.data?._id || freshCatRes?.data?.id || freshCatRes?._id;
            if (freshCatId) {
              productPayload.categoryId = freshCatId;
              const retryProdRes = await createProduct(productPayload, token);
              if (retryProdRes && (retryProdRes.data || retryProdRes.product)) {
                createdProdObj = retryProdRes.data || retryProdRes.product;
              }
            }
          } catch (retryErr) {
            console.warn('Retry createProduct notice:', retryErr);
          }
        }
      }

      setSellerProducts(prev => [createdProdObj, ...prev]);
      setSelectedProduct(createdProdObj.name);
      setSelectedProductId(createdProdObj._id || createdProdObj.id || '');

      setNewProductName('');
      setNewProductHsn('');

      if (!keepModalOpen) {
        setCreateProductModalVisible(false);
      } else {
        setToastMsg(`✓ Product "${createdProdObj.name}" added to catalog! You can add another below.`);
        setTimeout(() => setToastMsg(''), 4000);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleAddProductItemToSauda = () => {
    if (!selectedProduct) {
      setFormError('Please select a commodity product first.');
      return;
    }
    const numQty = parseFloat(quantity);
    const numRate = parseFloat(rate);
    if (isNaN(numQty) || numQty <= 0) {
      setFormError('Please enter a valid quantity.');
      return;
    }
    if (isNaN(numRate) || numRate <= 0) {
      setFormError('Please enter a valid rate.');
      return;
    }

    const unitLabel = selectedUnitObj?.shortName || selectedUnitObj?.name || 'unit';
    const newItem = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: isValidObjectId(selectedProductId) ? selectedProductId : '64d0a1b2c3d4e5f6a7b8c9df',
      productName: selectedProduct,
      quantity: numQty,
      rate: numRate,
      unit: unitLabel,
      totalAmount: numQty * numRate,
    };

    setAddedProductsList(prev => [...prev, newItem]);
    setSelectedProduct('');
    setSelectedProductId('');
    setQuantity('');
    setRate('');
    setFormError('');
    setToastMsg(`✓ Added ${newItem.productName} (${numQty} ${unitLabel} @ ₹${numRate}) to Sauda list!`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleRemoveProductItem = (itemId) => {
    setAddedProductsList(prev => prev.filter(item => item.id !== itemId));
  };

  const handleAddAnotherProductBlock = () => {
    const newBlock = {
      id: 'block_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      selectedProduct: '',
      selectedProductId: '',
      quantity: '',
      rate: '',
      discount: '',
      gst: '18',
      paymentTerms: '7 Days Credit',
      selectedUnitObj: apiUnits[0] || DEFAULT_UNITS[0],
    };
    setDealProductBlocks(prev => [...prev, newBlock]);
    showToast(`✓ Opened Product #${dealProductBlocks.length + 1} form tab below!`);
  };

  const handleRemoveProductBlock = (blockId) => {
    if (dealProductBlocks.length === 1) {
      showToast('At least one product entry is required for the Sauda.');
      return;
    }
    setDealProductBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const handleUpdateProductBlock = (blockId, field, value) => {
    setDealProductBlocks(prev =>
      prev.map(b => (b.id === blockId ? { ...b, [field]: value } : b))
    );
  };

  // Helper for per-block financials
  const calculateBlockFinancials = (b) => {
    const qty = parseFloat(b.quantity) || 0;
    const price = parseFloat(b.rate) || 0;
    const subtotal = qty * price;
    const discountVal = parseFloat(b.discount) || 0;
    const afterDiscount = Math.max(0, subtotal - discountVal);
    const gstPct = parseFloat(b.gst) || 0;
    const gstAmount = (afterDiscount * gstPct) / 100;
    const totalAmount = afterDiscount + gstAmount;

    return {
      subtotal,
      discountVal,
      afterDiscount,
      gstPct,
      gstAmount,
      totalAmount,
    };
  };

  // Real-time grand totals calculation
  const totalValue = dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).totalAmount, 0);

  const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

  // Helper for product verification status badge derived from backend object
  const getSelectedProductObj = (selectedProdId, selectedProdName) => {
    if (selectedProdId) {
      const foundById = sellerProducts.find(p => typeof p === 'object' && (p._id === selectedProdId || p.id === selectedProdId));
      if (foundById) return foundById;
    }
    if (selectedProdName) {
      const foundByName = sellerProducts.find(p => typeof p === 'object' && (p.name || '').toLowerCase() === String(selectedProdName).toLowerCase());
      if (foundByName) return foundByName;
    }
    return null;
  };

  const renderProductStatusBadge = (productObj) => {
    const rawStatus = String(
      productObj?.status ||
      productObj?.productStatus ||
      productObj?.verificationStatus ||
      ''
    ).toLowerCase().trim();

    if (rawStatus === 'verified' || rawStatus === 'approved' || rawStatus === 'active') {
      return (
        <View style={styles.statusBadgeVerified}>
          <CheckCircle2 size={11} color="#15803D" style={{ marginRight: 3 }} />
          <Text style={styles.statusBadgeVerifiedText}>Verified</Text>
        </View>
      );
    }
    if (rawStatus === 'rejected') {
      return (
        <View style={styles.statusBadgeRejected}>
          <AlertCircle size={11} color="#B91C1C" style={{ marginRight: 3 }} />
          <Text style={styles.statusBadgeRejectedText}>Rejected</Text>
        </View>
      );
    }
    // Default for all unverified / pending / unverified products
    return (
      <View style={styles.statusBadgeUnverified}>
        <Clock size={11} color="#B45309" style={{ marginRight: 3 }} />
        <Text style={styles.statusBadgeUnverifiedText}>Unverified</Text>
      </View>
    );
  };

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
    const hasValidBlock = dealProductBlocks.some(b => b.selectedProduct && parseFloat(b.quantity) > 0 && parseFloat(b.rate) > 0);
    const hasValidList = addedProductsList.length > 0;
    const hasValidSingle = selectedProduct && parseFloat(quantity) > 0 && parseFloat(rate) > 0;

    if (!hasValidBlock && !hasValidList && !hasValidSingle) {
      setFormError('Please select a commodity product and fill Quantity & Rate');
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

      const activeBlocks = dealProductBlocks.filter(b => b.selectedProduct || b.quantity || b.rate);
      const blocksToUse = activeBlocks.length > 0 ? activeBlocks : dealProductBlocks;

      for (let i = 0; i < blocksToUse.length; i++) {
        const b = blocksToUse[i];
        if (!b.selectedProduct && (b.quantity || b.rate || blocksToUse.length > 1)) {
          setFormError(`Please select a commodity product for Product Tab #${i + 1}`);
          setIsLoading(false);
          return;
        }
        if (b.selectedProduct && (!b.quantity || parseFloat(b.quantity) <= 0)) {
          setFormError(`Please enter a valid Quantity for Product #${i + 1} (${b.selectedProduct})`);
          setIsLoading(false);
          return;
        }
        if (b.selectedProduct && (!b.rate || parseFloat(b.rate) <= 0)) {
          setFormError(`Please enter a valid Rate for Product #${i + 1} (${b.selectedProduct})`);
          setIsLoading(false);
          return;
        }
      }

      let dealProductsPayload = [];
      if (blocksToUse.length > 0 && blocksToUse[0].selectedProduct) {
        dealProductsPayload = blocksToUse.map(b => {
          const fin = calculateBlockFinancials(b);
          return {
            productId: isValidObjectId(b.selectedProductId) ? b.selectedProductId : defaultProductId,
            quantity: parseFloat(b.quantity) || 0,
            price: parseFloat(b.rate) || 0,
            gst: fin.gstPct,
            discount: fin.discountVal,
            paymentTerms: b.paymentTerms || paymentTerms || '7 Days Credit',
          };
        });
      } else if (addedProductsList.length > 0) {
        dealProductsPayload = addedProductsList.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.rate,
          gst: parseFloat(commissionRate) || 18,
          discount: 0,
          paymentTerms: paymentTerms || '7 Days Credit',
        }));
      } else {
        dealProductsPayload = [
          {
            productId: defaultProductId,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(rate) || 0,
            gst: parseFloat(commissionRate) || 18,
            discount: 0,
            paymentTerms: paymentTerms || '7 Days Credit',
          },
        ];
      }

      const totalValueComputed = blocksToUse.length > 0 && blocksToUse[0].selectedProduct
        ? blocksToUse.reduce((acc, b) => acc + calculateBlockFinancials(b).totalAmount, 0)
        : (addedProductsList.length > 0 ? addedProductsList.reduce((acc, item) => acc + item.totalAmount, 0) : totalValue);

      const firstB = blocksToUse[0] || {};
      const summaryProductNames = blocksToUse.length > 0 && blocksToUse[0].selectedProduct
        ? blocksToUse.map(p => `${p.selectedProduct} (${p.quantity} ${p.selectedUnitObj?.shortName || 'unit'})`).join(', ')
        : (addedProductsList.length > 0 ? addedProductsList.map(p => `${p.productName} (${p.quantity} ${p.unit})`).join(', ') : `${selectedProduct} (${quantity} ${unitLabel})`);

      const dealPayload = {
        role: 'broker',
        sellerCompanyId: sellerCompId,
        buyerCompanyId: buyerCompId,
        products: dealProductsPayload,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Broker Sauda (${dealRef}) created with ${dealProductsPayload.length} product(s): ${summaryProductNames} @ total ₹${totalValueComputed}. Location: ${deliveryLocation}`,
      };

      if (isValidObjectId(rawBrokerCompId)) {
        dealPayload.myCompanyId = rawBrokerCompId;
      }

      const res = await createDeal(dealPayload, token);

      const isUnverified = sellerStatus === 'Pending' || buyerStatus === 'Pending';

      const targetComp = routeData?.company || selectedBrokerCompany || routeData?.firm;
      const targetCompId = targetComp?._id || targetComp?.id || routeData?.companyId || routeData?.firmId;
      const targetCompName = targetComp?.name || targetComp?.companyName || routeData?.companyName;

      const dealRecord = {
        id: dealRef,
        _id: res?.data?._id || res?.data?.deal?._id || 'DEAL-' + Math.floor(1000 + Math.random() * 9000),
        crop: firstB.selectedProduct || selectedProduct,
        productName: summaryProductNames,
        quantity: `${firstB.quantity || quantity} ${unitLabel}`,
        rate: `₹${parseFloat(firstB.rate || rate).toLocaleString('en-IN')}`,
        price: parseFloat(firstB.rate || rate),
        totalAmount: totalValueComputed,
        totalValue: `₹${totalValueComputed.toLocaleString('en-IN')}`,
        buyer: buyerParty.company?.companyName || buyerParty.company?.name || 'Buyer Business',
        seller: sellerParty.company?.companyName || sellerParty.company?.name || 'Seller Business',
        status: isUnverified ? 'Pending Sign' : 'Confirmed',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        commission: 'Broker Direct',
        brokerCompanyId: targetCompId,
        brokerCompanyName: targetCompName,
        createdAt: new Date().toISOString(),
      };

      try {
        const storedDealsStr = await AsyncStorage.getItem('broker_deals_storage');
        const storedDeals = storedDealsStr ? JSON.parse(storedDealsStr) : [];
        await AsyncStorage.setItem('broker_deals_storage', JSON.stringify([dealRecord, ...storedDeals]));
      } catch (err) {
        console.warn('AsyncStorage broker deals save warning:', err);
      }

      triggerSuccessAnimation();
      setCreatedDealModal({
        dealRef,
        totalValue: `₹${totalValueComputed.toLocaleString('en-IN')}`,
        sellerName: sellerParty.company?.companyName || sellerParty.company?.name,
        buyerName: buyerParty.company?.companyName || buyerParty.company?.name,
        productName: summaryProductNames,
        quantity: `${firstB.quantity || quantity} ${unitLabel}`,
        rate: `₹${parseFloat(firstB.rate || rate).toLocaleString('en-IN')}`,
        commission: 'Broker Direct',
        dealRecord,
      });
    } catch (err) {
      setFormError(err.message || 'Failed to create deal contract');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = (step) => {
    if (step === 1) return 'Parties';
    if (step === 2) return 'Commodity';
    return 'Review';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOAST FEEDBACK FLOATING BANNER */}
      {toastMsg ? (
        <View style={styles.toastBanner}>
          <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      {/* ─── 1. CLEAN WHITE SAFE HEADER (Option A) ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Issue Sauda</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <Bell size={18} color="#475569" />
          </TouchableOpacity>
          <View style={styles.userAvatarCircle}>
            <User size={15} color={COLORS.primary} />
          </View>
        </View>
      </View>

      {/* ─── 2. STEP PROGRESS TRACKER (EQUAL SPACING & CENTERED LABELS) ─── */}
      <View style={styles.stepperWrapper}>
        <View style={styles.stepperContainer}>
          {/* Step 1 Node */}
          <TouchableOpacity
            style={styles.stepItem}
            activeOpacity={0.8}
            onPress={() => { setFormError(''); setCurrentStep(1); }}
          >
            <View style={styles.circleConnectorRow}>
              <View style={[styles.stepLine, { opacity: 0 }]} />
              <View style={[
                styles.stepCircle,
                currentStep > 1 ? styles.stepCircleCompleted : currentStep === 1 ? styles.stepCircleActive : styles.stepCirclePending,
              ]}>
                {currentStep > 1 ? (
                  <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <Text style={[styles.stepCircleNumber, currentStep === 1 && styles.stepCircleNumberActive]}>1</Text>
                )}
              </View>
              <View style={[styles.stepLine, currentStep > 1 ? styles.stepLineCompleted : styles.stepLinePending]} />
            </View>
            <Text style={[styles.stepLabel, currentStep === 1 ? styles.stepLabelActive : currentStep > 1 ? styles.stepLabelCompleted : styles.stepLabelPending]}>
              Parties
            </Text>
          </TouchableOpacity>

          {/* Step 2 Node */}
          <TouchableOpacity
            style={styles.stepItem}
            activeOpacity={0.8}
            onPress={() => {
              if (!sellerParty || !buyerParty) {
                setFormError('Please select both Seller and Buyer before continuing.');
                return;
              }
              setFormError('');
              setCurrentStep(2);
            }}
          >
            <View style={styles.circleConnectorRow}>
              <View style={[styles.stepLine, currentStep > 1 ? styles.stepLineCompleted : styles.stepLinePending]} />
              <View style={[
                styles.stepCircle,
                currentStep > 2 ? styles.stepCircleCompleted : currentStep === 2 ? styles.stepCircleActive : styles.stepCirclePending,
              ]}>
                {currentStep > 2 ? (
                  <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <Text style={[styles.stepCircleNumber, currentStep === 2 && styles.stepCircleNumberActive]}>2</Text>
                )}
              </View>
              <View style={[styles.stepLine, currentStep > 2 ? styles.stepLineCompleted : styles.stepLinePending]} />
            </View>
            <Text style={[styles.stepLabel, currentStep === 2 ? styles.stepLabelActive : currentStep > 2 ? styles.stepLabelCompleted : styles.stepLabelPending]}>
              Commodity
            </Text>
          </TouchableOpacity>

          {/* Step 3 Node */}
          <TouchableOpacity
            style={styles.stepItem}
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
            <View style={styles.circleConnectorRow}>
              <View style={[styles.stepLine, currentStep > 2 ? styles.stepLineCompleted : styles.stepLinePending]} />
              <View style={[
                styles.stepCircle,
                currentStep === 3 ? styles.stepCircleActive : styles.stepCirclePending,
              ]}>
                <Text style={[styles.stepCircleNumber, currentStep === 3 && styles.stepCircleNumberActive]}>3</Text>
              </View>
              <View style={[styles.stepLine, { opacity: 0 }]} />
            </View>
            <Text style={[styles.stepLabel, currentStep === 3 ? styles.stepLabelActive : styles.stepLabelPending]}>
              Review
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── MAIN SCROLLCONTENT (16PX GRID ALIGNMENT) ─── */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* INLINE FORM ERROR BANNER */}
        {formError ? (
          <View style={styles.inlineErrorBanner}>
            <AlertCircle size={16} color={COLORS.error} style={{ marginRight: 8 }} />
            <Text style={styles.inlineErrorText}>{formError}</Text>
          </View>
        ) : null}

        {/* STEP 1: SELECT PARTIES */}
        {currentStep === 1 && (
          <View style={{ gap: 16 }}>
            {/* ORIGINATING BROKER CARD */}
            <View style={styles.originatingBrokerCard}>
              <View style={styles.brokerIconCircle}>
                <Building2 size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.originatingBrokerSub}>ORIGINATING BROKER</Text>
                <Text style={styles.originatingBrokerName}>
                  {selectedBrokerCompany?.companyName || selectedBrokerCompany?.name || 'MNC Agro Limited'}
                </Text>
              </View>
              <View style={styles.verifiedBlueBadge}>
                <ShieldCheck size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.verifiedBlueBadgeText}>Verified</Text>
              </View>
            </View>

            {/* CARD 1: SELECT SELLER */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Building2 size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionTitle}>Select Seller Entity</Text>
                  <Text style={styles.cardSectionSub}>Supplier / Seller Business</Text>
                </View>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>* Required</Text>
                </View>
              </View>

              {!sellerParty ? (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.searchInputBoxContainer}>
                    <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginRight: 4 }}>+91</Text>
                    <TextInput
                      style={styles.searchInputBoxText}
                      placeholder="Search mobile number..."
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <BookUser size={16} color={COLORS.primary} />
                      <Text style={styles.pickFromContactsPillText}>Choose from Phone Contacts</Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.primary} />
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
                        <Text style={styles.notFoundTitle}>No Registered Seller Found</Text>
                      </View>
                      <Text style={styles.notFoundDesc}>
                        This mobile (+91 {sellerMobile}) is not registered. Create & onboard entity to continue.
                      </Text>
                      <TouchableOpacity
                        style={styles.registerUserBtn}
                        onPress={() => { setOnboardingPartyType('Seller'); setModalVisible(true); }}
                      >
                        <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.registerUserBtnText}>+ Create & Onboard Seller</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.selectedPartyProfileCard}>
                  <View style={styles.profileCardTopRow}>
                    <View style={styles.companyAvatarBox}>
                      <Building2 size={20} color={COLORS.successDark} />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.profileBusinessName} numberOfLines={1}>
                        {sellerParty.company?.companyName || sellerParty.company?.name || 'Seller Business'}
                      </Text>
                      <Text style={styles.profileOwnerInfo} numberOfLines={1}>
                        Owner: {sellerParty.user?.name || 'Seller'} (+91 {sellerParty.user?.mobileNumber || sellerMobile})
                      </Text>
                    </View>
                    <View style={styles.statusBadgePillGreen}>
                      <ShieldCheck size={13} color="#15803D" style={{ marginRight: 4 }} />
                      <Text style={styles.statusBadgeTextGreen}>Selected</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => { setSellerParty(null); setSellerProducts([]); setSelectedProduct(''); }}
                    style={styles.changePartyOutlineBtn}
                  >
                    <Text style={styles.changePartyOutlineBtnText}>Change Seller</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* CARD 2: SELECT BUYER (SYMMETRICAL TO SELLER CARD) */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <User size={18} color={COLORS.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionTitle}>Select Buyer Entity</Text>
                  <Text style={styles.cardSectionSub}>Purchaser / Buyer Business</Text>
                </View>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>* Required</Text>
                </View>
              </View>

              {!buyerParty ? (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.searchInputBoxContainer}>
                    <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginRight: 4 }}>+91</Text>
                    <TextInput
                      style={styles.searchInputBoxText}
                      placeholder="Search mobile number..."
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <BookUser size={16} color={COLORS.primary} />
                      <Text style={styles.pickFromContactsPillText}>Choose from Phone Contacts</Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.primary} />
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
                        <Text style={styles.notFoundTitle}>No Registered Buyer Found</Text>
                      </View>
                      <Text style={styles.notFoundDesc}>
                        This mobile (+91 {buyerMobile}) is not registered. Create & onboard entity to continue.
                      </Text>
                      <TouchableOpacity
                        style={styles.registerUserBtn}
                        onPress={() => { setOnboardingPartyType('Buyer'); setModalVisible(true); }}
                      >
                        <Plus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.registerUserBtnText}>+ Create & Onboard Buyer</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.selectedPartyProfileCard}>
                  <View style={styles.profileCardTopRow}>
                    <View style={styles.companyAvatarBox}>
                      <User size={20} color={COLORS.successDark} />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.profileBusinessName} numberOfLines={1}>
                        {buyerParty.company?.companyName || buyerParty.company?.name || 'Buyer Business'}
                      </Text>
                      <Text style={styles.profileOwnerInfo} numberOfLines={1}>
                        Owner: {buyerParty.user?.name || 'Buyer'} (+91 {buyerParty.user?.mobileNumber || buyerMobile})
                      </Text>
                    </View>
                    <View style={styles.statusBadgePillGreen}>
                      <ShieldCheck size={13} color="#15803D" style={{ marginRight: 4 }} />
                      <Text style={styles.statusBadgeTextGreen}>Selected</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setBuyerParty(null)}
                    style={styles.changePartyOutlineBtn}
                  >
                    <Text style={styles.changePartyOutlineBtnText}>Change Buyer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* STEP 2: COMMODITY DETAILS */}
        {currentStep === 2 && (
          <View style={{ gap: 16 }}>
            {dealProductBlocks.map((block, bIdx) => {
              const fin = calculateBlockFinancials(block);
              const selectedProductObj = getSelectedProductObj(block.selectedProductId, block.selectedProduct);

              return (
                <View key={block.id || bIdx} style={styles.cardSection}>
                  {/* RESPONSIVE HEADER: ROW 1 Badge + Delete Icon */}
                  <View style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={styles.productTabBadge}>
                        <Text style={styles.productTabBadgeText}>
                          Product Tab #{bIdx + 1}
                        </Text>
                      </View>
                      {dealProductBlocks.length > 1 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveProductBlock(block.id)}
                          style={{ padding: 4 }}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {block.selectedProduct ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.textPrimary }} numberOfLines={1}>
                          {block.selectedProduct}
                        </Text>
                        {renderProductStatusBadge(selectedProductObj)}
                      </View>
                    ) : null}
                  </View>

                  {/* SELECT COMMODITY DROPDOWN FIELD (Replaces Chip Wall) */}
                  <Text style={[styles.fieldLabel, { marginTop: 4 }]}>
                    Select Commodity Product <Text style={styles.requiredStar}>*</Text>
                  </Text>

                  {productsLoading ? (
                    <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.loadingText}>Loading catalog products...</Text>
                    </View>
                  ) : sellerProducts.length === 0 ? (
                    <View style={styles.emptyProductsCard}>
                      <Box size={24} color={COLORS.textMuted} style={{ marginBottom: 6 }} />
                      <Text style={styles.emptyProductsTitle}>No Products Available</Text>
                      <Text style={styles.emptyProductsSub}>Add a commodity product to catalog first.</Text>
                      <TouchableOpacity
                        style={styles.createProductPrimaryBtn}
                        onPress={() => setCreateProductModalVisible(true)}
                      >
                        <PackagePlus size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.createProductPrimaryBtnText}>Create Catalog Product</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        style={styles.productDropdownField}
                        onPress={() => openProductPickerModal(block.id)}
                        activeOpacity={0.8}
                      >
                        {block.selectedProduct ? (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 }}>
                              <Box size={16} color={COLORS.primary} />
                              <Text style={styles.selectedProductText} numberOfLines={1}>
                                {block.selectedProduct}
                              </Text>
                            </View>
                            {renderProductStatusBadge(selectedProductObj)}
                          </View>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Box size={16} color={COLORS.textPlaceholder} />
                              <Text style={styles.placeholderProductText}>Select commodity product...</Text>
                            </View>
                            <ChevronRight size={18} color="#94A3B8" />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* OUTLINED COMPACT BUTTON: Create Catalog Product */}
                      {sellerParty && bIdx === 0 && (
                        <TouchableOpacity
                          style={styles.inlineCreateCatalogBtn}
                          onPress={() => setCreateProductModalVisible(true)}
                          activeOpacity={0.8}
                        >
                          <Plus size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.inlineCreateCatalogBtnText}>+ Create Catalog Product</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Quantity & Rate Group (Responsive 2-Col Grid) */}
                  <View style={[styles.formRowTwoCol, { marginTop: 12 }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.fieldLabel}>Quantity <Text style={styles.requiredStar}>*</Text></Text>
                      <TextInput
                        style={styles.fintechInput}
                        placeholder="e.g. 100"
                        placeholderTextColor={COLORS.textPlaceholder}
                        keyboardType="number-pad"
                        value={block.quantity}
                        onChangeText={(val) => handleUpdateProductBlock(block.id, 'quantity', val)}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.fieldLabel}>Rate / Price <Text style={styles.requiredStar}>*</Text></Text>
                      <View style={styles.currencyInputContainer}>
                        <View style={styles.currencySymbolBox}>
                          <Text style={styles.currencySymbolText}>₹</Text>
                        </View>
                        <TextInput
                          style={styles.currencyInput}
                          placeholder="62,500"
                          placeholderTextColor={COLORS.textPlaceholder}
                          keyboardType="number-pad"
                          value={block.rate}
                          onChangeText={(val) => handleUpdateProductBlock(block.id, 'rate', val)}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Discount & GST Group (Responsive 2-Col Grid) */}
                  <View style={[styles.formRowTwoCol, { marginTop: 8 }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.fieldLabel}>Discount (₹)</Text>
                      <TextInput
                        style={styles.fintechInput}
                        placeholder="0"
                        placeholderTextColor={COLORS.textPlaceholder}
                        keyboardType="number-pad"
                        value={block.discount}
                        onChangeText={(val) => handleUpdateProductBlock(block.id, 'discount', val)}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.fieldLabel}>GST Rate (%)</Text>
                      <TextInput
                        style={styles.fintechInput}
                        placeholder="18"
                        placeholderTextColor={COLORS.textPlaceholder}
                        keyboardType="number-pad"
                        value={block.gst}
                        onChangeText={(val) => handleUpdateProductBlock(block.id, 'gst', val)}
                      />
                    </View>
                  </View>

                  {/* Payment Terms Group */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.fieldLabel}>Payment Terms</Text>
                    <TextInput
                      style={styles.fintechInput}
                      placeholder="e.g. 15 days / 50% Advance"
                      placeholderTextColor={COLORS.textPlaceholder}
                      value={block.paymentTerms}
                      onChangeText={(val) => handleUpdateProductBlock(block.id, 'paymentTerms', val)}
                    />
                  </View>

                  {/* Unit Selection */}
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Unit of Measurement</Text>
                  {unitsLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 6 }} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitChipsScroll}>
                      {apiUnits.map((uItem, idx) => {
                        const uName = uItem.name || uItem.shortName || 'unit';
                        const isSel = block.selectedUnitObj?._id === uItem._id || block.selectedUnitObj?.name === uItem.name;
                        return (
                          <TouchableOpacity
                            key={uItem._id || idx}
                            style={[styles.unitChipItem, isSel && styles.unitChipItemActive]}
                            onPress={() => handleUpdateProductBlock(block.id, 'selectedUnitObj', uItem)}
                          >
                            <Text style={[styles.unitChipItemText, isSel && styles.unitChipItemTextActive]}>
                              {uName} ({uItem.shortName || 'unit'})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Product Financial Breakdown Footer */}
                  {fin.subtotal > 0 && (
                    <View style={styles.productFinancialBox}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>
                          Subtotal ({block.quantity} {block.selectedUnitObj?.shortName || 'unit'} @ ₹{block.rate}):
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textPrimary }}>
                          ₹{fin.subtotal.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      {fin.discountVal > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: '#DC2626' }}>Discount:</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                            -₹{fin.discountVal.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      )}
                      {fin.gstAmount > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>GST ({fin.gstPct}%):</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textPrimary }}>
                            +₹{fin.gstAmount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      )}
                      <View style={styles.netTotalRow}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.textPrimary }}>Product Net Total:</Text>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669' }}>
                          ₹{fin.totalAmount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* "+ Add Another Product" Mobile CTA */}
            <TouchableOpacity
              style={styles.addAnotherProductTabBtn}
              onPress={handleAddAnotherProductBlock}
              activeOpacity={0.8}
            >
              <Plus size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.addAnotherProductTabBtnText}>+ Add Another Product</Text>
              {dealProductBlocks.length > 1 && (
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 6 }}>
                  ({dealProductBlocks.length} products added)
                </Text>
              )}
            </TouchableOpacity>

            {/* Total Sauda Financial Summary Box */}
            {dealProductBlocks.some(b => calculateBlockFinancials(b).totalAmount > 0) && (
              <View style={styles.saudaGrandTotalCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#065F46', letterSpacing: 0.2 }}>SAUDA GRAND FINANCIAL TOTAL</Text>
                  <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>
                    {dealProductBlocks.filter(b => b.selectedProduct).length} Product Tab(s)
                  </Text>
                </View>
                <View style={{ gap: 4, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#047857' }}>Total Subtotal:</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>
                      ₹{dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).subtotal, 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  {dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).discountVal, 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: '#DC2626' }}>Total Discount:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>
                        -₹{dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).discountVal, 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                  {dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).gstAmount, 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: '#047857' }}>Total GST Amount:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>
                        +₹{dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).gstAmount, 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#A7F3D0' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>GRAND TOTAL:</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#059669' }}>
                      ₹{dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).totalAmount, 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            )}


          </View>
        )}

        {/* STEP 3: REVIEW & ISSUE SAUDA */}
        {currentStep === 3 && (
          <View style={{ gap: 16 }}>
            {/* SAUDA SUMMARY CARD */}
            <View style={styles.summaryCardContainer}>
              <View style={styles.summaryTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Handshake size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.summaryCardTitle}>Contract Summary</Text>
                </View>
                <View style={styles.secureBadgeTag}>
                  <ShieldCheck size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.secureBadgeText}>Verified Trade</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Broker:</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {selectedBrokerCompany?.companyName || selectedBrokerCompany?.name || 'MNC Agro Limited'}
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
                <Text style={styles.summaryDataLabel}>Product(s):</Text>
                <Text style={styles.summaryDataValue} numberOfLines={1}>
                  {dealProductBlocks.filter(b => b.selectedProduct).map(b => `${b.selectedProduct} (${b.quantity} ${b.selectedUnitObj?.shortName || 'unit'})`).join(', ') || selectedProduct || 'None'}
                </Text>
              </View>

              <View style={styles.summaryDataRow}>
                <Text style={styles.summaryDataLabel}>Total Subtotal:</Text>
                <Text style={styles.summaryDataValue}>
                  ₹{dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).subtotal, 0).toLocaleString('en-IN')}
                </Text>
              </View>

              {dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).discountVal, 0) > 0 && (
                <View style={styles.summaryDataRow}>
                  <Text style={styles.summaryDataLabel}>Total Discount:</Text>
                  <Text style={[styles.summaryDataValue, { color: '#DC2626' }]}>
                    -₹{dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).discountVal, 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              {dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).gstAmount, 0) > 0 && (
                <View style={styles.summaryDataRow}>
                  <Text style={styles.summaryDataLabel}>Total GST Amount:</Text>
                  <Text style={styles.summaryDataValue}>
                    +₹{dealProductBlocks.reduce((acc, b) => acc + calculateBlockFinancials(b).gstAmount, 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              <View style={styles.totalValueHighlightBox}>
                <Text style={styles.totalValueHighlightLabel}>Grand Contract Total:</Text>
                <Text style={styles.totalValueHighlightVal}>{formatIndianCurrency(totalValue)}</Text>
              </View>

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

      {/* ─── BOTTOM STICKY ACTION FOOTER BAR ─── */}
      <View style={styles.bottomActionFooter}>
        {currentStep === 1 && (
          <View style={styles.twoBtnActionRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.3 }}>
                SELECTED PARTIES
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                {(sellerParty ? 1 : 0) + (buyerParty ? 1 : 0)} / 2 Selected
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { flex: 1.6, backgroundColor: COLORS.primary },
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
              style={[styles.primaryActionBtn, { flex: 1, backgroundColor: COLORS.primary }]}
              onPress={() => {
                const hasValidBlock = dealProductBlocks.some(b => b.selectedProduct && parseFloat(b.quantity) > 0 && parseFloat(b.rate) > 0);
                if (!hasValidBlock) {
                  setFormError('Please select a commodity product and fill Quantity & Rate');
                  return;
                }
                setFormError('');
                setCurrentStep(3);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionBtnText}>Review & Sign</Text>
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
                { flex: 1, backgroundColor: COLORS.primary },
                (!sellerParty || !buyerParty || isLoading) && styles.actionBtnDisabled,
              ]}
              disabled={!sellerParty || !buyerParty || isLoading}
              onPress={handleCreateSauda}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryActionBtnText}>🚀 Issue Sauda Contract</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── PRODUCT PICKER BOTTOM SHEET MODAL (Replaces Chip Wall) ─── */}
      <Modal
        visible={productPickerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProductPickerModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 }} />

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Box size={18} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Select Commodity Product</Text>
              </View>
              <TouchableOpacity
                onPress={() => setProductPickerModalVisible(false)}
                style={{ padding: 4 }}
              >
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Local Search Bar */}
            <View style={styles.contactSearchBarContainer}>
              <Search size={16} color={COLORS.textPlaceholder} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.contactSearchInput}
                placeholder="Search products by name..."
                placeholderTextColor={COLORS.textPlaceholder}
                value={productPickerSearchQuery}
                onChangeText={setProductPickerSearchQuery}
              />
              {productPickerSearchQuery ? (
                <TouchableOpacity onPress={() => setProductPickerSearchQuery('')}>
                  <X size={15} color={COLORS.textPlaceholder} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={sellerProducts.filter(p => {
                const name = typeof p === 'string' ? p : p.name;
                return String(name || '').toLowerCase().includes(productPickerSearchQuery.toLowerCase());
              })}
              keyExtractor={(item, index) => (typeof item === 'object' ? item._id || item.id || String(index) : String(index))}
              contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const pName = typeof item === 'string' ? item : item.name;
                const pId = typeof item === 'object' ? (item._id || item.id || '') : '';
                const hsn = typeof item === 'object' ? item.hsnCode : '';
                const unitName = typeof item === 'object' && item.unitId ? (item.unitId.shortName || item.unitId.name || '') : '';
                return (
                  <TouchableOpacity
                    style={styles.productPickerListItem}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (activeProductBlockId) {
                        handleUpdateProductBlock(activeProductBlockId, 'selectedProduct', pName);
                        handleUpdateProductBlock(activeProductBlockId, 'selectedProductId', pId);
                      }
                      setProductPickerModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productPickerItemName}>{pName}</Text>
                      {hsn || unitName ? (
                        <Text style={styles.productPickerItemSub}>
                          {[hsn ? `HSN ${hsn}` : '', unitName].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    {renderProductStatusBadge(typeof item === 'object' ? item : null)}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>No matching products found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ─── ALERT MODAL ─── */}
      <Modal
        visible={alertModalConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertModalConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.alertCard}>
            <CheckCircle2 size={38} color={COLORS.success} style={{ marginBottom: 12 }} />
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
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 }} />

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                  <Building2 size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Select {companySelectTarget?.role} Company</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{companySelectTarget?.user?.name || 'User'} · {availableCompaniesList.length} companies found</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setCompanySelectModalVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
              >
                <X size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

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
                    </View>
                    <View style={{ paddingLeft: 8, alignItems: 'center', gap: 4 }}>
                      <View style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Select</Text>
                      </View>
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
          <View style={[styles.bottomSheetContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookUser size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Choose {targetRoleForContacts} Contact</Text>
              </View>
              <TouchableOpacity onPress={() => setContactsModalVisible(false)}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* CONTACTS FILTER TABS */}
            <View style={styles.contactFilterTabsRow}>
              <TouchableOpacity
                style={[
                  styles.contactFilterTabBtn,
                  contactsActiveTab === 'all' && styles.contactFilterTabBtnActive,
                ]}
                onPress={() => setContactsActiveTab('all')}
              >
                <Text
                  style={[
                    styles.contactFilterTabText,
                    contactsActiveTab === 'all' && styles.contactFilterTabTextActive,
                  ]}
                >
                  All ({deviceContacts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.contactFilterTabBtn,
                  contactsActiveTab === 'registered' && styles.contactFilterTabBtnActiveGreen,
                ]}
                onPress={() => setContactsActiveTab('registered')}
              >
                <ShieldCheck size={13} color={contactsActiveTab === 'registered' ? '#15803D' : '#64748B'} style={{ marginRight: 4 }} />
                <Text
                  style={[
                    styles.contactFilterTabText,
                    contactsActiveTab === 'registered' && styles.contactFilterTabTextActiveGreen,
                  ]}
                >
                  On Pravisti ({deviceContacts.filter(c => c.isRegistered).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.contactFilterTabBtn,
                  contactsActiveTab === 'unregistered' && styles.contactFilterTabBtnActive,
                ]}
                onPress={() => setContactsActiveTab('unregistered')}
              >
                <Text
                  style={[
                    styles.contactFilterTabText,
                    contactsActiveTab === 'unregistered' && styles.contactFilterTabTextActive,
                  ]}
                >
                  Others
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactSearchBarContainer}>
              <Search size={16} color={COLORS.textPlaceholder} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.contactSearchInput}
                placeholder="Search by name, mobile or company..."
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
                  Checking Pravisti registered contacts...
                </Text>
              </View>
            ) : (
              <FlatList
                data={deviceContacts.filter(c => {
                  const q = contactSearchQuery.toLowerCase();
                  const matchSearch =
                    c.name.toLowerCase().includes(q) ||
                    c.mobile.includes(q) ||
                    (c.primaryCompanyName && c.primaryCompanyName.toLowerCase().includes(q));

                  if (!matchSearch) return false;
                  if (contactsActiveTab === 'registered') return c.isRegistered;
                  if (contactsActiveTab === 'unregistered') return !c.isRegistered;
                  return true;
                })}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingVertical: 4 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.contactItemCard,
                      item.isRegistered && styles.contactItemCardRegistered,
                    ]}
                    onPress={() => handleSelectContactItem(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.contactAvatarCircle,
                        item.isRegistered && styles.contactAvatarCircleRegistered,
                      ]}
                    >
                      <Text
                        style={[
                          styles.contactAvatarText,
                          item.isRegistered && styles.contactAvatarTextRegistered,
                        ]}
                      >
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={styles.contactItemName}>{item.name}</Text>
                        {item.isRegistered ? (
                          <View style={styles.pravistiBadgeSmall}>
                            <ShieldCheck size={11} color="#15803D" style={{ marginRight: 3 }} />
                            <Text style={styles.pravistiBadgeSmallText}>Pravisti User</Text>
                          </View>
                        ) : null}
                      </View>
                      {item.primaryCompanyName ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Building2 size={12} color="#059669" style={{ marginRight: 4 }} />
                          <Text style={styles.contactItemCompany} numberOfLines={1}>
                            {item.primaryCompanyName}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.contactItemPhone}>+91 {item.mobile}</Text>
                    </View>
                    <ChevronRight size={16} color={item.isRegistered ? '#059669' : COLORS.textPlaceholder} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                      {contactsActiveTab === 'registered'
                        ? 'No registered contacts found on Pravisti'
                        : 'No matching contacts found'}
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
              <View style={{ flex: 1, minWidth: 0 }}>
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
              <View style={{ flex: 1, minWidth: 0 }}>
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

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateProductModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}
                onPress={() => handleCreateProductForSeller(true)}
                disabled={isCreatingProduct}
              >
                <Text style={[styles.modalCancelBtnText, { color: '#334155' }]}>+ Save & Add Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1 }]}
                onPress={() => handleCreateProductForSeller(false)}
                disabled={isCreatingProduct}
              >
                {isCreatingProduct ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Save & Done</Text>
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
    backgroundColor: '#F8FAFC',
  },
  toastBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 14,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── 1. CLEAN COMPACT FINTECH HEADER ───
  topHeader: {
    height: 60,
    marginTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 10) : 6,
    paddingTop: Platform.OS === 'android' ? 8 : 2,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
  },

  // ─── 2. STEP INDICATOR ───
  stepperWrapper: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  circleConnectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepLinePending: {
    backgroundColor: '#E2E8F0',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepCirclePending: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  stepCircleNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepCircleNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  stepLabelCompleted: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepLabelPending: {
    color: '#64748B',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 130,
    gap: 16,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: '100%',
  },
  inlineErrorText: {
    fontSize: 13,
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
    elevation: 2,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 10,
  },
  cardHeaderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  cardSectionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
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

  /* ORIGINATING BROKER CARD */
  originatingBrokerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    width: '100%',
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
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  originatingBrokerName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  verifiedBlueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBlueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },

  /* SEARCH INPUT BOX */
  searchInputBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 10,
    width: '100%',
  },
  searchInputBoxText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    minWidth: 0,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  requiredStar: {
    color: COLORS.error,
  },

  /* CONTACTS BUTTON PILL */
  pickFromContactsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    marginTop: 8,
    width: '100%',
  },
  pickFromContactsPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  /* NOT FOUND STATE */
  notFoundCard: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    width: '100%',
  },
  notFoundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notFoundTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  notFoundDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  registerUserBtn: {
    backgroundColor: COLORS.indigo,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  registerUserBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* SELECTED PARTY PROFILE CARD */
  selectedPartyProfileCard: {
    backgroundColor: COLORS.successLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.successBorder,
    marginTop: 10,
    width: '100%',
  },
  profileCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBusinessName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileOwnerInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadgePillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeTextGreen: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  changePartyOutlineBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changePartyOutlineBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.error,
  },

  /* PRODUCT DROPDOWN & STATUS BADGES */
  productDropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    width: '100%',
  },
  placeholderProductText: {
    fontSize: 14,
    color: COLORS.textPlaceholder,
    fontWeight: '500',
  },
  selectedProductText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  inlineCreateCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 10,
    height: 38,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  inlineCreateCatalogBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  statusBadgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeVerifiedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  statusBadgeUnverified: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeUnverifiedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  statusBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeRejectedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B91C1C',
  },

  productPickerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFBFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 52,
  },
  productPickerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  productPickerItemSub: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* PRODUCT TAB CARDS */
  productTabBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  productTabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inlineActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyProductsCard: {
    backgroundColor: COLORS.bgMain,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    width: '100%',
  },
  emptyProductsTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  emptyProductsSub: { fontSize: 11.5, color: COLORS.textMuted, textAlign: 'center', marginTop: 2, marginBottom: 10 },
  createProductPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createProductPrimaryBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  formRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  fintechInput: {
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 50,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: '100%',
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 50,
    overflow: 'hidden',
    width: '100%',
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
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  currencyInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: '100%',
    minWidth: 0,
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
  productFinancialBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  netTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  addAnotherProductTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    borderStyle: 'dashed',
    width: '100%',
  },
  addAnotherProductTabBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.primary,
  },
  saudaGrandTotalCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    width: '100%',
  },

  // ─── SAUDA CONTRACT SUMMARY CARD ───
  summaryCardContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    elevation: 3,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    width: '100%',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  secureBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  secureBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
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
    fontSize: 12.5,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  summaryDataValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  totalValueHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 8,
  },
  totalValueHighlightLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  totalValueHighlightVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // ─── BOTTOM STICKY ACTION FOOTER BAR ───
  bottomActionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    zIndex: 99,
  },
  primaryActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  twoBtnActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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
  },
  secondaryOutlineBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // ─── MODALS & OVERLAYS ───
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
    fontWeight: '800',
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
    fontWeight: '800',
  },

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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    fontWeight: '800',
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
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  companySelectItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
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
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  companySelectItemAddr: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  companySelectItemGst: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },

  // Contact Picker
  contactFilterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  contactFilterTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  contactFilterTabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  contactFilterTabBtnActiveGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  contactFilterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  contactFilterTabTextActive: {
    color: '#FFFFFF',
  },
  contactFilterTabTextActiveGreen: {
    color: '#15803D',
  },
  contactSearchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
  },
  contactSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontWeight: '600',
    minWidth: 0,
  },
  contactItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgMain,
  },
  contactItemCardRegistered: {
    backgroundColor: '#F0FDF4',
    marginBottom: 4,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  contactAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarCircleRegistered: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  contactAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  contactAvatarTextRegistered: {
    color: '#15803D',
  },
  contactItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pravistiBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#86EFAC',
  },
  pravistiBadgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  contactItemCompany: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  contactItemPhone: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});

export default CreateBrokerDeal;
