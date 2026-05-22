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

      const payload = { ...subcategoryForm };
      if (companyId) payload.companyId = companyId;
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
    return subcategories.filter(sub => {
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
      categoryId: sub.categoryId,
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
        <View style={{ width: 40 }} /> {/* Spacer to balance Back button */}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.85}
                  onPress={() => toggleExpand(catId)}
                >
                  <SafeImage
                    uri={cat.image}
                    fallbackUri="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d"
                    style={styles.categoryImage}
                  />
                  <View style={styles.categoryMeta}>
                    <View style={styles.titleRow}>
                      <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{cat.status || 'Active'}</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryDesc} numberOfLines={2}>
                      {cat.description || 'No description provided.'}
                    </Text>
                    <Text style={styles.subCount}>🏷️ {catSubs.length} Subcategories</Text>
                  </View>
                  <Text style={styles.accordionArrow}>{isExpanded ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.cardExpandedArea}>
                    {/* Actions row */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}
                        onPress={() => openEditCategory(cat)}
                      >
                        <Text style={[styles.actionBtnText, { color: '#475569' }]}>✏️ Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => handleDeleteCategory(cat)}
                      >
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>🗑️ Delete</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => openAddSubcategory(catId)}
                      >
                        <Text style={[styles.actionBtnText, { color: themeColor }]}>➕ Subcategory</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Subcategories list */}
                    <Text style={styles.sectionHeaderTitle}>Subcategories</Text>
                    {catSubs.length === 0 ? (
                      <Text style={styles.noSubsText}>No subcategories registered yet.</Text>
                    ) : (
                      catSubs.map((sub) => {
                        const subId = sub._id || sub.id;
                        const subImage = sub.image || sub.subCategoryImage || null;
                        const subName = sub.name || sub.subCategoryName || '—';
                        const subDesc = sub.description || sub.subCategoryDescription || '';
                        return (
                          <View key={subId} style={styles.subItemCard}>
                            <View style={styles.subItemHeader}>
                              <SafeImage
                                uri={subImage}
                                fallbackUri="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d"
                                style={styles.subItemImage}
                              />
                              <View style={styles.subItemInfo}>
                                <Text style={styles.subItemName}>{subName}</Text>
                                {!!subDesc && (
                                  <Text style={styles.subItemDesc} numberOfLines={2}>{subDesc}</Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.subItemActions}>
                              <TouchableOpacity
                                style={[styles.subActionBtn, { backgroundColor: '#F1F5F9' }]}
                                onPress={() => openEditSubcategory(sub)}
                              >
                                <Text style={[styles.subActionBtnText, { color: '#475569' }]}>✏️ Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.subActionBtn, { backgroundColor: '#FEE2E2' }]}
                                onPress={() => handleDeleteSubcategory(sub)}
                              >
                                <Text style={[styles.subActionBtnText, { color: '#EF4444' }]}>🗑️ Delete</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.subActionBtn, { backgroundColor: '#EEF2FF' }]}
                                onPress={() => navigateToAddProduct(cat, sub)}
                              >
                                <Text style={[styles.subActionBtnText, { color: themeColor }]}>➕ Product</Text>
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

      {/* Modern Auto-Closing Success Popup */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', shadowColor: '#10B981', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 32 }}>✨</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>Success!</Text>
            <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', fontWeight: '500' }}>{successMessage}</Text>
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
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1E293B',
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
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryImage: {
    width: 54,
    height: 54,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  categoryMeta: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    maxWidth: '75%',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#16A34A',
    fontSize: 8,
    fontWeight: '700',
  },
  categoryDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  subCount: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  accordionArrow: {
    color: '#94A3B8',
    fontSize: 10,
    paddingLeft: 6,
  },
  cardExpandedArea: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FAFCFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: '850',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  noSubsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  subItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  subItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  subItemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  subItemInfo: {
    flex: 1,
  },
  subItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  subItemDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  subItemActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  subActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
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
