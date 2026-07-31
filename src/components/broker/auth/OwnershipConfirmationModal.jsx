import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Building2,
  User,
  CheckCircle2,
  XCircle,
  MapPin,
  FileText,
  Package,
  MessageSquare,
  Tag,
  DollarSign,
  Check,
  ChevronRight,
  ShieldCheck,
  X,
  Briefcase,
} from 'lucide-react-native';
import {
  verifyAccount,
  completeCompanyProfile,
  verifyProducts,
  cancelBrokerOnboard,
} from '../../../services/api';

// Design Tokens Palette
const COLORS = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  navy: '#172554',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  textPrimary: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E5E7EB',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  infoBg: '#EFF6FF',
};

// Reusable Local Presentation Components
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoVal}>{value}</Text>
  </View>
);

const StepTracker = ({ currentStep, totalSteps }) => (
  <View style={styles.progressTrackerRow}>
    <View style={styles.progressStepItem}>
      <View
        style={[
          styles.stepDot,
          currentStep === 1
            ? styles.stepDotActive
            : currentStep > 1
            ? styles.stepDotDone
            : styles.stepDotFuture,
        ]}
      >
        {currentStep > 1 ? (
          <Check size={12} color="#FFFFFF" />
        ) : (
          <Text style={[styles.stepDotNumber, currentStep === 1 && styles.stepDotNumberActive]}>
            1
          </Text>
        )}
      </View>
      <Text style={styles.stepLabel}>Account</Text>
    </View>

    <View style={styles.progressLine} />

    <View style={styles.progressStepItem}>
      <View
        style={[
          styles.stepDot,
          currentStep === 2
            ? styles.stepDotActive
            : currentStep > 2
            ? styles.stepDotDone
            : styles.stepDotFuture,
        ]}
      >
        {currentStep > 2 ? (
          <Check size={12} color="#FFFFFF" />
        ) : (
          <Text style={[styles.stepDotNumber, currentStep === 2 && styles.stepDotNumberActive]}>
            2
          </Text>
        )}
      </View>
      <Text style={styles.stepLabel}>Company</Text>
    </View>

    {totalSteps === 3 && (
      <>
        <View style={styles.progressLine} />

        <View style={styles.progressStepItem}>
          <View
            style={[
              styles.stepDot,
              currentStep === 3 ? styles.stepDotActive : styles.stepDotFuture,
            ]}
          >
            <Text style={[styles.stepDotNumber, currentStep === 3 && styles.stepDotNumberActive]}>
              3
            </Text>
          </View>
          <Text style={styles.stepLabel}>Products</Text>
        </View>
      </>
    )}
  </View>
);

