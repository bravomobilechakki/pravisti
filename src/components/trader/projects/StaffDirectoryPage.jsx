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
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Phone,
  Briefcase,
  UserPlus,
  RefreshCw,
  Mail,
  ChevronRight,
  ShieldCheck,
  Award,
  IndianRupee,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react-native';
import {
  getProductionStaffMembers,
  productionStaffOnboard,
  updateProductionStaffMember,
  deleteProductionStaffMember,
  assignProductionStaff,
  getProjects,
} from '../../../services/api';

const THEME = '#2327D8';
const BG_COLOR = '#F8FAFC';

const QUICK_ROLES = [
  'Machine Operator',
  'Floor Supervisor',
  'Quality Inspector',
  'Packaging Worker',
  'Maintenance Tech',
  'Helper / Loader',
];

const AVATAR_COLORS = [
  { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
  { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  { bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF' },
  { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
];

const getAvatarStyle = (name = '') => {
  if (!name) return AVATAR_COLORS[0];
  let charCodeSum = 0;
  for (let i = 0; i < name.length; i++) {
    charCodeSum += name.charCodeAt(i);
  }
  return AVATAR_COLORS[charCodeSum % AVATAR_COLORS.length];
};

const StaffDirectoryPage = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const initialCompany = params.company || null;
  const initialCompanyId = params.companyId || initialCompany?._id || initialCompany?.id || null;

  const [company, setCompany] = useState(initialCompany);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [staffList, setStaffList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [assigningStaff, setAssigningStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Onboard / Edit Form State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formRole, setFormRole] = useState('Machine Operator');
  const [formHourlyRate, setFormHourlyRate] = useState('150');
  const [formEmail, setFormEmail] = useState('');
  const [formSkillTags, setFormSkillTags] = useState('');

  // Assignment Form State
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignRole, setAssignRole] = useState('Machine Operator');
  const [assignHours, setAssignHours] = useState('8');

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation?.goBack) return navigation.goBack();
    if (onNavigate) {
      if (company) {
        return onNavigate('ProjectsList', { company, companyId, user: params.user });
      }
      return onNavigate('Dashboard', { user: params.user });
    }
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

  // Fetch Staff Members (GET /api/production/staff/members)
  const fetchStaff = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const effectiveCompId = companyId || company?._id || company?.id;
      const [staffRes, projRes] = await Promise.all([
        getProductionStaffMembers({ companyId: effectiveCompId, search: searchQuery.trim() || undefined }, token),
        getProjects({ companyId: effectiveCompId, limit: 50 }, token).catch(() => null),
      ]);

      if (staffRes?.success && Array.isArray(staffRes.data)) {
        setStaffList(staffRes.data);
      } else if (Array.isArray(staffRes?.data?.members)) {
        setStaffList(staffRes.data.members);
      } else if (Array.isArray(staffRes?.members)) {
        setStaffList(staffRes.members);
      } else if (Array.isArray(staffRes?.data)) {
        setStaffList(staffRes.data);
      } else {
        setStaffList([]);
      }

      if (projRes?.success && Array.isArray(projRes.data?.projects)) {
        setProjectsList(projRes.data.projects);
      } else if (Array.isArray(projRes?.data)) {
        setProjectsList(projRes.data);
      }
    } catch (err) {
      console.warn('Error fetching production staff:', err);
      setStaffList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, company, searchQuery]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Roles list
  const rolesList = useMemo(() => {
    const set = new Set();
    staffList.forEach((s) => {
      if (s.role) set.add(s.role);
    });
    return ['ALL', ...Array.from(set)];
  }, [staffList]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchRole = roleFilter === 'ALL' || s.role === roleFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchRole;
      const name = String(s.name || '').toLowerCase();
      const mob = String(s.mobileNumber || '').toLowerCase();
      const role = String(s.role || '').toLowerCase();
      return matchRole && (name.includes(q) || mob.includes(q) || role.includes(q));
    });
  }, [staffList, roleFilter, searchQuery]);

  // KPIs
  const totalStaffCount = staffList.length;
  const activeCount = staffList.filter((s) => s.status !== 'INACTIVE').length;
  const avgHourlyRate = useMemo(() => {
    if (staffList.length === 0) return 0;
    const sum = staffList.reduce((acc, curr) => acc + (Number(curr.hourlyRate) || 0), 0);
    return Math.round(sum / staffList.length);
  }, [staffList]);

  // Open Onboard Modal
  const openOnboardModal = () => {
    setEditingStaff(null);
    setFormName('');
    setFormMobile('');
    setFormRole('Machine Operator');
    setFormHourlyRate('150');
    setFormEmail('');
    setFormSkillTags('');
    setShowOnboardModal(true);
  };

  // Open Edit Modal
  const openEditModal = (s) => {
    setEditingStaff(s);
    setFormName(s.name || '');
    setFormMobile(s.mobileNumber ? String(s.mobileNumber).replace(/\D/g, '').slice(-10) : '');
    setFormRole(s.role || 'Machine Operator');
    setFormHourlyRate(s.hourlyRate !== undefined ? String(s.hourlyRate) : '150');
    setFormEmail(s.email || '');
    setFormSkillTags(Array.isArray(s.skillTags) ? s.skillTags.join(', ') : s.skillTags || '');
    setShowOnboardModal(true);
  };

  // Call Staff
  const handleCallStaff = (mobile) => {
    if (!mobile) {
      Alert.alert('No Number', 'Mobile number is not available for this staff member.');
      return;
    }
    const cleanNumber = String(mobile).replace(/\D/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  // Save (Onboard / Update) Staff
  const handleSaveStaff = async () => {
    if (!formName.trim()) {
      Alert.alert('Required Field', 'Please enter staff worker full name.');
      return;
    }

    const cleanMobile = formMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      Alert.alert('10-Digit Mobile Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    const effectiveCompanyId = companyId || company?._id || company?.id;
    if (!effectiveCompanyId) {
      Alert.alert('Required', 'Active Company ID not found. Please refresh company.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const tags = formSkillTags
        ? formSkillTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload = {
        companyId: effectiveCompanyId,
        name: formName.trim(),
        mobileNumber: cleanMobile,
        role: formRole.trim() || 'Machine Operator',
        hourlyRate: formHourlyRate ? Number(formHourlyRate) : 150,
        email: formEmail.trim() || undefined,
        skillTags: tags,
        status: 'ACTIVE',
      };

      let res;
      if (editingStaff) {
        res = await updateProductionStaffMember(
          editingStaff._id || editingStaff.id,
          effectiveCompanyId,
          payload,
          token
        );
      } else {
        res = await productionStaffOnboard(payload, token);
      }

      if (res?.success) {
        setShowOnboardModal(false);
        setFormName('');
        setFormMobile('');
        setFormSkillTags('');
        setEditingStaff(null);
        if (res?.data && !editingStaff) {
          setStaffList((prev) => [res.data, ...prev.filter((p) => (p._id || p.id) !== (res.data._id || res.data.id))]);
        }
        fetchStaff(true);
      } else {
        Alert.alert('Error', res?.message || 'Failed to save staff member.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Staff
  const handleDeleteStaff = (s) => {
    Alert.alert(
      'Remove Staff Member',
      `Are you sure you want to remove "${s.name || 'this worker'}" from the staff directory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const effectiveCompId = companyId || company?._id || company?.id;
              const res = await deleteProductionStaffMember(s._id || s.id, effectiveCompId, token);
              if (res?.success) {
                fetchStaff();
              } else {
                Alert.alert('Error', res?.message || 'Failed to remove staff.');
              }
            } catch (e) {
              Alert.alert('Error', e?.message || 'Delete failed.');
            }
          },
        },
      ]
    );
  };

  // Assign Staff Submit (POST /api/production/staff-assignments)
  const handleAssignSubmit = async () => {
    if (!assigningStaff) return;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const effectiveCompId = companyId || company?._id || company?.id;
      const payload = {
        companyId: effectiveCompId,
        staffId: assigningStaff._id || assigningStaff.id,
        projectId: assignProjectId || undefined,
        roleInStage: assignRole || assigningStaff.role || 'Operator',
        assignedHours: Number(assignHours || 8),
        status: 'ASSIGNED',
      };

      const res = await assignProductionStaff(payload, token);
      if (res?.success) {
        Alert.alert('Success', `Assigned ${assigningStaff.name} to project successfully!`);
        setAssigningStaff(null);
      } else {
        Alert.alert('Error', res?.message || 'Assignment failed.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const targetCompanyName = company?.name || company?.companyName || 'Staff Directory';
  const isMobileValid = formMobile.length === 10 && /^[6-9]\d{9}$/.test(formMobile);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* ─── APP HEADER ─── */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {targetCompanyName}
          </Text>
          <Text style={styles.headerTitle}>Staff & Workforce</Text>
        </View>
        <TouchableOpacity style={styles.headerActionBtn} onPress={() => fetchStaff(true)} activeOpacity={0.7}>
          <RefreshCw size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchStaff(true)} colors={[THEME]} />
        }
      >
        {/* ─── TOP KPI SUMMARY CARDS ─── */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Users size={18} color={THEME} />
            </View>
            <Text style={styles.kpiValue}>{totalStaffCount}</Text>
            <Text style={styles.kpiLabel}>Total Workers</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={18} color="#059669" />
            </View>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>{activeCount}</Text>
            <Text style={styles.kpiLabel}>Active Floor</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <IndianRupee size={18} color="#D97706" />
            </View>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>₹{avgHourlyRate}</Text>
            <Text style={styles.kpiLabel}>Avg Rate / hr</Text>
          </View>
        </View>

        {/* ─── QUICK SEARCH & ONBOARD BAR ─── */}
        <View style={styles.searchActionBar}>
          <View style={styles.searchBar}>
            <Search size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search staff members..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.onboardBtn} onPress={openOnboardModal} activeOpacity={0.85}>
            <UserPlus size={16} color="#FFFFFF" />
            <Text style={styles.onboardBtnText}>Onboard</Text>
          </TouchableOpacity>
        </View>

        {/* ─── ROLE FILTER PILLS ─── */}
        {rolesList.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleFilterScroll}
          >
            {rolesList.map((role) => {
              const isSelected = roleFilter === role;
              const count = role === 'ALL'
                ? staffList.length
                : staffList.filter((s) => s.role === role).length;
              return (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleFilterChip, isSelected && styles.roleFilterChipActive]}
                  onPress={() => setRoleFilter(role)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleFilterText, isSelected && styles.roleFilterTextActive]}>
                    {role === 'ALL' ? 'All Roles' : role}
                  </Text>
                  <View style={[styles.roleCountBadge, isSelected && styles.roleCountBadgeActive]}>
                    <Text style={[styles.roleCountText, isSelected && styles.roleCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ─── STAFF LIST / CARDS ─── */}
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME} />
            <Text style={styles.loadingText}>Loading workforce directory...</Text>
          </View>
        ) : filteredStaff.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Users size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No matching staff members' : 'No Staff Members Registered'}
            </Text>
            <Text style={styles.emptyStateDesc}>
              {searchQuery
                ? 'Try searching with a different name, role, or contact number.'
                : 'Onboard machine operators, quality inspectors, and floor supervisors to assign them to production stages.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyOnboardBtn} onPress={openOnboardModal} activeOpacity={0.85}>
                <UserPlus size={16} color="#FFFFFF" />
                <Text style={styles.emptyOnboardBtnText}>Onboard First Worker</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredStaff.map((s) => {
            const id = s._id || s.id;
            const name = s.name || 'Staff Member';
            const role = s.role || 'Machine Operator';
            const rate = s.hourlyRate !== undefined ? s.hourlyRate : 150;
            const mobile = s.mobileNumber || '';
            const email = s.email || '';
            const tags = Array.isArray(s.skillTags) ? s.skillTags : [];
            const isActive = s.status !== 'INACTIVE';
            const avatarStyle = getAvatarStyle(name);

            return (
              <View key={id} style={styles.staffCard}>
                {/* Card Top: Avatar + Info + Badges */}
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.avatarBox,
                      {
                        backgroundColor: avatarStyle.bg,
                        borderColor: avatarStyle.border,
                      },
                    ]}
                  >
                    <Text style={[styles.avatarInitial, { color: avatarStyle.text }]}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.cardInfoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.workerName} numberOfLines={1}>
                        {name}
                      </Text>
                      <View style={[styles.statusPill, isActive ? styles.statusActivePill : styles.statusInactivePill]}>
                        <View style={[styles.statusDot, isActive ? styles.statusActiveDot : styles.statusInactiveDot]} />
                        <Text style={[styles.statusPillText, isActive ? styles.statusActivePillText : styles.statusInactivePillText]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.roleWageRow}>
                      <View style={styles.roleTag}>
                        <Award size={11} color={THEME} />
                        <Text style={styles.roleTagText}>{role}</Text>
                      </View>
                      <View style={styles.wageTag}>
                        <IndianRupee size={11} color="#059669" />
                        <Text style={styles.wageTagText}>₹{rate}/hr</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Contact Pills Row */}
                <View style={styles.contactDetailsRow}>
                  {mobile ? (
                    <TouchableOpacity
                      style={styles.contactChip}
                      onPress={() => handleCallStaff(mobile)}
                      activeOpacity={0.7}
                    >
                      <PhoneCall size={12} color="#059669" />
                      <Text style={styles.contactPhoneText}>+91 {mobile}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {email ? (
                    <View style={styles.contactEmailChip}>
                      <Mail size={12} color="#64748B" />
                      <Text style={styles.contactEmailText} numberOfLines={1}>
                        {email}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Skill Tags */}
                {tags.length > 0 && (
                  <View style={styles.skillBadgesWrap}>
                    {tags.map((tag, idx) => (
                      <View key={idx} style={styles.skillBadge}>
                        <Text style={styles.skillBadgeText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Card Action Footer */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.assignStageBtn}
                    onPress={() => {
                      setAssigningStaff(s);
                      setAssignRole(s.role || 'Machine Operator');
                    }}
                    activeOpacity={0.7}
                  >
                    <Briefcase size={13} color={THEME} />
                    <Text style={styles.assignStageBtnText}>Assign Project Stage</Text>
                  </TouchableOpacity>

                  <View style={styles.cardActionsRight}>
                    {mobile ? (
                      <TouchableOpacity
                        style={[styles.miniActionBtn, styles.callActionBtn]}
                        onPress={() => handleCallStaff(mobile)}
                        activeOpacity={0.7}
                      >
                        <Phone size={14} color="#059669" />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.miniActionBtn, styles.editActionBtn]}
                      onPress={() => openEditModal(s)}
                      activeOpacity={0.7}
                    >
                      <Edit3 size={14} color={THEME} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.miniActionBtn, styles.deleteActionBtn]}
                      onPress={() => handleDeleteStaff(s)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── ONBOARD / EDIT STAFF MODAL ─── */}
      <Modal
        visible={showOnboardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOnboardModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowOnboardModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <UserPlus size={18} color={THEME} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {editingStaff ? 'Edit Staff Member' : 'Onboard Factory Staff'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editingStaff ? 'Update role, rates & skills' : 'Add worker to factory directory'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowOnboardModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Worker Full Name <Text style={styles.reqStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* Mobile Number with 10-digit validation */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithCounter}>
                  <Text style={styles.formLabel}>
                    Mobile Number <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <Text style={[styles.digitCounter, isMobileValid ? styles.digitCounterValid : null]}>
                    {formMobile.length}/10 digits
                  </Text>
                </View>

                <View style={[styles.mobileInputWrap, isMobileValid ? styles.mobileInputValid : null]}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.mobileInput}
                    placeholder="Enter mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={10}
                    value={formMobile}
                    onChangeText={(val) => {
                      const clean = val.replace(/\D/g, '').slice(0, 10);
                      setFormMobile(clean);
                    }}
                  />
                  {isMobileValid && (
                    <View style={styles.validCheckIcon}>
                      <CheckCircle2 size={18} color="#16A34A" />
                    </View>
                  )}
                </View>
                {formMobile.length > 0 && formMobile.length < 10 && (
                  <Text style={styles.errorHint}>Enter 10-digit mobile number</Text>
                )}
              </View>

              {/* Quick Role Suggestions */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Assigned Factory Role <Text style={styles.reqStar}>*</Text>
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRolesScroll}>
                  {QUICK_ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.quickRoleChip, formRole === r && styles.quickRoleChipActive]}
                      onPress={() => setFormRole(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickRoleText, formRole === r && styles.quickRoleTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={[styles.formInput, { marginTop: 8 }]}
                  placeholder="Enter role"
                  placeholderTextColor="#94A3B8"
                  value={formRole}
                  onChangeText={setFormRole}
                />
              </View>

              {/* Hourly Rate & Email */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Hourly Rate (₹ / hr)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter hourly rate"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formHourlyRate}
                    onChangeText={setFormHourlyRate}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Email (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter email"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formEmail}
                    onChangeText={setFormEmail}
                  />
                </View>
              </View>

              {/* Skill Tags */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Skills & Capabilities (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter skills"
                  placeholderTextColor="#94A3B8"
                  value={formSkillTags}
                  onChangeText={setFormSkillTags}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowOnboardModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
                onPress={handleSaveStaff}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>
                      {editingStaff ? 'Save Changes' : 'Complete Onboarding'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── ASSIGN TO PROJECT STAGE MODAL ─── */}
      <Modal
        visible={!!assigningStaff}
        transparent
        animationType="slide"
        onRequestClose={() => setAssigningStaff(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setAssigningStaff(null)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Briefcase size={18} color={THEME} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Assign to Production Stage</Text>
                  <Text style={styles.modalSubtitle}>
                    Allocate shift & job role on shop floor
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAssigningStaff(null)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.staffSummaryPill}>
                <Text style={styles.assignStaffSummaryText}>
                  Assigning <Text style={{ fontWeight: '800', color: '#0F172A' }}>{assigningStaff?.name}</Text> ({assigningStaff?.role})
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Production Project</Text>
                {projectsList.length === 0 ? (
                  <Text style={styles.noProjectsNote}>No active projects found. Create a project first.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickProjectsScroll}>
                    {projectsList.map((p) => {
                      const pId = p._id || p.id;
                      const isSel = assignProjectId === pId;
                      return (
                        <TouchableOpacity
                          key={pId}
                          style={[styles.quickProjectChip, isSel && styles.quickProjectChipActive]}
                          onPress={() => setAssignProjectId(pId)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.quickProjectText, isSel && styles.quickProjectTextActive]}>
                            {p.name || p.title || 'Project'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Role in Stage</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter role in stage"
                    placeholderTextColor="#94A3B8"
                    value={assignRole}
                    onChangeText={setAssignRole}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Daily Hours Allocated</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter allocated hours"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={assignHours}
                    onChangeText={setAssignHours}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAssigningStaff(null)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
                onPress={handleAssignSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Confirm Assignment</Text>
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
    backgroundColor: BG_COLOR,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  searchActionBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  onboardBtn: {
    height: 44,
    backgroundColor: THEME,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  onboardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roleFilterScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  roleFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  roleFilterChipActive: {
    backgroundColor: THEME,
    borderColor: THEME,
  },
  roleFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  roleFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  roleCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  roleCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  roleCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  roleCountTextActive: {
    color: '#FFFFFF',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyStateDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyOnboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyOnboardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusActivePill: {
    backgroundColor: '#ECFDF5',
  },
  statusInactivePill: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusActiveDot: {
    backgroundColor: '#10B981',
  },
  statusInactiveDot: {
    backgroundColor: '#94A3B8',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusActivePillText: {
    color: '#059669',
  },
  statusInactivePillText: {
    color: '#64748B',
  },
  roleWageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME,
  },
  wageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
  },
  wageTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  contactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  contactPhoneText: {
    fontSize: 11.5,
    color: '#15803D',
    fontWeight: '700',
  },
  contactEmailChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  contactEmailText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  skillBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  skillBadgeText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  assignStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignStageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME,
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  callActionBtn: {
    backgroundColor: '#DCFCE7',
  },
  editActionBtn: {
    backgroundColor: '#EEF2FF',
  },
  deleteActionBtn: {
    backgroundColor: '#FEF2F2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  labelWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  digitCounter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  digitCounterValid: {
    color: '#16A34A',
    fontWeight: '700',
  },
  errorHint: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  reqStar: {
    color: '#EF4444',
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  mobileInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
    overflow: 'hidden',
  },
  mobileInputValid: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  validCheckIcon: {
    paddingHorizontal: 10,
  },
  countryCodeBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  mobileInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  quickRolesScroll: {
    gap: 6,
    paddingBottom: 2,
  },
  quickRoleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickRoleChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: THEME,
  },
  quickRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  quickRoleTextActive: {
    color: THEME,
    fontWeight: '700',
  },
  staffSummaryPill: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  assignStaffSummaryText: {
    fontSize: 13,
    color: '#64748B',
  },
  noProjectsNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  quickProjectsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  quickProjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickProjectChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: THEME,
  },
  quickProjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  quickProjectTextActive: {
    color: THEME,
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: THEME,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
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

export default StaffDirectoryPage;
