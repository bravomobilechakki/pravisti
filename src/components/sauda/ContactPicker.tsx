import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { filterContacts, getCompaniesByNumber } from '../../services/api';
import Contacts from 'react-native-contacts';
import {
  ArrowLeft,
  Phone,
  Building2,
  AlertTriangle,
  Users,
  Search,
  Mail,
  ChevronRight,
} from 'lucide-react-native';

interface CompanyInfo {
  companyId: string;
  companyName: string;
  companyType: string;
  logo: string | null;
}

interface Contact {
  id: string;
  name: string;
  mobile: string;
  isRegistered: boolean;
  companies?: CompanyInfo[];
  company?: string;
  companyId?: string;
}

interface RouteData {
  pickingFor?: string;
  [key: string]: any;
}

interface ContactPickerProps {
  onNavigate: (screen: string, data?: any, options?: any) => void;
  routeData?: RouteData;
}

const LOCAL_ADDRESS_BOOK = [
  { name: 'Raushan Kumar', phone: '+916202579799' },
  { name: 'Rahul Singh', phone: '+917061901464' },
];

const ContactPicker: React.FC<ContactPickerProps> = ({ onNavigate, routeData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const role = routeData?.role || 'seller';
  const getRoleTheme = () => {
    if (role === 'buyer') return { color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', glow: '#0284C7' };
    if (role === 'broker') return { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', glow: '#7C3AED' };
    return { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', glow: '#059669' };
  };
  const rTheme = getRoleTheme();

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Bottom Sheet Modal for Company Selection
  const [selectedContactForModal, setSelectedContactForModal] = useState<Contact | null>(null);
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);

  // Live lookup states for newly typed numbers
  const [searchingNumber, setSearchingNumber] = useState(false);
  const [lookupContact, setLookupContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'invite'>('active');

  // Check existing permission state on mount
  useEffect(() => {
    const checkPermissionState = async () => {
      try {
        const savedPermission = await AsyncStorage.getItem('contact_permission_granted');
        if (savedPermission === 'true') {
          setHasPermission('granted');
          syncContacts();
          return;
        }

        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS
          );
          if (granted) {
            setHasPermission('granted');
            syncContacts();
          } else {
            setHasPermission('undetermined');
          }
        } else {
          // iOS native check
          Contacts.checkPermission().then(permission => {
            if (permission === 'authorized') {
              setHasPermission('granted');
              syncContacts();
            } else {
              setHasPermission('undetermined');
            }
          });
        }
      } catch (e) {
        console.warn('Error checking contacts permission:', e);
      }
    };

    checkPermissionState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Address Book
  const syncContacts = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      let contactsToSend = LOCAL_ADDRESS_BOOK; // fallback initially

      // If we have permission, read actual contacts from device address book
      try {
        const nativeContacts = await Contacts.getAll();
        if (nativeContacts && nativeContacts.length > 0) {
          const parsed = nativeContacts
            .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
            .map(c => {
              const rawPhone = c.phoneNumbers[0].number || '';
              // Clean phone numbers: strip space, dashes, parentheses
              let cleanPhone = rawPhone.replace(/[\s\-\(\)]/g, '');
              if (cleanPhone.length === 10) {
                cleanPhone = '+91' + cleanPhone;
              } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
                cleanPhone = '+' + cleanPhone;
              }
              return {
                name: `${c.givenName || ''} ${c.familyName || ''}`.trim() || 'Pravisti Contact',
                phone: cleanPhone,
              };
            })
            .filter(c => c.phone.startsWith('+')); // only keep valid mobile formats

          if (parsed.length > 0) {
            contactsToSend = parsed;
          }
        }
      } catch (nativeErr) {
        console.warn('Could not read native contacts, falling back:', nativeErr);
      }

      const response = await filterContacts(contactsToSend, token);
      if (response && response.success && response.data) {
        const mappedContacts: Contact[] = response.data.map((item: any) => {
          const hasCompany = item.companies && item.companies.length > 0;
          return {
            id: item.userId || `unreg_${item.phone}`,
            name: item.name || item.registeredName || 'Pravisti User',
            mobile: item.phone,
            isRegistered: item.isRegistered || false,
            companies: item.companies || [],
            company: hasCompany ? item.companies[0].companyName : undefined,
            companyId: hasCompany ? item.companies[0].companyId : undefined,
          };
        });
        setContacts(mappedContacts);
      } else {
        setFallbackData();
      }
    } catch (err) {
      console.warn('Sync contacts failed, using fallback data:', err);
      setFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  const setFallbackData = () => {
    const fallback: Contact[] = LOCAL_ADDRESS_BOOK.map((c, i) => ({
      id: String(i + 1),
      name: c.name,
      mobile: c.phone,
      isRegistered: true,
      company: i === 0 ? 'Mobile chakki' : undefined,
      companyId: i === 0 ? '6a0d784381e9215467e6d3e2' : undefined,
      companies: i === 0 ? [{ companyId: '6a0d784381e9215467e6d3e2', companyName: 'Mobile chakki', companyType: 'broker', logo: null }] : [],
    }));
    setContacts(fallback);
  };

  // Request Access Flow
  const handleRequestAccess = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Access Permission',
            message: 'Pravisti needs access to your contacts to check if your business partners are already on the platform.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          await AsyncStorage.setItem('contact_permission_granted', 'true');
          setHasPermission('granted');
          syncContacts();
        } else {
          setHasPermission('denied');
          // Direct fallback to show mock list directly so they aren't blocked
          syncContacts();
        }
      } else {
        // iOS Native Request using react-native-contacts
        Contacts.requestPermission().then(async (permission) => {
          if (permission === 'authorized') {
            await AsyncStorage.setItem('contact_permission_granted', 'true');
            setHasPermission('granted');
            syncContacts();
          } else {
            setHasPermission('denied');
            syncContacts();
          }
        });
      }
    } catch (err) {
      console.warn('Contacts request permission error:', err);
    }
  };

  const handleSkipPermission = () => {
    setHasPermission('denied');
    syncContacts(); // Fallback gracefully
  };

  // Live lookup when a valid 10-digit number is typed
  useEffect(() => {
    const performLookup = async () => {
      const trimmed = searchQuery.replace(/\D/g, ''); // strip non-digits
      if (trimmed.length >= 10) {
        setSearchingNumber(true);
        try {
          const token = await AsyncStorage.getItem('userToken');
          const formattedNumber = trimmed.startsWith('91') && trimmed.length > 10 ? `+${trimmed}` : `+91${trimmed.slice(-10)}`;

          const response = await getCompaniesByNumber(formattedNumber, token);
          if (response && response.success && response.data && response.data.length > 0) {
            const companyList: CompanyInfo[] = response.data.map((c: any) => ({
              companyId: c.companyId,
              companyName: c.companyName,
              companyType: c.companyType || 'broker',
              logo: c.logo || null,
            }));

            const foundContact: Contact = {
              id: `lookup_${Date.now()}`,
              name: response.data[0].contactPersonName || `User (${formattedNumber})`,
              mobile: formattedNumber,
              isRegistered: true,
              companies: companyList,
              company: companyList[0].companyName,
              companyId: companyList[0].companyId,
            };
            setLookupContact(foundContact);
          } else {
            setLookupContact(null);
          }
        } catch (e) {
          console.warn('Number lookup failed:', e);
          setLookupContact(null);
        } finally {
          setSearchingNumber(false);
        }
      } else {
        setLookupContact(null);
      }
    };

    const timer = setTimeout(() => {
      performLookup();
    }, 600); // debounce API call

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectContact = (contact: Contact) => {
    if (contact.isRegistered && contact.companies && contact.companies.length > 1) {
      setSelectedContactForModal(contact);
      setIsCompanyModalVisible(true);
    } else {
      const selected = {
        ...contact,
        company: contact.companies && contact.companies.length > 0 ? contact.companies[0].companyName : contact.company,
        companyId: contact.companies && contact.companies.length > 0 ? contact.companies[0].companyId : contact.companyId,
      };
      onNavigate('CreateDeal', {
        selectedContact: selected,
        pickingFor: routeData?.pickingFor,
        companyId: routeData?.companyId,
        companyName: routeData?.companyName,
        role: routeData?.role,
        originCompany: routeData?.originCompany,
        company: routeData?.company,
        prefill: routeData?.prefill,
      });
    }
  };

  const handleSelectCompanyFromModal = (company: CompanyInfo) => {
    if (!selectedContactForModal) return;
    const finalContact = {
      ...selectedContactForModal,
      company: company.companyName,
      companyId: company.companyId,
    };
    setIsCompanyModalVisible(false);
    onNavigate('CreateDeal', {
      selectedContact: finalContact,
      pickingFor: routeData?.pickingFor,
      companyId: routeData?.companyId,
      companyName: routeData?.companyName,
      role: routeData?.role,
      originCompany: routeData?.originCompany,
      company: routeData?.company,
      prefill: routeData?.prefill,
    });
  };

  const handleAddManualNumber = () => {
    if (!searchQuery.trim()) return;
    const manualContact: Contact = {
      id: `manual_${Date.now()}`,
      name: searchQuery,
      mobile: searchQuery,
      isRegistered: false,
    };
    onNavigate('CreateDeal', {
      selectedContact: manualContact,
      pickingFor: routeData?.pickingFor,
      companyId: routeData?.companyId,
      companyName: routeData?.companyName,
      role: routeData?.role,
      originCompany: routeData?.originCompany,
      company: routeData?.company,
      prefill: routeData?.prefill,
    });
  };

  // Categorize synced contacts defensively based on guide schema:
  // - Category A (Active): Registered & has active companies
  // - Category B (Pending): Registered but has no companies (setup pending)
  // - Category C (Invite): Unregistered
  const activeMembers = contacts.filter(c => c.isRegistered && c.companies && c.companies.length > 0);
  const pendingMembers = contacts.filter(c => c.isRegistered && (!c.companies || c.companies.length === 0));
  const inviteContacts = contacts.filter(c => !c.isRegistered);

  // Select the list corresponding to the active category tab
  const getTabContacts = () => {
    switch (activeTab) {
      case 'active': return activeMembers;
      case 'pending': return pendingMembers;
      case 'invite': return inviteContacts;
      default: return activeMembers;
    }
  };

  // Filter based on search query
  const tabContacts = getTabContacts();
  const filteredContacts = tabContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.mobile.includes(searchQuery)
  );

  // Combine synced tab contacts and live lookup results (if it matches the tab filter category)
  const dataToRender = [...filteredContacts];
  if (lookupContact) {
    const isLookupActive = lookupContact.companies && lookupContact.companies.length > 0;
    const isLookupPending = lookupContact.isRegistered && (!lookupContact.companies || lookupContact.companies.length === 0);
    const isLookupInvite = !lookupContact.isRegistered;

    const matchesActiveTab =
      (activeTab === 'active' && isLookupActive) ||
      (activeTab === 'pending' && isLookupPending) ||
      (activeTab === 'invite' && isLookupInvite);

    if (matchesActiveTab && !filteredContacts.some(c => c.mobile === lookupContact.mobile)) {
      dataToRender.unshift(lookupContact);
    }
  }

  const renderContactItem = ({ item }: { item: Contact }) => {
    // 🟢 Category A: Active Members
    const isActiveMember = item.isRegistered && item.companies && item.companies.length > 0;
    // 🟡 Category B: Setup Pending
    const isSetupPending = item.isRegistered && (!item.companies || item.companies.length === 0);
    // ⚪ Category C: Invite Contacts
    const isInviteContact = !item.isRegistered;

    const handleWhatsAppRedirect = (mobileNumber: string, message: string) => {
      const formatted = mobileNumber.replace(/\D/g, '');
      const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
      Linking.openURL(url).catch((e: any) => console.warn('Could not launch WhatsApp', e));
    };

    return (
      <View
        style={[
          styles.contactCard,
          item.id.toString().startsWith('lookup_') && [
            styles.lookupMatchCard,
            { borderColor: rTheme.color, backgroundColor: rTheme.bg }
          ]
        ]}
      >
        <View style={[
          styles.avatarContainer,
          isActiveMember ? styles.activeAvatarBg : isSetupPending ? styles.pendingAvatarBg : styles.inviteAvatarBg
        ]}>
          <Text style={[
            styles.avatarText,
            isActiveMember ? styles.activeAvatarText : isSetupPending ? styles.pendingAvatarText : styles.inviteAvatarText
          ]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.contactDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
            {isActiveMember && (
              <View style={styles.badgeActive}>
                <Text style={styles.badgeActiveText}>On Pravisti</Text>
              </View>
            )}
            {isSetupPending && (
              <View style={styles.badgePending}>
                <Text style={styles.badgePendingText}>Registered</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Phone size={12} color="#64748B" />
            <Text style={styles.contactMobile}>{item.mobile}</Text>
          </View>

          {isActiveMember && item.companies && (
            <View style={styles.companiesList}>
              {item.companies.map((co) => (
                <View key={co.companyId} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Building2 size={11} color="#64748B" />
                  <Text style={styles.companySubName}>
                    {co.companyName} ({co.companyType})
                  </Text>
                </View>
              ))}
            </View>
          )}

          {isSetupPending && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <AlertTriangle size={12} color="#D97706" />
              <Text style={styles.warningMessage}>Company Registration Pending</Text>
            </View>
          )}
        </View>

        {/* Dynamic Action Button based on category tab */}
        {isActiveMember && (
          <TouchableOpacity
            style={[styles.actionBtnActive, { backgroundColor: rTheme.color }]}
            onPress={() => handleSelectContact(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnActiveText}>Create Deal</Text>
          </TouchableOpacity>
        )}

        {isSetupPending && (
          <TouchableOpacity
            style={styles.actionBtnPending}
            onPress={() => handleWhatsAppRedirect(
              item.mobile,
              `Hi ${item.name}, please complete your company profile setup on Pravisti so we can establish digital Sauda deals together!`
            )}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnPendingText}>Nudge Setup</Text>
          </TouchableOpacity>
        )}

        {isInviteContact && (
          <TouchableOpacity
            style={styles.actionBtnInvite}
            onPress={() => handleWhatsAppRedirect(
              item.mobile,
              `Hi ${item.name}, join me on Pravisti to do deals together and view my deals! Download the app: https://pravisti.com/download`
            )}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnInviteText}>Invite WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('CreateDeal', {
          companyId: routeData?.companyId,
          companyName: routeData?.companyName,
          role: routeData?.role,
          originCompany: routeData?.originCompany,
          company: routeData?.company,
          prefill: routeData?.prefill,
        })}>
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Contact</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Permission Landing Block */}
      {hasPermission === 'undetermined' ? (
        <View style={[styles.permissionContainer, { backgroundColor: '#F8FAFC' }]}>
          <View style={styles.permissionCard}>
            <View style={[styles.permissionIconCircle, { backgroundColor: rTheme.bg }]}>
              <Users size={32} color={rTheme.color} />
            </View>
            <Text style={styles.permissionTitle}>Sync Your Business Contacts</Text>
            <Text style={styles.permissionSubtitle}>
              Allow contact access to find registered companies on the Pravisti digital trade exchange ledger and start instant business Saudas.
            </Text>

            <TouchableOpacity
              style={[styles.grantButton, { backgroundColor: rTheme.color, shadowColor: rTheme.color }]}
              onPress={handleRequestAccess}
              activeOpacity={0.8}
            >
              <Text style={styles.grantButtonText}>Grant Contact Access</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipPermission}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Maybe Later (Manual Entry)</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={[
              styles.searchInputWrapper,
              isSearchFocused && { borderColor: rTheme.color, borderWidth: 1.5, shadowColor: rTheme.color, shadowOpacity: 0.1 }
            ]}>
              <Search size={16} color={isSearchFocused ? rTheme.color : "#94A3B8"} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name or mobile number..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                keyboardType="phone-pad"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searchingNumber && (
                <ActivityIndicator size="small" color={rTheme.color} style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>

          {/* Category Tabs Selector Bar */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'active' && { backgroundColor: '#DCFCE7' },
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }
              ]}
              onPress={() => setActiveTab('active')}
              activeOpacity={0.7}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
              <Text style={[
                styles.tabButtonText,
                activeTab === 'active' && { color: '#166534', fontWeight: '800' }
              ]}>
                Active ({activeMembers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'pending' && { backgroundColor: '#FEF3C7' },
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }
              ]}
              onPress={() => setActiveTab('pending')}
              activeOpacity={0.7}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
              <Text style={[
                styles.tabButtonText,
                activeTab === 'pending' && { color: '#92400E', fontWeight: '800' }
              ]}>
                Pending ({pendingMembers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'invite' && { backgroundColor: rTheme.bg },
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }
              ]}
              onPress={() => setActiveTab('invite')}
              activeOpacity={0.7}
            >
              <Mail size={12} color={activeTab === 'invite' ? rTheme.color : '#64748B'} />
              <Text style={[
                styles.tabButtonText,
                activeTab === 'invite' && { color: rTheme.color, fontWeight: '800' }
              ]}>
                Invite ({inviteContacts.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contacts List */}
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={rTheme.color} />
              <Text style={styles.loaderText}>Syncing contacts from address book...</Text>
            </View>
          ) : (
            <FlatList
              data={dataToRender}
              renderItem={renderContactItem}
              keyExtractor={(item: Contact) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No contacts found</Text>
                  <TouchableOpacity
                    style={[styles.addManualButton, { borderColor: rTheme.color }]}
                    onPress={handleAddManualNumber}
                    disabled={!searchQuery.trim()}
                  >
                    <Text style={[styles.addManualText, { color: rTheme.color }]}>
                      {searchQuery.trim() ? `+ Use "${searchQuery}" Manually` : '+ Add Number Manually'}
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Company Bottom Sheet Selection Modal */}
      {isCompanyModalVisible && selectedContactForModal && (
        <Modal
          transparent
          visible={isCompanyModalVisible}
          animationType="slide"
          onRequestClose={() => setIsCompanyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setIsCompanyModalVisible(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.dragIndicator} />

              <Text style={styles.modalTitle}>Select Company</Text>
              <Text style={styles.modalSubtitle}>
                {selectedContactForModal.name} represents multiple companies. Choose one for this Sauda deal:
              </Text>

              <View style={styles.companyList}>
                {selectedContactForModal.companies?.map((co) => (
                  <TouchableOpacity
                    key={co.companyId}
                    style={styles.companyCard}
                    onPress={() => handleSelectCompanyFromModal(co)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.companyIconBg, { backgroundColor: rTheme.bg }]}>
                      <Building2 size={18} color={rTheme.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.companyNameText}>{co.companyName}</Text>
                      <Text style={[styles.companyTypeText, { color: rTheme.color }]}>{co.companyType.toUpperCase()}</Text>
                    </View>
                    <ChevronRight size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCompanyModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 0,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  lookupMatchCard: {
    borderColor: '#4F46E5',
    borderWidth: 1.5,
    backgroundColor: '#EEF2FF',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  registeredAvatarBg: {
    backgroundColor: '#E0EEFF',
  },
  unregisteredAvatarBg: {
    backgroundColor: '#FFEBEB',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  registeredAvatarText: {
    color: '#4F46E5',
  },
  unregisteredAvatarText: {
    color: '#EF4444',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  lookupBadgeText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '800',
  },
  contactMobile: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  registeredSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  registeredBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
  },
  registeredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  unregisteredText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loaderText: {
    marginTop: 15,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  // Modal Bottom Sheet Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    maxHeight: '75%',
  },
  dragIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  companyList: {
    gap: 12,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  companyIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyIconEmoji: {
    fontSize: 16,
  },
  companyNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  companyTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.4,
  },
  selectCompanyArrow: {
    fontSize: 22,
    color: '#94A3B8',
    marginLeft: 10,
  },
  cancelBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },
  // Permission Request Styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F5F7FF',
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ECEEF6',
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionIconEmoji: {
    fontSize: 36,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  grantButton: {
    backgroundColor: '#4F46E5',
    width: '100%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  skipButton: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  skipButtonText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#F1F5F9',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  activeAvatarBg: {
    backgroundColor: '#DCFCE7',
  },
  activeAvatarText: {
    color: '#166534',
  },
  pendingAvatarBg: {
    backgroundColor: '#FEF3C7',
  },
  pendingAvatarText: {
    color: '#92400E',
  },
  inviteAvatarBg: {
    backgroundColor: '#F1F5F9',
  },
  inviteAvatarText: {
    color: '#475569',
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#86EFAC',
  },
  badgeActiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  badgePendingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  companiesList: {
    marginTop: 4,
    gap: 2,
  },
  companySubName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  warningMessage: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 4,
  },
  actionBtnActive: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnActiveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnPending: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPendingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnInvite: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnInviteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});

export default ContactPicker;
