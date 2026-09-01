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
  ArrowLeft,
  Edit3,
  Phone,
  Mail,
  Building2,
  MapPin,
  ShieldCheck,
  CreditCard,
  FileText,
  Plus,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  LogOut,
  X,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Briefcase,
  Percent,
  User,
  Check,
  Mic,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrokerSuccessReceipt from '../../common/BrokerSuccessReceipt';
import { getUserProfile, logoutUser } from '../../../services/api';

const BrokerProfile = ({ onNavigate, routeData }) => {
  const [profileData, setProfileData] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
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
      const storedProfile = await AsyncStorage.getItem('user_completed_profile');
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setProfileData(parsed);
        setEditName(parsed.name || '');
        setEditEmail(parsed.email || '');
        setEditCompany(parsed.company || parsed.firmName || '');
        setEditGstin(parsed.gstin || parsed.apmcLicense || '');
        setEditAddress(parsed.address || parsed.mandiLocation || '');
        setEditBank(parsed.bankName || '');
        return;
      }

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
            onNavigate('Login', {}, { replace: true });
          }
        },
      },
    ]);
  };

  const displayName = profileData?.name || routeData?.user?.name || 'Broker Partner';
  const displayMobile = profileData?.mobileNumber || profileData?.phone || routeData?.user?.mobileNumber || 'Not Registered';
  const displayEmail = profileData?.email || routeData?.user?.email || '';
  const displayCompany = profileData?.company || profileData?.firmName || '';
  const displayGstin = profileData?.gstin || profileData?.apmcLicense || '';
  const displayAddress = profileData?.address || profileData?.mandiLocation || '';
  const displayBank = profileData?.bankName
    ? `${profileData.bankName}${profileData.accountNumber ? ` (••• ${profileData.accountNumber.slice(-4)})` : ''}`
    : '';

  const earnedBrokerage = profileData?.totalBrokerage != null ? `₹${Number(profileData.totalBrokerage).toLocaleString('en-IN')}` : '₹0';
  const completedDeals = profileData?.completedDeals != null ? `${profileData.completedDeals}` : '0';
  const commissionRate = profileData?.commissionRate != null ? `${profileData.commissionRate}%` : '0%';

  const openEditModalWithState = () => {
    setEditName(displayName !== 'Broker Partner' ? displayName : '');
    setEditEmail(displayEmail);
    setEditCompany(displayCompany);
    setEditGstin(displayGstin);
    setEditAddress(displayAddress);
    setEditBank(profileData?.bankName || '');
    setIsEditModalVisible(true);
  };

  const brokerDeskItems = [
    {
      Icon: FileText,
      label: 'Sauda Ledger & Contracts',
      subtitle: 'View issued contracts & status',
      color: '#2563EB',
      bgColor: '#EFF6FF',
      target: 'DealsList',
    },
    {
      Icon: Plus,
      label: 'Issue New Sauda',
      subtitle: 'Create a new sauda contract',
      color: '#10B981',
      bgColor: '#ECFDF5',
      accent: true,
      target: 'CreateBrokerDeal',
    },
    {
      Icon: Building2,
      label: 'Manage APMC License & Firms',
      subtitle: 'Update company & mandi registration',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      target: 'BrokerAddCompany',
    },
    {
      Icon: MessageSquare,
      label: 'Messages & Chats',
      subtitle: 'Direct Buyer and Seller negotiations',
      color: '#06B6D4',
      bgColor: '#ECFEFF',
      target: 'ChatList',
    },
    {
      Icon: Mic,
      label: 'Voice Preferences',
      subtitle: 'Voice AI, custom phrases & speed',
      color: '#0B2265',
      bgColor: '#EFF6FF',
      target: 'VoicePreferences',
    },
    {
      Icon: HelpCircle,
      label: 'Broker Support Helpline',
      subtitle: '24x7 Mandi assistance: 1800-420-999',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      action: () => Alert.alert('Broker Support Desk', 'Calling APMC Toll-Free Support: 1800-420-999'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14213D" />

      {/* ─── PREMIUM LAYERED HEADER ─── */}
      <View style={styles.headerContainer}>
        {/* Soft Background Decorative Glow Circles */}
        <View style={styles.glowCircle1} />
        <View style={styles.glowCircle2} />

        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => onNavigate && onNavigate('pop')}
            activeOpacity={0.75}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Broker Profile</Text>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={openEditModalWithState}
            activeOpacity={0.75}
          >
            <Edit3 size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── PROFILE HERO OVERLAPPING HEADER ─── */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {displayName.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.verifiedCheckBadge}>
              <CheckCircle2 size={16} color="#FFFFFF" fill="#10B981" />
            </View>
          </View>

          <Text style={styles.heroNameText} numberOfLines={1}>{displayName}</Text>

          <View style={styles.contactRow}>
            <Phone size={13} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.contactText}>
              {displayMobile !== 'Not Registered' ? `+91 ${displayMobile}` : displayMobile}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.apmcBadge}>
              <ShieldCheck size={12} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.apmcBadgeText}>APMC Licensed Broker</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <CheckCircle2 size={12} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.verifiedBadgeText}>Verified Broker</Text>
            </View>
          </View>
        </View>

        {/* ─── PERFORMANCE SUMMARY STRIP ─── */}
        <View style={styles.performanceStrip}>
          <View style={styles.metricItem}>
            <View style={[styles.metricIconBox, { backgroundColor: '#2563EB12' }]}>
              <DollarSign size={16} color="#2563EB" />
            </View>
            <View style={styles.metricTextWrapper}>
              <Text style={styles.metricVal} numberOfLines={1}>{earnedBrokerage}</Text>
              <Text style={styles.metricLbl}>Earned Brokerage</Text>
            </View>
          </View>

          <View style={styles.stripDivider} />

          <View style={styles.metricItem}>
            <View style={[styles.metricIconBox, { backgroundColor: '#10B98112' }]}>
              <Briefcase size={16} color="#10B981" />
            </View>
            <View style={styles.metricTextWrapper}>
              <Text style={styles.metricVal} numberOfLines={1}>{completedDeals}</Text>
              <Text style={styles.metricLbl}>Saudas Done</Text>
            </View>
          </View>

          <View style={styles.stripDivider} />

          <View style={styles.metricItem}>
            <View style={[styles.metricIconBox, { backgroundColor: '#4F46E512' }]}>
              <Percent size={16} color="#4F46E5" />
            </View>
            <View style={styles.metricTextWrapper}>
              <Text style={styles.metricVal} numberOfLines={1}>{commissionRate}</Text>
              <Text style={styles.metricLbl}>Commission</Text>
            </View>
          </View>
        </View>

        {/* ─── BUSINESS & CONTACT DETAILS ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Business & Contact Details</Text>
            <TouchableOpacity onPress={openEditModalWithState} activeOpacity={0.7}>
              <Text style={styles.editLinkText}>Edit Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailsList}>
            {/* Mobile Row */}
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#2563EB10' }]}>
                <Phone size={16} color="#2563EB" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Mobile Number</Text>
                <Text style={styles.detailVal}>
                  {displayMobile !== 'Not Registered' ? `+91 ${displayMobile}` : 'Not Registered'}
                </Text>
              </View>
            </View>

            {/* Email Row */}
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={displayEmail ? 1 : 0.7}
              onPress={!displayEmail ? openEditModalWithState : undefined}
            >
              <View style={[styles.detailIconBox, { backgroundColor: '#06B6D410' }]}>
                <Mail size={16} color="#06B6D4" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={[styles.detailVal, !displayEmail && styles.actionText]}>
                  {displayEmail || '+ Add email address'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Registered Firm Row */}
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={displayCompany ? 1 : 0.7}
              onPress={!displayCompany ? openEditModalWithState : undefined}
            >
              <View style={[styles.detailIconBox, { backgroundColor: '#4F46E510' }]}>
                <Building2 size={16} color="#4F46E5" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Registered Brokerage Firm</Text>
                <Text style={[styles.detailVal, !displayCompany && styles.actionText]}>
                  {displayCompany || '+ Add brokerage firm name'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* APMC License / GSTIN Row */}
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={displayGstin ? 1 : 0.7}
              onPress={!displayGstin ? openEditModalWithState : undefined}
            >
              <View style={[styles.detailIconBox, { backgroundColor: '#10B98110' }]}>
                <ShieldCheck size={16} color="#10B981" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>APMC License / GSTIN</Text>
                <Text style={[styles.detailVal, !displayGstin && styles.actionText]}>
                  {displayGstin || '+ Add APMC license or GSTIN'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Operating Mandi Row */}
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={displayAddress ? 1 : 0.7}
              onPress={!displayAddress ? openEditModalWithState : undefined}
            >
              <View style={[styles.detailIconBox, { backgroundColor: '#F59E0B10' }]}>
                <MapPin size={16} color="#F59E0B" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Operating Mandi Locations</Text>
                <Text style={[styles.detailVal, !displayAddress && styles.actionText]}>
                  {displayAddress || '+ Add mandi location'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Bank Account Row */}
            <TouchableOpacity
              style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}
              activeOpacity={displayBank ? 1 : 0.7}
              onPress={!displayBank ? openEditModalWithState : undefined}
            >
              <View style={[styles.detailIconBox, { backgroundColor: '#6366F110' }]}>
                <CreditCard size={16} color="#6366F1" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payout Bank Account</Text>
                <Text style={[styles.detailVal, !displayBank && styles.actionText]}>
                  {displayBank || '+ Link payout bank account'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── BROKER DESK OPTIONS ─── */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Broker Desk</Text>
          {brokerDeskItems.map((item, index) => {
            const Icon = item.Icon;
            const isLast = index === brokerDeskItems.length - 1;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuRow,
                  item.accent && styles.accentMenuRow,
                  isLast && { borderBottomWidth: 0 },
                ]}
                onPress={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.target) {
                    onNavigate(item.target);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBox, { backgroundColor: item.bgColor }]}>
                  <Icon size={18} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, item.accent && { color: '#065F46' }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={18} color={item.accent ? '#10B981' : '#CBD5E1'} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── SEPARATED LOGOUT BUTTON ─── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout Broker Account</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Pravisti Commodity Trading v1.0.0</Text>
      </ScrollView>

      {/* ─── EDIT PROFILE ELEGANT BOTTOM SHEET MODAL ─── */}
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
            <View style={styles.modalSheet}>
              {/* Drag Handle Indicator */}
              <View style={styles.dragIndicator} />

              {/* Sticky Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Broker Profile</Text>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Full Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <View style={[styles.inputBox, focusedField === 'name' && styles.focusedInputBox]}>
                    <User size={16} color={focusedField === 'name' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter full name"
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Email Address Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[styles.inputBox, focusedField === 'email' && styles.focusedInputBox]}>
                    <Mail size={16} color={focusedField === 'email' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="Enter email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Brokerage Firm Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Brokerage Firm Name</Text>
                  <View style={[styles.inputBox, focusedField === 'company' && styles.focusedInputBox]}>
                    <Building2 size={16} color={focusedField === 'company' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      value={editCompany}
                      onChangeText={setEditCompany}
                      placeholder="Enter registered brokerage firm"
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('company')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* APMC License / GSTIN Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>APMC License / GSTIN</Text>
                  <View style={[styles.inputBox, focusedField === 'gstin' && styles.focusedInputBox]}>
                    <ShieldCheck size={16} color={focusedField === 'gstin' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      value={editGstin}
                      onChangeText={setEditGstin}
                      placeholder="Enter APMC license or GSTIN"
                      autoCapitalize="characters"
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('gstin')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Mandi Locations Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Operating Mandi Locations</Text>
                  <View style={[styles.inputBox, focusedField === 'address' && styles.focusedInputBox]}>
                    <MapPin size={16} color={focusedField === 'address' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      value={editAddress}
                      onChangeText={setEditAddress}
                      placeholder="Enter mandi locations / address"
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('address')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Payout Bank Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payout Bank Name</Text>
                  <View style={[styles.inputBox, focusedField === 'bank' && styles.focusedInputBox]}>
                    <CreditCard size={16} color={focusedField === 'bank' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      value={editBank}
                      onChangeText={setEditBank}
                      placeholder="Enter payout bank name"
                      placeholderTextColor="#94A3B8"
                      onFocus={() => setFocusedField('bank')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Sticky Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && styles.disabledSaveBtn]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <BrokerSuccessReceipt
        visible={successReceipt.visible}
        actionType={successReceipt.actionType || 'profileUpdated'}
        title={successReceipt.title}
        message={successReceipt.message}
        referenceId={successReceipt.referenceId}
        details={successReceipt.details}
        onDone={() => setSuccessReceipt({ visible: false })}
        onClose={() => setSuccessReceipt({ visible: false })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  // Layered Header
  headerContainer: {
    backgroundColor: '#3465EA',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 12) + 8 : 12,
    paddingBottom: 48,
    position: 'relative',
    overflow: 'hidden',
  },
  glowCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  glowCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(129, 140, 248, 0.20)',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  // Profile Hero
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -38,
    paddingHorizontal: 16,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#14213D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginTop: -38,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#14213D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  heroNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  apmcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  apmcBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  // Performance Strip
  performanceStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#14213D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  metricTextWrapper: {
    flexShrink: 1,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  stripDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '70%',
    alignSelf: 'center',
  },
  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#14213D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  detailsList: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    flexShrink: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flexWrap: 'wrap',
  },
  actionText: {
    color: '#2563EB',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  // Menu Rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 48,
  },
  accentMenuRow: {
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
    flexShrink: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 380,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  focusedInputBox: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledSaveBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default BrokerProfile;
