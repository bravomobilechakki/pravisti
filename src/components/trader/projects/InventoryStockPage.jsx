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
  Boxes,
  Layers,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Check,
  X,
  Package,
  AlertCircle,
  RefreshCw,
  Clock,
  ChevronDown,
  SlidersHorizontal,
  Warehouse,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Edit3,
} from 'lucide-react-native';
import {
  getProductionInventory,
  adjustProductionStock,
  getProductionMaterials,
  issueProductionMaterial,
  receiveProductionMaterial,
  consumeProductionMaterial,
  getProjects,
} from '../../../services/api';

const THEME = '#2327D8';
const BG_COLOR = '#F8FAFC';

const InventoryStockPage = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const initialCompany = params.company || null;
  const initialCompanyId = params.companyId || initialCompany?._id || initialCompany?.id || null;

  const [company, setCompany] = useState(initialCompany);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [inventoryList, setInventoryList] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Sub-Tab: 'STOCK' | 'RECEIPT' | 'CONSUMPTION'
  const [activeTab, setActiveTab] = useState('STOCK');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for actions
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Adjust Stock Form State
  const [adjustMatId, setAdjustMatId] = useState('');
  const [adjustWarehouse, setAdjustWarehouse] = useState('Main Warehouse');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Issue Form State
  const [issueMatId, setIssueMatId] = useState('');
  const [issueProjectId, setIssueProjectId] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [issueUnit, setIssueUnit] = useState('Kg');
  const [issueWarehouse, setIssueWarehouse] = useState('Main Warehouse');
  const [issueNotes, setIssueNotes] = useState('');

  // Receive Form State
  const [receiveIssueId, setReceiveIssueId] = useState('');
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');

  // Consumption Form State
  const [consumeMatId, setConsumeMatId] = useState('');
  const [consumeProjectId, setConsumeProjectId] = useState('');
  const [consumedQty, setConsumedQty] = useState('');
  const [returnedQty, setReturnedQty] = useState('0');
  const [consumeNotes, setConsumeNotes] = useState('');

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

  // Fetch Inventory Data (GET /api/production/inventory & GET /api/production/materials)
  const fetchInventoryData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const effectiveCompId = companyId || company?._id || company?.id;
      const [invRes, matRes, projRes] = await Promise.all([
        getProductionInventory({ companyId: effectiveCompId, search: searchQuery.trim() || undefined }, token),
        getProductionMaterials({ companyId: effectiveCompId, search: searchQuery.trim() || undefined }, token),
        getProjects({ companyId: effectiveCompId, limit: 50 }, token).catch(() => null),
      ]);

      // Process live inventory items
      let invItems = [];
      if (invRes?.success && Array.isArray(invRes.data)) {
        invItems = invRes.data;
      } else if (Array.isArray(invRes?.data?.inventory)) {
        invItems = invRes.data.inventory;
      } else if (Array.isArray(invRes?.data)) {
        invItems = invRes.data;
      }
      setInventoryList(invItems);

      // Process materials master
      let matItems = [];
      if (matRes?.success && Array.isArray(matRes.data)) {
        matItems = matRes.data;
      } else if (Array.isArray(matRes?.data?.materials)) {
        matItems = matRes.data.materials;
      } else if (Array.isArray(matRes?.data)) {
        matItems = matRes.data;
      }
      setMaterials(matItems);

      // Process projects
      if (projRes?.success && Array.isArray(projRes.data?.projects)) {
        setProjectsList(projRes.data.projects);
      } else if (Array.isArray(projRes?.data)) {
        setProjectsList(projRes.data);
      }
    } catch (err) {
      console.warn('Error fetching inventory data:', err);
      setInventoryList([]);
      setMaterials([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, company, searchQuery]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Merged Stock Items (Prefers live inventory items, falls back to materials master)
  const displayStockItems = useMemo(() => {
    if (inventoryList.length > 0) {
      return inventoryList.map((inv) => {
        const mat = typeof inv.materialId === 'object' && inv.materialId !== null ? inv.materialId : {};
        const matId = mat._id || mat.id || inv.materialId || inv._id;
        return {
          id: inv._id || inv.id || matId,
          materialId: matId,
          name: mat.name || inv.materialName || 'Material',
          code: mat.materialCode || inv.materialCode || '',
          category: mat.category || 'Raw Materials',
          unit: mat.unit || inv.unit || 'Kg',
          standardCost: mat.standardCost !== undefined ? mat.standardCost : null,
          availableQuantity: inv.availableQuantity !== undefined ? inv.availableQuantity : 0,
          reservedQuantity: inv.reservedQuantity || 0,
          issuedQuantity: inv.issuedQuantity || 0,
          consumedQuantity: inv.consumedQuantity || 0,
          warehouse: inv.warehouse || 'Main Warehouse',
          location: inv.location || '',
          isRawMaterialFallback: false,
        };
      });
    }

    // Fallback if inventory collection is empty
    return materials.map((m) => ({
      id: m._id || m.id,
      materialId: m._id || m.id,
      name: m.name || m.materialName || 'Material',
      code: m.materialCode || m.code || '',
      category: m.category || 'Raw Materials',
      unit: m.unit || 'Kg',
      standardCost: m.standardCost !== undefined ? m.standardCost : null,
      availableQuantity: m.quantity !== undefined ? m.quantity : (m.currentStock ?? 0),
      reservedQuantity: 0,
      issuedQuantity: 0,
      consumedQuantity: 0,
      warehouse: 'Main Warehouse',
      location: '',
      isRawMaterialFallback: true,
    }));
  }, [inventoryList, materials]);

  // Filtered Stock Items
  const filteredStock = useMemo(() => {
    if (!searchQuery.trim()) return displayStockItems;
    const q = searchQuery.trim().toLowerCase();
    return displayStockItems.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const code = String(item.code || '').toLowerCase();
      const cat = String(item.category || '').toLowerCase();
      const wh = String(item.warehouse || '').toLowerCase();
      return name.includes(q) || code.includes(q) || cat.includes(q) || wh.includes(q);
    });
  }, [displayStockItems, searchQuery]);

  // Total Quantity KPI
  const totalStockCount = useMemo(() => {
    return filteredStock.reduce((acc, curr) => acc + (Number(curr.availableQuantity) || 0), 0);
  }, [filteredStock]);

  // Open Adjust Modal
  const openAdjustModal = (item = null) => {
    if (item) {
      setAdjustMatId(item.materialId || item.id);
      setAdjustWarehouse(item.warehouse || 'Main Warehouse');
      setAdjustQty(String(item.availableQuantity ?? '0'));
    } else {
      setAdjustMatId(materials[0]?._id || materials[0]?.id || '');
      setAdjustWarehouse('Main Warehouse');
      setAdjustQty('');
    }
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  // Submit Stock Adjustment (POST /api/production/inventory/adjust-stock)
  const handleAdjustSubmit = async () => {
    if (!adjustMatId) {
      Alert.alert('Required Field', 'Please select a Raw Material to adjust.');
      return;
    }
    if (adjustQty === '' || isNaN(Number(adjustQty)) || Number(adjustQty) < 0) {
      Alert.alert('Required Field', 'Please enter a valid stock quantity (0 or greater).');
      return;
    }

    const effectiveCompId = companyId || company?._id || company?.id;
    if (!effectiveCompId) {
      Alert.alert('Required', 'Active Company ID not found.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        companyId: effectiveCompId,
        materialId: adjustMatId,
        warehouse: adjustWarehouse.trim() || 'Main Warehouse',
        availableQuantity: Number(adjustQty),
        adjustmentQuantity: Number(adjustQty),
        notes: adjustNotes.trim() || undefined,
      };

      const res = await adjustProductionStock(payload, token);
      if (res?.success) {
        setShowAdjustModal(false);
        setAdjustQty('');
        setAdjustNotes('');
        fetchInventoryData(true);
      } else {
        Alert.alert('Error', res?.message || 'Failed to adjust stock.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Adjustment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Issue to Workstation (POST /api/production/transactions/issues)
  const handleIssueSubmit = async () => {
    if (!issueMatId) {
      Alert.alert('Required Field', 'Please select a Raw Material to issue.');
      return;
    }
    if (!issueQty || Number(issueQty) <= 0) {
      Alert.alert('Required Field', 'Please enter a valid issue quantity.');
      return;
    }

    const effectiveCompId = companyId || company?._id || company?.id;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        companyId: effectiveCompId,
        projectId: issueProjectId || undefined,
        materialId: issueMatId,
        quantity: Number(issueQty),
        unit: issueUnit || 'Kg',
        warehouse: issueWarehouse.trim() || 'Main Warehouse',
        notes: issueNotes.trim() || undefined,
      };

      const res = await issueProductionMaterial(payload, token);
      if (res?.success) {
        setShowIssueModal(false);
        setIssueMatId('');
        setIssueQty('');
        setIssueNotes('');
        fetchInventoryData(true);
      } else {
        Alert.alert('Error', res?.message || 'Failed to issue material.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Transaction failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Receive (POST /api/production/transactions/receipts)
  const handleReceiveSubmit = async () => {
    if (!receiveIssueId.trim()) {
      Alert.alert('Required Field', 'Please enter the Issue ID.');
      return;
    }
    if (!receiveQty || Number(receiveQty) <= 0) {
      Alert.alert('Required Field', 'Please enter received quantity.');
      return;
    }

    const effectiveCompId = companyId || company?._id || company?.id;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        companyId: effectiveCompId,
        issueId: receiveIssueId.trim(),
        receivedQuantity: Number(receiveQty),
        notes: receiveNotes.trim() || undefined,
      };

      const res = await receiveProductionMaterial(payload, token);
      if (res?.success) {
        setShowReceiveModal(false);
        setReceiveIssueId('');
        setReceiveQty('');
        setReceiveNotes('');
        fetchInventoryData(true);
      } else {
        Alert.alert('Error', res?.message || 'Failed to confirm receipt.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Transaction failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Consumption (POST /api/production/transactions/consumptions)
  const handleConsumeSubmit = async () => {
    if (!consumeMatId) {
      Alert.alert('Required Field', 'Please select a Raw Material.');
      return;
    }
    if (!consumedQty || Number(consumedQty) <= 0) {
      Alert.alert('Required Field', 'Please enter consumed quantity.');
      return;
    }

    const effectiveCompId = companyId || company?._id || company?.id;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        companyId: effectiveCompId,
        materialId: consumeMatId,
        projectId: consumeProjectId || undefined,
        consumedQuantity: Number(consumedQty),
        returnedQuantity: Number(returnedQty || 0),
        notes: consumeNotes.trim() || undefined,
      };

      const res = await consumeProductionMaterial(payload, token);
      if (res?.success) {
        setShowConsumeModal(false);
        setConsumedQty('');
        setReturnedQty('0');
        setConsumeNotes('');
        fetchInventoryData(true);
      } else {
        Alert.alert('Error', res?.message || 'Failed to record consumption.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Transaction failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const targetCompanyName = company?.name || company?.companyName || 'Stock Management';

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
          <Text style={styles.headerTitle}>Inventory & Stock</Text>
        </View>
        <TouchableOpacity style={styles.headerActionBtn} onPress={() => fetchInventoryData(true)} activeOpacity={0.7}>
          <RefreshCw size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchInventoryData(true)} colors={[THEME]} />
        }
      >
        {/* ─── TOP KPI SUMMARY CARDS ─── */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Boxes size={18} color={THEME} />
            </View>
            <Text style={styles.kpiValue}>{filteredStock.length}</Text>
            <Text style={styles.kpiLabel}>Stock Items</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Warehouse size={18} color="#059669" />
            </View>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>
              {totalStockCount > 1000 ? `${(totalStockCount / 1000).toFixed(1)}k` : totalStockCount}
            </Text>
            <Text style={styles.kpiLabel}>Available Qty</Text>
          </View>

          <TouchableOpacity style={[styles.kpiCard, styles.kpiCardAction]} onPress={() => openAdjustModal()} activeOpacity={0.8}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <SlidersHorizontal size={18} color="#D97706" />
            </View>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>Adjust</Text>
            <Text style={styles.kpiLabel}>Set Stock Level</Text>
          </TouchableOpacity>
        </View>

        {/* ─── QUICK SUB-TABS ─── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'STOCK' && styles.tabBtnActive]}
            onPress={() => setActiveTab('STOCK')}
            activeOpacity={0.7}
          >
            <Boxes size={14} color={activeTab === 'STOCK' ? THEME : '#64748B'} />
            <Text style={[styles.tabBtnText, activeTab === 'STOCK' && styles.tabBtnTextActive]}>
              Stock Balances
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setShowIssueModal(true)}
            activeOpacity={0.7}
          >
            <ArrowUpRight size={14} color={THEME} />
            <Text style={[styles.tabBtnText, { color: THEME, fontWeight: '700' }]}>
              Issue Floor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setShowReceiveModal(true)}
            activeOpacity={0.7}
          >
            <ArrowDownLeft size={14} color="#059669" />
            <Text style={[styles.tabBtnText, { color: '#059669', fontWeight: '700' }]}>
              Receipt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => setShowConsumeModal(true)}
            activeOpacity={0.7}
          >
            <TrendingDown size={14} color="#D97706" />
            <Text style={[styles.tabBtnText, { color: '#D97706', fontWeight: '700' }]}>
              Consume
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── SEARCH BAR ─── */}
        <View style={styles.searchBox}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search material or warehouse stock..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── STOCK CARDS LIST ─── */}
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME} />
            <Text style={styles.loadingText}>Loading warehouse balances...</Text>
          </View>
        ) : filteredStock.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Boxes size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Stock Records Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No matching materials found for this search.'
                : 'Raw materials and inventory stock will show here once added.'}
            </Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => openAdjustModal()} activeOpacity={0.85}>
              <SlidersHorizontal size={15} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Adjust First Stock</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredStock.map((item) => {
            const id = item.id;
            const name = item.name;
            const code = item.code;
            const unit = item.unit;
            const cost = item.standardCost;
            const availableQty = item.availableQuantity;
            const isLowStock = availableQty <= 10;
            const warehouse = item.warehouse;

            return (
              <View key={id} style={styles.stockCard}>
                <View style={styles.stockCardHeader}>
                  <View style={styles.matIconWrap}>
                    <Boxes size={20} color={THEME} />
                  </View>
                  <View style={styles.stockHeaderInfo}>
                    <Text style={styles.stockName} numberOfLines={1}>{name}</Text>
                    <View style={styles.codeWarehouseRow}>
                      {code ? (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>#{code.toUpperCase()}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.warehouseText}>{warehouse}</Text>
                    </View>
                  </View>
                  <View style={styles.stockQtyBadge}>
                    <Text style={styles.stockQtyText}>{availableQty} {unit}</Text>
                    <Text style={styles.stockQtyLabel}>Available</Text>
                  </View>
                </View>

                <View style={styles.stockMetaRow}>
                  {cost !== null && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillLabel}>Std Rate: </Text>
                      <Text style={styles.metaPillValue}>₹{cost}/{unit}</Text>
                    </View>
                  )}
                  {isLowStock ? (
                    <View style={[styles.metaPill, styles.lowStockPill]}>
                      <AlertCircle size={12} color="#DC2626" />
                      <Text style={styles.lowStockText}>Low Stock</Text>
                    </View>
                  ) : null}
                </View>

                {/* Quick actions for item */}
                <View style={styles.stockCardFooter}>
                  <TouchableOpacity
                    style={styles.adjustStockBtn}
                    onPress={() => openAdjustModal(item)}
                    activeOpacity={0.7}
                  >
                    <SlidersHorizontal size={13} color={THEME} />
                    <Text style={styles.adjustStockBtnText}>Adjust Stock</Text>
                  </TouchableOpacity>

                  <View style={styles.cardActionsRight}>
                    <TouchableOpacity
                      style={styles.quickIssueBtn}
                      onPress={() => {
                        setIssueMatId(item.materialId || item.id);
                        setIssueUnit(unit);
                        setShowIssueModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <ArrowUpRight size={13} color={THEME} />
                      <Text style={styles.quickIssueText}>Issue</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickConsumeBtn}
                      onPress={() => {
                        setConsumeMatId(item.materialId || item.id);
                        setShowConsumeModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <TrendingDown size={13} color="#D97706" />
                      <Text style={styles.quickConsumeText}>Consume</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── 1. ADJUST STOCK MODAL (POST /api/production/inventory/adjust-stock) ─── */}
      <Modal
        visible={showAdjustModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdjustModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowAdjustModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <SlidersHorizontal size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Adjust Stock Level</Text>
                  <Text style={styles.modalSubtitle}>Update physical available stock quantity</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAdjustModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Material *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {materials.map((m) => {
                    const mId = m._id || m.id;
                    const isSel = adjustMatId === mId;
                    return (
                      <TouchableOpacity
                        key={mId}
                        style={[styles.modalChip, isSel && styles.modalChipActive]}
                        onPress={() => setAdjustMatId(mId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalChipText, isSel && styles.modalChipTextActive]}>
                          {m.name || m.materialName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>New Available Quantity *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter available quantity"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={adjustQty}
                    onChangeText={setAdjustQty}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Warehouse Location</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter warehouse"
                    placeholderTextColor="#94A3B8"
                    value={adjustWarehouse}
                    onChangeText={setAdjustWarehouse}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason / Notes (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter reason for adjustment"
                  placeholderTextColor="#94A3B8"
                  value={adjustNotes}
                  onChangeText={setAdjustNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAdjustModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
                onPress={handleAdjustSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Save Adjustment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 2. ISSUE MATERIAL MODAL ─── */}
      <Modal
        visible={showIssueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIssueModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowIssueModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <ArrowUpRight size={18} color={THEME} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Issue Material to Floor</Text>
                  <Text style={styles.modalSubtitle}>Dispatch material from warehouse to production</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowIssueModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Material *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {materials.map((m) => {
                    const mId = m._id || m.id;
                    const isSel = issueMatId === mId;
                    return (
                      <TouchableOpacity
                        key={mId}
                        style={[styles.modalChip, isSel && styles.modalChipActive]}
                        onPress={() => {
                          setIssueMatId(mId);
                          setIssueUnit(m.unit || 'Kg');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalChipText, isSel && styles.modalChipTextActive]}>
                          {m.name || m.materialName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Quantity to Issue *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter quantity"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={issueQty}
                    onChangeText={setIssueQty}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Unit</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: '#F1F5F9' }]}
                    value={issueUnit}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Project (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {projectsList.map((p) => {
                    const pId = p._id || p.id;
                    const isSel = issueProjectId === pId;
                    return (
                      <TouchableOpacity
                        key={pId}
                        style={[styles.modalChip, isSel && styles.modalChipActive]}
                        onPress={() => setIssueProjectId(pId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalChipText, isSel && styles.modalChipTextActive]}>
                          {p.name || p.title || 'Project'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter notes"
                  placeholderTextColor="#94A3B8"
                  value={issueNotes}
                  onChangeText={setIssueNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowIssueModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
                onPress={handleIssueSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Confirm Issue</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 3. RECEIVE MATERIAL MODAL ─── */}
      <Modal
        visible={showReceiveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReceiveModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowReceiveModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <ArrowDownLeft size={18} color="#059669" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Confirm Floor Receipt</Text>
                  <Text style={styles.modalSubtitle}>Acknowledge received material on floor</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowReceiveModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Issue Transaction ID *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Issue ID"
                  placeholderTextColor="#94A3B8"
                  value={receiveIssueId}
                  onChangeText={setReceiveIssueId}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Received Quantity *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter quantity"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={receiveQty}
                  onChangeText={setReceiveQty}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter notes"
                  placeholderTextColor="#94A3B8"
                  value={receiveNotes}
                  onChangeText={setReceiveNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowReceiveModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#059669' }, submitting && styles.btnDisabled]}
                onPress={handleReceiveSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Confirm Receipt</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 4. LOG CONSUMPTION MODAL ─── */}
      <Modal
        visible={showConsumeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsumeModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowConsumeModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#FFFBEB' }]}>
                  <TrendingDown size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Log Material Consumption</Text>
                  <Text style={styles.modalSubtitle}>Record consumed & returned floor materials</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowConsumeModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Material *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {materials.map((m) => {
                    const mId = m._id || m.id;
                    const isSel = consumeMatId === mId;
                    return (
                      <TouchableOpacity
                        key={mId}
                        style={[styles.modalChip, isSel && styles.modalChipActive]}
                        onPress={() => setConsumeMatId(mId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalChipText, isSel && styles.modalChipTextActive]}>
                          {m.name || m.materialName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Project (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {projectsList.map((p) => {
                    const pId = p._id || p.id;
                    const isSel = consumeProjectId === pId;
                    return (
                      <TouchableOpacity
                        key={pId}
                        style={[styles.modalChip, isSel && styles.modalChipActive]}
                        onPress={() => setConsumeProjectId(pId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalChipText, isSel && styles.modalChipTextActive]}>
                          {p.name || p.title || 'Project'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Consumed Quantity *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter quantity"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={consumedQty}
                    onChangeText={setConsumedQty}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Returned to Warehouse</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter quantity"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={returnedQty}
                    onChangeText={setReturnedQty}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter notes"
                  placeholderTextColor="#94A3B8"
                  value={consumeNotes}
                  onChangeText={setConsumeNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConsumeModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#D97706' }, submitting && styles.btnDisabled]}
                onPress={handleConsumeSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Record Consumption</Text>
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
  kpiCardAction: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
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
    fontSize: 16.5,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: '#EEF2FF',
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: THEME,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    marginTop: 8,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stockCard: {
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
  stockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  matIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stockHeaderInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  codeWarehouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  warehouseText: {
    fontSize: 11,
    color: '#64748B',
  },
  stockQtyBadge: {
    alignItems: 'flex-end',
  },
  stockQtyText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  stockQtyLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  stockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaPillValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  lowStockPill: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
    gap: 4,
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  stockCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adjustStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  adjustStockBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickIssueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  quickIssueText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME,
  },
  quickConsumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  quickConsumeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D97706',
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
    maxHeight: '85%',
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
  chipsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: THEME,
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalChipTextActive: {
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

export default InventoryStockPage;
