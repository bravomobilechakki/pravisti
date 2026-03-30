import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

const DealDetails = ({ onNavigate, routeData }) => {
  const { height } = useWindowDimensions();
  // Mock data for the demonstration
  const deal = routeData?.deal || {
    id: '1',
    product: 'Wheat',
    qty: '100kg',
    price: '₹2500',
    dealDate: '26 Mar 2024',
    validityDate: '30 Mar 2024',
    party1: 'ABC Traders',
    party2: 'XYZ Traders',
    broker: 'PQR Broker',
    status: routeData?.status || 'Expired', // Default to Expired for demo of recreate feature
    image: require('../../images/login.png'),
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('DealsList')}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Deal Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Product Image */}
        <View style={[styles.imageContainer, { height: height * 0.35 }]}>
          <Image source={deal.image} style={styles.productImage} resizeMode="cover" />
          <View style={[styles.statusLabel, deal.status === 'Expired' && { backgroundColor: '#EF4444' }]}>
            <Text style={styles.statusText}>{deal.status}</Text>
          </View>
        </View>

        {/* Content Card */}
        <View style={styles.detailsCard}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.productLabel}>Product</Text>
              <Text style={styles.productTitle}>{deal.product}</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
               <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Quantity</Text>
              <Text style={styles.statValue}>{deal.qty}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={styles.statValue}>{deal.price}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Deal Date</Text>
                <Text style={styles.infoValue}>📅 {deal.dealDate}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Valid Till</Text>
                <Text style={styles.infoValue}>⏳ {deal.validityDate}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionHeader}>Involved Companies</Text>
          
          <View style={styles.partyItem}>
            <View style={styles.partyIconContainer}>
              <Text style={styles.partyIcon}>🏢</Text>
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyRole}>Party 1 (Seller)</Text>
              <Text style={styles.partyName}>{deal.party1}</Text>
            </View>
          </View>

          <View style={styles.partyItem}>
            <View style={[styles.partyIconContainer, { backgroundColor: '#F0F9FF' }]}>
              <Text style={styles.partyIcon}>🛒</Text>
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyRole}>Party 2 (Buyer)</Text>
              <Text style={styles.partyName}>{deal.party2}</Text>
            </View>
          </View>

          <View style={styles.partyItem}>
            <View style={[styles.partyIconContainer, { backgroundColor: '#FDF2F8' }]}>
              <Text style={styles.partyIcon}>🤝</Text>
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyRole}>Broker</Text>
              <Text style={styles.partyName}>{deal.broker}</Text>
            </View>
          </View>

          {deal.status === 'Expired' ? (
            /* SRS 10.3: Recreate Deal from Expired Sauda */
            <TouchableOpacity 
              style={[styles.chatButton, { backgroundColor: '#F59E0B' }]}
              activeOpacity={0.8}
              onPress={() => onNavigate('CreateDeal', { prefill: deal })}
            >
              <Text style={styles.chatIcon}>🔄</Text>
              <Text style={styles.chatButtonText}>Recreate Deal</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.chatButton}
              activeOpacity={0.8}
              onPress={() => onNavigate('DealChat')}
            >
              <Text style={styles.chatIcon}>💬</Text>
              <Text style={styles.chatButtonText}>Open Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#E2E8F0',
    marginBottom: -40,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  statusLabel: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#3170cdff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    minHeight: 600,
    shadowColor: '#3170CD',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  productLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3170cdff',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#F8FAFC',
    marginHorizontal: -24,
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  partyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  partyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partyIcon: {
    fontSize: 24,
  },
  partyInfo: {
    flex: 1,
  },
  partyRole: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: '#3170cdff',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  chatIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default DealDetails;
