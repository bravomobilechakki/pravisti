import AsyncStorage from '@react-native-async-storage/async-storage';
import SummaryApi from '../common';
import { contactsInGroup } from 'react-native-contacts';

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

const fetchWithTimeout = async (url, options, timeoutMs = null, maxRetries = 1) => {
  // If this is an auth endpoint, give it 35s because it wakes up idle Cloud Run containers & sends WhatsApp OTPs
  const isAuthEndpoint = typeof url === 'string' && (url.includes('/auth/') || url.includes('/login') || url.includes('/verify-otp') || url.includes('/signup'));
  const baseTimeout = timeoutMs || (isAuthEndpoint ? 35000 : 20000);
  // Auth endpoints (login, verify-otp, signup) must NEVER be auto-retried behind the scenes.
  // Reason: If verify-otp is retried, attempt 0 consumes/deletes the OTP on the server, so attempt 1 fails with "No OTP found, please request OTP".
  // Similarly, retrying sendOTP creates a duplicate OTP and overwrites the active one.
  const effectiveRetries = isAuthEndpoint ? 0 : maxRetries;

  for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
    const controller = new AbortController();
    const currentTimeout = attempt === 0 ? baseTimeout : Math.max(baseTimeout, 28000);
    const timer = setTimeout(() => controller.abort(), currentTimeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError';
      const isNetworkFailed = err.message && err.message.toLowerCase().includes('network request failed');

      if ((isTimeout || isNetworkFailed) && attempt < effectiveRetries) {
        console.warn(`[API] Request to ${url} timed out/failed on attempt ${attempt + 1}. Retrying in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }




      if (isTimeout) {
        throw new Error('Server took too long to respond. Server may be waking up — please tap again.');
      }
      throw err;
    }
  }
};





/**
 * Robust token retrieval helper
 */
const getToken = async (token = null) => {
  let raw = token;
  if (!raw) {
    try {
      raw = (await AsyncStorage.getItem('userToken')) ||
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('authToken')) ||
        (await AsyncStorage.getItem('jwtToken'));
    } catch (e) {
      console.warn('Failed to retrieve active token:', e);
    }
  }
  if (!raw) return null;
  const str = String(raw).trim();
  return str.startsWith('Bearer ') ? str.slice(7).trim() : str;
};

/**
 * Standard POST request helper
 */
const postRequest = async (apiConfig, body, token = null, customHeaders = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  const activeToken = await getToken(token);
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
const getRequest = async (apiConfig, token = null, timeoutMs = null, customHeaders = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  const activeToken = await getToken(token);
  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const response = await fetchWithTimeout(apiConfig.url, {
    method: apiConfig.method || 'GET',
    headers,
  }, timeoutMs);
  return await handleResponse(response);
};

/**
 * Standard PATCH request helper
 */
const patchRequest = async (apiConfig, body, token = null, customHeaders = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  const activeToken = await getToken(token);
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

/**
 * Standard PUT request helper
 */
const putRequest = async (apiConfig, body, token = null, customHeaders = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  const activeToken = await getToken(token);
  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const response = await fetchWithTimeout(apiConfig.url, {
    method: apiConfig.method || 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  return await handleResponse(response);
};

/**
 * Standard DELETE request helper
 */
const deleteRequest = async (apiConfig, bodyOrToken = null, token = null, customHeaders = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  let body = null;
  let rawToken = null;

  if (typeof bodyOrToken === 'string') {
    rawToken = bodyOrToken;
  } else if (bodyOrToken && typeof bodyOrToken === 'object') {
    body = bodyOrToken;
    rawToken = token;
  } else if (token) {
    rawToken = token;
  }

  const activeToken = await getToken(rawToken);
  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const fetchOptions = {
    method: apiConfig.method || 'DELETE',
    headers,
  };
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetchWithTimeout(apiConfig.url, fetchOptions);
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
    const cleanMobile = String(mobileNumber || '').replace(/\D/g, '').slice(-10);
    console.log(`Logging in via OTP sending to: ${SummaryApi.sendOTP.url} for ${cleanMobile}`);
    return await postRequest(SummaryApi.sendOTP, {
      mobileNumber: cleanMobile
    });
  } catch (error) {
    console.error('Error in loginUser:', error.message || error);
    throw error;
  }
};

export const verifyOtp = async (mobileNumber, otp) => {
  try {
    const cleanMobile = String(mobileNumber || '').replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp || '').trim();
    return await postRequest(SummaryApi.verifyOTP, {
      mobileNumber: cleanMobile,
      otp: cleanOtp
    });
  } catch (error) {
    console.error('Error verifying OTP:', error.message || error);
    throw error;
  }
};

export const staffLoginUser = async (mobileNumber, password) => {
  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '').slice(-10);
  const cleanPass = String(password || '').trim() || cleanMobile;

  try {
    return await postRequest(SummaryApi.staffLogin, {
      mobileNumber: cleanMobile,
      password: cleanPass,
    });
  } catch (error) {
    // If dedicated staff-login endpoint fails or is not yet deployed, fallback to auth login with password
    try {
      return await postRequest(SummaryApi.sendOTP, {
        mobileNumber: cleanMobile,
        password: cleanPass,
        role: 'staff',
      });
    } catch (fallbackError) {
      console.error('Error in staffLoginUser:', error.message || fallbackError.message);
      throw error;
    }
  }
};

export const getStaffProfile = async (token = null) => {
  try {
    return await getRequest(SummaryApi.getStaffProfile, token);
  } catch (error) {
    console.warn('Notice fetching staff profile:', error.message || error);
    return { success: false, message: error.message };
  }
};

export const changeStaffPassword = async (currentPassword, newPassword, token = null) => {
  try {
    return await putRequest(SummaryApi.changeStaffPassword, { currentPassword, newPassword }, token);
  } catch (error) {
    console.error('Error changing staff password:', error.message || error);
    throw error;
  }
};

export const getStaffDashboardStats = async (token = null) => {
  try {
    return await getRequest(SummaryApi.getStaffDashboardStats, token);
  } catch (error) {
    console.warn('Notice fetching staff dashboard stats:', error.message || error);
    return { success: false, message: error.message };
  }
};

export const onboardStaff = async (staffData, token = null, companyId = null) => {
  try {
    const rawPhone = (staffData.phone || staffData.mobileNumber || '').toString().trim();
    // Standard 10-digit Indian phone number
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    // Resolve companyId for header and body
    let activeCompanyId = companyId || staffData.companyId;
    if (!activeCompanyId) {
      try {
        activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
          (await AsyncStorage.getItem('activeCompanyId'));
      } catch (e) { }
    }
    if (!activeCompanyId) {
      try {
        const cachedCompsStr = await AsyncStorage.getItem('trader_companies_cache');
        if (cachedCompsStr) {
          const comps = JSON.parse(cachedCompsStr);
          if (Array.isArray(comps) && comps.length > 0) {
            activeCompanyId = comps[0]._id || comps[0].id;
          }
        }
      } catch (e) { }
    }
    if (!activeCompanyId) {
      try {
        const profStr = await AsyncStorage.getItem('user_completed_profile');
        if (profStr) {
          const prof = JSON.parse(profStr);
          if (Array.isArray(prof?.companies) && prof.companies.length > 0) {
            activeCompanyId = prof.companies[0]._id || prof.companies[0].id;
          } else if (prof?.companyId) {
            activeCompanyId = prof.companyId._id || prof.companyId;
          } else if (prof?.company?._id) {
            activeCompanyId = prof.company._id;
          }
        }
      } catch (e) { }
    }
    if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
      activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
    }

    // Backend strictly enforces Joi schema on POST /api/staff/onboard:
    // Allowed body keys: name, phone, email, department, designation, roles
    // Unknown keys (mobileNumber, status, companyId) will cause HTTP 400 rejection!
    // Company context is passed via 'x-company-id' header.
    const cleanPayload = {
      name: (staffData.name || '').trim(),
      phone: cleanPhone,
      department: (staffData.department && staffData.department.trim()) ? staffData.department.trim() : 'Production',
      designation: (staffData.designation && staffData.designation.trim()) ? staffData.designation.trim() : 'Staff',
      roles: Array.isArray(staffData.roles) && staffData.roles.length > 0 ? staffData.roles : ['staff'],
    };

    if (staffData.email && staffData.email.trim() && staffData.email.includes('@')) {
      cleanPayload.email = staffData.email.trim();
    }

    const customHeaders = {};
    if (activeCompanyId) {
      const compIdClean = String(activeCompanyId).trim();
      if (/^[0-9a-fA-F]{24}$/.test(compIdClean)) {
        customHeaders['x-company-id'] = compIdClean;
      }
    }

    console.log('[API] POST /api/staff/onboard payload:', JSON.stringify(cleanPayload), 'headers:', customHeaders);
    return await postRequest(SummaryApi.staffOnboard, cleanPayload, token, customHeaders);
  } catch (error) {
    console.error('Error onboarding staff:', error.message || error);
    throw error;
  }
};

export const getStaffList = async (params = {}, token = null, companyId = null) => {
  try {
    let activeCompanyId = companyId;
    if (!activeCompanyId) {
      try {
        activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
          (await AsyncStorage.getItem('activeCompanyId'));
      } catch (e) { }
    }
    if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
      activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
    }
    const customHeaders = {};
    if (typeof activeCompanyId === 'string' && /^[0-9a-fA-F]{24}$/.test(activeCompanyId)) {
      customHeaders['x-company-id'] = activeCompanyId;
    }
    return await getRequest(SummaryApi.getStaffList(params), token, null, customHeaders);
  } catch (error) {
    console.error('Error fetching staff list:', error.message || error);
    throw error;
  }
};

export const getUserProfile = async (token) => {
  try {
    return await getRequest(SummaryApi.getUserProfile, token);
  } catch (error) {
    console.warn('Notice fetching user profile:', error.message || error);
    return { success: false, message: error.message || 'User does not exist' };
  }
};

export const updateUserProfile = async (profileData, token = null) => {
  try {
    return await putRequest(SummaryApi.updateUserProfile, profileData, token);
  } catch (error) {
    console.error('Error updating user profile:', error.message || error);
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

export const getIndustries = async (token = null) => {
  try {
    return await getRequest(SummaryApi.getIndustries, token);
  } catch (error) {
    try {
      return await getRequest({ url: 'https://api.pravisti.com/api/industries', method: 'get' }, token);
    } catch (fallbackErr) {
      console.error('Error fetching industries:', error.message || error);
      throw error;
    }
  }
};

export const createIndustry = async (industryData, token = null) => {
  try {
    return await postRequest(SummaryApi.createIndustry, industryData, token);
  } catch (error) {
    console.error('Error creating industry:', error.message || error);
    throw error;
  }
};

// --- PROJECTS & JOBS APIs ---

export const createProject = async (projectData, token = null) => {
  try {
    return await postRequest(SummaryApi.createProject, projectData, token);
  } catch (error) {
    console.error('Error creating project:', error.message || error);
    throw error;
  }
};

export const getProjects = async (params = {}, token = null) => {
  try {
    return await getRequest(SummaryApi.getProjects(params), token);
  } catch (error) {
    console.error('Error fetching projects:', error.message || error);
    throw error;
  }
};

export const getProjectDetails = async (id, token = null) => {
  try {
    return await getRequest(SummaryApi.getProjectDetails(id), token);
  } catch (error) {
    console.error('Error fetching project details:', error.message || error);
    throw error;
  }
};

export const updateProject = async (id, projectData, token = null) => {
  try {
    return await patchRequest(SummaryApi.updateProject(id), projectData, token);
  } catch (error) {
    console.error('Error updating project:', error.message || error);
    throw error;
  }
};

export const deleteProject = async (id, token = null) => {
  try {
    return await deleteRequest(SummaryApi.deleteProject(id), null, token);
  } catch (error) {
    console.error('Error deleting project:', error.message || error);
    throw error;
  }
};

export const addProjectStage = async (id, stageData, token = null) => {
  try {
    return await postRequest(SummaryApi.addProjectStage(id), stageData, token);
  } catch (error) {
    console.error('Error adding project stage:', error.message || error);
    throw error;
  }
};

export const reorderProjectStages = async (id, stageOrders, token = null) => {
  try {
    return await patchRequest(SummaryApi.reorderProjectStages(id), { stageOrders }, token);
  } catch (error) {
    console.error('Error reordering project stages:', error.message || error);
    throw error;
  }
};

export const addProjectMilestone = async (id, stageId, milestoneData, token = null) => {
  try {
    return await postRequest(SummaryApi.addProjectMilestone(id, stageId), milestoneData, token);
  } catch (error) {
    console.error('Error adding project milestone:', error.message || error);
    throw error;
  }
};

export const reorderProjectMilestones = async (id, stageId, milestoneOrders, token = null) => {
  try {
    return await patchRequest(SummaryApi.reorderProjectMilestones(id, stageId), { milestoneOrders }, token);
  } catch (error) {
    console.error('Error reordering project milestones:', error.message || error);
    throw error;
  }
};

export const addProjectTask = async (id, stageId, milestoneId, taskData, token = null) => {
  try {
    const cleanPayload = { ...taskData };
    if ('assignedToName' in cleanPayload) {
      delete cleanPayload.assignedToName;
    }
    return await postRequest(SummaryApi.addProjectTask(id, stageId, milestoneId), cleanPayload, token);
  } catch (error) {
    console.error('Error adding project task:', error.message || error);
    throw error;
  }
};

export const updateProjectTaskStatus = async (id, taskId, statusOrPayload, token = null, delayReason = null) => {
  try {
    let payload = {};
    if (typeof statusOrPayload === 'object' && statusOrPayload !== null) {
      payload = statusOrPayload;
    } else {
      payload = { status: statusOrPayload };
      if (delayReason) {
        payload.delayReason = delayReason;
      }
    }
    return await patchRequest(SummaryApi.updateProjectTaskStatus(id, taskId), payload, token);
  } catch (error) {
    console.error('Error updating task status:', error.message || error);
    throw error;
  }
};

export const getMyAssignedTasks = async (status = null, token = null) => {
  try {
    return await getRequest(SummaryApi.getMyAssignedTasks(status), token);
  } catch (error) {
    console.error('Error fetching assigned tasks:', error.message || error);
    throw error;
  }
};

export const allocateProjectMaterial = async (projectId, materialData, token = null) => {
  try {
    return await postRequest(SummaryApi.allocateProjectMaterial(projectId), materialData, token);
  } catch (error) {
    console.error('Error allocating material:', error.message || error);
    throw error;
  }
};

export const deleteProjectMaterial = async (projectId, materialId, token = null) => {
  try {
    return await deleteRequest(SummaryApi.deleteProjectMaterial(projectId, materialId), token);
  } catch (error) {
    console.error('Error deleting allocated material:', error.message || error);
    throw error;
  }
};

export const raiseMaterialDemand = async (projectId, demandData, token = null) => {
  try {
    return await postRequest(SummaryApi.raiseProjectDemand(projectId), demandData, token);
  } catch (error) {
    console.error('Error raising material demand:', error.message || error);
    throw error;
  }
};

export const getProjectDemands = async (projectId, token = null) => {
  try {
    return await getRequest(SummaryApi.getProjectDemands(projectId), token);
  } catch (error) {
    console.error('Error fetching project demands:', error.message || error);
    throw error;
  }
};

export const getAllMaterialDemands = async (params = {}, token = null) => {
  try {
    return await getRequest(SummaryApi.getAllDemands(params), token);
  } catch (error) {
    console.error('Error fetching all material demands:', error.message || error);
    throw error;
  }
};

export const fulfillMaterialDemand = async (projectId, demandId, fulfillData, token = null) => {
  try {
    return await patchRequest(SummaryApi.fulfillProjectDemand(projectId, demandId), fulfillData, token);
  } catch (error) {
    console.error('Error fulfilling material demand:', error.message || error);
    throw error;
  }
};

export const getProjectProgressAnalytics = async (projectId, token = null) => {
  try {
    return await getRequest(SummaryApi.getProjectProgressAnalytics(projectId), token);
  } catch (error) {
    console.error('Error fetching project progress analytics:', error.message || error);
    throw error;
  }
};

export const getProjectDelayReport = async (projectId, token = null) => {
  try {
    return await getRequest(SummaryApi.getProjectDelayReport(projectId), token);
  } catch (error) {
    console.error('Error fetching project delay report:', error.message || error);
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
    console.warn('Notice fetching companies (likely non-admin context):', error.message || error);
    return { success: false, data: { companies: [] }, message: error.message };
  }
};

const companyDetailsCache = new Map();
const inFlightCompanyRequests = new Map();

export const clearCompanyCache = (id) => {
  if (id) {
    companyDetailsCache.delete(String(id).trim());
  } else {
    companyDetailsCache.clear();
  }
};

export const getCompanyDetails = async (id, forceRefresh = false) => {
  try {
    if (!id || id === 'undefined' || id === 'null') {
      return { success: false, message: 'Invalid Company ID' };
    }
    const cleanId = String(id).trim();
    if (!forceRefresh && companyDetailsCache.has(cleanId)) {
      return companyDetailsCache.get(cleanId);
    }
    if (!forceRefresh && inFlightCompanyRequests.has(cleanId)) {
      return await inFlightCompanyRequests.get(cleanId);
    }

    const reqPromise = (async () => {
      try {
        const res = await getRequest(SummaryApi.getCompanyDetails(cleanId));
        if (res && res.success && res.data) {
          companyDetailsCache.set(cleanId, res);
        }
        return res;
      } finally {
        inFlightCompanyRequests.delete(cleanId);
      }
    })();

    inFlightCompanyRequests.set(cleanId, reqPromise);
    return await reqPromise;
  } catch (error) {
    console.warn('Notice fetching company details:', error.message || error);
    return { success: false, message: error.message || 'Company not found' };
  }
};

export const updateCompany = async (id, companyData, token) => {
  try {
    if (id) {
      companyDetailsCache.delete(String(id).trim());
    }
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

export const createBrokerDraftDeal = async (draftData, token) => {
  try {
    return await postRequest(SummaryApi.createBrokerDraftDeal, draftData, token);
  } catch (error) {
    console.error('Error creating broker draft deal:', error.message || error);
    throw error;
  }
};

export const getBrokerProductAccessRequests = async (sellerCompanyId, token) => {
  try {
    const cleanId = typeof sellerCompanyId === 'object' && sellerCompanyId !== null
      ? (sellerCompanyId._id || sellerCompanyId.id || '')
      : String(sellerCompanyId || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      return { success: false, data: [] };
    }
    const res = await getRequest(SummaryApi.getBrokerProductAccessRequests(cleanId), token);
    return res || { success: false, data: [] };
  } catch (error) {
    console.warn('Notice fetching broker product access requests:', error.message || error);
    return { success: false, data: [] };
  }
};

export const respondToProductAccessRequest = async (requestId, status, token) => {
  try {
    return await patchRequest(SummaryApi.respondToProductAccessRequest(requestId), { status }, token);
  } catch (error) {
    console.error('Error responding to product access request:', error.message || error);
    throw error;
  }
};

export const completeBrokerDraftDeal = async (dealId, completeData, token) => {
  try {
    return await putRequest(SummaryApi.completeBrokerDraftDeal(dealId), completeData, token);
  } catch (error) {
    console.error('Error completing broker draft deal:', error.message || error);
    throw error;
  }
};

export const createDeal = async (dealData, token) => {
  try {
    return await postRequest(SummaryApi.createDeal, dealData, token);
  } catch (error) {
    console.warn('Backend createDeal initial attempt failed:', error.message || error);

    // If error related to myCompanyId or extra fields, retry with cleaned payload
    if (dealData.myCompanyId || dealData.targetCompanyId) {
      try {
        const cleanedData = { ...dealData };
        delete cleanedData.myCompanyId;
        delete cleanedData.targetCompanyId;
        return await postRequest(SummaryApi.createDeal, cleanedData, token);
      } catch (retryErr) {
        console.error('Retry createDeal without company ids also failed:', retryErr);
        throw retryErr;
      }
    }

    throw error;
  }
};

// Get deals of user's company only.................................................................................................................................................................

export const getDeals = async (arg1, page = 1, limit = 50, companyId = null, status = null) => {
  try {
    let token = null;
    let p = page;
    let l = limit;
    let cid = companyId;
    let st = status;

    if (arg1 && typeof arg1 === 'object') {
      token = arg1.token || null;
      p = arg1.page || 1;
      l = arg1.limit || 50;
      cid = arg1.companyId || null;
      st = arg1.status || null;
    } else {
      token = arg1 || null;
      p = page || 1;
      l = limit || 50;
      cid = companyId || null;
      st = status || null;
    }

    return await getRequest(SummaryApi.getDeals(p, l, cid, st), token);
  } catch (error) {
    console.warn('Error fetching deals:', error.message || error);
    throw error;
  }
};

export const getDealDetails = async (id, token) => {
  try {
    return await getRequest(SummaryApi.getDealDetails(id), token);
  } catch (error) {
    const errMsg = String(error?.message || error || '').toLowerCase();
    if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('deleted') || errMsg.includes('does not exist')) {
      console.warn(`[getDealDetails] Deal ${id} is not found or deleted on server.`);
      if (id) {
        const idStr = String(id).trim();
        AsyncStorage.removeItem(`deal_cache_${idStr}`).catch(() => {});
        AsyncStorage.getItem('deleted_deal_ids').then(delStr => {
          const delList = delStr ? JSON.parse(delStr) : [];
          if (!delList.includes(idStr)) {
            AsyncStorage.setItem('deleted_deal_ids', JSON.stringify([...delList, idStr])).catch(() => {});
          }
        }).catch(() => {});
        AsyncStorage.getItem('broker_deals_storage').then(storedStr => {
          if (storedStr) {
            const stored = JSON.parse(storedStr);
            const filtered = stored.filter(d => String(d._id || d.id || d.dealNumber || '') !== idStr);
            AsyncStorage.setItem('broker_deals_storage', JSON.stringify(filtered)).catch(() => {});
          }
        }).catch(() => {});
      }
    } else {
      console.warn('Notice fetching deal details:', error?.message || error);
    }
    throw error;
  }
};

export const updateDealStatus = async (id, payload, token) => {
  try {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return await patchRequest(SummaryApi.updateDealStatus(id), body, token);
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
    return await updateDealStatus(id, { status: 'approved' }, activeToken);
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
    return await updateDealStatus(id, { status: 'rejected', reason: activeReason }, activeToken);
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

export const getRecreatedDeals = async (token, page = 1, limit = 10, companyId = null) => {
  try {
    return await getRequest(SummaryApi.getRecreatedDeals(page, limit, companyId), token);
  } catch (error) {
    console.error('Error fetching recreated deals:', error.message || error);
    throw error;
  }
};

export const deleteDeal = async (id, token) => {
  try {
    if (id) {
      const idStr = String(id).trim();
      AsyncStorage.removeItem(`deal_cache_${idStr}`).catch(() => {});
      AsyncStorage.getItem('deleted_deal_ids').then(delStr => {
        const delList = delStr ? JSON.parse(delStr) : [];
        if (!delList.includes(idStr)) {
          AsyncStorage.setItem('deleted_deal_ids', JSON.stringify([...delList, idStr])).catch(() => {});
        }
      }).catch(() => {});
      AsyncStorage.getItem('broker_deals_storage').then(storedStr => {
        if (storedStr) {
          const stored = JSON.parse(storedStr);
          const filtered = stored.filter(d => String(d._id || d.id || d.dealNumber || '') !== idStr);
          AsyncStorage.setItem('broker_deals_storage', JSON.stringify(filtered)).catch(() => {});
        }
      }).catch(() => {});
    }

    const config = SummaryApi.deleteDeal(id);
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    let activeToken = token;
    if (!activeToken) {
      activeToken = await AsyncStorage.getItem('userToken');
    }
    if (activeToken) {
      headers.Authorization = `Bearer ${activeToken}`;
    }
    const response = await fetchWithTimeout(config.url, {
      method: config.method || 'DELETE',
      headers,
    });
    return await handleResponse(response);
  } catch (error) {
    console.warn('Notice deleting deal:', error.message || error);
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
    let cId = companyId;
    let authTok = token;
    let stat = status;

    if (typeof companyId === 'object' && companyId !== null) {
      cId = companyId.companyId || companyId._id || companyId.id;
      stat = stat || companyId.status;
    }

    const config = SummaryApi.getCategories(cId, stat);
    return await getRequest(config, authTok);
  } catch (error) {
    console.warn('Notice fetching categories:', error.message || error);
    return { success: false, data: [], message: error.message || 'Failed to fetch categories' };
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
    let cId = companyId;
    let authTok = token;
    let catId = categoryId;
    let stat = status;

    if (typeof companyId === 'object' && companyId !== null) {
      cId = companyId.companyId || companyId._id || companyId.id;
      catId = catId || companyId.categoryId;
      stat = stat || companyId.status;
    }

    const config = SummaryApi.getSubCategories(cId, catId, stat);
    return await getRequest(config, authTok);
  } catch (error) {
    console.warn('Notice fetching subcategories:', error.message || error);
    return { success: false, data: [], message: error.message || 'Failed to fetch subcategories' };
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
  if (!companyId || companyId === 'undefined' || companyId === 'null') {
    return { success: true, statusCode: 200, data: [] };
  }
  try {
    return await getRequest(SummaryApi.getProducts(companyId, categoryId, subCategoryId, status), token);
  } catch (error) {
    console.warn('Notice: Products fetch for companyId:', companyId, error.message || error);
    return { success: true, statusCode: 200, data: [] };
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
    const res = await getRequest(SummaryApi.getUnits(status), token);
    const backendData = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

    // Merge locally saved custom units
    try {
      const rawCustom = await AsyncStorage.getItem('user_custom_units');
      if (rawCustom) {
        const parsed = JSON.parse(rawCustom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(backendData.map((u) => String(u._id || u.id)));
          const existingNames = new Set(backendData.map((u) => String(u.name || '').toLowerCase()));
          parsed.forEach((c) => {
            if (!existingIds.has(String(c._id)) && !existingNames.has(String(c.name || '').toLowerCase())) {
              backendData.push(c);
            }
          });
        }
      }
    } catch (e) { }

    if (res && res.data) {
      res.data = backendData;
      return res;
    }
    return { success: true, data: backendData };
  } catch (error) {
    console.error('Error fetching units:', error.message || error);
    try {
      const rawCustom = await AsyncStorage.getItem('user_custom_units');
      if (rawCustom) {
        const parsed = JSON.parse(rawCustom);
        return { success: true, data: Array.isArray(parsed) ? parsed : [] };
      }
    } catch (e) { }
    throw error;
  }
};

export const createUnit = async (unitData, token) => {
  try {
    return await postRequest(SummaryApi.createUnit, unitData, token);
  } catch (error) {
    console.warn('Backend createUnit error:', error.message || error);
    return null;
  }
};

export const getCustomUnits = async () => {
  try {
    const raw = await AsyncStorage.getItem('user_custom_units');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveCustomUnit = async (unitData, token = null) => {
  try {
    let serverData = null;
    if (token) {
      try {
        const res = await createUnit(
          {
            name: unitData.name?.trim(),
            shortName: unitData.shortName?.trim(),
            type: unitData.type || 'custom',
            isCustom: true,
          },
          token
        );
        if (res && (res.success || res.data)) {
          serverData = res.data;
        }
      } catch (e) { }
    }

    const cleanId =
      serverData?._id ||
      `6a${Date.now().toString(16).padStart(12, '0')}${Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(10, '0')}`.slice(0, 24);

    const newUnit = {
      _id: cleanId,
      id: cleanId,
      name: unitData.name?.trim(),
      shortName: unitData.shortName?.trim() || unitData.name?.trim(),
      type: unitData.type || 'custom',
      isCustom: true,
      status: 'active',
      image: unitData.image || null,
      createdAt: new Date().toISOString(),
      ...serverData,
    };

    const existing = await getCustomUnits();
    const updated = [
      newUnit,
      ...existing.filter(
        (u) => u._id !== newUnit._id && u.name.toLowerCase() !== newUnit.name.toLowerCase()
      ),
    ];
    await AsyncStorage.setItem('user_custom_units', JSON.stringify(updated));
    return newUnit;
  } catch (err) {
    console.warn('saveCustomUnit error:', err);
    throw err;
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

export const getConversations = async (token, page = 1, limit = 10, companyId = '') => {
  try {
    return await getRequest(SummaryApi.getConversations(page, limit, companyId), token);
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

export const fetchPincodeDetails = async (pincode) => {
  try {
    const res = await fetchWithTimeout(`https://api.postalpincode.in/pincode/${pincode}`, { method: 'GET' }, 5000);
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return {
        success: true,
        city: po.Block !== 'NA' ? po.Block : po.Name,
        district: po.District,
        state: po.State,
        country: po.Country || 'India',
      };
    }
    return { success: false };
  } catch (err) {
    console.warn('Pincode fetch error:', err.message || err);
    return { success: false };
  }
};

export const assistedCreatePartyAccount = async (payload, token) => {
  try {
    const roleClean = (payload.role || payload.partyType || 'seller').toLowerCase();
    const cleanDigits = (payload.mobileNumber || '').replace(/\D/g, '');
    const mobileToUse = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
    const rawEmail = (payload.email || '').trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValidEmail = emailRegex.test(rawEmail);
    const fallbackPrefix = mobileToUse.length >= 6 ? mobileToUse : `user${Date.now().toString().slice(-6)}`;
    const defaultEmail = `user${fallbackPrefix}@gmail.com`;
    const emailToUse = isValidEmail ? rawEmail : defaultEmail;

    const rawGst = (payload.gst || payload.gstNumber || payload.gstin || payload.registrationNumber || '').trim();
    const compId = payload.brokerCompanyId || payload.companyId || payload.creatorCompanyId || null;

    const formattedPayload = {
      role: roleClean,
      name: payload.name || payload.ownerName || payload.targetUserName || '',
      mobileNumber: mobileToUse,
      email: emailToUse,
      companyEmail: emailToUse,
      companyName: payload.companyName || '',
      ...(payload.industryId || payload.industry ? { industryId: payload.industryId || payload.industry } : {}),
      ...(compId ? { brokerCompanyId: compId, companyId: compId } : {}),
      companyAddress: payload.companyAddress || {
        street: payload.address?.street || payload.street || '',
        city: payload.address?.city || payload.city || '',
        district: payload.address?.district || payload.district || '',
        state: payload.address?.state || payload.state || '',
        postalCode: payload.address?.postalCode || payload.address?.zip || payload.postalCode || payload.zip || '',
        country: payload.address?.country || payload.country || 'India',
      },
      ...(rawGst ? { gst: rawGst } : {}),
      businessDetails: payload.businessDetails || payload.description || '',
      products: roleClean === 'buyer' ? [] : (Array.isArray(payload.products) && payload.products.length > 0 ? payload.products.map(p => ({
        name: typeof p === 'string' ? p : p.name,
        unitId: p.unitId || p.unit || '64d0a1b2c3d4e5f6a7b8c9df',
        description: p.description || '',
        hsnCode: p.hsnCode || '',
        gstCode: p.gstCode || p.gst || '',
      })) : []),
    };

    let response;
    try {
      response = await postRequest(SummaryApi.assistedCreateBusiness, formattedPayload, token);
    } catch (primaryErr) {
      // Fallback: try alternate route prefix if primary returned error
      try {
        const currentUrl = SummaryApi.assistedCreateBusiness.url;
        const altUrl = currentUrl.includes('/api/broker-onboard/')
          ? currentUrl.replace('/api/broker-onboard/', '/api/onboarding/')
          : currentUrl.replace('/api/onboarding/', '/api/broker-onboard/');
        response = await postRequest({ url: altUrl, method: 'post' }, formattedPayload, token);
      } catch (fallbackErr) {
        throw primaryErr;
      }
    }
    return response;
  } catch (error) {
    console.error('Error creating assisted business:', error.message || error);
    throw error;
  }
};

export const getBrokerPendingQueue = async (companyIdOrToken = null, tokenArg = null) => {
  try {
    let companyId = null;
    let token = null;

    if (typeof companyIdOrToken === 'string' && companyIdOrToken.length > 30) {
      token = companyIdOrToken;
    } else {
      companyId = companyIdOrToken;
      token = tokenArg;
    }

    let activeToken = token;
    if (!activeToken || typeof activeToken !== 'string' || activeToken.length < 30) {
      activeToken = await AsyncStorage.getItem('userToken');
    }

    if (companyId && typeof companyId === 'object') {
      companyId = companyId._id || companyId.id || companyId.companyId || null;
    }
    if (companyId === 'null' || companyId === 'undefined' || String(companyId) === '[object Object]') {
      companyId = null;
    }

    const config = typeof SummaryApi.getBrokerOnboardQueue === 'function'
      ? SummaryApi.getBrokerOnboardQueue(companyId)
      : SummaryApi.getBrokerOnboardQueue;

    return await getRequest(config, activeToken);
  } catch (error) {
    console.warn('getBrokerPendingQueue notice:', error.message || error);
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

export const getBrokerMyDeals = async (companyId = null, token = null) => {
  try {
    let activeToken = token;
    if (!activeToken || typeof activeToken !== 'string' || activeToken.length < 30) {
      activeToken = await AsyncStorage.getItem('userToken');
    }

    let cleanCompanyId = companyId;
    if (cleanCompanyId && typeof cleanCompanyId === 'object') {
      cleanCompanyId = cleanCompanyId._id || cleanCompanyId.id || cleanCompanyId.companyId || null;
    }
    if (cleanCompanyId === 'null' || cleanCompanyId === 'undefined' || String(cleanCompanyId) === '[object Object]') {
      cleanCompanyId = null;
    }

    const config = typeof SummaryApi.getBrokerMyDeals === 'function'
      ? SummaryApi.getBrokerMyDeals(cleanCompanyId)
      : SummaryApi.getBrokerMyDeals;
    return await getRequest(config, activeToken);
  } catch (error) {
    console.warn('getBrokerMyDeals notice:', error.message || error);
    return { success: true, statusCode: 200, data: [] };
  }
};

/* ================= VOICE ASSISTANT APIs ================= */

/**
 * Process voice spoken text input (STT string)
 * Endpoint: POST /api/v1/voice/process
 * @param {Object} payload - { text, query, sessionId, language, context }
 * @param {string|null} token
 */
export const processVoiceCommand = async (payload, token = null) => {
  try {
    const body = typeof payload === 'string' ? { query: payload, text: payload, sessionId: null, language: 'en-IN' } : {
      ...payload,
      query: payload.query || payload.text,
      text: payload.text || payload.query,
      sessionId: payload.sessionId || null,
      language: payload.language || 'en-IN',
    };
    return await postRequest(SummaryApi.processVoiceCommand, body, token);
  } catch (error) {
    console.error('Error in processVoiceCommand:', error.message || error);
    throw error;
  }
};
/**
 * Get user voice preferences & phrases
 * Endpoint: GET /api/v1/voice/preferences
 * @param {string|null} token
 */
export const getVoicePreferences = async (token = null) => {
  try {
    return await getRequest(SummaryApi.getVoicePreferences, token);
  } catch (error) {
    console.warn('Notice fetching voice preferences:', error.message || error);
    return {
      success: true,
      data: {
        language: 'hi-IN',
        speechRate: 1.0,
        pitch: 1.0,
        autoSpeakResponse: true,
        customPhrases: [],
        aliases: {},
      },
    };
  }
};

/**
 * Update user voice preferences & custom phrases/aliases
 * Endpoint: PUT /api/v1/voice/preferences
 * @param {Object} preferencesData
 * @param {string|null} token
 */
export const updateVoicePreferences = async (preferencesData, token = null) => {
  try {
    return await putRequest(SummaryApi.updateVoicePreferences, preferencesData, token);
  } catch (error) {
    console.error('Error updating voice preferences:', error.message || error);
    throw error;
  }
};

/**
 * Reset voice preferences to defaults
 * Endpoint: DELETE /api/v1/voice/preferences
 * @param {string|null} token
 */
export const resetVoicePreferences = async (token = null) => {
  try {
    return await deleteRequest(SummaryApi.resetVoicePreferences, token);
  } catch (error) {
    console.error('Error resetting voice preferences:', error.message || error);
    throw error;
  }
};

/* ================= UPLOAD SERVICE ================= */
export {
  uploadService,
  uploadImage,
  uploadMultipleImages,
  resolveImageUrl,
  deleteImage,
  validateImage,
} from './uploadService';

/* ================= NOTIFICATION APIs ================= */

/**
 * Fetch notifications for user (and optionally specific company)
 * Endpoint: GET /api/v1/notifications
 * @param {string|null} token
 * @param {string|null} companyId
 */
export const getUserNotifications = async (token = null, companyId = null) => {
  try {
    return await getRequest(SummaryApi.getUserNotifications(companyId), token);
  } catch (error) {
    console.warn('Error fetching notifications:', error?.message || error);
    return { success: false, data: [], error: error?.message || error };
  }
};

/**
 * Mark a single notification as read
 * Endpoint: PUT /api/v1/notifications/:id/read
 * @param {string} id
 * @param {string|null} token
 */
export const markNotificationAsRead = async (id, token = null) => {
  try {
    return await putRequest(SummaryApi.markNotificationAsRead(id), {}, token);
  } catch (error) {
    console.warn('Error marking notification as read:', error?.message || error);
    return { success: false, error: error?.message || error };
  }
};

/**
 * Mark all notifications as read
 * Endpoint: PUT /api/v1/notifications/mark-all-read
 * @param {string|null} token
 * @param {string|null} companyId
 */
export const markAllNotificationsAsRead = async (token = null, companyId = null) => {
  try {
    const body = companyId ? { companyId } : {};
    return await putRequest(SummaryApi.markAllNotificationsAsRead, body, token);
  } catch (error) {
    console.warn('Error marking all notifications as read:', error?.message || error);
    return { success: false, error: error?.message || error };
  }
};

/**
 * Clear/delete all notifications
 * Endpoint: DELETE /api/v1/notifications/clear-all
 * @param {string|null} token
 * @param {string|null} companyId
 */
export const clearAllNotifications = async (token = null, companyId = null) => {
  try {
    const body = companyId ? { companyId } : {};
    return await deleteRequest(SummaryApi.clearAllNotifications, body, token);
  } catch (error) {
    console.warn('Error clearing notifications:', error?.message || error);
    return { success: false, error: error?.message || error };
  }
};

/**
 * Fetch active promotional banners (optionally filtered by industry)
 * Endpoint: GET /api/banners?industryId=...
 * @param {string|null} industryId
 * @param {string|null} token
 */
export const getActiveBanners = async (industryId = null, token = null) => {
  try {
    return await getRequest(SummaryApi.getActiveBanners(industryId), token);
  } catch (error) {
    console.warn('Error fetching active banners:', error?.message || error);
    return { success: false, data: [] };
  }
};

/* ================= PRAVISTI AI BOT APIs ================= */
/**
 * Send user prompt/message to Pravisti AI Bot
 * Endpoint: POST /api/v1/bot/chat
 */
export const sendBotMessage = async ({ message, conversationId = null, companyId = null }, token = null) => {
  try {
    const authToken = token || await AsyncStorage.getItem('userToken');
    const body = { message };
    if (conversationId) body.conversationId = conversationId;
    if (companyId) body.companyId = companyId;
    return await postRequest(SummaryApi.botChat, body, authToken);
  } catch (error) {
    console.error('Error sending bot message:', error?.message || error);
    throw error;
  }
};

/**
 * Get user conversations with Pravisti AI Bot
 * Endpoint: GET /api/v1/bot/conversations
 */
export const getBotConversations = async (limit = 20, page = 1, token = null) => {
  try {
    const authToken = token || await AsyncStorage.getItem('userToken');
    return await getRequest(SummaryApi.getBotConversations(limit, page), authToken);
  } catch (error) {
    console.warn('Error fetching bot conversations:', error?.message || error);
    return { success: false, data: { conversations: [] } };
  }
};

/**
 * Create a new conversation thread with Pravisti AI Bot
 * Endpoint: POST /api/v1/bot/conversations
 */
export const createBotConversation = async ({ title = 'New Conversation', companyId = null }, token = null) => {
  try {
    const authToken = token || await AsyncStorage.getItem('userToken');
    const body = { title };
    if (companyId) body.companyId = companyId;
    return await postRequest(SummaryApi.createBotConversation, body, authToken);
  } catch (error) {
    console.error('Error creating bot conversation:', error?.message || error);
    throw error;
  }
};

/**
 * Get specific conversation & full message history
 * Endpoint: GET /api/v1/bot/conversations/:id
 */
export const getBotConversation = async (id, token = null) => {
  try {
    const authToken = token || await AsyncStorage.getItem('userToken');
    return await getRequest(SummaryApi.getBotConversation(id), authToken);
  } catch (error) {
    console.error('Error getting bot conversation history:', error?.message || error);
    throw error;
  }
};

/**
 * Delete a bot conversation thread
 * Endpoint: DELETE /api/v1/bot/conversations/:id
 */
export const deleteBotConversation = async (id, token = null) => {
  try {
    const authToken = token || await AsyncStorage.getItem('userToken');
    return await deleteRequest(SummaryApi.deleteBotConversation(id), authToken);
  } catch (error) {
    console.error('Error deleting bot conversation:', error?.message || error);
    throw error;
  }
};

/**
 * Clear/reset ongoing action draft
 * Endpoint: POST /api/v1/bot/conversations/:id/clear-action
 */
export const clearBotAction = async (id, token = null) => {
  try {
    const authToken = token || await AsyncStorage.getItem('userToken');
    return await postRequest(SummaryApi.clearBotAction(id), {}, authToken);
  } catch (error) {
    console.error('Error clearing bot action:', error?.message || error);
    throw error;
  }
};

