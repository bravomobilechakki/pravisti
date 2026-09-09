import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Edit3,
  Building2,
  User,
  Handshake,
  Tag,
  Box,
  FileText,
  Phone,
  Mail,
  MapPin,
  Globe,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  Users,
  CheckCircle2,
  FilePlus,
  Package,
  BookOpen,
  SlidersHorizontal,
  Bell,
  Truck,
  Receipt,
  X,
  LogOut,
  ShieldCheck,
  Calendar,
  Layers,
  MessageSquare,
  FolderTree,
  LayoutGrid,
  Wallet,
} from 'lucide-react-native';
import {
  getCompanyDetails,
  getCompanies,
  updateCompany,
  deleteCompany,
  getDeals,
  getExpiredDeals,
  getUserProfile,
  getBrokerProductAccessRequests,
  getBrokerMyDeals,
  getBrokerPendingQueue,
  getPendingInvitations,
  getUserNotifications,
  resolveImageUrl,
} from '../../../services/api';
import ProductAccessRequestModal from '../../common/ProductAccessRequestModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Reusable SVG Sparkline Wave Component matching reference image
const SparklineWave = ({ color, gradientId, pathD, fillD }) => (
  <View style={styles.sparklineContainer}>
    <Svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      <Path d={fillD} fill={`url(#${gradientId})`} />
      <Path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </View>
);

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
  }
  if (Array.isArray(res.queue)) return res.queue;
  if (Array.isArray(res.onboardings)) return res.onboardings;
  if (Array.isArray(res.onboardedUsers)) return res.onboardedUsers;
  if (Array.isArray(res.myDeals)) return res.myDeals;
  if (Array.isArray(res.deals)) return res.deals;
  return [];
};

