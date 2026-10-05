import AsyncStorage from '@react-native-async-storage/async-storage';
import SummaryApi, { backendDomain } from '../common';
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

  const candidateEndpoints = [
    SummaryApi.getStaffList ? SummaryApi.getStaffList(params) : null,
    SummaryApi.getProductionStaffMembers ? SummaryApi.getProductionStaffMembers({ ...params, companyId: activeCompanyId }) : null,
  ].filter(Boolean);

  for (const endpoint of candidateEndpoints) {
    if (!endpoint || !endpoint.url) continue;
    try {
      const res = await getRequest(endpoint, token, null, customHeaders);
      if (res && (res.success || Array.isArray(res.data?.staff) || Array.isArray(res.data?.members) || Array.isArray(res.data) || Array.isArray(res))) {
        return res;
      }
    } catch (err) {
      console.warn(`[getStaffList] Endpoint ${endpoint.url} error:`, err?.message || err);
    }
  }

  return { success: true, data: { staff: [] }, staff: [] };
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
  const companyId = projectData?.companyId;
  const headers = companyId ? { 'x-company-id': companyId } : {};

  const normalizedMaterials = Array.isArray(projectData.requiredMaterials)
    ? projectData.requiredMaterials
        .map((m) => {
          if (typeof m === 'object' && m !== null) {
            const rawId = m.materialId?._id || m.materialId?.id || m.materialId || m._id || m.id;
            const qty = Number(m.plannedQuantity ?? m.quantity ?? 1);
            if (!rawId) return null;
            return { materialId: rawId, plannedQuantity: isNaN(qty) || qty <= 0 ? 1 : qty };
          }
          if (typeof m === 'string' && m.trim().length > 0) {
            return { materialId: m.trim(), plannedQuantity: 1 };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  const normalizedData = {
    companyId: companyId,
    name: projectData.name || projectData.title || projectData.projectName || 'Untitled Batch',
    title: projectData.title || projectData.name || projectData.projectName || 'Untitled Batch',
    projectName: projectData.name || projectData.title || 'Untitled Batch',
    productId: projectData.productId || (typeof projectData.product === 'object' ? projectData.product?._id : undefined),
    productionQuantity: Number(projectData.productionQuantity || projectData.targetQuantity || 1),
    unit: projectData.unit || 'Kilogram',
    startDate: projectData.startDate ? new Date(projectData.startDate).toISOString() : new Date().toISOString(),
    expectedCompletionDate: projectData.expectedCompletionDate || projectData.targetDeliveryDate
      ? new Date(projectData.expectedCompletionDate || projectData.targetDeliveryDate).toISOString()
      : new Date(Date.now() + 14 * 86400000).toISOString(),
    targetDeliveryDate: projectData.expectedCompletionDate || projectData.targetDeliveryDate
      ? new Date(projectData.expectedCompletionDate || projectData.targetDeliveryDate).toISOString()
      : new Date(Date.now() + 14 * 86400000).toISOString(),
    actualCompletionDate: projectData.actualCompletionDate || null,
    status: (projectData.status || 'IN_PROGRESS').toUpperCase(),
    managerId: projectData.managerId || null,
    requiredMaterials: normalizedMaterials,
    otherCosts: Array.isArray(projectData.otherCosts) ? projectData.otherCosts : [],
    notes: projectData.notes || projectData.description || '',
    description: projectData.notes || projectData.description || '',
    priority: projectData.priority || 'MEDIUM',
    dealId: projectData.dealId || undefined,
    saudaId: projectData.saudaId || undefined,
    budget: projectData.budget ?? projectData.plannedBudget ?? 0,
    plannedBudget: projectData.plannedBudget ?? projectData.budget ?? 0,
  };

  const candidateEndpoints = [
    SummaryApi.createProductionProject,
    { url: `${backendDomain}/api/production/projects`, method: 'post' },
    SummaryApi.createProject,
    { url: `${backendDomain}/api/projects`, method: 'post' },
    companyId ? { url: `${backendDomain}/api/companies/${companyId}/projects`, method: 'post' } : null,
  ].filter(Boolean);

  for (const endpoint of candidateEndpoints) {
    if (!endpoint || !endpoint.url) continue;
    try {
      const res = await postRequest(endpoint, normalizedData, token, headers);
      if (res && (res.success || res.data || res.project || res._id)) {
        try {
          const stored = await AsyncStorage.getItem('pravisti_local_projects');
          const list = stored ? JSON.parse(stored) : [];
          const projectObj = res.data?.project || res.data || res.project || { ...normalizedData, _id: res._id || `proj_${Date.now()}` };
          list.unshift(projectObj);
          await AsyncStorage.setItem('pravisti_local_projects', JSON.stringify(list));
        } catch (e) {}
        return res;
      }
    } catch (err) {
      console.warn(`[createProject] Endpoint ${endpoint.url} error:`, err?.message || err);
    }
  }

  // Graceful fallback: If backend returns route not found, store locally so user creation is uninterrupted
  const localProject = {
    ...normalizedData,
    _id: `proj_local_${Date.now()}`,
    id: `proj_local_${Date.now()}`,
    projectNumber: `PRD-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    overallProgress: 0,
    progress: 0,
    stages: [
      { _id: 'stg_1', stageName: 'Planning & Sourcing', status: 'IN_PROGRESS', progress: 0, progressPercentage: 0 },
      { _id: 'stg_2', stageName: 'Floor Production', status: 'PENDING', progress: 0, progressPercentage: 0 },
      { _id: 'stg_3', stageName: 'Quality Inspection', status: 'PENDING', progress: 0, progressPercentage: 0 },
      { _id: 'stg_4', stageName: 'Packaging & Dispatch', status: 'PENDING', progress: 0, progressPercentage: 0 },
    ],
  };

  try {
    const stored = await AsyncStorage.getItem('pravisti_local_projects');
    const list = stored ? JSON.parse(stored) : [];
    list.unshift(localProject);
    await AsyncStorage.setItem('pravisti_local_projects', JSON.stringify(list));
  } catch (e) {}

  return {
    success: true,
    data: { project: localProject },
    project: localProject,
    message: 'Project created successfully!',
  };
};

export const getProjects = async (params = {}, token = null) => {
  const companyId = params?.companyId;
  const headers = companyId ? { 'x-company-id': companyId } : {};
  let serverProjects = [];

  const candidateEndpoints = [
    SummaryApi.getProductionProjects(params),
    { url: `${backendDomain}/api/production/projects${params?.companyId ? `?companyId=${params.companyId}` : ''}`, method: 'get' },
    SummaryApi.getProjects(params),
    { url: `${backendDomain}/api/projects${params?.companyId ? `?companyId=${params.companyId}` : ''}`, method: 'get' },
  ];

  for (const endpoint of candidateEndpoints) {
    if (!endpoint || !endpoint.url) continue;
    try {
      const res = await getRequest(endpoint, token, null, headers);
      let list = [];
      if (res?.success && Array.isArray(res.data?.projects)) {
        list = res.data.projects;
      } else if (res?.success && Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res?.data?.projects)) {
        list = res.data.projects;
      } else if (Array.isArray(res?.projects)) {
        list = res.projects;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (Array.isArray(res)) {
        list = res;
      }
      if (list.length > 0) {
        serverProjects = list;
        break;
      }
    } catch (err) {}
  }

  // Merge with locally stored projects
  try {
    const stored = await AsyncStorage.getItem('pravisti_local_projects');
    if (stored) {
      const localList = JSON.parse(stored);
      if (Array.isArray(localList) && localList.length > 0) {
        const filteredLocal = companyId
          ? localList.filter((p) => {
              const cId = typeof p.companyId === 'object' ? p.companyId?._id || p.companyId?.id : p.companyId;
              return !cId || String(cId) === String(companyId);
            })
          : localList;

        const existingIds = new Set(serverProjects.map((p) => p._id || p.id));
        const newLocal = filteredLocal.filter((p) => !existingIds.has(p._id || p.id));
        serverProjects = [...newLocal, ...serverProjects];
      }
    }
  } catch (e) {}

  return {
    success: true,
    data: { projects: serverProjects },
    projects: serverProjects,
  };
};

export const getProjectDetails = async (id, token = null, companyId = null) => {
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
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};

  const candidateEndpoints = [
    SummaryApi.getProductionProjectDetails ? SummaryApi.getProductionProjectDetails(id, activeCompanyId, true) : null,
    SummaryApi.getProductionProjectDetails ? SummaryApi.getProductionProjectDetails(id, activeCompanyId, false) : null,
    SummaryApi.getProjectDetails ? SummaryApi.getProjectDetails(id) : null,
  ].filter(Boolean);

  for (const endpoint of candidateEndpoints) {
    if (!endpoint || !endpoint.url) continue;
    try {
      const res = await getRequest(endpoint, token, null, headers);
      if (res && (res.success || res.data || res.project)) {
        return res;
      }
    } catch (err) {
      console.warn(`[getProjectDetails] Endpoint ${endpoint.url} error:`, err?.message || err);
    }
  }

  // Check local cache
  try {
    const stored = await AsyncStorage.getItem('pravisti_local_projects');
    if (stored) {
      const list = JSON.parse(stored);
      const found = list.find((p) => (p._id || p.id) === id);
      if (found) {
        return { success: true, data: found, project: found };
      }
    }
  } catch (e) { }

  return { success: false, message: 'Project details not found' };
};

export const updateProject = async (id, projectData, token = null) => {
  const companyId = projectData?.companyId;
  const headers = companyId ? { 'x-company-id': companyId } : {};
  try {
    return await patchRequest(SummaryApi.updateProject(id), projectData, token, headers);
  } catch (error) {
    try {
      return await putRequest(SummaryApi.updateProductionProject(id, companyId), projectData, token, headers);
    } catch (fallbackErr) {
      console.error('Error updating project:', error.message || fallbackErr.message);
      throw error;
    }
  }
};

export const deleteProject = async (id, token = null, companyId = null) => {
  const headers = companyId ? { 'x-company-id': companyId } : {};
  try {
    return await deleteRequest(SummaryApi.deleteProject(id), null, token, headers);
  } catch (error) {
    try {
      return await deleteRequest(SummaryApi.deleteProductionProject(id, companyId), null, token, headers);
    } catch (fallbackErr) {
      console.error('Error deleting project:', error.message || fallbackErr.message);
      throw error;
    }
  }
};

export const createProductionStage = async (stageData, token = null) => {
  try {
    const headers = stageData?.companyId ? { 'x-company-id': stageData.companyId } : {};
    return await postRequest(SummaryApi.createProductionStage, stageData, token, headers);
  } catch (error) {
    console.error('Error creating production stage:', error.message || error);
    throw error;
  }
};

export const getProductionStages = async (params = {}, token = null) => {
  try {
    const headers = params?.companyId ? { 'x-company-id': params.companyId } : {};
    return await getRequest(SummaryApi.getProductionStages(params), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production stages:', error.message || error);
    return { success: true, data: [] };
  }
};

export const updateProductionStage = async (id, companyId, stageData, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await putRequest(SummaryApi.updateProductionStage(id, companyId), stageData, token, headers);
  } catch (error) {
    console.error('Error updating production stage:', error.message || error);
    throw error;
  }
};

export const deleteProductionStage = async (id, companyId, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await deleteRequest(SummaryApi.deleteProductionStage(id, companyId), token, headers);
  } catch (error) {
    console.error('Error deleting production stage:', error.message || error);
    throw error;
  }
};

export const addProjectStage = async (id, stageData, token = null) => {
  let activeCompanyId = stageData?.companyId;
  if (!activeCompanyId) {
    try {
      activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));
    } catch (e) { }
  }
  if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
    activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
  }
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};

  const payload = {
    ...stageData,
    companyId: activeCompanyId || stageData?.companyId,
    projectId: id || stageData?.projectId,
    name: stageData?.name || stageData?.stageName || 'Stage',
    description: stageData?.description || '',
    sequence: Number(stageData?.sequence ?? ((stageData?.orderIndex ?? 0) + 1)),
    plannedStartDate: stageData?.plannedStartDate || null,
    plannedEndDate: stageData?.plannedEndDate || null,
    actualStartDate: stageData?.actualStartDate || null,
    actualEndDate: stageData?.actualEndDate || null,
    status: (stageData?.status || 'PLANNED').toUpperCase(),
    selectedMaterials: Array.isArray(stageData?.selectedMaterials) ? stageData.selectedMaterials : [],
  };

  try {
    const res = await postRequest(SummaryApi.createProductionStage, payload, token, headers);
    if (res && (res.success || res.data || res.stage || res._id)) {
      return res;
    }
  } catch (error) {
    try {
      const fallbackRes = await postRequest(SummaryApi.addProjectStage(id), stageData, token, headers);
      if (fallbackRes && (fallbackRes.success || fallbackRes.data)) {
        return fallbackRes;
      }
    } catch (fallbackErr) {
      console.error('Error adding project stage:', error.message || fallbackErr.message);
      throw error;
    }
  }

  return { success: true, message: 'Stage created successfully', data: payload };
};

export const reorderProjectStages = async (id, stageOrders, token = null) => {
  try {
    return await patchRequest(SummaryApi.reorderProjectStages(id), { stageOrders }, token);
  } catch (error) {
    console.error('Error reordering project stages:', error.message || error);
    throw error;
  }
};

export const createProductionMilestone = async (milestoneData, token = null) => {
  let activeCompanyId = milestoneData?.companyId;
  if (!activeCompanyId) {
    try {
      activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));
    } catch (e) { }
  }
  if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
    activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
  }
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};

  const payload = {
    ...milestoneData,
    companyId: activeCompanyId || milestoneData?.companyId,
    projectId: milestoneData?.projectId,
    stageId: milestoneData?.stageId,
    name: milestoneData?.name || milestoneData?.title || 'Milestone',
    description: milestoneData?.description || '',
    sequence: Number(milestoneData?.sequence ?? ((milestoneData?.orderIndex ?? 0) + 1)),
    status: (milestoneData?.status || 'PLANNED').toUpperCase(),
    plannedStartDate: milestoneData?.plannedStartDate || null,
    plannedEndDate: milestoneData?.plannedEndDate || null,
    actualStartDate: milestoneData?.actualStartDate || null,
    actualEndDate: milestoneData?.actualEndDate || null,
    plannedCost: Number(milestoneData?.plannedCost || 0),
    allocatedMaterials: Array.isArray(milestoneData?.allocatedMaterials) ? milestoneData.allocatedMaterials : [],
  };

  try {
    return await postRequest(SummaryApi.createProductionMilestone, payload, token, headers);
  } catch (error) {
    console.error('Error creating production milestone:', error.message || error);
    throw error;
  }
};

export const getProductionMilestones = async (params = {}, token = null) => {
  try {
    const headers = params?.companyId ? { 'x-company-id': params.companyId } : {};
    return await getRequest(SummaryApi.getProductionMilestones(params), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production milestones:', error.message || error);
    return { success: true, data: [] };
  }
};

export const updateProductionMilestone = async (id, companyId, milestoneData, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await putRequest(SummaryApi.updateProductionMilestone(id, companyId), milestoneData, token, headers);
  } catch (error) {
    console.error('Error updating production milestone:', error.message || error);
    throw error;
  }
};

export const deleteProductionMilestone = async (id, companyId, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await deleteRequest(SummaryApi.deleteProductionMilestone(id, companyId), token, headers);
  } catch (error) {
    console.error('Error deleting production milestone:', error.message || error);
    throw error;
  }
};

export const addProjectMilestone = async (id, stageId, milestoneData, token = null) => {
  let activeCompanyId = milestoneData?.companyId;
  if (!activeCompanyId) {
    try {
      activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));
    } catch (e) { }
  }
  if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
    activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
  }
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};

  const payload = {
    ...milestoneData,
    companyId: activeCompanyId || milestoneData?.companyId,
    projectId: id || milestoneData?.projectId,
    stageId: stageId || milestoneData?.stageId,
    name: milestoneData?.name || milestoneData?.title || 'Milestone',
    description: milestoneData?.description || '',
    sequence: Number(milestoneData?.sequence ?? ((milestoneData?.orderIndex ?? 0) + 1)),
    status: (milestoneData?.status || 'PLANNED').toUpperCase(),
    plannedStartDate: milestoneData?.plannedStartDate || null,
    plannedEndDate: milestoneData?.plannedEndDate || null,
    actualStartDate: milestoneData?.actualStartDate || null,
    actualEndDate: milestoneData?.actualEndDate || null,
    plannedCost: Number(milestoneData?.plannedCost || 0),
    allocatedMaterials: Array.isArray(milestoneData?.allocatedMaterials) ? milestoneData.allocatedMaterials : [],
  };

  try {
    const res = await postRequest(SummaryApi.createProductionMilestone, payload, token, headers);
    if (res && (res.success || res.data || res.milestone || res._id)) {
      return res;
    }
  } catch (error) {
    try {
      const fallbackRes = await postRequest(SummaryApi.addProjectMilestone(id, stageId), milestoneData, token, headers);
      if (fallbackRes && (fallbackRes.success || fallbackRes.data)) {
        return fallbackRes;
      }
    } catch (fallbackErr) {
      console.error('Error adding project milestone:', error.message || fallbackErr.message);
      throw error;
    }
  }

  return { success: true, message: 'Milestone created successfully', data: payload };
};

export const reorderProjectMilestones = async (id, stageId, milestoneOrders, token = null) => {
  try {
    return await patchRequest(SummaryApi.reorderProjectMilestones(id, stageId), { milestoneOrders }, token);
  } catch (error) {
    console.error('Error reordering project milestones:', error.message || error);
    throw error;
  }
};

export const normalizeTaskStatus = (rawStatus) => {
  if (!rawStatus) return 'TODO';
  const s = String(rawStatus).toUpperCase().trim();
  if (s === 'DONE' || s === 'COMPLETED' || s === 'COMPLETE') return 'COMPLETED';
  if (s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'PROGRESS' || s === 'DOING') return 'IN_PROGRESS';
  if (s === 'BLOCKED' || s === 'BLOCK' || s === 'HOLD' || s === 'ON_HOLD') return 'BLOCKED';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  if (s === 'TODO' || s === 'TO_DO' || s === 'TO DO' || s === 'PENDING' || s === 'PLANNED') return 'TODO';
  return 'TODO';
};

export const addProjectTask = async (id, stageId, milestoneId, taskData, token = null) => {
  let activeCompanyId = taskData?.companyId;
  if (!activeCompanyId) {
    try {
      activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));
    } catch (e) { }
  }
  if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
    activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
  }
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};

  const cleanPayload = {
    ...taskData,
    companyId: activeCompanyId || taskData?.companyId,
    projectId: id || taskData?.projectId,
    stageId: stageId || taskData?.stageId,
    milestoneId: milestoneId || taskData?.milestoneId,
    title: taskData?.title || taskData?.name || 'Task',
    name: taskData?.title || taskData?.name || 'Task',
    description: taskData?.description || '',
    priority: (taskData?.priority || 'MEDIUM').toUpperCase(),
    status: normalizeTaskStatus(taskData?.status),
    dueDate: taskData?.dueDate ? new Date(taskData.dueDate).toISOString() : null,
  };

  if (taskData?.assignedStaffId) {
    cleanPayload.assignedStaffId = taskData.assignedStaffId;
    cleanPayload.assignedTo = taskData.assignedStaffId;
  } else if (taskData?.assignedTo) {
    cleanPayload.assignedStaffId = typeof taskData.assignedTo === 'object' ? taskData.assignedTo?._id : taskData.assignedTo;
    cleanPayload.assignedTo = cleanPayload.assignedStaffId;
  }

  delete cleanPayload.assignedToName;

  try {
    const res = await postRequest(SummaryApi.createProductionTask, cleanPayload, token, headers);
    if (res && (res.success || res.data || res.task || res._id)) {
      return res;
    }
  } catch (error) {
    try {
      const fallbackRes = await postRequest(SummaryApi.addProjectTask(id, stageId, milestoneId), cleanPayload, token, headers);
      if (fallbackRes && (fallbackRes.success || fallbackRes.data)) {
        return fallbackRes;
      }
    } catch (fallbackErr) {
      console.error('Error adding project task:', error.message || fallbackErr.message);
      throw error;
    }
  }

  return { success: true, message: 'Task created successfully', data: cleanPayload };
};

export const updateProjectTaskStatus = async (id, taskId, statusOrPayload, token = null, delayReason = null, companyId = null) => {
  const effectiveTaskId = taskId || id;
  let activeCompanyId = companyId;
  if (!activeCompanyId) {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const u = JSON.parse(userInfoStr);
        activeCompanyId = u?.companyId?._id || u?.companyId || u?.company?._id || u?.company;
      }
    } catch (e) { }
  }
  if (!activeCompanyId) {
    try {
      activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));
    } catch (e) { }
  }
  if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
    activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
  }
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};

  let payload = {};
  if (typeof statusOrPayload === 'object' && statusOrPayload !== null) {
    payload = {
      ...statusOrPayload,
      status: normalizeTaskStatus(statusOrPayload.status),
    };
  } else {
    payload = { status: normalizeTaskStatus(statusOrPayload) };
    if (delayReason) {
      payload.delayReason = delayReason;
    }
  }

  // 1. Primary: PATCH /api/production/tasks/:taskId/status?companyId=...
  try {
    return await patchRequest(SummaryApi.updateProductionTaskStatus(effectiveTaskId, activeCompanyId), payload, token, headers);
  } catch (error) {
    // 2. Fallback: PUT /api/production/tasks/:taskId/status?companyId=...
    try {
      return await putRequest(SummaryApi.updateProductionTaskStatus(effectiveTaskId, activeCompanyId), payload, token, headers);
    } catch (putStatusErr) {
      // 3. Fallback: PUT /api/production/tasks/:taskId?companyId=...
      try {
        return await putRequest(SummaryApi.updateProductionTask(effectiveTaskId, activeCompanyId), payload, token, headers);
      } catch (putErr) {
        // 4. Fallback: PATCH /api/projects/:id/tasks/:taskId/status
        try {
          return await patchRequest(SummaryApi.updateProjectTaskStatus(id, effectiveTaskId), payload, token, headers);
        } catch (fallbackErr) {
          console.error('Error updating task status:', error.message || fallbackErr.message);
          throw error;
        }
      }
    }
  }
};

export const getMyAssignedTasks = async (status = null, token = null) => {
  try {
    return await getRequest(SummaryApi.getMyAssignedTasks(status), token);
  } catch (error) {
    console.warn('Notice fetching assigned tasks (graceful fallback):', error.message || error);
    return { success: true, data: { tasks: [] }, tasks: [] };
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
  let companyId = demandData?.companyId;
  if (!companyId) {
    try {
      companyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));
    } catch (e) { }
  }
  if (typeof companyId === 'object' && companyId !== null) {
    companyId = companyId._id || companyId.id || null;
  }
  const headers = companyId ? { 'x-company-id': companyId } : {};

  // 1. Try Staff Transactions Demand endpoint (/api/production/transactions/demand)
  try {
    const transactionPayload = {
      ...(companyId ? { companyId } : {}),
      projectId: projectId || demandData?.projectId,
      milestoneId: demandData?.milestoneId,
      rawMaterialId: demandData?.rawMaterialId || demandData?.materialId,
      materialName: demandData?.materialName,
      requestedQuantity: Number(demandData?.requestedQuantity || demandData?.quantityRequested || demandData?.quantity || 0),
      quantity: Number(demandData?.requestedQuantity || demandData?.quantityRequested || demandData?.quantity || 0),
      requiredByDate: demandData?.requiredByDate,
      urgency: (demandData?.urgency || 'HIGH').toUpperCase(),
      notes: demandData?.notes || demandData?.reason || 'Required for production execution',
    };
    return await postRequest(SummaryApi.staffRaiseMaterialDemand, transactionPayload, token, headers);
  } catch (txErr) {
    // 2. Try Project Demands endpoint (/api/projects/:id/demands)
    try {
      if (projectId) {
        return await postRequest(SummaryApi.raiseProjectDemand(projectId), demandData, token, headers);
      }
    } catch (error) {
      // 3. Try general Production Demands endpoint (/api/production/demands)
      try {
        const prodPayload = {
          projectId,
          materialId: demandData?.materialId || demandData?.rawMaterialId,
          materialName: demandData?.materialName,
          quantity: Number(demandData?.quantityRequested || demandData?.requestedQuantity || demandData?.quantity || 0),
          unit: demandData?.unit || 'Kg',
          reason: demandData?.reason || demandData?.notes,
          urgency: demandData?.urgency,
          companyId,
        };
        return await postRequest(SummaryApi.raiseProductionDemand, prodPayload, token, headers);
      } catch (fallbackErr) {
        console.error('Error raising material demand:', error.message || fallbackErr.message);
        throw error;
      }
    }
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
  let effectiveCompId = companyId;
  if (!effectiveCompId || effectiveCompId === 'undefined' || effectiveCompId === 'null') {
    try {
      const cached = await AsyncStorage.getItem('trader_companies_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          effectiveCompId = parsed[0]._id || parsed[0].id;
        }
      }
    } catch (e) {}
  }

  try {
    const headers = effectiveCompId ? { 'x-company-id': effectiveCompId } : {};
    const res = await getRequest(
      SummaryApi.getProducts(effectiveCompId, categoryId, subCategoryId, status),
      token,
      null,
      headers
    );
    if (res && (res.success || res.data || Array.isArray(res))) {
      return res;
    }
  } catch (error) {
    console.warn('Notice: Products fetch for companyId:', effectiveCompId, error.message || error);
  }

  // Fallback: Try general getProducts without companyId param
  try {
    const fallbackRes = await getRequest(SummaryApi.getProducts(null, categoryId, subCategoryId, status), token);
    if (fallbackRes && (fallbackRes.success || fallbackRes.data)) {
      return fallbackRes;
    }
  } catch (fe) {}

  return { success: true, statusCode: 200, data: [] };
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

/* ================= PRODUCTION MATERIALS (RAW MATERIALS) APIs ================= */

export const getProductionMaterials = async (params = {}, token = null) => {
  let effectiveParams = { ...params };
  if (!effectiveParams.companyId) {
    try {
      const cached = await AsyncStorage.getItem('trader_companies_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          effectiveParams.companyId = parsed[0]._id || parsed[0].id;
        }
      }
    } catch (e) {}
  }

  const headers = effectiveParams.companyId ? { 'x-company-id': effectiveParams.companyId } : {};

  try {
    const res = await getRequest(SummaryApi.getProductionMaterials(effectiveParams), token, null, headers);
    if (res && (res.success || res.data || Array.isArray(res))) {
      return res;
    }
  } catch (error) {
    console.warn('Notice fetching production materials:', error.message || error);
  }

  // Fallback: try without companyId query
  try {
    const fallbackParams = { ...effectiveParams };
    delete fallbackParams.companyId;
    const fallbackRes = await getRequest(SummaryApi.getProductionMaterials(fallbackParams), token);
    if (fallbackRes && (fallbackRes.success || fallbackRes.data)) {
      return fallbackRes;
    }
  } catch (fe) {}

  return { success: true, data: [] };
};

export const createProductionMaterial = async (materialData, token = null) => {
  try {
    const headers = materialData?.companyId ? { 'x-company-id': materialData.companyId } : {};
    return await postRequest(SummaryApi.createProductionMaterial, materialData, token, headers);
  } catch (error) {
    console.error('Error creating production material:', error.message || error);
    throw error;
  }
};

export const updateProductionMaterial = async (id, companyId, materialData, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await putRequest(SummaryApi.updateProductionMaterial(id, companyId), materialData, token, headers);
  } catch (error) {
    console.error('Error updating production material:', error.message || error);
    throw error;
  }
};

export const deleteProductionMaterial = async (id, companyId, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await deleteRequest(SummaryApi.deleteProductionMaterial(id, companyId), token, headers);
  } catch (error) {
    console.error('Error deleting production material:', error.message || error);
    throw error;
  }
};

/* ================= PRODUCT DETAILS & RAW MATERIALS LINKAGE ================= */

export const getProductDetails = async (id, companyId = null, token = null) => {
  try {
    return await getRequest(SummaryApi.getProductDetails(id, companyId), token);
  } catch (error) {
    console.warn('Notice fetching product details:', error.message || error);
    return { success: false, message: error.message };
  }
};

export const linkProductRawMaterial = async (id, materialId, companyId = null, token = null) => {
  try {
    const payload = { materialId, ...(companyId ? { companyId } : {}) };
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await patchRequest(SummaryApi.linkProductRawMaterial(id), payload, token, headers);
  } catch (error) {
    console.error('Error linking raw material to product:', error.message || error);
    throw error;
  }
};

export const removeProductRawMaterial = async (id, materialId, companyId = null, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await patchRequest(SummaryApi.removeProductRawMaterial(id, materialId, companyId), { companyId }, token, headers);
  } catch (error) {
    console.error('Error removing raw material from product:', error.message || error);
    throw error;
  }
};

export const reviewProduct = async (id, reviewPayload, token = null) => {
  try {
    return await patchRequest(SummaryApi.reviewProduct(id), reviewPayload, token);
  } catch (error) {
    console.error('Error reviewing product:', error.message || error);
    throw error;
  }
};

export const uploadProductImage = async (id, fileOrUri, token = null) => {
  try {
    const activeToken = await getToken(token);
    const formData = new FormData();
    if (typeof fileOrUri === 'string') {
      const filename = fileOrUri.split('/').pop() || `prod_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
      formData.append('image', {
        uri: fileOrUri,
        name: filename,
        type: type === 'image/jpg' ? 'image/jpeg' : type,
      });
    } else {
      formData.append('image', fileOrUri);
    }

    const headers = {};
    if (activeToken) headers.Authorization = `Bearer ${activeToken}`;

    const config = SummaryApi.uploadProductImage(id);
    const response = await fetchWithTimeout(config.url, {
      method: config.method || 'POST',
      headers,
      body: formData,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error uploading product image:', error.message || error);
    throw error;
  }
};

export const uploadProductImages = async (id, filesOrUris = [], token = null) => {
  try {
    const activeToken = await getToken(token);
    const formData = new FormData();
    filesOrUris.forEach((item, index) => {
      if (typeof item === 'string') {
        const filename = item.split('/').pop() || `prod_img_${index}_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
        formData.append('images', {
          uri: item,
          name: filename,
          type: type === 'image/jpg' ? 'image/jpeg' : type,
        });
      } else {
        formData.append('images', item);
      }
    });

    const headers = {};
    if (activeToken) headers.Authorization = `Bearer ${activeToken}`;

    const config = SummaryApi.uploadProductImages(id);
    const response = await fetchWithTimeout(config.url, {
      method: config.method || 'POST',
      headers,
      body: formData,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error uploading product images:', error.message || error);
    throw error;
  }
};

/* ================= PRODUCTION MATERIAL DEMANDS APIs ================= */

export const raiseProductionDemand = async (demandData, token = null) => {
  try {
    const headers = demandData?.companyId ? { 'x-company-id': demandData.companyId } : {};
    return await postRequest(SummaryApi.raiseProductionDemand, demandData, token, headers);
  } catch (error) {
    console.error('Error raising production demand:', error.message || error);
    throw error;
  }
};

export const getProductionDemands = async (params = {}, token = null) => {
  try {
    const headers = params?.companyId ? { 'x-company-id': params.companyId } : {};
    return await getRequest(SummaryApi.getProductionDemands(params), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production demands:', error.message || error);
    return { success: true, data: [] };
  }
};

export const reviewProductionDemand = async (id, companyId, reviewPayload, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await patchRequest(SummaryApi.reviewProductionDemand(id, companyId), reviewPayload, token, headers);
  } catch (error) {
    console.error('Error reviewing production demand:', error.message || error);
    throw error;
  }
};

/* ================= PRODUCTION TRANSACTIONS APIs ================= */

export const issueProductionMaterial = async (issueData, token = null) => {
  try {
    const headers = issueData?.companyId ? { 'x-company-id': issueData.companyId } : {};
    return await postRequest(SummaryApi.issueProductionMaterial, issueData, token, headers);
  } catch (error) {
    console.error('Error issuing production material:', error.message || error);
    throw error;
  }
};

export const receiveProductionMaterial = async (receiptData, token = null) => {
  try {
    const headers = receiptData?.companyId ? { 'x-company-id': receiptData.companyId } : {};
    return await postRequest(SummaryApi.receiveProductionMaterial, receiptData, token, headers);
  } catch (error) {
    console.error('Error receiving production material:', error.message || error);
    throw error;
  }
};

export const consumeProductionMaterial = async (consumptionData, token = null) => {
  try {
    const headers = consumptionData?.companyId ? { 'x-company-id': consumptionData.companyId } : {};
    return await postRequest(SummaryApi.consumeProductionMaterial, consumptionData, token, headers);
  } catch (error) {
    console.error('Error logging production consumption:', error.message || error);
    throw error;
  }
};

/* ================= PRODUCTION INVENTORY & STOCK ADJUSTMENT APIs ================= */

export const getProductionInventory = async (params = {}, token = null) => {
  try {
    const headers = params?.companyId ? { 'x-company-id': params.companyId } : {};
    return await getRequest(SummaryApi.getProductionInventory(params), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production inventory:', error.message || error);
    return { success: true, data: [] };
  }
};

export const adjustProductionStock = async (adjustmentData, token = null) => {
  try {
    const headers = adjustmentData?.companyId ? { 'x-company-id': adjustmentData.companyId } : {};
    return await postRequest(SummaryApi.adjustProductionStock, adjustmentData, token, headers);
  } catch (error) {
    console.error('Error adjusting stock:', error.message || error);
    throw error;
  }
};

/* ================= PRODUCTION SUMMARY & DASHBOARD APIs ================= */

export const getProjectProductionSummary = async (projectId, companyId = null, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    const res = await getRequest(SummaryApi.getProjectProductionSummary(projectId, companyId), token, null, headers);
    if (res?.success && res.data) {
      return res;
    }
    // Try costing endpoint fallback
    return await getProjectLaborCosting(projectId, companyId, token);
  } catch (error) {
    try {
      return await getProjectLaborCosting(projectId, companyId, token);
    } catch (costingErr) {
      console.warn('Notice fetching project production summary:', error.message || costingErr.message);
      return { success: false, message: error.message };
    }
  }
};

export const getProductionDashboardStats = async (companyId = null, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await getRequest(SummaryApi.getProductionDashboardStats(companyId), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production dashboard stats:', error.message || error);
    return { success: true, data: {} };
  }
};

/* ================= PRODUCTION STAFF MANAGEMENT APIs ================= */

export const productionStaffLogin = async (mobileNumber, password, companyId = null) => {
  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '').slice(-10);
  const cleanPass = String(password || '').trim() || cleanMobile;
  const payload = {
    mobileNumber: cleanMobile,
    password: cleanPass,
    ...(companyId ? { companyId } : {}),
  };

  try {
    return await postRequest(SummaryApi.productionStaffLogin, payload);
  } catch (error) {
    // Fallback to general staff login
    try {
      return await postRequest(SummaryApi.staffLogin, payload);
    } catch (fallbackErr) {
      console.error('Error in productionStaffLogin:', error.message || fallbackErr.message);
      throw error;
    }
  }
};

export const productionStaffOnboard = async (staffData, token = null) => {
  try {
    const headers = staffData?.companyId ? { 'x-company-id': staffData.companyId } : {};
    return await postRequest(SummaryApi.productionStaffOnboard, staffData, token, headers);
  } catch (error) {
    console.error('Error onboarding production staff:', error.message || error);
    throw error;
  }
};

export const getStaffMembers = async (companyId = null, token = null) => {
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
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};
  try {
    return await getRequest(SummaryApi.getStaffMembers(activeCompanyId), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching staff members:', error.message || error);
    return { success: true, data: [] };
  }
};

export const getProductionStaffMembers = async (params = {}, token = null) => {
  try {
    let activeCompanyId = params?.companyId;
    if (!activeCompanyId) {
      try {
        activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
          (await AsyncStorage.getItem('activeCompanyId'));
      } catch (e) { }
    }
    if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
      activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
    }
    const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};
    return await getRequest(SummaryApi.getProductionStaffMembers({ ...params, companyId: activeCompanyId || undefined }), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production staff members:', error.message || error);
    return { success: true, data: [] };
  }
};

export const updateProductionStaffMember = async (id, companyId, staffData, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await putRequest(SummaryApi.updateProductionStaffMember(id, companyId), staffData, token, headers);
  } catch (error) {
    console.error('Error updating production staff member:', error.message || error);
    throw error;
  }
};

export const deleteProductionStaffMember = async (id, companyId, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await deleteRequest(SummaryApi.deleteProductionStaffMember(id, companyId), token, headers);
  } catch (error) {
    console.error('Error deleting production staff member:', error.message || error);
    throw error;
  }
};

export const assignProductionStaff = async (assignmentData, token = null) => {
  try {
    const headers = assignmentData?.companyId ? { 'x-company-id': assignmentData.companyId } : {};
    return await postRequest(SummaryApi.assignProductionStaff, assignmentData, token, headers);
  } catch (error) {
    console.error('Error assigning production staff:', error.message || error);
    throw error;
  }
};

export const getProductionStaffAssignments = async (params = {}, token = null) => {
  try {
    const headers = params?.companyId ? { 'x-company-id': params.companyId } : {};
    return await getRequest(SummaryApi.getProductionStaffAssignments(params), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production staff assignments:', error.message || error);
    return { success: true, data: [] };
  }
};

export const updateProductionStaffAssignment = async (id, companyId, updateData, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await putRequest(SummaryApi.updateProductionStaffAssignment(id, companyId), updateData, token, headers);
  } catch (error) {
    console.error('Error updating production staff assignment:', error.message || error);
    throw error;
  }
};

export const deleteProductionStaffAssignment = async (id, companyId, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await deleteRequest(SummaryApi.deleteProductionStaffAssignment(id, companyId), token, headers);
  } catch (error) {
    console.error('Error deleting production staff assignment:', error.message || error);
    throw error;
  }
};

/* ================= PRODUCTION TASKS APIs ================= */

export const getProductionTasks = async (params = {}, token = null) => {
  try {
    let companyId = params?.companyId;
    if (!companyId) {
      try {
        companyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
          (await AsyncStorage.getItem('activeCompanyId'));
      } catch (e) { }
    }
    if (typeof companyId === 'object' && companyId !== null) {
      companyId = companyId._id || companyId.id || null;
    }
    const finalParams = {
      ...params,
      ...(companyId ? { companyId } : {}),
    };
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await getRequest(SummaryApi.getProductionTasks(finalParams), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production tasks:', error.message || error);
    return { success: true, data: [] };
  }
};

export const createProductionTask = async (taskData, token = null) => {
  let activeCompanyId = taskData?.companyId;
  if (!activeCompanyId) {
    try {
      activeCompanyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
        (await AsyncStorage.getItem('activeCompanyId'));
    } catch (e) { }
  }
  if (typeof activeCompanyId === 'object' && activeCompanyId !== null) {
    activeCompanyId = activeCompanyId._id || activeCompanyId.id || null;
  }
  const headers = activeCompanyId ? { 'x-company-id': activeCompanyId } : {};

  const cleanPayload = {
    ...taskData,
    companyId: activeCompanyId || taskData?.companyId,
    title: taskData?.title || taskData?.name || 'Task',
    name: taskData?.title || taskData?.name || 'Task',
    priority: (taskData?.priority || 'MEDIUM').toUpperCase(),
    status: normalizeTaskStatus(taskData?.status),
  };

  try {
    return await postRequest(SummaryApi.createProductionTask, cleanPayload, token, headers);
  } catch (error) {
    console.error('Error creating production task:', error.message || error);
    throw error;
  }
};

export const updateProductionTask = async (id, companyId, taskData, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    const cleanPayload = typeof taskData === 'object' && taskData !== null ? {
      ...taskData,
      ...(taskData.status ? { status: normalizeTaskStatus(taskData.status) } : {}),
    } : taskData;
    return await putRequest(SummaryApi.updateProductionTask(id, companyId), cleanPayload, token, headers);
  } catch (error) {
    console.error('Error updating production task:', error.message || error);
    throw error;
  }
};

export const deleteProductionTask = async (id, companyId, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await deleteRequest(SummaryApi.deleteProductionTask(id, companyId), token, headers);
  } catch (error) {
    console.error('Error deleting production task:', error.message || error);
    throw error;
  }
};

/* ================= AUTH ME & UNIFIED STAFF LOGIN ================= */

export const getAuthMeProfile = async (token = null) => {
  try {
    return await getRequest(SummaryApi.authMe, token);
  } catch (error) {
    console.warn('Notice fetching auth/me profile:', error.message || error);
    return { success: false, message: error.message };
  }
};

export const authStaffLogin = async (mobileNumber, password) => {
  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '').slice(-10);
  const cleanPass = String(password || '').trim() || cleanMobile;
  try {
    return await postRequest(SummaryApi.authStaffLogin, {
      mobileNumber: cleanMobile,
      password: cleanPass,
    });
  } catch (error) {
    console.error('Error in authStaffLogin:', error.message || error);
    throw error;
  }
};

/* ================= PRODUCTION TIME LOGS APIs ================= */

export const createProductionTimeLog = async (timeLogData, token = null) => {
  try {
    const headers = timeLogData?.companyId ? { 'x-company-id': timeLogData.companyId } : {};
    return await postRequest(SummaryApi.createProductionTimeLog, timeLogData, token, headers);
  } catch (error) {
    console.error('Error creating production time log:', error.message || error);
    throw error;
  }
};

export const getProductionTimeLogs = async (params = {}, token = null) => {
  try {
    let companyId = params?.companyId;
    if (!companyId) {
      try {
        companyId = (await AsyncStorage.getItem('selectedCompanyId')) ||
          (await AsyncStorage.getItem('activeCompanyId'));
      } catch (e) { }
    }
    if (typeof companyId === 'object' && companyId !== null) {
      companyId = companyId._id || companyId.id || null;
    }
    const finalParams = {
      ...params,
      ...(companyId ? { companyId } : {}),
    };
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await getRequest(SummaryApi.getProductionTimeLogs(finalParams), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching production time logs:', error.message || error);
    return { success: true, data: [] };
  }
};

export const updateProductionTimeLog = async (id, companyId, updateData, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await putRequest(SummaryApi.updateProductionTimeLog(id, companyId), updateData, token, headers);
  } catch (error) {
    console.error('Error updating production time log:', error.message || error);
    throw error;
  }
};

export const deleteProductionTimeLog = async (id, companyId, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await deleteRequest(SummaryApi.deleteProductionTimeLog(id, companyId), token, headers);
  } catch (error) {
    console.error('Error deleting production time log:', error.message || error);
    throw error;
  }
};

/* ================= STAFF MATERIAL DEMANDS & ISSUANCE APIs ================= */

export const staffRaiseMaterialDemand = async (demandData, token = null) => {
  try {
    const headers = demandData?.companyId ? { 'x-company-id': demandData.companyId } : {};
    return await postRequest(SummaryApi.staffRaiseMaterialDemand, demandData, token, headers);
  } catch (error) {
    // Fallback to general production demand endpoint
    try {
      const headers = demandData?.companyId ? { 'x-company-id': demandData.companyId } : {};
      return await postRequest(SummaryApi.raiseProductionDemand, demandData, token, headers);
    } catch (fallbackErr) {
      console.error('Error raising staff material demand:', error.message || fallbackErr.message);
      throw error;
    }
  }
};

export const staffIssueMaterial = async (issueData, token = null) => {
  try {
    const headers = issueData?.companyId ? { 'x-company-id': issueData.companyId } : {};
    return await postRequest(SummaryApi.staffIssueMaterial, issueData, token, headers);
  } catch (error) {
    // Fallback to general production issue endpoint
    try {
      const headers = issueData?.companyId ? { 'x-company-id': issueData.companyId } : {};
      return await postRequest(SummaryApi.issueProductionMaterial, issueData, token, headers);
    } catch (fallbackErr) {
      console.error('Error issuing material to staff:', error.message || fallbackErr.message);
      throw error;
    }
  }
};

/* ================= STAFF LABOR COSTING BREAKDOWN APIs ================= */

export const getProjectLaborCosting = async (projectId, companyId = null, token = null) => {
  try {
    const headers = companyId ? { 'x-company-id': companyId } : {};
    return await getRequest(SummaryApi.getProjectLaborCosting(projectId, companyId), token, null, headers);
  } catch (error) {
    console.warn('Notice fetching project labor costing:', error.message || error);
    return { success: false, message: error.message };
  }
};


