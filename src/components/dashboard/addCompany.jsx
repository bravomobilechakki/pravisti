import React, { useState, useEffect, useCallback } from 'react';
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
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ChevronDown,
  Building2,
  X,
  Check
} from 'lucide-react-native';
import { createCompany, getIndustries } from '../../services/api';

const AddCompany = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [industriesLoading, setIndustriesLoading] = useState(false);
  const [showIndustryModal, setShowIndustryModal] = useState(false);

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
    registrationNumber: '',
    phone: ''
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSubmit = async () => {
    // Validation
    let newErrors = { name: '', registrationNumber: '', phone: '' };
    let hasError = false;

    if (!formData.name.trim()) {
      newErrors.name = 'Company Name is required';
      hasError = true;
    }
    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration / GSTIN is required';
      hasError = true;
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile Number is required';
      hasError = true;
    } else if (formData.phone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit number';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
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
        phone: formData.phone,
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
          setErrors(prev => ({ ...prev, registrationNumber: errMsg }));
        } else {
          Alert.alert('Error', errMsg);
        }
      }
    } catch (error) {
      const errMsg = error.message || 'An error occurred while registering company.';
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('already exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('registration') || lowerMsg.includes('gst')) {
        setErrors(prev => ({ ...prev, registrationNumber: errMsg }));
      } else {
        Alert.alert('API Error', errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => onNavigate('pop')}
            >
              <ArrowLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Company</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Company Details</Text>
            <Text style={styles.subtitle}>
              Provide the essential information to register a new company.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Company Name*</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputErrorBorder]}
                placeholder="Enter company name"
                placeholderTextColor="#9CA3AF"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <View style={styles.fieldContainer}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Registration / GSTIN*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.registrationNumber && styles.inputErrorBorder]}
                placeholder="REG123456 / GSTIN"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={formData.registrationNumber}
                onChangeText={(text) => handleInputChange('registrationNumber', text)}
              />
              {errors.registrationNumber ? <Text style={styles.errorText}>{errors.registrationNumber}</Text> : null}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Mobile Number*</Text>
              <View style={[styles.mobileInputContainer, errors.phone && styles.inputErrorBorder]}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.mobileInput}
                  placeholder="10-digit number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="info@company.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Industry</Text>
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
                  {formData.industryName || 'Select Industry'}
                </Text>
                {industriesLoading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <ChevronDown size={18} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Address Details</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Street / Area</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main St"
                placeholderTextColor="#9CA3AF"
                value={formData.street}
                onChangeText={(text) => handleInputChange('street', text)}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.fieldContainer, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Karachi/Mumbai"
                        placeholderTextColor="#9CA3AF"
                        value={formData.city}
                        onChangeText={(text) => handleInputChange('city', text)}
                    />
                </View>
                <View style={[styles.fieldContainer, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Sindh/Maharashtra"
                        placeholderTextColor="#9CA3AF"
                        value={formData.state}
                        onChangeText={(text) => handleInputChange('state', text)}
                    />
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <View style={[styles.fieldContainer, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Postal / ZIP Code</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 302001"
                        placeholderTextColor="#9CA3AF"
                        value={formData.postalCode}
                        onChangeText={(text) => handleInputChange('postalCode', text)}
                        keyboardType="numeric"
                    />
                </View>
                <View style={[styles.fieldContainer, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Country</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="India"
                        placeholderTextColor="#9CA3AF"
                        value={formData.country}
                        onChangeText={(text) => handleInputChange('country', text)}
                    />
                </View>
            </View>

            <View style={[styles.fieldContainer, { marginTop: 10 }]}>
              <Text style={styles.inputLabel}>Website URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor="#9CA3AF"
                value={formData.website}
                onChangeText={(text) => handleInputChange('website', text)}
                keyboardType="url"
              />
            </View>

            <View style={[styles.fieldContainer, { marginTop: 10 }]}>
              <Text style={styles.inputLabel}>Business Description (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Tell us about your business..."
                placeholderTextColor="#9CA3AF"
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
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
                <ActivityIndicator size="large" color="#4F46E5" />
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
                        <Check size={16} color="#4F46E5" strokeWidth={2.5} />
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
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    padding: 12,
    marginLeft: -12,
  },
  backIcon: {
    fontSize: 28,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  titleSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  fieldContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionalLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  mobileInputContainer: {
    flexDirection: 'row',
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  countryCode: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  countryCodeText: {
    fontSize: 14,
    color: '#374151',
  },
  mobileInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
  },
  submitButton: {
    height: 52,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#4F46E5',
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
