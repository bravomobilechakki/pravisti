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
import { getCompanyDetails, updateCompany, deleteCompany, getDeals, getExpiredDeals, getUserProfile } from '../../services/api';

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

  const themeColor = '#4F46E5';

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

  React.useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  React.useEffect(() => {
    if (company) {
      fetchDealsList();
    }
  }, [company, fetchDealsList]);

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
        {/* Dynamic Premium Hero Card */}
        <View style={styles.softHeroContainer}>
          <View style={styles.softHeroHeader}>
            <View style={styles.softAvatar}>
              {company.type === 'trader' ? (
                <Briefcase size={26} color="#4F46E5" />
              ) : (
                <Building2 size={26} color="#4F46E5" />
              )}
            </View>
            <View style={styles.softHeroInfo}>
              <Text style={styles.softHeroName} numberOfLines={2}>{company.name}</Text>
              <View style={styles.metaBadgeRow}>
                <View style={[
                  styles.softStatusBadge,
                  {
                    backgroundColor: company.isVerified ? '#ECFDF5' : '#FFFBEB',
                    borderColor: company.isVerified ? '#A7F3D0' : '#FDE68A',
                  }
                ]}>
                  <View style={[styles.statusDot, { backgroundColor: company.isVerified ? '#10B981' : '#F59E0B' }]} />
                  <Text style={[
                    styles.softStatusText,
                    { color: company.isVerified ? '#047857' : '#B45309' }
                  ]}>{company.status || 'Pending'}</Text>
                </View>
                {(company.registrationNumber || company.gstin) && (
                  <View style={styles.gstinBadge}>
                    <Text style={styles.gstinBadgeText}>GST/Reg: {company.registrationNumber || company.gstin}</Text>
                  </View>
                )}
                {/* User Role Badge */}
                <View style={[
                  styles.userRoleBadge,
                  {
                    backgroundColor: getUserRoleInCompany() === 'Owner' ? '#EEF2FF' : '#F1F5F9',
                    borderColor: getUserRoleInCompany() === 'Owner' ? '#C7D2FE' : '#E2E8F0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }
                ]}>
                  <User size={10} color={getUserRoleInCompany() === 'Owner' ? '#4F46E5' : '#475569'} />
                  <Text style={[
                    styles.userRoleText,
                    { color: getUserRoleInCompany() === 'Owner' ? '#4F46E5' : '#475569' }
                  ]}>
                    {getUserRoleInCompany()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats & Activity Summary */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#4F46E5' }]}>{deals.length}</Text>
              <Text style={styles.heroStatLabel}>Total Deals</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#10B981' }]} adjustsFontSizeToFit numberOfLines={1}>
                {formatVolume(deals.reduce((acc, deal) => {
                  const firstProd = deal.products?.[0] || deal.product || {};
                  const qty = Number(firstProd.quantity || deal.quantity || deal.qty || 0);
                  const price = Number(firstProd.price || deal.price || 0);
                  const total = deal.totalAmount || firstProd.totalAmount || (qty * price);
                  return acc + Number(total);
                }, 0))}
              </Text>
              <Text style={styles.heroStatLabel}>Volume</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: '#2563EB' }]}>{company.type === 'trader' ? 'Trader' : 'Broker'}</Text>
              <Text style={styles.heroStatLabel}>Company Type</Text>
            </View>
          </View>
        </View>

        {/* Elegant Grid/Flex Tab Buttons */}
        <View style={styles.tabButtonsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonSauda]}
            onPress={() => onNavigate('DealsList', { companyId: company?._id || company?.id, companyName: company?.name })}
            activeOpacity={0.85}
          >
            <View style={styles.navigationArrow}>
              <ArrowUpRight size={14} color="#4338CA" />
            </View>
            <View style={styles.tabButtonIconCircleIndigo}>
              <Handshake size={18} color="#4338CA" />
            </View>
            <Text style={styles.tabButtonTextIndigo}>My Sauda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonCategories]}
            onPress={() => onNavigate('CategoryPage', { company })}
            activeOpacity={0.85}
          >
            <View style={styles.navigationArrow}>
              <ArrowUpRight size={14} color="#6D28D9" />
            </View>
            <View style={styles.tabButtonIconCircleViolet}>
              <Tag size={16} color="#6D28D9" />
            </View>
            <Text style={styles.tabButtonTextViolet}>Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonProducts]}
            onPress={() => onNavigate('AddProductPage', { company })}
            activeOpacity={0.85}
          >
            <View style={styles.navigationArrow}>
              <ArrowUpRight size={14} color="#047857" />
            </View>
            <View style={styles.tabButtonIconCircleEmerald}>
              <Box size={18} color="#047857" />
            </View>
            <Text style={styles.tabButtonTextEmerald}>Products</Text>
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
                        <Handshake size={20} color="#4F46E5" />
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
                <FileText size={18} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Registration / GSTIN</Text>
                <Text style={styles.infoValue}>{company.registrationNumber || company.gstin || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Building2 size={18} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Company Type</Text>
                <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{company.type || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <User size={18} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Your Role in Company</Text>
                <Text style={styles.infoValue}>{getUserRoleInCompany()}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Tag size={18} color="#4F46E5" />
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
                <Phone size={18} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{company.phone || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Mail size={18} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{company.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <MapPin size={18} color="#4F46E5" />
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
                    <Globe size={18} color="#4F46E5" />
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
                    <FileText size={18} color="#4F46E5" />
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
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#312E81',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  softHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  softAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#c7c6efff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#4338CA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  softAvatarText: {
    fontSize: 26,
  },
  softHeroInfo: {
    flex: 1,
  },
  softHeroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
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
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  softStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gstinBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  gstinBadgeText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 3,
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  tabButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: 3,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButtonSauda: {
    backgroundColor: '#F5F7FF',
    borderColor: '#C7D2FE',
  },
  tabButtonCategories: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  tabButtonProducts: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  navigationArrow: {
    position: 'absolute',
    top: 4,
    right: 6,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  tabButtonIconCircleIndigo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tabButtonIconCircleViolet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tabButtonIconCircleEmerald: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tabButtonEmoji: {
    fontSize: 14,
  },
  tabButtonTextIndigo: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
  },
  tabButtonTextViolet: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
  },
  tabButtonTextEmerald: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
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
    color: '#4F46E5',
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
    shadowColor: '#4F46E5',
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
    backgroundColor: '#4F46E5',
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
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  viewMoreButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
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