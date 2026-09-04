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
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { loginUser, verifyOtp } from '../../services/api';
import { Edit3, Phone, ShieldCheck, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = '#2327D8';
const THEME_HOVER = '#1B1FA7';
const DARK_NAVY = '#1E1C38';
const BG_COLOR = '#F4F6FB';

// Sleek Modern Mesh Top Header (Stationary Logo & Photo)
const ModernHeader = React.memo(({ width, height }) => {
  return (
    <View style={{ width, height, backgroundColor: DARK_NAVY, overflow: 'hidden', position: 'relative' }}>
      {/* Deep Royal Gradient Background */}
      <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={DARK_NAVY} />
            <Stop offset="45%" stopColor={THEME_HOVER} />
            <Stop offset="85%" stopColor={THEME} />
            <Stop offset="100%" stopColor={THEME} />
          </LinearGradient>
        </Defs>
        <Path fill="url(#meshGrad)" d="M0,0 L1440,0 L1440,320 L0,320 Z" />
      </Svg>

      {/* Soft Ambient Light Glows */}
      <View style={styles.ambientGlowTopRight} />
      <View style={styles.ambientGlowBottomLeft} />

      {/* Portal Badge Pill */}
      <View style={styles.topPillBadgeContainer}>
        <View style={styles.topPillBadge}>
          <ShieldCheck size={13} color="#C7D2FE" style={{ marginRight: 6 }} />
          <Text style={styles.topPillBadgeText}>PRAVISTI COMMODITY PORTAL</Text>
        </View>
      </View>

      {/* Logo Container: Stationary Pravisti Logo + Stationary Photo on Right */}
      <View style={styles.logoBadgeContainer}>
        <View style={styles.logoRowContainer}>
          <Image
            source={require('../../images/logo/new_logo.png')}
            style={{ width: width * 0.50, height: 60 }}
            resizeMode="contain"
          />
          <View>
            <Image
              source={require('../../images/logo/photo22.png')}
              style={styles.miniPhoto22Icon}
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
  const headerHeight = 220;
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

  const isVerifyingRef = useRef(false);

  useEffect(() => {
    let slowTimer;
    if (isLoading) {
      slowTimer = setTimeout(() => {
        setLoadingMsg('Connecting to server…');
      }, 5000);
    } else {
      setLoadingMsg('');
    }
    return () => clearTimeout(slowTimer);
  }, [isLoading]);

  useEffect(() => {
    const rawMobile = routeData?.mobile ? routeData.mobile.trim() : '';
    if (routeData?.autoSendOtp && rawMobile && rawMobile.length === 10) {
      const autoTriggerSend = async () => {
        setErrorMessage('');
        setIsLoading(true);
        try {
          const response = await loginUser(rawMobile);
          if (response && response.success) {
            if (response.data && response.data.isNewUser) {
              if (onNavigate) onNavigate('Signup', { mobile: rawMobile });
              return;
            }
            setOtpSent(true);
            setTimer(60);
          } else {
            const msg = response.message || '';
            if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => msg.toLowerCase().includes(k))) {
              if (onNavigate) onNavigate('Signup', { mobile: rawMobile });
            } else {
              setErrorMessage(msg || 'Failed to send OTP.');
            }
          }
        } catch (error) {
          const errMsg = error.message || '';
          if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => errMsg.toLowerCase().includes(k))) {
            if (onNavigate) onNavigate('Signup', { mobile: rawMobile });
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
    if (otpCode.length === 4 && !isLoading && !isVerifyingRef.current) {
      handleVerifyOtp();
    }
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
    const cleanMobile = mobile.trim();
    if (cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await loginUser(cleanMobile);
      if (response && response.success) {
        if (response.data && response.data.isNewUser) {
          if (onNavigate) onNavigate('Signup', { mobile: cleanMobile });
          return;
        }
        setOtpSent(true);
        setTimer(60);
      } else {
        const msg = response.message || '';
        if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => msg.toLowerCase().includes(k))) {
          if (onNavigate) onNavigate('Signup', { mobile: cleanMobile });
        } else {
          setErrorMessage(msg || 'Failed to send OTP.');
        }
      }
    } catch (error) {
      const errMsg = error.message || '';
      if (['not found', 'not registered', 'not exist', 'new user', 'signup'].some(k => errMsg.toLowerCase().includes(k))) {
        if (onNavigate) onNavigate('Signup', { mobile: cleanMobile });
      } else {
        setErrorMessage(errMsg || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isVerifyingRef.current) return;
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setErrorMessage('Please enter the complete 4-digit OTP.');
      return;
    }
    const cleanMobile = mobile.trim();
    isVerifyingRef.current = true;
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await verifyOtp(cleanMobile, otpCode);
      if (response && response.success) {
        const { token, user } = response.data;
        try {
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('user_completed_profile', JSON.stringify(user));
        } catch (e) {
          console.error('AsyncStorage error', e);
        }
        if (onNavigate) {
          const userRole = user && user.roles && user.roles[0] ? user.roles[0] : (user?.role || 'Trader');
          const isBroker = userRole.toString().toLowerCase().includes('broker');
          const targetScreen = isBroker ? 'BrokerDashboard' : 'Dashboard';
          onNavigate(targetScreen, { role: userRole, user });
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
      isVerifyingRef.current = false;
    }
  };

  //  center of login page


  styles.formCard
  styles.titleText
  styles.subtitleText
  styles.inputLabel
  styles.inputWrapper
  styles.inputDisabled
  styles.inputFocused
  styles.inputIcon
  styles.prefixText
  styles.input
  styles.editNumberBtn
  styles.inputErrorBorder

  // 

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
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

            {/* Modern Mesh Top Bar Header */}
            <ModernHeader width={width} height={headerHeight} />

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
    backgroundColor: BG_COLOR,
  },
  topPillBadgeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  topPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  topPillBadgeText: {
    color: '#E0E7FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  ambientGlowTopRight: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(35, 39, 216, 0.25)',
  },
  ambientGlowBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(27, 31, 167, 0.22)',
  },
  logoBadgeContainer: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPhoto22Icon: {
    width: 68,
    height: 68,
    marginLeft: 6,
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
