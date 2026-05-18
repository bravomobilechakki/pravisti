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

  const themeColor = '#3170cdff';

  const fetchDetails = async () => {
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
      console.error('Error fetching company details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDetails();
  }, []);

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

  const deals = company.recentDeals || [];

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
        <Text style={styles.headerTitle}>Company Details</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => setIsEditModalVisible(true)}
          activeOpacity={0.7}
        >
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
        {/* Dynamic Premium Hero Card */}
        <View style={styles.softHeroContainer}>
          <View style={styles.softHeroHeader}>
            <View style={styles.softAvatar}>
              <Text style={styles.softAvatarText}>{company.type === 'trader' ? '💼' : '🏢'}</Text>
            </View>
            <View style={styles.softHeroInfo}>
              <Text style={styles.softHeroName} numberOfLines={2}>{company.name}</Text>
              <View style={styles.softStatusBadge}>
                <View style={[styles.statusDot, { backgroundColor: company.isVerified ? '#10B981' : '#F59E0B' }]} />
                <Text style={styles.softStatusText}>{company.status || 'Pending'}</Text>
              </View>
            </View>
          </View>
          
          {/* Activity Banner */}
          <View style={styles.activityBanner}>
            <Text style={styles.activityIcon}>⚡</Text>
            <Text style={styles.activityText}>
              <Text style={styles.activityValue}>{deals.length}</Text> Active deals in progress
            </Text>
          </View>
        </View>

        {activeTab === 'my_sauda' ? (
          <>
            {/* My Sauda History Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <TouchableOpacity onPress={() => onNavigate('DealsList')} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {deals.length > 0 ? (
              deals.map(deal => (
                <TouchableOpacity
                  key={deal._id || deal.id}
                  style={styles.dealCard}
                  onPress={() => onNavigate('DealDetails', { deal })}
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
                        {deal.type}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dealFooter}>
                    <Text style={styles.dealMeta}>
                      {deal.quantity} {deal.unit} • {new Date(deal.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.dealPrice, { color: themeColor }]}>₹{deal.price}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyDealsCard}>
                <Text style={styles.emptyDealsText}>No recent deals found for this company.</Text>
              </View>
            )}

            {/* Premium Company Info Card */}
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Company Information</Text>
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
              style={[styles.primaryAction, { backgroundColor: themeColor, shadowColor: themeColor }]}
              onPress={() => onNavigate('CreateDeal', { originCompany: company })}
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
                onChangeText={(text) => setEditData({...editData, name: text})}
                placeholder="Enter company name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.email}
                onChangeText={(text) => setEditData({...editData, email: text})}
                placeholder="info@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Phone Number*</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.phone}
                onChangeText={(text) => setEditData({...editData, phone: text})}
                placeholder="10-digit number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={styles.modalLabel}>Website URL</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.website}
                onChangeText={(text) => setEditData({...editData, website: text})}
                placeholder="https://example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Business Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                value={editData.description}
                onChangeText={(text) => setEditData({...editData, description: text})}
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
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
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
    fontSize: 13,
    color: '#3170cdff',
    fontWeight: '700',
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
  primaryAction: {
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryActionIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
  /* Create Sauda Tab */
  createSaudaContent: {
    paddingVertical: 10,
  },
  createHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  createHeroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  createHeroIcon: {
    fontSize: 30,
  },
  createHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  createHeroSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  activeSmallButton: {
    backgroundColor: '#3170cdff',
    borderColor: '#3170cdff',
    shadowOpacity: 0.15,
  },
  smallButtonIcon: {
    fontSize: 14,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3170cdff',
  },
  activeSmallButtonText: {
    color: '#FFFFFF',
  },
  softHeroContainer: {
    backgroundColor: '#3170cdff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  softHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  softAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  softAvatarText: {
    fontSize: 28,
  },
  softHeroInfo: {
    flex: 1,
  },
  softHeroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  softStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  softStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  activityIcon: {
    fontSize: 14,
  },
  activityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activityValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
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
  emptyDealsCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyDealsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#3170cdff',
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
