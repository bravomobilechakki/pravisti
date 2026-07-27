import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Briefcase, Factory, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react-native';

const THEME = '#4F46E5';

const RoleSelectionModal = ({ onSelectRole, onNavigate, currentRole = 'Broker' }) => {
  const [selectedRole, setSelectedRole] = useState(currentRole);

  const handleContinue = () => {
    if (onSelectRole) {
      onSelectRole(selectedRole);
    }
    if (selectedRole === 'Broker') {
      onNavigate('BrokerRegistration');
    } else {
      onNavigate('Signup');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Account Type 🎯</Text>
          <Text style={styles.subtitle}>
            Select how you want to trade and manage transactions on the Pravisti platform.
          </Text>
        </View>

        {/* Roles List */}
        <View style={styles.rolesContainer}>
          {/* Role 1: Broker / Sauda Agent */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'Broker' && styles.roleCardSelected,
            ]}
            activeOpacity={0.88}
            onPress={() => setSelectedRole('Broker')}
          >
            <View style={styles.roleHeader}>
              <View style={[
                styles.iconBox,
                selectedRole === 'Broker' && styles.iconBoxSelected,
              ]}>
                <Briefcase size={24} color={selectedRole === 'Broker' ? '#FFFFFF' : '#4F46E5'} />
              </View>
              {selectedRole === 'Broker' && (
                <View style={styles.selectedBadge}>
                  <CheckCircle2 size={18} color="#4F46E5" />
                </View>
              )}
            </View>
            <Text style={styles.roleTitle}>Broker / Sauda Agent 💼</Text>
            <Text style={styles.roleDesc}>
              Facilitate sauda deals between Buyers (Traders) & Sellers (Mill Owners). Track brokerage commission and generate digital sauda chitti.
            </Text>
            <View style={styles.tagRow}>
              <View style={styles.tag}><Text style={styles.tagText}>Deal Matchmaking</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>Commission Tracking</Text></View>
            </View>
          </TouchableOpacity>

          {/* Role 2: Mill Owner / Trader / Buyer / Seller */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'Trader' && styles.roleCardSelected,
            ]}
            activeOpacity={0.88}
            onPress={() => setSelectedRole('Trader')}
          >
            <View style={styles.roleHeader}>
              <View style={[
                styles.iconBox,
                selectedRole === 'Trader' && styles.iconBoxSelected,
              ]}>
                <Factory size={24} color={selectedRole === 'Trader' ? '#FFFFFF' : '#0891B2'} />
              </View>
              {selectedRole === 'Trader' && (
                <View style={styles.selectedBadge}>
                  <CheckCircle2 size={18} color="#0891B2" />
                </View>
              )}
            </View>
            <Text style={styles.roleTitle}>Mill Owner / Trader / Buyer 🏭</Text>
            <Text style={styles.roleDesc}>
              Buy or sell raw materials & commodities directly. Manage company inventory, ledger, and deal requests with verified brokers.
            </Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: '#ECFEFF' }]}><Text style={[styles.tagText, { color: '#0891B2' }]}>Direct Buying/Selling</Text></View>
              <View style={[styles.tag, { backgroundColor: '#ECFEFF' }]}><Text style={[styles.tagText, { color: '#0891B2' }]}>Inventory Ledger</Text></View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>
            Continue as {selectedRole === 'Broker' ? 'Broker' : 'Trader / Mill Owner'}
          </Text>
          <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Existing User Link */}
        <View style={styles.footerLinkContainer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => onNavigate(selectedRole === 'Broker' ? 'BrokerLogin' : 'Login')}>
            <Text style={styles.footerLink}> Log in here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  rolesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  roleCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#FAF5FF',
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSelected: {
    backgroundColor: '#4F46E5',
  },
  selectedBadge: {
    padding: 4,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  roleDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  continueBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    marginBottom: 20,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
});

export default RoleSelectionModal;
