import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

const Profile = ({ onNavigate, routeData }) => {
  const [profileData, setProfileData] = React.useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Edit fields state
  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editCompany, setEditCompany] = React.useState('');
  const [editGstin, setEditGstin] = React.useState('');
  const [editAddress, setEditAddress] = React.useState('');

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const storedProfile = await AsyncStorage.getItem('user_completed_profile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setProfileData(parsed);
          setEditName(parsed.name || '');
          setEditEmail(parsed.email || '');
          setEditCompany(parsed.company || '');
          setEditGstin(parsed.gstin || '');
          setEditAddress(parsed.address || '');
          return;
        }

        const { getUserProfile } = require('../../services/api');
        const response = await getUserProfile();
        if (response && response.success) {
          setProfileData(response.data);
          setEditName(response.data.name || '');
          setEditEmail(response.data.email || '');
          setEditCompany(response.data.company || '');
          setEditGstin(response.data.gstin || '');
          setEditAddress(response.data.address || '');
        }
      } catch (error) {
        console.warn('Failed to load profile:', error);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      const { Alert } = require('react-native');
      Alert.alert('Validation Error', 'Full Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const updatedProfile = {
        ...profileData,
        name: editName,
        email: editEmail,
        company: editCompany,
        gstin: editGstin,
        address: editAddress,
      };

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('user_completed_profile', JSON.stringify(updatedProfile));
      setProfileData(updatedProfile);

      const { Alert } = require('react-native');
      Alert.alert('Success', 'Profile details updated successfully!');
      setIsEditModalVisible(false);
    } catch (error) {
      const { Alert } = require('react-native');
      Alert.alert('Error', 'Failed to save profile data.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = profileData?.name || routeData?.user?.name || 'Rahul Sharma';
  const rawRole = profileData?.userType || (routeData?.user?.roles && routeData.user.roles[0]) || 'Broker';
  const displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  const displayMobile = profileData?.mobileNumber || routeData?.user?.mobileNumber || '+91 98765 43210';
  const displayEmail = profileData?.email || routeData?.user?.email || '';
  const totalCompaniesCount = profileData?.totalCompanies !== undefined ? profileData.totalCompanies : 2;

  const menuItems = [
    {
      icon: '🏢',
      label: 'My Companies',
      subtitle: `${totalCompaniesCount} registered companies`,
    },
    { icon: '🤝', label: 'My Deals', subtitle: 'View all sauda deals' },
    { icon: '👥', label: 'Contacts', subtitle: 'Saved parties & brokers' },
    { icon: '📊', label: 'Reports', subtitle: 'Commission & analytics' },
    { icon: '🔔', label: 'Notifications', subtitle: 'Manage alerts' },
    { icon: '🔒', label: 'Privacy & Security', subtitle: 'Account settings' },
    { icon: '❓', label: 'Help & Support', subtitle: 'FAQs & contact us' },
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Unified Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{displayRole}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          
          <View style={styles.divider} />

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>📱</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Mobile Number</Text>
                <Text style={styles.infoValue}>{displayMobile}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>✉️</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={[styles.infoValue, !displayEmail && styles.infoValuePlaceholder]}>
                  {displayEmail || 'Add email address'}
                </Text>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.infoIconContainer}>
                <Text style={styles.infoIcon}>🏢</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Linked Companies</Text>
                <Text style={styles.infoValue}>{totalCompaniesCount} registered</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                if (item.label === 'My Companies') {
                  onNavigate('MyCompanies');
                } else if (item.label === 'My Deals') {
                  onNavigate('DealsList');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={async () => {
            try {
              const { logoutUser } = require('../../services/api');
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              const token = await AsyncStorage.getItem('userToken');
              if (token) {
                await logoutUser(token);
                await AsyncStorage.removeItem('userToken');
              }
            } catch (e) {
              console.log("Error logging out", e);
            }
            onNavigate('Login');
          }}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Pravisti v1.0.0</Text>
      </ScrollView>

      {/* Complete Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Complete Profile</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsEditModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalForm}
              >
                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Full Name*</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter full name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="name@example.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Company Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editCompany}
                    onChangeText={setEditCompany}
                    placeholder="e.g. Mahansh Traders"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>GSTIN</Text>
                  <TextInput
                    style={styles.input}
                    value={editGstin}
                    onChangeText={setEditGstin}
                    placeholder="15-digit GSTIN"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Enter street, city, state and PIN"
                    placeholderTextColor="#94A3B8"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isLoading && { opacity: 0.7 }]}
                  onPress={handleSaveProfile}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Details</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginVertical: 16,
  },
  infoList: {
    width: '100%',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F7FF',
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
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  menuArrow: {
    fontSize: 22,
    color: '#CBD5E1',
    fontWeight: '300',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 10,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 16,
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
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4F46E5',
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
  completeProfileBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  completeProfileBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  infoValuePlaceholder: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalForm: {
    gap: 16,
    paddingBottom: 40,
  },
  fieldContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveButton: {
    height: 50,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Profile;
