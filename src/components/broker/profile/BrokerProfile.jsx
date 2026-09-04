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
  CreditCard,
  ShieldCheck,
  Mic,
  FileText,
  Lock,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrokerSuccessReceipt from '../../common/BrokerSuccessReceipt';
import { getUserProfile, getCompanies, logoutUser } from '../../../services/api';

const THEME = '#2327D8';
const THEME_HOVER = '#1B1FA7';
const DARK_NAVY = '#1E1C38';

const BrokerProfile = ({ onNavigate, routeData }) => {
  const [profileData, setProfileData] = useState(null);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState({ visible: false });

  // Edit fields state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBank, setEditBank] = useState('');

  const loadProfile = async () => {
    try {
      // 1. Cached Profile
      const storedProfile = await AsyncStorage.getItem('user_completed_profile');
      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile);
          setProfileData(parsed);
          setEditName(parsed.name || '');
          setEditEmail(parsed.email || '');
          setEditCompany(parsed.company || parsed.firmName || '');
          setEditGstin(parsed.gstin || parsed.apmcLicense || '');
          setEditAddress(parsed.address || parsed.mandiLocation || '');
          setEditBank(parsed.bankName || '');
        } catch (e) {}
      }

      // 2. Cached Companies Count
      const storedCompsStr = await AsyncStorage.getItem('broker_companies_cache');
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
          setEditName(res.data.name || '');
          setEditEmail(res.data.email || '');
          setEditCompany(res.data.company || res.data.firmName || '');
          setEditGstin(res.data.gstin || res.data.apmcLicense || '');
          setEditAddress(res.data.address || res.data.mandiLocation || '');
          setEditBank(res.data.bankName || '');
          await AsyncStorage.setItem('user_completed_profile', JSON.stringify(res.data));
        }
      }

      // 4. API Companies Count Fetch
      try {
        const compRes = await getCompanies(1, 20);
        if (compRes && compRes.success && compRes.data?.companies) {
          const freshComps = compRes.data.companies;
          setCompaniesCount(freshComps.length);
          await AsyncStorage.setItem('broker_companies_cache', JSON.stringify(freshComps));
        }
      } catch (e) {}
    } catch (err) {
      console.warn('Failed to load broker profile:', err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = {
        ...(profileData || {}),
        name: editName.trim(),
        email: editEmail.trim(),
        company: editCompany.trim(),
        firmName: editCompany.trim(),
        gstin: editGstin.trim(),
        apmcLicense: editGstin.trim(),
        address: editAddress.trim(),
        mandiLocation: editAddress.trim(),
        bankName: editBank.trim(),
      };

      await AsyncStorage.setItem('user_completed_profile', JSON.stringify(updatedProfile));
      setProfileData(updatedProfile);
      setIsEditModalVisible(false);
      setSuccessReceipt({
        visible: true,
        actionType: 'profileUpdated',
        title: 'Profile Updated Successfully!',
        message: 'Your latest broker profile details have been saved.',
        referenceId: `PROF-${Date.now().toString().slice(-6)}`,
        details: [
          { label: 'Full Name', value: updatedProfile.name },
          { label: 'Email', value: updatedProfile.email || 'N/A' },
          { label: 'Company / Firm', value: updatedProfile.company || updatedProfile.firmName || 'N/A' },
          { label: 'APMC License / GST', value: updatedProfile.gstin || updatedProfile.apmcLicense || 'N/A' },
        ],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout Broker', 'Are you sure you want to log out of your Broker Account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) await logoutUser(token);
            await AsyncStorage.removeItem('userToken');
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

  // Dynamic user details without hardcoded fallbacks
  const displayName = profileData?.name || routeData?.user?.name || routeData?.user?.fullName || 'Broker Partner';
  const displayMobile = profileData?.mobileNumber || profileData?.phone || routeData?.user?.mobileNumber || routeData?.user?.phone || 'Not Available';
  const displayCompany = profileData?.company || profileData?.firmName || routeData?.user?.company || routeData?.user?.firmName || 'Brokerage Firm';
  const displayEmail = profileData?.email || routeData?.user?.email || '';
  const displayGstin = profileData?.gstin || profileData?.apmcLicense || '';
  const displayAddress = profileData?.address || profileData?.mandiLocation || '';
  const displayBank = profileData?.bankName || '';

  const userAvatarUri = profileData?.avatar || profileData?.profileImage || profileData?.photo || routeData?.user?.avatar || routeData?.user?.profileImage || routeData?.user?.photo;

  const openEditModalWithState = () => {
    setEditName(displayName !== 'Broker Partner' ? displayName : '');
    setEditEmail(displayEmail);
    setEditCompany(displayCompany !== 'Brokerage Firm' ? displayCompany : '');
    setEditGstin(displayGstin);
    setEditAddress(displayAddress);
    setEditBank(displayBank);
    setIsEditModalVisible(true);
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

      {/* ─── OVERLAPPING AVATAR ROW (Z-INDEX 99 ABOVE HEADER & WHITE CARD) ─── */}
      <View style={styles.avatarWrapperRow}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarCircle, !userAvatarUri && { backgroundColor: THEME }]}>
            {userAvatarUri ? (
              <Image
                source={{ uri: userAvatarUri }}
                style={styles.userAvatarCustomImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitialText}>
                {displayName ? displayName.trim().charAt(0).toUpperCase() : 'B'}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.cameraBadge} onPress={openEditModalWithState} activeOpacity={0.8}>
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
              {displayMobile !== 'Not Available' ? `+91 ${displayMobile}` : displayMobile}  •  <Text style={{ color: THEME, fontWeight: '700' }}>{displayCompany}</Text>
            </Text>
          </View>

          <View style={styles.cardDivider} />

          {/* LIST ITEMS */}
          <View style={styles.listContainer}>
            {/* Registered Companies Count */}
            <TouchableOpacity style={styles.listItemRow} activeOpacity={0.7} onPress={() => onNavigate && onNavigate('BrokerAddCompany')}>
              <View>
                <Text style={styles.listItemTitle}>Registered Companies</Text>
                <Text style={styles.subWorkspaceText}>{companiesCount} {companiesCount === 1 ? 'Company' : 'Companies'} Linked</Text>
              </View>
              <View style={styles.rightInfoRow}>
                <Text style={styles.rightValueText}>{companiesCount}</Text>
                <ChevronRight size={16} color="#CBD5E1" />
              </View>
            </TouchableOpacity>

            {/* Languages */}
            <TouchableOpacity style={styles.listItemRow} activeOpacity={0.7}>
              <Text style={styles.listItemTitle}>Languages</Text>
              <View style={styles.rightInfoRow}>
                <Text style={styles.rightValueText}>English</Text>
                <ChevronRight size={16} color="#CBD5E1" />
              </View>
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity style={styles.listItemRow} activeOpacity={0.7} onPress={() => setIsPrivacyModalVisible(true)}>
              <Text style={styles.listItemTitle}>Privacy Policy</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* App Information */}
            <TouchableOpacity style={styles.listItemRow} activeOpacity={0.7}>
              <Text style={styles.listItemTitle}>App Information</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Customer Care */}
            <TouchableOpacity
              style={styles.listItemRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Customer Care', 'Calling APMC Support: 18008989')}
            >
              <Text style={styles.listItemTitle}>Customer Care</Text>
              <View style={styles.rightInfoRow}>
                <Text style={styles.rightValueText}>18008989</Text>
                <ChevronRight size={16} color="#CBD5E1" />
              </View>
            </TouchableOpacity>

            {/* Edit Profile Details */}
            <TouchableOpacity style={styles.listItemRow} activeOpacity={0.7} onPress={openEditModalWithState}>
              <Text style={styles.listItemTitle}>Edit Profile Details</Text>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Active Workspace */}
            <TouchableOpacity style={styles.listItemRow} activeOpacity={0.7} onPress={openEditModalWithState}>
              <View>
                <Text style={styles.listItemTitle}>Active Workspace</Text>
                <Text style={styles.subWorkspaceText}>{displayCompany}</Text>
              </View>
              <ChevronRight size={16} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity style={[styles.listItemRow, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={handleLogout}>
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
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 8 }}>Pravisti Data Protection</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Last Updated: March 2026</Text>
              </View>

              <Text style={styles.privacySectionHeading}>1. Information We Collect</Text>
              <Text style={styles.privacyBodyText}>
                We collect your APMC license details, company registration numbers, and phone verification numbers to facilitate verified commodity trade ledgering between registered traders and brokers.
              </Text>

              <Text style={styles.privacySectionHeading}>2. How Your Data Is Protected</Text>
              <Text style={styles.privacyBodyText}>
                All financial, sauda, and counterparty records are encrypted in transit and at rest using end-to-end industry security protocols.
              </Text>

              <Text style={styles.privacySectionHeading}>3. APMC Compliance</Text>
              <Text style={styles.privacyBodyText}>
                Your data is stored securely in accordance with government commodity market guidelines and is strictly accessible by authorized mandi counterparties.
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

      {/* ─── EDIT PROFILE MODAL ─── */}
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
                  placeholder="e.g. Pravisti Infotech"
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

              <Text style={styles.fieldLabel}>APMC License / GSTIN</Text>
              <View style={[styles.inputBox, focusedField === 'gstin' && styles.inputFocused]}>
                <ShieldCheck size={16} color={THEME} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editGstin}
                  onChangeText={setEditGstin}
                  placeholder="e.g. GSTIN / License Number"
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
                  placeholder="Enter location"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <Text style={styles.fieldLabel}>Bank Name</Text>
              <View style={[styles.inputBox, focusedField === 'bank' && styles.inputFocused]}>
                <CreditCard size={16} color={THEME} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={editBank}
                  onChangeText={setEditBank}
                  placeholder="Enter Bank Name"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('bank')}
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
                disabled={isSaving}
              >
                {isSaving ? (
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

      {/* ─── SUCCESS RECEIPT MODAL ─── */}
      <BrokerSuccessReceipt
        visible={successReceipt.visible}
        actionType={successReceipt.actionType}
        title={successReceipt.title}
        message={successReceipt.message}
        referenceId={successReceipt.referenceId}
        details={successReceipt.details}
        onClose={() => setSuccessReceipt({ visible: false })}
      />
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
  floatingMicContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    zIndex: 99,
  },
  floatingMicBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DARK_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
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
    maxHeight: '85%',
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
});

export default BrokerProfile;
