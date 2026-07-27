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
} from 'lucide-react-native';

const MyCompanies = ({ onNavigate }) => {
  const [companies, setCompanies] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const { getUserProfile } = require('../../../services/api');
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
      setIsLoading(true);
      const response = await getCompanies(1, 100);
      if (response && response.success) {
        setCompanies(response.data.companies || []);
      }
    } catch (error) {
      console.warn('Failed to fetch user companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUserCompanies();
  }, [fetchUserCompanies]);

  // Compute stats dynamically
  const activeCount = companies.filter(c => c.status === 'active' || c.isVerified).length;
  const totalDeals = companies.reduce((sum, c) => sum + (c.recentDeals?.length || c.deals || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('pop')} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>My Companies</Text>
          <Text style={styles.subtitle}>{companies.length} {companies.length === 1 ? 'Business' : 'Businesses'}</Text>
        </View>

        <TouchableOpacity onPress={() => onNavigate('AddCompany')} activeOpacity={0.7}>
          <Plus size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{companies.length}</Text>
              <Text style={styles.statText}>Total</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#22C55E' }]}>{activeCount}</Text>
              <Text style={styles.statText}>Active</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{totalDeals}</Text>
              <Text style={styles.statText}>Deals</Text>
            </View>
          </View>

          {companies.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyStateContainer}>
              <View style={{ marginBottom: 16 }}>
                <Building2 size={48} color="#94A3B8" />
              </View>
              <Text style={styles.emptyStateTitle}>No Registered Companies</Text>
              <Text style={styles.emptyStateSubtext}>
                You haven't registered any companies under your profile yet. Add your first business now!
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => onNavigate('AddCompany')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyStateButtonText}>Register Company</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Company Cards */
            companies.map(item => {
              const displayColor = item.color || '#3B82F6';
              const gstNumber = item.registrationNumber || item.gstin || 'Not Registered';
              const contactInfo = item.phone || item.email || 'No contact';
              const dealsCount = item.recentDeals?.length || item.deals || 0;

              return (
                <TouchableOpacity
                  key={item._id || item.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => onNavigate('CompanyDetails', { company: item, user: currentUser })}
                >
                  <View style={[styles.iconBox, { backgroundColor: displayColor + '15' }]}>
                    {item.type === 'trader' ? (
                      <Briefcase size={22} color={displayColor} />
                    ) : (
                      <Building2 size={22} color={displayColor} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={styles.company} numberOfLines={1}>{item.name}</Text>
                      <View style={[
                        styles.roleBadgeCompact,
                        {
                          backgroundColor: getUserRoleInCompany(item) === 'Owner' ? '#EEF2FF' : '#F1F5F9',
                          borderColor: getUserRoleInCompany(item) === 'Owner' ? '#C7D2FE' : '#E2E8F0',
                        }
                      ]}>
                        <Text style={[
                          styles.roleBadgeCompactText,
                          { color: getUserRoleInCompany(item) === 'Owner' ? '#4F46E5' : '#475569' }
                        ]}>
                          {getUserRoleInCompany(item)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.gst} numberOfLines={1}>GST: {gstNumber}</Text>

                    <View style={styles.row}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <User size={11} color="#475569" />
                        <Text style={styles.meta} numberOfLines={1}>{contactInfo}</Text>
                      </View>
                      <Text style={styles.dot}>•</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Handshake size={11} color="#475569" />
                        <Text style={styles.meta}>{dealsCount}</Text>
                      </View>
                    </View>
                  </View>

                  <ChevronRight size={20} color="#94A3B8" />
                </TouchableOpacity>
              );
            })
          )}

          {/* CTA (Only if they already have companies) */}
          {companies.length > 0 && (
            <TouchableOpacity
              style={styles.cta}
              onPress={() => onNavigate('AddCompany')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.ctaText}>Add New Company</Text>
              </View>
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  back: {
    fontSize: 26,
    color: '#0F172A',
  },

  title: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },

  subtitle: {
    color: '#64748B',
    fontSize: 12,
  },

  add: {
    fontSize: 26,
    color: '#3B82F6',
  },

  content: {
    padding: 16,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  statCard: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  statNumber: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },

  statText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  icon: {
    fontSize: 24,
  },

  company: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },

  gst: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },

  row: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },

  meta: {
    color: '#475569',
    fontSize: 12,
  },

  dot: {
    color: '#CBD5E1',
    marginHorizontal: 6,
  },

  arrow: {
    color: '#94A3B8',
    fontSize: 22,
  },

  cta: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 30,
  },

  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },

  emptyStateSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  roleBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    marginLeft: 6,
  },
  roleBadgeCompactText: {
    fontSize: 9,
    fontWeight: '800',
  },
});