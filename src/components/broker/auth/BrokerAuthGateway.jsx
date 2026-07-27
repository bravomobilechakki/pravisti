import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { ShieldCheck, ArrowRight, Building2, UserCheck } from 'lucide-react-native';

const BrokerAuthGateway = ({ onNavigate }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />
      <View style={styles.content}>
        <ShieldCheck size={48} color="#A5B4FC" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Pravisti Broker Hub</Text>
        <Text style={styles.subtitle}>
          Digital APMC sauda contract matchmaking and commission management portal.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onNavigate('BrokerLogin')}
        >
          <Text style={styles.primaryBtnText}>Broker Login (Mobile OTP)</Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => onNavigate('BrokerRegistration')}
        >
          <Text style={styles.secondaryBtnText}>Register New Broker Firm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleSwitchBtn}
          onPress={() => onNavigate('Login')}
        >
          <Text style={styles.roleSwitchText}>Switch to Trader / Mill Owner Portal</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#312E81', justifyContent: 'center' },
  content: { padding: 24, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#C7D2FE', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginRight: 8 },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  roleSwitchBtn: { paddingVertical: 10 },
  roleSwitchText: { color: '#A5B4FC', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});

export default BrokerAuthGateway;