const formatVolume = (value) => {
  const num = Number(value);
  if (isNaN(num) || num <= 0) return '₹0';
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(1)}k`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

const getDealStatusInfo = (deal) => {
  const rawStatus = String(deal?.status || '').toLowerCase().trim();

  // Check party approvalStatus if available
  if (deal?.approvalStatus) {
    const isRejected = Object.values(deal.approvalStatus).some(
      (v) => String(v).toLowerCase() === 'rejected'
    );
    if (isRejected || rawStatus === 'rejected') {
      return { label: 'Rejected', bg: '#FEF2F2', color: '#EF4444' };
    }
  }

  if (rawStatus === 'confirmed' || rawStatus === 'approved') {
    return { label: 'Confirmed', bg: '#ECFDF5', color: '#059669' };
  }
  if (rawStatus === 'active') {
    return { label: 'Active', bg: '#E8F8F0', color: '#10B981' };
  }
  if (['completed', 'settled', 'delivered'].includes(rawStatus)) {
    return { label: 'Completed', bg: '#F1F5F9', color: '#64748B' };
  }
  if (
    ['in progress', 'in_progress', 'inprogress', 'negotiation', 'processing'].includes(
      rawStatus
    )
  ) {
    return { label: 'In Progress', bg: '#EFF6FF', color: '#2563EB' };
  }
  if (['draft', 'created'].includes(rawStatus)) {
    return { label: 'Draft', bg: '#FEF3C7', color: '#D97706' };
  }
  if (rawStatus === 'cancelled') {
    return { label: 'Cancelled', bg: '#FEF2F2', color: '#EF4444' };
  }
  if (rawStatus === 'rejected') {
    return { label: 'Rejected', bg: '#FEF2F2', color: '#EF4444' };
  }
  if (rawStatus === 'expired') {
    return { label: 'Expired', bg: '#FEF2F2', color: '#EF4444' };
  }
  if (rawStatus === 'pending') {
    return { label: 'Pending', bg: '#FFFBEB', color: '#D97706' };
  }

  return {
    label: rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : 'Active',
    bg: '#E8F8F0',
    color: '#10B981',
  };
};

const CompanyDetails = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [company, setCompany] = React.useState(routeData?.company || null);
  const [companiesList, setCompaniesList] = React.useState([]);
  const [fetchedDeals, setFetchedDeals] = React.useState([]);
  const fetchedDealsRef = React.useRef([]);
  const lastFetchedDealsCompanyId = React.useRef(null);
  const [isDealsLoading, setIsDealsLoading] = React.useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [isCompanyPickerOpen, setIsCompanyPickerOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(routeData?.user || null);
  const [unreadNotifCount, setUnreadNotifCount] = React.useState(0);

  const [editData, setEditData] = React.useState({
    name: '',
    email: '',
    phone: '',
    type: '',
    registrationNumber: '',
    industry: '',
    industryId: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    website: '',
    country: 'India',
    description: '',
  });

  const [editErrors, setEditErrors] = React.useState({ name: '', phone: '', registrationNumber: '' });
  const [accessRequests, setAccessRequests] = React.useState([]);
  const [isAccessModalVisible, setIsAccessModalVisible] = React.useState(false);
  const [onboardedUsers, setOnboardedUsers] = React.useState([]);

  const getUserRoleInCompany = () => {
    if (!currentUser || !company) return 'Trader';

    const currentUserId = currentUser.id || currentUser._id || currentUser.userId;
    const currentUserMobile = currentUser.mobileNumber || currentUser.mobile;

    const ownerId =
      typeof company.owner === 'object' && company.owner !== null
        ? company.owner._id || company.owner.id || company.owner.userId
        : company.owner;

    const ownerMobile =
      typeof company.owner === 'object' && company.owner !== null
        ? company.owner.mobileNumber
        : null;

    if (
      (currentUserId && ownerId && String(currentUserId) === String(ownerId)) ||
      (currentUserMobile && ownerMobile && String(currentUserMobile).replace(/\D/g, '') === String(ownerMobile).replace(/\D/g, '')) ||
      (currentUserMobile && company.phone && String(currentUserMobile).replace(/\D/g, '') === String(company.phone).replace(/\D/g, ''))
    ) {
      return 'Owner';
    }

    if (Array.isArray(company.employees)) {
      const isEmployee = company.employees.some((emp) => {
        const empId = typeof emp === 'object' && emp !== null ? emp._id || emp.id || emp.userId : emp;
        const empMobile = typeof emp === 'object' && emp !== null ? emp.mobileNumber : null;
        return (
          (currentUserId && empId && String(currentUserId) === String(empId)) ||
          (currentUserMobile && empMobile && String(currentUserMobile).replace(/\D/g, '') === String(empMobile).replace(/\D/g, ''))
        );
      });
      if (isEmployee) return 'Employee';
    }

    return 'Trader';
  };

  React.useEffect(() => {
    const fetchUserAndNotifications = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userRes = await getUserProfile(token);
          if (userRes && userRes.success) {
            const storedProfile = await AsyncStorage.getItem('user_completed_profile');
            let merged = { ...userRes.data };
            if (storedProfile) {
              merged = { ...merged, ...JSON.parse(storedProfile) };
            }
            setCurrentUser(merged);
          }

          try {
            const currentCid = routeData?.company?._id || routeData?.company?.id;
            const notifRes = await getUserNotifications(token, currentCid);
            if (notifRes && notifRes.success && Array.isArray(notifRes.data)) {
              const unread = notifRes.data.filter((n) => !n.isRead).length;
              setUnreadNotifCount(unread);
            } else {
              setUnreadNotifCount(0);
            }
          } catch (e) {
            setUnreadNotifCount(0);
          }
        }
      } catch (ue) {
        console.warn('Failed to fetch user profile in CompanyDetails:', ue);
      }
    };
    fetchUserAndNotifications();
  }, [routeData?.company?._id, routeData?.company?.id]);

  const fetchAllCompanies = React.useCallback(async () => {
    try {
      const res = await getCompanies(1, 20);
      if (res && res.success) {
        const list = res.data?.companies || [];
        setCompaniesList(list);
        setCompany((prev) => (prev ? prev : (list.length > 0 ? list[0] : null)));
      }
    } catch (e) {
      console.warn('Failed to load companies list:', e);
    }
  }, []);

  const fetchDetails = React.useCallback(async (targetCompanyId) => {
    const id = targetCompanyId || company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!id) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const response = await getCompanyDetails(id);
      if (response && response.success) {
        setCompany(response.data);

        const isIndustryObj = typeof response.data.industry === 'object' && response.data.industry !== null;

        setEditData({
          name: response.data.name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          type: response.data.type || '',
          registrationNumber: response.data.registrationNumber || response.data.gstin || '',
          industry: isIndustryObj ? response.data.industry.name || '' : response.data.industry || '',
          industryId: isIndustryObj ? response.data.industry._id || response.data.industry.id || '' : '',
          street: response.data.address?.street || '',
          city: response.data.address?.city || '',
          state: response.data.address?.state || '',
          postalCode: response.data.address?.postalCode || '',
          country: response.data.address?.country || 'India',
          website: response.data.website || '',
          description: response.data.description || '',
        });

        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            const notifRes = await getUserNotifications(token, id);
            if (notifRes && notifRes.success && Array.isArray(notifRes.data)) {
              setUnreadNotifCount(notifRes.data.filter((n) => !n.isRead).length);
            }
          }
        } catch (ne) { }
      }
    } catch (error) {
      console.warn('Error fetching company details:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [company?._id, company?.id, routeData?.company?._id, routeData?.company?.id]);

  const fetchDealsList = React.useCallback(async () => {
    const id = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!id) {
      setFetchedDeals([]);
      setIsDealsLoading(false);
      return;
    }

    const cacheKey = `company_deals_cache_${id}`;

    // 1. Instant Cache Load for 0ms loading time
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setFetchedDeals(parsed);
          setIsDealsLoading(false);
        }
      }
    } catch (ce) { }

    // 2. Fetch fresh deals from API
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const activeRes = await getDeals(token, 1, 50, id);
      let allDeals = [];

      if (activeRes && activeRes.success) {
        const d = activeRes.data?.deals || activeRes.data || [];
        allDeals = Array.isArray(d) ? d : [];
      }

      // Also grab expired/general deals to ensure full completeness
      try {
        const generalRes = await getDeals(token, 1, 50);
        const generalList = Array.isArray(generalRes?.data?.deals)
          ? generalRes.data.deals
          : Array.isArray(generalRes?.data)
            ? generalRes.data
            : [];
        const seen = new Set(allDeals.map((d) => String(d._id || d.id)));
        generalList.forEach((d) => {
          const did = String(d._id || d.id);
          if (!seen.has(did)) {
            seen.add(did);
            allDeals.push(d);
          }
        });
      } catch (ge) { }

      const isDealForThisCompany = (deal) => {
        const tId = String(id);
        const sellerCid = String(deal.sellerCompanyId?._id || deal.sellerCompanyId?.id || deal.sellerCompanyId || '');
        const buyerCid = String(deal.buyerCompanyId?._id || deal.buyerCompanyId?.id || deal.buyerCompanyId || '');
        const brokerCid = String(deal.brokerCompanyId?._id || deal.brokerCompanyId?.id || deal.brokerCompanyId || '');
        const p1Cid = String(deal.party1?.companyId?._id || deal.party1?.companyId || deal.party1?.company?._id || deal.party1?.company?.id || '');
        const p2Cid = String(deal.party2?.companyId?._id || deal.party2?.companyId || deal.party2?.company?._id || deal.party2?.company?.id || '');
        const creatorCid = String(deal.creatorCompanyId?._id || deal.creatorCompanyId?.id || deal.creatorCompanyId || '');
        const targetCid = String(deal.targetCompanyId?._id || deal.targetCompanyId?.id || deal.targetCompanyId || '');
        const directCid = String(deal.companyId?._id || deal.companyId?.id || deal.companyId || '');
        const idMatches = (
          sellerCid === tId ||
          buyerCid === tId ||
          brokerCid === tId ||
          p1Cid === tId ||
          p2Cid === tId ||
          creatorCid === tId ||
          targetCid === tId ||
          directCid === tId
        );
        if (idMatches) return true;

        const compName = (company?.name || company?.companyName || routeData?.company?.name || '').trim().toLowerCase();
        if (compName) {
          const sName = String(deal.sellerCompany?.name || deal.sellerCompanyId?.companyName || deal.sellerCompanyId?.name || '').trim().toLowerCase();
          const bName = String(deal.buyerCompany?.name || deal.buyerCompanyId?.companyName || deal.buyerCompanyId?.name || '').trim().toLowerCase();
          const p1Name = String(deal.party1?.company?.name || deal.party1?.name || '').trim().toLowerCase();
          const p2Name = String(deal.party2?.company?.name || deal.party2?.name || '').trim().toLowerCase();
          const dName = String(deal.companyName || deal.company?.name || '').trim().toLowerCase();
          if (sName === compName || bName === compName || p1Name === compName || p2Name === compName || dName === compName) {
            return true;
          }
        }
        return false;
      };

      const filtered = allDeals.filter(isDealForThisCompany);

      fetchedDealsRef.current = filtered;
      setFetchedDeals(filtered);
      AsyncStorage.setItem(cacheKey, JSON.stringify(filtered)).catch(() => { });
    } catch (e) {
      console.warn('Failed to fetch deals for company details:', e);
    } finally {
      setIsDealsLoading(false);
    }
  }, [company?._id, company?.id, company?.name, company?.companyName, routeData?.company?._id, routeData?.company?.id, routeData?.company?.name]);

  const fetchOnboardedUsers = React.useCallback(async (targetCompanyId = null) => {
    const rawId = targetCompanyId || company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!rawId) return;

    const currentCompanyId = String(rawId);
    const cacheKey = `company_onboarded_users_${currentCompanyId}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Strictly ensure cached items are for this company
          const validCached = parsed.filter((item) => {
            const itemCompId = String(
              item.brokerCompanyId ||
              item.creatorCompanyId ||
              item.companyId ||
              item.originCompanyId ||
              item.creatorCompany?._id ||
              item.creatorCompany?.id ||
              item.linkedCompanyId ||
              ''
            );
            return !itemCompId || itemCompId === 'undefined' || itemCompId === 'null' || itemCompId === currentCompanyId;
          });
          setOnboardedUsers(validCached);
        }
      }
    } catch (e) { }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // Strictly fetch only for this current company
      const fetchCalls = [
        getBrokerPendingQueue(currentCompanyId, token),
        getBrokerMyDeals(currentCompanyId, token),
      ];

      const results = await Promise.allSettled(fetchCalls);

      const combined = [];
      const seenIds = new Set();
      const targetStr = String(currentCompanyId);

      const addItems = (arr) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((item) => {
          if (!item) return;
          const itemCompId = String(
            item.brokerCompanyId ||
            item.creatorCompanyId ||
            item.companyId ||
            item.originCompanyId ||
            item.creatorCompany?._id ||
            item.creatorCompany?.id ||
            item.company?._id ||
            item.company?.id ||
            item.linkedCompanyId ||
            ''
          );
          // If item has a specific company association and does not match current company, skip
          if (itemCompId && itemCompId !== 'undefined' && itemCompId !== 'null' && itemCompId !== targetStr) {
            return;
          }

          const id =
            item._id ||
            item.id ||
            item.registrationId ||
            item.mobileNumber ||
            item.invitedMobile ||
            (item.company?.name ? `${item.company.name}_${item.name || ''}` : null);
          const key = id ? String(id) : Math.random().toString();
          if (key && !seenIds.has(key)) {
            seenIds.add(key);
            combined.push({
              ...item,
              linkedCompanyId: targetStr,
            });
          }
        });
      };

      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          addItems(extractApiArray(r.value));
        }
      });

      // Supplement with counterparties from deals strictly for this company
      const activeDeals = Array.isArray(fetchedDealsRef.current) ? fetchedDealsRef.current : (Array.isArray(fetchedDeals) ? fetchedDeals : []);
      activeDeals.forEach((deal) => {
        const p1 = deal.sellerCompany || deal.sellerCompanyId || deal.party1?.company || deal.party1;
        const p1Id = String(p1?._id || p1?.id || deal.sellerCompanyId || '');
        const p2 = deal.buyerCompany || deal.buyerCompanyId || deal.party2?.company || deal.party2;
        const p2Id = String(p2?._id || p2?.id || deal.buyerCompanyId || '');

        const isP1Current = p1Id === targetStr;
        const isP2Current = p2Id === targetStr;

        if (isP1Current && p2 && p2Id !== targetStr) {
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
        } else if (isP2Current && p1 && p1Id !== targetStr) {
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
      });

      setOnboardedUsers(combined);
      AsyncStorage.setItem(cacheKey, JSON.stringify(combined)).catch(() => { });
    } catch (e) {
      console.warn('Failed to fetch onboarded users for company details:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?._id, company?.id, routeData?.company?._id, routeData?.company?.id]);

  const checkProductAccessRequests = React.useCallback(async () => {
    const companyId = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!companyId) return;
    try {
      const res = await getBrokerProductAccessRequests(companyId);
      if (res && res.success && Array.isArray(res.data)) {
        const pending = res.data.filter((r) => r.status === 'pending');
        setAccessRequests(res.data);
        if (pending.length > 0) {
          setIsAccessModalVisible(true);
        } else {
          setIsAccessModalVisible(false);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch product access requests:', err);
    }
  }, [company?._id, company?.id, routeData?.company?._id, routeData?.company?.id]);

  React.useEffect(() => {
    fetchAllCompanies();
    fetchDetails();
  }, [fetchAllCompanies, fetchDetails]);

  const currentActiveCompanyId = company?._id || company?.id;

  React.useEffect(() => {
    if (currentActiveCompanyId && lastFetchedDealsCompanyId.current !== currentActiveCompanyId) {
      lastFetchedDealsCompanyId.current = currentActiveCompanyId;
      fetchDealsList();
      fetchOnboardedUsers();
      checkProductAccessRequests();
    }
  }, [currentActiveCompanyId, fetchDealsList, fetchOnboardedUsers, checkProductAccessRequests]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    lastFetchedDealsCompanyId.current = null;
    setOnboardedUsers([]);
    fetchDetails();
    fetchDealsList();
    fetchOnboardedUsers();
    fetchAllCompanies();
  }, [fetchDetails, fetchDealsList, fetchOnboardedUsers, fetchAllCompanies]);

  const handleUpdate = async () => {
    if (!editData.name || !editData.phone || !editData.registrationNumber) {
      Alert.alert('Required Fields', 'Company Name, Phone, and Registration / GSTIN are mandatory.');
      return;
    }
    const id = company?._id || company?.id;
    try {
      const token = await AsyncStorage.getItem('userToken');

      const payload = {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        type: editData.type,
        registrationNumber: editData.registrationNumber,
        industry: editData.industryId || editData.industry,
        address: {
          street: editData.street,
          city: editData.city,
          state: editData.state,
          postalCode: editData.postalCode,
          country: editData.country,
        },
        website: editData.website,
        description: editData.description,
      };

      const response = await updateCompany(id, payload, token);
      if (response && response.success) {
        Alert.alert('Success', 'Company profile updated successfully!');
        setIsEditModalVisible(false);
        fetchDetails();
      } else {
        const errMsg = response.message || 'Failed to update company';
        const lowerMsg = errMsg.toLowerCase();
        if (lowerMsg.includes('already exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('registration') || lowerMsg.includes('gst')) {
          setEditErrors((prev) => ({ ...prev, registrationNumber: errMsg }));
        } else {
          Alert.alert('Error', errMsg);
        }
      }
    } catch (error) {
      const errMsg = error.message || 'Failed to update company';
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('already exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('registration') || lowerMsg.includes('gst')) {
        setEditErrors((prev) => ({ ...prev, registrationNumber: errMsg }));
      } else {
        Alert.alert('Error', errMsg);
      }
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Company',
      'Are you sure you want to delete this company? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const id = company?._id || company?.id;
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await deleteCompany(id, token);
              if (response && response.success) {
                Alert.alert('Success', 'Company deleted successfully');
                onNavigate('Dashboard', routeData, { refresh: true });
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete company');
            }
          },
        },
      ]
    );
  };

  const deals = React.useMemo(() => {
    return Array.isArray(fetchedDeals) ? fetchedDeals : [];
  }, [fetchedDeals]);

  const confirmedDealsCount = React.useMemo(() => {
    return deals.filter((d) => ['confirmed', 'active', 'completed', 'approved'].includes((d.status || '').toLowerCase())).length;
  }, [deals]);

  const pendingDealsCount = React.useMemo(() => {
    return deals.filter((d) => ['pending', 'in progress', 'inprogress', 'created'].includes((d.status || '').toLowerCase()) || !d.status).length;
  }, [deals]);

  const totalDealsCount = React.useMemo(() => {
    return deals.length;
  }, [deals]);

  const userName = currentUser?.name || routeData?.user?.name || 'Trader';
  const displayCompanyName = company?.name || 'Company';
  const companyFirstLetter = (company?.name || displayCompanyName || 'C').trim().charAt(0).toUpperCase();
  const userInitial = (userName || 'U').charAt(0).toUpperCase();

  // 8 Quick Action Items (Row 1: Trading & Catalog, Row 2: Parties, Comms, Finance & Reports)
  const quickActions = [
    {
      id: 'create_deal',
      title: 'Create Deal',
      icon: <FilePlus size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#1D64F2',
      onPress: () => onNavigate('CreateDeal', { originCompany: company, company }),
    },
    {
      id: 'add_product',
      title: 'Add Product',
      icon: <Package size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#FF9900',
      onPress: () => onNavigate('AddProductPage', { company }),
    },
    {
      id: 'categories',
      title: 'Add Categories',
      icon: <LayoutGrid size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#9333EA',
      onPress: () => onNavigate('CategoryPage', { company, initialTab: 'category' }),
    },
    {
      id: 'payments',
      title: 'Payments',
      icon: <Wallet size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#10B981',
      onPress: () => onNavigate('CompanyPayments', {
        company,
        companyId: company?._id || company?.id || routeData?.companyId,
        companyName: company?.name || company?.businessName || routeData?.companyName,
        deals: fetchedDeals,
        fromScreen: 'CompanyDetails',
      }),
    },
    {
      id: 'parties',
      title: 'Onboarded',
      icon: <Users size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#0D9488',
      onPress: () => onNavigate('OnboardedUsers', {
        companyId: company?._id || company?.id,
        companyName: company?.name,
        company,
        fromScreen: 'CompanyDetails',
        initialUsers: onboardedUsers,
      }),
    },
    {
      id: 'messages',
      title: 'View Chats',
      icon: <MessageSquare size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#FF1E56',
      onPress: () => onNavigate('ChatList', { company, companyId: company?._id || company?.id }),
    },
    {
      id: 'my_task',
      title: 'My Task',
      icon: <CheckCircle2 size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#059669',
      onPress: () => Alert.alert('My Task', 'Tasks feature coming soon!'),
    },
    {
      id: 'create_project',
      title: 'Create Project',
      icon: <Building2 size={24} color="#FFFFFF" strokeWidth={2.2} />,
      bgColor: '#4F46E5',
      onPress: () => Alert.alert('Create Project', 'Project management feature coming soon!'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP HEADER (With realogo.png & Notification / Avatar) ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => onNavigate('pop')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color="#1E293B" strokeWidth={2.4} />
          </TouchableOpacity>
          <Image
            source={require('../../../images/blue_logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRight}>
          {/* Notification Bell with live unread badge */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => onNavigate('Notifications', { companyId: company?._id || company?.id, company })}
            activeOpacity={0.75}
          >
            <Bell size={20} color="#1E293B" strokeWidth={2.2} />
            {unreadNotifCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Right Corner Company Avatar (shows Company Logo or Company First Letter) */}
          <TouchableOpacity
            style={styles.headerAvatarBtn}
            onPress={() => onNavigate('CompanyProfileDetails', { company })}
            activeOpacity={0.8}
          >
            <View style={styles.headerAvatarCircle}>
              {(company?.logo || company?.logoUrl || company?.image || company?.companyLogo) ? (
                <Image
                  source={{ uri: resolveImageUrl(company.logo || company.logoUrl || company.image || company.companyLogo) }}
                  style={{ width: 38, height: 38, borderRadius: 19 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.headerAvatarText}>{companyFirstLetter}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1D4ED8']}
            tintColor="#1D4ED8"
          />
        }
      >
        {/* ─── 2. ACTIVE COMPANY SELECTOR CHIP ─── */}
        <View style={styles.companySelectorWrapper}>
          <TouchableOpacity
            style={styles.companySelectorCard}
            onPress={() => onNavigate('CompanyProfileDetails', { company })}
            activeOpacity={0.8}
          >
            <View style={styles.companyIconBox}>
              {company?.logo ? (
                <Image
                  source={{ uri: resolveImageUrl(company.logo) }}
                  style={{ width: '100%', height: '100%', borderRadius: 10 }}
                  resizeMode="cover"
                />
              ) : (
                <Building2 size={18} color="#1E3A8A" strokeWidth={2.2} />
              )}
            </View>

            <View style={styles.companyNameRow}>
              <Text style={styles.companyNameText} numberOfLines={1}>
                {displayCompanyName}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setIsCompanyPickerOpen(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronDown size={16} color="#1E3A8A" strokeWidth={2.5} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.activeCompanyBadge}>
              <Text style={styles.activeCompanyBadgeText}>Active Company</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── 3. ROYAL BLUE HERO CARD (With hello.png inside circle) ─── */}
        <View style={styles.heroCard}>
          {/* Decorative Glow Circles */}
          <View style={styles.heroGlowCircle1} />
          <View style={styles.heroGlowCircle2} />

          {/* Left Side: Greeting, Heading & Voice Deal Button */}
          <View style={styles.heroLeftCol}>
            <Text style={styles.heroGreeting}>Hello, {userName}! 👋</Text>
            <Text style={styles.heroHeading}>
              Manage your business smarter with{' '}
              <Text style={styles.heroHeadingHighlight}>Pravisti</Text>
            </Text>

            <TouchableOpacity
              style={styles.heroMicBtn}
              onPress={() => onNavigate('CreateDeal', { originCompany: company, company })}
              activeOpacity={0.88}
            >
              <Plus size={16} color="#1541D8" strokeWidth={2.4} />
              <Text style={styles.heroMicBtnText}>Click and create deal</Text>
            </TouchableOpacity>
          </View>

          {/* Right Side: hello.png mascot inside shimmer outline ring */}
          <View style={styles.heroRightCol}>
            <View style={styles.mascotOuterShimmerRing}>
              <View style={styles.mascotHaloCircle}>
                <Image
                  source={require('../../../images/constructions/hello.png')}
                  style={styles.heroHelloImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>

        {/* ─── 4. QUICK ACTIONS SECTION (4x2 Grid) ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.customizeBtn}
              onPress={() => {
                Alert.alert('Quick Actions', 'Select any tile to navigate directly to management, trade, catalog, or reports.');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.customizeBtnText}>View All</Text>
              <ChevronRight size={15} color="#2563EB" strokeWidth={2.4} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionItem}
                onPress={action.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIconBox, { backgroundColor: action.bgColor }]}>
                  {action.icon}
                </View>
                <Text style={styles.quickActionTitle} numberOfLines={1}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── 5. BUSINESS OVERVIEW SECTION (3 Stat Cards with Sparklines) ─── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Business Overview</Text>

          <View style={styles.statsRow}>
            {/* 1. Total Deals */}
            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.75}
              onPress={() =>
                onNavigate('DealsList', {
                  companyId: company?._id || company?.id,
                  companyName: company?.name,
                  company,
                  initialTab: 'ALL',
                })
              }
            >
              <Text style={styles.statLabel}>Total Deals</Text>
              <Text style={styles.statValue}>{totalDealsCount}</Text>
              <SparklineWave
                color="#2563EB"
                gradientId="blueGrad"
                pathD="M0,18 C20,18 35,9 55,12 C72,15 85,5 100,3"
                fillD="M0,18 C20,18 35,9 55,12 C72,15 85,5 100,3 L100,24 L0,24 Z"
              />
            </TouchableOpacity>

            {/* 2. Confirmed Deals */}
            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.75}
              onPress={() =>
                onNavigate('DealsList', {
                  companyId: company?._id || company?.id,
                  companyName: company?.name,
                  company,
                  initialTab: 'ACTIVE',
                })
              }
            >
              <Text style={styles.statLabel}>Confirmed Deals</Text>
              <Text style={styles.statValue}>{confirmedDealsCount}</Text>
              <SparklineWave
                color="#10B981"
                gradientId="greenGrad"
                pathD="M0,19 C25,20 40,11 65,11 C80,11 90,4 100,2"
                fillD="M0,19 C25,20 40,11 65,11 C80,11 90,4 100,2 L100,24 L0,24 Z"
              />
            </TouchableOpacity>

            {/* 3. Pending Deals */}
            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.75}
              onPress={() =>
                onNavigate('DealsList', {
                  companyId: company?._id || company?.id,
                  companyName: company?.name,
                  company,
                  initialTab: 'IN_PROGRESS',
                })
              }
            >
              <Text style={styles.statLabel}>Pending Deals</Text>
              <Text style={styles.statValue}>{pendingDealsCount}</Text>
              <SparklineWave
                color="#F97316"
                gradientId="orangeGrad"
                pathD="M0,16 C20,12 35,20 55,14 C75,8 88,15 100,9"
                fillD="M0,16 C20,12 35,20 55,14 C75,8 88,15 100,9 L100,24 L0,24 Z"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 6. RECENT DEALS SECTION ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Deals</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => onNavigate('DealsList', { companyId: company?._id || company?.id, companyName: company?.name, company })}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllBtnText}>View All</Text>
              <ChevronRight size={15} color="#2563EB" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {isDealsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#1D4ED8" />
              <Text style={styles.loadingBoxText}>Loading Deals...</Text>
            </View>
          ) : deals.length > 0 ? (
            deals.slice(0, 3).map((deal, idx) => {
              const firstProd = deal.products?.[0] || deal.product || {};
              const prodObj =
                typeof firstProd.productId === 'object' && firstProd.productId !== null
                  ? firstProd.productId
                  : null;

              // Product Image extraction
              const productImage =
                prodObj?.image ||
                prodObj?.images?.[0] ||
                firstProd.image ||
                firstProd.images?.[0] ||
                deal.productImage ||
                deal.image ||
                deal.images?.[0] ||
                deal.products?.[0]?.images?.[0] ||
                null;

              // Deal Number
              const dealNumber =
                deal.dealNumber ||
                deal.dealNo ||
                deal.saudaNumber ||
                deal.contractNumber ||
                (deal._id
                  ? `#${String(deal._id).substring(deal._id.length - 6).toUpperCase()}`
                  : `#${idx + 1}`);

              // Product Name
              const pName =
                prodObj?.name ||
                firstProd.name ||
                (typeof firstProd === 'string' ? firstProd : '') ||
                deal.title ||
                'Commodity Sauda';

              // Quantity & Unit
              const rawQty = firstProd.quantity || deal.quantity || deal.qty || '';
              const rawUnit = firstProd.unit || firstProd.quantityUnit || prodObj?.unit || deal.unit || 'Bags';
              const formattedQty = rawQty ? `${rawQty} ${rawUnit}` : '100 Bags';

              // Price & Total Amount
              const price = firstProd.price || deal.price || 0;
              const totalAmt =
                deal.totalAmount ||
                firstProd.totalAmount ||
                (rawQty && price ? Number(rawQty) * Number(price) : 0);

              // Parties
              const sellerName =
                deal.sellerCompany?.name ||
                deal.sellerCompanyId?.companyName ||
                deal.sellerCompanyId?.name ||
                deal.party1?.company?.name ||
                deal.party1?.name ||
                'Seller';

              const buyerName =
                deal.buyerCompany?.name ||
                deal.buyerCompanyId?.companyName ||
                deal.buyerCompanyId?.name ||
                deal.party2?.company?.name ||
                deal.party2?.name ||
                'Buyer';

              // Date
              const formattedDate = deal.createdAt
                ? new Date(deal.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
                : 'Recent';

              const statusInfo = getDealStatusInfo(deal);

              return (
                <TouchableOpacity
                  key={deal._id || deal.id || idx}
                  style={styles.recentDealCard}
                  onPress={() => onNavigate('DealDetails', { dealId: deal._id || deal.id, deal })}
                  activeOpacity={0.8}
                >
                  {/* Product Image / Icon Box */}
                  <View style={styles.recentDealIconBox}>
                    {productImage ? (
                      <Image
                        source={{ uri: resolveImageUrl(productImage) }}
                        style={styles.recentDealProductImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.recentDealPlaceholder}>
                        <Package size={22} color="#2563EB" strokeWidth={2.2} />
                      </View>
                    )}
                  </View>

                  <View style={styles.recentDealContent}>
                    <View style={styles.recentDealHeaderRow}>
                      <View style={styles.recentDealTitleBox}>
                        <View style={styles.recentDealNumberPill}>
                          <Text style={styles.recentDealNumberText}>{dealNumber}</Text>
                        </View>
                        <Text style={styles.recentDealTitle} numberOfLines={1}>
                          {pName}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.recentDealStatusPill,
                          { backgroundColor: statusInfo.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.recentDealStatusText,
                            { color: statusInfo.color },
                          ]}
                        >
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.recentDealParties} numberOfLines={1}>
                      {sellerName} → {buyerName}
                    </Text>

                    <View style={styles.recentDealFooterRow}>
                      <View style={styles.recentDealMetaRow}>
                        {/* Date Favicon / Icon */}
                        <View style={styles.recentDealMetaBadge}>
                          <Calendar size={11} color="#64748B" strokeWidth={2.2} />
                          <Text style={styles.recentDealMetaText}>{formattedDate}</Text>
                        </View>

                        {/* Unit Favicon / Icon */}
                        <View style={styles.recentDealMetaBadge}>
                          <Layers size={11} color="#64748B" strokeWidth={2.2} />
                          <Text style={styles.recentDealMetaText}>{formattedQty}</Text>
                        </View>
                      </View>

                      {/* Total Price */}
                      <Text style={styles.recentDealPrice}>
                        ₹{totalAmt ? Number(totalAmt).toLocaleString('en-IN') : '0'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => onNavigate('CreateDeal', { originCompany: company, company })}
              activeOpacity={0.8}
            >
              <Handshake size={28} color="#2563EB" strokeWidth={2.2} />
              <Text style={styles.emptyTitle}>Create Your First Deal</Text>
              <Text style={styles.emptySubtext}>Tap to initiate a new sauda contract</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ─── 7. COMPANY PICKER MODAL ─── */}
      <Modal
        visible={isCompanyPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCompanyPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCompanyPickerOpen(false)}
        >
          <View style={styles.companyModalContainer}>
            <View style={styles.companyModalHeader}>
              <Text style={styles.companyModalTitle}>Select Active Company</Text>
              <TouchableOpacity onPress={() => setIsCompanyPickerOpen(false)} activeOpacity={0.7}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {companiesList.map((comp) => {
                const isSelected = String(comp._id || comp.id) === String(company?._id || company?.id);
                return (
                  <TouchableOpacity
                    key={comp._id || comp.id}
                    style={[styles.companyModalItem, isSelected && styles.companyModalItemActive]}
                    onPress={() => {
                      setCompany(comp);
                      setOnboardedUsers([]);
                      setIsCompanyPickerOpen(false);
                      const compId = comp._id || comp.id;
                      fetchDetails(compId);
                      fetchOnboardedUsers(compId);
                    }}
                    activeOpacity={0.75}
                  >
                    {comp.logo ? (
                      <Image
                        source={{ uri: resolveImageUrl(comp.logo) }}
                        style={{ width: 22, height: 22, borderRadius: 6, marginRight: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Building2 size={18} color={isSelected ? '#2563EB' : '#64748B'} />
                    )}
                    <Text
                      style={[styles.companyModalItemText, isSelected && styles.companyModalItemTextActive]}
                      numberOfLines={1}
                    >
                      {comp.name}
                    </Text>
                    {isSelected && <CheckCircle2 size={16} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalAddCompanyBtn}
              onPress={() => {
                setIsCompanyPickerOpen(false);
                onNavigate('AddCompany');
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.modalAddCompanyText}>Add New Company</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 9. USER PROFILE SIDE DRAWER ─── */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setIsDrawerOpen(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>

              <View style={styles.drawerAvatarWrapper}>
                <View style={styles.drawerAvatarCircle}>
                  {currentUser?.profilePicture || currentUser?.avatar ? (
                    <Image
                      source={{ uri: resolveImageUrl(currentUser.profilePicture || currentUser.avatar) }}
                      style={{ width: '100%', height: '100%', borderRadius: 34 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.drawerAvatarText}>{userInitial}</Text>
                  )}
                </View>
                <View style={styles.drawerAvatarCheckBadge}>
                  <ShieldCheck size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>

              <Text style={styles.drawerUserName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.drawerUserPhone}>
                {currentUser?.phone || currentUser?.mobileNumber || '+91 98765 43210'}
              </Text>

              <View style={styles.drawerRolePill}>
                <Text style={styles.drawerRoleText}>TRADER ACCOUNT</Text>
              </View>
            </View>

            <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.drawerSectionTitle}>COMMERCE & COMPANY</Text>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('MyCompanies');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.drawerMenuIconBg, { backgroundColor: '#EFF6FF' }]}>
                  <Building2 size={18} color="#2563EB" />
                </View>
                <Text style={styles.drawerMenuLabel}>My Companies</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('DealsList', { companyId: company?._id || company?.id, companyName: company?.name, company });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.drawerMenuIconBg, { backgroundColor: '#F0FDF4' }]}>
                  <Handshake size={18} color="#16A34A" />
                </View>
                <Text style={styles.drawerMenuLabel}>My Deals (Sauda)</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('ChatList');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.drawerMenuIconBg, { backgroundColor: '#FFF7ED' }]}>
                  <Users size={18} color="#EA580C" />
                </View>
                <Text style={styles.drawerMenuLabel}>Parties & Messages</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              <Text style={styles.drawerSectionTitle}>SETTINGS & TOOLS</Text>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('CompanyProfileDetails', { company });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.drawerMenuIconBg, { backgroundColor: '#F5F3FF' }]}>
                  <Building2 size={18} color="#7C3AED" />
                </View>
                <Text style={styles.drawerMenuLabel}>Company Profile Details</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('Profile');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.drawerMenuIconBg, { backgroundColor: '#EFF6FF' }]}>
                  <User size={18} color="#2563EB" />
                </View>
                <Text style={styles.drawerMenuLabel}>User Profile</Text>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.drawerDivider} />

              <TouchableOpacity
                style={styles.drawerLogoutBtn}
                onPress={async () => {
                  setIsDrawerOpen(false);
                  await AsyncStorage.removeItem('userToken');
                  await AsyncStorage.removeItem('user_completed_profile');
                  onNavigate('Login');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.drawerMenuIconBg, { backgroundColor: '#FEF2F2' }]}>
                  <LogOut size={18} color="#DC2626" />
                </View>
                <Text style={[styles.drawerMenuLabel, { color: '#DC2626', fontWeight: '700' }]}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── 10. EDIT COMPANY DETAILS MODAL ─── */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIndicator} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={[styles.modalHeading, { marginBottom: 0 }]}>Update Company Details</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalFieldLabel}>Company Name*</Text>
              <TextInput
                style={[styles.modalInput, editErrors.name && styles.modalInputError]}
                value={editData.name}
                onChangeText={(text) => {
                  setEditData({ ...editData, name: text });
                  if (editErrors.name) setEditErrors({ ...editErrors, name: '' });
                }}
                placeholder="Enter company name"
                placeholderTextColor="#94A3B8"
              />
              {editErrors.name ? <Text style={styles.modalErrorText}>{editErrors.name}</Text> : null}

              <Text style={styles.modalFieldLabel}>Registration / GSTIN*</Text>
              <TextInput
                style={[styles.modalInput, editErrors.registrationNumber && styles.modalInputError]}
                value={editData.registrationNumber}
                onChangeText={(text) => {
                  setEditData({ ...editData, registrationNumber: text });
                  if (editErrors.registrationNumber) setEditErrors({ ...editErrors, registrationNumber: '' });
                }}
                placeholder="REG123456 / GSTIN"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />
              {editErrors.registrationNumber ? (
                <Text style={styles.modalErrorText}>{editErrors.registrationNumber}</Text>
              ) : null}

              <Text style={styles.modalFieldLabel}>Phone Number*</Text>
              <TextInput
                style={[styles.modalInput, editErrors.phone && styles.modalInputError]}
                value={editData.phone}
                onChangeText={(text) => {
                  setEditData({ ...editData, phone: text });
                  if (editErrors.phone) setEditErrors({ ...editErrors, phone: '' });
                }}
                placeholder="10-digit number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
              />
              {editErrors.phone ? <Text style={styles.modalErrorText}>{editErrors.phone}</Text> : null}

              <Text style={styles.modalFieldLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.email}
                onChangeText={(text) => setEditData({ ...editData, email: text })}
                placeholder="info@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalFieldLabel}>Company Type</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.type}
                onChangeText={(text) => setEditData({ ...editData, type: text })}
                placeholder="trader, manufacturer, etc."
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>Industry Sector</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: '#F1F5F9', color: '#64748B' }]}
                value={editData.industry}
                editable={false}
                placeholder="Industry sector"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>Street / Area</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.street}
                onChangeText={(text) => setEditData({ ...editData, street: text })}
                placeholder="123 Main St"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>City</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.city}
                onChangeText={(text) => setEditData({ ...editData, city: text })}
                placeholder="City"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>State</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.state}
                onChangeText={(text) => setEditData({ ...editData, state: text })}
                placeholder="State"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>Postal Code</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.postalCode}
                onChangeText={(text) => setEditData({ ...editData, postalCode: text })}
                placeholder="Postal Code"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />

              <Text style={styles.modalFieldLabel}>Country</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.country}
                onChangeText={(text) => setEditData({ ...editData, country: text })}
                placeholder="India"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalFieldLabel}>Website URL</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.website}
                onChangeText={(text) => setEditData({ ...editData, website: text })}
                placeholder="https://example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.modalFieldLabel}>Business Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 74, textAlignVertical: 'top', paddingTop: 10 }]}
                value={editData.description}
                onChangeText={(text) => setEditData({ ...editData, description: text })}
                placeholder="Business terms, info..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleUpdate}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalDeleteBtn}
              onPress={() => {
                setIsEditModalVisible(false);
                handleDelete();
              }}
              activeOpacity={0.8}
            >
              <Trash2 size={15} color="#DC2626" strokeWidth={2.2} />
              <Text style={styles.modalDeleteBtnText}>Delete Company</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Product Access Requests Modal */}
      <ProductAccessRequestModal
        visible={isAccessModalVisible}
        requests={accessRequests}
        onClose={() => setIsAccessModalVisible(false)}
        onResponseSuccess={checkProductAccessRequests}
      />
    </SafeAreaView>
  );
};

