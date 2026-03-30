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
} from 'react-native';
import { shareToWhatsApp } from '../../utils/WhatsAppService';


const CreateDeal = ({ onNavigate, routeData }) => {
  const { height } = useWindowDimensions();
  
  // State for form fields
  const [productName, setProductName] = useState(routeData?.prefill?.product || '');
  const [quantity, setQuantity] = useState(routeData?.prefill?.qty || '');
  const [price, setPrice] = useState(routeData?.prefill?.price || '');
  const [dealDate, setDealDate] = useState(routeData?.prefill?.dealDate || '26 Mar 2024');
  const [validityDate, setValidityDate] = useState(routeData?.prefill?.validityDate || '30 Mar 2024');
  
  // Parties Selection (SRS 5.2 & 6.1)
  const [party1, setParty1] = useState(routeData?.prefill?.party1 || 'My Own Company');
  const [party2, setParty2] = useState(routeData?.prefill?.party2 || '');
  const [broker, setBroker] = useState(routeData?.prefill?.broker || '');
  
  // Handling selected contact from ContactPicker
  React.useEffect(() => {
    if (routeData?.selectedContact) {
      const contact = routeData.selectedContact;
      if (routeData.pickingFor === 'party2') {
        setParty2(contact.isRegistered ? contact.company : contact.name);
      } else if (routeData.pickingFor === 'broker') {
        setBroker(contact.isRegistered ? contact.company : contact.name);
      }

      if (!contact.isRegistered) {
        Alert.alert(
          'Unregistered User',
          `${contact.name} is not on Pravisti yet. You can still create the deal, but you'll need to share the details via WhatsApp.`,
          [{ text: 'OK' }]
        );
      }
    }
  }, [routeData]);

  const handleCreateDeal = () => {
    // Basic verification and WhatsApp integration (SRS 8 & 9)
    const dealData = {
       product: productName,
       qty: quantity,
       price: price,
       parties: `${party1} → ${party2}`
    };

    if (routeData?.selectedContact && !routeData.selectedContact.isRegistered) {
       Alert.alert(
         'Share via WhatsApp',
         'Would you like to notify the party via WhatsApp now?',
         [
           { text: 'Later', onPress: () => onNavigate('DealsList') },
           { text: 'Share Now', onPress: () => {
              shareToWhatsApp(dealData);
              onNavigate('DealsList');
           }}
         ]
       );
    } else {
       onNavigate('DealsList');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('DealsList')}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Sauda</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Hero Image / Upload Placeholder */}
          <View style={[styles.imageUploadContainer, { height: height * 0.25 }]}>
            <TouchableOpacity style={styles.uploadButton} activeOpacity={0.7}>
              <View style={styles.uploadIconContainer}>
                <Text style={styles.uploadIcon}>📷</Text>
              </View>
              <Text style={styles.uploadText}>+ Add Product Image</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                value={productName}
                onChangeText={setProductName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter price"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Deal Date</Text>
                <TouchableOpacity style={styles.dateInput}>
                  <Text style={styles.dateText}>{dealDate}</Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Validity Date</Text>
                <TouchableOpacity style={styles.dateInput}>
                  <Text style={styles.dateText}>{validityDate}</Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Parties Involved</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Party 1 (Seller - My Company)</Text>
              <TouchableOpacity style={styles.selectInput} disabled>
                <Text style={[styles.selectText, { color: '#0F172A' }]}>{party1}</Text>
                <Text style={styles.arrowIcon}>🔒</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Party 2 (Buyer)</Text>
              <TouchableOpacity 
                style={styles.selectInput}
                onPress={() => onNavigate('ContactPicker', { pickingFor: 'party2' })}
              >
                <Text style={[styles.selectText, party2 && { color: '#0F172A' }]}>
                  {party2 || 'Select from contacts'}
                </Text>
                <Text style={styles.arrowIcon}>👤</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Broker (Optional)</Text>
              <TouchableOpacity 
                style={styles.selectInput}
                onPress={() => onNavigate('ContactPicker', { pickingFor: 'broker' })}
              >
                <Text style={[styles.selectText, broker && { color: '#0F172A' }]}>
                  {broker || 'Select broker from contacts'}
                </Text>
                <Text style={styles.arrowIcon}>🤝</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.createButton}
              activeOpacity={0.8}
              onPress={handleCreateDeal}
            >
              <Text style={styles.createButtonText}>Create Deal</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
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
  imageUploadContainer: {
    height: 200,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -40,
  },
  uploadButton: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  uploadIcon: {
    fontSize: 30,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    shadowColor: '#3170CD',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateText: {
    fontSize: 14,
    color: '#0F172A',
  },
  calendarIcon: {
    fontSize: 16,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  arrowIcon: {
    fontSize: 12,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  createButton: {
    backgroundColor: '#3170cdff',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreateDeal;
