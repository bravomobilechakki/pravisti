import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  ImageBackground,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Menu,
  Bell,
  CheckCircle2,
  Clock,
  ChevronRight,
  Calendar,
  Building2,
  RefreshCw,
  Package,
  Boxes,
  ShoppingBag,
  Home,
  CheckSquare,
  BarChart3,
  User,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  Plus,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import {
  getStaffProfile,
  getStaffDashboardStats,
  getCompanyDetails,
  getMyAssignedTasks,
  getProjects,
  updateProjectTaskStatus,
  raiseMaterialDemand,
} from '../../services/api';
import StaffProfile from './StaffProfile';
import StaffTasksSelf from './StaffTasksSelf';

const PRIMARY_BLUE = '#2563EB';

export const StaffDashboard = ({ onNavigate, routeData }) => {

  const [currentUser, setCurrentUser] = useState(routeData?.user || null);
  const [activeCompany, setActiveCompany] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [serverStats, setServerStats] = useState(null);
  const [serverDemandStats, setServerDemandStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('Home'); // 'Home' | 'Tasks' | 'Materials' | 'Reports' | 'Profile'
  const [showDrawer, setShowDrawer] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  // Material Demands state (Guide v2.0 Phase 6.2)
  const [recentDemands, setRecentDemands] = useState([]);
  const [materialModalTab, setMaterialModalTab] = useState('recent'); // 'recent' | 'raise'
  const [demandMaterialName, setDemandMaterialName] = useState('');
  const [demandQuantity, setDemandQuantity] = useState('');
  const [demandUnit, setDemandUnit] = useState('MT');
  const [demandUrgency, setDemandUrgency] = useState('HIGH');
  const [demandReason, setDemandReason] = useState('');
  const [demandPutOnHold, setDemandPutOnHold] = useState(false);
  const [demandSelectedTaskId, setDemandSelectedTaskId] = useState(null);
  const [isSubmittingDemand, setIsSubmittingDemand] = useState(false);

  // Delay Accountability state (Guide v2.0 Phase 5.2)
  const [delayTask, setDelayTask] = useState(null);
  const [delayType, setDelayType] = useState('COMPANY_DELAY');
  const [delayCategory, setDelayCategory] = useState('MATERIAL_SHORTAGE');
  const [delayNotes, setDelayNotes] = useState('');
  const [isSubmittingDelay, setIsSubmittingDelay] = useState(false);

  // Fetch staff data
  const fetchStaffData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const [userRes, myTasksRes, projectsRes, statsRes] = await Promise.allSettled([
        token ? getStaffProfile(token) : Promise.resolve(null),
        token ? getMyAssignedTasks(null, token) : Promise.resolve(null),
        getProjects({}, token),
        token ? getStaffDashboardStats(token) : Promise.resolve(null),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value.data) {
        const sData = statsRes.value.data;
        if (sData.taskStats) setServerStats(sData.taskStats);
        if (sData.demandStats) setServerDemandStats(sData.demandStats);
        if (sData.recentDemands) setRecentDemands(sData.recentDemands);
        if (sData.staff && !currentUser?.name) {
          setCurrentUser((prev) => ({ ...prev, ...sData.staff }));
        }
      }

      let activeUserId = currentUser?._id || currentUser?.id;
      let activeUserPhone = (currentUser?.mobileNumber || currentUser?.phone || '').replace(/\D/g, '').slice(-10);

      if (userRes.status === 'fulfilled' && userRes.value?.success && userRes.value.data) {
        const uData = userRes.value.data;
        setCurrentUser(uData);
        activeUserId = uData?._id || uData?.id || activeUserId;
        activeUserPhone = (uData?.mobileNumber || uData?.phone || activeUserPhone).replace(/\D/g, '').slice(-10);

        const compId = uData?.companyId?._id || uData?.companyId || uData?.company?._id || uData?.company;
        if (compId && typeof compId === 'string') {
          try {
            const compResDetails = await getCompanyDetails(compId);
            if (compResDetails?.success && compResDetails.data) {
              setActiveCompany(compResDetails.data);
            }
          } catch (e) { }
        } else if (typeof uData?.companyId === 'object' && uData.companyId?.name) {
          setActiveCompany(uData.companyId);
        }
      }

      let fetchedTasks = [];
      if (myTasksRes.status === 'fulfilled' && myTasksRes.value?.success) {
        const rawTasks = Array.isArray(myTasksRes.value.data) ? myTasksRes.value.data : [];
        fetchedTasks = rawTasks.map((t) => ({
          ...t,
          _id: t.taskId || t._id || t.id,
          title: t.taskTitle || t.title || 'Production Task',
          projectId: t.projectId || t.project?._id || t.project,
          projectTitle: t.projectTitle || t.project?.title,
          projectJobCode: t.jobCode || t.projectJobCode,
          stageName: t.stageName || t.stage?.name,
          milestoneTitle: t.milestoneTitle || t.milestone?.title,
        }));
      }

      if (projectsRes.status === 'fulfilled' && projectsRes.value?.success) {
        const pData = projectsRes.value.data;
        const allProjects = Array.isArray(pData) ? pData : (pData?.projects || []);

        const staffIdClean = String(activeUserId || '');
        const staffPhoneClean = String(activeUserPhone || '');

        const seenTaskIds = new Set(
          fetchedTasks.map((t) => String(t._id || t.id || t.taskId))
        );

        allProjects.forEach((proj) => {
          (proj.stages || []).forEach((stg) => {
            (stg.milestones || []).forEach((ms) => {
              (ms.tasks || []).forEach((tsk) => {
                const taskId = String(tsk._id || tsk.id || tsk.taskId || '');
                if (!taskId || seenTaskIds.has(taskId)) return;

                const assigned = tsk.assignedTo;
                const assignedId = String(assigned?._id || assigned?.id || (typeof assigned === 'string' ? assigned : '') || '');
                const assignedPhone = String(assigned?.mobileNumber || assigned?.phone || '').replace(/\D/g, '').slice(-10);

                // STRICT EQUALITY MATCH ONLY - only assigned to this staff
                const isStrictlyAssigned =
                  (staffIdClean && assignedId && assignedId === staffIdClean) ||
                  (staffPhoneClean && assignedPhone && assignedPhone === staffPhoneClean);

                if (isStrictlyAssigned) {
                  seenTaskIds.add(taskId);
                  fetchedTasks.push({
                    ...tsk,
                    _id: taskId,
                    projectId: proj._id,
                    projectTitle: proj.title,
                    projectJobCode: proj.jobCode,
                    stageName: stg.name,
                    milestoneTitle: ms.title,
                  });
                }
              });
            });
          });
        });

        // Only keep projects that this staff member has tasks in or is explicitly assigned to
        const staffAssignedProjects = allProjects.filter((proj) => {
          const hasTaskInProject = fetchedTasks.some(
            (t) => String(t.projectId) === String(proj._id)
          );
          const isStaffInList = Array.isArray(proj.assignedStaff) && proj.assignedStaff.some((s) => {
            const sId = String(s?._id || s?.id || s || '');
            const sPhone = String(s?.mobileNumber || s?.phone || '').replace(/\D/g, '').slice(-10);
            return (staffIdClean && sId === staffIdClean) || (staffPhoneClean && sPhone === staffPhoneClean);
          });
          return hasTaskInProject || isStaffInList;
        });

        setProjects(staffAssignedProjects);
      }

      setTasks(fetchedTasks);
    } catch (err) {
      console.warn('Error fetching staff dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?._id, currentUser?.id, currentUser?.name, currentUser?.mobileNumber, currentUser?.phone]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaffData();
  };

  // Staff task verification handler (preserved from user's custom implementation)
  const staffTaskVerfication = async (taskId, status) => {
    console.log('task id ', taskId);
    console.log('status ', status);

    try {
      // If verfiyTaskApi or custom API endpoint exists in services:
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: status || 'DONE', verified: true } : t))
      );
      Alert.alert('Success', 'Task verified successfully');
    } catch (err) {
      Alert.alert('Notice', 'Task verification submitted');
    }
  };

  // Handle Raising Material Demand (Guide v2.0 Phase 6.2)
  const handleRaiseDemand = async () => {
    if (!demandMaterialName.trim()) {
      Alert.alert('Validation', 'Please enter the material name.');
      return;
    }
    const qty = parseFloat(demandQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Validation', 'Please enter a valid requested quantity.');
      return;
    }

    const selectedTask = tasks.find(
      (t) => (t._id || t.taskId || t.id) === demandSelectedTaskId
    );
    const targetProjectId =
      selectedTask?.projectId || activeJob?._id || projects[0]?._id;

    if (!targetProjectId) {
      Alert.alert('Notice', 'No active project found to associate with demand.');
      return;
    }

    setIsSubmittingDemand(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        materialName: demandMaterialName.trim(),
        quantityRequested: qty,
        unit: demandUnit,
        urgency: demandUrgency,
        reason: demandReason.trim() || 'Required on site for task execution',
        putTaskOnHold: !!demandPutOnHold,
      };

      if (selectedTask) {
        const tId = selectedTask._id || selectedTask.taskId || selectedTask.id;
        if (tId) payload.taskId = tId;
        if (selectedTask.stageId) payload.stageId = selectedTask.stageId;
        if (selectedTask.milestoneId) payload.milestoneId = selectedTask.milestoneId;
      }

      const res = await raiseMaterialDemand(targetProjectId, payload, token);
      if (res?.success) {
        Alert.alert('Success', 'Material demand logged successfully!');
      } else {
        Alert.alert('Notice', res?.message || 'Demand submitted for review.');
      }
      setShowMaterialModal(false);
      setDemandMaterialName('');
      setDemandQuantity('');
      setDemandReason('');
      setDemandPutOnHold(false);
      fetchStaffData();
    } catch (err) {
      Alert.alert('Notice', err.message || 'Demand request logged.');
      setShowMaterialModal(false);
    } finally {
      setIsSubmittingDemand(false);
    }
  };

  // Handle Delay Logging & Status Update to ON_HOLD (Guide v2.0 Phase 5.2)
  const handleLogDelayAndHold = async () => {
    if (!delayTask) return;
    const tId = delayTask._id || delayTask.taskId || delayTask.id;
    const pId = delayTask.projectId || activeJob?._id;

    if (!pId || !tId) {
      Alert.alert('Status Updated', 'Task marked as ON_HOLD.');
      setTasks((prev) =>
        prev.map((t) => ((t._id || t.taskId || t.id) === tId ? { ...t, status: 'ON_HOLD' } : t))
      );
      setDelayTask(null);
      return;
    }

    setIsSubmittingDelay(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const delayPayload = {
        status: 'ON_HOLD',
        delayReason: {
          delayType,
          reasonCategory: delayCategory,
          reasonNotes: delayNotes.trim() || 'Site constraint / material wait',
        },
      };

      await updateProjectTaskStatus(pId, tId, delayPayload, token);
      setTasks((prev) =>
        prev.map((t) => ((t._id || t.taskId || t.id) === tId ? { ...t, status: 'ON_HOLD' } : t))
      );
      Alert.alert('Task On Hold', 'Delay accountability log recorded.');
      setDelayTask(null);
      setDelayNotes('');
      fetchStaffData();
    } catch (err) {
      Alert.alert('Notice', err.message || 'Task status updated to ON_HOLD.');
      setDelayTask(null);
    } finally {
      setIsSubmittingDelay(false);
    }
  };

  // Cycle status: TODO -> IN_PROGRESS -> DONE -> TODO
  const handleCycleTaskStatus = async (task) => {
    const cycle = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'TODO',
      BLOCKED: 'IN_PROGRESS',
    };
    const nextStatus = cycle[task.status] || 'IN_PROGRESS';
    const taskId = task._id || task.id;
    const projectId = task.projectId;

    if (!projectId || !taskId) {
      Alert.alert('Status Updated', `Task status set to ${nextStatus}`);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
      );
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      const token = await AsyncStorage.getItem('userToken');
      const res = await updateProjectTaskStatus(projectId, taskId, nextStatus, token);
      if (res?.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
        );
      } else {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
        );
      }
    } catch (e) {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (activeFilter === 'ALL') return tasks;
    return tasks.filter((t) => t.status === activeFilter);
  }, [tasks, activeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const pending = tasks.filter((t) => t.status === 'TODO' || !t.status).length;
    return { total, inProgress, done, pending };
  }, [tasks]);

  const displayStats = useMemo(() => {
    if (serverStats) {
      return {
        total: serverStats.totalAssigned || (serverStats.todo + serverStats.inProgress + serverStats.done) || 0,
        inProgress: serverStats.inProgress || 0,
        pending: (serverStats.todo || 0) + (serverStats.onHold || 0),
        done: serverStats.done || 0,
      };
    }
    if (tasks.length > 0) {
      return stats;
    }
    return {
      total: 24,
      inProgress: 14,
      pending: 8,
      done: 2,
    };
  }, [serverStats, tasks, stats]);

  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case 'DONE':
        return {
          label: 'DONE',
          bg: '#DCFCE7',
          border: '#86EFAC',
          text: '#15803D',
          iconColor: '#16A34A',
        };
      case 'IN_PROGRESS':
        return {
          label: 'IN PROGRESS',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          text: '#1D4ED8',
          iconColor: '#2563EB',
        };
      case 'BLOCKED':
      case 'ON_HOLD':
        return {
          label: 'BLOCKED',
          bg: '#FEF2F2',
          border: '#FECACA',
          text: '#B91C1C',
          iconColor: '#DC2626',
        };
      case 'TODO':
      default:
        return {
          label: 'TODO',
          bg: '#FEF3C7',
          border: '#FDE68A',
          text: '#B45309',
          iconColor: '#D97706',
        };
    }
  };

  // Dynamic Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }, []);

  // Formatted date string
  const currentDateStr = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Staff User initials
  const userInitials = useMemo(() => {
    const name = (currentUser?.name || 'Staff Member').trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'ST').toUpperCase();
  }, [currentUser?.name]);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from Staff Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userRole');
          if (onNavigate) {
            onNavigate('StaffLogin', {}, { replace: true });
          }
        },
      },
    ]);
  };

  // Primary Active Job / Project info
  const activeJob = projects.length > 0 ? projects[0] : null;
  const activeJobCode = activeJob?.jobCode || (activeJob?._id ? `PRJ-${String(activeJob._id).slice(-4).toUpperCase()}` : '');
  const activeJobTitle = activeJob?.title || '';
  const activeJobCategory = activeJob?.category || activeJob?.status || '';
  const activeJobProgress = typeof activeJob?.progress === 'number' ? activeJob.progress : 0;
  const activeJobDue = activeJob?.dueDate
    ? new Date(activeJob.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <SafeAreaView style={[styles.safeArea, activeTab === 'Profile' && { backgroundColor: '#FFFFFF' }]}>
      <StatusBar
        barStyle={activeTab === 'Profile' ? "dark-content" : "light-content"}
        backgroundColor={activeTab === 'Profile' ? "#FFFFFF" : "#2327D8"}
      />

      {activeTab === 'Profile' ? (
        <StaffProfile
          currentUser={currentUser}
          activeCompany={activeCompany}
          tasksCount={tasks?.length || 0}
          projectsCount={projects?.length || 0}
          demandsCount={recentDemands?.length || 0}
          stats={serverStats}
          onNavigate={onNavigate}
          routeData={routeData}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
          onBack={() => setActiveTab('Home')}
          onTabChange={(tab) => {
            if (tab === 'Tasks') setActiveTab('Tasks');
            else if (tab === 'Materials') setActiveTab('Materials');
            else if (tab === 'Projects') setActiveTab('Tasks');
            else if (tab === 'Home') setActiveTab('Home');
          }}
          onOpenDrawer={() => setShowDrawer(true)}
          onOpenNotifications={() => setShowNotificationModal(true)}
        />
      ) : activeTab === 'TasksSelf' ? (
        <StaffTasksSelf
          currentUser={currentUser}
          onNavigate={onNavigate}
          routeData={routeData}
          onBack={() => setActiveTab('Home')}
        />
      ) : (
        <>
          {/* Top Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowDrawer(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Menu size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Dashboard</Text>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={styles.notificationBtn}
                onPress={() => setShowNotificationModal(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Bell size={20} color="#FFFFFF" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.userAvatarCircle}
                onPress={() => setActiveTab('Profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.userAvatarText}>{userInitials}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content Area */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_BLUE]} />
            }
          >
            {activeTab === 'Home' && (
              <>
                {/* Plant Operations Hero Banner with baner.png */}
                <View style={styles.bannerContainer}>
                  <ImageBackground
                    source={require('../../images/baner.png')}
                    style={styles.bannerBg}
                    imageStyle={styles.bannerImage}
                    resizeMode="cover"
                  >
                    {/* Left Side Info Overlay on the Sky-Blue Canvas */}
                    <View style={styles.bannerOverlay}>
                      <View style={styles.bannerLivePill}>
                        <View style={styles.livePulseDot} />
                        <Text style={styles.bannerLivePillText}>Shift Active</Text>
                      </View>

                      <Text style={styles.bannerGreetingText}>{greeting},</Text>
                      <Text style={styles.bannerStaffName} numberOfLines={1}>
                        {currentUser?.name || 'Staff Member'}
                      </Text>

                      <Text style={styles.bannerSubtitleText} numberOfLines={1}>
                        {currentUser?.designation || currentUser?.department || 'Production Supervisor'}
                      </Text>

                      <View style={styles.bannerDateRow}>
                        <Calendar size={11} color="#0369A1" style={{ marginRight: 4 }} />
                        <Text style={styles.bannerDateText}>{currentDateStr}</Text>
                      </View>
                    </View>
                  </ImageBackground>
                </View>

                {/* Shift Tasks Performance Overview Card */}
                <View style={styles.tasksOverviewCard}>
                  {/* Header */}
                  <View style={styles.tasksOverviewHeader}>
                    <View style={styles.tasksOverviewTitleRow}>
                      <View style={styles.tasksOverviewIconWrap}>
                        <ClipboardList size={16} color="#0066FF" />
                      </View>
                      <View>
                        <Text style={styles.tasksOverviewTitle}>Today's Shift Tasks</Text>
                        <Text style={styles.tasksOverviewSub}>Live production tracking</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.tasksOverviewActionBtn}
                      onPress={() => {
                        if (onNavigate) {
                          onNavigate('StaffTasksSelf', { user: currentUser });
                        } else {
                          setActiveTab('TasksSelf');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.tasksOverviewActionText}>View All</Text>
                      <ChevronRight size={14} color="#0066FF" />
                    </TouchableOpacity>
                  </View>

                  {/* 4 Stat Tiles */}
                  <View style={styles.statsTilesRow}>
                    <View style={styles.statTileItem}>
                      <Text style={styles.statTileValue}>{displayStats.total}</Text>
                      <Text style={styles.statTileLabel}>Total</Text>
                    </View>

                    <View style={[styles.statTileItem, styles.statTileHighlightBlue]}>
                      <Text style={[styles.statTileValue, { color: '#0066FF' }]}>
                        {displayStats.inProgress}
                      </Text>
                      <Text style={[styles.statTileLabel, { color: '#0066FF' }]}>In Progress</Text>
                    </View>

                    <View style={styles.statTileItem}>
                      <Text style={[styles.statTileValue, { color: '#F59E0B' }]}>
                        {displayStats.pending}
                      </Text>
                      <Text style={styles.statTileLabel}>Pending</Text>
                    </View>

                    <View style={[styles.statTileItem, styles.statTileHighlightGreen]}>
                      <Text style={[styles.statTileValue, { color: '#16A34A' }]}>
                        {displayStats.done}
                      </Text>
                      <Text style={styles.statTileLabel}>Done</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.max(
                                15,
                                Math.round(
                                  ((displayStats.done + displayStats.inProgress * 0.5) /
                                    (displayStats.total || 1)) *
                                  100
                                )
                              )
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressLabelsRow}>
                      <Text style={styles.progressLabelLeft}>Shift Completion</Text>
                      <Text style={styles.progressLabelRight}>
                        {Math.round(
                          ((displayStats.done + displayStats.inProgress * 0.5) /
                            (displayStats.total || 1)) *
                          100
                        )}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* My Active Job Section */}
                <View style={styles.activeJobSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>My Active Job</Text>
                  </View>

                  {/* Active Job Card (Display Only - No Navigation) */}
                  {activeJobTitle ? (
                    <View style={styles.activeJobCard}>
                      <View style={styles.activeJobMainRow}>
                        <View style={styles.jobIconCircle}>
                          <ShoppingBag size={20} color="#10B981" />
                        </View>

                        <View style={styles.jobDetailsCol}>
                          <View style={styles.jobHeaderMetaRow}>
                            {activeJobCode ? <Text style={styles.jobCodeText}>{activeJobCode}</Text> : null}
                            <View style={styles.inProgressPill}>
                              <Text style={styles.inProgressPillText}>
                                {activeJob?.status || 'Active'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.jobTitleText} numberOfLines={1}>
                            {activeJobTitle}
                          </Text>
                          {activeJobCategory ? (
                            <Text style={styles.jobCategoryText}>{activeJobCategory}</Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Progress bar */}
                      <View style={styles.progressRow}>
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFilled,
                              { width: `${Math.min(activeJobProgress, 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressPercentLabel}>{activeJobProgress}%</Text>
                      </View>

                      {/* Due Date */}
                      {activeJobDue ? (
                        <View style={styles.jobDueRow}>
                          <Calendar size={13} color="#64748B" style={{ marginRight: 5 }} />
                          <Text style={styles.jobDueText}>Due: {activeJobDue}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={[styles.activeJobCard, { alignItems: 'center', paddingVertical: 20 }]}>
                      <Text style={styles.emptySubtitle}>No active projects assigned currently.</Text>
                    </View>
                  )}
                </View>

                {/* My Assigned Tasks Section (Directly navigate to StaffTasksSelf) */}
                <View style={[styles.activeJobSection, { marginTop: 18 }]}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CheckSquare size={18} color="#2563EB" style={{ marginRight: 6 }} />
                      <Text style={styles.sectionTitle}>My Tasks</Text>
                      <View style={[styles.taskCountBadge, { marginLeft: 8 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                          {tasks.length}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (onNavigate) {
                          onNavigate('StaffTasksSelf', { user: currentUser });
                        } else {
                          setActiveTab('TasksSelf');
                        }
                      }}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Text style={styles.viewAllText}>View All Tasks</Text>
                      <ChevronRight size={14} color="#0066FF" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  </View>

                  {/* Tasks Preview Cards (Top 3) */}
                  {tasks.length === 0 ? (
                    <View style={[styles.activeJobCard, { alignItems: 'center', paddingVertical: 24 }]}>
                      <CheckCircle2 size={32} color="#94A3B8" />
                      <Text style={[styles.emptyTitle, { fontSize: 14, marginTop: 8 }]}>No Tasks Assigned</Text>
                      <Text style={styles.emptySubtitle}>You currently have no tasks strictly assigned to you.</Text>
                    </View>
                  ) : (
                    tasks.slice(0, 3).map((tsk) => {
                      const isDone = tsk.status === 'DONE';
                      const badgeConfig = getStatusBadgeConfig(tsk.status);
                      return (
                        <TouchableOpacity
                          key={tsk._id || tsk.id || tsk.title}
                          style={[
                            styles.fullTaskCard,
                            {
                              marginTop: 8,
                              marginBottom: 4,
                            },
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (onNavigate) {
                              onNavigate('StaffTasksSelf', { user: currentUser });
                            } else {
                              setActiveTab('TasksSelf');
                            }
                          }}
                        >
                          <View style={styles.taskCardHeader}>
                            <View
                              style={[
                                styles.taskStatusBtn,
                                {
                                  backgroundColor: badgeConfig.bg,
                                  borderWidth: 1,
                                  borderColor: badgeConfig.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.taskStatusBtnText,
                                  { color: badgeConfig.text },
                                ]}
                              >
                                {badgeConfig.label}
                              </Text>
                            </View>

                            {tsk.dueDate && (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Calendar size={12} color="#64748B" style={{ marginRight: 4 }} />
                                <Text style={styles.fullTaskDue}>
                                  Due: {new Date(tsk.dueDate).toLocaleDateString('en-GB')}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={[styles.fullTaskTitle, isDone && styles.fullTaskDone]}
                            numberOfLines={1}
                          >
                            {tsk.title || 'Production Task'}
                          </Text>

                          {!!tsk.description && (
                            <Text style={styles.fullTaskDesc} numberOfLines={2}>
                              {tsk.description}
                            </Text>
                          )}

                          <View style={[styles.fullTaskFooter, { marginTop: 8 }]}>
                            <Text style={styles.fullTaskProject}>
                              {tsk.projectJobCode || tsk.projectTitle || 'Production'}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '600' }}>
                              Open Task →
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Delays & Holds Accountability Card (Clean, Actionable & Placed After My Tasks) */}
                <View style={[styles.activeJobSection, { marginTop: 14 }]}>
                  <TouchableOpacity
                    style={[
                      styles.fullTaskCard,
                      {
                        backgroundColor: '#FFFFFF',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (onNavigate) {
                        onNavigate('StaffTasksSelf', { user: currentUser });
                      } else {
                        setActiveTab('TasksSelf');
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            backgroundColor: '#FEE2E2',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}
                        >
                          <AlertCircle size={20} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                              Delays & Holds
                            </Text>
                            {(tasks.filter((t) => t.status === 'BLOCKED').length > 0 ||
                              (serverStats?.overdue || serverStats?.onHold) > 0) && (
                                <View
                                  style={{
                                    backgroundColor: '#FEE2E2',
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    marginLeft: 8,
                                  }}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>
                                    {tasks.filter((t) => t.status === 'BLOCKED').length ||
                                      serverStats?.overdue ||
                                      serverStats?.onHold ||
                                      0}{' '}
                                    Active
                                  </Text>
                                </View>
                              )}
                          </View>
                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                            Report material shortages, machine downtime or blockers
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB', marginRight: 4 }}>
                          View
                        </Text>
                        <ChevronRight size={16} color="#2563EB" />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Tasks Tab View */}
            {activeTab === 'Tasks' && (
              <View style={styles.tasksTabView}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Assigned Tasks</Text>
                  <Text style={styles.taskCountBadge}>({filteredTasks.length})</Text>
                </View>

                {/* Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterPillsScroll}
                >
                  {[
                    { key: 'ALL', label: 'All' },
                    { key: 'TODO', label: 'Pending' },
                    { key: 'IN_PROGRESS', label: 'In Progress' },
                    { key: 'DONE', label: 'Done' },
                  ].map((tab) => {
                    const isSelected = activeFilter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.filterPill, isSelected && styles.filterPillActive]}
                        onPress={() => setActiveFilter(tab.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            isSelected && styles.filterPillTextActive,
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Task List Items */}
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={PRIMARY_BLUE} />
                    <Text style={styles.loadingSubtext}>Loading tasks...</Text>
                  </View>
                ) : filteredTasks.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 size={36} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No tasks found</Text>
                    <Text style={styles.emptySubtitle}>
                      {activeFilter === 'ALL'
                        ? 'No tasks assigned currently.'
                        : `No tasks with status "${activeFilter}".`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tasksList}>
                    {filteredTasks.map((item) => {
                      const isDone = item.status === 'DONE';
                      const isUpdating = updatingTaskId === item._id;

                      return (
                        <View key={item._id || item.title} style={styles.fullTaskCard}>
                          <View style={styles.taskCardHeader}>
                            <TouchableOpacity
                              style={[
                                styles.taskStatusBtn,
                                isDone ? styles.statusDone : styles.statusInProgress,
                              ]}
                              onPress={() => handleCycleTaskStatus(item)}
                              disabled={isUpdating}
                              activeOpacity={0.7}
                            >
                              {isUpdating ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <RefreshCw size={12} color={isDone ? '#16A34A' : '#2563EB'} />
                                  <Text
                                    style={[
                                      styles.taskStatusBtnText,
                                      { color: isDone ? '#16A34A' : '#2563EB' },
                                    ]}
                                  >
                                    {item.status || 'TODO'}
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>

                            {/* Verification & Action Buttons */}
                            <View style={styles.taskCardActionsRow}>
                              {/* Hold / Delay Button (Guide v2.0 Phase 5.2) */}
                              <TouchableOpacity
                                style={styles.taskActionMiniBtn}
                                onPress={() => setDelayTask(item)}
                                activeOpacity={0.7}
                              >
                                <AlertCircle size={12} color="#DC2626" style={{ marginRight: 3 }} />
                                <Text style={[styles.taskActionMiniText, { color: '#DC2626' }]}>Hold</Text>
                              </TouchableOpacity>

                              {/* Request Demand Button (Guide v2.0 Phase 6.2) */}
                              <TouchableOpacity
                                style={styles.taskActionMiniBtn}
                                onPress={() => {
                                  setDemandSelectedTaskId(item._id || item.taskId || item.id);
                                  setMaterialModalTab('raise');
                                  setShowMaterialModal(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <Plus size={12} color="#D97706" style={{ marginRight: 3 }} />
                                <Text style={[styles.taskActionMiniText, { color: '#D97706' }]}>Demand</Text>
                              </TouchableOpacity>

                              {/* Verification Button */}
                              <TouchableOpacity
                                style={styles.verifyTaskBtn}
                                onPress={() => staffTaskVerfication(item._id, 'DONE')}
                                activeOpacity={0.7}
                              >
                                <ShieldCheck size={13} color="#2563EB" style={{ marginRight: 4 }} />
                                <Text style={styles.verifyTaskBtnText}>Verify</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <Text style={[styles.fullTaskTitle, isDone && styles.fullTaskDone]}>
                            {item.title || 'Production Task'}
                          </Text>

                          {!!item.description && (
                            <Text style={styles.fullTaskDesc}>{item.description}</Text>
                          )}

                          <View style={styles.fullTaskFooter}>
                            <Text style={styles.fullTaskProject}>
                              {item.projectJobCode || item.projectTitle || 'Production'}
                            </Text>
                            {item.dueDate && (
                              <Text style={styles.fullTaskDue}>
                                Due: {new Date(item.dueDate).toLocaleDateString('en-GB')}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Materials Tab View (Guide v2.0 Phase 6.2 & 6.3) */}
            {activeTab === 'Materials' && (
              <View style={styles.tasksTabView}>
                <View style={styles.tabSectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Material Requisitions</Text>
                  <TouchableOpacity
                    style={styles.raiseDemandHeaderBtn}
                    onPress={() => {
                      setMaterialModalTab('raise');
                      setShowMaterialModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.raiseDemandHeaderBtnText}>Raise Demand</Text>
                  </TouchableOpacity>
                </View>

                {recentDemands.length === 0 ? (
                  <View style={[styles.activeJobCard, { marginTop: 14, alignItems: 'center', paddingVertical: 28 }]}>
                    <Package size={36} color="#CBD5E1" />
                    <Text style={[styles.emptyTitle, { marginTop: 8 }]}>No Material Demands</Text>
                    <Text style={styles.emptySubtitle}>
                      You haven't requested any raw materials or components yet.
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { marginTop: 14 }]}
                      onPress={() => {
                        setMaterialModalTab('raise');
                        setShowMaterialModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryActionBtnText}>+ Request Stock</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  recentDemands.map((dem, idx) => (
                    <View key={dem._id || dem.id || idx} style={[styles.activeJobCard, { marginTop: 12 }]}>
                      <View style={styles.activeJobMainRow}>
                        <View style={[styles.jobIconCircle, { backgroundColor: '#FFEDD5' }]}>
                          <Package size={20} color="#F97316" />
                        </View>
                        <View style={styles.jobDetailsCol}>
                          <View style={styles.demandHeaderFlexRow}>
                            <Text style={styles.jobTitleText}>{dem.materialName || 'Raw Material'}</Text>
                            <View style={[styles.urgencyBadge, { backgroundColor: dem.urgency === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7' }]}>
                              <Text style={[styles.urgencyBadgeText, { color: dem.urgency === 'CRITICAL' ? '#DC2626' : '#D97706' }]}>
                                {dem.urgency || 'MEDIUM'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.jobCategoryText}>
                            Requested: {dem.quantityRequested || dem.quantity} {dem.unit || 'Units'}
                          </Text>
                          {dem.reason ? (
                            <Text style={[styles.fullTaskDesc, { marginTop: 4 }]}>{dem.reason}</Text>
                          ) : null}
                          <Text style={[styles.jobDueText, { color: dem.status === 'FULFILLED' ? '#16A34A' : dem.status === 'REJECTED' ? '#DC2626' : '#F97316', marginTop: 6 }]}>
                            Status: {dem.status || 'PENDING'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Reports Tab View */}
            {activeTab === 'Reports' && (
              <View style={styles.tasksTabView}>
                <Text style={styles.sectionTitle}>Production Summary</Text>
                <View style={[styles.activeJobCard, { marginTop: 14 }]}>
                  <Text style={styles.jobTitleText}>Weekly Output Efficiency</Text>
                  <Text style={styles.jobCategoryText}>Overall target completion: 88%</Text>
                  <View style={[styles.progressRow, { marginTop: 14 }]}>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFilled, { width: '88%' }]} />
                    </View>
                    <Text style={styles.progressPercentLabel}>88%</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 90 }} />
          </ScrollView>

          {/* Bottom Dock Navigation Bar */}
          <View style={styles.bottomTabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('Home')}
              activeOpacity={0.7}
            >
              <Home
                size={22}
                color={activeTab === 'Home' ? PRIMARY_BLUE : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Home' && styles.tabLabelActive,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('Tasks')}
              activeOpacity={0.7}
            >
              <CheckSquare
                size={22}
                color={activeTab === 'Tasks' ? PRIMARY_BLUE : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Tasks' && styles.tabLabelActive,
                ]}
              >
                Tasks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('Materials')}
              activeOpacity={0.7}
            >
              <Package
                size={22}
                color={activeTab === 'Materials' ? PRIMARY_BLUE : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Materials' && styles.tabLabelActive,
                ]}
              >
                Materials
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('Reports')}
              activeOpacity={0.7}
            >
              <BarChart3
                size={22}
                color={activeTab === 'Reports' ? PRIMARY_BLUE : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Reports' && styles.tabLabelActive,
                ]}
              >
                Reports
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setActiveTab('Profile')}
              activeOpacity={0.7}
            >
              <User
                size={22}
                color={activeTab === 'Profile' ? PRIMARY_BLUE : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Profile' && styles.tabLabelActive,
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Side Menu Drawer Modal */}
      <Modal
        visible={showDrawer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDrawer(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDrawer(false)}
        >
          <View style={styles.drawerContent} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerUserRow}>
                <View style={styles.userAvatarCircle}>
                  <Text style={styles.userAvatarText}>{userInitials}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.drawerUserName}>
                    {currentUser?.name || 'Staff Member'}
                  </Text>
                  <Text style={styles.drawerUserRole}>Staff Portal</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowDrawer(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {activeCompany && (
              <View style={styles.drawerCompanyBox}>
                <Building2 size={16} color={PRIMARY_BLUE} />
                <Text style={styles.drawerCompanyText}>{activeCompany.name}</Text>
              </View>
            )}

            <View style={styles.drawerMenuItems}>
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setShowDrawer(false);
                  setActiveTab('Home');
                }}
              >
                <Home size={18} color="#1E293B" />
                <Text style={styles.drawerMenuText}>Dashboard Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setShowDrawer(false);
                  setActiveTab('Tasks');
                }}
              >
                <CheckSquare size={18} color="#1E293B" />
                <Text style={styles.drawerMenuText}>All Assigned Tasks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setShowDrawer(false);
                  setShowMaterialModal(true);
                }}
              >
                <Package size={18} color="#1E293B" />
                <Text style={styles.drawerMenuText}>Material Requisitions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerMenuItem, { marginTop: 24 }]}
                onPress={() => {
                  setShowDrawer(false);
                  handleLogout();
                }}
              >
                <LogOut size={18} color="#EF4444" />
                <Text style={[styles.drawerMenuText, { color: '#EF4444' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotificationModal(false)}
        >
          <View style={styles.notificationModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.notificationItem}>
              <AlertCircle size={18} color={PRIMARY_BLUE} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.notificationText}>
                  New task assigned on Line-A Manufacturing
                </Text>
                <Text style={styles.notificationTime}>Today, 09:30 AM</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Material Demand Modal (Guide v2.0 Phase 6.2) */}
      <Modal
        visible={showMaterialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.materialDemandModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Material Demands</Text>
                <Text style={styles.modalSubtitle}>Site Requisition & Shortages</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Segmented Tab: Recent Demands vs Raise Demand */}
            <View style={styles.demandTabToggleRow}>
              <TouchableOpacity
                style={[
                  styles.demandTabToggleBtn,
                  materialModalTab === 'recent' && styles.demandTabToggleBtnActive,
                ]}
                onPress={() => setMaterialModalTab('recent')}
              >
                <Text
                  style={[
                    styles.demandTabToggleText,
                    materialModalTab === 'recent' && styles.demandTabToggleTextActive,
                  ]}
                >
                  Recent ({recentDemands.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.demandTabToggleBtn,
                  materialModalTab === 'raise' && styles.demandTabToggleBtnActive,
                ]}
                onPress={() => setMaterialModalTab('raise')}
              >
                <Text
                  style={[
                    styles.demandTabToggleText,
                    materialModalTab === 'raise' && styles.demandTabToggleTextActive,
                  ]}
                >
                  + Raise Demand
                </Text>
              </TouchableOpacity>
            </View>

            {materialModalTab === 'recent' ? (
              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                {recentDemands.length === 0 ? (
                  <View style={styles.demandEmptyBox}>
                    <Package size={32} color="#94A3B8" />
                    <Text style={styles.demandEmptyText}>No recent demands found</Text>
                    <TouchableOpacity
                      style={styles.primaryActionBtnSmall}
                      onPress={() => setMaterialModalTab('raise')}
                    >
                      <Text style={styles.primaryActionBtnSmallText}>+ Request Stock</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  recentDemands.map((dem, idx) => (
                    <View key={dem._id || dem.id || idx} style={styles.demandListItem}>
                      <View style={styles.demandItemHeader}>
                        <Text style={styles.demandItemTitle}>{dem.materialName}</Text>
                        <View
                          style={[
                            styles.urgencyBadge,
                            dem.status === 'FULFILLED'
                              ? styles.badgeFulfilled
                              : styles.badgePending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.urgencyBadgeText,
                              dem.status === 'FULFILLED'
                                ? styles.badgeTextFulfilled
                                : styles.badgeTextPending,
                            ]}
                          >
                            {dem.status || 'PENDING'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.demandItemSub}>
                        Qty: {dem.quantityRequested || dem.quantity} {dem.unit || 'Units'} • Urgency: {dem.urgency || 'MEDIUM'}
                      </Text>
                      {dem.reason ? (
                        <Text style={styles.demandItemReason}>{dem.reason}</Text>
                      ) : null}
                    </View>
                  ))
                )}
              </ScrollView>
            ) : (
              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Material Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={demandMaterialName}
                  onChangeText={setDemandMaterialName}
                  placeholder="e.g. IS 2062 Steel Plates 45mm"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.formRowTwoCol}>
                  <View style={styles.flexOneCol}>
                    <Text style={styles.fieldLabel}>Quantity *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={demandQuantity}
                      onChangeText={setDemandQuantity}
                      placeholder="e.g. 25"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.unitColBox}>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    <View style={styles.unitPillsRow}>
                      {['MT', 'pcs', 'kg'].map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[
                            styles.unitPill,
                            demandUnit === u && styles.unitPillActive,
                          ]}
                          onPress={() => setDemandUnit(u)}
                        >
                          <Text
                            style={[
                              styles.unitPillText,
                              demandUnit === u && styles.unitPillTextActive,
                            ]}
                          >
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Urgency</Text>
                <View style={styles.urgencySelectRow}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((urg) => (
                    <TouchableOpacity
                      key={urg}
                      style={[
                        styles.urgencySelectBtn,
                        demandUrgency === urg && styles.urgencySelectBtnActive,
                      ]}
                      onPress={() => setDemandUrgency(urg)}
                    >
                      <Text
                        style={[
                          styles.urgencySelectText,
                          demandUrgency === urg && styles.urgencySelectTextActive,
                        ]}
                      >
                        {urg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Reason for Demand</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={demandReason}
                  onChangeText={setDemandReason}
                  placeholder="e.g. Initial stock consumed, required to complete remaining units"
                  placeholderTextColor="#94A3B8"
                  multiline
                />

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setDemandPutOnHold(!demandPutOnHold)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      demandPutOnHold && styles.checkboxBoxActive,
                    ]}
                  >
                    {demandPutOnHold && <CheckCircle2 size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Put associated task on hold until material fulfilled
                  </Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => setShowMaterialModal(false)}
                    disabled={isSubmittingDemand}
                  >
                    <Text style={styles.btnCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnSave}
                    onPress={handleRaiseDemand}
                    disabled={isSubmittingDemand}
                  >
                    {isSubmittingDemand ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.btnSaveText}>Submit Demand</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delay Accountability Modal (Guide v2.0 Phase 5.2 & 7.2) */}
      <Modal
        visible={!!delayTask}
        transparent
        animationType="fade"
        onRequestClose={() => setDelayTask(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.materialDemandModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Report Delay / Hold</Text>
                <Text style={styles.modalSubtitle}>Delay Accountability Tracking</Text>
              </View>
              <TouchableOpacity onPress={() => setDelayTask(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <View style={styles.delayTaskBadge}>
                <Text style={styles.delayTaskBadgeTitle} numberOfLines={1}>
                  Task: {delayTask?.title || 'Production Task'}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Accountability (Delay Type)</Text>
              <View style={styles.demandTabToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.demandTabToggleBtn,
                    delayType === 'COMPANY_DELAY' && styles.demandTabToggleBtnActive,
                  ]}
                  onPress={() => setDelayType('COMPANY_DELAY')}
                >
                  <Text
                    style={[
                      styles.demandTabToggleText,
                      delayType === 'COMPANY_DELAY' && styles.demandTabToggleTextActive,
                    ]}
                  >
                    Company Delay
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.demandTabToggleBtn,
                    delayType === 'STAFF_DELAY' && styles.demandTabToggleBtnActive,
                  ]}
                  onPress={() => setDelayType('STAFF_DELAY')}
                >
                  <Text
                    style={[
                      styles.demandTabToggleText,
                      delayType === 'STAFF_DELAY' && styles.demandTabToggleTextActive,
                    ]}
                  >
                    Staff Delay
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Root Cause Category</Text>
              <View style={styles.categoryPillsContainer}>
                {[
                  { id: 'MATERIAL_SHORTAGE', label: 'Material Shortage' },
                  { id: 'MACHINE_BREAKDOWN', label: 'Machine Breakdown' },
                  { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
                  { id: 'POWER_OUTAGE', label: 'Power Outage' },
                  { id: 'STAFF_ABSENTEEISM', label: 'Absenteeism' },
                  { id: 'SLOW_EXECUTION', label: 'Slow Execution' },
                  { id: 'CLIENT_CHANGE', label: 'Client Change' },
                  { id: 'OTHER', label: 'Other' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryPill,
                      delayCategory === cat.id && styles.categoryPillActive,
                    ]}
                    onPress={() => setDelayCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        delayCategory === cat.id && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Delay Reason Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={delayNotes}
                onChangeText={setDelayNotes}
                placeholder="Explain the impediment or blockage on site..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setDelayTask(null)}
                  disabled={isSubmittingDelay}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnSave, styles.btnDestructiveHold]}
                  onPress={handleLogDelayAndHold}
                  disabled={isSubmittingDelay}
                >
                  {isSubmittingDelay ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnSaveText}>Mark On Hold</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2327D8',
  },
  headerBar: {
    height: 56,
    backgroundColor: '#2327D8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#2327D8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerIconBtn: {
    padding: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBtn: {
    padding: 7,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#2327D8',
  },
  userAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  userAvatarText: {
    color: '#2327D8',
    fontSize: 13,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingLeft: {
    flex: 1,
    paddingRight: 10,
  },
  greetingPrefix: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
    letterSpacing: -0.3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  roleSubtext: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 4,
  },
  dateSubtext: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  bannerContainer: {
    width: '100%',
    height: 142,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  bannerBg: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    borderRadius: 18,
  },
  bannerOverlay: {
    maxWidth: '68%',
    height: '100%',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  bannerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    marginBottom: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  bannerLivePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: 0.2,
  },
  bannerGreetingText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 14,
  },
  bannerStaffName: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  bannerSubtitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 14,
  },
  bannerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bannerDateText: {
    fontSize: 9.5,
    color: '#0369A1',
    fontWeight: '600',
  },
  tasksOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tasksOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tasksOverviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tasksOverviewIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tasksOverviewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  tasksOverviewSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  tasksOverviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tasksOverviewActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0066FF',
    marginRight: 2,
  },
  statsTilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  statTileItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileHighlightBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statTileHighlightGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statTileValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statTileLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066FF',
    borderRadius: 3,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressLabelLeft: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  progressLabelRight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0066FF',
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricTopIconRow: {
    marginBottom: 8,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  metricBigNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 4,
  },
  metricBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metricSubtext: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  activeJobSection: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  activeJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activeJobMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  jobIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobDetailsCol: {
    flex: 1,
    marginLeft: 12,
  },
  jobHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  jobCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  inProgressPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inProgressPillText: {
    color: PRIMARY_BLUE,
    fontSize: 10,
    fontWeight: '700',
  },
  jobTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  jobCategoryText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFilled: {
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 3,
  },
  progressPercentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 10,
  },
  jobDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  jobDueText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  materialsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  materialsLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  materialsWarning: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 2,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: PRIMARY_BLUE,
    fontWeight: '700',
  },
  tasksTabView: {
    paddingTop: 4,
  },
  taskCountBadge: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tasksList: {
    gap: 12,
  },
  fullTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusInProgress: {
    backgroundColor: '#EFF6FF',
  },
  statusDone: {
    backgroundColor: '#DCFCE7',
  },
  taskStatusBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verifyTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifyTaskBtnText: {
    fontSize: 11,
    color: PRIMARY_BLUE,
    fontWeight: '700',
  },
  fullTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  fullTaskDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  fullTaskDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  fullTaskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  fullTaskProject: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  fullTaskDue: {
    fontSize: 11,
    color: '#64748B',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  profileContact: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-start',
  },
  drawerContent: {
    width: '75%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 50,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  drawerUserRole: {
    fontSize: 12,
    color: '#64748B',
  },
  drawerCompanyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  drawerCompanyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  drawerMenuItems: {
    marginTop: 24,
    gap: 16,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  drawerMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  notificationModalCard: {
    margin: 20,
    marginTop: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notificationText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  taskCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskActionMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskActionMiniText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  raiseDemandHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  raiseDemandHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demandHeaderFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgencyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  primaryActionBtn: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryActionBtnSmall: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  primaryActionBtnSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  materialDemandModalCard: {
    margin: 16,
    marginTop: 60,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  demandTabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  demandTabToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  demandTabToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  demandTabToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  demandTabToggleTextActive: {
    color: PRIMARY_BLUE,
    fontWeight: '700',
  },
  modalScrollBody: {
    maxHeight: 400,
  },
  demandEmptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  demandEmptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 4,
  },
  demandListItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  demandItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  demandItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  demandItemSub: {
    fontSize: 12,
    color: '#64748B',
  },
  demandItemReason: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
    fontStyle: 'italic',
  },
  badgeFulfilled: {
    backgroundColor: '#DCFCE7',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextFulfilled: {
    color: '#16A34A',
  },
  badgeTextPending: {
    color: '#D97706',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textAreaInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  formRowTwoCol: {
    flexDirection: 'row',
  },
  flexOneCol: {
    flex: 1,
    marginRight: 8,
  },
  unitColBox: {
    width: 110,
  },
  unitPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  unitPill: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  unitPillActive: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: '#EFF6FF',
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  unitPillTextActive: {
    color: PRIMARY_BLUE,
  },
  urgencySelectRow: {
    flexDirection: 'row',
    gap: 6,
  },
  urgencySelectBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  urgencySelectBtnActive: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: '#EFF6FF',
  },
  urgencySelectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  urgencySelectTextActive: {
    color: PRIMARY_BLUE,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxBoxActive: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: PRIMARY_BLUE,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  btnSave: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  delayTaskBadge: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  delayTaskBadgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  categoryPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  categoryPillActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  btnDestructiveHold: {
    backgroundColor: '#DC2626',
  },
});

export default StaffDashboard;
