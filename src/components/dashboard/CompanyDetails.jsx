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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Hero Card */}
        <View style={styles.heroCard}>
          <View
            style={[
              styles.heroIconCircle,
              { backgroundColor: company.bgColor },
            ]}
          >
            <Text style={styles.heroIcon}>{company.icon}</Text>
          </View>
          <Text style={styles.heroName}>{company.name}</Text>
          <View
            style={[styles.statusPill, { backgroundColor: company.bgColor }]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: company.color }]}
            />
            <Text style={[styles.statusText, { color: company.color }]}>
              {company.status}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{company.deals}</Text>
            <Text style={styles.statLabel}>Total Deals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹2.4Cr</Text>
            <Text style={styles.statLabel}>Trade Volume</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Company Information */}
        <Text style={styles.sectionTitle}>Company Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>🏢</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Company Name</Text>
              <Text style={styles.infoValue}>{company.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>📋</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>GST Number</Text>
              <Text style={styles.infoValue}>{company.gst}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>👤</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contact Person</Text>
              <Text style={styles.infoValue}>{company.contact}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>📞</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoValue}>{company.mobile}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>✉️</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{company.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>📍</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Office Address</Text>
              <Text style={styles.infoValue}>{company.address}</Text>
            </View>
          </View>
        </View>

        {/* Recent Deals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Deals</Text>
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
                      deal.type === 'Buy' ? '#ECFDF5' : '#FEF2F2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dealTypeText,
                    { color: deal.type === 'Buy' ? '#10B981' : '#EF4444' },
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

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => onNavigate('CreateDeal')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionIcon}>🤝</Text>
          <Text style={styles.primaryActionText}>Create New Sauda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.8}>
          <Text style={styles.secondaryActionIcon}>✎</Text>
          <Text style={styles.secondaryActionText}>Edit Company Details</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
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
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  editButton: {
    padding: 8,
    marginRight: -8,
  },
  editIcon: {
    fontSize: 18,
    color: '#3170cdff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIcon: {
    fontSize: 32,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: '#3170cdff',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 6,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 60,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  dealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dealTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dealPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  primaryAction: {
    backgroundColor: '#3170cdff',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionIcon: {
    fontSize: 18,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryActionIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  secondaryActionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CompanyDetails;
