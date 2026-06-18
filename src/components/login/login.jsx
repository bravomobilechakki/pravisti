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
  Keyboard
} from 'react-native';
import { loginUser, verifyOtp } from '../../services/api';
import { Edit3 } from 'lucide-react-native';
// Fallback if AsyncStorage is still not installed properly:
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login = ({ onNavigate, routeData }) => {
  const { width, height } = useWindowDimensions();
  const [identity, setIdentity] = useState('Broker'); // Broker, Trader, Both
  const [mobile, setMobile] = useState(routeData?.mobile || '');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef([]);

  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [timer, setTimer] = useState(60); // 60 seconds
  const [errorMessage, setErrorMessage] = useState('');

  const themeColor = '#4F46E5';

  useEffect(() => {
    if (routeData?.autoSendOtp && routeData?.mobile && routeData.mobile.length === 10) {
      const autoTriggerSend = async () => {
        setErrorMessage('');
        setIsLoading(true);
        try {
          const response = await loginUser(routeData.mobile);
          if (response && response.success) {
            if (response.data && response.data.isNewUser) {
              if (onNavigate) {
                onNavigate('Signup', { mobile: routeData.mobile });
              }
              return;
            }
            setOtpSent(true);
            setTimer(60);
          } else {
            const msg = response.message || '';
            if (
              msg.toLowerCase().includes('not found') ||
              msg.toLowerCase().includes('not registered') ||
              msg.toLowerCase().includes('not exist') ||
              msg.toLowerCase().includes('new user') ||
              msg.toLowerCase().includes('signup')
            ) {
              if (onNavigate) {
                onNavigate('Signup', { mobile: routeData.mobile });
              }
            } else {
              setErrorMessage(msg || 'Failed to send OTP.');
            }
          }
        } catch (error) {
          const errMsg = error.message || '';
          if (
            errMsg.toLowerCase().includes('not found') ||
            errMsg.toLowerCase().includes('not registered') ||
            errMsg.toLowerCase().includes('not exist') ||
            errMsg.toLowerCase().includes('new user') ||
            errMsg.toLowerCase().includes('signup')
          ) {
            if (onNavigate) {
              onNavigate('Signup', { mobile: routeData.mobile });
            }
          } else {
            setErrorMessage(errMsg || 'An error occurred while sending OTP.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      autoTriggerSend();
    }
  }, [routeData]);

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
  }, [otpSent]);

  // Auto-verify when OTP is full
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 4 && !isLoading) {
      handleVerifyOtp();
    }
  }, [otp]);

  const handleOtpChange = (text, index) => {
    // Handle pasting or fast typing of multiple characters
    if (text.length > 1) {
      const pastedOtp = text.slice(0, 4).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 4) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      // Focus the last filled box or the next empty one
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
          if (onNavigate) {
            onNavigate('Signup', { mobile });
          }
          return;
        }
        setOtpSent(true);
        setTimer(60);
      } else {
        const msg = response.message || '';
        if (
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('not registered') ||
          msg.toLowerCase().includes('not exist') ||
          msg.toLowerCase().includes('new user') ||
          msg.toLowerCase().includes('signup')
        ) {
          if (onNavigate) {
            onNavigate('Signup', { mobile });
          }
        } else {
          setErrorMessage(msg || 'Failed to send OTP.');
        }
      }
    } catch (error) {
      const errMsg = error.message || '';
      if (
        errMsg.toLowerCase().includes('not found') ||
        errMsg.toLowerCase().includes('not registered') ||
        errMsg.toLowerCase().includes('not exist') ||
        errMsg.toLowerCase().includes('new user') ||
        errMsg.toLowerCase().includes('signup')
      ) {
        if (onNavigate) {
          onNavigate('Signup', { mobile });
        }
      } else {
        setErrorMessage(errMsg || 'An error occurred while sending OTP.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      Alert.alert('Error', 'Please enter the complete 4-digit OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await verifyOtp(mobile, otpCode);
      if (response && response.success) {
        const { token, user } = response.data;
        // Store the token
        try {
          await AsyncStorage.setItem('userToken', token);
        } catch (e) {
          console.error("AsyncStorage error", e);
        }
        
        // Pass to App state or just navigate
        if (onNavigate) {
          const userRole = user && user.roles && user.roles[0] ? user.roles[0] : 'Broker';
          onNavigate('Dashboard', { role: userRole, user });
        }
      } else {
        Alert.alert('Error', response.message || 'Invalid OTP.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while verifying OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <SafeAreaView style={styles.container}>
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
              {/* Top Logo — fixed height */}
              <View style={styles.topLogoContainer}>
                <Image
                  source={require('../../images/trader1.png')}
                  style={[styles.mainLogoImage, { width: width * 0.5, height: (width * 0.5) / 2.5 }]}
                  resizeMode="contain"
                />
              </View>

              {/* Hero image — flexible, fills remaining space above the card */}
              <Image
                source={require('../../images/login1.png')}
                style={[styles.heroImage, { height: height * 0.22 }]}
                resizeMode="cover"
              />

              {/* Form card — fixed, overlaps the hero image */}
              <View style={styles.formCard}>
                <Text style={styles.titleText}>Welcome to Pravisti</Text>
                <Text style={styles.subtitleText}>Enter your credentials to manage your sovereign ledger.</Text>



                 {/* Mobile input */}
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[styles.inputWrapper, otpSent && { backgroundColor: '#F1F5F9' }, !!errorMessage && styles.inputErrorBorder]}>
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
                  />
                  {otpSent && (
                    <TouchableOpacity
                      onPress={() => {
                        setOtpSent(false);
                        setOtp(['', '', '', '']);
                        if (errorMessage) setErrorMessage('');
                      }}
                      style={[styles.editNumberBtn, { justifyContent: 'center', alignItems: 'center' }]}
                    >
                      <Edit3 size={14} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>
                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

                {/* OTP */}
                {otpSent && (
                  <>
                    <View style={styles.otpHeaderRow}>
                      <Text style={styles.inputLabel}>Verification Code</Text>
                      {timer > 0 ? (
                        <Text style={[styles.resendText, { color: '#64748B' }]}>
                          Resend OTP in {timer}s
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleSendOtp}>
                          <Text style={[styles.resendText, { color: themeColor, fontWeight: '700' }]}>
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
                            focusedIndex === index && { borderColor: themeColor, borderWidth: 2 }
                          ]}
                          keyboardType="number-pad"
                          maxLength={index === 0 && otp[0] === '' ? 4 : 1} // Allow pasting up to 4 chars in first box
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

                {/* Login/Send OTP button */}
                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                  activeOpacity={0.8}
                  onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.verifyButtonText}>
                      {otpSent ? 'Verify & Login' : 'Send OTP'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.switchRoleContainer}>
                  <TouchableOpacity onPress={() => onNavigate && onNavigate('Signup')}>
                    <Text style={styles.switchRoleLabel}>Join as Member? Sign Up</Text>
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
    backgroundColor: '#F5F7FF',
  },
  topLogoContainer: {
    alignItems: 'center',
    paddingTop: 38,
  },
  mainLogoImage: {
    width: 200,
    height: 60,
  },
  heroImage: {
    width: '100%',
  },
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -30,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
  },
  tabIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeText: {
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#475569',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: '22%',
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifyButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  switchRoleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  switchRoleLabel: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600'
  },
  editNumberBtn: {
    padding: 6,
  },
  editNumberText: {
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginLeft: 4,
    marginBottom: 16,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
});

export default Login;
