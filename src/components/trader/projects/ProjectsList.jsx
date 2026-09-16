import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  User,
  ChevronRight,
  Briefcase,
  X,
  ListTodo,
  Building2,
} from 'lucide-react-native';
import {
  getProjects,
  getMyAssignedTasks,
  updateProjectTaskStatus,
} from '../../../services/api';

const THEME = '#2327D8';
const BG_COLOR = '#F4F6FB';

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Draft', value: 'DRAFT' },
];

const TASK_STATUS_FILTERS = [
  { label: 'All Tasks', value: 'ALL' },
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Done', value: 'DONE' },
];

const getStatusStyle = (status = '') => {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'ACTIVE':
      return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' };
    case 'COMPLETED':
      return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', dot: '#3B82F6' };
    case 'ON_HOLD':
      return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' };
    case 'DRAFT':
    default:
      return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1', dot: '#94A3B8' };
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

const ProjectsList = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const company = params.company;
  const companyId = params.companyId || company?._id || company?.id;
  const user = params.user;

  const effectiveCompanyId = companyId || company?._id || company?.id || null;

  const [viewMode, setViewMode] = useState('PROJECTS'); // 'PROJECTS' | 'MY_TASKS'
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Worker view: Assigned tasks (API 12)
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState('ALL');

  const fetchProjectsList = useCallback(async () => {
    try {
      const queryParams = {};
      if (activeTab !== 'ALL') {
        queryParams.status = activeTab;
      }
      if (searchQuery.trim()) {
        queryParams.search = searchQuery.trim();
      }
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

      // If filtering on server returned 0 items, check without companyId parameter
      // so displayedProjects can filter client-side smoothly
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
  }, [activeTab, searchQuery, effectiveCompanyId]);

  const fetchAssignedTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      const statusParam = taskFilter === 'ALL' ? null : taskFilter;
      const res = await getMyAssignedTasks(statusParam);
      let taskList = [];
      if (res?.success && Array.isArray(res.data?.tasks)) {
        taskList = res.data.tasks;
      } else if (res?.success && Array.isArray(res.data)) {
        taskList = res.data;
      } else if (Array.isArray(res?.data?.tasks)) {
        taskList = res.data.tasks;
      } else if (Array.isArray(res?.tasks)) {
        taskList = res.tasks;
      } else if (Array.isArray(res)) {
        taskList = res;
      }
      setAssignedTasks(taskList);
    } catch (e) {
      console.warn('[ProjectsList] Failed to load assigned tasks:', e?.message || e);
    } finally {
      setTasksLoading(false);
      setRefreshing(false);
    }
  }, [taskFilter]);

  useEffect(() => {
    if (viewMode === 'PROJECTS') {
      setIsLoading(true);
      fetchProjectsList();
    } else {
      fetchAssignedTasks();
    }
  }, [viewMode, fetchProjectsList, fetchAssignedTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    if (viewMode === 'PROJECTS') {
      fetchProjectsList();
    } else {
      fetchAssignedTasks();
    }
  };

  // Task status cycle from worker view (API 11)
  const handleTaskStatusCycle = async (taskItem) => {
    const currentStatus = taskItem.status || 'TODO';
    const statusCycle = ['TODO', 'IN_PROGRESS', 'DONE'];
    const currentIdx = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];

    setAssignedTasks((prev) =>
      prev.map((t) => (t.taskId === taskItem.taskId ? { ...t, status: nextStatus } : t))
    );

    try {
      const pId = taskItem.project?._id || taskItem.projectId;
      if (pId && taskItem.taskId) {
        await updateProjectTaskStatus(pId, taskItem.taskId, nextStatus);
      }
    } catch (e) {
      console.warn('Failed to update task status from worker view:', e);
      fetchAssignedTasks();
    }
  };

  // Resolve company name if arriving from CompanyDetails
  const targetCompanyName = useMemo(() => {
    if (company?.name || company?.companyName) {
      return company?.name || company?.companyName;
    }
    if (effectiveCompanyId) {
      const match = projects.find((p) => {
        const cId =
          (typeof p.companyId === 'object' && p.companyId
            ? p.companyId._id || p.companyId.id
            : p.companyId) ||
          (typeof p.company === 'object' && p.company
            ? p.company._id || p.company.id
            : p.company);
        return String(cId) === String(effectiveCompanyId);
      });
      if (match) {
        return (
          match.company?.name ||
          match.company?.companyName ||
          (typeof match.companyId === 'object' ? match.companyId?.name : null)
        );
      }
    }
    return null;
  }, [company, effectiveCompanyId, projects]);

  // Filter projects by company (when clicked from CompanyDetails), status tab, and search query
  const displayedProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Company Filter (if clicked from a company in CompanyDetails)
      if (effectiveCompanyId) {
        const pCompId =
          (typeof p.companyId === 'object' && p.companyId
            ? p.companyId._id || p.companyId.id
            : p.companyId) ||
          (typeof p.company === 'object' && p.company
            ? p.company._id || p.company.id
            : p.company) ||
          '';
        if (String(pCompId) !== String(effectiveCompanyId)) {
          return false;
        }
      }

      // 2. Status Filter
      if (activeTab !== 'ALL') {
        if ((p.status || '').toUpperCase() !== activeTab) {
          return false;
        }
      }

      // 3. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchJobCode = (p.jobCode || '').toLowerCase().includes(q);
        if (!matchTitle && !matchJobCode) {
          return false;
        }
      }

      return true;
    });
  }, [projects, effectiveCompanyId, activeTab, searchQuery]);

  // Metrics computation based on filtered projects
  const totalCount = displayedProjects.length;
  const activeCount = displayedProjects.filter(
    (p) => (p.status || '').toUpperCase() === 'ACTIVE'
  ).length;
  const completedCount = displayedProjects.filter(
    (p) => (p.status || '').toUpperCase() === 'COMPLETED'
  ).length;
  const avgProgress =
    totalCount > 0
      ? Math.round(
          displayedProjects.reduce(
            (acc, p) => acc + (Number(p.overallProgress) || 0),
            0
          ) / totalCount
        )
      : 0;

  const renderProjectCard = ({ item }) => {
    const statusCfg = getStatusStyle(item.status);
    const progress = Math.min(100, Math.max(0, Number(item.overallProgress) || 0));
    const managerName = item.manager?.name || (typeof item.managerId === 'object' ? item.managerId?.name : null) || 'Unassigned';
    const companyName =
      item.company?.name ||
      item.company?.companyName ||
      (typeof item.companyId === 'object' ? item.companyId?.name : null);

    return (
      <TouchableOpacity
        style={styles.projectCard}
        activeOpacity={0.88}
        onPress={() =>
          onNavigate('ProjectDetails', {
            project: item,
            projectId: item._id,
            company,
            companyId,
            user,
          })
        }
      >
        {/* Top: Job Code & Status Badge */}
        <View style={styles.cardHeaderRow}>
          {item.jobCode ? (
            <View style={styles.jobCodeBadge}>
              <FolderKanban size={13} color={THEME} style={styles.mr4} />
              <Text style={styles.jobCodeText}>{item.jobCode}</Text>
            </View>
          ) : (
            <View />
          )}

          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
            <Text style={[styles.statusText, { color: statusCfg.text }]}>{item.status || 'DRAFT'}</Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.projectTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.projectDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Footer: Dates & Manager & Company */}
        <View style={styles.cardFooterRow}>
          <View style={styles.dateMetaCol}>
            <View style={styles.dateRow}>
              <Calendar size={13} color="#64748B" style={styles.mr4} />
              <Text style={styles.dateText}>Due: {formatDate(item.targetDeliveryDate)}</Text>
            </View>
            {companyName ? (
              <View style={styles.companyRow}>
                <Building2 size={12} color="#64748B" style={styles.mr4} />
                <Text style={styles.companyText} numberOfLines={1}>
                  {companyName}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.managerCol}>
            <View style={styles.managerAvatarMini}>
              <User size={12} color={THEME} />
            </View>
            <Text style={styles.managerName} numberOfLines={1}>
              {managerName}
            </Text>
            <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAssignedTaskItem = ({ item }) => {
    const isDone = item.status === 'DONE';
    const isInProgress = item.status === 'IN_PROGRESS';
    const isBlocked = item.status === 'BLOCKED';
    const statusBg = isDone
      ? '#ECFDF5'
      : isInProgress
      ? '#FEF3C7'
      : isBlocked
      ? '#FEE2E2'
      : '#F1F5F9';
    const statusColor = isDone
      ? '#059669'
      : isInProgress
      ? '#D97706'
      : isBlocked
      ? '#DC2626'
      : '#64748B';

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskCardTop}>
          <TouchableOpacity
            style={[styles.taskStatusPill, { backgroundColor: statusBg }]}
            onPress={() => handleTaskStatusCycle(item)}
            activeOpacity={0.75}
          >
            {isDone ? (
              <CheckCircle2 size={13} color="#059669" />
            ) : isInProgress ? (
              <Clock size={13} color="#D97706" />
            ) : isBlocked ? (
              <AlertCircle size={13} color="#DC2626" />
            ) : (
              <View style={styles.todoDotMini} />
            )}
            <Text style={[styles.taskStatusPillText, { color: statusColor }]}>
              {item.status || 'TODO'}
            </Text>
          </TouchableOpacity>

          {item.priority ? (
            <View style={styles.priorityMiniBadge}>
              <Text style={styles.priorityMiniText}>{item.priority}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.taskTitleText, isDone && styles.taskTitleDone]}>
          {item.taskTitle}
        </Text>

        <View style={styles.taskBreadcrumbRow}>
          <Text style={styles.taskBreadcrumbText} numberOfLines={1}>
            {item.stageName || 'Stage'} ➔ {item.milestoneTitle || 'Milestone'}
          </Text>
        </View>

        {item.dueDate ? (
          <View style={styles.taskDueRow}>
            <Calendar size={12} color="#64748B" />
            <Text style={styles.taskDueText}>Due: {formatDate(item.dueDate)}</Text>
          </View>
        ) : null}

        <View style={styles.taskCardDivider} />

        <TouchableOpacity
          style={styles.taskProjectFooter}
          activeOpacity={0.7}
          onPress={() => {
            if (item.project?._id) {
              onNavigate('ProjectDetails', {
                projectId: item.project._id,
                project: item.project,
                company,
                companyId,
                user,
              });
            }
          }}
        >
          <View style={styles.taskProjectInfo}>
            <FolderKanban size={13} color={THEME} />
            {item.project?.jobCode ? (
              <Text style={styles.taskProjectJobCode}>{item.project.jobCode}</Text>
            ) : null}
            <Text style={styles.taskProjectTitle} numberOfLines={1}>
              {item.project?.title}
            </Text>
          </View>
          <ChevronRight size={14} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* ─── 1. TOP HERO HEADER ─── */}
      <View style={styles.heroHeader}>
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (onBack ? onBack() : onNavigate ? onNavigate('pop') : navigation?.goBack?.())}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Projects & Jobs</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {targetCompanyName || 'Operations & Execution'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() =>
              onNavigate('CreateProject', {
                company,
                companyId: effectiveCompanyId,
                user,
              })
            }
            activeOpacity={0.85}
          >
            <Plus size={18} color={THEME} strokeWidth={2.8} />
            <Text style={styles.headerAddBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Summary Stats Strip ─── */}
        <View style={styles.statsStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#34D399' }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#60A5FA' }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#FCD34D' }]}>{avgProgress}%</Text>
            <Text style={styles.statLabel}>Avg Progress</Text>
          </View>
        </View>

        {/* ─── View Mode Switch: Projects vs My Tasks (Worker View) ─── */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, viewMode === 'PROJECTS' && styles.modeToggleBtnActive]}
            onPress={() => setViewMode('PROJECTS')}
            activeOpacity={0.8}
          >
            <FolderKanban
              size={14}
              color={viewMode === 'PROJECTS' ? THEME : '#FFFFFF'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeToggleBtnText,
                viewMode === 'PROJECTS' && styles.modeToggleBtnTextActive,
              ]}
            >
              All Projects ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeToggleBtn, viewMode === 'MY_TASKS' && styles.modeToggleBtnActive]}
            onPress={() => setViewMode('MY_TASKS')}
            activeOpacity={0.8}
          >
            <ListTodo
              size={14}
              color={viewMode === 'MY_TASKS' ? THEME : '#FFFFFF'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.modeToggleBtnText,
                viewMode === 'MY_TASKS' && styles.modeToggleBtnTextActive,
              ]}
            >
              My Tasks ({assignedTasks.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── MAIN BODY (Fills full remaining screen with BG_COLOR) ─── */}
      <View style={styles.bodyContainer}>
        {/* ─── 2. SEARCH & FILTER SECTION ─── */}
        <View style={styles.filterSection}>
          {viewMode === 'PROJECTS' ? (
            <>
              {/* Search Input for Projects */}
              <View style={styles.searchBarWrapper}>
                <Search size={17} color="#64748B" style={styles.mr8} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search"
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  selectionColor={THEME}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Horizontal Status Pills for Projects */}
              <View style={styles.tabsRow}>
                <FlatList
                  data={STATUS_FILTERS}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.value}
                  contentContainerStyle={styles.tabsList}
                  renderItem={({ item }) => {
                    const isActive = activeTab === item.value;
                    return (
                      <TouchableOpacity
                        style={[styles.tabPill, isActive && styles.tabPillActive]}
                        onPress={() => setActiveTab(item.value)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[styles.tabPillText, isActive && styles.tabPillTextActive]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </>
          ) : (
            /* Task Status Pills for My Tasks (API 12) */
            <View style={styles.tabsRow}>
              <FlatList
                data={TASK_STATUS_FILTERS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.value}
                contentContainerStyle={styles.tabsList}
                renderItem={({ item }) => {
                  const isActive = taskFilter === item.value;
                  return (
                    <TouchableOpacity
                      style={[styles.tabPill, isActive && styles.tabPillActive]}
                      onPress={() => setTaskFilter(item.value)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[styles.tabPillText, isActive && styles.tabPillTextActive]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        </View>

        {/* ─── 3. CONTENT LIST ─── */}
        {viewMode === 'PROJECTS' ? (
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME} />
              <Text style={styles.loadingText}>Loading projects & jobs...</Text>
            </View>
          ) : displayedProjects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Briefcase size={36} color={THEME} />
              </View>
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptyDesc}>
                {activeTab !== 'ALL' || searchQuery
                  ? 'No projects match your search or filter criteria.'
                  : company?.name || company?.companyName
                  ? `No projects yet for ${company.name || company.companyName}. Create one to get started!`
                  : 'Create production batches, export jobs, and work orders to track stages and milestones.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() =>
                  onNavigate('CreateProject', {
                    company,
                    companyId: effectiveCompanyId,
                    user,
                  })
                }
                activeOpacity={0.88}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.6} style={styles.mr6} />
                <Text style={styles.emptyCreateBtnText}>Create Project</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={displayedProjects}
              keyExtractor={(item) => item._id}
              renderItem={renderProjectCard}
              style={styles.flatList}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />
              }
            />
          )
        ) : tasksLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME} />
            <Text style={styles.loadingText}>Loading your assigned tasks...</Text>
          </View>
        ) : assignedTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ListTodo size={36} color={THEME} />
            </View>
            <Text style={styles.emptyTitle}>No Tasks Assigned</Text>
            <Text style={styles.emptyDesc}>
              You currently have no tasks assigned to you in active projects.
            </Text>
          </View>
        ) : (
          <FlatList
            data={assignedTasks}
            keyExtractor={(item, index) => item.taskId || String(index)}
            renderItem={renderAssignedTaskItem}
            style={styles.flatList}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME,
  },
  heroHeader: {
    backgroundColor: THEME,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#C7D2FE',
    marginTop: 2,
    fontWeight: '500',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME,
  },

  /* Stats Strip */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#C7D2FE',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  /* Body Container filling screen */
  bodyContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },

  /* Filters & Search */
  filterSection: {
    backgroundColor: BG_COLOR,
    paddingTop: 14,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 4,
  },
  mr8: {
    marginRight: 8,
  },
  mr6: {
    marginRight: 6,
  },
  tabsRow: {
    marginTop: 6,
    marginBottom: 6,
  },
  tabsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: THEME,
    borderColor: THEME,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },

  /* Project List & Cards */
  flatList: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    backgroundColor: BG_COLOR,
    flexGrow: 1,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  jobCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4,
  },
  projectDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },

  /* Progress */
  progressContainer: {
    marginTop: 4,
    marginBottom: 10,
  },
  progressHeaderRow: {
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
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME,
    borderRadius: 3,
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateMetaCol: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  companyText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    maxWidth: 160,
  },
  mr4: {
    marginRight: 4,
  },
  managerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  managerAvatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  managerName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },

  /* Loading & Empty States */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG_COLOR,
    gap: 12,
  },
  loadingText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: BG_COLOR,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    elevation: 3,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  /* Mode Toggle Strip */
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 12,
    padding: 3,
    marginTop: 12,
    gap: 4,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  modeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  modeToggleBtnTextActive: {
    color: THEME,
  },

  /* Task Cards (Worker View - API 12) */
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todoDotMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748B',
  },
  taskStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityMiniBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  taskTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskBreadcrumbRow: {
    marginBottom: 6,
  },
  taskBreadcrumbText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  taskDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  taskDueText: {
    fontSize: 11,
    color: '#64748B',
  },
  taskCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  taskProjectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  taskProjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  taskProjectJobCode: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME,
  },
  taskProjectTitle: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
});

export default ProjectsList;
