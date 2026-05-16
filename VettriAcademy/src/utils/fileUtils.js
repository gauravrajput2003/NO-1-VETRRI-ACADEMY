/**
 * ─── Universal File Utilities for Vettri Academy ────────────────────────────
 * 
 * Provides file type detection, MIME mapping, blocked site detection,
 * download helpers, and temp file management for the EdTech platform.
 * 
 * Architecture decisions:
 * - Uses expo-file-system (not react-native-fs) because the app runs on Expo managed workflow
 * - Uses expo-sharing to open files in native apps (replaces react-native-file-viewer)
 * - Downloads to cacheDirectory for auto-cleanup by OS
 * - Detects CSP-blocked websites and falls back to Linking.openURL
 */

import * as Sharing from 'expo-sharing';
import { Platform, Linking, Alert } from 'react-native';

// ─── File Type Detection ────────────────────────────────────────────────────

/** MIME type → preview category mapping */
const MIME_MAP = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image',
  'image/webp': 'image', 'image/bmp': 'image', 'image/svg+xml': 'image',
  'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video',
  'video/x-msvideo': 'video', 'video/x-matroska': 'video',
  'text/plain': 'text', 'text/html': 'text', 'text/csv': 'text',
  'application/vnd.ms-powerpoint': 'office',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'office',
  'application/msword': 'office',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'office',
  'application/vnd.ms-excel': 'office',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'office',
  'application/zip': 'archive', 'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
};

/** Extension → preview category mapping */
const EXT_MAP = {
  pdf: 'pdf',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
  webp: 'image', bmp: 'image', svg: 'image',
  mp4: 'video', mov: 'video', webm: 'video', avi: 'video', mkv: 'video', m4v: 'video',
  txt: 'text', csv: 'text', log: 'text', md: 'text',
  ppt: 'office', pptx: 'office', doc: 'office', docx: 'office',
  xls: 'office', xlsx: 'office',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
};

/** Icon mapping for file types */
export const FILE_TYPE_ICONS = {
  pdf: { name: 'document-text', color: '#F44336' },
  image: { name: 'image', color: '#4CAF50' },
  video: { name: 'videocam', color: '#2196F3' },
  text: { name: 'document', color: '#607D8B' },
  office: { name: 'easel', color: '#FF9800' },
  archive: { name: 'archive', color: '#795548' },
  unknown: { name: 'help-circle', color: '#9E9E9E' },
};

/**
 * Detect the preview category for a file.
 * Uses a waterfall: explicit type → MIME → extension → URL extension → fallback
 */
export const detectFileType = (options = {}) => {
  const { type, mimeType, extension, url, filename } = options;

  // 1. Explicit type from backend
  if (type && type !== 'unknown') {
    const normalized = type.toLowerCase();
    if (['pdf', 'image', 'video', 'text'].includes(normalized)) return normalized;
    if (['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(normalized)) return 'office';
    if (['zip', 'rar', '7z'].includes(normalized)) return 'archive';
  }

  // 2. MIME type detection
  if (mimeType) {
    const mime = mimeType.toLowerCase();
    if (MIME_MAP[mime]) return MIME_MAP[mime];
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('text/')) return 'text';
    if (mime.startsWith('audio/')) return 'audio';
  }

  // 3. Extension from metadata
  if (extension) {
    const ext = extension.toLowerCase().replace(/^\./, '');
    if (EXT_MAP[ext]) return EXT_MAP[ext];
  }

  // 4. Extension from filename
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && EXT_MAP[ext]) return EXT_MAP[ext];
  }

  // 5. Extension from URL
  if (url) {
    try {
      const cleanUrl = url.split('?')[0].split('#')[0];
      const ext = cleanUrl.split('.').pop()?.toLowerCase();
      if (ext && EXT_MAP[ext]) return EXT_MAP[ext];
    } catch (e) { /* ignore */ }
  }

  return 'unknown';
};

// ─── Blocked Website Detection ──────────────────────────────────────────────
/**
 * Some government and institutional websites block iframe/WebView embedding
 * via CSP frame-ancestors or X-Frame-Options headers.
 * We detect these and automatically fallback to external browser.
 */

