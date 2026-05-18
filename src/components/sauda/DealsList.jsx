import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeals, getExpiredDeals } from '../../services/api';

const DealsList = ({ onNavigate, routeData }) => {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Active'); // Active / Expired
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);

  const fetchDeals = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = filter === 'Active' 
        ? await getDeals(token, 1, 50)
        : await getExpiredDeals(token, 1, 50);

      if (response && response.success) {
        setDeals(response.data.deals || []);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      // Alert.alert('Error', 'Failed to fetch deals');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchDeals();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const filteredDeals = deals.filter(deal => {
    const pName = deal.product?.name || deal.product || '';
    return pName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderDealItem = ({ item }) => {
    const isActuallyActive = item.status === 'active' || item.status === 'pending';
    const isCompleted = item.status === 'completed';
    const productName = item.product?.name || item.product || 'Unknown Product';
    const qty = item.product?.quantity || item.qty || 'N/A';
    const price = item.product?.price || item.price || 'N/A';
    const dealId = item._id || item.id;
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';

    return (
      <TouchableOpacity 
        style={styles.dealCard}
        onPress={() => onNavigate('DealDetails', { dealId: dealId, deal: item })}
        activeOpacity={0.7}
      >
        <View style={[styles.statusAccent, { backgroundColor: isActuallyActive ? '#3B82F6' : isCompleted ? '#10B981' : '#EF4444' }]} />
        
        <View style={styles.cardImageContainer}>
           <View style={styles.iconCircle}>
             <Text style={styles.iconEmoji}>{isActuallyActive ? '📦' : isCompleted ? '✅' : '📜'}</Text>
           </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isActuallyActive ? '#EFF6FF' : isCompleted ? '#ECFDF5' : '#FEF2F2' }]}>
              <Text style={[styles.statusText, { color: isActuallyActive ? '#1D4ED8' : isCompleted ? '#059669' : '#B91C1C' }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.dealMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Qty:</Text>
              <Text style={styles.metricValue}>{qty}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Val:</Text>
              <Text style={styles.metricValue}>₹{price}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
             <Text style={styles.dealNumber}>{item.dealNumber || 'NO-REF'}</Text>
             <View style={styles.dateWrap}>
               <Text style={styles.dateText}>{date}</Text>
             </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('pop')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sauda Exchange</Text>
        </View>
        <TouchableOpacity style={styles.premiumAdd} onPress={() => onNavigate('CreateDeal')}>
          <Text style={styles.plusIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH ENGINE */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchLens}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Find deals, products, or IDs..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* TAB FILTERS */}
      <View style={styles.tabContainer}>
        {['Active', 'Expired'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.activeTab]}
            onPress={() => {
              setIsLoading(true);
              setFilter(f);
            }}
          >
            <Text style={[styles.tabText, filter === f && styles.activeTabText]}>
              {f} Saudas
            </Text>
            {filter === f && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingMessage}>Synchronizing trades...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeals}
          renderItem={renderDealItem}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F172A" />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Text style={{fontSize: 40}}>🌑</Text>
              </View>
              <Text style={styles.emptyTitle}>No trades found</Text>
              <Text style={styles.emptySubtitle}>Adjust your search or start a new sauda</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => onNavigate('CreateDeal')}>
                <Text style={styles.emptyBtnText}>Create First Deal</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  premiumAdd: {
    width: 40,
    height: 40,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  plusIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchLens: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#0F172A',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  statusAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dealMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  metricDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  dealNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dateWrap: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    padding: 20,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

export default DealsList;
