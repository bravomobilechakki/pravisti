import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';

const DealDetails = ({ onNavigate, routeData }) => {

  const deal = routeData?.deal || {
    id: '1',
    product: 'Wheat',
    qty: '100kg',
    price: '₹2500',
    dealDate: '26 Mar 2024',
    validityDate: '30 Mar 2024',
    party1: 'qqqqq Traders',
    party2: 'oooo Traders',
    broker: 'aaaaa Broker',
    status: routeData?.status || 'Expired',
    image: null,
  };

  const isExpired = deal.status === 'Expired';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 🖼️ HERO IMAGE */}
      <View style={styles.heroContainer}>
        <Image
          source={
            deal.image
              ? deal.image
              : {
                uri: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc',
              }
          }
          style={styles.heroImage}
        />

        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>{deal.product}</Text>
          <Text style={styles.heroSubtitle}>Deal #{deal.id}</Text>
        </View>

        <TouchableOpacity
          style={styles.heroBackBtn}
          onPress={() => onNavigate('DealsList')}
        >
          <Text style={{ fontSize: 20 }}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 📊 STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{deal.price}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{deal.qty}</Text>
            <Text style={styles.statLabel}>Quantity</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValueSmall}>{deal.dealDate}</Text>
            <Text style={styles.statLabel}>Date</Text>
          </View>
        </View>

        {/* 👥 PARTIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trade Parties</Text>

          <View style={styles.partyCard}>
            <Text style={styles.partyLabel}>Seller</Text>
            <Text style={styles.partyName}>{deal.party1}</Text>
          </View>

          <View style={styles.partyCard}>
            <Text style={styles.partyLabel}>Buyer</Text>
            <Text style={styles.partyName}>{deal.party2}</Text>
          </View>

          <View style={styles.brokerCard}>
            <Text style={styles.brokerText}>
              Broker: <Text style={{ fontWeight: '800' }}>{deal.broker}</Text>
            </Text>
          </View>
        </View>

        {/* 📅 TIMELINE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>

          <View style={styles.timelineItem}>
            <Text style={styles.timelineDate}>{deal.dealDate}</Text>
            <Text style={styles.timelineText}>Deal Created</Text>
          </View>

          <View style={styles.timelineItem}>
            <Text style={styles.timelineDate}>{deal.validityDate}</Text>
            <Text style={styles.timelineText}>
              {isExpired ? 'Expired' : 'Valid Till'}
            </Text>
          </View>
        </View>

        {/* ⚡ ACTION BUTTON */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            isExpired
              ? onNavigate('CreateDeal', { prefill: deal })
              : onNavigate('DealChat')
          }
        >
          <Text style={styles.primaryText}>
            {isExpired ? 'Recreate Deal' : 'Open Chat'}
          </Text>
        </TouchableOpacity>

        {/* EXTRA ACTIONS */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.smallBtn}>
            <Text>📤 Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBtn}>
            <Text>📄 PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBtn}>
            <Text>✏️ Edit</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default DealDetails;

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* HERO */
  heroContainer: {
    height: 200,
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },

  heroSubtitle: {
    color: '#E2E8F0',
    fontSize: 12,
  },

  heroBackBtn: {
    position: 'absolute',
    top: 40,
    left: 16,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* STATS */
  statsRow: {
    flexDirection: 'row',
    margin: 16,
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },

  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  statValueSmall: {
    fontSize: 12,
    fontWeight: '700',
  },

  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },

  /* SECTION */
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },

  /* PARTY */
  partyCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },

  partyLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },

  partyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  brokerCard: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
  },

  brokerText: {
    color: '#DC2626',
    fontSize: 12,
  },

  /* TIMELINE */
  timelineItem: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },

  timelineDate: {
    fontWeight: '800',
  },

  timelineText: {
    fontSize: 12,
    color: '#64748B',
  },

  /* BUTTON */
  primaryBtn: {
    backgroundColor: '#3B82F6',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  primaryText: {
    color: '#fff',
    fontWeight: '800',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },

  smallBtn: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    elevation: 2,
  },

});