import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Building2,
  User,
  Phone,
  MapPin,
  FileText,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  CircleAlert as AlertCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assistedCreatePartyAccount } from '../../../services/api';

const BrokerAssistedOnboardingModal = ({
  visible,
  onClose,
  partyType = 'Seller', // 'Seller' or 'Buyer'
  mobileNumber = '',
  brokerUser = null,
  onSuccess,
}) => {
  const [ownerName, setOwnerName] = useState('');
  const [mobile, setMobile] = useState(mobileNumber);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [products, setProducts] = useState(partyType === 'Seller' ? ['Wheat', 'Desi Chana'] : []);
  const [newProdName, setNewProdName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setOwnerName('');
      setMobile(mobileNumber || '');
      setCompanyName('');
      setAddress('');
      setGstin('');
      setProducts(partyType === 'Seller' ? ['Wheat', 'Desi Chana'] : []);
      setNewProdName('');
      setModalError('');
    }
  }, [visible, partyType, mobileNumber]);

  const handleAddProduct = () => {
    if (!newProdName.trim()) return;
    setProducts(prev => [...prev, newProdName.trim()]);
    setNewProdName('');
  };

  const handleRemoveProduct = (index) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const [modalError, setModalError] = useState('');

  const handleSubmit = async () => {
    setModalError('');
    if (!ownerName.trim()) {
      setModalError('Please enter Business Owner / Contact Name');
      return;
    }
    if (mobile.length !== 10) {
      setModalError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!companyName.trim()) {
      setModalError('Please enter Company / Business Name');
      return;
    }

    setIsLoading(true);
    try {
      const formattedProducts = (partyType.toLowerCase() === 'seller' ? products : []).map(p => {
        if (typeof p === 'object') return p;
        return {
          name: p,
          unitId: '64d0a1b2c3d4e5f6a7b8c9df',
          description: `${p} commodity`,
          hsnCode: '7601',
          gstCode: '18%',
        };
      });

      const activeRole = (partyType || 'seller').toLowerCase();
      const cleanGst = gstin.trim();

      const payload = {
        role: activeRole === 'buyer' ? 'buyer' : 'seller', // Ensure role field is lowercased "seller" or "buyer"
        name: ownerName.trim(), // Full name of business owner
        mobileNumber: mobile,
        companyName: companyName.trim(),
        companyAddress: {
          street: address.trim() || 'Mandi Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          zip: '400001',
        },
        ...(cleanGst ? { gst: cleanGst } : {}),
        businessDetails: `Dealers in ${partyType === 'Seller' ? products.join(', ') || 'commodities' : 'agricultural products'}`,
        products: formattedProducts,
      };

      const token = await AsyncStorage.getItem('userToken');
      const res = await assistedCreatePartyAccount(payload, token);
      if (res && res.success) {
        setOwnerName('');
        setCompanyName('');
        setAddress('');
        setGstin('');
        setProducts([]);
        setModalError('');
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        const msg = res?.message || '';
        if (msg.includes('E11000') || msg.includes('duplicate key') || msg.includes('registrationNumber')) {
          setModalError('A company with this GSTIN is already registered. Please enter a unique GSTIN or leave GST blank.');
        } else {
          setModalError(msg || 'Failed to create business account');
        }
      }
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.includes('E11000') || errMsg.includes('duplicate key') || errMsg.includes('registrationNumber')) {
        setModalError('A company with this GSTIN is already registered. Please enter a unique GSTIN or leave GST blank.');
      } else {
        setModalError(errMsg || 'Assisted registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <ShieldCheck size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.modalTitle}>Create {partyType} Business</Text>
                <Text style={styles.modalSub}>Broker Assisted Onboarding</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {modalError ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 10, marginHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 6 }}>
              <AlertCircle size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626', flex: 1 }}>{modalError}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            {/* Info Notice */}
            <View style={styles.infoNoticeBox}>
              <Text style={styles.infoNoticeText}>
                ⚠️ This account will be created with status <Text style={{ fontWeight: '800' }}>Pending Owner Verification</Text>. An invitation link will be sent via WhatsApp after deal creation.
              </Text>
            </View>

            {/* Owner Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Business Owner Name *</Text>
              <View style={styles.inputContainer}>
                <User size={18} color="#6366F1" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="name"
                  placeholderTextColor="#94A3B8"
                  value={ownerName}
                  onChangeText={setOwnerName}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile Number *</Text>
              <View style={styles.inputContainer}>
                <Phone size={18} color="#6366F1" style={{ marginRight: 8 }} />
                <Text style={styles.codePrefix}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="no"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>
            </View>

            {/* Company Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Company / Business Name *</Text>
              <View style={styles.inputContainer}>
                <Building2 size={18} color="#6366F1" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="company name"
                  placeholderTextColor="#94A3B8"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Company Address / Location</Text>
              <View style={styles.inputContainer}>
                <MapPin size={18} color="#6366F1" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="company address"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* GSTIN */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>GSTIN (Optional)</Text>
              <View style={styles.inputContainer}>
                <FileText size={18} color="#6366F1" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="no"
                  placeholderTextColor="#94A3B8"
                  value={gstin}
                  onChangeText={setGstin}
                />
              </View>
            </View>

            {/* Products (If Seller) */}
            {partyType === 'Seller' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Flat Commodity Products (No Category Needed)</Text>
                <View style={styles.addProdRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Enter commodity e.g. Wheat, Chana"
                    placeholderTextColor="#94A3B8"
                    value={newProdName}
                    onChangeText={setNewProdName}
                  />
                  <TouchableOpacity style={styles.addProdBtn} onPress={handleAddProduct}>
                    <Plus size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Product Tags */}
                <View style={styles.tagWrap}>
                  {products.map((p, idx) => (
                    <View key={idx} style={styles.prodChip}>
                      <Text style={styles.prodChipText}>{p}</Text>
                      <TouchableOpacity onPress={() => handleRemoveProduct(idx)} style={{ marginLeft: 6 }}>
                        <X size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create {partyType} & Continue Deal</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#3465EA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    padding: 20,
  },
  infoNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoNoticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  codePrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  addProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addProdBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  prodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  prodChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default BrokerAssistedOnboardingModal;
