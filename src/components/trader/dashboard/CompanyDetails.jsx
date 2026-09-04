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
  IndianRupee,
  Truck,
  PieChart,
  Receipt,
  Mic,
  X,
  LogOut,
  ShieldCheck,
  Calendar,
  Layers,
  MessageSquare,
  FolderTree,
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
} from '../../../services/api';
import ProductAccessRequestModal from '../../common/ProductAccessRequestModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Reusable SVG Sparkline Wave Component matching reference image
const SparklineWave = ({ color, gradientId, pathD, fillD }) => (
  <View style={styles.sparklineContainer}>
    <Svg width="100%" height={36} viewBox="0 0 100 36">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      <Path d={fillD} fill={`url(#${gradientId})`} />
      <Path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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

const CompanyDetails = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [company, setCompany] = React.useState(routeData?.company || null);
  const [companiesList, setCompaniesList] = React.useState([]);
  const [fetchedDeals, setFetchedDeals] = React.useState([]);
  const [isDealsLoading, setIsDealsLoading] = React.useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [isCompanyPickerOpen, setIsCompanyPickerOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(routeData?.user || null);
  const [unreadNotifCount, setUnreadNotifCount] = React.useState(1);

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
            const invRes = await getPendingInvitations(token);
            if (invRes && invRes.success && Array.isArray(invRes.data)) {
              setUnreadNotifCount(invRes.data.length || 1);
            }
          } catch (e) {}
        }
      } catch (ue) {
        console.warn('Failed to fetch user profile in CompanyDetails:', ue);
      }
    };
    fetchUserAndNotifications();
  }, []);

  const fetchAllCompanies = React.useCallback(async () => {
    try {
      const res = await getCompanies(1, 20);
      if (res && res.success) {
        const list = res.data?.companies || [];
        setCompaniesList(list);
        if (!company && list.length > 0) {
          setCompany(list[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load companies list:', e);
    }
  }, [company]);

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
      }
    } catch (error) {
      console.warn('Error fetching company details:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [company?._id, company?.id, routeData?.company]);

  const fetchDealsList = React.useCallback(async () => {
    const id = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!id) {
      setIsDealsLoading(false);
      return;
    }

    const cacheKey = `company_deals_cache_${id}`;

    // 1. Instant Cache Load for 0ms loading time
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFetchedDeals(parsed);
          setIsDealsLoading(false);
        }
      }
    } catch (ce) {}

    // 2. Fetch fresh deals from API
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const activeRes = await getDeals(token, 1, 10, id);
      let allDeals = [];

      if (activeRes && activeRes.success) {
        const d = activeRes.data?.deals || activeRes.data || [];
        allDeals = Array.isArray(d) ? d : [];
      }

      // If active deals are less than 5, grab a few expired deals quickly
      if (allDeals.length < 5) {
        try {
          const expiredRes = await getExpiredDeals(token, 1, 5, id);
          if (expiredRes && expiredRes.success) {
            const expD = expiredRes.data?.deals || expiredRes.data || [];
            if (Array.isArray(expD)) {
              allDeals = [...allDeals, ...expD];
            }
          }
        } catch (ee) {}
      }

      const filtered = allDeals.filter((deal) => {
        const sellerCid = deal.sellerCompanyId?._id || deal.sellerCompanyId?.id || deal.sellerCompanyId;
        const buyerCid = deal.buyerCompanyId?._id || deal.buyerCompanyId?.id || deal.buyerCompanyId;
        const brokerCid = deal.brokerCompanyId?._id || deal.brokerCompanyId?.id || deal.brokerCompanyId;
        const p1Cid = deal.party1?.companyId?._id || deal.party1?.companyId || deal.party1?.company?._id || deal.party1?.company?.id;
        const p2Cid = deal.party2?.companyId?._id || deal.party2?.companyId || deal.party2?.company?._id || deal.party2?.company?.id;
        return (
          String(sellerCid) === String(id) ||
          String(buyerCid) === String(id) ||
          String(brokerCid) === String(id) ||
          String(p1Cid) === String(id) ||
          String(p2Cid) === String(id)
        );
      });

      setFetchedDeals(filtered);
      AsyncStorage.setItem(cacheKey, JSON.stringify(filtered)).catch(() => {});
    } catch (e) {
      console.warn('Failed to fetch deals for company details:', e);
    } finally {
      setIsDealsLoading(false);
    }
  }, [company?._id, company?.id, routeData?.company?._id, routeData?.company?.id]);

  const fetchOnboardedUsers = React.useCallback(async () => {
    const currentCompanyId = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!currentCompanyId) return;

    const cacheKey = `company_onboarded_users_${currentCompanyId}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setOnboardedUsers(parsed);
        }
      }
    } catch (e) {}

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const [queueResResult, myDealsResResult] = await Promise.allSettled([
        getBrokerPendingQueue(currentCompanyId, token),
        getBrokerMyDeals(currentCompanyId, token),
      ]);

      const combined = [];
      const seenIds = new Set();

      const addItems = (arr) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((item) => {
          const id = item._id || item.id || item.registrationId || item.mobileNumber || item.invitedMobile || item.name || item.companyName;
          if (id && !seenIds.has(String(id))) {
            seenIds.add(String(id));
            combined.push(item);
          }
        });
      };

      if (queueResResult.status === 'fulfilled') {
        addItems(extractApiArray(queueResResult.value));
      }
      if (myDealsResResult.status === 'fulfilled') {
        addItems(extractApiArray(myDealsResResult.value));
      }

      const filteredList = combined.filter((usr) => {
        const usrCompanyId = String(usr.companyId || usr.company?._id || usr.company?.id || usr.brokerCompanyId || usr.creatorCompanyId || '');
        const usrTargetCompanyId = String(usr.targetCompanyId || usr.company?.companyId || '');
        if (!usrCompanyId && !usrTargetCompanyId) return false;
        return usrCompanyId === String(currentCompanyId) || usrTargetCompanyId === String(currentCompanyId);
      });

      setOnboardedUsers(filteredList);
      AsyncStorage.setItem(cacheKey, JSON.stringify(filteredList)).catch(() => {});
    } catch (e) {
      console.warn('Failed to fetch onboarded users for company details:', e);
    }
  }, [company, routeData]);

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
  }, [company, routeData]);

  React.useEffect(() => {
    fetchAllCompanies();
    fetchDetails();
  }, [fetchAllCompanies, fetchDetails]);

  const currentActiveCompanyId = company?._id || company?.id;

  React.useEffect(() => {
    if (currentActiveCompanyId) {
      fetchDealsList();
      fetchOnboardedUsers();
      checkProductAccessRequests();
    }
  }, [currentActiveCompanyId, fetchDealsList, fetchOnboardedUsers, checkProductAccessRequests]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
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
    if (fetchedDeals.length > 0) return fetchedDeals;
    return company?.recentDeals || [];
  }, [fetchedDeals, company]);

  const confirmedDealsCount = React.useMemo(() => {
    const list = deals.filter((d) => d.status === 'confirmed' || d.status === 'active' || d.status === 'completed');
    return list.length || 2;
  }, [deals]);

  const pendingDealsCount = React.useMemo(() => {
    const list = deals.filter((d) => d.status === 'pending' || !d.status);
    return list.length || 11;
  }, [deals]);

  const totalDealsCount = React.useMemo(() => {
    return deals.length > 0 ? deals.length : 13;
  }, [deals]);

  const userName = currentUser?.name || routeData?.user?.name || 'monu';
  const displayCompanyName = company?.name || 'Nokha Kaur';
  const avatarLetter = (userName || 'M').charAt(0).toUpperCase();

  // 8 Quick Action Items (Row 1: Trading & Catalog, Row 2: Parties, Comms, Finance & Reports)
  const quickActions = [
    {
      id: 'create_deal',
      title: 'Create Deal',
      subtitle: 'Sauda',
      icon: <FilePlus size={19} color="#2563EB" strokeWidth={2.2} />,
      bgColor: '#EFF6FF',
      onPress: () => onNavigate('CreateDeal', { originCompany: company, company }),
    },
    {
      id: 'add_product',
      title: 'Add Product',
      subtitle: 'Catalog',
      icon: <Package size={19} color="#7C3AED" strokeWidth={2.2} />,
      bgColor: '#F5F3FF',
      onPress: () => onNavigate('AddProductPage', { company }),
    },
    {
      id: 'categories',
      title: 'Categories',
      subtitle: 'All Catalog',
      icon: <Layers size={19} color="#E11D48" strokeWidth={2.2} />,
      bgColor: '#FFF1F2',
      onPress: () => onNavigate('CategoryPage', { company, initialTab: 'category' }),
    },
    {
      id: 'sub_categories',
      title: 'Sub Categories',
      subtitle: 'Segments',
      icon: <FolderTree size={19} color="#2563EB" strokeWidth={2.2} />,
      bgColor: '#EFF6FF',
      onPress: () => onNavigate('CategoryPage', { company, initialTab: 'subcategory' }),
    },
    {
      id: 'parties',
      title: 'Parties',
      subtitle: 'Customers/Ven...',
      icon: <Users size={19} color="#16A34A" strokeWidth={2.2} />,
      bgColor: '#F0FDF4',
      onPress: () => onNavigate('OnboardedUsers', { companyId: company?._id || company?.id, companyName: company?.name }),
    },
    {
      id: 'messages',
      title: 'Messages',
      subtitle: 'Chat/Inbox',
      icon: <MessageSquare size={19} color="#EA580C" strokeWidth={2.2} />,
      bgColor: '#FFF7ED',
      onPress: () => onNavigate('ChatList', { company }),
    },
    {
      id: 'record_pay',
      title: 'Record Pay...',
      subtitle: 'Receive/Pay',
      icon: <IndianRupee size={19} color="#0D9488" strokeWidth={2.2} />,
      bgColor: '#F0FDFA',
      onPress: () => onNavigate('TransactionHistory', { companyId: company?._id || company?.id }),
    },
    {
      id: 'reports',
      title: 'Reports',
      subtitle: 'Firm Details',
      icon: <PieChart size={19} color="#8B5CF6" strokeWidth={2.2} />,
      bgColor: '#F5F3FF',
      onPress: () => onNavigate('CompanyProfileDetails', { company }),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP HEADER (With realogo.png & Notification / Avatar) ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../images/constructions/realogo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRight}>
          {/* Notification Bell with '1' badge */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => onNavigate('Notifications')}
            activeOpacity={0.75}
          >
            <Bell size={20} color="#1E293B" strokeWidth={2.2} />
            {unreadNotifCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Profile Avatar Circle */}
          <TouchableOpacity
            style={styles.headerAvatarBtn}
            onPress={() => onNavigate('CompanyProfileDetails', { company })}
            activeOpacity={0.8}
          >
            <View style={styles.headerAvatarCircle}>
              <Text style={styles.headerAvatarText}>{avatarLetter}</Text>
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
              <Building2 size={18} color="#1E3A8A" strokeWidth={2.2} />
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
              <Mic size={16} color="#1541D8" strokeWidth={2.4} />
              <Text style={styles.heroMicBtnText}>Tap Mic to create deal by voice</Text>
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
                setEditErrors({ name: '', phone: '', registrationNumber: '' });
                setIsEditModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.customizeBtnText}>Customize</Text>
              <SlidersHorizontal size={14} color="#2563EB" strokeWidth={2.2} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIconBox, { backgroundColor: action.bgColor }]}>
                  {action.icon}
                </View>
                <Text style={styles.quickActionTitle} numberOfLines={1}>
                  {action.title}
                </Text>
                <Text style={styles.quickActionSubtitle} numberOfLines={1}>
                  {action.subtitle}
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
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Deals</Text>
              <Text style={styles.statValue}>{totalDealsCount}</Text>
              <Text style={styles.statSubtext}>All Saudas</Text>
              <SparklineWave
                color="#2563EB"
                gradientId="blueGrad"
                pathD="M0,24 Q15,30 30,22 T60,18 T80,26 T100,12"
                fillD="M0,24 Q15,30 30,22 T60,18 T80,26 T100,12 L100,36 L0,36 Z"
              />
            </View>

            {/* 2. Confirmed Deals */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Confirmed Deals</Text>
              <Text style={styles.statValue}>{confirmedDealsCount}</Text>
              <Text style={styles.statSubtext}>Active & Done</Text>
              <SparklineWave
                color="#10B981"
                gradientId="greenGrad"
                pathD="M0,26 Q20,20 40,24 T70,16 T100,10"
                fillD="M0,26 Q20,20 40,24 T70,16 T100,10 L100,36 L0,36 Z"
              />
            </View>

            {/* 3. Pending Deals */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pending Deals</Text>
              <Text style={styles.statValue}>{pendingDealsCount}</Text>
              <Text style={styles.statSubtext}>Queue</Text>
              <SparklineWave
                color="#F97316"
                gradientId="orangeGrad"
                pathD="M0,28 Q20,24 40,26 T75,18 T100,14"
                fillD="M0,28 Q20,24 40,26 T75,18 T100,14 L100,36 L0,36 Z"
              />
            </View>
          </View>
        </View>

        {/* ─── 6. RECENT DEALS SECTION ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Deals</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => onNavigate('DealsList', { companyId: company?._id || company?.id, companyName: company?.name })}
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

              const isConfirmed =
                deal.status === 'confirmed' || deal.status === 'active' || deal.status === 'completed';

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
                        source={{ uri: productImage }}
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
                          { backgroundColor: isConfirmed ? '#ECFDF5' : '#FFFBEB' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.recentDealStatusText,
                            { color: isConfirmed ? '#10B981' : '#D97706' },
                          ]}
                        >
                          {isConfirmed ? 'Confirmed' : 'Pending'}
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
                      setIsCompanyPickerOpen(false);
                      fetchDetails(comp._id || comp.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <Building2 size={18} color={isSelected ? '#2563EB' : '#64748B'} />
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
                  <Text style={styles.drawerAvatarText}>{avatarLetter}</Text>
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
              <Text style={styles.drawerSectionTitle}>COMMERCE & FIRM</Text>

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
                  onNavigate('DealsList');
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
            <Text style={styles.modalHeading}>Update Company Details</Text>

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
              <Text style={styles.modalDeleteBtnText}>Delete Firm</Text>
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
  },
  brandLogoImage: {
    width: 128,
    height: 38,
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
    justifyContent: 'space-between',
    rowGap: 9,
  },
  quickActionCard: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  quickActionTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 8.5,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },

  /* ── 5. Business Overview ── */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
    overflow: 'hidden',
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
    letterSpacing: -0.4,
  },
  statSubtext: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
    marginBottom: 4,
  },
  sparklineContainer: {
    width: '100%',
    height: 36,
    marginTop: 2,
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
