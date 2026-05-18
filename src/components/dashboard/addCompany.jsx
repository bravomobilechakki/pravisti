import React, { useState, useEffect } from 'react';
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
  Alert,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCompany } from '../../services/api';

const AddCompany = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
  }, [showSuccessModal]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: routeData?.role?.toLowerCase() || 'trader',
    registrationNumber: '',
    industry: routeData?.industry || '',
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
        industry: formData.industry,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode || '302001',
          country: formData.country
        },
        website: formData.website || 'https://www.pravisti.example.com',
        description: formData.description || 'Leading trader in premium textiles and fabrics.',
        documents: [
          {
            name: 'GST Certificate',
            url: 'https://storage.example.com/docs/gst_cert.pdf'
          }
        ]
      };

      const response = await createCompany(payload, token);
      if (response && response.success) {
        onNavigate('Dashboard', routeData, { refresh: true });
      } else {
        Alert.alert('Error', response.message || 'Failed to register company.');
      }
    } catch (error) {
      Alert.alert('API Error', error.message || 'An error occurred while registering company.');
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
              <Text style={styles.backIcon}>←</Text>
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
              <TextInput
                style={[styles.input, { backgroundColor: '#F3F4F6' }]}
                value={formData.industry}
                editable={false}
              />
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
                <Text style={styles.submitButtonArrow}>🏢</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal Popup */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
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
    backgroundColor: '#3170cdff',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#3170cdff',
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
    backgroundColor: '#3170cdff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#3170cdff',
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
});

export default AddCompany;
