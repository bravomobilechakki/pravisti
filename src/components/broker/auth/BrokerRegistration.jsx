import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Building2, ShieldCheck, ArrowRight, MapPin, Percent } from 'lucide-react-native';

const BrokerRegistration = ({ onNavigate }) => {
  const [firmName, setFirmName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [mandi, setMandi] = useState('');
  const [commissionRate, setCommissionRate] = useState('1.0');

  const handleRegister = () => {
    if (!firmName.trim() || !licenseNo.trim()) {
      Alert.alert('Validation Error', 'Firm Name & APMC License Number are required');
      return;
    }
    Alert.alert('Firm Created', `Brokerage Firm "${firmName}" has been successfully created!`, [
      { text: 'OK', onPress: () => onNavigate('BrokerDashboard') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ShieldCheck size={28} color="#4F46E5" style={{ marginBottom: 8 }} />
          <Text style={styles.title}>Register Brokerage Firm</Text>
          <Text style={styles.subtitle}>Setup APMC mandi brokerage details for instant sauda issuance.</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Brokerage Firm Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ganesha Commodity Brokers"
            value={firmName}
            onChangeText={setFirmName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>APMC License / GST Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. APMC/MUM/2026/88"
            value={licenseNo}
            onChangeText={setLicenseNo}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Operating Mandi & Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rajkot, Unjha, MP Mandi"
            value={mandi}
            onChangeText={setMandi}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Standard Commission (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="1.0"
            keyboardType="decimal-pad"
            value={commissionRate}
            onChangeText={setCommissionRate}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister}>
          <Text style={styles.submitBtnText}>Complete Registration</Text>
          <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default BrokerRegistration;
