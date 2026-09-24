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
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Flag,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  UserPlus,
  Phone,
  MoreVertical,
  Check,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProjectDetails,
  updateProject,
  deleteProject,
  addProjectStage,
  reorderProjectStages,
  addProjectMilestone,
  reorderProjectMilestones,
  addProjectTask,
  updateProjectTaskStatus,
  getCompanyDetails,
  getCompanies,
  addEmployeeToCompany,
  onboardStaff,
  getStaffList,
} from '../../../services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const TASK_STATUSES = [
  { key: 'TODO', label: 'To Do', color: '#64748B', bg: '#F1F5F9' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  { key: 'DONE', label: 'Done', color: '#059669', bg: '#D1FAE5' },
  { key: 'BLOCKED', label: 'Blocked', color: '#DC2626', bg: '#FEE2E2' },
];

const PROJECT_STATUSES = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

const PRIORITY_COLORS = {
  LOW: { color: '#64748B', bg: '#F1F5F9' },
  MEDIUM: { color: '#2563EB', bg: '#EFF6FF' },
  HIGH: { color: '#D97706', bg: '#FEF3C7' },
  URGENT: { color: '#DC2626', bg: '#FEE2E2' },
};

const ProjectDetails = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const projectId = params.projectId || params.project?._id || params.project?.id;

  const [project, setProject] = useState(params.project || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedStages, setExpandedStages] = useState({});

  // Modals state
  const [stageModalVisible, setStageModalVisible] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDesc, setNewStageDesc] = useState('');
  const [submittingStage, setSubmittingStage] = useState(false);

  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [activeStageIdForMilestone, setActiveStageIdForMilestone] = useState(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [activeStageIdForTask, setActiveStageIdForTask] = useState(null);
  const [activeMilestoneIdForTask, setActiveMilestoneIdForTask] = useState(null);
  const [newTaskMilestoneTitle, setNewTaskMilestoneTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
  const [staffTab, setStaffTab] = useState('UNASSIGNED'); // 'UNASSIGNED' | 'ONBOARD'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [onboardedStaffList, setOnboardedStaffList] = useState([]);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [showQuickOnboard, setShowQuickOnboard] = useState(false);
  const [quickStaffName, setQuickStaffName] = useState('');
  const [quickStaffMobile, setQuickStaffMobile] = useState('');
  const [quickStaffRole, setQuickStaffRole] = useState('Production Staff');
  const [quickOnboardLoading, setQuickOnboardLoading] = useState(false);

  // Live lookup: check if quickStaffMobile matches an onboarded staff member
  const cleanMobileDigits = useMemo(() => {
    return (quickStaffMobile || '').replace(/\D/g, '');
  }, [quickStaffMobile]);

  const matchedStaffFromMobile = useMemo(() => {
    if (cleanMobileDigits.length === 10) {
      const last10 = cleanMobileDigits.slice(-10);
      const found = onboardedStaffList.find((st) => {
        const mob = String(st.mobileNumber || st.phone || '').replace(/\D/g, '').slice(-10);
        return mob === last10;
      });
      if (found) return found;
    }
    if (selectedStaff && (selectedStaff.mobileNumber || selectedStaff.phone)) {
      const selMob = String(selectedStaff.mobileNumber || selectedStaff.phone).replace(/\D/g, '').slice(-10);
      if (cleanMobileDigits.length === 0 || selMob === cleanMobileDigits.slice(-10)) {
        return selectedStaff;
      }
    }
    return null;
  }, [cleanMobileDigits, onboardedStaffList, selectedStaff]);

  const handleStaffMobileChange = useCallback((txt) => {
    const digits = (txt || '').replace(/\D/g, '').slice(0, 10);
    setQuickStaffMobile(digits);

    if (digits.length === 10) {
      const match = onboardedStaffList.find((st) => {
        const m = String(st.mobileNumber || st.phone || '').replace(/\D/g, '').slice(-10);
        return m === digits;
      });
      if (match) {
        setSelectedStaff(match);
        setNewTaskAssignedTo(match.name);
        setQuickStaffName(match.name);
      } else {
        setSelectedStaff(null);
        setNewTaskAssignedTo('');
      }
    } else {
      if (selectedStaff) {
        const selectedMob = String(selectedStaff.mobileNumber || selectedStaff.phone || '').replace(/\D/g, '').slice(-10);
        if (selectedMob !== digits) {
          setSelectedStaff(null);
          setNewTaskAssignedTo('');
        }
      }
    }
  }, [onboardedStaffList, selectedStaff]);

  const handleSelectStaffChip = useCallback((st) => {
    if (selectedStaff?._id && selectedStaff._id === st._id) {
      setSelectedStaff(null);
      setNewTaskAssignedTo('');
      setQuickStaffMobile('');
      setQuickStaffName('');
    } else {
      setSelectedStaff(st);
      setNewTaskAssignedTo(st.name);
      const m = String(st.mobileNumber || st.phone || '').replace(/\D/g, '').slice(-10);
      setQuickStaffMobile(m);
      setQuickStaffName(st.name);
    }
  }, [selectedStaff]);

  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(() => new Date());

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

  const openCalendarForTask = () => {
    let initialDate = new Date();
    if (newTaskDueDate.trim()) {
      const parts = newTaskDueDate.trim().split(/[/\-.]/);
      if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) {
          [year, month, day] = parts;
        } else {
          [day, month, year] = parts;
        }
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(d.getTime())) initialDate = d;
      }
    }
    setTempSelectedDate(initialDate);
    setCalendarMonthDate(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setCalendarPickerVisible(true);
  };

  const confirmCalendarDate = () => {
    const dd = String(tempSelectedDate.getDate()).padStart(2, '0');
    const mm = String(tempSelectedDate.getMonth() + 1).padStart(2, '0');
    const yyyy = tempSelectedDate.getFullYear();
    setNewTaskDueDate(`${dd}/${mm}/${yyyy}`);
    setCalendarPickerVisible(false);
  };

  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchStaffList = useCallback(async (companyRef) => {
    try {
      const resolvedCompId =
        (typeof companyRef === 'object' ? (companyRef?._id || companyRef?.id) : companyRef) ||
        project?.companyId?._id ||
        project?.companyId?.id ||
        project?.companyId ||
        project?.creatorCompanyId ||
        (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));

      const compIdStr = resolvedCompId && resolvedCompId !== 'ALL' ? String(resolvedCompId) : '';

      const combined = [];
      const seenKeys = new Set();

      const addStaffMember = (item) => {
        if (!item) return;
        const id = item._id || item.id || item.userId;
        const name = (item.name || item.fullName || item.userName || '').trim();
        const mobile = (item.mobileNumber || item.phone || '').replace(/\D/g, '').slice(-10);

        // Strictly require a real non-empty genuine name, reject generic/placeholder words
        if (!name) return;
        const lower = name.toLowerCase();
        if (
          lower === 'staff member' ||
          lower === 'staff' ||
          lower === 'unassigned' ||
          lower === 'seller' ||
          lower === 'buyer'
        ) {
          return;
        }

        const dedupeKey = String(id || `${name}_${mobile}`);
        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          combined.push({
            _id: String(id || dedupeKey),
            name: name,
            mobileNumber: mobile,
            roles: item.roles || (item.role ? [item.role] : ['Staff']),
            email: item.email || null,
          });
        }
      };

      // 0. Fetch official Staff Directory from Guide v2.0 API: GET /api/staff
      try {
        const token =
          (await AsyncStorage.getItem('userToken')) ||
          (await AsyncStorage.getItem('token')) ||
          (await AsyncStorage.getItem('authToken'));
        if (token) {
          const staffRes = await getStaffList({ limit: 100 }, token, compIdStr || null);
          const staffArr = staffRes?.data?.staff || staffRes?.data || [];
          if (Array.isArray(staffArr)) {
            staffArr.forEach(addStaffMember);
          }
        }
      } catch (e) { }

      // 1. Check AsyncStorage for company's real onboarded users
      if (compIdStr) {
        try {
          const c1 = await AsyncStorage.getItem(`company_onboarded_users_${compIdStr}`);
          if (c1) {
            const parsed = JSON.parse(c1);
            if (Array.isArray(parsed)) parsed.forEach(addStaffMember);
          }
        } catch (e) { }
      }

      // 2. Fetch real company employees from backend API
      if (compIdStr) {
        try {
          const compDetailsRes = await getCompanyDetails(compIdStr);
          const cData = compDetailsRes?.data?.company || compDetailsRes?.data || compDetailsRes?.company;
          if (cData && Array.isArray(cData.employees)) {
            cData.employees.forEach(addStaffMember);
          }
        } catch (e) { }
      }

      // 3. Fetch from user's companies list
      try {
        const compsRes = await getCompanies(1, 50);
        const compsList = compsRes?.data?.companies || (Array.isArray(compsRes?.data) ? compsRes.data : []);
        compsList.forEach((c) => {
          if (!compIdStr || String(c._id || c.id) === compIdStr) {
            if (Array.isArray(c.employees)) {
              c.employees.forEach(addStaffMember);
            }
          }
        });
      } catch (e) { }

      // 4. Check user profile employees
      try {
        const profStr = await AsyncStorage.getItem('user_completed_profile');
        if (profStr) {
          const prof = JSON.parse(profStr);
          (prof?.companies || []).forEach((c) => {
            if (!compIdStr || String(c._id || c.id) === compIdStr) {
              if (Array.isArray(c.employees)) {
                c.employees.forEach(addStaffMember);
              }
            }
          });
        }
      } catch (e) { }

      setOnboardedStaffList(combined);
    } catch (err) {
      console.warn('fetchStaffList error:', err);
    }
  }, [project?.companyId, project?.creatorCompanyId]);

  const fetchDetails = useCallback(async (isPullRefresh = false) => {
    if (!projectId) return;
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await getProjectDetails(projectId);
      const projData = res?.data?.project || res?.data;
      if (res?.success && projData) {
        setProject(projData);
        if (projData.companyId) {
          fetchStaffList(projData.companyId);
        }
        // Expand first stage by default if not set
        if (projData.stages && projData.stages.length > 0) {
          setExpandedStages((prev) => {
            if (Object.keys(prev).length === 0) {
              return { [projData.stages[0]._id || 0]: true };
            }
            return prev;
          });
        }
      } else if (projData) {
        setProject(projData);
        if (projData.companyId) {
          fetchStaffList(projData.companyId);
        }
      }
    } catch (e) {
      console.error('Error fetching project details:', e);
      Alert.alert('Error', 'Failed to load project details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, fetchStaffList]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleBack = () => {
    if (onBack) onBack();
    else if (onNavigate) onNavigate('pop');
    else if (navigation?.goBack) navigation.goBack();
  };

  const toggleStage = (stageId) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  // Add Stage handler (API 6)
  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      Alert.alert('Required', 'Please enter a stage name.');
      return;
    }
    try {
      setSubmittingStage(true);
      const orderIndex = Array.isArray(project?.stages) ? project.stages.length : 0;
      const res = await addProjectStage(projectId, {
        name: newStageName.trim(),
        description: newStageDesc.trim() || undefined,
        orderIndex,
      });
      if (res?.success) {
        setNewStageName('');
        setNewStageDesc('');
        setStageModalVisible(false);
        fetchDetails();
      } else {
        Alert.alert('Error', res?.message || 'Failed to add stage');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to add stage');
    } finally {
      setSubmittingStage(false);
    }
  };

  // Reorder Stages handler (API 7)
  const handleReorderStage = async (currentIndex, direction) => {
    if (!project?.stages || project.stages.length < 2) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= project.stages.length) return;

    const newStages = [...project.stages];
    const temp = newStages[currentIndex];
    newStages[currentIndex] = newStages[newIndex];
    newStages[newIndex] = temp;

    const stageOrders = newStages.map((s, idx) => ({
      stageId: s._id,
      orderIndex: idx,
    }));

    setProject((prev) => (prev ? { ...prev, stages: newStages } : prev));

    try {
      const res = await reorderProjectStages(projectId, stageOrders);
      if (!res?.success) {
        fetchDetails();
      }
    } catch (e) {
      console.error('Failed to reorder stages:', e);
      fetchDetails();
    }
  };

  // Add Milestone handler (API 8)
  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) {
      Alert.alert('Required', 'Please enter milestone title.');
      return;
    }
    try {
      setSubmittingMilestone(true);
      const stage = (project?.stages || []).find((s) => s._id === activeStageIdForMilestone);
      const orderIndex = Array.isArray(stage?.milestones) ? stage.milestones.length : 0;

      const res = await addProjectMilestone(projectId, activeStageIdForMilestone, {
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim() || undefined,
        orderIndex,
      });
      if (res?.success) {
        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        setMilestoneModalVisible(false);
        fetchDetails();
      } else {
        Alert.alert('Error', res?.message || 'Failed to add milestone');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to add milestone');
    } finally {
      setSubmittingMilestone(false);
    }
  };

  // Reorder Milestones handler (API 9)
  const handleReorderMilestone = async (stageId, currentIdx, direction) => {
    const stage = (project?.stages || []).find((s) => s._id === stageId);
    if (!stage || !stage.milestones || stage.milestones.length < 2) return;
    const newIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (newIdx < 0 || newIdx >= stage.milestones.length) return;

    const newMilestones = [...stage.milestones];
    const temp = newMilestones[currentIdx];
    newMilestones[currentIdx] = newMilestones[newIdx];
    newMilestones[newIdx] = temp;

    const milestoneOrders = newMilestones.map((m, idx) => ({
      milestoneId: m._id,
      orderIndex: idx,
    }));

    setProject((prev) => {
      if (!prev || !prev.stages) return prev;
      return {
        ...prev,
        stages: prev.stages.map((s) => (s._id === stageId ? { ...s, milestones: newMilestones } : s)),
      };
    });

    try {
      const res = await reorderProjectMilestones(projectId, stageId, milestoneOrders);
      if (!res?.success) {
        fetchDetails();
      }
    } catch (e) {
      console.error('Failed to reorder milestones:', e);
      fetchDetails();
    }
  };

  const openAddTaskModal = (stageId, milestoneId, milestoneTitle) => {
    setActiveStageIdForTask(stageId);
    setActiveMilestoneIdForTask(milestoneId);
    setNewTaskMilestoneTitle(milestoneTitle || '');
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDueDate('');
    setNewTaskAssignedTo('');
    setNewTaskPriority('MEDIUM');
    setSelectedStaff(null);
    setStaffTab('ONBOARD');
    setShowQuickOnboard(false);
    setQuickStaffName('');
    setQuickStaffMobile('');
    setQuickStaffRole('Production Staff');
    setTaskModalVisible(true);

    // Refresh staff list immediately on modal open
    fetchStaffList(project?.companyId || project?.creatorCompanyId || project?.company);
  };

  // Quick In-Modal Staff Onboarding Handler (Guide v2.0 Phase 1.1 - POST /api/staff/onboard)
  const handleQuickOnboardStaff = async () => {
    const cleanName = quickStaffName.trim();
    const cleanMobile = quickStaffMobile.replace(/\D/g, '').slice(-10);

    if (!cleanName) {
      Alert.alert('Required', 'Please enter staff member full name.');
      return;
    }
    if (!cleanMobile || cleanMobile.length !== 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setQuickOnboardLoading(true);
    try {
      const token =
        (await AsyncStorage.getItem('userToken')) ||
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('authToken'));

      let compId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        project?.creatorCompanyId ||
        (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId')) ||
        '';

      if (typeof compId === 'object' && compId !== null) {
        compId = compId._id || compId.id || '';
      }
      const compIdStr = String(compId || '');
      let realStaffId = null;

      // Call official Guide v2.0 Phase 1.1 API: POST /api/staff/onboard
      let serverData = null;
      try {
        const staffPayload = {
          name: cleanName,
          phone: cleanMobile,
          department: project?.title || 'Production',
          designation: quickStaffRole || 'Site Supervisor',
          roles: ['staff'],
        };
        const onboardRes = await onboardStaff(staffPayload, token, compIdStr || null);
        serverData = onboardRes?.data?.staff || onboardRes?.data || onboardRes;
        realStaffId = serverData?._id || serverData?.id;

        if (!realStaffId) {
          throw new Error(onboardRes?.message || 'Server did not return staff ID.');
        }
      } catch (apiErr) {
        console.error('Official onboardStaff error:', apiErr);
        Alert.alert(
          'Onboarding Failed',
          apiErr.message || 'Unable to onboard staff member. Please check details and try again.'
        );
        setQuickOnboardLoading(false);
        return;
      }

      const finalStaffId = realStaffId;
      const newMember = {
        _id: finalStaffId,
        id: finalStaffId,
        name: serverData?.name || cleanName,
        mobileNumber: serverData?.mobileNumber || serverData?.phone || cleanMobile,
        phone: serverData?.phone || cleanMobile,
        department: serverData?.department || project?.title || 'Production',
        designation: serverData?.designation || quickStaffRole || 'Site Supervisor',
        roles: serverData?.roles || ['staff'],
        companyId: serverData?.companyId || compIdStr,
      };

      // 1. Instantly update in-memory staff list & auto-select
      setOnboardedStaffList((prev) => [
        newMember,
        ...prev.filter((s) => s.mobileNumber !== cleanMobile && s._id !== finalStaffId),
      ]);
      setSelectedStaff(newMember);
      setNewTaskAssignedTo(cleanName);
      setStaffTab('ONBOARD');
      setQuickStaffName(cleanName);
      setQuickStaffMobile(cleanMobile);

      // 2. Persist to AsyncStorage caches
      try {
        if (compIdStr) {
          const cacheKey = `company_onboarded_users_${compIdStr}`;
          const currentCached = await AsyncStorage.getItem(cacheKey);
          const parsed = currentCached ? JSON.parse(currentCached) : [];
          const updated = [
            newMember,
            ...parsed.filter((p) => p.mobileNumber !== cleanMobile && p._id !== finalStaffId),
          ];
          await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      } catch (e) {}

      Alert.alert(
        'Staff Onboarded Successfully',
        `${cleanName} is now onboarded in company staff directory!\n\nWorker Login Credentials:\n• Mobile: ${cleanMobile}\n• Default Password: ${cleanMobile}`
      );
    } catch (err) {
      Alert.alert('Notice', err.message || 'Could not complete onboarding.');
    } finally {
      setQuickOnboardLoading(false);
    }
  };

  // Add Task handler (API 10 - POST /api/projects/:id/stages/:stageId/milestones/:milestoneId/tasks)
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Required', 'Please enter task title.');
      return;
    }
    if (!activeStageIdForTask || !activeMilestoneIdForTask) {
      Alert.alert('Error', 'Invalid stage or milestone selection.');
      return;
    }
    try {
      setSubmittingTask(true);
      let formattedDueDate;
      if (newTaskDueDate.trim()) {
        const rawDate = newTaskDueDate.trim();
        const parts = rawDate.split(/[/\-.]/);
        if (parts.length === 3) {
          let day, month, year;
          if (parts[0].length === 4) {
            [year, month, day] = parts;
          } else {
            [day, month, year] = parts;
          }
          const d = new Date(Number(year), Number(month) - 1, Number(day), 18, 29, 59);
          formattedDueDate = !isNaN(d.getTime()) ? d.toISOString() : undefined;
        } else {
          const d = new Date(rawDate);
          formattedDueDate = !isNaN(d.getTime()) ? d.toISOString() : undefined;
        }
      }

      const isMongoId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
      const chosenStaffId = selectedStaff?._id || selectedStaff?.id;
      const assignedText = (newTaskAssignedTo || '').trim();

      const payload = {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        priority: newTaskPriority,
        dueDate: formattedDueDate,
      };

      if (staffTab === 'ONBOARD') {
        if (chosenStaffId && isMongoId(chosenStaffId)) {
          payload.assignedTo = chosenStaffId;
        } else if (selectedStaff?.name || assignedText) {
          const staffLabel = selectedStaff?.name || assignedText;
          const staffMob = selectedStaff?.mobileNumber ? ` (${selectedStaff.mobileNumber})` : '';
          // Note: never send payload.assignedToName as backend schema disallows it
          const assignNote = `[Assigned to: ${staffLabel}${staffMob}]`;
          payload.description = payload.description ? `${payload.description}\n${assignNote}` : assignNote;
        }
      }

      const res = await addProjectTask(
        projectId,
        activeStageIdForTask,
        activeMilestoneIdForTask,
        payload
      );

      if (res?.success || res?.statusCode === 201 || res?.data) {
        let updatedProj = res.data && res.data.stages ? res.data : null;
        if (selectedStaff && updatedProj) {
          updatedProj = {
            ...updatedProj,
            stages: (updatedProj.stages || []).map((stg) => ({
              ...stg,
              milestones: (stg.milestones || []).map((ms) => ({
                ...ms,
                tasks: (ms.tasks || []).map((t) => {
                  if (t.title === newTaskTitle.trim() && !t.assignedTo) {
                    return { ...t, assignedTo: selectedStaff, assignedToName: selectedStaff.name };
                  }
                  return t;
                }),
              })),
            })),
          };
          setProject(updatedProj);
        } else if (updatedProj) {
          setProject(updatedProj);
        } else {
          fetchDetails();
        }

        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setNewTaskAssignedTo('');
        setSelectedStaff(null);
        setStaffTab('UNASSIGNED');
        setShowQuickOnboard(false);
        setTaskModalVisible(false);
      } else {
        Alert.alert('Error', res?.message || 'Failed to add task');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to add task');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Quick Cycle Task Status (API 11)
  const handleCycleTaskStatus = async (stageId, milestoneId, task) => {
    const currentIndex = TASK_STATUSES.findIndex((s) => s.key === task.status);
    const nextStatusObj = TASK_STATUSES[(currentIndex + 1) % TASK_STATUSES.length];
    const newStatus = nextStatusObj.key;

    // Optimistic Update
    setProject((prev) => {
      if (!prev || !prev.stages) return prev;
      const updatedStages = prev.stages.map((st) => {
        if (st._id !== stageId) return st;
        const updatedMilestones = (st.milestones || []).map((m) => {
          if (m._id !== milestoneId) return m;
          const updatedTasks = (m.tasks || []).map((t) => {
            if (t._id === task._id) {
              return { ...t, status: newStatus };
            }
            return t;
          });
          return { ...m, tasks: updatedTasks };
        });
        return { ...st, milestones: updatedMilestones };
      });
      return { ...prev, stages: updatedStages };
    });

    try {
      const res = await updateProjectTaskStatus(projectId, task._id, newStatus);
      if (res?.success && res?.data) {
        // Backend recalculation sync
        const updateData = res.data;
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            overallProgress:
              typeof updateData.overallProgress === 'number'
                ? updateData.overallProgress
                : prev.overallProgress,
            status: updateData.projectStatus || prev.status,
            stages: (prev.stages || []).map((s) => {
              if (s._id === updateData.stageId) {
                return {
                  ...s,
                  progressPercentage: updateData.stageProgress ?? s.progressPercentage,
                  status: updateData.stageStatus ?? s.status,
                  milestones: (s.milestones || []).map((m) => {
                    if (m._id === updateData.milestoneId) {
                      return {
                        ...m,
                        progressPercentage: updateData.milestoneProgress ?? m.progressPercentage,
                        status: updateData.milestoneStatus ?? m.status,
                      };
                    }
                    return m;
                  }),
                };
              }
              return s;
            }),
          };
        });
        fetchDetails();
      }
    } catch (e) {
      console.error('Failed to update task status:', e);
      fetchDetails(); // revert on fail
    }
  };

  // Change Project Status (API 4)
  const handleUpdateProjectStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await updateProject(projectId, { status: newStatus });
      if (res?.success) {
        setProject((prev) => (prev ? { ...prev, status: newStatus } : prev));
        setStatusMenuVisible(false);
      } else {
        Alert.alert('Error', res?.message || 'Failed to update status');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Project (API 5)
  const handleDeleteProject = () => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project?.title || 'this project'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await deleteProject(projectId);
              if (res?.success) {
                Alert.alert('Deleted', 'Project deleted successfully.');
                handleBack();
              } else {
                Alert.alert('Error', res?.message || 'Failed to delete project.');
                setLoading(false);
              }
            } catch (e) {
              Alert.alert(
                'Error',
                e?.response?.data?.message || e?.message || 'Failed to delete project.'
              );
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || 'DRAFT').toUpperCase();
    let bg = '#F1F5F9';
    let text = '#64748B';
    if (s === 'ACTIVE') {
      bg = '#EEF2FF';
      text = '#2327D8';
    } else if (s === 'COMPLETED') {
      bg = '#DCFCE7';
      text = '#16A34A';
    } else if (s === 'ON_HOLD') {
      bg = '#FEF3C7';
      text = '#D97706';
    } else if (s === 'CANCELLED') {
      bg = '#FEE2E2';
      text = '#DC2626';
    }
    return { bg, text };
  };

  if (loading && !project) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2327D8" />
        <Text style={styles.loadingText}>Loading project workspace...</Text>
      </View>
    );
  }

  const projectStatusBadge = getStatusBadge(project?.status);
  const overallProgress = Math.round(project?.overallProgress || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          {project?.jobCode ? (
            <Text style={styles.jobCodeBadge}>{project.jobCode}</Text>
          ) : null}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project?.title || 'Project Details'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setStatusMenuVisible(true)}
        >
          <MoreVertical size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDetails(true)}
            colors={['#2327D8']}
          />
        }
      >
        {/* Progress & Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTopRow}>
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: projectStatusBadge.bg }]}
              onPress={() => setStatusMenuVisible(true)}
            >
              <Text style={[styles.statusPillText, { color: projectStatusBadge.text }]}>
                {project?.status || 'ACTIVE'}
              </Text>
              <ChevronDown size={14} color={projectStatusBadge.text} />
            </TouchableOpacity>

            {project?.targetDeliveryDate ? (
              <View style={styles.deliveryBadge}>
                <Calendar size={13} color="#64748B" />
                <Text style={styles.deliveryText}>
                  Target: {new Date(project.targetDeliveryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>

          {project?.description ? (
            <Text style={styles.projectDesc}>{project.description}</Text>
          ) : null}

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Overall Delivery Progress</Text>
              <Text style={styles.progressVal}>{overallProgress}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(overallProgress, 100)}%`,
                    backgroundColor: overallProgress === 100 ? '#10B981' : '#2327D8',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Stages Header with "+ Add Stage" */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <View style={styles.sectionIconBadge}>
              <Layers size={17} color="#2327D8" strokeWidth={2.2} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Project Stages & Tasks</Text>
              <Text style={styles.sectionSubtitle}>Track milestones & task execution</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addStageBtn}
            onPress={() => {
              setNewStageName('');
              setStageModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addStageBtnText}>Add Stage</Text>
          </TouchableOpacity>
        </View>

        {/* Stages Accordion List */}
        {project?.stages && project.stages.length > 0 ? (
          project.stages.map((stage, sIdx) => {
            const stageId = stage._id || sIdx;
            const isExpanded = !!expandedStages[stageId];
            const stageProgress = Math.round(stage.progressPercentage ?? stage.progress ?? 0);
            const totalTasksCount = (stage.milestones || []).reduce(
              (acc, m) => acc + (m.tasks?.length || 0),
              0
            );

            return (
              <View key={stageId} style={styles.stageCard}>
                {/* Stage Header */}
                <TouchableOpacity
                  style={styles.stageHeader}
                  activeOpacity={0.8}
                  onPress={() => toggleStage(stageId)}
                >
                  <View style={styles.stageIndexBadge}>
                    <Text style={styles.stageIndexText}>{sIdx + 1}</Text>
                  </View>

                  <View style={styles.stageTitleWrap}>
                    <Text style={styles.stageName}>{stage.name}</Text>
                    {stage.description ? (
                      <Text style={styles.stageDescText} numberOfLines={1}>
                        {stage.description}
                      </Text>
                    ) : null}
                    <View style={styles.stageMetaRow}>
                      <View
                        style={[
                          styles.stageProgressPill,
                          stageProgress === 100 && styles.stageProgressPillComplete,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stageProgressText,
                            stageProgress === 100 && styles.stageProgressTextComplete,
                          ]}
                        >
                          {stageProgress}%
                        </Text>
                      </View>
                      <Text style={styles.stageCountText}>
                        {(stage.milestones || []).length}{' '}
                        {(stage.milestones || []).length === 1 ? 'Milestone' : 'Milestones'}
                      </Text>
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.stageCountText}>
                        {totalTasksCount} {totalTasksCount === 1 ? 'Task' : 'Tasks'}
                      </Text>
                    </View>
                  </View>

                  {/* Stage Reorder Controls */}
                  {project.stages.length > 1 && (
                    <View style={styles.reorderCol}>
                      {sIdx > 0 && (
                        <TouchableOpacity
                          style={styles.reorderBtn}
                          onPress={() => handleReorderStage(sIdx, 'up')}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <ArrowUp size={13} color="#64748B" />
                        </TouchableOpacity>
                      )}
                      {sIdx < project.stages.length - 1 && (
                        <TouchableOpacity
                          style={styles.reorderBtn}
                          onPress={() => handleReorderStage(sIdx, 'down')}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <ArrowDown size={13} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <View style={styles.stageChevronWrap}>
                    {isExpanded ? (
                      <ChevronUp size={20} color="#64748B" />
                    ) : (
                      <ChevronDown size={20} color="#64748B" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Stage Body */}
                {isExpanded && (
                  <View style={styles.stageBody}>
                    {/* Stage Progress Mini Bar */}
                    <View style={styles.stageMiniBarTrack}>
                      <View
                        style={[
                          styles.stageMiniBarFill,
                          {
                            width: `${Math.min(stageProgress, 100)}%`,
                            backgroundColor: stageProgress === 100 ? '#10B981' : '#2327D8',
                          },
                        ]}
                      />
                    </View>

                    {/* Milestones inside this Stage */}
                    {(stage.milestones || []).map((milestone, mIdx) => {
                      const milestoneId = milestone._id || mIdx;
                      const milestoneProgress = Math.round(
                        milestone.progressPercentage ?? milestone.progress ?? 0
                      );

                      return (
                        <View key={milestoneId} style={styles.milestoneCard}>
                          {/* Milestone Header */}
                          <View style={styles.milestoneHeader}>
                            <View style={styles.milestoneTitleRow}>
                              <View style={styles.milestoneIconWrap}>
                                <Flag size={13} color="#4F46E5" strokeWidth={2.5} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={styles.milestoneHeadingRow}>
                                  <Text style={styles.milestoneIndexLabel}>Milestone {mIdx + 1}</Text>
                                  <View
                                    style={[
                                      styles.milestoneProgressPill,
                                      milestoneProgress === 100 && styles.milestoneProgressPillDone,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.milestoneProgressPillText,
                                        milestoneProgress === 100 && styles.milestoneProgressPillTextDone,
                                      ]}
                                    >
                                      {milestoneProgress}%
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                                {milestone.description ? (
                                  <Text style={styles.milestoneDescText} numberOfLines={2}>
                                    {milestone.description}
                                  </Text>
                                ) : null}
                              </View>
                            </View>

                            <View style={styles.milestoneActionRow}>
                              {/* Milestone Reorder Buttons */}
                              {stage.milestones.length > 1 && (
                                <View style={styles.reorderRowMini}>
                                  {mIdx > 0 && (
                                    <TouchableOpacity
                                      style={styles.reorderMiniBtn}
                                      onPress={() => handleReorderMilestone(stageId, mIdx, 'up')}
                                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    >
                                      <ArrowUp size={12} color="#64748B" />
                                    </TouchableOpacity>
                                  )}
                                  {mIdx < stage.milestones.length - 1 && (
                                    <TouchableOpacity
                                      style={styles.reorderMiniBtn}
                                      onPress={() => handleReorderMilestone(stageId, mIdx, 'down')}
                                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    >
                                      <ArrowDown size={12} color="#64748B" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}

                              <TouchableOpacity
                                style={styles.addTaskBtn}
                                onPress={() => openAddTaskModal(stageId, milestoneId, milestone.title)}
                                activeOpacity={0.7}
                              >
                                <Plus size={12} color="#2327D8" strokeWidth={2.5} />
                                <Text style={styles.addTaskBtnText}>Add Task</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Milestone Progress Bar */}
                          <View style={styles.milestoneProgressBarRow}>
                            <View style={styles.milestoneMiniBarTrack}>
                              <View
                                style={[
                                  styles.milestoneMiniBarFill,
                                  {
                                    width: `${Math.min(milestoneProgress, 100)}%`,
                                    backgroundColor: milestoneProgress === 100 ? '#10B981' : '#4F46E5',
                                  },
                                ]}
                              />
                            </View>
                          </View>

                          {/* Tasks under this Milestone - SINGLE INDIVIDUAL CARDS */}
                          <View style={styles.tasksContainer}>
                            {(milestone.tasks || []).length > 0 ? (
                              <>
                                {milestone.tasks.map((task) => {
                                  const statusConfig =
                                    TASK_STATUSES.find((s) => s.key === task.status) ||
                                    TASK_STATUSES[0];
                                  const priorityConfig =
                                    PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM;
                                  const matchedStaff = onboardedStaffList.find(
                                    (s) =>
                                      String(s._id) === String(task.assignedTo?._id || task.assignedTo) ||
                                      (s.mobileNumber && String(task.assignedTo).includes(s.mobileNumber))
                                  );
                                  const assignedUser =
                                    task.assignedTo?.name ||
                                    task.assignedToName ||
                                    matchedStaff?.name ||
                                    (typeof task.assignedTo === 'string' && !/^[0-9a-fA-F]{24}$/.test(task.assignedTo)
                                      ? task.assignedTo
                                      : null);
                                  const assignedRole = task.assignedTo?.roles?.[0] || matchedStaff?.roles?.[0] || 'Staff';

                                  return (
                                    <View key={task._id} style={styles.singleTaskCard}>
                                      {/* Top Row: Status pill & Priority badge */}
                                      <View style={styles.singleTaskTopRow}>
                                        <TouchableOpacity
                                          style={[
                                            styles.singleTaskStatusPill,
                                            { backgroundColor: statusConfig.bg },
                                          ]}
                                          onPress={() =>
                                            handleCycleTaskStatus(stageId, milestoneId, task)
                                          }
                                          activeOpacity={0.7}
                                        >
                                          {task.status === 'DONE' ? (
                                            <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
                                          ) : task.status === 'IN_PROGRESS' ? (
                                            <Clock size={13} color="#D97706" strokeWidth={2.5} />
                                          ) : task.status === 'BLOCKED' ? (
                                            <AlertCircle size={13} color="#DC2626" strokeWidth={2.5} />
                                          ) : (
                                            <View style={styles.todoDot} />
                                          )}
                                          <Text
                                            style={[
                                              styles.singleTaskStatusText,
                                              { color: statusConfig.color },
                                            ]}
                                          >
                                            {statusConfig.label}
                                          </Text>
                                        </TouchableOpacity>

                                        {task.priority ? (
                                          <View
                                            style={[
                                              styles.singleTaskPriorityBadge,
                                              { backgroundColor: priorityConfig.bg },
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.singleTaskPriorityText,
                                                { color: priorityConfig.color },
                                              ]}
                                            >
                                              {task.priority}
                                            </Text>
                                          </View>
                                        ) : null}
                                      </View>

                                      {/* Task Title */}
                                      <Text
                                        style={[
                                          styles.singleTaskTitle,
                                          task.status === 'DONE' && styles.singleTaskTitleDone,
                                        ]}
                                      >
                                        {task.title}
                                      </Text>

                                      {/* Task Description */}
                                      {task.description ? (
                                        <Text style={styles.singleTaskDesc} numberOfLines={3}>
                                          {task.description}
                                        </Text>
                                      ) : null}

                                      {/* Task Footer: Assigned Staff & Due Date */}
                                      <View style={styles.singleTaskFooter}>
                                        {assignedUser ? (
                                          <View style={styles.singleTaskStaffBadge}>
                                            <View style={styles.singleTaskStaffAvatar}>
                                              <Text style={styles.singleTaskStaffAvatarText}>
                                                {(assignedUser || 'S').charAt(0).toUpperCase()}
                                              </Text>
                                            </View>
                                            <Text style={styles.singleTaskStaffName} numberOfLines={1}>
                                              {assignedUser}
                                            </Text>
                                            <Text style={styles.singleTaskStaffRole}>
                                              ({assignedRole})
                                            </Text>
                                          </View>
                                        ) : (
                                          <View style={styles.singleTaskUnassignedBadge}>
                                            <User size={11} color="#94A3B8" />
                                            <Text style={styles.singleTaskUnassignedText}>Unassigned</Text>
                                          </View>
                                        )}

                                        {task.dueDate ? (
                                          <View style={styles.singleTaskDueDateBadge}>
                                            <Calendar size={11} color="#64748B" />
                                            <Text style={styles.singleTaskDueDateText}>
                                              Due:{' '}
                                              {new Date(task.dueDate).toLocaleDateString('en-IN', {
                                                month: 'short',
                                                day: 'numeric',
                                              })}
                                            </Text>
                                          </View>
                                        ) : null}
                                      </View>
                                    </View>
                                  );
                                })}

                                {/* Bottom inline button to add task */}
                                <TouchableOpacity
                                  style={styles.addTaskBottomRowBtn}
                                  onPress={() => openAddTaskModal(stageId, milestoneId, milestone.title)}
                                  activeOpacity={0.7}
                                >
                                  <Plus size={13} color="#2327D8" strokeWidth={2.2} />
                                  <Text style={styles.addTaskBottomRowBtnText}>+ Add Task to Milestone</Text>
                                </TouchableOpacity>
                              </>
                            ) : (
                              <TouchableOpacity
                                style={styles.noTasksCard}
                                onPress={() => openAddTaskModal(stageId, milestoneId, milestone.title)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.noTasksIconCircle}>
                                  <Plus size={15} color="#2327D8" strokeWidth={2.5} />
                                </View>
                                <View style={styles.noTasksTextGroup}>
                                  <Text style={styles.noTasksTitle}>No tasks added yet</Text>
                                  <Text style={styles.noTasksSubtitle}>
                                    Tap to add a task to this milestone
                                  </Text>
                                </View>
                                <View style={styles.noTasksAddPill}>
                                  <Text style={styles.noTasksAddPillText}>+ Add Task</Text>
                                </View>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}

                    {/* "+ Add Milestone" button at bottom of stage */}
                    <TouchableOpacity
                      style={styles.addMilestoneBtn}
                      onPress={() => {
                        setActiveStageIdForMilestone(stageId);
                        setNewMilestoneTitle('');
                        setNewMilestoneDesc('');
                        setMilestoneModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color="#4F46E5" strokeWidth={2.2} />
                      <Text style={styles.addMilestoneBtnText}>Add Milestone to Stage</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyStagesCard}>
            <Layers size={36} color="#CBD5E1" />
            <Text style={styles.emptyStagesTitle}>No Stages Defined Yet</Text>
            <Text style={styles.emptyStagesSubtitle}>
              Break this project into manageable phases (e.g. Procurement, Milling, Quality Check,
              Dispatch).
            </Text>
            <TouchableOpacity
              style={styles.createFirstStageBtn}
              onPress={() => {
                setNewStageName('');
                setNewStageDesc('');
                setStageModalVisible(true);
              }}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.createFirstStageText}>Add First Stage</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODAL: Add Stage */}
      <Modal visible={stageModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Project Stage</Text>
              <TouchableOpacity onPress={() => setStageModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Stage Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Title"
              placeholderTextColor="#94A3B8"
              value={newStageName}
              onChangeText={setNewStageName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Stage Description (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              value={newStageDesc}
              onChangeText={setNewStageDesc}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setStageModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, submittingStage && styles.disabledBtn]}
                onPress={handleAddStage}
                disabled={submittingStage}
              >
                {submittingStage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Create Stage</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Add Milestone */}
      <Modal visible={milestoneModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Milestone</Text>
              <TouchableOpacity onPress={() => setMilestoneModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Milestone Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Title"
              placeholderTextColor="#94A3B8"
              value={newMilestoneTitle}
              onChangeText={setNewMilestoneTitle}
              autoFocus
            />

            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              value={newMilestoneDesc}
              onChangeText={setNewMilestoneDesc}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setMilestoneModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, submittingMilestone && styles.disabledBtn]}
                onPress={handleAddMilestone}
                disabled={submittingMilestone}
              >
                {submittingMilestone ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Add Milestone</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Add New Task */}
      <Modal visible={taskModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, styles.taskModalContent]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add New Task</Text>
                <View style={styles.taskInsideRow}>
                  <Text style={styles.taskInsideLabel}>Inside:</Text>
                  <Text style={styles.taskInsideVal} numberOfLines={1}>
                    {newTaskMilestoneTitle || 'Milestone'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setTaskModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.taskModalScrollContent}
            >
              {/* Task Title * */}
              <Text style={styles.inputLabel}>Task Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Title"
                placeholderTextColor="#94A3B8"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />

              {/* Staff / Assign Staff */}
              <View style={styles.staffHeaderRow}>
                <Text style={styles.inputLabel}>Staff</Text>
                <Text style={styles.staffSubLabel}>Assign Staff</Text>
              </View>

              <View style={styles.staffTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.staffTabBtn,
                    staffTab === 'ONBOARD' && styles.staffTabBtnActive,
                  ]}
                  onPress={() => setStaffTab('ONBOARD')}
                  activeOpacity={0.7}
                >
                  <Users
                    size={14}
                    color={staffTab === 'ONBOARD' ? '#2327D8' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.staffTabBtnText,
                      staffTab === 'ONBOARD' && styles.staffTabBtnTextActive,
                    ]}
                  >
                    Assign Staff
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.staffTabBtn,
                    staffTab === 'UNASSIGNED' && styles.staffTabBtnActive,
                  ]}
                  onPress={() => {
                    setStaffTab('UNASSIGNED');
                    setSelectedStaff(null);
                    setNewTaskAssignedTo('');
                    setQuickStaffMobile('');
                    setQuickStaffName('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.staffTabBtnText,
                      staffTab === 'UNASSIGNED' && styles.staffTabBtnTextActive,
                    ]}
                  >
                    Unassigned
                  </Text>
                </TouchableOpacity>
              </View>

              {staffTab === 'ONBOARD' && (
                <View style={styles.staffSelectionBox}>
                  {/* Quick Select from existing directory chips */}
                  {onboardedStaffList && onboardedStaffList.length > 0 ? (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.staffSelectHint}>
                        Select from existing team or enter mobile below:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.staffChipsScroll}
                      >
                        {onboardedStaffList.map((st) => {
                          const isPicked =
                            (selectedStaff?._id && selectedStaff._id === st._id) ||
                            (matchedStaffFromMobile &&
                              (matchedStaffFromMobile._id === st._id ||
                                matchedStaffFromMobile.name === st.name));
                          return (
                            <TouchableOpacity
                              key={st._id || st.name}
                              style={[
                                styles.staffChip,
                                isPicked && styles.staffChipActive,
                              ]}
                              onPress={() => handleSelectStaffChip(st)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  styles.staffChipAvatar,
                                  isPicked && styles.staffChipAvatarActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.staffChipAvatarText,
                                    isPicked && styles.staffChipAvatarTextActive,
                                  ]}
                                >
                                  {(st.name || 'S').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View>
                                <Text
                                  style={[
                                    styles.staffChipName,
                                    isPicked && styles.staffChipNameActive,
                                  ]}
                                >
                                  {st.name}
                                </Text>
                                <Text style={styles.staffChipRole}>
                                  {st.designation || st.roles?.[0] || 'Staff'}{' '}
                                  {st.mobileNumber ? `• ${st.mobileNumber}` : ''}
                                </Text>
                              </View>
                              {isPicked && <Check size={14} color="#2327D8" />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}

                  {/* Direct Mobile Number Input (No "Onboard Staff" button click needed) */}
                  <View style={styles.directOnboardContainer}>
                    <Text style={styles.fieldLabelDirect}>
                      Staff Mobile Number *
                    </Text>
                    <View style={styles.phoneInputRowDirect}>
                      <Text style={styles.phonePrefixText}>+91</Text>
                      <TextInput
                        style={styles.phoneInputDirect}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={quickStaffMobile}
                        onChangeText={handleStaffMobileChange}
                      />
                      {cleanMobileDigits.length === 10 &&
                        (matchedStaffFromMobile ? (
                          <CheckCircle2
                            size={18}
                            color="#16A34A"
                            style={{ marginRight: 8 }}
                          />
                        ) : (
                          <AlertCircle
                            size={18}
                            color="#D97706"
                            style={{ marginRight: 8 }}
                          />
                        ))}
                    </View>

                    {/* CASE A: Number is ALREADY ONBOARDED -> Auto-select, show details, no need to fill again */}
                    {matchedStaffFromMobile ? (
                      <View style={styles.staffAlreadyOnboardedCard}>
                        <View style={styles.staffAlreadyOnboardedTop}>
                          <View style={styles.staffSuccessIconWrap}>
                            <CheckCircle2 size={16} color="#15803D" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.staffAlreadyOnboardedTitle}>
                              Staff Already Onboarded & Selected
                            </Text>
                            <Text style={styles.staffAlreadyOnboardedName}>
                              {matchedStaffFromMobile.name}
                            </Text>
                            <Text style={styles.staffAlreadyOnboardedMeta}>
                              {matchedStaffFromMobile.designation ||
                                matchedStaffFromMobile.roles?.[0] ||
                                'Staff'}{' '}
                              • +91{' '}
                              {matchedStaffFromMobile.mobileNumber ||
                                matchedStaffFromMobile.phone}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.staffClearBtn}
                            onPress={() => {
                              setSelectedStaff(null);
                              setNewTaskAssignedTo('');
                              setQuickStaffMobile('');
                              setQuickStaffName('');
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.staffClearBtnText}>Change</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.staffNoNeedHint}>
                          ✓ Already registered in company directory. No need to fill
                          name or details again.
                        </Text>
                      </View>
                    ) : cleanMobileDigits.length === 10 ? (
                      /* CASE B: Number is NOT ONBOARDED -> Directly show Name and Role inputs */
                      <View style={styles.staffNotOnboardedCard}>
                        <View style={styles.staffNotOnboardedHeader}>
                          <UserPlus size={15} color="#2327D8" />
                          <Text style={styles.staffNotOnboardedTitle}>
                            New Staff • Quick Onboard
                          </Text>
                        </View>
                        <Text style={styles.staffNotOnboardedSub}>
                          This number is not yet in directory. Enter name to onboard & assign:
                        </Text>

                        <TextInput
                          style={[
                            styles.modalInput,
                            styles.quickOnboardInputDirect,
                          ]}
                          placeholder="Staff Full Name *"
                          placeholderTextColor="#94A3B8"
                          value={quickStaffName}
                          onChangeText={setQuickStaffName}
                          autoFocus={true}
                        />

                        <TextInput
                          style={[
                            styles.modalInput,
                            styles.quickOnboardInputDirect,
                            { marginTop: 6 },
                          ]}
                          placeholder="Role / Designation (e.g. Site Supervisor)"
                          placeholderTextColor="#94A3B8"
                          value={quickStaffRole}
                          onChangeText={setQuickStaffRole}
                        />

                        <TouchableOpacity
                          style={[
                            styles.quickOnboardSaveBtnDirect,
                            quickOnboardLoading && styles.disabledBtn,
                          ]}
                          onPress={handleQuickOnboardStaff}
                          disabled={quickOnboardLoading}
                          activeOpacity={0.8}
                        >
                          {quickOnboardLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <View style={styles.btnContentRow}>
                              <UserPlus
                                size={14}
                                color="#FFFFFF"
                                style={{ marginRight: 6 }}
                              />
                              <Text style={styles.quickOnboardSaveTextDirect}>
                                Onboard & Assign Staff
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* CASE C: Less than 10 digits helper */
                      <Text style={styles.staffNumberHelpText}>
                        {cleanMobileDigits.length === 0
                          ? 'Enter 10-digit mobile number to verify directory or onboard new staff.'
                          : `Enter remaining ${10 - cleanMobileDigits.length} digits...`}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Priority */}
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.prioritySelectorRow}>
                {[
                  { key: 'LOW', label: 'Low' },
                  { key: 'MEDIUM', label: 'Medium' },
                  { key: 'HIGH', label: 'High' },
                  { key: 'URGENT', label: 'Urgent' },
                ].map((item) => {
                  const isSelected = newTaskPriority === item.key;
                  const pColor = PRIORITY_COLORS[item.key] || PRIORITY_COLORS.MEDIUM;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.priorityOption,
                        isSelected && {
                          backgroundColor: pColor.bg,
                          borderColor: pColor.color,
                        },
                      ]}
                      onPress={() => setNewTaskPriority(item.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.priorityOptionText,
                          isSelected && {
                            color: pColor.color,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Due Date (Optional) */}
              <View style={styles.dueDateHeaderRow}>
                <Text style={styles.inputLabel}>Due Date (Optional)</Text>
                <View style={styles.quickDateChipsRow}>
                  {[
                    { label: '+3D', days: 3 },
                    { label: '+1W', days: 7 },
                    { label: '+2W', days: 14 },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.label}
                      style={styles.quickDateChip}
                      onPress={() => {
                        const target = new Date();
                        target.setDate(target.getDate() + chip.days);
                        const dd = String(target.getDate()).padStart(2, '0');
                        const mm = String(target.getMonth() + 1).padStart(2, '0');
                        const yyyy = target.getFullYear();
                        setNewTaskDueDate(`${dd}/${mm}/${yyyy}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickDateChipText}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.dateInputWrapper}>
                <TouchableOpacity
                  style={styles.datePickerTriggerBtn}
                  onPress={openCalendarForTask}
                  activeOpacity={0.8}
                >
                  <View style={styles.datePickerIconCircle}>
                    <Calendar size={16} color="#2327D8" strokeWidth={2.2} />
                  </View>
                  <Text
                    style={[
                      styles.datePickerTriggerText,
                      !newTaskDueDate && styles.datePickerPlaceholderText,
                    ]}
                  >
                    {newTaskDueDate || 'Date'}
                  </Text>
                  {newTaskDueDate ? (
                    <TouchableOpacity
                      style={styles.clearDateBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setNewTaskDueDate('');
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={15} color="#64748B" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.openCalBadge}>
                      <Text style={styles.openCalBadgeText}>Calendar</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Instructions / Description */}
              <Text style={styles.inputLabel}>Instructions / Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Description"
                placeholderTextColor="#94A3B8"
                value={newTaskDesc}
                onChangeText={setNewTaskDesc}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setTaskModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, submittingTask && styles.disabledBtn]}
                onPress={handleAddTask}
                disabled={submittingTask}
              >
                {submittingTask ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Calendar Picker */}
      <Modal visible={calendarPickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModalContent}>
            {/* Header with Month / Year & Prev / Next */}
            <View style={styles.calMonthHeader}>
              <TouchableOpacity
                style={styles.calArrowBtn}
                onPress={() => {
                  const d = new Date(calendarMonthDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarMonthDate(d);
                }}
                activeOpacity={0.7}
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
                activeOpacity={0.7}
              >
                <ChevronRight size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Week Days */}
            <View style={styles.calWeekDaysRow}>
              {WEEK_DAYS.map((wd) => (
                <Text key={wd} style={styles.calWeekDayText}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calDaysGrid}>
              {calendarGrid.map((item) => {
                if (!item.day) {
                  return <View key={item.id} style={styles.calEmptyDayCell} />;
                }
                const isSelected =
                  tempSelectedDate.getDate() === item.day &&
                  tempSelectedDate.getMonth() === calendarMonthDate.getMonth() &&
                  tempSelectedDate.getFullYear() === calendarMonthDate.getFullYear();

                const isToday =
                  new Date().getDate() === item.day &&
                  new Date().getMonth() === calendarMonthDate.getMonth() &&
                  new Date().getFullYear() === calendarMonthDate.getFullYear();

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.calDayCell,
                      isToday && styles.calDayCellToday,
                      isSelected && styles.calDayCellSelected,
                    ]}
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
                      style={[
                        styles.calDayCellText,
                        isToday && styles.calDayCellTextToday,
                        isSelected && styles.calDayCellTextSelected,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Modal Actions */}
            <View style={styles.calModalActionsRow}>
              <TouchableOpacity
                style={styles.calModalCancelBtn}
                onPress={() => setCalendarPickerVisible(false)}
              >
                <Text style={styles.calModalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calModalConfirmBtn}
                onPress={confirmCalendarDate}
              >
                <Text style={styles.calModalConfirmBtnText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Project Status & Management Switcher */}
      <Modal visible={statusMenuVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Project</Text>
              <TouchableOpacity onPress={() => setStatusMenuVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>Change Status</Text>
            <View style={styles.statusOptionsList}>
              {PROJECT_STATUSES.map((st) => {
                const isCurrent = project?.status === st;
                const badge = getStatusBadge(st);
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusOptionItem,
                      isCurrent && { backgroundColor: '#F8FAFC', borderColor: '#2327D8' },
                    ]}
                    onPress={() => handleUpdateProjectStatus(st)}
                    disabled={updatingStatus}
                  >
                    <View style={styles.statusOptionLeft}>
                      <View
                        style={[styles.statusBullet, { backgroundColor: badge.text }]}
                      />
                      <Text style={styles.statusOptionLabel}>{st}</Text>
                    </View>
                    {isCurrent && <Check size={18} color="#2327D8" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Delete Project Action */}
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.deleteProjectOption}
              onPress={() => {
                setStatusMenuVisible(false);
                handleDeleteProject();
              }}
            >
              <Trash2 size={16} color="#DC2626" />
              <Text style={styles.deleteProjectOptionText}>Delete Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6FB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  jobCodeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2327D8',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  moreButton: {
    padding: 6,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  projectDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  progressSection: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  progressVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2327D8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#2327D8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  addStageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  stageIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2327D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stageIndexText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stageTitleWrap: {
    flex: 1,
  },
  stageName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  stageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  stageProgressPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    marginRight: 4,
  },
  stageProgressPillComplete: {
    backgroundColor: '#DCFCE7',
  },
  stageProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2327D8',
  },
  stageProgressTextComplete: {
    color: '#16A34A',
  },
  dot: {
    marginHorizontal: 4,
    color: '#CBD5E1',
  },
  stageCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  stageChevronWrap: {
    paddingLeft: 8,
  },
  stageBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: '#FAFCFE',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stageMiniBarTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 10,
  },
  stageMiniBarFill: {
    height: '100%',
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  milestoneIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  milestoneHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  milestoneIndexLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milestoneProgressPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  milestoneProgressPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  milestoneProgressPillDone: {
    backgroundColor: '#DCFCE7',
  },
  milestoneProgressPillTextDone: {
    color: '#16A34A',
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addTaskBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2327D8',
    letterSpacing: 0.1,
  },
  tasksContainer: {
    gap: 10,
    marginTop: 4,
  },
  addTaskBottomRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFF',
    marginTop: 4,
  },
  addTaskBottomRowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2327D8',
  },

  // Single Task Card
  singleTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    gap: 6,
  },
  singleTaskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  singleTaskStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  singleTaskStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  singleTaskPriorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  singleTaskPriorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  singleTaskTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  singleTaskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  singleTaskDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  singleTaskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginTop: 2,
  },
  singleTaskStaffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  singleTaskStaffAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleTaskStaffAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  singleTaskStaffName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    maxWidth: 90,
  },
  singleTaskStaffRole: {
    fontSize: 10,
    color: '#64748B',
  },
  singleTaskUnassignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  singleTaskUnassignedText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  singleTaskDueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  singleTaskDueDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  noTasksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 10,
  },
  noTasksIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  noTasksTextGroup: {
    flex: 1,
  },
  noTasksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  noTasksSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  noTasksAddPill: {
    backgroundColor: '#2327D8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  noTasksAddPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addMilestoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  addMilestoneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  emptyStagesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  emptyStagesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptyStagesSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  createFirstStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2327D8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createFirstStageText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modals styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
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
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  priorityOptionText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2327D8',
    minWidth: 100,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },

  // Status Selector
  statusOptionsList: {
    gap: 8,
    marginTop: 8,
  },
  statusOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  stageDescText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  reorderCol: {
    flexDirection: 'column',
    gap: 4,
    marginRight: 6,
  },
  reorderBtn: {
    width: 22,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneDescText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  milestoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderRowMini: {
    flexDirection: 'row',
    gap: 2,
  },
  reorderMiniBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneProgressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  milestoneMiniBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: '#EEF2FF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  milestoneMiniBarFill: {
    height: '100%',
  },
  milestoneProgressValText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    minWidth: 26,
    textAlign: 'right',
  },
  taskDescLine: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assignedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4F46E5',
    maxWidth: 100,
  },
  modalTextArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  deleteProjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
  },
  deleteProjectOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Task Modal Specific Styles
  taskModalContent: {
    maxHeight: '90%',
    paddingBottom: 16,
  },
  taskModalScrollContent: {
    paddingBottom: 10,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  taskInsideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  taskInsideLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  taskInsideVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2327D8',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  staffHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  staffSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  staffTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  staffTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  staffTabBtnActive: {
    borderColor: '#2327D8',
    backgroundColor: '#EEF2FF',
  },
  staffTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  staffTabBtnTextActive: {
    color: '#2327D8',
    fontWeight: '700',
  },
  staffSelectionBox: {
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffSelectHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  staffChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  staffChipActive: {
    borderColor: '#2327D8',
    backgroundColor: '#EEF2FF',
  },
  staffChipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffChipAvatarActive: {
    backgroundColor: '#2327D8',
  },
  staffChipAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  staffChipAvatarTextActive: {
    color: '#FFFFFF',
  },
  staffChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  staffChipNameActive: {
    color: '#2327D8',
  },
  staffChipRole: {
    fontSize: 10,
    color: '#64748B',
  },
  emptyStaffNotice: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginBottom: 6,
  },
  emptyStaffNoticeText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  staffManualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  staffManualInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  onboardNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  onboardNavBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2327D8',
  },
  staffActionContainer: {
    marginTop: 4,
    gap: 8,
  },
  quickOnboardOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2327D8',
  },
  quickOnboardOpenBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullOnboardLink: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  fullOnboardLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2327D8',
  },
  quickOnboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.2,
    borderColor: '#C7D2FE',
    marginTop: 8,
    gap: 8,
  },
  quickOnboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  quickOnboardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2327D8',
  },
  quickOnboardInput: {
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
  },
  quickOnboardBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  quickOnboardCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  quickOnboardCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  quickOnboardSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2327D8',
  },
  quickOnboardSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  directOnboardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  fieldLabelDirect: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  phoneInputRowDirect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  phonePrefixText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  phoneInputDirect: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  staffNumberHelpText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  staffAlreadyOnboardedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    marginTop: 8,
  },
  staffAlreadyOnboardedTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  staffSuccessIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  staffAlreadyOnboardedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  staffAlreadyOnboardedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  staffAlreadyOnboardedMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    marginTop: 1,
  },
  staffNoNeedHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  staffClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  staffClearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  staffNotOnboardedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 8,
  },
  staffNotOnboardedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  staffNotOnboardedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2327D8',
  },
  staffNotOnboardedSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  quickOnboardInputDirect: {
    backgroundColor: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickOnboardSaveBtnDirect: {
    backgroundColor: '#2327D8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  quickOnboardSaveTextDirect: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueDateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  quickDateChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  quickDateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  dateInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  dateInputIcon: {
    position: 'absolute',
    left: 12,
    top: 13,
  },
  datePickerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
    gap: 10,
  },
  datePickerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  datePickerPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  clearDateBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  openCalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
  },
  openCalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2327D8',
  },

  // Calendar Modal
  calendarModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '92%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  calMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthYearLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  calWeekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  calWeekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calEmptyDayCell: {
    width: `${100 / 7}%`,
    height: 38,
  },
  calDayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  calDayCellToday: {
    borderWidth: 1.5,
    borderColor: '#2327D8',
    backgroundColor: '#EEF2FF',
  },
  calDayCellSelected: {
    backgroundColor: '#2327D8',
  },
  calDayCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  calDayCellTextToday: {
    color: '#2327D8',
    fontWeight: '700',
  },
  calDayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calModalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calModalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  calModalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  calModalConfirmBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#2327D8',
  },
  calModalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ProjectDetails;
