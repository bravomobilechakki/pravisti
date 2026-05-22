import React, { useState, useEffect } from 'react';
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

const CategoryManager = ({ onNavigate, routeData }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  // Modals visibility
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSubCategoryModalVisible, setIsSubCategoryModalVisible] = useState(false);
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

  const themeColor = '#4F46E5';

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
        Alert.alert('Error', response.errorMessage || 'Failed to pick image');
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = routeData?.company?._id || routeData?.company?.id;
      const catRes = await getCategories(companyId, token);

      if (catRes && catRes.success) {
        setCategories(catRes.data || []);
      }

      // Gracefully handle subcategories if the endpoint is not fully registered or returns an error
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrUpdateCategory = async () => {
    if (!categoryForm.name) {
      Alert.alert('Validation Error', 'Category Name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      let response;
      if (editingCategory) {
        const companyId = routeData?.company?._id || routeData?.company?.id;
        const payload = { ...categoryForm };
        if (!payload.image) delete payload.image;
        if (!payload.description) delete payload.description;
        response = await updateCategory(editingCategory._id || editingCategory.id, companyId, payload, token);
      } else {
        const payload = { ...categoryForm };
        if (!payload.image) delete payload.image;
        if (!payload.description) delete payload.description;
        response = await createCategory(payload, token);
      }

      if (response && response.success) {
        Alert.alert('Success', editingCategory ? 'Category updated successfully!' : 'Category created successfully!');
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
        Alert.alert('Success', editingSubCategory ? 'SubCategory updated successfully!' : 'SubCategory created successfully!');
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
                Alert.alert('Success', 'SubCategory deleted successfully!');
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
    if (expandedCategoryId === catId) {
      setExpandedCategoryId(null);
    } else {
      setExpandedCategoryId(catId);
    }
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

  return (
    <View style={styles.container}>
      {/* Visual Title Header inside Tab */}
      <View style={styles.tabHeader}>
        <View>
          <Text style={styles.tabTitle}>Product Categories</Text>
          <Text style={styles.tabSub}>{categories.length} Categories Registered</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingCategory(null);
            setCategoryForm({ name: '', description: '', image: '' });
            setIsCategoryModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Category</Text>
        </TouchableOpacity>
      </View>

      {isLoading && categories.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={themeColor} />
          <Text style={styles.loaderText}>Loading categories...</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏷️</Text>
              <Text style={styles.emptyTitle}>No Categories Registered</Text>
              <Text style={styles.emptySubtitle}>Tap the '+ Category' button above to initialize the first category.</Text>
            </View>
          ) : (
            categories.map((cat) => {
              const catId = cat._id || cat.id;
              const isExpanded = expandedCategoryId === catId;
              const catSubs = getSubcategoriesForCategory(catId);

              return (
                <View key={catId} style={styles.card}>
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
      )}

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

            <View style={{ marginBottom: 12 }}>
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
            </View>

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

            <View style={{ marginBottom: 12 }}>
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
            </View>

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
    </View>
  );
};

export default CategoryManager;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: '850',
    color: '#0F172A',
  },
  tabSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  listContainer: {
    marginTop: 4,
  },
  loaderContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
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
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  subCount: {
    color: '#475569',
    fontSize: 9,
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
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  noSubsText: {
    fontSize: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    color: '#1E293B',
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  imageSelectorBox: {
    height: 100,
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
    fontSize: 10,
    fontWeight: '700',
  },
  imagePlaceholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  imagePlaceholderIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  imagePlaceholderText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
});
