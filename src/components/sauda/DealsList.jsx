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
} from 'react-native';

const DealsList = ({ onNavigate }) => {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Active'); // Active / Expired

  const deals = [
    {
      id: '1',
      product: 'Wheat',
      qty: '100kg',
      price: '₹2500',
      parties: 'ABC Traders → XYZ Traders',
      status: 'Active',
      date: '26 Mar',
      image: require('../../images/login.png'), // Placeholder image
    },
    {
      id: '2',
      product: 'Rice',
      qty: '500kg',
      price: '₹15000',
      parties: 'Global Foods → Metro Mart',
      status: 'Active',
      date: '25 Mar',
      image: require('../../images/login.png'),
    },
    {
      id: '3',
      product: 'Sugar',
      qty: '200kg',
      price: '₹8000',
      parties: 'Sweet Corp → Retail Ind',
      status: 'Expired',
      date: '20 Mar',
      image: require('../../images/login.png'),
    },
  ];

  const filteredDeals = deals.filter(deal => 
    deal.status === filter && 
    deal.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDealItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.dealCard}
      onPress={() => onNavigate('DealDetails', { dealId: item.id })}
      activeOpacity={0.9}
    >
      <Image source={item.image} style={[styles.dealImage, { width: width * 0.2, height: width * 0.2 }]} />
      <View style={styles.dealContent}>
        <View style={styles.dealHeader}>
          <Text style={styles.productName}>{item.product}</Text>
          <View style={[styles.statusBadge, item.status === 'Active' ? styles.activeBadge : styles.expiredBadge]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.dealDetail}>Qty: {item.qty} | Price: {item.price}</Text>
        <Text style={styles.partiesText}>{item.parties}</Text>
        <View style={styles.dealFooter}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={styles.viewDetailLink}>View Details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('Dashboard')}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sauda Deals</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => onNavigate('CreateDeal')}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Deals..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {['Active', 'Expired'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.activeFilterChip]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.activeFilterChipText]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredDeals}
        renderItem={renderDealItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FF',
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
  addButton: {
    width: 36,
    height: 36,
    backgroundColor: '#3170cdff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#3170CD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  activeFilterChip: {
    backgroundColor: '#3170cdff',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 15,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dealImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  dealContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534', // For active
  },
  dealDetail: {
    fontSize: 13,
    color: '#64748B',
    marginVertical: 4,
  },
  partiesText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3170cdff',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  viewDetailLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3170cdff',
  },
});

export default DealsList;
