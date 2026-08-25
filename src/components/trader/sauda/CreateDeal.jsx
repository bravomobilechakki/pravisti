import React, { useState } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  FileText,
  User,
  Briefcase,
  Building2,
  Handshake,
  Box,
  Calendar,
  Clock,
  ChevronRight,
  Plus,
  Send,
  Phone,
  BookUser,
  Search,
  UserPlus,
  X,
  MessageSquare,
} from 'lucide-react-native';
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
} from '../../../services/api';
import { Linking } from 'react-native';

const CreateDeal = ({ onNavigate, routeData }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [btnErrorMessage, setBtnErrorMessage] = useState('');
  const [dropdownSearchText, setDropdownSearchText] = useState('');
  const scrollViewRef = React.useRef(null);
  const pendingScrollProductId = React.useRef(null);

  // Defensive Prefill Mappings
  const prefillBuyer = routeData?.prefill?.buyerCompany || routeData?.prefill?.buyerCompanyId || routeData?.prefill?.party2 || {};
  const prefillBuyerName = prefillBuyer.companyName || prefillBuyer.name || (typeof prefillBuyer === 'string' ? '' : '') || routeData?.prefill?.party2?.name || routeData?.prefill?.buyerCompany?.name || '';

  // Form fields & Dates
  const [description, setDescription] = useState(routeData?.prefill?.description || routeData?.prefill?.notes || '');
  const [dealDate, setDealDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState(
    routeData?.prefill?.expiryDate
      ? new Date(routeData.prefill.expiryDate).toISOString().split('T')[0]
      : routeData?.prefill?.validityDate
        ? new Date(routeData.prefill.validityDate).toISOString().split('T')[0]
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Date Picker States
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickingForDate, setPickingForDate] = useState('deal');
  const [tempDate, setTempDate] = useState(new Date());

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Parties Selection
  const initialCompany = routeData?.originCompany || routeData?.company || (routeData?.companyId ? { _id: routeData.companyId, name: routeData.companyName } : null) || routeData?.user?.companies?.[0];
  const [party1, setParty1] = useState(initialCompany?.name || routeData?.companyName || 'My Company');
  const [party2, setParty2] = useState(routeData?.prefillParty2?.name || prefillBuyerName || '');
  const [party2Data, setParty2Data] = useState(
    routeData?.prefillParty2
      ? { ...routeData.prefillParty2, isRegistered: true }
      : (routeData?.prefill?.buyerCompanyId || routeData?.prefill?.buyerCompany || routeData?.prefill?.party2)
        ? {
          ...prefillBuyer,
          isRegistered: true,
          company: prefillBuyerName,
          companyId: prefillBuyer._id || prefillBuyer.id || prefillBuyer.companyId || (typeof prefillBuyer === 'string' ? prefillBuyer : undefined)
        }
        : null
  );




  // Broker-specific Prefill Mappings
  const prefillSeller = routeData?.prefill?.sellerCompany || routeData?.prefill?.sellerCompanyId || {};
  const prefillSellerName = prefillSeller.companyName || prefillSeller.name || '';

  const [sellerCompany, setSellerCompany] = useState(String(prefillSellerName || ''));
  const [sellerCompanyData, setSellerCompanyData] = useState(
    (routeData?.prefill?.sellerCompany || routeData?.prefill?.sellerCompanyId)
      ? {
        ...prefillSeller,
        isRegistered: true,
        company: prefillSellerName,
        companyId: prefillSeller._id || prefillSeller.id || prefillSeller.companyId || (typeof prefillSeller === 'string' ? prefillSeller : undefined)
      }
      : null
  );

  // Dynamic Identity Sync
  const [activeUserCompany, setActiveUserCompany] = useState(initialCompany);
  const [activeUserId, setActiveUserId] = useState(routeData?.user?._id || routeData?.user?.id);
  const originCompanyId = routeData?.companyId || activeUserCompany?._id || activeUserCompany?.id || activeUserCompany?.companyId || initialCompany?._id || initialCompany?.id;

  const getInitialRole = () => {
    const raw = String(routeData?.prefill?.role || routeData?.role || 'seller').toLowerCase();
    if (raw === 'buyer') return 'buyer';
    if (raw === 'broker') return 'broker';
    return 'seller';
  };
  const [role, setRole] = useState(getInitialRole);
  const [brokerCompanyId, setBrokerCompanyId] = useState(routeData?.prefill?.brokerCompanyId || '');
  const [brokerCompany, setBrokerCompany] = useState('');
  const [brokerCompanyData, setBrokerCompanyData] = useState(null);

  // Direct Mobile Search / Add States for Step 1
  const [directInputParty2, setDirectInputParty2] = useState('');
  const [directInputSeller, setDirectInputSeller] = useState('');
  const [directInputBroker, setDirectInputBroker] = useState('');
  const [directInputErrors, setDirectInputErrors] = useState({});
  const [lookupResults, setLookupResults] = useState({});

  // Master Data Loaded from API
  const [unitsList, setUnitsList] = useState([]);
  const [industriesList, setIndustriesList] = useState([]);
  const [userCompaniesList, setUserCompaniesList] = useState([]);
  const [currentUserMobile, setCurrentUserMobile] = useState('');
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  // Trader Assisted Onboarding Modal States for Unregistered Counterparty
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardRole, setOnboardRole] = useState('seller');
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
    unitId: '64d0a1b2c3d4e5f6a7b8c9df',
    hsnCode: '76011010',
    gstCode: 'GST_18',
    description: '',
  });
  const [onboardErrors, setOnboardErrors] = useState({});
  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);

  // Master Data Initial Load
  React.useEffect(() => {
    const loadMasterData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const userRes = await getUserProfile(token);
        if (userRes && userRes.success && userRes.data) {
          const u = userRes.data;
          setCurrentUserMobile(u.mobileNumber || u.phone || '');
          if (Array.isArray(u.companies)) {
            setUserCompaniesList(u.companies);
          }
        }

        try {
          const unitsRes = await getUnits('active', token);
          if (unitsRes && (unitsRes.success || Array.isArray(unitsRes.data))) {
            const list = Array.isArray(unitsRes.data) ? unitsRes.data : (unitsRes.data?.data || []);
            setUnitsList(list);
          }
        } catch (e) {
          console.warn('Units load error:', e);
        }

        try {
          const indRes = await getIndustries();
          if (indRes && (indRes.success || Array.isArray(indRes.data))) {
            const list = Array.isArray(indRes.data) ? indRes.data : (indRes.data?.data || []);
            setIndustriesList(list);
          }
        } catch (e) {
          console.warn('Industries load error:', e);
        }
      } catch (err) {
        console.warn('Master data load error:', err);
      }
    };
    loadMasterData();
  }, []);

  const openOnboardModalForRole = async (targetRole, contactData, nameVal) => {
    let currentIndustries = industriesList;
    if (!currentIndustries || currentIndustries.length === 0) {
      try {
        const indRes = await getIndustries();
        if (indRes && (indRes.success || Array.isArray(indRes.data))) {
          currentIndustries = Array.isArray(indRes.data) ? indRes.data : (indRes.data?.data || []);
          setIndustriesList(currentIndustries);
        }
      } catch (e) {
        console.warn('Industries load error:', e);
      }
    }

    const rawMob = contactData?.mobile || contactData?.phone || nameVal || '';
    const cleanMob = rawMob.replace(/\D/g, '');
    let searchedUser = null;

    if (cleanMob.length === 10) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const searchRes = await searchCounterpartyUser(`+91${cleanMob}`, token);
        if (searchRes && searchRes.success && searchRes.data) {
          searchedUser = searchRes.data.user || searchRes.data;
        }
      } catch (e) {
        console.warn('User search error:', e);
      }
    }

    let defaultName = searchedUser?.name || contactData?.name || '';
    // Do NOT pre-fill phone numbers into User Full Name field
    if (/^\+?\d+$/.test(defaultName.trim())) {
      defaultName = '';
    }

    const defaultMobile = cleanMob || (contactData?.mobile || contactData?.phone || '').replace(/^\+91/, '');
    const defaultCompany = contactData?.company || contactData?.companyName || '';
    const firstProdName = productsList[0]?.productName || '';
    const defaultIndustryId = currentIndustries[0]?._id || currentIndustries[0]?.id || '';
    const defaultUnitId = unitsList[0]?._id || unitsList[0]?.id || '64d0a1b2c3d4e5f6a7b8c9df';

    // Strict Role Resolution:
    let resolvedRole = 'seller';
    if (targetRole === 'seller' || targetRole === 'buyer' || targetRole === 'broker') {
      resolvedRole = targetRole;
    } else if (role === 'buyer') {
      resolvedRole = 'seller';
    } else if (role === 'seller' || role === 'broker') {
      resolvedRole = 'buyer';
    }

    setOnboardRole(resolvedRole);
    setOnboardStep(1);
    setOnboardForm({
      name: defaultName,
      mobileNumber: defaultMobile,
      companyName: defaultCompany,
      industryId: defaultIndustryId,
      registrationNumber: '',
      street: '',
      city: '',
      district: '',
      state: '',
      postalCode: '',
      country: 'India',
      productName: firstProdName,
      unitId: defaultUnitId,
      hsnCode: '76011010',
      gstCode: 'GST_18',
      description: '',
    });
    setOnboardErrors({});
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

  // Auto live company lookup when a 10-digit mobile number is typed
  React.useEffect(() => {
    const checkNumber = async (field, rawVal) => {
      const cleanDigits = rawVal.replace(/\D/g, '');
      if (cleanDigits.length === 10) {
        setLookupResults(prev => ({
          ...prev,
          [field]: { searching: true, companies: [], mobile: `+91${cleanDigits}` }
        }));
        try {
          const token = await AsyncStorage.getItem('userToken');
          const formattedNumber = `+91${cleanDigits}`;
          const response = await getCompaniesByNumber(formattedNumber, token);
          if (response && response.success && response.data && response.data.length > 0) {
            setLookupResults(prev => ({
              ...prev,
              [field]: {
                searching: false,
                companies: response.data,
                contactPersonName: response.data[0].contactPersonName || '',
                mobile: formattedNumber,
              }
            }));
          } else {
            setLookupResults(prev => ({
              ...prev,
              [field]: { searching: false, companies: [], mobile: formattedNumber, notFound: true }
            }));
            // Auto add contact & auto open registration modal popup
            handleDirectAddContact(field, cleanDigits);
            const targetRole = field === 'brokerCompany' ? 'broker' : (field === 'sellerCompany' ? 'seller' : (role === 'buyer' ? 'seller' : 'buyer'));
            openOnboardModalForRole(targetRole, null, cleanDigits);
          }
        } catch (e) {
          console.warn('Step 1 number lookup error:', e);
          setLookupResults(prev => ({ ...prev, [field]: null }));
        }
      } else {
        setLookupResults(prev => ({ ...prev, [field]: null }));
      }
    };

    const isAnyTenDigits = [directInputSeller, directInputParty2, directInputBroker].some(v => (v || '').replace(/\D/g, '').length === 10);
    const delay = isAnyTenDigits ? 0 : 350;

    const timer = setTimeout(() => {
      if (directInputSeller) checkNumber('sellerCompany', directInputSeller);
      if (directInputParty2) checkNumber('party2', directInputParty2);
      if (directInputBroker) checkNumber('brokerCompany', directInputBroker);
    }, delay);

    return () => clearTimeout(timer);
  }, [directInputSeller, directInputParty2, directInputBroker]);

  const handleSelectFoundCompany = (pickingFor, coObj, mobileNum) => {
    const companyId = coObj.companyId || coObj._id || coObj.id;
    const companyName = coObj.companyName || coObj.name || 'Registered Company';
    const personName = coObj.contactPersonName || coObj.name || companyName;

    const contactObj = {
      id: companyId || `reg_${Date.now()}`,
      companyId: companyId,
      name: personName,
      company: companyName,
      mobile: mobileNum,
      isRegistered: true,
    };

    if (pickingFor === 'party2') {
      setParty2(companyName);
      setParty2Data(contactObj);
      setDirectInputParty2('');
      setLookupResults(prev => ({ ...prev, party2: null }));
      setFieldErrors(prev => ({ ...prev, party2: undefined }));
      setDirectInputErrors(prev => ({ ...prev, party2: undefined }));
    } else if (pickingFor === 'sellerCompany') {
      setSellerCompany(companyName);
      setSellerCompanyData(contactObj);
      setDirectInputSeller('');
      setLookupResults(prev => ({ ...prev, sellerCompany: null }));
      setFieldErrors(prev => ({ ...prev, sellerCompany: undefined }));
      setDirectInputErrors(prev => ({ ...prev, sellerCompany: undefined }));
    } else if (pickingFor === 'brokerCompany') {
      setBrokerCompany(companyName);
      setBrokerCompanyData(contactObj);
      setBrokerCompanyId(String(companyId || ''));
      setDirectInputBroker('');
      setLookupResults(prev => ({ ...prev, brokerCompany: null }));
    }
  };

  const handleDirectAddContact = (pickingFor, rawInput) => {
    if (!rawInput || !rawInput.trim()) return;
    const trimmed = rawInput.trim();
    const cleanDigits = trimmed.replace(/\D/g, '');

    // If digits are present, enforce strict 10-digit mobile validation
    if (cleanDigits.length > 0) {
      if (cleanDigits.length !== 10) {
        setDirectInputErrors(prev => ({
          ...prev,
          [pickingFor]: `Please enter full 10-digit mobile number (${cleanDigits.length}/10 digits)`
        }));
        return;
      }
      if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
        setDirectInputErrors(prev => ({
          ...prev,
          [pickingFor]: 'Mobile number must start with 6, 7, 8, or 9'
        }));
        return;
      }
    }

    setDirectInputErrors(prev => ({ ...prev, [pickingFor]: undefined }));
    const formattedMobile = cleanDigits.length === 10 ? `+91${cleanDigits}` : trimmed;
    const contactObj = {
      id: `manual_${Date.now()}`,
      name: trimmed,
      mobile: formattedMobile,
      isRegistered: false,
    };

    if (pickingFor === 'party2') {
      setParty2(trimmed);
      setParty2Data(contactObj);
      setDirectInputParty2('');
      setFieldErrors(prev => ({ ...prev, party2: undefined }));
    } else if (pickingFor === 'sellerCompany') {
      setSellerCompany(trimmed);
      setSellerCompanyData(contactObj);
      setDirectInputSeller('');
      setFieldErrors(prev => ({ ...prev, sellerCompany: undefined }));
    } else if (pickingFor === 'brokerCompany') {
      setBrokerCompany(trimmed);
      setBrokerCompanyData(contactObj);
      setDirectInputBroker('');
      setBrokerCompanyId('');
    }
  };

  // Multi-product state
  const prefillProducts = routeData?.prefill?.products || [];

  const getInitialProductsList = () => {
    if (prefillProducts.length > 0) {
      return prefillProducts.map((p, idx) => ({
        id: Date.now() + idx + Math.random(),
        productName: p.productId?.name || p.name || (typeof p === 'string' ? p : '') || '',
        quantity: String(p.quantity || ''),
        price: String(p.price || ''),
        gst: String(p.gst || ''),
        discount: String(p.discount || ''),
        paymentTerms: p.paymentTerms || '',
        showProductDropdown: false,
        showAdditionalDetails: false,
      }));
    }

    // Check if there is single product prefill
    const prefillProd = routeData?.prefill?.products?.[0] || routeData?.prefill?.product || {};
    const prefillProductName = prefillProd.productId?.name || prefillProd.name || (typeof prefillProd === 'string' ? prefillProd : '') || routeData?.prefill?.product || routeData?.prefill?.productName || '';
    const prefillQty = prefillProd.quantity || routeData?.prefill?.qty || '';
    const prefillPrice = prefillProd.price || routeData?.prefill?.price || '';

    if (prefillProductName || prefillQty || prefillPrice) {
      return [{
        id: Date.now() + Math.random(),
        productName: String(prefillProductName || ''),
        quantity: String(prefillQty || ''),
        price: String(prefillPrice || ''),
        gst: String(prefillProd.gst || routeData?.prefill?.gst || ''),
        discount: String(prefillProd.discount || routeData?.prefill?.discount || ''),
        paymentTerms: prefillProd.paymentTerms || routeData?.prefill?.paymentTerms || '',
        showProductDropdown: false,
        showAdditionalDetails: false,
      }];
    }

    // Default empty item
    return [{
      id: Date.now(),
      productName: '',
      quantity: '',
      price: '',
      gst: '',
      discount: '',
      paymentTerms: '',
      showProductDropdown: false,
      showAdditionalDetails: false,
    }];
  };

  const [productsList, setProductsList] = useState(getInitialProductsList());
  const [activeTabId, setActiveTabId] = useState(productsList[0]?.id || Date.now());

  const addProductItem = () => {
    const newId = Date.now() + Math.random();
    pendingScrollProductId.current = newId;
    setProductsList(prev => [
      ...prev,
      {
        id: newId,
        productName: '',
        quantity: '',
        price: '',
        gst: '',
        discount: '',
        paymentTerms: '',
        showProductDropdown: false,
        showAdditionalDetails: false,
      }
    ]);
    setActiveTabId(newId);
  };

  const removeProductItem = (id) => {
    if (productsList.length > 1) {
      setProductsList(prev => {
        const remaining = prev.filter(item => item.id !== id);
        if (activeTabId === id) {
          setActiveTabId(remaining[0]?.id);
        }
        return remaining;
      });
    }
  };

  const updateProductField = (id, field, value) => {
    setProductsList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const updateProductFields = (id, fieldsObj) => {
    setProductsList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, ...fieldsObj };
      }
      return item;
    }));
  };

  const handleProductNameChange = (id, value) => {
    updateProductField(id, 'productName', value);
  };

  // Keep role stable as selected by user or initialized from routeData


  // Company Product Inventory Sync
  const [companyProducts, setCompanyProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  React.useEffect(() => {
    const fetchCompanyInventory = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const combinedProducts = [];
        const seenIds = new Set();
        const seenNames = new Set();

        const addProducts = (resObj) => {
          if (!resObj) return;
          const prodList = Array.isArray(resObj)
            ? resObj
            : (Array.isArray(resObj.data)
              ? resObj.data
              : (resObj.data && Array.isArray(resObj.data.data) ? resObj.data.data : []));

          prodList.forEach(p => {
            const id = p._id || p.id;
            const name = String(p.name || '').trim().toLowerCase();
            if (id && !seenIds.has(String(id)) && name && !seenNames.has(name)) {
              seenIds.add(String(id));
              seenNames.add(name);
              combinedProducts.push(p);
            }
          });
        };

        // Determine target seller company ID based on current role
        let targetSellerCompanyId = null;

        if (role === 'buyer') {
          // When current user is Buyer, products MUST belong to the Seller (party2Data or sellerCompanyData)
          // DO NOT fetch Buyer's (activeUserCompany) products!
          targetSellerCompanyId =
            party2Data?.companyId ||
            party2Data?._id ||
            party2Data?.id ||
            sellerCompanyData?.companyId ||
            sellerCompanyData?._id ||
            sellerCompanyData?.id;
        } else if (role === 'seller') {
          // When current user is Seller, products belong to activeUserCompany
          targetSellerCompanyId =
            activeUserCompany?._id ||
            activeUserCompany?.id ||
            activeUserCompany?.companyId ||
            routeData?.companyId ||
            routeData?.company?._id ||
            routeData?.company?.id ||
            routeData?.originCompany?._id ||
            routeData?.originCompany?.id;
        } else if (role === 'broker') {
          // When current user is Broker, products belong to Seller Company
          targetSellerCompanyId =
            sellerCompanyData?.companyId ||
            sellerCompanyData?._id ||
            sellerCompanyData?.id ||
            party2Data?.companyId ||
            party2Data?._id ||
            party2Data?.id;
        }

        console.warn('DEBUG [targetSellerCompanyId]:', targetSellerCompanyId, 'role:', role);

        if (targetSellerCompanyId && targetSellerCompanyId !== 'undefined') {
          const resTarget = await getProducts(targetSellerCompanyId, token, undefined, undefined, undefined).catch(() => ({ success: true, data: [] }));
          if (resTarget && resTarget.success && resTarget.data) {
            addProducts(resTarget.data);
          }
        }

        // Merge locally created / newly onboarded seller products so they are not wiped out
        setCompanyProducts(prev => {
          const locallyOnboarded = (prev || []).filter(p => p.isNewlyOnboarded || (targetSellerCompanyId && String(p.companyId) === String(targetSellerCompanyId)));
          locallyOnboarded.forEach(p => {
            const id = p._id || p.id;
            const name = String(p.name || '').trim().toLowerCase();
            if (id && !seenIds.has(String(id)) && name && !seenNames.has(name)) {
              seenIds.add(String(id));
              seenNames.add(name);
              combinedProducts.unshift(p);
            }
          });
          return combinedProducts;
        });
      } catch (e) {
        console.warn('Failed to load company products:', e);
      }
    };
    fetchCompanyInventory();
  }, [activeUserCompany, party2Data, sellerCompanyData, role, routeData]);

  // Keep productsList clean so user can choose or add products manually

  React.useEffect(() => {
    const refreshIdentity = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userProfileRes = await getUserProfile(token);
        let userCompanies = [];
        if (userProfileRes && userProfileRes.success && userProfileRes.data) {
          setActiveUserId(userProfileRes.data._id || userProfileRes.data.id);
          userCompanies = userProfileRes.data.companies || [];
        }

        const routeCompanyId =
          routeData?.companyId ||
          routeData?.company?._id ||
          routeData?.company?.id ||
          routeData?.originCompany?._id ||
          routeData?.originCompany?.id;

        let targetCo = null;

        if (routeCompanyId) {
          targetCo = userCompanies.find(c => String(c._id || c.id) === String(routeCompanyId));
        }

        if (!targetCo && (routeData?.originCompany || routeData?.company)) {
          targetCo = routeData.originCompany || routeData.company;
        }

        if (!targetCo && routeCompanyId) {
          try {
            const compRes = await getCompanyDetails(routeCompanyId);
            if (compRes && compRes.success) {
              targetCo = compRes.data;
            }
          } catch (err) {
            console.warn('Failed to fetch company details:', err);
          }
        }

        if (!targetCo && !routeCompanyId) {
          const companiesRes = await getCompanies(1, 10);
          if (companiesRes && companiesRes.success && companiesRes.data?.companies?.length > 0) {
            targetCo = companiesRes.data.companies[0];
          }
        }

        if (!targetCo && !routeCompanyId && userCompanies.length > 0) {
          targetCo = userCompanies[0];
        }

        if (!targetCo && routeCompanyId) {
          targetCo = { _id: routeCompanyId };
        }

        if (targetCo) {
          setActiveUserCompany(targetCo);
          if (targetCo.name) {
            setParty1(targetCo.name);
          }
        }
      } catch (e) {
        console.warn("Identity refresh failed", e);
      }
    };
    refreshIdentity();

    if (routeData?.prefillParty2) {
      setParty2(routeData.prefillParty2.name);
      setParty2Data({ ...routeData.prefillParty2, isRegistered: true });
    }
    if (routeData?.existingParty2 && routeData?.pickingFor !== 'party2') {
      const p2Data = routeData.existingParty2;
      const p2Name = routeData.existingParty2Name || (p2Data?.isRegistered ? (p2Data?.company || p2Data?.name) : p2Data?.name);
      setParty2(p2Name);
      setParty2Data(p2Data);
    }
    if (routeData?.existingSellerCompany && routeData?.pickingFor !== 'sellerCompany') {
      const sData = routeData.existingSellerCompany;
      const sName = routeData.existingSellerCompanyName || (sData?.isRegistered ? (sData?.company || sData?.name) : sData?.name);
      setSellerCompany(sName);
      setSellerCompanyData(sData);
    }
    if (routeData?.existingBrokerCompany && routeData?.pickingFor !== 'brokerCompany') {
      const bData = routeData.existingBrokerCompany;
      const bName = routeData.existingBrokerCompanyName || (bData?.isRegistered ? (bData?.company || bData?.name) : bData?.name);
      setBrokerCompany(bName);
      setBrokerCompanyData(bData);
      const cid = bData?.companyId || bData?._id || bData?.id;
      if (cid) setBrokerCompanyId(String(cid));
    }
    if (routeData?.selectedContact) {
      const contact = routeData.selectedContact;
      if (routeData.pickingFor === 'party2') {
        setParty2(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setParty2Data(contact);
      } else if (routeData.pickingFor === 'sellerCompany') {
        setSellerCompany(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setSellerCompanyData(contact);
      } else if (routeData.pickingFor === 'brokerCompany') {
        setBrokerCompany(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setBrokerCompanyData(contact);
        const cid = contact.companyId || contact._id || contact.id;
        if (cid) {
          setBrokerCompanyId(String(cid));
        } else {
          setBrokerCompanyId('');
        }
      }
    }
  }, [routeData]);

  const openDatePicker = (type) => {
    setPickingForDate(type);
    const currentDate = type === 'deal' ? new Date(dealDate) : new Date(validityDate);
    setTempDate(currentDate);
    setIsDatePickerVisible(true);
  };

  const confirmDateSelection = () => {
    const formatted = tempDate.toISOString().split('T')[0];
    if (pickingForDate === 'deal') setDealDate(formatted);
    else setValidityDate(formatted);
    setIsDatePickerVisible(false);
  };

  const navigateToContactPicker = (pickingFor) => {
    onNavigate('ContactPicker', {
      pickingFor,
      companyId: activeUserCompany?._id || activeUserCompany?.id || activeUserCompany?.companyId || routeData?.companyId,
      companyName: activeUserCompany?.name || party1 || routeData?.companyName,
      role: role,
      originCompany: routeData?.originCompany || (activeUserCompany?.name ? activeUserCompany : undefined),
      company: routeData?.company || (activeUserCompany?.name ? activeUserCompany : undefined),
      prefill: routeData?.prefill,
      existingParty2: party2Data,
      existingParty2Name: party2,
      existingSellerCompany: sellerCompanyData,
      existingSellerCompanyName: sellerCompany,
      existingBrokerCompany: brokerCompanyData,
      existingBrokerCompanyName: brokerCompany,
    });
  };

  const resolveProductId = async (name, companyId, token, existingId) => {
    if (existingId) return existingId;
    if (!name) return '64d0a1b2c3d4e5f6a7b8c9df';
    try {
      if (companyId && companyId !== 'undefined') {
        const productsRes = await getProducts(companyId, token, undefined, undefined, undefined).catch(() => null);
        const prodList = productsRes && (Array.isArray(productsRes.data)
          ? productsRes.data
          : (productsRes.data && Array.isArray(productsRes.data.data) ? productsRes.data.data : []));

        if (prodList && prodList.length > 0) {
          const matched = prodList.find(
            p => String(p.name || '').toLowerCase().trim() === String(name).toLowerCase().trim()
          );
          if (matched) return matched._id || matched.id;
        }

        let categoryId = null;
        const categoriesRes = await getCategories(companyId, token).catch(() => null);
        if (categoriesRes && categoriesRes.success && categoriesRes.data && categoriesRes.data.length > 0) {
          categoryId = categoriesRes.data[0]._id || categoriesRes.data[0].id;
        } else {
          const catRes = await createCategory({ name: 'General', companyId }, token).catch(() => null);
          if (catRes && catRes.success && catRes.data) {
            categoryId = catRes.data._id || catRes.data.id;
          }
        }

        if (categoryId) {
          const defaultUnit = unitsList[0]?._id || unitsList[0]?.id || '64d0a1b2c3d4e5f6a7b8c9df';
          const productPayload = {
            name,
            categoryId,
            unitId: defaultUnit,
            companyId,
            description: 'Dynamically created product for deal invitation',
          };
          const newProductRes = await createProduct(productPayload, token).catch(() => null);
          if (newProductRes && newProductRes.success && newProductRes.data) {
            return newProductRes.data._id || newProductRes.data.id;
          }
        }
      }
    } catch (error) {
      console.warn('Notice: Dynamic product resolution fallback used for:', name, error);
    }
    return '64d0a1b2c3d4e5f6a7b8c9df';
  };

  const handleExecuteOnboard = async () => {
    if (!onboardForm.name.trim()) {
      setOnboardErrors({ name: 'Name is required' });
      return;
    }
    const cleanMobile = onboardForm.mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setOnboardErrors({ mobileNumber: 'Valid 10-digit mobile number required' });
      return;
    }
    if (!onboardForm.companyName.trim()) {
      setOnboardErrors({ companyName: 'Company Name is required' });
      return;
    }

    setIsOnboardingSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        role: onboardRole,
        name: onboardForm.name.trim(),
        mobileNumber: `+91${cleanMobile}`,
        brokerCompanyId: (role === 'broker' || activeUserCompany?._id) ? String(activeUserCompany?._id || originCompanyId) : undefined,
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
        ...(onboardRole === 'seller' ? {
          products: [
            {
              name: onboardForm.productName || productsList[0]?.productName || 'Commodity Product',
              unitId: onboardForm.unitId || '64d0a1b2c3d4e5f6a7b8c9df',
              description: onboardForm.description || '',
              hsnCode: onboardForm.hsnCode || '76011010',
              gstCode: onboardForm.gstCode || 'GST_18',
            }
          ]
        } : {
          products: []
        })
      };

      const response = await assistedCreatePartyAccount(payload, token);
      if (response && (response.success || response.statusCode === 201 || response.data)) {
        const data = response.data || {};
        const newCompany = data.company || {};
        const newCompanyId = newCompany.id || newCompany._id;
        const newCompanyName = newCompany.name || onboardForm.companyName;
        const newProducts = data.products || [];
        const newProductId = newProducts[0]?.id || newProducts[0]?._id;

        setShowOnboardModal(false);

        if (onboardRole === 'seller') {
          setSellerCompany(newCompanyName);
          setSellerCompanyData({
            id: newCompanyId,
            companyId: newCompanyId,
            name: newCompanyName,
            isRegistered: true,
          });
          setParty2(newCompanyName);
          setParty2Data({
            id: newCompanyId,
            companyId: newCompanyId,
            name: newCompanyName,
            isRegistered: true,
          });

          const onboardedProductName = newProducts[0]?.name || onboardForm.productName || 'Commodity Product';
          const onboardedProdId = newProductId || `onboarded_prod_${Date.now()}`;

          const createdProdObj = {
            _id: onboardedProdId,
            id: onboardedProdId,
            name: onboardedProductName,
            productName: onboardedProductName,
            companyId: newCompanyId,
            isNewlyOnboarded: true,
          };

          setCompanyProducts(prev => [createdProdObj, ...(prev || []).filter(p => p.id !== onboardedProdId)]);

          // Pre-fill productsList[0] if current product name is empty or default
          setProductsList(prev => {
            if (!prev || prev.length === 0) {
              return [{
                id: Date.now(),
                productName: onboardedProductName,
                productId: onboardedProdId,
                quantity: '',
                price: '',
                gst: '',
                discount: '',
                paymentTerms: '',
                showProductDropdown: false,
                showAdditionalDetails: false,
              }];
            }
            if (prev.length > 0 && (!prev[0].productName || !prev[0].productName.trim())) {
              const updated = [...prev];
              updated[0] = {
                ...updated[0],
                productName: onboardedProductName,
                productId: onboardedProdId,
              };
              return updated;
            }
            return prev;
          });
        } else if (onboardRole === 'broker') {
          setBrokerCompany(newCompanyName);
          setBrokerCompanyData({
            id: newCompanyId,
            companyId: newCompanyId,
            name: newCompanyName,
            isRegistered: true,
          });
          setBrokerCompanyId(String(newCompanyId || ''));
        } else {
          setParty2(newCompanyName);
          setParty2Data({
            id: newCompanyId,
            companyId: newCompanyId,
            name: newCompanyName,
            isRegistered: true,
          });
        }

        setFieldErrors({});
        setBtnErrorMessage('');
      } else {
        Alert.alert('Onboarding Failed', response?.message || 'Could not onboard party.');
      }
    } catch (err) {
      Alert.alert('Onboarding Error', err.message || 'Failed to complete party onboarding.');
    } finally {
      setIsOnboardingSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const activeProducts = productsList.filter(prod =>
      (prod.productName && String(prod.productName).trim()) ||
      (prod.quantity && String(prod.quantity).trim()) ||
      (prod.price && String(prod.price).trim())
    );

    if (activeProducts.length === 0) {
      setBtnErrorMessage('Add at least one product');
      setTimeout(() => setBtnErrorMessage(''), 3000);
      return;
    }

    const errors = {};
    activeProducts.forEach((prod) => {
      const prodErrors = {};
      if (!prod.productName || !String(prod.productName).trim()) prodErrors.productName = 'Product name is required';
      if (!prod.quantity || !String(prod.quantity).trim()) prodErrors.quantity = 'Quantity is required';
      if (!prod.price || !String(prod.price).trim()) prodErrors.price = 'Price is required';

      if (Object.keys(prodErrors).length > 0) {
        errors[`product_${prod.id}`] = prodErrors;
      }
    });

    if (role === 'broker') {
      if (!party2) errors.party2 = 'Please select a buyer company';
      if (!sellerCompany) errors.sellerCompany = 'Please select a seller company';
    } else {
      if (!party2) errors.party2 = `Please select a ${role === 'buyer' ? 'seller' : 'buyer'} company`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      let firstMsg = 'Complete required fields';
      if (role === 'broker') {
        if (!party2) firstMsg = 'Select Buyer';
        else if (!sellerCompany) firstMsg = 'Select Seller';
      } else if (!party2) {
        firstMsg = `Select ${role === 'buyer' ? 'Seller' : 'Buyer'}`;
      } else {
        const firstErrProdId = Object.keys(errors).find(k => k.startsWith('product_'));
        if (firstErrProdId) {
          const prodErrs = errors[firstErrProdId];
          if (prodErrs.productName) firstMsg = 'Product name required';
          else if (prodErrs.quantity) firstMsg = 'Quantity required';
          else if (prodErrs.price) firstMsg = 'Price required';
        }
      }
      setBtnErrorMessage(firstMsg);
      setTimeout(() => setBtnErrorMessage(''), 3000);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      const originCompanyId = activeUserCompany?._id || activeUserCompany?.id || '6a0d784381e9215467e6d3e2';
      const userId = activeUserId || '6a0d77b581e9215467e6d3c8';

      if (!userId || !originCompanyId) {
        Alert.alert('Identity Error', 'Missing your company identity to establish agreement.');
        setIsSubmitting(false);
        return;
      }

      const getValidCompanyId = (data, fallback) => {
        if (data && data.isRegistered === false) return undefined;
        if (data && (data.companyId || data._id || data.id)) {
          const cid = String(data.companyId || data._id || data.id);
          if (cid.length === 24 && !cid.startsWith('manual_')) return cid;
        }
        if (fallback && typeof fallback === 'string' && fallback.length === 24 && !fallback.startsWith('manual_')) return fallback;
        return undefined;
      };

      const activeRole = String(role || 'seller').toLowerCase();
      const validRole = (activeRole === 'buyer' || activeRole === 'broker') ? activeRole : 'seller';

      const resolvedSellerId = validRole === 'seller'
        ? originCompanyId
        : validRole === 'buyer'
          ? getValidCompanyId(party2Data, party2)
          : getValidCompanyId(sellerCompanyData, sellerCompany);

      const resolvedBuyerId = validRole === 'seller'
        ? getValidCompanyId(party2Data, party2)
        : validRole === 'buyer'
          ? originCompanyId
          : getValidCompanyId(party2Data, party2);

      const isSellerUnregistered = validRole === 'broker'
        ? sellerCompanyData?.isRegistered === false || !resolvedSellerId
        : validRole === 'buyer'
          ? party2Data?.isRegistered === false || !resolvedSellerId
          : false;

      const isBuyerUnregistered = validRole === 'seller'
        ? party2Data?.isRegistered === false || !resolvedBuyerId
        : validRole === 'broker'
          ? party2Data?.isRegistered === false || !resolvedBuyerId
          : false;

      const isBrokerUnregistered = brokerCompanyData?.isRegistered === false;

      if ((isSellerUnregistered || isBuyerUnregistered || isBrokerUnregistered) && !showOnboardModal) {
        const targetRole = isBrokerUnregistered
          ? 'broker'
          : isSellerUnregistered
            ? 'seller'
            : 'buyer';

        const targetContact = isBrokerUnregistered
          ? brokerCompanyData
          : isSellerUnregistered
            ? (sellerCompanyData || party2Data)
            : party2Data;

        openOnboardModalForRole(targetRole, targetContact, targetContact?.name || party2 || brokerCompany);
        setIsSubmitting(false);
        return;
      }

      const sellerIdForProduct = resolvedSellerId || originCompanyId;

      let totalAmountValue = 0;
      let totalDiscountValue = 0;

      // Resolve and map all products in the active products list (preserving decimals)
      const resolvedProducts = await Promise.all(activeProducts.map(async (prod) => {
        const numericQuantity = Number(prod.quantity);
        const numericPrice = Number(prod.price);
        const numericDiscount = Number(prod.discount || 0);
        const numericGst = Number(prod.gst || 0);

        const subtotal = numericQuantity * numericPrice;
        const discountedSubtotal = subtotal - numericDiscount;
        const gstAmount = discountedSubtotal * (numericGst / 100);
        const netTotalAmount = discountedSubtotal + gstAmount;

        totalAmountValue += netTotalAmount;
        totalDiscountValue += numericDiscount;

        const resolvedProductId = await resolveProductId(prod.productName, sellerIdForProduct, token, prod.productId);

        return {
          productId: resolvedProductId,
          quantity: numericQuantity,
          price: numericPrice,
          paymentTerms: prod.paymentTerms || undefined,
          discount: prod.discount ? numericDiscount : 0,
          gst: prod.gst ? numericGst : 0,
          totalAmount: netTotalAmount,
        };
      }));

      if (isInviteMode) {
        let inviteContact = party2Data;
        if (party2Data?.isRegistered === false) {
          inviteContact = party2Data;
        } else if (validRole === 'broker' && sellerCompanyData?.isRegistered === false) {
          inviteContact = sellerCompanyData;
        }

        const receiverMobileNumber = inviteContact?.mobile || inviteContact?.phone || inviteContact?.mobileNumber || party2;
        const receiverName = inviteContact?.name || party2;

        const dealDraft = {
          role: validRole,
          products: resolvedProducts,
          totalAmount: Number(totalAmountValue),
          discount: Number(totalDiscountValue),
          expiryDate: new Date(validityDate).toISOString(),
          notes: description || 'Bulk trading Sauda ledger invitation.',
        };

        const invitePayload = {
          receiverMobileNumber,
          receiverName,
          dealDraft,
        };
        const response = await inviteDeal(invitePayload, token);
        if (response && response.success) {
          setShowSuccessModal(true);
          // Clear deals list cache so new invitation appears instantly
          try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith('trader_deals_cache_'));
            if (cacheKeys.length > 0) {
              await AsyncStorage.multiRemove(cacheKeys);
            }
          } catch (e) { }

          if (response.data?.whatsappUrl) {
            setTimeout(() => {
              Linking.openURL(response.data.whatsappUrl).catch(err => console.warn('Failed to open WhatsApp URL:', err));
            }, 800);
          }
          setTimeout(() => {
            setShowSuccessModal(false);
            onNavigate('DealsList', {
              companyId: originCompanyId,
              companyName: activeUserCompany?.name || party1,
              filter: 'All',
              refresh: true
            }, { refresh: true });
          }, 5000);
        } else {
          Alert.alert('Invite Error', response?.message || 'Failed to create deal invitation.');
        }
      } else {
        if (!resolvedSellerId || !resolvedBuyerId) {
          Alert.alert('Identity Error', 'Missing Buyer or Seller ID to establish agreement.');
          setIsSubmitting(false);
          return;
        }

        const targetCompanyId = validRole === 'seller' ? resolvedBuyerId : resolvedSellerId;

        const payload = {
          role: validRole,
          sellerCompanyId: resolvedSellerId,
          buyerCompanyId: resolvedBuyerId,
          myCompanyId: String(originCompanyId),
          targetCompanyId: targetCompanyId,
          brokerCompanyId: (brokerCompanyId && String(brokerCompanyId).length === 24) ? String(brokerCompanyId) : null,
          products: resolvedProducts,
          totalAmount: totalAmountValue,
          discount: totalDiscountValue,
          expiryDate: new Date(validityDate).toISOString(),
          notes: description || undefined,
        };

        let response;
        if (validRole === 'broker') {
          response = await createBrokerDraftDeal({
            sellerCompanyId: resolvedSellerId,
            buyerCompanyId: resolvedBuyerId,
            products: resolvedProducts,
            expiryDate: new Date(validityDate).toISOString(),
            notes: description || undefined,
          }, token);
        } else {
          response = await createDeal(payload, token);
        }

        if (response && response.success) {
          setShowSuccessModal(true);
          // Clear deals list cache so new deal appears instantly
          try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith('trader_deals_cache_'));
            if (cacheKeys.length > 0) {
              await AsyncStorage.multiRemove(cacheKeys);
            }
          } catch (e) { }

          const dealStatus = String(response.data?.status || '').toLowerCase();
          let targetFilter = 'Pending';
          if (dealStatus === 'draft' || validRole === 'broker') {
            targetFilter = 'Draft';
          } else if (dealStatus === 'active' || dealStatus === 'approved') {
            targetFilter = 'Active';
          }

          setTimeout(() => {
            setShowSuccessModal(false);
            onNavigate('DealsList', {
              companyId: originCompanyId,
              companyName: activeUserCompany?.name || party1,
              filter: 'All',
              refresh: true
            }, { refresh: true });
          }, 5000);
        }
      }
    } catch (error) {
      Alert.alert('Trade Error', error.message || 'Failed to establish the Sauda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return 'Select Date';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getTotals = () => {
    let totalQty = 0;
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGstAmount = 0;
    let finalTotal = 0;

    productsList.forEach(prod => {
      const q = Number(prod.quantity) || 0;
      const p = Number(prod.price) || 0;
      const d = Number(prod.discount) || 0;
      const g = Number(prod.gst) || 0;

      const prodSubtotal = q * p;
      const prodDiscounted = prodSubtotal - d;
      const prodGstAmount = prodDiscounted * (g / 100);

      totalQty += q;
      subtotal += prodSubtotal;
      totalDiscount += d;
      totalGstAmount += prodGstAmount;
      finalTotal += (prodDiscounted + prodGstAmount);
    });

    return {
      qty: totalQty,
      subtotal,
      discount: totalDiscount,
      gstAmount: totalGstAmount,
      total: finalTotal,
      isValid: productsList.some(prod => Number(prod.quantity) > 0 && Number(prod.price) > 0)
    };
  };

  const totals = getTotals();
  const showTicketStub = totals.isValid;
  const isInviteMode = party2Data?.isRegistered === false || (role === 'broker' && sellerCompanyData?.isRegistered === false) || (party2Data && (!party2Data.companyId || String(party2Data.companyId).length !== 24));

  const getRoleTheme = () => {
    if (role === 'buyer') return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', glow: '#D97706' };
    if (role === 'broker') return { color: '#475569', bg: '#FAF8F5', border: '#EADFC9', glow: '#475569' };
    return { color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', glow: '#4F46E5' };
  };
  const rTheme = getRoleTheme();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>

        {/* Premium Light Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Sauda Deal</Text>
            <Text style={styles.headerSubtitle}>Create a digital trade ledger</Text>
          </View>
          <View style={styles.headerBadge}>
            <FileText size={16} color="#0F172A" />
          </View>
        </View>

        {/* Elegant Wizard Progress Indicator */}
        <View style={styles.wizardProgressContainer}>
          <View style={styles.wizardStepCol}>
            <View style={[
              styles.wizardStepCircle,
              currentStep >= 1 && [styles.wizardStepCircleActive, { backgroundColor: rTheme.bg, borderColor: rTheme.color }]
            ]}>
              <Text style={[
                styles.wizardStepCircleText,
                currentStep >= 1 && [styles.wizardStepCircleTextActive, { color: rTheme.color }]
              ]}>1</Text>
            </View>
            <Text style={[
              styles.wizardStepLabel,
              currentStep === 1 && { color: rTheme.color, fontWeight: '800' }
            ]}>Partners</Text>
          </View>

          <View style={[styles.wizardStepLine, currentStep >= 2 && { backgroundColor: rTheme.color }]} />

          <View style={styles.wizardStepCol}>
            <View style={[
              styles.wizardStepCircle,
              currentStep >= 2 && [styles.wizardStepCircleActive, { backgroundColor: rTheme.bg, borderColor: rTheme.color }]
            ]}>
              <Text style={[
                styles.wizardStepCircleText,
                currentStep >= 2 && [styles.wizardStepCircleTextActive, { color: rTheme.color }]
              ]}>2</Text>
            </View>
            <Text style={[
              styles.wizardStepLabel,
              currentStep === 2 && { color: rTheme.color, fontWeight: '800' }
            ]}>Ledger & Terms</Text>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ═══════════ CARD 1: IDENTITY (STEP 1) ═══════════ */}
          {currentStep === 1 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#4F46E5' }]} />
                <Text style={styles.sectionTitle}>Identity & Trade Role</Text>
                <View style={styles.sectionBadgeContainer}>
                  <Text style={[styles.sectionBadge, { color: '#4F46E5', backgroundColor: '#EEF2FF' }]}>STEP 1</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {/* Role Selector */}
                <Text style={styles.fieldLabel}>Your Trade Role</Text>
                <View style={styles.roleContainer}>
                  {(activeUserCompany?.companyType?.toLowerCase() === 'broker' || activeUserCompany?.type?.toLowerCase() === 'broker' || routeData?.prefill?.role === 'broker' || routeData?.role === 'broker'
                    ? ['seller', 'buyer', 'broker']
                    : ['seller', 'buyer']
                  ).map((r) => {
                    const isActive = role === r;
                    const config = {
                      seller: { icon: <Building2 size={14} color={isActive ? '#FFFFFF' : '#64748B'} /> },
                      buyer: { icon: <User size={14} color={isActive ? '#FFFFFF' : '#64748B'} /> },
                      broker: { icon: <Briefcase size={14} color={isActive ? '#FFFFFF' : '#64748B'} /> },
                    }[r];

                    let activeBg = '#059669'; // Seller = Emerald
                    if (r === 'buyer') activeBg = '#D97706'; // Buyer = Amber
                    if (r === 'broker') activeBg = '#4F46E5'; // Broker = Indigo

                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleTab,
                          isActive ? {
                            backgroundColor: activeBg,
                            shadowColor: activeBg,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.25,
                            shadowRadius: 6,
                            elevation: 4,
                          } : {
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                          }
                        ]}
                        onPress={() => {
                          setRole(r);
                          setFieldErrors({});
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          {config.icon}
                          <Text style={[
                            styles.roleTabText,
                            { color: isActive ? '#FFFFFF' : '#475569' },
                            isActive && styles.roleTabTextActive
                          ]}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </Text>
                          {isActive && (
                            <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '900', marginLeft: 2 }}>✓</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Sleek Subtitle showing Own Company info instead of full card */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Trading as: </Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: rTheme.color }}>{party1}</Text>
                  <View style={{ marginLeft: 'auto', backgroundColor: rTheme.bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: rTheme.color }}>Verified Profile</Text>
                  </View>
                </View>

                {/* Seller Company Selector (Only for Broker) */}
                {role === 'broker' && (
                  <View style={[styles.inputGroup, { marginBottom: 16 }]}>
                    <Text style={styles.fieldLabel}>Seller Company*</Text>

                    {sellerCompany && sellerCompanyData ? (
                      <View style={{ gap: 8 }}>
                        <View
                          style={[
                            styles.profileCard,
                            {
                              borderColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#BBF7D0',
                              backgroundColor: '#FFFFFF',
                              shadowColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#059669',
                            }
                          ]}
                        >
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                            onPress={() => {
                              setFieldErrors(prev => ({ ...prev, sellerCompany: undefined }));
                              navigateToContactPicker('sellerCompany');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.profileAvatar, { backgroundColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#059669', shadowColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#059669' }]}>
                              <Text style={styles.profileAvatarText}>
                                {(sellerCompanyData.company || sellerCompany).charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.profileCardInfo}>
                              <Text style={styles.profileCardName}>
                                {sellerCompanyData.company ? `${sellerCompanyData.company} (${sellerCompanyData.name || sellerCompany})` : (sellerCompanyData.name || sellerCompany)}
                              </Text>
                              <Text style={[
                                styles.profileCardRole,
                                { color: sellerCompanyData.isRegistered === false ? '#D97706' : '#059669' }
                              ]}>
                                {sellerCompanyData.isRegistered === false ? 'NOT YET REGISTERED' : 'ON PRAVISTI'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TouchableOpacity
                              style={[
                                styles.profileCardBadge,
                                {
                                  backgroundColor: '#FEF2F2',
                                  borderColor: '#FCA5A5',
                                  borderWidth: 1,
                                }
                              ]}
                              onPress={() => {
                                setSellerCompany('');
                                setSellerCompanyData(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.profileCardBadgeText, { color: '#EF4444' }]}>Remove</Text>
                            </TouchableOpacity>
                            <Text style={[styles.changeText, { color: '#059669' }]}>Edit ›</Text>
                          </View>
                        </View>

                        {sellerCompanyData.isRegistered === false && (
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#059669',
                              paddingVertical: 10,
                              paddingHorizontal: 14,
                              borderRadius: 10,
                              alignItems: 'center',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              gap: 6,
                              marginTop: 8,
                              shadowColor: '#059669',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.15,
                              shadowRadius: 4,
                              elevation: 2,
                            }}
                            onPress={() => {
                              openOnboardModalForRole('seller', sellerCompanyData, sellerCompany);
                            }}
                            activeOpacity={0.8}
                          >
                            <UserPlus size={15} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                              Register & Onboard Seller Company
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View style={styles.step1DirectBox}>
                        <View style={[styles.step1SearchWrapper, (fieldErrors.sellerCompany || directInputErrors.sellerCompany) && styles.inputError]}>
                          <Phone size={14} color="#059669" style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.step1SearchInput}
                            placeholder="Type seller name or 10-digit mobile..."
                            placeholderTextColor="#94A3B8"
                            value={directInputSeller}
                            onChangeText={(text) => {
                              const isNum = /^\d/.test(text.trim()) || /^\+?91/.test(text.trim());
                              const val = isNum ? text.replace(/\D/g, '').slice(0, 10) : text;
                              setDirectInputSeller(val);
                              if (directInputErrors.sellerCompany) setDirectInputErrors(prev => ({ ...prev, sellerCompany: undefined }));
                            }}
                            keyboardType="phone-pad"
                            maxLength={/^\d/.test((directInputSeller || '').trim()) ? 10 : undefined}
                          />
                          <TouchableOpacity
                            style={[styles.step1AddBtn, { backgroundColor: '#059669' }]}
                            onPress={() => handleDirectAddContact('sellerCompany', directInputSeller)}
                            disabled={!directInputSeller.trim()}
                            activeOpacity={0.8}
                          >
                            <Plus size={13} color="#FFFFFF" style={{ marginRight: 2 }} />
                            <Text style={styles.step1AddBtnText}>Add</Text>
                          </TouchableOpacity>
                        </View>
                        {directInputErrors.sellerCompany && (
                          <Text style={styles.fieldErrorText}>⚠ {directInputErrors.sellerCompany}</Text>
                        )}

                        {/* Live Auto Search Loading / Results */}
                        {lookupResults.sellerCompany?.searching && (
                          <View style={styles.searchingRow}>
                            <ActivityIndicator size="small" color="#059669" />
                            <Text style={styles.searchingText}>Searching Pravisti registered exchange...</Text>
                          </View>
                        )}
                        {lookupResults.sellerCompany?.companies && lookupResults.sellerCompany.companies.length > 0 && (
                          <View style={styles.foundCompanyBox}>
                            <Text style={styles.foundCompanyTitle}>🏢 Registered Company Found:</Text>
                            {lookupResults.sellerCompany.companies.map((co, idx) => (
                              <TouchableOpacity
                                key={co.companyId || idx}
                                style={styles.foundCompanyItem}
                                onPress={() => handleSelectFoundCompany('sellerCompany', co, lookupResults.sellerCompany.mobile)}
                                activeOpacity={0.8}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.foundCompanyName}>{co.companyName || co.name}</Text>
                                  <Text style={styles.foundCompanySub}>
                                    {(co.companyType || 'Trader').toUpperCase()} • Contact: {co.contactPersonName || lookupResults.sellerCompany.mobile}
                                  </Text>
                                </View>
                                <View style={[styles.selectFoundBtn, { backgroundColor: '#059669' }]}>
                                  <Text style={styles.selectFoundBtnText}>Select ›</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        <View style={styles.orDividerRow}>
                          <View style={styles.orDividerLine} />
                          <Text style={styles.orDividerText}>OR</Text>
                          <View style={styles.orDividerLine} />
                        </View>

                        <TouchableOpacity
                          style={styles.directorySelectBtn}
                          onPress={() => {
                            setFocusedField('sellerCompany');
                            setFieldErrors(prev => ({ ...prev, sellerCompany: undefined }));
                            navigateToContactPicker('sellerCompany');
                          }}
                          activeOpacity={0.7}
                        >
                          <BookUser size={15} color="#059669" style={{ marginRight: 6 }} />
                          <Text style={[styles.directorySelectBtnText, { color: '#059669' }]}>Select from Contacts Directory</Text>
                          <ChevronRight size={15} color="#059669" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {fieldErrors.sellerCompany && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.sellerCompany}</Text>}
                  </View>
                )}

                {/* Buyer / Counterparty Selector */}
                <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                  <Text style={styles.fieldLabel}>
                    {role === 'broker' ? 'Buyer Company*' : role === 'buyer' ? 'Counterparty Seller*' : 'Counterparty Buyer*'}
                  </Text>

                  {party2 && party2Data ? (
                    (() => {
                      const isSellerCp = role === 'buyer';
                      const cpColor = isSellerCp ? '#059669' : '#0284C7';
                      const cpBg = isSellerCp ? '#E0FDF4' : '#E0F2FE';
                      const cpBorder = isSellerCp ? '#BBF7D0' : '#BAE6FD';

                      return (
                        <View style={{ gap: 8 }}>
                          <View
                            style={[
                              styles.profileCard,
                              {
                                borderColor: party2Data.isRegistered === false ? '#F59E0B' : cpBorder,
                                backgroundColor: '#FFFFFF',
                                shadowColor: party2Data.isRegistered === false ? '#F59E0B' : cpColor,
                              }
                            ]}
                          >
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                              onPress={() => {
                                setFieldErrors(prev => ({ ...prev, party2: undefined }));
                                navigateToContactPicker('party2');
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.profileAvatar, { backgroundColor: party2Data.isRegistered === false ? '#F59E0B' : cpColor, shadowColor: party2Data.isRegistered === false ? '#F59E0B' : cpColor }]}>
                                <Text style={styles.profileAvatarText}>
                                  {(party2Data.company || party2).charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.profileCardInfo}>
                                <Text style={styles.profileCardName}>
                                  {party2Data.company ? `${party2Data.company} (${party2Data.name || party2})` : (party2Data.name || party2)}
                                </Text>
                                <Text style={[
                                  styles.profileCardRole,
                                  { color: party2Data.isRegistered === false ? '#D97706' : cpColor }
                                ]}>
                                  {party2Data.isRegistered === false ? 'NOT YET REGISTERED' : 'ON PRAVISTI'}
                                </Text>
                              </View>
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <TouchableOpacity
                                style={[
                                  styles.profileCardBadge,
                                  {
                                    backgroundColor: '#FEF2F2',
                                    borderColor: '#FCA5A5',
                                    borderWidth: 1,
                                  }
                                ]}
                                onPress={() => {
                                  setParty2('');
                                  setParty2Data(null);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.profileCardBadgeText, { color: '#EF4444' }]}>Remove</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setFieldErrors(prev => ({ ...prev, party2: undefined }));
                                  navigateToContactPicker('party2');
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.changeText, { color: cpColor }]}>Edit ›</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {party2Data.isRegistered === false && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#2563EB',
                                paddingVertical: 10,
                                paddingHorizontal: 14,
                                borderRadius: 10,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 6,
                                shadowColor: '#2563EB',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 4,
                                elevation: 2,
                              }}
                              onPress={() => {
                                const targetRole = role === 'buyer' ? 'seller' : 'buyer';
                                openOnboardModalForRole(targetRole, party2Data, party2);
                              }}
                              activeOpacity={0.8}
                            >
                              <UserPlus size={15} color="#FFFFFF" />
                              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                                Register & Onboard {role === 'buyer' ? 'Seller' : 'Buyer'} Company
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })()
                  ) : (
                    (() => {
                      const isSellerCp = role === 'buyer';
                      const cpColor = isSellerCp ? '#059669' : '#0284C7';
                      const labelRole = role === 'broker' ? 'buyer' : role === 'buyer' ? 'seller' : 'buyer';

                      return (
                        <View style={styles.step1DirectBox}>
                          <View style={[styles.step1SearchWrapper, (fieldErrors.party2 || directInputErrors.party2) && styles.inputError]}>
                            <Phone size={14} color={cpColor} style={{ marginRight: 6 }} />
                            <TextInput
                              style={styles.step1SearchInput}
                              placeholder={`Type ${labelRole} name or 10-digit mobile...`}
                              placeholderTextColor="#94A3B8"
                              value={directInputParty2}
                              onChangeText={(text) => {
                                const isNum = /^\d/.test(text.trim()) || /^\+?91/.test(text.trim());
                                const val = isNum ? text.replace(/\D/g, '').slice(0, 10) : text;
                                setDirectInputParty2(val);
                                if (directInputErrors.party2) setDirectInputErrors(prev => ({ ...prev, party2: undefined }));
                              }}
                              keyboardType="phone-pad"
                              maxLength={/^\d/.test((directInputParty2 || '').trim()) ? 10 : undefined}
                            />
                            <TouchableOpacity
                              style={[styles.step1AddBtn, { backgroundColor: cpColor }]}
                              onPress={() => handleDirectAddContact('party2', directInputParty2)}
                              disabled={!directInputParty2.trim()}
                              activeOpacity={0.8}
                            >
                              <Plus size={13} color="#FFFFFF" style={{ marginRight: 2 }} />
                              <Text style={styles.step1AddBtnText}>Add</Text>
                            </TouchableOpacity>
                          </View>
                          {directInputErrors.party2 && (
                            <Text style={styles.fieldErrorText}>⚠ {directInputErrors.party2}</Text>
                          )}

                          {/* Live Auto Search Loading / Results */}
                          {lookupResults.party2?.searching && (
                            <View style={styles.searchingRow}>
                              <ActivityIndicator size="small" color={cpColor} />
                              <Text style={styles.searchingText}>Searching Pravisti registered exchange...</Text>
                            </View>
                          )}
                          {lookupResults.party2?.companies && lookupResults.party2.companies.length > 0 && (
                            <View style={[styles.foundCompanyBox, { borderColor: cpColor === '#059669' ? '#BBF7D0' : '#BAE6FD', backgroundColor: cpColor === '#059669' ? '#F0FDF4' : '#F0F9FF' }]}>
                              <Text style={[styles.foundCompanyTitle, { color: cpColor }]}>🏢 Registered Company Found:</Text>
                              {lookupResults.party2.companies.map((co, idx) => (
                                <TouchableOpacity
                                  key={co.companyId || idx}
                                  style={styles.foundCompanyItem}
                                  onPress={() => handleSelectFoundCompany('party2', co, lookupResults.party2.mobile)}
                                  activeOpacity={0.8}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.foundCompanyName}>{co.companyName || co.name}</Text>
                                    <Text style={styles.foundCompanySub}>
                                      {(co.companyType || 'Trader').toUpperCase()} • Contact: {co.contactPersonName || lookupResults.party2.mobile}
                                    </Text>
                                  </View>
                                  <View style={[styles.selectFoundBtn, { backgroundColor: cpColor }]}>
                                    <Text style={styles.selectFoundBtnText}>Select ›</Text>
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}

                          <View style={styles.orDividerRow}>
                            <View style={styles.orDividerLine} />
                            <Text style={styles.orDividerText}>OR</Text>
                            <View style={styles.orDividerLine} />
                          </View>

                          <TouchableOpacity
                            style={styles.directorySelectBtn}
                            onPress={() => {
                              setFocusedField('party2');
                              setFieldErrors(prev => ({ ...prev, party2: undefined }));
                              navigateToContactPicker('party2');
                            }}
                            activeOpacity={0.7}
                          >
                            <BookUser size={15} color={cpColor} style={{ marginRight: 6 }} />
                            <Text style={[styles.directorySelectBtnText, { color: cpColor }]}>Select from Contacts Directory</Text>
                            <ChevronRight size={15} color={cpColor} style={{ marginLeft: 'auto' }} />
                          </TouchableOpacity>
                        </View>
                      );
                    })()
                  )}
                  {fieldErrors.party2 && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.party2}</Text>}
                </View>

                {/* Broker Company Selector (Optional - only if role is not broker) */}
                {role !== 'broker' && (
                  <View style={[styles.inputGroup, { marginTop: 16, marginBottom: 0 }]}>
                    <Text style={styles.fieldLabel}>Broker Company (Optional)</Text>

                    {brokerCompany && brokerCompanyData ? (
                      <View style={{ gap: 8 }}>
                        <View
                          style={[
                            styles.profileCard,
                            {
                              borderColor: brokerCompanyData.isRegistered === false ? '#F59E0B' : '#DDD6FE',
                              backgroundColor: '#FFFFFF',
                              shadowColor: brokerCompanyData.isRegistered === false ? '#F59E0B' : '#7C3AED',
                            }
                          ]}
                        >
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                            onPress={() => {
                              navigateToContactPicker('brokerCompany');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.profileAvatar, { backgroundColor: brokerCompanyData.isRegistered === false ? '#F59E0B' : '#7C3AED', shadowColor: brokerCompanyData.isRegistered === false ? '#F59E0B' : '#7C3AED' }]}>
                              <Text style={styles.profileAvatarText}>
                                {(brokerCompanyData.company || brokerCompany).charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.profileCardInfo}>
                              <Text style={styles.profileCardName}>
                                {brokerCompanyData.company ? `${brokerCompanyData.company} (${brokerCompanyData.name || brokerCompany})` : (brokerCompanyData.name || brokerCompany)}
                              </Text>
                              <Text style={[
                                styles.profileCardRole,
                                { color: brokerCompanyData.isRegistered === false ? '#D97706' : '#7C3AED' }
                              ]}>
                                {brokerCompanyData.isRegistered === false ? 'NOT YET REGISTERED' : 'ON PRAVISTI'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TouchableOpacity
                              style={[
                                styles.profileCardBadge,
                                {
                                  backgroundColor: '#FEF2F2',
                                  borderColor: '#FCA5A5',
                                  borderWidth: 1,
                                }
                              ]}
                              onPress={() => {
                                setBrokerCompany('');
                                setBrokerCompanyData(null);
                                setBrokerCompanyId('');
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.profileCardBadgeText, { color: '#EF4444' }]}>Remove</Text>
                            </TouchableOpacity>
                            <Text style={[styles.changeText, { color: '#7C3AED' }]}>Edit ›</Text>
                          </View>
                        </View>

                        {brokerCompanyData.isRegistered === false && (
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#7C3AED',
                              paddingVertical: 10,
                              paddingHorizontal: 14,
                              borderRadius: 10,
                              alignItems: 'center',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              gap: 6,
                              marginTop: 8,
                              shadowColor: '#7C3AED',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.15,
                              shadowRadius: 4,
                              elevation: 2,
                            }}
                            onPress={() => {
                              openOnboardModalForRole('broker', brokerCompanyData, brokerCompany);
                            }}
                            activeOpacity={0.8}
                          >
                            <UserPlus size={15} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                              Register & Onboard Broker Company
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View style={styles.step1DirectBox}>
                        <View style={[styles.step1SearchWrapper, directInputErrors.brokerCompany && styles.inputError]}>
                          <Phone size={14} color="#7C3AED" style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.step1SearchInput}
                            placeholder="Type broker name or 10-digit mobile..."
                            placeholderTextColor="#94A3B8"
                            value={directInputBroker}
                            onChangeText={(text) => {
                              const isNum = /^\d/.test(text.trim()) || /^\+?91/.test(text.trim());
                              const val = isNum ? text.replace(/\D/g, '').slice(0, 10) : text;
                              setDirectInputBroker(val);
                              if (directInputErrors.brokerCompany) setDirectInputErrors(prev => ({ ...prev, brokerCompany: undefined }));
                            }}
                            keyboardType="phone-pad"
                            maxLength={/^\d/.test((directInputBroker || '').trim()) ? 10 : undefined}
                          />
                          <TouchableOpacity
                            style={[styles.step1AddBtn, { backgroundColor: '#7C3AED' }]}
                            onPress={() => handleDirectAddContact('brokerCompany', directInputBroker)}
                            disabled={!directInputBroker.trim()}
                            activeOpacity={0.8}
                          >
                            <Plus size={13} color="#FFFFFF" style={{ marginRight: 2 }} />
                            <Text style={styles.step1AddBtnText}>Add</Text>
                          </TouchableOpacity>
                        </View>
                        {directInputErrors.brokerCompany && (
                          <Text style={styles.fieldErrorText}>⚠ {directInputErrors.brokerCompany}</Text>
                        )}

                        <View style={styles.orDividerRow}>
                          <View style={styles.orDividerLine} />
                          <Text style={styles.orDividerText}>OR</Text>
                          <View style={styles.orDividerLine} />
                        </View>

                        <TouchableOpacity
                          style={styles.directorySelectBtn}
                          onPress={() => {
                            setFocusedField
                              ('brokerCompany');
                            navigateToContactPicker('brokerCompany');
                          }}
                          activeOpacity={0.7}
                        >
                          <BookUser size={15} color="#7C3AED" style={{ marginRight: 6 }} />
                          <Text style={[styles.directorySelectBtnText, { color: '#7C3AED' }]}>Select from Contacts Directory</Text>
                          <ChevronRight size={15} color="#7C3AED" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 1 Navigation Button */}
          {currentStep === 1 && (
            <View style={styles.wizardNavRow}>
              <TouchableOpacity
                style={[styles.wizardNextBtn, { backgroundColor: btnErrorMessage ? '#EF4444' : rTheme.color }]}
                onPress={() => {
                  const errors = {};
                  let firstErrorMsg = '';
                  if (role === 'broker') {
                    if (!party2) {
                      errors.party2 = 'Please select a buyer company';
                      firstErrorMsg = 'Select Buyer';
                    }
                    if (!sellerCompany) {
                      errors.sellerCompany = 'Please select a seller company';
                      if (!firstErrorMsg) firstErrorMsg = 'Select Seller';
                    }
                  } else {
                    if (!party2) {
                      errors.party2 = `Please select a ${role === 'buyer' ? 'seller' : 'buyer'} company`;
                      firstErrorMsg = `Select ${role === 'buyer' ? 'Seller' : 'Buyer'}`;
                    }
                  }
                  if (Object.keys(errors).length > 0) {
                    setFieldErrors(errors);
                    setBtnErrorMessage(firstErrorMsg);
                    setTimeout(() => setBtnErrorMessage(''), 3000);
                    return;
                  }
                  setFieldErrors({});
                  setBtnErrorMessage('');
                  setCurrentStep(2);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.wizardNextBtnText}>
                  {btnErrorMessage ? `⚠ ${btnErrorMessage}` : 'Continue to Products Ledger ›'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════ CARD 2: PRODUCT LEDGER (STEP 2) ═══════════ */}
          {currentStep === 2 && (
            <>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: '#4F46E5' }]} />
                  <Text style={styles.sectionTitle}>Product Ledger & Value</Text>
                  <View style={styles.sectionBadgeContainer}>
                    <Text style={[styles.sectionBadge, { color: '#4F46E5', backgroundColor: '#EEF2FF' }]}>STEP 2</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  {/* Add Product Button (Small Pill style) */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: rTheme.bg,
                        borderColor: rTheme.color,
                        borderWidth: 1.2,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        gap: 4,
                        shadowColor: rTheme.color,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                      onPress={addProductItem}
                      activeOpacity={0.8}
                    >
                      <Plus size={12} color={rTheme.color} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: rTheme.color }}>
                        Add Product
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Vertical list of all products in the deal */}
                  {productsList.map((prod, idx) => {
                    const prodErrors = fieldErrors[`product_${prod.id}`] || {};
                    return (
                      <View
                        key={prod.id}
                        style={[styles.productItemCard, { marginBottom: 12, marginTop: idx === 0 ? 6 : 12 }]}
                        onLayout={(event) => {
                          if (pendingScrollProductId.current === prod.id) {
                            const y = event.nativeEvent.layout.y;
                            pendingScrollProductId.current = null;
                            scrollViewRef.current?.scrollTo({ y: y - 10, animated: true });
                          }
                        }}
                      >
                        {/* Product Header Row with Index & Delete option */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: rTheme.bg, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 11, fontWeight: '900', color: rTheme.color }}>{idx + 1}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                              {prod.productName ? prod.productName : `Product #${idx + 1}`}
                            </Text>
                          </View>

                          {productsList.length > 1 && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#FEF2F2',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#FCA5A5',
                              }}
                              onPress={() => removeProductItem(prod.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>Remove ✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Product Name Input */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.fieldLabel}>Product / Commodity Name *</Text>

                          <View style={styles.productInputWrapper}>
                            <TextInput
                              style={[
                                styles.textInput,
                                { backgroundColor: '#FFFFFF', fontSize: 13, fontWeight: '600', color: '#0F172A' },
                                focusedField === `productSelect_${prod.id}` && [styles.inputFocused, { borderColor: rTheme.color, shadowColor: rTheme.color }],
                                prodErrors.productName && styles.inputError
                              ]}
                              value={prod.productName}
                              onChangeText={(text) => {
                                updateProductFields(prod.id, {
                                  productName: text,
                                  showProductDropdown: true
                                });
                                setDropdownSearchText(text);
                                if (prodErrors.productName) {
                                  setFieldErrors(prev => ({ ...prev, [`prod_${prod.id}_productName`]: undefined }));
                                }
                              }}
                              onFocus={() => {
                                setFocusedField(`productSelect_${prod.id}`);
                                setDropdownSearchText(prod.productName || '');
                                setProductsList(prev => prev.map(item => ({
                                  ...item,
                                  showProductDropdown: item.id === prod.id
                                })));
                              }}
                              placeholder="Type product name (e.g. Jeera, Wheat, Copper...)"
                              placeholderTextColor="#94A3B8"
                            />
                          </View>
                          {prodErrors.productName && <Text style={styles.fieldErrorText}>⚠ {prodErrors.productName}</Text>}

                          {prod.showProductDropdown && companyProducts.length > 0 && (() => {
                            const searchVal = (dropdownSearchText || prod.productName || '').toLowerCase().trim();
                            const filtered = companyProducts.filter(p => !searchVal || String(p.name || '').toLowerCase().includes(searchVal));
                            if (filtered.length === 0) return null;
                            return (
                              <View style={[styles.autocompleteDropdown, { position: 'relative', top: 0, marginTop: 4, width: '100%' }]}>
                                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 180 }}>
                                  {filtered.map((p) => (
                                    <TouchableOpacity
                                      key={p._id || p.id}
                                      style={styles.dropdownItem}
                                      onPress={() => {
                                        const gstMatch = String(p.gstCode || '').match(/\d+/);
                                        const parsedGst = gstMatch ? gstMatch[0] : '';
                                        updateProductFields(prod.id, {
                                          productName: p.name,
                                          productId: p._id || p.id,
                                          price: p.price ? String(p.price) : prod.price,
                                          gst: parsedGst || prod.gst,
                                          showProductDropdown: false,
                                        });
                                        setFocusedField('');
                                        setDropdownSearchText('');
                                      }}
                                    >
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                                        {p.image ? (
                                          <Image source={{ uri: p.image }} style={styles.dropdownProductImage} />
                                        ) : (
                                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: rTheme.bg, alignItems: 'center', justifyContent: 'center' }}>
                                            <Box size={12} color={rTheme.color} />
                                          </View>
                                        )}
                                        <View>
                                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{p.name}</Text>
                                          {p.price ? <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 1 }}>₹ {p.price} / Unit</Text> : null}
                                        </View>
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            );
                          })()}
                        </View>

                        {/* Qty & Price row */}
                        <View style={styles.row}>
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.fieldLabel}>Quantity (MT)*</Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                focusedField === `quantity_${prod.id}` && [styles.inputFocused, { shadowColor: rTheme.color, borderColor: rTheme.color }],
                                prodErrors.quantity && styles.inputError
                              ]}
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              value={prod.quantity}
                              onChangeText={(v) => {
                                updateProductField(prod.id, 'quantity', v);
                                if (v.trim() && prodErrors.quantity) {
                                  setFieldErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy[`product_${prod.id}`]?.quantity;
                                    return copy;
                                  });
                                }
                              }}
                              keyboardType="numeric"
                              onFocus={() => setFocusedField(`quantity_${prod.id}`)}
                              onBlur={() => setFocusedField(prev => prev === `quantity_${prod.id}` ? '' : prev)}
                            />
                            {prodErrors.quantity && <Text style={styles.fieldErrorText}>⚠ {prodErrors.quantity}</Text>}
                          </View>

                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.fieldLabel}>Price / Unit*</Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                focusedField === `price_${prod.id}` && [styles.inputFocused, { shadowColor: rTheme.color, borderColor: rTheme.color }],
                                prodErrors.price && styles.inputError
                              ]}
                              placeholder="₹ 0.00"
                              placeholderTextColor="#94A3B8"
                              value={prod.price}
                              onChangeText={(v) => {
                                updateProductField(prod.id, 'price', v);
                                if (v.trim() && prodErrors.price) {
                                  setFieldErrors(prev => {
                                    const copy = { ...prev };
                                    delete copy[`product_${prod.id}`]?.price;
                                    return copy;
                                  });
                                }
                              }}
                              keyboardType="numeric"
                              onFocus={() => setFocusedField(`price_${prod.id}`)}
                              onBlur={() => setFocusedField(prev => prev === `price_${prod.id}` ? '' : prev)}
                            />
                            {prodErrors.price && <Text style={styles.fieldErrorText}>⚠ {prodErrors.price}</Text>}
                          </View>
                        </View>

                        {/* Collapsible Additional Details Section */}
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 10,
                            backgroundColor: '#F8FAFC',
                            borderRadius: 10,
                            marginTop: 12,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            gap: 6
                          }}
                          onPress={() => updateProductField(prod.id, 'showAdditionalDetails', !prod.showAdditionalDetails)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: rTheme.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {prod.showAdditionalDetails ? 'Hide Additional Details ▴' : 'Show Additional Details (Taxes, Terms) ▾'}
                          </Text>
                        </TouchableOpacity>

                        {prod.showAdditionalDetails && (
                          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, gap: 10 }}>
                            {/* Discount & GST row */}
                            <View style={styles.row}>
                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Discount (₹)</Text>
                                <TextInput
                                  style={[
                                    styles.textInput,
                                    focusedField === `discount_${prod.id}` && [styles.inputFocused, { shadowColor: rTheme.color, borderColor: rTheme.color }]
                                  ]}
                                  placeholder="0"
                                  placeholderTextColor="#94A3B8"
                                  value={prod.discount}
                                  onChangeText={(v) => updateProductField(prod.id, 'discount', v)}
                                  keyboardType="numeric"
                                  onFocus={() => setFocusedField(`discount_${prod.id}`)}
                                  onBlur={() => setFocusedField(prev => prev === `discount_${prod.id}` ? '' : prev)}
                                />
                              </View>

                              <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>GST (%)</Text>
                                <TextInput
                                  style={[
                                    styles.textInput,
                                    focusedField === `gst_${prod.id}` && [styles.inputFocused, { shadowColor: rTheme.color, borderColor: rTheme.color }]
                                  ]}
                                  placeholder="e.g. 18"
                                  placeholderTextColor="#94A3B8"
                                  value={prod.gst}
                                  onChangeText={(v) => updateProductField(prod.id, 'gst', v)}
                                  keyboardType="numeric"
                                  onFocus={() => setFocusedField(`gst_${prod.id}`)}
                                  onBlur={() => setFocusedField(prev => prev === `gst_${prod.id}` ? '' : prev)}
                                />
                              </View>
                            </View>

                            {/* Payment Terms row */}
                            <View style={[styles.inputGroup, { marginBottom: 10 }]}>
                              <Text style={styles.fieldLabel}>Payment Terms</Text>
                              <TextInput
                                style={[
                                  styles.textInput,
                                  focusedField === `paymentTerms_${prod.id}` && [styles.inputFocused, { shadowColor: rTheme.color, borderColor: rTheme.color }]
                                ]}
                                placeholder="e.g. 100% Advance"
                                placeholderTextColor="#94A3B8"
                                value={prod.paymentTerms}
                                onChangeText={(v) => updateProductField(prod.id, 'paymentTerms', v)}
                                onFocus={() => setFocusedField(`paymentTerms_${prod.id}`)}
                                onBlur={() => setFocusedField(prev => prev === `paymentTerms_${prod.id}` ? '' : prev)}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Ticket Stub Total Value (Elegant Contrast element) */}
                  {showTicketStub && (
                    <View style={styles.ticketStub}>
                      <View style={styles.ticketLeft}>
                        <Text style={styles.ticketLabel}>ESTIMATED CONTRACT VALUE</Text>
                        <Text style={styles.ticketValue}>₹ {totals.total.toLocaleString('en-IN')}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          {totals.discount > 0 && (
                            <Text style={[styles.ticketDiscount, { color: '#94A3B8' }]}>After ₹{totals.discount.toLocaleString('en-IN')} disc.</Text>
                          )}
                          {totals.gstAmount > 0 && (
                            <Text style={[styles.ticketDiscount, { color: '#94A3B8' }]}>Incl. GST (+₹{totals.gstAmount.toLocaleString('en-IN')})</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.ticketDivider}>
                        <View style={styles.ticketPunchTop} />
                        <View style={styles.ticketDashedLine} />
                        <View style={styles.ticketPunchBottom} />
                      </View>
                      <View style={styles.ticketRight}>
                        <Text style={styles.ticketRightTop}>TOTAL QTY</Text>
                        <Text style={styles.ticketRightValue}>{totals.qty.toLocaleString('en-IN')}</Text>
                        <Text style={styles.ticketRightTop}>{productsList.length} item(s)</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* ═══════════ CARD 3: TIMELINE & TERMS (GLOBAL STEP 2) ═══════════ */}
              <View style={[styles.sectionCard, { marginTop: 14 }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: '#4F46E5' }]} />
                  <Text style={styles.sectionTitle}>Agreement Timeline & Terms</Text>
                  <View style={styles.sectionBadgeContainer}>
                    <Text style={[styles.sectionBadge, { color: '#4F46E5', backgroundColor: '#EEF2FF' }]}>GLOBAL</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  {/* Date Selectors */}
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Agreement Date</Text>
                      <TouchableOpacity
                        style={[styles.dateSelector, focusedField === 'dealDate' && [styles.inputFocused, { borderColor: rTheme.color, shadowColor: rTheme.color }]]}
                        onPress={() => { setFocusedField('dealDate'); openDatePicker('deal'); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dateSelectorText}>{formatDateLabel(dealDate)}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Validity Expiry</Text>
                      <TouchableOpacity
                        style={[styles.dateSelector, focusedField === 'validityDate' && [styles.inputFocused, { borderColor: rTheme.color, shadowColor: rTheme.color }]]}
                        onPress={() => { setFocusedField('validityDate'); openDatePicker('validity'); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dateSelectorText}>{formatDateLabel(validityDate)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Description */}
                  <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                    <Text style={styles.fieldLabel}>Custom Trade Terms</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.multilineInput,
                        focusedField === 'description' && [styles.inputFocused, { shadowColor: rTheme.color, borderColor: rTheme.color }]
                      ]}
                      placeholder="Specify delivery locations, commission terms, quality specs..."
                      placeholderTextColor="#94A3B8"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField(prev => prev === 'description' ? '' : prev)}
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Step 2 Navigation Row (Final Step) */}
          {currentStep === 2 && (
            <View style={styles.wizardNavRow}>
              <TouchableOpacity
                style={styles.wizardBackBtn}
                onPress={() => setCurrentStep(1)}
                activeOpacity={0.8}
              >
                <Text style={styles.wizardBackBtnText}>‹ Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                  isInviteMode && styles.inviteButton,
                  btnErrorMessage ? { backgroundColor: '#EF4444', shadowColor: '#EF4444' } : null,
                  { flex: 2, marginTop: 0 }
                ]}
                activeOpacity={0.855}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.submitButtonContent}>
                    {btnErrorMessage ? (
                      <Text style={styles.submitButtonText}>⚠ {btnErrorMessage}</Text>
                    ) : (
                      <>
                        {isInviteMode ? (
                          <Send size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        ) : (
                          <Handshake size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.submitButtonText}>
                          {isInviteMode ? 'Send WhatsApp Invite' : 'Confirm Trade Agreement'}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>

        {/* Date Picker Modal */}
        {isDatePickerVisible && (
          <Modal transparent visible={isDatePickerVisible} animationType="slide" onRequestClose={() => setIsDatePickerVisible(false)}>
            <View style={styles.pickerOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setIsDatePickerVisible(false)} />
              <View style={styles.pickerContent}>
                <View style={styles.dragIndicator} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                  {pickingForDate === 'deal' ? (
                    <Calendar size={18} color="#0F172A" />
                  ) : (
                    <Clock size={18} color="#0F172A" />
                  )}
                  <Text style={[styles.pickerHeader, { marginBottom: 0 }]}>
                    {pickingForDate === 'deal' ? 'Agreement Date' : 'Validity Expiry'}
                  </Text>
                </View>
                <View style={styles.calendarGrid}>
                  <View style={styles.pickerControls}>
                    <TouchableOpacity style={styles.navButton} onPress={() => { const d = new Date(tempDate); d.setMonth(tempDate.getMonth() - 1); setTempDate(d); }} activeOpacity={0.7}>
                      <Text style={styles.navText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.monthDisplay}>{months[tempDate.getMonth()]} {tempDate.getFullYear()}</Text>
                    <TouchableOpacity style={styles.navButton} onPress={() => { const d = new Date(tempDate); d.setMonth(tempDate.getMonth() + 1); setTempDate(d); }} activeOpacity={0.7}>
                      <Text style={styles.navText}>▶</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.daysGrid}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      const isSel = tempDate.getDate() === day;
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayCell, isSel && [styles.activeDayCell, { backgroundColor: rTheme.color, borderColor: rTheme.color }]]}
                          onPress={() => { const d = new Date(tempDate); d.setDate(day); setTempDate(d); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dayText, isSel && styles.activeDayText]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.pickerActions}>
                  <TouchableOpacity style={styles.cancelAction} onPress={() => setIsDatePickerVisible(false)} activeOpacity={0.7}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmAction, { backgroundColor: rTheme.color }]} onPress={() => { confirmDateSelection(); setFocusedField(''); }} activeOpacity={0.7}>
                    <Text style={styles.confirmText}>Confirm Date ✓</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </Modal>
        )}

        {/* Premium Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="slide">
          <View style={styles.successOverlay}>
            <View style={styles.successCardContainer}>
              <View style={[
                styles.successBadgeCircle,
                {
                  backgroundColor: isInviteMode ? '#DCFCE7' : rTheme.bg,
                  borderColor: isInviteMode ? '#A7F3D0' : rTheme.border,
                }
              ]}>
                {isInviteMode ? (
                  <Send size={32} color="#059669" />
                ) : (
                  <Handshake size={32} color={rTheme.color} />
                )}
              </View>

              <Text style={styles.successCardTitle}>
                {isInviteMode ? 'WhatsApp Invite Sent!' : 'Sauda Established!'}
              </Text>

              <Text style={styles.successCardSubtitle}>
                {isInviteMode
                  ? 'Your deal invitation has been created and shared via WhatsApp.'
                  : 'Your trade deal has been successfully recorded in the Pravisti digital ledger.'}
              </Text>

              {/* Deal Brief Summary Box */}
              <View style={styles.successSummaryBox}>
                <View style={styles.successSummaryRow}>
                  <Text style={styles.successSummaryLabel}>Parties</Text>
                  <Text style={styles.successSummaryVal} numberOfLines={1}>
                    {party1} ↔ {party2 || sellerCompany || 'Counterparty'}
                  </Text>
                </View>
                <View style={styles.successSummaryDivider} />
                <View style={styles.successSummaryRow}>
                  <Text style={styles.successSummaryLabel}>Products</Text>
                  <Text style={styles.successSummaryVal}>
                    {productsList ? productsList.length : 1} Item(s)
                  </Text>
                </View>
              </View>

              {/* Live Progress Bar & Timed Auto Redirect */}
              <View style={styles.successProgressRow}>
                <ActivityIndicator size="small" color={isInviteMode ? '#059669' : rTheme.color} style={{ marginRight: 8 }} />
                <Text style={styles.successProgressText}>Redirecting to Deals Ledger in 5s...</Text>
              </View>

              {/* Share Deal Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#25D366',
                  paddingVertical: 11,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 14,
                  width: '100%',
                  shadowColor: '#25D366',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => {
                  const p1 = party1 || activeUserCompany?.name || 'Company';
                  const p2 = party2 || sellerCompany || 'Counterparty';
                  const firstProd = productsList[0]?.productName || 'Commodity Product';
                  const totals = getTotals();
                  const grandTotal = totals ? totals.grandTotal : '0';

                  const msg = `🤝 *Pravisti Trade Agreement*\n\n` +
                    `🏢 *Seller/Buyer*: ${p1}\n` +
                    `🏬 *Counterparty*: ${p2}\n` +
                    `📦 *Product*: ${firstProd}\n` +
                    `💰 *Total Value*: ₹${Number(grandTotal).toLocaleString('en-IN')}\n` +
                    `📅 *Date*: ${new Date().toLocaleDateString('en-IN')}\n\n` +
                    `View trade details on Pravisti: https://pravisti.com`;

                  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                  Linking.openURL(url).catch(err => console.warn('Share WhatsApp error:', err));
                }}
                activeOpacity={0.8}
              >
                <MessageSquare size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  Share Deal via WhatsApp
                </Text>
              </TouchableOpacity>

              {/* Go to Deals List Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: isInviteMode ? '#059669' : rTheme.color,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 8,
                  width: '100%',
                }}
                onPress={() => {
                  setShowSuccessModal(false);
                  onNavigate('DealsList', {
                    companyId: originCompanyId,
                    companyName: activeUserCompany?.name || party1,
                    filter: 'All',
                    refresh: true
                  }, { refresh: true });
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  Go to Deals Ledger →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Trader Assisted Onboarding Modal for Unregistered Counterparty */}
        <Modal visible={showOnboardModal} transparent animationType="slide">
          <View style={styles.successOverlay}>
            <View style={[styles.successCardContainer, { maxWidth: 360, padding: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  Onboard Counterparty
                </Text>
                <TouchableOpacity onPress={() => setShowOnboardModal(false)} style={{ padding: 4 }}>
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Role Selector Chips */}
              <View style={{ flexDirection: 'row', gap: 6, width: '100%', marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: onboardRole === 'seller' ? '#059669' : '#F1F5F9',
                    alignItems: 'center'
                  }}
                  onPress={() => setOnboardRole('seller')}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: onboardRole === 'seller' ? '#FFFFFF' : '#475569' }}>
                    Seller
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: onboardRole === 'buyer' ? '#2563EB' : '#F1F5F9',
                    alignItems: 'center'
                  }}
                  onPress={() => setOnboardRole('buyer')}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: onboardRole === 'buyer' ? '#FFFFFF' : '#475569' }}>
                    Buyer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: onboardRole === 'broker' ? '#7C3AED' : '#F1F5F9',
                    alignItems: 'center'
                  }}
                  onPress={() => setOnboardRole('broker')}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: onboardRole === 'broker' ? '#FFFFFF' : '#475569' }}>
                    Broker
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic Role Description Subtitle */}
              <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12, textAlign: 'left', width: '100%' }}>
                {onboardRole === 'seller'
                  ? 'Onboarding a Seller company: Fill account, business profile, and product catalog.'
                  : onboardRole === 'buyer'
                    ? 'Onboarding a Buyer company: Fill account and company profile.'
                    : 'Onboarding a Broker company: Fill account and company profile.'}
              </Text>

              <ScrollView style={{ width: '100%', maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', textTransform: 'uppercase' }}>
                    1. Account Info
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>User Full Name *</Text>
                    <TextInput
                      style={[styles.textInput, onboardErrors.name && styles.inputError]}
                      value={onboardForm.name}
                      onChangeText={val => setOnboardForm({ ...onboardForm, name: val })}
                      placeholder="Name"
                      placeholderTextColor="#94A3B8"
                    />
                    {!!onboardErrors.name && <Text style={styles.fieldErrorText}>{onboardErrors.name}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Mobile Number *</Text>
                    <TextInput
                      style={[styles.textInput, onboardErrors.mobileNumber && styles.inputError]}
                      value={onboardForm.mobileNumber}
                      onChangeText={val => {
                        const cleanMob = val.replace(/\D/g, '').slice(0, 10);
                        setOnboardForm({ ...onboardForm, mobileNumber: cleanMob });
                        if (onboardErrors.mobileNumber) setOnboardErrors(prev => ({ ...prev, mobileNumber: undefined }));
                      }}
                      placeholder="Mobile Number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                    {!!onboardErrors.mobileNumber && <Text style={styles.fieldErrorText}>{onboardErrors.mobileNumber}</Text>}
                  </View>

                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginTop: 6 }}>
                    2. Company Profile
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Company Name *</Text>
                    <TextInput
                      style={[styles.textInput, onboardErrors.companyName && styles.inputError]}
                      value={onboardForm.companyName}
                      onChangeText={val => setOnboardForm({ ...onboardForm, companyName: val })}
                      placeholder="Company Name"
                      placeholderTextColor="#94A3B8"
                    />
                    {!!onboardErrors.companyName && <Text style={styles.fieldErrorText}>{onboardErrors.companyName}</Text>}
                  </View>

                  {/* Industry Selection Field */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Industry / Business Type *</Text>
                    {industriesList && industriesList.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {industriesList.map((ind) => {
                            const indId = ind._id || ind.id;
                            const indName = ind.name || ind.title || ind.industryName || 'Industry';
                            const isSelected = String(onboardForm.industryId) === String(indId);
                            return (
                              <TouchableOpacity
                                key={indId}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 7,
                                  borderRadius: 20,
                                  backgroundColor: isSelected ? rTheme.color : '#F1F5F9',
                                  borderWidth: 1,
                                  borderColor: isSelected ? rTheme.color : '#CBD5E1',
                                }}
                                onPress={() => setOnboardForm(prev => ({ ...prev, industryId: indId }))}
                                activeOpacity={0.7}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#FFFFFF' : '#334155' }}>
                                  {indName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    ) : (
                      <View style={{ paddingVertical: 6 }}>
                        <Text style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Loading industries...</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>GST / Registration Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={onboardForm.registrationNumber}
                      onChangeText={val => setOnboardForm({ ...onboardForm, registrationNumber: val })}
                      placeholder="GST Number"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={styles.fieldLabel}>Pincode / Postal Code</Text>
                      {isPincodeLoading && <ActivityIndicator size="small" color="#2563EB" />}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={onboardForm.postalCode}
                      onChangeText={handlePincodeChange}
                      placeholder="6-digit pincode"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>City</Text>
                      <TextInput
                        style={styles.textInput}
                        value={onboardForm.city}
                        onChangeText={val => setOnboardForm({ ...onboardForm, city: val })}
                        placeholder="City"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>District</Text>
                      <TextInput
                        style={styles.textInput}
                        value={onboardForm.district}
                        onChangeText={val => setOnboardForm({ ...onboardForm, district: val })}
                        placeholder="District"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>State</Text>
                      <TextInput
                        style={styles.textInput}
                        value={onboardForm.state}
                        onChangeText={val => setOnboardForm({ ...onboardForm, state: val })}
                        placeholder="State"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Country</Text>
                      <TextInput
                        style={styles.textInput}
                        value={onboardForm.country}
                        onChangeText={val => setOnboardForm({ ...onboardForm, country: val })}
                        placeholder="India"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {onboardRole === 'seller' && (
                    <>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginTop: 6 }}>
                        3. Seller Product Info
                      </Text>
                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Product Name *</Text>
                        <TextInput
                          style={styles.textInput}
                          value={onboardForm.productName}
                          onChangeText={val => setOnboardForm({ ...onboardForm, productName: val })}
                          placeholder="e.g. Soybean Seed Grade A"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>HSN Code</Text>
                          <TextInput
                            style={styles.textInput}
                            value={onboardForm.hsnCode}
                            onChangeText={val => setOnboardForm({ ...onboardForm, hsnCode: val })}
                            placeholder="e.g. 1201"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>GST Code</Text>
                          <TextInput
                            style={styles.textInput}
                            value={onboardForm.gstCode}
                            onChangeText={val => setOnboardForm({ ...onboardForm, gstCode: val })}
                            placeholder="GST_18"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput
                          style={[styles.textInput, { height: 60 }]}
                          value={onboardForm.description}
                          onChangeText={val => setOnboardForm({ ...onboardForm, description: val })}
                          placeholder="Product specification / details"
                          placeholderTextColor="#94A3B8"
                          multiline
                        />
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setShowOnboardModal(false)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, height: 44, borderRadius: 10, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' }}
                  onPress={handleExecuteOnboard}
                  disabled={isOnboardingSubmitting}
                >
                  {isOnboardingSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Onboard & Create Deal ✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 14, gap: 12, paddingBottom: 140 },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 30,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: '#0F172A', fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 10, color: '#64748B', fontWeight: '500', marginTop: 1 },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { fontSize: 16 },

  // SECTION CARDS
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 7,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionDot: { width: 7, height: 7, borderRadius: 3.5 },
  sectionTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, flex: 1, color: '#0F172A' },
  sectionBadgeContainer: {},
  sectionBadge: { fontSize: 8, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, letterSpacing: 1 },
  cardBody: { padding: 14, paddingTop: 6, gap: 2 },

  // INPUTS
  inputGroup: { marginBottom: 10 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    height: 44,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputFocused: {
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
  },
  fieldErrorText: { fontSize: 10, color: '#EF4444', fontWeight: '700', marginTop: 3, marginLeft: 3 },

  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 14,
    marginTop: 6,
    alignItems: 'center',
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  roleTabActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: -0.2,
  },
  roleTabTextActive: {
    fontWeight: '800',
  },

  // PROFILE CARDS
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
    gap: 11,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  profileAvatarText: { fontSize: 17, color: '#FFFFFF', fontWeight: '900' },
  profileCardInfo: { flex: 1, gap: 1 },
  profileCardName: { fontSize: 13, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  profileCardRole: { fontSize: 9, fontWeight: '800', marginTop: 1, letterSpacing: 0.8 },
  profileCardBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  profileCardBadgeText: { fontSize: 9, fontWeight: '800' },
  changeText: { fontSize: 11, fontWeight: '700', color: '#0284C7' },

  // FLOW CONNECTOR
  flowConnectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    marginVertical: -3,
  },
  flowConnectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 1,
  },
  flowConnectorBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  flowConnectorEmoji: { fontSize: 12 },

  counterpartySelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  counterpartySelectorInner: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  selectorAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorAvatarPlaceholderEmoji: { fontSize: 17 },
  counterpartySelectorLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  counterpartySelectorHint: { fontSize: 10, color: '#94A3B8', marginTop: 1, fontWeight: '600' },
  dropdownIcon: { fontSize: 17, color: '#94A3B8', fontWeight: '800' },

  // PRODUCT CHIPS
  productChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productChipActive: { backgroundColor: '#F0F9FF', borderColor: '#0284C7', borderWidth: 1.5 },
  productChipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  productChipTextActive: { color: '#0284C7', fontWeight: '800' },
  miniProductImage: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#F1F5F9' },
  miniProductEmoji: { fontSize: 11 },

  // UPLOAD
  dashedUploadArea: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 11,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
  },
  dashedUploadIcon: { fontSize: 24 },
  dashedUploadLabel: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  dashedUploadHint: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  uploadedImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 11,
    gap: 10,
  },
  uploadedImageInfo: { flex: 1 },
  uploadedImageLabel: { fontSize: 12, fontWeight: '700', color: '#059669' },
  uploadedImageHint: { fontSize: 10, color: '#64748B', marginTop: 2 },
  thumbnail: { width: 42, height: 42, borderRadius: 8 },
  thumbnailRemove: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  thumbnailRemoveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  row: { flexDirection: 'row', gap: 10 },

  // TICKET STUB (High contrast dark layout remains outstanding in light theme)
  ticketStub: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  ticketLeft: { flex: 2, padding: 18 },
  ticketLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  ticketValue: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  ticketDiscount: { fontSize: 11, color: '#64748B', marginTop: 4 },
  ticketDivider: { width: 30, alignItems: 'center', justifyContent: 'center' },
  ticketPunchTop: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#F8FAFC', position: 'absolute', top: -10,
  },
  ticketPunchBottom: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#F8FAFC', position: 'absolute', bottom: -10,
  },
  ticketDashedLine: {
    flex: 1, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
  },
  ticketRight: { flex: 1, padding: 18, alignItems: 'center', justifyContent: 'center' },
  ticketRightTop: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  ticketRightValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginVertical: 4 },

  // DATE SELECTOR
  dateSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    height: 44,
    justifyContent: 'center',
  },
  dateSelectorText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },

  // PAYMENT TERMS
  termBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  termBadgeActive: { backgroundColor: '#F0F9FF', borderColor: '#0284C7', borderWidth: 1.5 },
  termBadgeText: { fontSize: 10, fontWeight: '600', color: '#64748B' },
  termBadgeTextActive: { color: '#0284C7', fontWeight: '800' },

  // PRODUCT INPUT WRAPPER & AUTOCOMPLETE
  productInputWrapper: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  dropdownToggleBtn: { position: 'absolute', right: 12, padding: 6 },
  dropdownToggleText: { fontSize: 14, color: '#64748B' },
  autocompleteDropdown: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    marginTop: 3, position: 'absolute', top: 48, left: 0, right: 0, zIndex: 999,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 5,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 13, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' },
  dropdownItemText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  dropdownProductImage: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#F1F5F9' },
  dropdownProductEmoji: { fontSize: 13 },

  // MULTILINE
  multilineInput: { height: 78, textAlignVertical: 'top', paddingTop: 11 },

  // SUBMIT BUTTON
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: { opacity: 0.6 },
  inviteButton: { backgroundColor: '#B58900', shadowColor: '#B58900' },
  submitButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitButtonIcon: { fontSize: 18 },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },

  // DATE PICKER MODAL
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  pickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  dragIndicator: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 18 },
  pickerHeader: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  pickerControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#0F172A', fontWeight: '750', fontSize: 11 },
  monthDisplay: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  calendarGrid: { marginBottom: 16 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  dayCell: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  activeDayCell: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  dayText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  activeDayText: { color: '#FFFFFF', fontWeight: '900' },
  pickerActions: { flexDirection: 'row', gap: 10 },
  cancelAction: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  confirmAction: { flex: 2, height: 50, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
  confirmText: { color: '#FFFFFF', fontWeight: '850', fontSize: 13 },

  productItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  tabsScrollContent: {
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  tabItemActive: {
    borderWidth: 1.5,
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabItemTextActive: {
    fontWeight: '800',
  },
  tabDeleteBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  tabDeleteText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    marginTop: -1,
  },
  addTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTabBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // WIZARD WORKFLOW
  wizardProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  wizardStepCol: {
    alignItems: 'center',
    gap: 4,
  },
  wizardStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStepCircleActive: {
    borderWidth: 2,
  },
  wizardStepCircleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  wizardStepCircleTextActive: {
    fontWeight: '900',
  },
  wizardStepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  wizardStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: -16,
    marginHorizontal: -8,
  },
  wizardNavRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingBottom: 24,
  },
  wizardNextBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  wizardNextBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  wizardBackBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardBackBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },

  // STEP 1 DIRECT SEARCH & ADD
  step1DirectBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  step1SearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 44,
  },
  step1SearchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 0,
  },
  step1AddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 6,
  },
  step1AddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    justifyContent: 'center',
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orDividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginHorizontal: 8,
  },
  directorySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  directorySelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  searchingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  foundCompanyBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  foundCompanyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 6,
  },
  foundCompanyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 4,
  },
  foundCompanyName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  foundCompanySub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  selectFoundBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  selectFoundBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // PREMIUM SUCCESS MODAL STYLES
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  successBadgeCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  successCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  successCardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  successSummaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  successSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  successSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  successSummaryVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: '65%',
  },
  successSummaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  successProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default CreateDeal;
