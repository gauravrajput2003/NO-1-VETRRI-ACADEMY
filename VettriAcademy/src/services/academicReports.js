import { Platform, Linking, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api from './api';
import { getToken } from './storage';
import { API_BASE_URL } from '../utils/constants';

export async function exportAcademicReport(endpoint, params, filename) {
  if (Platform.OS === 'web') {
    const { data } = await api.get(`/academic-reports/${endpoint}`, { params: { ...params, format: 'xlsx' }, responseType: 'blob' });
    const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = `${filename}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
  }
  const query = Object.entries({ ...params, format: 'xlsx' }).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const path = `${FileSystem.cacheDirectory}${filename}.xlsx`;
  const result = await FileSystem.downloadAsync(`${API_BASE_URL}/academic-reports/${endpoint}?${query}`, path, { headers: { Authorization: `Bearer ${await getToken()}` } });
  if (result.status !== 200) throw new Error('Report export failed. Please try again.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: 'Share Excel report' });
}
export async function shareAcademicWhatsApp(message) {
  if (message.length > 60000) throw new Error('The list is too long for a WhatsApp message. Export and share the Excel file instead.');
  try { await Linking.openURL(`${Platform.OS === 'web' ? 'https://wa.me/' : 'whatsapp://send'}?text=${encodeURIComponent(message)}`); }
  catch { await Share.share({ message, title: 'Vettri Academy monthly report' }); }
}
