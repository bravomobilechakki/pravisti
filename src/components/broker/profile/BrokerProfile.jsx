import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  Award,
  MapPin,
  Percent,
  LogOut,
  ChevronRight,
  Plus,
  Briefcase,
  Edit3,
  CheckCircle2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, logoutUser } from '../../../services/api';
import Navbar from '../../navbar/navbar';

const BrokerProfile = ({ onNavigate, routeData }) => {
  const [user, setUser] = useState(routeData?.user || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const res = await getUserProfile(token);
          if (res && res.success) {
            setUser(res.data);
          }
        }
      } catch (err) {
        console.warn('Could not fetch broker profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout Broker', 'Are you sure you want to log out of your Broker Account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) await logoutUser(token);
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('user_completed_profile');
          } catch (e) {
            console.warn('Logout cleanup error:', e);
          } finally {
            onNavigate('Login', {}, { replace: true });
          }
        },
      },
    ]);
  };

  const userName = user?.name || routeData?.user?.name || 'Broker Partner';
  const mobile = user?.mobileNumber || user?.phone || routeData?.user?.mobileNumber || 'N/A';
  const email = user?.email || routeData?.user?.email || 'broker@pravisti.com';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Navbar onNavigate={onNavigate} user={user} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userName.trim().charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.nameText}>{userName}</Text>

          <View style={styles.roleBadge}>
            <ShieldCheck size={14} color="#4F46E5" style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>APMC Certified Broker</Text>
          </View>

          <Text style={styles.contactSub}>+91 {mobile} • {email}</Text>
        </View>

        {/* Brokerage Firm Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Briefcase size={20} color="#4F46E5" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Brokerage Firm & License</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Firm Name</Text>
            <Text style={styles.infoVal}>{user?.company || 'Ganesha Commodity Brokers'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>APMC License / GST</Text>
            <Text style={styles.infoVal}>{user?.gstin || 'APMC/MUM/2026/88'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operating Mandis</Text>
            <Text style={styles.infoVal}>Unjha, Rajkot, Indore</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Default Brokerage</Text>
            <Text style={[styles.infoVal, { color: '#4F46E5', fontWeight: '800' }]}>1.0 %</Text>
          </View>

          <TouchableOpacity
            style={styles.addFirmBtn}
            onPress={() => onNavigate('BrokerAddCompany')}
          >
            <Plus size={16} color="#4F46E5" style={{ marginRight: 6 }} />
            <Text style={styles.addFirmText}>Register Additional Brokerage Firm</Text>
          </TouchableOpacity>
        </View>

        {/* Broker Settings & Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Options</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => onNavigate('BrokerDealsList')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Award size={18} color="#4F46E5" />
              </View>
              <Text style={styles.menuText}>Sauda Ledger & Chitti History</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => onNavigate('BrokerAddCompany')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Building2 size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.menuText}>Manage Brokerage Firms</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Logout Broker Account</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4F46E5',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  contactSub: {
    fontSize: 13,
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  addFirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  addFirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});

export default BrokerProfile;
