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
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  LogOut,
  X,
  Check,
  User,
  Mail,
  Building2,
  MapPin,
  ShieldCheck,
  Lock,
  Image as ImageIcon,
  Trash2,
  Bot,
  Sparkles,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserProfile,
  getCompanies,
  updateUserProfile,
  logoutUser,
  resolveImageUrl,
} from '../../../services/api';
import uploadService from '../../../services/uploadService';

const THEME = '#2327D8';
const DARK_NAVY = '#1E1C38';

const Profile = ({ onNavigate, routeData }) => {
  const [profileData, setProfileData] = useState(routeData?.user || null);
  const [companiesCount, setCompaniesCount] = useState(routeData?.user?.totalCompanies || 0);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isImagePickerModalVisible, setIsImagePickerModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Edit fields state
  const [editName, setEditName] = useState(routeData?.user?.name || '');
  const [editEmail, setEditEmail] = useState(routeData?.user?.email || '');
  const [editCompany, setEditCompany] = useState(routeData?.user?.company || '');
  const [editGstin, setEditGstin] = useState(routeData?.user?.gstin || '');
  const [editAddress, setEditAddress] = useState(routeData?.user?.address || '');
  const [editProfilePicture, setEditProfilePicture] = useState(
    routeData?.user?.profilePicture || routeData?.user?.avatar || routeData?.user?.image || ''
  );

  const loadProfile = async () => {
    try {
      // 1. Cached Profile
      const storedProfile = await AsyncStorage.getItem('user_completed_profile');
      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile);
          setProfileData(parsed);
          if (typeof parsed.totalCompanies === 'number') {
            setCompaniesCount(parsed.totalCompanies);
          }
          setEditName(parsed.name || '');
          setEditEmail(parsed.email || '');
          setEditCompany(parsed.company || parsed.firmName || '');
          setEditGstin(parsed.gstin || parsed.apmcLicense || '');
          setEditAddress(parsed.address || parsed.mandiLocation || '');
          setEditProfilePicture(parsed.profilePicture || parsed.avatar || parsed.image || '');
        } catch (e) {}
      }

      // 2. Cached Companies Count
      const storedCompsStr = await AsyncStorage.getItem('trader_companies_cache');
      if (storedCompsStr) {
        try {
          const cachedComps = JSON.parse(storedCompsStr);
          if (Array.isArray(cachedComps)) {
            setCompaniesCount(cachedComps.length);
          }
        } catch (e) {}
      }

      // 3. API Profile Fetch
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const res = await getUserProfile(token);
        if (res && res.success && res.data) {
          setProfileData(res.data);
          if (typeof res.data.totalCompanies === 'number') {
            setCompaniesCount(res.data.totalCompanies);
          }
          setEditName(res.data.name || '');
          setEditEmail(res.data.email || '');
          setEditCompany(res.data.company || res.data.firmName || '');
          setEditGstin(res.data.gstin || res.data.apmcLicense || '');
          setEditAddress(res.data.address || res.data.mandiLocation || '');
          setEditProfilePicture(res.data.profilePicture || res.data.avatar || res.data.image || '');
          await AsyncStorage.setItem('user_completed_profile', JSON.stringify(res.data));
        }
      }

      // 4. API Companies Count Fetch
      try {
        const compRes = await getCompanies(1, 100);
        if (compRes && compRes.success && compRes.data?.companies) {
          const freshComps = compRes.data.companies;
          setCompaniesCount(freshComps.length);
          await AsyncStorage.setItem('trader_companies_cache', JSON.stringify(freshComps));
        }
      } catch (e) {}
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Dynamic user details
  const displayName = profileData?.name || routeData?.user?.name || routeData?.user?.fullName || 'Trader Partner';
  const displayMobile =
    profileData?.mobileNumber ||
    profileData?.phone ||
    routeData?.user?.mobileNumber ||
    routeData?.user?.phone ||
    'Not Available';
  const rawRole = profileData?.userType || (routeData?.user?.roles && routeData.user.roles[0]) || 'Trader';
  const displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  const displayCompany =
    profileData?.company ||
    profileData?.firmName ||
    routeData?.user?.company ||
    routeData?.user?.firmName ||
    '';
  const displayEmail = profileData?.email || routeData?.user?.email || '';
  const displayGstin = profileData?.gstin || '';
  const displayAddress = profileData?.address || '';

  const userAvatarUri =
    profileData?.profilePicture ||
    profileData?.avatar ||
    profileData?.image ||
    routeData?.user?.profilePicture ||
    routeData?.user?.avatar ||
    routeData?.user?.image;

  const openEditModal = () => {
    setEditName(displayName !== 'Trader Partner' ? displayName : '');
    setEditEmail(displayEmail);
    setEditCompany(displayCompany);
    setEditGstin(displayGstin);
    setEditAddress(displayAddress);
    setEditProfilePicture(userAvatarUri || '');
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
        company: editCompany.trim(),
        firmName: editCompany.trim(),
        gstin: editGstin.trim(),
        address: editAddress.trim(),
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

  const handleLogout = async () => {
    Alert.alert('Logout Trader', 'Are you sure you want to log out of your Trader Account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
              try {
                await logoutUser(token);
              } catch (apiErr) {
                console.warn('Backend logout API notice:', apiErr);
              }
              await AsyncStorage.removeItem('userToken');
            }
            await AsyncStorage.removeItem('user_completed_profile');
          } catch (e) {
            console.warn('Error logging out:', e);
          } finally {
            if (onNavigate) onNavigate('Login', {}, { replace: true });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* ─── TOP ROYAL BLUE HEADER BAR ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtnRow}
          onPress={() => onNavigate && onNavigate('pop')}
          activeOpacity={0.75}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
          <Text style={styles.settingTitleText}>Setting</Text>
        </TouchableOpacity>

        <Text style={styles.brandTitleText}>PRAVISTI</Text>
      </View>

      {/* ─── OVERLAPPING AVATAR ROW ─── */}
      <View style={styles.avatarWrapperRow}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarCircle, !userAvatarUri && { backgroundColor: THEME }]}>
            {userAvatarUri ? (
              <Image
                source={{ uri: resolveImageUrl(userAvatarUri) }}
                style={styles.userAvatarCustomImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitialText}>
                {displayName ? displayName.trim().charAt(0).toUpperCase() : 'T'}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.cameraBadge} onPress={openEditModal} activeOpacity={0.8}>
            <Camera size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── WHITE CURVED CONTAINER ─── */}
      <View style={styles.whiteCardContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* DYNAMIC USER IDENTITY */}
          <View style={styles.heroSection}>
            <Text style={styles.userNameText}>{displayName}</Text>
            <Text style={styles.userSubText}>
              {displayMobile !== 'Not Available'
                ? displayMobile.startsWith('+91')
                  ? displayMobile
                  : `+91 ${displayMobile}`
                : displayMobile}
              {displayCompany ? (
                <>
                  {' '}•{' '}
                  <Text style={{ color: THEME, fontWeight: '700' }}>{displayCompany}</Text>
                </>
              ) : (
                <>
                  {' '}•{' '}
                  <Text style={{ color: THEME, fontWeight: '700' }}>{displayRole}</Text>
                </>
              )}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          {/* LIST ITEMS */}
          <View style={styles.listContainer}>
            {/* Registered Companies Count */}
            <TouchableOpacity
              style={styles.listItemRow}
              activeOpacity={0.7}
              onPress={() => onNavigate && onNavigate('MyCompanies', { user: profileData, role: 'Trader' })}
            >
              <View>
                <Text style={styles.listItemTitle}>Registered Companies</Text>
                <Text style={styles.subWorkspaceText}>
                  {companiesCount} {companiesCount === 1 ? 'Company' : 'Companies'} Linked
                </Text>
              </View>
              <View style={styles.rightInfoRow}>
                <Text style={styles.rightValueText}>{companiesCount}</Text>
                <ChevronRight size={16} color="#CBD5E1" />
              </View>
            </TouchableOpacity>

            {/* Pravisti AI Assistant */}
            <TouchableOpacity
              style={[styles.listItemRow, { backgroundColor: '#F5F7FF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, marginVertical: 4, borderWidth: 1, borderColor: '#E0E7FF' }]}
              activeOpacity={0.75}
              onPress={() => onNavigate && onNavigate('AIBot', { user: profileData, role: 'Trader' })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' }}>
                  <Bot size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.listItemTitle, { color: THEME, fontWeight: '800' }]}>Pravisti AI Assistant</Text>
                    <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: THEME }}>AI BOT</Text>
                    </View>
                  </View>
                  <Text style={styles.subWorkspaceText}>Instant deals, saudas & trade Q&A</Text>
                </View>
              </View>
              <ChevronRight size={16} color={THEME} />
            </TouchableOpacity>

            {/* Voice Preferences */}
            <TouchableOpacity
              style={styles.listItemRow}
              activeOpacity={0.7}
              onPress={() => onNavigate && onNavigate('VoicePreferences')}
            >
              <View>
                <Text style={styles.listItemTitle}>Voice Preferences</Text>
                <Text style={styles.subWorkspaceText}>Voice AI, custom phrases & speed</Text>
              </View>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              style={styles.listItemRow}
              activeOpacity={0.7}
              onPress={() => onNavigate && onNavigate('Notifications')}
            >
              <Text style={styles.listItemTitle}>Notifications</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.listItemRow}
              activeOpacity={0.7}
              onPress={() => setIsPrivacyModalVisible(true)}
            >
              <Text style={styles.listItemTitle}>Privacy Policy</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* App Information */}
            <TouchableOpacity
              style={styles.listItemRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('App Information', 'Pravisti Trader Mobile v1.0.6\nBuild: 2026.03')}
            >
              <Text style={styles.listItemTitle}>App Information</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Customer Care */}
            <TouchableOpacity
              style={styles.listItemRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Customer Care', 'Calling Mandi Support: 18008989')}
            >
              <Text style={styles.listItemTitle}>Customer Care</Text>
              <View style={styles.rightInfoRow}>
                <Text style={styles.rightValueText}>18008989</Text>
                <ChevronRight size={16} color="#CBD5E1" />
              </View>
            </TouchableOpacity>

            {/* Edit Profile Details */}
            <TouchableOpacity style={styles.listItemRow} activeOpacity={0.7} onPress={openEditModal}>
              <Text style={styles.listItemTitle}>Edit Profile Details</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              style={[styles.listItemRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LogOut size={16} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={styles.signOutTitle}>Sign Out</Text>
              </View>
              <ChevronRight size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* ─── PRIVACY POLICY MODAL ─── */}
      <Modal
        visible={isPrivacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderBar}>
              <Text style={styles.modalTitleText}>Privacy Policy</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsPrivacyModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Lock size={32} color={THEME} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 8 }}>
                  Pravisti Data Protection
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Last Updated: March 2026
                </Text>
              </View>

              <Text style={styles.privacySectionHeading}>1. Information We Collect</Text>
              <Text style={styles.privacyBodyText}>
                We collect your company registration numbers, GSTIN, mandi credentials, and verified phone numbers to facilitate authentic commodity trade ledgering between registered traders and brokers.
              </Text>

              <Text style={styles.privacySectionHeading}>2. How Your Data Is Protected</Text>
              <Text style={styles.privacyBodyText}>
                All commodity sauda records, counterparties, invoices, and ledger details are encrypted in transit and at rest using bank-grade industry security protocols.
              </Text>

              <Text style={styles.privacySectionHeading}>3. Compliance & Confidentiality</Text>
              <Text style={styles.privacyBodyText}>
                Your data is stored securely in accordance with government commodity market regulations and is strictly accessible by authorized counterparties to the transactions.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveBtn, { width: '100%' }]}
                onPress={() => setIsPrivacyModalVisible(false)}
              >
                <Text style={styles.saveBtnText}>Close Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── EDIT PROFILE DETAILS MODAL ─── */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderBar}>
              <Text style={styles.modalTitleText}>Edit Profile Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Profile Photo Selector */}
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

              <Text style={styles.fieldLabel}>Full Name *</Text>
              <View style={[styles.inputBox, focusedField === 'name' && styles.inputFocused]}>
                <User size={16} color={THEME} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <Text style={styles.fieldLabel}>Company / Workspace Name</Text>
              <View style={[styles.inputBox, focusedField === 'company' && styles.inputFocused]}>
                <Building2 size={16} color={THEME} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editCompany}
                  onChangeText={setEditCompany}
                  placeholder="e.g. Mahansh Traders"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('company')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={[styles.inputBox, focusedField === 'email' && styles.inputFocused]}>
                <Mail size={16} color={THEME} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <Text style={styles.fieldLabel}>GSTIN / APMC License</Text>
              <View style={[styles.inputBox, focusedField === 'gstin' && styles.inputFocused]}>
                <ShieldCheck size={16} color={THEME} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editGstin}
                  onChangeText={setEditGstin}
                  placeholder="15-digit GSTIN or License"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  onFocus={() => setFocusedField('gstin')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <Text style={styles.fieldLabel}>Address / Mandi Location</Text>
              <View style={[styles.inputBox, focusedField === 'address' && styles.inputFocused]}>
                <MapPin size={16} color={THEME} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Enter street, mandi, city, state"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={isLoading || isUploadingImage}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Save Details</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── IMAGE PICKER MODAL ─── */}
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
              <Camera size={20} color={THEME} style={{ marginRight: 12 }} />
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
              <ImageIcon size={20} color={THEME} style={{ marginRight: 12 }} />
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
    backgroundColor: THEME,
  },
  topHeader: {
    backgroundColor: THEME,
    height: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 90 : 130) : 120,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 32) : 14,
  },
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  brandTitleText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  whiteCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 56,
  },
  avatarWrapperRow: {
    alignItems: 'center',
    marginTop: -52,
    marginBottom: -52,
    zIndex: 99,
    elevation: 10,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  userAvatarCustomImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitialText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME,
    marginBottom: 4,
  },
  userSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 24,
    marginBottom: 10,
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rightInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  subWorkspaceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  signOutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  privacySectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 4,
  },
  privacyBodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F4F6FB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: DARK_NAVY,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputFocused: {
    borderColor: THEME,
    borderWidth: 1.5,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarEditWrapper: {
    alignItems: 'center',
    marginBottom: 8,
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
    color: THEME,
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
    backgroundColor: THEME,
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
    color: THEME,
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
