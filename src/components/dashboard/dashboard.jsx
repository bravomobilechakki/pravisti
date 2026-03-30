import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';

const Dashboard = ({ onNavigate }) => {
  const { width } = useWindowDimensions();
  const [hasCompany, setHasCompany] = React.useState(true); // Demo: company exists

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('Login')}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Image
          source={require('../../images/trader1.png')}
          style={[
            styles.navLogoImage,
            { width: width * 0.35, height: (width * 0.35) / 2.3 },
          ]}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => onNavigate('Profile')}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasCompany ? (
          /* Onboarding / Empty State - Mandatory Company Registration (SRS 4.1) */
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
                <Text style={styles.emptyButtonIcon}>🏢</Text>
                <Text style={styles.emptyButtonText}>
                  Register Your Company
                </Text>
                <Text style={styles.emptyButtonArrow}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => onNavigate('AddCompany')}
                activeOpacity={0.7}
              >
                <View style={styles.actionCardIconBg}>
                  <Text style={styles.actionCardIcon}>🏢</Text>
                </View>
                <Text style={styles.actionCardTitle}>
                  Manage{'\n'}Companies
                </Text>
                <Text style={styles.actionCardSub}>3 registered</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => onNavigate('DealsList')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionCardIconBg,
                    { backgroundColor: '#ECFDF5' },
                  ]}
                >
                  <Text style={styles.actionCardIcon}>🤝</Text>
                </View>
                <Text style={styles.actionCardTitle}>My{'\n'}Saudas</Text>
                <Text style={styles.actionCardSub}>12 active</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => onNavigate('CreateDeal')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionCardIconBg,
                    { backgroundColor: '#FEF2F2' },
                  ]}
                >
                  <Text style={styles.actionCardIcon}>➕</Text>
                </View>
                <Text style={styles.actionCardTitle}>Create{'\n'}Deal</Text>
                <Text style={styles.actionCardSub}>new sauda</Text>
              </TouchableOpacity>
            </View>

            {/* My Companies */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Companies</Text>
              <TouchableOpacity onPress={() => onNavigate('AddCompany')}>
                <Text style={styles.viewAllText}>+ Add New</Text>
              </TouchableOpacity>
            </View>

            {registeredCompanies.map(company => (
              <TouchableOpacity
                key={company.id}
                style={styles.companyCard}
                onPress={() => onNavigate('CompanyDetails', { company })}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.companyIconContainer,
                    { backgroundColor: company.bgColor },
                  ]}
                >
                  <Text style={styles.companyIcon}>{company.icon}</Text>
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.companyName} numberOfLines={1}>
                    {company.name}
                  </Text>
                  <Text style={styles.companyContact}>
                    {company.contact} • {company.deals} Deals
                  </Text>
                </View>
                <View style={styles.companyStatusContainer}>
                  <View
                    style={[
                      styles.companyStatusBadge,
                      { backgroundColor: company.bgColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.companyStatusText,
                        { color: company.color },
                      ]}
                    >
                      {company.status}
                    </Text>
                  </View>
                  <Text style={styles.companyArrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activities</Text>
              <TouchableOpacity onPress={() => onNavigate('DealsList')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentDeals.map(deal => (
              <TouchableOpacity
                key={deal.id}
                style={styles.dealItem}
                onPress={() => onNavigate('DealDetails')}
              >
                <View style={styles.dealIconContainer}>
                  <Text style={styles.dealIcon}>{deal.icon}</Text>
                </View>
                <View style={styles.dealInfo}>
                  <Text style={styles.dealTitle}>{deal.title}</Text>
                  <Text style={styles.dealBroker}>{deal.broker}</Text>
                </View>
                <View style={styles.dealPriceContainer}>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 28,
    color: '#111827',
  },
  navLogoImage: {
    width: 100,
    height: 40,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  profileIcon: {
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100, // Space for tab bar
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statTrend: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextActive: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  commissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 32,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commissionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  commissionIcon: {
    fontSize: 16,
  },
  commissionValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  targetLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 12,
  },
  commissionProgressBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
  },
  commissionProgressFill: {
    width: '84%',
    height: '100%',
    backgroundColor: '#8CB6D3',
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCardIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardIcon: {
    fontSize: 20,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
    marginBottom: 6,
  },
  actionCardSub: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dealsList: {
    gap: 12,
  },
  dealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dealIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dealIcon: {
    fontSize: 20,
  },
  dealInfo: {
    flex: 1,
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  dealBroker: {
    fontSize: 12,
    color: '#6B7280',
  },
  dealPriceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dealPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  dealStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dealStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#3170cdff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonIcon: {
    fontSize: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  emptyButtonArrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontWeight: '600',
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  companyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyIcon: {
    fontSize: 22,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  companyContact: {
    fontSize: 12,
    color: '#6B7280',
  },
  companyStatusContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  companyStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  companyStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  companyArrow: {
    fontSize: 22,
    color: '#9CA3AF',
    fontWeight: '300',
  },
});

export default Dashboard;
