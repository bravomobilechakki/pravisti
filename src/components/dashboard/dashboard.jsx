import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  useWindowDimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { getCompanies } from '../../services/api';

// import d1 from '../../images/d1.jpeg'; // Removed for dynamic banner

const Dashboard = ({ onNavigate, routeData }) => {
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [companies, setCompanies] = React.useState([]);

  const fetchDashboardData = async () => {
    try {
      const response = await getCompanies(1, 20);
      if (response && response.success) {
        setCompanies(response.data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const role = routeData?.role || 'Broker';
  const industryColor = routeData?.industryColor;
  const recentDeals = routeData?.user?.recentDeals || [];
  const hasCompany = companies.length > 0 || isLoading;

  // Dynamic Theme Selection
  const getTheme = (userRole, customColor) => {
    // If a custom industry color is provided, use it as the base
    if (customColor) {
      return {
        primary: customColor,
        secondary: customColor,
        accent: `${customColor}15`, // Very light version
        text: '#1e293b',
        muted: customColor,
        heroOverlay: `${customColor}80`, // Semi-transparent
      };
    }

    if (userRole === 'Trader') {
      return {
        primary: '#059669', // Emerald/Green for Trader
        secondary: '#10b981',
        accent: '#ecfdf5',
        text: '#064e3b',
        muted: '#34d399',
        heroOverlay: 'rgba(6, 78, 59, 0.4)',
      };
    }
    // Default Broker Theme (Blue)
    return {
      primary: '#3170cdff',
      secondary: '#0284c7',
      accent: '#f0f9ff',
      text: '#0c4a6e',
      muted: '#7dd3fc',
      heroOverlay: 'rgba(12, 74, 110, 0.4)',
    };
  };

  const theme = getTheme(role, industryColor);
  const industryName = routeData?.industry || 'General Business';

  const getBannerImage = (name) => {
    switch (name) {
      case 'Agriculture & Agro': return require('../../images/agri/agri.jpeg');
      case 'Textiles & Apparel': return require('../../images/textlies/All Bedding.jpeg');
      case 'Electronics & Tech': return require('../../images/tech/elec.jpeg');
      case 'Construction': return require('../../images/constructions/construction.jpeg');
      default: return require('../../images/d1.jpeg');
    }
  };

  const bannerImage = getBannerImage(industryName);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onNavigate('Profile')}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18, color: theme.primary }}>🔔</Text>
          <View style={styles.notificationDot} />
        </TouchableOpacity>

        <Image
          source={require('../../images/trader1.png')}
          style={[
            styles.navLogoImage,
            { width: width * 0.3, height: (width * 0.3) / 2.5 },
          ]}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
          onPress={() => onNavigate('Profile')}
          activeOpacity={0.75}
        >
          <Text style={styles.profileText}>
            {routeData?.user?.name ? routeData.user.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.primary]} 
            tintColor={theme.primary}
          />
        }
      >
        {!hasCompany ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>🏢</Text>
              </View>
              <Text style={styles.emptyTitle}>Company Required</Text>
              <Text style={styles.emptySubtitle}>
                According to Pravisti rules, you must add at least one company
                before you can create Sauda deals.
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.primary }]}
                onPress={() => onNavigate('AddCompany')}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyButtonText}>
                  Register Your Company
                </Text>
                <Text style={styles.emptyButtonArrow}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Industry Portfolios Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.stylishTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
                <Text style={[styles.sectionTitleStylish, { color: theme.text }]}>Selected Portfolios</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.industryBannersScroll}
              contentContainerStyle={{ gap: 12 }}
            >
              {(routeData?.allIndustries ? routeData.allIndustries.split(', ') : [industryName]).map((name, idx) => {
                const img = getBannerImage(name);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.heroContainerSmall}
                    activeOpacity={0.9}
                  >
                    <ImageBackground
                      source={img}
                      style={[styles.heroImage, { width: '100%', height: '100%' }]}
                      imageStyle={{ borderRadius: 20 }}
                      resizeMode="cover"
                    >
                      <View style={[styles.heroOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                        <View style={[styles.heroBadge, { backgroundColor: theme.primary }]}>
                          <Text style={styles.heroBadgeText}>{name.toUpperCase()}</Text>
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Actions */}


            {/* My Companies Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.stylishTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
                <Text style={[styles.sectionTitleStylish, { color: theme.text }]}>My Registered Companies</Text>
              </View>
              <TouchableOpacity
                style={[styles.premiumAddButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                onPress={() => onNavigate('AddCompany')}
                activeOpacity={0.8}
              >
                <Text style={styles.premiumAddButtonIcon}>＋</Text>
                <Text style={styles.premiumAddButtonText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : (
              companies.map((company, index) => {
                // Deterministic icon/color based on index or ID if not provided by backend
                const displayIcon = company.icon || (company.type === 'trader' ? '💼' : '🏢');
                const displayColor = company.color || (index % 2 === 0 ? '#3b82f6' : '#10b981');
                const displayBg = company.bgColor || (index % 2 === 0 ? '#eff6ff' : '#ecfdf5');

                return (
                  <TouchableOpacity
                    key={company._id}
                    style={[
                      styles.companyCard,
                      index === companies.length - 1 && {
                        marginBottom: 0,
                      },
                    ]}
                    onPress={() => onNavigate('CompanyDetails', { company })}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.companyAvatar,
                        { backgroundColor: displayBg },
                      ]}
                    >
                      <Text style={styles.companyAvatarText}>{displayIcon}</Text>
                    </View>
                    <View style={styles.companyInfo}>
                      <Text style={styles.companyName} numberOfLines={1}>
                        {company.name}
                      </Text>
                      <Text style={styles.companyMeta}>
                        {company.phone || 'No contact'} · {company.industry || 'General'}
                      </Text>
                    </View>
                    <View style={styles.companyRight}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: company.status === 'active' ? '#10b981' : '#f59e0b' },
                        ]}
                      />
                      <Text style={styles.companyArrow}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Recent Sauda Activity Section */}
            <View style={styles.sectionHeader1}>
              <View style={styles.stylishTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: theme.primary }]} />
                <Text style={[styles.sectionTitleStylish, { color: theme.text }]}>Recent Sauda Activity</Text>
              </View>

            </View>

            {recentDeals.map((deal, index) => (
              <TouchableOpacity
                key={deal.id}
                style={[
                  styles.dealCard,
                  index === recentDeals.length - 1 && { marginBottom: 0 },
                ]}
                onPress={() => onNavigate('DealDetails')}
                activeOpacity={0.7}
              >
                <View style={styles.dealLeft}>
                  <Text style={styles.dealIcon}>{deal.icon}</Text>
                </View>
                <View style={styles.dealInfo}>
                  <Text style={styles.dealTitle}>{deal.title}</Text>
                  <Text style={styles.dealMeta}>{deal.broker}</Text>
                </View>
                <View style={styles.dealRight}>
                  <Text style={styles.dealPrice}>{deal.price}</Text>
                  <View
                    style={[
                      styles.dealStatusBadge,
                      { backgroundColor: deal.bgColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dealStatusText,
                        { color: deal.statusColor },
                      ]}
                    >
                      {deal.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: Platform.OS === 'android' ? 35 : 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#3170CD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  navLogoImage: {
    width: 100,
    height: 40,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,

  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
  },

  sectionHeader1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 26,

  },


  stylishTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionAccent: {
    width: 4,
    height: 21,
    backgroundColor: '#0284C7', // Fallback, but using inline
    borderRadius: 2,
  },
  sectionTitleStylish: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C4A6E', // Fallback
    letterSpacing: 0.3,
  },
  addNewText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '700',
  },
  premiumAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7', // Fallback, but using inline
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumAddButtonIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  premiumAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Quick Actions */
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'flex-start',
    borderWidth: 0.5,
    borderColor: '#ECEEF1',
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1F',
  },
  /* Tabs */
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    marginTop: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabItem: {
    // Optional active tab styling
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3170cdff',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 24,
    height: 3,
    backgroundColor: '#3170cdff',
    borderRadius: 1.5,
  },

  /* Company Cards */
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#ECEEF1',
  },
  companyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  companyAvatarText: {
    fontSize: 20,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1F',
    marginBottom: 3,
  },
  companyMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  companyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  companyArrow: {
    fontSize: 20,
    color: '#C5CAD0',
    fontWeight: '300',
  },

  /* Deal Cards */
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#ECEEF1',
  },
  dealLeft: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dealIcon: {
    fontSize: 18,
  },
  dealInfo: {
    flex: 1,
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1F',
    marginBottom: 3,
  },
  dealMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dealRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  dealPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1D1F',
  },
  dealStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dealStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Empty State */
  emptyStateContainer: {
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F9FF', // overridden by theme
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1F',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#0284C7', // overridden by theme
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyButtonArrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  /* Industry Banners Scroll */
  industryBannersScroll: {
    marginBottom: 26,
    marginHorizontal: -20,
    paddingLeft: 20,
  },
  heroContainerSmall: {
    height: 180,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginRight: 12,
  },
  heroContainer: {
    height: 180,
    width: '100%',
    marginBottom: 26,
    shadowColor: '#0C4A6E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroBadge: {
    backgroundColor: '#0284C7', // overridden by theme
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 0,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default Dashboard;
