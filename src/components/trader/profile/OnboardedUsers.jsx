import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Edit3,
  Send,
  X,
  UserPlus,
  Search,
  Check,
  AlertCircle,
  Briefcase,
} from 'lucide-react-native';
import {
  getBrokerMyDeals,
  getBrokerPendingQueue,
  editPendingBusiness,
  resendWhatsAppInvite,
  getDeals,
  getCompanies,
  assistedCreatePartyAccount,
  fetchPincodeDetails,
} from '../../../services/api';

const extractApiArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data) {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.queue)) return res.data.queue;
    if (Array.isArray(res.data.onboardings)) return res.data.onboardings;
    if (Array.isArray(res.data.onboardedUsers)) return res.data.onboardedUsers;
    if (Array.isArray(res.data.myDeals)) return res.data.myDeals;
    if (Array.isArray(res.data.deals)) return res.data.deals;
    if (Array.isArray(res.data.companies)) return res.data.companies;
    if (Array.isArray(res.data.users)) return res.data.users;
    if (Array.isArray(res.data.items)) return res.data.items;
    if (Array.isArray(res.data.results)) return res.data.results;
    if (Array.isArray(res.data.parties)) return res.data.parties;
  }
  if (Array.isArray(res.queue)) return res.queue;
  if (Array.isArray(res.onboardings)) return res.onboardings;
  if (Array.isArray(res.onboardedUsers)) return res.onboardedUsers;
  if (Array.isArray(res.myDeals)) return res.myDeals;
  if (Array.isArray(res.deals)) return res.deals;
  if (Array.isArray(res.companies)) return res.companies;
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.parties)) return res.parties;
  return [];
};

