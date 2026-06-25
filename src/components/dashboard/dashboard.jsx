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
} from 'lucide-react-native';
import { getCompanies, getUserProfile } from '../../services/api';

const Dashboard = ({ onNavigate, routeData }) => {
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

      // Fetch user profile dynamically to keep name and roles fully responsive & up-to-date
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userRes = await getUserProfile(token);
        if (userRes && userRes.success) {
          // Load cached profile first to avoid overwriting edits
          const storedProfile = await AsyncStorage.getItem('user_completed_profile');
          let mergedProfile = { ...userRes.data };
          if (storedProfile) {
            const parsed = JSON.parse(storedProfile);
            // Merge fields that can be updated in profile edit modal
            mergedProfile = {
              ...userRes.data,
              name: parsed.name !== undefined ? parsed.name : userRes.data.name,
              email: parsed.email !== undefined ? parsed.email : userRes.data.email,
              company: parsed.company !== undefined ? parsed.company : userRes.data.company,
              gstin: parsed.gstin !== undefined ? parsed.gstin : userRes.data.gstin,
              address: parsed.address !== undefined ? parsed.address : userRes.data.address,
            };
          }
          setCurrentUser(mergedProfile);
          // Sync with local profile storage key (shared with Profile.jsx)
          await AsyncStorage.setItem('user_completed_profile', JSON.stringify(mergedProfile));
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
  const hasCompany = companies.length > 0 || isLoading;
  const userName = currentUser?.name || routeData?.user?.name || 'Trader';
  const userRole = routeData?.role || currentUser?.userType || routeData?.user?.userType || currentUser?.roles?.[0] || routeData?.user?.roles?.[0] || 'Member';

  const isTrader = userRole.toLowerCase() === 'trader';
  const roleTheme = {
    bg: isTrader ? 'rgba(250, 204, 21, 0.15)' : 'rgba(99, 102, 241, 0.15)', // Gold/Indigo tint
    border: isTrader ? '#F59E0B' : '#6366F1',
    text: isTrader ? '#F59E0B' : '#6366F1',
    label: isTrader ? '👑 TRADER ACCOUNT' : '⚡ BROKER ACCOUNT',
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
      id: 'my_companies',
      label: 'My Companies',
      icon: <Building2 size={22} color="#FFFFFF" />,
      circleBg: '#06B6D4', // Cyan
      onPress: () => onNavigate('MyCompanies', { user: routeData?.user }),
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
      label: 'Active Deals',
      value: recentDeals.filter(d => d.status === 'Active').length || '—',
      icon: <TrendingUp size={16} color="#2FC25B" />,
      trend: '+12%',
      accent: '#2FC25B',
      bg: '#E8F8EE',
    },
    {
      label: 'Pending Approval',
      value: recentDeals.filter(d => d.status === 'Pending').length || '—',
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

        {/* ─── PAYTM BLUE HERO HEADER ─── */}
        <View style={styles.heroSection}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            {/* Left: Notification Bell */}
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => onNavigate('Profile')}
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
              onPress={() => onNavigate('AddCompany')}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#4F46E5" />
              <Text style={styles.registerPromptText}>Link Your Business Company</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PAYTM OVERLAPPING SHORTCUTS CARD ── */}
        <View style={styles.shortcutsCard}>
          <Text style={styles.shortcutsTitle}>Sauda & Business Money Transfer</Text>
          <View style={styles.shortcutsRow}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.shortcutItem}
                onPress={action.onPress}
                activeOpacity={0.78}>
                <View style={[styles.shortcutCircle, { backgroundColor: action.circleBg }]}>
                  {action.icon}
                </View>
                <Text style={styles.shortcutLabel} numberOfLines={2}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── STATS SECTION (Analytics) ── */}
        <View style={styles.bodyContent}>
          {/* ── MY COMPANIES (Paytm Recharge grid style list) ── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>My Companies</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{companies.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => onNavigate('AddCompany')}
              activeOpacity={0.8}>
              <Plus size={12} color="#4F46E5" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 24 }} />
          ) : !hasCompany ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => onNavigate('AddCompany')}
              activeOpacity={0.85}>
              <View style={styles.emptyDot1} />
              <View style={styles.emptyDot2} />
              <View style={styles.emptyIconCircle}>
                <Building2 size={28} color="#4F46E5" />
              </View>
              <Text style={styles.emptyTitle}>No Business Linked Yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your company details to start generating Saudais, managing deals, and sending invoices.
              </Text>
              <View style={styles.emptyBtn}>
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Link Your Business</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.companyListContainer}>
              {companies.map((company, index) => {
                const initials = company.name
                  ? company.name.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase()
                  : '??';

                const isActive = company.status === 'active' || company.status === 'Active';
                const isTraderCompany = company.type === 'trader';
                const companyTheme = {
                  bg: isTraderCompany ? '#E8F8EE' : '#EEF2FF',
                  border: isTraderCompany ? '#A7F3D0' : '#C7D2FE',
                  text: isTraderCompany ? '#10B981' : '#4F46E5',
                  leftBorder: isTraderCompany ? '#10B981' : '#4F46E5',
                };

                return (
                  <TouchableOpacity
                    key={company._id}
                    style={styles.companyRow}
                    onPress={() => onNavigate('CompanyDetails', { company, user: routeData?.user })}
                    activeOpacity={0.75}>

                    {/* Left: Initials Circle */}
                    <View style={[styles.rowInitialsCircle, { backgroundColor: companyTheme.bg, borderColor: companyTheme.border }]}>
                      <Text style={[styles.rowInitialsText, { color: companyTheme.text }]}>{initials}</Text>
                    </View>

                    {/* Middle: Details */}
                    <View style={styles.rowMiddle}>
                      <View style={styles.companyNameRow}>
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>👑 OWNER</Text>
                        </View>
                        <Text style={styles.rowName} numberOfLines={1}>{company.name}</Text>
                      </View>
                      <Text style={styles.rowIndustry} numberOfLines={1}>
                        {typeof company.industry === 'object' ? company.industry.name : company.industry || 'General'}
                      </Text>
                    </View>

                    {/* Right: Badge */}
                    <View style={styles.rowRight}>
                      <View style={[styles.rowTypeBadge, { backgroundColor: isTraderCompany ? '#E8F8EE' : '#EEF2FF' }]}>
                        <Text style={[styles.rowTypeBadgeText, { color: isTraderCompany ? '#10B981' : '#4F46E5' }]}>
                          {isTraderCompany ? 'Trader' : 'Broker'}
                        </Text>
                      </View>
                      <View style={styles.rowStatusWrap}>
                        <View style={[styles.rowStatusDot, { backgroundColor: isActive ? '#2FC25B' : '#FF9E00' }]} />
                        <Text style={[styles.rowStatusText, { color: isActive ? '#2FC25B' : '#FF9E00' }]}>
                          {isActive ? 'Active' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Add New Company Button */}
              <TouchableOpacity
                style={styles.addCompanyRowBtn}
                onPress={() => onNavigate('AddCompany')}
                activeOpacity={0.75}>
                <View style={styles.addCompanyRowIconCircle}>
                  <Plus size={14} color="#00B9F1" />
                </View>
                <Text style={styles.addCompanyRowBtnText}>Link New Business Company</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STATS SECTION (Analytics) ── */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Trade Analytics</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {statCards.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statCardIconBg, { backgroundColor: s.bg }]}>
                    {s.icon}
                  </View>
                  <View style={[styles.trendPill, { backgroundColor: s.bg }]}>
                    <Text style={[styles.trendText, { color: s.accent }]}>{s.trend}</Text>
                  </View>
                </View>
                <Text style={styles.statCardVal}>{s.value}</Text>
                <Text style={styles.statCardLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─────────────── PAYTM STYLES ─────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B4B', // Midnight Indigo
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate background off-white/light grey
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bodyContent: {
    paddingHorizontal: 16,
  },

  /* ── Hero Section ── */
  heroSection: {
    backgroundColor: '#1E1B4B', // Midnight Indigo
    paddingBottom: 48,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 14,
    paddingBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5', // Indigo avatar background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  profileTextCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  welcomeText: {
    color: '#A5C1E1',
    fontSize: 10,
    fontWeight: '600',
  },
  profileNameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  brandContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 100,
    height: 32,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30', // red dot
    borderWidth: 1,
    borderColor: '#1E1B4B',
  },

  /* Welcome Banner */
  welcomeBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  welcomeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameAndRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  premiumRoleBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumRoleText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  welcomeHelloText: {
    color: '#A5C1E1',
    fontSize: 11,
    fontWeight: '600',
  },
  userNameStylish: {
    color: '#FFFFFF',
    fontSize: 20, // clean, medium-sized, not too big!
    fontWeight: '700',
    letterSpacing: 0.1,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  registerPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    gap: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.15)',
  },
  registerPromptText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },

  /* ── Overlapping Shortcuts Card ── */
  shortcutsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: -32,
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  shortcutsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6F7E94',
    marginBottom: 16,
    paddingHorizontal: 4,
    letterSpacing: 0.2,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  shortcutItem: {
    alignItems: 'center',
    flex: 1,
  },
  shortcutCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 14,
  },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B', // Midnight Indigo headers
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  addBtnText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Stats cards */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statCardVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F7E94',
  },

  /* Company list card items */
  companyListContainer: {
    marginBottom: 16,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: '#E0E7FF', // Premium light indigo border
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rowInitialsCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  rowInitialsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  rowMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  ownerBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownerBadgeText: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  rowIndustry: {
    fontSize: 11,
    color: '#6F7E94',
    fontWeight: '500',
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rowTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  rowStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  /* Add Company Flat Button */
  addCompanyRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#00B9F1',
    borderStyle: 'dashed',
  },
  addCompanyRowIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCompanyRowBtnText: {
    color: '#00B9F1',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Empty states */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  emptyDot1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    top: -35,
    right: -35,
    opacity: 0.8,
  },
  emptyDot2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F8EE',
    bottom: -25,
    left: -25,
    opacity: 0.8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6F7E94',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B9F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default Dashboard;
