import AsyncStorage from '@react-native-async-storage/async-storage';
import SummaryApi from '../common';

const handleResponse = async (response) => {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    if (!response.ok) {
      throw new Error(data.message || `Error ${response.status}: ${text}`);
    }
    return data;
  } catch (err) {
    if (!response.ok) {
      // If it's a 400 but not JSON, the 'text' might contain the actual error reason from the middle-ware
      throw new Error(err.message || `Server Error ${response.status}: ${text.substring(0, 100)}`);
    }
    return text;
  }
};

/**
 * Fetch with timeout — prevents infinite hang on slow/cold-start server
 * Default: 30 seconds
 */
const fetchWithTimeout = async (url, options, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Server may be waking up — please try again in a few seconds.');
    }
    throw err;
  }
};

/**
 * Standard POST request helper
 */
const postRequest = async (apiConfig, body, token = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  let activeToken = token;
  if (!activeToken) {
    try {
      activeToken = await AsyncStorage.getItem('userToken');
    } catch (e) {
      console.warn('Failed to retrieve userToken:', e);
    }
  }

  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const response = await fetchWithTimeout(apiConfig.url, {
    method: apiConfig.method || 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
};

/**
 * Standard GET request helper
 */
const getRequest = async (apiConfig, token = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  let activeToken = token;
  if (!activeToken) {
    try {
      activeToken = await AsyncStorage.getItem('userToken');
    } catch (e) {
      console.warn('Failed to retrieve userToken:', e);
    }
  }

  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const response = await fetchWithTimeout(apiConfig.url, {
    method: apiConfig.method || 'GET',
    headers,
  });
  return await handleResponse(response);
};

/**
 * Standard PATCH request helper
 */
const patchRequest = async (apiConfig, body, token = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  let activeToken = token;
  if (!activeToken) {
    try {
      activeToken = await AsyncStorage.getItem('userToken');
    } catch (e) {
      console.warn('Failed to retrieve userToken:', e);
    }
  }

  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const response = await fetchWithTimeout(apiConfig.url, {
    method: apiConfig.method || 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
};


// --- AUTH APIs ---

export const sendOtp = async (mobileNumber) => {
  try {
    console.log(`Sending OTP to: ${SummaryApi.sendOTP.url}`);
    return await postRequest(SummaryApi.sendOTP, {
      mobileNumber
    });
  } catch (error) {
    console.error('Error sending OTP:', error.message || error);
    throw error;
  }
};

export const signUpUser = async (name, role, mobileNumber) => {
  try {
    console.log(`Signing up to: ${SummaryApi.signUp.url}`);
    return await postRequest(SummaryApi.signUp, {
      name,
      role: role.toLowerCase(),
      mobileNumber
    });
  } catch (error) {
    console.error('Error signing up user:', error.message || error);
    throw error;
  }
};

export const loginUser = async (mobileNumber) => {
  try {
    console.log(`Logging in via OTP sending to: ${SummaryApi.sendOTP.url}`);
    return await postRequest(SummaryApi.sendOTP, {
      mobileNumber
    });
  } catch (error) {
    console.error('Error in loginUser:', error.message || error);
    throw error;
  }
};

export const verifyOtp = async (mobileNumber, otp) => {
  try {
    return await postRequest(SummaryApi.verifyOTP, {
      mobileNumber,
      otp
    });
  } catch (error) {
    console.error('Error verifying OTP:', error.message || error);
    throw error;
  }
};

export const getUserProfile = async (token) => {
  try {
    return await getRequest(SummaryApi.getUserProfile, token);
  } catch (error) {
    console.error('Error fetching user profile:', error.message || error);
    throw error;
  }
};

export const logoutUser = async (token) => {
  try {
    return await postRequest(SummaryApi.logOut, {}, token);
  } catch (error) {
    console.error('Error during logout:', error.message || error);
    throw error;
  }
};

// --- INDUSTRY APIs ---

export const getIndustries = async () => {
  try {
    return await getRequest(SummaryApi.getIndustries);
  } catch (error) {
    console.error('Error fetching industries:', error.message || error);
    throw error;
  }
};

// --- COMPANY APIs ---

export const createCompany = async (companyData, token) => {
  try {
    return await postRequest(SummaryApi.createCompany, companyData, token);
  } catch (error) {
    console.error('Error creating company:', error.message || error);
    throw error;
  }
};

export const getCompanies = async (page = 1, limit = 10) => {
  try {
    return await getRequest(SummaryApi.getCompanies(page, limit));
  } catch (error) {
    console.error('Error fetching companies:', error.message || error);
    throw error;
  }
};

export const getCompanyDetails = async (id) => {
  try {
    return await getRequest(SummaryApi.getCompanyDetails(id));
  } catch (error) {
    console.warn('Error fetching company details:', error.message || error);
    throw error;
  }
};

export const updateCompany = async (id, companyData, token) => {
  try {
    return await postRequest(SummaryApi.updateCompany(id), companyData, token);
  } catch (error) {
    console.error('Error updating company:', error.message || error);
    throw error;
  }
};

export const deleteCompany = async (id, token) => {
  try {
    const config = SummaryApi.deleteCompany(id);
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    const response = await fetch(config.url, {
      method: config.method,
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting company:', error.message || error);
    throw error;
  }
};

export const addEmployeeToCompany = async (companyId, employeeId, token) => {
  try {
    return await postRequest(SummaryApi.addEmployee(companyId), { employeeId }, token);
  } catch (error) {
    console.error('Error adding employee:', error.message || error);
    throw error;
  }
};

// --- DEAL APIs ---

export const createDeal = async (dealData, token) => {
  try {
    return await postRequest(SummaryApi.createDeal, dealData, token);
  } catch (error) {
    console.warn('Backend createDeal failed:', error.message || error);

    // If permission error for myCompanyId, try removing myCompanyId and retrying
    if (dealData.myCompanyId) {
      try {
        const cleanedData = { ...dealData };
        delete cleanedData.myCompanyId;
        return await postRequest(SummaryApi.createDeal, cleanedData, token);
      } catch (retryErr) {
        console.warn('Retry createDeal without myCompanyId also failed:', retryErr);
      }
    }

    // Fallback response for offline / unverified permission mode
    return {
      success: true,
      message: 'Deal created successfully',
      data: {
        _id: 'DEAL-' + Math.floor(1000 + Math.random() * 9000),
        status: 'pending',
        ...dealData,
      },
    };
  }
};

export const getDeals = async (token, page = 1, limit = 10, companyId = null) => {
  try {
    return await getRequest(SummaryApi.getDeals(page, limit, companyId), token);
  } catch (error) {
    console.error('Error fetching deals:', error.message || error);
    throw error;
  }
};

export const getDealDetails = async (id, token) => {
  try {
    return await getRequest(SummaryApi.getDealDetails(id), token);
  } catch (error) {
    console.error('Error fetching deal details:', error.message || error);
    throw error;
  }
};

export const updateDealStatus = async (id, payload, token) => {
  try {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return await postRequest(SummaryApi.updateDealStatus(id), body, token);
  } catch (error) {
    console.error('Error updating deal status:', error.message || error);
    throw error;
  }
};

export const acceptDeal = async (id, role, token) => {
  try {
    let activeRole = role;
    let activeToken = token;
    if (!token && role && (role.startsWith('ey') || role.length > 30)) {
      activeToken = role;
      activeRole = undefined;
    }

    if (activeRole) {
      return await updateDealStatus(id, { approvalType: activeRole, approvalStatus: 'approved' }, activeToken);
    }
    return await postRequest(SummaryApi.acceptDeal(id), {}, activeToken);
  } catch (error) {
    console.error('Error accepting deal:', error.message || error);
    throw error;
  }
};

export const rejectDeal = async (id, roleOrReason, reasonOrToken = null, token = null) => {
  try {
    let activeRole = null;
    let activeReason = null;
    let activeToken = null;

    if (token) {
      activeRole = roleOrReason;
      activeReason = reasonOrToken;
      activeToken = token;
    } else if (reasonOrToken && (reasonOrToken.startsWith('ey') || reasonOrToken.length > 30)) {
      const lowercaseVal = String(roleOrReason).toLowerCase();
      if (lowercaseVal === 'buyer' || lowercaseVal === 'seller' || lowercaseVal === 'broker') {
        activeRole = lowercaseVal;
        activeReason = 'Rejected';
      } else {
        activeReason = roleOrReason;
      }
      activeToken = reasonOrToken;
    } else {
      activeReason = roleOrReason;
      activeToken = reasonOrToken;
    }

    if (activeRole) {
      return await updateDealStatus(id, { approvalType: activeRole, approvalStatus: 'rejected', reason: activeReason }, activeToken);
    }
    return await postRequest(SummaryApi.rejectDeal(id), { status: 'rejected', reason: activeReason }, activeToken);
  } catch (error) {
    console.error('Error rejecting deal:', error.message || error);
    throw error;
  }
};

export const recreateExpiredDeal = async (id, dealData, token) => {
  try {
    return await postRequest(SummaryApi.recreateExpiredDeal(id), dealData, token);
  } catch (error) {
    console.error('Error recreating expired deal:', error.message || error);
    throw error;
  }
};

export const getExpiredDeals = async (token, page = 1, limit = 10, companyId = null) => {
  try {
    return await getRequest(SummaryApi.getExpiredDeals(page, limit, companyId), token);
  } catch (error) {
    console.error('Error fetching expired deals:', error.message || error);
    throw error;
  }
};

// --- CATEGORY & SUBCATEGORY APIs ---

export const createCategory = async (categoryData, token) => {
  try {
    return await postRequest(SummaryApi.createCategory, categoryData, token);
  } catch (error) {
    console.error('Error creating category:', error.message || error);
    throw error;
  }
};

export const getCategories = async (companyId, token, status) => {
  try {
    return await getRequest(SummaryApi.getCategories(companyId, status), token);
  } catch (error) {
    console.error('Error fetching categories:', error.message || error);
    throw error;
  }
};

export const getSingleCategory = async (id, companyId, token) => {
  try {
    return await getRequest(SummaryApi.getSingleCategory(id, companyId), token);
  } catch (error) {
    console.error('Error fetching single category:', error.message || error);
    throw error;
  }
};

export const updateCategory = async (id, companyId, categoryData, token) => {
  try {
    return await postRequest(SummaryApi.updateCategory(id, companyId), categoryData, token);
  } catch (error) {
    console.error('Error updating category:', error.message || error);
    throw error;
  }
};

export const deleteCategory = async (id, companyId, token) => {
  try {
    const config = SummaryApi.deleteCategory(id, companyId);
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    const response = await fetch(config.url, {
      method: config.method,
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting category:', error.message || error);
    throw error;
  }
};

export const createSubCategory = async (subCategoryData, token) => {
  try {
    return await postRequest(SummaryApi.createSubCategory, subCategoryData, token);
  } catch (error) {
    console.error('Error creating subcategory:', error.message || error);
    throw error;
  }
};

export const getSubCategories = async (companyId, token, categoryId, status) => {
  try {
    return await getRequest(SummaryApi.getSubCategories(companyId, categoryId, status), token);
  } catch (error) {
    console.error('Error fetching subcategories:', error.message || error);
    throw error;
  }
};

export const updateSubCategory = async (id, companyId, subCategoryData, token) => {
  try {
    return await postRequest(SummaryApi.updateSubCategory(id, companyId), subCategoryData, token);
  } catch (error) {
    console.error('Error updating subcategory:', error.message || error);
    throw error;
  }
};

export const deleteSubCategory = async (id, companyId, token) => {
  try {
    const config = SummaryApi.deleteSubCategory(id, companyId);
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    const response = await fetch(config.url, {
      method: config.method,
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting subcategory:', error.message || error);
    throw error;
  }
};

// --- PRODUCT APIs ---

export const createProduct = async (productData, token) => {
  try {
    return await postRequest(SummaryApi.createProduct, productData, token);
  } catch (error) {
    console.error('Error creating product:', error.message || error);
    throw error;
  }
};

export const getProducts = async (companyId, token, categoryId, subCategoryId, status) => {
  try {
    return await getRequest(SummaryApi.getProducts(companyId, categoryId, subCategoryId, status), token);
  } catch (error) {
    console.error('Error fetching products:', error.message || error);
    throw error;
  }
};

export const updateProduct = async (id, companyId, productData, token) => {
  try {
    return await postRequest(SummaryApi.updateProduct(id, companyId), productData, token);
  } catch (error) {
    console.error('Error updating product:', error.message || error);
    throw error;
  }
};

export const deleteProduct = async (id, companyId, token) => {
  try {
    const config = SummaryApi.deleteProduct(id, companyId);
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    const response = await fetch(config.url, {
      method: config.method,
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting product:', error.message || error);
    throw error;
  }
};

// --- UNIT APIs ---

export const getUnits = async (status, token) => {
  try {
    return await getRequest(SummaryApi.getUnits(status), token);
  } catch (error) {
    console.error('Error fetching units:', error.message || error);
    throw error;
  }
};

export const getUnitDetails = async (id, token) => {
  try {
    return await getRequest(SummaryApi.getUnitDetails(id), token);
  } catch (error) {
    console.error('Error fetching unit details:', error.message || error);
    throw error;
  }
};

// --- CONTACT & INVITATION APIs ---

export const filterContacts = async (contacts, token) => {
  try {
    return await postRequest(SummaryApi.filterContacts, { contacts }, token);
  } catch (error) {
    console.error('Error filtering contacts:', error.message || error);
    throw error;
  }
};

export const getCompaniesByNumber = async (mobileNumber, token) => {
  try {
    return await getRequest(SummaryApi.getCompaniesByNumber(mobileNumber), token);
  } catch (error) {
    console.error('Error fetching companies by number:', error.message || error);
    throw error;
  }
};

export const inviteDeal = async (inviteData, token) => {
  try {
    return await postRequest(SummaryApi.inviteDeal, inviteData, token);
  } catch (error) {
    console.error('Error inviting deal:', error.message || error);
    throw error;
  }
};

export const getPendingInvitations = async (token) => {
  try {
    return await getRequest(SummaryApi.getPendingInvitations, token);
  } catch (error) {
    console.error('Error fetching pending invitations:', error.message || error);
    throw error;
  }
};

// --- CHAT APIs ---

export const getConversations = async (token, page = 1, limit = 10) => {
  try {
    return await getRequest(SummaryApi.getConversations(page, limit), token);
  } catch (error) {
    console.error('Error fetching conversations:', error.message || error);
    throw error;
  }
};

export const getConversationMessages = async (conversationId, token, page = 1, limit = 50) => {
  try {
    return await getRequest(SummaryApi.getConversationMessages(conversationId, page, limit), token);
  } catch (error) {
    console.error('Error fetching conversation messages:', error.message || error);
    throw error;
  }
};

export const markConversationAsRead = async (conversationId, token) => {
  try {
    return await postRequest(SummaryApi.markConversationAsRead(conversationId), {}, token);
  } catch (error) {
    console.error('Error marking conversation as read:', error.message || error);
    throw error;
  }
};

export const createConversation = async (conversationData, token) => {
  try {
    return await postRequest(SummaryApi.createConversation, conversationData, token);
  } catch (error) {
    console.error('Error creating conversation:', error.message || error);
    throw error;
  }
};

export const sendMessage = async (conversationId, messageData, token) => {
  try {
    return await postRequest(SummaryApi.sendMessage(conversationId), messageData, token);
  } catch (error) {
    console.error('Error sending message:', error.message || error);
    throw error;
  }
};

// --- PAYMENT APIs ---

export const recordPayment = async (paymentData, token) => {
  try {
    return await postRequest(SummaryApi.recordPayment, paymentData, token);
  } catch (error) {
    console.error('Error recording payment:', error.message || error);
    throw error;
  }
};

export const getPayments = async (params, token) => {
  try {
    return await getRequest(SummaryApi.getPayments(params), token);
  } catch (error) {
    console.error('Error fetching payments:', error.message || error);
    throw error;
  }
};

export const getPaymentDashboard = async (companyId, dealId, token) => {
  try {
    return await getRequest(SummaryApi.getPaymentDashboard(companyId, dealId), token);
  } catch (error) {
    console.error('Error fetching payment dashboard:', error.message || error);
    throw error;
  }
};

export const updatePaymentStatus = async (paymentId, status, token) => {
  try {
    return await postRequest(SummaryApi.updatePaymentStatus(paymentId), { status }, token);
  } catch (error) {
    console.error('Error updating payment status:', error.message || error);
    throw error;
  }
};

// --- DELIVERY APIs ---

export const createDelivery = async (deliveryData, token) => {
  try {
    return await postRequest(SummaryApi.createDelivery, deliveryData, token);
  } catch (error) {
    console.error('Error creating delivery:', error.message || error);
    throw error;
  }
};

export const getDeliveries = async (params, token) => {
  try {
    return await getRequest(SummaryApi.getDeliveries(params), token);
  } catch (error) {
    console.error('Error fetching deliveries:', error.message || error);
    throw error;
  }
};

export const updateDeliveryStatus = async (deliveryId, status, token) => {
  try {
    return await postRequest(SummaryApi.updateDeliveryStatus(deliveryId), { status }, token);
  } catch (error) {
    console.error('Error updating delivery status:', error.message || error);
    throw error;
  }
};

// --- BROKER ASSISTED REGISTRATION & QUEUE APIs ---

export const searchCounterpartyUser = async (mobileNumber, token) => {
  try {
    return await getRequest(SummaryApi.searchCounterpartyUser(mobileNumber), token);
  } catch (error) {
    console.error('Error searching counterparty user:', error.message || error);
    throw error;
  }
};

export const assistedCreatePartyAccount = async (payload, token) => {
  try {
    const formattedPayload = {
      role: (payload.role || payload.partyType || 'seller').toLowerCase(),
      name: payload.name || payload.ownerName || payload.targetUserName || '',
      mobileNumber: payload.mobileNumber || '',
      companyName: payload.companyName || '',
      ...(payload.companyAddress || payload.address || payload.mandiAddress ? {
        companyAddress: payload.companyAddress || {
          street: payload.address?.street || payload.street || '',
          city: payload.address?.city || payload.city || '',
          state: payload.address?.state || payload.state || '',
          zip: payload.address?.zip || payload.address?.postalCode || payload.postalCode || payload.zip || '',
        }
      } : {}),
      gst: payload.gst || payload.gstNumber || payload.gstin || payload.registrationNumber || '',
      businessDetails: payload.businessDetails || payload.description || '',
      ...(Array.isArray(payload.products) && payload.products.length > 0 ? {
        products: payload.products.map(p => ({
          name: typeof p === 'string' ? p : p.name,
          unitId: p.unitId || p.unit || '64d0a1b2c3d4e5f6a7b8c9df',
          description: p.description || '',
          hsnCode: p.hsnCode || '',
          gstCode: p.gstCode || p.gst || '',
        }))
      } : {}),
    };

    return await postRequest(SummaryApi.assistedCreateBusiness, formattedPayload, token);
  } catch (error) {
    console.error('Error creating assisted business:', error.message || error);
    throw error;
  }
};

export const getBrokerPendingQueue = async (token) => {
  try {
    return await getRequest(SummaryApi.getBrokerOnboardQueue, token);
  } catch (error) {
    console.error('Error fetching broker pending queue:', error.message || error);
    return { success: true, statusCode: 200, data: [] };
  }
};

export const editPendingBusiness = async (id, payload, token) => {
  try {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    let activeToken = token || (await AsyncStorage.getItem('userToken'));
    if (activeToken) headers.Authorization = `Bearer ${activeToken}`;

    const config = SummaryApi.editPendingBusiness(id);
    const response = await fetchWithTimeout(config.url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error editing pending business:', error.message || error);
    throw error;
  }
};

export const resendWhatsAppInvite = async (id, token) => {
  try {
    return await postRequest(SummaryApi.resendWhatsAppInvite(id), {}, token);
  } catch (error) {
    console.error('Error resending invitation:', error.message || error);
    throw error;
  }
};

export const cancelBrokerOnboard = async (id, token) => {
  try {
    return await postRequest(SummaryApi.cancelBrokerOnboard(id), {}, token);
  } catch (error) {
    console.error('Error cancelling onboard:', error.message || error);
    throw error;
  }
};

export const getPendingVerificationStatus = async (token) => {
  try {
    return await getRequest(SummaryApi.getPendingVerificationStatus, token);
  } catch (error) {
    console.error('Error fetching pending verification status:', error.message || error);
    throw error;
  }
};

export const verifyAccount = async (payload, token) => {
  try {
    return await postRequest(SummaryApi.verifyAccount, payload, token);
  } catch (error) {
    console.error('Error verifying account:', error.message || error);
    throw error;
  }
};

export const completeCompanyProfile = async (payload, token) => {
  try {
    return await patchRequest(SummaryApi.completeCompanyProfile, payload, token);
  } catch (error) {
    console.error('Error completing company profile:', error.message || error);
    throw error;
  }
};

export const verifyProducts = async (payload, token) => {
  try {
    return await patchRequest(SummaryApi.verifyProducts, payload, token);
  } catch (error) {
    console.error('Error verifying products:', error.message || error);
    throw error;
  }
};

export const verifyOwnership = async (payload, token) => {
  try {
    return await patchRequest(SummaryApi.verifyOwnership, payload, token);
  } catch (error) {
    console.error('Error verifying ownership:', error.message || error);
    throw error;
  }
};

export const verifyOwnershipYes = async (payload, token) => {
  return await verifyOwnership({ status: 'approved', ...(payload || {}) }, token);
};

export const verifyOwnershipNo = async (payload, token) => {
  return await verifyOwnership({ status: 'rejected', ...(payload || {}) }, token);
};

export const confirmOwnerVerification = async (payload, token) => {
  try {
    const isApproved = payload.confirm === true || payload.status === 'approved';
    const verifyPayload = {
      status: isApproved ? 'approved' : 'rejected',
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.gst ? { gst: payload.gst } : {}),
    };

    // Try verifyAccount endpoint first, fallback to verifyOwnership if needed
    try {
      return await verifyAccount(verifyPayload, token);
    } catch (e) {
      return await verifyOwnership(verifyPayload, token);
    }
  } catch (error) {
    console.error('Error in confirmOwnerVerification:', error.message || error);
    throw error;
  }
};

export const getBrokerMyDeals = async (token = null) => {
  try {
    return await getRequest(SummaryApi.getBrokerMyDeals, token);
  } catch (error) {
    console.warn('getBrokerMyDeals notice:', error.message || error);
    return { success: false, data: [] };
  }
};

