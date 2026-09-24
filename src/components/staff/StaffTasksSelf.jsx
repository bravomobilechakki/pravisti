import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Plus,
  ShieldCheck,
  Calendar,
  FolderKanban,
  X,
} from 'lucide-react-native';
import {
  getStaffProfile,
  getMyAssignedTasks,
  getProjects,
  updateProjectTaskStatus,
  raiseMaterialDemand,
} from '../../services/api';

const PRIMARY_BLUE = '#2563EB';

export const StaffTasksSelf = ({ onNavigate, routeData, onBack }) => {
  const [currentUser, setCurrentUser] = useState(routeData?.user || null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Demand Modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [demandSelectedTaskId, setDemandSelectedTaskId] = useState(null);
  const [demandMaterialName, setDemandMaterialName] = useState('');
  const [demandQuantity, setDemandQuantity] = useState('');
  const [demandUnit, setDemandUnit] = useState('MT');
  const [demandUrgency, setDemandUrgency] = useState('HIGH');
  const [demandReason, setDemandReason] = useState('');
  const [demandPutOnHold, setDemandPutOnHold] = useState(false);
  const [isSubmittingDemand, setIsSubmittingDemand] = useState(false);

  // Delay / Hold Modal
  const [delayTask, setDelayTask] = useState(null);
  const [delayType, setDelayType] = useState('COMPANY_DELAY');
  const [delayCategory, setDelayCategory] = useState('MATERIAL_SHORTAGE');
  const [delayNotes, setDelayNotes] = useState('');
  const [isSubmittingDelay, setIsSubmittingDelay] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const [userRes, myTasksRes, projectsRes] = await Promise.allSettled([
        token ? getStaffProfile(token) : Promise.resolve(null),
        token ? getMyAssignedTasks(null, token) : Promise.resolve(null),
        getProjects({}, token),
      ]);

      let activeStaffId = currentUser?._id || currentUser?.id;
      let activeStaffPhone = (currentUser?.mobileNumber || currentUser?.phone || '').replace(/\D/g, '').slice(-10);

      if (userRes.status === 'fulfilled' && userRes.value?.success && userRes.value.data) {
        const u = userRes.value.data;
        setCurrentUser(u);
        activeStaffId = u._id || u.id || activeStaffId;
        activeStaffPhone = (u.mobileNumber || u.phone || activeStaffPhone).replace(/\D/g, '').slice(-10);
      }

      const staffIdClean = String(activeStaffId || '');
      const staffPhoneClean = String(activeStaffPhone || '');

      // 1. Official my-tasks endpoint
      let list = [];
      if (myTasksRes.status === 'fulfilled' && myTasksRes.value?.success) {
        const raw = Array.isArray(myTasksRes.value.data) ? myTasksRes.value.data : [];
        list = raw.map((t) => ({
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

      // 2. Scan projects for STRICTLY assigned tasks only
      if (projectsRes.status === 'fulfilled' && projectsRes.value?.success) {
        const pData = projectsRes.value.data;
        const allProjects = Array.isArray(pData) ? pData : (pData?.projects || []);
        const seen = new Set(list.map((t) => String(t._id || t.id || t.taskId)));

        allProjects.forEach((proj) => {
          (proj.stages || []).forEach((stg) => {
            (stg.milestones || []).forEach((ms) => {
              (ms.tasks || []).forEach((tsk) => {
                const taskId = String(tsk._id || tsk.id || tsk.taskId || '');
                if (!taskId || seen.has(taskId)) return;

                const assigned = tsk.assignedTo;
                const assignedId = String(assigned?._id || assigned?.id || (typeof assigned === 'string' ? assigned : '') || '');
                const assignedPhone = String(assigned?.mobileNumber || assigned?.phone || '').replace(/\D/g, '').slice(-10);

                const isStrictlyAssigned =
                  (staffIdClean && assignedId && assignedId === staffIdClean) ||
                  (staffPhoneClean && assignedPhone && assignedPhone === staffPhoneClean);

                if (isStrictlyAssigned) {
                  seen.add(taskId);
                  list.push({
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
      }

      setTasks(list);
    } catch (err) {
      console.warn('Error fetching staff tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?._id, currentUser?.id, currentUser?.mobileNumber, currentUser?.phone]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

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
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
      );
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      const token = await AsyncStorage.getItem('userToken');
      await updateProjectTaskStatus(projectId, taskId, nextStatus, token);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
      );
    } catch (e) {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleVerifyTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: 'DONE', verified: true } : t))
    );
    Alert.alert('Verified', 'Task marked as verified.');
  };

  const handleRaiseDemand = async () => {
    if (!demandMaterialName.trim()) {
      Alert.alert('Validation', 'Please enter material name.');
      return;
    }
    const qty = parseFloat(demandQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Validation', 'Please enter a valid quantity.');
      return;
    }

    const selTask = tasks.find((t) => String(t._id) === String(demandSelectedTaskId));
    const pId = selTask?.projectId;
    if (!pId) {
      Alert.alert('Error', 'Project reference not found for this task.');
      return;
    }

    try {
      setIsSubmittingDemand(true);
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        materialName: demandMaterialName.trim(),
        quantityRequested: qty,
        unit: demandUnit,
        urgency: demandUrgency,
        reason: demandReason.trim() || undefined,
        putTaskOnHold: demandPutOnHold,
      };

      await raiseMaterialDemand(pId, demandSelectedTaskId, payload, token);
      Alert.alert('Success', 'Material requisition raised successfully.');
      setShowMaterialModal(false);
      setDemandMaterialName('');
      setDemandQuantity('');
      setDemandReason('');
      setDemandPutOnHold(false);
      fetchTasks();
    } catch (err) {
      Alert.alert('Notice', 'Material demand submitted.');
      setShowMaterialModal(false);
    } finally {
      setIsSubmittingDemand(false);
    }
  };

  const handleSubmitDelay = async () => {
    if (!delayTask) return;
    const pId = delayTask.projectId;
    const tId = delayTask._id;
    if (!pId || !tId) return;

    try {
      setIsSubmittingDelay(true);
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        status: 'BLOCKED',
        delayDetails: {
          delayType,
          category: delayCategory,
          notes: delayNotes.trim() || undefined,
        },
      };

      await updateProjectTaskStatus(pId, tId, payload, token);
      setTasks((prev) =>
        prev.map((t) => (t._id === tId ? { ...t, status: 'BLOCKED' } : t))
      );
      Alert.alert('Task On Hold', 'Delay report filed successfully.');
      setDelayTask(null);
      setDelayNotes('');
    } catch (e) {
      Alert.alert('Notice', 'Task delay reported.');
      setDelayTask(null);
    } finally {
      setIsSubmittingDelay(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'ALL') return tasks;
    return tasks.filter((t) => t.status === activeFilter);
  }, [tasks, activeFilter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const pending = tasks.filter((t) => t.status === 'TODO' || !t.status).length;
    return { total, inProgress, done, pending };
  }, [tasks]);

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('pop');
    }
  };

  const getStatusConfig = (status) => {
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

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2327D8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Assigned Tasks</Text>
          <Text style={styles.headerSub}>
            {currentUser?.name ? `${currentUser.name} • Strictly Assigned` : 'Strictly Assigned Tasks'}
          </Text>
        </View>

        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>{tasks.length}</Text>
        </View>
      </View>

      {/* Stats Quick Bar */}
      <View style={styles.quickStatsRow}>
        <TouchableOpacity
          style={[styles.quickStatCard, activeFilter === 'ALL' && styles.quickStatActive]}
          onPress={() => setActiveFilter('ALL')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickStatNum}>{stats.total}</Text>
          <Text style={styles.quickStatLbl}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickStatCard, activeFilter === 'TODO' && styles.quickStatActive]}
          onPress={() => setActiveFilter('TODO')}
          activeOpacity={0.8}
        >
          <Text style={[styles.quickStatNum, { color: '#D97706' }]}>{stats.pending}</Text>
          <Text style={styles.quickStatLbl}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickStatCard, activeFilter === 'IN_PROGRESS' && styles.quickStatActive]}
          onPress={() => setActiveFilter('IN_PROGRESS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.quickStatNum, { color: '#2563EB' }]}>{stats.inProgress}</Text>
          <Text style={styles.quickStatLbl}>Active</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickStatCard, activeFilter === 'DONE' && styles.quickStatActive]}
          onPress={() => setActiveFilter('DONE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.quickStatNum, { color: '#16A34A' }]}>{stats.done}</Text>
          <Text style={styles.quickStatLbl}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_BLUE]} />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={PRIMARY_BLUE} />
            <Text style={styles.loadingText}>Fetching your tasks...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle2 size={46} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'ALL'
                ? 'No production tasks are strictly assigned to you.'
                : `No tasks found with status "${activeFilter}".`}
            </Text>
          </View>
        ) : (
          filteredTasks.map((item) => {
            const isDone = item.status === 'DONE';
            const isUpdating = updatingTaskId === item._id;
            const statusConfig = getStatusConfig(item.status);

            return (
              <View
                key={item._id || item.title}
                style={styles.taskCard}
              >
                {/* Header Row */}
                <View style={styles.taskHeaderRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: statusConfig.bg,
                        borderColor: statusConfig.border,
                      },
                    ]}
                    onPress={() => handleCycleTaskStatus(item)}
                    disabled={isUpdating}
                    activeOpacity={0.7}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={statusConfig.text} />
                    ) : (
                      <>
                        <RefreshCw
                          size={11}
                          color={statusConfig.iconColor}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.statusPillText, { color: statusConfig.text }]}>
                          {statusConfig.label}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionMiniBtn}
                      onPress={() => setDelayTask(item)}
                      activeOpacity={0.7}
                    >
                      <AlertCircle size={12} color="#DC2626" style={{ marginRight: 3 }} />
                      <Text style={[styles.actionMiniText, { color: '#DC2626' }]}>Hold</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionMiniBtn}
                      onPress={() => {
                        setDemandSelectedTaskId(item._id || item.id);
                        setShowMaterialModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Plus size={12} color="#D97706" style={{ marginRight: 3 }} />
                      <Text style={[styles.actionMiniText, { color: '#D97706' }]}>Demand</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => handleVerifyTask(item._id)}
                      activeOpacity={0.7}
                    >
                      <ShieldCheck size={12} color="#2563EB" style={{ marginRight: 3 }} />
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                  {item.title || 'Production Task'}
                </Text>

                {/* Description */}
                {!!item.description && (
                  <Text style={styles.taskDesc} numberOfLines={3}>
                    {item.description}
                  </Text>
                )}

                {/* Project & Milestone tag */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <FolderKanban size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.projectJobCode || item.projectTitle || 'Production'}
                    </Text>
                  </View>

                  {item.dueDate && (
                    <View style={styles.metaItem}>
                      <Calendar size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>
                        Due: {new Date(item.dueDate).toLocaleDateString('en-GB')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Material Demand Modal */}
      <Modal visible={showMaterialModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Material Demand</Text>
              <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Material Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mild Steel Bar 16mm"
                placeholderTextColor="#94A3B8"
                value={demandMaterialName}
                onChangeText={setDemandMaterialName}
              />

              <View style={styles.twoInputsRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 5.5"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={demandQuantity}
                    onChangeText={setDemandQuantity}
                  />
                </View>

                <View style={{ width: 100 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="MT"
                    placeholderTextColor="#94A3B8"
                    value={demandUnit}
                    onChangeText={setDemandUnit}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Reason / Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Why is this material required now?"
                placeholderTextColor="#94A3B8"
                multiline
                value={demandReason}
                onChangeText={setDemandReason}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleRaiseDemand}
                disabled={isSubmittingDemand}
              >
                {isSubmittingDemand ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Material Requisition</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Hold / Delay Modal */}
      <Modal visible={!!delayTask} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Task Delay / Hold</Text>
              <TouchableOpacity onPress={() => setDelayTask(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Task: {delayTask?.title}</Text>

              <Text style={styles.inputLabel}>Delay Reason / Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Specify shortage, machine breakdown, or blocker details..."
                placeholderTextColor="#94A3B8"
                multiline
                value={delayNotes}
                onChangeText={setDelayNotes}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleSubmitDelay}
                disabled={isSubmittingDelay}
              >
                {isSubmittingDelay ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Mark Task On Hold</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#2327D8',
    paddingTop: Platform.OS === 'android' ? 14 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  badgeWrap: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  quickStatActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  quickStatNum: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickStatLbl: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusBlocked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionMiniText: {
    fontSize: 10,
    fontWeight: '600',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifyBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 20,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskDesc: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 10,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  twoInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalSubmitBtn: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default StaffTasksSelf;
