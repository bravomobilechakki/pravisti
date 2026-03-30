import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const MyCompanies = ({ onNavigate }) => {
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('Dashboard')}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Companies</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onNavigate('AddCompany')}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{registeredCompanies.length}</Text>
          <Text style={styles.statLabel}>Registered</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {registeredCompanies.filter(c => c.status === 'Active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {registeredCompanies.reduce((sum, c) => sum + c.deals, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Deals</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Company List */}
        {registeredCompanies.map(company => (
          <TouchableOpacity
            key={company.id}
            style={styles.companyCard}
            onPress={() => onNavigate('CompanyDetails', { company })}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: company.bgColor },
                ]}
              >
                <Text style={styles.companyIcon}>{company.icon}</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName} numberOfLines={1}>
                  {company.name}
                </Text>
                <Text style={styles.companyGst}>GST: {company.gst}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: company.bgColor },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: company.color }]}
                />
                <Text style={[styles.statusText, { color: company.color }]}>
                  {company.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>👤</Text>
                <Text style={styles.detailText}>{company.contact}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📞</Text>
                <Text style={styles.detailText}>{company.mobile}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText} numberOfLines={1}>
                  {company.address}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.dealBadge}>
                <Text style={styles.dealBadgeText}>{company.deals} Deals</Text>
              </View>
              <Text style={styles.viewDetails}>View Details →</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Add New Company Card */}
        <TouchableOpacity
          style={styles.addNewCard}
          onPress={() => onNavigate('AddCompany')}
          activeOpacity={0.7}
        >
          <View style={styles.addNewIconCircle}>
            <Text style={styles.addNewIcon}>+</Text>
          </View>
          <Text style={styles.addNewText}>Add New Company</Text>
          <Text style={styles.addNewSub}>
            Register a new company to start trading
          </Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('Dashboard')}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('DealsList')}
        >
          <Text style={styles.tabIcon}>💎</Text>
          <Text style={styles.tabLabel}>Saudas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.centerTabItem}
          onPress={() => onNavigate('CreateDeal')}
          activeOpacity={0.9}
        >
          <View style={styles.centerButton}>
            <Text style={styles.centerButtonIcon}>+</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('ChatList')}
        >
          <Text style={styles.tabIcon}>💬</Text>
          <Text style={styles.tabLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIconActive}>🏢</Text>
          <Text style={styles.tabLabelActive}>Companies</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3170cdff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyIcon: {
    fontSize: 24,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  companyGst: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
    marginLeft: 58,
  },
  cardBody: {
    marginLeft: 58,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 13,
    marginRight: 8,
    width: 18,
  },
  detailText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginLeft: 58,
  },
  dealBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dealBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3170cdff',
  },
  viewDetails: {
    fontSize: 12,
    color: '#3170cdff',
    fontWeight: '600',
  },
  addNewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    marginBottom: 14,
  },
  addNewIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addNewIcon: {
    fontSize: 28,
    color: '#3170cdff',
    fontWeight: '300',
  },
  addNewText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  addNewSub: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingBottom: 25,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 85,
  },
  centerTabItem: {
    top: -25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3170cdff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  centerButtonIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  tabIcon: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  tabIconActive: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  tabLabelActive: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});

export default MyCompanies;
