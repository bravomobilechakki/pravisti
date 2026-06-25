import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { loginUser, verifyOtp } from '../../services/api';
import { Edit3, Phone, ShieldCheck, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = '#4F46E5';

// Screen dimensions calculated statically to avoid keyboard buffer updates

// Memoized Wavy Header to prevent expensive SVG redraws during text entry/keyboard toggle
const WaveHeader = React.memo(({ width, height }) => {
  return (
    <View style={{ width, height, backgroundColor: '#F8FAFC', overflow: 'hidden', position: 'relative' }}>
      <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#6366F1" />
            <Stop offset="50%" stopColor="#4F46E5" />
            <Stop offset="100%" stopColor="#312E81" />
          </LinearGradient>
          <LinearGradient id="waveGradBack" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#818CF8" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        {/* Background Wave */}
        <Path
          fill="url(#waveGradBack)"
          d="M0,0 L0,270 C360,330 720,200 1080,280 L1440,220 L1440,0 Z"
        />
        {/* Foreground Wave */}
        <Path
          fill="url(#waveGrad)"
          d="M0,0 L0,220 C360,280 720,150 1080,230 L1440,170 L1440,0 Z"
        />
      </Svg>

      {/* Floating Logo Badge Container */}
      <View style={styles.logoBadgeContainer}>
        <View style={styles.logoBadgeShadow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../images/trader1.png')}
              style={{ width: width * 0.42, height: (width * 0.42) / 2.5 }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );
});

const Login = ({ onNavigate, routeData }) => {
  const { width } = useWindowDimensions();
  const headerHeight = 210;
  const [mobile, setMobile] = useState(routeData?.mobile || '');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef([]);

  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [mobileFocused, setMobileFocused] = useState(false);
  const [timer, setTimer] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');

  // Show "Taking longer than usual..." after 6 seconds of waiting
  useEffect(() => {
    let slowTimer;
    if (isLoading) {
      slowTimer = setTimeout(() => {
        setLoadingMsg('Server is waking up, please wait…');
      }, 6000);
    } else {
      setLoadingMsg('');
    }
    return () => clearTimeout(slowTimer);
  }, [isLoading]);

  useEffect(() => {
    if (routeData?.autoSendOtp && routeData?.mobile && routeData.mobile.length === 10) {
      const autoTriggerSend = async () => {
        setErrorMessage('');
        setIsLoading(true);
        try {
          const response = await loginUser(routeData.mobile);
          if (response && response.success) {
            if (response.data && response.data.isNewUser) {
              if (onNavigate) onNavigate('Signup', { mobile: routeData.mobile });
              return;
            }
            setOtpSent(true);
            setTimer(60);
          } else {
            const msg = response.message || '';
            if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => msg.toLowerCase().includes(k))) {
              if (onNavigate) onNavigate('Signup', { mobile: routeData.mobile });
            } else {
              setErrorMessage(msg || 'Failed to send OTP.');
            }
          }
        } catch (error) {
          const errMsg = error.message || '';
          if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => errMsg.toLowerCase().includes(k))) {
            if (onNavigate) onNavigate('Signup', { mobile: routeData.mobile });
          } else {
            setErrorMessage(errMsg || 'An error occurred. Please try again.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      autoTriggerSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData]);

  useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  useEffect(() => {
    if (otpSent && !isLoading) {
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpSent]);

  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 4 && !isLoading) handleVerifyOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleOtpChange = (text, index) => {
    if (text.length > 1) {
      const pastedOtp = text.slice(0, 4).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => { if (index + i < 4) newOtp[index + i] = char; });
      setOtp(newOtp);
      otpRefs.current[Math.min(index + pastedOtp.length, 3)]?.focus();
      return;
    }
    const formatted = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = formatted;
    setOtp(newOtp);
    if (formatted !== '' && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

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
        if (response.data && response.data.isNewUser) {
          if (onNavigate) onNavigate('Signup', { mobile });
          return;
        }
        setOtpSent(true);
        setTimer(60);
      } else {
        const msg = response.message || '';
        if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => msg.toLowerCase().includes(k))) {
          if (onNavigate) onNavigate('Signup', { mobile });
        } else {
          setErrorMessage(msg || 'Failed to send OTP.');
        }
      }
    } catch (error) {
      const errMsg = error.message || '';
      if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => errMsg.toLowerCase().includes(k))) {
        if (onNavigate) onNavigate('Signup', { mobile });
      } else {
        setErrorMessage(errMsg || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setErrorMessage('Please enter the complete 4-digit OTP.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await verifyOtp(mobile, otpCode);
      if (response && response.success) {
        const { token, user } = response.data;
        try { await AsyncStorage.setItem('userToken', token); } catch (e) { console.error('AsyncStorage error', e); }
        if (onNavigate) {
          const userRole = user && user.roles && user.roles[0] ? user.roles[0] : 'Broker';
          onNavigate('Dashboard', { role: userRole, user });
        }
      } else {
        const msg = response?.message || response?.error || 'Invalid OTP. Please try again.';
        setErrorMessage(msg);
        setOtp(['', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (error) {
      const errMsg = error?.message || 'OTP verification failed. Please try again.';
      console.error('OTP verify error:', error);
      setErrorMessage(errMsg);
      setOtp(['', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1 }}>

            {/* Wavy Header */}
            <WaveHeader width={width} height={headerHeight} />

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.titleText}>Welcome back</Text>
              <Text style={styles.subtitleText}>Enter your credentials to manage your sovereign ledger.</Text>

              {/* Mobile Input */}
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={[
                styles.inputWrapper,
                otpSent && styles.inputDisabled,
                mobileFocused && styles.inputFocused,
                !!errorMessage && !otpSent && styles.inputErrorBorder,
              ]}>
                <Phone size={18} color={mobileFocused ? THEME : '#94A3B8'} style={styles.inputIcon} />
                <Text style={styles.prefixText}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="00000 00000"
                  placeholderTextColor="#CBD5E1"
                  value={mobile}
                  onChangeText={(text) => { setMobile(text); if (errorMessage) setErrorMessage(''); }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!otpSent}
                  onFocus={() => setMobileFocused(true)}
                  onBlur={() => setMobileFocused(false)}
                />
                {otpSent && (
                  <TouchableOpacity
                    onPress={() => { setOtpSent(false); setOtp(['', '', '', '']); setErrorMessage(''); }}
                    style={styles.editNumberBtn}
                  >
                    <Edit3 size={16} color="#4F46E5" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Error Message */}
              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

              {/* OTP Input Fields */}
              {otpSent && (
                <>
                  <View style={styles.otpHeaderRow}>
                    <View style={styles.otpLabelRow}>
                      <ShieldCheck size={16} color={THEME} style={{ marginRight: 4 }} />
                      <Text style={styles.inputLabel}>Verification Code</Text>
                    </View>
                    {timer > 0 ? (
                      <Text style={styles.resendText}>Resend in {timer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOtp}>
                        <Text style={[styles.resendText, { color: THEME, fontWeight: '700' }]}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.otpContainer}>
                    {[0, 1, 2, 3].map((index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => (otpRefs.current[index] = ref)}
                        style={[
                          styles.otpInput,
                          focusedIndex === index && { borderColor: THEME, borderWidth: 2 },
                        ]}
                        keyboardType="number-pad"
                        maxLength={index === 0 && otp[0] === '' ? 4 : 1}
                        value={otp[index]}
                        onChangeText={(text) => handleOtpChange(text, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(-1)}
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                </>
              )}

              {/* Verify / Send Button */}
              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: THEME, shadowColor: THEME }]}
                activeOpacity={0.8}
                onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.loadingText}>
                      {otpSent ? 'Verifying…' : 'Sending OTP…'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.verifyButtonText}>
                      {otpSent ? 'Verify & Login' : 'Send OTP'}
                    </Text>
                    <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Slow network hint */}
              {!!loadingMsg && (
                <Text style={styles.slowHint}>⏳ {loadingMsg}</Text>
              )}

              {/* Signup Link */}
              <View style={styles.switchRoleContainer}>
                <TouchableOpacity onPress={() => onNavigate && onNavigate('Signup')} style={styles.switchRoleBtn}>
                  <Text style={styles.switchRoleLabel}>Join as Member? </Text>
                  <Text style={[styles.switchRoleLabel, { color: THEME, fontWeight: '700' }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  logoBadgeContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoBadgeShadow: {
    borderRadius: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  logoBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
  },
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -25,
    paddingHorizontal: 26,
    paddingTop: 36,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 0,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 26,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  inputFocused: {
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.9,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  editNumberBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2F6',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -10,
    marginLeft: 4,
    marginBottom: 16,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  otpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: '22%',
    height: 56,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  verifyButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  slowHint: {
    textAlign: 'center',
    color: '#D97706',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    paddingHorizontal: 16,
  },
  switchRoleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchRoleLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
});

export default Login;
