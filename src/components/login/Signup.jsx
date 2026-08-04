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
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { signUpUser, verifyOtp } from '../../services/api';
import { Edit3, Phone, ShieldCheck, ArrowRight, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = '#4F46E5';

// Sleek Modern Mesh Top Header (Cute Bouncy Animated Photo)
const ModernHeader = React.memo(({ width, height }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Cute Up & Down Floating Ease
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -7,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Cute Playful Pendulum Wobble Swing (-8deg to +8deg)
    Animated.loop(
      Animated.sequence([
        Animated.timing(wobbleAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wobbleAnim, {
          toValue: -1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Cute Breathing Scale Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, wobbleAnim, pulseAnim]);

  const wobble = wobbleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  return (
    <View style={{ width, height, backgroundColor: '#0F172A', overflow: 'hidden', position: 'relative' }}>
      {/* Deep Royal Gradient Background */}
      <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F172A" />
            <Stop offset="45%" stopColor="#1E1B4B" />
            <Stop offset="85%" stopColor="#312E81" />
            <Stop offset="100%" stopColor="#4F46E5" />
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
          <ShieldCheck size={13} color="#A5B4FC" style={{ marginRight: 6 }} />
          <Text style={styles.topPillBadgeText}>MEMBER REGISTRATION PORTAL</Text>
        </View>
      </View>

      {/* Logo Container: Stationary Pravisti Logo + Cute Bouncy Photo on Right */}
      <View style={styles.logoBadgeContainer}>
        <View style={styles.logoRowContainer}>
          <Image
            source={require('../../images/logo/new_logo.png')}
            style={{ width: width * 0.50, height: 60 }}
            resizeMode="contain"
          />
          <Animated.View
            style={{
              transform: [
                { translateY: floatAnim },
                { rotate: wobble },
                { scale: pulseAnim },
              ],
            }}
          >
            <Image
              source={require('../../images/logo/photo22.png')}
              style={styles.miniPhoto22Icon}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
});

const Signup = ({ onNavigate, routeData }) => {
  const { width } = useWindowDimensions();
  const headerHeight = 220;
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState(routeData?.mobile || '');
  const [role, setRole] = useState(routeData?.role || 'Trader'); // Default to Trader
  const [isLoading, setIsLoading] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [mobileFocused, setMobileFocused] = useState(false);

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [timer, setTimer] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const isVerifyingRef = useRef(false);

  // Timer Effect
  useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Auto-focus first OTP input when sent
  useEffect(() => {
    if (otpSent && !isLoading) {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpSent]);

  // Auto-verify when OTP is full
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
      pastedOtp.forEach((char, i) => {
        if (index + i < 4) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedOtp.length, 3);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const formattedText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = formattedText;
    setOtp(newOtp);

    if (formattedText !== '' && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSignup = async () => {
    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    if (!cleanName || !cleanMobile) {
      setErrorMessage('Please fill in Name and Mobile Number.');
      return;
    }
    if (cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMessage('');

    setIsLoading(true);
    try {
      const response = await signUpUser(cleanName, role, cleanMobile);
      if (response && response.success) {
        setOtpSent(true);
        setTimer(60);
      } else {
        const msg = response.message || '';
        if (
          msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('already exists') ||
          msg.toLowerCase().includes('duplicate') ||
          msg.toLowerCase().includes('registered') ||
          msg.toLowerCase().includes('exists') ||
          msg.toLowerCase().includes('already')
        ) {
          if (onNavigate) {
            onNavigate('Login', { mobile: cleanMobile, autoSendOtp: true });
          }
        } else {
          setErrorMessage(msg || 'Failed to send OTP.');
        }
      }
    } catch (error) {
      const errMsg = error.message || '';
      if (
        errMsg.toLowerCase().includes('already registered') ||
        errMsg.toLowerCase().includes('already exists') ||
        errMsg.toLowerCase().includes('duplicate') ||
        errMsg.toLowerCase().includes('registered') ||
        errMsg.toLowerCase().includes('exists') ||
        errMsg.toLowerCase().includes('already')
      ) {
        if (onNavigate) {
          onNavigate('Login', { mobile: cleanMobile, autoSendOtp: true });
        }
      } else {
        setErrorMessage(errMsg || 'An error occurred during signup.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isVerifyingRef.current) return;
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      Alert.alert('Error', 'Please enter the complete 4-digit OTP.');
      return;
    }
    const cleanMobile = mobile.trim();
    isVerifyingRef.current = true;
    setIsLoading(true);
    try {
      const response = await verifyOtp(cleanMobile, otpCode);
      if (response && response.success) {
        const { token, user } = response.data;
        try {
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('user_completed_profile', JSON.stringify(user));
        } catch (e) {
          console.error("AsyncStorage error", e);
        }

        if (onNavigate) {
          const userRole = user && user.roles && user.roles[0] ? user.roles[0] : role;
          const isBroker = userRole.toString().toLowerCase().includes('broker');
          const targetScreen = isBroker ? 'BrokerDashboard' : 'Dashboard';
          onNavigate(targetScreen, { role: userRole, user });
        }
      } else {
        Alert.alert('Error', response.message || 'Invalid OTP.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while verifying OTP.');
    } finally {
      setIsLoading(false);
      isVerifyingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>

              {/* Modern Mesh Top Bar Header */}
              <ModernHeader width={width} height={headerHeight} />

              {/* Form Card */}
              <View style={styles.formCard}>
                <Text style={styles.titleText}>Create an Account</Text>
                <Text style={styles.subtitleText}>Join Pravisti to manage your sovereign ledger.</Text>

                {/* Role Selection Cards */}
                <Text style={styles.inputLabel}>Select Role</Text>
                <View style={styles.roleCardRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      role === 'Broker' && styles.roleCardActive,
                      otpSent && styles.roleCardDisabled,
                    ]}
                    onPress={() => !otpSent && setRole('Broker')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.roleDot, role === 'Broker' && styles.roleDotActive]}>
                      {role === 'Broker' && <View style={styles.roleDotInner} />}
                    </View>
                    <Text style={[styles.roleCardText, role === 'Broker' && styles.roleCardTextActive]}>
                      Broker
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      role === 'Trader' && styles.roleCardActive,
                      otpSent && styles.roleCardDisabled,
                    ]}
                    onPress={() => !otpSent && setRole('Trader')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.roleDot, role === 'Trader' && styles.roleDotActive]}>
                      {role === 'Trader' && <View style={styles.roleDotInner} />}
                    </View>
                    <Text style={[styles.roleCardText, role === 'Trader' && styles.roleCardTextActive]}>
                      Trader
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Name Input */}
                <Text style={styles.inputLabel}>Name</Text>
                <View style={[
                  styles.inputWrapper,
                  otpSent && styles.inputDisabled,
                  nameFocused && styles.inputFocused,
                ]}>
                  <User size={18} color={nameFocused ? THEME : '#94A3B8'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="#CBD5E1"
                    value={name}
                    onChangeText={setName}
                    editable={!otpSent}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>

                {/* Mobile Number Input */}
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[
                  styles.inputWrapper,
                  otpSent && styles.inputDisabled,
                  mobileFocused && styles.inputFocused,
                  !!errorMessage && styles.inputErrorBorder,
                ]}>
                  <Phone size={18} color={mobileFocused ? THEME : '#94A3B8'} style={styles.inputIcon} />
                  <Text style={styles.prefixText}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="00000 00000"
                    placeholderTextColor="#CBD5E1"
                    value={mobile}
                    onChangeText={(text) => {
                      setMobile(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpSent}
                    onFocus={() => setMobileFocused(true)}
                    onBlur={() => setMobileFocused(false)}
                  />
                  {otpSent && (
                    <TouchableOpacity
                      onPress={() => {
                        setOtpSent(false);
                        setOtp(['', '', '', '']);
                        if (errorMessage) setErrorMessage('');
                      }}
                      style={styles.editNumberBtn}
                    >
                      <Edit3 size={16} color="#4F46E5" />
                    </TouchableOpacity>
                  )}
                </View>
                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

                {/* OTP Section */}
                {otpSent && (
                  <>
                    <View style={styles.otpHeaderRow}>
                      <View style={styles.otpLabelRow}>
                        <ShieldCheck size={16} color={THEME} style={{ marginRight: 4 }} />
                        <Text style={styles.inputLabel}>Verification Code</Text>
                      </View>
                      {timer > 0 ? (
                        <Text style={[styles.resendText, { color: '#64748B' }]}>
                          Resend OTP in {timer}s
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleSignup}>
                          <Text style={[styles.resendText, { color: THEME, fontWeight: '700' }]}>
                            Resend OTP
                          </Text>
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
                            focusedIndex === index && { borderColor: THEME, borderWidth: 2 }
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

                {/* Sign Up / Verify Button */}
                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: THEME, shadowColor: THEME }]}
                  activeOpacity={0.8}
                  onPress={otpSent ? handleVerifyOtp : handleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.verifyButtonText}>
                        {otpSent ? 'Verify & Sign Up' : `Sign Up as ${role}`}
                      </Text>
                      <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.switchRoleContainer}>
                  <TouchableOpacity onPress={() => onNavigate && onNavigate('Login')} style={styles.switchRoleBtn}>
                    <Text style={styles.switchRoleLabel}>Already have an account? </Text>
                    <Text style={[styles.switchRoleLabel, { color: THEME, fontWeight: '700' }]}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
  },
  ambientGlowBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(129, 140, 248, 0.18)',
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
  roleCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  roleCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2F6',
  },
  roleCardDisabled: {
    opacity: 0.6,
  },
  roleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  roleDotActive: {
    borderColor: '#4F46E5',
  },
  roleDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  roleCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  roleCardTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
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

export default Signup;
