import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyOtp } from '../../../services/api';

const BrokerOTPVerify = ({ onNavigate, routeData }) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const mobile = routeData?.mobile || '';
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text !== '' && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 4) {
      setErrorMessage('Please enter complete 4-digit OTP.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await verifyOtp(mobile, code);
      if (response && response.success) {
        const { token, user } = response.data;
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('user_completed_profile', JSON.stringify({ ...user, role: 'Broker' }));
        onNavigate('BrokerDashboard', { role: 'Broker', user }, { replace: true });
      } else {
        setErrorMessage(response?.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />
      <View style={styles.header}>
        <Text style={styles.title}>Verify Broker OTP</Text>
        <Text style={styles.subtitle}>Enter 4-digit code sent to +91 {mobile}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={inputRefs[idx]}
              style={styles.otpBox}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, idx)}
            />
          ))}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity style={styles.submitBtn} onPress={handleVerify} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Verify & Enter Broker Portal</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#312E81' },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#C7D2FE' },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default BrokerOTPVerify;
