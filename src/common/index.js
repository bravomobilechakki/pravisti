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

  getDeals: (page = 1, limit = 10) => ({
    url: `${backendDomain}/api/deals?page=${page}&limit=${limit}`,
    method: "get",
  }),

  getDealDetails: (id) => ({
    url: `${backendDomain}/api/deals/${id}`,
    method: "get",
  }),

  updateDealStatus: (id) => ({
    url: `${backendDomain}/api/deals/${id}/status`,
    method: "put",
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

  getExpiredDeals: (page = 1, limit = 10) => ({
    url: `${backendDomain}/api/deals/expired?page=${page}&limit=${limit}`,
    method: "get",
  }),

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
};

export default SummaryApi;
