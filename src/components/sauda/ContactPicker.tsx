import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  useWindowDimensions,
} from 'react-native';

const ContactPicker = ({ onNavigate, routeData }) => {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for contacts
  const contacts = [
    { id: '1', name: 'Ramesh Kumar', mobile: '9876543210', isRegistered: true, company: 'Kumar Grains' },
    { id: '2', name: 'Suresh Singh', mobile: '8765432109', isRegistered: true, company: 'Singh & Sons' },
    { id: '3', name: 'Anil Gupta', mobile: '7654321098', isRegistered: false },
    { id: '4', name: 'Vijay Sharma', mobile: '9988776655', isRegistered: true, company: 'Sharma Logistics' },
    { id: '5', name: 'Manoj Verma', mobile: '8877665544', isRegistered: false },
  ];

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.mobile.includes(searchQuery)
  );

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => onNavigate('CreateDeal', { selectedContact: item })}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.contactDetails}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactMobile}>{item.mobile}</Text>
        {item.isRegistered ? (
          <View style={styles.registeredBadge}>
             <Text style={styles.registeredText}>Registered: {item.company}</Text>
          </View>
        ) : (
          <Text style={styles.unregisteredText}>Not on Pravisti - Invite via WhatsApp</Text>
        )}
      </View>
      <Text style={styles.selectIcon}>→</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('CreateDeal')}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Contact</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or mobile..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No contacts found</Text>
            <TouchableOpacity style={styles.addManualButton}>
               <Text style={styles.addManualText}>+ Add Number Manually</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  searchContainer: {
    padding: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactMobile: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  registeredBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  registeredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  unregisteredText: {
    fontSize: 11,
    color: '#EF4444',
    fontStyle: 'italic',
  },
  selectIcon: {
    fontSize: 20,
    color: '#CBD5E1',
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 15,
  },
  addManualButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  addManualText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});

export default ContactPicker;
