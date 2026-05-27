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
  createDeal,
  getUserProfile,
  inviteDeal,
  getProducts,
  getCategories,
  createCategory,
  createProduct,
  getCompanies,
} from '../../services/api';
import { Linking } from 'react-native';

const CreateDeal = ({ onNavigate, routeData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Defensive Prefill Mappings
  const prefillProd = routeData?.prefill?.products?.[0] || routeData?.prefill?.product || {};
  const prefillProductName = prefillProd.productId?.name || prefillProd.name || (typeof prefillProd === 'string' ? prefillProd : '') || routeData?.prefill?.product || routeData?.prefill?.productName || '';
  const prefillQty = prefillProd.quantity || routeData?.prefill?.qty || '';
  const prefillPrice = prefillProd.price || routeData?.prefill?.price || '';

  const prefillBuyer = routeData?.prefill?.buyerCompany || routeData?.prefill?.buyerCompanyId || routeData?.prefill?.party2 || {};
  const prefillBuyerName = prefillBuyer.companyName || prefillBuyer.name || (typeof prefillBuyer === 'string' ? '' : '') || routeData?.prefill?.party2?.name || routeData?.prefill?.buyerCompany?.name || '';

  // Form fields
  const [productName, setProductName] = useState(String(prefillProductName || ''));
  const [quantity, setQuantity] = useState(String(prefillQty || ''));
  const [price, setPrice] = useState(String(prefillPrice || ''));
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

  // Dynamic Identity Sync
  const [activeUserCompany, setActiveUserCompany] = useState(initialCompany);
  const [activeUserId, setActiveUserId] = useState(routeData?.user?._id || routeData?.user?.id);

  // New Fields Mappings
  const [role, setRole] = useState(routeData?.prefill?.role || 'seller');
  const [discount, setDiscount] = useState(String(routeData?.prefill?.products?.[0]?.discount || routeData?.prefill?.discount || ''));
  const [paymentTerms, setPaymentTerms] = useState(routeData?.prefill?.products?.[0]?.paymentTerms || '');
  const [brokerCompanyId, setBrokerCompanyId] = useState(routeData?.prefill?.brokerCompanyId || '');

  React.useEffect(() => {
    if (activeUserCompany && !routeData?.prefill?.role) {
      setRole(activeUserCompany.companyType === 'broker' ? 'broker' : activeUserCompany.companyType === 'buyer' ? 'buyer' : 'seller');
    }
  }, [activeUserCompany]);

  React.useEffect(() => {
    const hasPrefill = routeData?.selectedContact || routeData?.prefillParty2 || routeData?.prefill?.buyerCompany || routeData?.prefill?.buyerCompanyId || routeData?.prefill?.party2;
    if (!hasPrefill) {
      setParty2('');
      setParty2Data(null);
    }
  }, [role, activeUserCompany, routeData]);

  // Company Product Inventory Sync
  const [companyProducts, setCompanyProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  React.useEffect(() => {
    const fetchCompanyInventory = async () => {
      if (!activeUserCompany) return;
      try {
        const token = await AsyncStorage.getItem('userToken');
        const companyId = activeUserCompany?._id || activeUserCompany?.id;
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
  }, [activeUserCompany]);

  React.useEffect(() => {
    const refreshIdentity = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (routeData?.originCompany || routeData?.company) {
          const targetCo = routeData.originCompany || routeData.company;
          setActiveUserCompany(targetCo);
          setParty1(targetCo.name);
        }
        const response = await getUserProfile(token);
        if (response && response.success) {
          setActiveUserId(response.data._id || response.data.id);
        }
        if (!routeData?.originCompany && !routeData?.company) {
          const companiesRes = await getCompanies(1, 10);
          if (companiesRes && companiesRes.success && companiesRes.data?.companies?.length > 0) {
            const primaryCompany = companiesRes.data.companies[0];
            setActiveUserCompany(primaryCompany);
            setParty1(primaryCompany.name);
          } else if (response && response.success && response.data.companies?.length > 0) {
            setActiveUserCompany(response.data.companies[0]);
            setParty1(response.data.companies[0].name);
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
    if (routeData?.selectedContact) {
      const contact = routeData.selectedContact;
      if (routeData.pickingFor === 'party2') {
        setParty2(contact.isRegistered ? (contact.company || contact.name) : contact.name);
        setParty2Data(contact);
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

  const resolveProductId = async (companyId, token) => {
    try {
      const productsRes = await getProducts(companyId, token);
      if (productsRes && productsRes.success && productsRes.data && productsRes.data.length > 0) {
        const matched = productsRes.data.find(
          p => String(p.name || '').toLowerCase().trim() === String(productName).toLowerCase().trim()
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
        name: productName,
        categoryId,
        unitId: '6a0c118913e627687603da11',
        companyId,
        description: description || 'Dynamically created product for deal invitation',
      };
      const newProductRes = await createProduct(productPayload, token);
      if (newProductRes && newProductRes.success && newProductRes.data) {
        return newProductRes.data._id || newProductRes.data.id;
      }
      throw new Error('Failed to create new product');
    } catch (error) {
      console.warn('Dynamic product resolution failed:', error);
      throw new Error(`Unable to resolve Product ID for "${productName}". Please add the product to your inventory first.`);
    }
  };

  const handleCreateDeal = async () => {
    const errors = {};
    if (!productName.trim()) errors.productName = 'Please select or enter a product name';
    if (!quantity.trim()) errors.quantity = 'Please enter quantity';
    if (!price.trim()) errors.price = 'Please enter price per unit';
    if (!party2) errors.party2 = 'Please select a buyer / seller company';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const numericQuantity = Math.floor(Number(quantity));
      const numericPrice = Math.floor(Number(price));
      const numericDiscount = Math.floor(Number(discount || 0));
      const netTotalAmount = Number((numericQuantity * numericPrice) - numericDiscount);

      const originCompanyId = activeUserCompany?._id || activeUserCompany?.id || '6a0d784381e9215467e6d3e2';
      const userId = activeUserId || '6a0d77b581e9215467e6d3c8';

      if (!userId || !originCompanyId) {
        Alert.alert('Identity Error', 'Missing Seller identity to establish agreement.');
        setIsSubmitting(false);
        return;
      }

      const finalBrokerCompanyId = role === 'broker'
        ? (brokerCompanyId || originCompanyId)
        : (brokerCompanyId || undefined);

      if (party2Data?.isRegistered === false || !party2Data?.companyId) {
        const resolvedProductId = await resolveProductId(originCompanyId, token);
        const invitePayload = {
          receiverMobileNumber: party2Data.mobile || party2Data.phone || party2,
          receiverName: party2Data.name || party2,
          dealDraft: {
            role,
            brokerCompanyId: finalBrokerCompanyId,
            products: [{
              productId: resolvedProductId,
              quantity: Number(numericQuantity),
              price: Number(numericPrice),
              paymentTerms,
              discount: Number(numericDiscount),
              totalAmount: Number(netTotalAmount),
            }],
            totalAmount: Number(netTotalAmount),
            discount: Number(numericDiscount),
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
        const p2Id = party2Data?.id || party2Data?._id || party2Data?.companyId || party2;
        if (!p2Id) {
          Alert.alert('Identity Error', 'Missing Buyer ID to establish agreement.');
          setIsSubmitting(false);
          return;
        }
        const sellerCompanyId = role === 'buyer' ? p2Id : originCompanyId;
        const resolvedProductId = await resolveProductId(sellerCompanyId, token);
        const payload = {
          role,
          targetCompanyId: String(p2Id),
          brokerCompanyId: finalBrokerCompanyId,
          products: [{
            productId: resolvedProductId,
            quantity: Number(numericQuantity),
            price: Number(numericPrice),
            paymentTerms,
            discount: Number(numericDiscount),
            totalAmount: Number(netTotalAmount),
          }],
          totalAmount: Number(netTotalAmount),
          discount: Number(numericDiscount),
          expiryDate: new Date(validityDate).toISOString(),
          notes: description || 'High quality commodity trade.',
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

  const numQ = Number(quantity) || 0;
  const numP = Number(price) || 0;
  const numD = Number(discount) || 0;
  const totalValue = numQ && numP ? ((numQ * numP) - numD).toLocaleString('en-IN') : null;
  const isInviteMode = party2Data?.isRegistered === false;

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
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Sauda Deal</Text>
            <Text style={styles.headerSubtitle}>Create a digital trade ledger</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>📋</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ═══════════ CARD 1: IDENTITY ═══════════ */}
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
                {['seller', 'buyer', 'broker'].map((r) => {
                  const isActive = role === r;
                  const config = {
                    seller: { emoji: '🌾' },
                    buyer: { emoji: '🛍️' },
                    broker: { emoji: '💼' },
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
                      <Text style={{ fontSize: 13 }}>{config.emoji}</Text>
                      <Text style={[
                        styles.roleTabText,
                        { color: isActive ? '#FFFFFF' : '#64748B' },
                        isActive && styles.roleTabTextActive
                      ]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
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
                      {role === 'buyer' ? '⚡ BUYER PROFILE' : role === 'broker' ? '⚡ BROKER PROFILE' : '⚡ SELLER PROFILE'}
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
                  <Text style={styles.flowConnectorEmoji}>🤝</Text>
                </View>
                <View style={styles.flowConnectorLine} />
              </View>

              {/* Counterparty Selector */}
              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>
                  Counterparty {role === 'buyer' ? 'Seller' : 'Buyer'}*
                </Text>

                {party2 && party2Data ? (
                  /* Profile Card when selected */
                  <TouchableOpacity
                    style={[
                      styles.profileCard,
                      {
                        borderColor: isInviteMode ? '#F59E0B' : '#E2E8F0',
                        backgroundColor: '#FFFFFF',
                        shadowColor: isInviteMode ? '#F59E0B' : '#0284C7',
                      }
                    ]}
                    onPress={() => {
                      setFieldErrors(prev => ({ ...prev, party2: undefined }));
                      onNavigate('ContactPicker', { pickingFor: 'party2' });
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.profileAvatar, { backgroundColor: isInviteMode ? '#F59E0B' : '#0284C7', shadowColor: isInviteMode ? '#F59E0B' : '#0284C7' }]}>
                      <Text style={styles.profileAvatarText}>
                        {(party2Data.company || party2).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.profileCardInfo}>
                      <Text style={styles.profileCardName}>{party2Data.company || party2}</Text>
                      <Text style={[
                        styles.profileCardRole,
                        { color: isInviteMode ? '#D97706' : '#0284C7' }
                      ]}>
                        {isInviteMode ? '⚠️ NOT YET REGISTERED' : '✨ ON PRAVISTI'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[
                        styles.profileCardBadge,
                        {
                          backgroundColor: isInviteMode ? '#FEF3C7' : '#E0F2FE',
                          borderColor: isInviteMode ? '#FCD34D' : '#BAE6FD',
                          borderWidth: 1,
                        }
                      ]}>
                        <Text style={[
                          styles.profileCardBadgeText,
                          { color: isInviteMode ? '#D97706' : '#0284C7' }
                        ]}>
                          {isInviteMode ? 'Invite' : 'Active'}
                        </Text>
                      </View>
                      <Text style={styles.changeText}>Edit ›</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  /* Empty Selector */
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
                        <Text style={styles.selectorAvatarPlaceholderEmoji}>👤</Text>
                      </View>
                      <View>
                        <Text style={styles.counterpartySelectorLabel}>Select Counterparty Company</Text>
                        <Text style={styles.counterpartySelectorHint}>Pick from your contact directory</Text>
                      </View>
                    </View>
                    <Text style={styles.dropdownIcon}>›</Text>
                  </TouchableOpacity>
                )}
                {fieldErrors.party2 && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.party2}</Text>}
              </View>
            </View>
          </View>

          {/* ═══════════ CARD 2: PRODUCT LEDGER ═══════════ */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#0284C7' }]} />
              <Text style={styles.sectionTitle}>Product Ledger & Value</Text>
              <View style={styles.sectionBadgeContainer}>
                <Text style={[styles.sectionBadge, { color: '#0284C7', backgroundColor: '#E0F2FE' }]}>STEP 2</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              {/* Product Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Product / Commodity Name*</Text>

                {companyProducts.length > 0 && (
                  <View style={{ marginBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                      {companyProducts.map((p) => {
                        const isSel = String(productName).toLowerCase().trim() === String(p.name || '').toLowerCase().trim();
                        return (
                          <TouchableOpacity
                            key={p._id || p.id}
                            style={[styles.productChip, isSel && styles.productChipActive]}
                            onPress={() => { setProductName(p.name); setShowProductDropdown(false); }}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {p.image ? (
                                <Image source={{ uri: p.image }} style={styles.miniProductImage} />
                              ) : (
                                <Text style={styles.miniProductEmoji}>🌾</Text>
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
                      focusedField === 'productName' && [styles.inputFocused, { shadowColor: '#0284C7', borderColor: '#0284C7' }],
                      fieldErrors.productName && styles.inputError,
                      { flex: 1 }
                    ]}
                    placeholder="e.g. Organic Wheat, Basmati Rice..."
                    placeholderTextColor="#94A3B8"
                    value={productName}
                    onChangeText={(text) => {
                      setProductName(text);
                      setShowProductDropdown(true);
                      if (text.trim()) setFieldErrors(prev => ({ ...prev, productName: undefined }));
                    }}
                    onFocus={() => { setFocusedField('productName'); setShowProductDropdown(true); }}
                    onBlur={() => { setTimeout(() => setShowProductDropdown(false), 250); setFocusedField(''); }}
                  />
                  <TouchableOpacity style={styles.dropdownToggleBtn} onPress={() => setShowProductDropdown(!showProductDropdown)} activeOpacity={0.7}>
                    <Text style={styles.dropdownToggleText}>▾</Text>
                  </TouchableOpacity>
                </View>
                {fieldErrors.productName && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.productName}</Text>}

                {showProductDropdown && (() => {
                  const inputVal = productName.trim().toLowerCase();
                  const filtered = companyProducts.filter(p => {
                    if (!inputVal) return true;
                    if (companyProducts.some(cp => cp.name.toLowerCase() === inputVal)) return true;
                    return String(p.name || '').toLowerCase().includes(inputVal);
                  });
                  if (filtered.length === 0) return null;
                  return (
                    <View style={styles.autocompleteDropdown}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 150 }}>
                        {filtered.map((prod) => (
                          <TouchableOpacity
                            key={prod._id || prod.id}
                            style={styles.dropdownItem}
                            onPress={() => { setProductName(prod.name); setShowProductDropdown(false); }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {prod.image ? (
                                <Image source={{ uri: prod.image }} style={styles.dropdownProductImage} />
                              ) : (
                                <Text style={styles.dropdownProductEmoji}>🌾</Text>
                              )}
                              <Text style={styles.dropdownItemText}>{prod.name}</Text>
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
                      focusedField === 'quantity' && [styles.inputFocused, { shadowColor: '#0284C7', borderColor: '#0284C7' }],
                      fieldErrors.quantity && styles.inputError
                    ]}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={quantity}
                    onChangeText={(v) => { setQuantity(v); if (v.trim()) setFieldErrors(prev => ({ ...prev, quantity: undefined })); }}
                    keyboardType="numeric"
                    onFocus={() => setFocusedField('quantity')}
                    onBlur={() => setFocusedField('')}
                  />
                  {fieldErrors.quantity && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.quantity}</Text>}
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Price / Unit*</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      focusedField === 'price' && [styles.inputFocused, { shadowColor: '#0284C7', borderColor: '#0284C7' }],
                      fieldErrors.price && styles.inputError
                    ]}
                    placeholder="₹ 0.00"
                    placeholderTextColor="#94A3B8"
                    value={price}
                    onChangeText={(v) => { setPrice(v); if (v.trim()) setFieldErrors(prev => ({ ...prev, price: undefined })); }}
                    keyboardType="numeric"
                    onFocus={() => setFocusedField('price')}
                    onBlur={() => setFocusedField('')}
                  />
                  {fieldErrors.price && <Text style={styles.fieldErrorText}>⚠ {fieldErrors.price}</Text>}
                </View>
              </View>

              {/* Discount & Payment Terms */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Discount (₹)</Text>
                  <TextInput
                    style={[styles.textInput, focusedField === 'discount' && styles.inputFocused]}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="numeric"
                    onFocus={() => setFocusedField('discount')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Payment Terms</Text>
                  <TextInput
                    style={[styles.textInput, focusedField === 'paymentTerms' && styles.inputFocused]}
                    placeholder="e.g. 14 days"
                    placeholderTextColor="#94A3B8"
                    value={paymentTerms}
                    onChangeText={setPaymentTerms}
                    onFocus={() => setFocusedField('paymentTerms')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
              </View>


              {role === 'broker' && (
                <View style={[styles.inputGroup, { marginTop: 4, marginBottom: 0 }]}>
                  <Text style={styles.fieldLabel}>Broker Company ID (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, focusedField === 'brokerCompanyId' && styles.inputFocused]}
                    placeholder="Leave blank to auto-use your company"
                    placeholderTextColor="#94A3B8"
                    value={brokerCompanyId}
                    onChangeText={setBrokerCompanyId}
                    onFocus={() => setFocusedField('brokerCompanyId')}
                    onBlur={() => setFocusedField('')}
                  />
                </View>
              )}

              {/* Ticket Stub Total Value (Elegant Contrast element) */}
              {totalValue && (
                <View style={styles.ticketStub}>
                  <View style={styles.ticketLeft}>
                    <Text style={styles.ticketLabel}>ESTIMATED CONTRACT VALUE</Text>
                    <Text style={styles.ticketValue}>₹ {totalValue}</Text>
                    {numD > 0 && (
                      <Text style={styles.ticketDiscount}>After ₹{numD.toLocaleString('en-IN')} discount</Text>
                    )}
                  </View>
                  <View style={styles.ticketDivider}>
                    <View style={styles.ticketPunchTop} />
                    <View style={styles.ticketDashedLine} />
                    <View style={styles.ticketPunchBottom} />
                  </View>
                  <View style={styles.ticketRight}>
                    <Text style={styles.ticketRightTop}>QTY</Text>
                    <Text style={styles.ticketRightValue}>{numQ.toLocaleString('en-IN')}</Text>
                    <Text style={styles.ticketRightTop}>@₹{numP}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* ═══════════ CARD 3: TERMS ═══════════ */}
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
                  <Text style={styles.fieldLabel}>📅 Agreement Date</Text>
                  <TouchableOpacity
                    style={[styles.dateSelector, focusedField === 'dealDate' && styles.inputFocused]}
                    onPress={() => { setFocusedField('dealDate'); openDatePicker('deal'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateSelectorText}>{formatDateLabel(dealDate)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>⏳ Validity Expiry</Text>
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
                <Text style={styles.fieldLabel}>📝 Custom Trade Terms</Text>
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

          {/* Submit CTA */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
              isInviteMode && styles.inviteButton
            ]}
            activeOpacity={0.85}
            onPress={handleCreateDeal}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Text style={styles.submitButtonIcon}>{isInviteMode ? '📲' : '🤝'}</Text>
                <Text style={styles.submitButtonText}>
                  {isInviteMode ? 'Create & Send WhatsApp Invite' : 'Confirm Trade Agreement'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

        </ScrollView>

        {/* Date Picker Modal */}
        {isDatePickerVisible && (
          <Modal transparent visible={isDatePickerVisible} animationType="slide" onRequestClose={() => setIsDatePickerVisible(false)}>
            <View style={styles.pickerOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setIsDatePickerVisible(false)} />
              <View style={styles.pickerContent}>
                <View style={styles.dragIndicator} />
                <Text style={styles.pickerHeader}>
                  {pickingForDate === 'deal' ? '📅 Agreement Date' : '⏳ Validity Expiry'}
                </Text>
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
              <Text style={styles.successTitle}>Sauda Established! 🎉</Text>
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
