import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Box,
  FileText,
  Calendar,
  Flag,
  Clock,
  User,
  Building2,
  ChevronDown,
  CirclePlus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Search,
} from 'lucide-react-native';
import { createProject, getDeals, getCompanies } from '../../../services/api';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Medium', value: 'Medium', color: '#2563EB', bg: '#EFF6FF' },
  { label: 'High', value: 'High', color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Urgent', value: 'Urgent', color: '#EF4444', bg: '#FEF2F2' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  { label: 'Draft', value: 'DRAFT', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  { label: 'On Hold', value: 'ON_HOLD', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
];

const getDealStatusConfig = (rawStatus = '') => {
  const s = String(rawStatus || 'active').trim().toLowerCase();
  if (['completed', 'settled', 'delivered', 'closed'].includes(s)) {
    return { label: 'Completed', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  }
  if (['in progress', 'inprogress', 'pending', 'negotiation', 'processing', 'dispatched'].includes(s)) {
    return { label: 'In Progress', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  }
  if (['draft', 'created'].includes(s)) {
    return { label: 'Draft', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
  }
  if (['cancelled', 'rejected', 'expired'].includes(s)) {
    return { label: 'Cancelled', bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' };
  }
  return { label: 'Active', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
};

const formatDateDisplay = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const CreateProject = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const initialCompany = params.company || null;
  const initialCompanyId = params.companyId || initialCompany?._id || null;
  const initialUser = params.user || null;

  // Project Type: 'INDEPENDENT' or 'DEAL'
  const [projectType, setProjectType] = useState('INDEPENDENT');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Default dates: Today & 14 days later
  const [startDate, setStartDate] = useState(() => new Date());
  const [targetDeliveryDate, setTargetDeliveryDate] = useState(
    () => new Date(Date.now() + 14 * 86400000)
  );

  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('ACTIVE');

  // Company and Manager selection
  const [companiesList, setCompaniesList] = useState(initialCompany ? [initialCompany] : []);
  const [selectedCompany, setSelectedCompany] = useState(initialCompany);
  const [currentUser, setCurrentUser] = useState(initialUser);

  // Deals linking
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Modals state
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'START' | 'TARGET' | null
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(() => new Date());

  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);

  // Load User Profile and Companies
  useEffect(() => {
    let isMounted = true;
    const loadSavedData = async () => {
      try {
        // Load User
        if (!currentUser) {
          const profileStr = await AsyncStorage.getItem('user_completed_profile');
          if (profileStr && isMounted) {
            try {
              const parsed = JSON.parse(profileStr);
              setCurrentUser(parsed);
            } catch (e) {
              // Ignore
            }
          }
        }

        // Load cached companies
        const cachedCompStr = await AsyncStorage.getItem('trader_companies_cache');
        if (cachedCompStr && isMounted) {
          try {
            const parsed = JSON.parse(cachedCompStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCompaniesList(parsed);
              if (!selectedCompany && parsed.length > 0) {
                const matched = parsed.find(
                  (c) => (c._id || c.id) === (initialCompanyId || initialCompany?._id)
                );
                setSelectedCompany(matched || parsed[0]);
              }
            }
          } catch (e) {
            // Ignore
          }
        }

        // Fetch fresh companies if list empty
        try {
          const compRes = await getCompanies(1, 30);
          if (isMounted && compRes?.success && Array.isArray(compRes.data?.companies)) {
            const comps = compRes.data.companies;
            setCompaniesList(comps);
            if (!selectedCompany && comps.length > 0) {
              const matched = comps.find(
                (c) => (c._id || c.id) === (initialCompanyId || initialCompany?._id)
              );
              setSelectedCompany(matched || comps[0]);
            }
          }
        } catch (e) {
          // Ignore
        }
      } catch (err) {
        // Silent fail
      }
    };
    loadSavedData();
    return () => {
      isMounted = false;
    };
  }, [currentUser, initialCompany, initialCompanyId, selectedCompany]);

  // Fetch real trader deals: loads cache first, then calls API for company & general deals
  const fetchDeals = useCallback(async () => {
    try {
      setLoadingDeals(true);
      const effectiveCompId =
        selectedCompany?._id || selectedCompany?.id || initialCompanyId;

      // 1. Check cached deals for instant availability
      try {
        const cacheKeys = [
          effectiveCompId ? `trader_deals_cache_${effectiveCompId}` : null,
          'trader_deals_cache_all',
        ].filter(Boolean);
        for (const k of cacheKeys) {
          const cachedStr = await AsyncStorage.getItem(k);
          if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDeals(parsed);
              break;
            }
          }
        }
      } catch (ce) {}

      // 2. Fetch from live API
      const token = await AsyncStorage.getItem('userToken');
      const [compRes, genRes] = await Promise.all([
        effectiveCompId
          ? getDeals(token, 1, 50, effectiveCompId).catch(() => null)
          : Promise.resolve(null),
        getDeals(token, 1, 50).catch(() => null),
      ]);

      const extractDealsList = (r) => {
        if (!r) return [];
        if (Array.isArray(r?.data?.deals)) return r.data.deals;
        if (Array.isArray(r?.data?.data)) return r.data.data;
        if (Array.isArray(r?.data)) return r.data;
        if (Array.isArray(r?.deals)) return r.deals;
        if (Array.isArray(r)) return r;
        return [];
      };

      const compDeals = extractDealsList(compRes);
      const genDeals = extractDealsList(genRes);

      const mergedMap = new Map();
      compDeals.forEach((d) => {
        const id = String(d._id || d.id || '');
        if (id) mergedMap.set(id, d);
      });
      genDeals.forEach((d) => {
        const id = String(d._id || d.id || '');
        if (id && !mergedMap.has(id)) {
          mergedMap.set(id, d);
        }
      });

      const combined = Array.from(mergedMap.values());
      if (combined.length > 0) {
        setDeals(combined);
      }

      if (params.dealId || params.saudaId) {
        const targetId = String(params.dealId || params.saudaId);
        const found = combined.find(
          (d) => String(d._id || d.id) === targetId
        );
        if (found) {
          setSelectedDeal(found);
          setProjectType('DEAL');
        }
      }
    } catch (e) {
      console.warn('Error fetching deals for linking:', e?.message || e);
    } finally {
      setLoadingDeals(false);
    }
  }, [selectedCompany, initialCompanyId, params.dealId, params.saudaId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleBack = () => {
    if (onBack) onBack();
    else if (onNavigate) onNavigate('pop');
    else if (navigation?.goBack) navigation.goBack();
  };

  // Filtered deals for modal search
  const filteredDeals = useMemo(() => {
    if (!dealSearchQuery.trim()) return deals;
    const q = dealSearchQuery.trim().toLowerCase();
    return deals.filter((d) => {
      const code = String(
        d.saudaNumber ||
        d.dealNumber ||
        d.dealNo ||
        d.contractNumber ||
        d._id ||
        ''
      ).toLowerCase();
      const comm = String(
        d.commodity ||
        d.title ||
        d.dealName ||
        d.productName ||
        ''
      ).toLowerCase();
      const buyer = String(
        d.buyerCompany?.name ||
        d.buyerCompanyId?.name ||
        d.buyerCompanyName ||
        ''
      ).toLowerCase();
      const seller = String(
        d.sellerCompany?.name ||
        d.sellerCompanyId?.name ||
        d.sellerCompanyName ||
        ''
      ).toLowerCase();
      return (
        code.includes(q) ||
        comm.includes(q) ||
        buyer.includes(q) ||
        seller.includes(q)
      );
    });
  }, [deals, dealSearchQuery]);

  // Date picker handlers
  const openDatePicker = (target) => {
    setDatePickerTarget(target);
    const initial = target === 'START' ? startDate : targetDeliveryDate;
    setTempSelectedDate(new Date(initial.getTime()));
    setCalendarMonthDate(new Date(initial.getTime()));
  };

  const confirmDatePicker = () => {
    if (datePickerTarget === 'START') {
      setStartDate(tempSelectedDate);
      if (tempSelectedDate > targetDeliveryDate) {
        setTargetDeliveryDate(new Date(tempSelectedDate.getTime() + 7 * 86400000));
      }
    } else if (datePickerTarget === 'TARGET') {
      if (tempSelectedDate < startDate) {
        Alert.alert('Invalid Date', 'Target delivery date cannot be before start date.');
        return;
      }
      setTargetDeliveryDate(tempSelectedDate);
    }
    setDatePickerTarget(null);
  };

  // Calendar calculations
  const calendarGrid = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ id: `empty-${i}`, day: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ id: `day-${d}`, day: d });
    }
    return cells;
  }, [calendarMonthDate]);

  // Create Project Submission
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a Project Title.');
      return;
    }

    if (projectType === 'DEAL' && !selectedDeal) {
      Alert.alert(
        'Select Deal',
        'You selected "From Existing Deal". Please choose an active deal to link.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const effectiveCompanyId =
        selectedCompany?._id || selectedCompany?.id || initialCompanyId || undefined;
      const effectiveManagerId = currentUser?._id || currentUser?.id || undefined;
      const effectiveDealId =
        projectType === 'DEAL' && selectedDeal ? selectedDeal._id || selectedDeal.id : undefined;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        startDate: startDate.toISOString(),
        targetDeliveryDate: targetDeliveryDate.toISOString(),
        priority: priority.toUpperCase(),
        status,
        companyId: effectiveCompanyId,
        managerId: effectiveManagerId,
        dealId: effectiveDealId,
        saudaId: effectiveDealId,
      };

      const res = await createProject(payload);
      const createdProject = res?.data?.project || res?.data || res?.project;
      if (res?.success && createdProject) {
        Alert.alert('Success', 'Project created successfully!', [
          {
            text: 'View Project',
            onPress: () => {
              const navPayload = {
                projectId: createdProject._id || createdProject.id,
                project: createdProject,
                company: selectedCompany || initialCompany,
                companyId: effectiveCompanyId,
                user: currentUser,
              };
              if (onNavigate) {
                onNavigate('ProjectDetails', navPayload);
              } else if (navigation?.navigate) {
                navigation.navigate('ProjectDetails', navPayload);
              }
            },
          },
          {
            text: 'Back to List',
            onPress: () => handleBack(),
          },
        ]);
      } else {
        Alert.alert('Error', res?.message || 'Failed to create project.');
      }
    } catch (err) {
      console.error('Create project error:', err);
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Network error occurred.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activeStatusCfg = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const managerDisplayName = currentUser?.name
    ? `${currentUser.name} (Me)`
    : 'Me';
  const companyDisplayName =
    selectedCompany?.name ||
    selectedCompany?.companyName ||
    initialCompany?.name ||
    initialCompany?.companyName ||
    'None';

  return (
    <KeyboardAvoidingView
      style={styles.safeContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Subtle Top Decorative Curve */}
      <View style={styles.topCurvedBackdrop} />

      {/* ─── 1. TOP HEADER ─── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.circleIconBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={styles.hitSlopArea}
        >
          <ArrowLeft size={19} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCenterWrap}>
          <Text style={styles.headerMainTitle}>New Project</Text>
          <Text style={styles.headerSubTitle} numberOfLines={1}>
            Set up a new project or job
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── 2. PROJECT TYPE ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Project Type</Text>

          <View style={styles.typeCardsRow}>
            {/* Card 1: Independent */}
            <TouchableOpacity
              style={[
                styles.typeCard,
                projectType === 'INDEPENDENT' && styles.typeCardSelected,
              ]}
              onPress={() => setProjectType('INDEPENDENT')}
              activeOpacity={0.8}
            >
              {projectType === 'INDEPENDENT' && (
                <View style={styles.selectedCheckBadge}>
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              <View style={styles.typeCardIconBox}>
                <Box size={22} color="#2563EB" strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.typeCardTitle,
                  projectType === 'INDEPENDENT' && styles.typeCardTitleSelected,
                ]}
              >
                Independent
              </Text>
              <Text style={styles.typeCardDesc}>Start fresh project</Text>
            </TouchableOpacity>

            {/* Card 2: From Deal */}
            <TouchableOpacity
              style={[
                styles.typeCard,
                projectType === 'DEAL' && styles.typeCardSelected,
              ]}
              onPress={() => {
                setProjectType('DEAL');
                if (!selectedDeal) {
                  setShowDealModal(true);
                }
              }}
              activeOpacity={0.8}
            >
              {projectType === 'DEAL' && (
                <View style={styles.selectedCheckBadge}>
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              <View style={styles.typeCardIconBox}>
                <FileText
                  size={22}
                  color={projectType === 'DEAL' ? '#2563EB' : '#64748B'}
                  strokeWidth={1.8}
                />
              </View>
              <Text
                style={[
                  styles.typeCardTitle,
                  projectType === 'DEAL' && styles.typeCardTitleSelected,
                ]}
              >
                From Deal
              </Text>
              <Text style={styles.typeCardDesc}>Link a trade deal</Text>
            </TouchableOpacity>
          </View>

          {/* Clean, Compact Deal Dropdown */}
          {projectType === 'DEAL' && (
            <View style={styles.dealSelectorWrap}>
              <View style={styles.columnLabelRow}>
                <Briefcase size={14} color="#2563EB" />
                <Text style={styles.columnLabelText}>
                  Select Deal <Text style={styles.requiredStar}>*</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => setShowDealModal(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownLeftContent}>
                  <Briefcase size={15} color="#475569" />
                  <Text style={styles.dropdownValueText} numberOfLines={1}>
                    {selectedDeal
                      ? `${selectedDeal.saudaNumber || selectedDeal.dealNumber || selectedDeal.dealCode || 'Deal'} • ${
                          selectedDeal.commodity || selectedDeal.title || 'Contract'
                        }`
                      : loadingDeals
                      ? 'Loading deals...'
                      : 'Choose a deal...'}
                  </Text>
                </View>
                <View style={styles.dropdownRightContent}>
                  {selectedDeal && (
                    <View
                      style={[
                        styles.dealStatusBadgeMini,
                        {
                          backgroundColor: getDealStatusConfig(selectedDeal.status).bg,
                          borderColor: getDealStatusConfig(selectedDeal.status).border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dealStatusTextMini,
                          { color: getDealStatusConfig(selectedDeal.status).text },
                        ]}
                      >
                        {getDealStatusConfig(selectedDeal.status).label}
                      </Text>
                    </View>
                  )}
                  <ChevronDown size={15} color="#2563EB" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── 3. PROJECT TITLE ─── */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>
            Project Title <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.titleInputContainer}>
            <FileText size={17} color="#94A3B8" style={styles.inputLeftIcon} />
            <TextInput
              style={styles.titleTextInput}
              placeholder="Title"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        {/* ─── 4. DATES (START DATE & DUE DATE) ─── */}
        <View style={styles.twoColumnRow}>
          {/* Start Date */}
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Calendar size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>
                Start Date <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => openDatePicker('START')}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Calendar size={15} color="#0F172A" />
                <Text style={styles.dropdownValueText}>{formatDateDisplay(startDate)}</Text>
              </View>
              <ChevronDown size={15} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {/* Due Date */}
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Calendar size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>
                Due Date <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => openDatePicker('TARGET')}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Calendar size={15} color="#0F172A" />
                <Text style={styles.dropdownValueText}>
                  {formatDateDisplay(targetDeliveryDate)}
                </Text>
              </View>
              <ChevronDown size={15} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 5. PRIORITY & STATUS ─── */}
        <View style={styles.twoColumnRow}>
          {/* Priority */}
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Flag size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>Priority</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowPriorityModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Flag size={15} color="#475569" />
                <Text style={styles.dropdownValueText}>{priority}</Text>
              </View>
              <ChevronDown size={15} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Status */}
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Clock size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>Status</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.dropdownBox,
                {
                  backgroundColor: activeStatusCfg.bg,
                  borderColor: activeStatusCfg.border,
                },
              ]}
              onPress={() => setShowStatusModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Clock size={15} color={activeStatusCfg.color} />
                <Text style={[styles.dropdownValueText, { color: activeStatusCfg.color }]}>
                  {activeStatusCfg.label}
                </Text>
              </View>
              <ChevronDown size={15} color={activeStatusCfg.color} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 6. MANAGER & COMPANY ─── */}
        <View style={styles.twoColumnRow}>
          {/* Manager */}
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <User size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>Manager</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowManagerModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <User size={15} color="#475569" />
                <Text style={styles.dropdownValueText} numberOfLines={1}>
                  {managerDisplayName}
                </Text>
              </View>
              <ChevronDown size={15} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Company (Optional) */}
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Building2 size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>Company (Optional)</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowCompanyModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Building2 size={15} color="#475569" />
                <Text style={styles.dropdownValueText} numberOfLines={1}>
                  {companyDisplayName}
                </Text>
              </View>
              <ChevronDown size={15} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 7. NOTES (OPTIONAL) ─── */}
        <View style={styles.fieldSection}>
          <View style={styles.columnLabelRow}>
            <FileText size={14} color="#2563EB" />
            <Text style={styles.columnLabelText}>Notes (Optional)</Text>
          </View>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textAreaInput}
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.textAreaFooter}>
              <Text style={styles.charCounterText}>{description.length}/500</Text>
            </View>
          </View>
        </View>

        {/* ─── 8. ACTION BUTTONS ─── */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryCreateBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleCreate}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CirclePlus size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Create Project</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCancelBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ─── DATE PICKER BOTTOM SHEET MODAL ─── */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal
        visible={datePickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setDatePickerTarget(null)}
          />
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetTitleGroup}>
                <Calendar size={17} color="#2563EB" />
                <Text style={styles.sheetMainTitle}>
                  {datePickerTarget === 'START' ? 'Select Start Date' : 'Select Target Delivery Date'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDatePickerTarget(null)}
                style={styles.sheetCloseBtn}
              >
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Month / Year Navigator */}
            <View style={styles.calNavRow}>
              <TouchableOpacity
                style={styles.calArrowBtn}
                onPress={() => {
                  const d = new Date(calendarMonthDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarMonthDate(d);
                }}
              >
                <ChevronLeft size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.calMonthYearLabel}>
                {MONTH_NAMES[calendarMonthDate.getMonth()]} {calendarMonthDate.getFullYear()}
              </Text>
              <TouchableOpacity
                style={styles.calArrowBtn}
                onPress={() => {
                  const d = new Date(calendarMonthDate);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarMonthDate(d);
                }}
              >
                <ChevronRight size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Week Days */}
            <View style={styles.weekDaysRow}>
              {WEEK_DAYS.map((wd) => (
                <Text key={wd} style={styles.weekDayText}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarGrid.map((item) => {
                if (!item.day) {
                  return <View key={item.id} style={styles.emptyDayCell} />;
                }
                const isSelected =
                  tempSelectedDate.getDate() === item.day &&
                  tempSelectedDate.getMonth() === calendarMonthDate.getMonth() &&
                  tempSelectedDate.getFullYear() === calendarMonthDate.getFullYear();

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => {
                      const d = new Date(
                        calendarMonthDate.getFullYear(),
                        calendarMonthDate.getMonth(),
                        item.day
                      );
                      setTempSelectedDate(d);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDatePickerTarget(null)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmDatePicker}
              >
                <Text style={styles.modalConfirmButtonText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ─── PRIORITY MODAL ─── */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal
        visible={showPriorityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriorityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowPriorityModal(false)}
          />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Select Priority</Text>
            {PRIORITY_OPTIONS.map((item) => {
              const isSelected = priority === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.dialogOptionRow, isSelected && styles.dialogOptionSelected]}
                  onPress={() => {
                    setPriority(item.value);
                    setShowPriorityModal(false);
                  }}
                >
                  <View style={styles.optionLeftGroup}>
                    <View style={[styles.priorityDot, { backgroundColor: item.color }]} />
                    <Text
                      style={[
                        styles.dialogOptionText,
                        isSelected && styles.dialogTextBold,
                        isSelected && { color: item.color },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && <Check size={16} color={item.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ─── INITIAL STATUS MODAL ─── */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowStatusModal(false)}
          />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Select Initial Status</Text>
            {STATUS_OPTIONS.map((item) => {
              const isSelected = status === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.dialogOptionRow, isSelected && styles.dialogOptionSelected]}
                  onPress={() => {
                    setStatus(item.value);
                    setShowStatusModal(false);
                  }}
                >
                  <View style={styles.optionLeftGroup}>
                    <Clock size={16} color={item.color} />
                    <Text
                      style={[
                        styles.dialogOptionText,
                        isSelected && styles.dialogTextBold,
                        isSelected && { color: item.color },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && <Check size={16} color={item.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ─── COMPANY MODAL ─── */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal
        visible={showCompanyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompanyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowCompanyModal(false)}
          />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Select Company</Text>
            <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
              {companiesList.map((comp) => {
                const compId = comp._id || comp.id;
                const isSelected =
                  (selectedCompany?._id || selectedCompany?.id) === compId;
                const name = comp.name || comp.companyName || 'Registered Company';
                return (
                  <TouchableOpacity
                    key={compId || name}
                    style={[styles.dialogOptionRow, isSelected && styles.dialogOptionSelected]}
                    onPress={() => {
                      setSelectedCompany(comp);
                      setShowCompanyModal(false);
                    }}
                  >
                    <View style={styles.optionLeftGroup}>
                      <Building2 size={16} color="#2563EB" />
                      <Text
                        style={[styles.dialogOptionText, isSelected && styles.dialogTextActive]}
                      >
                        {name}
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.dialogOptionRow}
                onPress={() => {
                  setSelectedCompany(null);
                  setShowCompanyModal(false);
                }}
              >
                <View style={styles.optionLeftGroup}>
                  <Building2 size={16} color="#94A3B8" />
                  <Text style={[styles.dialogOptionText, styles.dialogTextMuted]}>
                    None (Independent)
                  </Text>
                </View>
                {!selectedCompany && <Check size={16} color="#2563EB" />}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ─── PROJECT MANAGER MODAL ─── */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal
        visible={showManagerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManagerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowManagerModal(false)}
          />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Project Manager</Text>
            <TouchableOpacity
              style={[styles.dialogOptionRow, styles.dialogOptionSelected]}
              onPress={() => setShowManagerModal(false)}
            >
              <View style={styles.optionLeftGroup}>
                <User size={16} color="#2563EB" />
                <Text style={[styles.dialogOptionText, styles.dialogTextActive]}>
                  {managerDisplayName}
                </Text>
              </View>
              <Check size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ─── DEAL PICKER MODAL (From Existing Deal) ─── */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal
        visible={showDealModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowDealModal(false)}
          />
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetTitleGroup}>
                <Briefcase size={17} color="#2563EB" />
                <Text style={styles.sheetMainTitle}>Select Deal</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDealModal(false)}
                style={styles.sheetCloseBtn}
              >
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Deal Search Input */}
            <View style={styles.dealSearchBar}>
              <Search size={15} color="#94A3B8" />
              <TextInput
                style={styles.dealSearchInput}
                placeholder="Search"
                placeholderTextColor="#94A3B8"
                value={dealSearchQuery}
                onChangeText={setDealSearchQuery}
              />
            </View>

            <ScrollView style={styles.dealsListScroll} showsVerticalScrollIndicator={false}>
              {loadingDeals && deals.length === 0 ? (
                <View style={styles.emptyBox}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingDealsText}>Loading deals...</Text>
                </View>
              ) : filteredDeals.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyBoxText}>
                    No trade deals found.
                  </Text>
                </View>
              ) : (
                filteredDeals.map((deal) => {
                  const dealId = deal._id || deal.id;
                  const isSelected =
                    String(selectedDeal?._id || selectedDeal?.id) === String(dealId);
                  const dealCode =
                    deal.saudaNumber ||
                    deal.dealNumber ||
                    deal.dealNo ||
                    deal.contractNumber ||
                    `#${String(dealId).slice(-6).toUpperCase()}`;
                  const commodity =
                    deal.commodity ||
                    deal.title ||
                    deal.dealName ||
                    deal.productName ||
                    'Trade Deal';
                  const sellerName =
                    deal.sellerCompany?.name ||
                    deal.sellerCompanyId?.name ||
                    deal.sellerCompanyName ||
                    deal.party1?.company?.name ||
                    'Seller';
                  const buyerName =
                    deal.buyerCompany?.name ||
                    deal.buyerCompanyId?.name ||
                    deal.buyerCompanyName ||
                    deal.party2?.company?.name ||
                    'Buyer';
                  const totalAmt =
                    deal.totalAmount || deal.totalPrice || deal.estimatedAmount;
                  const priceStr = totalAmt
                    ? ` • ₹${Number(totalAmt).toLocaleString('en-IN')}`
                    : '';
                  const statusCfg = getDealStatusConfig(deal.status);

                  return (
                    <TouchableOpacity
                      key={dealId}
                      style={[styles.dealItemCard, isSelected && styles.dealItemCardSelected]}
                      onPress={() => {
                        setSelectedDeal(deal);
                        if (!title.trim()) {
                          setTitle(`${dealCode} - ${commodity}`);
                        }
                        if (deal.sellerCompany || deal.buyerCompany) {
                          const matching = deal.sellerCompany || deal.buyerCompany;
                          if (matching && (!selectedCompany || !selectedCompany._id)) {
                            setSelectedCompany(matching);
                          }
                        }
                        setShowDealModal(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.dealItemLeft}>
                        <View style={styles.dealCodeBadge}>
                          <Text style={styles.dealCodeBadgeText}>{dealCode}</Text>
                        </View>
                        <View style={styles.dealMetaColumn}>
                          <Text style={styles.dealItemTitle}>
                            {commodity}{priceStr}
                          </Text>
                          <Text style={styles.dealItemSub}>
                            {sellerName} ➔ {buyerName}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dealItemRight}>
                        <View
                          style={[
                            styles.dealStatusBadge,
                            {
                              backgroundColor: statusCfg.bg,
                              borderColor: statusCfg.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dealStatusText,
                              { color: statusCfg.text },
                            ]}
                          >
                            {statusCfg.label}
                          </Text>
                        </View>
                        {isSelected && <Check size={16} color="#2563EB" style={styles.ml6} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topCurvedBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#EEF4FF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  hitSlopArea: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  /* Top Navigation Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
  },
  circleIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerCenterWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerMainTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  headerSubTitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 38,
    height: 38,
  },

  /* Project Type / Source */
  sectionWrap: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  typeCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  typeCardSelected: {
    borderColor: '#2563EB',
    borderWidth: 1.5,
    backgroundColor: '#EFF6FF',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardIconBox: {
    marginBottom: 6,
  },
  typeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  typeCardTitleSelected: {
    color: '#2563EB',
  },
  typeCardDesc: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 14,
  },

  /* Compact Deal Selector inside Project Type */
  dealSelectorWrap: {
    marginTop: 10,
  },

  /* Project Title Section */
  fieldSection: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  titleInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  titleTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },

  /* 2-Column Form Rows */
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  columnItem: {
    flex: 1,
  },
  columnLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  columnLabelText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownBox: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  dropdownLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 4,
  },
  dropdownValueText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 1,
  },

  /* Description & Notes */
  textAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    minHeight: 85,
    justifyContent: 'space-between',
  },
  textAreaInput: {
    fontSize: 13,
    color: '#0F172A',
    minHeight: 50,
    padding: 0,
  },
  textAreaFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 2,
  },
  charCounterText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Action Buttons */
  actionsContainer: {
    marginTop: 4,
  },
  primaryCreateBtn: {
    backgroundColor: '#2563EB',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  secondaryCancelBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },

  /* ════ Modal Sheets & Dialogs ════ */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },

  /* Calendar */
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  calArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthYearLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekDayText: {
    width: 34,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 36,
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dayCellSelected: {
    backgroundColor: '#2563EB',
  },
  dayCellText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalConfirmButton: {
    flex: 1.5,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Small Dialog Cards */
  dialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  dialogSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 12,
  },
  dialogScroll: {
    maxHeight: 240,
  },
  dialogOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dialogOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dialogOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  dialogTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  dialogTextBold: {
    fontWeight: '700',
  },
  dialogTextMuted: {
    color: '#64748B',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  /* Deals Selector Modal */
  dealSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginTop: 10,
    marginBottom: 6,
    gap: 6,
  },
  dealSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  dealsListScroll: {
    maxHeight: 320,
    marginTop: 4,
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyBoxText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingDealsText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  dealItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 6,
  },
  dealItemCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  dealItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dealCodeBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dealCodeBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  dealMetaColumn: {
    flex: 1,
  },
  dealItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  dealItemSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },

  dealItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  dealStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  dealStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dropdownRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealStatusBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  dealStatusTextMini: {
    fontSize: 10,
    fontWeight: '700',
  },
  ml6: {
    marginLeft: 6,
  },
});

export default CreateProject;
