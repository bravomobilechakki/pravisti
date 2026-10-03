import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  FileText,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  Check,
  X,
  User,
  Flag,
  RefreshCw,
} from 'lucide-react-native';
import {
  getProductionDemands,
  raiseProductionDemand,
  reviewProductionDemand,
  getProductionMaterials,
  getProjects,
} from '../../../services/api';

const THEME = '#2327D8';

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const MaterialDemandsPage = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const initialCompany = params.company || null;
  const initialCompanyId = params.companyId || initialCompany?._id || null;

  const [company, setCompany] = useState(initialCompany);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [demands, setDemands] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [reviewingDemand, setReviewingDemand] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Raise Form State
  const [raiseMatId, setRaiseMatId] = useState('');
  const [raiseProjectId, setRaiseProjectId] = useState('');
  const [raiseQty, setRaiseQty] = useState('');
  const [raiseReason, setRaiseReason] = useState('');

  // Review Form State
  const [reviewAction, setReviewAction] = useState('APPROVE'); // 'APPROVE' | 'REJECT' | 'PARTIALLY_APPROVE'
  const [approvedQty, setApprovedQty] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleBack = () => {
    if (onBack) onBack();
    else if (onNavigate) onNavigate('pop');
    else if (navigation?.goBack) navigation.goBack();
  };

  // Resolve active companyId
  useEffect(() => {
    let isMounted = true;
    const resolveCompany = async () => {
      if (!companyId) {
        try {
          const cached = await AsyncStorage.getItem('trader_companies_cache');
          if (cached && isMounted) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCompany(parsed[0]);
              setCompanyId(parsed[0]._id || parsed[0].id);
            }
          }
        } catch (e) {}
      }
    };
    resolveCompany();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Fetch Demands from GET /api/production/transactions/demands
  const fetchDemands = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const query = { companyId };
      if (statusFilter !== 'ALL') {
        query.status = statusFilter;
      }

      const [demRes, matRes, projRes] = await Promise.all([
        getProductionDemands(query, token),
        getProductionMaterials({ companyId }, token).catch(() => null),
        getProjects({ companyId, limit: 50 }, token).catch(() => null),
      ]);

      if (demRes?.success && Array.isArray(demRes.data)) {
        setDemands(demRes.data);
      } else if (Array.isArray(demRes?.data?.demands)) {
        setDemands(demRes.data.demands);
      } else if (Array.isArray(demRes?.demands)) {
        setDemands(demRes.demands);
      } else if (Array.isArray(demRes?.data)) {
        setDemands(demRes.data);
      } else {
        setDemands([]);
      }

      if (matRes?.success && Array.isArray(matRes.data)) {
        setMaterials(matRes.data);
      }
      if (projRes?.success && Array.isArray(projRes.data?.projects)) {
        setProjects(projRes.data.projects);
      }
    } catch (err) {
      console.warn('Error fetching demands:', err?.message || err);
      setDemands([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, statusFilter]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  // Filtered Demands
  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchStatus;
      const matName = String(d.materialId?.name || d.materialName || '').toLowerCase();
      const reason = String(d.reason || '').toLowerCase();
      const user = String(d.requestedBy?.name || '').toLowerCase();
      return matchStatus && (matName.includes(q) || reason.includes(q) || user.includes(q));
    });
  }, [demands, statusFilter, searchQuery]);

  // Submit Raise Demand (POST /api/production/transactions/demands)
  const handleRaiseSubmit = async () => {
    if (!raiseMatId) {
      Alert.alert('Required', 'Please select a Raw Material.');
      return;
    }
    if (!raiseQty || Number(raiseQty) <= 0) {
      Alert.alert('Required', 'Please enter a valid requested quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        companyId,
        materialId: raiseMatId,
        projectId: raiseProjectId || undefined,
        requestedQuantity: Number(raiseQty),
        reason: raiseReason.trim() || 'Floor production requirement',
      };

      const res = await raiseProductionDemand(payload, token);
      if (res?.success) {
        Alert.alert('Success', 'Material demand raised successfully!');
        setShowRaiseModal(false);
        setRaiseQty('');
        setRaiseReason('');
        fetchDemands();
      } else {
        Alert.alert('Error', res?.message || 'Failed to raise demand.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Review Demand (PATCH /api/production/transactions/demands/:id/review)
  const handleReviewSubmit = async () => {
    if (!reviewingDemand) return;

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        action: reviewAction,
        ...(reviewAction !== 'REJECT' ? { approvedQuantity: Number(approvedQty || reviewingDemand.requestedQuantity) } : {}),
        ...(reviewAction === 'REJECT' ? { rejectionReason: rejectionReason.trim() || 'Rejected by management' } : {}),
      };

      const res = await reviewProductionDemand(
        reviewingDemand._id || reviewingDemand.id,
        companyId,
        payload,
        token
      );

      if (res?.success) {
        Alert.alert(
          'Success',
          `Material demand ${reviewAction.toLowerCase()} successfully!`
        );
        setReviewingDemand(null);
        fetchDemands();
      } else {
        Alert.alert('Error', res?.message || 'Review failed.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Review failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeConfig = (status = '') => {
    switch (String(status).toUpperCase()) {
      case 'APPROVED':
        return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', label: 'Approved' };
      case 'REJECTED':
        return { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA', label: 'Rejected' };
      case 'PARTIALLY_APPROVED':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'Partially Approved' };
      default:
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', label: 'Pending Review' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* App Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {company?.name || company?.companyName || 'Floor Demands'}
          </Text>
          <Text style={styles.headerTitle}>Material Demands</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchDemands(true)} activeOpacity={0.7}>
          <RefreshCw size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {STATUS_FILTERS.map((f) => {
          const isSelected = statusFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterTab, isSelected && styles.filterTabActive]}
              onPress={() => setStatusFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by material, requester, or reason..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Demands List */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDemands(true)} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading demands...</Text>
          </View>
        ) : filteredDemands.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <FileText size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Material Demands</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No matching demands found for this search.'
                : 'Floor workers and supervisors can raise material shortages here.'}
            </Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowRaiseModal(true)}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyCreateBtnText}>Raise Material Demand</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredDemands.map((item) => {
            const id = item._id || item.id;
            const matName = item.materialId?.name || item.materialName || 'Raw Material';
            const matUnit = item.materialId?.unit || item.unit || 'Kg';
            const reqQty = item.requestedQuantity || 0;
            const appQty = item.approvedQuantity !== undefined ? item.approvedQuantity : 0;
            const statusCfg = getStatusBadgeConfig(item.status);
            const requester = item.requestedBy?.name || 'Floor Worker';
            const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';

            return (
              <View key={id} style={styles.demandCard}>
                <View style={styles.demandHeader}>
                  <View style={styles.matIconWrap}>
                    <Layers size={18} color="#2563EB" />
                  </View>
                  <View style={styles.demandHeaderInfo}>
                    <Text style={styles.demandMatName}>{matName}</Text>
                    <Text style={styles.demandDateText}>
                      Requested on {dateStr || 'Today'} • By {requester}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>

                {/* Quantities Row */}
                <View style={styles.qtyBoxRow}>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>Requested</Text>
                    <Text style={styles.qtyValue}>{reqQty} {matUnit}</Text>
                  </View>
                  <View style={[styles.qtyBox, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={[styles.qtyLabel, { color: '#16A34A' }]}>Approved</Text>
                    <Text style={[styles.qtyValue, { color: '#15803D' }]}>
                      {item.status === 'APPROVED' ? appQty : item.status === 'PENDING' ? '--' : '0'} {matUnit}
                    </Text>
                  </View>
                </View>

                {item.reason ? (
                  <Text style={styles.demandReason} numberOfLines={2}>
                    Reason: {item.reason}
                  </Text>
                ) : null}

                {/* Action for PENDING demands */}
                {item.status === 'PENDING' && (
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => {
                        setReviewingDemand(item);
                        setApprovedQty(String(reqQty));
                        setReviewAction('APPROVE');
                      }}
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={15} color="#FFFFFF" />
                      <Text style={styles.reviewBtnText}>Review / Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── RAISE DEMAND MODAL ─── */}
      <Modal
        visible={showRaiseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRaiseModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowRaiseModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <FileText size={20} color="#2563EB" />
                <Text style={styles.modalTitle}>Raise Material Demand</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRaiseModal(false)} style={styles.modalCloseBtn}>
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Select Raw Material */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Raw Material *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  {materials.map((m) => {
                    const mId = m._id || m.id;
                    const isSel = raiseMatId === mId;
                    return (
                      <TouchableOpacity
                        key={mId}
                        style={[styles.pickerChip, isSel && styles.pickerChipActive]}
                        onPress={() => setRaiseMatId(mId)}
                      >
                        <Text style={[styles.pickerChipText, isSel && styles.pickerChipTextActive]}>
                          {m.name || m.materialName} ({m.unit || 'Kg'})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Quantity */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Requested Quantity *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 150"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={raiseQty}
                  onChangeText={setRaiseQty}
                />
              </View>

              {/* Project Link */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Link Project (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  {projects.map((p) => {
                    const pId = p._id || p.id;
                    const isSel = raiseProjectId === pId;
                    return (
                      <TouchableOpacity
                        key={pId}
                        style={[styles.pickerChip, isSel && styles.pickerChipActive]}
                        onPress={() => setRaiseProjectId(isSel ? '' : pId)}
                      >
                        <Text style={[styles.pickerChipText, isSel && styles.pickerChipTextActive]}>
                          {p.title || p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Reason */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason / Shortage Details</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Explain why additional material is needed..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={raiseReason}
                  onChangeText={setRaiseReason}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRaiseModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
                onPress={handleRaiseSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Submit Demand</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── REVIEW DEMAND MODAL ─── */}
      <Modal
        visible={reviewingDemand !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewingDemand(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setReviewingDemand(null)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <CheckCircle2 size={20} color="#2563EB" />
                <Text style={styles.modalTitle}>Review Material Demand</Text>
              </View>
              <TouchableOpacity onPress={() => setReviewingDemand(null)} style={styles.modalCloseBtn}>
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Action Switcher */}
              <View style={styles.actionToggleRow}>
                <TouchableOpacity
                  style={[styles.toggleOption, reviewAction === 'APPROVE' && styles.toggleApprove]}
                  onPress={() => setReviewAction('APPROVE')}
                >
                  <Text style={[styles.toggleText, reviewAction === 'APPROVE' && styles.toggleTextActive]}>
                    Approve
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, reviewAction === 'REJECT' && styles.toggleReject]}
                  onPress={() => setReviewAction('REJECT')}
                >
                  <Text style={[styles.toggleText, reviewAction === 'REJECT' && styles.toggleTextActive]}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>

              {reviewAction === 'APPROVE' ? (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Approved Quantity</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Approved Quantity"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={approvedQty}
                    onChangeText={setApprovedQty}
                  />
                </View>
              ) : (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Rejection Reason</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    placeholder="Reason for rejecting demand..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setReviewingDemand(null)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  reviewAction === 'REJECT' && { backgroundColor: '#EF4444' },
                  submitting && styles.btnDisabled,
                ]}
                onPress={handleReviewSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>
                      {reviewAction === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                    </Text>
                  </>
                )}
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
  appHeader: {
    backgroundColor: THEME,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
    marginBottom: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  demandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demandHeaderInfo: {
    flex: 1,
  },
  demandMatName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  demandDateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  qtyBoxRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  qtyBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qtyLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  qtyValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  demandReason: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
    lineHeight: 16,
  },
  cardActionsRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 8,
  },
  reviewBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  formScroll: {
    marginTop: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  formTextArea: {
    height: 72,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  pickerScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  pickerChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  pickerChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  pickerChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  actionToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  toggleApprove: {
    backgroundColor: '#2563EB',
  },
  toggleReject: {
    backgroundColor: '#EF4444',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default MaterialDemandsPage;
