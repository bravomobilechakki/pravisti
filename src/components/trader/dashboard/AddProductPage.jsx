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
  ArrowLeft,
  Plus,
  Tag,
  ChevronDown,
  Edit3,
  Trash2,
  Handshake,
  Camera,
  Check,
  X,
  Search,
} from 'lucide-react-native';
import {
  getCategories,
  getSubCategories,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getUnits,
} from '../../../services/api';

let DYNAMIC_UNIT_MAPPING = {
  'bale': '6a0c118913e627687603da11',
  'ton': '6a0c118913e627687603da12',
  'quintal': '6a0c118913e627687603da13',
  'kg': '6a0eac4cd59663585920f09c',
  'kilogram': '6a0eac4cd59663585920f09c',
  'litre': '6a0c118913e627687603da15',
  'meter': '6a0c118913e627687603da16',
  'candy': '6a0c118913e627687603da17',
  'piece': '6a0c118913e627687603da18',
};

const getUnitId = (unitName) => {
  const norm = String(unitName || 'bale').toLowerCase().trim();
  return DYNAMIC_UNIT_MAPPING[norm] || '6a0c118913e627687603da11';
};

const getUnitName = (unitId) => {
  if (!unitId) return 'Bale';
  if (typeof unitId === 'object') {
    return unitId.shortName || unitId.name || 'Bale';
  }
  const entry = Object.entries(DYNAMIC_UNIT_MAPPING).find(([_, id]) => id === unitId);
  return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : 'Bale';
};

const getProductUnitText = (prod) => {
  if (!prod) return 'Bale';
  if (prod.unit) return prod.unit;
  if (prod.unitId && typeof prod.unitId === 'object') {
    return prod.unitId.shortName || prod.unitId.name || 'Bale';
  }
  return getUnitName(prod.unitId);
};

