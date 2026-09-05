import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
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
  MoreVertical,
  CheckCircle2,
  FolderTree,
  ChevronRight,
  Boxes,
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
  uploadService,
  resolveImageUrl,
} from '../../../services/api';

/* ── Dynamic Category Color Themes ── */
const CATEGORY_THEMES = [
  { primary: '#2563EB', light: '#EFF6FF', bg: '#F8FAFC' },
  { primary: '#059669', light: '#ECFDF5', bg: '#F8FAFC' },
  { primary: '#D97706', light: '#FFFBEB', bg: '#F8FAFC' },
  { primary: '#7C3AED', light: '#F5F3FF', bg: '#F8FAFC' },
  { primary: '#EA580C', light: '#FFF7ED', bg: '#F8FAFC' },
  { primary: '#DB2777', light: '#FDF2F8', bg: '#F8FAFC' },
];

const getCategoryTheme = (name = '') => {
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_THEMES[sum % CATEGORY_THEMES.length];
};

const CategoryPage = ({ onNavigate, routeData }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  // Tab State: 'categories' | 'subcategories'
  const [activeTab, setActiveTab] = useState(
    routeData?.initialTab === 'subcategory' ? 'subcategories' : 'categories'
  );

  // Modals & Action Sheets
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSubCategoryModalVisible, setIsSubCategoryModalVisible] = useState(false);
  const [actionSheetCategory, setActionSheetCategory] = useState(null);
  const [isParentCatPickerVisible, setIsParentCatPickerVisible] = useState(false);
  const [isUploadingCatImage, setIsUploadingCatImage] = useState(false);
  const [isUploadingSubImage, setIsUploadingSubImage] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit States
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);

  // Form States
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', image: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({
    categoryId: '',
    categoryName: '',
    name: '',
    description: '',
    image: '',
  });

  const companyId = routeData?.company?._id || routeData?.company?.id;

  /* ── Image Picker ── */
  const handleImagePick = (target) => {
    Alert.alert('Select Image Source', 'Choose how you would like to select your image:', [
      { text: 'Take Photo (Camera)', onPress: () => launchImagePicker('camera', target) },
      { text: 'Choose from Gallery', onPress: () => launchImagePicker('gallery', target) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchImagePicker = (sourceType, target) => {
    const options = { mediaType: 'photo', quality: 0.8 };
    const callback = async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick image');
        return;
      }
      if (response.assets?.length > 0) {
        const asset = response.assets[0];
        const isCat = target === 'category';
        try {
          if (isCat) {
            setCategoryForm((prev) => ({ ...prev, image: asset.uri }));
            setIsUploadingCatImage(true);
            const uploadedUrl = await uploadService.uploadImage(asset);
            setCategoryForm((prev) => ({ ...prev, image: uploadedUrl }));
          } else {
            setSubcategoryForm((prev) => ({ ...prev, image: asset.uri }));
            setIsUploadingSubImage(true);
            const uploadedUrl = await uploadService.uploadImage(asset);
            setSubcategoryForm((prev) => ({ ...prev, image: uploadedUrl }));
          }
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          Alert.alert('Upload Failed', uploadErr.message || 'Could not upload image. Please try again.');
        } finally {
          if (isCat) setIsUploadingCatImage(false);
          else setIsUploadingSubImage(false);
        }
      }
    };
    if (sourceType === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      // 1. Categories
      let fetchedCategories = [];
      const catRes = await getCategories(companyId, token);
      if (catRes?.success && Array.isArray(catRes.data)) {
        fetchedCategories = catRes.data;
        setCategories(fetchedCategories);
      }

      // 2. Subcategories
      try {
        let allSubs = [];
        if (companyId) {
          const subRes = await getSubCategories(companyId, token);
          if (subRes?.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
            allSubs = subRes.data;
          } else if (fetchedCategories.length > 0) {
            const subPromises = fetchedCategories.map((cat) =>
              getSubCategories(companyId, token, cat._id || cat.id).catch(() => null)
            );
            const subResults = await Promise.all(subPromises);
            subResults.forEach((res) => {
              if (res && res.success && Array.isArray(res.data)) {
                allSubs = [...allSubs, ...res.data];
              }
            });
          }
        }
        setSubcategories(allSubs);
      } catch (e) {
        setSubcategories([]);
      }

      // 3. Products
      try {
        if (companyId) {
          const prodRes = await getProducts(companyId, token);
          if (prodRes?.success) {
            setProducts(prodRes.data || []);
          }
        }
      } catch (e) {
        setProducts([]);
      }
    } catch (error) {
      console.error('Category fetch error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  /* ── Category CRUD ── */
  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', image: '' });
    setIsCategoryModalVisible(true);
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name || '',
      description: cat.description || '',
      image: cat.image || '',
    });
    setIsCategoryModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = { ...categoryForm };
      if (payload.image) {
        if (payload.image.startsWith('file://') || payload.image.startsWith('content://')) {
          try {
            payload.image = await uploadService.uploadImage(payload.image);
          } catch (imgErr) {
            console.warn('Category image upload fallback failed:', imgErr);
          }
        }
      } else {
        delete payload.image;
      }
      if (!payload.description) delete payload.description;

      let response;
      if (editingCategory) {
        response = await updateCategory(editingCategory._id || editingCategory.id, companyId, payload, token);
      } else {
        if (companyId) payload.companyId = companyId;
        response = await createCategory(payload, token);
      }

      if (response?.success) {
        setSuccessMessage(editingCategory ? 'Category updated!' : 'Category created!');
        setShowSuccessModal(true);
        setIsCategoryModalVisible(false);
        setCategoryForm({ name: '', description: '', image: '' });
        setEditingCategory(null);
        fetchData();
        setTimeout(() => setShowSuccessModal(false), 2000);
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
    Alert.alert('Delete Category', `Are you sure you want to delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await deleteCategory(cat._id || cat.id, companyId, token);
            if (res?.success) {
              setSuccessMessage('Category deleted!');
              setShowSuccessModal(true);
              fetchData();
              setTimeout(() => setShowSuccessModal(false), 2000);
            } else {
              Alert.alert('Error', res?.message || 'Could not delete category.');
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

  /* ── Subcategory CRUD ── */
  const openAddSubcategory = (cat) => {
    setEditingSubCategory(null);
    const parentCat = cat || categories[0];
    setSubcategoryForm({
      categoryId: parentCat?._id || parentCat?.id || '',
      categoryName: parentCat?.name || '',
      name: '',
      description: '',
      image: '',
    });
    setIsSubCategoryModalVisible(true);
  };

  const openEditSubcategory = (sub, parentCat) => {
    setEditingSubCategory(sub);
    const parent =
      parentCat ||
      categories.find((c) => String(c._id) === String(sub.categoryId?._id || sub.categoryId?.id || sub.categoryId));
    setSubcategoryForm({
      categoryId: parent?._id || parent?.id || sub.categoryId || '',
      categoryName: parent?.name || '',
      name: sub.name || '',
      description: sub.description || '',
      image: sub.image || '',
    });
    setIsSubCategoryModalVisible(true);
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryForm.name.trim() || !subcategoryForm.categoryId) {
      Alert.alert('Validation Error', 'Subcategory name and parent category are required.');
      return;
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        name: subcategoryForm.name,
        categoryId: subcategoryForm.categoryId?._id || subcategoryForm.categoryId?.id || subcategoryForm.categoryId,
      };
      if (subcategoryForm.image) {
        let subImg = subcategoryForm.image;
        if (subImg.startsWith('file://') || subImg.startsWith('content://')) {
          try {
            subImg = await uploadService.uploadImage(subImg);
          } catch (imgErr) {
            console.warn('Subcategory image upload fallback failed:', imgErr);
          }
        }
        payload.image = subImg;
      }
      if (subcategoryForm.description) payload.description = subcategoryForm.description;

      let response;
      if (editingSubCategory) {
        response = await updateSubCategory(editingSubCategory._id || editingSubCategory.id, companyId, payload, token);
      } else {
        response = await createSubCategory(payload, token);
      }

      if (response?.success) {
        setSuccessMessage(editingSubCategory ? 'Subcategory updated!' : 'Subcategory created!');
        setShowSuccessModal(true);
        setIsSubCategoryModalVisible(false);
        setSubcategoryForm({ categoryId: '', categoryName: '', name: '', description: '', image: '' });
        setEditingSubCategory(null);
        fetchData();
        setTimeout(() => setShowSuccessModal(false), 2000);
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
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await deleteSubCategory(sub._id || sub.id, companyId, token);
            if (res?.success) {
              setSuccessMessage('Subcategory deleted!');
              setShowSuccessModal(true);
              fetchData();
              setTimeout(() => setShowSuccessModal(false), 2000);
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

  /* ── Filtered Lists ── */
  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (cat.name || '').toLowerCase().includes(q);
    const hasMatchingSub = subcategories.some((s) => {
      const subCatId = s.categoryId?._id || s.categoryId?.id || s.categoryId;
      return String(subCatId) === String(cat._id || cat.id) && (s.name || '').toLowerCase().includes(q);
    });
    return nameMatch || hasMatchingSub;
  });

  const filteredSubcategories = subcategories.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (sub.name || '').toLowerCase().includes(q);
    const parent = categories.find(
      (c) => String(c._id) === String(sub.categoryId?._id || sub.categoryId?.id || sub.categoryId)
    );
    const parentMatch = parent ? parent.name.toLowerCase().includes(q) : false;
    return nameMatch || parentMatch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP LIGHT WHITE HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1541D8" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {activeTab === 'subcategories' ? 'Subcategories' : 'Categories'}
        </Text>

        <View style={styles.headerRightActions}>
          {/* Search Toggle Button */}
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setIsSearchOpen((prev) => !prev)}
            activeOpacity={0.75}
          >
            <Search size={18} color="#2563EB" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Dynamic Add Button */}
          <TouchableOpacity
            style={styles.addCategoryHeaderBtn}
            onPress={activeTab === 'subcategories' ? () => openAddSubcategory(null) : openAddCategory}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addCategoryHeaderBtnText}>
              {activeTab === 'subcategories' ? 'Add Sub' : 'Add Category'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 2. SEGMENTED TABS (Categories | Subcategories) ─── */}
      <View style={styles.segmentedTabsContainer}>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'categories' && styles.segmentTabActive]}
          onPress={() => setActiveTab('categories')}
          activeOpacity={0.8}
        >
          <Layers
            size={16}
            color={activeTab === 'categories' ? '#1541D8' : '#64748B'}
            strokeWidth={activeTab === 'categories' ? 2.5 : 2}
          />
          <Text
            style={[styles.segmentTabText, activeTab === 'categories' && styles.segmentTabTextActive]}
          >
            Categories ({categories.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'subcategories' && styles.segmentTabActive]}
          onPress={() => setActiveTab('subcategories')}
          activeOpacity={0.8}
        >
          <FolderTree
            size={16}
            color={activeTab === 'subcategories' ? '#1541D8' : '#64748B'}
            strokeWidth={activeTab === 'subcategories' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.segmentTabText,
              activeTab === 'subcategories' && styles.segmentTabTextActive,
            ]}
          >
            Subcategories ({subcategories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inline Search Bar */}
      {isSearchOpen && (
        <View style={styles.searchBarWrapper}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'subcategories'
                ? 'Search subcategories or parent categories...'
                : 'Search categories...'
            }
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1541D8']}
            tintColor="#1541D8"
          />
        }
      >
        {/* ─── 3. TOP SUMMARY METRICS CARDS ─── */}
        <View style={styles.metricsRow}>
          {/* 1. Total Categories */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => setActiveTab('categories')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#F5F3FF' }]}>
              <Layers size={18} color="#7C3AED" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Categories
            </Text>
            <Text style={styles.metricValue}>{categories.length}</Text>
          </TouchableOpacity>

          {/* 2. Subcategories */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => setActiveTab('subcategories')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <FolderTree size={18} color="#16A34A" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Subcategories
            </Text>
            <Text style={[styles.metricValue, { color: '#16A34A' }]}>{subcategories.length}</Text>
          </TouchableOpacity>

          {/* 3. Total Products */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => onNavigate('AddProductPage', { company: routeData?.company })}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Package size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Products
            </Text>
            <Text style={[styles.metricValue, { color: '#2563EB' }]}>{products.length}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 4. TAB CONTENT ─── */}
        {activeTab === 'categories' ? (
          /* ── CATEGORIES TAB CONTENT ── */
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                All Categories ({filteredCategories.length})
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#1541D8" />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : filteredCategories.length === 0 ? (
              <View style={styles.emptyCard}>
                <Layers size={36} color="#94A3B8" strokeWidth={1.8} />
                <Text style={styles.emptyTitle}>No Categories Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'No categories match your search.'
                    : 'Tap "+ Add Category" to start building your product catalog.'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={openAddCategory}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyAddBtnText}>Add Category</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredCategories.map((cat, idx) => {
                const catId = cat._id || cat.id || idx;
                const isExpanded = expandedCategoryId === catId;
                const catTheme = getCategoryTheme(cat.name);

                const catSubs = subcategories.filter((s) => {
                  const subCatId = s.categoryId?._id || s.categoryId?.id || s.categoryId;
                  return String(subCatId) === String(catId);
                });

                const catProdCount = products.filter((p) => {
                  const prodCatId = p.categoryId?._id || p.categoryId?.id || p.categoryId;
                  return String(prodCatId) === String(catId);
                }).length;

                const initials = (cat.name || 'CA')
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <View key={catId} style={styles.categoryCardContainer}>
                    {/* Category Header Row (Clickable Accordion) */}
                    <TouchableOpacity
                      style={styles.categoryCardHeader}
                      onPress={() => setExpandedCategoryId(isExpanded ? null : catId)}
                      activeOpacity={0.8}
                    >
                      {/* Left: Thumbnail / Initials */}
                      <View style={styles.categoryImgBox}>
                        {cat.image ? (
                          <Image
                            source={{ uri: resolveImageUrl(cat.image) }}
                            style={styles.categoryImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.categoryInitialsBox, { backgroundColor: catTheme.light }]}>
                            <Text style={[styles.categoryInitialsText, { color: catTheme.primary }]}>
                              {initials}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Center: Details */}
                      <View style={styles.categoryCenterInfo}>
                        <Text style={styles.categoryName} numberOfLines={1}>
                          {cat.name}
                        </Text>

                        <View style={styles.categoryChipsRow}>
                          <View style={styles.categoryCountChip}>
                            <FolderTree size={11} color="#64748B" strokeWidth={2} />
                            <Text style={styles.categoryCountChipText}>
                              {catSubs.length} {catSubs.length === 1 ? 'Subcategory' : 'Subcategories'}
                            </Text>
                          </View>

                          <View style={[styles.categoryCountChip, { backgroundColor: '#EFF6FF' }]}>
                            <Package size={11} color="#2563EB" strokeWidth={2} />
                            <Text style={[styles.categoryCountChipText, { color: '#2563EB' }]}>
                              {catProdCount} {catProdCount === 1 ? 'Product' : 'Products'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Right: Expand Chevron & Action Menu */}
                      <View style={styles.categoryRightActions}>
                        <TouchableOpacity
                          style={styles.chevronExpandBtn}
                          onPress={() => setExpandedCategoryId(isExpanded ? null : catId)}
                          activeOpacity={0.7}
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} color="#1541D8" strokeWidth={2.4} />
                          ) : (
                            <ChevronDown size={18} color="#64748B" strokeWidth={2.2} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.moreActionBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            setActionSheetCategory(cat);
                          }}
                          activeOpacity={0.7}
                        >
                          <MoreVertical size={18} color="#64748B" strokeWidth={2.2} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    {/* ─── Expandable Subcategories Drawer ─── */}
                    {isExpanded && (
                      <View style={styles.expandedDrawer}>
                        <View style={styles.drawerDivider} />

                        <View style={styles.drawerHeaderRow}>
                          <Text style={styles.drawerHeading}>
                            Subcategories ({catSubs.length})
                          </Text>
                          <TouchableOpacity
                            style={styles.drawerAddSubBtn}
                            onPress={() => openAddSubcategory(cat)}
                            activeOpacity={0.75}
                          >
                            <Plus size={13} color="#1541D8" strokeWidth={2.5} />
                            <Text style={styles.drawerAddSubBtnText}>Add Sub</Text>
                          </TouchableOpacity>
                        </View>

                        {catSubs.length === 0 ? (
                          <View style={styles.emptySubsBox}>
                            <Text style={styles.emptySubsText}>No subcategories added yet.</Text>
                          </View>
                        ) : (
                          catSubs.map((sub, sIdx) => {
                            const subProdCount = products.filter((p) => {
                              const subId = p.subCategoryId?._id || p.subCategoryId?.id || p.subCategoryId;
                              return String(subId) === String(sub._id || sub.id);
                            }).length;

                            return (
                              <View key={sub._id || sub.id || sIdx} style={styles.subItemRow}>
                                <View style={styles.subLeftInfo}>
                                  <View style={styles.subDot} />
                                  <View>
                                    <Text style={styles.subName}>{sub.name}</Text>
                                    <Text style={styles.subProductCountText}>
                                      {subProdCount} {subProdCount === 1 ? 'Product' : 'Products'}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.subActionsRow}>
                                  <TouchableOpacity
                                    style={styles.subAddProdBtn}
                                    onPress={() =>
                                      onNavigate('AddProductPage', {
                                        company: routeData?.company || { _id: companyId },
                                        prefillProduct: {
                                          categoryId: catId,
                                          categoryName: cat.name,
                                          subcategoryId: sub._id || sub.id,
                                          subcategoryName: sub.name,
                                        },
                                      })
                                    }
                                    activeOpacity={0.75}
                                  >
                                    <Plus size={12} color="#1541D8" strokeWidth={2.5} />
                                    <Text style={styles.subAddProdBtnText}>Product</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.subIconBtn}
                                    onPress={() => openEditSubcategory(sub, cat)}
                                    activeOpacity={0.7}
                                  >
                                    <Edit3 size={14} color="#2563EB" />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.subIconBtn}
                                    onPress={() => handleDeleteSubcategory(sub)}
                                    activeOpacity={0.7}
                                  >
                                    <Trash2 size={14} color="#DC2626" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* ── SUBCATEGORIES TAB CONTENT (Matching Product Card Style) ── */
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                All Subcategories ({filteredSubcategories.length})
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#1541D8" />
                <Text style={styles.loadingText}>Loading subcategories...</Text>
              </View>
            ) : filteredSubcategories.length === 0 ? (
              <View style={styles.emptyCard}>
                <FolderTree size={36} color="#94A3B8" strokeWidth={1.8} />
                <Text style={styles.emptyTitle}>No Subcategories Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'No subcategories match your search.'
                    : 'Tap "+ Add Sub" to create your first subcategory.'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => openAddSubcategory(null)}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyAddBtnText}>Add Subcategory</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredSubcategories.map((sub, sIdx) => {
                const subId = sub._id || sub.id || sIdx;
                const parentCatId = sub.categoryId?._id || sub.categoryId?.id || sub.categoryId;
                const parentCat = categories.find((c) => String(c._id) === String(parentCatId));
                const parentCatName = parentCat ? parentCat.name : typeof sub.categoryId === 'object' ? sub.categoryId?.name : 'Category';

                const subProdCount = products.filter((p) => {
                  const pSubId = p.subCategoryId?._id || p.subCategoryId?.id || p.subCategoryId;
                  return String(pSubId) === String(subId);
                }).length;

                const theme = getCategoryTheme(sub.name || parentCatName);
                const initials = (sub.name || 'SU')
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <View key={subId} style={styles.subCardContainer}>
                    <View style={styles.subCardContent}>
                      {/* Left: Thumbnail / Initials */}
                      <View style={styles.subCardImgBox}>
                        {sub.image ? (
                          <Image
                            source={{ uri: resolveImageUrl(sub.image) }}
                            style={styles.subCardImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.subCardInitialsBox, { backgroundColor: theme.light }]}>
                            <Text style={[styles.subCardInitialsText, { color: theme.primary }]}>
                              {initials}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Center: Details */}
                      <View style={styles.subCardCenterInfo}>
                        <Text style={styles.subCardTitle} numberOfLines={1}>
                          {sub.name}
                        </Text>

                        <View style={styles.subCardChipsRow}>
                          <View style={styles.subParentChip}>
                            <Layers size={10.5} color="#2563EB" strokeWidth={2.2} />
                            <Text style={styles.subParentChipText} numberOfLines={1}>
                              {parentCatName}
                            </Text>
                          </View>

                          <View style={[styles.subParentChip, { backgroundColor: '#F1F5F9' }]}>
                            <Package size={10.5} color="#64748B" strokeWidth={2.2} />
                            <Text style={[styles.subParentChipText, { color: '#64748B' }]}>
                              {subProdCount} {subProdCount === 1 ? 'Product' : 'Products'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Right: Actions */}
                      <View style={styles.subCardRightActions}>
                        <TouchableOpacity
                          style={styles.subAddProdBtn}
                          onPress={() =>
                            onNavigate('AddProductPage', {
                              company: routeData?.company || { _id: companyId },
                              prefillProduct: {
                                categoryId: parentCatId,
                                categoryName: parentCatName,
                                subcategoryId: subId,
                                subcategoryName: sub.name,
                              },
                            })
                          }
                          activeOpacity={0.75}
                        >
                          <Plus size={12} color="#1541D8" strokeWidth={2.5} />
                          <Text style={styles.subAddProdBtnText}>Product</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.subIconBtn}
                          onPress={() => openEditSubcategory(sub, parentCat)}
                          activeOpacity={0.7}
                        >
                          <Edit3 size={15} color="#2563EB" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.subIconBtn}
                          onPress={() => handleDeleteSubcategory(sub)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={15} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── 5. CATEGORY ACTION SHEET ─── */}
      <Modal
        visible={actionSheetCategory !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetCategory(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActionSheetCategory(null)}
        >
          <View style={styles.actionSheetCard}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionSheetCategory?.name}
            </Text>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const c = actionSheetCategory;
                setActionSheetCategory(null);
                openAddSubcategory(c);
              }}
              activeOpacity={0.7}
            >
              <Plus size={18} color="#1541D8" />
              <Text style={styles.actionSheetItemText}>Add Subcategory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const c = actionSheetCategory;
                setActionSheetCategory(null);
                openEditCategory(c);
              }}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color="#2563EB" />
              <Text style={styles.actionSheetItemText}>Edit Category</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 }} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const c = actionSheetCategory;
                setActionSheetCategory(null);
                handleDeleteCategory(c);
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="#DC2626" />
              <Text style={[styles.actionSheetItemText, { color: '#DC2626', fontWeight: '700' }]}>
                Delete Category
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 6. ADD / EDIT CATEGORY MODAL ─── */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalHeading}>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Category Image Picker */}
              <TouchableOpacity
                style={styles.imageUploadBox}
                onPress={() => handleImagePick('category')}
                activeOpacity={0.8}
                disabled={isUploadingCatImage}
              >
                {isUploadingCatImage ? (
                  <View style={styles.uploadPlaceholder}>
                    <ActivityIndicator size="small" color="#1541D8" />
                    <Text style={[styles.uploadPlaceholderText, { marginTop: 8 }]}>Uploading icon...</Text>
                  </View>
                ) : categoryForm.image ? (
                  <Image
                    source={{ uri: resolveImageUrl(categoryForm.image) }}
                    style={styles.uploadedImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Camera size={26} color="#1541D8" />
                    <Text style={styles.uploadPlaceholderText}>Upload Category Icon / Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Category Name */}
              <Text style={styles.modalFieldLabel}>Category Name*</Text>
              <TextInput
                style={styles.modalInput}
                value={categoryForm.name}
                onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
                placeholder="e.g. Food Grains, Edible Oils, Pulses & Dals"
                placeholderTextColor="#94A3B8"
              />

              {/* Description */}
              <Text style={styles.modalFieldLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={categoryForm.description}
                onChangeText={(text) => setCategoryForm({ ...categoryForm, description: text })}
                placeholder="Optional notes or details..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsCategoryModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveCategory}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Category</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 7. ADD / EDIT SUBCATEGORY MODAL ─── */}
      <Modal
        visible={isSubCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSubCategoryModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalHeading}>
              {editingSubCategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Parent Category Selector */}
              <Text style={styles.modalFieldLabel}>Parent Category*</Text>
              <TouchableOpacity
                style={styles.pickerSelector}
                onPress={() => setIsParentCatPickerVisible(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.pickerSelectorText}>
                  {subcategoryForm.categoryName || 'Select Parent Category'}
                </Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>

              {/* Subcategory Image Picker */}
              <TouchableOpacity
                style={styles.imageUploadBox}
                onPress={() => handleImagePick('subcategory')}
                activeOpacity={0.8}
                disabled={isUploadingSubImage}
              >
                {isUploadingSubImage ? (
                  <View style={styles.uploadPlaceholder}>
                    <ActivityIndicator size="small" color="#1541D8" />
                    <Text style={[styles.uploadPlaceholderText, { marginTop: 8 }]}>Uploading photo...</Text>
                  </View>
                ) : subcategoryForm.image ? (
                  <Image
                    source={{ uri: resolveImageUrl(subcategoryForm.image) }}
                    style={styles.uploadedImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Camera size={26} color="#1541D8" />
                    <Text style={styles.uploadPlaceholderText}>Upload Subcategory Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Subcategory Name */}
              <Text style={styles.modalFieldLabel}>Subcategory Name*</Text>
              <TextInput
                style={styles.modalInput}
                value={subcategoryForm.name}
                onChangeText={(text) => setSubcategoryForm({ ...subcategoryForm, name: text })}
                placeholder="e.g. Basmati Rice, Mustard Oil, Toor Dal"
                placeholderTextColor="#94A3B8"
              />

              {/* Description */}
              <Text style={styles.modalFieldLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={subcategoryForm.description}
                onChangeText={(text) => setSubcategoryForm({ ...subcategoryForm, description: text })}
                placeholder="Optional notes or details..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsSubCategoryModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveSubcategory}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Subcategory</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 8. PARENT CATEGORY PICKER MODAL ─── */}
      <Modal
        visible={isParentCatPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsParentCatPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsParentCatPickerVisible(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Select Parent Category</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c._id || c.id}
                  style={styles.pickerModalItem}
                  onPress={() => {
                    setSubcategoryForm({
                      ...subcategoryForm,
                      categoryId: c._id || c.id,
                      categoryName: c.name,
                    });
                    setIsParentCatPickerVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.pickerModalItemText}>{c.name}</Text>
                  {String(subcategoryForm.categoryId) === String(c._id || c.id) && (
                    <Check size={16} color="#1541D8" strokeWidth={2.4} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 9. SUCCESS TOAST MODAL ─── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.toastOverlay}>
          <View style={styles.toastCard}>
            <CheckCircle2 size={32} color="#10B981" />
            <Text style={styles.toastText}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CategoryPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },

  /* ── 1. Header (Clean White Theme) ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 6,
    flex: 1,
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCategoryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1541D8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addCategoryHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* ── 2. Segmented Tabs Bar ── */
  segmentedTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1541D8',
  },
  segmentTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTabTextActive: {
    color: '#1541D8',
    fontWeight: '800',
  },

  /* Search Bar */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 4,
  },

  /* ── 3. Top Summary Metric Cards (3 Tiles) ── */
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },

  /* ── 4. Categories & Subcategories Sections ── */
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },

  /* Category Card Container */
  categoryCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1.5,
    overflow: 'hidden',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryImgBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  categoryImg: {
    width: '100%',
    height: '100%',
  },
  categoryInitialsBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInitialsText: {
    fontSize: 16,
    fontWeight: '900',
  },
  categoryCenterInfo: {
    flex: 1,
    paddingRight: 6,
  },
  categoryName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  categoryCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  categoryCountChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chevronExpandBtn: {
    padding: 3,
  },
  moreActionBtn: {
    padding: 3,
  },

  /* Expandable Subcategories Drawer */
  expandedDrawer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 10,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  drawerHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  drawerAddSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  drawerAddSubBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1541D8',
  },
  emptySubsBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptySubsText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  /* Subcategory Item inside Accordion */
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 9,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 6,
    gap: 8,
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1541D8',
  },
  subName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  subProductCountText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  subActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subAddProdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 3,
    borderWidth: 0.8,
    borderColor: '#BFDBFE',
  },
  subAddProdBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1541D8',
  },
  subIconBtn: {
    padding: 4,
  },

  /* ── Dedicated Subcategory Card (Matching Product Card Style) ── */
  subCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1.5,
  },
  subCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  subCardImgBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  subCardImg: {
    width: '100%',
    height: '100%',
  },
  subCardInitialsBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subCardInitialsText: {
    fontSize: 15,
    fontWeight: '900',
  },
  subCardCenterInfo: {
    flex: 1,
    paddingRight: 6,
  },
  subCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subCardChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  subParentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  subParentChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  subCardRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  /* Loading & Empty */
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1541D8',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
    gap: 6,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionSheetCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  actionSheetItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '85%',
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  imageUploadBox: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 6,
  },
  uploadPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  pickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  pickerSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerModalItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#1541D8',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  toastOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  toastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