export default CompanyDetails;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },

  /* ── 1. Top Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoImage: {
    width: 124,
    height: 36,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#2563EB',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  headerAvatarBtn: {
    padding: 2,
  },
  headerAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    overflow: 'hidden',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1541D8',
  },

  /* ── 2. Active Company Chip ── */
  companySelectorWrapper: {
    marginBottom: 14,
  },
  companySelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  companyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companyNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  activeCompanyBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeCompanyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },

  /* ── 3. Royal Blue Hero Card ── */
  heroCard: {
    backgroundColor: '#1541D8',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroGlowCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -60,
    right: -40,
  },
  heroGlowCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -50,
    left: -30,
  },
  heroLeftCol: {
    flex: 1.4,
    paddingRight: 6,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 23,
    marginBottom: 12,
  },
  heroHeadingHighlight: {
    color: '#93C5FD',
    fontWeight: '900',
  },
  heroMicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  heroMicBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1541D8',
    marginLeft: 5,
  },
  heroRightCol: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotOuterShimmerRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotHaloCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  heroHelloImage: {
    width: 82,
    height: 82,
  },

  /* ── 4. Quick Actions ── */
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customizeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  quickActionItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
  },
  quickActionIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        // No elevation on Android to prevent white/grey square shadow artifacts behind rounded squircle
      },
    }),
  },
  quickActionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 7,
    letterSpacing: -0.2,
  },

  /* ── 5. Business Overview ── */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  statSubtext: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
    marginBottom: 2,
  },
  sparklineContainer: {
    width: '100%',
    height: 24,
    marginTop: 4,
  },

  /* ── 6. Recent Deals ── */
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 2,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingBoxText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  recentDealCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  recentDealIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  recentDealProductImg: {
    width: '100%',
    height: '100%',
  },
  recentDealPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentDealContent: {
    flex: 1,
  },
  recentDealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentDealTitleBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 6,
  },
  recentDealNumberPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: '#BFDBFE',
  },
  recentDealNumberText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  recentDealTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    flex: 1,
  },
  recentDealStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  recentDealStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  recentDealParties: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 5,
  },
  recentDealFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentDealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentDealMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3.5,
  },
  recentDealMetaText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  recentDealPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1541D8',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* ── 7. Floating Voice Mic Button ── */
  floatingMicBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingMicInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1541D8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  /* ── Modals & Drawer ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  companyModalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  companyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  companyModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  companyModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  companyModalItemActive: {
    backgroundColor: '#EFF6FF',
  },
  companyModalItemText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    marginLeft: 10,
  },
  companyModalItemTextActive: {
    fontWeight: '800',
    color: '#2563EB',
  },
  modalAddCompanyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  modalAddCompanyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },

  /* Side Drawer */
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  drawerContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    height: '100%',
    zIndex: 10,
  },
  drawerHeader: {
    backgroundColor: '#1541D8',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 28 : 44,
    alignItems: 'center',
  },
  drawerCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  drawerAvatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1541D8',
  },
  drawerAvatarCheckBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  drawerUserName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  drawerUserPhone: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  drawerRolePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  drawerRoleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  drawerBody: {
    flex: 1,
    padding: 16,
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  drawerMenuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerMenuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  /* Edit Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '85%',
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
  },
  modalInputError: {
    borderColor: '#EF4444',
  },
  modalErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 3,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#1541D8',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
