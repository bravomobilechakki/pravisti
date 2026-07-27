// API Configuration and Endpoints
// In a real React Native environment with react-native-dotenv or react-native-config,
// you would import this from an environment file.
export const BASE_URL = 'https://pravisti-backend-538238931844.asia-southeast1.run.app';
export const API_PREFIX = '/api';

export const ENDPOINTS = {
  AUTH: {
    SEND_OTP: `${API_PREFIX}/auth/send-otp`,
    VERIFY_OTP: `${API_PREFIX}/auth/verify-otp`,
    ME: `${API_PREFIX}/auth/me`,
    LOGOUT: `${API_PREFIX}/auth/logout`,
  },
  // You can add more categories here as the app grows
  COMPANY: {
    LIST: `${API_PREFIX}/company`,
    DETAILS: (id) => `${API_PREFIX}/company/${id}`,
  }
};
