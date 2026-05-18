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
import { signUpUser, verifyOtp } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Signup = ({ onNavigate, routeData }) => {
  const { width, height } = useWindowDimensions();
  const [name, setName] = useState('');
  const [number, setNumber] = useState(''); // dummy/custom field
  const [mobile, setMobile] = useState(routeData?.mobile || '');
  const [role, setRole] = useState('Broker'); // 'Broker' or 'Trader'
  const [isLoading, setIsLoading] = useState(false);

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds

  const themeColor = '#3170cdff';

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

  const handleSignup = async () => {
    if (!name || !mobile) {
      Alert.alert('Error', 'Please fill in Name and Mobile Number.');
      return;
    }
    if (mobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await signUpUser(name, role, mobile);
      if (response && response.success) {
        setOtpSent(true);
        setTimer(response.data?.expiresIn || 600);
        Alert.alert('Success', 'Signup initiated! OTP has been sent.');
      } else {
        Alert.alert('Error', response.message || 'Failed to send OTP.');
      }
    } catch (error) {
      Alert.alert('API Error', error.message || 'An error occurred during signup.');
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

        // Pass to App state or navigate
        if (onNavigate) {
          const userRole = user && user.roles && user.roles[0] ? user.roles[0] : role;
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
              <View style={styles.topLogoContainer}>
                <Image
                  source={require('../../images/trader1.png')}
                  style={[styles.mainLogoImage, { width: width * 0.5, height: (width * 0.5) / 2.5 }]}
                  resizeMode="contain"
                />
              </View>

              <Image
                source={require('../../images/login1.png')}
                style={[styles.heroImage, { height: height * 0.22 }]}
                resizeMode="cover"
              />

              <View style={styles.formCard}>
                <Text style={styles.titleText}>Create an Account</Text>
                <Text style={styles.subtitleText}>Join Pravisti to manage your sovereign ledger.</Text>

                {/* Role Checkboxes */}
                <Text style={styles.inputLabel}>Select Role</Text>
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => !otpSent && setRole('Broker')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, role === 'Broker' && styles.checkboxChecked]}>
                      {role === 'Broker' && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Broker</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => !otpSent && setRole('Trader')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, role === 'Trader' && styles.checkboxChecked]}>
                      {role === 'Trader' && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Trader</Text>
                  </TouchableOpacity>
                </View>

                {/* Name */}
                <Text style={styles.inputLabel}>Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="#CBD5E1"
                    value={name}
                    onChangeText={setName}
                    editable={!otpSent}
                  />
                </View>

                {/* Number */}
                <Text style={styles.inputLabel}>Number</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter number"
                    placeholderTextColor="#CBD5E1"
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    editable={!otpSent}
                  />
                </View>

                {/* Mobile Number */}
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.prefixText}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="00000 00000"
                    placeholderTextColor="#CBD5E1"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpSent}
                  />
                </View>

                {/* OTP Section */}
                {otpSent && (
                  <>
                    <View style={styles.otpHeaderRow}>
                      <Text style={styles.inputLabel}>Verification Code</Text>
                      <TouchableOpacity onPress={handleSignup} disabled={timer > 0}>
                        <Text style={[styles.resendText, { color: timer > 0 ? '#999' : themeColor }]}>
                          Resend in {formatTimer()}
                        </Text>
                      </TouchableOpacity>
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

                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
                  activeOpacity={0.8}
                  onPress={otpSent ? handleVerifyOtp : handleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.verifyButtonText}>
                      {otpSent ? 'Verify & Sign Up' : `Sign Up as ${role}`}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.switchRoleContainer}>
                  <TouchableOpacity onPress={() => onNavigate && onNavigate('Login')}>
                    <Text style={styles.switchRoleLabel}>Already have an account? Login</Text>
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
    backgroundColor: '#F0F7FF',
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
    shadowColor: '#3170CD',
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
  verifyButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
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
    color: '#3170cdff',
    fontWeight: '600'
  },
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#3170cdff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#3170cdff',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
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
});

export default Signup;
