import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Plus,
  Calendar,
  ChevronRight,
  Boxes,
  Package,
  FileSpreadsheet,
  Users,
  RefreshCw,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
} from 'lucide-react-native';
import {
  getProjects,
  getProductionDashboardStats,
} from '../../../services/api';

const THEME = '#2327D8';
const THEME_LIGHT = '#EEF2FF';
const BG_COLOR = '#F8FAFC';

const getStatusBadge = (status = '') => {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return { label: 'Active', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    case 'COMPLETED':
    case 'DONE':
      return { label: 'Completed', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    case 'ON_HOLD':
      return { label: 'On Hold', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    case 'DRAFT':
    default:
      return { label: 'Draft', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
};

const ProjectsList = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const company = params.company;
  const companyId = params.companyId || company?._id || company?.id;
  const user = params.user;

  const effectiveCompanyId = companyId || company?._id || company?.id || null;

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);

  const fetchDashboardStats = useCallback(async () => {
    if (!effectiveCompanyId) return;
    try {
      const res = await getProductionDashboardStats(effectiveCompanyId);
      if (res?.success && res.data) {
        setDashboardStats(res.data);
      }
    } catch (e) {
      console.warn('[ProjectsList] Failed to load production dashboard stats:', e?.message || e);
    }
  }, [effectiveCompanyId]);

  const fetchProjectsList = useCallback(async () => {
    try {
      fetchDashboardStats();
      const queryParams = {};
      if (effectiveCompanyId) {
        queryParams.companyId = effectiveCompanyId;
      }

      const res = await getProjects(queryParams);
      let list = [];
      if (res?.success && Array.isArray(res.data?.projects)) {
        list = res.data.projects;
      } else if (res?.success && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res?.data?.projects)) {
        list = res.data.projects;
      } else if (Array.isArray(res?.projects)) {
        list = res.projects;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }

      if (list.length === 0 && effectiveCompanyId) {
        try {
          const fallbackParams = { ...queryParams };
          delete fallbackParams.companyId;
          const fallbackRes = await getProjects(fallbackParams);
          const fallbackList =
            (fallbackRes?.success && Array.isArray(fallbackRes.data?.projects) && fallbackRes.data.projects) ||
            (fallbackRes?.success && Array.isArray(fallbackRes.data) && fallbackRes.data) ||
            (Array.isArray(fallbackRes?.projects) && fallbackRes.projects) ||
            [];
          if (fallbackList.length > 0) {
            list = fallbackList;
          }
        } catch (e) {
          // ignore
        }
      }

      setProjects(list);
    } catch (err) {
      console.warn('[ProjectsList] Failed to load projects:', err?.message || err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [effectiveCompanyId, fetchDashboardStats]);

  useEffect(() => {
    setIsLoading(true);
    fetchProjectsList();
  }, [fetchProjectsList]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjectsList();
  };

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation?.goBack) return navigation.goBack();
    if (onNavigate) {
      if (company) {
        return onNavigate('CompanyDetails', { company, companyId: effectiveCompanyId, user });
      }
      return onNavigate('Dashboard', { user });
    }
  };

  const navigateTo = (screenName, extraData = {}) => {
    const navPayload = {
      company,
      companyId: effectiveCompanyId,
      user,
      ...extraData,
    };
    if (onNavigate) {
      onNavigate(screenName, navPayload);
    } else if (navigation?.navigate) {
      navigation.navigate(screenName, navPayload);
    }
  };

  const targetCompanyName = useMemo(() => {
    if (company?.name || company?.companyName) {
      return company?.name || company?.companyName;
    }
    return 'Operations & Factory';
  }, [company]);

  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter((p) => (p.status || '').toUpperCase() === 'ACTIVE').length;

  const renderHeader = () => (
    <View style={styles.headerBodyContainer}>
      {/* ─── KPI METRICS SUMMARY ROW ─── */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <View style={[styles.kpiIconWrap, { backgroundColor: '#EEF2FF' }]}>
            <Layers size={16} color={THEME} />
          </View>
          <Text style={styles.kpiValue}>{totalProjectsCount}</Text>
          <Text style={styles.kpiLabel}>Total Projects</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIconWrap, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={16} color="#059669" />
          </View>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>{activeProjectsCount}</Text>
          <Text style={styles.kpiLabel}>Active Runs</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <FileSpreadsheet size={16} color="#D97706" />
          </View>
          <Text style={[styles.kpiValue, { color: '#D97706' }]}>
            {dashboardStats?.pendingDemands ?? 0}
          </Text>
          <Text style={styles.kpiLabel}>Demands</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIconWrap, { backgroundColor: '#FAF5FF' }]}>
            <Users size={16} color="#9333EA" />
          </View>
          <Text style={[styles.kpiValue, { color: '#9333EA' }]}>
            {dashboardStats?.activeStaff ?? dashboardStats?.staffCount ?? 0}
          </Text>
          <Text style={styles.kpiLabel}>Floor Staff</Text>
        </View>
      </View>

      {/* ─── PRODUCTION QUICK MODULES ─── */}
      <View style={styles.sectionHeaderWrap}>
        <Text style={styles.sectionTitle}>Production & Floor Modules</Text>
        <Text style={styles.sectionSubtitle}>Direct access to materials, inventory & workers</Text>
      </View>

      <View style={styles.modulesGrid}>
        {/* Create Project */}
        <TouchableOpacity
          style={[styles.moduleCard, styles.moduleCardPrimary]}
          onPress={() => navigateTo('CreateProject')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: THEME }]}>
            <Plus size={20} color="#FFFFFF" />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={[styles.moduleName, { color: THEME }]}>Create Project</Text>
            <Text style={styles.moduleSub}>New batch, product & BOM pipeline</Text>
          </View>
          <ChevronRight size={18} color={THEME} />
        </TouchableOpacity>

        {/* Raw Materials */}
        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigateTo('RawMaterialsPage')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#EEF2FF' }]}>
            <Boxes size={20} color={THEME} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleName}>Raw Materials Master</Text>
            <Text style={styles.moduleSub}>Material codes, unit & standard price</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Inventory Stock */}
        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigateTo('InventoryStockPage')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Package size={20} color="#16A34A" />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleName}>Inventory & Floor Stock</Text>
            <Text style={styles.moduleSub}>Stock balance, issues, receipts & logs</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Material Demands */}
        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigateTo('MaterialDemandsPage')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#FFFBEB' }]}>
            <FileSpreadsheet size={20} color="#D97706" />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleName}>Material Demands</Text>
            <Text style={styles.moduleSub}>Floor demands & supervisor approval</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Staff Directory */}
        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigateTo('StaffDirectoryPage')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#FAF5FF' }]}>
            <Users size={20} color="#9333EA" />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleName}>Staff & Workforce Directory</Text>
            <Text style={styles.moduleSub}>Onboard workers, wages & stage allocation</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* ─── PRODUCTION PROJECTS HEADER ─── */}
      <View style={styles.projectsSectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Production Projects</Text>
          <Text style={styles.sectionSubtitle}>
            {projects.length} {projects.length === 1 ? 'Project' : 'Projects'} in pipeline
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createProjectBtn}
          onPress={() => navigateTo('CreateProject')}
          activeOpacity={0.85}
        >
          <Plus size={15} color="#FFFFFF" />
          <Text style={styles.createProjectBtnText}>New Project</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProjectItem = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const projectName = item.name || item.title || 'Untitled Batch';
    const projectCode =
      item.projectNumber ||
      item.projectCode ||
      item.code ||
      (item._id ? `#PRD-${String(item._id).slice(-4).toUpperCase()}` : '#PRD-0001');
    const productName =
      item.productId?.name ||
      item.productName ||
      item.product?.name ||
      item.categoryName ||
      null;

    const prodQty = item.productionQuantity ?? item.targetQuantity ?? null;
    const prodUnit = item.unit || item.productId?.unit || '';
    const materialsCount = Array.isArray(item.requiredMaterials) ? item.requiredMaterials.length : 0;

    const stagesCount = Array.isArray(item.stages) ? item.stages.length : 0;
    let computedProgress = 0;
    if (typeof item.overallProgress === 'number') {
      computedProgress = item.overallProgress;
    } else if (typeof item.progress === 'number') {
      computedProgress = item.progress;
    } else if (typeof item.completionPercentage === 'number') {
      computedProgress = item.completionPercentage;
    } else if (stagesCount > 0) {
      const totalStageProgress = item.stages.reduce((acc, s) => {
        const p = Number(
          s.progressPercentage ??
          s.progress ??
          (s.status === 'COMPLETED' || s.isCompleted ? 100 : s.status === 'IN_PROGRESS' ? (s.progress || 0) : 0)
        ) || 0;
        return acc + p;
      }, 0);
      computedProgress = Math.round(totalStageProgress / stagesCount);
    } else {
      const statusUpper = (item.status || '').toUpperCase();
      if (statusUpper === 'COMPLETED') computedProgress = 100;
      else computedProgress = 0;
    }

    const progressPercent = Math.min(100, Math.max(0, Math.round(computedProgress)));

    return (
      <TouchableOpacity
        style={styles.projectCard}
        activeOpacity={0.85}
        onPress={() =>
          navigateTo('ProjectDetails', {
            projectId: item._id || item.id,
            project: item,
          })
        }
      >
        <View style={styles.cardTop}>
          <View style={styles.codeTag}>
            <Text style={styles.codeTagText}>{projectCode.toUpperCase()}</Text>
          </View>
          <View
            style={[
              styles.badgePill,
              { backgroundColor: badge.bg, borderColor: badge.border },
            ]}
          >
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <Text style={styles.projectTitle} numberOfLines={2}>
          {projectName}
        </Text>

        <View style={styles.projectMetaRow}>
          {productName && (
            <View style={styles.productPill}>
              <Boxes size={12} color="#2563EB" />
              <Text style={styles.productPillText} numberOfLines={1}>
                {productName}
              </Text>
            </View>
          )}

          {prodQty !== null && (
            <View style={styles.qtyPill}>
              <Package size={12} color="#059669" />
              <Text style={styles.qtyPillText}>
                {prodQty} {prodUnit}
              </Text>
            </View>
          )}

          {materialsCount > 0 && (
            <View style={styles.matCountPill}>
              <Layers size={12} color="#7C3AED" />
              <Text style={styles.matCountPillText}>
                {materialsCount} {materialsCount === 1 ? 'Material' : 'Materials'}
              </Text>
            </View>
          )}
        </View>

        {/* Clean Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressLabel}>
              {stagesCount > 0 ? `${completedStages}/${stagesCount} Stages Done` : 'Production Stage Progress'}
            </Text>
            <Text style={styles.progressValue}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(Math.max(progressPercent, 6), 100)}%`,
                  backgroundColor: progressPercent === 100 ? '#16A34A' : THEME,
                },
              ]}
            />
          </View>
        </View>

        {/* Card Bottom Row */}
        <View style={styles.cardBottom}>
          <View style={styles.dateWrap}>
            <Calendar size={13} color="#64748B" />
            <Text style={styles.dateText}>
              {formatDate(item.startDate || item.createdAt)}
              {item.expectedCompletionDate ? ` → ${formatDate(item.expectedCompletionDate)}` : ''}
            </Text>
          </View>

          <View style={styles.viewLink}>
            <Text style={styles.viewLinkText}>Manage Stages</Text>
            <ChevronRight size={14} color={THEME} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME} />
          <Text style={styles.loadingText}>Loading production operations...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <FolderKanban size={38} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>No Projects Created Yet</Text>
        <Text style={styles.emptySub}>
          Start a new production batch or project with linked Bill of Materials (BOM) and stages.
        </Text>
        <TouchableOpacity
          style={styles.emptyCreateBtn}
          onPress={() => navigateTo('CreateProject')}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.emptyCreateBtnText}>Create First Project</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* ─── APP HEADER ─── */}
      <View style={styles.appHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {targetCompanyName}
          </Text>
          <Text style={styles.headerTitle}>Projects & Operations</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ─── MAIN CONTENT ─── */}
      <FlatList
        data={projects}
        keyExtractor={(item, index) => item._id || item.id || `proj_${index}`}
        renderItem={renderProjectItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerBodyContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
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
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  sectionHeaderWrap: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  modulesGrid: {
    gap: 10,
    marginBottom: 24,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  moduleCardPrimary: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  moduleSub: {
    fontSize: 11,
    color: '#64748B',
  },
  projectsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  createProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  createProjectBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  projectTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  projectMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  productPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  productPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    flexShrink: 1,
  },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  qtyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  matCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  matCountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  productText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  budgetWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  budgetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME,
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
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
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
    backgroundColor: THEME,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ProjectsList;
