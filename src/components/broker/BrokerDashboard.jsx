import React, { useState, useEffect } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
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
  UserMinus,
} from 'lucide-react-native';
import { getCompanies, getUserProfile, getBrokerMyDeals, getDeals, searchCounterpartyUser } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrokerProfile from './profile/BrokerProfile';
import { fontSize, moderateScale, scale, SCREEN_WIDTH } from '../../utils/responsive';

const width = SCREEN_WIDTH;

const THEME = '#2327D8';
const THEME_HOVER = '#1B1FA7';
const DARK_NAVY = '#1E1C38';
const BG_COLOR = '#F4F6FB';

const BrokerDashboard = ({ onNavigate, routeData }) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companies, setCompanies] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(routeData?.user || null);
  const [brokerDeals, setBrokerDeals] = React.useState([]);
  const [isProfileSliderOpen, setIsProfileSliderOpen] = React.useState(false);

  const slideAnim = React.useRef(new Animated.Value(width)).current;

  const openProfileDrawer = () => {
    onNavigate('BrokerProfile', { user: currentUser || routeData?.user, role: 'Broker' });
  };

  const closeProfileDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 240,
      useNativeDriver: true,
    }).start(() => {
      setIsProfileSliderOpen(false);
    });
  };

  const fetchDashboardData = async () => {
    let fetchedDeals = [];
    try {
      const storedCompStr = await AsyncStorage.getItem('broker_companies_cache');
      if (storedCompStr) {
        try {
          const cachedComps = JSON.parse(storedCompStr);
          if (Array.isArray(cachedComps) && cachedComps.length > 0) {
            setCompanies(cachedComps);
          }
        } catch (e) { }
      }

      const token = await AsyncStorage.getItem('userToken');

      const [compRes, userRes, brokerDealsRes, dealsRes] = await Promise.allSettled([
        getCompanies(1, 20),
        token ? getUserProfile(token) : Promise.resolve(null),
        token ? getBrokerMyDeals(token) : Promise.resolve(null),
        token ? getDeals(token, 1, 20) : Promise.resolve(null),
      ]);

      if (compRes.status === 'fulfilled' && compRes.value?.success) {
        const freshCompanies = compRes.value.data?.companies || [];
        setCompanies(freshCompanies);
        await AsyncStorage.setItem('broker_companies_cache', JSON.stringify(freshCompanies));
      }

      if (userRes.status === 'fulfilled' && userRes.value?.success) {
        const storedProfile = await AsyncStorage.getItem('user_completed_profile');
        let mergedProfile = { ...userRes.value.data };
        if (storedProfile) {
          try {
            const parsed = JSON.parse(storedProfile);
            mergedProfile = {
              ...userRes.value.data,
              name: parsed.name !== undefined ? parsed.name : userRes.value.data.name,
              email: parsed.email !== undefined ? parsed.email : userRes.value.data.email,
              company: parsed.company !== undefined ? parsed.company : userRes.value.data.company,
              gstin: parsed.gstin !== undefined ? parsed.gstin : userRes.value.data.gstin,
              address: parsed.address !== undefined ? parsed.address : userRes.value.data.address,
              role: 'Broker',
            };
          } catch (e) {
            mergedProfile = { ...userRes.value.data, role: 'Broker' };
          }
        } else {
          mergedProfile = { ...userRes.value.data, role: 'Broker' };
        }
        setCurrentUser(mergedProfile);
        await AsyncStorage.setItem('user_completed_profile', JSON.stringify(mergedProfile));
      }

      if (brokerDealsRes.status === 'fulfilled' && brokerDealsRes.value?.success) {
        const brokerRes = brokerDealsRes.value;
        const rawList = Array.isArray(brokerRes.data)
          ? brokerRes.data
          : (brokerRes.data?.deals || brokerRes.data?.myDeals || []);

        const mapped = rawList.map(d => ({
          id: d.dealNumber || d._id,
          crop: d.products?.[0]?.productName || d.cropName || d.crop || 'Agricultural Commodity',
          quantity: d.products?.[0]?.quantity ? `${d.products[0].quantity}` : (d.quantity ? String(d.quantity).replace(/ units/gi, '') : '100'),
          rate: d.products?.[0]?.price ? `₹${parseFloat(d.products[0].price).toLocaleString('en-IN')}` : (d.rate || '₹60,000'),
          buyer: d.buyerCompany?.name || d.buyerCompany?.companyName || d.buyerName || d.buyer || 'Buyer Business',
          seller: d.sellerCompany?.name || d.sellerCompany?.companyName || d.sellerName || d.seller || 'Seller Business',
          status: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1)) : 'Confirmed',
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
          commission: d.totalAmount ? `₹${(d.totalAmount * 0.01).toFixed(0)}` : '₹10,000',
        }));
        fetchedDeals = [...mapped];
      }

      if (dealsRes.status === 'fulfilled' && dealsRes.value?.success) {
        const res = dealsRes.value;
        const rawDeals = Array.isArray(res.data) ? res.data : (res.data?.deals || []);
        const apiMapped = rawDeals.map(d => ({
          id: d.dealNumber || d._id,
          crop: d.products?.[0]?.productName || d.cropName || d.crop || 'Agricultural Commodity',
          quantity: d.products?.[0]?.quantity ? `${d.products[0].quantity}` : (d.quantity ? String(d.quantity).replace(/ units/gi, '') : '100'),
          rate: d.products?.[0]?.price ? `₹${parseFloat(d.products[0].price).toLocaleString('en-IN')}` : '₹60,000',
          buyer: d.buyerCompany?.name || d.buyerCompany?.companyName || 'Buyer Business',
          seller: d.sellerCompany?.name || d.sellerCompany?.companyName || 'Seller Business',
          status: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1)) : 'Confirmed',
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
          commission: d.totalAmount ? `₹${(d.totalAmount * 0.01).toFixed(0)}` : '₹10,000',
        }));

        apiMapped.forEach(item => {
          if (!fetchedDeals.some(f => f.id === item.id || f._id === item.id)) {
            fetchedDeals.push(item);
          }
        });
      }

      const combined = [];
      fetchedDeals.forEach(fD => {
        if (!combined.some(c => (c.id === fD.id || c._id === fD.id || c._id === fD._id))) {
          combined.push(fD);
        }
      });

      setBrokerDeals(combined);
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
  }, [routeData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const userName = currentUser?.name || routeData?.user?.name || 'Broker Partner';

  const totalDealsList = brokerDeals;

  const pendingSaudasCount = totalDealsList.filter(d => {
    const st = String(d.status || '').toLowerCase();
    return st.includes('pending');
  }).length;

  const totalSaudasCount = totalDealsList.length;
  const activeSaudasCount = totalSaudasCount;

  const roleTheme = {
    bg: 'rgba(35, 39, 216, 0.15)',
    border: THEME,
    text: '#C7D2FE',
    label: '⚡ LICENSED BROKER',
  };

  const quickActions = [
    {
      id: 'deals',
      label: 'Saudas',
      icon: <Handshake size={22} color="#FFFFFF" />,
      circleBg: THEME,
      onPress: () => onNavigate('BrokerCreatedDeals', { user: routeData?.user }),
    },
    {
      id: 'chat',
      label: 'Messages',
      icon: <Users size={22} color="#FFFFFF" />,
      circleBg: THEME_HOVER,
      onPress: () => onNavigate('ChatList', { user: routeData?.user }),
    },
    {
      id: 'broker_company',
      label: 'Add Company',
      icon: <Building2 size={22} color="#FFFFFF" />,
      circleBg: THEME,
      onPress: () => onNavigate('BrokerAddCompany', { user: routeData?.user }),
    },
    {
      id: 'profile',
      label: 'View Profile',
      icon: <User size={22} color="#FFFFFF" />,
      circleBg: THEME_HOVER,
      onPress: openProfileDrawer,
    },
  ];

  const statCards = [
    {
      label: 'Active Saudas',
      value: activeSaudasCount.toString(),
      icon: <TrendingUp size={16} color={THEME} />,
      trend: `${totalSaudasCount} Total`,
      accent: THEME,
      bg: '#EEF2FE',
    },
    {
      label: 'Pending Saudas',
      value: pendingSaudasCount.toString(),
      icon: <Clock size={16} color="#D97706" />,
      trend: 'Queue',
      accent: '#D97706',
      bg: '#FEF3C7',
    },
    {
      label: 'Linked Firms',
      value: companies.length.toString(),
      icon: <Building2 size={16} color={THEME} />,
      trend: 'Verified',
      accent: THEME,
      bg: '#EEF2FE',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* ─── FIXED TOP HEADER ─── */}
      <View style={styles.heroSection}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.glassActionBtn}
            onPress={() => onNavigate('ChatList')}
            activeOpacity={0.75}>
            <Bell size={20} color="#FFFFFF" />
            <View style={styles.notifRoseDot} />
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <Image
              source={require('../../images/logo/new_logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.avatarGlassBtn}
              onPress={openProfileDrawer}
              activeOpacity={0.75}>
              <Text style={styles.avatarText}>
                {userName.trim().charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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

            <View style={styles.emeraldSyncBadge}>
              <ShieldCheck size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.emeraldSyncBadgeText}>BROKER PARTNER</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── SCROLLABLE BODY ─── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME]}
            tintColor={THEME}
          />
        }>

        {/* ─── ULTRA-MODERN 3D GLOWING CARD BUTTON ─── */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.heroAddCompanyCard}
            onPress={() => onNavigate('BrokerAddCompany', { user: routeData?.user })}
            activeOpacity={0.85}
          >
            {/* Left Dark Icon Circle */}
            <View style={styles.heroAddIconDisk}>
              <Building2 size={20} color="#FFFFFF" />
              <View style={styles.heroAddPlusDot}>
                <Plus size={10} color="#FFFFFF" strokeWidth={3.5} />
              </View>
            </View>

            {/* Middle Title & Subtitle */}
            <View style={styles.heroAddTextBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.heroAddTitle}>Add Brokerage Company</Text>
                <View style={styles.heroApmcTag}>
                  <Text style={styles.heroApmcTagText}>APMC</Text>
                </View>
              </View>
              <Text style={styles.heroAddSub}>Register your company</Text>
            </View>

            {/* Right Action Pill */}
            <View style={styles.heroAddPillBtn}>
              <Text style={styles.heroAddPillText}>+ Add</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── REGISTERED BROKERAGE COMPANIES ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Registered Brokerage Companies</Text>
          </View>

          {companies.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCompanyCard}
              onPress={() => onNavigate('BrokerAddCompany')}
              activeOpacity={0.85}
            >
              <Building2 size={24} color={THEME} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyCompanyTitle}>Link Your Brokerage Company</Text>
              <Text style={styles.emptyCompanySub}>
                Add your APMC registered company to issue official trade contracts.
              </Text>
            </TouchableOpacity>
          ) : (
            companies.map((firm, idx) => (
              <TouchableOpacity
                key={firm._id || firm.id || idx}
                style={styles.firmCard}
                activeOpacity={0.85}
                onPress={() => onNavigate('BrokerCompanyDetails', { company: firm, companyId: firm._id || firm.id, role: 'Broker', user: currentUser })}
              >
                <View style={styles.firmHeaderRow}>
                  <View style={styles.firmIconCircle}>
                    <Building2 size={18} color={THEME} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.firmName}>{firm.name || firm.companyName}</Text>
                    <Text style={styles.firmSubText}>
                      {firm.firmType || firm.companyType || 'Registered Brokerage'} {firm.city ? `• ${firm.city}` : ''}
                    </Text>
                  </View>
                  <View style={styles.verifiedFirmBadge}>
                    <ShieldCheck size={12} color={THEME} style={{ marginRight: 4 }} />
                    <Text style={styles.verifiedFirmText}>Verified APMC</Text>
                  </View>
                </View>

                {(firm.apmcLicense || firm.commissionRate) && (
                  <View style={styles.firmDetailsRow}>
                    {firm.apmcLicense ? (
                      <Text style={styles.firmDetailItem}>License: {firm.apmcLicense}</Text>
                    ) : null}
                    {firm.commissionRate ? (
                      <Text style={styles.firmDetailItem}>Rate: {firm.commissionRate}% Commission</Text>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Broker Deals</Text>
            <TouchableOpacity onPress={() => onNavigate('BrokerCreatedDeals')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

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
    backgroundColor: BG_COLOR,
  },
  rightSliderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rightSliderBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  rightSliderContainer: {
    width: '90%',
    height: '100%',
    backgroundColor: BG_COLOR,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  heroSection: {
    backgroundColor: THEME,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
    paddingBottom: 24,
    marginBottom: 20,
    marginTop: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlowTopRight: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(35, 39, 216, 0.25)',
  },
  ambientGlowBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(27, 31, 167, 0.22)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
  },
  glassActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifRoseDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
    borderWidth: 1.5,
    borderColor: THEME,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandLogo: {
    width: 130,
    height: 38,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emeraldSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(35, 39, 216, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(35, 39, 216, 0.35)',
  },
  emeraldSyncBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C7D2FE',
    letterSpacing: 0.4,
  },
  welcomeBanner: {
    marginTop: 4,
  },
  welcomeHelloText: {
    fontSize: 13,
    color: '#A5B4FC',
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
    fontWeight: '900',
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
    color: THEME,
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
    color: THEME,
  },
  // ULTRA-MODERN 3D GLOWING CARD BUTTON
  heroAddCompanyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: THEME_HOVER,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroAddIconDisk: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: DARK_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#4338CA',
  },
  heroAddPlusDot: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME,
  },
  heroAddTextBox: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  heroAddTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroApmcTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroApmcTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroAddSub: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  heroAddPillBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroAddPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME,
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
    borderColor: '#EEF2FE',
    elevation: 3,
    shadowColor: THEME,
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
    borderColor: '#EEF2FE',
    elevation: 3,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  createDealIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME,
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
  // ─── REGISTERED FIRM STYLES ───
  firmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  firmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  firmIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  firmName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  firmSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  verifiedFirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedFirmText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME,
  },
  firmDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  firmDetailItem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  emptyCompanyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME,
    borderStyle: 'dashed',
  },
  emptyCompanyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME,
  },
  emptyCompanySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default BrokerDashboard;
