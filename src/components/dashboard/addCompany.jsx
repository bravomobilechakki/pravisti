import React, { useState } from 'react';
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
} from 'react-native';

const AddCompany = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    gstNumber: '',
    contactPerson: '',
    mobileNumber: '',
    email: '',
    address: '',
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    // Logic to save company would go here
    console.log('Company Data:', formData);
    onNavigate('Dashboard');
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
              onPress={() => onNavigate('Dashboard')}
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
              <Text style={styles.inputLabel}>Company Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter company name"
                placeholderTextColor="#9CA3AF"
                value={formData.companyName}
                onChangeText={(text) => handleInputChange('companyName', text)}
              />
            </View>

            <View style={styles.fieldContainer}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>GST Number</Text>
                <Text style={styles.optionalLabel}>(Optional)</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter GSTIN"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={formData.gstNumber}
                onChangeText={(text) => handleInputChange('gstNumber', text)}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Contact Person</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#9CA3AF"
                value={formData.contactPerson}
                onChangeText={(text) => handleInputChange('contactPerson', text)}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={styles.mobileInputContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.mobileInput}
                  placeholder="10-digit number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={formData.mobileNumber}
                  onChangeText={(text) => handleInputChange('mobileNumber', text)}
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="company@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.inputLabel}>Office Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter complete address"
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={3}
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Register Company</Text>
            <Text style={styles.submitButtonArrow}>🏢</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
});

export default AddCompany;
