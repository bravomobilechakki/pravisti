import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  ArrowLeft,
  Plus,
  Tag,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Camera,
  Check,
  X,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Package,
  CheckCircle2,
  PauseCircle,
  Filter,
  ChevronRight,
  ShoppingBag,
  Info,
  FileText,
  Layers,
} from 'lucide-react-native';
import {
  getCategories,
  getSubCategories,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getUnits,
  uploadService,
  resolveImageUrl,
} from '../../../services/api';

let DYNAMIC_UNIT_MAPPING = {
  bale: '6a0c118913e627687603da11',
  ton: '6a0c118913e627687603da12',
  quintal: '6a0c118913e627687603da13',
  kg: '6a0eac4cd59663585920f09c',
  kilogram: '6a0eac4cd59663585920f09c',
  litre: '6a0c118913e627687603da15',
  meter: '6a0c118913e627687603da16',
  candy: '6a0c118913e627687603da17',
  piece: '6a0c118913e627687603da18',
  bag: '6a0c118913e627687603da19',
  tin: '6a0c118913e627687603da20',
};

const getUnitId = (unitName) => {
  const norm = String(unitName || 'bale').toLowerCase().trim();
  return DYNAMIC_UNIT_MAPPING[norm] || '6a0c118913e627687603da11';
};

const getUnitName = (unitId) => {
  if (!unitId) return 'Bag';
  if (typeof unitId === 'object') {
    return unitId.shortName || unitId.name || 'Bag';
  }
  const entry = Object.entries(DYNAMIC_UNIT_MAPPING).find(([_, id]) => id === unitId);
  return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : 'Bag';
};

const getProductUnitText = (prod) => {
  if (!prod) return 'Bag';
  if (prod.unit) return prod.unit;
  if (prod.unitId && typeof prod.unitId === 'object') {
    return prod.unitId.shortName || prod.unitId.name || 'Bag';
  }
  return getUnitName(prod.unitId);
};



