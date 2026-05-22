import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyDetails, updateCompany, deleteCompany } from '../../services/api';

const CompanyDetails = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = React.useState('my_sauda');
  const [isLoading, setIsLoading] = React.useState(true);
  const [company, setCompany] = React.useState(routeData?.company || null);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [editData, setEditData] = React.useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    description: '',
  });

  const themeColor = '#4F46E5';

  const fetchDetails = React.useCallback(async () => {
    const id = routeData?.company?._id || routeData?.company?.id;
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await getCompanyDetails(id);
      if (response && response.success) {
        setCompany(response.data);
        setEditData({
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone,
          website: response.data.website || '',
          description: response.data.description || '',
        });
      }
    } catch (error) {
      console.warn('Error fetching company details:', error);
      Alert.alert(
        'Access Denied',
        error.message || 'You do not have permission to access this company.',
        [{ text: 'OK', onPress: () => onNavigate('pop') }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [routeData, onNavigate]);

  React.useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleUpdate = async () => {
    if (!editData.name || !editData.phone) {
      Alert.alert('Error', 'Company Name and Phone are required.');
      return;
    }
    const id = company?._id || company?.id;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await updateCompany(id, editData, token);
      if (response && response.success) {
        Alert.alert('Success', 'Company profile updated successfully!');
        setIsEditModalVisible(false);
        fetchDetails();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update company');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Company',
      'Are you sure you want to delete this company? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const id = company?._id || company?.id;
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await deleteCompany(id, token);
              if (response && response.success) {
                Alert.alert('Success', 'Company deleted successfully');
                onNavigate('Dashboard', routeData, { refresh: true });
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete company');
            }
          }
        }
      ]
    );
  };

  const deals = React.useMemo(() => company?.recentDeals || [], [company]);

  // Extract unique products dynamically from recent deals or fall back to high-end mock categories
  const products = React.useMemo(() => {
    const productMap = new Map();
    deals.forEach(deal => {
      const pName = deal.product?.name || deal.product || deal.title || '';
      if (pName && pName !== 'Unknown Product') {
        const qty = Number(deal.product?.quantity || deal.quantity || 0);
        const priceVal = Number(deal.product?.price || deal.price || 0);
        const existing = productMap.get(pName);
        if (existing) {
          existing.volume += qty;
          existing.dealCount += 1;
        } else {
          productMap.set(pName, {
            name: pName,
            category: deal.category || company?.industry || 'Commodities',
            price: priceVal,
            volume: qty,
            dealCount: 1,
            image: deal.product?.image || '',
          });
        }
      }
    });
    if (productMap.size === 0) {
      return [
        { name: 'Premium Cotton Bales', category: 'Textiles & Apparel', price: 42000, volume: 150, dealCount: 3, image: '' },
        { name: 'Organic Wheat Grain', category: 'Agriculture & Agro', price: 2100, volume: 500, dealCount: 5, image: '' },
        { name: 'Silicon Transistors', category: 'Electronics & Tech', price: 85, volume: 10000, dealCount: 2, image: '' }
      ];
    }
    return Array.from(productMap.values());
  }, [deals, company]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  if (!company) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Company not found</Text>
        <TouchableOpacity onPress={() => onNavigate('pop')} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Ledger</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Premium Hero Card (Company Name Card on Top) */}
        <View style={styles.softHeroContainer}>
          <View style={styles.softHeroHeader}>
            <View style={styles.softAvatar}>
              <Text style={styles.softAvatarText}>{company.type === 'trader' ? '💼' : '🏢'}</Text>
            </View>
            <View style={styles.softHeroInfo}>
              <Text style={styles.softHeroName} numberOfLines={2}>{company.name}</Text>
              <View style={styles.metaBadgeRow}>
                <View style={[
                  styles.softStatusBadge,
                  {
                    backgroundColor: company.isVerified ? '#ECFDF5' : '#FFFBEB',
                    borderColor: company.isVerified ? '#A7F3D0' : '#FDE68A',
                  }
                ]}>
                  <View style={[styles.statusDot, { backgroundColor: company.isVerified ? '#10B981' : '#F59E0B' }]} />
                  <Text style={[
                    styles.softStatusText,
                    { color: company.isVerified ? '#047857' : '#B45309' }
                  ]}>{company.status || 'Pending'}</Text>
                </View>
                {company.gstin && (
                  <View style={styles.gstinBadge}>
                    <Text style={styles.gstinBadgeText}>GST: {company.gstin}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Stats & Activity Summary */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#4F46E5' }]}>{deals.length}</Text>
              <Text style={styles.heroStatLabel}>Total Deals</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#10B981' }]}>
                ₹{deals.reduce((acc, deal) => acc + Number(deal.product?.price || deal.price || 0), 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.heroStatLabel}>Volume</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#2563EB' }]}>{company.type === 'trader' ? 'Trader' : 'Broker'}</Text>
              <Text style={styles.heroStatLabel}>Role</Text>
            </View>
          </View>
        </View>

        {/* Elegant Grid/Flex Tab Buttons (My Sauda, Categories, Products) */}
        <View style={styles.tabButtonsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'my_sauda' && styles.activeTabButton]}
            onPress={() => setActiveTab('my_sauda')}
            activeOpacity={0.85}
          >
            <Text style={styles.tabButtonEmoji}>🤝</Text>
            <Text style={[styles.tabButtonText, activeTab === 'my_sauda' && styles.activeTabButtonText]}>My Sauda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => onNavigate('CategoryPage', { company })}
            activeOpacity={0.85}
          >
            <Text style={styles.tabButtonEmoji}>🏷️</Text>
            <Text style={styles.tabButtonText}>Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => onNavigate('AddProductPage', { company })}
            activeOpacity={0.85}
          >
            <Text style={styles.tabButtonEmoji}>📦</Text>
            <Text style={styles.tabButtonText}>Products</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Panel Switcher */}
        <View style={styles.tabPanelContainer}>
          {activeTab === 'my_sauda' ? (
            <View style={styles.tabContentContainer}>
              {/* Header with quick creation action */}
              <View style={styles.tabSectionHeader}>
                <Text style={styles.tabSectionTitle}>Transaction Ledgers</Text>
                <TouchableOpacity
                  style={styles.inlineCreateButton}
                  onPress={() => onNavigate('CreateDeal', { originCompany: company })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.inlineCreateText}>+ Create Sauda</Text>
                </TouchableOpacity>
              </View>

              {deals.length > 0 ? (
                deals.map((deal, idx) => (
                  <TouchableOpacity
                    key={deal._id || deal.id || idx}
                    style={styles.dealCard}
                    onPress={() => onNavigate('DealDetails', { deal })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dealHeader}>
                      <Text style={styles.dealTitle} numberOfLines={1}>
                        {deal.product?.name || deal.product || deal.title || 'Commodity Trade'}
                      </Text>
                      <View
                        style={[
                          styles.dealTypeBadge,
                          {
                            backgroundColor: deal.type === 'Buy' ? '#E6F4EA' : '#FCE8E6',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dealTypeText,
                            { color: deal.type === 'Buy' ? '#137333' : '#C5221F' },
                          ]}
                        >
                          {deal.type || 'TRADE'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dealFooter}>
                      <Text style={styles.dealMeta}>
                        {deal.product?.quantity || deal.quantity || '0'} {deal.unit || 'Units'} • {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : 'N/A'}
                      </Text>
                      <Text style={[styles.dealPrice, { color: themeColor }]}>₹{deal.product?.price || deal.price || '0'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <TouchableOpacity
                    style={styles.emptyTabCard}
                    onPress={() => onNavigate('CreateDeal', { originCompany: company })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.emptyTabLeft}>
                      <View style={styles.emptyTabIconBox}>
                        <Text style={styles.emptyTabIconText}>🤝</Text>
                      </View>
                      <View style={styles.emptyTabContent}>
                        <Text style={styles.emptyTabTitle}>Initiate First Sauda</Text>
                        <Text style={styles.emptyTabSubtext}>Create a trading contract for this company</Text>
                      </View>
                    </View>
                    <View style={[styles.emptyTabButton, { backgroundColor: themeColor }]}>
                      <Text style={styles.emptyTabButtonText}>Create +</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.tabContentContainer}>
              <View style={styles.tabSectionHeader}>
                <Text style={styles.tabSectionTitle}>Trading Inventory</Text>
              </View>

              <View style={styles.productsGrid}>
                {products.map((product, idx) => (
                  <View key={idx} style={styles.productCard}>
                    <View style={styles.productAvatarCircle}>
                      <Text style={styles.productEmoji}>📦</Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productCardName}>{product.name}</Text>
                      <Text style={styles.productCardCategory}>{product.category}</Text>
                      <View style={styles.productMetricsRow}>
                        <View style={styles.productMetricLabelWrap}>
                          <Text style={styles.productMetricLabel}>Price:</Text>
                          <Text style={styles.productMetricValue}>₹{product.price}</Text>
                        </View>
                        <View style={styles.productMetricDivider} />
                        <View style={styles.productMetricLabelWrap}>
                          <Text style={styles.productMetricLabel}>Volume:</Text>
                          <Text style={styles.productMetricValue}>{product.volume}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Permanent Company Details & Info Card (Always Visible below Selected Tab Panel) */}
        <View style={[styles.tabContentContainer, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>🏢 Company Details & Ledger Info</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIcon}>📞</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{company.phone || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIcon}>✉️</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{company.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIcon}>📍</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {company.address
                    ? `${company.address.street || ''}, ${company.address.city || ''}, ${company.address.state || ''}, ${company.address.country || 'India'}`
                    : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIcon}>🌐</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Website</Text>
                <Text style={[styles.infoValue, { color: themeColor, textDecorationLine: 'underline' }]}>
                  {company.website || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIcon}>📝</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Business Description</Text>
                <Text style={[styles.infoValue, { fontSize: 13, lineHeight: 18, fontWeight: '500' }]}>
                  {company.description || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Modification Actions */}
          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: themeColor }]}
            activeOpacity={0.8}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Text style={[styles.secondaryActionIcon, { color: themeColor }]}>📝</Text>
            <Text style={[styles.secondaryActionText, { color: themeColor }]}>Update Company Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: '#FECACA', marginTop: 12 }]}
            activeOpacity={0.8}
            onPress={handleDelete}
          >
            <Text style={styles.secondaryActionIcon}>🗑️</Text>
            <Text style={[styles.secondaryActionText, { color: '#DC2626' }]}>Delete Company</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColor, shadowColor: themeColor }]}
        onPress={() => onNavigate('CreateDeal', { originCompany: company })}
        activeOpacity={0.9}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Modern Profile Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Company Details</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.modalLabel}>Company Name*</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholder="Enter company name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.email}
                onChangeText={(text) => setEditData({ ...editData, email: text })}
                placeholder="info@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Phone Number*</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.phone}
                onChangeText={(text) => setEditData({ ...editData, phone: text })}
                placeholder="10-digit number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={styles.modalLabel}>Website URL</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.website}
                onChangeText={(text) => setEditData({ ...editData, website: text })}
                placeholder="https://example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Business Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                value={editData.description}
                onChangeText={(text) => setEditData({ ...editData, description: text })}
                placeholder="Business terms, info..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setIsEditModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColor }]}
                onPress={handleUpdate}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate background for beautiful high contrast
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  editButton: {
    padding: 8,
    marginRight: -8,
  },
  editIcon: {
    fontSize: 20,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  softHeroContainer: {
    backgroundColor: '#1E1B4B', // Premium Midnight Indigo
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#312E81',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  softHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  softAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#c7c6efff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#4338CA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  softAvatarText: {
    fontSize: 26,
  },
  softHeroInfo: {
    flex: 1,
  },
  softHeroName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF', // Premium White Text
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  softStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  softStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gstinBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  gstinBadgeText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 3,
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  tabButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  activeTabButton: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  tabButtonEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  tabPanelContainer: {
    flex: 1,
  },
  fullConsoleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 2,
  },
  bannerArrow: {
    fontSize: 18,
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  inlineCreateButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inlineCreateText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emptyTabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  emptyTabIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  emptyTabIconText: {
    fontSize: 20,
  },
  emptyTabContent: {
    flex: 1,
  },
  emptyTabTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  emptyTabSubtext: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTabButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  productsGrid: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  productAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F0F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  productEmoji: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  productCardCategory: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  productMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  productMetricLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productMetricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  productMetricValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  productMetricDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F6FF',
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
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 66,
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  secondaryActionIcon: {
    fontSize: 18,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 50,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1E293B',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 14,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 28,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CompanyDetails;
