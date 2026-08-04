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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Edit3,
  Building2,
  Briefcase,
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
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react-native';
import { getCompanyDetails, updateCompany, deleteCompany, getDeals, getExpiredDeals, getUserProfile, getBrokerProductAccessRequests } from '../../../services/api';
import ProductAccessRequestModal from '../../common/ProductAccessRequestModal';

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
  const [activeTab, setActiveTab] = React.useState('my_sauda');
  const [isLoading, setIsLoading] = React.useState(true);
  const [company, setCompany] = React.useState(routeData?.company || null);
  const [fetchedDeals, setFetchedDeals] = React.useState([]);
  const [isDealsLoading, setIsDealsLoading] = React.useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(routeData?.user || null);

  // Track both the readable name and the raw backend ObjectId for industry
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

  const themeColor = '#1A56DB';

  const getUserRoleInCompany = () => {
    if (!currentUser || !company) return 'Member';

    const currentUserId = currentUser.id || currentUser._id || currentUser.userId;
    const currentUserMobile = currentUser.mobileNumber || currentUser.mobile;

    // Check owner
    const ownerId = typeof company.owner === 'object' && company.owner !== null
      ? (company.owner._id || company.owner.id || company.owner.userId)
      : company.owner;

    const ownerMobile = typeof company.owner === 'object' && company.owner !== null
      ? company.owner.mobileNumber
      : null;

    if (
      (currentUserId && ownerId && String(currentUserId) === String(ownerId)) ||
      (currentUserMobile && ownerMobile && String(currentUserMobile).replace(/\D/g, '') === String(ownerMobile).replace(/\D/g, '')) ||
      (currentUserMobile && company.phone && String(currentUserMobile).replace(/\D/g, '') === String(company.phone).replace(/\D/g, ''))
    ) {
      return 'Owner';
    }

    // Check employees
    if (Array.isArray(company.employees)) {
      const isEmployee = company.employees.some(emp => {
        const empId = typeof emp === 'object' && emp !== null
          ? (emp._id || emp.id || emp.userId)
          : emp;
        const empMobile = typeof emp === 'object' && emp !== null
          ? emp.mobileNumber
          : null;
        return (
          (currentUserId && empId && String(currentUserId) === String(empId)) ||
          (currentUserMobile && empMobile && String(currentUserMobile).replace(/\D/g, '') === String(empMobile).replace(/\D/g, ''))
        );
      });
      if (isEmployee) return 'Employee';
    }

    return 'Member';
  };

  React.useEffect(() => {
    const fetchUser = async () => {
      if (!currentUser) {
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            const userRes = await getUserProfile(token);
            if (userRes && userRes.success) {
              setCurrentUser(userRes.data);
            }
          }
        } catch (ue) {
          console.warn('Failed to fetch user profile in CompanyDetails:', ue);
        }
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDetails = React.useCallback(async () => {
    const id = routeData?.company?._id || routeData?.company?.id;
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await getCompanyDetails(id);
      if (response && response.success) {
        setCompany(response.data);

        const isIndustryObj = typeof response.data.industry === 'object' && response.data.industry !== null;

        setEditData({
          name: response.data.name,
          email: response.data.email || '',
          phone: response.data.phone || '',
          type: response.data.type || '',
          registrationNumber: response.data.registrationNumber || response.data.gstin || '',
          industry: isIndustryObj ? (response.data.industry.name || '') : (response.data.industry || ''),
          // Safely preserve the MongoDB ObjectId to pass back during update
          industryId: isIndustryObj ? (response.data.industry._id || response.data.industry.id || '') : '',
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
      Alert.alert(
        'Access Denied',
        error.message || 'You do not have permission to access this company.',
        [{ text: 'OK', onPress: () => onNavigate('pop') }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [routeData, onNavigate]);

  const fetchDealsList = React.useCallback(async () => {
    const id = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!id) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const [activeRes, expiredRes] = await Promise.allSettled([
        getDeals(token, 1, 10, id),
        getExpiredDeals(token, 1, 10, id)
      ]);

      let allDeals = [];
      if (activeRes.status === 'fulfilled' && activeRes.value?.success) {
        allDeals = [...allDeals, ...(activeRes.value.value?.data?.deals || activeRes.value.value?.data || activeRes.value.data?.deals || [])];
      }
      if (expiredRes.status === 'fulfilled' && expiredRes.value?.success) {
        allDeals = [...allDeals, ...(expiredRes.value.value?.data?.deals || expiredRes.value.value?.data || expiredRes.value.data?.deals || [])];
      }

      // Filter by company ID
      const filtered = allDeals.filter(deal => {
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
    } catch (e) {
      console.warn('Failed to fetch deals for company details:', e);
    } finally {
      setIsDealsLoading(false);
    }
  }, [company, routeData]);

  const [accessRequests, setAccessRequests] = React.useState([]);
  const [isAccessModalVisible, setIsAccessModalVisible] = React.useState(false);

  const checkProductAccessRequests = React.useCallback(async () => {
    const companyId = company?._id || company?.id || routeData?.company?._id || routeData?.company?.id;
    if (!companyId) return;
    try {
      const res = await getBrokerProductAccessRequests(companyId);
      if (res && res.success && Array.isArray(res.data)) {
        const pending = res.data.filter(r => r.status === 'pending');
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
    fetchDetails();
  }, [fetchDetails]);

  React.useEffect(() => {
    if (company) {
      fetchDealsList();
      checkProductAccessRequests();
    }
  }, [company, fetchDealsList, checkProductAccessRequests]);

  const handleUpdate = async () => {
    if (!editData.name || !editData.phone || !editData.registrationNumber) {
      Alert.alert('Error', 'Company Name, Phone, and Registration / GSTIN are required.');
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
        // Send back the raw ObjectId. Fall back to string if it was never an object.
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
          setEditErrors(prev => ({ ...prev, registrationNumber: errMsg }));
        } else {
          Alert.alert('Error', errMsg);
        }
      }
    } catch (error) {
      const errMsg = error.message || 'Failed to update company';
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('already exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('registration') || lowerMsg.includes('gst')) {
        setEditErrors(prev => ({ ...prev, registrationNumber: errMsg }));
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
          }
        }
      ]
    );
  };

  const deals = React.useMemo(() => {
    if (fetchedDeals.length > 0) return fetchedDeals;
    return company?.recentDeals || [];
  }, [fetchedDeals, company]);

  const products = React.useMemo(() => {
    const productMap = new Map();
    deals.forEach(deal => {
      const pName = deal.product?.name || deal.product || deal.title || '';
      if (pName && pName !== 'Unknown Product') {
        const qty = Number(deal.product?.quantity || deal.quantity || 0);
        const priceVal = Number(deal.product?.price || deal.price || 0);
        const existing = productMap.get(pName);
        if (existing) {
          existing.volume += qty;
          existing.dealCount += 1;
        } else {
          productMap.set(pName, {
            name: pName,
            category: deal.category || (typeof company?.industry === 'object' && company?.industry !== null ? company.industry.name : company?.industry) || 'Commodities',
            price: priceVal,
            volume: qty,
            dealCount: 1,
            image: deal.product?.image || '',
          });
        }
      }
    });
    if (productMap.size === 0) {
      return [
        { name: 'Premium Cotton Bales', category: 'Textiles & Apparel', price: 42000, volume: 150, dealCount: 3, image: '' },
        { name: 'Organic Wheat Grain', category: 'Agriculture & Agro', price: 2100, volume: 500, dealCount: 5, image: '' },
        { name: 'Silicon Transistors', category: 'Electronics & Tech', price: 85, volume: 10000, dealCount: 2, image: '' }
      ];
    }
    return Array.from(productMap.values());
  }, [deals, company]);

  const categoriesCount = React.useMemo(() => {
    const cats = new Set();
    if (company?.industry) {
      const indName = typeof company.industry === 'object' ? company.industry.name : company.industry;
      if (indName) cats.add(indName);
    }
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return cats.size;
  }, [company, products]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  if (!company) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Company not found</Text>
        <TouchableOpacity onPress={() => onNavigate('pop')} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Ledger</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditErrors({ name: '', phone: '', registrationNumber: '' });
            setIsEditModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Edit3 size={18} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Premium Hero Card (Fintech Card Style with wavy corners and ambient glow) */}
        <View style={styles.softHeroContainer}>
          {/* Ambient Glow Circles */}
          <View style={styles.glowCircle1} />
          <View style={styles.glowCircle2} />

          <View style={styles.softHeroHeader}>
            <View style={styles.softHeroInfo}>
              <Text style={styles.softHeroName} numberOfLines={1}>{company.name}</Text>

              <View style={styles.metaBadgeRow}>
                <View style={[
                  styles.softStatusBadge,
                  {
                    backgroundColor: company.isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    borderColor: company.isVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                  }
                ]}>
                  <View style={[styles.statusDot, { backgroundColor: company.isVerified ? '#10B981' : '#F59E0B' }]} />
                  <Text style={[
                    styles.softStatusText,
                    { color: company.isVerified ? '#34D399' : '#FBBF24' }
                  ]}>{company.status || 'Pending'}</Text>
                </View>
                {/* User Role Badge */}
                <View style={[
                  styles.userRoleBadge,
                  {
                    backgroundColor: getUserRoleInCompany() === 'Owner' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    borderColor: getUserRoleInCompany() === 'Owner' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }
                ]}>
                  <User size={10} color={getUserRoleInCompany() === 'Owner' ? '#FBBF24' : '#E2E8F0'} />
                  <Text style={[
                    styles.userRoleText,
                    { color: getUserRoleInCompany() === 'Owner' ? '#FBBF24' : '#E2E8F0' }
                  ]}>
                    {getUserRoleInCompany()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Gold Card Chip */}
            <View style={styles.cardChip}>
              <View style={styles.cardChipInner} />
            </View>
          </View>

          {/* Balance Display */}
          <View style={styles.fintechBalanceContainer}>
            <View style={styles.fintechBalanceLabelCol}>
              <Text style={styles.fintechBalanceLabel}>TOTAL VOLUME</Text>
            </View>
            <View style={styles.fintechBalanceValueCol}>
              <ArrowUpRight size={14} color="#C7D2FE" style={{ marginRight: 4 }} />
              <Text style={styles.fintechBalanceValue}>
                {formatVolume(deals.reduce((acc, deal) => {
                  const firstProd = deal.products?.[0] || deal.product || {};
                  const qty = Number(firstProd.quantity || deal.quantity || deal.qty || 0);
                  const price = Number(firstProd.price || deal.price || 0);
                  const total = deal.totalAmount || firstProd.totalAmount || (qty * price);
                  return acc + Number(total);
                }, 0))}
              </Text>
            </View>
          </View>

          {/* Card footer details */}
          <View style={styles.fintechCardFooterDetails}>
            <View style={{ flex: 1.5 }}>
              <Text style={styles.fintechCardFooterLabel}>REGISTRATION / GST</Text>
              <Text style={styles.fintechCardFooterValue} numberOfLines={1}>
                {company.registrationNumber || company.gstin || 'NOT REGISTERED'}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.fintechCardFooterLabel}>TOTAL DEALS</Text>
              <Text style={styles.fintechCardFooterValue}>
                {deals.length}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.fintechCardFooterLabel}>TYPE</Text>
              <Text style={styles.fintechCardFooterValue}>
                {(company.type || 'broker').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Modern 1 Row (4 Small Square Tiles) for Quick Actions */}
        <View style={styles.quickServicesGrid}>
          <TouchableOpacity
            style={styles.squareServiceCard}
            onPress={() => onNavigate('DealsList', { companyId: company?._id || company?.id, companyName: company?.name })}
            activeOpacity={0.8}
          >
            <View style={styles.squareIconBox}>
              <Handshake size={20} color="#1A56DB" />
            </View>
            <Text style={styles.squareServiceLabel} numberOfLines={1}>My Sauda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.squareServiceCard}
            onPress={() => onNavigate('CreateDeal', { company })}
            activeOpacity={0.8}
          >
            <View style={styles.squareIconBox}>
              <Plus size={20} color="#1A56DB" />
            </View>
            <Text style={styles.squareServiceLabel} numberOfLines={1}>New Sauda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.squareServiceCard}
            onPress={() => onNavigate('CategoryPage', { company })}
            activeOpacity={0.8}
          >
            <View style={styles.squareIconBox}>
              <Tag size={19} color="#1A56DB" />
            </View>
            <Text style={styles.squareServiceLabel} numberOfLines={1}>Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.squareServiceCard}
            onPress={() => onNavigate('AddProductPage', { company })}
            activeOpacity={0.8}
          >
            <View style={styles.squareIconBox}>
              <Box size={20} color="#1A56DB" />
            </View>
            <Text style={styles.squareServiceLabel} numberOfLines={1}>Products</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Panel Switcher */}
        <View style={styles.tabPanelContainer}>
          {activeTab === 'my_sauda' ? (
            <View style={styles.tabContentContainer}>
              <View style={styles.tabSectionHeader}>
                <Text style={styles.tabSectionTitle}>Transaction Ledgers</Text>
                <TouchableOpacity
                  style={styles.inlineCreateButton}
                  onPress={() => onNavigate('CreateDeal', { originCompany: company })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.inlineCreateText}>+ Create Sauda</Text>
                </TouchableOpacity>
              </View>

              {isDealsLoading ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={themeColor} />
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>Loading Saudas...</Text>
                </View>
              ) : deals.length > 0 ? (
                <>
                  {deals.slice(0, 1).map((deal, idx) => {
                    const firstProd = deal.products?.[0] || deal.product || {};
                    const pName = firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || deal.dealNumber || 'Sauda Agreement';
                    const qty = firstProd.quantity || deal.quantity || deal.qty || '0';
                    const price = firstProd.price || deal.price || '0';
                    const totalAmt = deal.totalAmount || firstProd.totalAmount || (qty !== 'N/A' && price !== 'N/A' ? Number(qty) * Number(price) : null);

                    const sellerName = deal.sellerCompany?.name || deal.sellerCompanyId?.companyName || deal.sellerCompanyId?.name || deal.party1?.company?.name || deal.party1?.companyId?.name || deal.party1?.name || 'Seller';
                    const buyerName = deal.buyerCompany?.name || deal.buyerCompanyId?.companyName || deal.buyerCompanyId?.name || deal.party2?.company?.name || deal.party2?.companyId?.name || deal.party2?.name || 'Buyer';

                    const isPending = deal.status === 'pending';
                    const isCompleted = deal.status === 'completed';
                    const isRejected = deal.status === 'rejected' || deal.status === 'cancelled';

                    let statusBg = '#E6F4EA';
                    let statusTextCol = '#137333';
                    if (isPending) {
                      statusBg = '#FFFBEB';
                      statusTextCol = '#B45309';
                    } else if (isCompleted) {
                      statusBg = '#EFF6FF';
                      statusTextCol = '#1D4ED8';
                    } else if (isRejected) {
                      statusBg = '#FEF2F2';
                      statusTextCol = '#EF4444';
                    }

                    return (
                      <TouchableOpacity
                        key={deal._id || deal.id || idx}
                        style={styles.dealCard}
                        onPress={() => onNavigate('DealDetails', { dealId: deal._id || deal.id, deal })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dealHeader}>
                          <Text style={styles.dealTitle} numberOfLines={1}>
                            {pName}
                          </Text>
                          <View
                            style={[
                              styles.dealTypeBadge,
                              { backgroundColor: statusBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dealTypeText,
                                { color: statusTextCol },
                              ]}
                            >
                              {(deal.status || 'active').toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {/* Display participant company names */}
                        <View style={styles.companyNamesRow}>
                          <Text style={styles.companyNameText} numberOfLines={1}>
                            {`Seller: ${sellerName} → Buyer: ${buyerName}`}
                          </Text>
                        </View>

                        <View style={styles.dealFooter}>
                          <Text style={styles.dealMeta}>
                            {qty} {deal.unit || 'Units'} • {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                          </Text>
                          <Text style={[styles.dealPrice, { color: themeColor }]}>
                            ₹{totalAmt ? Number(totalAmt).toLocaleString('en-IN') : Number(price).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {deals.length > 0 && (
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={() => onNavigate('DealsList', { companyId: company?._id || company?.id, companyName: company?.name })}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Text style={styles.viewMoreButtonText}>
                          {deals.length > 1 ? `View More Sauda (${deals.length - 1} more)` : 'View More Sauda'}
                        </Text>
                        <ChevronRight size={14} color="#4338CA" />
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <TouchableOpacity
                    style={styles.emptyTabCard}
                    onPress={() => onNavigate('CreateDeal', { originCompany: company })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.emptyTabLeft}>
                      <View style={styles.emptyTabIconBox}>
                        <Handshake size={20} color="#1A56DB" />
                      </View>
                      <View style={styles.emptyTabContent}>
                        <Text style={styles.emptyTabTitle}>Initiate First Sauda</Text>
                        <Text style={styles.emptyTabSubtext}>Create a trading contract for this company</Text>
                      </View>
                    </View>
                    <View style={[styles.emptyTabButton, { backgroundColor: themeColor }]}>
                      <Text style={styles.emptyTabButtonText}>Create +</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.tabContentContainer}>
              <View style={styles.tabSectionHeader}>
                <Text style={styles.tabSectionTitle}>Trading Inventory</Text>
              </View>

              <View style={styles.productsGrid}>
                {products.map((product, idx) => (
                  <View key={idx} style={styles.productCard}>
                    <View style={styles.productAvatarCircle}>
                      <Box size={22} color="#3B82F6" />
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productCardName}>{product.name}</Text>
                      <Text style={styles.productCardCategory}>{product.category}</Text>
                      <View style={styles.productMetricsRow}>
                        <View style={styles.productMetricLabelWrap}>
                          <Text style={styles.productMetricLabel}>Price:</Text>
                          <Text style={styles.productMetricValue}>₹{product.price}</Text>
                        </View>
                        <View style={styles.productMetricDivider} />
                        <View style={styles.productMetricLabelWrap}>
                          <Text style={styles.productMetricLabel}>Volume:</Text>
                          <Text style={styles.productMetricValue}>{product.volume}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Permanent Company Details & Info Card */}
        <View style={[styles.tabContentContainer, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Company Details & Ledger Info</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <FileText size={18} color="#1A56DB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Registration / GSTIN</Text>
                <Text style={styles.infoValue}>{company.registrationNumber || company.gstin || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Building2 size={18} color="#1A56DB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Company Type</Text>
                <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{company.type || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <User size={18} color="#1A56DB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Your Role in Company</Text>
                <Text style={styles.infoValue}>{getUserRoleInCompany()}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Tag size={18} color="#1A56DB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Industry Sector</Text>
                <Text style={styles.infoValue}>
                  {typeof company.industry === 'object' && company.industry !== null
                    ? (company.industry.name || 'N/A')
                    : (company.industry || 'N/A')}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Phone size={18} color="#1A56DB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{company.phone || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Mail size={18} color="#1A56DB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{company.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <MapPin size={18} color="#1A56DB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {company.address
                    ? `${company.address.street || ''}, ${company.address.city || ''}, ${company.address.state || ''}${company.address.postalCode ? ' - ' + company.address.postalCode : ''}, ${company.address.country || 'India'}`
                    : 'N/A'}
                </Text>
              </View>
            </View>

            {company.website && company.website !== 'https://www.pravisti.example.com' && company.website !== 'N/A' && company.website.trim() !== '' && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Globe size={18} color="#1A56DB" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Website</Text>
                    <Text style={[styles.infoValue, { color: themeColor, textDecorationLine: 'underline' }]}>
                      {company.website}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {company.description && company.description !== 'N/A' && company.description.trim() !== '' && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <FileText size={18} color="#1A56DB" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Business Description</Text>
                    <Text style={[styles.infoValue, { fontSize: 13, lineHeight: 18, fontWeight: '500' }]}>
                      {company.description}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Profile Modification Actions */}
          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: themeColor }]}
            activeOpacity={0.8}
            onPress={() => {
              setEditErrors({ name: '', phone: '', registrationNumber: '' });
              setIsEditModalVisible(true);
            }}
          >
            <Edit3 size={16} color={themeColor} />
            <Text style={[styles.secondaryActionText, { color: themeColor }]}>Update Company Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: '#FECACA', marginTop: 12 }]}
            activeOpacity={0.8}
            onPress={handleDelete}
          >
            <Trash2 size={16} color="#DC2626" />
            <Text style={[styles.secondaryActionText, { color: '#DC2626' }]}>Delete Company</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColor, shadowColor: themeColor }]}
        onPress={() => onNavigate('CreateDeal', { originCompany: company })}
        activeOpacity={0.9}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Profile Edit Modal */}
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
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Update Company Details</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalFormScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalLabel}>Company Name*</Text>
              <TextInput
                style={[styles.modalInput, editErrors.name && styles.inputErrorBorder]}
                value={editData.name}
                onChangeText={(text) => {
                  setEditData({ ...editData, name: text });
                  if (editErrors.name) setEditErrors({ ...editErrors, name: '' });
                }}
                placeholder="Enter company name"
                placeholderTextColor="#94A3B8"
              />
              {editErrors.name ? <Text style={styles.modalErrorText}>{editErrors.name}</Text> : null}

              <Text style={styles.modalLabel}>Registration / GSTIN*</Text>
              <TextInput
                style={[styles.modalInput, editErrors.registrationNumber && styles.inputErrorBorder]}
                value={editData.registrationNumber}
                onChangeText={(text) => {
                  setEditData({ ...editData, registrationNumber: text });
                  if (editErrors.registrationNumber) setEditErrors({ ...editErrors, registrationNumber: '' });
                }}
                placeholder="REG123456 / GSTIN"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />
              {editErrors.registrationNumber ? <Text style={styles.modalErrorText}>{editErrors.registrationNumber}</Text> : null}

              <Text style={styles.modalLabel}>Phone Number*</Text>
              <TextInput
                style={[styles.modalInput, editErrors.phone && styles.inputErrorBorder]}
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

              <Text style={styles.modalLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.email}
                onChangeText={(text) => setEditData({ ...editData, email: text })}
                placeholder="info@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Company Type</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.type}
                onChangeText={(text) => setEditData({ ...editData, type: text })}
                placeholder="trader, manufacturer, etc."
                placeholderTextColor="#94A3B8"
              />

              {/* Read-only display for Industry Sector to avoid payload mismatches. 
                 If you wish to change this field locally, implement a dropdown picker populated with Industry ObjectIds.
              */}
              <Text style={styles.modalLabel}>Industry Sector (Managed via Admin Console)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: '#E2E8F0', color: '#64748B' }]}
                value={editData.industry}
                editable={false}
                placeholder="Industry sector"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Street / Area</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.street}
                onChangeText={(text) => setEditData({ ...editData, street: text })}
                placeholder="123 Main St"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>City</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.city}
                onChangeText={(text) => setEditData({ ...editData, city: text })}
                placeholder="City"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>State</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.state}
                onChangeText={(text) => setEditData({ ...editData, state: text })}
                placeholder="State"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Postal / ZIP Code</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.postalCode}
                onChangeText={(text) => setEditData({ ...editData, postalCode: text })}
                placeholder="Postal Code"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Country</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.country}
                onChangeText={(text) => setEditData({ ...editData, country: text })}
                placeholder="India"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Website URL</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.website}
                onChangeText={(text) => setEditData({ ...editData, website: text })}
                placeholder="https://example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Business Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
                value={editData.description}
                onChangeText={(text) => setEditData({ ...editData, description: text })}
                placeholder="Business terms, info..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setIsEditModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColor }]}
                onPress={handleUpdate}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ProductAccessRequestModal
        visible={isAccessModalVisible}
        requests={accessRequests}
        onClose={() => setIsAccessModalVisible(false)}
        onResponseSuccess={checkProductAccessRequests}
      />
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  editButton: {
    padding: 8,
    marginRight: -8,
  },
  editIcon: {
    fontSize: 20,
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  softHeroContainer: {
    backgroundColor: '#1A56DB',
    borderTopLeftRadius: 36,
    borderBottomRightRadius: 36,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  glowCircle1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -100,
    right: -80,
  },
  glowCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -80,
    left: -60,
  },
  softHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  softAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  softAvatarText: {
    fontSize: 26,
  },
  softHeroInfo: {
    flex: 1,
  },
  softHeroName: {
    fontSize: 20,
    fontWeight: '850',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  softStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  softStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gstinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  gstinBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardChip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EAB308',
    padding: 5,
    opacity: 0.85,
    borderWidth: 1,
    borderColor: '#CA8A04',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardChipInner: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#A16207',
    borderRadius: 4,
    opacity: 0.7,
  },
  fintechBalanceContainer: {
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fintechBalanceLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fintechBalanceLabel: {
    fontSize: 9.5,
    color: '#C7D2FE',
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  fintechBalanceValueCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fintechBalanceValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  fintechCardFooterDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
    marginTop: 0,
  },
  fintechCardFooterLabel: {
    fontSize: 8,
    color: '#C7D2FE',
    fontWeight: '700',
    letterSpacing: 1,
  },
  fintechCardFooterValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#A5C1E1',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 4,
  },
  quickServicesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  squareServiceCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  squareIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    position: 'relative',
  },
  tileBadgePill: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1A56DB',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tileBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  squareServiceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  squareTileCountVal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 1,
  },
  tabPanelContainer: {
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  inlineCreateButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inlineCreateText: {
    color: '#1A56DB',
    fontWeight: '800',
    fontSize: 12,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  addDealButton: {
    width: 115,
    height: 28,
    backgroundColor: '#673AB7',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },

  addDealButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },



  dealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  dealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dealTypeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dealPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emptyTabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  emptyTabIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  emptyTabIconText: {
    fontSize: 20,
  },
  emptyTabContent: {
    flex: 1,
  },
  emptyTabTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  emptyTabSubtext: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTabButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  productsGrid: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  productAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F0F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  productEmoji: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  productCardCategory: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  productMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  productMetricLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productMetricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  productMetricValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  productMetricDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 66,
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  secondaryActionIcon: {
    fontSize: 18,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 50,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  modalDragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalFormScroll: {
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1E293B',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 14,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 28,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#1A56DB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  companyNamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  companyNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  viewMoreButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  viewMoreButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A56DB',
  },
  userRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 6,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default CompanyDetails;