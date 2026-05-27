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
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory,
} from '../../services/api';

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

// Premium dynamic themes for category differentiation
const CATEGORY_THEMES = [
  { primary: '#4F46E5', accentBg: '#EEF2FF', badgeText: '#4F46E5' }, // Indigo Orchid
  { primary: '#059669', accentBg: '#ECFDF5', badgeText: '#059669' }, // Forest Emerald
  { primary: '#D97706', accentBg: '#FFFBEB', badgeText: '#B45309' }, // Amber Honey
  { primary: '#0284C7', accentBg: '#F0F9FF', badgeText: '#0369A1' }, // Deep Sea Blue
  { primary: '#EA580C', accentBg: '#FFF7ED', badgeText: '#C2410C' }, // Crimson Sunset
  { primary: '#DB2777', accentBg: '#FDF2F8', badgeText: '#BE185D' }, // Rose Garden
  { primary: '#7C3AED', accentBg: '#F5F3FF', badgeText: '#6D28D9' }, // Velvet Purple
];

const getCategoryTheme = (name = '') => {
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_THEMES[sum % CATEGORY_THEMES.length];
};

const CategoryPage = ({ onNavigate, routeData }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  // Modals visibility
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSubCategoryModalVisible, setIsSubCategoryModalVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // null means creating
  const [editingSubCategory, setEditingSubCategory] = useState(null); // null means creating

  // Forms states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image: '',
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    image: '',
  });

  const themeColor = '#3170cdff';

  const handleImagePick = (target) => {
    Alert.alert(
      'Select Image Source',
      'Choose how you would like to select your category image:',
      [
        {
          text: '📸 Take Photo (Camera)',
          onPress: () => launchImagePicker('camera', target),
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: () => launchImagePicker('gallery', target),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const launchImagePicker = (sourceType, target) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    const callback = (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick ');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const selectedUri = response.assets[0].uri;
        if (target === 'category') {
          setCategoryForm(prev => ({ ...prev, image: selectedUri }));
        } else {
          setSubcategoryForm(prev => ({ ...prev, image: selectedUri }));
        }
      }
    };

    if (sourceType === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = routeData?.company?._id || routeData?.company?.id;
      const catRes = await getCategories(companyId, token);

      if (catRes && catRes.success) {
        setCategories(catRes.data || []);
      }

      // Gracefully handle subcategories
      try {
        if (companyId) {
          const subRes = await getSubCategories(companyId, token);
          if (subRes && subRes.success) {
            setSubcategories(subRes.data || []);
          }
        } else {
          setSubcategories([]);
        }
      } catch (subErr) {
        console.warn('Subcategories endpoint load bypassed:', subErr.message || subErr);
        setSubcategories([]);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
      Alert.alert('Error', 'Unable to fetch categories list.');
    } finally {
      setIsLoading(false);
    }
  }, [routeData?.company?._id, routeData?.company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateOrUpdateCategory = async () => {
    if (!categoryForm.name) {
      Alert.alert('Validation Error', 'Category Name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      let response;
      const companyId = routeData?.company?._id || routeData?.company?.id;

      if (editingCategory) {
        const payload = { ...categoryForm };
        if (!payload.image) delete payload.image;
        if (!payload.description) delete payload.description;
        response = await updateCategory(editingCategory._id || editingCategory.id, companyId, payload, token);
      } else {
        const payload = { ...categoryForm };
        if (companyId) payload.companyId = companyId;
        if (!payload.image) delete payload.image;
        if (!payload.description) delete payload.description;
        response = await createCategory(payload, token);
      }

      if (response && response.success) {
        setSuccessMessage(editingCategory ? 'Category updated successfully!' : 'Category created successfully!');
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 2500);

        setIsCategoryModalVisible(false);
        setCategoryForm({ name: '', description: '', image: '' });
        setEditingCategory(null);
        fetchData();
      } else {
        Alert.alert('Error', response.message || 'Operation failed.');
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert('API Error', error.message || 'Something went wrong.');
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    const catId = cat._id || cat.id;
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              const companyId = routeData?.company?._id || routeData?.company?.id;
              const response = await deleteCategory(catId, companyId, token);
              if (response && response.success) {
                Alert.alert('Success', 'Category deleted successfully!');
                fetchData();
              } else {
                Alert.alert('Error', response.message || 'Unable to delete category.');
                setIsLoading(false);
              }
            } catch (error) {
              Alert.alert('API Error', error.message || 'Something went wrong.');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateOrUpdateSubcategory = async () => {
    if (!subcategoryForm.name || !subcategoryForm.categoryId) {
      Alert.alert('Validation Error', 'Subcategory Name and Parent Category are required.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      let response;
      const companyId = routeData?.company?._id || routeData?.company?.id;

      const payload = {
        ...subcategoryForm,
        categoryId: subcategoryForm.categoryId?._id || subcategoryForm.categoryId?.id || subcategoryForm.categoryId
      };
      if (!payload.image) delete payload.image;
      if (!payload.description) delete payload.description;

      if (editingSubCategory) {
        response = await updateSubCategory(editingSubCategory._id || editingSubCategory.id, companyId, payload, token);
      } else {
        response = await createSubCategory(payload, token);
      }

      if (response && response.success) {
        setSuccessMessage(editingSubCategory ? 'SubCategory updated successfully!' : 'SubCategory created successfully!');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2500);

        setIsSubCategoryModalVisible(false);
        setSubcategoryForm({ categoryId: '', name: '', description: '', image: '' });
        setEditingSubCategory(null);
        fetchData();
      } else {
        Alert.alert('Error', response.message || 'Operation failed.');
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert('API Error', error.message || 'Something went wrong.');
      setIsLoading(false);
    }
  };

  const handleDeleteSubcategory = (sub) => {
    const subId = sub._id || sub.id;
    Alert.alert(
      'Delete SubCategory',
      `Are you sure you want to delete "${sub.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              const companyId = routeData?.company?._id || routeData?.company?.id;
              const response = await deleteSubCategory(subId, companyId, token);
              if (response && response.success) {
                setSuccessMessage('SubCategory deleted successfully!');
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 2500);
                fetchData();
              } else {
                Alert.alert('Error', response.message || 'Unable to delete subcategory.');
                setIsLoading(false);
              }
            } catch (error) {
              Alert.alert('API Error', error.message || 'Something went wrong.');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleExpand = (catId) => {
    setExpandedCategoryId(expandedCategoryId === catId ? null : catId);
  };

  const getSubcategoriesForCategory = (catId) => {
    const seen = new Set();
    return subcategories.filter(sub => {
      const subId = sub._id || sub.id;
      if (!subId || seen.has(String(subId))) {
        return false;
      }
      seen.add(String(subId));

      const subCatId = sub.categoryId?._id || sub.categoryId?.id || sub.categoryId;
      return String(subCatId) === String(catId);
    });
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      image: cat.image || '',
    });
    setIsCategoryModalVisible(true);
  };

  const openAddSubcategory = (catId) => {
    setEditingSubCategory(null);
    setSubcategoryForm({
      categoryId: catId,
      name: '',
      description: '',
      image: '',
    });
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Category Console</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIconSymbol}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading && categories.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loaderText}>Fetching categories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏷️</Text>
              <Text style={styles.emptyTitle}>No Categories Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search keywords.' : 'Add your first category using the button in the bottom right.'}
              </Text>
            </View>
          }
          renderItem={({ item: cat }) => {
            const catId = cat._id || cat.id;
            const isExpanded = expandedCategoryId === catId;
            const catSubs = getSubcategoriesForCategory(catId);
            const isActive = (cat.status || 'active').toLowerCase() === 'active';
            const catTheme = getCategoryTheme(cat.name);

            return (
              <View style={styles.card}>
                {/* ── CATEGORY HEADER ── */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.85}
                  onPress={() => toggleExpand(catId)}
                >
                  {/* Colored left accent bar */}
                  <View style={[styles.categoryAccentBar, { backgroundColor: catTheme.primary }]} />

                  <SafeImage
                    uri={cat.image}
                    fallbackUri="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d"
                    style={styles.categoryImage}
                  />

                  <View style={styles.categoryMeta}>
                    <View style={styles.titleRow}>
                      <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                        <Text style={[styles.statusBadgeText, { color: isActive ? '#16A34A' : '#EF4444' }]}>
                          {isActive ? '● active' : '● inactive'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.categoryDesc} numberOfLines={2}>
                      {cat.description || 'No description provided.'}
                    </Text>
                    <View style={styles.subCountRow}>
                      <View style={[styles.subCountBadgeHighlight, { backgroundColor: catTheme.primary }]}>
                        <Text style={styles.subCountBadgeHighlightText}>
                          📂 {catSubs.length} {catSubs.length === 1 ? 'Subcategory' : 'Subcategories'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.accordionArrow, isExpanded && { color: catTheme.primary }]}>
                    {isExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>

                {/* ── EXPANDED AREA ── */}
                {isExpanded && (
                  <View style={[styles.cardExpandedArea, { borderTopColor: catTheme.primary + '20' }]}>

                    {/* Category actions with dynamic styling */}
                    <View style={styles.catActionsRow}>
                      <TouchableOpacity
                        style={[styles.catActionBtn, { backgroundColor: catTheme.accentBg, borderColor: catTheme.primary + '20' }]}
                        onPress={() => openEditCategory(cat)}
                      >
                        <Text style={styles.catActionIcon}>✏️</Text>
                        <Text style={[styles.catActionLabel, { color: catTheme.primary }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.catActionBtn, { backgroundColor: '#FFF5F5', borderColor: '#FECACA' }]}
                        onPress={() => handleDeleteCategory(cat)}
                      >
                        <Text style={styles.catActionIcon}>🗑️</Text>
                        <Text style={[styles.catActionLabel, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.catActionBtn, { backgroundColor: catTheme.primary, borderColor: catTheme.primary }]}
                        onPress={() => openAddSubcategory(catId)}
                      >
                        <Text style={[styles.catActionIcon, { color: '#FFFFFF' }]}>➕</Text>
                        <Text style={[styles.catActionLabel, { color: '#FFFFFF' }]}>Add Sub</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Subcategories section header */}
                    <View style={styles.subSectionHeader}>
                      <View style={[styles.subSectionAccent, { backgroundColor: catTheme.primary }]} />
                      <Text style={styles.sectionHeaderTitle}>Subcategories</Text>
                      <Text style={[styles.subSectionCount, { backgroundColor: catTheme.primary }]}>{catSubs.length}</Text>
                    </View>

                    {catSubs.length === 0 ? (
                      <View style={styles.noSubsBox}>
                        <Text style={styles.noSubsEmoji}>📂</Text>
                        <Text style={styles.noSubsText}>No subcategories yet</Text>
                        <Text style={styles.noSubsHint}>Tap "Add Sub" above to create one</Text>
                      </View>
                    ) : (
                      <View style={[styles.subListContainer, { borderLeftColor: catTheme.primary + '30' }]}>
                        {catSubs.map((sub) => {
                          const subId = sub._id || sub.id;
                          const subImage = sub.image || sub.subCategoryImage || null;
                          const subName = sub.name || sub.subCategoryName || '—';
                          const subDesc = sub.description || sub.subCategoryDescription || '';
                          return (
                            <View key={subId} style={[styles.subItemCard, { borderColor: catTheme.primary + '18' }]}>
                              {/* Parent-linked left accent for subcategory */}
                              <View style={[styles.subAccentBar, { backgroundColor: catTheme.primary }]} />

                              <View style={styles.subItemBody}>
                                <SafeImage
                                  uri={subImage}
                                  fallbackUri="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d"
                                  style={styles.subItemImage}
                                />
                                <View style={styles.subItemInfo}>
                                  <Text style={[styles.subItemLabel, { color: catTheme.primary }]}>SUBCATEGORY</Text>
                                  <Text style={styles.subItemName}>
                                    <Text style={{ color: catTheme.primary, fontWeight: '900' }}>↳ </Text>
                                    {subName}
                                  </Text>
                                  {!!subDesc && (
                                    <Text style={styles.subItemDesc} numberOfLines={2}>{subDesc}</Text>
                                  )}
                                </View>
                              </View>

                              <View style={[styles.subItemActions, { borderTopColor: catTheme.primary + '15', backgroundColor: catTheme.accentBg + '40' }]}>
                                <TouchableOpacity
                                  style={[styles.subActionBtn, { borderRightColor: catTheme.primary + '15' }]}
                                  onPress={() => openEditSubcategory(sub)}
                                >
                                  <Text style={[styles.subActionBtnText, { color: '#475569' }]}>✏️ Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.subActionBtn, { borderRightColor: catTheme.primary + '15' }]}
                                  onPress={() => handleDeleteSubcategory(sub)}
                                >
                                  <Text style={[styles.subActionBtnText, { color: '#EF4444' }]}>🗑️ Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.subActionBtn, { backgroundColor: catTheme.primary + '15', borderRightWidth: 0 }]}
                                  onPress={() => navigateToAddProduct(cat, sub)}
                                >
                                  <Text style={[styles.subActionBtnText, { color: catTheme.badgeText }]}>+ Product</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Sticky Floating Action Button in Footer (Bottom Right) */}
      <TouchableOpacity
        style={[styles.stickyFab, { backgroundColor: themeColor }]}
        onPress={() => {
          setEditingCategory(null);
          setCategoryForm({ name: '', description: '', image: '' });
          setIsCategoryModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.stickyFabIcon}>+</Text>
      </TouchableOpacity>

      {/* CATEGORY MODAL */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.modalLabel}>Category Name*</Text>
              <TextInput
                style={styles.modalInput}
                value={categoryForm.name}
                onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
                placeholder="e.g. Grains, Textiles"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Category Image Source</Text>
              <TouchableOpacity
                style={styles.imageSelectorBox}
                activeOpacity={0.8}
                onPress={() => handleImagePick('category')}
              >
                {categoryForm.image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: categoryForm.image }} style={styles.imagePreview} />
                    <View style={styles.changeOverlay}>
                      <Text style={styles.changeOverlayText}>Change Image</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholderContainer}>
                    <Text style={styles.imagePlaceholderIcon}>📸</Text>
                    <Text style={styles.imagePlaceholderText}>Tap to Capture or Upload Image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 64, textAlignVertical: 'top', paddingTop: 8 }]}
                value={categoryForm.description}
                onChangeText={(text) => setCategoryForm({ ...categoryForm, description: text })}
                placeholder="Brief category context..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setIsCategoryModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColor }]}
                onPress={handleCreateOrUpdateCategory}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUBCATEGORY MODAL */}
      <Modal
        visible={isSubCategoryModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingSubCategory ? 'Update Subcategory' : 'Create Subcategory'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.modalLabel}>Subcategory Name*</Text>
              <TextInput
                style={styles.modalInput}
                value={subcategoryForm.name}
                onChangeText={(text) => setSubcategoryForm({ ...subcategoryForm, name: text })}
                placeholder="e.g. Dal Products, Fabric Rolls"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Subcategory Image Source</Text>
              <TouchableOpacity
                style={styles.imageSelectorBox}
                activeOpacity={0.8}
                onPress={() => handleImagePick('subcategory')}
              >
                {subcategoryForm.image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: subcategoryForm.image }} style={styles.imagePreview} />
                    <View style={styles.changeOverlay}>
                      <Text style={styles.changeOverlayText}>Change Image</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholderContainer}>
                    <Text style={styles.imagePlaceholderIcon}>📸</Text>
                    <Text style={styles.imagePlaceholderText}>Tap to Capture or Upload Image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 64, textAlignVertical: 'top', paddingTop: 8 }]}
                value={subcategoryForm.description}
                onChangeText={(text) => setSubcategoryForm({ ...subcategoryForm, description: text })}
                placeholder="Brief subcategory details..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setIsSubCategoryModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColor }]}
                onPress={handleCreateOrUpdateSubcategory}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{editingSubCategory ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attractive Auto-Closing Success Popup with Checkmark Icon */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', shadowColor: '#10B981', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 12, borderWidth: 1, borderColor: '#ECFDF5' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#A7F3D0', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}>
              <Text style={{ fontSize: 34, color: '#10B981', fontWeight: '900' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 }}>Success!</Text>
            <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', fontWeight: '600', lineHeight: 20 }}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  addButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#3170cdff',
    fontWeight: '800',
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 42,
  },
  searchIconSymbol: {
    fontSize: 14,
    color: '#94A3B8',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchIcon: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    backgroundColor: '#FFFFFF',
  },
  categoryAccentBar: {
    width: 4,
    height: 56,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  categoryMeta: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  categoryName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryDesc: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 4,
  },
  subCountRow: {
    flexDirection: 'row',
  },
  subCountBadge: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  subCountBadgeHighlight: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 4,
  },
  subCountBadgeHighlightText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  accordionArrow: {
    color: '#94A3B8',
    fontSize: 11,
    paddingLeft: 8,
    fontWeight: '700',
  },
  cardExpandedArea: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    backgroundColor: '#F8F9FF',
  },
  catActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  catActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  catActionIcon: {
    fontSize: 13,
  },
  catActionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    marginVertical: 10,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subSectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subSectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  noSubsBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  noSubsEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  noSubsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  noSubsHint: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  subListContainer: {
    paddingLeft: 12,
    borderLeftWidth: 1.5,
    borderLeftColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginLeft: 14,
    gap: 10,
    marginVertical: 4,
  },
  subItemCard: {
    backgroundColor: '#FAFAFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E4FF',
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  subAccentBar: {
    width: 3,
    backgroundColor: '#7C3AED',
    alignSelf: 'stretch',
    minHeight: 60,
  },
  subItemBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingLeft: 10,
  },
  subItemImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  subItemInfo: {
    flex: 1,
  },
  subItemLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  subItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 1,
  },
  subItemDesc: {
    fontSize: 10,
    color: '#6D6D9B',
    lineHeight: 14,
  },
  subItemActions: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#EDE9FE',
    backgroundColor: '#F5F3FF',
  },
  subActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#EDE9FE',
    borderWidth: 0,
  },
  subActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1E293B',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 14,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 28,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  imageSelectorBox: {
    height: 120,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  imagePlaceholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  changeOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stickyFab: {
    position: 'absolute',
    right: 24,
    bottom: 70,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  stickyFabIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
});

export default CategoryPage;
