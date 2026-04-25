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
} from 'react-native';

import d1 from '../../images/d1.jpeg';

const Dashboard = ({ onNavigate }) => {
  const { width } = useWindowDimensions();
  const [hasCompany, setHasCompany] = React.useState(true);

  const registeredCompanies = [
    {
      id: 1,
      name: 'Mahansh Traders Pvt Ltd',
      gst: '27AABCU9603R1ZM',
      contact: 'Rajesh Mahansh',
      mobile: '+91 98765 43210',
      email: 'rajesh@mahanshtraders.com',
      address: 'Plot 42, MIDC Industrial Area, Nagpur, Maharashtra - 440016',
      status: 'Active',
      deals: 12,
      icon: '🌾',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 2,
      name: 'Sunrise Agro Exports',
      gst: '24AADCS7856R1ZP',
      contact: 'Vikram Patel',
      mobile: '+91 87654 32109',
      email: 'vikram@sunriseagro.in',
      address: 'GIDC Estate, Phase-2, Ahmedabad, Gujarat - 380015',
      status: 'Active',
      deals: 8,
      icon: '☀️',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      id: 3,
      name: 'Bharat Commodities LLP',
      gst: '19AABCB4521K1ZX',
      contact: 'Anil Sharma',
      mobile: '+91 76543 21098',
      email: 'anil@bharatcommodities.co.in',
      address: 'Salt Lake, Sector-V, Kolkata, West Bengal - 700091',
      status: 'Active',
      deals: 5,
      icon: '📦',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
  ];

  const recentDeals = [
    {
      id: 1,
      title: 'Basmati Rice (Grade A)',
      broker: 'Mahansh Traders • 200 Tons',
      price: '₹14.2L',
      status: 'CONFIRMED',
      statusColor: '#10B981',
      bgColor: '#ECFDF5',
      icon: '🚜',
    },
    {
      id: 2,
      title: 'Yellow Maize (Feed)',
      broker: 'Sunrise Agro • 150 Tons',
      price: '₹8.5L',
      status: 'PENDING',
      statusColor: '#F59E0B',
      bgColor: '#FFFBEB',
      icon: '🌽',
    },
    {
      id: 3,
      title: 'Chana Dal (Premium)',
      broker: 'Bharat Commodities • 100 Tons',
      price: '₹6.8L',
      status: 'CONFIRMED',
      statusColor: '#10B981',
      bgColor: '#ECFDF5',
      icon: '🫘',
    },
  ];

  const themeColor = '#3170cdff';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonCircle}
          onPress={() => onNavigate('Login')}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
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
          style={styles.profileButton}
          onPress={() => onNavigate('Profile')}
        >
          <Text style={{ fontSize: 18, color: '#FFFFFF' }}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
                style={styles.emptyButton}
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
            {/* Hero Banner Section */}
            <TouchableOpacity
              style={styles.heroContainer}
              activeOpacity={0.95}
              onPress={() => onNavigate('DealsList')}
            >
              <ImageBackground
                source={d1}
                style={styles.heroImage}
                imageStyle={{ borderRadius: 24 }}
              >
                <View style={styles.heroOverlay}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>TRENDING</Text>
                  </View>
                  <Text style={styles.heroTitle}>Start Your Business</Text>
                  <Text style={styles.heroSubtitle}>
                    Manage your business portfolio & sauda deals with Pravisti's intelligent interface.
                  </Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>

            {/* Quick Actions */}


            {/* My Companies Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.stylishTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitleStylish}>My Registered Companies</Text>
              </View>
              <TouchableOpacity
                style={styles.premiumAddButton}
                onPress={() => onNavigate('AddCompany')}
                activeOpacity={0.8}
              >
                <Text style={styles.premiumAddButtonIcon}>＋</Text>
                <Text style={styles.premiumAddButtonText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {registeredCompanies.map((company, index) => (
              <TouchableOpacity
                key={company.id}
                style={[
                  styles.companyCard,
                  index === registeredCompanies.length - 1 && {
                    marginBottom: 0,
                  },
                ]}
                onPress={() => onNavigate('CompanyDetails', { company })}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.companyAvatar,
                    { backgroundColor: company.bgColor },
                  ]}
                >
                  <Text style={styles.companyAvatarText}>{company.icon}</Text>
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.companyName} numberOfLines={1}>
                    {company.name}
                  </Text>
                  <Text style={styles.companyMeta}>
                    {company.contact} · {company.deals} deals
                  </Text>
                </View>
                <View style={styles.companyRight}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: company.color },
                    ]}
                  />
                  <Text style={styles.companyArrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Recent Sauda Activity Section */}
            <View style={styles.sectionHeader1}>
              <View style={styles.stylishTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitleStylish}>Recent Sauda Activity</Text>
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
    paddingVertical: 14,
    marginTop: 30,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8ECF0',
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  backButtonIcon: {
    fontSize: 24,
    color: '#1A1D1F',
    fontWeight: '300',
    marginTop: -2,
    marginLeft: -2,
  },
  navLogoImage: {
    width: 100,
    height: 40,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6e7e9ff',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#0284C7',
    borderRadius: 2,
  },
  sectionTitleStylish: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C4A6E',
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
    backgroundColor: '#0284C7',
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
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#3170cdff',
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
  /* Hero Banner Styles */
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
    padding: 20,
    backgroundColor: 'rgba(12, 74, 110, 0.4)', // Deep blue-tinted overlay
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroBadge: {
    backgroundColor: '#3170cdff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
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
