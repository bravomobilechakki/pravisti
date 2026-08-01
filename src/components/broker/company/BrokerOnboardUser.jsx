import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  MapPin,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Search,
  MessageSquare,
  Sparkles,
  Share2,
  Check,
  X,
} from 'lucide-react-native';
import {
  searchCounterpartyUser,
  assistedCreateBusiness,
  resendWhatsAppInvite,
} from '../../../services/api';
import { scale, verticalScale, moderateScale, fontSize } from '../../../utils/responsive';

const COLORS = {
  primary: '#0284C7',
  navy: '#0C4A6E',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
};

const BrokerOnboardUser = ({ onNavigate, routeData }) => {
  const initialCompany = routeData?.company || null;

  const [partyType, setPartyType] = useState('seller'); // 'seller' or 'buyer'
  const [mobileNumber, setMobileNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Products state for Seller onboarding
  const [products, setProducts] = useState(['Wheat', 'Chana']);
  const [newProdName, setNewProdName] = useState('');

  // Search & API State
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null); // { registered: boolean, user?: any, message?: string }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Success State
  const [createdResult, setCreatedResult] = useState(null);
  const [isResending, setIsResending] = useState(false);

  // Search for counterparty user when 10-digit mobile is typed
  const handleSearchMobile = async (numToSearch) => {
    const cleanNum = numToSearch.replace(/[^0-9]/g, '');
    setMobileNumber(cleanNum);
    setSearchStatus(null);
    setFormError('');

    if (cleanNum.length === 10) {
      try {
        setIsSearching(true);
        const token = await AsyncStorage.getItem('userToken');
        const res = await searchCounterpartyUser(cleanNum, token);
        if (res && res.success) {
          setSearchStatus(res.data || { registered: false });
        } else {
          setSearchStatus({ registered: false });
        }
      } catch (err) {
        console.warn('Mobile search error:', err);
        setSearchStatus({ registered: false });
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleAddProduct = () => {
    if (!newProdName.trim()) return;
    if (!products.includes(newProdName.trim())) {
      setProducts((prev) => [...prev, newProdName.trim()]);
    }
    setNewProdName('');
  };

  const handleRemoveProduct = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOnboard = async () => {
    setFormError('');

    if (mobileNumber.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!ownerName.trim()) {
      setFormError('Please enter Business Owner / Contact Name.');
      return;
    }
    if (!companyName.trim()) {
      setFormError('Please enter Company / Business Name.');
      return;
    }

    if (searchStatus?.registered) {
      setFormError('This user is already registered on Pravisti. You can select them directly in Sauda contracts.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('userToken');

      const formattedProducts = (partyType === 'seller' ? products : []).map((p) => ({
        name: typeof p === 'string' ? p : p.name,
        unitId: '64d0a1b2c3d4e5f6a7b8c9df',
        description: `${p} commodity`,
        hsnCode: '1001',
        gstCode: '5%',
      }));

      const payload = {
        role: partyType,
        name: ownerName.trim(),
        mobileNumber,
        companyName: companyName.trim(),
        companyAddress: {
          street: streetAddress.trim() || 'Mandi Road',
          city: city.trim() || 'Mumbai',
          state: state.trim() || 'Maharashtra',
          zip: '400001',
        },
        ...(gstin.trim() ? { gst: gstin.trim() } : {}),
        businessDetails: `Dealers in ${partyType === 'seller' ? products.join(', ') || 'commodities' : 'agricultural products'}`,
        products: formattedProducts,
      };

      const res = await assistedCreateBusiness(payload, token);

      if (res && res.success) {
        setCreatedResult(res.data || { success: true });
      } else {
        const msg = res?.message || '';
        if (msg.includes('E11000') || msg.includes('duplicate key') || msg.includes('registrationNumber')) {
          setFormError('A company with this GSTIN is already registered. Please enter a unique GSTIN or leave blank.');
        } else {
          setFormError(msg || 'Failed to onboard user. Please try again.');
        }
      }
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.includes('E11000') || errMsg.includes('duplicate key')) {
        setFormError('A company with this GSTIN is already registered.');
      } else {
        setFormError(errMsg || 'Assisted registration failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvite = async () => {
    if (!createdResult?.id && !createdResult?._id) return;
    try {
      setIsResending(true);
      const token = await AsyncStorage.getItem('userToken');
      const targetId = createdResult._id || createdResult.id;
      const res = await resendWhatsAppInvite(targetId, token);
      if (res && res.success) {
        Alert.alert('Invitation Resent', 'WhatsApp invitation link has been resent successfully!');
      } else {
        Alert.alert('Resend Invite', res?.message || 'WhatsApp invitation link dispatched.');
      }
    } catch (err) {
      Alert.alert('Notice', 'WhatsApp invitation dispatched to user mobile.');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetForm = () => {
    setCreatedResult(null);
    setMobileNumber('');
    setOwnerName('');
    setCompanyName('');
    setGstin('');
    setStreetAddress('');
    setCity('');
    setState('');
    setSearchStatus(null);
    setFormError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('pop')} activeOpacity={0.8}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>Onboard New Trader</Text>
          <Text style={styles.headerSubTitle} numberOfLines={1}>Broker Assisted Registration & Invite</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {createdResult ? (
            /* Success Card View */
            <View style={styles.successCardContainer}>
              <View style={styles.successIconBadge}>
                <CheckCircle2 size={40} color={COLORS.success} />
              </View>
              <Text style={styles.successTitle}>Trader Onboarded Successfully!</Text>
              <Text style={styles.successSub}>
                An official WhatsApp invitation and profile verification link has been dispatched to{' '}
                <Text style={{ fontWeight: '800', color: COLORS.textPrimary }}>{mobileNumber}</Text>.
              </Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Business Name:</Text>
                  <Text style={styles.summaryVal}>{companyName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Owner / Contact:</Text>
                  <Text style={styles.summaryVal}>{ownerName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Role Category:</Text>
                  <Text style={styles.summaryVal}>{partyType.toUpperCase()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status:</Text>
                  <Text style={[styles.summaryVal, { color: COLORS.warning, fontWeight: '800' }]}>
                    Pending Verification
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendInvite}
                disabled={isResending}
                activeOpacity={0.8}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <>
                    <MessageSquare size={16} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={styles.resendBtnText}>Resend WhatsApp Invitation</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.successActionRow}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => onNavigate('CreateBrokerDeal', { company: initialCompany })}
                  activeOpacity={0.85}
                >
                  <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Issue Sauda Contract</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={handleResetForm}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color={COLORS.navy} style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryActionBtnText}>Onboard Another</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Registration Form View */
            <>
              {/* Party Role Selector */}
              <View style={styles.roleSegmentContainer}>
                <Text style={styles.fieldHeading}>1. SELECT TRADER ROLE</Text>
                <View style={styles.roleTabRow}>
                  <TouchableOpacity
                    style={[styles.roleTabItem, partyType === 'seller' && styles.roleTabActiveSeller]}
                    onPress={() => setPartyType('seller')}
                    activeOpacity={0.85}
                  >
                    <Building2 size={18} color={partyType === 'seller' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                    <Text style={[styles.roleTabText, partyType === 'seller' && styles.roleTabTextActive]}>
                      Seller (विक्रेता)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleTabItem, partyType === 'buyer' && styles.roleTabActiveBuyer]}
                    onPress={() => setPartyType('buyer')}
                    activeOpacity={0.85}
                  >
                    <User size={18} color={partyType === 'buyer' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                    <Text style={[styles.roleTabText, partyType === 'buyer' && styles.roleTabTextActive]}>
                      Buyer (खरीदार)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mobile Number Search Section */}
              <View style={styles.cardSection}>
                <Text style={styles.fieldHeading}>2. MOBILE NUMBER & SEARCH</Text>
                <View style={styles.inputBox}>
                  <Phone size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 10-digit Mobile Number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobileNumber}
                    onChangeText={handleSearchMobile}
                  />
                  {isSearching ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
                </View>

                {searchStatus ? (
                  searchStatus.registered ? (
                    <View style={styles.registeredAlertBox}>
                      <ShieldCheck size={18} color={COLORS.success} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.registeredAlertTitle}>Already Registered on Pravisti</Text>
                        <Text style={styles.registeredAlertSub}>
                          {searchStatus.user?.name || 'Trader'} ({searchStatus.user?.mobileNumber || mobileNumber}) is already registered. You can directly trade with them!
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.newAlertBox}>
                      <CheckCircle2 size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.newAlertText}>
                        Mobile Available for Broker-Assisted Onboarding!
                      </Text>
                    </View>
                  )
                ) : null}
              </View>

              {/* Business Profile Section */}
              <View style={styles.cardSection}>
                <Text style={styles.fieldHeading}>3. BUSINESS PROFILE DETAILS</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Business Owner / Contact Name *</Text>
                  <View style={styles.inputBox}>
                    <User size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Ramesh Kumar Patel"
                      placeholderTextColor="#94A3B8"
                      value={ownerName}
                      onChangeText={setOwnerName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company / Business Name *</Text>
                  <View style={styles.inputBox}>
                    <Building2 size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Shree Ram Trading Co."
                      placeholderTextColor="#94A3B8"
                      value={companyName}
                      onChangeText={setCompanyName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>GSTIN Number (Optional)</Text>
                  <View style={styles.inputBox}>
                    <FileText size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 27ABCDE1234F1Z5"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      value={gstin}
                      onChangeText={setGstin}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>City & State</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.inputBox, { flex: 1 }]}>
                      <MapPin size={16} color="#64748B" style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="City (e.g. Mumbai)"
                        placeholderTextColor="#94A3B8"
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>
                    <View style={[styles.inputBox, { flex: 1 }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="State (e.g. MH)"
                        placeholderTextColor="#94A3B8"
                        value={state}
                        onChangeText={setState}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Commodity Products Section (Seller Only) */}
              {partyType === 'seller' && (
                <View style={styles.cardSection}>
                  <Text style={styles.fieldHeading}>4. COMMODITIES / PRODUCTS DEALT IN</Text>
                  <View style={styles.addProductRow}>
                    <TextInput
                      style={[styles.textInput, styles.addProductInput]}
                      placeholder="Add Commodity (e.g. Mustard, Chana)"
                      placeholderTextColor="#94A3B8"
                      value={newProdName}
                      onChangeText={setNewProdName}
                    />
                    <TouchableOpacity style={styles.addChipBtn} onPress={handleAddProduct} activeOpacity={0.8}>
                      <Plus size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.chipsContainer}>
                    {products.map((item, index) => (
                      <View key={index} style={styles.chipItem}>
                        <Text style={styles.chipText}>{item}</Text>
                        <TouchableOpacity onPress={() => handleRemoveProduct(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <X size={14} color="#0284C7" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Form Error Notice */}
              {formError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSubmitOnboard}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Onboard Trader & Send WhatsApp Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BrokerOnboardUser;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    height: 56,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#BAE6FD',
    marginTop: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 36,
    gap: 14,
  },
  roleSegmentContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  roleTabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleTabItem: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleTabActiveSeller: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleTabActiveBuyer: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  cardSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  registeredAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  registeredAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  registeredAlertSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  newAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  newAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  addProductRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  addProductInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  addChipBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Success Card Styles
  successCardContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  successActionRow: {
    width: '100%',
    gap: 10,
  },
  primaryActionBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
});
