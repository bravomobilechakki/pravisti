import AsyncStorage from '@react-native-async-storage/async-storage';
import SummaryApi, { backendDomain } from '../common';

// Maximum allowed image file size: 5MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// Allowed MIME types and extensions
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validates an image file before upload.
 * @param {Object|string} file - React Native asset object, File object, or file path
 * @throws {Error} User-friendly error if validation fails
 */
export const validateImage = (file) => {
  if (!file) {
    throw new Error('No image file selected.');
  }

  // Check file size if available
  const size = file.fileSize || file.size;
  if (size && size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMB = (size / (1024 * 1024)).toFixed(1);
    throw new Error(`Image size (${sizeInMB}MB) exceeds the maximum allowed limit of 5MB.`);
  }

  // Check file type or extension
  const mimeType = file.type || file.mime;
  const fileName = file.fileName || file.name || (typeof file === 'string' ? file : '');

  if (mimeType) {
    const isAllowedMime = ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
    if (!isAllowedMime) {
      throw new Error(`Unsupported file type (${mimeType}). Please select a JPG, JPEG, PNG, or WebP image.`);
    }
  } else if (fileName) {
    const lowerName = fileName.toLowerCase();
    const isAllowedExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isAllowedExt) {
      throw new Error('Unsupported image format. Please select a JPG, JPEG, PNG, or WebP file.');
    }
  }

  return true;
};

/**
 * Converts a stored relative image URL or filename into a fully qualified,
 * accessible URL using the backend domain.
 * @param {string} url - Stored image URL, relative path, or filename
 * @returns {string} Fully resolved browser/mobile accessible URL
 */
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already an absolute remote URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it points to an old localhost mock URL, rewrite it to current backend domain
    if (trimmed.includes('localhost:') || trimmed.includes('127.0.0.1:')) {
      const pathPart = trimmed.replace(/^https?:\/\/[^/]+/, '');
      return `${backendDomain}${pathPart.startsWith('/') ? '' : '/'}${pathPart}`;
    }
    return trimmed;
  }

  // Local device path or data URI
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }

  // Relative path starting with /api/uploads/ or /uploads/
  if (trimmed.startsWith('/api/uploads/') || trimmed.startsWith('/uploads/')) {
    return `${backendDomain}${trimmed}`;
  }

  // Relative path starting with api/uploads/ or uploads/
  if (trimmed.startsWith('api/uploads/') || trimmed.startsWith('uploads/')) {
    return `${backendDomain}/${trimmed}`;
  }

  // If it's just a filename like 'img_12345_abc.jpg'
  return `${backendDomain}/api/uploads/${trimmed}`;
};

/**
 * Uploads a single image to the backend.
 * @param {Object|string} file - React Native asset object, File, or URI string
 * @param {Object} [options] - Optional configurations
 * @returns {Promise<string>} Stored image URL (e.g. "/api/uploads/img_xxx.jpg")
 */