const AddProductPage = ({ onNavigate, routeData }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Visibility
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [isSubcategoryPickerVisible, setIsSubcategoryPickerVisible] = useState(false);
  const [isUnitPickerVisible, setIsUnitPickerVisible] = useState(false);
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
    unitId: '',
    image: '',
    description: '',
    hsnCode: '',
    gstCode: '',
    status: 'active',
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
        const companyId = routeData?.company?._id || routeData?.company?.id;
        const subRes = await getSubCategories(companyId, token);
        if (subRes && subRes.success) {
          fetchedSubcategories = subRes.data || [];
          setSubcategories(fetchedSubcategories);
        }
      } catch (subErr) {
        console.warn('Failed to fetch subcategories:', subErr);
      }

      // Load Units
      try {
        const unitRes = await getUnits('active', token);
        if (unitRes && unitRes.success && unitRes.data) {
          const fetchedUnits = unitRes.data || [];
          setUnits(fetchedUnits);
          // Populate dynamic unit mapping
          fetchedUnits.forEach(u => {
            if (u.shortName) {
              DYNAMIC_UNIT_MAPPING[u.shortName.toLowerCase()] = u._id;
            }
            if (u.name) {
              DYNAMIC_UNIT_MAPPING[u.name.toLowerCase()] = u._id;
            }
          });
        }
      } catch (unitErr) {
        console.warn('Failed to fetch units:', unitErr);
      }

      // Load Products
      try {
        const companyId = routeData?.company?._id || routeData?.company?.id;
        const prodRes = await getProducts(companyId, token);
        if (prodRes && prodRes.success) {
          const mapped = (prodRes.data || []).map(p => ({
            ...p,
            unit: getProductUnitText(p),
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
    }
  }, [routeData?.company?._id, routeData?.company?.id]);

  // Auto-open modal if navigated from subcategory '➕ Product'
  useEffect(() => {
    if (routeData?.prefillProduct) {
      setProductForm(prev => ({
        ...prev,
        unit: prev.unit || 'Bale',
        status: prev.status || 'active',
        ...routeData.prefillProduct
      }));
      setIsProductModalVisible(true);
    }
  }, [routeData?.prefillProduct]);

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
          text: 'Take Photo (Camera)',
          onPress: () => launchImagePicker('camera'),
        },
        {
          text: 'Choose from Gallery',
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
      const prodCatId = prod.categoryId?._id || prod.categoryId?.id || prod.categoryId;
      const belongs = String(prodCatId || '') === String(catId);
      const matchesSearch = String(prod.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return belongs && matchesSearch;
    });
  };

  // Open creation modal
  const openAddProduct = () => {
    setEditingProduct(null);
    const defaultUnit = units[0] ? (units[0].shortName || units[0].name) : 'Bale';
    const defaultUnitId = units[0] ? units[0]._id : getUnitId('Bale');
    setProductForm({
      name: '',
      categoryId: categories[0]?._id || '',
      categoryName: categories[0]?.name || '',
      subcategoryId: '',
      subcategoryName: '',
      unit: defaultUnit,
      unitId: defaultUnitId,
      image: '',
      description: '',
      hsnCode: '',
      gstCode: '',
      status: 'active',
    });
    setIsProductModalVisible(true);
  };

  // Open edit modal
  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    const prodCatId = prod.categoryId?._id || prod.categoryId?.id || prod.categoryId;
    const prodSubCatId = prod.subCategoryId?._id || prod.subCategoryId?.id || prod.subCategoryId || prod.subcategoryId?._id || prod.subcategoryId?.id || prod.subcategoryId;
    const cat = categories.find(c => String(c._id) === String(prodCatId));
    const sub = subcategories.find(s => String(s._id) === String(prodSubCatId));

    const unitName = prod.unit || getProductUnitText(prod);
    const unitId = prod.unitId?._id || prod.unitId?.id || prod.unitId || getUnitId(unitName);

    setProductForm({
      name: prod.name,
      categoryId: prodCatId || '',
      categoryName: cat ? cat.name : '',
      subcategoryId: prodSubCatId || '',
      subcategoryName: sub ? sub.name : '',
      unit: unitName,
      unitId: unitId,
      image: prod.image || '',
      description: prod.description || '',
      hsnCode: prod.hsnCode || '',
      gstCode: prod.gstCode || '',
      status: prod.status || 'active',
    });
    setIsProductModalVisible(true);
  };

  // Create or Update Product
  const handleSaveProduct = async () => {
    if (isSaving) return;
    if (!productForm.name || !productForm.categoryId) {
      Alert.alert('Validation Error', 'Product Name and Category are required.');
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = routeData?.company?._id || routeData?.company?.id;

      const payload = {
        name: productForm.name,
        categoryId: productForm.categoryId,
        unitId: productForm.unitId || getUnitId(productForm.unit),
      };

      if (!editingProduct) {
        payload.companyId = companyId;
      }

      if (productForm.subcategoryId) payload.subCategoryId = productForm.subcategoryId;
      if (productForm.image) payload.image = productForm.image;
      if (productForm.description) payload.description = productForm.description;
      if (productForm.hsnCode) payload.hsnCode = productForm.hsnCode;
      if (productForm.gstCode) payload.gstCode = productForm.gstCode;
      if (editingProduct) payload.status = productForm.status;

      let response;
      if (editingProduct) {
        response = await updateProduct(editingProduct._id || editingProduct.id, companyId, payload, token);
      } else {
        response = await createProduct(payload, token);
      }

      if (response && response.success) {
        setSuccessMessage(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');

        // Close the form modal first to avoid native modal collision
        setIsProductModalVisible(false);

        // Show success modal after slide-down transition completes
        setTimeout(() => {
          setShowSuccessModal(true);
          setTimeout(() => setShowSuccessModal(false), 2200);
        }, 450);

        fetchData();
      } else {
        Alert.alert('Error', response?.message || 'Unable to complete operation.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
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
  const filteredSubcategories = (() => {
    const seen = new Set();
    return subcategories.filter(sub => {
      const subId = sub._id || sub.id;
      if (!subId || seen.has(String(subId))) {
        return false;
      }
      seen.add(String(subId));
      const subCatId = sub.categoryId?._id || sub.categoryId?.id || sub.categoryId;
      return String(subCatId) === String(productForm.categoryId);
    });
  })();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trading Inventory</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name..."
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Tag size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySubtitle}>
                You haven't added any products yet, or none match your search.
              </Text>
            </View>
          }
          renderItem={({ item: prod }) => {
            const prodCatId = prod.categoryId?._id || prod.categoryId?.id || prod.categoryId;
            const prodSubCatId = prod.subCategoryId?._id || prod.subCategoryId?.id || prod.subCategoryId || prod.subcategoryId?._id || prod.subcategoryId?.id || prod.subcategoryId;
            const cat = categories.find(c => String(c._id) === String(prodCatId));
            const sub = subcategories.find(s => String(s._id) === String(prodSubCatId));
            const categoryName = cat ? cat.name : 'Uncategorized';
            const subName = sub ? sub.name : '';

            return (
              <View style={styles.productCard}>
                {/* Compact Floating Trading Unit Badge */}
                <View style={styles.unitBadgeCompact}>
                  <Text style={styles.unitBadgeTextCompact}>{prod.unit || 'Bale'}</Text>
                </View>

                {/* Product Image & Main Info */}
                <View style={styles.productCardHeader}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: prod.image || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d' }}
                      style={styles.productImageLarge}
                      resizeMode="cover"
                    />
                    <View style={[
                      styles.imageStatusIndicator,
                      { backgroundColor: prod.status === 'active' ? '#10B981' : '#64748B' }
                    ]} />
                  </View>

                  <View style={styles.productMainDetails}>
                    <Text style={styles.productTitle} numberOfLines={1}>{prod.name}</Text>

                    <View style={styles.badgeRow}>
                      <View style={[styles.categoryBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Tag size={10} color="#4F46E5" />
                        <Text style={styles.categoryBadgeText}>{categoryName}</Text>
                      </View>
                      {subName ? (
                        <View style={styles.subcategoryBadge}>
                          <Text style={styles.subcategoryBadgeText}>↳ {subName}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Metadata Badges: HSN & GST */}
                    <View style={[styles.badgeRow, { marginTop: 2 }]}>
                      {prod.hsnCode ? (
                        <View style={styles.hsnBadge}>
                          <Text style={styles.hsnText}>
                            HSN: {prod.hsnCode}
                          </Text>
                        </View>
                      ) : null}

                      {prod.gstCode ? (
                        <View style={styles.gstBadge}>
                          <Text style={styles.gstText}>
                            GST: {prod.gstCode}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <Text style={styles.productDescriptionText} numberOfLines={2}>
                  {prod.description || 'No description provided.'}
                </Text>

                {/* Action Buttons */}
                <View style={styles.productCardActions}>
                  <TouchableOpacity
                    style={styles.actionBtnEdit}
                    onPress={() => openEditProduct(prod)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={15} color="#475569" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnDelete}
                    onPress={() => handleDeleteProduct(prod)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={15} color="#EF4444" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnSauda}
                    onPress={() => handleInitiateSauda(prod)}
                    activeOpacity={0.8}
                  >
                    <Handshake size={15} color="#FFFFFF" />
                    <Text style={styles.actionTextSauda}>Start Sauda</Text>
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
                <ChevronDown size={14} color="#94A3B8" />
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Subcategory (Optional)</Text>
              <TouchableOpacity
                style={styles.modalSelector}
                onPress={() => setIsSubcategoryPickerVisible(true)}
              >
                <Text style={styles.modalSelectorText}>
                  {productForm.subcategoryName || 'Select a Subcategory'}
                </Text>
                <ChevronDown size={14} color="#94A3B8" />
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Trading Unit*</Text>
              <TouchableOpacity
                style={styles.modalSelector}
                onPress={() => setIsUnitPickerVisible(true)}
              >
                <Text style={styles.modalSelectorText}>
                  {productForm.unit || 'Select Trading Unit'}
                </Text>
                <ChevronDown size={14} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.twoColumnRow}>
                <View style={styles.flexHalf}>
                  <Text style={styles.modalLabel}>HSN Code</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={productForm.hsnCode}
                    onChangeText={(text) => setProductForm({ ...productForm, hsnCode: text })}
                    placeholder="e.g. 73181510"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.flexHalf, { marginLeft: 12 }]}>
                  <Text style={styles.modalLabel}>GST Code</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={productForm.gstCode}
                    onChangeText={(text) => setProductForm({ ...productForm, gstCode: text })}
                    placeholder="e.g. GST_12"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>Product Status</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                {[
                  { key: 'active', label: 'Active', activeBg: '#ECFDF5', activeText: '#10B981', icon: Check },
                  { key: 'inactive', label: 'Inactive', activeBg: '#FEF2F2', activeText: '#EF4444', icon: X }
                ].map(s => {
                  const isSelected = productForm.status === s.key;
                  const IconComponent = s.icon;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isSelected ? s.activeText : '#E2E8F0',
                        backgroundColor: isSelected ? s.activeBg : '#F8FAFC',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6
                      }}
                      onPress={() => setProductForm({ ...productForm, status: s.key })}
                    >
                      {isSelected && <IconComponent size={14} color={s.activeText} />}
                      <Text style={{
                        color: isSelected ? s.activeText : '#64748B',
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
                    <Camera size={22} color="#64748B" style={{ marginBottom: 4 }} />
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
                style={[styles.modalButton, { backgroundColor: isSaving ? '#94A3B8' : themeColor }]}
                onPress={handleSaveProduct}
                disabled={isSaving}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
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
                    const hasSubs = subcategories.some(sub => {
                      const subCatId = sub.categoryId?._id || sub.categoryId?.id || sub.categoryId;
                      return String(subCatId) === String(item._id || item.id);
                    });
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

      {/* UNIT PICKER MODAL */}
      <Modal
        visible={isUnitPickerVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Trading Unit</Text>
            <FlatList
              data={units.length > 0 ? units : [
                { _id: '6a0c118913e627687603da11', name: 'Bale', shortName: 'Bale' },
                { _id: '6a0c118913e627687603da17', name: 'Candy', shortName: 'Candy' },
                { _id: '6a0c118913e627687603da12', name: 'Ton', shortName: 'Ton' },
                { _id: '6a0c118913e627687603da13', name: 'Quintal', shortName: 'Quintal' },
                { _id: '6a0eac4cd59663585920f09c', name: 'Kilogram', shortName: 'Kg' },
                { _id: '6a0c118913e627687603da15', name: 'Litre', shortName: 'Litre' },
                { _id: '6a0c118913e627687603da16', name: 'Meter', shortName: 'Meter' },
                { _id: '6a0c118913e627687603da18', name: 'Piece', shortName: 'Piece' },
              ]}
              keyExtractor={(item) => item._id || item.name}
              style={{ maxHeight: 250 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setProductForm(prev => ({
                      ...prev,
                      unit: item.shortName || item.name,
                      unitId: item._id,
                    }));
                    setIsUnitPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>
                    {item.name}{item.shortName && item.shortName !== item.name ? ` (${item.shortName})` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalButton, { alignSelf: 'flex-end', marginTop: 12 }]}
              onPress={() => setIsUnitPickerVisible(false)}
            >
              <Text style={{ color: themeColor, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Attractive Auto-Closing Success Popup with Checkmark Icon */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', shadowColor: '#10B981', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 12, borderWidth: 1, borderColor: '#ECFDF5' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#A7F3D0', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 }}>
              <Check size={36} color="#10B981" strokeWidth={3.5} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center', letterSpacing: -0.3 }}>Success!</Text>
            <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', fontWeight: '600', lineHeight: 20 }}>{successMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* FLOATING ACTION PLUS BUTTON (FAB) */}
      <TouchableOpacity
        style={[styles.stickyFab, { backgroundColor: themeColor }]}
        onPress={openAddProduct}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={3} />
      </TouchableOpacity>

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
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  addButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  addButtonText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInput: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Safe padding for FAB
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
    backgroundColor: '#F5F7FF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#4F46E533',
    borderStyle: 'dashed',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  frontAddButtonIcon: {
    fontSize: 26,
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
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  unitBadgeCompact: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 10,
  },
  unitBadgeTextCompact: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 14,
  },
  productImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageStatusIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
    elevation: 1,
  },
  productMainDetails: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 56, // Leave space for unit badge
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.1,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  categoryBadgeText: {
    fontSize: 9,
    color: '#4F46E5',
    fontWeight: '700',
  },
  subcategoryBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  subcategoryBadgeText: {
    fontSize: 9,
    color: '#7C3AED',
    fontWeight: '700',
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusTextActive: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusTextInactive: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  hsnBadge: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hsnText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  gstBadge: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gstText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 2,
  },
  productDescriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  productCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  actionBtnEdit: {
    backgroundColor: '#F1F5F9',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnDelete: {
    backgroundColor: '#FFF5F5',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE3E3',
  },
  actionBtnSauda: {
    backgroundColor: '#4F46E5',
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  actionTextEdit: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '800',
  },
  actionTextDelete: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '800',
  },
  actionTextSauda: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.2,
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
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    color: '#1E293B',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  modalSelector: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
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
    borderRadius: 10,
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
    bottom: 60,
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
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  flexHalf: {
    flex: 1,
  },
});

export default AddProductPage;