const BLOCKED_DOMAINS = [
  'ncert.nic.in',        // NCERT — blocks embedding via CSP
  'cbse.gov.in',         // CBSE — government site
  'nios.ac.in',          // NIOS — government site
  'ugc.ac.in',           // UGC — government site
  'mhrd.gov.in',         // Ministry of Education
  'education.gov.in',    // Education ministry
  'ignou.ac.in',         // IGNOU
  'epathshala.nic.in',   // ePathshala
  'diksha.gov.in',       // DIKSHA platform
];

/**
 * Check if a URL belongs to a domain that blocks WebView/iframe embedding.
 * Returns { blocked: boolean, domain: string, reason: string }
 */
export const checkBlockedSite = (url) => {
  if (!url) return { blocked: false };
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const match = BLOCKED_DOMAINS.find(d => hostname === d || hostname.endsWith('.' + d));
    if (match) {
      return {
        blocked: true,
        domain: match,
        reason: `${match} blocks in-app viewing due to security restrictions (CSP frame-ancestors). Opening in external browser instead.`,
      };
    }
  } catch (e) { /* invalid URL — not blocked */ }
  return { blocked: false };
};

/**
 * Smart URL opener — checks for blocked sites first,
 * falls back to Linking.openURL for blocked domains.
 */
export const smartOpenUrl = async (url, navigation, screenName = 'DocumentViewer', params = {}) => {
  const blockCheck = checkBlockedSite(url);
  
  if (blockCheck.blocked) {
    // Show user-friendly message before opening externally
    Alert.alert(
      '🌐 Opening in Browser',
      blockCheck.reason,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Browser', onPress: () => Linking.openURL(url) },
      ]
    );
    return false; // Indicate we didn't open in-app
  }

  // Open in-app
  if (navigation) {
    navigation.navigate(screenName, { url, ...params });
  }
  return true; // Opened in-app
};

// ─── File Download & Management ─────────────────────────────────────────────

const isWeb = Platform.OS === 'web';

/**
 * WEB: Trigger a browser download using Linking.openURL.
 * This preserves Cloudinary's Content-Disposition headers (fl_attachment)
 * which give the file the correct name and extension in the browser.
 */
const webDownloadFile = (url) => {
  Linking.openURL(url);
};

/**
 * Download a file. Platform-aware:
 * - Web: triggers browser download via anchor tag
 * - Native: downloads to cache using expo-file-system, returns { uri, filename, size }
 */
export const downloadFileToCache = async (url, filename, onProgress) => {
  if (!url) throw new Error('No download URL provided');

  // WEB: Use browser-native download — expo-file-system is NOT available on web
  if (isWeb) {
    webDownloadFile(url, filename);
    return { uri: url, filename: filename || 'download', size: 0, cached: false, web: true };
  }

  // NATIVE: Use expo-file-system for disk-based streaming download
  const LegacyFS = require('expo-file-system/legacy');
  const safeFilename = (filename || 'download').replace(/[^a-zA-Z0-9._-]/g, '_');
  const localUri = LegacyFS.cacheDirectory + safeFilename;

  // Check if already cached
  try {
    const fileInfo = await LegacyFS.getInfoAsync(localUri);
    if (fileInfo.exists && fileInfo.size > 0) {
      return { uri: localUri, filename: safeFilename, size: fileInfo.size, cached: true };
    }
  } catch (e) { /* not cached, proceed to download */ }

  // Download with progress tracking
  const downloadResumable = LegacyFS.createDownloadResumable(
    url,
    localUri,
    {},
    (progress) => {
      if (onProgress && progress.totalBytesExpectedToWrite > 0) {
        const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
        onProgress(pct);
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || result.status !== 200) {
    throw new Error(`Download failed with status: ${result?.status || 'unknown'}`);
  }

  let size = 0;
  try {
    const dlInfo = await LegacyFS.getInfoAsync(result.uri);
    size = dlInfo.size || 0;
  } catch (e) { /* ignore size check failure */ }

  return { uri: result.uri, filename: safeFilename, size, cached: false };
};

/**
 * Download and open a file using the native share sheet / file viewer.
 * Web: opens the URL directly in the browser.
 * Native: downloads to cache then opens via expo-sharing.
 */
export const downloadAndOpenFile = async (url, filename, onProgress) => {
  // WEB: Just trigger browser download
  if (isWeb) {
    webDownloadFile(url, filename);
    return { uri: url, filename, web: true };
  }

  // NATIVE: Download then share
  const file = await downloadFileToCache(url, filename, onProgress);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: getMimeType(filename),
      dialogTitle: `Open ${filename}`,
    });
  } else {
    Linking.openURL(url);
  }
  return file;
};

