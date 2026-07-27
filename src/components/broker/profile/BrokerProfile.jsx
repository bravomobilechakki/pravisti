import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
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
  DollarSign,
  FileText,
  MessageSquare,
  HelpCircle,
  Lock,
  Sparkles,
  Share2,
  CreditCard,
  Layers,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, logoutUser } from '../../../services/api';
import Navbar from '../../navbar/navbar';

const { width } = Dimensions.get('window');

const BrokerProfile = ({ onNavigate, routeData }) => {
  const [user, setUser] = useState(routeData?.user || null);

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

  const userName = user?.name || routeData?.user?.name || 'Ramesh Sharma';
  const mobile = user?.mobileNumber || user?.phone || routeData?.user?.mobileNumber || '9876543210';
  const email = user?.email || routeData?.user?.email || 'ramesh.broker@pravisti.com';
  const firmName = user?.company || 'Ganesha Commodity Brokers';
  const licenseNo = user?.gstin || 'APMC/MUM/2026/88';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />
      <Navbar onNavigate={onNavigate} user={user} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── HERO HEADER BACKDROP CARD ─── */}
        <View style={styles.heroSection}>
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <LinearGradient id="brokerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#312E81" />
                <Stop offset="50%" stopColor="#4F46E5" />
                <Stop offset="100%" stopColor="#1E1B4B" />
              </LinearGradient>
            </Defs>
            <Path
              fill="url(#brokerGrad)"
              d={`M0,0 L${width},0 L${width},140 C${width * 0.7},170 ${width * 0.3},120 0,160 Z`}
            />
          </Svg>

          <View style={styles.heroHeaderContent}>
            {/* Avatar Circle with Gold Ring */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {userName.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.verifiedCheckBadge}>
                <CheckCircle2 size={16} color="#FFFFFF" fill="#10B981" />
              </View>
            </View>

            <Text style={styles.userNameText}>{userName}</Text>

            <View style={styles.rolePillBadge}>
              <ShieldCheck size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.rolePillText}>APMC CERTIFIED BROKER</Text>
            </View>

            <Text style={styles.contactSubtitle}>
              +91 {mobile} • {email}
            </Text>
          </View>
        </View>

        {/* ─── BROKERAGE STATS WIDGETS ─── */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#EEF2FF' }]}>
                <DollarSign size={18} color="#4F46E5" />
              </View>
              <Text style={styles.statVal}>₹1,48,000</Text>
              <Text style={styles.statLbl}>Earned Brokerage</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Briefcase size={18} color="#10B981" />
              </View>
              <Text style={styles.statVal}>15 Deals</Text>
              <Text style={styles.statLbl}>Completed Saudas</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Award size={18} color="#D97706" />
              </View>
              <Text style={styles.statVal}>48 Clients</Text>
              <Text style={styles.statLbl}>Traders & Mills</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Percent size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.statVal}>1.0 %</Text>
              <Text style={styles.statLbl}>Commission Rate</Text>
            </View>
          </View>
        </View>

        {/* ─── REGISTERED BROKERAGE FIRM DETAILS ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Building2 size={20} color="#4F46E5" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Registered Brokerage Firm</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('BrokerAddCompany')}>
              <Edit3 size={16} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <View style={styles.firmBox}>
            <Text style={styles.firmNameText}>{firmName}</Text>
            <View style={styles.licenseBadge}>
              <Text style={styles.licenseBadgeText}>APMC LICENSE: {licenseNo}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.firmMetaRow}>
              <MapPin size={15} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.firmMetaLbl}>Operating Mandis:</Text>
              <Text style={styles.firmMetaVal}>Rajkot, Unjha, MP Mandis</Text>
            </View>

            <View style={styles.firmMetaRow}>
              <CreditCard size={15} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.firmMetaLbl}>Commission Payout:</Text>
              <Text style={styles.firmMetaVal}>HDFC Bank (••• 4920)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addFirmBtn}
            activeOpacity={0.85}
            onPress={() => onNavigate('BrokerAddCompany')}
          >
            <Plus size={16} color="#4F46E5" style={{ marginRight: 6 }} />
            <Text style={styles.addFirmBtnText}>Link Additional APMC Brokerage Firm</Text>
          </TouchableOpacity>
        </View>

        {/* ─── BROKER QUICK DESK OPTIONS ─── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Broker Desk Options</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() => onNavigate('DealsList')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#EEF2FF' }]}>
                <FileText size={18} color="#4F46E5" />
              </View>

              <View>
                <Text style={styles.menuTitle}>Sauda Ledger & Chitti History</Text>
                <Text style={styles.menuSub}>View issued contracts & status</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() => onNavigate('BrokerAddCompany')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Building2 size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Manage APMC License & Firms</Text>
                <Text style={styles.menuSub}>Update firm details & mandi registration</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() => onNavigate('ChatList')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#ECFDF5' }]}>
                <MessageSquare size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Client Messages & Chats</Text>
                <Text style={styles.menuSub}>Direct Buyer and Seller negotiation</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Broker Support', 'Calling APMC Broker Support Desk: +91 1800-420-999')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
                <HelpCircle size={18} color="#D97706" />
              </View>
              <View>
                <Text style={styles.menuTitle}>Pravisti Broker Support Desk</Text>
                <Text style={styles.menuSub}>24x7 Mandi assistance & dispute resolution</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ─── LOGOUT BUTTON ─── */}
        <TouchableOpacity style={styles.logoutCardBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutCardText}>Logout Broker Account</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: '#1E1B4B',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroHeaderContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#818CF8',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4F46E5',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  rolePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contactSubtitle: {
    fontSize: 12,
    color: '#C7D2FE',
    fontWeight: '500',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  firmBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  firmNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  licenseBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  licenseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  firmMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  firmMetaLbl: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 6,
  },
  firmMetaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  addFirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  addFirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 11,
    color: '#64748B',
  },
  logoutCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    elevation: 2,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  logoutCardText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
});

export default BrokerProfile;
