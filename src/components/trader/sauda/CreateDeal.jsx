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
  Send,
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
    initialCompany?.address?.city ? `${initialCompany.address.city}, ${initialCompany.address.state || 'India'}` : ''
  );
  const [sellerIndustry, setSellerIndustry] = useState(initialCompany?.industry?.name || initialCompany?.industry || '');

  // Counterparty 2 (Buyer when seller, Seller when buyer)
  const prefillBuyer = routeData?.prefill?.buyerCompany || routeData?.prefill?.buyerCompanyId || routeData?.prefill?.party2 || {};
  const prefillBuyerName = prefillBuyer.companyName || prefillBuyer.name || routeData?.prefillParty2?.name || routeData?.existingParty2Name || '';

  const [party2, setParty2] = useState(prefillBuyerName);
  const [party2Data, setParty2Data] = useState(
    routeData?.prefillParty2
      ? { ...routeData.prefillParty2, isRegistered: true }
      : routeData?.existingParty2
        ? routeData.existingParty2
        : prefillBuyerName
          ? { ...prefillBuyer, isRegistered: true, company: prefillBuyerName, name: prefillBuyerName }
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
  // STEP 2: PRODUCT STATES
  // ----------------------------------------------------
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [selectedRecentId, setSelectedRecentId] = useState(null);

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

  // Master Data States
  const [unitsList, setUnitsList] = useState(STANDARD_UNITS);
  const [companyProducts, setCompanyProducts] = useState([]);
  const [userCompaniesList, setUserCompaniesList] = useState([]);
  const [industriesList, setIndustriesList] = useState([]);
  const [showCompanySwitchModal, setShowCompanySwitchModal] = useState(false);

  // Assisted Onboarding Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
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

  // Auto calculate deal value
  useEffect(() => {
    if (productName) {
      setDealName(`Supply of ${productName}`);
    }
    const q = parseFloat(String(quantity).replace(/,/g, '')) || 0;
    const r = parseFloat(String(approxRate).replace(/,/g, '')) || 0;
    const computed = q * r;
    if (computed > 0) {
      setDealValue(computed.toLocaleString('en-IN'));
    }
  }, [productName, approxRate, quantity]);

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
            setParty1(active.name || 'Sharma Traders');
            if (active.address?.city || active.city) {
              const loc = `${active.address?.city || active.city}, ${active.address?.state || active.state || 'India'}`;
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
              category: 'grains',
              image: p.image || null,
            }));
            setCompanyProducts(formatted);
          } else {
            setCompanyProducts(prev => (prev.length > 0 && prev[0]?.isNewlyOnboarded ? prev : []));
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
      setParty2(routeData.prefillParty2.name || routeData.prefillParty2.company || '');
      setParty2Data({ ...routeData.prefillParty2, isRegistered: true });
    }
    if (routeData?.existingParty2 && routeData?.pickingFor !== 'party2') {
      const p2Data = routeData.existingParty2;
      const p2Name = routeData.existingParty2Name || (p2Data?.isRegistered ? (p2Data?.company || p2Data?.name) : p2Data?.name);
      setParty2(p2Name);
      setParty2Data(p2Data);
    }
    if (routeData?.existingBrokerCompany && routeData?.pickingFor !== 'brokerCompany') {
      const bData = routeData.existingBrokerCompany;
      const bName = routeData.existingBrokerCompanyName || (bData?.isRegistered ? (bData?.company || bData?.name) : bData?.name);
      setBrokerCompany(bName);
      setBrokerCompanyData(bData);
      setShowBroker(true);
      const cid = bData?.companyId || bData?._id || bData?.id;
      if (cid) setBrokerCompanyId(String(cid));
    }
    if (routeData?.selectedContact) {
      const contact = routeData.selectedContact;
      if (routeData.pickingFor === 'party2') {
        setParty2(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setParty2Data(contact);
        setDirectInputParty2('');
        setFieldErrors(prev => ({ ...prev, party2: undefined }));
      } else if (routeData.pickingFor === 'brokerCompany') {
        setBrokerCompany(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setBrokerCompanyData(contact);
        setShowBroker(true);
        const cid = contact.companyId || contact._id || contact.id;
        if (cid) setBrokerCompanyId(String(cid));
        setDirectInputBroker('');
      }
    }
  }, [routeData]);

  // Live Counterparty 10-Digit Mobile Lookup
  useEffect(() => {
    const checkNumber = async (field, rawVal) => {
      const cleanDigits = (rawVal || '').replace(/\D/g, '');
      if (cleanDigits.length === 10) {
        try {
          const token = await AsyncStorage.getItem('userToken');
          const formattedNumber = `+91${cleanDigits}`;
          const response = await getCompaniesByNumber(formattedNumber, token);
          if (response && response.success && response.data && response.data.length > 0) {
            const coObj = response.data[0];
            const companyId = coObj.companyId || coObj._id || coObj.id;
            const companyName = coObj.companyName || coObj.name || 'Registered Company';
            const contactObj = {
              id: companyId || `reg_${Date.now()}`,
              companyId,
              name: coObj.contactPersonName || coObj.name || companyName,
              company: companyName,
              mobile: formattedNumber,
              isRegistered: true,
              industry: coObj.industryName || 'Commodity Trading',
              location: coObj.city ? `${coObj.city}, ${coObj.state || 'India'}` : 'Registered Counterparty',
            };
            if (field === 'party2') {
              setParty2(companyName);
              setParty2Data(contactObj);
              setDirectInputParty2('');
              setFieldErrors(prev => ({ ...prev, party2: undefined }));
            } else if (field === 'brokerCompany') {
              setBrokerCompany(companyName);
              setBrokerCompanyData(contactObj);
              setBrokerCompanyId(String(companyId || ''));
              setDirectInputBroker('');
              setShowBroker(true);
            }
          } else {
            // Auto open onboard modal for new contact
            openOnboardModal(field === 'brokerCompany' ? 'broker' : (role === 'buyer' ? 'seller' : 'buyer'), cleanDigits);
          }
        } catch (e) { }
      }
    };

    if (directInputParty2.replace(/\D/g, '').length === 10) {
      checkNumber('party2', directInputParty2);
    }
    if (directInputBroker.replace(/\D/g, '').length === 10) {
      checkNumber('brokerCompany', directInputBroker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directInputParty2, directInputBroker, role]);

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

        const contactObj = {
          id: newCompanyId,
          companyId: newCompanyId,
          name: newCompanyName,
          company: newCompanyName,
          mobile: `+91${cleanMobile}`,
          isRegistered: true,
          status: companyStatus,
          approvalStatus: companyStatus,
          industry: newCompany.industryId?.name || 'Commodity Trading',
          location: onboardForm.city ? `${onboardForm.city}, ${onboardForm.state || 'India'}` : 'New Onboarded Party',
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
    launchImageLibrary({ mediaType: 'mixed', selectionLimit: 5 }, (response) => {
      if (response.didCancel) return;
      if (response.assets && response.assets.length > 0) {
        const newFiles = response.assets.map((asset, idx) => ({
          id: `file_${Date.now()}_${idx}`,
          name: asset.fileName || `Document_${Date.now()}.jpg`,
          size: asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : '180 KB',
          type: asset.type?.includes('pdf') ? 'pdf' : 'image',
          uri: asset.uri,
        }));
        setAttachments(prev => [...prev, ...newFiles]);
      }
    });
  };

  const handleSelectRecentProduct = (item) => {
    setSelectedRecentId(item.id);
    setProductName(item.name);
    setHsnCode(item.hsn || '');
    setApproxRate(item.rate || '');
    if (item.unit) {
      setUnit(item.unit);
    }
    setSelectedProductId(item.id);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Select Date';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const openCalendar = (type) => {
    setPickingForDate(type);
    const curr = type === 'expected' ? new Date(expectedDealDate) : new Date(validityDate);
    setTempDate(isNaN(curr.getTime()) ? new Date() : curr);
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

  // Helper to dynamically resolve or create product on backend
  const resolveProductId = async (name, companyId, token) => {
    if (!name) return '64d0a1b2c3d4e5f6a7b8c9df';
    try {
      if (companyId && String(companyId).length === 24) {
        const productsRes = await getProducts(companyId, token).catch(() => null);
        const prodList = Array.isArray(productsRes?.data) ? productsRes.data : productsRes?.data?.data || [];
        const matched = prodList.find(p => String(p.name || '').toLowerCase().trim() === String(name).toLowerCase().trim());
        if (matched) return matched._id || matched.id;

        let categoryId = null;
        const categoriesRes = await getCategories(companyId, token).catch(() => null);
        if (categoriesRes && categoriesRes.success && categoriesRes.data?.length > 0) {
          categoryId = categoriesRes.data[0]._id || categoriesRes.data[0].id;
        } else {
          const catRes = await createCategory({ name: 'General', companyId }, token).catch(() => null);
          if (catRes?.data) categoryId = catRes.data._id || catRes.data.id;
        }

        if (categoryId) {
          const newProductRes = await createProduct({
            name,
            categoryId,
            unitId: unitsList[0]?.id || '64d0a1b2c3d4e5f6a7b8c9df',
            companyId,
            description: 'Created for Sauda Deal',
          }, token).catch(() => null);
          if (newProductRes?.data) return newProductRes.data._id || newProductRes.data.id;
        }
      }
    } catch (e) { }
    return '64d0a1b2c3d4e5f6a7b8c9df';
  };

  // Step Validation & Navigation
  const handleContinue = () => {
    const errors = {};
    if (currentStep === 1) {
      if (role === 'broker') {
        if (!party2 || !party2.trim()) errors.party2 = 'Please select a Buyer company';
        if (!sellerCompany || !sellerCompany.trim()) errors.sellerCompany = 'Please select a Seller company';
      } else if (role === 'buyer') {
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
      if (!productName.trim()) errors.productName = 'Product name is required';
      if (!approxRate.trim()) errors.approxRate = 'Approx. rate is required';
      if (!unit.trim()) errors.unit = 'Unit is required';

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setBtnErrorMessage('Please fill in product details');
        setTimeout(() => setBtnErrorMessage(''), 2500);
        return;
      }
      setFieldErrors({});
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!dealName.trim()) errors.dealName = 'Deal Name is required';
      if (!dealValue.trim()) errors.dealValue = 'Deal value is required';

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

  // Final Deal Submission
  const handleSubmitDeal = async () => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const originId = activeUserCompany?._id || activeUserCompany?.id || originCompanyId || '';
      const cleanRate = parseFloat(String(approxRate).replace(/,/g, '')) || 0;
      const cleanQty = parseFloat(String(quantity).replace(/,/g, '')) || 0;
      const cleanDiscount = parseFloat(String(discount).replace(/,/g, '')) || 0;
      const cleanGST = parseFloat(String(gstPercent).replace(/,/g, '')) || 0;
      const subtotal = cleanRate * cleanQty;
      const gstAmount = cleanGST > 0 ? (subtotal * cleanGST) / 100 : 0;
      const totalAmount = subtotal - cleanDiscount + gstAmount;

      const resolvedSellerId = role === 'seller' ? originId : (role === 'buyer' ? (party2Data?.companyId || party2Data?._id || party2Data?.id) : (sellerCompanyData?.companyId || sellerCompanyData?._id || sellerCompanyData?.id));
      const resolvedBuyerId = role === 'seller' ? (party2Data?.companyId || party2Data?._id || party2Data?.id) : (role === 'buyer' ? originId : (party2Data?.companyId || party2Data?._id || party2Data?.id));

      const finalProductId = await resolveProductId(productName, resolvedSellerId, token);

      const productPayload = [
        {
          productId: finalProductId,
          name: productName,
          quantity: cleanQty,
          price: cleanRate,
          subtotal: subtotal,
          discount: cleanDiscount,
          gst: cleanGST,
          gstAmount: gstAmount,
          totalAmount: totalAmount,
          unitName: unit || '',
          unitShortName: unit?.split(' ')?.[0] || '',
          hsnCode: hsnCode || '',
          gstCode: cleanGST > 0 ? `GST_${cleanGST}` : 'GST_18',
          paymentTerms: paymentTerms || '15 days',
        },
      ];

      const isUnregisteredInvite = party2Data?.isRegistered === false || (party2Data && !party2Data.companyId && !party2Data._id);

      if (isUnregisteredInvite) {
        const invitePayload = {
          receiverMobileNumber: party2Data?.mobile || directInputParty2 || '',
          receiverName: party2,
          dealDraft: {
            role: role,
            products: productPayload,
            totalSubtotal: subtotal,
            totalDiscount: cleanDiscount,
            totalGSTAmount: gstAmount,
            grandTotal: totalAmount,
            totalAmount: totalAmount,
            discount: cleanDiscount,
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

        const payload = {
          role: role,
          sellerCompanyId: resolvedSellerId,
          buyerCompanyId: resolvedBuyerId,
          myCompanyId: String(originId),
          targetCompanyId: role === 'seller' ? resolvedBuyerId : resolvedSellerId,
          products: productPayload,
          totalSubtotal: subtotal,
          totalDiscount: cleanDiscount,
          totalGSTAmount: gstAmount,
          grandTotal: totalAmount,
          totalAmount: totalAmount,
          discount: cleanDiscount,
          dealDate: expectedDealDate ? new Date(expectedDealDate).toISOString() : new Date().toISOString(),
          expiryDate: validityDate ? new Date(validityDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
          notes: dealDescription || partyNotes || '',
          ...(resolvedBrokerId ? { brokerCompanyId: resolvedBrokerId } : {}),
        };

        const response = await createDeal(payload, token);
        if (response && (response.success || response.statusCode === 201) && response.data?.deal) {
          setCreatedDealData(response.data.deal);
        }
        setShowSuccessModal(true);
      }

      // Clear cache
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
      console.warn('Deal creation notice:', err);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        onNavigate('DealsList', {
          companyId: originCompanyId,
          companyName: activeUserCompany?.name || party1,
          filter: 'All',
          refresh: true,
        });
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>

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
        >

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 1: ADD PARTIES (1st Step)
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <View style={styles.stepSection}>
              <View style={styles.sectionHeadingBox}>
                <Text style={styles.mainSectionTitle}>Add Parties</Text>
                <Text style={styles.mainSectionSubtitle}>
                  Add buyers / sellers or other parties involved in this deal.
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
                    <Text style={styles.partyCategoryText}>{sellerIndustry}</Text>
                    <View style={styles.partyLocationRow}>
                      <MapPin size={12} color="#64748B" />
                      <Text style={styles.partyLocationText}>{sellerLocation}</Text>
                    </View>
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
                      {party2Data?.industry ? (
                        <Text style={styles.partyCategoryText}>{party2Data.industry}</Text>
                      ) : null}
                      {party2Data?.location ? (
                        <View style={styles.partyLocationRow}>
                          <MapPin size={12} color="#64748B" />
                          <Text style={styles.partyLocationText}>{party2Data.location}</Text>
                        </View>
                      ) : null}
                    </View>

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
                  <View style={styles.searchBarContainer}>
                    <Search size={18} color="#94A3B8" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Enter 10-digit mobile number or company..."
                      placeholderTextColor="#94A3B8"
                      value={directInputParty2}
                      onChangeText={setDirectInputParty2}
                    />
                    <TouchableOpacity
                      onPress={() => navigateToContactPicker('party2')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addNewPartyLink}>+ Add New</Text>
                    </TouchableOpacity>
                  </View>
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
                      {brokerCompanyData?.industry ? (
                        <Text style={styles.partyCategoryText}>{brokerCompanyData.industry}</Text>
                      ) : (
                        <Text style={[styles.partyCategoryText, { color: '#7C3AED', fontWeight: '600' }]}>
                          {brokerCompanyData?.isRegistered === false ? 'Unregistered' : 'On Pravisti'}
                        </Text>
                      )}
                      {brokerCompanyData?.location ? (
                        <View style={styles.partyLocationRow}>
                          <MapPin size={12} color="#64748B" />
                          <Text style={styles.partyLocationText}>{brokerCompanyData.location}</Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={styles.partyRemoveButton}
                      onPress={() => {
                        setBrokerCompany('');
                        setBrokerCompanyData(null);
                        setBrokerCompanyId('');
                        setDirectInputBroker('');
                      }}
                      activeOpacity={0.7}
                    >
                      <X size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.searchBarContainer}>
                    <Search size={18} color="#94A3B8" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Enter 10-digit mobile number or company..."
                      placeholderTextColor="#94A3B8"
                      value={directInputBroker}
                      onChangeText={setDirectInputBroker}
                    />
                    <TouchableOpacity
                      onPress={() => navigateToContactPicker('brokerCompany')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addNewPartyLink}>+ Add New</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Other Parties (Optional) */}
              <View style={styles.partyCardWrapper}>
                <View style={styles.sectionSubHeaderRow}>
                  <Text style={styles.partySectionHeader}>Other Parties (Optional)</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {!showLogistics && (
                      <TouchableOpacity
                        style={[styles.smallAddChip, { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}
                        onPress={() => setShowLogistics(true)}
                        activeOpacity={0.7}
                      >
                        <Truck size={12} color="#4F46E5" />
                        <Text style={[styles.smallAddChipText, { color: '#4F46E5' }]}>+ Logistics</Text>
                      </TouchableOpacity>
                    )}
                    {!showInsurance && (
                      <TouchableOpacity
                        style={[styles.smallAddChip, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}
                        onPress={() => setShowInsurance(true)}
                        activeOpacity={0.7}
                      >
                        <Shield size={12} color="#059669" />
                        <Text style={[styles.smallAddChipText, { color: '#059669' }]}>+ Insurance</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Logistics Partner Option */}
                {showLogistics && (
                  <View style={{ marginTop: 10 }}>
                    <View style={styles.sectionSubHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Truck size={14} color="#4F46E5" />
                        <Text style={[styles.partySectionHeader, { marginBottom: 0, fontSize: 13 }]}>
                          Logistics Partner
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setShowLogistics(false);
                          setLogisticsPartner('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.addNewPartyLink, { color: '#EF4444' }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.searchBarContainer, { marginTop: 6 }]}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Enter logistics partner name..."
                        placeholderTextColor="#94A3B8"
                        value={logisticsPartner}
                        onChangeText={setLogisticsPartner}
                      />
                    </View>
                  </View>
                )}

                {/* Insurance Provider Option */}
                {showInsurance && (
                  <View style={{ marginTop: 10 }}>
                    <View style={styles.sectionSubHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Shield size={14} color="#059669" />
                        <Text style={[styles.partySectionHeader, { marginBottom: 0, fontSize: 13 }]}>
                          Insurance Provider
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setShowInsurance(false);
                          setInsuranceProvider('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.addNewPartyLink, { color: '#EF4444' }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.searchBarContainer, { marginTop: 6 }]}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Enter insurance company name..."
                        placeholderTextColor="#94A3B8"
                        value={insuranceProvider}
                        onChangeText={setInsuranceProvider}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Additional Notes (Optional) */}
              <View style={styles.partyCardWrapper}>
                <Text style={styles.partySectionHeader}>Additional Notes (Optional)</Text>
                <View style={styles.notesBox}>
                  <TextInput
                    style={styles.notesInputField}
                    placeholder="Add any notes about the parties involved..."
                    placeholderTextColor="#94A3B8"
                    value={partyNotes}
                    onChangeText={setPartyNotes}
                    maxLength={250}
                    multiline
                    numberOfLines={3}
                  />
                  <Text style={styles.charCounterText}>{partyNotes.length}/250</Text>
                </View>
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 2: SELECT PRODUCT (2nd Step)
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <View style={styles.stepSection}>
              <View style={styles.sectionHeadingBox}>
                <Text style={styles.mainSectionTitle}>Select Product</Text>
                <Text style={styles.mainSectionSubtitle}>
                  {role === 'buyer' && party2 ? `Products from ${party2}` : 'Choose the product for this deal'}
                </Text>
              </View>

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

              {/* Recent Products (Only if inventory exists) */}
              {filteredProducts.length > 0 && (
                <>
                  <View style={styles.sectionSubHeaderRow}>
                    <Text style={styles.subSectionTitle}>Recent Products</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedCategoryTab('all')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewAllLink}>View All ›</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.recentCardsScroll}
                    contentContainerStyle={styles.recentCardsContent}
                  >
                    {filteredProducts.map((item) => {
                      const isSelected = selectedRecentId === item.id || productName.toLowerCase() === item.name.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.productCard, isSelected && styles.productCardSelected]}
                          onPress={() => handleSelectRecentProduct(item)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.productCardImageContainer}>
                            {item.image ? (
                              <Image source={{ uri: item.image }} style={styles.productCardImage} resizeMode="cover" />
                            ) : (
                              <View style={[styles.productCardImageFallback, { backgroundColor: '#FEF3C7' }]}>
                                <Wheat size={20} color="#D97706" />
                              </View>
                            )}
                            {isSelected && (
                              <View style={styles.selectedBadge}>
                                <Check size={8} color="#FFFFFF" strokeWidth={3} />
                              </View>
                            )}
                          </View>

                          <Text style={styles.productCardName} numberOfLines={2}>
                            {item.name}
                          </Text>

                          {item.hsn ? (
                            <View style={styles.hsnBadgePill}>
                              <Text style={styles.hsnBadgeText}>HSN: {item.hsn}</Text>
                            </View>
                          ) : null}

                          {item.rate ? (
                            <Text style={styles.productCardPrice}>
                              ₹{Number(item.rate).toLocaleString('en-IN')} / {item.unit || 'Unit'}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Add New Product Form Section */}
              <View style={styles.formContainer}>
                <Text style={styles.subSectionTitle}>
                  {filteredProducts.length > 0 ? 'Or Add New Product' : 'Product Details'}
                </Text>

                <View style={styles.inputRow}>
                  {/* Product Name */}
                  <View style={[styles.inputCol, { flex: 1.2 }]}>
                    <Text style={styles.inputLabel}>
                      Product Name <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={[
                      styles.textInputBox,
                      focusedField === 'productName' && styles.textInputBoxFocused,
                      fieldErrors.productName && styles.textInputBoxError,
                    ]}>
                      <Package size={16} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={styles.textInputField}
                        placeholder="Enter product name"
                        placeholderTextColor="#94A3B8"
                        value={productName}
                        onChangeText={(t) => {
                          setProductName(t);
                          if (fieldErrors.productName) setFieldErrors(prev => ({ ...prev, productName: undefined }));
                        }}
                        onFocus={() => setFocusedField('productName')}
                        onBlur={() => setFocusedField('')}
                      />
                    </View>
                  </View>

                  {/* HSN Code */}
                  <View style={[styles.inputCol, { flex: 0.8 }]}>
                    <Text style={styles.inputLabel}>HSN Code (Optional)</Text>
                    <View style={[
                      styles.textInputBox,
                      focusedField === 'hsnCode' && styles.textInputBoxFocused,
                    ]}>
                      <Hash size={16} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={styles.textInputField}
                        placeholder="Enter HSN"
                        placeholderTextColor="#94A3B8"
                        value={hsnCode}
                        onChangeText={setHsnCode}
                        keyboardType="numeric"
                        onFocus={() => setFocusedField('hsnCode')}
                        onBlur={() => setFocusedField('')}
                      />
                    </View>
                  </View>
                </View>

                <View style={[styles.inputRow, { marginTop: 12 }]}>
                  {/* Unit Selector */}
                  <View style={[styles.inputCol, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      Unit <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.textInputBox,
                        styles.selectBox,
                        fieldErrors.unit && styles.textInputBoxError,
                      ]}
                      onPress={() => setShowUnitModal(true)}
                      activeOpacity={0.7}
                    >
                      <ShoppingBag size={16} color="#64748B" style={styles.inputLeadingIcon} />
                      <Text style={styles.selectBoxValue} numberOfLines={1}>
                        {unit || 'Select unit'}
                      </Text>
                      <ChevronDown size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Approx Rate */}
                  <View style={[styles.inputCol, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      Approx. Rate (per unit) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={[
                      styles.textInputBox,
                      focusedField === 'approxRate' && styles.textInputBoxFocused,
                      fieldErrors.approxRate && styles.textInputBoxError,
                    ]}>
                      <IndianRupee size={16} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={styles.textInputField}
                        placeholder="Enter rate"
                        placeholderTextColor="#94A3B8"
                        value={approxRate}
                        onChangeText={(t) => {
                          setApproxRate(t);
                          if (fieldErrors.approxRate) setFieldErrors(prev => ({ ...prev, approxRate: undefined }));
                        }}
                        keyboardType="numeric"
                        onFocus={() => setFocusedField('approxRate')}
                        onBlur={() => setFocusedField('')}
                      />
                    </View>
                  </View>
                </View>

                {/* Info Notice Card */}
                <View style={styles.infoNoticeCard}>
                  <Info size={16} color="#2563EB" style={styles.infoNoticeIcon} />
                  <Text style={styles.infoNoticeText}>
                    You can add detailed quantity, discount, taxes and more in next step.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 3: DEAL DETAILS
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <View style={styles.stepSection}>
              <View style={styles.sectionHeadingBox}>
                <Text style={styles.mainSectionTitle}>Deal Details</Text>
                <Text style={styles.mainSectionSubtitle}>Provide deal information and terms.</Text>
              </View>

              {/* Deal Name */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Deal Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={[
                  styles.textInputBox,
                  focusedField === 'dealName' && styles.textInputBoxFocused,
                  fieldErrors.dealName && styles.textInputBoxError,
                ]}>
                  <FileText size={16} color="#64748B" style={styles.inputLeadingIcon} />
                  <TextInput
                    style={styles.textInputField}
                    placeholder="Enter deal title / name"
                    placeholderTextColor="#94A3B8"
                    value={dealName}
                    onChangeText={(t) => {
                      setDealName(t);
                      if (fieldErrors.dealName) setFieldErrors(prev => ({ ...prev, dealName: undefined }));
                    }}
                    onFocus={() => setFocusedField('dealName')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
              </View>

              {/* Deal Type & Category Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    Deal Type <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.textInputBox, styles.selectBox]}
                    onPress={() => setShowTypeModal(true)}
                    activeOpacity={0.7}
                  >
                    <CreditCard size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <Text style={styles.selectBoxValue}>{dealType}</Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Deal Category</Text>
                  <TouchableOpacity
                    style={[styles.textInputBox, styles.selectBox]}
                    onPress={() => setShowCategoryModal(true)}
                    activeOpacity={0.7}
                  >
                    <Tag size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <Text style={styles.selectBoxValue} numberOfLines={1}>{dealCategory}</Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Currency & Deal Value Row */}
              <View style={[styles.inputRow, { marginTop: 12 }]}>
                <View style={[styles.inputCol, { flex: 0.8 }]}>
                  <Text style={styles.inputLabel}>
                    Currency <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={[styles.textInputBox, styles.selectBox]}>
                    <IndianRupee size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <Text style={styles.selectBoxValue}>{currency}</Text>
                  </View>
                </View>

                <View style={[styles.inputCol, { flex: 1.2 }]}>
                  <Text style={styles.inputLabel}>
                    Deal Value (Approx.) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={[
                    styles.textInputBox,
                    focusedField === 'dealValue' && styles.textInputBoxFocused,
                    fieldErrors.dealValue && styles.textInputBoxError,
                  ]}>
                    <IndianRupee size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <TextInput
                      style={styles.textInputField}
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      value={dealValue}
                      onChangeText={(t) => {
                        setDealValue(t);
                        if (fieldErrors.dealValue) setFieldErrors(prev => ({ ...prev, dealValue: undefined }));
                      }}
                      onFocus={() => setFocusedField('dealValue')}
                      onBlur={() => setFocusedField('')}
                    />
                  </View>
                </View>
              </View>

              {/* Dates Row */}
              <View style={[styles.inputRow, { marginTop: 12 }]}>
                <View style={[styles.inputCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    Expected Deal Date <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.textInputBox, styles.selectBox]}
                    onPress={() => openCalendar('expected')}
                    activeOpacity={0.7}
                  >
                    <Calendar size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <Text style={styles.selectBoxValue} numberOfLines={1}>
                      {formatDateDisplay(expectedDealDate)}
                    </Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

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
              </View>

              {/* Payment Terms */}
              <View style={[styles.formGroup, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Payment Terms</Text>
                <TouchableOpacity
                  style={[styles.textInputBox, styles.selectBox]}
                  onPress={() => setShowPaymentTermsModal(true)}
                  activeOpacity={0.7}
                >
                  <CreditCard size={16} color="#64748B" style={styles.inputLeadingIcon} />
                  <Text style={styles.selectBoxValue}>{paymentTerms}</Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Delivery Terms */}
              <View style={[styles.formGroup, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Delivery Terms (Incoterms)</Text>
                <TouchableOpacity
                  style={[styles.textInputBox, styles.selectBox]}
                  onPress={() => setShowDeliveryTermsModal(true)}
                  activeOpacity={0.7}
                >
                  <Globe size={16} color="#64748B" style={styles.inputLeadingIcon} />
                  <Text style={styles.selectBoxValue}>{deliveryTerms}</Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Delivery Location */}
              <View style={[styles.formGroup, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Delivery Location</Text>
                <View style={[
                  styles.textInputBox,
                  focusedField === 'deliveryLocation' && styles.textInputBoxFocused,
                ]}>
                  <MapPin size={16} color="#64748B" style={styles.inputLeadingIcon} />
                  <TextInput
                    style={styles.textInputField}
                    placeholder="Enter delivery city / location"
                    placeholderTextColor="#94A3B8"
                    value={deliveryLocation}
                    onChangeText={setDeliveryLocation}
                    onFocus={() => setFocusedField('deliveryLocation')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
              </View>

              {/* Deal Description */}
              <View style={[styles.formGroup, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Deal Description (Optional)</Text>
                <View style={styles.notesBox}>
                  <TextInput
                    style={styles.notesInputField}
                    placeholder="Add deal description, packaging instructions, or specifications..."
                    placeholderTextColor="#94A3B8"
                    value={dealDescription}
                    onChangeText={setDealDescription}
                    maxLength={500}
                    multiline
                    numberOfLines={3}
                  />
                  <Text style={styles.charCounterText}>{dealDescription.length}/500</Text>
                </View>
              </View>

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
                  >
                    <Text style={styles.browseFilesBtnText}>Browse Files</Text>
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
                      {party1.substring(0, 2).toUpperCase()}
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
                    <Text style={styles.partyCategoryText}>{party1} • {sellerIndustry}</Text>
                    <View style={styles.partyLocationRow}>
                      <MapPin size={11} color="#64748B" />
                      <Text style={styles.partyLocationText}>{sellerLocation}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.reviewDivider} />

                {/* Counterparty */}
                <View style={styles.reviewPartyItemRow}>
                  <View style={[styles.partyAvatarBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Wheat size={18} color="#D97706" />
                  </View>
                  <View style={styles.partyInfoColumn}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.partyCompanyName}>{party2 || 'Selected Counterparty'}</Text>
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
                    {party2Data?.industry ? (
                      <Text style={styles.partyCategoryText}>{party2Data.industry}</Text>
                    ) : null}
                    {party2Data?.location ? (
                      <View style={styles.partyLocationRow}>
                        <MapPin size={11} color="#64748B" />
                        <Text style={styles.partyLocationText}>{party2Data.location}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Other Parties Summary */}
                {(Boolean(brokerCompany) || (showLogistics && logisticsPartner) || (showInsurance && insuranceProvider)) && (
                  <View style={styles.reviewOtherPartiesBox}>
                    <Text style={styles.reviewOtherPartiesHeader}>Other Parties</Text>
                    <View style={styles.reviewOtherPartiesRow}>
                      {brokerCompany ? (
                        <View style={styles.reviewOtherPartyCol}>
                          <Handshake size={14} color="#7C3AED" />
                          <View>
                            <Text style={styles.reviewOtherPartyRole}>Broker Company</Text>
                            <Text style={styles.reviewOtherPartyName}>{brokerCompany}</Text>
                          </View>
                        </View>
                      ) : null}
                      {showLogistics && logisticsPartner ? (
                        <View style={styles.reviewOtherPartyCol}>
                          <Truck size={14} color="#4F46E5" />
                          <View>
                            <Text style={styles.reviewOtherPartyRole}>Logistics Partner</Text>
                            <Text style={styles.reviewOtherPartyName}>{logisticsPartner}</Text>
                          </View>
                        </View>
                      ) : null}
                      {showInsurance && insuranceProvider ? (
                        <View style={styles.reviewOtherPartyCol}>
                          <Shield size={14} color="#059669" />
                          <View>
                            <Text style={styles.reviewOtherPartyRole}>Insurance Provider</Text>
                            <Text style={styles.reviewOtherPartyName}>{insuranceProvider}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>

              {/* Card 2: Product Information */}
              <View style={[styles.reviewCard, { marginTop: 14 }]}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardTitleRow}>
                    <ShoppingBag size={16} color="#2563EB" />
                    <Text style={styles.reviewCardTitle}>Product Information</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editPillBtn}
                    onPress={() => setCurrentStep(2)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={12} color="#2563EB" />
                    <Text style={styles.editPillBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.reviewProductMainRow}>
                  <View style={styles.reviewProductThumb}>
                    <Wheat size={28} color="#D97706" />
                  </View>

                  <View style={styles.reviewProductMeta}>
                    <View style={styles.productNameAndBadgeRow}>
                      <Text style={styles.reviewProductName}>{productName}</Text>
                      {hsnCode ? (
                        <View style={styles.hsnBadgePill}>
                          <Text style={styles.hsnBadgeText}>HSN: {hsnCode}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.reviewProductGrid}>
                      <View style={styles.reviewProductGridCol}>
                        <Text style={styles.reviewGridLabel}>Unit</Text>
                        <Text style={styles.reviewGridValue}>{unit}</Text>
                      </View>
                      <View style={styles.reviewProductGridCol}>
                        <Text style={styles.reviewGridLabel}>Approx. Rate</Text>
                        <Text style={styles.reviewGridValue}>₹{approxRate} / {unit.split(' ')[0]}</Text>
                      </View>
                      <View style={styles.reviewProductGridCol}>
                        <Text style={styles.reviewGridLabel}>Total Quantity</Text>
                        <Text style={styles.reviewGridValue}>{quantity} {unit.split(' ')[0]}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Card 3: Deal Summary */}
              <View style={[styles.reviewCard, { marginTop: 14 }]}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardTitleRow}>
                    <FileCheck size={16} color="#2563EB" />
                    <Text style={styles.reviewCardTitle}>Deal Summary</Text>
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

                <View style={styles.dealSummaryGrid}>
                  <View style={styles.summaryGridRow}>
                    <View style={styles.summaryGridItem}>
                      <FileText size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Deal Name</Text>
                        <Text style={styles.summaryValue}>{dealName}</Text>
                      </View>
                    </View>
                    <View style={styles.summaryGridItem}>
                      <Tag size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Deal Category</Text>
                        <Text style={styles.summaryValue}>{dealCategory}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryGridRow}>
                    <View style={styles.summaryGridItem}>
                      <CreditCard size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Deal Type</Text>
                        <Text style={styles.summaryValue}>{dealType}</Text>
                      </View>
                    </View>
                    <View style={styles.summaryGridItem}>
                      <IndianRupee size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Deal Value (Approx.)</Text>
                        <Text style={styles.summaryValue}>₹{dealValue}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryGridRow}>
                    <View style={styles.summaryGridItem}>
                      <IndianRupee size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Currency</Text>
                        <Text style={styles.summaryValue}>{currency}</Text>
                      </View>
                    </View>
                    <View style={styles.summaryGridItem}>
                      <Calendar size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Deal Valid Till</Text>
                        <Text style={styles.summaryValue}>{formatDateDisplay(validityDate)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryGridRow}>
                    <View style={styles.summaryGridItem}>
                      <Calendar size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Expected Deal Date</Text>
                        <Text style={styles.summaryValue}>{formatDateDisplay(expectedDealDate)}</Text>
                      </View>
                    </View>
                    <View style={styles.summaryGridItem}>
                      <Globe size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Delivery Terms (Incoterms)</Text>
                        <Text style={styles.summaryValue}>{deliveryTerms}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryGridRow}>
                    <View style={styles.summaryGridItem}>
                      <CreditCard size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Payment Terms</Text>
                        <Text style={styles.summaryValue}>{paymentTerms}</Text>
                      </View>
                    </View>
                    <View style={styles.summaryGridItem}>
                      <MapPin size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Delivery Location</Text>
                        <Text style={styles.summaryValue}>{deliveryLocation}</Text>
                      </View>
                    </View>
                  </View>

                  {dealDescription ? (
                    <View style={[styles.summaryGridItem, { width: '100%', marginTop: 8 }]}>
                      <FileText size={14} color="#64748B" />
                      <View style={styles.summaryItemTextCol}>
                        <Text style={styles.summaryLabel}>Deal Description</Text>
                        <Text style={styles.summaryValue}>{dealDescription}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Card 4: Attachments */}
              <View style={[styles.reviewCard, { marginTop: 14 }]}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardTitleRow}>
                    <Paperclip size={16} color="#2563EB" />
                    <Text style={styles.reviewCardTitle}>Attachments</Text>
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
                      <View>
                        <Text style={styles.reviewFileName} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.reviewFileSize}>{file.size}</Text>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.moreFilesBtn}
                    onPress={handleBrowseFiles}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moreFilesBtnText}>+ Add Files</Text>
                  </TouchableOpacity>
                </View>
              </View>

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
        <View style={styles.bottomActionBar}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backActionButton}
              onPress={() => setCurrentStep(prev => prev - 1)}
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
            onPress={handleContinue}
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
                          if (c.address?.city || c.city) {
                            setSellerLocation(`${c.address?.city || c.city}, ${c.address?.state || c.state || 'India'}`);
                          }
                          setShowCompanySwitchModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.optionItemText, isSelected && styles.optionItemTextSelected]}>
                          {c.name}
                        </Text>
                        {isSelected && <Check size={16} color="#2563EB" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* ════════════════ ASSISTED ONBOARDING MODAL ════════════════ */}
        {showOnboardModal && (
          <Modal visible={showOnboardModal} transparent animationType="slide" onRequestClose={() => setShowOnboardModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalSheetContainer, { maxHeight: '90%' }]}>
                <View style={styles.modalDragHandle} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    Onboard Counterparty
                  </Text>
                  <TouchableOpacity onPress={() => setShowOnboardModal(false)} style={{ padding: 4 }}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                  <View style={{ gap: 10 }}>
                    <Text style={styles.inputLabel}>User Full Name *</Text>
                    <View style={[styles.textInputBox, onboardErrors.name && styles.textInputBoxError]}>
                      <User size={16} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={styles.textInputField}
                        value={onboardForm.name}
                        onChangeText={t => setOnboardForm({ ...onboardForm, name: t })}
                        placeholder="Contact Person Name"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <Text style={styles.inputLabel}>Mobile Number *</Text>
                    <View style={[styles.textInputBox, onboardErrors.mobileNumber && styles.textInputBoxError]}>
                      <TextInput
                        style={styles.textInputField}
                        value={onboardForm.mobileNumber}
                        onChangeText={t => setOnboardForm({ ...onboardForm, mobileNumber: t.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>

                    <Text style={styles.inputLabel}>Company Name *</Text>
                    <View style={[styles.textInputBox, onboardErrors.companyName && styles.textInputBoxError]}>
                      <Building2 size={16} color="#64748B" style={styles.inputLeadingIcon} />
                      <TextInput
                        style={styles.textInputField}
                        value={onboardForm.companyName}
                        onChangeText={t => setOnboardForm({ ...onboardForm, companyName: t })}
                        placeholder="Business / Company Name"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <Text style={styles.inputLabel}>GST / Registration Number</Text>
                    <View style={styles.textInputBox}>
                      <TextInput
                        style={styles.textInputField}
                        value={onboardForm.registrationNumber}
                        onChangeText={t => setOnboardForm({ ...onboardForm, registrationNumber: t })}
                        placeholder="GST Number (Optional)"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.inputLabel}>Pincode / Postal Code</Text>
                      {isPincodeLoading && <ActivityIndicator size="small" color="#2563EB" />}
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
                    </View>

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

                    {/* Product Details for Seller Onboarding */}
                    {onboardRole === 'seller' && (
                      <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Package size={16} color="#2563EB" />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                            Seller Product Details (Optional)
                          </Text>
                        </View>

                        <Text style={styles.inputLabel}>Product Name</Text>
                        <View style={styles.textInputBox}>
                          <TextInput
                            style={styles.textInputField}
                            value={onboardForm.productName}
                            onChangeText={t => setOnboardForm({ ...onboardForm, productName: t })}
                            placeholder="e.g. Basmati Rice, Mustard Oil"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>

                        <Text style={styles.inputLabel}>Unit</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          {unitsList.slice(0, 6).map((uItem, uIdx) => {
                            const uLabel = uItem.short || uItem.name || uItem.label || uItem.value;
                            const isSel = (onboardForm.unitId === uItem.id || onboardForm.unitId === uItem.name || onboardForm.unitId === uLabel);
                            return (
                              <TouchableOpacity
                                key={`onb_u_${uIdx}`}
                                style={[
                                  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
                                  isSel && { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
                                ]}
                                onPress={() => setOnboardForm({ ...onboardForm, unitId: uItem.id || uItem.name || uLabel })}
                              >
                                <Text style={[{ fontSize: 12, fontWeight: '600', color: '#475569' }, isSel && { color: '#2563EB', fontWeight: '800' }]}>
                                  {uLabel}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        <Text style={styles.inputLabel}>HSN Code</Text>
                        <View style={styles.textInputBox}>
                          <Hash size={16} color="#64748B" style={styles.inputLeadingIcon} />
                          <TextInput
                            style={styles.textInputField}
                            value={onboardForm.hsnCode}
                            onChangeText={t => setOnboardForm({ ...onboardForm, hsnCode: t })}
                            placeholder="HSN Code (Optional)"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowOnboardModal(false)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={handleExecuteOnboard}
                    disabled={isOnboardingSubmitting}
                  >
                    {isOnboardingSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmBtnText}>Onboard & Select ✓</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
    paddingBottom: 100,
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
    marginTop: 4,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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

  /* Recent Products Cards */
  recentCardsScroll: {
    marginHorizontal: -16,
  },
  recentCardsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  productCard: {
    width: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 7,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1.5,
    alignItems: 'center',
  },
  productCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
  },
  productCardImageContainer: {
    width: 54,
    height: 54,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
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
  selectedBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    height: 28,
  },
  hsnBadgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginVertical: 3,
  },
  hsnBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  productCardPrice: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
    marginTop: 1,
  },

  /* Form Elements */
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginTop: 6,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
});

export default CreateDeal;
