import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Phone, ShieldCheck, ArrowRight, Building2 } from 'lucide-react-native';
import { loginUser } from '../../../services/api';

const BrokerLogin = ({ onNavigate, routeData }) => {
  const [mobile, setMobile] = useState(routeData?.mobile || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await loginUser(mobile);
      if (response && response.success) {
        onNavigate('BrokerOTPVerify', { mobile, role: 'Broker' });
      } else {
        setErrorMessage(response?.message || 'Failed to send OTP to broker mobile.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <ShieldCheck size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>Pravisti Broker Portal</Text>
          </View>
          <Text style={styles.title}>Broker Partner Login</Text>
          <Text style={styles.subtitle}>
            Enter your mobile number to manage APMC Saudas & Brokerage Firms.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputContainer}>
            <Phone size={20} color="#6366F1" style={{ marginRight: 10 }} />
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Get OTP</Text>
                <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => onNavigate('BrokerRegistration')}
          >
            <Text style={styles.registerLinkText}>Register New Brokerage Firm?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#312E81' },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#C7D2FE', lineHeight: 20 },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  countryCode: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginRight: 8 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0F172A' },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerLinkText: { color: '#4F46E5', fontSize: 14, fontWeight: '700' },
});

export default BrokerLogin;