export const uploadImage = async (file, options = {}) => {
  try {
    validateImage(file);

    const formData = new FormData();

    if (typeof file === 'object' && file !== null && (file.uri || file instanceof Blob)) {
      const fileName = file.fileName || file.name || `img_${Date.now()}.jpg`;
      const mimeType =
        file.type ||
        (fileName.toLowerCase().endsWith('.png')
          ? 'image/png'
          : fileName.toLowerCase().endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg');

      formData.append('image', {
        uri: file.uri || file,
        name: fileName,
        type: mimeType,
      });
    } else if (typeof file === 'string') {
      const fileName = file.split('/').pop() || `img_${Date.now()}.jpg`;
      formData.append('image', {
        uri: file,
        name: fileName,
        type: 'image/jpeg',
      });
    } else {
      formData.append('image', file);
    }

    let token = options.token;
    if (!token) {
      try {
        token = await AsyncStorage.getItem('userToken');
      } catch (e) {
        console.warn('uploadImage: failed to get userToken:', e);
      }
    }

    const headers = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const uploadUrl = SummaryApi.uploadSingle?.url || `${backendDomain}/api/upload/single`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Upload failed (${response.status}): ${responseText.substring(0, 100)}`);
    }

    if (!response.ok || (data && data.success === false)) {
      throw new Error(data.message || 'Image upload failed. Please try again.');
    }

    // Extract URL from various response formats
    const uploadedUrl =
      data.data?.url ||
      data.data?.file?.url ||
      data.data?.path ||
      data.url ||
      (typeof data.data === 'string' ? data.data : null);

    if (!uploadedUrl) {
      throw new Error('Image uploaded but no URL was returned by server.');
    }

    return uploadedUrl;
  } catch (error) {
    console.error('uploadService.uploadImage error:', error);
    throw error;
  }
};

/**
 * Uploads multiple images to the backend (max 10).
 * @param {Array<Object|string>} files - Array of image assets/files
 * @param {Object} [options] - Optional configurations
 * @returns {Promise<Array<string>>} Array of uploaded image URLs
 */
export const uploadMultipleImages = async (files, options = {}) => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for multiple upload.');
    }

    if (files.length > 10) {
      throw new Error('Cannot upload more than 10 images at once.');
    }

    // Validate all files first
    files.forEach((f) => validateImage(f));

    const formData = new FormData();

    files.forEach((file, index) => {
      if (typeof file === 'object' && file !== null && (file.uri || file instanceof Blob)) {
        const fileName = file.fileName || file.name || `img_${Date.now()}_${index}.jpg`;
        const mimeType =
          file.type ||
          (fileName.toLowerCase().endsWith('.png')
            ? 'image/png'
            : fileName.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg');

        formData.append('images', {
          uri: file.uri || file,
          name: fileName,
          type: mimeType,
        });
      } else if (typeof file === 'string') {
        const fileName = file.split('/').pop() || `img_${Date.now()}_${index}.jpg`;
        formData.append('images', {
          uri: file,
          name: fileName,
          type: 'image/jpeg',
        });
      } else {
        formData.append('images', file);
      }
    });

    let token = options.token;
    if (!token) {
      try {
        token = await AsyncStorage.getItem('userToken');
      } catch (e) {
        console.warn('uploadMultipleImages: failed to get userToken:', e);
      }
    }

    const headers = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const uploadUrl = SummaryApi.uploadMultiple?.url || `${backendDomain}/api/upload/multiple`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Multiple upload failed (${response.status}): ${responseText.substring(0, 100)}`);
    }

    if (!response.ok || (data && data.success === false)) {
      throw new Error(data.message || 'Multiple image upload failed. Please try again.');
    }

    const urls =
      data.data?.urls ||
      data.urls ||
      (Array.isArray(data.data) ? data.data.map((item) => (typeof item === 'string' ? item : item.url)) : []) ||
      [];

    return urls;
  } catch (error) {
    console.error('uploadService.uploadMultipleImages error:', error);
    throw error;
  }
};

/**
 * Deletes an uploaded image by filename or URL.
 * @param {string} filenameOrUrl - Filename (img_xxx.jpg) or full/relative URL
 * @param {Object} [options] - Optional configurations
 * @returns {Promise<Object>} API response
 */
export const deleteImage = async (filenameOrUrl, options = {}) => {
  try {
    if (!filenameOrUrl) return { success: true };

    // Extract filename from URL/path
    const filename = filenameOrUrl.split('/').pop();
    if (!filename) return { success: true };

    let token = options.token;
    if (!token) {
      try {
        token = await AsyncStorage.getItem('userToken');
      } catch (e) { }
    }

    const headers = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const deleteUrl = SummaryApi.deleteUpload
      ? SummaryApi.deleteUpload(filename).url
      : `${backendDomain}/api/upload/${filename}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('uploadService.deleteImage error:', error);
    return { success: false, error: error.message };
  }
};

export const uploadService = {
  uploadImage,
  uploadMultipleImages,
  resolveImageUrl,
  deleteImage,
  validateImage,
};

export default uploadService;
