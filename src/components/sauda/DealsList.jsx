import React, { useState, useCallback } from 'react';
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
  Linking,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeals, getExpiredDeals, getPendingInvitations, getUserProfile, getCompanyDetails } from '../../services/api';
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  MessageSquare,
  FileText,
  PenTool,
  Clock,
  Box,
  CheckCircle,
  XCircle,
  Mail,
  ChevronRight,
  Handshake,
  X,
  Plus,
} from 'lucide-react-native';

const DealsList = ({ onNavigate, routeData }) => {
  const searchQuery = '';
  const [filter, setFilter] = useState('Active');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeCompanyId, setActiveCompanyId] = useState(
    routeData?.companyId || 
    routeData?.company?._id || 
    routeData?.company?.id || 
    null
  );
  const [activeCompanyName, setActiveCompanyName] = useState(
    routeData?.companyName || 
    routeData?.company?.name || 
    routeData?.company?.companyName || 
    null
  );
  const [currentUserCompanyIds, setCurrentUserCompanyIds] = useState([]);
  const [companyNames, setCompanyNames] = useState({});

  const resolveName = useCallback((company, fallback) => {
    if (!company) return fallback;
    if (typeof company === 'object') {
      return company.name || company.companyName || fallback;
    }
    if (companyNames[company]) {
      return companyNames[company];
    }
    if (typeof company === 'string' && company.match(/^[0-9a-fA-F]{24}$/)) {
      return 'Loading...';
    }
    return fallback;
  }, [companyNames]);

  React.useEffect(() => {
    const fetchMissingCompanyNames = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const missingIds = new Set();
        deals.forEach(deal => {
          const bId = deal.buyerCompanyId?._id || deal.buyerCompanyId;
          const sId = deal.sellerCompanyId?._id || deal.sellerCompanyId;
          
          if (typeof bId === 'string' && bId.match(/^[0-9a-fA-F]{24}$/) && !companyNames[bId]) {
            missingIds.add(bId);
          }
          if (typeof sId === 'string' && sId.match(/^[0-9a-fA-F]{24}$/) && !companyNames[sId]) {
            missingIds.add(sId);
          }

          if (filter === 'Invitations') {
            const draft = deal.dealDraft || {};
            const dbId = draft.buyerCompanyId?._id || draft.buyerCompanyId;
            const dsId = draft.sellerCompanyId?._id || draft.sellerCompanyId;
            const senderId = deal.senderCompanyId?._id || deal.senderCompanyId;
            
            if (typeof dbId === 'string' && dbId.match(/^[0-9a-fA-F]{24}$/) && !companyNames[dbId]) {
              missingIds.add(dbId);
            }
            if (typeof dsId === 'string' && dsId.match(/^[0-9a-fA-F]{24}$/) && !companyNames[dsId]) {
              missingIds.add(dsId);
            }
            if (typeof senderId === 'string' && senderId.match(/^[0-9a-fA-F]{24}$/) && !companyNames[senderId]) {
              missingIds.add(senderId);
            }
          }
        });

        if (missingIds.size === 0) return;

        const newNames = { ...companyNames };
        let updated = false;

        await Promise.all(
          Array.from(missingIds).map(async (id) => {
            try {
              const res = await getCompanyDetails(id);
              if (res && res.success && res.data) {
                newNames[id] = res.data.name || res.data.companyName || 'Company';
                updated = true;
              }
            } catch (e) {
              console.warn(`Failed to fetch company details for ${id}:`, e);
            }
          })
        );

        if (updated) {
          setCompanyNames(newNames);
        }
      } catch (err) {
        console.warn('Error fetching missing company names:', err);
      }
    };

    if (deals && deals.length > 0) {
      fetchMissingCompanyNames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, filter]);

  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const response = await getUserProfile(token);
        if (response && response.success && response.data) {
          const user = response.data;
          const companyIds = (user.companies || []).map(
            (c) => String(c._id || c.id || c)
          );
          setCurrentUserCompanyIds(companyIds);

          const userCompNames = {};
          (user.companies || []).forEach(c => {
            const cid = String(c._id || c.id);
            if (cid && (c.name || c.companyName)) {
              userCompNames[cid] = c.name || c.companyName;
            }
          });
          setCompanyNames(prev => ({ ...prev, ...userCompNames }));
        }
      } catch (e) {
        console.warn('Failed to fetch current user profile:', e);
      }
    };
    fetchCurrentUser();
  }, []);

  React.useEffect(() => {
    const cid = routeData?.companyId || routeData?.company?._id || routeData?.company?.id;
    const cname = routeData?.companyName || routeData?.company?.name || routeData?.company?.companyName;
    if (cid) {
      setActiveCompanyId(cid);
      setActiveCompanyName(cname || 'Company');
    } else {
      setActiveCompanyId(null);
      setActiveCompanyName(null);
    }
    if (routeData?.filter) {
      setFilter(routeData.filter);
    }
    setRefreshKey(prev => prev + 1);
  }, [routeData]);

  const fetchDeals = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      let response;
      if (filter === 'Active') {
        response = await getDeals(token, 1, 50, activeCompanyId);
      } else if (filter === 'Expired') {
        response = await getExpiredDeals(token, 1, 50, activeCompanyId);
      } else if (filter === 'Invitations') {
        response = await getPendingInvitations(token);
      }

      if (response && response.success) {
        if (filter === 'Invitations') {
          setDeals(response.data || []);
        } else {
          setDeals(response.data.deals || response.data || []);
        }
      } else {
        setDeals([]);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      setDeals([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter, activeCompanyId]);

  React.useEffect(() => {
    fetchDeals();
  }, [fetchDeals, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const filteredDeals = deals.filter(deal => {
    let pName = '';
    if (filter === 'Invitations') {
      const firstProd = deal.dealDraft?.products?.[0];
      pName = firstProd?.productId?.name || firstProd?.productName || '';
    } else {
      const firstProd = deal.products?.[0] || deal.product || {};
      pName = firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || '';
    }
    const matchesSearch =
      String(pName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(deal.dealNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'Invitations') {
      if (activeCompanyId) {
        const senderCompanyId = deal.senderCompanyId?._id || deal.senderCompanyId?.id || deal.senderCompanyId;
        const draftSellerCid = deal.dealDraft?.sellerCompanyId?._id || deal.dealDraft?.sellerCompanyId?.id || deal.dealDraft?.sellerCompanyId;
        const draftBuyerCid = deal.dealDraft?.buyerCompanyId?._id || deal.dealDraft?.buyerCompanyId?.id || deal.dealDraft?.buyerCompanyId;
        const draftBrokerCid = deal.dealDraft?.brokerCompanyId?._id || deal.dealDraft?.brokerCompanyId?.id || deal.dealDraft?.brokerCompanyId;
        return (
          (senderCompanyId && String(senderCompanyId).toLowerCase() === String(activeCompanyId).toLowerCase()) ||
          (draftSellerCid && String(draftSellerCid).toLowerCase() === String(activeCompanyId).toLowerCase()) ||
          (draftBuyerCid && String(draftBuyerCid).toLowerCase() === String(activeCompanyId).toLowerCase()) ||
          (draftBrokerCid && String(draftBrokerCid).toLowerCase() === String(activeCompanyId).toLowerCase())
        );
      }
      return true;
    }

    const statusLower = String(deal.status || '').toLowerCase();
    const isTradeActive = statusLower === 'active' || statusLower === 'approved' || statusLower === 'in_progress' || statusLower === 'pending';
    const isExpiredTrade = statusLower === 'expired' || statusLower === 'completed' || statusLower === 'rejected' || statusLower === 'cancelled';
    const statusMatches = filter === 'Expired' ? isExpiredTrade : isTradeActive;

    if (!statusMatches) return false;

    if (activeCompanyId) {
      const p1CompanyId = deal.party1?.companyId?._id || deal.party1?.companyId || deal.party1?.company?._id || deal.party1?.company?.id;
      const p2CompanyId = deal.party2?.companyId?._id || deal.party2?.companyId || deal.party2?.company?._id || deal.party2?.company?.id;
      const sellerCompanyId = deal.sellerCompany?._id || deal.sellerCompany?.id || deal.sellerCompanyId?._id || deal.sellerCompanyId?.id || deal.sellerCompanyId;
      const buyerCompanyId = deal.buyerCompany?._id || deal.buyerCompany?.id || deal.buyerCompanyId?._id || deal.buyerCompanyId?.id || deal.buyerCompanyId;
      const brokerCompanyId = deal.brokerCompanyId?._id || deal.brokerCompanyId?.id || deal.brokerCompanyId || deal.broker?._id || deal.broker?.id || deal.broker;
      
      const isAssociated =
        (p1CompanyId && String(p1CompanyId).toLowerCase() === String(activeCompanyId).toLowerCase()) ||
        (p2CompanyId && String(p2CompanyId).toLowerCase() === String(activeCompanyId).toLowerCase()) ||
        (sellerCompanyId && String(sellerCompanyId).toLowerCase() === String(activeCompanyId).toLowerCase()) ||
        (buyerCompanyId && String(buyerCompanyId).toLowerCase() === String(activeCompanyId).toLowerCase()) ||
        (brokerCompanyId && String(brokerCompanyId).toLowerCase() === String(activeCompanyId).toLowerCase());

      return isAssociated;
    }

    return true;
  });

  const handleReshareInvite = (invite) => {
    const url = `https://wa.me/${invite.receiverMobileNumber}?text=Hi%20${encodeURIComponent(invite.receiverName)}%2C%20join%20me%20on%20Pravisti%20to%20do%20deals%20together%20and%20view%20my%20deals!%20Download%20the%20app%3A%20https%3A%2F%2Fpravisti.com%2Fdownload`;
    Linking.openURL(url).catch(e => console.warn('Could not launch WhatsApp', e));
  };


  const getMyRoleAndCompanyInDeal = (deal) => {
    const normalizeId = (val) => String(val?._id || val?.id || val || '');
    const sCid = normalizeId(deal.sellerCompanyId || deal.sellerCompany);
    const bCid = normalizeId(deal.buyerCompanyId || deal.buyerCompany);
    const brCid = normalizeId(deal.brokerCompanyId || deal.broker);

    // Retrieve roles from deal object
    const viewerRole = deal.viewerRole || deal.currentUserRole || '';
    const currentUserRole = deal.currentUserRole || viewerRole;

    let role = 'Viewer';
    let companyName = 'N/A';

    const isS = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(cid => cid && cid.toLowerCase() === sCid.toLowerCase());
    const isB = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(cid => cid && cid.toLowerCase() === bCid.toLowerCase());
    const isBr = (currentUserRole === 'broker' || viewerRole === 'broker') || (!!brCid && currentUserCompanyIds.some(cid => cid && cid.toLowerCase() === brCid.toLowerCase()));

    const sellerName = resolveName(deal.sellerCompanyId || deal.sellerCompany, 'Seller');
    const buyerName = resolveName(deal.buyerCompanyId || deal.buyerCompany, 'Buyer');
    const brokerName = deal.broker?.name || deal.brokerCompanyId?.name || 'Broker';

    if (isS) {
      role = 'Seller';
      companyName = sellerName;
    } else if (isB) {
      role = 'Buyer';
      companyName = buyerName;
    } else if (isBr) {
      role = 'Broker';
      companyName = brokerName;
    } else {
      if (currentUserCompanyIds.length > 0) {
        role = 'Viewer';
        companyName = 'Viewer';
      }
    }

    return { role, companyName };
  };

  const renderDealItem = ({ item }) => {
    if (filter === 'Invitations') {
      const draft = item.dealDraft || {};
      const firstProd = draft.products?.[0] || {};
      const pName = firstProd.productId?.name || firstProd.productName || 'Unknown Product';
      const qty = firstProd.quantity || 'N/A';
      const price = firstProd.price || 'N/A';
      const totalAmt = firstProd.totalAmount || (qty !== 'N/A' && price !== 'N/A' ? qty * price : null);
      const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';
      const inviteCode = item.inviteCode || 'N/A';

      const senderCompanyName = resolveName(item.senderCompanyId, 'My Company');
      const draftRole = draft.role || 'seller';
      const sellerName = resolveName(draft.sellerCompanyId, draftRole === 'seller' ? senderCompanyName : 'Pending Invite');
      const buyerName = resolveName(draft.buyerCompanyId, draftRole === 'buyer' ? senderCompanyName : item.receiverName || 'Pending Invite');

      const isSender = currentUserCompanyIds.some(cid => cid && String(cid).toLowerCase() === String(item.senderCompanyId?._id || item.senderCompanyId?.id || item.senderCompanyId || '').toLowerCase());
      
      let myRole = 'Viewer';
      let myCompanyName = 'N/A';

      if (isSender) {
        myRole = draftRole === 'seller' ? 'Seller' : draftRole === 'buyer' ? 'Buyer' : 'Broker';
        myCompanyName = senderCompanyName;
      } else {
        myRole = draftRole === 'seller' ? 'Buyer' : draftRole === 'buyer' ? 'Seller' : 'Broker';
        myCompanyName = item.receiverName || 'My Company';
      }

      const creatorCompanyName = senderCompanyName;
      const productImage = firstProd.productId?.image || firstProd.image || firstProd.productImage || item.image || draft.image;
      const hasImage = typeof productImage === 'string' && productImage.trim().length > 0;

      return (
        <View style={[styles.dealCard, { borderColor: '#EADFC9' }]}>
          {/* Visual left accent bar in gold */}
          <View style={[styles.cardLeftAccent, { backgroundColor: '#D4AF37' }]} />
          
          <View style={styles.cardTop}>
            {hasImage ? (
              <Image source={{ uri: productImage }} style={styles.dealProductImage} resizeMode="cover" />
            ) : (
              <View style={[styles.iconBubble, { backgroundColor: '#FDF6E2', borderColor: '#F0DFA7' }]}>
                <Mail size={20} color="#D4AF37" />
              </View>
            )}
            <View style={styles.cardMain}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.productName} numberOfLines={1}>{pName}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {['Seller', 'Buyer'].includes(myRole) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>My Role:</Text>
                      <View style={[
                        styles.roleBadge,
                        myRole === 'Seller' ? styles.sellerRoleBadge : styles.buyerRoleBadge,
                        { marginVertical: 0 }
                      ]}>
                        <Text style={[
                          styles.roleBadgeText,
                          { color: myRole === 'Seller' ? '#4F46E5' : '#D97706' }
                        ]}>
                          {myRole.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: '#FDF6E2', borderColor: '#F0DFA7' }]}>
                    <Text style={[styles.statusText, { color: '#B58900' }]}>INVITE</Text>
                  </View>
                </View>
              </View>
              
              <View style={{ marginTop: 4, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Building2 size={12} color="#8C7A5B" />
                  <Text style={styles.companyNameText} numberOfLines={1}>
                    Seller: <Text style={styles.creatorValueText}>{sellerName}</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <User size={12} color="#8C7A5B" />
                  <Text style={styles.companyNameText} numberOfLines={1}>
                    Buyer: <Text style={styles.creatorValueText}>{buyerName}</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Unified Sleek Stats Container */}
          <View style={styles.sleekStatsContainer}>
            <View style={styles.sleekStatBlock}>
              <Text style={styles.sleekStatLabel}>QTY</Text>
              <Text style={styles.sleekStatValue}>{qty}</Text>
            </View>
            <View style={styles.sleekStatSeparator} />
            <View style={styles.sleekStatBlock}>
              <Text style={styles.sleekStatLabel}>PRICE</Text>
              <Text style={styles.sleekStatValue}>₹{price}</Text>
            </View>
            {totalAmt ? (
              <>
                <View style={styles.sleekStatSeparator} />
                <View style={styles.sleekStatBlock}>
                  <Text style={styles.sleekStatLabel}>TOTAL VALUE</Text>
                  <Text style={[styles.sleekStatValue, { color: '#4F46E5', fontWeight: '900' }]}>
                    ₹{Number(totalAmt).toLocaleString('en-IN')}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.inviteCodeBadge}>
              <Text style={styles.inviteCodeText}>#{inviteCode}</Text>
            </View>
            <View style={styles.footerRight}>
              <View style={[styles.datePill, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Calendar size={10} color="#64748B" />
                <Text style={styles.datePillText}>{date}</Text>
              </View>
              <TouchableOpacity style={styles.reshareBtn} onPress={() => handleReshareInvite(item)} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MessageSquare size={12} color="#FFFFFF" />
                  <Text style={styles.reshareBtnText}>Reshare</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    const itemStatusLower = String(item.status || '').toLowerCase();
    const isPending = itemStatusLower === 'pending';
    const isActive = itemStatusLower === 'active' || itemStatusLower === 'approved' || itemStatusLower === 'in_progress';
    const isCompleted = itemStatusLower === 'completed';
    const isRejected = itemStatusLower === 'rejected' || itemStatusLower === 'cancelled';

    let StatusIcon = FileText;
    let bgColor = '#FAF8F5';
    let statusTextColor = '#475569';
    let statusBorderColor = '#EADFC9';
    let labelText = (item.status || 'EXPIRED').toUpperCase();
    let leftAccentColor = '#4F46E5'; // Default Indigo

    if (isPending) {
      StatusIcon = PenTool;
      bgColor = '#FFFBEB'; // warm gold light
      statusTextColor = '#D97706';
      statusBorderColor = '#FDE68A';
      labelText = 'PENDING SIGN';
      leftAccentColor = '#F59E0B'; // Gold
    } else if (isActive) {
      StatusIcon = Box;
      bgColor = '#EEF2FF'; // light indigo
      statusTextColor = '#4F46E5';
      statusBorderColor = '#C7D2FE';
      labelText = 'ACTIVE TRADE';
      leftAccentColor = '#4F46E5'; // Indigo
    } else if (isCompleted) {
      StatusIcon = CheckCircle;
      bgColor = '#ECFDF5'; // Emerald-50
      statusTextColor = '#059669';
      statusBorderColor = '#A7F3D0';
      labelText = 'COMPLETED';
      leftAccentColor = '#059669'; // Green
    } else if (isRejected) {
      StatusIcon = XCircle;
      bgColor = '#FEF2F2'; // Red-50
      statusTextColor = '#EF4444';
      statusBorderColor = '#FCA5A5';
      labelText = 'REJECTED';
      leftAccentColor = '#EF4444'; // Red
    }

    const firstProd = item.products?.[0] || item.product || {};
    const pName = firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || item.dealNumber || 'Sauda Agreement';
    const qty = firstProd.quantity || item.qty || 'N/A';
    const price = firstProd.price || item.price || 'N/A';
    const totalAmt = item.totalAmount || firstProd.totalAmount || (qty !== 'N/A' && price !== 'N/A' ? Number(qty) * Number(price) : null);

    const dealId = item._id || item.id;
    const date = item.createdAt || item.dealDate ? new Date(item.createdAt || item.dealDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';

    const sellerName = resolveName(item.sellerCompanyId || item.sellerCompany, 'Seller');
    const buyerName = resolveName(item.buyerCompanyId || item.buyerCompany, 'Buyer');

    const { role: myRole, companyName: myCompanyName } = getMyRoleAndCompanyInDeal(item);

    const brokerName = item.broker?.name || item.brokerCompanyId?.name || 'Broker';
    const creatorRole = item.role || 'seller';
    const creatorCompanyName = creatorRole === 'seller' ? sellerName : creatorRole === 'buyer' ? buyerName : creatorRole === 'broker' ? brokerName : sellerName;
    const productImage = firstProd.productId?.image || firstProd.image || firstProd.productImage || item.image;
    const hasImage = typeof productImage === 'string' && productImage.trim().length > 0;

    return (
      <TouchableOpacity
        style={[styles.dealCard, { borderColor: '#EADFC9' }]}
        onPress={() => onNavigate('DealDetails', { dealId, deal: item })}
        activeOpacity={0.75}
      >
        {/* Visual left accent bar */}
        <View style={[styles.cardLeftAccent, { backgroundColor: leftAccentColor }]} />

        <View style={styles.cardTop}>
          {hasImage ? (
            <Image source={{ uri: productImage }} style={styles.dealProductImage} resizeMode="cover" />
          ) : (
            <View style={[styles.iconBubble, { backgroundColor: bgColor, borderColor: statusBorderColor }]}>
              <StatusIcon size={20} color={statusTextColor} />
            </View>
          )}
          <View style={styles.cardMain}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.productName} numberOfLines={1}>{pName}</Text>
              {isPending && <View style={styles.pulsingActionDot} />}
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {['Seller', 'Buyer'].includes(myRole) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>My Role:</Text>
                    <View style={[
                      styles.roleBadge,
                      myRole === 'Seller' ? styles.sellerRoleBadge : styles.buyerRoleBadge,
                      { marginVertical: 0 }
                    ]}>
                      <Text style={[
                        styles.roleBadgeText,
                        { color: myRole === 'Seller' ? '#4F46E5' : '#D97706' }
                      ]}>
                        {myRole.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: bgColor, borderColor: statusBorderColor }]}>
                  <Text style={[styles.statusText, { color: statusTextColor }]}>
                    {labelText}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 4, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Building2 size={12} color="#8C7A5B" />
                <Text style={styles.companyNameText} numberOfLines={1}>
                  Seller: <Text style={styles.creatorValueText}>{sellerName}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <User size={12} color="#8C7A5B" />
                <Text style={styles.companyNameText} numberOfLines={1}>
                  Buyer: <Text style={styles.creatorValueText}>{buyerName}</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Unified Sleek Stats Container */}
        <View style={styles.sleekStatsContainer}>
          <View style={styles.sleekStatBlock}>
            <Text style={styles.sleekStatLabel}>QTY</Text>
            <Text style={styles.sleekStatValue}>{String(qty)}</Text>
          </View>
          <View style={styles.sleekStatSeparator} />
          <View style={styles.sleekStatBlock}>
            <Text style={styles.sleekStatLabel}>PRICE</Text>
            <Text style={styles.sleekStatValue}>₹{String(price)}</Text>
          </View>
          {totalAmt ? (
            <>
              <View style={styles.sleekStatSeparator} />
              <View style={styles.sleekStatBlock}>
                <Text style={styles.sleekStatLabel}>VALUE</Text>
                <Text style={[
                  styles.sleekStatValue,
                  { fontWeight: '900', color: leftAccentColor }
                ]}>
                  ₹{Number(totalAmt).toLocaleString('en-IN')}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dealNumber}>{item.dealNumber || 'NO-REF'}</Text>
          <View style={[styles.datePill, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Calendar size={10} color="#64748B" />
            <Text style={styles.datePillText}>{date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeCompanyName ? activeCompanyName : 'Sauda Exchange'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activeCompanyName ? 'Active Saudas Only' : 'Your digital trade ledger'}
          </Text>
        </View>
        <TouchableOpacity style={styles.newDealBtn} onPress={() => onNavigate('CreateDeal', activeCompanyId ? { companyId: activeCompanyId, companyName: activeCompanyName } : {})} activeOpacity={0.8}>
          <Text style={styles.newDealBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>




      {/* ACTIVE COMPANY FILTER BADGE */}
      {activeCompanyId && (
        <View style={[styles.filterBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Building2 size={12} color="#0384C7" />
          <Text style={styles.filterBadgeText}>{activeCompanyName}</Text>
          <TouchableOpacity
            style={[styles.clearFilterBtn, { flexDirection: 'row', alignItems: 'center', gap: 2 }]}
            onPress={() => { setActiveCompanyId(null); setActiveCompanyName(null); }}
            activeOpacity={0.7}
          >
            <X size={12} color="#0384C7" />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB FILTERS */}
      <View style={styles.tabBar}>
        {[
          { key: 'Active', Icon: Box, label: 'Active', color: '#4F46E5' },
          { key: 'Expired', Icon: FileText, label: 'Expired', color: '#475569' },
          { key: 'Invitations', Icon: Mail, label: 'Invitations', color: '#059669' },
        ].map((t) => {
          const isActive = filter === t.key;
          const TabIcon = t.Icon;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, isActive && styles.activeTab, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
              onPress={() => { setIsLoading(true); setFilter(t.key); }}
              activeOpacity={0.7}
            >
              <TabIcon size={14} color={isActive ? '#FFFFFF' : t.color} />
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Synchronizing trades...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeals}
          renderItem={renderDealItem}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" colors={['#4F46E5']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <FileText size={48} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Saudas Found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'Invitations'
                  ? 'No pending invitations for your contacts yet.'
                  : `No ${filter.toLowerCase()} deals to show. Start your first trade!`}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => onNavigate('CreateDeal', activeCompanyId ? { companyId: activeCompanyId, companyName: activeCompanyName } : {})} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyBtnText}>Create First Deal</Text>
                </View>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, // slate/off-white background matching dashboard

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0', // slate border
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backIcon: { fontSize: 20, color: '#4F46E5', fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#1E1B4B', letterSpacing: 0.3 }, // Midnight Indigo Title
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
  newDealBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#4F46E5', // Deep Indigo button
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  newDealBtnText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },

  // FILTER BADGE
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF', // Light indigo bg
    borderColor: '#C7D2FE', // Indigo border
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  filterBadgeText: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },
  clearFilterBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  clearFilterText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },

  // TAB BAR
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#E2E8F0', // slate background
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  activeTabText: { color: '#4F46E5', fontWeight: '800' },

  // LIST
  listContent: { padding: 16, paddingBottom: 120 },

  // DEAL CARD
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EADFC9', // Heritage beige border
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  cardLeftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingLeft: 6 }, // Add paddingLeft to offset the left accent bar
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EADFC9',
  },
  dealProductImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EADFC9',
  },
  iconEmoji: { fontSize: 20 },
  cardMain: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productName: { fontSize: 15, fontWeight: '800', color: '#1F2937', flex: 1, marginRight: 8, letterSpacing: -0.2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },

  // SLEEK STATS ROW
  sleekStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5', // warm cream stats table bg
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EADFC9',
    marginTop: 4,
    marginLeft: 6, // Offset for left accent bar
  },
  sleekStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  sleekStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8C7A5B', // muted gold text label
    letterSpacing: 0.4,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  sleekStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  sleekStatSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#EADFC9',
  },

  // CARD FOOTER
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingLeft: 6 },
  dealNumber: { fontSize: 10, fontWeight: '700', color: '#8C7A5B' },
  datePill: { backgroundColor: '#FAF8F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#EADFC9' },
  datePillText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // INVITE
  inviteCodeBadge: {
    backgroundColor: '#FDF6E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0DFA7',
  },
  inviteCodeText: { fontSize: 10, fontWeight: '800', color: '#B58900' },
  reshareBtn: {
    backgroundColor: '#128C7E', // WhatsApp Green
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#128C7E',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  reshareBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  // LOADER
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#FAF8F5' },
  loadingText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },

  // EMPTY STATE
  emptyWrap: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E1B4B', marginBottom: 8, letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 28, fontWeight: '500' },
  emptyBtn: {
    backgroundColor: '#4F46E5', // Deep Indigo button
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  pendingGlowCard: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FDE68A',
    borderWidth: 1,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  pulsingActionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4AF37', // Gold pulsing dot
    marginRight: 8,
    alignSelf: 'center',
  },
  companyNamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  companyNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 18,
  },
  myRoleCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  sellerRoleBadge: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  buyerRoleBadge: {
    backgroundColor: '#FDF6E2',
    borderColor: '#F0DFA7',
  },
  brokerRoleBadge: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  roleBadgeText: {
    fontSize: 8,
    fontWeight: '950',
    letterSpacing: 0.3,
  },
  myCompanyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  creatorText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 4,
    fontWeight: '600',
  },
  creatorValueText: {
    fontWeight: '800',
    color: '#1E293B',
  },
});

export default DealsList;
