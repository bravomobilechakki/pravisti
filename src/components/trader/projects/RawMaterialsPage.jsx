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
  Edit3,
  Trash2,
  X,
  Check,
  Building2,
  Tag,
  RefreshCw,
  ChevronRight,
  Package,
} from 'lucide-react-native';
import {
  getProductionMaterials,
  createProductionMaterial,
  updateProductionMaterial,
  deleteProductionMaterial,
  getUnits,
} from '../../../services/api';

const THEME = '#2327D8';
const BG_COLOR = '#F8FAFC';

const RawMaterialsPage = ({ route, navigation, onNavigate, onBack, routeData }) => {
  const params = route?.params || routeData || {};
  const initialCompany = params.company || null;
  const initialCompanyId = params.companyId || initialCompany?._id || initialCompany?.id || null;

  const [company, setCompany] = useState(initialCompany);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [materials, setMaterials] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('active');

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

  // Fetch Materials from GET /api/production/materials and units from GET /api/units
  const fetchMaterials = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const [matRes, unitRes] = await Promise.all([
        getProductionMaterials({ companyId, search: searchQuery.trim() || undefined }, token),
        getUnits('active', token).catch(() => null),
      ]);

      if (matRes?.success && Array.isArray(matRes.data)) {
        setMaterials(matRes.data);
      } else if (Array.isArray(matRes?.data?.materials)) {
        setMaterials(matRes.data.materials);
      } else if (Array.isArray(matRes?.materials)) {
        setMaterials(matRes.materials);
      } else if (Array.isArray(matRes?.data)) {
        setMaterials(matRes.data);
      } else if (Array.isArray(matRes)) {
        setMaterials(matRes);
      } else {
        setMaterials([]);
      }

      if (unitRes?.success && Array.isArray(unitRes.data)) {
        setUnitsList(unitRes.data);
      }
    } catch (err) {
      console.warn('[RawMaterialsPage] Error fetching production materials:', err?.message || err);
      setMaterials([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, searchQuery]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Extract unique categories dynamically from the loaded materials
  const categoriesList = useMemo(() => {
    const set = new Set();
    materials.forEach((m) => {
      const cat = m.category || m.categoryName;
      if (cat && typeof cat === 'string' && cat.trim()) {
        set.add(cat.trim());
      }
    });
    return ['ALL', ...Array.from(set)];
  }, [materials]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const mCat = m.category || m.categoryName || '';
      const matchCat = selectedCategory === 'ALL' || mCat === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCat;
      const name = String(m.name || m.materialName || '').toLowerCase();
      const code = String(m.materialCode || m.code || m.sku || '').toLowerCase();
      const cat = String(mCat).toLowerCase();
      return matchCat && (name.includes(q) || code.includes(q) || cat.includes(q));
    });
  }, [materials, selectedCategory, searchQuery]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingMaterial(null);
    setFormName('');
    setFormCode(`MAT-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCategory('Raw Materials');
    setFormUnit(unitsList.length > 0 ? unitsList[0].symbol || unitsList[0].name : 'KG');
    setFormCost('0');
    setFormDescription('');
    setFormStatus('active');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (mat) => {
    setEditingMaterial(mat);
    setFormName(mat.name || mat.materialName || '');
    setFormCode(mat.materialCode || mat.code || mat.sku || `MAT-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCategory(mat.category || mat.categoryName || 'Raw Materials');
    setFormUnit(mat.unit || (typeof mat.unitId === 'object' ? mat.unitId?.symbol || mat.unitId?.name : '') || 'KG');
    setFormCost(mat.standardCost !== undefined && mat.standardCost !== null ? String(mat.standardCost) : '0');
    setFormDescription(mat.description || '');
    setFormStatus(mat.status || 'active');
    setShowAddModal(true);
  };

  // Save (Create or Update) Material
  const handleSaveMaterial = async () => {
    if (!formName.trim()) {
      Alert.alert('Required Field', 'Please enter Material Name.');
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
      const payload = {
        companyId: effectiveCompanyId,
        materialCode: formCode.trim() || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formName.trim(),
        category: formCategory.trim() || 'Raw Materials',
        unit: formUnit.trim() || 'KG',
        standardCost: formCost ? Number(formCost) : 0,
        description: formDescription.trim() || '',
        status: formStatus || 'active',
      };

      let res;
      if (editingMaterial) {
        res = await updateProductionMaterial(
          editingMaterial._id || editingMaterial.id,
          effectiveCompanyId,
          payload,
          token
        );
      } else {
        res = await createProductionMaterial(payload, token);
      }

      if (res?.success) {
        setShowAddModal(false);
        setEditingMaterial(null);
        setFormName('');
        setFormDescription('');
        setFormCost('0');
        if (res?.data && !editingMaterial) {
          setMaterials((prev) => [res.data, ...prev.filter((m) => (m._id || m.id) !== (res.data._id || res.data.id))]);
        }
        fetchMaterials(true);
      } else {
        Alert.alert('Error', res?.message || 'Failed to save raw material.');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Material
  const handleDeleteMaterial = (mat) => {
    Alert.alert(
      'Delete Material',
      `Are you sure you want to remove "${mat.name || 'this material'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await deleteProductionMaterial(
                mat._id || mat.id,
                companyId,
                token
              );
              if (res?.success) {
                fetchMaterials();
              } else {
                Alert.alert('Error', res?.message || 'Failed to delete material.');
              }
            } catch (e) {
              Alert.alert('Error', e?.message || 'Delete failed.');
            }
          },
        },
      ]
    );
  };

  const targetCompanyName = company?.name || company?.companyName || 'Raw Materials';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* App Header */}
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {targetCompanyName}
          </Text>
          <Text style={styles.headerTitle}>Raw Materials Catalog</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchMaterials(true)} activeOpacity={0.7}>
          <RefreshCw size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchMaterials(true)} colors={[THEME]} />
        }
      >
        {/* Top Action & Summary Bar */}
        <View style={styles.topSummaryBar}>
          <View>
            <Text style={styles.totalCountTitle}>
              {materials.length} {materials.length === 1 ? 'Material' : 'Materials'}
            </Text>
            <Text style={styles.totalCountSub}>BOM & Production Master Catalog</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openCreateModal} activeOpacity={0.8}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Material</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Category Filter Chips */}
        {categoriesList.length > 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsScroll}
          >
            {categoriesList.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, isSelected && styles.catChipSelected]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                    {cat === 'ALL' ? 'All' : cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME} />
            <Text style={styles.loadingText}>Loading raw materials...</Text>
          </View>
        ) : filteredMaterials.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Boxes size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Raw Materials Yet</Text>
            <Text style={styles.emptySubtitle}>
              Register raw materials to link BOM components, standard purchase costs, and track stock.
            </Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={openCreateModal} activeOpacity={0.8}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.emptyCreateBtnText}>Add Raw Material</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMaterials.map((item) => {
            const id = item._id || item.id;
            const name = item.name || item.materialName || 'Raw Material';
            const code = item.materialCode || item.code || item.sku || '';
            const unit = item.unit || (typeof item.unitId === 'object' ? item.unitId?.symbol || item.unitId?.name : '') || 'Unit';
            const cost = item.standardCost !== undefined && item.standardCost !== null ? item.standardCost : null;
            const cat = item.category || item.categoryName || '';
            const isActive = item.status !== 'inactive';

            return (
              <View key={id} style={styles.materialCard}>
                <View style={styles.matCardHeader}>
                  <View style={styles.matIconWrap}>
                    <Boxes size={20} color={THEME} />
                  </View>
                  <View style={styles.matHeaderInfo}>
                    <Text style={styles.matName} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={styles.metaRow}>
                      {code ? (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>#{code.toUpperCase()}</Text>
                        </View>
                      ) : null}
                      {cat ? (
                        <Text style={styles.matCatText}>{cat}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.matDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Details Footer Row */}
                <View style={styles.matMetaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillLabel}>Unit: </Text>
                    <Text style={styles.metaPillValue}>{unit}</Text>
                  </View>
                  {cost !== null && (
                    <View style={[styles.metaPill, styles.costPill]}>
                      <Text style={styles.metaPillLabel}>Cost: </Text>
                      <Text style={styles.costPillValue}>₹{Number(cost).toLocaleString('en-IN')}/{unit}</Text>
                    </View>
                  )}
                  <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                    <Text style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.matCardFooter}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={14} color={THEME} />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteActionBtn]}
                    onPress={() => handleDeleteMaterial(item)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color="#EF4444" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── ADD / EDIT MATERIAL MODAL ─── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Boxes size={20} color={THEME} />
                <Text style={styles.modalTitle}>
                  {editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Material Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Material Name <Text style={styles.reqStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter raw material name"
                  placeholderTextColor="#94A3B8"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* Material Code & Category */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Material Code / SKU</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. RAW-01"
                    placeholderTextColor="#94A3B8"
                    value={formCode}
                    onChangeText={setFormCode}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Category</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Fabric, Metal"
                    placeholderTextColor="#94A3B8"
                    value={formCategory}
                    onChangeText={setFormCategory}
                  />
                </View>
              </View>

              {/* Unit & Standard Cost */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Unit of Measure</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Kg, Mtr, Pcs"
                    placeholderTextColor="#94A3B8"
                    value={formUnit}
                    onChangeText={setFormUnit}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Std Purchase Price (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={formCost}
                    onChangeText={setFormCost}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description / Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Grade, specifications, or supplier details..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={formDescription}
                  onChangeText={setFormDescription}
                />
              </View>
            </ScrollView>

            {/* Modal Submit Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
                onPress={handleSaveMaterial}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>
                      {editingMaterial ? 'Update Material' : 'Save Material'}
                    </Text>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  topSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  totalCountTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalCountSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryChipsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipSelected: {
    backgroundColor: THEME,
    borderColor: THEME,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  catChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyCreateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  matCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  matIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  matHeaderInfo: {
    flex: 1,
  },
  matName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  metaRow: {
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
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  matCatText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  matDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  matMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  costPill: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  costPillValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#059669',
  },
  statusInactiveText: {
    color: '#64748B',
  },
  matCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME,
  },
  deleteActionBtn: {},
  deleteActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
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
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
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
    fontWeight: '600',
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
  formTextArea: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: THEME,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default RawMaterialsPage;
