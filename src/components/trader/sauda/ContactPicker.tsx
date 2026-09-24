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
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { filterContacts, getCompaniesByNumber } from '../../../services/api';
import Contacts from 'react-native-contacts';
import {
  ArrowLeft,
  Phone,
  Building2,
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  UserPlus,
  X,
  PlusCircle,
  SlidersHorizontal,
  MoreVertical,
  Handshake,
  MessageSquare,
  ShieldCheck,
  Clock,
  AlertCircle,
} from 'lucide-react-native';

interface CompanyOwner {
  userId?: string;
  name?: string;
  mobileNumber?: string;
}

interface CompanyInfo {
  companyId: string;
  companyName: string;
  companyType: string;
  logo: string | null;
  contactPersonName?: string;
  owner?: CompanyOwner;
}

interface Contact {
  id: string;
  name: string;
  registeredName?: string;
  localName?: string;
  mobile: string;
  isRegistered: boolean;
  hasCompany?: boolean;
  userId?: string;
  profilePicture?: string | null;
  whatsappInviteLink?: string;
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

const getFallbackContacts = (): Contact[] => [
  {
    id: '6a196e1d2c6d6d67d875a8a9',
    name: 'Rahul Singh',
    registeredName: 'Raushan',
    localName: 'Rahul Singh',
    mobile: '+917061901464',
    isRegistered: true,
    hasCompany: true,
    userId: '6a196e1d2c6d6d67d875a8a9',
    profilePicture: null,
    companies: [
      {
        companyId: '6a19700c2c6d6d67d875a965',
        companyName: 'Pravisti Agro Limiteds(updated)',
        companyType: 'trader',
        logo: null,
        owner: {
          userId: '6a196e1d2c6d6d67d875a8a9',
          name: 'Raushan',
          mobileNumber: '7061901464',
        },
      },
    ],
    company: 'Pravisti Agro Limiteds(updated)',
    companyId: '6a19700c2c6d6d67d875a965',
  },
  {
    id: '6a196e782c6d6d67d875a8b6',
    name: 'Raushan Kumar',
    registeredName: 'Raushan',
    localName: 'Raushan Kumar',
    mobile: '+916202579799',
    isRegistered: true,
    hasCompany: false,
    userId: '6a196e782c6d6d67d875a8b6',
    profilePicture: null,
    companies: [],
    whatsappInviteLink: 'https://wa.me/?text=Hi%20there%2C%20please%20register%20your%20company%20on%20Pravisti%20so%20we%20can%20do%20deals%20together!%20Download%20the%20app%3A%20https%3A%2F%2Fpravisti.com%2Fdownload',
  },
];

const getAvatarTheme = (name: string, index: number) => {
  const themes = [
    { bg: '#DCFCE7', text: '#15803D' }, // green
    { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
    { bg: '#FCE7F3', text: '#BE185D' }, // pink
    { bg: '#EDE9FE', text: '#6D28D9' }, // purple
    { bg: '#FEF3C7', text: '#B45309' }, // amber
  ];
  const charCode = name ? name.charCodeAt(0) : index;
  return themes[charCode % themes.length];
};

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
  const [manualInputError, setManualInputError] = useState('');

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

      const localNameMap: Record<string, string> = {};
      const localPhotoMap: Record<string, string> = {};
      let contactsToSend: { name: string; phone: string }[] = [];

      try {
        const nativeContacts = await Contacts.getAll();
        if (nativeContacts && nativeContacts.length > 0) {
          const seenPhones = new Set<string>();

          nativeContacts.forEach(c => {
            const fullName = [c.givenName, c.familyName].filter(Boolean).join(' ') || c.displayName || '';
            (c.phoneNumbers || []).forEach(p => {
              const raw = (p.number || '').replace(/[\s\-()]/g, '');
              let clean = '';
              if (raw.length === 10 && /^[6-9]\d{9}$/.test(raw)) {
                clean = '+91' + raw;
              } else if (raw.length === 12 && raw.startsWith('91')) {
                clean = '+' + raw;
              } else if (raw.startsWith('+91') && raw.length === 13) {
                clean = raw;
              } else if (raw.startsWith('0') && raw.length === 11) {
                clean = '+91' + raw.substring(1);
              }

              if (clean && !seenPhones.has(clean)) {
                seenPhones.add(clean);
                const finalName = fullName || `Contact (${clean.slice(-4)})`;
                localNameMap[clean] = finalName;
                if (c.thumbnailPath) {
                  localPhotoMap[clean] = c.thumbnailPath;
                }
                contactsToSend.push({
                  name: finalName,
                  phone: clean,
                });
              }
            });
          });
        }
      } catch (nativeErr) {
        console.warn('Native contacts fetch failed or permission blocked, using fallback:', nativeErr);
      }

      if (contactsToSend.length === 0) {
        contactsToSend = LOCAL_ADDRESS_BOOK;
        LOCAL_ADDRESS_BOOK.forEach(c => {
          localNameMap[c.phone] = c.name;
        });
      }

      if (!token) {
        setContacts(getFallbackContacts());
        setIsLoading(false);
        return;
      }

      const response = await filterContacts(contactsToSend, token);
      if (response && response.success && Array.isArray(response.data)) {
        const registeredMap = new Map<string, any>();
        response.data.forEach((item: any) => {
          const ph = item.phone || item.mobile || item.mobileNumber || '';
          if (ph) {
            registeredMap.set(ph, item);
          }
        });

        const mappedContacts: Contact[] = contactsToSend.map((sentItem, idx) => {
          const phone = sentItem.phone;
          const regItem = registeredMap.get(phone);

          const isRegistered = Boolean(regItem?.isRegistered);
          const hasCompany = Boolean(regItem?.hasCompany ?? (regItem?.companies && regItem.companies.length > 0));
          const registeredName = regItem?.registeredName || '';
          const localName = localNameMap[phone] || sentItem.name;
          const displayName = localName || registeredName || 'Unnamed Contact';

          const companies: CompanyInfo[] = (regItem?.companies || []).map((co: any, cIdx: number) => ({
            companyId: co.companyId || co._id || co.id || `comp_${cIdx}`,
            companyName: co.companyName || co.name || 'Company',
            companyType: co.companyType || co.type || 'trader',
            logo: co.logo || null,
            owner: co.owner,
            contactPersonName: co.contactPersonName || (co.owner ? co.owner.name : ''),
          }));

          const primaryCompany = companies.length > 0 ? companies[0] : undefined;

          return {
            id: regItem?.userId || `contact_${idx}`,
            name: displayName,
            registeredName: registeredName,
            localName: localName,
            mobile: phone,
            isRegistered: isRegistered,
            hasCompany: hasCompany,
            userId: regItem?.userId,
            profilePicture: regItem?.profilePicture || localPhotoMap[phone] || null,
            whatsappInviteLink: regItem?.whatsappInviteLink || '',
            companies: companies,
            company: primaryCompany?.companyName,
            companyId: primaryCompany?.companyId,
          };
        });

        // Add any extra items from response not in contactsToSend
        response.data.forEach((item: any, idx: number) => {
          const ph = item.phone || item.mobile || '';
          if (ph && !mappedContacts.some(c => c.mobile === ph)) {
            const hasCompany = Boolean(item.hasCompany ?? (item.companies && item.companies.length > 0));
            const companies: CompanyInfo[] = (item.companies || []).map((co: any, cIdx: number) => ({
              companyId: co.companyId || co._id || co.id || `comp_resp_${cIdx}`,
              companyName: co.companyName || co.name || 'Company',
              companyType: co.companyType || co.type || 'trader',
              logo: co.logo || null,
              owner: co.owner,
              contactPersonName: co.contactPersonName || (co.owner ? co.owner.name : ''),
            }));

            mappedContacts.push({
              id: item.userId || `contact_extra_${idx}`,
              name: item.registeredName || localNameMap[ph] || item.name || `Contact (${ph.slice(-4)})`,
              registeredName: item.registeredName,
              localName: localNameMap[ph],
              mobile: ph,
              isRegistered: Boolean(item.isRegistered),
              hasCompany: hasCompany,
              userId: item.userId,
              profilePicture: item.profilePicture || null,
              whatsappInviteLink: item.whatsappInviteLink || '',
              companies: companies,
              company: companies[0]?.companyName,
              companyId: companies[0]?.companyId,
            });
          }
        });

        // Sort: Registered on Pravisti with companies first, then registered users, then unregistered
        mappedContacts.sort((a, b) => {
          const scoreA = a.isRegistered && a.hasCompany ? 2 : a.isRegistered ? 1 : 0;
          const scoreB = b.isRegistered && b.hasCompany ? 2 : b.isRegistered ? 1 : 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return a.name.localeCompare(b.name);
        });

        setContacts(mappedContacts);
      } else {
        setContacts(getFallbackContacts());
      }
    } catch (error) {
      console.warn('Sync contacts failed:', error);
      setContacts(getFallbackContacts());
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Access Permission',
            message: 'Pravisti requires contact access to locate your business counterparties and suppliers.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          await AsyncStorage.setItem('contact_permission_granted', 'true');
          setHasPermission('granted');
          syncContacts();
        } else {
          setHasPermission('denied');
        }
      } else {
        Contacts.requestPermission().then(async (permission) => {
          if (permission === 'authorized') {
            await AsyncStorage.setItem('contact_permission_granted', 'true');
            setHasPermission('granted');
            syncContacts();
          } else {
            setHasPermission('denied');
          }
        });
      }
    } catch (e) {
      console.warn('Error requesting contacts permission:', e);
      setHasPermission('denied');
    }
  };

  const handleSkipPermission = () => {
    setHasPermission('denied');
    syncContacts();
  };

  // Live query debouncing for searching custom numbers
  useEffect(() => {
    const cleanDigits = searchQuery.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setLookupContact(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingNumber(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const formattedMobile = '+91' + cleanDigits.slice(-10);

        let isRegistered = false;
        let hasCompany = false;
        let registeredName = '';
        let whatsappInviteLink = '';
        let companiesList: CompanyInfo[] = [];

        // 1. Check user status & whatsapp invite link via filterContacts
        try {
          const filterRes = await filterContacts([{ phone: formattedMobile }], token);
          if (filterRes && filterRes.success && Array.isArray(filterRes.data) && filterRes.data.length > 0) {
            const fItem = filterRes.data[0];
            isRegistered = Boolean(fItem.isRegistered);
            hasCompany = Boolean(fItem.hasCompany ?? (fItem.companies && fItem.companies.length > 0));
            registeredName = fItem.registeredName || '';
            whatsappInviteLink = fItem.whatsappInviteLink || '';
            if (fItem.companies && Array.isArray(fItem.companies)) {
              companiesList = fItem.companies.map((c: any, cIdx: number) => ({
                companyId: c.companyId || c._id || c.id || `comp_${cIdx}`,
                companyName: c.companyName || c.name,
                companyType: c.companyType || c.type || 'trader',
                logo: c.logo || null,
                owner: c.owner,
                contactPersonName: c.contactPersonName || (c.owner ? c.owner.name : ''),
              }));
            }
          }
        } catch (fErr) {
          console.warn('Live filterContacts lookup notice:', fErr);
        }

        // 2. Discover companies via getCompaniesByNumber API
        try {
          const compRes = await getCompaniesByNumber(formattedMobile, token);
          if (compRes && compRes.success && Array.isArray(compRes.data) && compRes.data.length > 0) {
            hasCompany = true;
            isRegistered = true;
            compRes.data.forEach((c: any, cIdx: number) => {
              const compId = c.companyId || c._id || c.id || `comp_${cIdx}`;
              if (!companiesList.some(ex => ex.companyId === compId)) {
                companiesList.push({
                  companyId: compId,
                  companyName: c.companyName || c.name || 'Company',
                  companyType: c.companyType || c.type || 'trader',
                  contactPersonName: c.contactPersonName,
                  logo: c.logo || null,
                });
              }
            });
            if (!registeredName && compRes.data[0]?.contactPersonName) {
              registeredName = compRes.data[0].contactPersonName;
            }
          }
        } catch (_cErr) {
          // 404 is normal if no companies found for number
          console.warn('Company lookup notice:', _cErr);
        }

        setLookupContact({
          id: `lookup_${Date.now()}`,
          name: registeredName || `Contact (${formattedMobile.slice(-4)})`,
          registeredName,
          mobile: formattedMobile,
          isRegistered,
          hasCompany,
          whatsappInviteLink,
          companies: companiesList,
          company: companiesList.length > 0 ? companiesList[0].companyName : undefined,
          companyId: companiesList.length > 0 ? companiesList[0].companyId : undefined,
        });
      } catch (err) {
        console.warn('Live number lookup failed:', err);
      } finally {
        setSearchingNumber(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectContact = (contact: Contact) => {
    if (contact.companies && contact.companies.length > 1) {
      setSelectedContactForModal(contact);
      setIsCompanyModalVisible(true);
      return;
    }

    const coName = (contact.companies && contact.companies.length > 0 && contact.companies[0].companyName)
      ? contact.companies[0].companyName
      : (contact.company || contact.name);
    const coId = (contact.companies && contact.companies.length > 0 && contact.companies[0].companyId)
      ? contact.companies[0].companyId
      : (contact.companyId || null);

    const isParty2Target = routeData?.pickingFor === 'party2' || !routeData?.pickingFor;
    const isBrokerTarget = routeData?.pickingFor === 'brokerCompany';

    const selected: Contact = {
      ...contact,
      company: coName,
      companyId: coId || undefined,
      isRegistered: Boolean(contact.isRegistered || (contact.companies && contact.companies.length > 0)),
    };
    onNavigate('CreateDeal', {
      selectedContact: selected,
      pickingFor: routeData?.pickingFor || 'party2',
      companyId: routeData?.companyId,
      companyName: routeData?.companyName,
      role: routeData?.role,
      originCompany: routeData?.originCompany,
      company: routeData?.company,
      prefill: routeData?.prefill,
      existingParty2: isParty2Target ? selected : routeData?.existingParty2,
      existingParty2Name: isParty2Target ? coName : routeData?.existingParty2Name,
      existingSellerCompany: routeData?.existingSellerCompany,
      existingSellerCompanyName: routeData?.existingSellerCompanyName,
      existingBrokerCompany: isBrokerTarget ? selected : routeData?.existingBrokerCompany,
      existingBrokerCompanyName: isBrokerTarget ? coName : routeData?.existingBrokerCompanyName,
    }, { replace: true });
  };

  const handleSelectCompanyFromModal = (company: CompanyInfo) => {
    if (!selectedContactForModal) return;
    const coName = company.companyName || (company as any).name || 'Company';
    const coId = company.companyId || (company as any)._id || (company as any).id;
    const isParty2Target = routeData?.pickingFor === 'party2' || !routeData?.pickingFor;
    const isBrokerTarget = routeData?.pickingFor === 'brokerCompany';

    const finalContact: Contact = {
      ...selectedContactForModal,
      company: coName,
      companyId: coId,
      isRegistered: true,
    };
    setIsCompanyModalVisible(false);
    onNavigate('CreateDeal', {
      selectedContact: finalContact,
      pickingFor: routeData?.pickingFor || 'party2',
      companyId: routeData?.companyId,
      companyName: routeData?.companyName,
      role: routeData?.role,
      originCompany: routeData?.originCompany,
      company: routeData?.company,
      prefill: routeData?.prefill,
      existingParty2: isParty2Target ? finalContact : routeData?.existingParty2,
      existingParty2Name: isParty2Target ? coName : routeData?.existingParty2Name,
      existingSellerCompany: routeData?.existingSellerCompany,
      existingSellerCompanyName: routeData?.existingSellerCompanyName,
      existingBrokerCompany: isBrokerTarget ? finalContact : routeData?.existingBrokerCompany,
      existingBrokerCompanyName: isBrokerTarget ? coName : routeData?.existingBrokerCompanyName,
    }, { replace: true });
  };

  const handleAddManualNumber = () => {
    if (!searchQuery.trim()) return;
    const cleanDigits = searchQuery.replace(/\D/g, '');

    if (cleanDigits.length > 0) {
      if (cleanDigits.length !== 10) {
        setManualInputError(`Please enter full 10-digit mobile number (${cleanDigits.length}/10 digits)`);
        return;
      }
      if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
        setManualInputError('Mobile number must start with 6, 7, 8, or 9');
        return;
      }
    }

    setManualInputError('');
    const formattedMobile = cleanDigits.length === 10 ? `+91${cleanDigits}` : searchQuery.trim();
    const manualContact: Contact = {
      id: `manual_${Date.now()}`,
      name: searchQuery.trim(),
      mobile: formattedMobile,
      isRegistered: false,
      hasCompany: false,
    };
    const isParty2Target = routeData?.pickingFor === 'party2' || !routeData?.pickingFor;
    const isBrokerTarget = routeData?.pickingFor === 'brokerCompany';

    onNavigate('CreateDeal', {
      selectedContact: manualContact,
      pickingFor: routeData?.pickingFor || 'party2',
      companyId: routeData?.companyId,
      companyName: routeData?.companyName,
      role: routeData?.role,
      originCompany: routeData?.originCompany,
      company: routeData?.company,
      prefill: routeData?.prefill,
      existingParty2: isParty2Target ? manualContact : routeData?.existingParty2,
      existingParty2Name: isParty2Target ? searchQuery.trim() : routeData?.existingParty2Name,
      existingSellerCompany: routeData?.existingSellerCompany,
      existingSellerCompanyName: routeData?.existingSellerCompanyName,
      existingBrokerCompany: isBrokerTarget ? manualContact : routeData?.existingBrokerCompany,
      existingBrokerCompanyName: isBrokerTarget ? searchQuery.trim() : routeData?.existingBrokerCompanyName,
    }, { replace: true });
  };

  const activeMembers = contacts.filter(c => c.isRegistered && (c.hasCompany || (c.companies && c.companies.length > 0)));
  const pendingMembers = contacts.filter(c => c.isRegistered && !c.hasCompany && (!c.companies || c.companies.length === 0));
  const inviteContacts = contacts.filter(c => !c.isRegistered);

  const getTabContacts = () => {
    switch (activeTab) {
      case 'active': return activeMembers;
      case 'pending': return pendingMembers;
      case 'invite': return inviteContacts;
      default: return activeMembers;
    }
  };

  const tabContacts = getTabContacts();
  const filteredContacts = tabContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.registeredName && contact.registeredName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    contact.mobile.includes(searchQuery) ||
    (contact.companies && contact.companies.some(co => co.companyName.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const dataToRender = [...filteredContacts];
  if (lookupContact) {
    const isLookupActive = lookupContact.isRegistered && (lookupContact.hasCompany || (lookupContact.companies && lookupContact.companies.length > 0));
    const isLookupPending = lookupContact.isRegistered && !lookupContact.hasCompany && (!lookupContact.companies || lookupContact.companies.length === 0);
    const isLookupInvite = !lookupContact.isRegistered;

    const matchesActiveTab =
      (activeTab === 'active' && isLookupActive) ||
      (activeTab === 'pending' && isLookupPending) ||
      (activeTab === 'invite' && isLookupInvite);

    if (matchesActiveTab && !filteredContacts.some(c => c.mobile === lookupContact.mobile)) {
      dataToRender.unshift(lookupContact);
    }
  }

  const renderContactItem = ({ item, index }: { item: Contact; index: number }) => {
    const isActiveMember = item.isRegistered && (item.hasCompany || (item.companies && item.companies.length > 0));
    const isSetupPending = item.isRegistered && !item.hasCompany && (!item.companies || item.companies.length === 0);
    const isInviteContact = !item.isRegistered;

    const avTheme = getAvatarTheme(item.name || 'P', index);

    const handleCall = (mobileNumber: string) => {
      const clean = mobileNumber.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${clean}`).catch(e => console.warn('Cannot open phone dialer', e));
    };

    const handleWhatsAppInvite = (inviteUrl?: string, mobileNumber?: string, name?: string) => {
      if (inviteUrl) {
        Linking.openURL(inviteUrl).catch(() => {
          const clean = (mobileNumber || '').replace(/\D/g, '');
          const fallbackUrl = `https://wa.me/${clean}?text=${encodeURIComponent(`Hi ${name || 'there'}, please register your company on Pravisti so we can do deals together! Download the app: https://pravisti.com/download`)}`;
          Linking.openURL(fallbackUrl).catch(() => Alert.alert('Notice', 'WhatsApp could not be opened.'));
        });
      } else {
        const clean = (mobileNumber || '').replace(/\D/g, '');
        const fallbackUrl = `https://wa.me/${clean}?text=${encodeURIComponent(`Hi ${name || 'there'}, join Pravisti to do deals together: https://pravisti.com/download`)}`;
        Linking.openURL(fallbackUrl).catch(() => Alert.alert('Notice', 'WhatsApp could not be opened.'));
      }
    };

    const primaryCompany = item.companies && item.companies.length > 0 ? item.companies[0] : null;
    const moreCompaniesCount = item.companies && item.companies.length > 1 ? item.companies.length - 1 : 0;

    return (
      <View
        style={[
          styles.contactCard,
          item.id.toString().startsWith('lookup_') && styles.lookupMatchCard,
        ]}
      >
        {/* Top Row: Avatar + Details + Call/WhatsApp/More */}
        <View style={styles.cardTopRow}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => (isActiveMember ? handleSelectContact(item) : handleWhatsAppInvite(item.whatsappInviteLink, item.mobile, item.name))}
            activeOpacity={0.7}
          >
            {/* Avatar Circle */}
            <View style={[styles.avatarCircle, { backgroundColor: avTheme.bg }]}>
              {item.profilePicture ? (
                <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: avTheme.text }]}>
                  {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>

            {/* Center Details */}
            <View style={styles.cardDetailsBox}>
              <View style={styles.cardNameStatusRow}>
                <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                {isActiveMember && (
                  <View style={styles.statusBadgeGreen}>
                    <ShieldCheck size={11} color="#15803D" style={{ marginRight: 3 }} />
                    <Text style={styles.statusBadgeGreenText}>On Pravisti ✓</Text>
                  </View>
                )}
                {isSetupPending && (
                  <View style={styles.statusBadgeOrange}>
                    <Clock size={11} color="#B45309" style={{ marginRight: 3 }} />
                    <Text style={styles.statusBadgeOrangeText}>User Registered</Text>
                  </View>
                )}
                {isInviteContact && (
                  <View style={styles.statusBadgeBlue}>
                    <UserPlus size={10} color="#1D4ED8" style={{ marginRight: 3 }} />
                    <Text style={styles.statusBadgeBlueText}>Not on Pravisti</Text>
                  </View>
                )}
              </View>

              {/* Show Registered Name if different from address book name */}
              {item.registeredName && item.registeredName.toLowerCase() !== item.name.toLowerCase() ? (
                <Text style={styles.registeredNameSub} numberOfLines={1}>
                  Registered as: {item.registeredName}
                </Text>
              ) : null}

              {/* Mobile number row with real status data in front of / beside the number */}
              <View style={styles.phoneAndDataRow}>
                <View style={styles.phoneRow}>
                  <Phone size={11} color="#64748B" />
                  <Text style={styles.phoneText}>{item.mobile}</Text>
                </View>

                {isActiveMember && primaryCompany ? (
                  <View style={styles.numberDataPillGreen}>
                    <Building2 size={10} color="#059669" style={{ marginRight: 3 }} />
                    <Text style={styles.numberDataPillGreenText} numberOfLines={1}>
                      {primaryCompany.companyName}
                    </Text>
                  </View>
                ) : isSetupPending ? (
                  <View style={styles.numberDataPillOrange}>
                    <AlertCircle size={10} color="#D97706" style={{ marginRight: 3 }} />
                    <Text style={styles.numberDataPillOrangeText} numberOfLines={1}>
                      No Company Setup
                    </Text>
                  </View>
                ) : (
                  <View style={styles.numberDataPillSlate}>
                    <Text style={styles.numberDataPillSlateText} numberOfLines={1}>
                      Unregistered
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Right Action Icons */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.iconCircleBtnGreen}
              onPress={() => handleCall(item.mobile)}
              activeOpacity={0.7}
            >
              <Phone size={13} color="#059669" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtnWhatsApp}
              onPress={() => handleWhatsAppInvite(item.whatsappInviteLink, item.mobile, item.name)}
              activeOpacity={0.7}
            >
              <MessageSquare size={13} color="#059669" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtnMore}
              onPress={() => handleSelectContact(item)}
              activeOpacity={0.7}
            >
              <MoreVertical size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Row: Company Info & Action Button */}
        <View style={styles.cardBottomRow}>
          {/* Company Column */}
          <View style={styles.cardCompanyColumn}>
            {primaryCompany ? (
              <TouchableOpacity
                style={styles.companyPillBox}
                onPress={() => {
                  if (moreCompaniesCount > 0) {
                    setSelectedContactForModal(item);
                    setIsCompanyModalVisible(true);
                  } else {
                    handleSelectContact(item);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.companyPillLeft}>
                  <Building2 size={13} color="#059669" />
                  <Text style={styles.companyNameText} numberOfLines={1}>
                    {primaryCompany.companyName}
                  </Text>
                  {primaryCompany.companyType && (
                    <Text style={styles.companyRoleTag}>
                      ({primaryCompany.companyType.toLowerCase()})
                    </Text>
                  )}
                </View>
                {moreCompaniesCount > 0 ? (
                  <View style={styles.moreCountTag}>
                    <Text style={styles.moreCountTagText}>+{moreCompaniesCount}</Text>
                    <ChevronDown size={13} color="#0284C7" />
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : isSetupPending ? (
              <TouchableOpacity
                style={styles.companyPillPending}
                onPress={() => handleWhatsAppInvite(item.whatsappInviteLink, item.mobile, item.name)}
                activeOpacity={0.7}
              >
                <Clock size={13} color="#D97706" />
                <Text style={styles.companyPendingText} numberOfLines={1}>
                  Company registration pending
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.companyPillInvite}
                onPress={() => handleWhatsAppInvite(item.whatsappInviteLink, item.mobile, item.name)}
                activeOpacity={0.7}
              >
                <UserPlus size={13} color="#64748B" />
                <Text style={styles.companyInviteText} numberOfLines={1}>
                  Not registered yet on Pravisti
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Button: Create Deal vs WhatsApp Invite */}
          {isActiveMember ? (
            <TouchableOpacity
              style={styles.createDealBtn}
              onPress={() => handleSelectContact(item)}
              activeOpacity={0.85}
            >
              <Handshake size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.createDealBtnText}>Create Deal</Text>
            </TouchableOpacity>
          ) : isSetupPending ? (
            <TouchableOpacity
              style={styles.inviteCompanyBtn}
              onPress={() => handleWhatsAppInvite(item.whatsappInviteLink, item.mobile, item.name)}
              activeOpacity={0.85}
            >
              <MessageSquare size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.inviteCompanyBtnText}>Remind</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={() => handleWhatsAppInvite(item.whatsappInviteLink, item.mobile, item.name)}
              activeOpacity={0.85}
            >
              <MessageSquare size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.inviteBtnText}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Select Contact</Text>
          <Text style={styles.headerSubtitle}>Choose a contact to create a deal</Text>
        </View>

        <TouchableOpacity
          style={styles.addContactHeaderBtn}
          onPress={() => onNavigate('CreateDeal', {
            companyId: routeData?.companyId,
            companyName: routeData?.companyName,
            role: routeData?.role,
            originCompany: routeData?.originCompany,
            company: routeData?.company,
            prefill: routeData?.prefill,
            existingParty2: routeData?.existingParty2,
            existingParty2Name: routeData?.existingParty2Name,
            existingSellerCompany: routeData?.existingSellerCompany,
            existingSellerCompanyName: routeData?.existingSellerCompanyName,
            existingBrokerCompany: routeData?.existingBrokerCompany,
            existingBrokerCompanyName: routeData?.existingBrokerCompanyName,
            openOnboard: true,
          })}
          activeOpacity={0.7}
        >
          <UserPlus size={14} color="#059669" />
          <Text style={styles.addContactHeaderBtnText}>+ Add Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Permission Landing Block */}
      {hasPermission === 'undetermined' ? (
        <View style={styles.permissionContainer}>
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
          {/* Search Bar & Filter Button */}
          <View style={styles.searchRowContainer}>
            <View style={[
              styles.searchInputWrapper,
              isSearchFocused && { borderColor: '#059669', borderWidth: 1.5 }
            ]}>
              <Search size={17} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name or mobile number..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (manualInputError) setManualInputError('');
                }}
                keyboardType="phone-pad"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setManualInputError('');
                  }}
                  style={styles.clearSearchBtn}
                  activeOpacity={0.7}
                >
                  <X size={14} color="#64748B" />
                </TouchableOpacity>
              )}
              {searchingNumber && (
                <ActivityIndicator size="small" color="#059669" style={{ marginLeft: 6 }} />
              )}
            </View>

            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={handleAddManualNumber}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Quick Add Banner for Manual Number */}
          {searchQuery.trim().length > 0 && (
            <View style={styles.quickAddBanner}>
              <TouchableOpacity
                style={[
                  styles.quickAddCard,
                  { borderColor: manualInputError ? '#EF4444' : '#059669', backgroundColor: manualInputError ? '#FEF2F2' : '#F0FDF4' }
                ]}
                onPress={handleAddManualNumber}
                activeOpacity={0.8}
              >
                <View style={[styles.quickAddIconCircle, { backgroundColor: manualInputError ? '#EF4444' : '#059669' }]}>
                  <UserPlus size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickAddTitle}>
                    Use "{searchQuery.trim()}" directly
                  </Text>
                  <Text style={[styles.quickAddSubtitle, manualInputError && { color: '#EF4444', fontWeight: '700' }]}>
                    {manualInputError ? `⚠ ${manualInputError}` : 'Add as new contact number for deal'}
                  </Text>
                </View>
                <View style={[styles.quickAddBadge, { backgroundColor: manualInputError ? '#EF4444' : '#059669' }]}>
                  <PlusCircle size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.quickAddBadgeText}>+ Add New</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Filter Tabs (Active, Pending, Invite) */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'active' && styles.tabButtonActiveGreen,
              ]}
              onPress={() => setActiveTab('active')}
              activeOpacity={0.7}
            >
              <ShieldCheck size={13} color={activeTab === 'active' ? '#15803D' : '#64748B'} style={{ marginRight: 4 }} />
              <Text style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActiveGreen]}>
                On Pravisti ({activeMembers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'pending' && styles.tabButtonActiveYellow,
              ]}
              onPress={() => setActiveTab('pending')}
              activeOpacity={0.7}
            >
              <Clock size={13} color={activeTab === 'pending' ? '#B45309' : '#64748B'} style={{ marginRight: 4 }} />
              <Text style={[styles.tabButtonText, activeTab === 'pending' && styles.tabButtonTextActiveYellow]}>
                No Company ({pendingMembers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'invite' && styles.tabButtonActiveSlate,
              ]}
              onPress={() => setActiveTab('invite')}
              activeOpacity={0.7}
            >
              <UserPlus size={13} color={activeTab === 'invite' ? '#1E293B' : '#64748B'} style={{ marginRight: 4 }} />
              <Text style={[styles.tabButtonText, activeTab === 'invite' && styles.tabButtonTextActiveSlate]}>
                Invite ({inviteContacts.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contacts List */}
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#059669" />
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
                  <Text style={styles.emptyText}>No contacts found in this list</Text>
                  <TouchableOpacity
                    style={[styles.addManualButton, { borderColor: '#059669' }]}
                    onPress={handleAddManualNumber}
                    disabled={!searchQuery.trim()}
                  >
                    <Text style={[styles.addManualText, { color: '#059669' }]}>
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
                {selectedContactForModal.companies?.map((co, cIdx) => (
                  <TouchableOpacity
                    key={co.companyId || `co_${cIdx}`}
                    style={styles.companyModalCard}
                    onPress={() => handleSelectCompanyFromModal(co)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.companyIconBg}>
                      <Building2 size={18} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.companyModalNameText}>{co.companyName}</Text>
                      <Text style={styles.companyModalTypeText}>{(co.companyType || 'Trader').toUpperCase()}</Text>
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
  /* Top App Bar */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addContactHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addContactHeaderBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },

  /* Search & Filter Row */
  searchRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  filterIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Quick Add Banner */
  quickAddBanner: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  quickAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  quickAddIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickAddTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickAddSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  quickAddBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickAddBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },

  /* Status Filter Tabs */
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  tabButtonActiveGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  tabButtonActiveYellow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  tabButtonActiveSlate: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActiveGreen: {
    color: '#065F46',
    fontWeight: '800',
  },
  tabButtonTextActiveYellow: {
    color: '#92400E',
    fontWeight: '800',
  },
  tabButtonTextActiveSlate: {
    color: '#1E293B',
    fontWeight: '800',
  },

  /* Contacts List */
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  lookupMatchCard: {
    borderColor: '#059669',
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },

  /* Card Top Row */
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardDetailsBox: {
    flex: 1,
  },
  cardNameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusDotGreen: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#15803D',
  },
  statusBadgeGreenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  statusBadgeOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusDotOrange: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#B45309',
  },
  statusBadgeOrangeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  statusBadgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusDotBlue: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#1D4ED8',
  },
  statusBadgeBlueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Top Right Action Icons */
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircleBtnGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBtnSlate: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnMore: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Card Bottom Row */
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardCompanyColumn: {
    flex: 1,
    gap: 6,
  },
  companyPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  companyPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  companyNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  companyRoleTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  companyPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  companyPendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  companyPillInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  companyInviteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  moreCompaniesPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  moreCompaniesText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },

  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  registeredNameSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  phoneAndDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  numberDataPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#A7F3D0',
    maxWidth: 160,
  },
  numberDataPillGreenText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  numberDataPillOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  numberDataPillOrangeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D97706',
  },
  numberDataPillSlate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  numberDataPillSlateText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  moreCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  moreCountTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  iconCircleBtnWhatsApp: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCompanyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8.5,
    gap: 4,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  inviteCompanyBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8.5,
    gap: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },

  /* Create Deal Button */
  createDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createDealBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Empty & Loading States */
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 15,
  },
  addManualButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  addManualText: {
    fontWeight: '700',
    fontSize: 13,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loaderText: {
    marginTop: 15,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Modal Bottom Sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    maxHeight: '75%',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  companyList: {
    gap: 10,
  },
  companyModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  companyIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyModalNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  companyModalTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  cancelBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 13.5,
  },

  /* Permission Block */
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  grantButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  skipButton: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  skipButtonText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 13,
  },
});

export default ContactPicker;