const AddProductPage = ({ onNavigate, routeData }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Search & Filter & Sort state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterStatus, setSelectedFilterStatus] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  const [sortOrder, setSortOrder] = useState('DEFAULT'); // 'DEFAULT' | 'NAME_ASC' | 'PRICE_ASC' | 'PRICE_DESC'

  // Modals
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [isSubcategoryPickerVisible, setIsSubcategoryPickerVisible] = useState(false);
  const [isUnitPickerVisible, setIsUnitPickerVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [actionSheetProduct, setActionSheetProduct] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Editing state
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    categoryName: '',
    subcategoryId: '',
    subcategoryName: '',
    unit: 'Bag',
    unitId: '',
    price: '',
    stock: '',
    image: '',
    description: '',
    hsnCode: '',
    gstCode: '',
    status: 'active',
  });

  // Helper to reliably get companyId with multi-level fallbacks
  const getEffectiveCompanyId = async () => {
    let compId =
      routeData?.company?._id ||
      routeData?.company?.id ||
      routeData?.companyId ||
      (typeof routeData?.company === 'string' ? routeData.company : null);

    if (!compId) {
      try {
        const cachedCompStr = await AsyncStorage.getItem('trader_companies_cache');
        if (cachedCompStr) {
          const parsed = JSON.parse(cachedCompStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            compId = parsed[0]._id || parsed[0].id;
          }
        }
      } catch (e) {}
    }
    return compId;
  };

  // Fetch Category and Product Data
  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = await getEffectiveCompanyId();

      // Load Categories & Subcategories
      let fetchedCategories = [];
      try {
        const catRes = await getCategories(companyId, token);
        if (catRes && catRes.success && Array.isArray(catRes.data)) {
          fetchedCategories = catRes.data;
          setCategories(fetchedCategories);
        }
      } catch (catErr) {
        console.warn('Failed to fetch categories:', catErr);
      }

      // Load Subcategories
      try {
        let allSubs = [];
        const subRes = await getSubCategories(companyId, token);
        if (subRes && subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
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
        setSubcategories(allSubs);
      } catch (subErr) {
        console.warn('Notice loading subcategories:', subErr);
        setSubcategories([]);
      }

      // Load Units
      try {
        const unitRes = await getUnits('active', token);
        if (unitRes && unitRes.success && unitRes.data) {
          const fetchedUnits = unitRes.data || [];
          setUnits(fetchedUnits);
          fetchedUnits.forEach((u) => {
            if (u.shortName) DYNAMIC_UNIT_MAPPING[u.shortName.toLowerCase()] = u._id;
            if (u.name) DYNAMIC_UNIT_MAPPING[u.name.toLowerCase()] = u._id;
          });
        }
      } catch (unitErr) {
        console.warn('Failed to fetch units:', unitErr);
      }

      // Load Products
      try {
        const prodRes = await getProducts(companyId, token);
        if (prodRes && prodRes.success) {
          const mapped = (prodRes.data || []).map((p) => ({
            ...p,
            unit: getProductUnitText(p),
            price: p.price !== undefined ? p.price : 0,
            stock: p.stock !== undefined ? p.stock : (p.quantity !== undefined ? p.quantity : 0),
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
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [routeData?.company?._id, routeData?.company?.id, routeData?.companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle prefillProduct from navigation (e.g. from CategoryPage subcategory click)
  useEffect(() => {
    if (routeData?.prefillProduct) {
      const prefill = routeData.prefillProduct;
      const defaultUnit = units[0] ? units[0].shortName || units[0].name : 'Bag';
      const defaultUnitId = units[0] ? units[0]._id : getUnitId('Bag');
      setEditingProduct(null);
      setProductForm((prev) => ({
        ...prev,
        categoryId: prefill.categoryId || prev.categoryId,
        categoryName: prefill.categoryName || prev.categoryName,
        subcategoryId: prefill.subcategoryId || prev.subcategoryId,
        subcategoryName: prefill.subcategoryName || prev.subcategoryName,
        unit: prev.unit || defaultUnit,
        unitId: prev.unitId || defaultUnitId,
      }));
      setIsProductModalVisible(true);
    }
  }, [routeData?.prefillProduct, units]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Image Selection
  const handleImagePick = () => {
    Alert.alert('Select Image Source', 'Choose how you would like to select your product image:', [
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
    ]);
  };

  const launchImagePicker = (sourceType) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    const callback = async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick image');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        try {
          // Immediate local preview
          setProductForm((prev) => ({ ...prev, image: asset.uri }));
          setIsUploadingImage(true);

          // Upload to backend
          const uploadedUrl = await uploadService.uploadImage(asset);
          setProductForm((prev) => ({ ...prev, image: uploadedUrl }));
        } catch (uploadErr) {
          console.error('Failed to upload product image:', uploadErr);
          Alert.alert('Image Upload Failed', uploadErr.message || 'Could not upload image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    };

    if (sourceType === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  // Open creation modal
  const openAddProduct = () => {
    setEditingProduct(null);
    const defaultUnit = units[0] ? units[0].shortName || units[0].name : 'Bag';
    const defaultUnitId = units[0] ? units[0]._id : getUnitId('Bag');
    setProductForm({
      name: '',
      categoryId: categories[0]?._id || '',
      categoryName: categories[0]?.name || '',
      subcategoryId: '',
      subcategoryName: '',
      unit: defaultUnit,
      unitId: defaultUnitId,
      price: '',
      stock: '',
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
    const prodSubCatId =
      prod.subCategoryId?._id ||
      prod.subCategoryId?.id ||
      prod.subCategoryId ||
      prod.subcategoryId?._id ||
      prod.subcategoryId?.id ||
      prod.subcategoryId;
    const cat = categories.find((c) => String(c._id) === String(prodCatId));
    const sub = subcategories.find((s) => String(s._id) === String(prodSubCatId));

    const unitName = prod.unit || getProductUnitText(prod);
    const unitId = prod.unitId?._id || prod.unitId?.id || prod.unitId || getUnitId(unitName);

    setProductForm({
      name: prod.name,
      categoryId: prodCatId || '',
      categoryName: cat ? cat.name : typeof prod.categoryId === 'object' ? prod.categoryId?.name : '',
      subcategoryId: prodSubCatId || '',
      subcategoryName: sub ? sub.name : typeof prod.subCategoryId === 'object' ? prod.subCategoryId?.name : '',
      unit: unitName,
      unitId: unitId,
      price: prod.price !== undefined ? String(prod.price) : '',
      stock: prod.stock !== undefined ? String(prod.stock) : (prod.quantity !== undefined ? String(prod.quantity) : ''),
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
      const companyId = await getEffectiveCompanyId();

      const payload = {
        name: productForm.name.trim(),
        categoryId: productForm.categoryId,
        unitId: productForm.unitId || getUnitId(productForm.unit),
      };

      if (!editingProduct) {
        payload.companyId = companyId;
      }

      if (productForm.subcategoryId) payload.subCategoryId = productForm.subcategoryId;
      if (productForm.image) {
        let finalImageUrl = productForm.image;
        if (finalImageUrl.startsWith('file://') || finalImageUrl.startsWith('content://')) {
          try {
            finalImageUrl = await uploadService.uploadImage(finalImageUrl);
          } catch (imgErr) {
            console.warn('Image upload before save failed, proceeding:', imgErr);
          }
        }
        payload.image = finalImageUrl;
      }
      if (productForm.description?.trim()) payload.description = productForm.description.trim();
      if (productForm.hsnCode?.trim()) payload.hsnCode = productForm.hsnCode.trim();
      if (productForm.gstCode?.trim()) payload.gstCode = productForm.gstCode.trim();
      if (editingProduct && productForm.status) payload.status = productForm.status;

      let response;
      if (editingProduct) {
        response = await updateProduct(editingProduct._id || editingProduct.id, companyId, payload, token);
      } else {
        response = await createProduct(payload, token);
      }

      if (response && response.success) {
        setSuccessMessage(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
        setShowSuccessModal(true);
        setIsProductModalVisible(false);
        fetchData();
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        Alert.alert('Error', response?.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = (prod) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${prod.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            const companyId = await getEffectiveCompanyId();
            const res = await deleteProduct(prod._id || prod.id, companyId, token);
            if (res && res.success) {
              fetchData();
            } else {
              Alert.alert('Error', res?.message || 'Failed to delete product');
            }
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  // Toggle Product Status (Active / Inactive)
  const handleToggleStatus = async (prod) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = await getEffectiveCompanyId();
      const nextStatus = prod.status === 'active' ? 'inactive' : 'active';
      const res = await updateProduct(prod._id || prod.id, companyId, { status: nextStatus }, token);
      if (res && res.success) {
        fetchData();
      }
    } catch (e) {
      console.warn('Failed to toggle status:', e);
    }
  };

  // Summary Metrics calculations
  const totalCount = products.length;
  const activeCount = useMemo(() => products.filter((p) => p.status !== 'inactive').length, [products]);
  const inactiveCount = useMemo(() => products.filter((p) => p.status === 'inactive').length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => Number(p.stock || 0) === 0).length, [products]);

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const nameMatch = String(p.name || '').toLowerCase().includes(q);
        const catMatch = typeof p.categoryId === 'object' && p.categoryId?.name?.toLowerCase().includes(q);
        return nameMatch || catMatch;
      });
    }

    // Status filter
    if (selectedFilterStatus === 'ACTIVE') {
      list = list.filter((p) => p.status !== 'inactive');
    } else if (selectedFilterStatus === 'INACTIVE') {
      list = list.filter((p) => p.status === 'inactive');
    } else if (selectedFilterStatus === 'OUT_OF_STOCK') {
      list = list.filter((p) => Number(p.stock || 0) === 0);
    }

    // Sort order
    if (sortOrder === 'NAME_ASC') {
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else if (sortOrder === 'PRICE_ASC') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortOrder === 'PRICE_DESC') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    return list;
  }, [products, searchQuery, selectedFilterStatus, sortOrder]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 1. TOP NAVIGATION BAR ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1541D8" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Products</Text>

        <View style={styles.headerRightActions}>
          {/* Search Toggle Button */}
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setIsSearchOpen((prev) => !prev)}
            activeOpacity={0.75}
          >
            <Search size={18} color="#2563EB" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Filter Pill Button */}
          <TouchableOpacity
            style={[styles.filterBtn, selectedFilterStatus !== 'ALL' && styles.filterBtnActive]}
            onPress={() => setIsFilterModalVisible(true)}
            activeOpacity={0.75}
          >
            <Filter size={14} color="#2563EB" strokeWidth={2.2} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>

          {/* + Add Product Blue Button */}
          <TouchableOpacity
            style={styles.addProductHeaderBtn}
            onPress={openAddProduct}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addProductHeaderBtnText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inline Search Bar */}
      {isSearchOpen && (
        <View style={styles.searchBarWrapper}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or categories..."
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
        {/* ─── 2. TOP 4 SUMMARY METRIC CARDS (Exact Reference Match) ─── */}
        <View style={styles.metricsRow}>
          {/* 1. Total Products */}
          <TouchableOpacity
            style={[styles.metricCard, selectedFilterStatus === 'ALL' && styles.metricCardSelected]}
            onPress={() => setSelectedFilterStatus('ALL')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#F5F3FF' }]}>
              <Package size={18} color="#7C3AED" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Total Products
            </Text>
            <Text style={styles.metricValue}>{totalCount}</Text>
          </TouchableOpacity>

          {/* 2. Active */}
          <TouchableOpacity
            style={[styles.metricCard, selectedFilterStatus === 'ACTIVE' && styles.metricCardSelected]}
            onPress={() => setSelectedFilterStatus('ACTIVE')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle2 size={18} color="#16A34A" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Active
            </Text>
            <Text style={[styles.metricValue, { color: '#16A34A' }]}>{activeCount}</Text>
          </TouchableOpacity>

          {/* 3. Inactive */}
          <TouchableOpacity
            style={[styles.metricCard, selectedFilterStatus === 'INACTIVE' && styles.metricCardSelected]}
            onPress={() => setSelectedFilterStatus('INACTIVE')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#FFF7ED' }]}>
              <PauseCircle size={18} color="#EA580C" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Inactive
            </Text>
            <Text style={[styles.metricValue, { color: '#EA580C' }]}>{inactiveCount}</Text>
          </TouchableOpacity>

          {/* 4. Categories */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => onNavigate('CategoryPage')}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Tag size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.metricLabel} numberOfLines={1}>
              Categories
            </Text>
            <Text style={[styles.metricValue, { color: '#2563EB' }]}>{categories.length}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 3. PRODUCTS LIST SECTION ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Products ({filteredProducts.length})
            </Text>

            {/* Sort Toggle Button */}
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => {
                setSortOrder((prev) =>
                  prev === 'DEFAULT' ? 'PRICE_ASC' : prev === 'PRICE_ASC' ? 'PRICE_DESC' : 'DEFAULT'
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.sortBtnText}>
                Sort {sortOrder === 'PRICE_ASC' ? '↑' : sortOrder === 'PRICE_DESC' ? '↓' : ''}
              </Text>
              <SlidersHorizontal size={14} color="#2563EB" strokeWidth={2.2} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#1541D8" />
              <Text style={styles.loadingText}>Loading products catalog...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Package size={36} color="#94A3B8" strokeWidth={1.8} />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No products match your search query.'
                  : 'Tap "+ Add Product" to add your first product to catalog.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={openAddProduct}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.emptyAddBtnText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredProducts.map((prod, idx) => {
              const catName =
                typeof prod.categoryId === 'object' && prod.categoryId !== null
                  ? prod.categoryId.name
                  : categories.find((c) => String(c._id) === String(prod.categoryId))?.name || 'Category';

              const subCatName =
                typeof prod.subCategoryId === 'object' && prod.subCategoryId !== null
                  ? prod.subCategoryId.name
                  : subcategories.find((s) => String(s._id) === String(prod.subCategoryId))?.name ||
                  prod.subcategoryName ||
                  '';

              const breadcrumb = subCatName ? `${catName}  ›  ${subCatName}` : catName;
              const unitText = prod.unit || getProductUnitText(prod);
              const priceText = prod.price !== undefined && prod.price !== null && prod.price !== ''
                ? `₹${Number(prod.price).toLocaleString('en-IN')}`
                : '₹0';
              const isActive = prod.status !== 'inactive';
              const stockValue = prod.stock !== undefined ? prod.stock : (prod.quantity !== undefined ? prod.quantity : (isActive ? 0 : 0));
              const isOutOfStock = Number(stockValue) === 0;

              const pId = prod._id || prod.id || idx;
              const isExpanded = expandedProductId === pId;

              return (
                <View key={pId} style={styles.productCardContainer}>
                  {/* Top Card Header Row (Clickable) */}
                  <TouchableOpacity
                    style={styles.productCardHeader}
                    onPress={() => setExpandedProductId(isExpanded ? null : pId)}
                    activeOpacity={0.8}
                  >
                    {/* Left: Product Image in Rounded Squircle */}
                    <View style={styles.productImgBox}>
                      {prod.image ? (
                        <Image
                          source={{ uri: resolveImageUrl(prod.image) }}
                          style={styles.productImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.productImgPlaceholder}>
                          <Package size={24} color="#2563EB" strokeWidth={2} />
                        </View>
                      )}
                    </View>

                    {/* Center: Details */}
                    <View style={styles.productCenterInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {prod.name}
                      </Text>

                      <Text style={styles.productCategoryPath} numberOfLines={1}>
                        {breadcrumb}
                      </Text>

                      <Text style={styles.productUnitInfo}>
                        Unit: Per {unitText}
                      </Text>
                    </View>

                    {/* Right: Status Pill, Expand Chevron & Action Menu */}
                    <View style={styles.productRightInfo}>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: isActive ? '#E8F8F0' : '#FFF7ED' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: isActive ? '#10B981' : '#EA580C' },
                          ]}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>

                      <View style={styles.cardActionsRightRow}>
                        <TouchableOpacity
                          style={styles.chevronExpandBtn}
                          onPress={() => setExpandedProductId(isExpanded ? null : pId)}
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
                            setActionSheetProduct(prod);
                          }}
                          activeOpacity={0.7}
                        >
                          <MoreVertical size={18} color="#64748B" strokeWidth={2.2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* ─── Expandable Details Dropdown Drawer ─── */}
                  {isExpanded && (
                    <View style={styles.expandedDrawer}>
                      <View style={styles.drawerDivider} />

                      {/* Specifications Grid */}
                      <View style={styles.drawerDetailsGrid}>
                        <View style={styles.drawerDetailItem}>
                          <Text style={styles.drawerDetailLabel}>HSN Code</Text>
                          <Text style={styles.drawerDetailValue}>{prod.hsnCode || 'N/A'}</Text>
                        </View>

                        <View style={styles.drawerDetailItem}>
                          <Text style={styles.drawerDetailLabel}>GST Rate</Text>
                          <Text style={styles.drawerDetailValue}>{prod.gstCode ? `${prod.gstCode}%` : 'N/A'}</Text>
                        </View>

                        <View style={styles.drawerDetailItem}>
                          <Text style={styles.drawerDetailLabel}>Category</Text>
                          <Text style={styles.drawerDetailValue}>{catName}</Text>
                        </View>

                        {subCatName ? (
                          <View style={styles.drawerDetailItem}>
                            <Text style={styles.drawerDetailLabel}>Subcategory</Text>
                            <Text style={styles.drawerDetailValue}>{subCatName}</Text>
                          </View>
                        ) : null}

                        <View style={styles.drawerDetailItem}>
                          <Text style={styles.drawerDetailLabel}>Base Unit</Text>
                          <Text style={styles.drawerDetailValue}>{unitText}</Text>
                        </View>
                      </View>

                      {prod.description ? (
                        <View style={styles.drawerDescBox}>
                          <Text style={styles.drawerDetailLabel}>Description</Text>
                          <Text style={styles.drawerDescText}>{prod.description}</Text>
                        </View>
                      ) : null}

                      {/* Action Buttons in Dropdown */}
                      <View style={styles.drawerActionsRow}>
                        <TouchableOpacity
                          style={styles.drawerEditBtn}
                          onPress={() => openEditProduct(prod)}
                          activeOpacity={0.75}
                        >
                          <Edit3 size={13} color="#1541D8" strokeWidth={2.2} />
                          <Text style={styles.drawerEditBtnText}>Edit Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.drawerToggleBtn}
                          onPress={() => handleToggleStatus(prod)}
                          activeOpacity={0.75}
                        >
                          <CheckCircle2 size={13} color={isActive ? '#EA580C' : '#10B981'} strokeWidth={2.2} />
                          <Text
                            style={[
                              styles.drawerToggleBtnText,
                              { color: isActive ? '#EA580C' : '#10B981' },
                            ]}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.drawerDealBtn}
                          onPress={() => onNavigate('CreateDeal', { prefillProduct: prod })}
                          activeOpacity={0.8}
                        >
                          <ShoppingBag size={13} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.drawerDealBtnText}>Create Sauda</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* Bottom View All link */}
          {filteredProducts.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => onNavigate('CategoryPage')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllBtnText}>View All Categories</Text>
              <ChevronRight size={16} color="#1541D8" strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ─── 4. ACTION SHEET MODAL (Edit / Delete / Toggle Status) ─── */}
      <Modal
        visible={actionSheetProduct !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetProduct(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActionSheetProduct(null)}
        >
          <View style={styles.actionSheetCard}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionSheetProduct?.name}
            </Text>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const p = actionSheetProduct;
                setActionSheetProduct(null);
                openEditProduct(p);
              }}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color="#2563EB" />
              <Text style={styles.actionSheetItemText}>Edit Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const p = actionSheetProduct;
                setActionSheetProduct(null);
                handleToggleStatus(p);
              }}
              activeOpacity={0.7}
            >
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={styles.actionSheetItemText}>
                {actionSheetProduct?.status === 'inactive'
                  ? 'Set as Active'
                  : 'Set as Inactive'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const p = actionSheetProduct;
                setActionSheetProduct(null);
                onNavigate('CreateDeal', { prefillProduct: p });
              }}
              activeOpacity={0.7}
            >
              <ShoppingBag size={18} color="#1541D8" />
              <Text style={styles.actionSheetItemText}>Create Sauda with Product</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 6 }} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                const p = actionSheetProduct;
                setActionSheetProduct(null);
                handleDeleteProduct(p);
              }}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="#DC2626" />
              <Text style={[styles.actionSheetItemText, { color: '#DC2626', fontWeight: '700' }]}>
                Delete Product
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 5. FILTER MODAL ─── */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalHeading}>Filter Products</Text>

            <View style={styles.filterOptionsList}>
              {[
                { label: 'All Products', value: 'ALL' },
                { label: 'Active Only', value: 'ACTIVE' },
                { label: 'Inactive Only', value: 'INACTIVE' },
                { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterOptionItem,
                    selectedFilterStatus === opt.value && styles.filterOptionItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedFilterStatus(opt.value);
                    setIsFilterModalVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterOptionItemText,
                      selectedFilterStatus === opt.value && styles.filterOptionItemTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selectedFilterStatus === opt.value && (
                    <Check size={16} color="#1541D8" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setIsFilterModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 6. ADD / EDIT PRODUCT MODAL ─── */}
      <Modal
        visible={isProductModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProductModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalHeading}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Product Image Selector */}
              <TouchableOpacity
                style={styles.imageUploadBox}
                onPress={handleImagePick}
                activeOpacity={0.8}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <View style={styles.uploadPlaceholder}>
                    <ActivityIndicator size="small" color="#1541D8" />
                    <Text style={[styles.uploadPlaceholderText, { marginTop: 8 }]}>Uploading image...</Text>
                  </View>
                ) : productForm.image ? (
                  <Image
                    source={{ uri: resolveImageUrl(productForm.image) }}
                    style={styles.uploadedImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Camera size={26} color="#1541D8" />
                    <Text style={styles.uploadPlaceholderText}>Upload Product Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Product Name */}
              <Text style={styles.modalFieldLabel}>Product Name*</Text>
              <TextInput
                style={styles.modalInput}
                value={productForm.name}
                onChangeText={(text) => setProductForm({ ...productForm, name: text })}
                placeholder="e.g. Basmati Rice 1121, Wheat, Mustard Oil"
                placeholderTextColor="#94A3B8"
              />

              {/* Category Picker */}
              <Text style={styles.modalFieldLabel}>Category*</Text>
              <TouchableOpacity
                style={styles.pickerSelector}
                onPress={() => setIsCategoryPickerVisible(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.pickerSelectorText}>
                  {productForm.categoryName || 'Select Category'}
                </Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>

              {/* Unit Picker */}
              <Text style={styles.modalFieldLabel}>Unit*</Text>
              <TouchableOpacity
                style={styles.pickerSelector}
                onPress={() => setIsUnitPickerVisible(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.pickerSelectorText}>
                  {productForm.unit || 'Select Unit (Bag, Ton, Quintal, etc.)'}
                </Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>

              {/* HSN & GST */}
              <View style={styles.modalRowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalFieldLabel}>HSN Code</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={productForm.hsnCode}
                    onChangeText={(text) => setProductForm({ ...productForm, hsnCode: text })}
                    placeholder="e.g. 1006"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.modalFieldLabel}>GST Rate (%)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={productForm.gstCode}
                    onChangeText={(text) => setProductForm({ ...productForm, gstCode: text })}
                    placeholder="e.g. 5%"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Description */}
              <Text style={styles.modalFieldLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={productForm.description}
                onChangeText={(text) => setProductForm({ ...productForm, description: text })}
                placeholder="Product specs, packaging info..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsProductModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProduct}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Product</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 7. CATEGORY PICKER MODAL ─── */}
      <Modal
        visible={isCategoryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCategoryPickerVisible(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Select Category</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c._id}
                  style={styles.pickerModalItem}
                  onPress={() => {
                    setProductForm({
                      ...productForm,
                      categoryId: c._id,
                      categoryName: c.name,
                    });
                    setIsCategoryPickerVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.pickerModalItemText}>{c.name}</Text>
                  {productForm.categoryId === c._id && (
                    <Check size={16} color="#1541D8" strokeWidth={2.4} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 8. UNIT PICKER MODAL ─── */}
      <Modal
        visible={isUnitPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUnitPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsUnitPickerVisible(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Select Unit</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {units.map((u) => (
                <TouchableOpacity
                  key={u._id}
                  style={styles.pickerModalItem}
                  onPress={() => {
                    setProductForm({
                      ...productForm,
                      unit: u.shortName || u.name,
                      unitId: u._id,
                    });
                    setIsUnitPickerVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.pickerModalItemText}>
                    {u.shortName || u.name}
                  </Text>
                  {productForm.unitId === u._id && (
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

export default AddProductPage;

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

  /* ── 1. Header ── */
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  filterBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  addProductHeaderBtn: {
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
  addProductHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
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

  /* ── 2. Summary Metric Cards (4 Tiles) ── */
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
    gap: 6,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricCardSelected: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 9.5,
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

  /* ── 3. Products List Section ── */
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
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Product Card */
  productCardContainer: {
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
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  productImgBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productImgPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  productCenterInfo: {
    flex: 1,
    paddingRight: 6,
  },
  productName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  productCategoryPath: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  productUnitInfo: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  productRightInfo: {
    alignItems: 'flex-end',
  },
  cardActionsRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  chevronExpandBtn: {
    padding: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  moreActionBtn: {
    padding: 2,
  },

  /* ── Expandable Dropdown Drawer ── */
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
  drawerDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  drawerDetailItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerDetailLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  drawerDetailValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  drawerDescBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  drawerDescText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '500',
  },
  drawerActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  drawerEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 7,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  drawerEditBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1541D8',
  },
  drawerToggleBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 7,
    gap: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  drawerToggleBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  drawerDealBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1541D8',
    borderRadius: 10,
    paddingVertical: 7,
    gap: 4,
  },
  drawerDealBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  viewAllBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 6,
    gap: 4,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1541D8',
  },

  /* Empty State */
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

  /* Action Sheet Modal */
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

  /* Filter Modal */
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
  filterOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  filterOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionItemSelected: {
    borderColor: '#1541D8',
    backgroundColor: '#EFF6FF',
  },
  filterOptionItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  filterOptionItemTextSelected: {
    fontWeight: '800',
    color: '#1541D8',
  },

  /* Add / Edit Modal */
  modalScroll: {
    marginBottom: 14,
  },
  imageUploadBox: {
    width: '100%',
    height: 110,
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
  modalRowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  pickerSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
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

  /* Pickers */
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

  /* Toast Overlay */
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
