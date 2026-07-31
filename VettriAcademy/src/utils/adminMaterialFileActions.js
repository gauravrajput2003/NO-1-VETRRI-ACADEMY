import { Alert, Linking, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from './constants';
import {
  detectFileType,
  getMimeType,
  getPreviewStrategy,
  normalizeMaterialFileUrl,
  silentDownloadFile,
} from './fileUtils';
import { getToken } from '../services/storage';
import { getSignedPdfUrlAPI } from '../services/api';
import { scheduleDownloadCompleteNotification } from '../services/pushNotifications';

export const buildAdminMaterialFileMeta = (material, preview = {}) => {
  const replacement = material?.pendingChanges?.fileReplacement;
  const source = preview?.isPendingReplacement && replacement ? replacement : replacement || material || {};

  return {
    id: material?._id || preview?.id,
    title: material?.title || preview?.title || source.title || 'Material',
    fileUrl: preview?.url || source.fileUrl,
    type: preview?.type || source.type,
    mimeType: preview?.mimeType || source.mimeType,
    storageType: preview?.storageType || source.storageType,
    resourceType: preview?.resourceType || source.resourceType,
    publicId: preview?.publicId || source.publicId,
    extension: preview?.extension || source.extension,
    filename: preview?.filename || source.originalFilename || source.filename,
    fileSize: preview?.fileSize || source.fileSize,
    totalPages: source.totalPages || material?.totalPages || 0,
    isPendingReplacement: !!preview?.isPendingReplacement,
  };
};

export const getAdminDirectDownloadUrl = (materialId, pendingReplacement = false) => {
  const suffix = pendingReplacement ? '?pendingReplacement=true' : '';
  return `${API_BASE_URL}/admin/materials/${materialId}/direct-download${suffix}`;
};

export const openAdminMaterialPreview = async ({ navigation, material, preview }) => {
  const meta = buildAdminMaterialFileMeta(material, preview);
  const url = normalizeMaterialFileUrl(meta.fileUrl, {
    resourceType: meta.resourceType,
    publicId: meta.publicId,
  });

  if (!url) {
    Alert.alert('Preview unavailable', 'No file URL is available for this material.');
    return;
  }

  const fileType = detectFileType({
    type: meta.type,
    mimeType: meta.mimeType,
    extension: meta.extension,
    url,
    filename: meta.filename,
  });
  const strategy = getPreviewStrategy(fileType, url);

  if (fileType === 'pdf' && meta.id) {
    if (meta.resourceType === 'raw' || url.includes('/raw/upload/') || meta.isPendingReplacement) {
      navigation.navigate('DocumentViewer', {
        url,
        title: meta.title,
        fileType: 'pdf',
        mimeType: meta.mimeType,
        extension: meta.extension || 'pdf',
        filename: meta.filename,
      });
      return;
    }

    try {
      const signedRes = await getSignedPdfUrlAPI(meta.id);
      const signedUrl = signedRes.data?.success
        ? normalizeMaterialFileUrl(signedRes.data.url, {
          resourceType: meta.resourceType,
          publicId: meta.publicId,
        })
        : url;
      navigation.navigate('PdfViewer', {
        materialId: meta.id,
        title: meta.title,
        pdfUrl: signedUrl,
        totalPages: signedRes.data?.material?.totalPages || meta.totalPages || 0,
      });
      return;
    } catch {
      navigation.navigate('PdfViewer', {
        materialId: meta.id,
        title: meta.title,
        pdfUrl: url,
        totalPages: meta.totalPages || 0,
      });
      return;
    }
  }

  if (['image', 'office-viewer', 'video-webview', 'text-webview', 'pdf-webview'].includes(strategy.strategy)) {
    navigation.navigate('DocumentViewer', {
      url,
      title: meta.title,
      fileType,
      mimeType: meta.mimeType,
      extension: meta.extension,
      filename: meta.filename,
    });
    return;
  }

  Alert.alert('Preview unavailable', 'This file type cannot be previewed in the app. Please download it instead.');
};

export const downloadAdminMaterialFile = async ({ material, preview, pendingReplacement = false, onProgress }) => {
  const meta = buildAdminMaterialFileMeta(material, preview);
  const filename = meta.filename || `${meta.title}.${meta.extension || 'pdf'}`;
  const directUrl = normalizeMaterialFileUrl(meta.fileUrl, {
    resourceType: meta.resourceType,
    publicId: meta.publicId,
  });

  if (!directUrl) {
    Alert.alert('Download unavailable', 'No file URL is available for this material.');
    return null;
  }

  if (Platform.OS === 'web') {
    await Linking.openURL(directUrl);
    return { uri: directUrl, filename, web: true };
  }

  let file;
  try {
    file = await silentDownloadFile(directUrl, filename, onProgress);
  } catch (downloadErr) {
    const statusText = String(downloadErr?.message || '');
    const shouldRetryViaBackend =
      statusText.includes('401') || statusText.includes('403') || statusText.includes('404');
    if (!shouldRetryViaBackend || !meta.id) throw downloadErr;

    const token = await getToken();
    if (!token) throw downloadErr;

    file = await silentDownloadFile(
      getAdminDirectDownloadUrl(meta.id, pendingReplacement),
      filename,
      onProgress,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  await scheduleDownloadCompleteNotification(filename, file.uri);
  Toast.show({
    type: 'success',
    text1: 'Download Complete',
    text2: `${filename} - tap to open`,
    visibilityTime: 5000,
    onPress: async () => {
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) await Sharing.shareAsync(file.uri, { mimeType: getMimeType(filename) });
      } catch (error) {
        console.warn('Could not open file:', error);
      }
    },
  });

  return file;
};
