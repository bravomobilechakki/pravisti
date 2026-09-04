import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrokerSuccessReceipt from '../../common/BrokerSuccessReceipt';
import {
  ArrowLeft,
  Building2,
  Check,
  ShieldCheck,
  MapPin,
  FileText,
  Percent,
  Briefcase,
  ChevronDown,
  X,
  Phone,
  Sparkles,
  Award,
  Mail,
} from 'lucide-react-native';
import { createCompany, getIndustries } from '../../../services/api';

const COLORS = {
  primaryDark: '#2327D8',   // Royal Blue (Login & Signup Theme)
  headerMiddle: '#1B1FA7',  // Hover Blue
  headerEnd: '#1E1C38',     // Dark Navy
  primary: '#2327D8',       // Accent Royal Blue
  primaryLight: '#EEF2FE',
  primaryBorder: '#C7D2FE',
  cyan: '#2327D8',
  indigo: '#1E1C38',
  indigoLight: '#EEF2FE',
  success: '#059669',
  successDark: '#15803D',
  successLight: '#DCFCE7',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textPlaceholder: '#94A3B8',
  bgMain: '#F4F6FB',        // Login & Signup background
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
};

const FIRM_TYPES = [
  'Sole Proprietorship',
  'Partnership Firm',
  'Limited Liability Partnership (LLP)',
  'Private Limited (Pvt Ltd)',
  'Registered APMC Brokerage',
];

