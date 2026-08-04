// import Config from "react-native-config"; // Uncomment this if you install react-native-config
const backendDomain = "https://pravisti-backend-538238931844.asia-southeast1.run.app";

const SummaryApi = {
  /* ================= AUTH ================= */
  sendOTP: {
    url: `${backendDomain}/api/auth/login`,
    method: "post",
  },

  signUp: {
    url: `${backendDomain}/api/auth/signup`,
    method: "post",
  },

  login: {
    url: `${backendDomain}/api/auth/login`,
    method: "post",
  },

  verifyOTP: {
    url: `${backendDomain}/api/auth/verify-otp`,
    method: "post",
  },

  logOut: {
    url: `${backendDomain}/api/auth/logout`,
    method: "post",
  },

  getUserProfile: {
    url: `${backendDomain}/api/users/profile`,
    method: "get",
  },

  /* ================= INDUSTRIES ================= */
  getIndustries: {
    url: `${backendDomain}/api/industries`,
    method: "get",
  },

  /* ================= COMPANY ================= */
  createCompany: {
    url: `${backendDomain}/api/companies`,
    method: "post",
  },

  getCompanies: (page = 1, limit = 10) => ({
    url: `${backendDomain}/api/companies?page=${page}&limit=${limit}`,
    method: "get",
  }),

  getCompanyDetails: (id) => ({
    url: `${backendDomain}/api/companies/${id}`,
    method: "get",
  }),

  updateCompany: (id) => ({
    url: `${backendDomain}/api/companies/${id}`,
    method: "put",
  }),

  deleteCompany: (id) => ({
    url: `${backendDomain}/api/companies/${id}`,
    method: "delete",
  }),

  addEmployee: (id) => ({
    url: `${backendDomain}/api/companies/${id}/add-employee`,
    method: "post",
  }),

  verifyCompany: (id) => ({
    url: `${backendDomain}/api/companies/${id}/verify`,
    method: "post",
  }),

  /* ================= DEALS ================= */
  createDeal: {
    url: `${backendDomain}/api/deals`,
    method: "post",
  },

  createBrokerDraftDeal: {
    url: `${backendDomain}/api/deals/broker/draft`,
    method: "post",
  },

  getBrokerProductAccessRequests: (companyId) => ({
    url: `${backendDomain}/api/deals/broker/product-access?companyId=${encodeURIComponent(companyId)}`,
    method: "get",
  }),

  respondToProductAccessRequest: (requestId) => ({
    url: `${backendDomain}/api/deals/broker/product-access/${requestId}`,
    method: "patch",
  }),

  completeBrokerDraftDeal: (dealId) => ({
    url: `${backendDomain}/api/deals/broker/draft/${dealId}/complete`,
    method: "put",
  }),

  getDeals: (page = 1, limit = 10, companyId = null) => {
    let url = `${backendDomain}/api/deals?page=${page}&limit=${limit}`;
    if (companyId) {
      url += `&companyId=${encodeURIComponent(companyId)}`;
    }
    return {
      url,
      method: "get",
    };
  },

  getDealDetails: (id) => ({
    url: `${backendDomain}/api/deals/${id}`,
    method: "get",
  }),

  updateDealStatus: (id) => ({
    url: `${backendDomain}/api/deals/${id}/status`,
    method: "patch",
  }),

  acceptDeal: (id) => ({
    url: `${backendDomain}/api/deals/${id}/accept`,
    method: "post",
  }),

  rejectDeal: (id) => ({
    url: `${backendDomain}/api/deals/${id}/reject`,
    method: "post",
  }),

  recreateExpiredDeal: (id) => ({
    url: `${backendDomain}/api/deals/${id}/recreate`,
    method: "post",
  }),

  getExpiredDeals: (page = 1, limit = 10, companyId = null) => {
    let url = `${backendDomain}/api/deals/expired?page=${page}&limit=${limit}`;
    if (companyId) {
      url += `&companyId=${encodeURIComponent(companyId)}`;
    }
    return {
      url,
      method: "get",
    };
  },

  /* ================= CATEGORIES ================= */
  createCategory: {
    url: `${backendDomain}/api/categories`,
    method: "post",
  },

  getCategories: (companyId, status) => {
    let query = `?companyId=${companyId}`;
    if (status) query += `&status=${status}`;
    return {
      url: `${backendDomain}/api/categories${query}`,
      method: "get",
    };
  },

  getSingleCategory: (id, companyId) => ({
    url: `${backendDomain}/api/categories/${id}?companyId=${companyId}`,
    method: "get",
  }),

  updateCategory: (id, companyId) => ({
    url: `${backendDomain}/api/categories/${id}?companyId=${companyId}`,
    method: "put",
  }),

  deleteCategory: (id, companyId) => ({
    url: `${backendDomain}/api/categories/${id}?companyId=${companyId}`,
    method: "delete",
  }),

  /* ================= SUBCATEGORIES ================= */
  createSubCategory: {
    url: `${backendDomain}/api/subcategories`,
    method: "post",
  },

  getSubCategories: (companyId, categoryId, status) => {
    let query = `?companyId=${companyId}`;
    if (categoryId) query += `&categoryId=${categoryId}`;
    if (status) query += `&status=${status}`;
    return {
      url: `${backendDomain}/api/subcategories${query}`,
      method: "get",
    };
  },

  updateSubCategory: (id, companyId) => {
    let url = `${backendDomain}/api/subcategories/${id}`;
    if (companyId) {
      url += `?companyId=${companyId}`;
    }
    return {
      url,
      method: "put",
    };
  },

  deleteSubCategory: (id, companyId) => {
    let url = `${backendDomain}/api/subcategories/${id}`;
    if (companyId) {
      url += `?companyId=${companyId}`;
    }
    return {
      url,
      method: "delete",
    };
  },

  /* ================= PRODUCTS ================= */
  createProduct: {
    url: `${backendDomain}/api/products`,
    method: "post",
  },

  getProducts: (companyId, categoryId, subCategoryId, status) => {
    let query = `?companyId=${companyId}`;
    if (categoryId) query += `&categoryId=${categoryId}`;
    if (subCategoryId) query += `&subCategoryId=${subCategoryId}`;
    if (status) query += `&status=${status}`;
    return {
      url: `${backendDomain}/api/products${query}`,
      method: "get",
    };
  },

  updateProduct: (id, companyId) => {
    let url = `${backendDomain}/api/products/${id}`;
    if (companyId) url += `?companyId=${companyId}`;
    return {
      url,
      method: "put",
    };
  },

  deleteProduct: (id, companyId) => {
    let url = `${backendDomain}/api/products/${id}`;
    if (companyId) url += `?companyId=${companyId}`;
    return {
      url,
      method: "delete",
    };
  },

  /* ================= UNITS ================= */
  getUnits: (status) => {
    let query = "";
    if (status) query += `?status=${status}`;
    return {
      url: `${backendDomain}/api/units${query}`,
      method: "get",
    };
  },

  getUnitDetails: (id) => ({
    url: `${backendDomain}/api/units/${id}`,
    method: "get",
  }),

  /* ================= CONTACTS ================= */
  filterContacts: {
    url: `${backendDomain}/api/contacts/filter`,
    method: "post",
  },

  getCompaniesByNumber: (mobileNumber) => ({
    url: `${backendDomain}/api/contacts/companies-by-number?mobileNumber=${encodeURIComponent(mobileNumber)}`,
    method: "get",
  }),

  inviteDeal: {
    url: `${backendDomain}/api/contacts/invite-deal`,
    method: "post",
  },

  getPendingInvitations: {
    url: `${backendDomain}/api/contacts/invitations/pending`,
    method: "get",
  },

  /* ================= CHAT APIs ================= */
  getConversations: (page = 1, limit = 10) => ({
    url: `${backendDomain}/api/chat/conversations?page=${page}&limit=${limit}`,
    method: "get",
  }),

  getConversationMessages: (conversationId, page = 1, limit = 50) => ({
    url: `${backendDomain}/api/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    method: "get",
  }),

  markConversationAsRead: (conversationId) => ({
    url: `${backendDomain}/api/chat/conversations/${conversationId}/read`,
    method: "put",
  }),

  createConversation: {
    url: `${backendDomain}/api/chat/conversations`,
    method: "post",
  },

  sendMessage: (conversationId) => ({
    url: `${backendDomain}/api/chat/conversations/${conversationId}/messages`,
    method: "post",
  }),

  /* ================= PAYMENT APIs ================= */
  recordPayment: {
    url: `${backendDomain}/api/payment`,
    method: "post",
  },

  getPayments: (params = {}) => {
    let query = "";
    const queryParams = [];
    if (params.companyId) queryParams.push(`companyId=${encodeURIComponent(params.companyId)}`);
    if (params.dealId) queryParams.push(`dealId=${encodeURIComponent(params.dealId)}`);
    if (params.type) queryParams.push(`type=${encodeURIComponent(params.type)}`);
    if (params.role) queryParams.push(`role=${encodeURIComponent(params.role)}`);
    if (params.status) queryParams.push(`status=${encodeURIComponent(params.status)}`);
    if (params.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
    if (params.sortBy) queryParams.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
    if (params.page) queryParams.push(`page=${params.page}`);
    if (params.limit) queryParams.push(`limit=${params.limit}`);

    if (queryParams.length > 0) {
      query = `?${queryParams.join("&")}`;
    }
    return {
      url: `${backendDomain}/api/payment${query}`,
      method: "get",
    };
  },

  getPaymentDashboard: (companyId = "", dealId = "") => {
    let query = "";
    const queryParams = [];
    if (companyId) queryParams.push(`companyId=${encodeURIComponent(companyId)}`);
    if (dealId) queryParams.push(`dealId=${encodeURIComponent(dealId)}`);

    if (queryParams.length > 0) {
      query = `?${queryParams.join("&")}`;
    }
    return {
      url: `${backendDomain}/api/payment/dashboard${query}`,
      method: "get",
    };
  },

  updatePaymentStatus: (id) => ({
    url: `${backendDomain}/api/payment/${id}/status`,
    method: "patch",
  }),

  /* ================= DELIVERY APIs ================= */
  createDelivery: {
    url: `${backendDomain}/api/delivery`,
    method: "post",
  },

  getDeliveries: (params = {}) => {
    let query = "";
    const queryParams = [];
    if (params.dealId) queryParams.push(`dealId=${encodeURIComponent(params.dealId)}`);
    if (params.type) queryParams.push(`type=${encodeURIComponent(params.type)}`);
    if (params.status) queryParams.push(`status=${encodeURIComponent(params.status)}`);
    if (params.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
    if (params.companyId) queryParams.push(`companyId=${encodeURIComponent(params.companyId)}`);
    if (params.page) queryParams.push(`page=${params.page}`);
    if (params.limit) queryParams.push(`limit=${params.limit}`);

    if (queryParams.length > 0) {
      query = `?${queryParams.join("&")}`;
    }
    return {
      url: `${backendDomain}/api/delivery${query}`,
      method: "get",
    };
  },

  updateDeliveryStatus: (id) => ({
    url: `${backendDomain}/api/delivery/${id}/status`,
    method: "patch",
  }),

  /* ================= BROKER ONBOARDING APIs ================= */
  searchCounterpartyUser: (mobileNumber) => ({
    url: `${backendDomain}/api/broker-onboard/search-user?mobileNumber=${encodeURIComponent(mobileNumber)}`,
    method: "get",
  }),

  assistedCreateBusiness: {
    url: `${backendDomain}/api/broker-onboard/create-business`,
    method: "post",
  },

  getBrokerOnboardQueue: {
    url: `${backendDomain}/api/broker-onboard/my-queue`,
    method: "get",
  },

  getBrokerMyDeals: (companyId = null) => {
    let url = `${backendDomain}/api/broker-onboard/my-deal`;
    if (companyId) {
      url += `?companyId=${encodeURIComponent(companyId)}`;
    }
    return {
      url,
      method: "get",
    };
  },

  editPendingBusiness: (id) => ({
    url: `${backendDomain}/api/broker-onboard/edit-business/${id}`,
    method: "put",
  }),

  resendWhatsAppInvite: (id) => ({
    url: `${backendDomain}/api/broker-onboard/resend-invite/${id}`,
    method: "post",
  }),

  cancelBrokerOnboard: (id) => ({
    url: `${backendDomain}/api/broker-onboard/cancel-onboard/${id}`,
    method: "post",
  }),

  getPendingVerificationStatus: {
    url: `${backendDomain}/api/broker-onboard/pending-verification`,
    method: "get",
  },

  verifyAccount: {
    url: `${backendDomain}/api/broker-onboard/verify-account`,
    method: "post",
  },

  completeCompanyProfile: {
    url: `${backendDomain}/api/broker-onboard/complete-company`,
    method: "patch",
  },

  verifyProducts: {
    url: `${backendDomain}/api/broker-onboard/verify-products`,
    method: "patch",
  },

  verifyOwnership: {
    url: `${backendDomain}/api/broker-onboard/verify`,
    method: "patch",
  },
};

export default SummaryApi;
