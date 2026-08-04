import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { getCompanies, getUserProfile } from '../../../services/api';
import {
  ArrowLeft,
  Plus,
  Building2,
  Briefcase,
  User,
  Handshake,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Phone,
  FileText,
  TrendingUp,
  Award,
} from 'lucide-react-native';

const MyCompanies = ({ onNavigate }) => {
  const [companies, setCompanies] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await getUserProfile(token);
          if (response && response.success) {
            setCurrentUser(response.data);
          }
        }
      } catch (ue) {
        console.warn('Failed to fetch user profile in MyCompanies:', ue);
      }
    };
    fetchUser();
  }, []);

  const getUserRoleInCompany = (company) => {
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

  const fetchUserCompanies = React.useCallback(async () => {
    try {
      const response = await getCompanies(1, 100);
      if (response && response.success) {
        setCompanies(response.data.companies || []);
      }
    } catch (error) {
      console.warn('Failed to fetch user companies:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUserCompanies();
  }, [fetchUserCompanies]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserCompanies();
  };

  // Dynamic stats
  const activeCount = companies.filter(c => c.status === 'active' || c.isVerified).length;
  const totalDeals = companies.reduce((sum, c) => sum + (c.recentDeals?.length || c.deals || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A56DB" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>My Business Network</Text>
          <Text style={styles.subtitle}>{companies.length} {companies.length === 1 ? 'Company Listed' : 'Companies Listed'}</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtnHeader}
          onPress={() => onNavigate('AddCompany')}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#1A56DB" />
          <Text style={styles.addBtnHeaderText}>Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A56DB" />
          <Text style={styles.loadingText}>Loading your companies...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1A56DB']}
              tintColor="#1A56DB"
            />
          }
        >
          {/* ── Royal Blue Hero Banner ── */}
          <View style={styles.heroBanner}>
            <View style={styles.heroBgCircle1} />
            <View style={styles.heroBgCircle2} />

            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Award size={12} color="#F59E0B" />
                <Text style={styles.heroBadgeText}>VERIFIED TRADER PROFILE</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Manage Your Companies</Text>
            {/* <Text style={styles.heroSubtitle}>
              Create Saudais, link trade accounts & track real-time mandi operations across all registered companies.
            </Text> */}
          </View>

          {/* ── Dynamic Stats Cards Strip ── */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <View style={[styles.statIconBadge, { backgroundColor: '#DBEAFE' }]}>
                <Building2 size={16} color="#1A56DB" />
              </View>
              <View>
                <Text style={[styles.statNumber, { color: '#1A56DB' }]}>{companies.length}</Text>
                <Text style={styles.statLabel}>Total Firms</Text>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <View style={[styles.statIconBadge, { backgroundColor: '#D1FAE5' }]}>
                <ShieldCheck size={16} color="#059669" />
              </View>
              <View>
                <Text style={[styles.statNumber, { color: '#059669' }]}>{activeCount}</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <View style={[styles.statIconBadge, { backgroundColor: '#FDE68A' }]}>
                <TrendingUp size={16} color="#D97706" />
              </View>
              <View>
                <Text style={[styles.statNumber, { color: '#D97706' }]}>{totalDeals}</Text>
                <Text style={styles.statLabel}>Saudas</Text>
              </View>
            </View>
          </View>

          {/* ── Company List Section ── */}
          {companies.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <Building2 size={36} color="#1A56DB" />
              </View>
              <Text style={styles.emptyStateTitle}>No Registered Companies</Text>
              <Text style={styles.emptyStateSubtext}>
                You haven't registered any companies under your profile yet. Add your first business to start trading!
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => onNavigate('AddCompany')}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateButtonText}>Register First Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Premium Company Cards */
            companies.map(item => {
              const gstNumber = item.registrationNumber || item.gstin || 'NOT REGISTERED';
              const contactInfo = item.phone || item.email || 'No contact specified';
              const dealsCount = item.recentDeals?.length || item.deals || 0;
              const userRole = getUserRoleInCompany(item);
              const isOwner = userRole === 'Owner';
              const isVerified = item.isVerified || item.status === 'active';

              return (
                <TouchableOpacity
                  key={item._id || item.id}
                  style={styles.card}
                  activeOpacity={0.88}
                  onPress={() => onNavigate('CompanyDetails', { company: item, user: currentUser })}
                >
                  {/* Left Company Initial Circle */}
                  <View style={styles.companyInitialsBox}>
                    <Text style={styles.companyInitialsText}>
                      {item.name ? item.name.trim().charAt(0).toUpperCase() : 'B'}
                    </Text>
                  </View>

                  {/* Middle Info */}
                  <View style={styles.cardMainInfo}>
                    <View style={styles.companyTitleRow}>
                      <Text style={styles.companyName} numberOfLines={1}>
                        {item.name}
                      </Text>

                      {/* Owner / Employee Badge */}
                      <View style={[
                        styles.roleBadge,
                        {
                          backgroundColor: isOwner ? '#FEF3C7' : '#F1F5F9',
                          borderColor: isOwner ? '#FDE68A' : '#E2E8F0',
                        }
                      ]}>
                        <Text style={[
                          styles.roleBadgeText,
                          { color: isOwner ? '#D97706' : '#475569' }
                        ]}>
                          {userRole}
                        </Text>
                      </View>
                    </View>

                    {/* GST / Registration */}
                    <View style={styles.gstRow}>
                      <FileText size={11} color="#64748B" />
                      <Text style={styles.gstText} numberOfLines={1}>
                        GST/REG: {gstNumber}
                      </Text>
                    </View>

                    {/* Meta Row: Contact info + Deals count */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaCol}>
                        <Phone size={10} color="#64748B" />
                        <Text style={styles.metaText} numberOfLines={1}>{contactInfo}</Text>
                      </View>

                      <View style={styles.metaDot} />

                      <View style={styles.metaCol}>
                        <Handshake size={10} color="#1A56DB" />
                        <Text style={[styles.metaText, { color: '#1A56DB', fontWeight: '700' }]}>
                          {dealsCount} {dealsCount === 1 ? 'Sauda' : 'Saudas'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right Status Dot & Arrow */}
                  <View style={styles.cardRightCol}>
                    <View style={[
                      styles.statusPill,
                      { backgroundColor: isVerified ? '#ECFDF5' : '#FEF3C7', borderColor: isVerified ? '#A7F3D0' : '#FDE68A' }
                    ]}>
                      <View style={[styles.statusDot, { backgroundColor: isVerified ? '#10B981' : '#F59E0B' }]} />
                      <Text style={[styles.statusPillText, { color: isVerified ? '#059669' : '#D97706' }]}>
                        {isVerified ? 'VERIFIED' : 'PENDING'}
                      </Text>
                    </View>

                    <ChevronRight size={18} color="#94A3B8" style={{ marginTop: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Bottom Action CTA */}
          {companies.length > 0 && (
            <TouchableOpacity
              style={styles.bottomCta}
              onPress={() => onNavigate('AddCompany')}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.bottomCtaText}>Register New Business Company</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default MyCompanies;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1A56DB',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnHeaderText: {
    color: '#1A56DB',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── CONTENT ──
  content: {
    padding: 16,
    paddingBottom: 90,
  },

  // ── HERO BANNER ──
  heroBanner: {
    backgroundColor: '#1A56DB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBgCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    top: -60,
    right: -40,
  },
  heroBgCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -30,
    left: -20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },

  // ── STATS STRIP ──
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    gap: 8,
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  // ── COMPANY CARD ──
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  companyInitialsBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  companyInitialsText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A56DB',
  },
  cardMainInfo: {
    flex: 1,
  },
  companyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  gstText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  cardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── BOTTOM CTA ──
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A56DB',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  bottomCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── EMPTY STATE ──
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A56DB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});