/**
 * Get MIME type from filename extension.
 */
export const getMimeType = (filename) => {
  if (!filename) return 'application/octet-stream';
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimes = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    txt: 'text/plain', csv: 'text/csv', html: 'text/html',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', rar: 'application/x-rar-compressed',
  };
  return mimes[ext] || 'application/octet-stream';
};

/**
 * Clean up old cached files. Only runs on native (no-op on web).
 * Cleans files older than maxAge (default 7 days) from cache.
 */
export const cleanupTempFiles = async (maxAgeMs = 7 * 24 * 60 * 60 * 1000) => {
  // Web has no local file cache to clean
  if (isWeb) return 0;

  try {
    const LegacyFS = require('expo-file-system/legacy');
    const cacheDir = LegacyFS.cacheDirectory;
    const files = await LegacyFS.readDirectoryAsync(cacheDir);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      if (file.startsWith('.') || file === 'ExponentExperienceData') continue;
      try {
        const filePath = cacheDir + file;
        const info = await LegacyFS.getInfoAsync(filePath);
        if (info.exists && info.modificationTime) {
          const fileAge = now - (info.modificationTime * 1000);
          if (fileAge > maxAgeMs) {
            await LegacyFS.deleteAsync(filePath, { idempotent: true });
            cleaned++;
          }
        }
      } catch (e) { /* skip */ }
    }
    return cleaned;
  } catch (e) {
    console.warn('Cache cleanup error:', e);
    return 0;
  }
};

// ─── PDF Google Docs Viewer URL Builder ─────────────────────────────────────
/**
 * Build a Google Docs viewer URL for PDFs.
 * This is a reliable fallback when native PDF rendering isn't available.
 * Google Docs viewer handles PDFs, DOC, XLS, PPT, etc.
 */
export const buildGoogleDocsViewerUrl = (fileUrl) => {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
};

/**
 * Build an Office Online viewer URL for Office documents.
 */
export const buildOfficeViewerUrl = (fileUrl) => {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
};

/**
 * Determine the best preview strategy for a file.
 * Returns: { strategy, viewerUrl, canPreviewInApp }
 * 
 * Strategies:
 * - 'image': Show with native Image component
 * - 'pdf-webview': Render PDF in WebView via Google Docs
 * - 'video-webview': Render video in WebView with HTML5 player
 * - 'office-viewer': Use Microsoft Office Online viewer
 * - 'text-webview': Render text content in WebView
 * - 'download-open': Download file and open with native app (docx, pptx, etc.)
 * - 'external': Open in external browser (blocked sites)
 * - 'unsupported': No preview available
 */
export const getPreviewStrategy = (fileType, url) => {
  // Check for blocked sites first
  const blockCheck = checkBlockedSite(url);
  if (blockCheck.blocked) {
    return { strategy: 'external', canPreviewInApp: false, reason: blockCheck.reason };
  }

  switch (fileType) {
    case 'image':
      return { strategy: 'image', canPreviewInApp: true };
    case 'pdf':
      return {
        strategy: 'pdf-webview',
        viewerUrl: buildGoogleDocsViewerUrl(url),
        canPreviewInApp: true,
      };
    case 'video':
      return { strategy: 'video-webview', canPreviewInApp: true };
    case 'text':
      return { strategy: 'text-webview', canPreviewInApp: true };
    case 'office':
      return {
        strategy: 'office-viewer',
        viewerUrl: buildOfficeViewerUrl(url),
        canPreviewInApp: true,
      };
    case 'archive':
      return { strategy: 'download-open', canPreviewInApp: false };
    default:
      return { strategy: 'download-open', canPreviewInApp: false };
  }
};
