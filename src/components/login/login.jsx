import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  useWindowDimensions,
} from 'react-native';

const Login = ({ onNavigate }) => {
  const { width, height } = useWindowDimensions();
  const [identity, setIdentity] = useState('Broker'); // Broker, Trader, Both
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = useRef([]);

  const themeColor = '#3170cdff';

  const handleOtpChange = (text, index) => {
    const formattedText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = formattedText;
    setOtp(newOtp);

    if (formattedText !== '' && index < 3) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Role tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, identity === 'Broker' && { backgroundColor: themeColor }]}
            onPress={() => setIdentity('Broker')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabIcon, identity === 'Broker' ? styles.activeText : styles.inactiveText]}>🧑‍💼</Text>
            <Text style={[styles.tabText, identity === 'Broker' ? styles.activeText : styles.inactiveText]}>Broker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, identity === 'Trader' && { backgroundColor: themeColor }]}
            onPress={() => setIdentity('Trader')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabIcon, identity === 'Trader' ? styles.activeText : styles.inactiveText]}>💼</Text>
            <Text style={[styles.tabText, identity === 'Trader' ? styles.activeText : styles.inactiveText]}>Trader</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, identity === 'Both' && { backgroundColor: themeColor }]}
            onPress={() => setIdentity('Both')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabIcon, identity === 'Both' ? styles.activeText : styles.inactiveText]}>🔄</Text>
            <Text style={[styles.tabText, identity === 'Both' ? styles.activeText : styles.inactiveText]}>Both</Text>
          </TouchableOpacity>
        </View>

        {/* Mobile input */}
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
          />
        </View>

        {/* OTP */}
        <View style={styles.otpHeaderRow}>
          <Text style={styles.inputLabel}>Verification Code</Text>
          <TouchableOpacity>
            <Text style={[styles.resendText, { color: themeColor }]}>Resend in 0:45</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.otpContainer}>
          {[0, 1, 2, 3].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => (otpRefs.current[index] = ref)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={otp[index]}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleOtpKeyPress(e, index)}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.verifyButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
          activeOpacity={0.8}
          onPress={() => {
            if (onNavigate) {
              onNavigate('Dashboard', { role: identity });
            }
          }}
        >
          <Text style={styles.verifyButtonText}>
            {identity === 'Both' ? 'Login with Combined Access' : `${identity} Login`}
          </Text>
        </TouchableOpacity>

        <View style={styles.switchRoleContainer}>
          <Text style={styles.switchRoleLabel}>Join as Member?</Text>
        </View>
      </View>
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
    color: '#64748B',
  },
});

export default Login;