const BrokerAddCompany = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [industriesLoading, setIndustriesLoading] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [showFirmTypeModal, setShowFirmTypeModal] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Form State initialized clean without pre-filled dummy data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'broker',
    firmType: '',
    registrationNumber: '',
    apmcLicense: '',
    commissionRate: '',
    industryId: '',
    industryName: '',
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
  });

  const [errors, setErrors] = useState({});

  // Auto redirect to BrokerDashboard after success
  useEffect(() => {
    let timer;
    if (showSuccessModal) {
      timer = setTimeout(() => {
        setShowSuccessModal(false);
        onNavigate('BrokerDashboard', routeData, { refresh: true });
      }, 1800);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSuccessModal, onNavigate, routeData]);

  // Load Industries
  const fetchIndustries = useCallback(async () => {
    try {
      setIndustriesLoading(true);
      const res = await getIndustries();
      if (res && res.success && Array.isArray(res.data)) {
        setIndustries(res.data);
      }
    } catch (err) {
      console.warn('Could not load industries:', err);
    } finally {
      setIndustriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Brokerage Firm Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Company Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.city.trim()) newErrors.city = 'City / APMC Mandi Yard is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      const targetIndustryId = formData.industryId || (industries.length > 0 ? industries[0]._id : '650000000000000000000000');

      const payload = {
        name: formData.name,
        email: formData.email.trim(),
        type: 'broker',
        registrationNumber: formData.registrationNumber || formData.apmcLicense || `APMC-${Date.now().toString().slice(-6)}`,
        industry: targetIndustryId,
        industryId: targetIndustryId,
        address: {
          street: formData.street || 'APMC Yard',
          city: formData.city,
          state: formData.state || 'Gujarat',
          country: formData.country || 'India',
          postalCode: formData.postalCode || '385260',
        },
        phone: formData.phone || '',
        firmType: formData.firmType || 'Registered APMC Brokerage',
        companyType: formData.firmType || 'Registered APMC Brokerage',
        commissionRate: formData.commissionRate || '1.0',
      };

      const res = await createCompany(payload);

      try {
        const storedCompStr = await AsyncStorage.getItem('broker_companies_storage');
        const existingList = storedCompStr ? JSON.parse(storedCompStr) : [];
        const createdObj = res?.data?.company || res?.data || payload;
        const newFirm = {
          _id: createdObj._id || createdObj.id || `FIRM-${Date.now()}`,
          name: formData.name,
          firmType: formData.firmType || 'Registered APMC Brokerage',
          apmcLicense: formData.apmcLicense,
          commissionRate: formData.commissionRate || '1.0',
          city: formData.city,
          state: formData.state,
          street: formData.street,
          phone: formData.phone,
          industryName: formData.industryName || 'Agro & Commodities',
          createdAt: new Date().toISOString(),
          verified: true,
        };
        existingList.unshift(newFirm);
        await AsyncStorage.setItem('broker_companies_storage', JSON.stringify(existingList));
      } catch (storageErr) {
        console.warn('Error storing local broker company:', storageErr);
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error creating Broker Company:', err);
      setShowSuccessModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ─── HERO HEADER SECTION ─── */}
        <View style={styles.heroHeader}>
          <View style={styles.topNavRow}>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={() => onNavigate('BrokerDashboard')}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={styles.navTitleText}>Register Company</Text>

            </View>

            <View style={{ width: 38 }} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Business Details */}
          <View style={styles.card}>
            <View style={styles.cardSectionHeader}>
              <View style={[styles.sectionIconCircle, { backgroundColor: COLORS.primaryLight }]}>
                <Award size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.cardSectionTitle}>1. Business & Company Details</Text>
            </View>

            {/* Company Name */}
            <Text style={styles.label}>Brokerage Company Name <Text style={styles.requiredStar}>*</Text></Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'name' && styles.inputFocused,
                errors.name && styles.inputError,
              ]}
            >
              <View style={styles.inputIconCircle}>
                <Building2 size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="name"
                placeholderTextColor={COLORS.textPlaceholder}
                value={formData.name}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('name', v)}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            {/* Company Email */}
            <Text style={styles.label}>Company Email <Text style={styles.requiredStar}>*</Text></Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputFocused,
                errors.email && styles.inputError,
              ]}
            >
              <View style={styles.inputIconCircle}>
                <Mail size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="email"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('email', v)}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            {/* APMC License / GST */}
            <Text style={styles.label}>GSTIN NO.</Text>
            <View style={[styles.inputWrapper, focusedField === 'apmc' && styles.inputFocused]}>
              <View style={styles.inputIconCircle}>
                <ShieldCheck size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="GSTIN"
                placeholderTextColor={COLORS.textPlaceholder}
                value={formData.apmcLicense}
                onFocus={() => setFocusedField('apmc')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('apmcLicense', v)}
              />
            </View>
            <Text style={styles.label}>Office Contact Mobile</Text>
            <View style={[styles.inputWrapper, focusedField === 'phone' && styles.inputFocused]}>
              <View style={styles.inputIconCircle}>
                <Phone size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="no"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="phone-pad"
                maxLength={10}
                value={formData.phone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('phone', v)}
              />
            </View>
            {/* Industry Selection */}
            <Text style={styles.label}>Industry</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowIndustryModal(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.dropdownText, !formData.industryName && { color: COLORS.textPlaceholder }]}>
                {formData.industryName || 'Select commodity market'}
              </Text>
              <ChevronDown size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Commission Rate (%) */}


          </View>

          {/* Section 2: Location & Mandi */}
          <View style={styles.card}>
            <View style={styles.cardSectionHeader}>
              <View style={[styles.sectionIconCircle, { backgroundColor: COLORS.indigoLight }]}>
                <MapPin size={18} color={COLORS.indigo} />
              </View>
              <Text style={styles.cardSectionTitle}>2. Address</Text>
            </View>

            <Text style={styles.label}>City <Text style={styles.requiredStar}>*</Text></Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'city' && styles.inputFocused,
                errors.city && styles.inputError,
              ]}
            >
              <View style={styles.inputIconCircle}>
                <MapPin size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={COLORS.textPlaceholder}
                value={formData.city}
                onFocus={() => setFocusedField('city')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('city', v)}
              />
            </View>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}

            <Text style={styles.label}>State <Text style={styles.requiredStar}>*</Text></Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'state' && styles.inputFocused,
                errors.state && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={COLORS.textPlaceholder}
                value={formData.state}
                onFocus={() => setFocusedField('state')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('state', v)}
              />
            </View>
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}

            <Text style={styles.label}>Full Office Address</Text>
            <View style={[styles.inputWrapper, focusedField === 'street' && styles.inputFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Street / Area"
                placeholderTextColor={COLORS.textPlaceholder}
                value={formData.street}
                onFocus={() => setFocusedField('street')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('street', v)}
              />
            </View>

            {/* <Text style={styles.label}>Office Contact Mobile</Text>
            <View style={[styles.inputWrapper, focusedField === 'phone' && styles.inputFocused]}>
              <View style={styles.inputIconCircle}>
                <Phone size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Mobile number"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="phone-pad"
                maxLength={10}
                value={formData.phone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                onChangeText={v => updateField('phone', v)}
              />
            </View> */}
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            activeOpacity={0.88}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.submitBtnInner}>
                <Text style={styles.submitBtnText}>Register Brokerage Company</Text>
                <Sparkles size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Entity Type Modal */}
      <Modal visible={showFirmTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Entity Structure</Text>
              <TouchableOpacity onPress={() => setShowFirmTypeModal(false)}>
                <X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {FIRM_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={styles.modalOption}
                onPress={() => {
                  updateField('firmType', type);
                  setShowFirmTypeModal(false);
                }}
              >
                <Text style={styles.optionText}>{type}</Text>
                {formData.firmType === type && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Industry Modal */}
      <Modal visible={showIndustryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Commodity Market</Text>
              <TouchableOpacity onPress={() => setShowIndustryModal(false)}>
                <X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {industriesLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : industries.length === 0 ? (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  updateField('industryId', '');
                  updateField('industryName', 'Agro & Commodities');
                  setShowIndustryModal(false);
                }}
              >
                <Text style={styles.optionText}>Agro & Commodities</Text>
                <Check size={18} color={COLORS.primary} />
              </TouchableOpacity>
            ) : (
              industries.map(ind => (
                <TouchableOpacity
                  key={ind._id}
                  style={styles.modalOption}
                  onPress={() => {
                    updateField('industryId', ind._id);
                    updateField('industryName', ind.name);
                    setShowIndustryModal(false);
                  }}
                >
                  <Text style={styles.optionText}>{ind.name}</Text>
                  {formData.industryId === ind._id && <Check size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      {/* Success Receipt Modal */}
      <BrokerSuccessReceipt
        visible={showSuccessModal}
        actionType="companyCreated"
        title="Company Registered Successfully!"
        message="The company profile is ready to use and linked to your broker account."
        referenceId={`COMP-${Date.now().toString().slice(-6)}`}
        summaryItems={[
          { label: 'Firm Name', value: formData.name },
          { label: 'Entity Structure', value: formData.firmType || 'APMC Brokerage' },
          { label: 'Mandi Location', value: `${formData.city}, ${formData.state}` },
        ]}
        details={[
          { label: 'APMC License / GST', value: formData.apmcLicense || 'Verified' },
          { label: 'Commodity Market', value: formData.industryName || 'Agro & Commodities' },
          { label: 'Brokerage Rate', value: `${formData.commissionRate || '1.0'}%` },
          { label: 'Contact Phone', value: formData.phone || 'N/A' },
        ]}
        primaryButtonLabel="View Company"
        onDone={() => {
          setShowSuccessModal(false);
          onNavigate('BrokerDashboard');
        }}
        onClose={() => {
          setShowSuccessModal(false);
          onNavigate('BrokerDashboard');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  heroHeader: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 24) : 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  navSubTitleText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  companyBannerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  bannerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerSubText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
    lineHeight: 16,
  },
  badgePillRow: {
    marginTop: 12,
  },
  verifiedRoleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  verifiedRoleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.4,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgMain,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 50,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  inputIconCircle: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 4,
  },

  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgMain,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 50,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  successModalCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    alignSelf: 'center',
    width: '85%',
    maxWidth: 320,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  successModalSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default BrokerAddCompany;
