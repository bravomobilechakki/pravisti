// import Config from "react-native-config"; // Uncomment this if you install react-native-config
const backendDomain = "https://api.pravisti.com";

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

  verifyOTP: {
    url: `${backendDomain}/api/auth/verify-otp`,
    method: "post",
  },

  staffLogin: {
    url: `${backendDomain}/api/production/staff/login`,
    method: "post",
  },
  staffOnboard: {
    url: `${backendDomain}/api/staff/onboard`,
    method: "post",
  },
  getStaffList: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/staff${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  getStaffProfile: {
    url: `${backendDomain}/api/staff/profile`,
    method: "get",
  },
  changeStaffPassword: {
    url: `${backendDomain}/api/staff/change-password`,
    method: "put",
  },
  getStaffDashboardStats: {
    url: `${backendDomain}/api/staff/dashboard-stats`,
    method: "get",
  },

  logOut: {
    url: `${backendDomain}/api/auth/logout`,
    method: "post",
  },

  getUserProfile: {
    url: `${backendDomain}/api/users/profile`,
    method: "get",
  },
  updateUserProfile: {
    url: `${backendDomain}/api/users/profile`,
    method: "put",
  },

  /* ================= INDUSTRIES ================= */
  getIndustries: {
    url: `${backendDomain}/api/v1/industries`,
    method: "get",
  },
  createIndustry: {
    url: `${backendDomain}/api/industries`,
    method: "post",
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

  /* ================= PROJECTS & JOBS ================= */
  createProject: {
    url: `${backendDomain}/api/projects`,
    method: "post",
  },
  getProjects: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.dealId) query.append('dealId', params.dealId);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/projects${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  getProjectDetails: (id) => ({
    url: `${backendDomain}/api/projects/${id}`,
    method: "get",
  }),
  updateProject: (id) => ({
    url: `${backendDomain}/api/projects/${id}`,
    method: "patch",
  }),
  deleteProject: (id) => ({
    url: `${backendDomain}/api/projects/${id}`,
    method: "delete",
  }),
  addProjectStage: (id) => ({
    url: `${backendDomain}/api/projects/${id}/stages`,
    method: "post",
  }),
  reorderProjectStages: (id) => ({
    url: `${backendDomain}/api/projects/${id}/stages/reorder`,
    method: "patch",
  }),
  addProjectMilestone: (id, stageId) => ({
    url: `${backendDomain}/api/projects/${id}/stages/${stageId}/milestones`,
    method: "post",
  }),
  reorderProjectMilestones: (id, stageId) => ({
    url: `${backendDomain}/api/projects/${id}/stages/${stageId}/milestones/reorder`,
    method: "patch",
  }),
  addProjectTask: (id, stageId, milestoneId) => ({
    url: `${backendDomain}/api/projects/${id}/stages/${stageId}/milestones/${milestoneId}/tasks`,
    method: "post",
  }),
  updateProjectTaskStatus: (id, taskId) => ({
    url: `${backendDomain}/api/projects/${id}/tasks/${taskId}/status`,
    method: "patch",
  }),
  getMyAssignedTasks: (status = null) => ({
    url: `${backendDomain}/api/projects/my-tasks${status ? `?status=${status}` : ''}`,
    method: "get",
  }),

  /* ================= MATERIALS & DEMANDS ================= */
  allocateProjectMaterial: (projectId) => ({
    url: `${backendDomain}/api/projects/${projectId}/materials`,
    method: "post",
  }),
  deleteProjectMaterial: (projectId, materialId) => ({
    url: `${backendDomain}/api/projects/${projectId}/materials/${materialId}`,
    method: "delete",
  }),
  raiseProjectDemand: (projectId) => ({
    url: `${backendDomain}/api/projects/${projectId}/demands`,
    method: "post",
  }),
  getProjectDemands: (projectId) => ({
    url: `${backendDomain}/api/projects/${projectId}/demands`,
    method: "get",
  }),
  getAllDemands: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.urgency) query.append('urgency', params.urgency);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/projects/demands/all${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  fulfillProjectDemand: (projectId, demandId) => ({
    url: `${backendDomain}/api/projects/${projectId}/demands/${demandId}/fulfill`,
    method: "patch",
  }),

  /* ================= PROJECT ANALYTICS & REPORTS ================= */
  getProjectProgressAnalytics: (projectId) => ({
    url: `${backendDomain}/api/projects/${projectId}/progress-analytics`,
    method: "get",
  }),
  getProjectDelayReport: (projectId) => ({
    url: `${backendDomain}/api/projects/${projectId}/delay-report`,
    method: "get",
  }),
  getGlobalAccountabilityAnalytics: {
    url: `${backendDomain}/api/projects/analytics/accountability`,
    method: "get",
  },
  getHistoricalProjectInsights: {
    url: `${backendDomain}/api/projects/insights/historical`,
    method: "get",
  },

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

  getDeals: (page = 1, limit = 50, companyId = null, status = null) => {
    let url = `${backendDomain}/api/deals?limit=${limit}`;
    if (page && page > 1) {
      url += `&page=${page}`;
    }
    if (companyId) {
      url += `&companyId=${encodeURIComponent(companyId)}`;
    }
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
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

  getRecreatedDeals: (page = 1, limit = 10, companyId = null) => {
    let url = `${backendDomain}/api/deals/recreated?page=${page}&limit=${limit}`;
    if (companyId) {
      url += `&companyId=${encodeURIComponent(companyId)}`;
    }
    return {
      url,
      method: "get",
    };
  },

  deleteDeal: (id) => ({
    url: `${backendDomain}/api/deals/${id}`,
    method: "delete",
  }),


  /* ================= CATEGORIES ================= */
  createCategory: {
    url: `${backendDomain}/api/categories`,
    method: "post",
  },

  getCategories: (companyId, status) => {
    const params = [];
    if (companyId && companyId !== 'all' && companyId !== 'undefined' && companyId !== 'null') {
      params.push(`companyId=${companyId}`);
    }
    if (status && status !== 'undefined' && status !== 'null') {
      params.push(`status=${status}`);
    }
    const query = params.length > 0 ? `?${params.join('&')}` : '';
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
    const params = [];
    if (companyId && companyId !== 'all' && companyId !== 'undefined' && companyId !== 'null') {
      params.push(`companyId=${companyId}`);
    }
    if (categoryId && categoryId !== 'all' && categoryId !== 'undefined' && categoryId !== 'null') {
      params.push(`categoryId=${categoryId}`);
    }
    if (status && status !== 'undefined' && status !== 'null') {
      params.push(`status=${status}`);
    }
    const query = params.length > 0 ? `?${params.join('&')}` : '';
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
    const params = [];
    if (companyId && companyId !== 'all' && companyId !== 'undefined' && companyId !== 'null') {
      params.push(`companyId=${companyId}`);
    }
    if (categoryId && categoryId !== 'all' && categoryId !== 'undefined' && categoryId !== 'null') {
      params.push(`categoryId=${categoryId}`);
    }
    if (subCategoryId && subCategoryId !== 'all' && subCategoryId !== 'undefined' && subCategoryId !== 'null') {
      params.push(`subCategoryId=${subCategoryId}`);
    }
    if (status && status !== 'undefined' && status !== 'null') {
      params.push(`status=${status}`);
    }
    const query = params.length > 0 ? `?${params.join('&')}` : '';
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

  createUnit: {
    url: `${backendDomain}/api/units`,
    method: "post",
  },

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
  getConversations: (page = 1, limit = 10, companyId = '') => ({
    url: companyId
      ? `${backendDomain}/api/chat/conversations?page=${page}&limit=${limit}&companyId=${companyId}`
      : `${backendDomain}/api/chat/conversations?page=${page}&limit=${limit}`,
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

  /* ================= ONBOARDING APIs ================= */
  searchCounterpartyUser: (mobileNumber) => ({
    url: `${backendDomain}/api/onboarding/search-user?mobileNumber=${encodeURIComponent(mobileNumber)}`,
    method: "get",
  }),

  assistedCreateBusiness: {
    url: `${backendDomain}/api/onboarding/create-business`,
    method: "post",
  },

  getBrokerOnboardQueue: (companyId = null) => {
    let url = `${backendDomain}/api/onboarding/queue`;
    const cleanId = (typeof companyId === 'object' && companyId !== null) ? (companyId._id || companyId.id || companyId.companyId) : companyId;
    if (cleanId && cleanId !== 'null' && cleanId !== 'undefined' && String(cleanId) !== '[object Object]') {
      url += `?companyId=${encodeURIComponent(cleanId)}`;
    }
    return {
      url,
      method: "get",
    };
  },

  getBrokerMyDeals: (companyId = null) => {
    let url = `${backendDomain}/api/onboarding/onboarded-users`;
    const cleanId = (typeof companyId === 'object' && companyId !== null) ? (companyId._id || companyId.id || companyId.companyId) : companyId;
    if (cleanId && cleanId !== 'null' && cleanId !== 'undefined' && String(cleanId) !== '[object Object]') {
      url += `?companyId=${encodeURIComponent(cleanId)}`;
    }
    return {
      url,
      method: "get",
    };
  },

  editPendingBusiness: (id) => ({
    url: `${backendDomain}/api/onboarding/edit-business/${id}`,
    method: "put",
  }),

  resendWhatsAppInvite: (id) => ({
    url: `${backendDomain}/api/onboarding/resend-invite/${id}`,
    method: "post",
  }),

  cancelBrokerOnboard: (id) => ({
    url: `${backendDomain}/api/onboarding/cancel-onboard/${id}`,
    method: "post",
  }),

  getPendingVerificationStatus: {
    url: `${backendDomain}/api/onboarding/pending-verification`,
    method: "get",
  },

  verifyAccount: {
    url: `${backendDomain}/api/onboarding/verify-account`,
    method: "post",
  },

  completeCompanyProfile: {
    url: `${backendDomain}/api/onboarding/complete-company`,
    method: "patch",
  },

  verifyProducts: {
    url: `${backendDomain}/api/onboarding/verify-products`,
    method: "patch",
  },

  verifyOwnership: {
    url: `${backendDomain}/api/onboarding/verify`,
    method: "patch",
  },

  /* ================= VOICE ASSISTANT ================= */
  processVoiceCommand: {
    url: `${backendDomain}/api/v1/voice/process`,
    method: "post",
  },

  getVoicePreferences: {
    url: `${backendDomain}/api/v1/voice/preferences`,
    method: "get",
  },

  updateVoicePreferences: {
    url: `${backendDomain}/api/v1/voice/preferences`,
    method: "put",
  },

  /* ================= UPLOAD APIs ================= */
  uploadSingle: {
    url: `${backendDomain}/api/upload/single`,
    method: "post",
  },

  uploadMultiple: {
    url: `${backendDomain}/api/upload/multiple`,
    method: "post",
  },

  deleteUpload: (filename) => ({
    url: `${backendDomain}/api/upload/${filename}`,
    method: "delete",
  }),

  /* ================= NOTIFICATIONS ================= */
  getUserNotifications: (companyId = null) => ({
    url: companyId
      ? `${backendDomain}/api/v1/notifications?companyId=${companyId}`
      : `${backendDomain}/api/v1/notifications`,
    method: "get",
  }),

  markNotificationAsRead: (id) => ({
    url: `${backendDomain}/api/v1/notifications/${id}/read`,
    method: "put",
  }),

  markAllNotificationsAsRead: {
    url: `${backendDomain}/api/v1/notifications/mark-all-read`,
    method: "put",
  },

  clearAllNotifications: {
    url: `${backendDomain}/api/v1/notifications/clear-all`,
    method: "delete",
  },

  /* ================= BANNERS ================= */
  getActiveBanners: (industryId = null) => ({
    url: industryId
      ? `${backendDomain}/api/banners?industryId=${industryId}`
      : `${backendDomain}/api/banners`,
    method: "get",
  }),

  /* ================= PRAVISTI AI BOT ================= */
  botChat: {
    url: `${backendDomain}/api/v1/bot/chat`,
    method: "post",
  },
  getBotConversations: (limit = 20, page = 1) => ({
    url: `${backendDomain}/api/v1/bot/conversations?limit=${limit}&page=${page}`,
    method: "get",
  }),
  createBotConversation: {
    url: `${backendDomain}/api/v1/bot/conversations`,
    method: "post",
  },
  getBotConversation: (id) => ({
    url: `${backendDomain}/api/v1/bot/conversations/${id}`,
    method: "get",
  }),
  deleteBotConversation: (id) => ({
    url: `${backendDomain}/api/v1/bot/conversations/${id}`,
    method: "delete",
  }),
  clearBotAction: (id) => ({
    url: `${backendDomain}/api/v1/bot/conversations/${id}/clear-action`,
    method: "post",
  }),

  /* ================= PRODUCTION MATERIALS (RAW MATERIALS) ================= */
  getProductionMaterials: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/materials${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  createProductionMaterial: {
    url: `${backendDomain}/api/production/materials`,
    method: "post",
  },
  updateProductionMaterial: (id, companyId) => ({
    url: `${backendDomain}/api/production/materials/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  deleteProductionMaterial: (id, companyId) => ({
    url: `${backendDomain}/api/production/materials/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),

  /* ================= PRODUCT DETAILS & RAW MATERIAL LINKAGE ================= */
  getProductDetails: (id, companyId) => ({
    url: `${backendDomain}/api/products/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "get",
  }),
  linkProductRawMaterial: (id) => ({
    url: `${backendDomain}/api/products/${id}/raw-materials/add`,
    method: "patch",
  }),
  removeProductRawMaterial: (id, materialId, companyId) => ({
    url: `${backendDomain}/api/products/${id}/raw-materials/remove/${materialId}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "patch",
  }),
  reviewProduct: (id) => ({
    url: `${backendDomain}/api/products/${id}/review`,
    method: "patch",
  }),
  uploadProductImage: (id) => ({
    url: `${backendDomain}/api/products/${id}/image`,
    method: "post",
  }),
  uploadProductImages: (id) => ({
    url: `${backendDomain}/api/products/${id}/images`,
    method: "post",
  }),

  /* ================= PRODUCTION MATERIAL DEMANDS ================= */
  raiseProductionDemand: {
    url: `${backendDomain}/api/production/transactions/demands`,
    method: "post",
  },
  getProductionDemands: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.status) query.append('status', params.status);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/transactions/demands${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  reviewProductionDemand: (id, companyId) => ({
    url: `${backendDomain}/api/production/transactions/demands/${id}/review${companyId ? `?companyId=${companyId}` : ''}`,
    method: "patch",
  }),

  /* ================= PRODUCTION TRANSACTIONS ================= */
  issueProductionMaterial: {
    url: `${backendDomain}/api/production/transactions/issues`,
    method: "post",
  },
  receiveProductionMaterial: {
    url: `${backendDomain}/api/production/transactions/receipts`,
    method: "post",
  },
  consumeProductionMaterial: {
    url: `${backendDomain}/api/production/transactions/consumptions`,
    method: "post",
  },

  /* ================= PRODUCTION INVENTORY & ADJUST STOCK ================= */
  getProductionInventory: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.warehouse) query.append('warehouse', params.warehouse);
    if (params.materialId) query.append('materialId', params.materialId);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/inventory${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  adjustProductionStock: {
    url: `${backendDomain}/api/production/inventory/adjust-stock`,
    method: "post",
  },

  /* ================= PRODUCTION SUMMARY & COSTING ================= */
  getProjectProductionSummary: (projectId, companyId) => ({
    url: `${backendDomain}/api/production/summary/projects/${projectId}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "get",
  }),
  getProductionDashboardStats: (companyId) => ({
    url: `${backendDomain}/api/production/summary/dashboard/stats${companyId ? `?companyId=${companyId}` : ''}`,
    method: "get",
  }),

  /* ================= PRODUCTION STAFF MANAGEMENT ================= */
  productionStaffLogin: {
    url: `${backendDomain}/api/production/staff/login`,
    method: "post",
  },
  authStaffLogin: {
    url: `${backendDomain}/api/auth/staff-login`,
    method: "post",
  },
  authMe: {
    url: `${backendDomain}/api/auth/me`,
    method: "get",
  },
  productionStaffOnboard: {
    url: `${backendDomain}/api/production/staff/onboard`,
    method: "post",
  },
  getProductionStaffMembers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.status) query.append('status', params.status);
    if (params.role) query.append('role', params.role);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/staff/members${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  getStaffMembers: (companyId) => ({
    url: `${backendDomain}/api/production/staff/members${companyId ? `?companyId=${companyId}` : ''}`,
    method: "get",
  }),
  updateProductionStaffMember: (id, companyId) => ({
    url: `${backendDomain}/api/production/staff/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  deleteProductionStaffMember: (id, companyId) => ({
    url: `${backendDomain}/api/production/staff/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),
  assignProductionStaff: {
    url: `${backendDomain}/api/production/staff-assignments`,
    method: "post",
  },
  getProductionStaffAssignments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.stageId) query.append('stageId', params.stageId);
    if (params.milestoneId) query.append('milestoneId', params.milestoneId);
    if (params.staffId) query.append('staffId', params.staffId);
    if (params.status) query.append('status', params.status);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/staff-assignments${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  updateProductionStaffAssignment: (id, companyId) => ({
    url: `${backendDomain}/api/production/staff-assignments/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  deleteProductionStaffAssignment: (id, companyId) => ({
    url: `${backendDomain}/api/production/staff-assignments/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),
  getProductionProjects: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/projects${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  createProductionProject: {
    url: `${backendDomain}/api/production/projects`,
    method: "post",
  },
  getProductionProjectDetails: (id, companyId, hierarchy = true) => {
    const query = new URLSearchParams();
    if (companyId) query.append('companyId', companyId);
    if (hierarchy) query.append('hierarchy', 'true');
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/projects/${id}${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  updateProductionProject: (id, companyId) => ({
    url: `${backendDomain}/api/production/projects/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  deleteProductionProject: (id, companyId) => ({
    url: `${backendDomain}/api/production/projects/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),

  /* ================= PRODUCTION STAGES ================= */
  createProductionStage: {
    url: `${backendDomain}/api/production/stages`,
    method: "post",
  },
  getProductionStages: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.status) query.append('status', params.status);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/stages${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  updateProductionStage: (id, companyId) => ({
    url: `${backendDomain}/api/production/stages/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  deleteProductionStage: (id, companyId) => ({
    url: `${backendDomain}/api/production/stages/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),

  /* ================= PRODUCTION MILESTONES ================= */
  createProductionMilestone: {
    url: `${backendDomain}/api/production/milestones`,
    method: "post",
  },
  getProductionMilestones: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.stageId) query.append('stageId', params.stageId);
    if (params.status) query.append('status', params.status);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/milestones${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  updateProductionMilestone: (id, companyId) => ({
    url: `${backendDomain}/api/production/milestones/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  deleteProductionMilestone: (id, companyId) => ({
    url: `${backendDomain}/api/production/milestones/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),

  /* ================= PRODUCTION TASKS ================= */
  getProductionTasks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.stageId) query.append('stageId', params.stageId);
    if (params.milestoneId) query.append('milestoneId', params.milestoneId);
    if (params.assignedStaffId || params.staffId) query.append('assignedStaffId', params.assignedStaffId || params.staffId);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/tasks${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  createProductionTask: {
    url: `${backendDomain}/api/production/tasks`,
    method: "post",
  },
  updateProductionTask: (id, companyId) => ({
    url: `${backendDomain}/api/production/tasks/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  updateProductionTaskStatus: (id, companyId) => ({
    url: `${backendDomain}/api/production/tasks/${id}/status${companyId ? `?companyId=${companyId}` : ''}`,
    method: "patch",
  }),
  deleteProductionTask: (id, companyId) => ({
    url: `${backendDomain}/api/production/tasks/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),

  /* ================= PRODUCTION TIME TRACKING & LABOR LOGS ================= */
  createProductionTimeLog: {
    url: `${backendDomain}/api/production/time-logs`,
    method: "post",
  },
  getProductionTimeLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.companyId) query.append('companyId', params.companyId);
    if (params.staffId) query.append('staffId', params.staffId);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.stageId) query.append('stageId', params.stageId);
    if (params.milestoneId) query.append('milestoneId', params.milestoneId);
    if (params.taskId) query.append('taskId', params.taskId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    return {
      url: `${backendDomain}/api/production/time-logs${qs ? `?${qs}` : ''}`,
      method: "get",
    };
  },
  updateProductionTimeLog: (id, companyId) => ({
    url: `${backendDomain}/api/production/time-logs/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "put",
  }),
  deleteProductionTimeLog: (id, companyId) => ({
    url: `${backendDomain}/api/production/time-logs/${id}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "delete",
  }),

  /* ================= STAFF MATERIAL DEMAND & ISSUANCE ================= */
  staffRaiseMaterialDemand: {
    url: `${backendDomain}/api/production/transactions/demand`,
    method: "post",
  },
  staffIssueMaterial: {
    url: `${backendDomain}/api/production/transactions/issue`,
    method: "post",
  },

  /* ================= STAFF ANALYTICS & LABOR COSTING ================= */
  getProjectLaborCosting: (projectId, companyId) => ({
    url: `${backendDomain}/api/production/summary/costing/${projectId}${companyId ? `?companyId=${companyId}` : ''}`,
    method: "get",
  }),
};

export { backendDomain };
export default SummaryApi;

