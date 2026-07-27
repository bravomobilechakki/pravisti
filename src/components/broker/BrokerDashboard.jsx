import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import {
  Bell,
  Building2,
  Handshake,
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  User,
  ShieldCheck,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import { getCompanies, getUserProfile } from '../../services/api';

const BrokerDashboard = ({ onNavigate, routeData }) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companies, setCompanies] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(routeData?.user || null);

  const fetchDashboardData = async () => {
    try {
      const response = await getCompanies(1, 20);
      if (response && response.success) {
        setCompanies(response.data.companies || []);
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userRes = await getUserProfile(token);
        if (userRes && userRes.success) {
          const storedProfile = await AsyncStorage.getItem('user_completed_profile');
          let mergedProfile = { ...userRes.data };
          if (storedProfile) {
            const parsed = JSON.parse(storedProfile);
            mergedProfile = {
              ...userRes.data,
              name: parsed.name !== undefined ? parsed.name : userRes.data.name,
              email: parsed.email !== undefined ? parsed.email : userRes.data.email,
              company: parsed.company !== undefined ? parsed.company : userRes.data.company,
              gstin: parsed.gstin !== undefined ? parsed.gstin : userRes.data.gstin,
              address: parsed.address !== undefined ? parsed.address : userRes.data.address,
              role: 'Broker',
            };
          } else {
            mergedProfile = { ...userRes.data, role: 'Broker' };
          }
          setCurrentUser(mergedProfile);
          await AsyncStorage.setItem('user_completed_profile', JSON.stringify(mergedProfile));
        }
      }
    } catch (error) {
      console.error('Error fetching broker dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    const loadCachedProfile = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const storedProfile = await AsyncStorage.getItem('user_completed_profile');
        if (storedProfile) {
          setCurrentUser(JSON.parse(storedProfile));
        }
      } catch (e) {
        console.warn('Failed to load cached profile:', e);
      }
    };
    loadCachedProfile();
    fetchDashboardData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const recentDeals = currentUser?.recentDeals || routeData?.user?.recentDeals || [];
  const userName = currentUser?.name || routeData?.user?.name || 'Broker Partner';

  const roleTheme = {
    bg: 'rgba(99, 102, 241, 0.15)',
    border: '#6366F1',
    text: '#6366F1',
    label: '⚡ BROKER ACCOUNT',
  };

  // Modern styled quick actions
  const quickActions = [
    {
      id: 'deals',
      label: 'Sauda',
      icon: <Handshake size={22} color="#FFFFFF" />,
      circleBg: '#4F46E5', // Deep Indigo
      onPress: () => onNavigate('DealsList', { user: routeData?.user }),
    },
    {
      id: 'chat',
      label: 'Messages',
      icon: <Users size={22} color="#FFFFFF" />,
      circleBg: '#10B981', // Emerald Green
      onPress: () => onNavigate('ChatList', { user: routeData?.user }),
    },
    {
      id: 'broker_company',
      label: 'Add Firm',
      icon: <Building2 size={22} color="#FFFFFF" />,
      circleBg: '#8B5CF6', // Purple
      onPress: () => onNavigate('BrokerAddCompany', { user: routeData?.user }),
    },
    {
      id: 'profile',
      label: 'View Profile',
      icon: <User size={22} color="#FFFFFF" />,
      circleBg: '#F59E0B', // Amber
      onPress: () => onNavigate('Profile', { user: routeData?.user }),
    },
  ];

  // Stats data
  const statCards = [
    {
      label: 'Active Saudas',
      value: recentDeals.filter(d => d.status === 'Active').length || '12',
      icon: <TrendingUp size={16} color="#2FC25B" />,
      trend: '+12%',
      accent: '#2FC25B',
      bg: '#E8F8EE',
    },
    {
      label: 'Pending Signature',
      value: recentDeals.filter(d => d.status === 'Pending').length || '3',
      icon: <TrendingDown size={16} color="#FF9E00" />,
      trend: '2 new',
      accent: '#FF9E00',
      bg: '#FFF5E6',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />

      {/* ─── SCROLLABLE BODY ─── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }>

        {/* ─── HERO HEADER ─── */}
        <View style={styles.heroSection}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            {/* Left: Notification Bell */}
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => onNavigate('ChatList')}
              activeOpacity={0.7}>
              <Bell size={20} color="#FFFFFF" />
              <View style={styles.notifDot} />
            </TouchableOpacity>

            {/* Center: Main Logo Image */}
            <View style={styles.brandContainer}>
              <Image
                source={require('../../images/trader1.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>

            {/* Right: Profile Section (Avatar with initials) */}
            <View style={styles.profileSection}>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => onNavigate('Profile')}
                activeOpacity={0.75}>
                <Text style={styles.avatarText}>
                  {userName.trim().charAt(0).toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Welcome & Register Company Prompt */}
          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeHelloText}>Hello & Welcome,</Text>

            <View style={styles.nameAndRoleRow}>
              <Text
                style={styles.userNameStylish}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {userName}
              </Text>

              <View style={[
                styles.premiumRoleBadge,
                {
                  backgroundColor: roleTheme.bg,
                  borderColor: roleTheme.border
                }
              ]}>
                <Text style={[
                  styles.premiumRoleText,
                  { color: roleTheme.text }
                ]}>
                  {roleTheme.label}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.registerPromptBtn}
              onPress={() => onNavigate('BrokerAddCompany')}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#4F46E5" />
              <Text style={styles.registerPromptText}>Link Your Brokerage Company</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── QUICK ACTIONS GRID ─── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickActionItem}
                onPress={item.onPress}
                activeOpacity={0.8}>
                <View style={[styles.actionIconCircle, { backgroundColor: item.circleBg }]}>
                  {item.icon}
                </View>
                <Text style={styles.actionItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── STATS & OVERVIEW ─── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Brokerage Overview</Text>
          <View style={styles.statsGrid}>
            {statCards.map((stat, idx) => (
              <View key={idx} style={styles.statCardItem}>
                <View style={styles.statTopRow}>
                  <View style={[styles.statIconBadge, { backgroundColor: stat.bg }]}>
                    {stat.icon}
                  </View>
                  <Text style={[styles.statTrendText, { color: stat.accent }]}>
                    {stat.trend}
                  </Text>
                </View>
                <Text style={styles.statValueText}>{stat.value}</Text>
                <Text style={styles.statLabelText}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── RECENT SAUDAS & DEALS ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Broker Deals</Text>
            <TouchableOpacity onPress={() => onNavigate('DealsList')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.createDealCard}
            onPress={() => onNavigate('CreateDeal')}
            activeOpacity={0.85}>
            <View style={styles.createDealIconBox}>
              <Plus size={22} color="#FFFFFF" />
            </View>
            <View style={styles.createDealTextBox}>
              <Text style={styles.createDealTitle}>Create New Broker Sauda</Text>
              <Text style={styles.createDealSub}>Match Buyer and Seller for instant sauda chitti</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createDealCard, { marginTop: 12, backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
            onPress={() => onNavigate('BrokerPendingQueue')}
            activeOpacity={0.85}>
            <View style={[styles.createDealIconBox, { backgroundColor: '#D97706' }]}>
              <Clock size={22} color="#FFFFFF" />
            </View>
            <View style={styles.createDealTextBox}>
              <Text style={[styles.createDealTitle, { color: '#92400E' }]}>Pending Verification Queue</Text>
              <Text style={[styles.createDealSub, { color: '#B45309' }]}>View assisted deals waiting for Seller/Buyer sign</Text>
            </View>
            <ChevronRight size={20} color="#D97706" />
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroSection: {
    backgroundColor: '#1E1B4B',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    marginBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandLogo: {
    width: 110,
    height: 36,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  welcomeBanner: {
    marginTop: 4,
  },
  welcomeHelloText: {
    fontSize: 13,
    color: '#C7D2FE',
    fontWeight: '500',
    marginBottom: 2,
  },
  nameAndRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  userNameStylish: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  premiumRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  premiumRoleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  registerPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  registerPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
    marginLeft: 6,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    width: '22%',
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  actionItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTrendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  createDealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  createDealIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  createDealTextBox: {
    flex: 1,
  },
  createDealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  createDealSub: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default BrokerDashboard;
