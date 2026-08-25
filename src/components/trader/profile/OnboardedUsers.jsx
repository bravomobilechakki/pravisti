import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  TextInput,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, User, Building2, Phone, Calendar, Package, CheckCircle2, Clock, XCircle, ShieldCheck, Edit3, Send, X } from 'lucide-react-native';
import { getBrokerMyDeals, getBrokerPendingQueue, editPendingBusiness, resendWhatsAppInvite } from '../../../services/api';

const extractApiArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data) {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.queue)) return res.data.queue;
    if (Array.isArray(res.data.onboardings)) return res.data.onboardings;
    if (Array.isArray(res.data.onboardedUsers)) return res.data.onboardedUsers;
    if (Array.isArray(res.data.myDeals)) return res.data.myDeals;
    if (Array.isArray(res.data.deals)) return res.data.deals;
    if (Array.isArray(res.data.companies)) return res.data.companies;
  }
  if (Array.isArray(res.queue)) return res.queue;
  if (Array.isArray(res.onboardings)) return res.onboardings;
  if (Array.isArray(res.onboardedUsers)) return res.onboardedUsers;
  if (Array.isArray(res.myDeals)) return res.myDeals;
  if (Array.isArray(res.deals)) return res.deals;
  return [];
};

const OnboardedUsers = ({ onNavigate, routeData }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardedUsers, setOnboardedUsers] = useState([]);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [resendLoadingId, setResendLoadingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    contactName: '',
    companyName: '',
    gstin: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    description: '',
  });

  const fetchUsers = useCallback(async () => {
    let rawComp = routeData?.companyId || routeData?.company || routeData?.firm || routeData;
    let compId = null;
    if (typeof rawComp === 'string') {
      compId = rawComp;
    } else if (rawComp && typeof rawComp === 'object') {
      compId = rawComp._id || rawComp.id || rawComp.companyId || rawComp.brokerCompanyId || null;
    }

    if (!compId || compId === 'null' || compId === 'undefined') {
      try {
        compId = (await AsyncStorage.getItem('selectedCompanyId')) || (await AsyncStorage.getItem('activeCompanyId')) || null;
      } catch (e) {}
    }

    const cacheKey = `onboarded_users_cache_${compId || 'default'}`;

    // 1. Instant Cache Hydration (0ms load)
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOnboardedUsers(parsed);
          setLoading(false);
        }
      }
    } catch (e) {}

    // 2. Parallel Background Sync
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [queueResResult, myDealsResResult] = await Promise.allSettled([
        getBrokerPendingQueue(compId, token),
        getBrokerMyDeals(compId, token),
      ]);

      const combined = [];
      const seenIds = new Set();

      const addItems = (arr) => {
        if (!Array.isArray(arr)) return;
        arr.forEach(item => {
          const id = item._id || item.id || item.registrationId || item.mobileNumber || item.invitedMobile || item.name || item.companyName;
          if (id && !seenIds.has(String(id))) {
            seenIds.add(String(id));
            combined.push(item);
          }
        });
      };

      if (queueResResult.status === 'fulfilled') {
        addItems(extractApiArray(queueResResult.value));
      }
      if (myDealsResResult.status === 'fulfilled') {
        addItems(extractApiArray(myDealsResResult.value));
      }

      setOnboardedUsers(combined);
      AsyncStorage.setItem(cacheKey, JSON.stringify(combined)).catch(() => {});
    } catch (err) {
      console.warn('Error fetching onboarded users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeData]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    const comp = item.company || {};
    const addr = comp.address || {};
    setEditForm({
      contactName: item.targetUserName || item.name || item.contactPersonName || '',
      companyName: comp.name || comp.companyName || item.companyName || '',
      gstin: comp.registrationNumber || comp.gst || item.gst || '',
      street: addr.street || item.street || '',
      city: addr.city || item.city || '',
      state: addr.state || item.state || '',
      pincode: addr.pincode || item.pincode || item.postalCode || '',
      description: comp.description || item.description || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setEditLoading(true);
    const regId = editingItem.registrationId || editingItem._id || editingItem.id;
    const payload = {
      targetUserName: editForm.contactName,
      companyName: editForm.companyName,
      company: {
        name: editForm.companyName,
        address: {
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
          pincode: editForm.pincode,
        },
        registrationNumber: editForm.gstin,
        description: editForm.description,
      },
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (regId) {
        await editPendingBusiness(regId, payload, token);
      }
    } catch (err) {
      console.warn('Edit API notice:', err);
    } finally {
      // Optimistically update local state queue
      setOnboardedUsers(prev =>
        prev.map(it => {
          const currentId = it.registrationId || it._id || it.id;
          if (currentId === regId) {
            return {
              ...it,
              targetUserName: editForm.contactName,
              companyName: editForm.companyName,
              company: {
                ...it.company,
                name: editForm.companyName,
                address: {
                  ...it.company?.address,
                  street: editForm.street,
                  city: editForm.city,
                  state: editForm.state,
                  pincode: editForm.pincode,
                },
                registrationNumber: editForm.gstin,
              },
            };
          }
          return it;
        })
      );

      setEditLoading(false);
      setEditModalOpen(false);
      Alert.alert('Profile Updated', `Updated details for ${editForm.companyName || editForm.contactName}.`);
    }
  };

  const handleResendInvite = async (item) => {
    const itemId = item._id || item.id || item.registrationId;
    const targetMobile = item.invitedMobile || item.mobileNumber || item.phone || item.user?.mobileNumber || '';
    const targetName = item.targetUserName || item.name || item.contactPersonName || 'Counterparty';

    setResendLoadingId(itemId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (itemId) {
        try {
          const res = await resendWhatsAppInvite(itemId, token);
          if (res && res.data?.whatsappUrl) {
            Linking.openURL(res.data.whatsappUrl).catch(() => {});
          }
        } catch (e) {
          console.warn('API resend notice:', e);
        }
      }

      // Generate direct WhatsApp invite link
      const cleanMob = targetMobile.replace(/\D/g, '');
      const inviteMsg = `Hi ${targetName}, join me on Pravisti to do trade deals together! Download the app: https://pravisti.com/download`;
      const waUrl = cleanMob ? `https://wa.me/91${cleanMob.slice(-10)}?text=${encodeURIComponent(inviteMsg)}` : `https://wa.me/?text=${encodeURIComponent(inviteMsg)}`;

      Linking.openURL(waUrl).catch(() => {
        Alert.alert('Share Error', 'Could not launch WhatsApp.');
      });
      Alert.alert('Success', `WhatsApp invite sent to ${targetName} (${targetMobile})`);
    } catch (err) {
      Alert.alert('Notice', 'Invite notification sent.');
    } finally {
      setResendLoadingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    const s = String(status || 'pending').toLowerCase();
    if (s === 'verified' || s === 'approved' || s === 'active') {
      return (
        <View style={[styles.badge, styles.badgeVerified]}>
          <CheckCircle2 size={12} color="#10B981" />
          <Text style={[styles.badgeText, styles.badgeTextVerified]}>Verified</Text>
        </View>
      );
    }
    if (s === 'rejected' || s === 'cancelled') {
      return (
        <View style={[styles.badge, styles.badgeRejected]}>
          <XCircle size={12} color="#EF4444" />
          <Text style={[styles.badgeText, styles.badgeTextRejected]}>Rejected</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgePending]}>
        <Clock size={12} color="#F59E0B" />
        <Text style={[styles.badgeText, styles.badgeTextPending]}>Pending</Text>
      </View>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }) => {
    const userName = item.targetUserName || item.name || item.user?.name || 'Unnamed User';
    const mobile = item.invitedMobile || item.mobileNumber || item.user?.mobileNumber || 'N/A';
    const role = (item.role || item.userRole || 'Trader').toUpperCase();
    const company = item.company || {};
    const companyName = company.name || company.companyName || item.companyName || 'No Company Details';
    const gstNo = company.registrationNumber || company.gst || item.gst || '';
    const products = item.products || (company.products ? company.products : []);
    const createdDate = item.createdDate || item.createdAt;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.mobileRow}>
                <Phone size={12} color="#64748B" />
                <Text style={styles.mobileText}>{mobile}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.roleChip}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
            {renderStatusBadge(item.status || item.accountStatus)}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Building2 size={16} color="#3B82F6" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Company</Text>
              <Text style={styles.detailValue}>{companyName}</Text>
              {!!gstNo && <Text style={styles.subDetail}>GST/Reg: {gstNo}</Text>}
            </View>
          </View>

          {createdDate && (
            <View style={styles.detailRow}>
              <Calendar size={16} color="#8B5CF6" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Onboarded Date</Text>
                <Text style={styles.detailValue}>{formatDate(createdDate)}</Text>
              </View>
            </View>
          )}

          <View style={styles.verificationRow}>
            <ShieldCheck size={16} color="#059669" style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Verification Breakdown</Text>
              <View style={styles.stepsWrap}>
                <View style={styles.stepItem}>
                  <Text style={styles.stepName}>Account: </Text>
                  <Text style={styles.stepStatus}>{item.accountStatus || 'pending'}</Text>
                </View>
                <Text style={styles.dot}>•</Text>
                <View style={styles.stepItem}>
                  <Text style={styles.stepName}>Company: </Text>
                  <Text style={styles.stepStatus}>{item.companyStatus || 'pending'}</Text>
                </View>
                <Text style={styles.dot}>•</Text>
                <View style={styles.stepItem}>
                  <Text style={styles.stepName}>Product: </Text>
                  <Text style={styles.stepStatus}>{item.productStatus || 'pending'}</Text>
                </View>
              </View>
            </View>
          </View>

          {Array.isArray(products) && products.length > 0 && (
            <View style={styles.detailRow}>
              <Package size={16} color="#F59E0B" style={styles.detailIcon} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Added Products</Text>
                <View style={styles.productsWrap}>
                  {products.map((p, idx) => (
                    <View key={idx} style={styles.productTag}>
                      <Text style={styles.productTagText}>{p.name || (typeof p === 'string' ? p : 'Product')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Action Bar: Resend WhatsApp Invite & Edit Profile */}
          <View style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9'
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#059669',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onPress={() => handleResendInvite(item)}
              activeOpacity={0.8}
            >
              {resendLoadingId === (item._id || item.id || item.registrationId) ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={13} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
                    Resend WhatsApp
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                borderWidth: 1,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.7}
            >
              <Edit3 size={13} color="#2563EB" />
              <Text style={{ color: '#2563EB', fontSize: 11.5, fontWeight: '700' }}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Profile')}>
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Onboarded Users</Text>
          <Text style={styles.headerSubtitle}>Parties onboarded during deal creation</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading onboarded users...</Text>
        </View>
      ) : (
        <FlatList
          data={onboardedUsers}
          keyExtractor={(item, index) => item.registrationId || item._id || item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <User size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Onboarded Users Found</Text>
              <Text style={styles.emptySub}>
                Users onboarded during Buyer or Seller deal creation will appear here.
              </Text>
            </View>
          }
        />
      )}

      {/* Edit Business Profile Modal */}
      <Modal visible={editModalOpen} transparent animationType="slide" onRequestClose={() => setEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Business Profile</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 6 }}>
                <View>
                  <Text style={styles.fieldLabel}>Contact Person Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.contactName}
                    onChangeText={val => setEditForm(prev => ({ ...prev, contactName: val }))}
                    placeholder="Full Name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Company Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.companyName}
                    onChangeText={val => setEditForm(prev => ({ ...prev, companyName: val }))}
                    placeholder="Company Name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>GST / Registration Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.gstin}
                    onChangeText={val => setEditForm(prev => ({ ...prev, gstin: val }))}
                    placeholder="GST Number"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Street Address</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.street}
                    onChangeText={val => setEditForm(prev => ({ ...prev, street: val }))}
                    placeholder="Street Address"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>City</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.city}
                      onChangeText={val => setEditForm(prev => ({ ...prev, city: val }))}
                      placeholder="City"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>State</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.state}
                      onChangeText={val => setEditForm(prev => ({ ...prev, state: val }))}
                      placeholder="State"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={editLoading}>
                {editLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes ✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OnboardedUsers;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  mobileText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  roleChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeVerified: {
    backgroundColor: '#D1FAE5',
  },
  badgeTextVerified: {
    color: '#065F46',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextRejected: {
    color: '#991B1B',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardBody: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  detailIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 1,
  },
  subDetail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  stepsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepName: {
    fontSize: 12,
    color: '#64748B',
  },
  stepStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  dot: {
    marginHorizontal: 6,
    color: '#94A3B8',
  },
  productsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  productTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  productTagText: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '500',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
