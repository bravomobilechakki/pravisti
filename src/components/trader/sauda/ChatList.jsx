import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getConversations,
  getUserProfile,
  getDeals,
  getDealDetails,
  resolveImageUrl,
} from '../../../services/api';
import {
  ArrowLeft,
  MessageSquare,
  Search,
  X,
  Package,
  ShoppingBag,
  Store,
  RotateCw,
  CheckCheck,
  ChevronRight,
} from 'lucide-react-native';

const ProductAvatar = ({ imageUri }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUri]);

  if (imageUri && !imgError) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={styles.chatProductImage}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View style={styles.chatAvatarFallback}>
      <Package size={24} color="#1541D8" strokeWidth={2.2} />
    </View>
  );
};

const ChatList = ({ onNavigate, routeData }) => {
  const [conversations, setConversations] = useState([]);
  const [dealsMap, setDealsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserCompanyIds, setCurrentUserCompanyIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'buyer' | 'seller'

  const routeCompanyId =
    routeData?.companyId ||
    routeData?.company?._id ||
    routeData?.company?.id ||
    routeData?.deal?.sellerCompanyId?._id ||
    routeData?.deal?.buyerCompanyId?._id;

  const fetchConversations = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      let activeCompanyId = routeCompanyId;
      if (!activeCompanyId) {
        activeCompanyId = (await AsyncStorage.getItem('selected_company_id')) || '';
      }

      // 1. Immediately fetch conversations (fastest API call)
      const convResponse = await getConversations(token, 1, 50, activeCompanyId || '').catch((e) => {
        console.warn('Failed to load conversations:', e);
        return null;
      });

      let convList = null;
      if (Array.isArray(convResponse?.data?.data)) {
        convList = convResponse.data.data;
      } else if (Array.isArray(convResponse?.data)) {
        convList = convResponse.data;
      } else if (Array.isArray(convResponse?.conversations)) {
        convList = convResponse.conversations;
      } else if (Array.isArray(convResponse)) {
        convList = convResponse;
      }

      if (convList) {
        setConversations(convList);
        setIsLoading(false); // Unblock UI immediately
        setRefreshing(false);
        AsyncStorage.setItem('cached_conversations', JSON.stringify(convList)).catch(() => {});

        // 2. Background non-blocking fetch of deals to enrich product images
        setTimeout(async () => {
          try {
            const [dealsRes, profileRes] = await Promise.all([
              getDeals(token, 1, 50, activeCompanyId || '').catch(() => null),
              getUserProfile(token).catch(() => null),
            ]);

            if (profileRes && (profileRes.success || profileRes.data) && profileRes.data) {
              const u = profileRes.data;
              if (u._id || u.id) setCurrentUserId(u._id || u.id);
              if (Array.isArray(u.companies)) {
                setCurrentUserCompanyIds(u.companies.map((c) => String(c._id || c.id || c)));
              }
            }

            if (dealsRes) {
              let dealList = [];
              if (Array.isArray(dealsRes?.data?.deals)) dealList = dealsRes.data.deals;
              else if (Array.isArray(dealsRes?.data?.data)) dealList = dealsRes.data.data;
              else if (Array.isArray(dealsRes?.data)) dealList = dealsRes.data;
              else if (Array.isArray(dealsRes?.deals)) dealList = dealsRes.deals;

              const map = {};
              dealList.forEach((d) => {
                if (d?._id) map[String(d._id)] = d;
                if (d?.id) map[String(d.id)] = d;
                if (d?.dealNumber) map[String(d.dealNumber)] = d;
                if (d?.dealNo) map[String(d.dealNo)] = d;
              });
              setDealsMap((prev) => ({ ...prev, ...map }));
            }
          } catch (bgError) {
            console.warn('Background deal enrichment error:', bgError);
          }
        }, 20);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [routeCompanyId]);

  useEffect(() => {
    let isMounted = true;
    const loadCachedData = async () => {
      try {
        const [cachedConvs, cachedDeals, storedProfile, traderDealsAll, traderDealsCid] =
          await Promise.all([
            AsyncStorage.getItem('cached_conversations'),
            AsyncStorage.getItem('cached_deals'),
            AsyncStorage.getItem('user_completed_profile'),
            AsyncStorage.getItem('trader_deals_cache_all'),
            routeCompanyId
              ? AsyncStorage.getItem(`trader_deals_cache_${routeCompanyId}`)
              : Promise.resolve(null),
          ]);

        if (!isMounted) return;

        if (storedProfile) {
          try {
            const u = JSON.parse(storedProfile);
            if (u._id || u.id) setCurrentUserId(u._id || u.id);
            if (Array.isArray(u.companies)) {
              setCurrentUserCompanyIds(u.companies.map((c) => String(c._id || c.id || c)));
            }
          } catch (e) {}
        }

        // Merge cached deals from all available caches
        const map = {};
        const processDeals = (str) => {
          if (!str) return;
          try {
            const parsed = JSON.parse(str);
            const arr = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed?.deals)
                ? parsed.deals
                : Array.isArray(parsed?.data)
                  ? parsed.data
                  : [];
            arr.forEach((d) => {
              if (d?._id) map[String(d._id)] = d;
              if (d?.id) map[String(d.id)] = d;
              if (d?.dealNumber) map[String(d.dealNumber)] = d;
              if (d?.dealNo) map[String(d.dealNo)] = d;
            });
          } catch (e) {}
        };

        processDeals(cachedDeals);
        processDeals(traderDealsAll);
        processDeals(traderDealsCid);

        if (Object.keys(map).length > 0) {
          setDealsMap((prev) => ({ ...prev, ...map }));
        }

        if (cachedConvs) {
          try {
            const parsedConvs = JSON.parse(cachedConvs);
            if (Array.isArray(parsedConvs) && parsedConvs.length > 0) {
              setConversations(parsedConvs);
              setIsLoading(false); // Instant render from cache
            }
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Failed to load cached data:', e);
      }
    };

    loadCachedData();
    fetchConversations();

    return () => {
      isMounted = false;
    };
  }, [fetchConversations, routeCompanyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Helper to extract product name and multiple count (+1, +2, etc.)
  const getDealProductInfo = useCallback(
    (conv) => {
      const dealIdStr = String(conv.dealId?._id || conv.dealId?.id || conv.dealId || '');
      const dealNoStr = String(conv.dealNumber || conv.dealId?.dealNumber || '');
      const matchedDeal = dealsMap[dealIdStr] || dealsMap[dealNoStr];
      const target = matchedDeal || (typeof conv.dealId === 'object' ? conv.dealId : null) || conv;

      const prods =
        Array.isArray(target?.products) && target.products.length > 0
          ? target.products
          : target?.product
            ? [target.product]
            : [];

      if (prods.length > 0) {
        const first = prods[0];
        const pObj =
          first?.productId && typeof first.productId === 'object' ? first.productId : null;
        const name =
          pObj?.name ||
          first?.name ||
          first?.productName ||
          target?.productName ||
          target?.title ||
          target?.dealName ||
          'Product';

        const extraCount = prods.length - 1;
        return {
          productName: name,
          hasMultiple: extraCount > 0,
          extraCount,
        };
      }

      const directName =
        target?.productName ||
        target?.title ||
        target?.dealName ||
        'Trade Deal';

      return {
        productName: directName,
        hasMultiple: false,
        extraCount: 0,
      };
    },
    [dealsMap]
  );

  // Helper to extract ONLY the logged-in user's role (BUYER or SELLER)
  const getUserRole = useCallback(
    (conv) => {
      const participants = conv?.participants || [];
      const myPart = participants.find(
        (p) => String(p?.userId?._id || p?.userId?.id || p?.userId) === String(currentUserId)
      );

      if (myPart?.role) {
        return myPart.role.toUpperCase();
      }

      const dealIdStr = String(conv.dealId?._id || conv.dealId?.id || conv.dealId || '');
      const dealNoStr = String(conv.dealNumber || conv.dealId?.dealNumber || '');
      const matchedDeal = dealsMap[dealIdStr] || dealsMap[dealNoStr];

      if (matchedDeal) {
        const sellerCid = String(
          matchedDeal.sellerCompanyId?._id ||
            matchedDeal.sellerCompanyId?.id ||
            matchedDeal.sellerCompanyId ||
            ''
        );
        const buyerCid = String(
          matchedDeal.buyerCompanyId?._id ||
            matchedDeal.buyerCompanyId?.id ||
            matchedDeal.buyerCompanyId ||
            ''
        );

        if (
          currentUserCompanyIds.some(
            (cid) => cid && sellerCid && cid.toLowerCase() === sellerCid.toLowerCase()
          )
        ) {
          return 'SELLER';
        }
        if (
          currentUserCompanyIds.some(
            (cid) => cid && buyerCid && cid.toLowerCase() === buyerCid.toLowerCase()
          )
        ) {
          return 'BUYER';
        }
      }

      // If only one participant exists in conversation
      if (participants.length === 1 && participants[0]?.role) {
        const pRole = participants[0].role.toUpperCase();
        const isMe =
          String(participants[0]?.userId?._id || participants[0]?.userId?.id || participants[0]?.userId) ===
          String(currentUserId);
        return isMe ? pRole : pRole === 'BUYER' ? 'SELLER' : 'BUYER';
      }

      return 'BUYER';
    },
    [currentUserId, currentUserCompanyIds, dealsMap]
  );

  // Helper to extract product image from deal or dealsMap
  const getProductImageUri = useCallback(
    (conv) => {
      const dealIdStr = String(conv.dealId?._id || conv.dealId?.id || conv.dealId || '');
      const dealNoStr = String(conv.dealNumber || conv.dealId?.dealNumber || '');

      const matchedDeal = dealsMap[dealIdStr] || dealsMap[dealNoStr];
      const targetObj = matchedDeal || (typeof conv.dealId === 'object' ? conv.dealId : null) || conv;

      if (!targetObj) return null;

      // 1. Direct candidate
      const directCandidate =
        targetObj?.productImage ||
        targetObj?.image ||
        targetObj?.imageUrl ||
        (Array.isArray(targetObj?.images) && targetObj.images[0]) ||
        targetObj?.product?.image ||
        targetObj?.product?.imageUrl ||
        targetObj?.product?.productImage;

      if (directCandidate) return resolveImageUrl(directCandidate);

      // 2. Prods array
      const prods =
        Array.isArray(targetObj?.products) && targetObj.products.length > 0
          ? targetObj.products
          : targetObj?.product
            ? [targetObj.product]
            : [];

      for (const p of prods) {
        if (!p) continue;
        const pObj = p.productId && typeof p.productId === 'object' ? p.productId : null;
        const candidate =
          p.image ||
          p.imageUrl ||
          p.productImage ||
          (Array.isArray(p.images) && p.images[0]) ||
          pObj?.image ||
          pObj?.imageUrl ||
          pObj?.productImage ||
          (Array.isArray(pObj?.images) && pObj.images[0]);

        if (candidate) {
          return resolveImageUrl(candidate);
        }
      }

      return null;
    },
    [dealsMap]
  );

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const dealNo = String(conv.dealNumber || conv.dealId?.dealNumber || '').toLowerCase();
      const productInfo = getDealProductInfo(conv);
      const prodName = productInfo.productName.toLowerCase();
      const userRole = getUserRole(conv);
      const lastMsg = String(conv.lastMessage?.content || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        dealNo.includes(q) ||
        prodName.includes(q) ||
        userRole.toLowerCase().includes(q) ||
        lastMsg.includes(q);

      if (!matchesSearch) return false;

      const status = (conv.status || '').toLowerCase();
      const dealStatus = (conv.dealId?.status || '').toLowerCase();

      if (activeTab === 'active') {
        return status === 'active' || dealStatus === 'active';
      }
      if (activeTab === 'buyer') {
        return userRole === 'BUYER';
      }
      if (activeTab === 'seller') {
        return userRole === 'SELLER';
      }
      return true;
    });
  }, [conversations, searchQuery, activeTab, getDealProductInfo, getUserRole]);

  if (isLoading && conversations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#1541D8" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>
          Loading active sauda chats...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. PREMIUM HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color="#1541D8" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Deal Chats</Text>
          <View style={styles.headerLiveBadge}>
            <View style={styles.headerLiveDot} />
            <Text style={styles.headerSubtitle}>
              {conversations.length} Active {conversations.length === 1 ? 'Sauda' : 'Saudas'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <RotateCw size={18} color="#1541D8" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* ─── 2. SEARCH BAR ─── */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Product, Deal # or Message..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── 3. COLOR-THEMED FILTER TABS ─── */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* 1. All Tab (Royal Blue) */}
          <TouchableOpacity
            style={[styles.filterTabBase, activeTab === 'all' ? styles.tabAllActive : styles.tabAllInactive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'all' ? styles.tabTextWhite : styles.tabAllTextInactive,
              ]}
            >
              All ({conversations.length})
            </Text>
          </TouchableOpacity>

          {/* 2. Active Tab (Emerald Green) */}
          <TouchableOpacity
            style={[styles.filterTabBase, activeTab === 'active' ? styles.tabActiveActive : styles.tabActiveInactive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.filterDot,
                { backgroundColor: activeTab === 'active' ? '#FFFFFF' : '#10B981' },
              ]}
            />
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'active' ? styles.tabTextWhite : styles.tabActiveTextInactive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          {/* 3. Buyer Tab (Sky Blue) */}
          <TouchableOpacity
            style={[styles.filterTabBase, activeTab === 'buyer' ? styles.tabBuyerActive : styles.tabBuyerInactive]}
            onPress={() => setActiveTab('buyer')}
            activeOpacity={0.8}
          >
            <ShoppingBag
              size={13}
              color={activeTab === 'buyer' ? '#FFFFFF' : '#2563EB'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'buyer' ? styles.tabTextWhite : styles.tabBuyerTextInactive,
              ]}
            >
              Buyer
            </Text>
          </TouchableOpacity>

          {/* 4. Seller Tab (Purple/Violet) */}
          <TouchableOpacity
            style={[styles.filterTabBase, activeTab === 'seller' ? styles.tabSellerActive : styles.tabSellerInactive]}
            onPress={() => setActiveTab('seller')}
            activeOpacity={0.8}
          >
            <Store
              size={13}
              color={activeTab === 'seller' ? '#FFFFFF' : '#7C3AED'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.filterTabText,
                activeTab === 'seller' ? styles.tabTextWhite : styles.tabSellerTextInactive,
              ]}
            >
              Seller
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ─── 4. BEAUTIFUL CARD BOXES (WhatsApp Style Content) ─── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1541D8" />
        }
      >
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MessageSquare size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Chats Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No chats match your search criteria. Try another product name or deal number.'
                : 'Conversations will appear once you have deals.'}
            </Text>
          </View>
        ) : (
          filteredConversations.map((conv) => {
            const productInfo = getDealProductInfo(conv);
            const dealNo = conv.dealNumber || conv.dealId?.dealNumber || 'DEAL';
            const userRole = getUserRole(conv);
            const hasMedia = Boolean(
              conv.lastMessage?.media ||
              conv.lastMessage?.mediaUrl ||
              conv.lastMessage?.imageUrl ||
              conv.lastMessage?.image ||
              conv.lastMessage?.type === 'image'
            );
            const rawContent = conv.lastMessage?.content?.trim() || '';
            let lastMsgText = rawContent;
            if (!rawContent && hasMedia) {
              lastMsgText = '📷 Photo';
            } else if (hasMedia && rawContent) {
              lastMsgText = `📷 ${rawContent}`;
            } else if (!rawContent) {
              lastMsgText = 'No messages yet';
            }

            const lastMsgTime = formatMessageTime(conv.lastMessage?.sentAt || conv.updatedAt);
            const unreadCount = conv.unreadCount || 0;
            const productImgUri = getProductImageUri(conv);

            const dealId =
              conv.dealId?._id ||
              conv.dealId?.id ||
              (typeof conv.dealId === 'string' ? conv.dealId : '');
            const matchedDeal = dealsMap[dealId] || dealsMap[dealNo];
            const dealObj =
              matchedDeal ||
              (typeof conv.dealId === 'object'
                ? conv.dealId
                : { _id: dealId, dealNumber: dealNo });

            return (
              <TouchableOpacity
                key={conv._id || conv.id}
                style={styles.chatCard}
                onPress={() =>
                  onNavigate('DealChat', {
                    dealId: dealId || dealObj?._id,
                    conversationId: conv._id || conv.id,
                    dealNumber: dealNo,
                    deal: dealObj,
                  })
                }
                activeOpacity={0.85}
              >
                {/* Left: Product Image Box */}
                <View style={styles.chatAvatarContainer}>
                  <ProductAvatar imageUri={productImgUri} />
                </View>

                {/* Right: Info Box */}
                <View style={styles.chatContent}>
                  {/* Top Line: Product Name + "+1" + Deal # + User Role + Time */}
                  <View style={styles.chatHeaderRow}>
                    <View style={styles.chatTitleBox}>
                      <Text style={styles.chatProductTitle} numberOfLines={1}>
                        {productInfo.productName}
                      </Text>

                      {productInfo.hasMultiple ? (
                        <View style={styles.multipleBadge}>
                          <Text style={styles.multipleBadgeText}>
                            +{productInfo.extraCount}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.dealNumBadge}>
                        <Text style={styles.dealNumText}>#{dealNo}</Text>
                      </View>

                      {userRole ? (
                        <View
                          style={[
                            styles.userRoleBadge,
                            userRole === 'BUYER'
                              ? styles.buyerRoleBadge
                              : styles.sellerRoleBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.userRoleText,
                              userRole === 'BUYER'
                                ? styles.buyerRoleText
                                : styles.sellerRoleText,
                            ]}
                          >
                            {userRole}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.chatTime}>{lastMsgTime}</Text>
                  </View>

                  {/* Bottom Line: Last Message with CheckCheck icon & Unread Badge / Arrow */}
                  <View style={styles.chatPreviewRow}>
                    <View style={styles.chatLastMsgBox}>
                      <CheckCheck size={14} color="#94A3B8" style={{ marginRight: 4 }} />
                      <Text style={styles.chatLastMsg} numberOfLines={1}>
                        {lastMsgText}
                      </Text>
                    </View>

                    {unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                      </View>
                    ) : (
                      <ChevronRight size={16} color="#CBD5E1" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* 1. Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  /* 2. Search Section */
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },

  /* 3. Color-Themed Filter Tabs */
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  filterTabBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  tabTextWhite: {
    color: '#FFFFFF',
  },

  // 1. All Theme (Royal Blue)
  tabAllActive: {
    backgroundColor: '#1541D8',
    borderColor: '#1541D8',
  },
  tabAllInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  tabAllTextInactive: {
    color: '#475569',
  },

  // 2. Active Theme (Emerald Green)
  tabActiveActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tabActiveInactive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  tabActiveTextInactive: {
    color: '#059669',
  },

  // 3. Buyer Theme (Sky / Vivid Blue)
  tabBuyerActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tabBuyerInactive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  tabBuyerTextInactive: {
    color: '#1D4ED8',
  },

  // 4. Seller Theme (Purple / Violet)
  tabSellerActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  tabSellerInactive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  tabSellerTextInactive: {
    color: '#6D28D9',
  },

  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* 4. Chat Card Box (Proper Card Styling) */
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  chatAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  chatAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatProductImage: {
    width: 56,
    height: 56,
    borderRadius: 13,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    flex: 1,
    marginRight: 8,
  },
  chatProductTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  multipleBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: 6,
  },
  multipleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  dealNumBadge: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 6,
  },
  dealNumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  userRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 6,
  },
  buyerRoleBadge: {
    backgroundColor: '#DBEAFE',
  },
  buyerRoleText: {
    color: '#1E40AF',
    fontSize: 9,
    fontWeight: '800',
  },
  sellerRoleBadge: {
    backgroundColor: '#DCFCE7',
  },
  sellerRoleText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '800',
  },
  chatTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  chatPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMsgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  chatLastMsg: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#25D366', // WhatsApp signature green
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ChatList;