const OnboardedUsers = ({ onNavigate, routeData }) => {
  // Navigation & Company State
  const [userCompanies, setUserCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    routeData?.companyId || routeData?.company?._id || routeData?.company?.id || null
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardedUsers, setOnboardedUsers] = useState(
    Array.isArray(routeData?.initialUsers) ? routeData.initialUsers : []
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [resendLoadingId, setResendLoadingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    contactName: '',
    companyName: '',
    gstin: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    description: '',
  });

  // Direct Onboard Modal State
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [onboardPincodeLoading, setOnboardPincodeLoading] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [onboardForm, setOnboardForm] = useState({
    role: 'seller', // 'seller' | 'buyer'
    targetCompanyId: '',
    name: '',
    mobileNumber: '',
    companyName: '',
    gstin: '',
    street: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    productName: '',
  });

  // Load User's Companies
  useEffect(() => {
    const loadUserCompanies = async () => {
      try {
        let list = [];
        const res = await getCompanies(1, 100);
        if (res && res.success && res.data?.companies) {
          list = res.data.companies;
        } else if (Array.isArray(res?.data)) {
          list = res.data;
        }

        if (list.length === 0) {
          const storedProfile = await AsyncStorage.getItem('user_completed_profile');
          if (storedProfile) {
            try {
              const parsed = JSON.parse(storedProfile);
              if (Array.isArray(parsed?.companies) && parsed.companies.length > 0) {
                list = parsed.companies;
              }
            } catch (e) { }
          }
        }

        setUserCompanies(list);

        // Determine default selected company if not set
        if (!selectedCompanyId) {
          const initialComp =
            routeData?.companyId ||
            routeData?.company?._id ||
            routeData?.company?.id ||
            (await AsyncStorage.getItem('selectedCompanyId')) ||
            (await AsyncStorage.getItem('activeCompanyId'));

          if (initialComp && (initialComp === 'ALL' || list.some(c => (c._id || c.id) === initialComp))) {
            setSelectedCompanyId(initialComp);
          } else if (list.length > 0) {
            setSelectedCompanyId(list[0]._id || list[0].id);
          } else {
            setSelectedCompanyId('ALL');
          }
        }
      } catch (err) {
        console.warn('Failed to load companies for onboarded users:', err);
      }
    };

    loadUserCompanies();
  }, [routeData, selectedCompanyId]);

  // Sync initialUsers if passed
  useEffect(() => {
    if (Array.isArray(routeData?.initialUsers) && routeData.initialUsers.length > 0) {
      setOnboardedUsers(routeData.initialUsers);
      setLoading(false);
    }
  }, [routeData]);

  // Fetch Users Scoped Strictly to Company
  const fetchUsers = useCallback(async (compIdArg) => {
    const activeComp = compIdArg !== undefined ? compIdArg : selectedCompanyId;
    const isAll = !activeComp || activeComp === 'ALL';
    const compId = isAll ? null : activeComp;

    const cacheKey = `onboarded_users_cache_${activeComp || 'ALL'}`;

    // 1. Instant Cache Hydration
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOnboardedUsers(parsed);
          setLoading(false);
        }
      }
    } catch (e) { }

    // 2. Network Fetch Scoped to Company
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Query scoped by compId if a company is selected, or query all if ALL is selected
      const fetchCalls = [
        getBrokerPendingQueue(compId, token),
        getBrokerMyDeals(compId, token),
      ];

      const results = await Promise.allSettled(fetchCalls);

      const combined = [];
      const seenIds = new Set();

      const addItems = (arr) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((item) => {
          if (!item) return;
          const id =
            item._id ||
            item.id ||
            item.registrationId ||
            item.mobileNumber ||
            item.invitedMobile ||
            (item.company?.name ? `${item.company.name}_${item.name || ''}` : null);
          const key = id ? String(id) : Math.random().toString();
          if (key && !seenIds.has(key)) {
            // Strict company filtering when a specific company is selected
            if (compId) {
              const targetStr = String(compId);
              const itemCompId = String(
                item.brokerCompanyId ||
                item.creatorCompanyId ||
                item.companyId ||
                item.creatorCompany?._id ||
                item.creatorCompany?.id ||
                ''
              );
              // If item has a specific company association and doesn't match current company, skip
              if (itemCompId && itemCompId !== 'undefined' && itemCompId !== 'null' && itemCompId !== targetStr) {
                return;
              }
            }
            seenIds.add(key);
            combined.push({
              ...item,
              linkedCompanyId: compId || item.brokerCompanyId || item.companyId || null,
            });
          }
        });
      };

      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          addItems(extractApiArray(r.value));
        }
      });

      // Supplementary: extract counterparties from deals
      try {
        const dealsRes = await getDeals(token, 1, 50, compId);
        const dealsArr = extractApiArray(dealsRes);
        if (Array.isArray(dealsArr)) {
          dealsArr.forEach((deal) => {
            const p1 = deal.sellerCompany || deal.sellerCompanyId || deal.party1?.company || deal.party1;
            const p1Id = p1?._id || p1?.id || deal.sellerCompanyId;
            const p2 = deal.buyerCompany || deal.buyerCompanyId || deal.party2?.company || deal.party2;
            const p2Id = p2?._id || p2?.id || deal.buyerCompanyId;

            if (compId) {
              const targetStr = String(compId);
              const isP1Current = String(p1Id) === targetStr;
              const isP2Current = String(p2Id) === targetStr;

              // Only include the OTHER party of deals involving this company
              if (isP1Current && p2 && String(p2Id) !== targetStr) {
                const bName = p2.name || p2.companyName || deal.buyerName || 'Buyer';
                const bMob = p2.mobileNumber || p2.phone || deal.buyerMobile || deal.invitedMobile || '';
                const key = `party_buyer_${p2Id || bMob || bName}`;
                if (!seenIds.has(key)) {
                  seenIds.add(key);
                  combined.push({
                    registrationId: key,
                    _id: p2Id || key,
                    targetUserName: deal.buyerContactPerson || p2.contactPerson || bName,
                    name: deal.buyerContactPerson || p2.contactPerson || bName,
                    invitedMobile: bMob,
                    mobileNumber: bMob,
                    role: 'buyer',
                    status: 'verified',
                    accountStatus: 'verified',
                    company: {
                      id: p2Id,
                      name: bName,
                      address: p2.address || {},
                      registrationNumber: p2.registrationNumber || p2.gstin || '',
                    },
                    deals: [deal],
                    createdAt: deal.createdAt,
                    linkedCompanyId: targetStr,
                  });
                }
              } else if (isP2Current && p1 && String(p1Id) !== targetStr) {
                const sName = p1.name || p1.companyName || deal.sellerName || 'Seller';
                const sMob = p1.mobileNumber || p1.phone || deal.sellerMobile || deal.invitedMobile || '';
                const key = `party_seller_${p1Id || sMob || sName}`;
                if (!seenIds.has(key)) {
                  seenIds.add(key);
                  combined.push({
                    registrationId: key,
                    _id: p1Id || key,
                    targetUserName: deal.sellerContactPerson || p1.contactPerson || sName,
                    name: deal.sellerContactPerson || p1.contactPerson || sName,
                    invitedMobile: sMob,
                    mobileNumber: sMob,
                    role: 'seller',
                    status: 'verified',
                    accountStatus: 'verified',
                    company: {
                      id: p1Id,
                      name: sName,
                      address: p1.address || {},
                      registrationNumber: p1.registrationNumber || p1.gstin || '',
                    },
                    deals: [deal],
                    createdAt: deal.createdAt,
                    linkedCompanyId: targetStr,
                  });
                }
              }
            } else {
              // 'ALL' companies selected: add counterparties
              if (p1) {
                const sName = p1.name || p1.companyName || deal.sellerName || 'Seller';
                const sMob = p1.mobileNumber || p1.phone || deal.sellerMobile || '';
                const key = `party_seller_${p1Id || sMob || sName}`;
                if (!seenIds.has(key)) {
                  seenIds.add(key);
                  combined.push({
                    registrationId: key,
                    _id: p1Id || key,
                    targetUserName: deal.sellerContactPerson || p1.contactPerson || sName,
                    name: deal.sellerContactPerson || p1.contactPerson || sName,
                    invitedMobile: sMob,
                    mobileNumber: sMob,
                    role: 'seller',
                    status: 'verified',
                    accountStatus: 'verified',
                    company: {
                      id: p1Id,
                      name: sName,
                      address: p1.address || {},
                      registrationNumber: p1.registrationNumber || p1.gstin || '',
                    },
                    deals: [deal],
                    createdAt: deal.createdAt,
                  });
                }
              }
              if (p2) {
                const bName = p2.name || p2.companyName || deal.buyerName || 'Buyer';
                const bMob = p2.mobileNumber || p2.phone || deal.buyerMobile || '';
                const key = `party_buyer_${p2Id || bMob || bName}`;
                if (!seenIds.has(key)) {
                  seenIds.add(key);
                  combined.push({
                    registrationId: key,
                    _id: p2Id || key,
                    targetUserName: deal.buyerContactPerson || p2.contactPerson || bName,
                    name: deal.buyerContactPerson || p2.contactPerson || bName,
                    invitedMobile: bMob,
                    mobileNumber: bMob,
                    role: 'buyer',
                    status: 'verified',
                    accountStatus: 'verified',
                    company: {
                      id: p2Id,
                      name: bName,
                      address: p2.address || {},
                      registrationNumber: p2.registrationNumber || p2.gstin || '',
                    },
                    deals: [deal],
                    createdAt: deal.createdAt,
                  });
                }
              }
            }
          });
        }
      } catch (dealErr) {
        console.warn('Deals counterparty supplement note:', dealErr);
      }

      setOnboardedUsers(combined);
      AsyncStorage.setItem(cacheKey, JSON.stringify(combined)).catch(() => { });
    } catch (err) {
      console.warn('Error fetching onboarded users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchUsers(selectedCompanyId);
    }
  }, [selectedCompanyId, fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(selectedCompanyId);
  };

  const handleSelectCompany = (comp) => {
    const compId = comp === 'ALL' ? 'ALL' : (comp._id || comp.id);
    setSelectedCompanyId(compId);
    if (compId !== 'ALL') {
      AsyncStorage.setItem('selectedCompanyId', compId).catch(() => { });
    }
  };

  // Open Direct Onboard Modal
  const handleOpenOnboardModal = () => {
    const defaultCompId = (selectedCompanyId && selectedCompanyId !== 'ALL')
      ? selectedCompanyId
      : (userCompanies[0]?._id || userCompanies[0]?.id || '');

    setOnboardForm({
      role: 'seller',
      targetCompanyId: defaultCompId,
      name: '',
      mobileNumber: '',
      companyName: '',
      gstin: '',
      street: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      productName: '',
    });
    setOnboardError('');
    setOnboardModalOpen(true);
  };

  // Pincode lookup for Onboarding Modal
  const handleOnboardPincodeChange = async (pin) => {
    setOnboardForm(prev => ({ ...prev, pincode: pin }));
    const cleanPin = pin.replace(/\D/g, '');
    if (cleanPin.length === 6) {
      setOnboardPincodeLoading(true);
      try {
        const res = await fetchPincodeDetails(cleanPin);
        if (res && res.success) {
          setOnboardForm(prev => ({
            ...prev,
            city: res.city || prev.city,
            district: res.district || prev.district || res.city,
            state: res.state || prev.state,
          }));
        }
      } catch (e) {
        console.warn('Pincode fetch error:', e);
      } finally {
        setOnboardPincodeLoading(false);
      }
    }
  };

  // Check if mobile number is already onboarded
  const matchedExistingUser = useMemo(() => {
    const cleanMob = (onboardForm.mobileNumber || '').replace(/\D/g, '').slice(-10);
    if (cleanMob.length < 10) return null;
    return (
      onboardedUsers.find((u) => {
        const uMob = String(u.mobileNumber || u.invitedMobile || '').replace(/\D/g, '').slice(-10);
        return uMob === cleanMob;
      }) || null
    );
  }, [onboardForm.mobileNumber, onboardedUsers]);

  const handleOnboardMobileChange = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setOnboardForm((prev) => {
      const updated = { ...prev, mobileNumber: clean };
      if (clean.length === 10) {
        const match = onboardedUsers.find((u) => {
          const uMob = String(u.mobileNumber || u.invitedMobile || '').replace(/\D/g, '').slice(-10);
          return uMob === clean;
        });
        if (match) {
          updated.name = match.name || match.targetUserName || prev.name;
          updated.companyName = match.company?.name || prev.companyName;
        }
      }
      return updated;
    });
  };

  // Execute Direct Trader Onboarding
  const handleExecuteDirectOnboard = async () => {
    if (!onboardForm.name.trim()) {
      setOnboardError('Contact person name is required');
      return;
    }
    const cleanMob = onboardForm.mobileNumber.replace(/\D/g, '').slice(-10);
    if (!cleanMob || cleanMob.length !== 10) {
      setOnboardError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!onboardForm.companyName.trim()) {
      setOnboardError('Company / Business Name is required');
      return;
    }

    setOnboardError('');
    setOnboardSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const activeCreatorCompId = onboardForm.targetCompanyId || (selectedCompanyId !== 'ALL' ? selectedCompanyId : userCompanies[0]?._id);

      const productsPayload = (onboardForm.role === 'seller' && onboardForm.productName.trim()) ? [
        {
          name: onboardForm.productName.trim(),
          unitId: '64d0a1b2c3d4e5f6a7b8c9df',
          description: `${onboardForm.productName.trim()} commodity`,
          hsnCode: '1001',
          gstCode: '5%',
        }
      ] : [];

      const cleanGst = onboardForm.gstin.trim();

      const payload = {
        role: onboardForm.role,
        name: onboardForm.name.trim(),
        mobileNumber: cleanMob,
        companyName: onboardForm.companyName.trim(),
        companyId: activeCreatorCompId,
        brokerCompanyId: activeCreatorCompId,
        ...(cleanGst ? { gst: cleanGst } : {}),
        companyAddress: {
          street: onboardForm.street.trim() || 'Mandi Road',
          city: onboardForm.city.trim() || 'Mumbai',
          district: onboardForm.district.trim() || '',
          state: onboardForm.state.trim() || 'Maharashtra',
          postalCode: onboardForm.pincode.trim() || '400001',
          country: 'India',
        },
        businessDetails: `Dealers in agricultural & commodity products`,
        products: productsPayload,
      };

      const res = await assistedCreatePartyAccount(payload, token);

      if (res && (res.success || res.statusCode === 201 || res.data)) {
        const data = res.data || {};
        const newComp = data.company || {};
        const newId = newComp.id || newComp._id || data.registrationId || `onb_${Date.now()}`;
        const newCompName = newComp.name || onboardForm.companyName.trim();

        const newRecord = {
          _id: newId,
          registrationId: data.registrationId || newId,
          targetUserName: onboardForm.name.trim(),
          name: onboardForm.name.trim(),
          invitedMobile: cleanMob,
          mobileNumber: cleanMob,
          role: onboardForm.role,
          status: 'pending',
          accountStatus: 'pending',
          company: {
            id: newId,
            name: newCompName,
            address: {
              street: onboardForm.street,
              city: onboardForm.city,
              state: onboardForm.state,
              postalCode: onboardForm.pincode,
            },
            registrationNumber: cleanGst,
          },
          products: productsPayload,
          linkedCompanyId: activeCreatorCompId,
          createdAt: new Date().toISOString(),
        };

        // Add to top of list
        setOnboardedUsers(prev => [newRecord, ...prev]);
        setOnboardModalOpen(false);

        // Prompt user to send WhatsApp invite
        Alert.alert(
          'Onboarding Initiated ✓',
          `Successfully registered ${newCompName} (${onboardForm.name.trim()}). Send them a WhatsApp invite now?`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Send WhatsApp Invite',
              onPress: () => {
                const inviteMsg = `Hi ${onboardForm.name.trim()}, join me on Pravisti to do trade deals together! Download the app: https://pravisti.com/download`;
                const waUrl = `https://wa.me/91${cleanMob}?text=${encodeURIComponent(inviteMsg)}`;
                Linking.openURL(waUrl).catch(() => { });
              }
            }
          ]
        );
      } else {
        const msg = res?.message || '';
        if (msg.includes('E11000') || msg.includes('duplicate key') || msg.includes('registrationNumber')) {
          setOnboardError('A company with this GSTIN is already registered. Please enter a unique GSTIN or leave blank.');
        } else {
          setOnboardError(msg || 'Failed to onboard party. Please verify details.');
        }
      }
    } catch (err) {
      const errMsg = err?.message || '';
      if (errMsg.includes('E11000') || errMsg.includes('duplicate key')) {
        setOnboardError('A company with this GSTIN is already registered.');
      } else {
        setOnboardError(errMsg || 'Assisted registration failed.');
      }
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    const comp = item.company || {};
    const addr = comp.address || {};
    setEditForm({
      contactName: item.targetUserName || item.name || item.contactPersonName || '',
      companyName: comp.name || comp.companyName || item.companyName || '',
      gstin: comp.registrationNumber || comp.gst || item.gst || '',
      street: addr.street || item.street || '',
      city: addr.city || item.city || '',
      state: addr.state || item.state || '',
      pincode: addr.pincode || item.pincode || item.postalCode || '',
      description: comp.description || item.description || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setEditLoading(true);
    const regId = editingItem.registrationId || editingItem._id || editingItem.id;
    const payload = {
      targetUserName: editForm.contactName,
      companyName: editForm.companyName,
      company: {
        name: editForm.companyName,
        address: {
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
          pincode: editForm.pincode,
        },
        registrationNumber: editForm.gstin,
        description: editForm.description,
      },
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (regId) {
        await editPendingBusiness(regId, payload, token);
      }
    } catch (err) {
      console.warn('Edit API notice:', err);
    } finally {
      setOnboardedUsers(prev =>
        prev.map(it => {
          const currentId = it.registrationId || it._id || it.id;
          if (currentId === regId) {
            return {
              ...it,
              targetUserName: editForm.contactName,
              companyName: editForm.companyName,
              company: {
                ...it.company,
                name: editForm.companyName,
                address: {
                  ...it.company?.address,
                  street: editForm.street,
                  city: editForm.city,
                  state: editForm.state,
                  pincode: editForm.pincode,
                },
                registrationNumber: editForm.gstin,
              },
            };
          }
          return it;
        })
      );

      setEditLoading(false);
      setEditModalOpen(false);
      Alert.alert('Profile Updated', `Updated details for ${editForm.companyName || editForm.contactName}.`);
    }
  };

  const handleResendInvite = async (item) => {
    const itemId = item._id || item.id || item.registrationId;
    const targetMobile = item.invitedMobile || item.mobileNumber || item.phone || item.user?.mobileNumber || '';
    const targetName = item.targetUserName || item.name || item.contactPersonName || 'Counterparty';

    setResendLoadingId(itemId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (itemId) {
        try {
          const res = await resendWhatsAppInvite(itemId, token);
          if (res && res.data?.whatsappUrl) {
            Linking.openURL(res.data.whatsappUrl).catch(() => { });
          }
        } catch (e) {
          console.warn('API resend notice:', e);
        }
      }

      const cleanMob = targetMobile.replace(/\D/g, '').slice(-10);
      const inviteMsg = `Hi ${targetName}, join me on Pravisti to do trade deals together! Download the app: https://pravisti.com/download`;
      const waUrl = cleanMob ? `https://wa.me/91${cleanMob}?text=${encodeURIComponent(inviteMsg)}` : `https://wa.me/?text=${encodeURIComponent(inviteMsg)}`;

      Linking.openURL(waUrl).catch(() => {
        Alert.alert('Share Error', 'Could not launch WhatsApp.');
      });
      Alert.alert('Success', `WhatsApp invite triggered for ${targetName} (${targetMobile})`);
    } catch (err) {
      Alert.alert('Notice', 'Invite notification sent.');
    } finally {
      setResendLoadingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || 'pending').toLowerCase();
    if (s === 'verified' || s === 'approved' || s === 'active') {
      return (
        <View style={[styles.badge, styles.badgeVerified]}>
          <CheckCircle2 size={12} color="#10B981" />
          <Text style={[styles.badgeText, styles.badgeTextVerified]}>Verified</Text>
        </View>
      );
    }
    if (s === 'rejected' || s === 'cancelled') {
      return (
        <View style={[styles.badge, styles.badgeRejected]}>
          <XCircle size={12} color="#EF4444" />
          <Text style={[styles.badgeText, styles.badgeTextRejected]}>Rejected</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgePending]}>
        <Clock size={12} color="#F59E0B" />
        <Text style={[styles.badgeText, styles.badgeTextPending]}>Pending</Text>
      </View>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Filtered List based on Search and Status Filter
  const filteredUsers = useMemo(() => {
    return onboardedUsers.filter(item => {
      // Status Filter
      if (statusFilter !== 'ALL') {
        const itemStatus = String(item.status || item.accountStatus || 'pending').toUpperCase();
        if (statusFilter === 'PENDING' && itemStatus !== 'PENDING') return false;
        if (statusFilter === 'VERIFIED' && !['VERIFIED', 'APPROVED', 'ACTIVE'].includes(itemStatus)) return false;
        if (statusFilter === 'REJECTED' && !['REJECTED', 'CANCELLED'].includes(itemStatus)) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const userName = (item.targetUserName || item.name || item.user?.name || '').toLowerCase();
        const mobile = (item.invitedMobile || item.mobileNumber || item.user?.mobileNumber || '').toLowerCase();
        const compName = (item.company?.name || item.company?.companyName || item.companyName || '').toLowerCase();
        const gstNo = (item.company?.registrationNumber || item.company?.gst || item.gst || '').toLowerCase();
        return (
          userName.includes(q) ||
          mobile.includes(q) ||
          compName.includes(q) ||
          gstNo.includes(q)
        );
      }

      return true;
    });
  }, [onboardedUsers, searchQuery, statusFilter]);

  const renderItem = ({ item }) => {
    const userName = item.targetUserName || item.name || item.user?.name || 'Unnamed User';
    const mobile = item.invitedMobile || item.mobileNumber || item.user?.mobileNumber || 'N/A';
    const role = (item.role || item.userRole || 'Trader').toUpperCase();
    const company = item.company || {};
    const companyName = company.name || company.companyName || item.companyName || 'No Company Details';
    const gstNo = company.registrationNumber || company.gst || item.gst || '';
    const products = item.products || (company.products ? company.products : []);
    const createdDate = item.createdDate || item.createdAt;

    // Find linked company name if available
    const linkedComp = userCompanies.find(c => (c._id || c.id) === item.linkedCompanyId);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.mobileRow}>
                <Phone size={12} color="#64748B" />
                <Text style={styles.mobileText}>{mobile}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.roleChip, role === 'SELLER' ? styles.roleChipSeller : styles.roleChipBuyer]}>
              <Text style={[styles.roleText, role === 'SELLER' ? styles.roleTextSeller : styles.roleTextBuyer]}>
                {role}
              </Text>
            </View>
            {renderStatusBadge(item.status || item.accountStatus)}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Building2 size={16} color="#3B82F6" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Company / Business</Text>
              <Text style={styles.detailValue}>{companyName}</Text>
              {!!gstNo && <Text style={styles.subDetail}>GSTIN: {gstNo}</Text>}
            </View>
          </View>

          {/* Linked Trader Company indicator when viewing All Companies */}
          {selectedCompanyId === 'ALL' && linkedComp?.name && (
            <View style={styles.linkedCompanyBadge}>
              <Briefcase size={12} color="#2563EB" />
              <Text style={styles.linkedCompanyText}>Onboarded for: {linkedComp.name}</Text>
            </View>
          )}

          {createdDate && (
            <View style={styles.detailRow}>
              <Calendar size={16} color="#8B5CF6" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Onboarded Date</Text>
                <Text style={styles.detailValue}>{formatDate(createdDate)}</Text>
              </View>
            </View>
          )}

          <View style={styles.verificationRow}>
            <ShieldCheck size={16} color="#059669" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Verification Breakdown</Text>
              <View style={styles.stepsWrap}>
                <View style={styles.stepItem}>
                  <Text style={styles.stepName}>Account: </Text>
                  <Text style={styles.stepStatus}>{item.accountStatus || 'pending'}</Text>
                </View>
                <Text style={styles.dot}>•</Text>
                <View style={styles.stepItem}>
                  <Text style={styles.stepName}>Company: </Text>
                  <Text style={styles.stepStatus}>{item.companyStatus || 'pending'}</Text>
                </View>
                <Text style={styles.dot}>•</Text>
                <View style={styles.stepItem}>
                  <Text style={styles.stepName}>Product: </Text>
                  <Text style={styles.stepStatus}>{item.productStatus || 'pending'}</Text>
                </View>
              </View>
            </View>
          </View>

          {Array.isArray(products) && products.length > 0 && (
            <View style={styles.detailRow}>
              <Package size={16} color="#F59E0B" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Commodity Products</Text>
                <View style={styles.productsWrap}>
                  {products.map((p, idx) => (
                    <View key={idx} style={styles.productTag}>
                      <Text style={styles.productTagText}>{p.name || (typeof p === 'string' ? p : 'Product')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Action Bar: Resend WhatsApp Invite & Edit Profile */}
          <View style={styles.cardActionBar}>
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => handleResendInvite(item)}
              activeOpacity={0.8}
            >
              {resendLoadingId === (item._id || item.id || item.registrationId) ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={13} color="#FFFFFF" />
                  <Text style={styles.resendBtnText}>Resend WhatsApp</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.7}
            >
              <Edit3 size={13} color="#2563EB" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const selectedCompanyName = useMemo(() => {
    if (selectedCompanyId === 'ALL') return 'All Companies';
    const match = userCompanies.find(c => (c._id || c.id) === selectedCompanyId);
    return match?.name || 'Selected Company';
  }, [selectedCompanyId, userCompanies]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (!onNavigate) return;
            onNavigate('pop');
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Onboarded Users</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {selectedCompanyName} • {filteredUsers.length} Parties
          </Text>
        </View>

        {/* Direct Onboard Button */}
        <TouchableOpacity
          style={styles.headerOnboardBtn}
          onPress={handleOpenOnboardModal}
          activeOpacity={0.85}
        >
          <UserPlus size={14} color="#FFFFFF" />
          <Text style={styles.headerOnboardBtnText}>+ Onboard</Text>
        </TouchableOpacity>
      </View>

      {/* Company Filter Tabs Bar */}
      <View style={styles.companyFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.companyScrollContent}
        >
          {/* All Companies Tab */}
          <TouchableOpacity
            style={[
              styles.companyChip,
              selectedCompanyId === 'ALL' && styles.companyChipActive,
            ]}
            onPress={() => handleSelectCompany('ALL')}
            activeOpacity={0.7}
          >
            <Building2
              size={13}
              color={selectedCompanyId === 'ALL' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.companyChipText,
                selectedCompanyId === 'ALL' && styles.companyChipTextActive,
              ]}
            >
              All Companies
            </Text>
          </TouchableOpacity>

          {/* Individual Companies */}
          {userCompanies.map((comp) => {
            const cId = comp._id || comp.id;
            const isSelected = selectedCompanyId === cId;
            return (
              <TouchableOpacity
                key={cId}
                style={[styles.companyChip, isSelected && styles.companyChipActive]}
                onPress={() => handleSelectCompany(comp)}
                activeOpacity={0.7}
              >
                {isSelected && <Check size={12} color="#FFFFFF" style={{ marginRight: 4 }} />}
                <Text
                  style={[
                    styles.companyChipText,
                    isSelected && styles.companyChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {comp.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search & Status Filters */}
      <View style={styles.searchAndFilterRow}>
        <View style={styles.searchBox}>
          <Search size={15} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search party, mobile, company..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filters */}
        <View style={styles.statusTabs}>
          {['ALL', 'PENDING', 'VERIFIED'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.statusTab,
                statusFilter === st && styles.statusTabActive,
              ]}
              onPress={() => setStatusFilter(st)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.statusTabText,
                  statusFilter === st && styles.statusTabTextActive,
                ]}
              >
                {st === 'ALL' ? 'All' : st === 'PENDING' ? 'Pending' : 'Verified'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading parties for {selectedCompanyName}...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item, index) => item.registrationId || item._id || item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <User size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Parties Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'No party matches your search query.'
                  : `No onboarded parties found for ${selectedCompanyName}. Start by onboarding a buyer or seller.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyOnboardBtn}
                onPress={handleOpenOnboardModal}
                activeOpacity={0.85}
              >
                <UserPlus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyOnboardBtnText}>Onboard New Party</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Direct Trader Onboarding Modal */}
      <Modal
        visible={onboardModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setOnboardModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Onboard Counterparty</Text>
                <Text style={styles.modalSubTitle}>
                  Register a buyer or seller for {selectedCompanyName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOnboardModalOpen(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {onboardError ? (
              <View style={styles.errorAlert}>
                <AlertCircle size={15} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorAlertText}>{onboardError}</Text>
              </View>
            ) : null}

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 8 }}>
                {/* Role Switcher */}
                <View>
                  <Text style={styles.fieldLabel}>Party Role *</Text>
                  <View style={styles.roleToggleRow}>
                    <TouchableOpacity
                      style={[styles.roleOptionBtn, onboardForm.role === 'seller' && styles.roleOptionBtnActiveSeller]}
                      onPress={() => setOnboardForm(prev => ({ ...prev, role: 'seller' }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleOptionBtnText, onboardForm.role === 'seller' && styles.roleOptionBtnTextActive]}>
                        🌾 Seller (Supplier)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.roleOptionBtn, onboardForm.role === 'buyer' && styles.roleOptionBtnActiveBuyer]}
                      onPress={() => setOnboardForm(prev => ({ ...prev, role: 'buyer' }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleOptionBtnText, onboardForm.role === 'buyer' && styles.roleOptionBtnTextActive]}>
                        🛒 Buyer (Purchaser)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Company Selection (if multiple companies) */}
                {userCompanies.length > 1 && (
                  <View>
                    <Text style={styles.fieldLabel}>Onboarding For (Your Company) *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {userCompanies.map(c => {
                          const id = c._id || c.id;
                          const isPicked = onboardForm.targetCompanyId === id;
                          return (
                            <TouchableOpacity
                              key={id}
                              style={[styles.companyPickerPill, isPicked && styles.companyPickerPillActive]}
                              onPress={() => setOnboardForm(prev => ({ ...prev, targetCompanyId: id }))}
                            >
                              <Text style={[styles.companyPickerPillText, isPicked && styles.companyPickerPillTextActive]}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Mobile Number */}
                <View>
                  <Text style={styles.fieldLabel}>10-Digit Mobile Number *</Text>
                  <View style={styles.phoneInputRow}>
                    <Text style={styles.phonePrefix}>+91</Text>
                    <TextInput
                      style={styles.phoneInput}
                      value={onboardForm.mobileNumber}
                      onChangeText={handleOnboardMobileChange}
                      placeholder="9876543210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    {matchedExistingUser && (
                      <CheckCircle2 size={18} color="#16A34A" style={{ marginRight: 8 }} />
                    )}
                  </View>
                </View>

                {/* If already onboarded, show info card */}
                {matchedExistingUser ? (
                  <View style={styles.alreadyOnboardedAlertCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 size={16} color="#15803D" />
                      <Text style={styles.alreadyOnboardedAlertTitle}>Already Onboarded Party</Text>
                    </View>
                    <Text style={styles.alreadyOnboardedAlertName}>
                      {matchedExistingUser.name || matchedExistingUser.targetUserName || 'Party'}
                    </Text>
                    <Text style={styles.alreadyOnboardedAlertMeta}>
                      {matchedExistingUser.company?.name || 'Company'} • +91 {matchedExistingUser.mobileNumber || matchedExistingUser.invitedMobile}
                    </Text>
                    <Text style={styles.alreadyOnboardedAlertHint}>
                      ✓ This party is already registered in your directory. No need to fill details again.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Contact Name */}
                    <View>
                      <Text style={styles.fieldLabel}>Contact Person Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={onboardForm.name}
                        onChangeText={val => setOnboardForm(prev => ({ ...prev, name: val }))}
                        placeholder="Full Name (e.g. Ramesh Patel)"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    {/* Company Name */}
                    <View>
                      <Text style={styles.fieldLabel}>Firm / Company Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={onboardForm.companyName}
                        onChangeText={val => setOnboardForm(prev => ({ ...prev, companyName: val }))}
                        placeholder="e.g. Patel Agro Foods Pvt Ltd"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </>
                )}

                {/* GST Number (Optional) */}
                <View>
                  <Text style={styles.fieldLabel}>GSTIN / Registration Number (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={onboardForm.gstin}
                    onChangeText={val => setOnboardForm(prev => ({ ...prev, gstin: val.toUpperCase().trim() }))}
                    placeholder="27AAAAA0000A1Z5 (or leave blank)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                </View>

                {/* Pincode with live lookup */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>PIN Code</Text>
                    {onboardPincodeLoading && (
                      <Text style={{ fontSize: 11, color: '#2563EB' }}>Resolving city...</Text>
                    )}
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={onboardForm.pincode}
                    onChangeText={handleOnboardPincodeChange}
                    placeholder="6-digit PIN code"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                {/* City & State */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>City / Mandi</Text>
                    <TextInput
                      style={styles.textInput}
                      value={onboardForm.city}
                      onChangeText={val => setOnboardForm(prev => ({ ...prev, city: val }))}
                      placeholder="City"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>State</Text>
                    <TextInput
                      style={styles.textInput}
                      value={onboardForm.state}
                      onChangeText={val => setOnboardForm(prev => ({ ...prev, state: val }))}
                      placeholder="State"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Street Address */}
                <View>
                  <Text style={styles.fieldLabel}>Street Address / Market Yard</Text>
                  <TextInput
                    style={styles.textInput}
                    value={onboardForm.street}
                    onChangeText={val => setOnboardForm(prev => ({ ...prev, street: val }))}
                    placeholder="Shop No., Market Yard, Mandi Road"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Product Name (For Sellers) */}
                {onboardForm.role === 'seller' && (
                  <View>
                    <Text style={styles.fieldLabel}>Commodity / Product Traded</Text>
                    <TextInput
                      style={styles.textInput}
                      value={onboardForm.productName}
                      onChangeText={val => setOnboardForm(prev => ({ ...prev, productName: val }))}
                      placeholder="e.g. Wheat, Chana, Mustard, Soyabean"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setOnboardModalOpen(false)}
                disabled={onboardSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleExecuteDirectOnboard}
                disabled={onboardSubmitting}
              >
                {onboardSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Register Party ✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Business Profile Modal */}
      <Modal visible={editModalOpen} transparent animationType="slide" onRequestClose={() => setEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Business Profile</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 6 }}>
                <View>
                  <Text style={styles.fieldLabel}>Contact Person Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.contactName}
                    onChangeText={val => setEditForm(prev => ({ ...prev, contactName: val }))}
                    placeholder="Full Name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Company Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.companyName}
                    onChangeText={val => setEditForm(prev => ({ ...prev, companyName: val }))}
                    placeholder="Company Name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>GST / Registration Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.gstin}
                    onChangeText={val => setEditForm(prev => ({ ...prev, gstin: val }))}
                    placeholder="GST Number"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Street Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.street}
                    onChangeText={val => setEditForm(prev => ({ ...prev, street: val }))}
                    placeholder="Street Address"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.city}
                      onChangeText={val => setEditForm(prev => ({ ...prev, city: val }))}
                      placeholder="City"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>State</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.state}
                      onChangeText={val => setEditForm(prev => ({ ...prev, state: val }))}
                      placeholder="State"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={editLoading}>
                {editLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes ✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OnboardedUsers;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  headerOnboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  headerOnboardBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Company Filter Tabs
  companyFilterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  companyScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  companyChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  companyChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  companyChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Search & Filter
  searchAndFilterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  statusTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  statusTab: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  statusTabActive: {
    backgroundColor: '#0F172A',
  },
  statusTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  mobileText: {
    fontSize: 12.5,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  roleChipSeller: {
    backgroundColor: '#ECFDF5',
  },
  roleChipBuyer: {
    backgroundColor: '#EFF6FF',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleTextSeller: {
    color: '#047857',
  },
  roleTextBuyer: {
    color: '#1D4ED8',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeVerified: {
    backgroundColor: '#D1FAE5',
  },
  badgeTextVerified: {
    color: '#065F46',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextRejected: {
    color: '#991B1B',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardBody: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 1,
  },
  subDetail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  linkedCompanyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  linkedCompanyText: {
    fontSize: 11.5,
    color: '#1E40AF',
    fontWeight: '600',
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  stepsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepName: {
    fontSize: 12,
    color: '#64748B',
  },
  stepStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  dot: {
    marginHorizontal: 6,
    color: '#94A3B8',
  },
  productsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  productTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  productTagText: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '500',
  },
  cardActionBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resendBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  editBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  editBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },

  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyOnboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
  },
  emptyOnboardBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorAlertText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  phonePrefix: {
    paddingLeft: 12,
    paddingRight: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 9,
    paddingRight: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  roleOptionBtnActiveSeller: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  roleOptionBtnActiveBuyer: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  roleOptionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  roleOptionBtnTextActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  companyPickerPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  companyPickerPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  companyPickerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  companyPickerPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  alreadyOnboardedAlertCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  alreadyOnboardedAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  alreadyOnboardedAlertName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  alreadyOnboardedAlertMeta: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
  },
  alreadyOnboardedAlertHint: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
});
