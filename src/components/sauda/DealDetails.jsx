import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDealDetails, acceptDeal, rejectDeal, updateDealStatus } from '../../services/api';

const DealDetails = ({ onNavigate, routeData }) => {
  const [isLoading, setIsLoading] = React.useState(!routeData?.deal);
  const [deal, setDeal] = React.useState(routeData?.deal || null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchDealDetails = React.useCallback(async () => {
    const id = routeData?.dealId || routeData?.deal?._id;
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await getDealDetails(id, token);
      if (response && response.success) {
        setDeal(response.data);
      }
    } catch (error) {
      console.error('Error fetching deal details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [routeData]);

  React.useEffect(() => {
    fetchDealDetails();
  }, [fetchDealDetails]);

  const handleAcceptDeal = async () => {
    setIsUpdating(true);
    try {
      const id = deal?._id || routeData?.dealId;
      const token = await AsyncStorage.getItem('userToken');
      const response = await acceptDeal(id, token);
      if (response && response.success) {
        Alert.alert('Success', 'Deal accepted successfully');
        fetchDealDetails();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to accept deal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectDeal = async () => {
    Alert.alert(
      'Reject Deal',
      'Are you sure you want to reject this deal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const id = deal?._id || routeData?.dealId;
              const token = await AsyncStorage.getItem('userToken');
              const response = await rejectDeal(id, 'Deal terms not acceptable', token);
              if (response && response.success) {
                Alert.alert('Success', 'Deal rejected successfully');
                fetchDealDetails();
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to reject deal');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleCompleteDeal = async () => {
    setIsUpdating(true);
    try {
      const id = deal?._id || routeData?.dealId;
      const token = await AsyncStorage.getItem('userToken');
      const response = await updateDealStatus(id, 'completed', token);
      if (response && response.success) {
        Alert.alert('Success', 'Deal completed successfully');
        fetchDealDetails();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to complete deal');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Deal not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('DealsList')}>
          <Text style={styles.backBtnText}>Back to list</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isExpired = deal.status === 'expired';
  const isPending = deal.status === 'pending';
  const isActive = deal.status === 'active';

  const firstProd = deal.products?.[0] || deal.product || {};
  const productName = firstProd.productId?.name || firstProd.name || (typeof firstProd === 'string' ? firstProd : '') || 'Unknown Product';
  const qty = firstProd.quantity || deal.qty || 'N/A';
  const price = firstProd.price || deal.price || 'N/A';
  const totalVal = deal.totalAmount || firstProd.totalAmount || (qty !== 'N/A' && price !== 'N/A' ? Number(qty) * Number(price) : deal.price || 'N/A');
  const dealDateDisplay = deal.dealDate ? new Date(deal.dealDate).toLocaleDateString() : 'N/A';
  const validityDateDisplay = deal.validityDate ? new Date(deal.validityDate).toLocaleDateString() : 'N/A';

  const sellerName = deal.sellerCompany?.name || deal.sellerCompanyId?.companyName || deal.sellerCompanyId?.name || deal.party1?.company?.name || deal.party1?.companyId?.name || deal.party1?.name || 'Seller';
  const buyerName = deal.buyerCompany?.name || deal.buyerCompanyId?.companyName || deal.buyerCompanyId?.name || deal.party2?.company?.name || deal.party2?.companyId?.name || deal.party2?.name || 'Buyer';

  const getInitials = (name) => {
    return name
      ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
      : '??';
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return { label: 'Active Trade', bgColor: '#E6F4EA', textColor: '#137333', dotColor: '#34A853' };
      case 'pending':
        return { label: 'Pending Approval', bgColor: '#FEF7E0', textColor: '#B06000', dotColor: '#FBBC04' };
      case 'completed':
        return { label: 'Completed', bgColor: '#E8F0FE', textColor: '#1A73E8', dotColor: '#4285F4' };
      case 'cancelled':
      case 'rejected':
        return { label: 'Rejected', bgColor: '#FCE8E6', textColor: '#C5221F', dotColor: '#EA4335' };
      default:
        return { label: status?.toUpperCase() || 'EXPIRED', bgColor: '#F1F5F9', textColor: '#475569', dotColor: '#94A3B8' };
    }
  };

  const statusCfg = getStatusConfig(deal.status);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 🖼️ HERO COVER & BANNER */}
      <View style={styles.heroContainer}>
        <Image
          source={
            deal.image
              ? deal.image
              : {
                uri: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc',
              }
          }
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />

        {/* TOP FLOAT HEADER */}
        <View style={styles.headerTopBar}>
          <TouchableOpacity
            style={styles.floatingRoundBtn}
            onPress={() => onNavigate('pop')}
          >
            <Text style={styles.backArrowText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.floatingStatusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bgColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusCfg.dotColor }]} />
              <Text style={[styles.statusText, { color: statusCfg.textColor }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroTitleBlock}>
          <Text style={styles.heroTitle}>{productName}</Text>
          <Text style={styles.heroSubtitle}>
            Agreement #{deal.dealNumber || deal._id?.slice(-6)}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 📊 STATS DASHBOARD GRID */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconBadge}>
              <Text style={{ fontSize: 16 }}>💰</Text>
            </View>
            <Text style={styles.statValue}>₹{totalVal}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#EEF2FF' }]}>
              <Text style={{ fontSize: 16 }}>📦</Text>
            </View>
            <Text style={[styles.statValue, { color: '#4F46E5' }]}>{qty}</Text>
            <Text style={styles.statLabel}>Quantity</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#ECFDF5' }]}>
              <Text style={{ fontSize: 16 }}>📅</Text>
            </View>
            <Text style={styles.statValueSmall}>{dealDateDisplay}</Text>
            <Text style={styles.statLabel}>Agreement Date</Text>
          </View>
        </View>

        {/* 👥 THE PARTIES LANE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trade Counterparties</Text>

          <View style={styles.premiumTradeLane}>
            {/* Seller */}
            <View style={styles.tradeLaneSide}>
              <View style={[styles.avatarCircle, { backgroundColor: '#ECEFFE' }]}>
                <Text style={[styles.avatarText, { color: '#4F46E5' }]}>
                  {getInitials(sellerName)}
                </Text>
              </View>
              <Text style={styles.laneLabel}>SELLER</Text>
              <Text style={styles.laneName} numberOfLines={2}>
                {sellerName}
              </Text>
            </View>

            {/* Visual Arrow Indicator */}
            <View style={styles.laneArrowCol}>
              <Text style={styles.laneArrowText}>→</Text>
              <View style={styles.laneArrowLine} />
            </View>

            {/* Buyer */}
            <View style={styles.tradeLaneSide}>
              <View style={[styles.avatarCircle, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[styles.avatarText, { color: '#EA580C' }]}>
                  {getInitials(buyerName)}
                </Text>
              </View>
              <Text style={styles.laneLabel}>BUYER</Text>
              <Text style={styles.laneName} numberOfLines={2}>
                {buyerName}
              </Text>
            </View>
          </View>

          {deal.broker && (
            <View style={styles.premiumBrokerBanner}>
              <Text style={styles.brokerLabel}>🤝 Facilitated by Broker</Text>
              <Text style={styles.brokerValName}>{deal.broker?.name || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* 📅 CONNECTED TIMELINE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement Journey</Text>

          <View style={styles.timelineContainer}>
            {/* Timeline Row 1 */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineLeftCol}>
                <View style={[styles.timelineNodeDot, { backgroundColor: '#10B981' }]} />
                <View style={styles.timelineVerticalLine} />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.timelineRowTitle}>Contract Created</Text>
                <Text style={styles.timelineRowSubtitle}>
                  Initiated on {dealDateDisplay}
                </Text>
              </View>
            </View>

            {/* Timeline Row 2 */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineLeftCol}>
                <View
                  style={[
                    styles.timelineNodeDot,
                    {
                      backgroundColor:
                        deal.status === 'completed' || isActive ? '#10B981' : '#94A3B8',
                    },
                  ]}
                />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.timelineRowTitle}>
                  {isExpired ? 'Agreement Expired' : 'Agreement Validity'}
                </Text>
                <Text style={styles.timelineRowSubtitle}>
                  Valid until {validityDateDisplay}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ⚡ ACTIONABLE DECISION PANEL */}
        {isPending && (
          <View style={styles.premiumActionPanel}>
            <Text style={styles.actionPanelTitle}>Respond to Trade Invitation</Text>
            <Text style={styles.actionPanelDesc}>
              This trade agreement requires your formal verification to proceed.
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={handleAcceptDeal}
                disabled={isUpdating}
              >
                <Text style={styles.actionBtnText}>Accept Trade</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleRejectDeal}
                disabled={isUpdating}
              >
                <Text style={styles.actionBtnText}>Reject Trade</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isActive && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
            onPress={handleCompleteDeal}
            disabled={isUpdating}
          >
            <Text style={styles.primaryText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, isExpired && { backgroundColor: '#64748B' }]}
          onPress={() =>
            isExpired
              ? onNavigate('CreateDeal', { prefill: deal })
              : onNavigate('DealChat', { dealId: deal._id })
          }
        >
          <Text style={styles.primaryText}>
            {isExpired ? '🔄 Recreate Trade Deal' : '💬 Open Trade Discussion'}
          </Text>
        </TouchableOpacity>

        {/* 🔗 EXTRA SHORTCUT OPTIONS */}
        <View style={styles.shortcutRow}>
          <TouchableOpacity style={styles.shortcutCard}>
            <Text style={styles.shortcutIcon}>📤</Text>
            <Text style={styles.shortcutLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shortcutCard}>
            <Text style={styles.shortcutIcon}>📄</Text>
            <Text style={styles.shortcutLabel}>Invoice PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shortcutCard}>
            <Text style={styles.shortcutIcon}>✏️</Text>
            <Text style={styles.shortcutLabel}>Edit Terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DealDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* HERO HEADER COVER */
  heroContainer: {
    height: 220,
    position: 'relative',
    backgroundColor: '#000',
  },

  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.75,
  },

  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Sleek dark slate tint
  },

  headerTopBar: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },

  floatingRoundBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  backArrowText: {
    fontSize: 22,
    fontWeight: '300',
    color: '#0F172A',
    marginTop: -3,
  },

  floatingStatusBadgeContainer: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  heroTitleBlock: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  heroSubtitle: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  /* STATS ROW */
  statsRow: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },

  statValueSmall: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },

  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  /* SECTION */
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  /* PREMIUM COUNTERPARTIES */
  premiumTradeLane: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  tradeLaneSide: {
    flex: 4,
    alignItems: 'center',
  },

  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },

  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  laneLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },

  laneName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },

  laneArrowCol: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },

  laneArrowText: {
    fontSize: 16,
    color: '#CBD5E1',
    fontWeight: 'bold',
  },

  laneArrowLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 2,
  },

  premiumBrokerBanner: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brokerLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },

  brokerValName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* TIMELINE JOURNEY */
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  timelineRow: {
    flexDirection: 'row',
  },

  timelineLeftCol: {
    width: 24,
    alignItems: 'center',
  },

  timelineNodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },

  timelineVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },

  timelineRightCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },

  timelineRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  timelineRowSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  /* DECISION PANEL & BUTTONS */
  premiumActionPanel: {
    backgroundColor: '#FFFBEB',
    margin: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },

  actionPanelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    textAlign: 'center',
  },

  actionPanelDesc: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 15,
  },

  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },

  actionBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  primaryBtn: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  /* SHORTCUTS ROW */
  shortcutRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },

  shortcutCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  shortcutIcon: {
    fontSize: 16,
    marginBottom: 4,
  },

  shortcutLabel: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '700',
  },

  errorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },

  backBtn: {
    backgroundColor: '#3B82F6',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },

  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});