import React, { useState, useEffect } from 'react';
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
  Image,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Edit3,
  Phone,
  Mail,
  Building2,
  Handshake,
  Users,
  TrendingUp,
  Bell,
  Lock,
  HelpCircle,
  ChevronRight,
  LogOut,
  X,
  Mic,
  Camera,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resolveImageUrl,
  updateUserProfile,
  getUserProfile,
  getCompanies,
} from '../../../services/api';
import uploadService from '../../../services/uploadService';

const Profile = ({ onNavigate, routeData }) => {
  const [profileData, setProfileData] = useState(routeData?.user || null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit fields state
  const [editName, setEditName] = useState(routeData?.user?.name || '');
  const [editEmail, setEditEmail] = useState(routeData?.user?.email || '');
  const [editCompany, setEditCompany] = useState(routeData?.user?.company || '');
  const [editGstin, setEditGstin] = useState(routeData?.user?.gstin || '');
  const [editAddress, setEditAddress] = useState(routeData?.user?.address || '');
  const [editProfilePicture, setEditProfilePicture] = useState(
    routeData?.user?.profilePicture || routeData?.user?.avatar || routeData?.user?.image || ''
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImagePickerModalVisible, setIsImagePickerModalVisible] = useState(false);

  const [companiesCount, setCompaniesCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('user_completed_profile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setProfileData(parsed);
          setEditName(parsed.name || '');
          setEditEmail(parsed.email || '');
          setEditCompany(parsed.company || '');
          setEditGstin(parsed.gstin || '');
          setEditAddress(parsed.address || '');
          setEditProfilePicture(parsed.profilePicture || parsed.avatar || parsed.image || '');
          return;
        }

        const response = await getUserProfile();
        if (response && response.success && response.data) {
          setProfileData(response.data);
          setEditName(response.data.name || '');
          setEditEmail(response.data.email || '');
          setEditCompany(response.data.company || '');
          setEditGstin(response.data.gstin || '');
          setEditAddress(response.data.address || '');
          setEditProfilePicture(response.data.profilePicture || response.data.avatar || response.data.image || '');
        }
      } catch (error) {
        console.warn('Failed to load profile:', error);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await getCompanies(1, 100);
        if (response && response.success && response.data?.companies) {
          setCompaniesCount(response.data.companies.length);
        }
      } catch (error) {
        console.warn('Failed to fetch companies count:', error);
      }
    };
    fetchCompanies();
  }, []);

  const openEditModal = () => {
    setEditName(profileData?.name || routeData?.user?.name || '');
    setEditEmail(profileData?.email || routeData?.user?.email || '');
    setEditCompany(profileData?.company || routeData?.user?.company || '');
    setEditGstin(profileData?.gstin || routeData?.user?.gstin || '');
    setEditAddress(profileData?.address || routeData?.user?.address || '');
    setEditProfilePicture(
      profileData?.profilePicture || profileData?.avatar || profileData?.image || routeData?.user?.profilePicture || ''
    );
    setIsEditModalVisible(true);
  };

  const handlePickImage = (sourceType = 'library') => {
    const pickerOptions = {
      mediaType: 'photo',
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.85,
    };

    const callback = async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to select image');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setIsUploadingImage(true);
        try {
          const uploadedUrl = await uploadService.uploadImage(asset);
          setEditProfilePicture(uploadedUrl);
        } catch (uploadErr) {
          console.error('Profile image upload error:', uploadErr);
          Alert.alert('Upload Failed', uploadErr.message || 'Could not upload profile picture. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    };

    if (sourceType === 'camera') {
      launchCamera(pickerOptions, callback);
    } else {
      launchImageLibrary(pickerOptions, callback);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
        profilePicture: editProfilePicture,
      };

      try {
        await updateUserProfile(payload, token);
      } catch (apiErr) {
        console.warn('Notice updating profile on backend:', apiErr?.message || apiErr);
      }

      const updatedProfile = {
        ...profileData,
        name: editName.trim(),
        email: editEmail.trim(),
        profilePicture: editProfilePicture,
        avatar: editProfilePicture,
        image: editProfilePicture,
        company: editCompany,
        gstin: editGstin,
        address: editAddress,
      };

      await AsyncStorage.setItem('user_completed_profile', JSON.stringify(updatedProfile));
      setProfileData(updatedProfile);

      Alert.alert('Success', 'Profile details updated successfully!');
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile data.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = profileData?.name || routeData?.user?.name || 'Rahul Sharma';
  const rawRole = profileData?.userType || (routeData?.user?.roles && routeData.user.roles[0]) || 'Trader';
  const displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  const displayMobile = profileData?.mobileNumber || routeData?.user?.mobileNumber || '+91 98765 43210';
  const displayEmail = profileData?.email || routeData?.user?.email || '';
  const totalCompaniesCount = companiesCount;

  const menuItems = [
    {
      Icon: Building2,
      label: 'My Companies',
      subtitle: `${totalCompaniesCount} registered companies`,
      color: '#3B82F6',
    },
    { Icon: Handshake, label: 'My Deals', subtitle: 'View all sauda deals', color: '#10B981' },
    { Icon: Mic, label: 'Voice Preferences', subtitle: 'Voice AI, custom phrases & speed', color: '#0B2265' },
    { Icon: Users, label: 'Onboarded Users', subtitle: 'Users onboarded during deal creation', color: '#6366F1' },
    { Icon: Users, label: 'Contacts', subtitle: 'Saved parties & brokers', color: '#8B5CF6' },
    { Icon: TrendingUp, label: 'Reports', subtitle: 'Commission & analytics', color: '#EC4899' },
    { Icon: Bell, label: 'Notifications', subtitle: 'Manage alerts', color: '#F59E0B' },
    { Icon: Lock, label: 'Privacy & Security', subtitle: 'Account settings', color: '#06B6D4' },
    { Icon: HelpCircle, label: 'Help & Support', subtitle: 'FAQs & contact us', color: '#64748B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={openEditModal}
          activeOpacity={0.7}
        >
          <Edit3 size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Unified Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={openEditModal}
              activeOpacity={0.8}
            >
              {(profileData?.profilePicture || profileData?.avatar || profileData?.image || routeData?.user?.profilePicture) ? (
                <Image
                  source={{ uri: resolveImageUrl(profileData?.profilePicture || profileData?.avatar || profileData?.image || routeData?.user?.profilePicture) }}
                  style={{ width: '100%', height: '100%', borderRadius: 40 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{(displayName || 'T').charAt(0).toUpperCase()}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mainAvatarCameraBadge}
              onPress={openEditModal}
              activeOpacity={0.85}
            >
              <Camera size={11} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{displayRole}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>

          <View style={styles.divider} />

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Phone size={18} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Mobile Number</Text>
                <Text style={styles.infoValue}>{displayMobile}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Mail size={18} color="#4F46E5" />
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
                <Building2 size={18} color="#4F46E5" />
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
          {menuItems.map((item, index) => {
            const Icon = item.Icon;
            return (
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
                  } else if (item.label === 'Voice Preferences') {
                    onNavigate('VoicePreferences');
                  } else if (item.label === 'Onboarded Users') {
                    onNavigate('OnboardedUsers', { fromScreen: 'Profile' });
                  } else if (item.label === 'Contacts') {
                    onNavigate('ChatList');
                  } else if (item.label === 'Notifications') {
                    onNavigate('Notifications');
                  } else {
                    const { Alert } = require('react-native');
                    Alert.alert(item.label, `${item.label} settings coming soon!`);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                  <Icon size={18} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })}
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
                try {
                  await logoutUser(token);
                } catch (apiErr) {
                  console.log("Backend logout API failed:", apiErr);
                }
                await AsyncStorage.removeItem('userToken');
              }
              await AsyncStorage.removeItem('user_completed_profile');
            } catch (e) {
              console.log("Error logging out", e);
            }
            onNavigate('Login');
          }}
        >
          <LogOut size={18} color="#EF4444" />
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
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalForm}
              >
                {/* Profile Picture Upload Section */}
                <View style={styles.avatarEditWrapper}>
                  <View style={styles.avatarEditCircleWrapper}>
                    <TouchableOpacity
                      style={styles.avatarEditCircle}
                      onPress={() => setIsImagePickerModalVisible(true)}
                      activeOpacity={0.8}
                      disabled={isUploadingImage}
                    >
                      {editProfilePicture ? (
                        <Image
                          source={{ uri: resolveImageUrl(editProfilePicture) }}
                          style={styles.avatarEditImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.avatarEditText}>
                          {(editName || displayName || 'T').charAt(0).toUpperCase()}
                        </Text>
                      )}
                      {isUploadingImage && (
                        <View style={styles.avatarUploadingOverlay}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.avatarEditBadge}
                      onPress={() => setIsImagePickerModalVisible(true)}
                      activeOpacity={0.85}
                      disabled={isUploadingImage}
                    >
                      <Camera size={13} color="#FFFFFF" strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setIsImagePickerModalVisible(true)}
                    activeOpacity={0.7}
                    style={styles.changePhotoBtn}
                    disabled={isUploadingImage}
                  >
                    <Text style={styles.changePhotoBtnText}>
                      {editProfilePicture ? 'Change Profile Picture' : 'Upload Profile Picture'}
                    </Text>
                  </TouchableOpacity>
                </View>

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
                  style={[styles.saveButton, (isLoading || isUploadingImage) && { opacity: 0.7 }]}
                  onPress={handleSaveProfile}
                  disabled={isLoading || isUploadingImage}
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

      {/* Photo Picker Options Modal */}
      <Modal
        visible={isImagePickerModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImagePickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.imagePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setIsImagePickerModalVisible(false)}
        >
          <View style={styles.imagePickerModalCard}>
            <Text style={styles.imagePickerModalTitle}>Profile Photo</Text>
            <TouchableOpacity
              style={styles.imagePickerModalOption}
              onPress={() => {
                setIsImagePickerModalVisible(false);
                setTimeout(() => handlePickImage('camera'), 350);
              }}
              activeOpacity={0.7}
            >
              <Camera size={20} color="#2563EB" style={{ marginRight: 12 }} />
              <Text style={styles.imagePickerModalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imagePickerModalOption}
              onPress={() => {
                setIsImagePickerModalVisible(false);
                setTimeout(() => handlePickImage('library'), 350);
              }}
              activeOpacity={0.7}
            >
              <ImageIcon size={20} color="#2563EB" style={{ marginRight: 12 }} />
              <Text style={styles.imagePickerModalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            {editProfilePicture ? (
              <TouchableOpacity
                style={[styles.imagePickerModalOption, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}
                onPress={() => {
                  setEditProfilePicture('');
                  setIsImagePickerModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color="#EF4444" style={{ marginRight: 12 }} />
                <Text style={[styles.imagePickerModalOptionText, { color: '#EF4444' }]}>Remove Photo</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.imagePickerModalCancelBtn}
              onPress={() => setIsImagePickerModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.imagePickerModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  mainAvatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    left: 56,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarEditWrapper: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  avatarEditCircleWrapper: {
    position: 'relative',
  },
  avatarEditCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#EEF2FF',
    borderWidth: 2.5,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarEditImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#4F46E5',
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  changePhotoBtn: {
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  changePhotoBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  imagePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  imagePickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  imagePickerModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePickerModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  imagePickerModalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  imagePickerModalCancelBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  imagePickerModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default Profile;
