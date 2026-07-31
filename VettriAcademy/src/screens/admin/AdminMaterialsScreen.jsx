import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import { fetchAdminMaterials, toggleAdminMaterialLock, uploadAdminMaterial, deleteAdminMaterial, editAdminMaterial, fetchFolders, fetchAdminMaterialPreview } from '../../redux/slices/adminSlice';
import { getCoursesMetaAPI } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { MaterialPalette } from '../../utils/theme';
import { detectFileType, normalizeMaterialFileUrl } from '../../utils/fileUtils';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';

const ScaleBtn = ({ onPress, children, activeScale = 0.96, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: activeScale, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled} style={style}>
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

const FadeSlideView = ({ children, index = 0, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }).start();
  }, [anim, index]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return <Animated.View style={[{ opacity: anim, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

const getTypeConfig = (type) => {
  if (type === 'pdf') return { color: '#EF4444', bg: '#FEE2E2', icon: 'document-text' };
  if (type === 'image') return { color: '#22C55E', bg: '#DCFCE7', icon: 'image' };
  if (type === 'video') return { color: '#A855F7', bg: '#F3E8FF', icon: 'videocam' };
  if (type === 'ppt' || type?.includes('presentation')) return { color: '#F97316', bg: '#FFEDD5', icon: 'easel' };
  return { color: '#3B82F6', bg: '#DBEAFE', icon: 'document' };
};

const FILTER_ICONS = {
  'All': '📚',
  'Pending Review': '⏳',
  'Approved': '✅',
  'Rejected': '❌',
};

const appendPickedFile = (formData, pickedFile) => {
  if (Platform.OS === 'web' && pickedFile.file) {
    formData.append('file', pickedFile.file);
  } else {
    formData.append('file', {
      uri: pickedFile.uri,
      name: pickedFile.name,
      type: pickedFile.mimeType || 'application/octet-stream',
    });
  }
};

export default function AdminMaterialsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { materials, folders, loading, previewLoading } = useSelector((s) => s.admin);
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All');

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableGrades, setAvailableGrades] = useState([]);

  // Modal State
  const [isUploadModalVisible, setUploadModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // Form State
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [description, setDescription] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewingId, setPreviewingId] = useState(null);

  useEffect(() => {
    if (navigation) navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchAdminMaterials());
    dispatch(fetchFolders());
    loadMeta();
  }, [dispatch]);

  const loadMeta = async () => {
    try {
      const { data } = await getCoursesMetaAPI();
      if (data.success) {
        setAvailableSubjects(data.subjects || []);
        setAvailableGrades(data.grades || []);
      }
    } catch (e) {
      console.log('Error loading courses meta', e);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'video/*', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedFile = result.assets[0];

        const isVideo = pickedFile.mimeType?.startsWith('video/');
        const isDoc = pickedFile.mimeType === 'application/pdf' || pickedFile.mimeType?.includes('presentation');
        const maxSize = isVideo ? 500 * 1024 * 1024 : isDoc ? 50 * 1024 * 1024 : 20 * 1024 * 1024;

        if (pickedFile.size > maxSize) {
          Toast.show({ type: 'error', text1: 'File too large', text2: `Max size is ${formatFileSize(maxSize)}` });
          return;
        }

        setFile(pickedFile);
      }
    } catch (err) {
      console.log('Error picking file', err);
    }
  };

  const handleUploadOrUpdate = async () => {
    if (!editingMaterial && !file) return Toast.show({ type: 'error', text1: 'Please select a file' });
    if (!title.trim()) return Toast.show({ type: 'error', text1: 'Please enter a title' });
    if (!subject) return Toast.show({ type: 'error', text1: 'Please select a subject' });
    if (!grade) return Toast.show({ type: 'error', text1: 'Please select a grade' });

    const isReplacingFile = !!editingMaterial && !!file;

    setUploading(true);

    if (editingMaterial) {
      try {
        let updateData = { title, subject, grade, description, lockedForAll: isLocked };

        if (file) {
          updateData = new FormData();
          updateData.append('title', title);
          updateData.append('subject', subject);
          updateData.append('grade', grade);
          updateData.append('description', description);
          updateData.append('lockedForAll', isLocked);
          appendPickedFile(updateData, file);
        }

        const resultAction = await dispatch(editAdminMaterial({
          id: editingMaterial._id,
          data: updateData
        }));
        if (editAdminMaterial.fulfilled.match(resultAction)) {
          Toast.show({ type: 'success', text1: isReplacingFile ? 'File replaced successfully!' : 'Updated successfully!' });
          closeUploadModal();
        } else {
          Toast.show({ type: 'error', text1: 'Update failed' });
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Network error' });
      } finally {
        setUploading(false);
      }
    } else {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('grade', grade);
      formData.append('description', description);
      formData.append('lockedForAll', isLocked);

      appendPickedFile(formData, file);

      try {
        const resultAction = await dispatch(uploadAdminMaterial(formData));
        if (uploadAdminMaterial.fulfilled.match(resultAction)) {
          Toast.show({ type: 'success', text1: 'Uploaded successfully!' });
          closeUploadModal();
          dispatch(fetchAdminMaterials());
        } else {
          Toast.show({ type: 'error', text1: 'Upload failed' });
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Network error' });
      } finally {
        setUploading(false);
      }
    }
  };

  const closeUploadModal = () => {
    setUploadModalVisible(false);
    setEditingMaterial(null);
    setFile(null);
    setTitle('');
    setSubject('');
    setGrade('');
    setDescription('');
    setIsLocked(true);
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);
    setTitle(material.title);
    setSubject(material.subject);
    setGrade(material.grade);
    setDescription(material.description || '');
    setIsLocked(material.lockedForAll);
    setFile(null);
    setUploadModalVisible(true);
  };

  const handleToggleLock = (material) => {
    const action = material.lockedForAll ? 'Unlock for all' : 'Lock for all';
    Alert.alert(`${action}?`, `${material.title}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          const result = await dispatch(toggleAdminMaterialLock({ id: material._id, lockedForAll: !material.lockedForAll }));
          if (toggleAdminMaterialLock.fulfilled.match(result)) {
            Toast.show({ type: 'success', text1: material.lockedForAll ? 'Unlocked! 🔓' : 'Locked! 🔒' });
          }
        },
      },
    ]);
  };

  const handleDelete = (material) => {
    Alert.alert('Delete Material?', `Are you sure you want to delete "${material.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const result = await dispatch(deleteAdminMaterial(material._id));
          if (deleteAdminMaterial.fulfilled.match(result)) {
            Toast.show({ type: 'success', text1: 'Material deleted' });
          }
        }
      },
    ]);
  };

  const handlePreview = async (material) => {
    setPreviewingId(material._id);
    try {
      const result = await dispatch(fetchAdminMaterialPreview({ id: material._id }));
      if (!fetchAdminMaterialPreview.fulfilled.match(result)) {
        Toast.show({ type: 'error', text1: 'Preview failed', text2: result.payload });
        return;
      }

      const preview = result.payload;
      const url = normalizeMaterialFileUrl(preview.url, {
        resourceType: preview.resourceType || material.resourceType,
        publicId: material.publicId,
      });
      const fileType = detectFileType({
        type: preview.type || material.type,
        mimeType: preview.mimeType || material.mimeType,
        extension: preview.extension || material.extension,
        url,
        filename: preview.filename || material.originalFilename,
      });

      navigation.navigate('DocumentViewer', {
        url,
        title: material.title,
        fileType,
        mimeType: preview.mimeType || material.mimeType, // Pass full mimeType
        extension: preview.extension || material.extension, // Pass extension
        filename: preview.filename || material.originalFilename, // Pass filename
      });
    } finally {
      setPreviewingId(null);
    }
  };

  const filteredMaterials = (materials || []).filter(m => {
    const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.teacher?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (filterMode === 'All') matchesFilter = true;
    else if (filterMode === 'Pending Review') matchesFilter = m.approvalStatus?.startsWith('pending');
    else if (filterMode === 'Approved') matchesFilter = m.approvalStatus === 'approved';
    else if (filterMode === 'Rejected') matchesFilter = m.approvalStatus === 'rejected';
    else {
      // Must be a folder/class filter
      matchesFilter = (m.folder && m.folder.name === filterMode) || (m.grade === filterMode);
    }

    return matchesSearch && matchesFilter;
  });

  const filterTabs = ['All', 'Pending Review', 'Approved', 'Rejected', ...(folders || []).map(f => f.name || f.title)];

  // ─── Status pills: only the two applicable ones render, always pinned left ──
  const renderStatusPills = (item) => (
    <View style={styles.pillRow}>
      {item.approvalStatus?.startsWith('pending') ? (
        <View style={[styles.statusPill, { backgroundColor: MaterialPalette.goldSoft }]}>
          <Text style={[styles.statusPillText, { color: MaterialPalette.gold }]}>⏳ Pending</Text>
        </View>
      ) : item.approvalStatus === 'rejected' ? (
        <View style={[styles.statusPill, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.statusPillText, { color: '#DC2626' }]}>❌ Rejected</Text>
        </View>
      ) : (
        <View style={[styles.statusPill, { backgroundColor: MaterialPalette.tealLight }]}>
          <Text style={[styles.statusPillText, { color: MaterialPalette.tealDark }]}>✅ Approved</Text>
        </View>
      )}
      {item.lockedForAll ? (
        <View style={[styles.statusPill, { backgroundColor: MaterialPalette.goldSoft }]}>
          <Text style={[styles.statusPillText, { color: MaterialPalette.gold }]}>🔒 Locked</Text>
        </View>
      ) : (
        <View style={[styles.statusPill, { backgroundColor: MaterialPalette.tealLight }]}>
          <Text style={[styles.statusPillText, { color: MaterialPalette.tealDark }]}>🔓 Unlocked</Text>
        </View>
      )}
    </View>
  );

  const renderMaterial = ({ item, index }) => {
    const tConf = getTypeConfig(item.type);
    return (
      <FadeSlideView index={Math.min(index, 10)} style={styles.cardOuter}>
        <View style={styles.card}>
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.cardInner}>
            <ScaleBtn onPress={() => handlePreview(item)} style={[styles.thumbnail, { backgroundColor: tConf.bg }]}>
              {previewLoading && previewingId === item._id ? (
                <ActivityIndicator size="small" color={MaterialPalette.teal} />
              ) : (
                <Ionicons name={tConf.icon} size={32} color={tConf.color} />
              )}
            </ScaleBtn>

            <View style={styles.cardContent}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

              <View style={styles.chipRow}>
                <View style={[styles.infoChip, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.infoChipText, { color: '#0284C7' }]}>{item.subject}</Text></View>
                <View style={[styles.infoChip, { backgroundColor: '#CCFBF1' }]}><Text style={[styles.infoChipText, { color: '#0F766E' }]}>{item.grade}</Text></View>
                <Text style={styles.teacherName}>By: {item.teacher?.name || 'Admin'}</Text>
              </View>

              {renderStatusPills(item)}
            </View>

            <View style={styles.actionCol}>
              <ScaleBtn onPress={() => handleToggleLock(item)} style={styles.actionCircleBtn}>
                <Ionicons name={item.lockedForAll ? 'lock-open' : 'lock-closed'} size={18} color={MaterialPalette.tealDark} />
              </ScaleBtn>
              <ScaleBtn onPress={() => openEditModal(item)} style={styles.actionCircleBtn}>
                <Ionicons name="pencil" size={18} color="#3B82F6" />
              </ScaleBtn>
              <ScaleBtn onPress={() => handleDelete(item)} style={styles.actionCircleBtn}>
                <Ionicons name="trash" size={18} color="#EF4444" />
              </ScaleBtn>
            </View>
          </View>
        </View>
      </FadeSlideView>
    );
  };

  // ─── Everything above the list (header, upload button, search, chips) now ──
  // ─── lives inside ListHeaderComponent so the ENTIRE screen scrolls as one ──
  // ─── unit — this is what makes the page fully scrollable.                ──
  const renderListHeader = () => (
    <>
      <LinearGradient
        colors={[MaterialPalette.primaryPink, MaterialPalette.primaryPinkLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.premiumHeader, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerTopRow}>
          <ScaleBtn style={styles.headerBackBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </ScaleBtn>
        </View>

        <View style={styles.headerTitlesModern}>
          <Text style={styles.headerTitleModern}>Material Library</Text>
          <Text style={styles.headerSubtitleModern}>Manage all educational resources globally</Text>
        </View>
      </LinearGradient>

      <ScaleBtn activeScale={0.96} onPress={() => setUploadModalVisible(true)} style={styles.uploadBtnWrapModern}>
        <LinearGradient colors={[MaterialPalette.teal, MaterialPalette.tealDark]} style={styles.uploadBtnModern} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.uploadIconCircleModern}>
            <Ionicons name="cloud-upload" size={24} color="#FFF" />
          </View>
          <Text style={styles.uploadBtnTextModern}>+ Upload Direct</Text>
        </LinearGradient>
      </ScaleBtn>

      <View style={styles.filterSectionModern}>
        <View style={styles.searchBoxModern}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
          <TextInput
            style={styles.searchInputModern}
            placeholder="Search by title, teacher..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollModern} contentContainerStyle={{ paddingHorizontal: 24 }}>
          {Array.from(new Set(filterTabs)).map((sub) => {
            if (!sub) return null;
            const isActive = filterMode === sub;
            const icon = FILTER_ICONS[sub] || '📁';
            return (
              <ScaleBtn key={sub} activeScale={0.92} onPress={() => setFilterMode(sub)}>
                <View style={[styles.chipModernHeader, isActive ? styles.chipModernHeaderActive : styles.chipModernHeaderInactive]}>
                  <Text style={[styles.chipTextModernHeader, isActive ? { color: '#FFF' } : { color: '#4B5563' }]}>
                    {icon} {sub}
                  </Text>
                </View>
              </ScaleBtn>
            );
          })}
        </ScrollView>
      </View>

      {loading && !uploading && (
        <ActivityIndicator size="large" color={MaterialPalette.primaryPink} style={{ marginTop: 20, marginBottom: 20 }} />
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <FlatList
        data={loading && !uploading ? [] : filteredMaterials}
        keyExtractor={(item) => item._id}
        renderItem={renderMaterial}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
        showsVerticalScrollIndicator={false}
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        refreshControl={undefined}
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.empty, { paddingHorizontal: 24 }]}>
              <Ionicons name="folder-open" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No materials found</Text>
            </View>
          ) : null
        }
      />

      {/* FULL SCREEN UPLOAD MODAL */}
      <Modal visible={isUploadModalVisible} animationType="slide" transparent={false} onRequestClose={closeUploadModal}>
        <View style={styles.fullScreenModal}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

          <LinearGradient
            colors={[MaterialPalette.primaryPink, MaterialPalette.primaryPinkLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.fullScreenHeader, { paddingTop: insets.top + 20 }]}
          >
            <View style={styles.fsHeaderTop}>
              <ScaleBtn style={styles.fsBackBtn} onPress={closeUploadModal}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </ScaleBtn>
            </View>
            <Text style={styles.fsHeaderTitle}>{editingMaterial ? 'Edit Material' : 'Upload Material'}</Text>
            <Text style={styles.fsHeaderSubtitle}>Direct admin upload. Instantly approved.</Text>
          </LinearGradient>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.fsScrollContent} showsVerticalScrollIndicator={false}>

              <ScaleBtn activeScale={0.98} onPress={handlePickFile}>
                <View style={styles.uploadCard}>
                  {file ? (
                    <View style={{ alignItems: 'center' }}>
                      <Ionicons name="document-text" size={40} color={MaterialPalette.teal} />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: MaterialPalette.tealDark, marginTop: 10 }}>{file.name}</Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <Ionicons name="cloud-upload" size={40} color={MaterialPalette.teal} />
                      <Text style={{ fontSize: 18, fontWeight: '700', color: MaterialPalette.tealDark, marginTop: 10 }}>
                        {editingMaterial ? 'Select Replacement File' : 'Select File'}
                      </Text>
                    </View>
                  )}
                </View>
              </ScaleBtn>

              <View style={styles.formSection}>
                <Text style={styles.fsLabel}>Title *</Text>
                <View style={styles.fsInputWrap}>
                  <TextInput style={styles.fsInput} placeholder="Material title" placeholderTextColor="#9CA3AF" value={title} onChangeText={setTitle} />
                </View>

                <Text style={styles.fsLabel}>Subject *</Text>
                <View style={styles.fsInputWrap}>
                  <TextInput style={styles.fsInput} placeholder="Subject" placeholderTextColor="#9CA3AF" value={subject} onChangeText={setSubject} />
                </View>

                <Text style={styles.fsLabel}>Grade / Class *</Text>
                <View style={styles.fsInputWrap}>
                  <TextInput style={styles.fsInput} placeholder="Grade" placeholderTextColor="#9CA3AF" value={grade} onChangeText={setGrade} />
                </View>

                <Text style={styles.fsLabel}>Visibility</Text>
                <View style={styles.segmentedControl}>
                  <ScaleBtn activeScale={0.96} style={{ flex: 1 }} onPress={() => setIsLocked(false)}>
                    <View style={[styles.segmentBtn, !isLocked && styles.segmentBtnActive]}>
                      <Text style={[styles.segmentText, !isLocked && styles.segmentTextActive]}>🔓 Unlocked</Text>
                    </View>
                  </ScaleBtn>
                  <ScaleBtn activeScale={0.96} style={{ flex: 1 }} onPress={() => setIsLocked(true)}>
                    <View style={[styles.segmentBtn, isLocked && styles.segmentBtnActive]}>
                      <Text style={[styles.segmentText, isLocked && styles.segmentTextActive]}>🔒 Locked</Text>
                    </View>
                  </ScaleBtn>
                </View>
              </View>

              <ScaleBtn activeScale={0.96} onPress={handleUploadOrUpdate} disabled={uploading}>
                <LinearGradient colors={[MaterialPalette.teal, MaterialPalette.tealDark]} style={styles.fsSubmitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {uploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.fsSubmitBtnText}>{editingMaterial && file ? 'Replacing File...' : editingMaterial ? 'Update Direct' : 'Upload Direct'}</Text>
                  )}
                </LinearGradient>
              </ScaleBtn>

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  premiumHeader: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 24, paddingBottom: 24, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitleModern: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  headerSubtitleModern: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },

  uploadBtnWrapModern: { marginHorizontal: 24, marginTop: -20, marginBottom: 20, zIndex: 11 },
  uploadBtnModern: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: MaterialPalette.teal, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  uploadIconCircleModern: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  uploadBtnTextModern: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  filterSectionModern: { paddingVertical: 10 },
  searchBoxModern: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12, backgroundColor: '#FFF', marginHorizontal: 24, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInputModern: { flex: 1, fontSize: 15, color: '#1F2937' },

  chipScrollModern: { paddingBottom: 10 },
  chipModernHeader: { height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  chipModernHeaderActive: { backgroundColor: MaterialPalette.gold, borderColor: MaterialPalette.gold },
  chipTextModernHeader: { fontSize: 13, fontWeight: '600' },

  cardOuter: { paddingHorizontal: 24 },

  card: { borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 16 },

  thumbnail: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center', justifyContent: 'flex-start' },
  infoChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  infoChipText: { fontSize: 11, fontWeight: '700' },
  teacherName: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginLeft: 4 },

  // Status pills — always flex-start, wraps if needed, never centers/spreads
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', gap: 6, alignSelf: 'flex-start' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  actionCol: { marginLeft: 16, gap: 10 },
  actionCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#9CA3AF', marginTop: 16 },

  fullScreenModal: { flex: 1, backgroundColor: '#F8FAFC' },
  fullScreenHeader: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 24, paddingBottom: 24 },
  fsHeaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  fsBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  fsHeaderTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  fsHeaderSubtitle: { fontSize: 14, color: '#9CA3AF' },
  fsScrollContent: { padding: 24, paddingBottom: 80 },
  uploadCard: { backgroundColor: '#F0FDF4', borderRadius: 16, borderWidth: 2, borderColor: MaterialPalette.teal, borderStyle: 'dashed', padding: 24, alignItems: 'center', marginBottom: 24 },
  formSection: { marginBottom: 24 },
  fsLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8, marginLeft: 4 },
  fsInputWrap: { height: 50, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, paddingHorizontal: 16, justifyContent: 'center' },
  fsInput: { fontSize: 15, color: '#1F2937' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, height: 48 },
  segmentBtn: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: MaterialPalette.tealDark },
  fsSubmitBtn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  fsSubmitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});