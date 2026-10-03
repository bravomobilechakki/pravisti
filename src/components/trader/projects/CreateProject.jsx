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
  Package,
  Layers,
  Boxes,
  IndianRupee,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
} from 'lucide-react-native';
import {
  createProject,
  getDeals,
  getCompanies,
  getProducts,
  getProductionMaterials,
} from '../../../services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const COMMON_UNITS = [
  'Kilogram',
  'Pieces',
  'Litres',
  'Sheets',
  'Meters',
  'Boxes',
  'Sq.Ft',
  'Sets',
  'Tons',
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Medium', value: 'MEDIUM', color: '#2563EB', bg: '#EFF6FF' },
  { label: 'High', value: 'HIGH', color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'Urgent', value: 'URGENT', color: '#EF4444', bg: '#FEF2F2' },
];

const STATUS_OPTIONS = [
  { label: 'In Progress (Active)', value: 'IN_PROGRESS', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  { label: 'Planned (Upcoming)', value: 'PLANNED', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
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

  // Form Core Fields
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [productionQuantity, setProductionQuantity] = useState('1');
  const [unit, setUnit] = useState('Kilogram');

  // Dates
  const [startDate, setStartDate] = useState(() => new Date());
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    () => new Date(Date.now() + 14 * 86400000)
  );

  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('IN_PROGRESS');

  // Company and User
  const [companiesList, setCompaniesList] = useState(initialCompany ? [initialCompany] : []);
  const [selectedCompany, setSelectedCompany] = useState(initialCompany);
  const [currentUser, setCurrentUser] = useState(initialUser);

  // Deals
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Products & Raw Materials (BOM)
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]); // [{ materialId, material, plannedQuantity }]
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Additional Costs (Optional)
  const [otherCosts, setOtherCosts] = useState([]);
  const [showAddCostRow, setShowAddCostRow] = useState(false);
  const [newCostName, setNewCostName] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');

  // Modals state
  const [submitting, setSubmitting] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'START' | 'EXPECTED' | null
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(() => new Date());

  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Load User & Companies
  useEffect(() => {
    let isMounted = true;
    const loadSavedData = async () => {
      try {
        if (!currentUser) {
          const profileStr = await AsyncStorage.getItem('user_completed_profile');
          if (profileStr && isMounted) {
            try {
              setCurrentUser(JSON.parse(profileStr));
            } catch (e) {}
          }
        }

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
          } catch (e) {}
        }

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
        } catch (e) {}
      } catch (err) {}
    };
    loadSavedData();
    return () => {
      isMounted = false;
    };
  }, [currentUser, initialCompany, initialCompanyId, selectedCompany]);

  // Fetch Deals
  const fetchDeals = useCallback(async () => {
    try {
      setLoadingDeals(true);
      const effectiveCompId = selectedCompany?._id || selectedCompany?.id || initialCompanyId;
      const token = await AsyncStorage.getItem('userToken');
      const [compRes, genRes] = await Promise.all([
        effectiveCompId ? getDeals(token, 1, 50, effectiveCompId).catch(() => null) : Promise.resolve(null),
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

      const combined = [...extractDealsList(compRes), ...extractDealsList(genRes)];
      const uniqueMap = new Map();
      combined.forEach((d) => {
        const id = String(d._id || d.id || '');
        if (id && !uniqueMap.has(id)) uniqueMap.set(id, d);
      });
      setDeals(Array.from(uniqueMap.values()));
    } catch (e) {
    } finally {
      setLoadingDeals(false);
    }
  }, [selectedCompany, initialCompanyId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Fetch Products and Raw Materials
  const fetchProductsAndMaterials = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setLoadingMaterials(true);
      let effectiveCompId = selectedCompany?._id || selectedCompany?.id || initialCompanyId;
      if (!effectiveCompId) {
        try {
          const cachedCompStr = await AsyncStorage.getItem('trader_companies_cache');
          if (cachedCompStr) {
            const parsed = JSON.parse(cachedCompStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              effectiveCompId = parsed[0]._id || parsed[0].id;
            }
          }
        } catch (e) {}
      }

      const token = await AsyncStorage.getItem('userToken');

      const [prodRes, matRes] = await Promise.all([
        getProducts(effectiveCompId, token).catch(() => null),
        getProductionMaterials({ companyId: effectiveCompId, limit: 100 }, token).catch(() => null),
      ]);

      // Extract products
      let prods = [];
      if (Array.isArray(prodRes?.data?.products)) prods = prodRes.data.products;
      else if (Array.isArray(prodRes?.data)) prods = prodRes.data;
      else if (Array.isArray(prodRes?.products)) prods = prodRes.products;
      else if (Array.isArray(prodRes?.data?.data)) prods = prodRes.data.data;
      else if (Array.isArray(prodRes)) prods = prodRes;

      if (prods.length === 0) {
        // Fallback: general products
        const fallbackProdRes = await getProducts(null, token).catch(() => null);
        if (Array.isArray(fallbackProdRes?.data?.products)) prods = fallbackProdRes.data.products;
        else if (Array.isArray(fallbackProdRes?.data)) prods = fallbackProdRes.data;
        else if (Array.isArray(fallbackProdRes?.products)) prods = fallbackProdRes.products;
      }
      setProductsList(prods);

      // Extract raw materials
      let mats = [];
      if (Array.isArray(matRes?.data?.materials)) mats = matRes.data.materials;
      else if (Array.isArray(matRes?.data)) mats = matRes.data;
      else if (Array.isArray(matRes?.materials)) mats = matRes.materials;
      else if (Array.isArray(matRes?.data?.data)) mats = matRes.data.data;
      else if (Array.isArray(matRes)) mats = matRes;

      if (mats.length === 0) {
        // Fallback: general materials
        const fallbackMatRes = await getProductionMaterials({ limit: 100 }, token).catch(() => null);
        if (Array.isArray(fallbackMatRes?.data?.materials)) mats = fallbackMatRes.data.materials;
        else if (Array.isArray(fallbackMatRes?.data)) mats = fallbackMatRes.data;
        else if (Array.isArray(fallbackMatRes?.materials)) mats = fallbackMatRes.materials;
      }
      setRawMaterialsList(mats);
    } catch (e) {
      console.warn('Error fetching products/materials for project:', e);
    } finally {
      setLoadingProducts(false);
      setLoadingMaterials(false);
    }
  }, [selectedCompany, initialCompanyId]);

  useEffect(() => {
    fetchProductsAndMaterials();
  }, [fetchProductsAndMaterials]);

  const handleBack = () => {
    if (onBack) onBack();
    else if (onNavigate) onNavigate('pop');
    else if (navigation?.goBack) navigation.goBack();
  };

  // Filtered lists
  const filteredDeals = useMemo(() => {
    if (!dealSearchQuery.trim()) return deals;
    const q = dealSearchQuery.trim().toLowerCase();
    return deals.filter((d) => {
      const code = String(d.saudaNumber || d.dealNumber || d.dealNo || d._id || '').toLowerCase();
      const comm = String(d.commodity || d.title || d.dealName || '').toLowerCase();
      return code.includes(q) || comm.includes(q);
    });
  }, [deals, dealSearchQuery]);

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return productsList;
    const q = productSearchQuery.trim().toLowerCase();
    return productsList.filter((p) => {
      const n = String(p.name || p.title || '').toLowerCase();
      const c = String(p.category?.name || p.categoryName || '').toLowerCase();
      return n.includes(q) || c.includes(q);
    });
  }, [productsList, productSearchQuery]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return rawMaterialsList;
    const q = materialSearchQuery.trim().toLowerCase();
    return rawMaterialsList.filter((m) => {
      const n = String(m.name || m.materialName || '').toLowerCase();
      const code = String(m.materialCode || m.code || m.sku || '').toLowerCase();
      const cat = String(m.category || '').toLowerCase();
      return n.includes(q) || code.includes(q) || cat.includes(q);
    });
  }, [rawMaterialsList, materialSearchQuery]);

  // When a product is selected
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    if (!name.trim()) {
      setName(`Batch - ${product.name || 'Production'}`);
    }
    if (product.unit) {
      setUnit(product.unit);
    } else if (product.unitId?.name) {
      setUnit(product.unitId.name);
    }
    setShowProductModal(false);
  };

  // BOM Material Helpers
  const isMaterialSelected = (matId) => {
    return selectedMaterials.some((item) => String(item.materialId) === String(matId));
  };

  const toggleMaterial = (mat) => {
    const matId = String(mat._id || mat.id);
    setSelectedMaterials((prev) => {
      const exists = prev.find((item) => String(item.materialId) === matId);
      if (exists) {
        return prev.filter((item) => String(item.materialId) !== matId);
      }
      return [
        ...prev,
        {
          materialId: matId,
          material: mat,
          plannedQuantity: 10,
        },
      ];
    });
  };

  const updateMaterialQuantity = (matId, deltaOrVal) => {
    setSelectedMaterials((prev) =>
      prev.map((item) => {
        if (String(item.materialId) === String(matId)) {
          let newQty = item.plannedQuantity;
          if (typeof deltaOrVal === 'number') {
            newQty = Math.max(1, Number(item.plannedQuantity || 1) + deltaOrVal);
          } else {
            const parsed = parseFloat(deltaOrVal);
            newQty = isNaN(parsed) || parsed < 0 ? 0 : parsed;
          }
          return { ...item, plannedQuantity: newQty };
        }
        return item;
      })
    );
  };

  const removeMaterial = (matId) => {
    setSelectedMaterials((prev) => prev.filter((item) => String(item.materialId) !== String(matId)));
  };

  // Estimated Materials Cost
  const totalBOMCost = useMemo(() => {
    return selectedMaterials.reduce((sum, item) => {
      const cost = item.material?.standardCost || item.material?.cost || 0;
      const qty = Number(item.plannedQuantity) || 0;
      return sum + cost * qty;
    }, 0);
  }, [selectedMaterials]);

  // Extra Costs
  const handleAddOtherCost = () => {
    if (!newCostName.trim()) {
      Alert.alert('Required', 'Please enter cost item name');
      return;
    }
    const amt = parseFloat(newCostAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Required', 'Please enter a valid cost amount');
      return;
    }
    setOtherCosts((prev) => [...prev, { name: newCostName.trim(), amount: amt }]);
    setNewCostName('');
    setNewCostAmount('');
    setShowAddCostRow(false);
  };

  const handleRemoveOtherCost = (index) => {
    setOtherCosts((prev) => prev.filter((_, i) => i !== index));
  };

  // Date Picker Confirm
  const confirmDatePicker = () => {
    if (datePickerTarget === 'START') {
      setStartDate(tempSelectedDate);
      if (tempSelectedDate > expectedCompletionDate) {
        setExpectedCompletionDate(new Date(tempSelectedDate.getTime() + 14 * 86400000));
      }
    } else if (datePickerTarget === 'EXPECTED') {
      if (tempSelectedDate < startDate) {
        Alert.alert('Invalid Date', 'Expected completion date cannot be before start date.');
        return;
      }
      setExpectedCompletionDate(tempSelectedDate);
    }
    setDatePickerTarget(null);
  };

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

  // Main Submit Handler
  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a Batch / Project Name.');
      return;
    }

    const effectiveCompanyId =
      selectedCompany?._id || selectedCompany?.id || initialCompanyId || undefined;

    if (!effectiveCompanyId && companiesList.length > 0) {
      Alert.alert('Required Field', 'Please select a Company for this project.');
      return;
    }

    const qtyNum = Number(productionQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Required Field', 'Please enter a valid production quantity (e.g. 100).');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        companyId: effectiveCompanyId,
        name: name.trim(),
        title: name.trim(),
        productId: selectedProduct?._id || selectedProduct?.id || undefined,
        productionQuantity: qtyNum,
        unit: unit.trim() || 'Kilogram',
        startDate: startDate.toISOString(),
        expectedCompletionDate: expectedCompletionDate.toISOString(),
        actualCompletionDate: null,
        status: status || 'IN_PROGRESS',
        priority: priority || 'MEDIUM',
        managerId: currentUser?._id || currentUser?.id || null,
        requiredMaterials: selectedMaterials.map((item) => ({
          materialId: item.materialId,
          plannedQuantity: Number(item.plannedQuantity) || 1,
        })),
        otherCosts: otherCosts,
        notes: notes.trim(),
        description: notes.trim(),
        dealId: projectType === 'DEAL' && selectedDeal ? selectedDeal._id || selectedDeal.id : undefined,
      };

      const res = await createProject(payload);
      const createdProject = res?.data?.project || res?.data || res?.project;

      if (res?.success || createdProject) {
        const targetProj = createdProject || { ...payload, _id: `proj_${Date.now()}` };
        const navPayload = {
          projectId: targetProj._id || targetProj.id,
          project: targetProj,
          company: selectedCompany || initialCompany,
          companyId: effectiveCompanyId,
          user: currentUser,
        };
        if (onNavigate) {
          onNavigate('ProjectDetails', navPayload);
        } else if (navigation?.navigate) {
          navigation.navigate('ProjectDetails', navPayload);
        } else {
          handleBack();
        }
      } else {
        Alert.alert('Error', res?.message || 'Failed to create production batch.');
      }
    } catch (err) {
      console.error('Create production project error:', err);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeStatusCfg = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const activePriorityCfg = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];

  return (
    <KeyboardAvoidingView
      style={styles.safeContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.circleIconBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={19} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCenterWrap}>
          <Text style={styles.headerMainTitle}>New Production Batch</Text>
          <Text style={styles.headerSubTitle} numberOfLines={1}>
            Configure BOM materials, run schedule & batch output
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
        {/* Project Source (Independent / From Deal) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Project Source</Text>
          <View style={styles.typeCardsRow}>
            <TouchableOpacity
              style={[styles.typeCard, projectType === 'INDEPENDENT' && styles.typeCardSelected]}
              onPress={() => setProjectType('INDEPENDENT')}
              activeOpacity={0.8}
            >
              {projectType === 'INDEPENDENT' && (
                <View style={styles.selectedCheckBadge}>
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              <View style={styles.typeCardIconBox}>
                <Box size={20} color="#2563EB" strokeWidth={1.8} />
              </View>
              <Text style={[styles.typeCardTitle, projectType === 'INDEPENDENT' && styles.typeCardTitleSelected]}>
                Factory Floor
              </Text>
              <Text style={styles.typeCardDesc}>Direct production batch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, projectType === 'DEAL' && styles.typeCardSelected]}
              onPress={() => {
                setProjectType('DEAL');
                if (!selectedDeal) setShowDealModal(true);
              }}
              activeOpacity={0.8}
            >
              {projectType === 'DEAL' && (
                <View style={styles.selectedCheckBadge}>
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              <View style={styles.typeCardIconBox}>
                <FileText size={20} color={projectType === 'DEAL' ? '#2563EB' : '#64748B'} strokeWidth={1.8} />
              </View>
              <Text style={[styles.typeCardTitle, projectType === 'DEAL' && styles.typeCardTitleSelected]}>
                From Trade Deal
              </Text>
              <Text style={styles.typeCardDesc}>Link a contract / sauda</Text>
            </TouchableOpacity>
          </View>

          {projectType === 'DEAL' && (
            <View style={styles.dealSelectorWrap}>
              <View style={styles.columnLabelRow}>
                <Briefcase size={14} color="#2563EB" />
                <Text style={styles.columnLabelText}>Linked Deal</Text>
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
                      ? `${selectedDeal.saudaNumber || selectedDeal.dealNumber || 'Deal'} • ${
                          selectedDeal.commodity || selectedDeal.title || 'Contract'
                        }`
                      : loadingDeals
                      ? 'Loading deals...'
                      : 'Choose a deal to link...'}
                  </Text>
                </View>
                <ChevronDown size={15} color="#2563EB" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Company Selection (if multiple) */}
        {companiesList.length > 1 && (
          <View style={styles.fieldSection}>
            <View style={styles.columnLabelRow}>
              <Building2 size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>Operating Company</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowCompanyModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Building2 size={15} color="#475569" />
                <Text style={styles.dropdownValueText} numberOfLines={1}>
                  {selectedCompany?.name || selectedCompany?.companyName || 'Select Company'}
                </Text>
              </View>
              <ChevronDown size={15} color="#475569" />
            </TouchableOpacity>
          </View>
        )}

        {/* Finished Product to Manufacture */}
        <View style={styles.fieldSection}>
          <View style={styles.columnLabelRow}>
            <Package size={14} color="#2563EB" />
            <Text style={styles.columnLabelText}>Finished Product to Manufacture</Text>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <TouchableOpacity
            style={[styles.dropdownBox, selectedProduct && styles.dropdownBoxSelected]}
            onPress={() => setShowProductModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownLeftContent}>
              <Package size={16} color={selectedProduct ? '#2563EB' : '#94A3B8'} />
              <Text
                style={[
                  styles.dropdownValueText,
                  !selectedProduct && { color: '#94A3B8', fontWeight: '400' },
                ]}
                numberOfLines={1}
              >
                {selectedProduct
                  ? `${selectedProduct.name} ${selectedProduct.unit ? `(${selectedProduct.unit})` : ''}`
                  : 'Select finished product from catalog...'}
              </Text>
            </View>
            {selectedProduct ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedProduct(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <ChevronDown size={15} color="#475569" />
            )}
          </TouchableOpacity>
        </View>

        {/* Batch / Project Name */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>
            Batch / Project Name <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.titleInputContainer}>
            <FileText size={16} color="#94A3B8" style={styles.inputLeftIcon} />
            <TextInput
              style={styles.titleTextInput}
              placeholder="Enter batch or project name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Production Quantity & Unit */}
        <View style={styles.twoColumnRow}>
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Boxes size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>
                Quantity <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <View style={styles.compactInputContainer}>
              <TextInput
                style={styles.compactTextInput}
                placeholder="Enter quantity"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={productionQuantity}
                onChangeText={setProductionQuantity}
              />
            </View>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Package size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>Unit of Measure</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowUnitModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownValueText}>{unit || 'Kilogram'}</Text>
              <ChevronDown size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline (Start Date & Expected Completion Date) */}
        <View style={styles.twoColumnRow}>
          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Calendar size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>
                Start Date <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => {
                setDatePickerTarget('START');
                setTempSelectedDate(new Date(startDate.getTime()));
                setCalendarMonthDate(new Date(startDate.getTime()));
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Calendar size={14} color="#0F172A" />
                <Text style={styles.dropdownValueText}>{formatDateDisplay(startDate)}</Text>
              </View>
              <ChevronDown size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Calendar size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>
                Target Due Date <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => {
                setDatePickerTarget('EXPECTED');
                setTempSelectedDate(new Date(expectedCompletionDate.getTime()));
                setCalendarMonthDate(new Date(expectedCompletionDate.getTime()));
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Calendar size={14} color="#0F172A" />
                <Text style={styles.dropdownValueText}>
                  {formatDateDisplay(expectedCompletionDate)}
                </Text>
              </View>
              <ChevronDown size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Priority & Status */}
        <View style={styles.twoColumnRow}>
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
                <View style={[styles.priorityDot, { backgroundColor: activePriorityCfg.color }]} />
                <Text style={styles.dropdownValueText}>{activePriorityCfg.label}</Text>
              </View>
              <ChevronDown size={14} color="#475569" />
            </TouchableOpacity>
          </View>

          <View style={styles.columnItem}>
            <View style={styles.columnLabelRow}>
              <Clock size={14} color="#2563EB" />
              <Text style={styles.columnLabelText}>Initial Status</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.dropdownBox,
                { backgroundColor: activeStatusCfg.bg, borderColor: activeStatusCfg.border },
              ]}
              onPress={() => setShowStatusModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownLeftContent}>
                <Clock size={14} color={activeStatusCfg.color} />
                <Text style={[styles.dropdownValueText, { color: activeStatusCfg.color }]}>
                  {activeStatusCfg.label}
                </Text>
              </View>
              <ChevronDown size={14} color={activeStatusCfg.color} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── BILL OF MATERIALS (BOM) & REQUIRED RAW MATERIALS ─── */}
        <View style={styles.bomSectionCard}>
          <View style={styles.bomHeaderRow}>
            <View style={styles.bomTitleWrap}>
              <Layers size={16} color="#2563EB" />
              <View>
                <Text style={styles.bomMainTitle}>Required Raw Materials (BOM)</Text>
                <Text style={styles.bomSubtitle}>
                  {selectedMaterials.length}{' '}
                  {selectedMaterials.length === 1 ? 'material' : 'materials'} configured
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addMaterialBtn}
              onPress={() => setShowMaterialModal(true)}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addMaterialBtnText}>Add Material</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Materials List */}
          {selectedMaterials.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyBOMBox}
              onPress={() => setShowMaterialModal(true)}
              activeOpacity={0.7}
            >
              <Layers size={24} color="#94A3B8" />
              <Text style={styles.emptyBOMText}>No raw materials added to this batch yet.</Text>
              <Text style={styles.emptyBOMSubText}>
                Tap here to pick raw materials and set planned quantities.
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.materialsListContainer}>
              {selectedMaterials.map((item) => {
                const mat = item.material || {};
                const matId = item.materialId;
                const matName = mat.name || mat.materialName || 'Raw Material';
                const matCode = mat.materialCode || mat.code || mat.sku || '';
                const matUnit = mat.unit || 'Units';
                const standardCost = mat.standardCost || mat.cost || 0;
                const lineTotal = standardCost * (Number(item.plannedQuantity) || 0);

                return (
                  <View key={matId} style={styles.materialItemCard}>
                    <View style={styles.materialCardHeader}>
                      <View style={styles.materialHeaderLeft}>
                        <Text style={styles.materialItemName} numberOfLines={1}>
                          {matName}
                        </Text>
                        <View style={styles.materialMetaPills}>
                          {matCode ? (
                            <View style={styles.matCodePill}>
                              <Text style={styles.matCodePillText}>{matCode}</Text>
                            </View>
                          ) : null}
                          {mat.category ? (
                            <View style={styles.matCatPill}>
                              <Text style={styles.matCatPillText}>{mat.category}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.removeMaterialBtn}
                        onPress={() => removeMaterial(matId)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Quantity Stepper & Cost Row */}
                    <View style={styles.materialCardFooter}>
                      <View style={styles.quantityStepperWrap}>
                        <Text style={styles.plannedQtyLabel}>Planned Qty:</Text>
                        <View style={styles.stepperContainer}>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => updateMaterialQuantity(matId, -1)}
                          >
                            <Minus size={12} color="#0F172A" />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.stepperInput}
                            keyboardType="numeric"
                            value={String(item.plannedQuantity ?? 0)}
                            onChangeText={(val) => updateMaterialQuantity(matId, val)}
                          />
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => updateMaterialQuantity(matId, 1)}
                          >
                            <Plus size={12} color="#0F172A" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.matUnitLabel}>{matUnit}</Text>
                      </View>

                      {standardCost > 0 && (
                        <View style={styles.costCol}>
                          <Text style={styles.unitCostText}>@ ₹{standardCost}/{matUnit}</Text>
                          <Text style={styles.lineTotalText}>₹{lineTotal.toLocaleString('en-IN')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Total BOM Cost Bar */}
              {totalBOMCost > 0 && (
                <View style={styles.bomTotalBar}>
                  <View style={styles.bomTotalLeft}>
                    <Text style={styles.bomTotalLabel}>Est. Material Expense</Text>
                    <Text style={styles.bomTotalSub}>Based on standard material costs</Text>
                  </View>
                  <Text style={styles.bomTotalAmount}>₹{totalBOMCost.toLocaleString('en-IN')}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ─── ADDITIONAL OVERHEAD COSTS (OPTIONAL) ─── */}
        <View style={styles.additionalCostsCard}>
          <View style={styles.costHeaderRow}>
            <View style={styles.bomTitleWrap}>
              <IndianRupee size={15} color="#2563EB" />
              <Text style={styles.bomMainTitle}>Other Expenses & Overheads</Text>
            </View>
            {!showAddCostRow && (
              <TouchableOpacity
                style={styles.addCostSmallBtn}
                onPress={() => setShowAddCostRow(true)}
              >
                <Plus size={13} color="#2563EB" />
                <Text style={styles.addCostSmallBtnText}>Add Cost</Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddCostRow && (
            <View style={styles.addCostFormRow}>
              <TextInput
                style={styles.costNameInput}
                placeholder="Item name (e.g. Labour, Transport)"
                placeholderTextColor="#94A3B8"
                value={newCostName}
                onChangeText={setNewCostName}
              />
              <TextInput
                style={styles.costAmountInput}
                placeholder="₹ Amount"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={newCostAmount}
                onChangeText={setNewCostAmount}
              />
              <TouchableOpacity style={styles.saveCostBtn} onPress={handleAddOtherCost}>
                <Check size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelCostBtn}
                onPress={() => {
                  setShowAddCostRow(false);
                  setNewCostName('');
                  setNewCostAmount('');
                }}
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {otherCosts.length > 0 && (
            <View style={styles.otherCostsList}>
              {otherCosts.map((c, idx) => (
                <View key={idx} style={styles.otherCostItem}>
                  <Text style={styles.otherCostName}>{c.name}</Text>
                  <View style={styles.otherCostRight}>
                    <Text style={styles.otherCostAmount}>₹{Number(c.amount).toLocaleString('en-IN')}</Text>
                    <TouchableOpacity onPress={() => handleRemoveOtherCost(idx)}>
                      <X size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notes / Instructions */}
        <View style={styles.fieldSection}>
          <View style={styles.columnLabelRow}>
            <FileText size={14} color="#2563EB" />
            <Text style={styles.columnLabelText}>Batch Notes & Instructions</Text>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textAreaInput}
              placeholder="Enter batch instructions, quality specs or floor notes"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
            <View style={styles.textAreaFooter}>
              <Text style={styles.charCounterText}>{notes.length}/500</Text>
            </View>
          </View>
        </View>

        {/* Primary Action Buttons */}
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
                <Text style={styles.primaryBtnText}>Create Production Batch</Text>
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

      {/* ─── MODALS ─── */}

      {/* 1. DATE PICKER BOTTOM SHEET */}
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
                  {datePickerTarget === 'START' ? 'Select Start Date' : 'Select Target Due Date'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDatePickerTarget(null)} style={styles.sheetCloseBtn}>
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

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

            <View style={styles.weekDaysRow}>
              {WEEK_DAYS.map((wd) => (
                <Text key={wd} style={styles.weekDayText}>
                  {wd}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {calendarGrid.map((item) => {
                if (!item.day) return <View key={item.id} style={styles.emptyDayCell} />;
                const isSelected =
                  tempSelectedDate.getDate() === item.day &&
                  tempSelectedDate.getMonth() === calendarMonthDate.getMonth() &&
                  tempSelectedDate.getFullYear() === calendarMonthDate.getFullYear();

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => {
                      setTempSelectedDate(
                        new Date(
                          calendarMonthDate.getFullYear(),
                          calendarMonthDate.getMonth(),
                          item.day
                        )
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDatePickerTarget(null)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmDatePicker}>
                <Text style={styles.modalConfirmButtonText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. PRODUCT SELECTION MODAL */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowProductModal(false)}
          />
          <View style={styles.productSheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.productSheetHeader}>
              <View style={styles.prodHeaderIconWrap}>
                <Package size={20} color="#2563EB" />
              </View>
              <View style={styles.prodHeaderTitles}>
                <Text style={styles.prodModalTitle}>Select Finished Product</Text>
                <Text style={styles.prodModalSubtitle}>
                  {productsList.length} products available in catalog
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => fetchProductsAndMaterials()}
                style={[styles.prodCloseBtn, { marginRight: 8 }]}
                activeOpacity={0.7}
              >
                <RefreshCw size={15} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowProductModal(false)} style={styles.prodCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.prodSearchBar}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.prodSearchInput}
                placeholder="Search products..."
                placeholderTextColor="#94A3B8"
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
              />
              {productSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setProductSearchQuery('')}>
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.prodListScroll} showsVerticalScrollIndicator={false}>
              {loadingProducts ? (
                <View style={styles.prodEmptyContainer}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.prodEmptySubtitle}>Loading finished products...</Text>
                </View>
              ) : filteredProducts.length === 0 ? (
                <View style={styles.prodEmptyContainer}>
                  <Package size={28} color="#94A3B8" />
                  <Text style={styles.prodEmptyTitle}>No Products Found</Text>
                  <Text style={styles.prodEmptySubtitle}>Add products to your catalog to link here.</Text>
                  <TouchableOpacity
                    style={[styles.addMaterialBtn, { marginTop: 10 }]}
                    onPress={() => fetchProductsAndMaterials()}
                  >
                    <RefreshCw size={13} color="#FFFFFF" />
                    <Text style={styles.addMaterialBtnText}>Reload Catalog</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredProducts.map((p) => {
                  const pId = p._id || p.id;
                  const isSel = String(selectedProduct?._id || selectedProduct?.id) === String(pId);
                  return (
                    <TouchableOpacity
                      key={pId}
                      style={[styles.prodSelectCard, isSel && styles.prodSelectCardActive]}
                      onPress={() => handleSelectProduct(p)}
                    >
                      <View style={styles.prodCardLeftWrap}>
                        <View style={[styles.prodCardIconBox, isSel && styles.prodCardIconBoxActive]}>
                          <Package size={20} color={isSel ? '#2563EB' : '#64748B'} />
                        </View>
                        <View style={styles.prodCardInfoCol}>
                          <Text style={[styles.prodCardTitle, isSel && styles.prodCardTitleActive]}>
                            {p.name}
                          </Text>
                          <View style={styles.prodTagsRow}>
                            {p.category?.name || p.categoryName ? (
                              <View style={styles.prodCatPill}>
                                <Text style={styles.prodCatPillText}>
                                  {p.category?.name || p.categoryName}
                                </Text>
                              </View>
                            ) : null}
                            {p.unit ? (
                              <View style={styles.prodUnitPill}>
                                <Text style={styles.prodUnitPillText}>{p.unit}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                      {isSel && <Check size={18} color="#2563EB" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. RAW MATERIAL SELECTION MODAL */}
      <Modal
        visible={showMaterialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowMaterialModal(false)}
          />
          <View style={styles.productSheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.productSheetHeader}>
              <View style={styles.prodHeaderIconWrap}>
                <Layers size={20} color="#2563EB" />
              </View>
              <View style={styles.prodHeaderTitles}>
                <Text style={styles.prodModalTitle}>Select Raw Materials</Text>
                <Text style={styles.prodModalSubtitle}>
                  {rawMaterialsList.length} items available in inventory
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => fetchProductsAndMaterials()}
                style={[styles.prodCloseBtn, { marginRight: 8 }]}
                activeOpacity={0.7}
              >
                <RefreshCw size={15} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMaterialModal(false)} style={styles.prodCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.prodSearchBar}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                style={styles.prodSearchInput}
                placeholder="Search raw materials by name, code or category..."
                placeholderTextColor="#94A3B8"
                value={materialSearchQuery}
                onChangeText={setMaterialSearchQuery}
              />
              {materialSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMaterialSearchQuery('')}>
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.prodListScroll} showsVerticalScrollIndicator={false}>
              {loadingMaterials ? (
                <View style={styles.prodEmptyContainer}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.prodEmptySubtitle}>Loading raw materials from inventory...</Text>
                </View>
              ) : filteredMaterials.length === 0 ? (
                <View style={styles.prodEmptyContainer}>
                  <Layers size={28} color="#94A3B8" />
                  <Text style={styles.prodEmptyTitle}>No Materials Found</Text>
                  <Text style={styles.prodEmptySubtitle}>No raw materials found for this company.</Text>
                  <TouchableOpacity
                    style={[styles.addMaterialBtn, { marginTop: 10 }]}
                    onPress={() => fetchProductsAndMaterials()}
                  >
                    <RefreshCw size={13} color="#FFFFFF" />
                    <Text style={styles.addMaterialBtnText}>Reload Inventory</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredMaterials.map((mat) => {
                  const matId = String(mat._id || mat.id);
                  const isSel = isMaterialSelected(matId);
                  const name = mat.name || mat.materialName || 'Material';
                  const code = mat.materialCode || mat.code || mat.sku || '';
                  const unit = mat.unit || '';
                  const cost = mat.standardCost || mat.cost || 0;

                  return (
                    <TouchableOpacity
                      key={matId}
                      style={[styles.prodSelectCard, isSel && styles.prodSelectCardActive]}
                      onPress={() => toggleMaterial(mat)}
                    >
                      <View style={styles.prodCardLeftWrap}>
                        <View style={[styles.checkboxBoxModern, isSel && styles.checkboxBoxModernActive]}>
                          {isSel && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <View style={styles.prodCardInfoCol}>
                          <Text style={[styles.prodCardTitle, isSel && styles.prodCardTitleActive]}>
                            {name}
                          </Text>
                          <View style={styles.prodTagsRow}>
                            {code ? (
                              <View style={styles.prodCatPill}>
                                <Text style={styles.prodCatPillText}>{code}</Text>
                              </View>
                            ) : null}
                            {unit ? (
                              <View style={styles.prodUnitPill}>
                                <Text style={styles.prodUnitPillText}>{unit}</Text>
                              </View>
                            ) : null}
                            {cost > 0 ? (
                              <View style={styles.prodPricePill}>
                                <Text style={styles.prodPricePillText}>₹{cost}/{unit || 'unit'}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalFooterDoneContainer}>
              <TouchableOpacity
                style={styles.doneBtnModern}
                onPress={() => setShowMaterialModal(false)}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.doneBtnModernText}>
                  Done ({selectedMaterials.length} Selected)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. UNIT SELECTION MODAL */}
      <Modal
        visible={showUnitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowUnitModal(false)}
          />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Select Unit of Measure</Text>
            <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
              {COMMON_UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.dialogOptionRow, unit === u && styles.dialogOptionSelected]}
                  onPress={() => {
                    setUnit(u);
                    setShowUnitModal(false);
                  }}
                >
                  <Text style={[styles.dialogOptionText, unit === u && styles.dialogTextActive]}>
                    {u}
                  </Text>
                  {unit === u && <Check size={16} color="#2563EB" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. STATUS MODAL */}
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
            <Text style={styles.dialogTitle}>Select Batch Status</Text>
            {STATUS_OPTIONS.map((item) => {
              const isSel = status === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.dialogOptionRow, isSel && styles.dialogOptionSelected]}
                  onPress={() => {
                    setStatus(item.value);
                    setShowStatusModal(false);
                  }}
                >
                  <View style={styles.optionLeftGroup}>
                    <Clock size={16} color={item.color} />
                    <Text style={[styles.dialogOptionText, isSel && { color: item.color, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                  </View>
                  {isSel && <Check size={16} color={item.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* 6. PRIORITY MODAL */}
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
              const isSel = priority === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.dialogOptionRow, isSel && styles.dialogOptionSelected]}
                  onPress={() => {
                    setPriority(item.value);
                    setShowPriorityModal(false);
                  }}
                >
                  <View style={styles.optionLeftGroup}>
                    <View style={[styles.priorityDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.dialogOptionText, isSel && { color: item.color, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                  </View>
                  {isSel && <Check size={16} color={item.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* 7. COMPANY MODAL */}
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
            <Text style={styles.dialogTitle}>Select Operating Company</Text>
            <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
              {companiesList.map((comp) => {
                const compId = comp._id || comp.id;
                const isSel = String(selectedCompany?._id || selectedCompany?.id) === String(compId);
                return (
                  <TouchableOpacity
                    key={compId}
                    style={[styles.dialogOptionRow, isSel && styles.dialogOptionSelected]}
                    onPress={() => {
                      setSelectedCompany(comp);
                      setShowCompanyModal(false);
                    }}
                  >
                    <View style={styles.optionLeftGroup}>
                      <Building2 size={16} color={isSel ? '#2563EB' : '#64748B'} />
                      <Text style={[styles.dialogOptionText, isSel && styles.dialogTextActive]}>
                        {comp.name || comp.companyName}
                      </Text>
                    </View>
                    {isSel && <Check size={16} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 8. DEALS MODAL */}
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
                <Text style={styles.sheetMainTitle}>Select Trade Deal</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDealModal(false)} style={styles.sheetCloseBtn}>
                <X size={17} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.dealSearchBar}>
              <Search size={15} color="#94A3B8" />
              <TextInput
                style={styles.dealSearchInput}
                placeholder="Search deals by code or commodity..."
                placeholderTextColor="#94A3B8"
                value={dealSearchQuery}
                onChangeText={setDealSearchQuery}
              />
            </View>

            <ScrollView style={styles.dealsListScroll} showsVerticalScrollIndicator={false}>
              {filteredDeals.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyBoxText}>No trade deals found.</Text>
                </View>
              ) : (
                filteredDeals.map((deal) => {
                  const dealId = deal._id || deal.id;
                  const isSel = String(selectedDeal?._id || selectedDeal?.id) === String(dealId);
                  const dealCode = deal.saudaNumber || deal.dealNumber || deal.dealNo || `#${String(dealId).slice(-6)}`;
                  const comm = deal.commodity || deal.title || 'Trade Deal';
                  const statusCfg = getDealStatusConfig(deal.status);

                  return (
                    <TouchableOpacity
                      key={dealId}
                      style={[styles.dealItemCard, isSel && styles.dealItemCardSelected]}
                      onPress={() => {
                        setSelectedDeal(deal);
                        if (!name.trim()) setName(`${dealCode} - ${comm}`);
                        setShowDealModal(false);
                      }}
                    >
                      <View style={styles.dealItemLeft}>
                        <View style={styles.dealCodeBadge}>
                          <Text style={styles.dealCodeBadgeText}>{dealCode}</Text>
                        </View>
                        <Text style={styles.dealItemTitle}>{comm}</Text>
                      </View>
                      <View style={[styles.dealStatusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                        <Text style={[styles.dealStatusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerMainTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },

  /* Section Wrap */
  sectionWrap: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
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
  },
  typeCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
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
  },
  dealSelectorWrap: {
    marginTop: 10,
  },

  /* Field Sections */
  fieldSection: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 6,
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

  /* 2-Column Row */
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
    fontSize: 12,
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
  dropdownBoxSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
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
  compactInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  compactTextInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
  },

  /* ─── BOM Section Card ─── */
  bomSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  bomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  bomTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bomMainTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  bomSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addMaterialBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyBOMBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    gap: 6,
  },
  emptyBOMText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  emptyBOMSubText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  materialsListContainer: {
    gap: 8,
  },
  materialItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  materialCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  materialHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  materialItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  materialMetaPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  matCodePill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  matCodePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  matCatPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  matCatPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  removeMaterialBtn: {
    padding: 4,
  },
  materialCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  quantityStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plannedQtyLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    height: 30,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    width: 44,
    height: 28,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    padding: 0,
  },
  matUnitLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  costCol: {
    alignItems: 'flex-end',
  },
  unitCostText: {
    fontSize: 10,
    color: '#64748B',
  },
  lineTotalText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669',
  },
  bomTotalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  bomTotalLeft: {
    flex: 1,
  },
  bomTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  bomTotalSub: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 1,
  },
  bomTotalAmount: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1D4ED8',
  },

  /* Additional Overhead Costs */
  additionalCostsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  costHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addCostSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addCostSmallBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  addCostFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  costNameInput: {
    flex: 1.4,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#0F172A',
  },
  costAmountInput: {
    flex: 0.8,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#0F172A',
  },
  saveCostBtn: {
    width: 32,
    height: 38,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCostBtn: {
    width: 32,
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherCostsList: {
    marginTop: 8,
    gap: 4,
  },
  otherCostItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  otherCostName: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  otherCostRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otherCostAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Notes */
  textAreaContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  textAreaInput: {
    fontSize: 12.5,
    color: '#0F172A',
    minHeight: 45,
    padding: 0,
  },
  textAreaFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  charCounterText: {
    fontSize: 10,
    color: '#94A3B8',
  },

  /* Action Buttons */
  actionsContainer: {
    marginTop: 6,
  },
  primaryCreateBtn: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  secondaryCancelBtn: {
    height: 44,
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
    fontSize: 14,
    fontWeight: '700',
  },

  /* Modals */
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

  /* Product & Material Sheets */
  productSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '82%',
  },
  productSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prodHeaderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prodHeaderTitles: {
    flex: 1,
  },
  prodModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  prodModalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  prodCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prodSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
    marginTop: 10,
    marginBottom: 8,
    gap: 8,
  },
  prodSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  prodListScroll: {
    maxHeight: 360,
  },
  prodEmptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  prodEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  prodEmptySubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  prodSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 6,
  },
  prodSelectCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
  },
  prodCardLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  prodCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodCardIconBoxActive: {
    backgroundColor: '#EFF6FF',
  },
  prodCardInfoCol: {
    flex: 1,
  },
  prodCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  prodCardTitleActive: {
    color: '#2563EB',
  },
  prodTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  prodCatPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prodCatPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  prodUnitPill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prodUnitPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  prodPricePill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prodPricePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  checkboxBoxModern: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxModernActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  modalFooterDoneContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doneBtnModern: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneBtnModernText: {
    fontSize: 13.5,
    fontWeight: '800',
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
    marginBottom: 10,
  },
  dialogScroll: {
    maxHeight: 260,
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
    maxHeight: 300,
    marginTop: 4,
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
  },
  emptyBoxText: {
    fontSize: 12,
    color: '#94A3B8',
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
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  dealItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
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
});

export default CreateProject;
