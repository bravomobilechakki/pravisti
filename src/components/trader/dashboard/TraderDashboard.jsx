import React, { useState, useEffect, useCallback } from 'react';
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
  User,
  ChevronRight,
  X,
  ShieldCheck,
  LogOut,
  PackageCheck,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCompanies,
  getUserProfile,
  getPendingInvitations,
  getDeals,
  resolveImageUrl,
} from '../../../services/api';

// Solid Login Page Theme Colors
const THEME = '#2327D8';
const BG_COLOR = '#F4F6FB';

const CompanyLogoAvatar = ({
  logo,
  name,
  size = 44,
  radius = 22,
  textColor = THEME,
  bgColor = '#EEF2FF',
  borderColor = '#C7D2FE',
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '??';

  const rawLogo = logo || '';
  const uri = rawLogo && !imageError ? resolveImageUrl(rawLogo) : null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1.2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Text
          style={{
            fontSize: Math.max(12, Math.floor(size * 0.36)),
            fontWeight: '800',
            color: textColor,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
};

const TraderDashboard = ({ onNavigate, routeData }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [companyDealCounts, setCompanyDealCounts] = useState({});
  const [totalDealsCount, setTotalDealsCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(routeData?.user || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [userImgError, setUserImgError] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const requests = [getCompanies(1, 30)];
      if (token) {
        requests.push(getUserProfile(token));
        requests.push(getPendingInvitations(token));
      }

      const results = await Promise.allSettled(requests);

      // 1. Companies Response
      let fetchedCompanies = [];
      const compRes = results[0];
      if (compRes?.status === 'fulfilled' && compRes.value?.success) {
        fetchedCompanies = compRes.value.data?.companies || [];
        setCompanies(fetchedCompanies);
        AsyncStorage.setItem('trader_companies_cache', JSON.stringify(fetchedCompanies)).catch(() => {});
      }

      // 2. Profile Response
      if (results[1]?.status === 'fulfilled' && results[1].value?.success) {
        const userRes = results[1].value;
        const storedProfile = await AsyncStorage.getItem('user_completed_profile');
        let mergedProfile = { ...userRes.data };
        if (storedProfile) {
          try {
            const parsed = JSON.parse(storedProfile);
            mergedProfile = { ...userRes.data, ...parsed };
          } catch (e) {}
        }
        setCurrentUser(mergedProfile);
        AsyncStorage.setItem('user_completed_profile', JSON.stringify(mergedProfile)).catch(() => {});
      }

      // 3. Unread Notifications Count
      if (results[2]?.status === 'fulfilled' && results[2].value?.success) {
        const invData = results[2].value.data;
        if (Array.isArray(invData)) {
          setUnreadNotifCount(invData.length);
        }
      }

      // 4. Fetch Sauda Counts for Each Company (Same logic and API as CompanyDetails.jsx)
      if (token && fetchedCompanies.length > 0) {
        const countsMap = {};
        let allUserDeals = [];

        // Fetch general user deals (same as CompanyDetails: getDeals(token, 1, 50))
        try {
          const generalRes = await getDeals(token, 1, 50);
          if (generalRes && generalRes.success) {
            allUserDeals = generalRes.data?.deals || (Array.isArray(generalRes.data) ? generalRes.data : []);
          }
        } catch (e) {
          console.warn('General deals fetch notice in dashboard:', e);
        }

        const isDealForThisCompany = (deal, id, compName) => {
          const tId = String(id || '');
          const sellerCid = String(deal.sellerCompanyId?._id || deal.sellerCompanyId?.id || deal.sellerCompanyId || '');
          const buyerCid = String(deal.buyerCompanyId?._id || deal.buyerCompanyId?.id || deal.buyerCompanyId || '');
          const brokerCid = String(deal.brokerCompanyId?._id || deal.brokerCompanyId?.id || deal.brokerCompanyId || '');
          const p1Cid = String(deal.party1?.companyId?._id || deal.party1?.companyId || deal.party1?.company?._id || deal.party1?.company?.id || '');
          const p2Cid = String(deal.party2?.companyId?._id || deal.party2?.companyId || deal.party2?.company?._id || deal.party2?.company?.id || '');
          const creatorCid = String(deal.creatorCompanyId?._id || deal.creatorCompanyId?.id || deal.creatorCompanyId || '');
          const targetCid = String(deal.targetCompanyId?._id || deal.targetCompanyId?.id || deal.targetCompanyId || '');
          const directCid = String(deal.companyId?._id || deal.companyId?.id || deal.companyId || '');

          const idMatches = (
            sellerCid === tId ||
            buyerCid === tId ||
            brokerCid === tId ||
            p1Cid === tId ||
            p2Cid === tId ||
            creatorCid === tId ||
            targetCid === tId ||
            directCid === tId
          );

          if (idMatches) return true;

          // Also check by company name (as used in CompanyDetails)
          const targetName = (compName || '').trim().toLowerCase();
          if (targetName) {
            const sName = String(deal.sellerCompany?.name || deal.sellerCompanyId?.companyName || deal.sellerCompanyId?.name || '').trim().toLowerCase();
            const bName = String(deal.buyerCompany?.name || deal.buyerCompanyId?.companyName || deal.buyerCompanyId?.name || '').trim().toLowerCase();
            const p1Name = String(deal.party1?.company?.name || deal.party1?.name || '').trim().toLowerCase();
            const p2Name = String(deal.party2?.company?.name || deal.party2?.name || '').trim().toLowerCase();
            const dName = String(deal.companyName || deal.company?.name || '').trim().toLowerCase();
            if (sName === targetName || bName === targetName || p1Name === targetName || p2Name === targetName || dName === targetName) {
              return true;
            }
          }
          return false;
        };

        const dealRequests = fetchedCompanies.map(async (comp) => {
          const compId = comp._id || comp.id;
          if (!compId) return;
          const compName = comp.name || comp.companyName || '';

          // Check local company deals cache first (populated by CompanyDetails)
          try {
            const localCached = await AsyncStorage.getItem(`company_deals_cache_${compId}`);
            if (localCached) {
              const parsed = JSON.parse(localCached);
              if (Array.isArray(parsed)) {
                countsMap[compId] = parsed.length;
              }
            }
          } catch (e) {}

          let allDeals = [];

          try {
            // Exactly matching CompanyDetails.jsx: getDeals(token, 1, 50, id)
            const activeRes = await getDeals(token, 1, 50, compId);
            if (activeRes && activeRes.success) {
              const d = activeRes.data?.deals || (Array.isArray(activeRes.data) ? activeRes.data : []);
              allDeals = Array.isArray(d) ? [...d] : [];
            }
          } catch (dealErr) {
            console.warn(`Failed deals fetch for company ${compId}:`, dealErr?.message || dealErr);
          }

          // Combine with general deals and deduplicate by deal ID (exact same as CompanyDetails.jsx)
          const seen = new Set(allDeals.map((d) => String(d._id || d.id)));
          allUserDeals.forEach((d) => {
            const did = String(d._id || d.id);
            if (did && !seen.has(did)) {
              seen.add(did);
              allDeals.push(d);
            }
          });

          // Filter exactly as CompanyDetails.jsx does
          const filtered = allDeals.filter((d) => isDealForThisCompany(d, compId, compName));

          countsMap[compId] = filtered.length;

          // Keep company_deals_cache in sync
          AsyncStorage.setItem(`company_deals_cache_${compId}`, JSON.stringify(filtered)).catch(() => {});
        });

        await Promise.allSettled(dealRequests);

        setCompanyDealCounts(countsMap);
        AsyncStorage.setItem('trader_company_deal_counts', JSON.stringify(countsMap)).catch(() => {});

        const totalAcrossCompanies = Object.values(countsMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
        setTotalDealsCount(totalAcrossCompanies);
      }
    } catch (error) {
      console.error('Error fetching trader dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Cached loading on mount
  useEffect(() => {
    let isMounted = true;
    const loadCachedData = async () => {
      try {
        const [storedProfile, storedCompanies, storedCounts] = await Promise.all([
          AsyncStorage.getItem('user_completed_profile'),
          AsyncStorage.getItem('trader_companies_cache'),
          AsyncStorage.getItem('trader_company_deal_counts'),
        ]);

        if (isMounted) {
          if (storedProfile) {
            try {
              setCurrentUser(JSON.parse(storedProfile));
            } catch (e) {}
          }
          if (storedCompanies) {
            try {
              const parsed = JSON.parse(storedCompanies);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCompanies(parsed);
                setIsLoading(false);
              }
            } catch (e) {}
          }

          if (storedCounts || storedCompanies) {
            try {
              let parsedCounts = {};
              if (storedCounts) {
                try {
                  parsedCounts = JSON.parse(storedCounts) || {};
                } catch (e) {}
              }

              // Also check individual company deals caches saved by CompanyDetails.jsx
              if (storedCompanies) {
                try {
                  const compList = JSON.parse(storedCompanies);
                  if (Array.isArray(compList)) {
                    for (const c of compList) {
                      const cid = c._id || c.id;
                      if (cid && parsedCounts[cid] === undefined) {
                        const localCache = await AsyncStorage.getItem(`company_deals_cache_${cid}`);
                        if (localCache) {
                          const parsedArr = JSON.parse(localCache);
                          if (Array.isArray(parsedArr)) {
                            parsedCounts[cid] = parsedArr.length;
                          }
                        }
                      }
                    }
                  }
                } catch (e) {}
              }

              setCompanyDealCounts(parsedCounts);
              const totalAcrossCompanies = Object.values(parsedCounts).reduce((sum, val) => sum + (Number(val) || 0), 0);
              setTotalDealsCount(totalAcrossCompanies);
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn('Failed to load cached dashboard data:', e);
      }
    };

    loadCachedData();
    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [routeData?.refresh, routeData?.company, routeData?.updatedAt, routeData?.timestamp]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
  }, []);

  const userName = currentUser?.name || routeData?.user?.name || 'Trader';
  const userRole =
    routeData?.role ||
    currentUser?.userType ||
    routeData?.user?.userType ||
    currentUser?.roles?.[0] ||
    'Trader';

  const userLogoUri =
    currentUser?.profilePicture ||
    currentUser?.avatar ||
    currentUser?.logo ||
    currentUser?.image ||
    currentUser?.photo ||
    currentUser?.profileImage ||
    routeData?.user?.profilePicture;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      <View style={styles.mainWrapper}>
        {/* ─── FIXED TOP SECTION (HEADER + REGISTER COMPANY BUTTON) ─── */}
        <View style={styles.heroSection}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            {/* Left: Notifications Icon */}
            <TouchableOpacity
              style={styles.topBarActionBtn}
              onPress={() => onNavigate('Notifications', { user: currentUser || routeData?.user })}
              activeOpacity={0.8}
            >
              <Bell size={20} color="#FFFFFF" />
              {unreadNotifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Center: Brand Logo */}
            <View style={styles.brandContainer}>
              <Image
                source={require('../../../images/new_logo_pravisti.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>

            {/* Right: User Avatar / Drawer Trigger */}
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => setIsDrawerOpen(true)}
              activeOpacity={0.8}
            >
              {userLogoUri && !userImgError ? (
                <Image
                  source={{ uri: resolveImageUrl(userLogoUri) }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                  onError={() => setUserImgError(true)}
                />
              ) : (
                <View style={styles.avatarInitialsCircle}>
                  <Text style={styles.avatarInitialsText}>
                    {userName ? userName.trim().charAt(0).toUpperCase() : 'T'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Welcome User Banner */}
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeGreeting}>Welcome back,</Text>
                <Text style={styles.welcomeUserName} numberOfLines={1}>
                  {userName}
                </Text>
              </View>

              <View style={styles.traderVerifiedBadge}>
                <ShieldCheck size={12} color="#FDE68A" />
                <Text style={styles.traderVerifiedBadgeText}>VERIFIED TRADER</Text>
              </View>
            </View>
          </View>

          {/* ─── FIXED REGISTER COMPANY BUTTON (WITH RICH COLOR) ─── */}
          <View style={styles.createCompanyBannerWrapper}>
            <TouchableOpacity
              style={styles.createCompanyBannerCard}
              onPress={() => onNavigate('AddCompany', { user: currentUser || routeData?.user })}
              activeOpacity={0.88}
            >
              {/* Mascot 3D Character Graphic Container */}
              <View style={styles.createCompanyMascotWrapper}>
                <Image
                  source={require('../../../images/createdeal.png')}
                  style={styles.createCompanyMascotImg}
                  resizeMode="contain"
                />
              </View>

              {/* Middle Title & Subtitle */}
              <View style={styles.createCompanyTextContainer}>
                <View style={styles.createCompanyTagRow}>
                  <View style={styles.createCompanyTag}>
                    <Text style={styles.createCompanyTagText}>⚡ COMPANY ONBOARDING</Text>
                  </View>
                </View>
                <Text style={styles.createCompanyBannerTitle}>Register Company</Text>
                <Text style={styles.createCompanyBannerSubtitle}>
                  Add your company details to trade commodities & create Saudas
                </Text>
              </View>

              {/* Right Plus Action Box */}
              <View style={styles.createCompanyPlusBtnBox}>
                <Plus size={20} color="#FFFFFF" strokeWidth={3} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SCROLLABLE BODY ─── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME]}
              tintColor={THEME}
            />
          }
        >
          {/* ─── BODY CONTENT ─── */}
          <View style={styles.bodyContent}>
            {/* ─── MY REGISTERED COMPANIES (WITH SAUDA COUNT) ─── */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Building2 size={16} color={THEME} />
                <Text style={styles.sectionTitle}>My Companies</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{companies.length}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => onNavigate('CreateDeal', { user: currentUser || routeData?.user })}
                activeOpacity={0.8}
              >
                <Handshake size={13} color={THEME} />
                <Text style={styles.addBtnText}>+ New Sauda</Text>
              </TouchableOpacity>
            </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={THEME} style={{ marginVertical: 20 }} />
          ) : companies.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => onNavigate('AddCompany', { user: currentUser })}
              activeOpacity={0.85}
            >
              <View style={styles.emptyIconCircle}>
                <Building2 size={28} color={THEME} />
              </View>
              <Text style={styles.emptyTitle}>No Company Linked Yet</Text>
              <Text style={styles.emptySubtitle}>
                Link or register your trading company to create formal Saudas, manage commodities, and issue contracts.
              </Text>
              <View style={styles.emptyBtn}>
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Link Company</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.companyListContainer}>
              {companies.map((company, index) => {
                const compId = company._id || company.id;
                const saudaCount = companyDealCounts[compId] ?? 0;
                const isActive = company.status === 'active' || company.status === 'Active';
                const companyLogo =
                  company.logo ||
                  company.logoUrl ||
                  company.image ||
                  company.companyLogo ||
                  company.avatar;

                return (
                  <TouchableOpacity
                    key={compId || index}
                    style={styles.companyCard}
                    onPress={() =>
                      onNavigate('CompanyDetails', {
                        company,
                        companyId: compId,
                        user: currentUser,
                      })
                    }
                    activeOpacity={0.82}
                  >
                    {/* Left: Avatar */}
                    <CompanyLogoAvatar
                      logo={companyLogo}
                      name={company.name}
                      size={44}
                      radius={22}
                    />

                    {/* Middle: Details & Sauda Count Badge */}
                    <View style={styles.companyMiddleCol}>
                      {/* Name & Owner Pill */}
                      <View style={styles.companyNameRow}>
                        <Text style={styles.companyNameText} numberOfLines={1}>
                          {company.name || company.companyName || 'Company Name'}
                        </Text>
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>OWNER</Text>
                        </View>
                      </View>

                      {/* Sauda Count & Industry Row */}
                      <View style={styles.companyMetaRow}>
                        {/* Live Sauda count for this exact company */}
                        <View style={styles.saudaCountBadge}>
                          <Handshake size={11} color={THEME} />
                          <Text style={styles.saudaCountBadgeText}>
                            {saudaCount} {saudaCount === 1 ? 'Sauda' : 'Saudas'}
                          </Text>
                        </View>

                        <Text style={styles.companyIndustryText} numberOfLines={1}>
                          • {typeof company.industry === 'object' ? company.industry.name : company.industry || 'General Trade'}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Status & Chevron */}
                    <View style={styles.companyRightCol}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isActive ? '#ECFDF5' : '#FFFBEB' },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: isActive ? '#10B981' : '#F59E0B' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: isActive ? '#059669' : '#D97706' },
                          ]}
                        >
                          {isActive ? 'Active' : 'Pending'}
                        </Text>
                      </View>
                      <ChevronRight size={16} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Add New Company CTA Button */}
              <TouchableOpacity
                style={styles.addCompanyRowBtn}
                onPress={() => onNavigate('AddCompany', { user: currentUser })}
                activeOpacity={0.78}
              >
                <View style={styles.addCompanyRowIconCircle}>
                  <Plus size={14} color={THEME} />
                </View>
                <Text style={styles.addCompanyRowBtnText}>Link Another Company</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
      </View>

      {/* ─── SIDE DRAWER / SLIDER MODAL ─── */}
      <Modal
        visible={isDrawerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Body (Left/Slide container) */}
          <View style={styles.drawerContainer}>
            {/* Drawer Header (Solid Login Theme Color) */}
            <View style={styles.drawerHeader}>

              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setIsDrawerOpen(false)}
                activeOpacity={0.75}
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.drawerHeaderContent}>
                <TouchableOpacity
                  style={styles.drawerAvatarWrapper}
                  onPress={() => {
                    setIsDrawerOpen(false);
                    onNavigate('Profile');
                  }}
                  activeOpacity={0.85}
                >
                  {userLogoUri && !userImgError ? (
                    <Image
                      source={{ uri: resolveImageUrl(userLogoUri) }}
                      style={{ width: '100%', height: '100%', borderRadius: 34 }}
                      resizeMode="cover"
                      onError={() => setUserImgError(true)}
                    />
                  ) : (
                    <Text style={styles.drawerAvatarText}>
                      {userName.trim().charAt(0).toUpperCase()}
                    </Text>
                  )}
                  <View style={styles.drawerCheckBadge}>
                    <ShieldCheck size={11} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <Text style={styles.drawerUserName} numberOfLines={1}>
                  {userName}
                </Text>
                <Text style={styles.drawerUserPhone} numberOfLines={1}>
                  {currentUser?.mobileNumber || currentUser?.phone || 'Trader Account'}
                </Text>

                <View style={styles.drawerRolePill}>
                  <View style={styles.drawerActiveDot} />
                  <Text style={styles.drawerRoleText}>{userRole.toUpperCase()} • VERIFIED</Text>
                </View>

                {/* Drawer Quick Metrics Bar */}
                <View style={styles.drawerStatsBar}>
                  <View style={styles.drawerStatCol}>
                    <Text style={styles.drawerStatVal}>{companies.length}</Text>
                    <Text style={styles.drawerStatLabel}>Companies</Text>
                  </View>
                  <View style={styles.drawerStatDivider} />
                  <View style={styles.drawerStatCol}>
                    <Text style={styles.drawerStatVal}>{totalDealsCount}</Text>
                    <Text style={styles.drawerStatLabel}>Saudas</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Drawer Menu Items */}
            <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionHeader}>QUICK NAVIGATION</Text>

              {[
                { label: 'Profile Details', icon: User, screen: 'Profile', color: THEME },
                {
                  label: 'My Companies',
                  icon: Building2,
                  screen: 'MyCompanies',
                  color: '#059669',
                  badge: companies.length,
                },
                {
                  label: 'Sauda Ledger',
                  icon: Handshake,
                  screen: 'DealsList',
                  color: '#7C3AED',
                  badge: totalDealsCount,
                },
                {
                  label: 'Product Catalog',
                  icon: PackageCheck,
                  screen: 'CategoryPage',
                  color: '#0284C7',
                },
                {
                  label: 'Notifications',
                  icon: Bell,
                  screen: 'Notifications',
                  color: '#D97706',
                  badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
                },
                {
                  label: 'Add New Company',
                  icon: Plus,
                  screen: 'AddCompany',
                  color: THEME,
                },
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.drawerMenuItem}
                    activeOpacity={0.72}
                    onPress={() => {
                      setIsDrawerOpen(false);
                      onNavigate(item.screen, { user: currentUser });
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
                    <ChevronRight size={15} color="#94A3B8" />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.drawerDivider} />

              <View style={styles.drawerVerifiedCard}>
                <ShieldCheck size={16} color="#059669" />
                <Text style={styles.drawerVerifiedCardText}>
                  Verified Trader Account • Ready for Bilateral Sauda
                </Text>
              </View>

              <TouchableOpacity
                style={styles.drawerLogoutBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  setIsDrawerOpen(false);
                  try {
                    await AsyncStorage.removeItem('userToken');
                    await AsyncStorage.removeItem('user_completed_profile');
                  } catch (e) {}
                  onNavigate('Login');
                }}
              >
                <LogOut size={16} color="#EF4444" />
                <Text style={styles.drawerLogoutText}>Log Out Session</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Pravisti B2B Trading • v1.0.3</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ────────────── STYLES ────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME, // Single Pure Royal Blue (#2327D8)
  },
  mainWrapper: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 40,
  },

  /* ─── Fixed Top Section (Header + Register Company Button) ─── */
  heroSection: {
    backgroundColor: THEME, // Single Pure Royal Blue (#2327D8)
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 10,
  },
  topBarActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 4.5,
    paddingVertical: 1.5,
    minWidth: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  brandContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 135,
    height: 40,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarInitialsCircle: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Welcome Banner */
  welcomeBanner: {
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  welcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeGreeting: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11.5,
    fontWeight: '600',
  },
  welcomeUserName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 1,
    letterSpacing: -0.2,
  },
  traderVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  traderVerifiedBadgeText: {
    color: '#FDE68A',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* ─── FIXED REGISTER COMPANY BANNER CARD (WITH COLOR) ─── */
  createCompanyBannerWrapper: {
    marginTop: 2,
  },
  createCompanyBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FF', // Soft luminous light blue tint
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE', // Bright sky-blue border accent
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  createCompanyMascotWrapper: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#DBEAFE', // Soft vibrant blue circle disk
    borderWidth: 1.2,
    borderColor: '#93C5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  createCompanyMascotImg: {
    width: 44,
    height: 44,
  },
  createCompanyTextContainer: {
    flex: 1,
    paddingRight: 6,
  },
  createCompanyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  createCompanyTag: {
    backgroundColor: THEME,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  createCompanyTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  createCompanyBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  createCompanyBannerSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 14,
  },
  createCompanyPlusBtnBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },

  /* ─── Body Content ─── */
  bodyContent: {
    paddingHorizontal: 16,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    color: THEME,
    fontSize: 11,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addBtnText: {
    color: THEME,
    fontSize: 11,
    fontWeight: '700',
  },

  /* ─── Company Card List ─── */
  companyListContainer: {
    marginBottom: 10,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  companyMiddleCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  companyNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  ownerBadgeText: {
    color: '#B45309',
    fontSize: 8.5,
    fontWeight: '800',
  },
  companyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saudaCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saudaCountBadgeText: {
    color: THEME,
    fontSize: 10,
    fontWeight: '800',
  },
  companyIndustryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  companyRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  addCompanyRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  addCompanyRowIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCompanyRowBtnText: {
    color: THEME,
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Empty Company State */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ─── Side Drawer ─── */
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
    width: '82%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  drawerHeader: {
    backgroundColor: THEME, // Pure Solid Login Theme Color
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 44,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  drawerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 16 : 38,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  drawerHeaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  drawerAvatarWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  drawerCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: THEME,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerUserName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  drawerUserPhone: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  drawerRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 12,
  },
  drawerActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  drawerRoleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  drawerStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    justifyContent: 'space-around',
  },
  drawerStatCol: {
    alignItems: 'center',
  },
  drawerStatVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  drawerStatLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  drawerStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  drawerBody: {
    flex: 1,
    padding: 16,
  },
  drawerSectionHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 3,
  },
  drawerMenuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  drawerMenuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  drawerBadgePill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
    marginRight: 6,
  },
  drawerBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  drawerVerifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  drawerVerifiedCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    flex: 1,
    lineHeight: 15,
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 4,
  },
  drawerLogoutText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  drawerFooterText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

const Dashboard = TraderDashboard;

export { TraderDashboard };
export default Dashboard;
