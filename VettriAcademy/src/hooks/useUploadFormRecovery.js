import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only form details/file URI are stored here. Cloud offsets and completed upload
// details are kept separately by directCloudinaryUpload, scoped to this account.
export function useUploadFormRecovery(screen, restore) {
  const ownerId = useSelector((state) => state.auth.user?._id);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const key = `@vettri_upload_form_v1:${ownerId}:${screen}`;
  useEffect(() => {
    if (!ownerId || Platform.OS === 'web') return;
    let active = true;
    AsyncStorage.getItem(key).then((raw) => {
      const draft = raw ? JSON.parse(raw) : null;
      if (active && draft?.file?.uri) restoreRef.current(draft);
    }).catch(() => {});
    return () => { active = false; };
  }, [key, ownerId]);
  return {
    ownerId,
    saveDraft: (draft) => Platform.OS === 'web' ? Promise.resolve() : AsyncStorage.setItem(key, JSON.stringify(draft)).catch(() => {}),
    clearDraft: () => AsyncStorage.removeItem(key).catch(() => {}),
  };
}
