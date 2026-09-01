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
  Modal,
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
  ChevronRight,
  Clock,
  X,
  ShieldCheck,
  LogOut,
  MessageSquare,
  Menu,
} from 'lucide-react-native';
import { getCompanies, getUserProfile, getPendingInvitations } from '../../../services/api';

const TraderDashboard = ({ onNavigate, routeData }) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companies, setCompanies] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(routeData?.user || null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = React.useState(0);

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

        // Fetch pending invitations count for notification badge
        try {
          const invRes = await getPendingInvitations(token);
          if (invRes && invRes.success && Array.isArray(invRes.data)) {
            setUnreadNotifCount(invRes.data.length);
          }
        } catch (ie) {
          console.warn('Failed to fetch pending invitations count:', ie);
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
      value: (recentDeals && Array.isArray(recentDeals)) ? recentDeals.filter(d => d.status === 'Active' || d.status === 'Approved').length.toString() : '0',
      icon: <TrendingUp size={16} color="#059669" />,
      trend: 'Live',
      accent: '#059669',
      bg: '#ECFDF5',
    },
    {
      label: 'Pending Approval',
      value: (recentDeals && Array.isArray(recentDeals)) ? recentDeals.filter(d => d.status === 'Pending').length.toString() : '0',
      icon: <Clock size={16} color="#D97706" />,
      trend: 'Queue',
      accent: '#D97706',
      bg: '#FFFBEB',
    },
    {
      label: 'My Companies',
      value: (companies && Array.isArray(companies)) ? companies.length.toString() : '0',
      icon: <Building2 size={16} color="#2563EB" />,
      trend: 'Verified',
      accent: '#2563EB',
      bg: '#EFF6FF',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A56DB" />

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

        {/* ─── ROYAL BLUE HERO HEADER ─── */}
        <View style={styles.heroSection}>
          {/* Decorative circles in bg */}
          <View style={styles.heroBgCircle1} />
          <View style={styles.heroBgCircle2} />
          <View style={styles.heroBgCircle3} />

          {/* Top Bar */}
          <View style={styles.topBar}>
            {/* Left: Brand Logo */}
            <View style={styles.brandContainer}>
              <Image
                source={require('../../../images/logo/new_logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>

            {/* Right: 3-Line Menu Icon (Opens Side Drawer Slider) */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setIsDrawerOpen(true)}
              activeOpacity={0.75}>
              <Menu size={22} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {/* Welcome Banner */}
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
              <Plus size={14} color="#1A56DB" />
              <Text style={styles.registerPromptText}>Add Your Business Company</Text>
            </TouchableOpacity>
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
                        <Text style={styles.rowName} numberOfLines={1}>{company.name}</Text>
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>OWNER</Text>
                        </View>
                      </View>
                      <Text style={styles.rowIndustry} numberOfLines={1}>
                        {typeof company.industry === 'object' ? company.industry.name : company.industry || 'General'}
                      </Text>
                    </View>

                    {/* Right: Badge & Chevron */}
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
                        <ChevronRight size={14} color="#94A3B8" />
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
                  <Plus size={14} color="#4F46E5" />
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

      {/* ─── LEFT SIDE DRAWER / SLIDER MODAL ─── */}
      <Modal
        visible={isDrawerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          {/* Backdrop (Tapping closes drawer) */}
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container (Left 80% width) */}
          <View style={styles.drawerContainer}>
            {/* Drawer Header (Royal Blue - Ultra Attractive Centered Profile Header) */}
            <View style={styles.drawerHeader}>
              {/* Glowing Background Elements */}
              <View style={styles.drawerHeaderGlow1} />
              <View style={styles.drawerHeaderGlow2} />

              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setIsDrawerOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.drawerHeaderCenterContent}>
                <View style={styles.drawerAvatarWrapper}>
                  <TouchableOpacity
                    style={styles.drawerAvatarCircle}
                    onPress={() => { setIsDrawerOpen(false); onNavigate('Profile'); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.drawerAvatarText}>
                      {userName.trim().charAt(0).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.drawerAvatarCheckBadge}>
                    <ShieldCheck size={12} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.drawerUserName} numberOfLines={1}>{userName}</Text>
                <Text style={styles.drawerUserPhone} numberOfLines={1}>
                  {currentUser?.mobileNumber || currentUser?.phone || 'Trader Account'}
                </Text>

                <View style={styles.drawerHeaderBadgeRow}>
                  <View style={styles.drawerRolePill}>
                    <View style={styles.drawerActiveDot} />
                    <Text style={styles.drawerRoleText}>{userRole.toUpperCase()} • VERIFIED</Text>
                  </View>
                </View>

                {/* Header Mini Quick Stats Bar */}
                <View style={styles.drawerQuickStatsRow}>
                  <View style={styles.drawerQuickStatCol}>
                    <Text style={styles.drawerQuickStatVal}>{companies.length}</Text>
                    <Text style={styles.drawerQuickStatLabel}>Company</Text>
                  </View>
                  <View style={styles.drawerQuickStatDivider} />
                  <View style={styles.drawerQuickStatCol}>
                    <Text style={styles.drawerQuickStatVal}>
                      {companies.reduce((sum, c) => sum + (c.recentDeals?.length || c.deals || 0), 0)}
                    </Text>
                    <Text style={styles.drawerQuickStatLabel}>Saudas</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Drawer Items List */}
            <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionTitle}>MAIN MENU</Text>

              {[
                { label: 'Profile Details', icon: User, screen: 'Profile', color: '#1A56DB' },
                { label: 'My Companies', icon: Building2, screen: 'MyCompanies', color: '#10B981', badge: companies.length },
                { label: 'Sauda', icon: Handshake, screen: 'DealsList', color: '#8B5CF6' },
                { label: 'Notifications', icon: Bell, screen: 'Notifications', color: '#F59E0B', badge: unreadNotifCount > 0 ? unreadNotifCount : undefined },
                { label: 'Add New Company', icon: Plus, screen: 'AddCompany', color: '#1A56DB' },
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.drawerMenuItem}
                    activeOpacity={0.75}
                    onPress={() => {
                      setIsDrawerOpen(false);
                      onNavigate(item.screen);
                    }}
                  >
                    <View style={[styles.drawerMenuIconBg, { backgroundColor: item.color + '15' }]}>
                      <ItemIcon size={18} color={item.color} />
                    </View>
                    <Text style={styles.drawerMenuLabel}>{item.label}</Text>
                    {item.badge !== undefined && (
                      <View style={styles.drawerBadgePill}>
                        <Text style={styles.drawerBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <ChevronRight size={16} color="#94A3B8" />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.drawerDivider} />

              <Text style={styles.drawerSectionTitle}>ACCOUNT & VERIFICATION</Text>

              <View style={styles.drawerInfoRow}>
                <ShieldCheck size={16} color="#10B981" />
                <Text style={styles.drawerInfoText}>Status: Verified Trader</Text>
              </View>

              <TouchableOpacity
                style={styles.drawerLogoutBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  setIsDrawerOpen(false);
                  try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.removeItem('userToken');
                    await AsyncStorage.removeItem('user_completed_profile');
                  } catch (e) { }
                  onNavigate('Login');
                }}
              >
                <LogOut size={16} color="#EF4444" />
                <Text style={styles.drawerLogoutText}>Log Out Session</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Drawer Footer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerVersionText}>Pravisti Trade Ledger • v1.0.0</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ─────────────── PAYTM STYLES ─────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep Obsidian Dark
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* ── Hero Section ── */
  heroSection: {
    // Royal Blue gradient-feel hero
    backgroundColor: '#1A56DB',
    paddingBottom: 28,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBgCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -60,
  },
  heroBgCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -40,
    left: -40,
  },
  heroBgCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: 60,
    left: 80,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 18 : 14,
    paddingBottom: 18,
    marginVertical: 4,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 130,
    height: 38,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#1A56DB',
  },
  notifBadgePill: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1A56DB',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  /* Welcome Banner */
  welcomeBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    marginTop: 8,
  },
  nameAndRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },
  welcomeUserCol: {
    flex: 1,
    marginRight: 10,
  },
  welcomeHelloText: {
    color: '#f8fbffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  userNameStylish: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
    marginTop: 2,
    flex: 1,
  },
  premiumRoleBadge: {
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'center',
  },
  premiumRoleText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  registerPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 46,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  registerPromptText: {
    color: '#1A56DB',
    fontSize: 13,
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
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  addCompanyRowIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCompanyRowBtnText: {
    color: '#4F46E5',
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

  /* ─── RIGHT SIDE DRAWER STYLES ─── */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerContainer: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  drawerHeader: {
    backgroundColor: '#1A56DB',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 26 : 44,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  drawerHeaderGlow1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -50,
    right: -40,
  },
  drawerHeaderGlow2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -30,
    left: -30,
  },
  drawerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 36,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  drawerHeaderCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  drawerAvatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  drawerAvatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  drawerAvatarCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1A56DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerUserName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  drawerUserPhone: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  drawerHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  drawerActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  drawerRoleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  drawerQuickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    justifyContent: 'space-around',
  },
  drawerQuickStatCol: {
    alignItems: 'center',
  },
  drawerQuickStatVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  drawerQuickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  drawerQuickStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  drawerBody: {
    flex: 1,
    padding: 16,
  },
  drawerSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerMenuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerMenuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  drawerBadgePill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  drawerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A56DB',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  drawerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  drawerInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 6,
  },
  drawerLogoutText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  drawerVersionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

const Dashboard = TraderDashboard;

export { TraderDashboard };
export default Dashboard;
