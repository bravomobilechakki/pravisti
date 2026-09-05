import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Linking,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  ArrowLeft,
  Edit3,
  Building2,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Plus,
  ChevronRight,
  Info,
  Paperclip,
  MoreVertical,
  Home,
  Briefcase,
  FileText,
  CreditCard,
  Clock,
  MessageSquare,
  FilePlus,
  ShoppingBag,
  IndianRupee,
  Calendar,
  Layers,
  X,
  CheckCircle2,
  Camera,
} from 'lucide-react-native';
import {
  getCompanyDetails,
  updateCompany,
  deleteCompany,
  getDeals,
  getExpiredDeals,
  getUserProfile,
  uploadService,
  resolveImageUrl,
} from '../../../services/api';

const CompanyProfileDetails = ({ onNavigate, routeData }) => {
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Contacts' | 'Addresses' | 'Bank Details' | 'Notes'
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [company, setCompany] = useState(routeData?.company || null);
  const [deals, setDeals] = useState([]);
  const [isDealsLoading, setIsDealsLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(routeData?.user || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [editData, setEditData] = useState({
    name: '',
    logo: '',
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

  const [editErrors, setEditErrors] = useState({ name: '', phone: '', registrationNumber: '' });

  useEffect(() => {
    const fetchUser = async () => {
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
        }
      } catch (ue) {
        console.warn('Failed to fetch user in CompanyProfileDetails:', ue);
      }
    };
    fetchUser();
  }, []);

  const fetchDetails = useCallback(async () => {
    const id = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!id) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const response = await getCompanyDetails(id);
      if (response && response.success) {
        const data = response.data;
        setCompany(data);

        const isIndustryObj = typeof data.industry === 'object' && data.industry !== null;

        setEditData({
          name: data.name || '',
          logo: data.logo || '',
          email: data.email || '',
          phone: data.phone || '',
          type: data.type || '',
          registrationNumber: data.registrationNumber || data.gstin || '',
          industry: isIndustryObj ? data.industry.name || '' : data.industry || '',
          industryId: isIndustryObj ? data.industry._id || data.industry.id || '' : '',
          street: data.address?.street || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          postalCode: data.address?.postalCode || '',
          country: data.address?.country || 'India',
          website: data.website || '',
          description: data.description || '',
        });
      }
    } catch (error) {
      console.warn('Error fetching company details:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [company?._id, company?.id, routeData?.company]);

  const fetchDealsList = useCallback(async () => {
    const id = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!id) {
      setIsDealsLoading(false);
      return;
    }

    const cacheKey = `company_deals_cache_${id}`;

    // 1. Instant Cache Load for instant stats
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDeals(parsed);
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

      setDeals(filtered);
      AsyncStorage.setItem(cacheKey, JSON.stringify(filtered)).catch(() => {});
    } catch (e) {
      console.warn('Failed to fetch deals in CompanyProfileDetails:', e);
    } finally {
      setIsDealsLoading(false);
    }
  }, [company?._id, company?.id, routeData?.company?._id, routeData?.company?.id]);

  useEffect(() => {
    fetchDetails();
    fetchDealsList();
  }, [fetchDetails, fetchDealsList]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
    fetchDealsList();
  }, [fetchDetails, fetchDealsList]);

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

      if (editData.logo) {
        let finalLogo = editData.logo;
        if (finalLogo.startsWith('file://') || finalLogo.startsWith('content://')) {
          try {
            finalLogo = await uploadService.uploadImage(finalLogo);
          } catch (upErr) {
            console.warn('Company logo upload before save failed:', upErr);
          }
        }
        payload.logo = finalLogo;
      }

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

  const handleLogoPick = (isDirectUpload = false) => {
    const options = [
      {
        text: 'Take Photo',
        onPress: () => processImagePicker('camera', isDirectUpload),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => processImagePicker('gallery', isDirectUpload),
      },
    ];

    if ((isDirectUpload ? company?.logo : editData.logo)) {
      options.push({
        text: 'Remove Logo',
        style: 'destructive',
        onPress: async () => {
          if (isDirectUpload) {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const id = company?._id || company?.id;
              await updateCompany(id, { logo: '' }, token);
              setCompany(prev => ({ ...prev, logo: '' }));
              setEditData(prev => ({ ...prev, logo: '' }));
              Alert.alert('Success', 'Company logo removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to remove logo.');
            }
          } else {
            setEditData(prev => ({ ...prev, logo: '' }));
          }
        },
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Company Logo', 'Select an option to update company logo:', options);
  };

  const processImagePicker = (sourceType, isDirectUpload) => {
    const pickerOptions = {
      mediaType: 'photo',
      quality: 0.8,
    };

    const callback = async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick image');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        try {
          setIsUploadingLogo(true);
          // Immediate preview
          setEditData(prev => ({ ...prev, logo: asset.uri }));
          if (isDirectUpload) {
            setCompany(prev => ({ ...prev, logo: asset.uri }));
          }

          const uploadedUrl = await uploadService.uploadImage(asset);
          setEditData(prev => ({ ...prev, logo: uploadedUrl }));

          if (isDirectUpload) {
            const token = await AsyncStorage.getItem('userToken');
            const id = company?._id || company?.id;
            const res = await updateCompany(id, { logo: uploadedUrl }, token);
            if (res?.success) {
              setCompany(prev => ({ ...prev, logo: uploadedUrl }));
              Alert.alert('Success', 'Company logo updated successfully!');
            }
          }
        } catch (uploadErr) {
          console.error('Company logo upload error:', uploadErr);
          Alert.alert('Upload Failed', uploadErr.message || 'Could not upload company logo. Please try again.');
        } finally {
          setIsUploadingLogo(false);
        }
      }
    };

    if (sourceType === 'camera') {
      launchCamera(pickerOptions, callback);
    } else {
      launchImageLibrary(pickerOptions, callback);
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

  const totalVolumeCalculated = useMemo(() => {
    return deals.reduce((acc, deal) => {
      const firstProd = deal.products?.[0] || deal.product || {};
      const qty = Number(firstProd.quantity || deal.quantity || deal.qty || 0);
      const price = Number(firstProd.price || deal.price || 0);
      const total = deal.totalAmount || firstProd.totalAmount || qty * price;
      return acc + Number(total || 0);
    }, 0);
  }, [deals]);

  const displayCompanyName = company?.name || 'Company Profile';
  const displayGSTIN = company?.registrationNumber || company?.gstin || 'N/A';
  const displayPAN =
    company?.pan ||
    (displayGSTIN.length >= 12 && displayGSTIN !== 'N/A' ? displayGSTIN.substring(2, 12) : 'N/A');
  const displayPhone = company?.phone || 'N/A';
  const displayEmail = company?.email || 'N/A';
  const displayCompanyType = company?.type || 'N/A';
  const displayBusinessType =
    company?.businessType || (company?.type ? String(company.type).toUpperCase() : 'Trader');
  const displayIndustry =
    typeof company?.industry === 'object' && company?.industry !== null
      ? company.industry.name || 'N/A'
      : company?.industry || 'N/A';
  const displayCustomerSince = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  const displayStatus = company?.isVerified ? 'Verified' : (company?.status || 'Active');

  const addr = company?.address;
  const street = addr?.street || '';
  const city = addr?.city || '';
  const state = addr?.state || '';
  const postalCode = addr?.postalCode ? ` - ${addr.postalCode}` : '';
  const country = addr?.country || 'India';
  const addressLine1 = [street, city].filter(Boolean).join(', ');
  const addressLine2 = [state + postalCode, country].filter(Boolean).join(', ');
  const fullAddress =
    addressLine1 || addressLine2
      ? `${addressLine1 ? addressLine1 + '\n' : ''}${addressLine2}`
      : 'Address not specified';

  const totalDealsCount = deals.length;
  const confirmedOrdersCount = deals.filter(
    (d) => d.status === 'confirmed' || d.status === 'active' || d.status === 'completed'
  ).length;
  const latestDealDate = deals[0]?.createdAt
    ? new Date(deals[0].createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'No Deals Yet';

  const tabs = ['Overview', 'Contacts', 'Addresses', 'Bank Details', 'Notes'];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerAlign]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading Company Details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP NAVIGATION BAR ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1541D8" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Company Details</Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => {
              setEditErrors({ name: '', phone: '', registrationNumber: '' });
              setIsEditModalVisible(true);
            }}
            activeOpacity={0.75}
          >
            <Paperclip size={18} color="#2563EB" strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setIsMenuModalVisible(true)}
            activeOpacity={0.75}
          >
            <MoreVertical size={18} color="#2563EB" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {/* ─── 2. COMPANY HEADER CARD ─── */}
        <View style={styles.companyCard}>
          {/* Left: Building Icon / Logo in Mint Green Squircle */}
          <TouchableOpacity
            style={styles.companyIconBox}
            onPress={() => handleLogoPick(true)}
            activeOpacity={0.8}
          >
            {isUploadingLogo ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : company?.logo ? (
              <Image
                source={{ uri: resolveImageUrl(company.logo) }}
                style={styles.companyLogoImg}
                resizeMode="cover"
              />
            ) : (
              <Building2 size={32} color="#10B981" strokeWidth={2} />
            )}
            <View style={styles.cameraIconBadge}>
              <Camera size={10} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          {/* Center Info */}
          <View style={styles.companyMainInfo}>
            <Text style={styles.companyCardName} numberOfLines={1}>
              {displayCompanyName}
            </Text>

            <View style={styles.activeTagRow}>
              <View style={styles.activeCompanyPill}>
                <View style={styles.greenDot} />
                <Text style={styles.activeCompanyPillText}>Active Company</Text>
              </View>
            </View>

            <Text style={styles.companyCardMeta}>
              Customer • Since {displayCustomerSince}
            </Text>
          </View>

          {/* Right Action Circle Buttons */}
          <View style={styles.companyContactActions}>
            <TouchableOpacity
              style={styles.contactCircleBtn}
              onPress={() => Linking.openURL(`tel:${displayPhone}`)}
              activeOpacity={0.75}
            >
              <Phone size={16} color="#2563EB" strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCircleBtn}
              onPress={() => Linking.openURL(`mailto:${displayEmail}`)}
              activeOpacity={0.75}
            >
              <Mail size={16} color="#2563EB" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 3. HORIZONTAL SEGMENTED TABS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── 4. OVERVIEW TAB CONTENT ─── */}
        {activeTab === 'Overview' && (
          <>
            {/* Section 1: Company Information Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.infoIconCircle}>
                    <Info size={16} color="#2563EB" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.sectionCardTitle}>Company Information</Text>
                </View>

                <TouchableOpacity
                  style={styles.editLinkBtn}
                  onPress={() => {
                    setEditErrors({ name: '', phone: '', registrationNumber: '' });
                    setIsEditModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Edit3 size={14} color="#2563EB" strokeWidth={2.2} style={{ marginRight: 4 }} />
                  <Text style={styles.editLinkText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Info Rows */}
              <View style={styles.infoTable}>
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Building2 size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Company Name</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayCompanyName}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Layers size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Company Type</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayCompanyType}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <FileText size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>GSTIN</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayGSTIN}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <CreditCard size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>PAN</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayPAN}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Phone size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Phone Number</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayPhone}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Mail size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Email</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayEmail}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Briefcase size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Business Type</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayBusinessType}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Building2 size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Industry</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayIndustry}</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Clock size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Status</Text>
                  </View>
                  <View style={styles.greenStatusBadge}>
                    <Text style={styles.greenStatusText}>{displayStatus}</Text>
                  </View>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Calendar size={15} color="#64748B" strokeWidth={2} />
                    <Text style={styles.infoRowLabel}>Customer Since</Text>
                  </View>
                  <Text style={styles.infoRowValue}>{displayCustomerSince}</Text>
                </View>
              </View>
            </View>

            {/* Section 2: Addresses Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.infoIconCircle, { backgroundColor: '#F5F3FF' }]}>
                    <MapPin size={16} color="#7C3AED" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.sectionCardTitle}>Addresses</Text>
                </View>

                <TouchableOpacity
                  style={styles.editLinkBtn}
                  onPress={() => {
                    setEditErrors({ name: '', phone: '', registrationNumber: '' });
                    setIsEditModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color="#2563EB" strokeWidth={2.4} style={{ marginRight: 3 }} />
                  <Text style={styles.editLinkText}>Add New</Text>
                </TouchableOpacity>
              </View>

              {/* Address Item 1: Registered Address */}
              <View style={styles.addressItem}>
                <View style={styles.addressIconSquircle}>
                  <Home size={18} color="#7C3AED" strokeWidth={2.2} />
                </View>

                <View style={styles.addressContent}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressTitle}>Registered Address</Text>
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  </View>
                  <Text style={styles.addressText}>{fullAddress}</Text>
                </View>

                <TouchableOpacity
                  style={styles.addressEditBtn}
                  onPress={() => {
                    setEditErrors({ name: '', phone: '', registrationNumber: '' });
                    setIsEditModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Edit3 size={16} color="#2563EB" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <View style={styles.rowDivider} />

              {/* Address Item 2: Billing Address */}
              <View style={styles.addressItem}>
                <View style={[styles.addressIconSquircle, { backgroundColor: '#EFF6FF' }]}>
                  <Briefcase size={18} color="#2563EB" strokeWidth={2.2} />
                </View>

                <View style={styles.addressContent}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressTitle}>Billing Address</Text>
                  </View>
                  <Text style={styles.addressText}>{fullAddress}</Text>
                </View>

                <TouchableOpacity
                  style={styles.addressEditBtn}
                  onPress={() => {
                    setEditErrors({ name: '', phone: '', registrationNumber: '' });
                    setIsEditModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Edit3 size={16} color="#2563EB" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <View style={styles.rowDivider} />

              <TouchableOpacity
                style={styles.viewAllAddressesBtn}
                onPress={() => {
                  setEditErrors({ name: '', phone: '', registrationNumber: '' });
                  setIsEditModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllAddressesText}>View All Addresses</Text>
                <ChevronRight size={16} color="#2563EB" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Section 3: Quick Stats */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.infoIconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Clock size={16} color="#16A34A" strokeWidth={2.4} />
                  </View>
                  <Text style={styles.sectionCardTitle}>Quick Stats</Text>
                </View>
              </View>

              <View style={styles.quickStatsRow}>
                {/* 1. Total Deals */}
                <View style={[styles.quickStatTile, { backgroundColor: '#EFF6FF' }]}>
                  <FileText size={15} color="#2563EB" strokeWidth={2.2} style={{ marginBottom: 3 }} />
                  <Text style={styles.quickStatLabel}>Total Deals</Text>
                  <Text style={styles.quickStatValue}>{totalDealsCount}</Text>
                </View>

                {/* 2. Total Orders */}
                <View style={[styles.quickStatTile, { backgroundColor: '#F0FDF4' }]}>
                  <ShoppingBag size={15} color="#16A34A" strokeWidth={2.2} style={{ marginBottom: 3 }} />
                  <Text style={styles.quickStatLabel}>Total Orders</Text>
                  <Text style={styles.quickStatValue}>{confirmedOrdersCount}</Text>
                </View>

                {/* 3. Total Receivable */}
                <View style={[styles.quickStatTile, { backgroundColor: '#FFF7ED' }]}>
                  <IndianRupee size={15} color="#EA580C" strokeWidth={2.2} style={{ marginBottom: 3 }} />
                  <Text style={styles.quickStatLabel} numberOfLines={1}>Receivable</Text>
                  <Text style={styles.quickStatValue} numberOfLines={1}>
                    {totalVolumeCalculated > 0 ? `₹${totalVolumeCalculated.toLocaleString('en-IN')}` : '₹0'}
                  </Text>
                </View>

                {/* 4. Last Order Date */}
                <View style={[styles.quickStatTile, { backgroundColor: '#F5F3FF' }]}>
                  <Clock size={15} color="#7C3AED" strokeWidth={2.2} style={{ marginBottom: 3 }} />
                  <Text style={styles.quickStatLabel} numberOfLines={1}>Last Order</Text>
                  <Text style={[styles.quickStatValue, { fontSize: 10, marginTop: 2 }]} numberOfLines={1}>
                    {latestDealDate}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Other Tabs Fallback Content */}
        {activeTab !== 'Overview' && (
          <View style={[styles.sectionCard, { paddingVertical: 40, alignItems: 'center' }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{activeTab}</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6, textAlign: 'center' }}>
              Detailed {activeTab} information for {displayCompanyName}
            </Text>
            <TouchableOpacity
              style={{ marginTop: 14, backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
              onPress={() => setActiveTab('Overview')}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Back to Overview</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ─── 5. BOTTOM FIXED ACTION BAR ─── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startChatBtn}
          onPress={() => onNavigate('ChatList')}
          activeOpacity={0.8}
        >
          <MessageSquare size={18} color="#2563EB" strokeWidth={2.2} />
          <Text style={styles.startChatBtnText}>Start Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createDealBtn}
          onPress={() => onNavigate('CreateDeal', { originCompany: company, company })}
          activeOpacity={0.85}
        >
          <FilePlus size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.createDealBtnText}>Create Deal</Text>
        </TouchableOpacity>
      </View>

      {/* ─── 6. MORE OPTIONS MODAL ─── */}
      <Modal
        visible={isMenuModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsMenuModalVisible(false)}
        >
          <View style={styles.menuModalCard}>
            <Text style={styles.menuModalTitle}>Company Options</Text>

            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setIsMenuModalVisible(false);
                setEditErrors({ name: '', phone: '', registrationNumber: '' });
                setIsEditModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color="#2563EB" />
              <Text style={styles.menuModalItemText}>Edit Company Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setIsMenuModalVisible(false);
                onNavigate('DealsList', { companyId: company?._id || company?.id });
              }}
              activeOpacity={0.7}
            >
              <FileText size={18} color="#2563EB" />
              <Text style={styles.menuModalItemText}>View Deals (Saudas)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setIsMenuModalVisible(false);
                onNavigate('OnboardedUsers', { companyId: company?._id || company?.id });
              }}
              activeOpacity={0.7}
            >
              <Briefcase size={18} color="#2563EB" />
              <Text style={styles.menuModalItemText}>Manage Parties / Members</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 }} />

            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => {
                setIsMenuModalVisible(false);
                handleDelete();
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="#DC2626" />
              <Text style={[styles.menuModalItemText, { color: '#DC2626', fontWeight: '700' }]}>
                Delete Company
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 7. EDIT COMPANY DETAILS MODAL ─── */}
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
              {/* Company Logo Upload Box */}
              <Text style={styles.modalFieldLabel}>Company Logo</Text>
              <TouchableOpacity
                style={styles.logoUploadBox}
                onPress={() => handleLogoPick(false)}
                activeOpacity={0.8}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <View style={styles.uploadPlaceholder}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={[styles.uploadPlaceholderText, { marginTop: 8 }]}>Uploading logo...</Text>
                  </View>
                ) : editData.logo ? (
                  <View style={styles.logoPreviewWrapper}>
                    <Image
                      source={{ uri: resolveImageUrl(editData.logo) }}
                      style={styles.logoPreviewImg}
                      resizeMode="cover"
                    />
                    <View style={styles.changeLogoOverlay}>
                      <Camera size={14} color="#FFFFFF" />
                      <Text style={styles.changeLogoText}>Change Logo</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Camera size={26} color="#2563EB" />
                    <Text style={styles.uploadPlaceholderText}>Upload Company Logo</Text>
                    <Text style={styles.uploadSubtext}>JPG, PNG, WebP (Max 5MB)</Text>
                  </View>
                )}
              </TouchableOpacity>

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
                placeholder="Proprietorship, Private Limited, etc."
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default CompanyProfileDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerAlign: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  /* ── 1. Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── 2. Company Header Card ── */
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  companyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyMainInfo: {
    flex: 1,
  },
  companyCardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  activeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  activeCompanyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeCompanyPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#10B981',
  },
  companyCardMeta: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
  },
  companyContactActions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 8,
  },
  contactCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  /* ── 3. Horizontal Segmented Tabs ── */
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
    paddingHorizontal: 4,
    gap: 16,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2563EB',
  },
  tabItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabItemTextActive: {
    fontWeight: '800',
    color: '#2563EB',
  },

  /* ── 4. Section Card ── */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1.5,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  editLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Info Table */
  infoTable: {
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  infoRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  greenStatusBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  greenStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },

  /* Addresses Section */
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  addressIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  addressContent: {
    flex: 1,
    paddingRight: 8,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  addressTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  primaryBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#10B981',
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
  },
  addressEditBtn: {
    padding: 6,
    marginTop: 2,
  },
  viewAllAddressesBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  viewAllAddressesText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Quick Stats Row */
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  quickStatTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'flex-start',
  },
  quickStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  quickStatValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },

  /* ── 5. Bottom Fixed Action Bar ── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  startChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  startChatBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  createDealBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1541D8',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createDealBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Menu Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  menuModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  menuModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  menuModalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
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

  /* Company Logo & Upload Styles */
  companyLogoImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2563EB',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  logoUploadBox: {
    height: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  logoPreviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  logoPreviewImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  changeLogoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  changeLogoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholderText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
  },
  uploadSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
