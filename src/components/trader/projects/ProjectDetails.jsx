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
  Image,
  Linking,
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
  DollarSign,
  TrendingUp,
  Package,
  Truck,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Send,
  Boxes,
  PieChart,
  HardHat,
  ArrowRightLeft,
  FileText,
  Paperclip,
  ExternalLink,
  FolderOpen,
  Eye,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getProjectDetails,
  updateProject,
  deleteProject,
  addProjectStage,
  reorderProjectStages,
  addProjectMilestone,
  createProductionMilestone,
  reorderProjectMilestones,
  addProjectTask,
  updateProjectTaskStatus,
  getCompanyDetails,
  getCompanies,
  addEmployeeToCompany,
  onboardStaff,
  getStaffList,
  getProjectProductionSummary,
  getProductionDemands,
  raiseProductionDemand,
  reviewProductionDemand,
  issueProductionMaterial,
  receiveProductionMaterial,
  consumeProductionMaterial,
  getProductionMaterials,
  getProductionStaffMembers,
  getProductionStaffAssignments,
  assignProductionStaff,
} from '../../../services/api';
import { resolveImageUrl } from '../../../services/uploadService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const TASK_STATUSES = [
  { key: 'TODO', label: 'To Do', color: '#64748B', bg: '#F1F5F9' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  { key: 'BLOCKED', label: 'Blocked', color: '#DC2626', bg: '#FEE2E2' },
  { key: 'COMPLETED', label: 'Completed', color: '#059669', bg: '#D1FAE5' },
  { key: 'CANCELLED', label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
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
  const [milestoneAllocatedMaterials, setMilestoneAllocatedMaterials] = useState([]);
  const [selectedMilestoneMatId, setSelectedMilestoneMatId] = useState('');
  const [selectedMilestoneMatQty, setSelectedMilestoneMatQty] = useState('');
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  // Staff Assignments
  const [staffAssignments, setStaffAssignments] = useState([]);

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

  // ─── PRODUCTION & COSTING SUB-TABS ───
  const [activeSubTab, setActiveSubTab] = useState('STAGES'); // 'STAGES' | 'COSTING' | 'DEMANDS' | 'TRANSACTIONS' | 'STAFF'

  // Costing State
  const [costingData, setCostingData] = useState(null);
  const [loadingCosting, setLoadingCosting] = useState(false);

  // Demands State
  const [demandsList, setDemandsList] = useState([]);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [raiseDemandModalVisible, setRaiseDemandModalVisible] = useState(false);
  const [demandMaterialId, setDemandMaterialId] = useState('');
  const [demandStageId, setDemandStageId] = useState('');
  const [demandQty, setDemandQty] = useState('');
  const [demandReason, setDemandReason] = useState('');
  const [submittingDemand, setSubmittingDemand] = useState(false);

  // Review Demand State
  const [reviewDemandModalVisible, setReviewDemandModalVisible] = useState(false);
  const [reviewingDemand, setReviewingDemand] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewApprovedQty, setReviewApprovedQty] = useState('');
  const [reviewRejectionReason, setReviewRejectionReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Material Transactions State
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [issueMaterialId, setIssueMaterialId] = useState('');
  const [issueStageId, setIssueStageId] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [issueUnit, setIssueUnit] = useState('Kg');
  const [issueWarehouse, setIssueWarehouse] = useState('Main Warehouse');
  const [issueNotes, setIssueNotes] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [receiveIssueId, setReceiveIssueId] = useState('');
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [submittingReceive, setSubmittingReceive] = useState(false);

  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [consumeMaterialId, setConsumeMaterialId] = useState('');
  const [consumeStageId, setConsumeStageId] = useState('');
  const [consumeQty, setConsumeQty] = useState('');
  const [returnQty, setReturnQty] = useState('0');
  const [consumeNotes, setConsumeNotes] = useState('');
  const [submittingConsume, setSubmittingConsume] = useState(false);

  // Production Staff Management State
  const [productionStaffList, setProductionStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assignStaffModalVisible, setAssignStaffModalVisible] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignStageId, setAssignStageId] = useState('');
  const [assignRole, setAssignRole] = useState('Machine Operator');
  const [assignHours, setAssignHours] = useState('8');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const fetchCostingSummary = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingCosting(true);
      const compId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        null;
      const res = await getProjectProductionSummary(projectId, compId);
      if (res?.success && res.data) {
        setCostingData(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch costing summary:', e?.message || e);
    } finally {
      setLoadingCosting(false);
    }
  }, [projectId, project?.companyId, params.companyId]);

  const fetchDemands = useCallback(async () => {
    try {
      setLoadingDemands(true);
      const compId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        null;
      const res = await getProductionDemands({ companyId: compId, projectId });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setDemandsList(list);
    } catch (e) {
      console.warn('Failed to fetch demands:', e?.message || e);
    } finally {
      setLoadingDemands(false);
    }
  }, [projectId, project?.companyId, params.companyId]);

  const fetchRawMaterials = useCallback(async () => {
    try {
      const compId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        null;
      const res = await getProductionMaterials({ companyId: compId, status: 'active' });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAvailableMaterials(list);
    } catch (e) {
      console.warn('Failed to fetch raw materials:', e?.message || e);
    }
  }, [project?.companyId, params.companyId]);

  const fetchProductionStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      const compId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        null;
      const [membersRes, assignRes] = await Promise.all([
        getProductionStaffMembers({ companyId: compId }),
        getProductionStaffAssignments({ companyId: compId, projectId }),
      ]);
      const list = Array.isArray(membersRes?.data) ? membersRes.data : (Array.isArray(membersRes) ? membersRes : []);
      setProductionStaffList(list);
      const assigns = Array.isArray(assignRes?.data) ? assignRes.data : (Array.isArray(assignRes) ? assignRes : []);
      setStaffAssignments(assigns);
    } catch (e) {
      console.warn('Failed to fetch production staff members/assignments:', e?.message || e);
    } finally {
      setLoadingStaff(false);
    }
  }, [project?.companyId, params.companyId, projectId]);

  // All Project Files & Documents Extraction
  const allProjectFiles = useMemo(() => {
    const list = [];
    // 1. Direct Project files / documents
    const directFiles = project?.files || project?.documents || project?.attachments || [];
    if (Array.isArray(directFiles)) {
      directFiles.forEach((f, idx) => {
        if (typeof f === 'string') {
          list.push({
            id: `pfile_${idx}`,
            name: f.split('/').pop() || `Document ${idx + 1}`,
            url: f,
            type: 'document',
            source: 'Project Document',
          });
        } else if (f && typeof f === 'object') {
          list.push({
            id: f._id || f.id || `pfile_${idx}`,
            name: f.name || f.fileName || f.title || `Document ${idx + 1}`,
            url: f.url || f.path || f.uri,
            type: f.type || 'document',
            source: 'Project Document',
            size: f.size,
          });
        }
      });
    }

    // 2. Product images / media
    const prodImages = project?.productId?.images || (project?.productId?.image ? [project.productId.image] : []) || [];
    if (Array.isArray(prodImages)) {
      prodImages.forEach((img, idx) => {
        const url = typeof img === 'string' ? img : img?.url || img?.uri;
        if (url) {
          list.push({
            id: `pimg_${idx}`,
            name: project?.productId?.name ? `${project.productId.name} Spec ${idx + 1}` : `Product Design ${idx + 1}`,
            url: url,
            type: 'image',
            source: 'Product Specs / CAD',
          });
        }
      });
    }

    // 3. Stage & Milestone & Task files
    (project?.stages || []).forEach((stg, sIdx) => {
      if (Array.isArray(stg.files)) {
        stg.files.forEach((f, idx) => {
          const url = typeof f === 'string' ? f : f?.url || f?.path;
          if (url) {
            list.push({
              id: `stg_${sIdx}_f_${idx}`,
              name: f.name || `Stage File ${idx + 1}`,
              url,
              type: 'document',
              source: `Stage: ${stg.name || sIdx + 1}`,
            });
          }
        });
      }
      (stg.milestones || []).forEach((ms, mIdx) => {
        if (Array.isArray(ms.files)) {
          ms.files.forEach((f, idx) => {
            const url = typeof f === 'string' ? f : f?.url || f?.path;
            if (url) {
              list.push({
                id: `ms_${mIdx}_f_${idx}`,
                name: f.name || `Milestone File ${idx + 1}`,
                url,
                type: 'document',
                source: `Milestone: ${ms.name || mIdx + 1}`,
              });
            }
          });
        }
        (ms.tasks || []).forEach((tsk, tIdx) => {
          const tFiles = tsk.attachments || tsk.files || [];
          if (Array.isArray(tFiles)) {
            tFiles.forEach((f, idx) => {
              const url = typeof f === 'string' ? f : f?.url || f?.path || f?.uri;
              if (url) {
                list.push({
                  id: `tsk_${tIdx}_f_${idx}`,
                  name: f.name || `Task Attachment ${idx + 1}`,
                  url,
                  type: 'document',
                  source: `Task: ${tsk.title || tIdx + 1}`,
                });
              }
            });
          }
        });
      });
    });

    return list;
  }, [project]);

  const handleOpenFile = (fileUrl) => {
    if (!fileUrl) return;
    const fullUrl = resolveImageUrl(fileUrl);
    if (fullUrl) {
      Linking.canOpenURL(fullUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(fullUrl);
          } else {
            Alert.alert('File URL', fullUrl);
          }
        })
        .catch(() => {
          Alert.alert('File URL', fullUrl);
        });
    }
  };

  useEffect(() => {
    if (activeSubTab === 'COSTING') {
      fetchCostingSummary();
    } else if (activeSubTab === 'DEMANDS') {
      fetchDemands();
      fetchRawMaterials();
    } else if (activeSubTab === 'TRANSACTIONS') {
      fetchRawMaterials();
    } else if (activeSubTab === 'STAFF') {
      fetchProductionStaff();
    }
  }, [activeSubTab, fetchCostingSummary, fetchDemands, fetchRawMaterials, fetchProductionStaff]);

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

      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        params.project?.companyId?._id ||
        params.project?.companyId?.id ||
        (typeof params.project?.companyId === 'string' ? params.project?.companyId : null) ||
        (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));

      const res = await getProjectDetails(projectId, null, effectiveCompId);
      let projData = res?.data?.project || res?.data;
      if (res?.success && projData) {
        let serverStages = Array.isArray(projData.stages) ? projData.stages : [];
        if (serverStages.length === 0) {
          try {
            const stgRes = await getProductionStages({ projectId, companyId: effectiveCompId });
            const list = Array.isArray(stgRes?.data) ? stgRes.data : (Array.isArray(stgRes) ? stgRes : []);
            if (list.length > 0) {
              serverStages = list;
              projData = { ...projData, stages: list };
            }
          } catch (e) { }
        }

        setProject((prev) => {
          const prevStages = Array.isArray(prev?.stages) ? prev.stages : [];
          const mergedStages = [...serverStages];
          prevStages.forEach((ps) => {
            const psId = String(ps._id || ps.id || '');
            if (psId && !mergedStages.some((ms) => String(ms._id || ms.id || '') === psId)) {
              mergedStages.push(ps);
            }
          });
          return {
            ...(prev || {}),
            ...projData,
            stages: mergedStages.length > 0 ? mergedStages : serverStages,
          };
        });

        if (projData.companyId) {
          fetchStaffList(projData.companyId);
        }
        if (serverStages.length > 0) {
          setExpandedStages((prev) => {
            if (Object.keys(prev).length === 0) {
              return { [serverStages[0]._id || serverStages[0].id || 0]: true };
            }
            return prev;
          });
        }
      } else if (projData) {
        setProject((prev) => ({ ...(prev || {}), ...projData }));
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
  }, [projectId, project?.companyId, params.companyId, fetchStaffList]);

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

  // Add Stage handler (POST /api/production/stages)
  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      Alert.alert('Required', 'Please enter a stage name.');
      return;
    }
    try {
      setSubmittingStage(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        params.project?.companyId?._id ||
        params.project?.companyId?.id ||
        (typeof params.project?.companyId === 'string' ? params.project?.companyId : null) ||
        (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));

      const sequence = (Array.isArray(project?.stages) ? project.stages.length : 0) + 1;
      const stagePayload = {
        companyId: effectiveCompId,
        projectId: projectId,
        name: newStageName.trim(),
        description: newStageDesc.trim() || undefined,
        sequence: sequence,
        plannedStartDate: null,
        plannedEndDate: null,
        actualStartDate: null,
        actualEndDate: null,
        status: 'PLANNED',
        selectedMaterials: [],
      };

      const res = await addProjectStage(projectId, stagePayload);
      if (res?.success || res?.data) {
        const createdStage = res?.data?.stage || res?.data || {
          _id: `stg_${Date.now()}`,
          companyId: effectiveCompId,
          projectId: projectId,
          name: newStageName.trim(),
          description: newStageDesc.trim(),
          sequence,
          status: 'PLANNED',
          progress: 0,
          milestones: [],
        };

        const targetStageId = createdStage._id || createdStage.id || `stg_${Date.now()}`;

        setProject((prev) => {
          if (!prev) return { stages: [createdStage] };
          const currentStages = Array.isArray(prev.stages) ? [...prev.stages] : [];
          // Avoid duplicate insertion
          const exists = currentStages.some((s) => String(s._id || s.id) === String(targetStageId));
          return {
            ...prev,
            stages: exists ? currentStages : [...currentStages, createdStage],
          };
        });

        setExpandedStages((prev) => ({
          ...prev,
          [targetStageId]: true,
        }));

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

  // Open Milestone Modal & preload available raw materials
  const openAddMilestoneModal = (stageId) => {
    setActiveStageIdForMilestone(stageId);
    setNewMilestoneTitle('');
    setNewMilestoneDesc('');
    setMilestoneAllocatedMaterials([]);
    setSelectedMilestoneMatId('');
    setSelectedMilestoneMatQty('');
    if (availableMaterials.length === 0) {
      fetchRawMaterials();
    }
    setMilestoneModalVisible(true);
  };

  // Add material to pending milestone allocated list
  const handleAddMaterialToMilestone = () => {
    if (!selectedMilestoneMatId) {
      Alert.alert('Required', 'Please select a raw material to allocate.');
      return;
    }
    const qty = parseFloat(selectedMilestoneMatQty);
    if (!qty || isNaN(qty) || qty <= 0) {
      Alert.alert('Required', 'Please enter a valid planned quantity greater than 0.');
      return;
    }
    const matObj = availableMaterials.find((m) => (m._id || m.id) === selectedMilestoneMatId);
    if (!matObj) {
      Alert.alert('Error', 'Selected material not found.');
      return;
    }

    const existingIdx = milestoneAllocatedMaterials.findIndex(
      (item) => item.materialId === (matObj._id || matObj.id)
    );
    if (existingIdx >= 0) {
      const updated = [...milestoneAllocatedMaterials];
      updated[existingIdx].plannedQuantity = qty;
      updated[existingIdx].allocatedQuantity = qty;
      setMilestoneAllocatedMaterials(updated);
    } else {
      setMilestoneAllocatedMaterials((prev) => [
        ...prev,
        {
          materialId: matObj._id || matObj.id,
          materialObj: matObj,
          name: matObj.name,
          materialCode: matObj.materialCode,
          unit: matObj.unit || 'units',
          standardCost: matObj.standardCost || 0,
          plannedQuantity: qty,
          allocatedQuantity: qty,
        },
      ]);
    }
    setSelectedMilestoneMatId('');
    setSelectedMilestoneMatQty('');
  };

  // Remove material from pending milestone allocated list
  const handleRemoveMaterialFromMilestone = (materialId) => {
    setMilestoneAllocatedMaterials((prev) =>
      prev.filter((item) => (item.materialId || item._id) !== materialId)
    );
  };

  // Add Milestone handler (POST /api/production/milestones)
  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) {
      Alert.alert('Required', 'Please enter milestone name.');
      return;
    }
    try {
      setSubmittingMilestone(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));

      const stage = (project?.stages || []).find(
        (s) => (s._id || s.id) === activeStageIdForMilestone
      );
      const sequence = (Array.isArray(stage?.milestones) ? stage.milestones.length : 0) + 1;

      const plannedCostCalc = milestoneAllocatedMaterials.reduce(
        (acc, m) => acc + (Number(m.plannedQuantity || 0) * Number(m.standardCost || 0)),
        0
      );

      const milestonePayload = {
        companyId: effectiveCompId,
        projectId: projectId,
        stageId: activeStageIdForMilestone,
        name: newMilestoneTitle.trim(),
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim() || '',
        sequence: sequence,
        status: 'PLANNED',
        plannedStartDate: null,
        plannedEndDate: null,
        actualStartDate: null,
        actualEndDate: null,
        plannedCost: plannedCostCalc,
        allocatedMaterials: milestoneAllocatedMaterials.map((m) => ({
          materialId: m.materialId,
          plannedQuantity: Number(m.plannedQuantity || m.allocatedQuantity || 0),
          allocatedQuantity: Number(m.allocatedQuantity || m.plannedQuantity || 0),
        })),
      };

      const res = await addProjectMilestone(projectId, activeStageIdForMilestone, milestonePayload);
      if (res?.success || res?.data) {
        const createdMs = res?.data?.milestone || res?.data || {
          _id: `ms_${Date.now()}`,
          companyId: effectiveCompId,
          projectId: projectId,
          stageId: activeStageIdForMilestone,
          name: newMilestoneTitle.trim(),
          title: newMilestoneTitle.trim(),
          description: newMilestoneDesc.trim(),
          sequence,
          status: 'PLANNED',
          progress: 0,
          allocatedMaterials: milestoneAllocatedMaterials.map((m) => ({
            materialId: m.materialObj || {
              _id: m.materialId,
              name: m.name,
              materialCode: m.materialCode,
              unit: m.unit,
              standardCost: m.standardCost,
            },
            plannedQuantity: m.plannedQuantity,
            allocatedQuantity: m.allocatedQuantity,
            issuedQuantity: 0,
            consumedQuantity: 0,
            returnedQuantity: 0,
            remainingQuantity: m.allocatedQuantity,
          })),
          tasks: [],
        };

        setProject((prev) => {
          if (!prev || !prev.stages) return prev;
          return {
            ...prev,
            stages: prev.stages.map((s) => {
              if ((s._id || s.id) === activeStageIdForMilestone) {
                const existingMs = Array.isArray(s.milestones) ? s.milestones : [];
                return { ...s, milestones: [...existingMs, createdMs] };
              }
              return s;
            }),
          };
        });

        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        setMilestoneAllocatedMaterials([]);
        setSelectedMilestoneMatId('');
        setSelectedMilestoneMatQty('');
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
      } catch (e) { }

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

      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId ||
        (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));

      const payload = {
        companyId: effectiveCompId,
        projectId: projectId,
        stageId: activeStageIdForTask,
        milestoneId: activeMilestoneIdForTask,
        title: newTaskTitle.trim(),
        name: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        priority: newTaskPriority || 'MEDIUM',
        dueDate: formattedDueDate,
        status: 'TODO',
      };

      if (staffTab === 'ONBOARD') {
        if (chosenStaffId && isMongoId(chosenStaffId)) {
          payload.assignedStaffId = chosenStaffId;
          payload.assignedTo = chosenStaffId;
        } else if (selectedStaff?.name || assignedText) {
          const staffLabel = selectedStaff?.name || assignedText;
          const staffMob = selectedStaff?.mobileNumber ? ` (${selectedStaff.mobileNumber})` : '';
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
        const createdTask = res?.data?.task || res?.data || {
          _id: `task_${Date.now()}`,
          companyId: effectiveCompId,
          projectId: projectId,
          stageId: activeStageIdForTask,
          milestoneId: activeMilestoneIdForTask,
          title: newTaskTitle.trim(),
          name: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          priority: newTaskPriority,
          status: 'TODO',
          dueDate: formattedDueDate,
          assignedTo: selectedStaff || (chosenStaffId ? { _id: chosenStaffId } : null),
        };

        setProject((prev) => {
          if (!prev || !prev.stages) return prev;
          return {
            ...prev,
            stages: prev.stages.map((stg) => {
              if ((stg._id || stg.id) === activeStageIdForTask) {
                return {
                  ...stg,
                  milestones: (stg.milestones || []).map((ms) => {
                    if ((ms._id || ms.id) === activeMilestoneIdForTask) {
                      const currentTasks = Array.isArray(ms.tasks) ? ms.tasks : [];
                      return { ...ms, tasks: [...currentTasks, createdTask] };
                    }
                    return ms;
                  }),
                };
              }
              return stg;
            }),
          };
        });

        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        setNewTaskAssignedTo('');
        setSelectedStaff(null);
        setStaffTab('UNASSIGNED');
        setShowQuickOnboard(false);
        setTaskModalVisible(false);
        fetchDetails();
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
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId;
      const res = await updateProjectTaskStatus(projectId, task._id || task.id, newStatus, null, null, effectiveCompId);
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

  // Raise Material Demand (API 4.1)
  const handleRaiseDemandSubmit = async () => {
    if (!demandMaterialId) {
      Alert.alert('Required', 'Please select a raw material.');
      return;
    }
    if (!demandQty || isNaN(Number(demandQty)) || Number(demandQty) <= 0) {
      Alert.alert('Required', 'Please enter a valid requested quantity.');
      return;
    }

    try {
      setSubmittingDemand(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId;

      const res = await raiseProductionDemand({
        companyId: effectiveCompId,
        projectId,
        stageId: demandStageId || undefined,
        materialId: demandMaterialId,
        requestedQuantity: Number(demandQty),
        reason: demandReason.trim() || undefined,
      });

      if (res?.success) {
        Alert.alert('Success', 'Material demand raised successfully.');
        setRaiseDemandModalVisible(false);
        setDemandMaterialId('');
        setDemandStageId('');
        setDemandQty('');
        setDemandReason('');
        fetchDemands();
      } else {
        Alert.alert('Error', res?.message || 'Failed to raise demand.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to raise demand.');
    } finally {
      setSubmittingDemand(false);
    }
  };

  // Review Material Demand (API 4.3)
  const handleReviewDemandSubmit = async () => {
    if (!reviewingDemand?._id) return;
    if (reviewAction === 'APPROVE' || reviewAction === 'PARTIALLY_APPROVE') {
      if (!reviewApprovedQty || isNaN(Number(reviewApprovedQty)) || Number(reviewApprovedQty) <= 0) {
        Alert.alert('Required', 'Please enter valid approved quantity.');
        return;
      }
    } else if (reviewAction === 'REJECT') {
      if (!reviewRejectionReason.trim()) {
        Alert.alert('Required', 'Please enter a rejection reason.');
        return;
      }
    }

    try {
      setSubmittingReview(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId;

      const payload = {
        action: reviewAction,
        ...(reviewAction === 'APPROVE' || reviewAction === 'PARTIALLY_APPROVE'
          ? { approvedQuantity: Number(reviewApprovedQty) }
          : { rejectionReason: reviewRejectionReason.trim() }),
      };

      const res = await reviewProductionDemand(reviewingDemand._id, effectiveCompId, payload);
      if (res?.success) {
        Alert.alert('Success', `Demand review complete: ${reviewAction}`);
        setReviewDemandModalVisible(false);
        setReviewingDemand(null);
        fetchDemands();
      } else {
        Alert.alert('Error', res?.message || 'Failed to review demand.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to review demand.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Issue Material to Workstation (API 5.1)
  const handleIssueSubmit = async () => {
    if (!issueMaterialId) {
      Alert.alert('Required', 'Please select a material.');
      return;
    }
    if (!issueQty || isNaN(Number(issueQty)) || Number(issueQty) <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity to issue.');
      return;
    }

    try {
      setSubmittingIssue(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId;

      const res = await issueProductionMaterial({
        companyId: effectiveCompId,
        projectId,
        stageId: issueStageId || undefined,
        materialId: issueMaterialId,
        warehouse: issueWarehouse.trim() || 'Main Warehouse',
        quantity: Number(issueQty),
        unit: issueUnit.trim() || 'Kg',
        notes: issueNotes.trim() || undefined,
      });

      if (res?.success) {
        Alert.alert('Success', 'Material issued to workstation successfully.');
        setIssueModalVisible(false);
        setIssueMaterialId('');
        setIssueStageId('');
        setIssueQty('');
        setIssueNotes('');
        fetchCostingSummary();
      } else {
        Alert.alert('Error', res?.message || 'Failed to issue material.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to issue material.');
    } finally {
      setSubmittingIssue(false);
    }
  };

  // Receive Material (API 5.2)
  const handleReceiveSubmit = async () => {
    if (!receiveIssueId.trim()) {
      Alert.alert('Required', 'Please enter the Issue ID.');
      return;
    }
    if (!receiveQty || isNaN(Number(receiveQty)) || Number(receiveQty) <= 0) {
      Alert.alert('Required', 'Please enter received quantity.');
      return;
    }

    try {
      setSubmittingReceive(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId;

      const res = await receiveProductionMaterial({
        companyId: effectiveCompId,
        issueId: receiveIssueId.trim(),
        receivedQuantity: Number(receiveQty),
        notes: receiveNotes.trim() || undefined,
      });

      if (res?.success) {
        Alert.alert('Success', 'Material receipt confirmed by floor staff.');
        setReceiveModalVisible(false);
        setReceiveIssueId('');
        setReceiveQty('');
        setReceiveNotes('');
      } else {
        Alert.alert('Error', res?.message || 'Failed to confirm receipt.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to confirm receipt.');
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Log Consumption (API 5.3)
  const handleConsumeSubmit = async () => {
    if (!consumeMaterialId) {
      Alert.alert('Required', 'Please select the material consumed.');
      return;
    }
    if (!consumeQty || isNaN(Number(consumeQty)) || Number(consumeQty) <= 0) {
      Alert.alert('Required', 'Please enter consumed quantity.');
      return;
    }

    try {
      setSubmittingConsume(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId;

      const res = await consumeProductionMaterial({
        companyId: effectiveCompId,
        projectId,
        stageId: consumeStageId || undefined,
        materialId: consumeMaterialId,
        consumedQuantity: Number(consumeQty),
        returnedQuantity: Number(returnQty || 0),
        notes: consumeNotes.trim() || undefined,
      });

      if (res?.success) {
        Alert.alert('Success', 'Material consumption recorded successfully.');
        setConsumeModalVisible(false);
        setConsumeMaterialId('');
        setConsumeStageId('');
        setConsumeQty('');
        setReturnQty('0');
        setConsumeNotes('');
        fetchCostingSummary();
      } else {
        Alert.alert('Error', res?.message || 'Failed to record consumption.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to record consumption.');
    } finally {
      setSubmittingConsume(false);
    }
  };

  // Assign Staff to Stage (API 7.6)
  const handleAssignStaffSubmit = async () => {
    if (!assignStaffId) {
      Alert.alert('Required', 'Please select a staff member.');
      return;
    }
    if (!assignStageId) {
      Alert.alert('Required', 'Please select a stage.');
      return;
    }

    try {
      setSubmittingAssign(true);
      const effectiveCompId =
        project?.companyId?._id ||
        project?.companyId?.id ||
        (typeof project?.companyId === 'string' ? project?.companyId : null) ||
        params.companyId;

      const res = await assignProductionStaff({
        companyId: effectiveCompId,
        staffId: assignStaffId,
        stageId: assignStageId,
        roleInStage: assignRole.trim() || 'Machine Operator',
        assignedHours: Number(assignHours || 8),
        status: 'ASSIGNED',
      });

      if (res?.success) {
        Alert.alert('Success', 'Staff member assigned to stage.');
        setAssignStaffModalVisible(false);
        setAssignStaffId('');
        setAssignStageId('');
        setAssignHours('8');
        fetchProductionStaff();
        fetchDetails();
      } else {
        Alert.alert('Error', res?.message || 'Failed to assign staff.');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to assign staff.');
    } finally {
      setSubmittingAssign(false);
    }
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
  const overallProgress = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        typeof project?.overallProgress === 'number'
          ? project.overallProgress
          : typeof project?.progress === 'number'
            ? project.progress
            : typeof project?.completionPercentage === 'number'
              ? project.completionPercentage
              : Array.isArray(project?.stages) && project.stages.length > 0
                ? project.stages.reduce((acc, s) => {
                  const p = Number(
                    s.progressPercentage ??
                    s.progress ??
                    (s.status === 'COMPLETED' || s.isCompleted ? 100 : s.status === 'IN_PROGRESS' ? (s.progress || 0) : 0)
                  ) || 0;
                  return acc + p;
                }, 0) / project.stages.length
                : (project?.status || '').toUpperCase() === 'COMPLETED'
                  ? 100
                  : 0
      )
    )
  );

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

        {/* ─── SUB-TAB NAVIGATION BAR ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subTabBar}
          contentContainerStyle={styles.subTabBarContent}
        >
          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'STAGES' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('STAGES')}
            activeOpacity={0.8}
          >
            <Layers size={14} color={activeSubTab === 'STAGES' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.subTabPillText, activeSubTab === 'STAGES' && styles.subTabPillTextActive]}>
              Stages & Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'COSTING' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('COSTING')}
            activeOpacity={0.8}
          >
            <DollarSign size={14} color={activeSubTab === 'COSTING' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.subTabPillText, activeSubTab === 'COSTING' && styles.subTabPillTextActive]}>
              Costing & Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'DEMANDS' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('DEMANDS')}
            activeOpacity={0.8}
          >
            <Package size={14} color={activeSubTab === 'DEMANDS' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.subTabPillText, activeSubTab === 'DEMANDS' && styles.subTabPillTextActive]}>
              Material Demands
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'TRANSACTIONS' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('TRANSACTIONS')}
            activeOpacity={0.8}
          >
            <ArrowRightLeft size={14} color={activeSubTab === 'TRANSACTIONS' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.subTabPillText, activeSubTab === 'TRANSACTIONS' && styles.subTabPillTextActive]}>
              Transactions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'STAFF' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('STAFF')}
            activeOpacity={0.8}
          >
            <HardHat size={14} color={activeSubTab === 'STAFF' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.subTabPillText, activeSubTab === 'STAFF' && styles.subTabPillTextActive]}>
              Staff Allocation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'FILES' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('FILES')}
            activeOpacity={0.8}
          >
            <FileText size={14} color={activeSubTab === 'FILES' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.subTabPillText, activeSubTab === 'FILES' && styles.subTabPillTextActive]}>
              Files & Media{allProjectFiles.length > 0 ? ` (${allProjectFiles.length})` : ''}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ─── TAB 1: STAGES & TASKS ─── */}
        {activeSubTab === 'STAGES' && (
          <>
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
                        <Text style={styles.stageName}>{stage.name || stage.stageName || `Stage ${sIdx + 1}`}</Text>
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
                                    <Text style={styles.milestoneTitle}>{milestone.name || milestone.title}</Text>
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
                                    onPress={() => openAddTaskModal(stageId, milestoneId, milestone.name || milestone.title)}
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

                              {/* Allocated Raw Materials for Milestone */}
                              {Array.isArray(milestone.allocatedMaterials) && milestone.allocatedMaterials.length > 0 && (
                                <View style={styles.milestoneMaterialsContainer}>
                                  <View style={styles.milestoneMaterialsHeader}>
                                    <Package size={12} color="#4F46E5" />
                                    <Text style={styles.milestoneMaterialsHeaderTitle}>
                                      Allocated Materials ({milestone.allocatedMaterials.length})
                                    </Text>
                                  </View>
                                  <View style={styles.milestoneMaterialsGrid}>
                                    {milestone.allocatedMaterials.map((mat, matIdx) => {
                                      const matObj = (typeof mat.materialId === 'object' && mat.materialId !== null)
                                        ? mat.materialId
                                        : (availableMaterials.find(m => (m._id || m.id) === (mat.materialId || mat._id)) || {});
                                      const name = matObj.name || mat.name || 'Raw Material';
                                      const code = matObj.materialCode || mat.materialCode || '';
                                      const unit = matObj.unit || mat.unit || 'units';
                                      const allocated = Number(mat.allocatedQuantity ?? mat.plannedQuantity ?? 0);
                                      const consumed = Number(mat.consumedQuantity ?? 0);
                                      const remaining = Number(mat.remainingQuantity ?? (allocated - consumed));

                                      return (
                                        <View key={mat._id || matIdx} style={styles.milestoneMaterialCard}>
                                          <View style={styles.milestoneMaterialTopRow}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                              <Text style={styles.milestoneMaterialName} numberOfLines={1}>
                                                {name}
                                              </Text>
                                              {code ? (
                                                <Text style={styles.milestoneMaterialCode}>{code}</Text>
                                              ) : null}
                                            </View>
                                            <View style={styles.milestoneMaterialAllocPill}>
                                              <Text style={styles.milestoneMaterialAllocText}>
                                                {allocated} {unit}
                                              </Text>
                                            </View>
                                          </View>
                                          {(consumed > 0 || remaining !== allocated) && (
                                            <View style={styles.milestoneMaterialStatsRow}>
                                              <Text style={styles.milestoneMaterialStatText}>
                                                Used: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{consumed} {unit}</Text>
                                              </Text>
                                              <Text style={styles.milestoneMaterialStatDivider}>•</Text>
                                              <Text style={styles.milestoneMaterialStatText}>
                                                Left: <Text style={{ fontWeight: '700', color: remaining > 0 ? '#059669' : '#DC2626' }}>{remaining} {unit}</Text>
                                              </Text>
                                            </View>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>
                                </View>
                              )}

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
                                              {(task.status === 'COMPLETED' || task.status === 'DONE') ? (
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
                                              (task.status === 'COMPLETED' || task.status === 'DONE') && styles.singleTaskTitleDone,
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
                          onPress={() => openAddMilestoneModal(stageId)}
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
          </>
        )}

        {/* ─── TAB 2: PRODUCTION COSTING & SUMMARY (API 6.1) ─── */}
        {activeSubTab === 'COSTING' && (
          <View style={styles.tabContentWrap}>
            {loadingCosting ? (
              <View style={styles.tabLoadingBox}>
                <ActivityIndicator size="small" color="#2327D8" />
                <Text style={styles.tabLoadingText}>Calculating live production costing...</Text>
              </View>
            ) : (
              <>
                {/* Hero Costing Card */}
                <View style={styles.costHeroCard}>
                  <View style={styles.costHeroTop}>
                    <View>
                      <Text style={styles.costHeroLabel}>Grand Total Production Cost</Text>
                      <Text style={styles.costHeroValue}>
                        ₹{Number(costingData?.costingSummary?.grandTotalProductionCost || costingData?.totalCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.budgetStatusPill,
                        costingData?.costingSummary?.budgetStatus === 'UNDER_BUDGET'
                          ? styles.budgetUnder
                          : costingData?.costingSummary?.budgetStatus === 'OVER_BUDGET'
                            ? styles.budgetOver
                            : styles.budgetTrack,
                      ]}
                    >
                      <Text style={styles.budgetStatusText}>
                        {(costingData?.costingSummary?.budgetStatus || 'ON_TRACK').replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.costHeroGrid}>
                    <View style={styles.costHeroCol}>
                      <Text style={styles.costHeroSubLabel}>Planned Budget</Text>
                      <Text style={styles.costHeroSubVal}>
                        ₹{Number(costingData?.costingSummary?.plannedBudget || project?.plannedBudget || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.costHeroCol}>
                      <Text style={styles.costHeroSubLabel}>Cost Per Unit</Text>
                      <Text style={styles.costHeroSubVal}>
                        ₹{Number(costingData?.costingSummary?.costPerUnit || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.costHeroCol}>
                      <Text style={styles.costHeroSubLabel}>Budget Variance</Text>
                      <Text
                        style={[
                          styles.costHeroSubVal,
                          {
                            color:
                              (costingData?.costingSummary?.budgetVariance || 0) >= 0
                                ? '#10B981'
                                : '#EF4444',
                          },
                        ]}
                      >
                        ₹{Number(costingData?.costingSummary?.budgetVariance || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3 Pillars of Production Cost */}
                <View style={styles.costPillarsRow}>
                  <View style={styles.costPillarCard}>
                    <Package size={16} color="#2563EB" />
                    <Text style={styles.costPillarTitle}>Material Cost</Text>
                    <Text style={styles.costPillarAmount}>
                      ₹{Number(costingData?.costingSummary?.totalMaterialCost || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.costPillarCard}>
                    <Users size={16} color="#059669" />
                    <Text style={styles.costPillarTitle}>Labour Cost</Text>
                    <Text style={styles.costPillarAmount}>
                      ₹{Number(costingData?.costingSummary?.totalLabourCost || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.costPillarCard}>
                    <DollarSign size={16} color="#D97706" />
                    <Text style={styles.costPillarTitle}>Other Cost</Text>
                    <Text style={styles.costPillarAmount}>
                      ₹{Number(costingData?.costingSummary?.totalOtherCost || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Consumed Materials Breakdown */}
                <View style={styles.breakdownSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleGroup}>
                      <View style={[styles.sectionIconBadge, { backgroundColor: '#EFF6FF' }]}>
                        <Package size={16} color="#2563EB" />
                      </View>
                      <Text style={styles.sectionTitle}>Consumed Raw Materials</Text>
                    </View>
                  </View>

                  {Array.isArray(costingData?.consumedMaterials) && costingData.consumedMaterials.length > 0 ? (
                    costingData.consumedMaterials.map((mat, mIdx) => (
                      <View key={mat.materialId || mIdx} style={styles.consumedMaterialRow}>
                        <View style={styles.consumedMatLeft}>
                          <Text style={styles.consumedMatName}>{mat.name || mat.materialCode || 'Raw Material'}</Text>
                          <Text style={styles.consumedMatSub}>Code: {mat.materialCode || 'N/A'}</Text>
                        </View>
                        <View style={styles.consumedMatMid}>
                          <Text style={styles.consumedMatQty}>
                            {mat.consumedQuantity} {mat.unit || 'Kg'}
                          </Text>
                          {Number(mat.returnedQuantity) > 0 && (
                            <Text style={styles.consumedMatReturned}>
                              ({mat.returnedQuantity} unused returned)
                            </Text>
                          )}
                        </View>
                        <View style={styles.consumedMatRight}>
                          <Text style={styles.consumedMatCost}>
                            ₹{Number(mat.totalCost || 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyNoticeText}>No materials consumed yet. Use the Transactions tab to log consumption.</Text>
                  )}
                </View>

                {/* Labour Hours Breakdown */}
                <View style={styles.breakdownSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleGroup}>
                      <View style={[styles.sectionIconBadge, { backgroundColor: '#ECFDF5' }]}>
                        <HardHat size={16} color="#059669" />
                      </View>
                      <Text style={styles.sectionTitle}>Labour & Floor Staff</Text>
                    </View>
                    <Text style={styles.totalHoursBadge}>
                      {costingData?.labourBreakdown?.totalLabourHours || 0} Total Hrs
                    </Text>
                  </View>

                  {Array.isArray(costingData?.labourBreakdown?.staffBreakdown) &&
                    costingData.labourBreakdown.staffBreakdown.length > 0 ? (
                    costingData.labourBreakdown.staffBreakdown.map((st, sIdx) => (
                      <View key={st.staffId || sIdx} style={styles.consumedMaterialRow}>
                        <View style={styles.consumedMatLeft}>
                          <Text style={styles.consumedMatName}>{st.name || 'Floor Operator'}</Text>
                        </View>
                        <View style={styles.consumedMatMid}>
                          <Text style={styles.consumedMatQty}>{st.totalHours} hrs</Text>
                        </View>
                        <View style={styles.consumedMatRight}>
                          <Text style={styles.consumedMatCost}>
                            ₹{Number(st.totalLabourCost || 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyNoticeText}>No labour hours recorded yet.</Text>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* ─── TAB 3: MATERIAL DEMANDS (API 4) ─── */}
        {activeSubTab === 'DEMANDS' && (
          <View style={styles.tabContentWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Package size={16} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Material Demands</Text>
                  <Text style={styles.sectionSubtitle}>Floor demand raise & review</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.addStageBtn}
                onPress={() => {
                  setDemandMaterialId('');
                  setDemandQty('');
                  setDemandReason('');
                  setRaiseDemandModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.addStageBtnText}>Raise Demand</Text>
              </TouchableOpacity>
            </View>

            {loadingDemands ? (
              <View style={styles.tabLoadingBox}>
                <ActivityIndicator size="small" color="#2327D8" />
                <Text style={styles.tabLoadingText}>Loading material demands...</Text>
              </View>
            ) : demandsList && demandsList.length > 0 ? (
              demandsList.map((demand, dIdx) => {
                const matName =
                  typeof demand.materialId === 'object'
                    ? demand.materialId?.name || demand.materialId?.materialCode
                    : 'Raw Material';
                const matUnit =
                  typeof demand.materialId === 'object' ? demand.materialId?.unit || 'Kg' : 'Kg';
                const reqName =
                  typeof demand.requestedBy === 'object'
                    ? demand.requestedBy?.name || demand.requestedBy?.mobileNumber
                    : 'Floor Supervisor';
                const isPending = (demand.status || 'PENDING').toUpperCase() === 'PENDING';
                const isApproved = (demand.status || '').toUpperCase() === 'APPROVED';
                const isRejected = (demand.status || '').toUpperCase() === 'REJECTED';

                return (
                  <View key={demand._id || dIdx} style={styles.demandCard}>
                    <View style={styles.demandCardHeader}>
                      <View style={styles.demandMatWrap}>
                        <Text style={styles.demandMatName}>{matName}</Text>
                        <Text style={styles.demandSubText}>
                          By: {reqName} • {demand.createdAt ? new Date(demand.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.demandStatusPill,
                          isApproved
                            ? styles.statusApproved
                            : isRejected
                              ? styles.statusRejected
                              : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.demandStatusText,
                            isApproved
                              ? styles.statusApprovedText
                              : isRejected
                                ? styles.statusRejectedText
                                : styles.statusPendingText,
                          ]}
                        >
                          {demand.status || 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.demandQtyRow}>
                      <View style={styles.demandQtyCol}>
                        <Text style={styles.demandQtyLabel}>Requested Qty</Text>
                        <Text style={styles.demandQtyValue}>
                          {demand.requestedQuantity} {matUnit}
                        </Text>
                      </View>
                      <View style={styles.demandQtyCol}>
                        <Text style={styles.demandQtyLabel}>Approved Qty</Text>
                        <Text style={styles.demandQtyValue}>
                          {demand.approvedQuantity || 0} {matUnit}
                        </Text>
                      </View>
                    </View>

                    {demand.reason ? (
                      <View style={styles.demandReasonBox}>
                        <Text style={styles.demandReasonLabel}>Reason:</Text>
                        <Text style={styles.demandReasonText}>{demand.reason}</Text>
                      </View>
                    ) : null}

                    {isPending && (
                      <View style={styles.demandActionsRow}>
                        <TouchableOpacity
                          style={styles.reviewDemandBtn}
                          onPress={() => {
                            setReviewingDemand(demand);
                            setReviewAction('APPROVE');
                            setReviewApprovedQty(String(demand.requestedQuantity || ''));
                            setReviewRejectionReason('');
                            setReviewDemandModalVisible(true);
                          }}
                        >
                          <ShieldCheck size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                          <Text style={styles.reviewDemandBtnText}>Review / Approve</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyTabCard}>
                <Package size={36} color="#CBD5E1" />
                <Text style={styles.emptyTabTitle}>No Demands Raised Yet</Text>
                <Text style={styles.emptyTabDesc}>
                  Need extra raw materials for this project? Tap "Raise Demand" to notify management.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── TAB 4: MATERIAL TRANSACTIONS (API 5) ─── */}
        {activeSubTab === 'TRANSACTIONS' && (
          <View style={styles.tabContentWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#EEF2FF' }]}>
                  <ArrowRightLeft size={16} color="#2327D8" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Material Transactions</Text>
                  <Text style={styles.sectionSubtitle}>Warehouse & floor inventory flows</Text>
                </View>
              </View>
            </View>

            {/* 3 Quick Flow Action Cards */}
            <TouchableOpacity
              style={styles.transactionActionCard}
              onPress={() => {
                setIssueMaterialId('');
                setIssueQty('');
                setIssueNotes('');
                setIssueModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.txActionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Truck size={20} color="#2563EB" />
              </View>
              <View style={styles.txActionTextWrap}>
                <Text style={styles.txActionTitle}>1. Issue Material to Floor</Text>
                <Text style={styles.txActionSubtitle}>Dispatch raw material from warehouse to production floor</Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transactionActionCard}
              onPress={() => {
                setReceiveIssueId('');
                setReceiveQty('');
                setReceiveNotes('');
                setReceiveModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.txActionIconBox, { backgroundColor: '#ECFDF5' }]}>
                <CheckCircle2 size={20} color="#059669" />
              </View>
              <View style={styles.txActionTextWrap}>
                <Text style={styles.txActionTitle}>2. Confirm Material Receipt</Text>
                <Text style={styles.txActionSubtitle}>Floor worker acknowledges delivered batch and quantity</Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transactionActionCard}
              onPress={() => {
                setConsumeMaterialId('');
                setConsumeQty('');
                setReturnQty('0');
                setConsumeNotes('');
                setConsumeModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.txActionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Boxes size={20} color="#D97706" />
              </View>
              <View style={styles.txActionTextWrap}>
                <Text style={styles.txActionTitle}>3. Record Actual Consumption</Text>
                <Text style={styles.txActionSubtitle}>Log units consumed and unused returns for actual costing</Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── TAB 5: STAFF ALLOCATION (API 7) ─── */}
        {activeSubTab === 'STAFF' && (
          <View style={styles.tabContentWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <View style={[styles.sectionIconBadge, { backgroundColor: '#ECFDF5' }]}>
                  <HardHat size={16} color="#059669" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Floor Staff Management</Text>
                  <Text style={styles.sectionSubtitle}>Factory operators & hourly rates</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.addStageBtn}
                onPress={() => {
                  setAssignStaffId('');
                  setAssignHours('8');
                  setAssignStaffModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.addStageBtnText}>Assign Staff</Text>
              </TouchableOpacity>
            </View>

            {loadingStaff ? (
              <View style={styles.tabLoadingBox}>
                <ActivityIndicator size="small" color="#2327D8" />
                <Text style={styles.tabLoadingText}>Loading staff directory...</Text>
              </View>
            ) : productionStaffList && productionStaffList.length > 0 ? (
              productionStaffList.map((st, stIdx) => (
                <View key={st._id || stIdx} style={styles.staffMemberCard}>
                  <View style={styles.staffCardHeader}>
                    <View style={styles.staffAvatarCircle}>
                      <Text style={styles.staffAvatarText}>
                        {(st.name || 'S').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.staffInfoCol}>
                      <Text style={styles.staffMemberName}>{st.name}</Text>
                      <Text style={styles.staffMemberRole}>
                        {st.role || 'Machine Operator'} • {st.mobileNumber}
                      </Text>
                    </View>
                    <View style={styles.staffRateBadge}>
                      <Text style={styles.staffRateText}>₹{st.hourlyRate || 200}/hr</Text>
                    </View>
                  </View>

                  {Array.isArray(st.skillTags) && st.skillTags.length > 0 && (
                    <View style={styles.skillTagsRow}>
                      {st.skillTags.map((tag, tIdx) => (
                        <View key={tIdx} style={styles.skillTagPill}>
                          <Text style={styles.skillTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.assignStageMiniBtn}
                    onPress={() => {
                      setAssignStaffId(st._id);
                      setAssignRole(st.role || 'Machine Operator');
                      setAssignHours('8');
                      setAssignStaffModalVisible(true);
                    }}
                  >
                    <Text style={styles.assignStageMiniBtnText}>+ Assign to Stage</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyTabCard}>
                <HardHat size={36} color="#CBD5E1" />
                <Text style={styles.emptyTabTitle}>No Floor Staff Members</Text>
                <Text style={styles.emptyTabDesc}>
                  Onboard operators and inspectors to assign them directly to project stages.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── TAB 6: FILES & DOCUMENTS ─── */}
        {activeSubTab === 'FILES' && (
          <View style={styles.tabContentWrap}>
            <View style={styles.tabHeaderCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tabHeaderTitle}>Project Files & Attachments</Text>
                <Text style={styles.tabHeaderSubtitle}>
                  Design sheets, blueprints, CAD drawings, spec documents, and task media
                </Text>
              </View>
              <View style={styles.filesCountBadge}>
                <Text style={styles.filesCountBadgeText}>
                  {allProjectFiles.length} {allProjectFiles.length === 1 ? 'File' : 'Files'}
                </Text>
              </View>
            </View>

            {allProjectFiles.length > 0 ? (
              <View style={styles.filesGrid}>
                {allProjectFiles.map((file, fIdx) => {
                  const isImg = file.type === 'image' || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.url || '');
                  const resolvedUrl = resolveImageUrl(file.url);

                  return (
                    <TouchableOpacity
                      key={file.id || fIdx}
                      style={styles.fileItemCard}
                      onPress={() => handleOpenFile(file.url)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.fileItemPreviewWrap}>
                        {isImg && resolvedUrl ? (
                          <Image
                            source={{ uri: resolvedUrl }}
                            style={styles.fileItemThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.fileItemDocIconBox}>
                            <FileText size={24} color="#4F46E5" />
                          </View>
                        )}
                      </View>

                      <View style={styles.fileItemDetails}>
                        <Text style={styles.fileItemName} numberOfLines={2}>
                          {file.name}
                        </Text>
                        <View style={styles.fileItemMetaRow}>
                          <Text style={styles.fileItemSource}>{file.source}</Text>
                          {file.size ? (
                            <Text style={styles.fileItemSize}>
                              {(file.size / 1024).toFixed(1)} KB
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.fileItemActionBtn}>
                        <ExternalLink size={14} color="#64748B" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyTabCard}>
                <FolderOpen size={36} color="#CBD5E1" />
                <Text style={styles.emptyTabTitle}>No Project Files Attached</Text>
                <Text style={styles.emptyTabDesc}>
                  Documents uploaded to product catalog, project stages, or task attachments will appear here automatically.
                </Text>
              </View>
            )}
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
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add Milestone</Text>
                <Text style={styles.modalSubtitle}>Define key deliverable and allocate raw materials</Text>
              </View>
              <TouchableOpacity onPress={() => setMilestoneModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Milestone Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Cutting, Assembly, Finishing"
                placeholderTextColor="#94A3B8"
                value={newMilestoneTitle}
                onChangeText={setNewMilestoneTitle}
                autoFocus
              />

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Add milestone specifications or acceptance criteria..."
                placeholderTextColor="#94A3B8"
                value={newMilestoneDesc}
                onChangeText={setNewMilestoneDesc}
                multiline
                numberOfLines={2}
              />

              {/* Material Allocation Section */}
              <View style={styles.milestoneMatAllocSection}>
                <View style={styles.milestoneMatAllocHeaderRow}>
                  <Package size={14} color="#2327D8" />
                  <Text style={styles.milestoneMatAllocHeaderTitle}>
                    Allocate Raw Materials (Optional)
                  </Text>
                </View>
                <Text style={styles.milestoneMatAllocHeaderDesc}>
                  Allocate materials from available inventory for this milestone
                </Text>

                {/* Available Materials Selector */}
                {availableMaterials.length > 0 ? (
                  <>
                    <Text style={styles.miniPickerLabel}>Select Raw Material</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      {availableMaterials.map((mat) => {
                        const isSel = selectedMilestoneMatId === (mat._id || mat.id);
                        return (
                          <TouchableOpacity
                            key={mat._id || mat.id}
                            style={[styles.matSelectChip, isSel && styles.matSelectChipActive]}
                            onPress={() => setSelectedMilestoneMatId(mat._id || mat.id)}
                          >
                            <Text style={[styles.matSelectChipText, isSel && styles.matSelectChipTextActive]}>
                              {mat.name} ({mat.unit || 'units'})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {selectedMilestoneMatId ? (
                      <View style={styles.matQtyInputRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.miniPickerLabel}>Quantity to Allocate</Text>
                          <TextInput
                            style={styles.modalInput}
                            placeholder="Enter quantity (e.g. 4)"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={selectedMilestoneMatQty}
                            onChangeText={setSelectedMilestoneMatQty}
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.addMatToMsBtn}
                          onPress={handleAddMaterialToMilestone}
                        >
                          <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                          <Text style={styles.addMatToMsBtnText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.noMatsNoticeText}>
                    No active raw materials found. Add materials in Inventory to allocate.
                  </Text>
                )}

                {/* Added Allocated Materials List */}
                {milestoneAllocatedMaterials.length > 0 && (
                  <View style={styles.selectedMatsListWrap}>
                    <Text style={styles.selectedMatsListTitle}>
                      Materials to be Allocated ({milestoneAllocatedMaterials.length})
                    </Text>
                    {milestoneAllocatedMaterials.map((m) => (
                      <View key={m.materialId} style={styles.selectedMatRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selectedMatName}>{m.name}</Text>
                          <Text style={styles.selectedMatMeta}>
                            {m.materialCode ? `${m.materialCode} • ` : ''}Qty: {m.plannedQuantity} {m.unit}
                            {m.standardCost ? ` • ₹${(m.plannedQuantity * m.standardCost).toLocaleString('en-IN')}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveMaterialFromMilestone(m.materialId)}
                          style={styles.removeMatBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <X size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

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

      {/* ─── MODAL: Raise Material Demand (API 4.1) ─── */}
      <Modal visible={raiseDemandModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raise Material Demand</Text>
              <TouchableOpacity onPress={() => setRaiseDemandModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Raw Material *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {availableMaterials.length > 0 ? (
                availableMaterials.map((mat) => {
                  const isSelected = demandMaterialId === mat._id;
                  return (
                    <TouchableOpacity
                      key={mat._id}
                      style={[styles.matSelectChip, isSelected && styles.matSelectChipActive]}
                      onPress={() => setDemandMaterialId(mat._id)}
                    >
                      <Text style={[styles.matSelectChipText, isSelected && styles.matSelectChipTextActive]}>
                        {mat.name || mat.materialCode} ({mat.unit || 'Kg'})
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyNoticeText}>No materials found. You can still enter quantity.</Text>
              )}
            </ScrollView>

            <Text style={styles.inputLabel}>Requested Quantity *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 150"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={demandQty}
              onChangeText={setDemandQty}
            />

            <Text style={styles.inputLabel}>Stage (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(project?.stages || []).map((stg) => {
                const isSelected = demandStageId === stg._id;
                return (
                  <TouchableOpacity
                    key={stg._id}
                    style={[styles.matSelectChip, isSelected && styles.matSelectChipActive]}
                    onPress={() => setDemandStageId(isSelected ? '' : stg._id)}
                  >
                    <Text style={[styles.matSelectChipText, isSelected && styles.matSelectChipTextActive]}>
                      {stg.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>Reason / Justification</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Explain why additional material is required..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={demandReason}
              onChangeText={setDemandReason}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRaiseDemandModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submittingDemand && styles.disabledBtn]}
                onPress={handleRaiseDemandSubmit}
                disabled={submittingDemand}
              >
                {submittingDemand ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Submit Demand</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Review Material Demand (API 4.3) ─── */}
      <Modal visible={reviewDemandModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Material Demand</Text>
              <TouchableOpacity onPress={() => setReviewDemandModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.reviewActionToggleRow}>
              <TouchableOpacity
                style={[styles.reviewToggleBtn, reviewAction === 'APPROVE' && styles.reviewToggleBtnApprove]}
                onPress={() => setReviewAction('APPROVE')}
              >
                <Text style={[styles.reviewToggleText, reviewAction === 'APPROVE' && styles.reviewToggleTextActive]}>
                  Approve
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reviewToggleBtn, reviewAction === 'PARTIALLY_APPROVE' && styles.reviewToggleBtnPartial]}
                onPress={() => setReviewAction('PARTIALLY_APPROVE')}
              >
                <Text style={[styles.reviewToggleText, reviewAction === 'PARTIALLY_APPROVE' && styles.reviewToggleTextActive]}>
                  Partial
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reviewToggleBtn, reviewAction === 'REJECT' && styles.reviewToggleBtnReject]}
                onPress={() => setReviewAction('REJECT')}
              >
                <Text style={[styles.reviewToggleText, reviewAction === 'REJECT' && styles.reviewToggleTextActive]}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>

            {reviewAction !== 'REJECT' ? (
              <>
                <Text style={styles.inputLabel}>Approved Quantity *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 150"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={reviewApprovedQty}
                  onChangeText={setReviewApprovedQty}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Rejection Reason *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Provide reason for rejecting demand..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={reviewRejectionReason}
                  onChangeText={setReviewRejectionReason}
                />
              </>
            )}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReviewDemandModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submittingReview && styles.disabledBtn]}
                onPress={handleReviewDemandSubmit}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Save Decision</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Issue Material (API 5.1) ─── */}
      <Modal visible={issueModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Material to Floor</Text>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Material *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {availableMaterials.map((mat) => {
                const isSelected = issueMaterialId === mat._id;
                return (
                  <TouchableOpacity
                    key={mat._id}
                    style={[styles.matSelectChip, isSelected && styles.matSelectChipActive]}
                    onPress={() => {
                      setIssueMaterialId(mat._id);
                      if (mat.unit) setIssueUnit(mat.unit);
                    }}
                  >
                    <Text style={[styles.matSelectChipText, isSelected && styles.matSelectChipTextActive]}>
                      {mat.name || mat.materialCode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.twoColModalRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Quantity *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 100"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={issueQty}
                  onChangeText={setIssueQty}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Kg / Pc"
                  placeholderTextColor="#94A3B8"
                  value={issueUnit}
                  onChangeText={setIssueUnit}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Warehouse Location</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Main Warehouse"
              placeholderTextColor="#94A3B8"
              value={issueWarehouse}
              onChangeText={setIssueWarehouse}
            />

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Issued for spinning batch #1"
              placeholderTextColor="#94A3B8"
              value={issueNotes}
              onChangeText={setIssueNotes}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIssueModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submittingIssue && styles.disabledBtn]}
                onPress={handleIssueSubmit}
                disabled={submittingIssue}
              >
                {submittingIssue ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Issue to Floor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Receive Material (API 5.2) ─── */}
      <Modal visible={receiveModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Material Receipt</Text>
              <TouchableOpacity onPress={() => setReceiveModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Issue ID / Ref *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Issue ID"
              placeholderTextColor="#94A3B8"
              value={receiveIssueId}
              onChangeText={setReceiveIssueId}
            />

            <Text style={styles.inputLabel}>Received Quantity *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 100"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={receiveQty}
              onChangeText={setReceiveQty}
            />

            <Text style={styles.inputLabel}>Condition / Notes</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Received in good condition"
              placeholderTextColor="#94A3B8"
              value={receiveNotes}
              onChangeText={setReceiveNotes}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReceiveModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submittingReceive && styles.disabledBtn]}
                onPress={handleReceiveSubmit}
                disabled={submittingReceive}
              >
                {submittingReceive ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Receipt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Log Consumption (API 5.3) ─── */}
      <Modal visible={consumeModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Material Consumption</Text>
              <TouchableOpacity onPress={() => setConsumeModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Consumed Material *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {availableMaterials.map((mat) => {
                const isSelected = consumeMaterialId === mat._id;
                return (
                  <TouchableOpacity
                    key={mat._id}
                    style={[styles.matSelectChip, isSelected && styles.matSelectChipActive]}
                    onPress={() => setConsumeMaterialId(mat._id)}
                  >
                    <Text style={[styles.matSelectChipText, isSelected && styles.matSelectChipTextActive]}>
                      {mat.name || mat.materialCode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.twoColModalRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Consumed Qty *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 95"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={consumeQty}
                  onChangeText={setConsumeQty}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Returned Qty</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 5"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={returnQty}
                  onChangeText={setReturnQty}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 95kg consumed, 5kg unused returned"
              placeholderTextColor="#94A3B8"
              value={consumeNotes}
              onChangeText={setConsumeNotes}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConsumeModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submittingConsume && styles.disabledBtn]}
                onPress={handleConsumeSubmit}
                disabled={submittingConsume}
              >
                {submittingConsume ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Save Consumption</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Assign Staff to Stage (API 7.6) ─── */}
      <Modal visible={assignStaffModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Staff to Stage</Text>
              <TouchableOpacity onPress={() => setAssignStaffModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Staff Member *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(productionStaffList.length > 0 ? productionStaffList : onboardedStaffList).map((st) => {
                const isSelected = assignStaffId === st._id;
                return (
                  <TouchableOpacity
                    key={st._id}
                    style={[styles.matSelectChip, isSelected && styles.matSelectChipActive]}
                    onPress={() => {
                      setAssignStaffId(st._id);
                      if (st.role) setAssignRole(st.role);
                    }}
                  >
                    <Text style={[styles.matSelectChipText, isSelected && styles.matSelectChipTextActive]}>
                      {st.name} ({st.role || 'Operator'})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.inputLabel}>Select Target Stage *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(project?.stages || []).map((stg) => {
                const isSelected = assignStageId === stg._id;
                return (
                  <TouchableOpacity
                    key={stg._id}
                    style={[styles.matSelectChip, isSelected && styles.matSelectChipActive]}
                    onPress={() => setAssignStageId(stg._id)}
                  >
                    <Text style={[styles.matSelectChipText, isSelected && styles.matSelectChipTextActive]}>
                      {stg.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.twoColModalRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Role in Stage</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Machine Operator"
                  placeholderTextColor="#94A3B8"
                  value={assignRole}
                  onChangeText={setAssignRole}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Assigned Hours</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 8"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={assignHours}
                  onChangeText={setAssignHours}
                />
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAssignStaffModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submittingAssign && styles.disabledBtn]}
                onPress={handleAssignStaffSubmit}
                disabled={submittingAssign}
              >
                {submittingAssign ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Assignment</Text>
                )}
              </TouchableOpacity>
            </View>
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

  /* ─── Production Sub-Tabs ─── */
  subTabBar: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  subTabBarContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabPillActive: {
    backgroundColor: '#2327D8',
    borderColor: '#2327D8',
  },
  subTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabContentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  tabLoadingBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabLoadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  /* ─── Production Costing Cards ─── */
  costHeroCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  costHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  costHeroLabel: {
    fontSize: 12,
    color: '#C7D2FE',
    fontWeight: '500',
    marginBottom: 4,
  },
  costHeroValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  budgetStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  budgetUnder: {
    backgroundColor: '#065F46',
  },
  budgetOver: {
    backgroundColor: '#991B1B',
  },
  budgetTrack: {
    backgroundColor: '#1E40AF',
  },
  budgetStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  costHeroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  costHeroCol: {
    flex: 1,
  },
  costHeroSubLabel: {
    fontSize: 11,
    color: '#A5B4FC',
    marginBottom: 3,
  },
  costHeroSubVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  costPillarsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  costPillarCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  costPillarTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 2,
  },
  costPillarAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  breakdownSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  consumedMaterialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  consumedMatLeft: {
    flex: 2,
  },
  consumedMatName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  consumedMatSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  consumedMatMid: {
    flex: 1.5,
    alignItems: 'center',
  },
  consumedMatQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  consumedMatReturned: {
    fontSize: 10,
    color: '#D97706',
    marginTop: 2,
  },
  consumedMatRight: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  consumedMatCost: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalHoursBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyNoticeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  emptyTabCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  emptyTabTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyTabDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ─── Demand Cards ─── */
  demandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  demandCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  demandMatWrap: {
    flex: 1,
    marginRight: 8,
  },
  demandMatName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  demandSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  demandStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusApproved: {
    backgroundColor: '#ECFDF5',
  },
  statusApprovedText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusRejectedText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusPendingText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  demandQtyRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  demandQtyCol: {
    flex: 1,
  },
  demandQtyLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  demandQtyValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  demandReasonBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  demandReasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  demandReasonText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  demandActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  reviewDemandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2327D8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reviewDemandBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ─── Transactions Tab ─── */
  transactionActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  txActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txActionTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  txActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  txActionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },

  /* ─── Staff Tab ─── */
  staffMemberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  staffAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  staffAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2327D8',
  },
  staffInfoCol: {
    flex: 1,
  },
  staffMemberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  staffMemberRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  staffRateBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  staffRateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  skillTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillTagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  assignStageMiniBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignStageMiniBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2327D8',
  },

  /* ─── Production Modal Helpers ─── */
  matSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  matSelectChipActive: {
    backgroundColor: '#2327D8',
    borderColor: '#2327D8',
  },
  matSelectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  matSelectChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  twoColModalRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  reviewActionToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  reviewToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  reviewToggleBtnApprove: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  reviewToggleBtnPartial: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  reviewToggleBtnReject: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  reviewToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  reviewToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* ─── Milestone Allocated Materials Cards ─── */
  milestoneMaterialsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  milestoneMaterialsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 5,
  },
  milestoneMaterialsHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  milestoneMaterialsGrid: {
    gap: 6,
  },
  milestoneMaterialCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  milestoneMaterialTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneMaterialName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  milestoneMaterialCode: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  milestoneMaterialAllocPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  milestoneMaterialAllocText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730A3',
  },
  milestoneMaterialStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  milestoneMaterialStatText: {
    fontSize: 10,
    color: '#64748B',
  },
  milestoneMaterialStatDivider: {
    fontSize: 10,
    color: '#CBD5E1',
  },

  /* ─── Add Milestone Material Allocation Section ─── */
  milestoneMatAllocSection: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  milestoneMatAllocHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  milestoneMatAllocHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  milestoneMatAllocHeaderDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  miniPickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  matQtyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  addMatToMsBtn: {
    backgroundColor: '#2327D8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    gap: 4,
    marginBottom: 12,
  },
  addMatToMsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noMatsNoticeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  selectedMatsListWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  selectedMatsListTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  selectedMatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  selectedMatName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedMatMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  removeMatBtn: {
    padding: 4,
  },

  /* ─── Files & Documents Tab ─── */
  filesCountBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  filesCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730A3',
  },
  filesGrid: {
    gap: 10,
  },
  fileItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fileItemPreviewWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileItemThumbnail: {
    width: '100%',
    height: '100%',
  },
  fileItemDocIconBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  fileItemDetails: {
    flex: 1,
    marginRight: 10,
  },
  fileItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  fileItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileItemSource: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileItemSize: {
    fontSize: 11,
    color: '#94A3B8',
  },
  fileItemActionBtn: {
    padding: 6,
  },
});

export default ProjectDetails;
