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
} from 'lucide-react-native';
import {
  createDeal,
  getUserProfile,
  inviteDeal,
  getProducts,
  getCategories,
  createCategory,
  createProduct,
  getCompanies,
  getCompanyDetails,
} from '../../services/api';
import { Linking } from 'react-native';

const CreateDeal = ({ onNavigate, routeData }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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
  const initialCompany = routeData?.originCompany || routeData?.company || routeData?.user?.companies?.[0];
  const [party1, setParty1] = useState(initialCompany?.name || 'My Company');
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

  const [role, setRole] = useState(routeData?.prefill?.role || 'seller');
  const [brokerCompanyId, setBrokerCompanyId] = useState(routeData?.prefill?.brokerCompanyId || '');
  const [brokerCompany, setBrokerCompany] = useState('');
  const [brokerCompanyData, setBrokerCompanyData] = useState(null);

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
    }];
  };

  const [productsList, setProductsList] = useState(getInitialProductsList());
  const [activeTabId, setActiveTabId] = useState(productsList[0]?.id || Date.now());

  const addProductItem = () => {
    const newId = Date.now() + Math.random();
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

  React.useEffect(() => {
    if (activeUserCompany && !routeData?.prefill?.role) {
      const coType = String(activeUserCompany.companyType || activeUserCompany.type || '').toLowerCase();
      setRole(coType === 'broker' ? 'broker' : coType === 'buyer' ? 'buyer' : 'seller');
    }
  }, [activeUserCompany, routeData]);

  React.useEffect(() => {
    const hasPrefill = routeData?.selectedContact || routeData?.prefillParty2 || routeData?.prefill?.buyerCompany || routeData?.prefill?.buyerCompanyId || routeData?.prefill?.party2 || routeData?.prefill?.brokerCompanyId;
    if (!hasPrefill) {
      setParty2('');
      setParty2Data(null);
      setSellerCompany('');
      setSellerCompanyData(null);
      setBrokerCompany('');
      setBrokerCompanyData(null);
      setBrokerCompanyId('');
    }
  }, [role, activeUserCompany, routeData]);

  // Company Product Inventory Sync
  const [companyProducts, setCompanyProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  React.useEffect(() => {
    const fetchCompanyInventory = async () => {
      const targetCompany = role === 'seller' ? activeUserCompany : role === 'buyer' ? party2Data : sellerCompanyData;
      if (!targetCompany) {
        setCompanyProducts([]);
        return;
      }
      try {
        const token = await AsyncStorage.getItem('userToken');
        const companyId = targetCompany?._id || targetCompany?.id || targetCompany?.companyId;
        if (!companyId) return;
        const response = await getProducts(companyId, token);
        if (response && response.success && response.data) {
          setCompanyProducts(response.data);
        }
      } catch (e) {
        console.warn('Failed to load company products:', e);
      }
    };
    fetchCompanyInventory();
  }, [activeUserCompany, party2Data, sellerCompanyData, role]);

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

        if (!targetCo) {
          const companiesRes = await getCompanies(1, 10);
          if (companiesRes && companiesRes.success && companiesRes.data?.companies?.length > 0) {
            targetCo = companiesRes.data.companies[0];
          }
        }

        if (!targetCo && userCompanies.length > 0) {
          targetCo = userCompanies[0];
        }

        if (targetCo) {
          setActiveUserCompany(targetCo);
          setParty1(targetCo.name);
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

  const resolveProductId = async (name, companyId, token) => {
    try {
      const productsRes = await getProducts(companyId, token);
      if (productsRes && productsRes.success && productsRes.data && productsRes.data.length > 0) {
        const matched = productsRes.data.find(
          p => String(p.name || '').toLowerCase().trim() === String(name).toLowerCase().trim()
        );
        if (matched) return matched._id || matched.id;
      }
      let categoryId = null;
      const categoriesRes = await getCategories(companyId, token);
      if (categoriesRes && categoriesRes.success && categoriesRes.data && categoriesRes.data.length > 0) {
        categoryId = categoriesRes.data[0]._id || categoriesRes.data[0].id;
      } else {
        const catRes = await createCategory({ name: 'General', companyId }, token);
        if (catRes && catRes.success && catRes.data) {
          categoryId = catRes.data._id || catRes.data.id;
        }
      }
      if (!categoryId) throw new Error('Could not resolve or create category');
      const productPayload = {
        name,
        categoryId,
        unitId: '6a0c118913e627687603da11',
        companyId,
        description: 'Dynamically created product for deal invitation',
      };
      const newProductRes = await createProduct(productPayload, token);
      if (newProductRes && newProductRes.success && newProductRes.data) {
        return newProductRes.data._id || newProductRes.data.id;
      }
      throw new Error('Failed to create new product');
    } catch (error) {
      console.warn('Dynamic product resolution failed:', error);
      throw new Error(`Unable to resolve Product ID for "${name}". Please add the product to your inventory first.`);
    }
  };

  const handleCreateDeal = async () => {
    const activeProducts = productsList.filter(prod =>
      (prod.productName && String(prod.productName).trim()) ||
      (prod.quantity && String(prod.quantity).trim()) ||
      (prod.price && String(prod.price).trim())
    );

    if (activeProducts.length === 0) {
      Alert.alert('Validation Error', 'Please complete at least one product ledger in your Sauda.');
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
      Alert.alert('Validation Error', 'Please complete all required fields for your products ledger.');
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
        if (data && (data.companyId || data._id || data.id)) {
          const cid = String(data.companyId || data._id || data.id);
          if (cid.length === 24) return cid;
        }
        if (fallback && fallback.length === 24) return fallback;
        return undefined;
      };

      const resolvedSellerId = role === 'seller'
        ? originCompanyId
        : role === 'buyer'
          ? getValidCompanyId(party2Data, party2)
          : getValidCompanyId(sellerCompanyData, sellerCompany);

      const resolvedBuyerId = role === 'seller'
        ? getValidCompanyId(party2Data, party2)
        : role === 'buyer'
          ? originCompanyId
          : getValidCompanyId(party2Data, party2);

      const isInviteMode = party2Data?.isRegistered === false || (role === 'broker' && sellerCompanyData?.isRegistered === false);

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

        const resolvedProductId = await resolveProductId(prod.productName, sellerIdForProduct, token);

        return {
          productId: resolvedProductId,
          quantity: numericQuantity,
          price: numericPrice,
          paymentTerms: prod.paymentTerms || undefined,
          discount: prod.discount ? numericDiscount : undefined,
          gst: prod.gst ? numericGst : undefined,
        };
      }));

      if (isInviteMode) {
        let inviteContact = party2Data;
        if (party2Data?.isRegistered === false) {
          inviteContact = party2Data;
        } else if (role === 'broker' && sellerCompanyData?.isRegistered === false) {
          inviteContact = sellerCompanyData;
        }

        const receiverMobileNumber = inviteContact?.mobile || inviteContact?.phone || inviteContact?.mobileNumber || party2;
        const receiverName = inviteContact?.name || party2;

        const invitePayload = {
          receiverMobileNumber,
          receiverName,
          dealDraft: {
            role,
            sellerCompanyId: resolvedSellerId,
            buyerCompanyId: resolvedBuyerId,
            myCompanyId: role === 'broker' ? String(originCompanyId) : undefined,
            brokerCompanyId: (role !== 'broker' && brokerCompanyId) ? brokerCompanyId : undefined,
            products: resolvedProducts,
            totalAmount: Number(totalAmountValue),
            discount: Number(totalDiscountValue),
            expiryDate: new Date(validityDate).toISOString(),
            notes: description || 'Bulk trading Sauda ledger invitation.',
          },
        };
        const response = await inviteDeal(invitePayload, token);
        if (response && response.success) {
          setShowSuccessModal(true);
          if (response.data?.whatsappUrl) {
            setTimeout(() => {
              Linking.openURL(response.data.whatsappUrl).catch(err => console.warn('Failed to open WhatsApp URL:', err));
            }, 800);
          }
          setTimeout(() => {
            setShowSuccessModal(false);
            onNavigate('DealsList', {}, { refresh: true });
          }, 2500);
        } else {
          Alert.alert('Invite Error', response?.message || 'Failed to create deal invitation.');
        }
      } else {
        if (!resolvedSellerId || !resolvedBuyerId) {
          Alert.alert('Identity Error', 'Missing Buyer or Seller ID to establish agreement.');
          setIsSubmitting(false);
          return;
        }
        const payload = {
          role,
          sellerCompanyId: resolvedSellerId,
          buyerCompanyId: resolvedBuyerId,
          myCompanyId: role === 'broker' ? String(originCompanyId) : undefined,
          brokerCompanyId: (role !== 'broker' && brokerCompanyId) ? brokerCompanyId : undefined,
          products: resolvedProducts,
          expiryDate: new Date(validityDate).toISOString(),
          notes: description || undefined,
        };
        const response = await createDeal(payload, token);
        if (response && response.success) {
          setShowSuccessModal(true);
          setTimeout(() => {
            setShowSuccessModal(false);
            onNavigate('DealsList', {}, { refresh: true });
          }, 2000);
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
  const isInviteMode = party2Data?.isRegistered === false || (role === 'broker' && sellerCompanyData?.isRegistered === false);

  const getRoleTheme = () => {
    if (role === 'buyer') return { color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', glow: '#0284C7' };
    if (role === 'broker') return { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', glow: '#7C3AED' };
    return { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', glow: '#059669' };
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
            ]}>Ledger</Text>
          </View>

          <View style={[styles.wizardStepLine, currentStep >= 3 && { backgroundColor: rTheme.color }]} />

          <View style={styles.wizardStepCol}>
            <View style={[
              styles.wizardStepCircle,
              currentStep >= 3 && [styles.wizardStepCircleActive, { backgroundColor: rTheme.bg, borderColor: rTheme.color }]
            ]}>
              <Text style={[
                styles.wizardStepCircleText,
                currentStep >= 3 && [styles.wizardStepCircleTextActive, { color: rTheme.color }]
              ]}>3</Text>
            </View>
            <Text style={[
              styles.wizardStepLabel,
              currentStep === 3 && { color: rTheme.color, fontWeight: '800' }
            ]}>Terms</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ═══════════ CARD 1: IDENTITY (STEP 1) ═══════════ */}
          {currentStep === 1 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#0284C7' }]} />
                <Text style={styles.sectionTitle}>Identity & Trade Role</Text>
                <View style={styles.sectionBadgeContainer}>
                  <Text style={[styles.sectionBadge, { color: '#0284C7', backgroundColor: '#E0F2FE' }]}>STEP 1</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {/* Role Selector */}
                <Text style={styles.fieldLabel}>Your Trade Role</Text>
                <View style={styles.roleContainer}>
                  {['seller', 'buyer'].map((r) => {
                    const isActive = role === r;
                    const config = {
                      seller: { icon: <Building2 size={14} color={isActive ? '#FFFFFF' : '#64748B'} /> },
                      buyer: { icon: <User size={14} color={isActive ? '#FFFFFF' : '#64748B'} /> },
                    }[r];
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleTab,
                          isActive && styles.roleTabActive
                        ]}
                        onPress={() => setRole(r)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {config.icon}
                          <Text style={[
                            styles.roleTabText,
                            { color: isActive ? '#FFFFFF' : '#64748B' },
                            isActive && styles.roleTabTextActive
                          ]}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Origin Company Card */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>
                    {role === 'buyer' ? 'My Buyer Company' : role === 'broker' ? 'My Broker Firm' : 'My Seller Company'}
                  </Text>
                  <View style={[styles.profileCard, { borderColor: rTheme.border, backgroundColor: '#FFFFFF', shadowColor: rTheme.glow }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: rTheme.color, shadowColor: rTheme.glow }]}>
                      <Text style={styles.profileAvatarText}>{party1.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileCardInfo}>
                      <Text style={[styles.profileCardName, { color: '#0F172A' }]}>{party1}</Text>
                      <Text style={[styles.profileCardRole, { color: rTheme.color }]}>
                        {role === 'buyer' ? 'BUYER PROFILE' : role === 'broker' ? 'BROKER PROFILE' : 'SELLER PROFILE'}
                      </Text>
                    </View>
                    <View style={[styles.profileCardBadge, { backgroundColor: rTheme.bg, borderColor: rTheme.border, borderWidth: 1 }]}>
                      <Text style={[styles.profileCardBadgeText, { color: rTheme.color }]}>✓ Verified</Text>
                    </View>
                  </View>
                </View>

                {/* Visual Flow Connector */}
                <View style={styles.flowConnectorContainer}>
                  <View style={styles.flowConnectorLine} />
                  <View style={[styles.flowConnectorBadge, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
                    <Handshake size={14} color="#94A3B8" />
                  </View>
                  <View style={styles.flowConnectorLine} />
                </View>

                {/* Seller Company Selector (Only for Broker) */}
                {role === 'broker' && (
                  <View style={[styles.inputGroup, { marginBottom: 12 }]}>
                    <Text style={styles.fieldLabel}>Seller Company*</Text>

                    {sellerCompany && sellerCompanyData ? (
                      <TouchableOpacity
                        style={[
                          styles.profileCard,
                          {
                            borderColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#E2E8F0',
                            backgroundColor: '#FFFFFF',
                            shadowColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#0284C7',
                          }
                        ]}
                        onPress={() => {
                          setFieldErrors(prev => ({ ...prev, sellerCompany: undefined }));
                          onNavigate('ContactPicker', { pickingFor: 'sellerCompany' });
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.profileAvatar, { backgroundColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#0284C7', shadowColor: sellerCompanyData.isRegistered === false ? '#F59E0B' : '#0284C7' }]}>
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
                            { color: sellerCompanyData.isRegistered === false ? '#D97706' : '#0284C7' }
                          ]}>
                            {sellerCompanyData.isRegistered === false ? 'NOT YET REGISTERED' : 'ON PRAVISTI'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[
                            styles.profileCardBadge,
                            {
                              backgroundColor: sellerCompanyData.isRegistered === false ? '#FEF3C7' : '#E0F2FE',
                              borderColor: sellerCompanyData.isRegistered === false ? '#FCD34D' : '#BAE6FD',
                              borderWidth: 1,
                            }
                          ]}>
                            <Text style={[
                              styles.profileCardBadgeText,
                              { color: sellerCompanyData.isRegistered === false ? '#D97706' : '#0284C7' }
                            ]}>
                              {sellerCompanyData.isRegistered === false ? 'Invite' : 'Active'}
                            </Text>
                          </View>
                          <Text style={styles.changeText}>Edit ›</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.counterpartySelector,
                          fieldErrors.sellerCompany && styles.inputError
                        ]}
                        onPress={() => {
                          setFocusedField('sellerCompany');
                          setFieldErrors(prev => ({ ...prev, sellerCompany: undefined }));
                          onNavigate('ContactPicker', { pickingFor: 'sellerCompany' });
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.counterpartySelectorInner}>
                          <View style={styles.selectorAvatarPlaceholder}>
                            <Building2 size={16} color="#94A3B8" />
                          </View>
                          <View>
                            <Text style={styles.counterpartySelectorLabel}>Select Seller Company</Text>
                            <Text style={styles.counterpartySelectorHint}>Pick from your contact directory</Text>
                          </View>
                        </View>
                        <Text style={styles.dropdownIcon}>›</Text>
                      </TouchableOpacity>
                    )}
                    {fieldErrors.sellerCompany && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.sellerCompany}</Text>}
                  </View>
                )}

                {/* Visual Flow Connector (between Seller and Buyer in Broker mode) */}
                {role === 'broker' && (
                  <View style={styles.flowConnectorContainer}>
                    <View style={styles.flowConnectorLine} />
                    <View style={[styles.flowConnectorBadge, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
                      <Box size={14} color="#94A3B8" />
                    </View>
                    <View style={styles.flowConnectorLine} />
                  </View>
                )}

                {/* Buyer / Counterparty Selector */}
                <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                  <Text style={styles.fieldLabel}>
                    {role === 'broker' ? 'Buyer Company*' : role === 'buyer' ? 'Counterparty Seller*' : 'Counterparty Buyer*'}
                  </Text>

                  {party2 && party2Data ? (
                    <TouchableOpacity
                      style={[
                        styles.profileCard,
                        {
                          borderColor: party2Data.isRegistered === false ? '#F59E0B' : '#E2E8F0',
                          backgroundColor: '#FFFFFF',
                          shadowColor: party2Data.isRegistered === false ? '#F59E0B' : '#0284C7',
                        }
                      ]}
                      onPress={() => {
                        setFieldErrors(prev => ({ ...prev, party2: undefined }));
                        onNavigate('ContactPicker', { pickingFor: 'party2' });
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.profileAvatar, { backgroundColor: party2Data.isRegistered === false ? '#F59E0B' : '#0284C7', shadowColor: party2Data.isRegistered === false ? '#F59E0B' : '#0284C7' }]}>
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
                          { color: party2Data.isRegistered === false ? '#D97706' : '#0284C7' }
                        ]}>
                          {party2Data.isRegistered === false ? 'NOT YET REGISTERED' : 'ON PRAVISTI'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[
                          styles.profileCardBadge,
                          {
                            backgroundColor: party2Data.isRegistered === false ? '#FEF3C7' : '#E0F2FE',
                            borderColor: party2Data.isRegistered === false ? '#FCD34D' : '#BAE6FD',
                            borderWidth: 1,
                          }
                        ]}>
                          <Text style={[
                            styles.profileCardBadgeText,
                            { color: party2Data.isRegistered === false ? '#D97706' : '#0284C7' }
                          ]}>
                            {party2Data.isRegistered === false ? 'Invite' : 'Active'}
                          </Text>
                        </View>
                        <Text style={styles.changeText}>Edit ›</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.counterpartySelector,
                        fieldErrors.party2 && styles.inputError
                      ]}
                      onPress={() => {
                        setFocusedField('party2');
                        setFieldErrors(prev => ({ ...prev, party2: undefined }));
                        onNavigate('ContactPicker', { pickingFor: 'party2' });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.counterpartySelectorInner}>
                        <View style={styles.selectorAvatarPlaceholder}>
                          <User size={16} color="#94A3B8" />
                        </View>
                        <View>
                          <Text style={styles.counterpartySelectorLabel}>
                            {role === 'broker' ? 'Select Buyer Company' : `Select Counterparty ${role === 'buyer' ? 'Seller' : 'Buyer'}`}
                          </Text>
                          <Text style={styles.counterpartySelectorHint}>Pick from your contact directory</Text>
                        </View>
                      </View>
                      <Text style={styles.dropdownIcon}>›</Text>
                    </TouchableOpacity>
                  )}
                  {fieldErrors.party2 && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.party2}</Text>}
                </View>

                {/* Broker Company Selector (Optional - only if role is not broker) */}
                {role !== 'broker' && (
                  <View style={[styles.inputGroup, { marginTop: 16, marginBottom: 0 }]}>
                    <Text style={styles.fieldLabel}>Broker Company (Optional)</Text>

                    {brokerCompany && brokerCompanyData ? (
                      <View
                        style={[
                          styles.profileCard,
                          {
                            borderColor: brokerCompanyData.isRegistered === false ? '#F59E0B' : '#E2E8F0',
                            backgroundColor: '#FFFFFF',
                            shadowColor: brokerCompanyData.isRegistered === false ? '#F59E0B' : '#7C3AED',
                          }
                        ]}
                      >
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                          onPress={() => {
                            onNavigate('ContactPicker', { pickingFor: 'brokerCompany' });
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
                          <Text style={styles.changeText}>Edit ›</Text>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.counterpartySelector}
                        onPress={() => {
                          setFocusedField('brokerCompany');
                          onNavigate('ContactPicker', { pickingFor: 'brokerCompany' });
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.counterpartySelectorInner}>
                          <View style={styles.selectorAvatarPlaceholder}>
                            <Briefcase size={16} color="#94A3B8" />
                          </View>
                          <View>
                            <Text style={styles.counterpartySelectorLabel}>Select Broker Company</Text>
                            <Text style={styles.counterpartySelectorHint}>Pick from your contact directory</Text>
                          </View>
                        </View>
                        <Text style={styles.dropdownIcon}>›</Text>
                      </TouchableOpacity>
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
                style={[styles.wizardNextBtn, { backgroundColor: rTheme.color }]}
                onPress={() => {
                  const errors = {};
                  if (role === 'broker') {
                    if (!party2) errors.party2 = 'Please select a buyer company';
                    if (!sellerCompany) errors.sellerCompany = 'Please select a seller company';
                  } else {
                    if (!party2) errors.party2 = `Please select a ${role === 'buyer' ? 'seller' : 'buyer'} company`;
                  }
                  if (Object.keys(errors).length > 0) {
                    setFieldErrors(errors);
                    Alert.alert('Validation Error', 'Please select trade counterparties first.');
                    return;
                  }
                  setFieldErrors({});
                  setCurrentStep(2);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.wizardNextBtnText}>Continue to Products Ledger ›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════ CARD 2: PRODUCT LEDGER (STEP 2) ═══════════ */}
          {currentStep === 2 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#0284C7' }]} />
                <Text style={styles.sectionTitle}>Product Ledger & Value</Text>
                <View style={styles.sectionBadgeContainer}>
                  <Text style={[styles.sectionBadge, { color: '#0284C7', backgroundColor: '#E0F2FE' }]}>STEP 2</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {/* Horizontal Tabs Row */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsScrollContent}
                >
                  {productsList.map((prod, idx) => {
                    const isActive = prod.id === activeTabId;
                    const label = prod.productName.trim() || `Product #${idx + 1}`;
                    return (
                      <TouchableOpacity
                        key={prod.id}
                        style={[
                          styles.tabItem,
                          isActive && [styles.tabItemActive, { backgroundColor: rTheme.bg, borderColor: rTheme.border }]
                        ]}
                        onPress={() => setActiveTabId(prod.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.tabItemText,
                          isActive && [styles.tabItemTextActive, { color: rTheme.color }]
                        ]}>
                          {label}
                        </Text>
                        {productsList.length > 1 && (
                          <TouchableOpacity
                            style={styles.tabDeleteBtn}
                            onPress={() => removeProductItem(prod.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.tabDeleteText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.addTabBtn, { borderColor: rTheme.border }]}
                    onPress={addProductItem}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.addTabBtnText, { color: rTheme.color }]}>+ Add</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Single Active Product Form Card */}
                {(() => {
                  const prod = productsList.find(p => p.id === activeTabId) || productsList[0];
                  if (!prod) return null;
                  const prodErrors = fieldErrors[`product_${prod.id}`] || {};

                  return (
                    <View key={prod.id} style={styles.productItemCard}>
                      {/* Product Name Input */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Product / Commodity Name*</Text>

                        {companyProducts.length > 0 && (
                          <View style={{ marginBottom: 10 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                              {companyProducts.map((p) => {
                                const isSel = String(prod.productName).toLowerCase().trim() === String(p.name || '').toLowerCase().trim();
                                return (
                                  <TouchableOpacity
                                    key={p._id || p.id}
                                    style={[styles.productChip, isSel && styles.productChipActive]}
                                    onPress={() => {
                                      updateProductField(prod.id, 'productName', p.name);
                                      updateProductField(prod.id, 'showProductDropdown', false);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      {p.image ? (
                                        <Image source={{ uri: p.image }} style={styles.miniProductImage} />
                                      ) : (
                                        <Box size={12} color="#94A3B8" />
                                      )}
                                      <Text style={[styles.productChipText, isSel && styles.productChipTextActive]}>
                                        {p.name}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}

                        <View style={styles.productInputWrapper}>
                          <TextInput
                            style={[
                              styles.textInput,
                              focusedField === `productName_${prod.id}` && [styles.inputFocused, { shadowColor: '#0284C7', borderColor: '#0284C7' }],
                              prodErrors.productName && styles.inputError,
                              { flex: 1 }
                            ]}
                            placeholder="Type product name (e.g. Cotton Bales)"
                            placeholderTextColor="#94A3B8"
                            value={prod.productName}
                            onChangeText={(v) => handleProductNameChange(prod.id, v)}
                            onFocus={() => {
                              setFocusedField(`productName_${prod.id}`);
                              updateProductField(prod.id, 'showProductDropdown', true);
                            }}
                            onBlur={() => {
                              // Delay collapse slightly to allow clicking item list
                              setTimeout(() => {
                                updateProductField(prod.id, 'showProductDropdown', false);
                                setFocusedField('');
                              }, 200);
                            }}
                          />
                        </View>
                        {prodErrors.productName && <Text style={styles.fieldErrorText}>⚠ {prodErrors.productName}</Text>}

                        {prod.showProductDropdown && prod.productName.trim().length > 0 && (() => {
                          const filtered = productsData.filter(p => p.name.toLowerCase().includes(prod.productName.toLowerCase()));
                          if (filtered.length === 0) return null;
                          return (
                            <View style={styles.autocompleteDropdown}>
                              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 150 }}>
                                {filtered.map((p) => (
                                  <TouchableOpacity
                                    key={p._id || p.id}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                      updateProductField(prod.id, 'productName', p.name);
                                      updateProductField(prod.id, 'showProductDropdown', false);
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      {p.image ? (
                                        <Image source={{ uri: p.image }} style={styles.dropdownProductImage} />
                                      ) : (
                                        <Box size={14} color="#94A3B8" />
                                      )}
                                      <Text style={styles.dropdownItemText}>{p.name}</Text>
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
                          <Text style={styles.fieldLabel}>Quantity*</Text>
                          <TextInput
                            style={[
                              styles.textInput,
                              focusedField === `quantity_${prod.id}` && [styles.inputFocused, { shadowColor: '#0284C7', borderColor: '#0284C7' }],
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
                            onBlur={() => setFocusedField('')}
                          />
                          {prodErrors.quantity && <Text style={styles.fieldErrorText}>⚠ {prodErrors.quantity}</Text>}
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Price / Unit*</Text>
                          <TextInput
                            style={[
                              styles.textInput,
                              focusedField === `price_${prod.id}` && [styles.inputFocused, { shadowColor: '#0284C7', borderColor: '#0284C7' }],
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
                            onBlur={() => setFocusedField('')}
                          />
                          {prodErrors.price && <Text style={styles.fieldErrorText}>⚠ {prodErrors.price}</Text>}
                        </View>
                      </View>

                      {/* Discount & GST row */}
                      <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Discount (₹)</Text>
                          <TextInput
                            style={[styles.textInput, focusedField === `discount_${prod.id}` && styles.inputFocused]}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            value={prod.discount}
                            onChangeText={(v) => updateProductField(prod.id, 'discount', v)}
                            keyboardType="numeric"
                            onFocus={() => setFocusedField(`discount_${prod.id}`)}
                            onBlur={() => setFocusedField('')}
                          />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>GST (%)</Text>
                          <TextInput
                            style={[styles.textInput, focusedField === `gst_${prod.id}` && styles.inputFocused]}
                            placeholder="e.g. 18"
                            placeholderTextColor="#94A3B8"
                            value={prod.gst}
                            onChangeText={(v) => updateProductField(prod.id, 'gst', v)}
                            keyboardType="numeric"
                            onFocus={() => setFocusedField(`gst_${prod.id}`)}
                            onBlur={() => setFocusedField('')}
                          />
                        </View>
                      </View>

                      {/* Payment Terms row */}
                      <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                        <Text style={styles.fieldLabel}>Payment Terms</Text>
                        <TextInput
                          style={[styles.textInput, focusedField === `paymentTerms_${prod.id}` && styles.inputFocused]}
                          placeholder="e.g. 100% Advance"
                          placeholderTextColor="#94A3B8"
                          value={prod.paymentTerms}
                          onChangeText={(v) => updateProductField(prod.id, 'paymentTerms', v)}
                          onFocus={() => setFocusedField(`paymentTerms_${prod.id}`)}
                          onBlur={() => setFocusedField('')}
                        />
                      </View>
                    </View>
                  );
                })()}

                {role !== 'broker' && (
                  <View style={[styles.inputGroup, { marginTop: 14, marginBottom: 0 }]}>
                    <Text style={styles.fieldLabel}>Broker Company ID (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, focusedField === 'brokerCompanyId' && styles.inputFocused]}
                      placeholder="Provide Broker ID to register commissions"
                      placeholderTextColor="#94A3B8"
                      value={brokerCompanyId}
                      onChangeText={setBrokerCompanyId}
                      onFocus={() => setFocusedField('brokerCompanyId')}
                      onBlur={() => setFocusedField('')}
                    />
                  </View>
                )}

                {/* Ticket Stub Total Value (Elegant Contrast element) */}
                {showTicketStub && (
                  <View style={styles.ticketStub}>
                    <View style={styles.ticketLeft}>
                      <Text style={styles.ticketLabel}>ESTIMATED CONTRACT VALUE</Text>
                      <Text style={styles.ticketValue}>₹ {totals.total.toLocaleString('en-IN')}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {totals.discount > 0 && (
                          <Text style={styles.ticketDiscount}>After ₹{totals.discount.toLocaleString('en-IN')} disc.</Text>
                        )}
                        {totals.gstAmount > 0 && (
                          <Text style={styles.ticketDiscount}>Incl. GST (+₹{totals.gstAmount.toLocaleString('en-IN')})</Text>
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
          )}

          {/* Step 2 Navigation Row */}
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
                style={[styles.wizardNextBtn, { backgroundColor: rTheme.color, flex: 2 }]}
                onPress={() => {
                  const activeProd = productsList.find(p => p.id === activeTabId) || productsList[0];
                  const errors = {};
                  if (!activeProd || !activeProd.productName.trim()) {
                    errors[`product_${activeProd?.id}`] = { productName: 'Product name is required' };
                  } else {
                    if (!activeProd.quantity.trim()) errors[`product_${activeProd.id}`] = { ...errors[`product_${activeProd.id}`], quantity: 'Quantity is required' };
                    if (!activeProd.price.trim()) errors[`product_${activeProd.id}`] = { ...errors[`product_${activeProd.id}`], price: 'Price is required' };
                  }
                  if (Object.keys(errors).length > 0) {
                    setFieldErrors(errors);
                    Alert.alert('Validation Error', 'Please complete the product ledger fields first.');
                    return;
                  }
                  setFieldErrors({});
                  setCurrentStep(3);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.wizardNextBtnText}>Continue to Terms ›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══════════ CARD 3: TERMS (STEP 3) ═══════════ */}
          {currentStep === 3 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#0284C7' }]} />
                <Text style={styles.sectionTitle}>Agreement Terms & Dates</Text>
                <View style={styles.sectionBadgeContainer}>
                  <Text style={[styles.sectionBadge, { color: '#0284C7', backgroundColor: '#E0F2FE' }]}>STEP 3</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {/* Date Selectors */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Agreement Date</Text>
                    <TouchableOpacity
                      style={[styles.dateSelector, focusedField === 'dealDate' && styles.inputFocused]}
                      onPress={() => { setFocusedField('dealDate'); openDatePicker('deal'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dateSelectorText}>{formatDateLabel(dealDate)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Validity Expiry</Text>
                    <TouchableOpacity
                      style={[styles.dateSelector, focusedField === 'validityDate' && styles.inputFocused]}
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
                      focusedField === 'description' && [styles.inputFocused, { shadowColor: '#0284C7', borderColor: '#0284C7' }]
                    ]}
                    placeholder="Specify delivery locations, commission terms, quality specs..."
                    placeholderTextColor="#94A3B8"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 3 Navigation Row */}
          {currentStep === 3 && (
            <View style={styles.wizardNavRow}>
              <TouchableOpacity
                style={styles.wizardBackBtn}
                onPress={() => setCurrentStep(2)}
                activeOpacity={0.8}
              >
                <Text style={styles.wizardBackBtnText}>‹ Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                  isInviteMode && styles.inviteButton,
                  { flex: 2, marginTop: 0 }
                ]}
                activeOpacity={0.85}
                onPress={handleCreateDeal}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.submitButtonContent}>
                    {isInviteMode ? (
                      <Send size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    ) : (
                      <Handshake size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.submitButtonText}>
                      {isInviteMode ? 'Send WhatsApp Invite' : 'Confirm Trade Agreement'}
                    </Text>
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
                          style={[styles.dayCell, isSel && styles.activeDayCell]}
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
                  <TouchableOpacity style={styles.confirmAction} onPress={() => { confirmDateSelection(); setFocusedField(''); }} activeOpacity={0.7}>
                    <Text style={styles.confirmText}>Confirm Date ✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.successOverlay}>
            <View style={styles.successContent}>
              <View style={styles.successRings}>
                <View style={styles.successRingOuter} />
                <View style={styles.successCheckCircle}>
                  <Text style={styles.successCheckIcon}>✓</Text>
                </View>
              </View>
              <Text style={styles.successTitle}>Sauda Established!</Text>
              <Text style={styles.successSubtext}>
                Your deal has been successfully recorded in the digital ledger.
              </Text>
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
  scrollContent: { flexGrow: 1, padding: 14, gap: 12, paddingBottom: 40 },

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
    shadowColor: '#0284C7',
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
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0284C7',
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
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
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

  // COUNTERPARTY SELECTOR
  counterpartySelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
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
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', position: 'absolute', top: -10,
  },
  ticketPunchBottom: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', position: 'absolute', bottom: -10,
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
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: { opacity: 0.6 },
  inviteButton: { backgroundColor: '#059669', shadowColor: '#059669' },
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
  activeDayCell: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  dayText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  activeDayText: { color: '#FFFFFF', fontWeight: '900' },
  pickerActions: { flexDirection: 'row', gap: 10 },
  cancelAction: { flex: 1, height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  confirmAction: { flex: 2, height: 50, borderRadius: 14, backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center' },
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

  // SUCCESS MODAL
  successOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successContent: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', maxWidth: 320, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  successRings: { position: 'relative', width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successRingOuter: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0F2FE', opacity: 0.5 },
  successCheckCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#BAE6FD' },
  successCheckIcon: { fontSize: 30, color: '#0284C7', fontWeight: '900' },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  successSubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', fontWeight: '600', lineHeight: 20 },
});

export default CreateDeal;