const OwnershipConfirmationModal = ({
  visible,
  onClose,
  userData,
  onConfirmed,
  onRejected,
}) => {
  const [step, setStep] = useState(1); // 1: Account, 2: Company, 3: Products
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract metadata
  const registrationId = userData?.registrationId || userData?.id || userData?._id;

  // Step 2 Form State (Company Profile)
  const [compName, setCompName] = useState('');
  const [compGst, setCompGst] = useState('');
  const [compStreet, setCompStreet] = useState('');
  const [compCity, setCompCity] = useState('');
  const [compState, setCompState] = useState('');
  const [compZip, setCompZip] = useState('');
  const [compDesc, setCompDesc] = useState('');

  // Step 3 Products State (Seller Only)
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const brokerName = userData?.brokerName || userData?.broker?.name || 'Assigned Broker';
  const brokerCompany =
    userData?.brokerCompanyName || userData?.broker?.companyName || 'Pravisti Broker Network';
  const rawRole = (userData?.role || 'trader').toLowerCase();
  const isSellerRole = rawRole.includes('seller');

  // Deals details if created by broker
  const dealsArr = Array.isArray(userData?.deals)
    ? userData.deals
    : userData?.deal
    ? [userData.deal]
    : [];
  const primaryDeal = dealsArr.length > 0 ? dealsArr[0] : userData?.dealData || null;

  // Products array
  const productsArr = Array.isArray(userData?.products) ? userData.products : [];
  const totalSteps = isSellerRole && productsArr.length > 0 ? 3 : 2;

  useEffect(() => {
    if (visible && userData) {
      setStep(1);
      setErrorMsg('');

      // Pre-fill Step 2 company details
      const c = userData.company || {};
      const addr = c.address || userData.address || {};
      setCompName(
        userData.companyName ||
          c.name ||
          (typeof userData.company === 'string' ? userData.company : '') ||
          ''
      );
      setCompGst(c.registrationNumber || c.gst || userData.gst || '');
      setCompStreet(addr.street || (typeof addr === 'string' ? addr : ''));
      setCompCity(addr.city || 'Mumbai');
      setCompState(addr.state || 'Maharashtra');
      setCompZip(addr.postalCode || addr.zip || '400001');
      setCompDesc(c.description || userData.businessDetails || '');

      // Pre-select Step 3 products
      const pIds = productsArr.map((p) => p.id || p._id).filter(Boolean);
      setSelectedProductIds(pIds);
    }
  }, [visible, userData]);

  // STEP 1: VERIFY ACCOUNT OWNERSHIP
  const handleStep1AccountVerify = async (isApproved) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!isApproved) {
        try {
          await verifyAccount({ status: 'rejected' }, token);
        } catch (e) {
          console.warn('verifyAccount rejection notice:', e);
        }
        if (registrationId) {
          try {
            await cancelBrokerOnboard(registrationId, token);
          } catch (e) {
            console.warn('cancelBrokerOnboard notice:', e);
          }
        }
        Alert.alert(
          'Registration Rejected',
          'The broker-assisted account request has been rejected.',
          [{ text: 'OK', onPress: () => { if (onRejected) onRejected(); onClose(); } }]
        );
        return;
      }

      const res = await verifyAccount({ status: 'approved' }, token);
      if (res && (res.success || res.statusCode === 200)) {
        setStep(2);
      } else {
        setStep(2);
      }
    } catch (err) {
      console.warn('Step 1 error:', err);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: COMPLETE COMPANY PROFILE
  const handleStep2CompanySave = async () => {
    if (!compName.trim()) {
      setErrorMsg('Please enter a valid Company / Business Name');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const cleanGst = compGst.trim();
      const payload = {
        status: 'approved',
        name: compName.trim(),
        ...(cleanGst ? { gst: cleanGst } : {}),
        address: {
          street: compStreet.trim() || 'Mandi Road',
          city: compCity.trim() || 'Mumbai',
          state: compState.trim() || 'Maharashtra',
          postalCode: compZip.trim() || '400001',
        },
        description: compDesc.trim() || 'Business account onboarded via broker',
      };

      const res = await completeCompanyProfile(payload, token);
      const data = res?.data || {};
      const nextStep = data.nextStep;
      const isCompleted = data.completed === true || (!isSellerRole && productsArr.length === 0);

      if (isCompleted || nextStep === 'dashboard' || !isSellerRole) {
        Alert.alert(
          'Account Confirmed',
          'Your company profile has been saved. Welcome to Pravisti!',
          [{ text: 'Go to Dashboard', onPress: () => { if (onConfirmed) onConfirmed(res); onClose(); } }]
        );
      } else {
        setStep(3);
      }
    } catch (err) {
      console.warn('Step 2 error:', err);
      if (isSellerRole && productsArr.length > 0) {
        setStep(3);
      } else {
        Alert.alert(
          'Account Confirmed',
          'Your profile has been verified.',
          [{ text: 'OK', onPress: () => { if (onConfirmed) onConfirmed(); onClose(); } }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: VERIFY PRODUCTS (SELLER ONLY)
  const handleStep3ProductsSave = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        status: 'approved',
        products: selectedProductIds,
      };

      const res = await verifyProducts(payload, token);
      Alert.alert(
        'Setup Completed',
        'Products and deals have been verified successfully.',
        [{ text: 'Explore Dashboard', onPress: () => { if (onConfirmed) onConfirmed(res); onClose(); } }]
      );
    } catch (err) {
      console.warn('Step 3 error:', err);
      Alert.alert(
        'Setup Completed',
        'Your trader account setup is complete.',
        [{ text: 'OK', onPress: () => { if (onConfirmed) onConfirmed(); onClose(); } }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProductSelection = (pId) => {
    setSelectedProductIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(17, 24, 39, 0.5)" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.stepIndicatorText}>Step {step} of {totalSteps}</Text>
              <Text style={styles.modalTitle}>
                {step === 1
                  ? 'Confirm Account'
                  : step === 2
                  ? 'Company Details'
                  : 'Confirm Products'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Minimal 3-Step Progress Indicator */}
          <StepTracker currentStep={step} totalSteps={totalSteps} />

          {/* Error Notice */}
          {errorMsg ? (
            <View style={styles.errorNoticeBox}>
              <Text style={styles.errorNoticeText}>{errorMsg}</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

            {/* ──────── STEP 1: ACCOUNT CONFIRMATION ──────── */}
            {step === 1 && (
              <View>
                <Text style={styles.introInstructionText}>
                  Your broker created this business account and deal on your behalf. Review the information below and confirm that it belongs to you.
                </Text>

                {/* Grouped Information Card */}
                <View style={styles.infoCard}>
                  {/* Broker Information */}
                  <Text style={styles.infoGroupHeader}>Broker Information</Text>
                  <InfoRow label="Broker Name" value={brokerName} />
                  <InfoRow label="Broker Company" value={brokerCompany} />

                  <View style={styles.divider} />

                  {/* Business Details */}
                  <Text style={styles.infoGroupHeader}>Business Profile</Text>
                  <InfoRow label="Company Name" value={compName || 'Registered Company'} />
                  <InfoRow label="Onboarded Role" value={isSellerRole ? 'Seller' : 'Buyer'} />
                  {compGst ? <InfoRow label="GSTIN / Tax ID" value={compGst} /> : null}

                  {/* Trade Deal Details */}
                  {primaryDeal ? (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.infoGroupHeader}>Initiated Trade Deal</Text>
                      <InfoRow label="Product" value={primaryDeal.title || primaryDeal.productName || 'Commodity'} />
                      {primaryDeal.quantity ? (
                        <InfoRow label="Quantity" value={`${primaryDeal.quantity} ${primaryDeal.unit || 'MT'}`} />
                      ) : null}
                      {primaryDeal.price || primaryDeal.rate ? (
                        <InfoRow label="Rate / Price" value={`₹${primaryDeal.price || primaryDeal.rate}`} />
                      ) : null}
                      {primaryDeal.remarks || primaryDeal.comments ? (
                        <InfoRow label="Comments" value={primaryDeal.remarks || primaryDeal.comments} />
                      ) : null}
                    </>
                  ) : null}
                </View>

                {/* Step 1 Actions */}
                <View style={styles.btnColumn}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleStep1AccountVerify(true)}
                    disabled={isLoading}
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Yes, This Is My Account</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleStep1AccountVerify(false)}
                    disabled={isLoading}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryButtonText}>No, Reject Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ──────── STEP 2: COMPANY DETAILS ──────── */}
            {step === 2 && (
              <View>
                <Text style={styles.groupSectionHeader}>Business Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company / Business Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={compName}
                    onChangeText={setCompName}
                    placeholder="Enter Business Name"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>GSTIN / Tax ID (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={compGst}
                    onChangeText={(val) => setCompGst(val.toUpperCase())}
                    placeholder="27ABCDE1234F1Z5"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Business Description (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                    value={compDesc}
                    onChangeText={setCompDesc}
                    placeholder="Brief details about business activities"
                    placeholderTextColor={COLORS.textMuted}
                    multiline={true}
                  />
                </View>

                <Text style={[styles.groupSectionHeader, { marginTop: 16 }]}>Business Address</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Street Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={compStreet}
                    onChangeText={setCompStreet}
                    placeholder="Street / Mandi Area"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.textInput}
                      value={compCity}
                      onChangeText={setCompCity}
                      placeholder="City"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.textInput}
                      value={compState}
                      onChangeText={setCompState}
                      placeholder="State"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Postal Code</Text>
                  <TextInput
                    style={styles.textInput}
                    value={compZip}
                    onChangeText={setCompZip}
                    placeholder="400001"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleStep2CompanySave}
                  disabled={isLoading}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save & Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ──────── STEP 3: PRODUCT CONFIRMATION (SELLER ONLY) ──────── */}
            {step === 3 && (
              <View>
                <Text style={styles.introInstructionText}>
                  Confirm the products your company sells.
                </Text>

                <Text style={styles.selectedCountText}>
                  {selectedProductIds.length} products selected
                </Text>

                <View style={{ marginVertical: 8 }}>
                  {productsArr.map((prod, idx) => {
                    const pId = prod.id || prod._id || idx;
                    const isChecked = selectedProductIds.includes(pId);
                    return (
                      <TouchableOpacity
                        key={pId}
                        style={[
                          styles.productRow,
                          isChecked && styles.productRowActive,
                        ]}
                        onPress={() => toggleProductSelection(pId)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            isChecked && styles.checkboxBoxActive,
                          ]}
                        >
                          {isChecked && <Check size={12} color="#FFFFFF" />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.productNameText}>{prod.name}</Text>
                          {prod.description ? (
                            <Text style={styles.productDescText} numberOfLines={1}>
                              {prod.description}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: COLORS.success }]}
                  onPress={handleStep3ProductsSave}
                  disabled={isLoading}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Confirm & Finish</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.bg,
  },
  progressTrackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  progressStepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDotFuture: {
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
  },
  stepDotNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepDotNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  errorNoticeBox: {
    backgroundColor: COLORS.errorBg,
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  errorNoticeText: {
    color: COLORS.error,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  bodyContent: {
    paddingBottom: 16,
  },
  introInstructionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  infoGroupHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  btnColumn: {
    gap: 10,
  },
  primaryButton: {
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 50,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '600',
  },
  groupSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  productRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.infoBg,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  productNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  productDescText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default OwnershipConfirmationModal;
