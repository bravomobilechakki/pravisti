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

  /* ================= USER PROFILE ================= */
  getUserProfile: {
    url: `${backendDomain}/api/auth/me`,
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

  recreateExpiredDeal: (id) => ({
    url: `${backendDomain}/api/deals/${id}/recreate`,
    method: "post",
  }),

  getExpiredDeals: (page = 1, limit = 10) => ({
    url: `${backendDomain}/api/deals/expired?page=${page}&limit=${limit}`,
    method: "get",
  }),
};

export default SummaryApi;
