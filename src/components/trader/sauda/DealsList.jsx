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
  TextInput,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDeals,
  getExpiredDeals,
  getRecreatedDeals,
  getBrokerProductAccessRequests,
  respondToProductAccessRequest,
  deleteDeal,
  recreateExpiredDeal,
  getPendingInvitations,
  getUserProfile,
  getCompanyDetails,
} from '../../../services/api';

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
  Search,
  ShieldCheck,
  Briefcase,
  DollarSign,
  RefreshCw,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DealsList = ({ onNavigate, routeData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
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

  const resolveName = useCallback((company, fallback = 'Company') => {
    if (!company) return fallback;
    if (typeof company === 'object') {
      return (
        company.name ||
        company.companyName ||
        company.businessName ||
        company.title ||
        (company.companyId && (company.companyId.name || company.companyId.companyName)) ||
        company.ownerName ||
        fallback
      );
    }
    if (companyNames[company]) {
      return companyNames[company];
    }
    if (typeof company === 'string' && company.match(/^[0-9a-fA-F]{24}$/)) {
      return 'Loading...';
    }
    return String(company);
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

      const cacheKey = `trader_deals_cache_${activeCompanyId || 'all'}`;
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

      const response = await getDeals(token, 1, 100, activeCompanyId);
      if (response && response.success) {
        const dealList = Array.isArray(response.data?.deals) ? response.data.deals : (Array.isArray(response.data) ? response.data : []);
        setDeals(dealList);
        if (dealList.length > 0) {
          AsyncStorage.setItem(cacheKey, JSON.stringify(dealList)).catch(() => { });
        }
      }

    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeCompanyId]);

  React.useEffect(() => {
    fetchDeals();
  }, [fetchDeals, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const metrics = React.useMemo(() => {
    let allCount = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let expiredCount = 0;
    let activeTotalValue = 0;

    deals.forEach(deal => {
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

        if (!isAssociated) return;
      }

      allCount++;
      const statusLower = String(deal.status || '').toLowerCase();
      const isPending = statusLower === 'pending' || statusLower === 'draft';
      const isExpired = statusLower === 'expired' || statusLower === 'completed' || statusLower === 'rejected' || statusLower === 'cancelled';
      const isActive = !isPending && !isExpired;

      if (isPending) {
        pendingCount++;
      } else if (isExpired) {
        expiredCount++;
      } else {
        activeCount++;
        activeTotalValue += Number(deal.totalAmount || 0);
      }
    });

    return { allCount, activeCount, pendingCount, expiredCount, activeTotalValue };
  }, [deals, activeCompanyId]);


  const filteredDeals = deals.filter(deal => {
    let pName = '';
    if (filter === 'Invitations') {
      const firstProd = deal.dealDraft?.products?.[0];
      pName = firstProd?.productId?.name || firstProd?.productName || '';
    } else {
      const firstProd = deal.products?.[0] || deal.product || {};
      pName = firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || '';
    }
    const sellerName = resolveName(deal.sellerCompanyId || deal.sellerCompany, '');
    const buyerName = resolveName(deal.buyerCompanyId || deal.buyerCompany, '');
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      String(pName || '').toLowerCase().includes(query) ||
      String(deal.dealNumber || '').toLowerCase().includes(query) ||
      String(sellerName || '').toLowerCase().includes(query) ||
      String(buyerName || '').toLowerCase().includes(query);

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
    const isPendingTrade = statusLower === 'pending' || statusLower === 'draft';
    const isExpiredTrade = statusLower === 'expired' || statusLower === 'completed' || statusLower === 'rejected' || statusLower === 'cancelled';
    const isActiveTrade = !isPendingTrade && !isExpiredTrade;

    const statusMatches = filter === 'All' ? true : (filter === 'Pending' ? isPendingTrade : (filter === 'Expired' ? isExpiredTrade : isActiveTrade));

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

  //   mention here in the UI there should be the name of the broker also.
  const renderbroker = ({ item }) => {
    return (
      <View>
        <Text>{item.broker.name}</Text>
      </View>
    );
  }




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
      const hasImage = typeof productImage === 'string' &&
        productImage.trim().length > 5 &&
        (productImage.startsWith('http://') || productImage.startsWith('https://') || productImage.startsWith('data:image/'));

      return (
        <TouchableOpacity
          style={styles.tableRow}
          onPress={() => handleReshareInvite(item)}
          activeOpacity={0.8}
        >
          <View style={[styles.tableStatusIndicator, { backgroundColor: '#F59E0B' }]} />
          <View style={styles.tableRowInner}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.tableProductName} numberOfLines={1}>{pName}</Text>
                <Text style={styles.tableRefText}>Code: #{inviteCode} • 📅 {date}</Text>
              </View>
              <View style={[styles.tableStatusPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Mail size={11} color="#D97706" style={{ marginRight: 3 }} />
                <Text style={[styles.tableStatusText, { color: '#D97706' }]}>INVITATION</Text>
              </View>
            </View>

            <View style={styles.partiesContainerBox}>
              <View style={styles.partyItemCol}>
                <Text style={styles.partyRoleLabelSeller}>SELLER</Text>
                <Text style={styles.partyNameValue} numberOfLines={1}>{sellerName}</Text>
              </View>
              <View style={styles.partyArrowDivider}>
                <Handshake size={14} color="#94A3B8" />
              </View>
              <View style={styles.partyItemCol}>
                <Text style={styles.partyRoleLabelBuyer}>BUYER</Text>
                <Text style={styles.partyNameValue} numberOfLines={1}>{buyerName}</Text>
              </View>
            </View>

            <View style={styles.cardFooterRow}>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.metricFooterLabel}>ESTIMATED AMOUNT</Text>
                <Text style={[styles.tableValueText, { color: '#D97706', marginTop: 2 }]}>
                  {totalAmtDisplay ? '₹' + Number(totalAmtDisplay).toLocaleString('en-IN') : 'Pending'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricFooterLabel}>QUANTITY</Text>
                <Text style={[styles.tableQtyText, { marginTop: 2, fontSize: 13, fontWeight: '700' }]}>{String(qtyDisplay)} MT</Text>
              </View>
              <TouchableOpacity style={styles.tableReshareBtn} onPress={() => handleReshareInvite(item)} activeOpacity={0.8}>
                <MessageSquare size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.tableReshareText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const itemStatusLower = String(item.status || '').toLowerCase();
    const isPending = itemStatusLower === 'pending';
    const isActive = itemStatusLower === 'active' || itemStatusLower === 'approved' || itemStatusLower === 'in_progress';
    const isDraft = itemStatusLower === 'draft';
    const isCompleted = itemStatusLower === 'completed';
    const isRejected = itemStatusLower === 'rejected' || itemStatusLower === 'cancelled';

    let StatusIcon = FileText;
    let bgColor = '#FAF8F5';
    let statusTextColor = '#475569';
    let statusBorderColor = '#EADFC9';
    let labelText = (item.status || 'EXPIRED').toUpperCase();
    let leftAccentColor = '#1A56DB';

    if (isDraft) {
      StatusIcon = Clock;
      bgColor = '#FEF3C7';
      statusTextColor = '#D97706';
      statusBorderColor = '#FDE68A';
      labelText = 'DRAFT';
      leftAccentColor = '#F59E0B';
    } else if (isPending) {
      StatusIcon = PenTool;
      bgColor = '#FEF3C7';
      statusTextColor = '#D97706';
      statusBorderColor = '#FDE68A';
      labelText = 'PENDING';
      leftAccentColor = '#F59E0B';
    } else if (isActive) {
      StatusIcon = TrendingUp;
      bgColor = '#EEF2FF';
      statusTextColor = '#1A56DB';
      statusBorderColor = '#C7D2FE';
      labelText = 'ACTIVE';
      leftAccentColor = '#1A56DB';
    } else if (isCompleted) {
      StatusIcon = CheckCircle;
      bgColor = '#ECFDF5';
      statusTextColor = '#059669';
      statusBorderColor = '#A7F3D0';
      labelText = 'DONE';
      leftAccentColor = '#059669';
    } else if (isRejected) {
      StatusIcon = XCircle;
      bgColor = '#FEF2F2';
      statusTextColor = '#EF4444';
      statusBorderColor = '#FCA5A5';
      labelText = 'REJECTED';
      leftAccentColor = '#EF4444';
    }

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

    return (
      <TouchableOpacity
        style={styles.tableRow}
        onPress={() => onNavigate('DealDetails', { dealId, deal: item })}
        activeOpacity={0.8}
      >
        <View style={styles.tableRowInner}>
          {/* Top Row: Product Name & Status Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.tableProductName} numberOfLines={1}>{pName}</Text>
              <Text style={styles.tableRefText}>#{item.dealNumber || 'DRAFT'} • 📅 {date}</Text>
            </View>
            <View style={[styles.tableStatusPill, { backgroundColor: bgColor, borderColor: statusBorderColor }]}>
              <StatusIcon size={11} color={statusTextColor} style={{ marginRight: 3 }} />
              <Text style={[styles.tableStatusText, { color: statusTextColor }]}>
                {labelText}
              </Text>
            </View>
          </View>

          {/* Middle Row: Parties Seller ↔ Buyer Box */}
          <View style={styles.partiesContainerBox}>
            <View style={styles.partyItemCol}>
              <Text style={styles.partyRoleLabelSeller}>SELLER</Text>
              <Text style={styles.partyNameValue} numberOfLines={1}>{sellerName}</Text>
            </View>
            <View style={styles.partyArrowDivider}>
              <Handshake size={14} color="#94A3B8" />
            </View>
            <View style={styles.partyItemCol}>
              <Text style={styles.partyRoleLabelBuyer}>BUYER</Text>
              <Text style={styles.partyNameValue} numberOfLines={1}>{buyerName}</Text>
            </View>
          </View>

          {/* Broker Badge (if deal has a Broker) */}
          {(() => {
            const bObj = item.brokerCompanyId || item.brokerCompany || item.broker;
            const bName = bObj?.name || bObj?.companyName || (typeof bObj === 'string' ? companyNames[bObj] : null);
            if (!bName || bName === 'Company') return null;
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', marginRight: 4, letterSpacing: 0.5 }}>
                  BROKER:
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }} numberOfLines={1}>
                  {bName}
                </Text>
              </View>
            );
          })()}

          {/* Bottom Row: Amount, Qty & Action */}
          <View style={styles.cardFooterRow}>
            <View style={{ flex: 1.2 }}>
              <Text style={styles.metricFooterLabel}>TOTAL TRADE VALUE</Text>
              <Text style={[styles.tableValueText, { color: leftAccentColor, marginTop: 2 }]}>
                {totalAmt ? '₹' + Number(totalAmt).toLocaleString('en-IN') : '₹0'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricFooterLabel}>QUANTITY</Text>
              <Text style={[styles.tableQtyText, { marginTop: 2, fontSize: 13, fontWeight: '700' }]}>
                {typeof qty === 'number' ? qty.toLocaleString('en-IN') : String(qty)} {firstProd.unit || 'MT'}
              </Text>
            </View>
            <View style={styles.viewDetailsBtn}>
              <Text style={styles.viewDetailsBtnText}>Details</Text>
              <ChevronRight size={14} color="#2563EB" />
            </View>
          </View>
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

      {/* SEARCH BAR */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInner}>
          <Search size={15} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deals by product, party, deal #..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} style={{ padding: 4 }}>
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* TAB FILTERS (ROUNDED PILL CHIPS) */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {[
            { key: 'All', Icon: Layers, label: 'All', count: metrics.allCount, activeBg: '#F1F5F9', activeText: '#0F172A', activeBorder: '#CBD5E1' },
            { key: 'Active', Icon: Activity, label: 'Active', count: metrics.activeCount, activeBg: '#EFF6FF', activeText: '#1D4ED8', activeBorder: '#BFDBFE' },
            { key: 'Pending', Icon: PenTool, label: 'Pending', count: metrics.pendingCount, activeBg: '#FEF3C7', activeText: '#B45309', activeBorder: '#FDE68A' },
            { key: 'Expired', Icon: FileText, label: 'Expired', count: metrics.expiredCount, activeBg: '#F8FAFC', activeText: '#475569', activeBorder: '#CBD5E1' },
          ].map((t) => {
            const isTabActive = filter === t.key;
            const TabIcon = t.Icon;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.pillTab,
                  isTabActive
                    ? { backgroundColor: t.activeBg, borderColor: t.activeBorder }
                    : styles.pillTabInactive,
                ]}
                onPress={() => {
                  setFilter(t.key);
                }}
                activeOpacity={0.75}
              >
                <TabIcon
                  size={13}
                  color={isTabActive ? t.activeText : '#64748B'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.pillTabText,
                    isTabActive
                      ? { color: t.activeText, fontWeight: '800' }
                      : styles.pillTabTextInactive,
                  ]}
                >
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View
                    style={[
                      styles.pillCountBadge,
                      isTabActive
                        ? { backgroundColor: t.activeText }
                        : styles.pillCountBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillCountText,
                        isTabActive ? { color: '#FFFFFF' } : styles.pillCountTextInactive,
                      ]}
                    >
                      {t.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  newDealBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // FILTER BADGE
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
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
  },
  clearFilterText: { fontSize: 11, fontWeight: '700', color: '#1A56DB' },

  // TAB BAR CONTAINER — ROUNDED PILL CHIPS
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillTabInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  pillTabText: {
    fontSize: 12,
  },
  pillTabTextInactive: {
    color: '#64748B',
    fontWeight: '600',
  },
  pillCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  pillCountBadgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  pillCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pillCountTextInactive: {
    color: '#475569',
  },

  // SEARCH BAR
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 0,
  },

  // METRICS CONTAINER
  metricsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
  },
  metricsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    minWidth: 115,
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '900',
  },

  // TAB COUNT PILL
  tabCountPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  tabCountPillText: {
    fontSize: 9,
    fontWeight: '900',
  },

  // LIST
  listContent: { padding: 12, paddingBottom: 120, gap: 8 },

  // HIGH DENSITY DEAL CARD STYLES
  tableRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  tableStatusIndicator: {
    width: 5,
    alignSelf: 'stretch',
  },
  tableRowInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tableProductName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  tableRefText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tableStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tableStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  partiesContainerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  partyItemCol: {
    flex: 1,
  },
  partyRoleLabelSeller: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  partyRoleLabelBuyer: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  partyNameValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  partyArrowDivider: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  metricFooterLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tableValueText: {
    fontSize: 14,
    fontWeight: '900',
  },
  tableQtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 2,
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  tableReshareBtn: {
    backgroundColor: '#128C7E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tableReshareText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

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
