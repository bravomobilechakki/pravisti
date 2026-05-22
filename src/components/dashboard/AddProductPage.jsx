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
  getCategories,
  getSubCategories,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/api';

const UNIT_MAPPING = {
  'bale': '6a0c118913e627687603da11',
  'ton': '6a0c118913e627687603da12',
  'quintal': '6a0c118913e627687603da13',
  'kg': '6a0c118913e627687603da14',
  'litre': '6a0c118913e627687603da15',
  'meter': '6a0c118913e627687603da16',
};

const getUnitId = (unitName) => {
  const norm = String(unitName || 'bale').toLowerCase().trim();
  return UNIT_MAPPING[norm] || '6a0c118913e627687603da17';
};

const getUnitName = (unitId) => {
  const entry = Object.entries(UNIT_MAPPING).find(([_, id]) => id === unitId);
  return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : 'Bale';
};

const AddProductPage = ({ onNavigate, routeData }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Visibility
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [isSubcategoryPickerVisible, setIsSubcategoryPickerVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Edit State
  const [editingProduct, setEditingProduct] = useState(null); // null means creating

  // Form State
  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    categoryName: '',
    subcategoryId: '',
    subcategoryName: '',
    unit: '',
    image: '',
    description: '',
  });

  const themeColor = '#4F46E5';

  // Fetch Category and Product Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      // Load Categories
      let fetchedCategories = [];
      try {
        const companyId = routeData?.company?._id || routeData?.company?.id;
        const catRes = await getCategories(companyId, token);
        if (catRes && catRes.success) {
          fetchedCategories = catRes.data || [];
          setCategories(fetchedCategories);
        }
      } catch (catErr) {
        console.warn('Failed to fetch categories:', catErr);
      }

      // Load Subcategories
      let fetchedSubcategories = [];
      try {
        const subRes = await getSubCategories(token);
        if (subRes && subRes.success) {
          fetchedSubcategories = subRes.data || [];
          setSubcategories(fetchedSubcategories);
        }
      } catch (subErr) {
        console.warn('Failed to fetch subcategories:', subErr);
      }

      // Load Products
      try {
        const companyId = routeData?.company?._id || routeData?.company?.id;
        const prodRes = await getProducts(companyId, token);
        if (prodRes && prodRes.success) {
          const mapped = (prodRes.data || []).map(p => ({
            ...p,
            unit: p.unit || getUnitName(p.unitId),
            price: p.price || 0,
          }));
          setProducts(mapped);
        } else {
          setProducts([]);
        }
      } catch (prodErr) {
        console.warn('Failed to fetch products:', prodErr);
        setProducts([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Unable to fetch categories or products.');
    } finally {
      setIsLoading(false);
      // Auto-open modal if navigated from subcategory '➕ Product'
      if (routeData?.prefillProduct && !isProductModalVisible) {
        setProductForm(prev => ({
          ...prev,
          ...routeData.prefillProduct
        }));
        setIsProductModalVisible(true);
      }
    }
  }, [routeData?.prefillProduct, isProductModalVisible]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Image Selection
  const handleImagePick = () => {
    Alert.alert(
      'Select Image Source',
      'Choose how you would like to select your product image:',
      [
        {
          text: '📸 Take Photo (Camera)',
          onPress: () => launchImagePicker('camera'),
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: () => launchImagePicker('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const launchImagePicker = (sourceType) => {
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
        setProductForm(prev => ({ ...prev, image: selectedUri }));
      }
    };

    if (sourceType === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  // Get Products for a Specific Category
  const getProductsForCategory = (catId) => {
    return products.filter(prod => {
      const belongs = String(prod.categoryId || '') === String(catId);
      const matchesSearch = String(prod.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return belongs && matchesSearch;
    });
  };

  // Open creation modal
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      categoryId: categories[0]?._id || '',
      categoryName: categories[0]?.name || '',
      subcategoryId: '',
      subcategoryName: '',
      unit: 'Bale',
      image: '',
      description: '',
    });
    setIsProductModalVisible(true);
  };

  // Open edit modal
  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    const cat = categories.find(c => String(c._id) === String(prod.categoryId));
    const sub = subcategories.find(s => String(s._id) === String(prod.subcategoryId));

    setProductForm({
      name: prod.name,
      categoryId: prod.categoryId || '',
      categoryName: cat ? cat.name : '',
      subcategoryId: prod.subcategoryId || '',
      subcategoryName: sub ? sub.name : '',
      unit: prod.unit || 'Bale',
      image: prod.image || '',
      description: prod.description || '',
    });
    setIsProductModalVisible(true);
  };

  // Create or Update Product
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.categoryId) {
      Alert.alert('Validation Error', 'Product Name and Category are required.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = routeData?.company?._id || routeData?.company?.id;

      const payload = {
        name: productForm.name,
        categoryId: productForm.categoryId,
        unitId: getUnitId(productForm.unit),
        companyId: companyId,
      };

      if (productForm.subcategoryId) payload.subCategoryId = productForm.subcategoryId;
      if (productForm.image) payload.image = productForm.image;
      if (productForm.description) payload.description = productForm.description;

      let response;
      if (editingProduct) {
        response = await updateProduct(editingProduct._id || editingProduct.id, companyId, payload, token);
      } else {
        response = await createProduct(payload, token);
      }

      if (response && response.success) {
        setSuccessMessage(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2500);

        setIsProductModalVisible(false);
        fetchData();
      } else {
        Alert.alert('Error', response?.message || 'Unable to complete operation.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = (prod) => {
    const prodId = prod._id || prod.id;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${prod.name}"?`,
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
              const response = await deleteProduct(prodId, companyId, token);

              if (response && response.success) {
                setSuccessMessage('Product deleted successfully!');
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 2500);
                fetchData();
              } else {
                Alert.alert('Error', response?.message || 'Unable to delete product.');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Something went wrong.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Navigate to Sauda Creation Screen pre-filled
  const handleInitiateSauda = (prod) => {
    onNavigate('CreateDeal', {
      prefill: {
        product: prod.name,
        price: '',
        description: prod.description || '',
      },
      originCompany: routeData?.company
    });
  };

  // Get matching subcategories based on chosen category
  const filteredSubcategories = subcategories.filter(sub =>
    String(sub.categoryId) === String(productForm.categoryId)
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trading Inventory</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddProduct}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Product</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search products by name..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loaderText}>Loading Products...</Text>
        </View>
      ) : (
        <FlatList
          data={products.filter(p => String(p.name || '').toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.frontAddButton}
              activeOpacity={0.85}
              onPress={openAddProduct}
            >
              <Text style={styles.frontAddButtonIcon}>➕</Text>
              <View>
                <Text style={styles.frontAddButtonTitle}>Add New Product</Text>
                <Text style={styles.frontAddButtonSubtitle}>Create a new product to start trading</Text>
              </View>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySubtitle}>
                You haven't added any products yet, or none match your search.
              </Text>
            </View>
          }
          renderItem={({ item: prod }) => {
            const cat = categories.find(c => String(c._id) === String(prod.categoryId));
            const sub = subcategories.find(s => String(s._id) === String(prod.subcategoryId));
            const categoryName = cat ? cat.name : 'Uncategorized';
            const subName = sub ? sub.name : '';

            return (
              <View style={styles.productCard}>
                {/* Product Image & Main Info */}
                <View style={styles.productCardHeader}>
                  <Image
                    source={{ uri: prod.image || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d' }}
                    style={styles.productImageLarge}
                    resizeMode="cover"
                  />
                  <View style={styles.productMainDetails}>
                    <Text style={styles.productTitle} numberOfLines={1}>{prod.name}</Text>

                    <View style={styles.badgeRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>🏷️ {categoryName}</Text>
                      </View>
                      {subName ? (
                        <View style={[styles.categoryBadge, { backgroundColor: '#F3E8FF' }]}>
                          <Text style={[styles.categoryBadgeText, { color: '#7E22CE' }]}>↳ {subName}</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.productPrice}>Trading Unit: {prod.unit || 'Bale'}</Text>
                  </View>
                </View>

                <Text style={styles.productDescriptionText} numberOfLines={2}>
                  {prod.description || 'No description provided.'}
                </Text>

                {/* Action Buttons */}
                <View style={styles.productCardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F8FAFC', flex: 1, marginRight: 8 }]}
                    onPress={() => openEditProduct(prod)}
                  >
                    <Text style={{ fontSize: 13, color: '#475569', fontWeight: '700' }}>✏️ Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FEE2E2', flex: 1, marginRight: 8 }]}
                    onPress={() => handleDeleteProduct(prod)}
                  >
                    <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '700' }}>🗑️ Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeColor, flex: 1.2 }]}
                    onPress={() => handleInitiateSauda(prod)}
                  >
                    <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '800' }}>🤝 Sauda</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* PRODUCT FORM MODAL */}
      <Modal
        visible={isProductModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.modalLabel}>Product Name*</Text>
              <TextInput
                style={styles.modalInput}
                value={productForm.name}
                onChangeText={(text) => setProductForm({ ...productForm, name: text })}
                placeholder="e.g. Medium Staple Cotton"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.modalLabel}>Category*</Text>
              <TouchableOpacity
                style={styles.modalSelector}
                onPress={() => setIsCategoryPickerVisible(true)}
              >
                <Text style={styles.modalSelectorText}>
                  {productForm.categoryName || 'Select a Category'}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Subcategory (Optional)</Text>
              <TouchableOpacity
                style={styles.modalSelector}
                onPress={() => setIsSubcategoryPickerVisible(true)}
              >
                <Text style={styles.modalSelectorText}>
                  {productForm.subcategoryName || 'Select a Subcategory'}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Trading Unit*</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {['Bale', 'Candy', 'Ton', 'Quintal'].map(u => (
                  <TouchableOpacity
                    key={u}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: productForm.unit === u ? themeColor : '#CBD5E1',
                      backgroundColor: productForm.unit === u ? '#EEF2FF' : '#F8FAFC',
                    }}
                    onPress={() => setProductForm({ ...productForm, unit: u })}
                  >
                    <Text style={{
                      color: productForm.unit === u ? themeColor : '#64748B',
                      fontWeight: productForm.unit === u ? '700' : '500'
                    }}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Product Image Source</Text>
              <TouchableOpacity
                style={styles.imageSelectorBox}
                activeOpacity={0.8}
                onPress={handleImagePick}
              >
                {productForm.image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: productForm.image }} style={styles.imagePreview} />
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
                value={productForm.description}
                onChangeText={(text) => setProductForm({ ...productForm, description: text })}
                placeholder="Product specifications, grades..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setIsProductModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColor }]}
                onPress={handleSaveProduct}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CATEGORY PICKER MODAL */}
      <Modal
        visible={isCategoryPickerVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item._id || item.id}
              style={{ maxHeight: 250 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setProductForm(prev => ({
                      ...prev,
                      categoryId: item._id || item.id,
                      categoryName: item.name,
                      // Clear subcategory if category changes
                      subcategoryId: '',
                      subcategoryName: '',
                    }));
                    setIsCategoryPickerVisible(false);

                    // Smart feature: Auto-open Subcategory picker if subcategories exist for this category!
                    const hasSubs = subcategories.some(sub => String(sub.categoryId) === String(item._id || item.id));
                    if (hasSubs) {
                      setTimeout(() => setIsSubcategoryPickerVisible(true), 350);
                    }
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalButton, { alignSelf: 'flex-end', marginTop: 12 }]}
              onPress={() => setIsCategoryPickerVisible(false)}
            >
              <Text style={{ color: themeColor, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUBCATEGORY PICKER MODAL */}
      <Modal
        visible={isSubcategoryPickerVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Subcategory</Text>
            <FlatList
              data={filteredSubcategories}
              keyExtractor={(item) => item._id || item.id}
              style={{ maxHeight: 250 }}
              ListEmptyComponent={
                <Text style={styles.noSubsText}>No subcategories found for selected Category.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setProductForm(prev => ({
                      ...prev,
                      subcategoryId: item._id || item.id,
                      subcategoryName: item.name,
                    }));
                    setIsSubcategoryPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalButton, { alignSelf: 'flex-end', marginTop: 12 }]}
              onPress={() => setIsSubcategoryPickerVisible(false)}
            >
              <Text style={{ color: themeColor, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
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
    color: '#4F46E5',
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
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  frontAddButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderStyle: 'dashed',
  },
  frontAddButtonIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  frontAddButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 4,
  },
  frontAddButtonSubtitle: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 16,
  },
  productMainDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  productDescriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  productCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  modalSelector: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  modalSelectorText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#94A3B8',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginBottom: 4,
  },
  imagePlaceholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  imagePlaceholderText: {
    fontSize: 11,
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
    paddingVertical: 3,
    alignItems: 'center',
  },
  changeOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  stickyFab: {
    position: 'absolute',
    right: 20,
    bottom: 70,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  stickyFabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});

export default AddProductPage;
