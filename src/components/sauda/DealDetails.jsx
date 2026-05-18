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
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDealDetails, updateDealStatus, recreateExpiredDeal } from '../../services/api';

const DealDetails = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = React.useState(!routeData?.deal);
  const [deal, setDeal] = React.useState(routeData?.deal || null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchDealDetails = async () => {
    const id = routeData?.dealId || routeData?.deal?._id;
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await getDealDetails(id, token);
      if (response && response.success) {
        setDeal(response.data);
      }
    } catch (error) {
      console.error('Error fetching deal details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDealDetails();
  }, []);

  const handleUpdateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const id = deal?._id || routeData?.dealId;
      const token = await AsyncStorage.getItem('userToken');
      const response = await updateDealStatus(id, newStatus, token);
      if (response && response.success) {
        Alert.alert('Success', `Deal status updated to ${newStatus}`);
        fetchDealDetails();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Deal not found</Text>
        <TouchableOpacity onPress={() => onNavigate('DealsList')}>
          <Text style={{ color: '#3B82F6', marginTop: 10 }}>Back to list</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isExpired = deal.status === 'expired';
  const isPending = deal.status === 'pending';
  const isActive = deal.status === 'active';

  const productName = deal.product?.name || deal.product || 'Unknown Product';
  const qty = deal.product?.quantity || deal.qty || 'N/A';
  const price = deal.product?.price || deal.price || 'N/A';
  const dealDateDisplay = deal.dealDate ? new Date(deal.dealDate).toLocaleDateString() : 'N/A';
  const validityDateDisplay = deal.validityDate ? new Date(deal.validityDate).toLocaleDateString() : 'N/A';

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
          <Text style={styles.heroTitle}>{productName}</Text>
          <Text style={styles.heroSubtitle}>Deal #{deal.dealNumber || deal._id?.slice(-6)}</Text>
        </View>

        <TouchableOpacity
          style={styles.heroBackBtn}
          onPress={() => onNavigate('pop')}
        >
          <Text style={{ fontSize: 20 }}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 📊 STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{price}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{qty}</Text>
            <Text style={styles.statLabel}>Quantity</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValueSmall}>{dealDateDisplay}</Text>
            <Text style={styles.statLabel}>Date</Text>
          </View>
        </View>

        {/* 👥 PARTIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trade Parties</Text>

          <View style={styles.partyCard}>
            <Text style={styles.partyLabel}>Seller</Text>
            <Text style={styles.partyName}>{deal.party1?.companyId?.name || deal.party1?.name || 'My Company'}</Text>
          </View>

          <View style={styles.partyCard}>
            <Text style={styles.partyLabel}>Buyer</Text>
            <Text style={styles.partyName}>{deal.party2?.companyId?.name || deal.party2?.name || 'Loading...'}</Text>
          </View>

          {deal.broker && (
            <View style={styles.brokerCard}>
              <Text style={styles.brokerText}>
                Broker: <Text style={{ fontWeight: '800' }}>{deal.broker?.name || 'N/A'}</Text>
              </Text>
            </View>
          )}
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

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => handleUpdateStatus('active')}
              disabled={isUpdating}
            >
              <Text style={styles.actionBtnText}>Accept Deal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => handleUpdateStatus('rejected')}
              disabled={isUpdating}
            >
              <Text style={styles.actionBtnText}>Reject Deal</Text>
            </TouchableOpacity>
          </View>
        )}

        {isActive && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
            onPress={() => handleUpdateStatus('completed')}
            disabled={isUpdating}
          >
            <Text style={styles.primaryText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            isExpired
              ? onNavigate('CreateDeal', { prefill: deal })
              : onNavigate('DealChat', { dealId: deal._id })
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