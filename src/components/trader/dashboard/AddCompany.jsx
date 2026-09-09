import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ChevronDown,
  Building2,
  X,
  Check,
  MapPin,
  Mail,
  Hash,
  Globe,
  FileText,
  Phone,
} from 'lucide-react-native';
import { createCompany, getIndustries, fetchPincodeDetails, getUserProfile } from '../../../services/api';

const THEME = '#2327D8';        // Royal Blue (Login & Dashboard Theme)
const BG_COLOR = '#F4F6FB';     // Light slate background

const AddCompany = ({ onNavigate, routeData }) => {
  const scrollViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [industriesLoading, setIndustriesLoading] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  const handlePincodeChange = async (pincodeVal) => {
    handleInputChange('postalCode', pincodeVal);
    const cleanPin = pincodeVal.replace(/\D/g, '');
    if (cleanPin.length === 6) {
      try {
        setIsPincodeLoading(true);
        const res = await fetchPincodeDetails(cleanPin);
        setIsPincodeLoading(false);
        if (res && res.success) {
          setFormData(prev => ({
            ...prev,
            postalCode: cleanPin,
            city: res.city || res.district || prev.city,
            state: res.state || prev.state,
            country: res.country || prev.country || 'India',
          }));
        }
      } catch (err) {
        setIsPincodeLoading(false);
      }
    }
  };

  // Auto navigate to Dashboard after 2.5 seconds on successful company creation
  useEffect(() => {
    let timer;
    if (showSuccessModal) {
      timer = setTimeout(() => {
        setShowSuccessModal(false);
        onNavigate('Dashboard', routeData, { refresh: true });
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSuccessModal, onNavigate, routeData]);

  // Fetch industries from API
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

  const cleanPhoneNumber = (val) => {
    if (!val) return '';
    const digits = String(val).replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const [userMobile, setUserMobile] = useState('');

  useEffect(() => {
    const fetchUserPhone = async () => {
      // 1. Initial check from routeData
      const routePhone =
        routeData?.user?.mobileNumber ||
        routeData?.user?.mobile ||
        routeData?.mobileNumber ||
        routeData?.phone ||
        '';
      if (routePhone) {
        const cleaned = cleanPhoneNumber(routePhone);
        setUserMobile(cleaned);
        setFormData(prev => ({ ...prev, phone: prev.phone || cleaned }));
      }

      try {
        // 2. Check cached profile in AsyncStorage
        const cachedProfileStr = await AsyncStorage.getItem('user_completed_profile');
        if (cachedProfileStr) {
          const cachedProfile = JSON.parse(cachedProfileStr);
          const cachedPhone =
            cachedProfile?.mobileNumber ||
            cachedProfile?.mobile ||
            cachedProfile?.phone ||
            '';
          if (cachedPhone) {
            const cleaned = cleanPhoneNumber(cachedPhone);
            setUserMobile(cleaned);
            setFormData(prev => ({ ...prev, phone: prev.phone || cleaned }));
          }
        }

        // 3. Fallback: Query live user profile from API
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await getUserProfile(token);
          if (response && response.success && response.data) {
            const apiPhone =
              response.data.mobileNumber ||
              response.data.mobile ||
              response.data.phone ||
              '';
            if (apiPhone) {
              const cleaned = cleanPhoneNumber(apiPhone);
              setUserMobile(cleaned);
              setFormData(prev => ({ ...prev, phone: prev.phone || cleaned }));
            }
          }
        }
      } catch (err) {
        console.warn('Could not load user mobile number in AddCompany:', err);
      }
    };
    fetchUserPhone();
  }, [routeData]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: routeData?.role?.toLowerCase() || 'trader',
    registrationNumber: '',
    industryId: '',    // stored _id sent to API
    industryName: '',  // displayed label in dropdown
    street: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    website: '',
    description: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    registrationNumber: ''
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSubmit = async () => {
    // Validation
    let newErrors = { name: '', registrationNumber: '' };
    let hasError = false;

    if (!formData.name.trim()) {
      newErrors.name = 'Company Name is required';
      hasError = true;
    }
    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration / GSTIN is required';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Authentication session expired. Please login again.');
        onNavigate('Login');
        return;
      }



      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || userMobile || routeData?.user?.mobileNumber || routeData?.user?.mobile || '',
        type: formData.type,
        registrationNumber: formData.registrationNumber,
        industry: formData.industryId,   // send _id to API
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode || '302001',
          country: formData.country
        },
        website: formData.website || '',
        description: formData.description || '',
        documents: [
          {
            name: 'GST Certificate',
            url: 'https://storage.example.com/docs/gst_cert.pdf'
          }
        ]
      };

      const response = await createCompany(payload, token);
      if (response && response.success) {
        setShowSuccessModal(true);
      } else {
        const errMsg = response.message || 'Failed to register company.';
        const lowerMsg = errMsg.toLowerCase();
        if (lowerMsg.includes('already exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('registration') || lowerMsg.includes('gst')) {
          setErrors(prev => ({ ...prev, registrationNumber: 'GST number is duplicate' }));
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } else {
          Alert.alert('Error', errMsg);
        }
      }
    } catch (error) {
      const errMsg = error.message || 'An error occurred while registering company.';
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('already exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('registration') || lowerMsg.includes('gst')) {
        setErrors(prev => ({ ...prev, registrationNumber: 'GST number is duplicate' }));
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        Alert.alert('API Error', errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />
      {/* Royal Blue Top Header Section matching Login Theme */}
      <View style={styles.heroHeader}>
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate('pop')}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Create Company</Text>
            <Text style={styles.headerSubtitle}>Trader Organization Profile</Text>
          </View>

          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: Business Information */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBadge}>
                <Building2 size={18} color={THEME} />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <Text style={styles.sectionTitle}>Company Information</Text>
                <Text style={styles.sectionSubtitle}>Enter your registered business identity</Text>
              </View>
            </View>

            {/* Company Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Company Name <Text style={styles.requiredStar}>*</Text></Text>
              <View
                style={[
                  styles.inputWithIconWrapper,
                  errors.name && styles.inputErrorBorder,
                ]}
              >
                <Building2 size={18} color="#64748B" style={styles.inputLeadingIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="e.g. Mahavir Agro Traders"
                  placeholderTextColor="#94A3B8"
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  selectionColor={THEME}
                />
              </View>
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Registration / GSTIN */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Registration / GSTIN <Text style={styles.requiredStar}>*</Text></Text>
                <Text style={styles.helperLabel}>Unique Tax ID</Text>
              </View>
              <View
                style={[
                  styles.inputWithIconWrapper,
                  errors.registrationNumber && styles.inputErrorBorder,
                ]}
              >
                <Hash size={18} color="#64748B" style={styles.inputLeadingIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="e.g. 08AAAAA0000A1Z5"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  value={formData.registrationNumber}
                  onChangeText={(text) => handleInputChange('registrationNumber', text)}
                  selectionColor={THEME}
                />
              </View>
              {errors.registrationNumber ? <Text style={styles.errorText}>{errors.registrationNumber}</Text> : null}
            </View>

            {/* Contact Phone Number (Auto-filled with User's mobile number) */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Contact Phone Number</Text>
                {formData.phone ? (
                  <View style={styles.autoFilledBadge}>
                    <Check size={11} color="#10B981" strokeWidth={3} />
                    <Text style={styles.autoFilledBadgeText}>User Phone</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.inputWithIconWrapper}>
                <Phone size={18} color="#64748B" style={styles.inputLeadingIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  selectionColor={THEME}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Official Email Address</Text>
              <View style={styles.inputWithIconWrapper}>
                <Mail size={18} color="#64748B" style={styles.inputLeadingIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="company@trade.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  selectionColor={THEME}
                />
              </View>
            </View>

            {/* Industry Dropdown */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Industry Segment</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setShowIndustryModal(true)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    !formData.industryName && styles.dropdownPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {formData.industryName || 'Select Industry (e.g. Agriculture)'}
                </Text>
                {industriesLoading ? (
                  <ActivityIndicator size="small" color={THEME} />
                ) : (
                  <ChevronDown size={18} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 2: Registered Address (Pincode First + Auto Fill) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#EFF6FF' }]}>
                <MapPin size={18} color={THEME} />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <Text style={styles.sectionTitle}>Registered Address</Text>
                <Text style={styles.sectionSubtitle}>Enter PIN code to auto-populate City & State</Text>
              </View>
            </View>

            {/* 1. Postal / PIN Code FIRST */}
            <View style={styles.fieldContainer}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Postal / PIN Code</Text>
                {isPincodeLoading ? (
                  <View style={styles.loadingPinRow}>
                    <ActivityIndicator size="small" color={THEME} />
                    <Text style={styles.pinLoadingText}>Looking up...</Text>
                  </View>
                ) : formData.postalCode.length === 6 && formData.state ? (
                  <View style={styles.autoFilledBadge}>
                    <Check size={12} color="#10B981" strokeWidth={3} />
                    <Text style={styles.autoFilledBadgeText}>Auto-filled</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.inputWithIconWrapper}>
                <MapPin size={18} color={THEME} style={styles.inputLeadingIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="Enter 6-digit PIN (e.g. 302001)"
                  placeholderTextColor="#94A3B8"
                  value={formData.postalCode}
                  onChangeText={handlePincodeChange}
                  keyboardType="numeric"
                  maxLength={6}
                  selectionColor={THEME}
                />
                {isPincodeLoading && (
                  <ActivityIndicator size="small" color={THEME} style={{ marginRight: 8 }} />
                )}
              </View>
            </View>

            {/* 2. City & State (Auto-filled via PIN code) */}
            <View style={styles.twoColumnRow}>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.inputLabel}>City / District</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  value={formData.city}
                  onChangeText={(text) => handleInputChange('city', text)}
                  selectionColor={THEME}
                />
              </View>

              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor="#94A3B8"
                  value={formData.state}
                  onChangeText={(text) => handleInputChange('state', text)}
                  selectionColor={THEME}
                />
              </View>
            </View>

            {/* 3. Street / Area */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Street / Building Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Plot / Shop No, Street, Landmark"
                placeholderTextColor="#94A3B8"
                value={formData.street}
                onChangeText={(text) => handleInputChange('street', text)}
                selectionColor={THEME}
              />
            </View>

            {/* 4. Country */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="India"
                placeholderTextColor="#94A3B8"
                value={formData.country}
                onChangeText={(text) => handleInputChange('country', text)}
                selectionColor={THEME}
              />
            </View>
          </View>

          {/* Card 3: Additional Details (Optional) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: '#F0FDF4' }]}>
                <FileText size={18} color="#059669" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <Text style={styles.sectionTitle}>Additional Details</Text>
                <Text style={styles.sectionSubtitle}>Online presence and company bio (optional)</Text>
              </View>
            </View>

            {/* Website URL */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Website URL</Text>
              <View style={styles.inputWithIconWrapper}>
                <Globe size={18} color="#64748B" style={styles.inputLeadingIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  placeholder="https://yourcompany.com"
                  placeholderTextColor="#94A3B8"
                  value={formData.website}
                  onChangeText={(text) => handleInputChange('website', text)}
                  keyboardType="url"
                  autoCapitalize="none"
                  selectionColor={THEME}
                />
              </View>
            </View>

            {/* Business Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Business Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your business activities, products dealt with, trading history..."
                placeholderTextColor="#94A3B8"
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                multiline={true}
                numberOfLines={3}
                selectionColor={THEME}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && { opacity: 0.75 }]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Register Company</Text>
                <Building2 size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Industry Picker Modal */}
      <Modal
        visible={showIndustryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIndustryModal(false)}
      >
        <TouchableOpacity
          style={styles.industryOverlay}
          activeOpacity={1}
          onPress={() => setShowIndustryModal(false)}
        >
          <View style={styles.industrySheet}>
            <View style={styles.industrySheetHeader}>
              <View style={styles.industrySheetDrag} />
              <Text style={styles.industrySheetTitle}>Select Industry</Text>
              <TouchableOpacity onPress={() => setShowIndustryModal(false)} style={{ padding: 4 }}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {industriesLoading ? (
              <View style={styles.industryLoader}>
                <ActivityIndicator size="large" color={THEME} />
                <Text style={styles.industryLoaderText}>Loading industries...</Text>
              </View>
            ) : industries.length === 0 ? (
              <View style={styles.industryLoader}>
                <Text style={styles.industryEmptyText}>No industries available</Text>
              </View>
            ) : (
              <FlatList
                data={industries}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.industryList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = formData.industryId === item._id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.industryItem,
                        isSelected && styles.industryItemSelected,
                      ]}
                      onPress={() => {
                        setFormData(prev => ({
                          ...prev,
                          industryId: item._id,
                          industryName: item.name,
                        }));
                        setShowIndustryModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.industryItemInner}>
                        <Text
                          style={[
                            styles.industryItemName,
                            isSelected && styles.industryItemNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {item.description ? (
                          <Text
                            style={styles.industryItemDesc}
                            numberOfLines={1}
                          >
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Check size={16} color={THEME} strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal Popup */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconContainer}>
              <Check size={36} color="#10B981" strokeWidth={3.5} />
            </View>
            <Text style={styles.modalTitle}>Company Added!</Text>
            <Text style={styles.modalSubtitle}>
              Your company <Text style={styles.boldText}>{formData.name}</Text> has been registered successfully.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                onNavigate('Dashboard', routeData, { refresh: true });
              }}
            >
              <Text style={styles.modalButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME,
  },
  heroHeader: {
    backgroundColor: THEME,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 8,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#C7D2FE',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRightPlaceholder: {
    width: 38,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
    fontWeight: '700',
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  helperLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputWithIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  textInputWithIcon: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pinLoadingText: {
    fontSize: 11.5,
    color: THEME,
    fontWeight: '600',
  },
  autoFilledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  autoFilledBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  textArea: {
    height: 84,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitButton: {
    height: 52,
    backgroundColor: THEME,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonArrow: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#D1FAE5',
  },
  successIcon: {
    fontSize: 36,
    color: '#10B981',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  boldText: {
    fontWeight: '700',
    color: '#334155',
  },
  modalButton: {
    height: 50,
    backgroundColor: THEME,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 4,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },

  // INDUSTRY DROPDOWN
  dropdownSelector: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectorText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  dropdownChevron: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },

  // INDUSTRY PICKER MODAL
  industryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  industrySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  industrySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  industrySheetDrag: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  industrySheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
  },
  industrySheetClose: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
    paddingLeft: 8,
  },
  industryList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  industryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  industryItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
    borderWidth: 1.5,
  },
  industryItemInner: {
    flex: 1,
  },
  industryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  industryItemNameSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  industryItemDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  industryCheckmark: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '800',
    marginLeft: 10,
  },
  industryLoader: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  industryLoaderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  industryEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default AddCompany;
