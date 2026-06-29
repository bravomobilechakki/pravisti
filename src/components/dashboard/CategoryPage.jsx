import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  FlatList,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  ArrowLeft,
  Search,
  X,
  Tag,
  FolderOpen,
  Edit3,
  Trash2,
  Plus,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Package,
  ImageIcon,
} from 'lucide-react-native';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory,
  getProducts,
} from '../../services/api';

/* ─── Safe Image with fallback ─── */
const SafeImage = ({ uri, style, fallbackUri }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={{ uri: failed || !uri ? fallbackUri : uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
};

/* ─── Dynamic Category Themes ─── */
const CATEGORY_THEMES = [
  { primary: '#4F46E5', light: '#EEF2FF', gradient: ['#4F46E5', '#6366F1'] },
  { primary: '#059669', light: '#ECFDF5', gradient: ['#059669', '#10B981'] },
  { primary: '#D97706', light: '#FFFBEB', gradient: ['#D97706', '#F59E0B'] },
  { primary: '#0284C7', light: '#F0F9FF', gradient: ['#0284C7', '#0EA5E9'] },
  { primary: '#EA580C', light: '#FFF7ED', gradient: ['#EA580C', '#F97316'] },
  { primary: '#DB2777', light: '#FDF2F8', gradient: ['#DB2777', '#EC4899'] },
  { primary: '#7C3AED', light: '#F5F3FF', gradient: ['#7C3AED', '#8B5CF6'] },
];

const getCategoryTheme = (name = '') => {
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_THEMES[sum % CATEGORY_THEMES.length];
};
// Suggested Improvements
// Add Redux Toolkit or Zustand for global state.
// Add React Query for API caching.
// Implement offline support.
// Add push notifications for deal updates.
// Add role-based permissions (Trader/Broker/Admin).
// Add analytics and crash reporting.
// Add unit and integration tests.

// This structure is already quite modular and suitable for scaling into a production B2B marketplace app.
/* ─── Premium Category Card ─── */
const CategoryCard = ({
  cat,
  isExpanded,
  onToggle,
  catSubs,
  onEditCat,
  onDeleteCat,
  onAddSub,
  onEditSub,
  onDeleteSub,
  onAddProduct,
  catProductCount = 0,
  subProductCounts = {},
}) => {
  const catId = cat._id || cat.id;
  const isActive = (cat.status || 'active').toLowerCase() === 'active';
  const catTheme = getCategoryTheme(cat.name);
  const initials = (cat.name || '??').trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { borderColor: catTheme.primary + '18' }]}>

      {/* ── MAIN CARD ROW ── */}
      <TouchableOpacity
        style={styles.cardHeader}
        activeOpacity={0.85}
        onPress={() => onToggle(catId)}
      >
        {/* Avatar with glow & overlay status dot */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarGlow, { shadowColor: catTheme.primary }]}>
            <View style={[styles.avatarRing, { borderColor: catTheme.primary }]}>
              <View style={[styles.avatarInner, { backgroundColor: catTheme.light }]}>
                {cat.image ? (
                  <SafeImage
                    uri={cat.image}
                    fallbackUri="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d"
                    style={styles.avatarImg}
                  />
                ) : (
                  <Text style={[styles.avatarInitials, { color: catTheme.primary }]}>{initials}</Text>
                )}
              </View>
            </View>
          </View>
          {/* Glowing Status Dot */}
          <View style={[
            styles.statusDotOverlay,
            { backgroundColor: isActive ? '#10B981' : '#F43F5E' }
          ]} />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: '#0F172A' }]} numberOfLines={1}>
            {cat.name}
          </Text>
          {!!cat.description && (
            <Text style={styles.cardDesc} numberOfLines={1}>{cat.description}</Text>
          )}
          <View style={styles.cardBadgeRow}>
            <View style={[styles.badge, { backgroundColor: catTheme.light, borderColor: catTheme.primary + '22', borderWidth: 1 }]}>
              <Layers size={10} color={catTheme.primary} />
              <Text style={[styles.badgeText, { color: catTheme.primary }]}>
                {catSubs.length} Sub{catSubs.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: catTheme.light, borderColor: catTheme.primary + '22', borderWidth: 1 }]}>
              <Package size={10} color={catTheme.primary} />
              <Text style={[styles.badgeText, { color: catTheme.primary }]}>
                {catProductCount} Product{catProductCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Right: chevron */}
        <View style={[styles.chevronBox, { backgroundColor: catTheme.light }]}>
          {isExpanded
            ? <ChevronUp size={14} color={catTheme.primary} />
            : <ChevronDown size={14} color={catTheme.primary} />
          }
        </View>
      </TouchableOpacity>

      {/* ── EXPANDED PANEL ── */}
      {isExpanded && (
        <View style={[styles.panel, { borderTopColor: catTheme.primary + '18', backgroundColor: catTheme.light + '28' }]}>

          {/* 3 action buttons */}
          <View style={styles.panelActions}>
            <TouchableOpacity
              style={[styles.panelBtn, { backgroundColor: catTheme.light, borderColor: catTheme.primary + '30' }]}
              onPress={() => onEditCat(cat)}
              activeOpacity={0.8}
            >
              <Edit3 size={14} color={catTheme.primary} />
              <Text style={[styles.panelBtnText, { color: catTheme.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.panelBtn, { backgroundColor: '#FFF5F5', borderColor: '#FFE3E3' }]}
              onPress={() => onDeleteCat(cat)}
              activeOpacity={0.8}
            >
              <Trash2 size={14} color="#EF4444" />
              <Text style={[styles.panelBtnText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.panelBtn, { backgroundColor: catTheme.primary, borderColor: catTheme.primary }]}
              onPress={() => onAddSub(catId)}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#FFF" />
              <Text style={[styles.panelBtnText, { color: '#FFF' }]}>Add Sub</Text>
            </TouchableOpacity>
          </View>

          {/* Subcategories list */}
          {catSubs.length > 0 && (
            <View style={styles.subSection}>
              <View style={styles.subHeader}>
                <View style={[styles.subHeaderDot, { backgroundColor: catTheme.primary }]} />
                <Text style={styles.subHeaderTitle}>SUBCATEGORIES</Text>
                <View style={[styles.subHeaderBadge, { backgroundColor: catTheme.primary + '18' }]}>
                  <Text style={[styles.subHeaderBadgeText, { color: catTheme.primary }]}>{catSubs.length}</Text>
                </View>
              </View>
              <View style={styles.subGrid}>
                {catSubs.map((sub) => {
                  const subId = sub._id || sub.id;
                  const subName = sub.name || '—';
                  const subInitials = subName.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
                  const subProdCount = subProductCounts[subId] || 0;
                  return (
                    <View key={subId} style={styles.subItem}>
                      {/* Sub avatar */}
                      <View style={[styles.subCircle, { borderColor: catTheme.primary + '30', backgroundColor: catTheme.light }]}>
                        {sub.image ? (
                          <SafeImage
                            uri={sub.image}
                            fallbackUri="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d"
                            style={styles.subCircleImg}
                          />
                        ) : (
                          <Text style={[styles.subCircleText, { color: catTheme.primary }]}>{subInitials}</Text>
                        )}
                      </View>
                      <View style={styles.subItemInfo}>
                        <Text style={styles.subItemName} numberOfLines={1}>{subName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          <Package size={10} color="#64748B" />
                          <Text style={[styles.subItemDesc, { marginTop: 0 }]} numberOfLines={1}>
                            {subProdCount} product{subProdCount !== 1 ? 's' : ''} {sub.description ? `• ${sub.description}` : ''}
                          </Text>
                        </View>
                      </View>
                      {/* icon actions */}
                      <View style={styles.subItemBtns}>
                        <TouchableOpacity style={[styles.subIconBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => onEditSub(sub)}>
                          <Edit3 size={11} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.subIconBtn, { backgroundColor: '#FFF1F2' }]} onPress={() => onDeleteSub(sub)}>
                          <Trash2 size={11} color="#F43F5E" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.subIconBtn, { backgroundColor: catTheme.primary }]} onPress={() => onAddProduct(cat, sub)}>
                          <Plus size={11} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {catSubs.length === 0 && (
            <View style={styles.emptySubBox}>
              <FolderOpen size={22} color="#CBD5E1" />
              <Text style={styles.emptySubText}>No subcategories yet</Text>
              <TouchableOpacity
                style={[styles.addSubInlineBtn, { backgroundColor: catTheme.primary }]}
                onPress={() => onAddSub(catId)}
              >
                <Plus size={12} color="#FFF" />
                <Text style={styles.addSubInlineBtnText}>Add Subcategory</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

/* ─── Bottom Sheet Modal ─── */
const BottomSheetModal = ({ visible, onClose, title, children }) => {
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ─── Main Component ─── */
const CategoryPage = ({ onNavigate, routeData }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSubCategoryModalVisible, setIsSubCategoryModalVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', image: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ categoryId: '', name: '', description: '', image: '' });

  const companyName = routeData?.company?.name || 'Company';
  const companyId = routeData?.company?._id || routeData?.company?.id;

  /* ── Image Picker ── */
  const handleImagePick = (target) => {
    Alert.alert('Select Image', 'Choose how to add the image:', [
      { text: '📷 Camera', onPress: () => launchImagePicker('camera', target) },
      { text: '🖼️ Gallery', onPress: () => launchImagePicker('gallery', target) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchImagePicker = (sourceType, target) => {
    const options = { mediaType: 'photo', quality: 0.8 };
    const callback = (response) => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets?.length > 0) {
        const uri = response.assets[0].uri;
        if (target === 'category') {
          setCategoryForm(prev => ({ ...prev, image: uri }));
        } else {
          setSubcategoryForm(prev => ({ ...prev, image: uri }));
        }
      }
    };
    sourceType === 'camera' ? launchCamera(options, callback) : launchImageLibrary(options, callback);
  };

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const catRes = await getCategories(companyId, token);
      if (catRes?.success) setCategories(catRes.data || []);

      try {
        if (companyId) {
          const subRes = await getSubCategories(companyId, token);
          if (subRes?.success) setSubcategories(subRes.data || []);
        } else {
          setSubcategories([]);
        }
      } catch (e) {
        setSubcategories([]);
      }

      try {
        if (companyId) {
          const prodRes = await getProducts(companyId, token);
          if (prodRes?.success) {
            setProducts(prodRes.data || []);
          } else {
            setProducts([]);
          }
        } else {
          setProducts([]);
        }
      } catch (e) {
        console.warn('Failed to fetch products:', e);
        setProducts([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to fetch categories.');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── CRUD ── */
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      Alert.alert('Required', 'Category name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      let response;
      const payload = { ...categoryForm };
      if (!payload.image) delete payload.image;
      if (!payload.description) delete payload.description;

      if (editingCategory) {
        response = await updateCategory(editingCategory._id || editingCategory.id, companyId, payload, token);
      } else {
        if (companyId) payload.companyId = companyId;
        response = await createCategory(payload, token);
      }

      if (response?.success) {
        setSuccessMessage(editingCategory ? 'Category updated!' : 'Category created!');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2200);
        setIsCategoryModalVisible(false);
        setCategoryForm({ name: '', description: '', image: '' });
        setEditingCategory(null);
        fetchData();
      } else {
        Alert.alert('Error', response?.message || 'Operation failed.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    Alert.alert('Delete Category', `Delete "${cat.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setIsLoading(true);
          try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await deleteCategory(cat._id || cat.id, companyId, token);
            if (res?.success) {
              setSuccessMessage('Category deleted!');
              setShowSuccessModal(true);
              setTimeout(() => setShowSuccessModal(false), 2200);
              fetchData();
            } else {
              Alert.alert('Error', res?.message || 'Could not delete.');
              setIsLoading(false);
            }
          } catch (e) {
            Alert.alert('Error', e.message);
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryForm.name.trim() || !subcategoryForm.categoryId) {
      Alert.alert('Required', 'Subcategory name and parent category are required.');
      return;
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        ...subcategoryForm,
        categoryId: subcategoryForm.categoryId?._id || subcategoryForm.categoryId?.id || subcategoryForm.categoryId,
      };
      if (!payload.image) delete payload.image;
      if (!payload.description) delete payload.description;

      let response;
      if (editingSubCategory) {
        response = await updateSubCategory(editingSubCategory._id || editingSubCategory.id, companyId, payload, token);
      } else {
        response = await createSubCategory(payload, token);
      }

      if (response?.success) {
        setSuccessMessage(editingSubCategory ? 'Subcategory updated!' : 'Subcategory created!');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2200);
        setIsSubCategoryModalVisible(false);
        setSubcategoryForm({ categoryId: '', name: '', description: '', image: '' });
        setEditingSubCategory(null);
        fetchData();
      } else {
        Alert.alert('Error', response?.message || 'Operation failed.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubcategory = (sub) => {
    Alert.alert('Delete Subcategory', `Delete "${sub.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setIsLoading(true);
          try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await deleteSubCategory(sub._id || sub.id, companyId, token);
            if (res?.success) {
              setSuccessMessage('Subcategory deleted!');
              setShowSuccessModal(true);
              setTimeout(() => setShowSuccessModal(false), 2200);
              fetchData();
            } else {
              Alert.alert('Error', res?.message || 'Could not delete.');
              setIsLoading(false);
            }
          } catch (e) {
            Alert.alert('Error', e.message);
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const getSubcategoriesForCategory = (catId) => {
    const seen = new Set();
    return subcategories.filter(sub => {
      const subId = sub._id || sub.id;
      if (!subId || seen.has(String(subId))) return false;
      seen.add(String(subId));
      const subCatId = sub.categoryId?._id || sub.categoryId?.id || sub.categoryId;
      return String(subCatId) === String(catId);
    });
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', image: cat.image || '' });
    setIsCategoryModalVisible(true);
  };

  const openAddSubcategory = (catId) => {
    setEditingSubCategory(null);
    setSubcategoryForm({ categoryId: catId, name: '', description: '', image: '' });
    setIsSubCategoryModalVisible(true);
  };

  const openEditSubcategory = (sub) => {
    setEditingSubCategory(sub);
    setSubcategoryForm({
      categoryId: sub.categoryId?._id || sub.categoryId?.id || sub.categoryId || '',
      name: sub.name,
      description: sub.description || '',
      image: sub.image || '',
    });
    setIsSubCategoryModalVisible(true);
  };

  const navigateToAddProduct = (cat, sub) => {
    onNavigate('AddProductPage', {
      company: routeData?.company,
      prefillProduct: {
        categoryId: cat._id || cat.id,
        categoryName: cat.name,
        subcategoryId: sub._id || sub.id,
        subcategoryName: sub.name,
      },
    });
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSubs = subcategories.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />

      {/* ── HERO HEADER ── */}
      <View style={styles.heroHeader}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('pop')} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.heroCenter}>
            <Text style={styles.heroTitle}>Category Console</Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>{companyName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Tag size={13} color="#A5B4FC" />
            <Text style={styles.statChipNum}>{categories.length}</Text>
            <Text style={styles.statChipLabel}>Categories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Layers size={13} color="#A5B4FC" />
            <Text style={styles.statChipNum}>{totalSubs}</Text>
            <Text style={styles.statChipLabel}>Subcategories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Package size={13} color="#A5B4FC" />
            <Text style={styles.statChipNum}>{categories.filter(c => (c.status || 'active').toLowerCase() === 'active').length}</Text>
            <Text style={styles.statChipLabel}>Active</Text>
          </View>
        </View>

        {/* Search Bar - overlapping */}
        <View style={styles.searchBarWrapper}>
          <Search size={15} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── CONTENT ── */}
      {isLoading && categories.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Tag size={36} color="#C7D2FE" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Results Found' : 'No Categories Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No categories match "${searchQuery}"`
                  : 'Tap the + button below to create your first category'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', image: '' }); setIsCategoryModalVisible(true); }}
                >
                  <Plus size={16} color="#FFF" />
                  <Text style={styles.emptyActionBtnText}>Create First Category</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            filteredCategories.length > 0 ? (
              <TouchableOpacity
                style={styles.listFooterAddBtn}
                onPress={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', image: '' }); setIsCategoryModalVisible(true); }}
                activeOpacity={0.88}
              >
                <View style={styles.listFooterAddBtnIcon}>
                  <Plus size={18} color="#4F46E5" strokeWidth={2.8} />
                </View>
                <Text style={styles.listFooterAddBtnText}>Add Category</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: cat }) => {
            const catId = cat._id || cat.id;
            const catSubs = getSubcategoriesForCategory(catId);
            const catProductCount = products.filter(prod => {
              const prodCatId = prod.categoryId?._id || prod.categoryId?.id || prod.categoryId;
              return String(prodCatId) === String(catId);
            }).length;

            const subProductCounts = {};
            catSubs.forEach(sub => {
              const subId = sub._id || sub.id;
              subProductCounts[subId] = products.filter(prod => {
                const prodSubCatId = prod.subCategoryId?._id || prod.subCategoryId?.id || prod.subCategoryId || prod.subcategoryId?._id || prod.subcategoryId?.id || prod.subcategoryId;
                return String(prodSubCatId) === String(subId);
              }).length;
            });

            return (
              <CategoryCard
                cat={cat}
                isExpanded={expandedCategoryId === catId}
                onToggle={(id) => setExpandedCategoryId(expandedCategoryId === id ? null : id)}
                catSubs={catSubs}
                onEditCat={openEditCategory}
                onDeleteCat={handleDeleteCategory}
                onAddSub={openAddSubcategory}
                onEditSub={openEditSubcategory}
                onDeleteSub={handleDeleteSubcategory}
                onAddProduct={navigateToAddProduct}
                catProductCount={catProductCount}
                subProductCounts={subProductCounts}
              />
            );
          }}
        />
      )}

      {/* ── CATEGORY MODAL (Bottom Sheet) ── */}
      <BottomSheetModal
        visible={isCategoryModalVisible}
        onClose={() => setIsCategoryModalVisible(false)}
        title={editingCategory ? '✏️ Edit Category' : '✨ New Category'}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
          <Text style={styles.inputLabel}>Category Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={categoryForm.name}
            onChangeText={(t) => setCategoryForm({ ...categoryForm, name: t })}
            placeholder="e.g. Grains, Textiles, Spices"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={categoryForm.description}
            onChangeText={(t) => setCategoryForm({ ...categoryForm, description: t })}
            placeholder="Brief description..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Category Image</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={() => handleImagePick('category')} activeOpacity={0.8}>
            {categoryForm.image ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: categoryForm.image }} style={styles.imagePreview} />
                <View style={styles.imageOverlay}>
                  <Camera size={18} color="#FFF" />
                  <Text style={styles.imageOverlayText}>Change</Text>
                </View>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <ImageIcon size={24} color="#94A3B8" />
                <Text style={styles.imagePlaceholderText}>Tap to upload image</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sheetActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCategoryModalVisible(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCategory} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : (
              <Text style={styles.saveBtnText}>{editingCategory ? 'Update' : 'Create'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* ── SUBCATEGORY MODAL (Bottom Sheet) ── */}
      <BottomSheetModal
        visible={isSubCategoryModalVisible}
        onClose={() => setIsSubCategoryModalVisible(false)}
        title={editingSubCategory ? '✏️ Edit Subcategory' : '✨ New Subcategory'}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
          <Text style={styles.inputLabel}>Subcategory Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={subcategoryForm.name}
            onChangeText={(t) => setSubcategoryForm({ ...subcategoryForm, name: t })}
            placeholder="e.g. Basmati Rice, Cotton Fabric"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={subcategoryForm.description}
            onChangeText={(t) => setSubcategoryForm({ ...subcategoryForm, description: t })}
            placeholder="Brief description..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Subcategory Image</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={() => handleImagePick('subcategory')} activeOpacity={0.8}>
            {subcategoryForm.image ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: subcategoryForm.image }} style={styles.imagePreview} />
                <View style={styles.imageOverlay}>
                  <Camera size={18} color="#FFF" />
                  <Text style={styles.imageOverlayText}>Change</Text>
                </View>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <ImageIcon size={24} color="#94A3B8" />
                <Text style={styles.imagePlaceholderText}>Tap to upload image</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sheetActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsSubCategoryModalVisible(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSubcategory} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : (
              <Text style={styles.saveBtnText}>{editingSubCategory ? 'Update' : 'Create'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* ── SUCCESS MODAL ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Check size={32} color="#10B981" strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>Done! 🎉</Text>
            <Text style={styles.successMsg}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ─────── STYLES ─────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  /* Hero Header */
  heroHeader: {
    backgroundColor: '#1E1B4B',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingBottom: 42,
    paddingHorizontal: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCenter: { flex: 1, alignItems: 'center' },
  heroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  heroSubtitle: { color: '#A5B4FC', fontSize: 11, fontWeight: '600', marginTop: 1 },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statChip: { flex: 1, alignItems: 'center', gap: 2 },
  statChipNum: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statChipLabel: { color: '#A5B4FC', fontSize: 10, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  /* Search Bar */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: -23,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', height: '100%' },

  /* List */
  listContent: { paddingTop: 32, paddingHorizontal: 16, paddingBottom: 24 },

  /* Loader */
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: '#64748B', fontSize: 13, fontWeight: '600' },

  /* Empty State */
  emptyWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2, borderColor: '#C7D2FE',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 14, marginTop: 20,
  },
  emptyActionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  /* ── Category Card ── */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  /* Avatar layers: glow -> ring -> inner */
  avatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  statusDotOverlay: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
  },
  avatarGlow: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderRadius: 32,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 100 },
  avatarInitials: { fontSize: 20, fontWeight: '900' },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
  cardDesc: { fontSize: 12, color: '#94A3B8', lineHeight: 16 },
  cardBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chevronBox: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Expanded Panel */
  panel: {
    borderTopWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  panelActions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  panelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 14, borderWidth: 1.2,
  },
  panelBtnText: { fontSize: 12, fontWeight: '700' },

  /* Subcategories */
  subSection: { gap: 10 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subHeaderDot: { width: 3, height: 14, borderRadius: 2 },
  subHeaderTitle: { flex: 1, fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1 },
  subHeaderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  subHeaderBadgeText: { fontSize: 11, fontWeight: '800' },
  subGrid: { gap: 8 },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  subCircle: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', borderWidth: 1.5,
  },
  subCircleImg: { width: '100%', height: '100%', borderRadius: 19 },
  subCircleText: { fontSize: 12, fontWeight: '900' },
  subItemInfo: { flex: 1 },
  subItemName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  subItemDesc: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  subItemBtns: { flexDirection: 'row', gap: 5 },
  subIconBtn: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 0.5,
  },

  /* Empty sub */
  emptySubBox: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptySubText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  addSubInlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 4,
  },
  addSubInlineBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  subActions: {
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: '#EDE9FE',
  },
  subActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 8,
    borderRightWidth: 1, gap: 4,
  },
  subActionText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  /* List Footer Add Button */
  listFooterAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  listFooterAddBtnIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listFooterAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  /* Bottom Sheet Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 32,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 16 },

  /* Form inputs */
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 14,
    height: 48, fontSize: 14, color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  imagePicker: {
    height: 110, borderWidth: 1.5, borderColor: '#CBD5E1',
    borderStyle: 'dashed', borderRadius: 14,
    overflow: 'hidden', backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center',
  },
  imagePlaceholder: { alignItems: 'center', gap: 6 },
  imagePlaceholderText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  imagePreviewWrap: { width: '100%', height: '100%' },
  imagePreview: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  imageOverlayText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  /* Sheet action buttons */
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  cancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#4F46E5', alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  /* Success Modal */
  successOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  successCard: {
    backgroundColor: '#FFF', borderRadius: 28, padding: 32,
    alignItems: 'center', width: '100%',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18, shadowRadius: 32, elevation: 12,
    borderWidth: 1, borderColor: '#ECFDF5',
  },
  successIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 3, borderColor: '#A7F3D0',
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  successMsg: { fontSize: 14, color: '#475569', textAlign: 'center', fontWeight: '600', lineHeight: 20 },
});

export default CategoryPage;
