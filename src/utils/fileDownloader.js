import { NativeModules, Platform, Linking, Share, Alert } from 'react-native';
import { resolveImageUrl } from '../services/uploadService';

const { FileDownloader } = NativeModules;

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif'];

/**
 * Downloads a file directly to the device's storage.
 *
 * - **Images** → saved to phone Gallery (DCIM/Pravisti folder)
 * - **PDFs / Docs** → saved to Downloads folder
 * - System download notification shown during download.
 *
 * @param {string} url - Stored or remote URL of the file
 * @param {string} [customFileName] - Optional custom name for the saved file
 * @param {string} [label] - Human readable label (e.g. 'Receipt', 'Bilty')
 * @returns {Promise<{success: boolean, method?: string, error?: any}>}
 */
export const downloadFileToDevice = async (url, customFileName = null, label = 'File') => {
  if (!url) {
    Alert.alert(label, 'No attachment URL found to download.');
    return { success: false, error: 'No URL' };
  }

  const resolvedUrl = resolveImageUrl(url);

  // Generate safe filename from URL if not provided
  let fileName = customFileName;
  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    const cleanUrl = resolvedUrl.split('?')[0];
    const extracted = cleanUrl.split('/').pop();
    fileName = extracted && extracted.length > 3 ? extracted : `Pravisti_${label}_${Date.now()}`;
  }

  // Detect extension
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  let ext = extMatch ? extMatch[1].toLowerCase() : null;

  // If no extension, try to get it from URL
  if (!ext) {
    const urlClean = resolvedUrl.split('?')[0];
    const urlExtMatch = urlClean.match(/\.([a-zA-Z0-9]+)$/);
    ext = urlExtMatch ? urlExtMatch[1].toLowerCase() : 'jpg';
    fileName += `.${ext}`;
  }

  // Clean filename for filesystem safety
  fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  const isImage = IMAGE_EXTS.includes(ext);

  // If Android and native FileDownloader module exists → use native DownloadManager
  if (Platform.OS === 'android' && FileDownloader?.downloadFile) {
    try {
      await FileDownloader.downloadFile(resolvedUrl, fileName);
      // Native module handles toast itself
      return { success: true, method: isImage ? 'gallery' : 'downloads', fileName };
    } catch (err) {
      console.warn('[FileDownloader] Native download failed, falling back:', err);
    }
  }

  // Fallback: Open URL in browser or show Share sheet (iOS / no native module)
  try {
    const canOpen = await Linking.canOpenURL(resolvedUrl);
    if (canOpen) {
      await Linking.openURL(resolvedUrl);
      return { success: true, method: 'browser' };
    } else {
      await Share.share({
        title: `${label} File`,
        message: resolvedUrl,
        url: resolvedUrl,
      });
      return { success: true, method: 'share' };
    }
  } catch (fallbackErr) {
    console.error('[FileDownloader] Fallback failed:', fallbackErr);
    Alert.alert(label, 'Unable to download file. Please check your internet connection and try again.');
    return { success: false, error: fallbackErr };
  }
};

export default downloadFileToDevice;

