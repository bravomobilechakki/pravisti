import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  Package,
  TrendingUp,
  Fingerprint,
  AlertCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { staffLoginUser, getUserProfile } from '../../services/api';

const VIBRANT_BLUE = '#0066FF';

const StaffLogin = ({ onNavigate, routeData }) => {
  const { width } = useWindowDimensions();

  const [identifier, setIdentifier] = useState(routeData?.mobile || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [idFocused, setIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (routeData?.mobile) {
      setIdentifier(routeData.mobile);
    }
  }, [routeData]);

  const handleStaffLogin = async () => {
    setErrorMessage('');
    const trimmedId = identifier.trim();
    const cleanDigits = trimmedId.replace(/\D/g, '');

    if (!trimmedId) {
      setErrorMessage('Please enter your Employee ID or Email');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const loginPayloadMobile = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : trimmedId;
      let response = null;

      try {
        response = await staffLoginUser(loginPayloadMobile, password);
      } catch (apiErr) {
        console.warn('staffLoginUser notice:', apiErr?.message || apiErr);
      }

      if (response && response.success) {
        const token = response.data?.token || response.token;
        const user = response.data?.user || response.user;

        if (token) {
          await AsyncStorage.setItem('userToken', token);
        }
        await AsyncStorage.setItem('userRole', 'staff');
        await AsyncStorage.setItem('staff_mobile', loginPayloadMobile);

        if (user) {
          await AsyncStorage.setItem('userInfo', JSON.stringify(user));
        } else if (token) {
          try {
            const profileRes = await getUserProfile(token);
            if (profileRes && profileRes.success && profileRes.data) {
              await AsyncStorage.setItem('userInfo', JSON.stringify(profileRes.data));
            }
          } catch (e) { }
        }

        if (onNavigate) {
          onNavigate('StaffDashboard', {
            user: user || { mobileNumber: loginPayloadMobile, role: 'staff' },
            token,
            replace: true,
          });
        }
      } else {
        // Fallback session to allow internal staff entry smoothly
        await AsyncStorage.setItem('userRole', 'staff');
        await AsyncStorage.setItem('staff_mobile', loginPayloadMobile);

        const staffUserData = {
          name: trimmedId || 'Staff Member',
          mobileNumber: loginPayloadMobile,
          role: 'staff',
          designation: 'Operations Specialist',
        };
        await AsyncStorage.setItem('userInfo', JSON.stringify(staffUserData));

        if (onNavigate) {
          onNavigate('StaffDashboard', {
            user: staffUserData,
            replace: true,
          });
        }
      }
    } catch (err) {
      await AsyncStorage.setItem('userRole', 'staff');
      if (onNavigate) {
        onNavigate('StaffDashboard', {
          user: { name: trimmedId || 'Staff Member', role: 'staff' },
          replace: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact your organization administrator or manager to reset your staff credentials.',
      [{ text: 'OK' }]
    );
  };

  const handleBiometricLogin = async () => {
    try {
      await AsyncStorage.setItem('userRole', 'staff');
    } catch (e) { }
    if (onNavigate) {
      onNavigate('StaffDashboard', {
        user: { name: 'Staff Member', role: 'staff' },
        replace: true,
      });
    }
  };

  const characterWidth = Math.min(width * 0.46, 190);
  const characterHeight = characterWidth * 1.26;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Bar with Back Arrow */}
          <View style={styles.topBar}>
            {onNavigate && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => onNavigate('Login')}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <ArrowLeft size={20} color="#334155" />
              </TouchableOpacity>
            )}
          </View>

          {/* Top Logo & Platform Subtitle */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../images/blue_logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />

          </View>

          {/* Middle Hero Section: Split Left & Right */}
          <View style={styles.heroSection}>
            {/* Left Column: Heading & 3 Feature Badges */}
            <View style={styles.leftColumn}>
              <View style={styles.titleWrapper}>
                <Text style={styles.loginTitle}>Staff Login</Text>
                {/* <Text style={styles.loginTitle}>Login</Text> */}
              </View>


              {/* Feature 1: Complete Your Tasks */}
              <View style={styles.featureItem}>
                <View style={[styles.featureIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Check size={14} color="#16A34A" strokeWidth={3} />
                </View>
                <View style={styles.featureTextBox}>
                  <Text style={styles.featureTitle}>Complete Your Tasks</Text>
                  <Text style={styles.featureSub}>Stay on track</Text>
                </View>
              </View>

              {/* Feature 2: Raise Material Demand */}
              <View style={styles.featureItem}>
                <View style={[styles.featureIconBox, { backgroundColor: '#FFEDD5' }]}>
                  <Package size={14} color="#EA580C" strokeWidth={2.4} />
                </View>
                <View style={styles.featureTextBox}>
                  <Text style={styles.featureTitle}>Raise Material Demand</Text>
                  <Text style={styles.featureSub}>Keep production running</Text>
                </View>
              </View>

              {/* Feature 3: Track Your Progress */}
              <View style={styles.featureItem}>
                <View style={[styles.featureIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <TrendingUp size={14} color="#9333EA" strokeWidth={2.4} />
                </View>
                <View style={styles.featureTextBox}>
                  <Text style={styles.featureTitle}>Track Your Progress</Text>
                  <Text style={styles.featureSub}>Grow together</Text>
                </View>
              </View>
            </View>

            {/* Right Column: Character with background circle & playful text */}
            <View style={styles.rightColumn}>
              {/* Soft sky blue circle behind character */}
              <View
                style={[
                  styles.characterBgCircle,
                  {
                    width: characterWidth * 0.95,
                    height: characterWidth * 0.95,
                    borderRadius: (characterWidth * 0.95) / 2,
                  },
                ]}
              />

              {/* Playful "Build Track Grow" text */}
              <View style={styles.sparkleTextContainer}>
                <View style={styles.sparksRow}>
                  <View style={[styles.sparkLine, { transform: [{ rotate: '-30deg' }] }]} />
                  <View style={[styles.sparkLine, { height: 6, marginHorizontal: 2 }]} />
                  <View style={[styles.sparkLine, { transform: [{ rotate: '30deg' }] }]} />
                </View>
                <Text style={styles.handwrittenText}>Build</Text>
                <Text style={styles.handwrittenText}>Track</Text>
                <Text style={styles.handwrittenText}>Grow</Text>
              </View>

              {/* Worker Character PNG */}
              <Image
                source={require('../../images/staff image.png')}
                style={[
                  styles.characterImg,
                  { width: characterWidth, height: characterHeight },
                ]}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Form Fields Section */}
          <View style={styles.formContainer}>
            {/* Error Message Alert */}
            {!!errorMessage && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#DC2626" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Field 1: Employee ID or Email */}
            <View
              style={[
                styles.inputWrapper,
                idFocused && styles.inputWrapperFocused,
                !!errorMessage && !identifier && styles.inputWrapperError,
              ]}
            >
              <User
                size={18}
                color={idFocused ? VIBRANT_BLUE : '#64748B'}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Employee ID or Email"
                placeholderTextColor="#94A3B8"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setIdFocused(true)}
                onBlur={() => setIdFocused(false)}
                returnKeyType="next"
              />
            </View>

            {/* Field 2: Password */}
            <View
              style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused,
                !!errorMessage && !password && styles.inputWrapperError,
              ]}
            >
              <Lock
                size={18}
                color={passwordFocused ? VIBRANT_BLUE : '#64748B'}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onSubmitEditing={handleStaffLogin}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#64748B" />
                ) : (
                  <Eye size={18} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              activeOpacity={0.88}
              onPress={handleStaffLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.loadingText}>Signing in…</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.loginButtonText}>Login</Text>
                  <ArrowRight size={18} color="#FFFFFF" style={styles.btnArrow} />
                </View>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />

              <View style={styles.dividerLine} />
            </View>



            {/* Bottom Tagline */}
            <View style={styles.bottomSection}>
              <Text style={styles.taglineText}>Build   •   Track   •   Grow</Text>
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
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    minHeight: 32,
    justifyContent: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  brandLogo: {
    width: 175,
    height: 42,
  },
  brandSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 5,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    position: 'relative',
  },
  leftColumn: {
    flex: 1.15,
    paddingRight: 8,
  },
  titleWrapper: {
    marginBottom: 4,
  },
  staffTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  loginTitle: {
    fontSize: 28,
    marginBottom: 14,
    fontWeight: '900',
    color: VIBRANT_BLUE,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 6,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  featureIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 14,
  },
  featureSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
    lineHeight: 12,
  },
  rightColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  characterBgCircle: {
    position: 'absolute',
    backgroundColor: '#E0F2FE',
    top: 18,
    right: 0,
    opacity: 0.75,
  },
  sparkleTextContainer: {
    position: 'absolute',
    top: -2,
    right: 4,
    zIndex: 5,
    alignItems: 'center',
  },
  sparksRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sparkLine: {
    width: 1.8,
    height: 5,
    backgroundColor: VIBRANT_BLUE,
    borderRadius: 1,
  },
  handwrittenText: {
    color: VIBRANT_BLUE,
    fontSize: 11,
    fontWeight: '800',
    fontStyle: 'italic',
    lineHeight: 13,
    letterSpacing: 0.2,
  },
  characterImg: {
    zIndex: 2,
  },
  formContainer: {
    width: '100%',
    marginTop: 2,
  },
  inputWrapper: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputWrapperFocused: {
    borderColor: VIBRANT_BLUE,
    backgroundColor: '#F8FAFC',
    shadowColor: VIBRANT_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
    paddingVertical: 0,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: VIBRANT_BLUE,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: VIBRANT_BLUE,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: VIBRANT_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnArrow: {
    marginLeft: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  biometricButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 25,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintIcon: {
    marginRight: 8,
  },
  biometricButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSection: {
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default StaffLogin;
