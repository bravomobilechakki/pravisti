import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDeal, getUserProfile } from '../../services/api';
import { shareToWhatsApp } from '../../utils/WhatsAppService';

// Premium Category Images (Generated)
const CATEGORY_IMAGES = {
  'Cotton': 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4',
  'Wheat': 'https://images.unsplash.com/photo-1574323347407-356c2ad781fe',
  'Other': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d',
};

import { launchCamera } from 'react-native-image-picker';

const CreateDeal = ({ onNavigate, routeData }) => {
  const { width, height } = useWindowDimensions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for form fields
  const [productName, setProductName] = useState(routeData?.prefill?.product || '');
  const [productImage, setProductImage] = useState('');
  const [quantity, setQuantity] = useState(routeData?.prefill?.qty || '');
  const [price, setPrice] = useState(routeData?.prefill?.price || '');
  const [description, setDescription] = useState(routeData?.prefill?.description || '');
  const [dealDate, setDealDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Date Picker States
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickingForDate, setPickingForDate] = useState('deal'); 
  const [tempDate, setTempDate] = useState(new Date());

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Parties Selection
  const initialCompany = routeData?.originCompany || routeData?.user?.companies?.[0];
  const [party1, setParty1] = useState(initialCompany?.name || 'My Company');
  const [party2, setParty2] = useState(routeData?.prefillParty2?.name || '');
  const [party2Data, setParty2Data] = useState(routeData?.prefillParty2 ? { ...routeData.prefillParty2, isRegistered: true } : null);

  // ⚡ Dynamic Identity Sync
  const [activeUserCompany, setActiveUserCompany] = useState(initialCompany);
  const [activeUserId, setActiveUserId] = useState(routeData?.user?._id || routeData?.user?.id);

  const handleCaptureImage = () => {
    const options = {
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.8,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Camera Error', response.errorMessage || 'Unable to open camera');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setProductImage(response.assets[0].uri);
      }
    });
  };

  React.useEffect(() => {
    const refreshIdentity = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (routeData?.originCompany) {
           setActiveUserCompany(routeData.originCompany);
           setParty1(routeData.originCompany.name);
        }
        const response = await getUserProfile(token);
        if (response && response.success) {
           setActiveUserId(response.data._id || response.data.id);
           if (!routeData?.originCompany && response.data.companies?.length > 0) {
              setActiveUserCompany(response.data.companies[0]);
              setParty1(response.data.companies[0].name);
           }
        }
      } catch (e) {
        console.warn("Identity refresh failed", e);
      }
    };
    refreshIdentity();

    if (routeData?.prefillParty2) {
      setParty2(routeData.prefillParty2.name);
      setParty2Data({ ...routeData.prefillParty2, isRegistered: true });
    }
    if (routeData?.selectedContact) {
      const contact = routeData.selectedContact;
      if (routeData.pickingFor === 'party2') {
        setParty2(contact.isRegistered ? contact.company : contact.name);
        setParty2Data(contact);
      }
    }
  }, [routeData]);

  const openDatePicker = (type) => {
    setPickingForDate(type);
    const currentDate = type === 'deal' ? new Date(dealDate) : new Date(validityDate);
    setTempDate(currentDate);
    setIsDatePickerVisible(true);
  };

  const confirmDateSelection = () => {
    const formatted = tempDate.toISOString().split('T')[0];
    if (pickingForDate === 'deal') setDealDate(formatted);
    else setValidityDate(formatted);
    setIsDatePickerVisible(false);
  };

  const handleCreateDeal = async () => {
    if (!productName || !quantity || !price || !party2) {
      Alert.alert('Missing Fields', 'Please ensure Product, Quantity, Price, and Buyer ID are entered.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const numericQuantity = Math.floor(Number(quantity));
      const numericPrice = Math.floor(Number(price));

      const originCompanyId = activeUserCompany?._id || activeUserCompany?.id;
      const userId = activeUserId;
      
      // Get the ID from state (which might be typed now)
      const p2Id = party2Data?.id || party2Data?._id || party2; 

      if (!userId || !originCompanyId || !p2Id) {
        Alert.alert('Identity Error', 'User or Company IDs are missing from the agreement.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        party1: {
          userId: String(userId),
          companyId: String(originCompanyId)
        },
        party2: {
          companyId: String(p2Id)
        },
        product: {
          name: String(productName),
          image: String(productImage || ""),
          quantity: Number(numericQuantity),
          price: Number(numericPrice)
        },
        dealDate: String(dealDate),
        validityDate: String(validityDate),
        description: String(description || "High quality commodity trade.")
      };

      const response = await createDeal(payload, token);
      if (response && response.success) {
        Alert.alert('Success', `Sauda Established Successfully!`);
        onNavigate('DealsList', {}, { refresh: true });
      }
    } catch (error) {
      Alert.alert('Trade Error', error.message || 'Server rejected the agreement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('pop')}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Sauda</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.masterForm}>
            {/* PARTY 1 (ORIGIN) */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Origin Party (Seller)</Text>
              <View style={[styles.premiumInput, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]}>
                <Text style={styles.identityMain}>{party1}</Text>
              </View>
            </View>

            {/* PARTY 2 (BUYER) */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Counter Party (Buyer)</Text>
              <TouchableOpacity 
                style={[styles.selectorInput, party2Data && styles.activeSelector]} 
                onPress={() => onNavigate('ContactPicker', { pickingFor: 'party2' })}
              >
                {party2Data ? (
                  <View style={styles.identitySummary}>
                    <View style={styles.identityAvatar}><Text style={styles.avatarInitial}>{party2Data.company?.[0] || party2Data.name?.[0]}</Text></View>
                    <View>
                      <Text style={styles.identityMain}>{party2Data.company || party2Data.name}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Select Company to Establish Sauda</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Product Name</Text>
              <TextInput style={styles.premiumInput} placeholder="e.g. Cotton Fabric" value={productName} onChangeText={setProductName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Product Documentation</Text>
              <TouchableOpacity 
                style={styles.cameraCard}
                onPress={handleCaptureImage}
              >
                <Text style={styles.cameraIcon}>📸</Text>
                <Text style={styles.cameraText}>{productImage ? 'Change Product Photo' : 'Capture Product Image'}</Text>
                {productImage && <Text style={styles.cameraSubtext} numberOfLines={1}>Attached: {productImage.split('/').pop()}</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.dualFieldRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput style={styles.premiumInput} placeholder="0" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Price</Text>
                <TextInput style={styles.premiumInput} placeholder="0" value={price} onChangeText={setPrice} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.dualFieldRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Agreement Date</Text>
                <TouchableOpacity style={styles.selectorInput} onPress={() => openDatePicker('deal')}>
                  <Text style={styles.selectorText}>{dealDate}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Validity Date</Text>
                <TouchableOpacity style={styles.selectorInput} onPress={() => openDatePicker('validity')}>
                  <Text style={styles.selectorText}>{validityDate}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={styles.textArea} placeholder="Trade terms..." value={description} onChangeText={setDescription} multiline />
            </View>

            <TouchableOpacity style={[styles.initiateButton, isSubmitting && styles.buttonDimmed]} activeOpacity={0.9} onPress={handleCreateDeal} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.initiateButtonText}>CREATE SAUDA</Text>}
            </TouchableOpacity>

          </View>
        </ScrollView>

        {/* CUSTOM DATE PICKER MODAL */}
        {isDatePickerVisible && (
          <View style={styles.pickerOverlay}>
             <View style={styles.pickerContent}>
                <Text style={styles.pickerHeader}>Select {pickingForDate === 'deal' ? 'Agreement' : 'Validity'} Date</Text>
                
                <View style={styles.calendarGrid}>
                   {/* SIMPLE GRID PICKER */}
                   <View style={styles.pickerControls}>
                      <TouchableOpacity onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setMonth(tempDate.getMonth() - 1);
                        setTempDate(newDate);
                      }}>
                        <Text style={styles.navText}>‹ Prev</Text>
                      </TouchableOpacity>
                      <Text style={styles.monthDisplay}>{months[tempDate.getMonth()]} {tempDate.getFullYear()}</Text>
                      <TouchableOpacity onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setMonth(tempDate.getMonth() + 1);
                        setTempDate(newDate);
                      }}>
                        <Text style={styles.navText}>Next ›</Text>
                      </TouchableOpacity>
                   </View>

                   <View style={styles.daysGrid}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(day => {
                        const isSelected = tempDate.getDate() === day;
                        return (
                          <TouchableOpacity 
                            key={day} 
                            style={[styles.dayCell, isSelected && styles.activeDayCell]}
                            onPress={() => {
                              const newDate = new Date(tempDate);
                              newDate.setDate(day);
                              setTempDate(newDate);
                            }}
                          >
                            <Text style={[styles.dayText, isSelected && styles.activeDayText]}>{day}</Text>
                          </TouchableOpacity>
                        );
                      })}
                   </View>
                </View>

                <View style={styles.pickerActions}>
                   <TouchableOpacity style={styles.cancelAction} onPress={() => setIsDatePickerVisible(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.confirmAction} onPress={confirmDateSelection}>
                      <Text style={styles.confirmText}>Confirm Date</Text>
                   </TouchableOpacity>
                </View>
             </View>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  visualContainer: {
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: -40,
  },
  visualImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  visualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  categoryPicker: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    flexDirection: 'row',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activeCatChip: {
    backgroundColor: '#FFFFFF',
  },
  catText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  activeCatText: {
    color: '#0F172A',
  },
  masterForm: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingTop: 32,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  premiumInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 54,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockedIdentity: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  lockIcon: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B82F6',
  },
  selectorInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeSelector: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    height: 64,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  identitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  identityMain: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  identitySub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  iconAction: {
    fontSize: 18,
    color: '#CBD5E1',
  },
  dualFieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    minHeight: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
  },
  initiateButton: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDimmed: {
    opacity: 0.5,
  },
  initiateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cameraCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  cameraIcon: {
    fontSize: 32,
  },
  cameraText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cameraSubtext: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  // PICKER STYLES
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  pickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  pickerHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  navText: {
    color: '#3B82F6',
    fontWeight: '800',
    fontSize: 14,
  },
  monthDisplay: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  dayCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeDayCell: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  activeDayText: {
    color: '#FFFFFF',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  cancelAction: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAction: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '800',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default CreateDeal;
