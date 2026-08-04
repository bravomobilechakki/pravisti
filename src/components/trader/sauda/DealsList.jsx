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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeals, getExpiredDeals, getPendingInvitations, getUserProfile, getCompanyDetails } from '../../../services/api';
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  MessageSquare,
  FileText,
  PenTool,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Mail,
  ChevronRight,
  Handshake,
  X,
  Plus,
  Layers,
  Activity,
  Package,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

      const cacheKey = `trader_deals_cache_${filter}_${activeCompanyId || 'all'}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDeals(parsed);
            setIsLoading(false);
          }
        } catch (e) { }
      }

      let response;
      if (filter === 'Active') {
        response = await getDeals(token, 1, 50, activeCompanyId);
      } else if (filter === 'Expired') {
        response = await getExpiredDeals(token, 1, 50, activeCompanyId);
      } else if (filter === 'Invitations') {
        response = await getPendingInvitations(token);
      }

      if (response && response.success) {
        const dealList = filter === 'Invitations' ? (response.data || []) : (response.data.deals || response.data || []);
        setDeals(dealList);
        if (Array.isArray(dealList) && dealList.length > 0) {
          AsyncStorage.setItem(cacheKey, JSON.stringify(dealList)).catch(() => { });
        }
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
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
      const pName =
        firstProd.productId?.name ||
        firstProd.productId?.productName ||
        firstProd.productName ||
        firstProd.name ||
        draft.crop ||
        'Unknown Product';

      // Aggregate totals across all products if multiple
      let qty = 0;
      let price = 0;
      let totalAmt = 0;
      const draftProds = draft.products || [];
      if (draftProds.length > 0) {
        draftProds.forEach(p => {
          const q = Number(p.quantity || p.qty || 0);
          const pr = Number(p.price || p.rate || 0);
          const ta = Number(p.totalAmount || q * pr || 0);
          qty += q;
          price = pr; // show first product rate
          totalAmt += ta;
        });
      } else {
        qty = Number(draft.quantity || draft.qty || firstProd.quantity || 0);
        price = Number(draft.price || draft.rate || firstProd.price || 0);
        totalAmt = Number(draft.totalAmount || qty * price || 0);
      }
      const qtyDisplay = qty > 0 ? qty : 'N/A';
      const priceDisplay = price > 0 ? price : 'N/A';
      const totalAmtDisplay = totalAmt > 0 ? totalAmt : null;
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
        <View style={[styles.dealCard, { borderColor: '#F59E0B33' }]}>
          {/* Violet top strip for invitations */}


          {/* Card Header Row */}
          <View style={styles.newCardHeader}>
            <View style={[styles.newIconBubble, { backgroundColor: '#FEF3C715', borderColor: '#F59E0B44' }]}>
              {hasImage
                ? <Image source={{ uri: productImage }} style={styles.newProductImage} resizeMode="cover" />
                : <Mail size={22} color="#D97706" />
              }
            </View>

            <View style={styles.newCardTitleBlock}>
              <Text style={styles.newProductName} numberOfLines={1}>{pName}</Text>
              <View style={styles.newPartyRow}>
                <Building2 size={11} color="#94A3B8" />
                <Text style={styles.newPartyText} numberOfLines={1}>
                  {sellerName} → {buyerName}
                </Text>
              </View>
            </View>

            <View style={styles.newRightBadgeCol}>
              <View style={[styles.newStatusPill, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.newStatusPillText}>INVITE</Text>
              </View>
              {['Seller', 'Buyer'].includes(myRole) && (
                <View style={[styles.newRolePill, myRole === 'Seller' ? styles.newSellerPill : styles.newBuyerPill]}>
                  <Text style={[styles.newRolePillText, { color: myRole === 'Seller' ? '#1A56DB' : '#0EA5E9' }]}>
                    {myRole}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.newDivider} />

          {/* Stats Row */}
          <View style={styles.newStatsRow}>
            <View style={styles.newStatItem}>
              <Package size={12} color="#94A3B8" />
              <Text style={styles.newStatLabel}>Qty</Text>
              <Text style={styles.newStatValue}>{String(qtyDisplay)}</Text>
            </View>
            <View style={styles.newStatDivider} />
            <View style={styles.newStatItem}>
              <TrendingUp size={12} color="#94A3B8" />
              <Text style={styles.newStatLabel}>Rate</Text>
              <Text style={styles.newStatValue}>₹{String(priceDisplay)}</Text>
            </View>
            {totalAmtDisplay ? (
              <>
                <View style={styles.newStatDivider} />
                <View style={styles.newStatItem}>
                  <Activity size={12} color="#F59E0B" />
                  <Text style={styles.newStatLabel}>Value</Text>
                  <Text style={[styles.newStatValue, { color: '#F59E0B', fontWeight: '900' }]}>
                    ₹{Number(totalAmtDisplay).toLocaleString('en-IN')}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Footer */}
          <View style={styles.newCardFooter}>
            <View style={styles.inviteCodeBadge}>
              <Text style={styles.inviteCodeText}>#{inviteCode}</Text>
            </View>
            <View style={styles.newDateChip}>
              <Calendar size={9} color="#94A3B8" />
              <Text style={styles.newDateText}>{date}</Text>
            </View>
            <TouchableOpacity style={styles.reshareBtn} onPress={() => handleReshareInvite(item)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={12} color="#FFFFFF" />
                <Text style={styles.reshareBtnText}>Reshare</Text>
              </View>
            </TouchableOpacity>
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
    let leftAccentColor = '#1A56DB'; // Default Indigo

    if (isPending) {
      StatusIcon = PenTool;
      bgColor = '#FEF3C7'; // warm amber bg
      statusTextColor = '#D97706';
      statusBorderColor = '#FDE68A';
      labelText = 'PENDING SIGN';
      leftAccentColor = '#F59E0B'; // Amber yellow
    } else if (isActive) {
      StatusIcon = TrendingUp;
      bgColor = '#EEF2FF'; // light indigo
      statusTextColor = '#1A56DB';
      statusBorderColor = '#C7D2FE';
      labelText = 'ACTIVE';
      leftAccentColor = '#1A56DB'; // Royal Blue
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

    // Aggregate qty/price/total across all products
    const allProds = item.products || (item.product ? [item.product] : []);
    let totalQty = 0;
    let firstPrice = 0;
    let totalValue = 0;
    if (allProds.length > 0) {
      allProds.forEach((p, idx) => {
        const q = Number(p.quantity || p.qty || 0);
        const pr = Number(p.price || p.rate || 0);
        const ta = Number(p.totalAmount || q * pr || 0);
        totalQty += q;
        if (idx === 0) firstPrice = pr;
        totalValue += ta;
      });
    } else {
      totalQty = Number(item.totalQuantity || item.qty || 0);
      firstPrice = Number(item.price || item.rate || 0);
      totalValue = Number(item.totalAmount || totalQty * firstPrice || 0);
    }
    // Also use deal-level totals if present
    const qty = totalQty > 0 ? totalQty : (item.totalQuantity || item.qty || 'N/A');
    const price = firstPrice > 0 ? firstPrice : (item.price || item.rate || 'N/A');
    const totalAmt = totalValue > 0 ? totalValue : (item.totalAmount || null);

    const dealId = item._id || item.id;
    const date = item.createdAt || item.dealDate ? new Date(item.createdAt || item.dealDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';

    const sellerName = resolveName(item.sellerCompanyId || item.sellerCompany, 'Seller');
    const buyerName = resolveName(item.buyerCompanyId || item.buyerCompany, 'Buyer');

    const { role: myRole, companyName: myCompanyName } = getMyRoleAndCompanyInDeal(item);

    const firstProd = allProds[0] || item.product || {};
    const pName =
      firstProd.productId?.name ||
      firstProd.productId?.productName ||
      firstProd.productName ||
      firstProd.name ||
      (typeof firstProd === 'string' ? firstProd : '') ||
      item.crop ||
      item.dealNumber ||
      'Sauda Agreement';
    const productImage = firstProd.productId?.image || firstProd.image || firstProd.productImage || item.image;
    const hasImage = typeof productImage === 'string' && productImage.trim().length > 0;

    // --- NEW PREMIUM CARD DESIGN ---
    return (
      <TouchableOpacity
        style={[styles.dealCard, isPending && styles.dealCardPending]}
        onPress={() => onNavigate('DealDetails', { dealId, deal: item })}
        activeOpacity={0.82}
      >
        {/* Top gradient accent strip */}


        {/* Card Header Row */}
        <View style={styles.newCardHeader}>
          <View style={[styles.newIconBubble, { backgroundColor: bgColor + '33', borderColor: leftAccentColor + '55' }]}>
            {hasImage
              ? <Image source={{ uri: productImage }} style={styles.newProductImage} resizeMode="cover" />
              : <StatusIcon size={22} color={leftAccentColor} />
            }
          </View>

          <View style={styles.newCardTitleBlock}>
            <Text style={styles.newProductName} numberOfLines={1}>{pName}</Text>
            <View style={styles.newPartyRow}>
              <Building2 size={11} color="#94A3B8" />
              <Text style={styles.newPartyText} numberOfLines={1}>
                {sellerName} → {buyerName}
              </Text>
            </View>
          </View>

          <View style={styles.newRightBadgeCol}>
            <View style={[styles.newStatusPill, { backgroundColor: leftAccentColor }]}>
              <Text style={styles.newStatusPillText}>{labelText}</Text>
            </View>
            {['Seller', 'Buyer'].includes(myRole) && (
              <View style={[styles.newRolePill, myRole === 'Seller' ? styles.newSellerPill : styles.newBuyerPill]}>
                <Text style={[styles.newRolePillText, { color: myRole === 'Seller' ? '#1A56DB' : '#0EA5E9' }]}>
                  {myRole}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.newDivider} />

        {/* Stats Row */}
        <View style={styles.newStatsRow}>
          <View style={styles.newStatItem}>
            <Package size={12} color="#94A3B8" />
            <Text style={styles.newStatLabel}>Qty</Text>
            <Text style={styles.newStatValue}>
              {typeof qty === 'number' ? qty.toLocaleString('en-IN') : String(qty)}
            </Text>
          </View>
          <View style={styles.newStatDivider} />
          <View style={styles.newStatItem}>
            <TrendingUp size={12} color="#94A3B8" />
            <Text style={styles.newStatLabel}>Rate</Text>
            <Text style={styles.newStatValue}>
              {typeof price === 'number' && price > 0 ? '₹' + price.toLocaleString('en-IN') : (price !== 'N/A' ? '₹' + price : 'N/A')}
            </Text>
          </View>
          {totalAmt ? (
            <>
              <View style={styles.newStatDivider} />
              <View style={styles.newStatItem}>
                <Activity size={12} color={leftAccentColor} />
                <Text style={styles.newStatLabel}>Value</Text>
                <Text style={[styles.newStatValue, { color: leftAccentColor, fontWeight: '900' }]}>
                  ₹{Number(totalAmt).toLocaleString('en-IN')}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.newCardFooter}>
          <Text style={styles.newDealRef}># {item.dealNumber || 'NO-REF'}</Text>
          <View style={styles.newDateChip}>
            <Calendar size={9} color="#94A3B8" />
            <Text style={styles.newDateText}>{date}</Text>
          </View>
          <ChevronRight size={14} color="#475569" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* PREMIUM DARK HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeCompanyName || 'Sauda Exchange'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activeCompanyName ? 'Company Deals' : 'Your digital trade ledger'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newDealBtn}
          onPress={() => onNavigate('CreateDeal', activeCompanyId ? { companyId: activeCompanyId, companyName: activeCompanyName } : {})}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.newDealBtnText}>New</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ACTIVE COMPANY FILTER BADGE */}
      {activeCompanyId && (
        <View style={styles.filterBadge}>
          <Building2 size={12} color="#1A56DB" />
          <Text style={styles.filterBadgeText}>{activeCompanyName}</Text>
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => { setActiveCompanyId(null); setActiveCompanyName(null); }}
            activeOpacity={0.7}
          >
            <X size={11} color="#94A3B8" />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB FILTERS */}
      <View style={styles.tabBar}>
        {[
          { key: 'Active', Icon: Activity, label: 'Active', color: '#1A56DB' },
          { key: 'Expired', Icon: FileText, label: 'Expired', color: '#64748B' },
          { key: 'Invitations', Icon: Mail, label: 'Invites', color: '#10B981' },
        ].map((t) => {
          const isTabActive = filter === t.key;
          const TabIcon = t.Icon;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, isTabActive && [styles.activeTab, { borderBottomColor: t.color }]]}
              onPress={() => { setIsLoading(true); setFilter(t.key); }}
              activeOpacity={0.75}
            >
              <TabIcon size={14} color={isTabActive ? t.color : '#64748B'} />
              <Text style={[styles.tabText, isTabActive && { color: t.color, fontWeight: '800' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#1A56DB" />
          <Text style={styles.loadingText}>Loading trades...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeals}
          renderItem={renderDealItem}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A56DB" colors={['#1A56DB']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Layers size={42} color="#334155" />
              </View>
              <Text style={styles.emptyTitle}>No Saudas Found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'Invitations'
                  ? 'No pending invitations yet.'
                  : `No ${filter.toLowerCase()} deals. Start your first trade!`}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => onNavigate('CreateDeal', activeCompanyId ? { companyId: activeCompanyId, companyName: activeCompanyName } : {})}
                activeOpacity={0.85}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Create Deal</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, // Light slate background

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },
  newDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#1A56DB',
    borderRadius: 12,
    shadowColor: '#1A56DB',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  newDealBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // FILTER BADGE
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginHorizontal: 16,
    marginTop: 10,
  },
  filterBadgeText: { fontSize: 13, color: '#1A56DB', fontWeight: '700', flex: 1 },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  clearFilterText: { fontSize: 11, fontWeight: '700', color: '#1A56DB' },

  // TAB BAR — underline style
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2.5,
  },
  tabText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },

  // LIST
  listContent: { padding: 14, paddingBottom: 120, gap: 12 },

  // NEW PREMIUM DEAL CARD
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  dealCardPending: {
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.10,
  },

  newCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  newIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  newProductImage: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  newCardTitleBlock: { flex: 1, gap: 5 },
  newProductName: { fontSize: 15, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
  newPartyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  newPartyText: { fontSize: 12, color: '#94A3B8', fontWeight: '500', flex: 1 },
  newRightBadgeCol: { alignItems: 'flex-end', gap: 5 },
  newStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  newStatusPillText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.8 },
  newRolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  newSellerPill: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  newBuyerPill: { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' },
  newRolePillText: { fontSize: 9, fontWeight: '800' },

  // DIVIDER
  newDivider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },

  // STATS ROW
  newStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  newStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  newStatLabel: { fontSize: 9, fontWeight: '600', color: '#94A3B8', letterSpacing: 0.5, textTransform: 'uppercase' },
  newStatValue: { fontSize: 13, fontWeight: '800', color: '#334155' },
  newStatDivider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },

  // CARD FOOTER
  newCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  newDealRef: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  newDateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newDateText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  // INVITE specific (reuse in invitations render)
  inviteCodeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inviteCodeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  reshareBtn: {
    backgroundColor: '#128C7E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    elevation: 2,
  },
  reshareBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  datePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  datePillText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  // LOADER
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC' },
  loadingText: { fontSize: 14, color: '#1A56DB', fontWeight: '600' },

  // EMPTY STATE
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 28 },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: { fontSize: 19, fontWeight: '900', color: '#1E293B', marginBottom: 10, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 32, fontWeight: '400' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A56DB',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#1A56DB',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Kept for invitations card (uses old design wrappers slightly)
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingLeft: 6 },
  cardMain: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productName: { fontSize: 15, fontWeight: '800', color: '#F1F5F9', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },
  cardLeftAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  iconBubble: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dealProductImage: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  sleekStatsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 4, marginLeft: 6 },
  sleekStatBlock: { flex: 1, alignItems: 'center' },
  sleekStatLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.4, marginBottom: 3, textTransform: 'uppercase' },
  sleekStatValue: { fontSize: 13, fontWeight: '800', color: '#334155' },
  sleekStatSeparator: { width: 1, height: 16, backgroundColor: '#E2E8F0' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingLeft: 6 },
  dealNumber: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  companyNameText: { fontSize: 12, fontWeight: '600', color: '#64748B', lineHeight: 18 },
  creatorValueText: { fontWeight: '800', color: '#475569' },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  sellerRoleBadge: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  buyerRoleBadge: { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' },
  brokerRoleBadge: { backgroundColor: '#F3E8FF', borderColor: '#DDD6FE' },
  roleBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  pulsingActionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginRight: 8, alignSelf: 'center' },
  myCompanyText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1', flex: 1 },
  creatorText: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 4, fontWeight: '600' },
  companyNamesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 6 },
  myRoleCompanyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4, gap: 6 },
  pendingGlowCard: { borderColor: '#0EA5E9', shadowColor: '#0EA5E9', shadowOpacity: 0.10 },
});

export default DealsList;
