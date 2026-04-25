import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const CompanyDetails = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = React.useState('my_sauda');
  const company = routeData?.company || {
    name: 'Unknown Company',
    gst: 'N/A',
    contact: 'N/A',
    mobile: 'N/A',
    email: 'N/A',
    address: 'N/A',
    status: 'Active',
    deals: 0,
    icon: '🏢',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  };

  const themeColor = '#0284C7';
  const themeBg = '#F0F9FF';
  const themeSoftBorder = '#E0F2FE';

  const recentDeals = [
    {
      id: 1,
      title: 'Basmati Rice (Grade A)',
      type: 'Buy',
      tons: '200 T',
      price: '₹14.2L',
      date: '25 Mar 2026',
    },
    {
      id: 2,
      title: 'Yellow Maize (Feed)',
      type: 'Sell',
      tons: '150 T',
      price: '₹8.5L',
      date: '22 Mar 2026',
    },
    {
      id: 3,
      title: 'Wheat (Sharbati)',
      type: 'Buy',
      tons: '300 T',
      price: '₹21.0L',
      date: '18 Mar 2026',
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
        <Text style={styles.headerTitle}>Company Details</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      {/* Small Action Buttons at Top */}
      <View style={styles.smallButtonsRow}>
        <TouchableOpacity
          style={[styles.smallButton, activeTab === 'my_sauda' && styles.activeSmallButton]}
          onPress={() => setActiveTab('my_sauda')}
          activeOpacity={0.8}
        >
          <Text style={styles.smallButtonIcon}>{activeTab === 'my_sauda' ? '📁' : '📂'}</Text>
          <Text style={[styles.smallButtonText, activeTab === 'my_sauda' && styles.activeSmallButtonText]}>My Sauda</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallButton, activeTab === 'create_sauda' && styles.activeSmallButton]}
          onPress={() => setActiveTab('create_sauda')}
          activeOpacity={0.8}
        >
          <Text style={styles.smallButtonIcon}>➕</Text>
          <Text style={[styles.smallButtonText, activeTab === 'create_sauda' && styles.activeSmallButtonText]}>Create Sauda</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Soft Blue Hero Section */}
        <View style={styles.softHeroContainer}>
          <View style={styles.softHeroHeader}>
            <View style={[styles.softAvatar, { backgroundColor: company.bgColor }]}>
              <Text style={styles.softAvatarText}>{company.icon}</Text>
            </View>
            <View style={styles.softHeroInfo}>
              <Text style={styles.softHeroName} numberOfLines={2}>{company.name}</Text>
              <View style={styles.softStatusBadge}>
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.softStatusText}>{company.status}</Text>
              </View>
            </View>
          </View>

          {/* Activity Banner */}
          <View style={styles.activityBanner}>
            <Text style={styles.activityIcon}>⚡</Text>
            <Text style={styles.activityText}>
              <Text style={styles.activityValue}>{company.deals}</Text> Active deals in progress
            </Text>
          </View>
        </View>

        {activeTab === 'my_sauda' ? (
          <>
            {/* My Sauda History Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <TouchableOpacity onPress={() => onNavigate('DealsList')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentDeals.map(deal => (
              <TouchableOpacity
                key={deal.id}
                style={styles.dealCard}
                onPress={() => onNavigate('DealDetails')}
                activeOpacity={0.7}
              >
                <View style={styles.dealHeader}>
                  <Text style={styles.dealTitle} numberOfLines={1}>
                    {deal.title}
                  </Text>
                  <View
                    style={[
                      styles.dealTypeBadge,
                      {
                        backgroundColor:
                          deal.type === 'Buy' ? '#F0FDF4' : '#FEF2F2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dealTypeText,
                        { color: deal.type === 'Buy' ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {deal.type}
                    </Text>
                  </View>
                </View>
                <View style={styles.dealFooter}>
                  <Text style={styles.dealMeta}>
                    {deal.tons} • {deal.date}
                  </Text>
                  <Text style={styles.dealPrice}>{deal.price}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Company Identity Info */}
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Company Verification</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Text style={styles.infoIcon}>🏢</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Reg. Name</Text>
                    <Text style={styles.infoValue}>{company.name}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Text style={styles.infoIcon}>👤</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Primary Contact</Text>
                    <Text style={styles.infoValue}>{company.contact}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Text style={styles.infoIcon}>📞</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Verified Mobile</Text>
                    <Text style={styles.infoValue}>{company.mobile}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Edit */}
            <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.8}>
              <Text style={styles.secondaryActionIcon}>📝</Text>
              <Text style={styles.secondaryActionText}>Update Company Profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.createSaudaContent}>
            <View style={styles.createHeroCard}>
              <View style={styles.createHeroIconWrap}>
                <Text style={styles.createHeroIcon}>🤝</Text>
              </View>
              <Text style={styles.createHeroTitle}>New Sauda Transaction</Text>
              <Text style={styles.createHeroSub}>
                Initialize a secure buy/sell agreement with {company.name}. Fill in the deal details to notify all parties.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => onNavigate('CreateDeal')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionIcon}>+</Text>
              <Text style={styles.primaryActionText}>Create New Sauda</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => onNavigate('CreateDeal')}
        activeOpacity={0.9}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbfeffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#0369A1',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  editButton: {
    padding: 8,
    marginRight: -8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C4A6E',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#7DD3FC',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#0C4A6E',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F9FF',
    marginLeft: 60,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F9FF',
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  dealTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dealTypeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dealPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284C7',
  },
  primaryAction: {
    backgroundColor: '#0284C7',
    borderRadius: 18,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryActionIcon: {
    fontSize: 20,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 18,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  secondaryActionIcon: {
    fontSize: 18,
    color: '#0284C7',
  },
  secondaryActionText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '700',
  },
  /* Create Sauda Tab */
  createSaudaContent: {
    paddingVertical: 10,
  },
  createHeroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0F2FE',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  createHeroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  createHeroIcon: {
    fontSize: 30,
  },
  createHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0C4A6E',
    marginBottom: 8,
  },
  createHeroSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  quickFormPlaceholder: {
    marginTop: 10,
  },
  quickFormTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7DD3FC',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  quickOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  quickOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  /* Small Action Buttons Styling */
  smallButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flex: 1,
    gap: 8,
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  activeSmallButton: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
    shadowOpacity: 0.2,
  },
  smallButtonIcon: {
    fontSize: 14,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  activeSmallButtonText: {
    color: '#FFFFFF',
  },
  softHeroContainer: {
    backgroundColor: 'rgba(125, 195, 199, 0.9)',
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  softHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  softAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  softAvatarText: {
    fontSize: 30,
  },
  softHeroInfo: {
    flex: 1,
  },
  softHeroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0C4A6E',
    marginBottom: 6,
  },
  softStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  softStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
  },
  activityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 10,
    gap: 12,
  },
  activityIcon: {
    fontSize: 18,
  },
  activityText: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '600',
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0284C7',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '300',
    marginTop: -2,
  },
});

export default CompanyDetails;
