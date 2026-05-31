import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { fetchTeacherMaterials, toggleLock, uploadMaterial, deleteMaterial, editMaterial } from '../../redux/slices/teacherSlice';
import { getCoursesMetaAPI } from '../../services/api';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


const typeIcons = { pdf: 'document-text', ppt: 'easel', video: 'videocam', image: 'image' };
const typeColors = { pdf: '#F44336', ppt: '#FF9800', video: '#2196F3', image: '#4CAF50' };

export default function TeacherMaterialsScreen() {
  const dispatch = useDispatch();
  const { materials, loading } = useSelector((s) => s.teacher);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;
  const borderCol = isDark ? Colors.border.dark : Colors.border.light;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  
  // Meta state
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableGrades, setAvailableGrades] = useState([]);

  // Modal state
  const [isUploadModalVisible, setUploadModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  
  // Form state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [description, setDescription] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [uploading, setUploading] = useState(false);
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  useEffect(() => { 
    dispatch(fetchTeacherMaterials());
    loadMeta();
  }, []);

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
        
        // Validation
        const isVideo = pickedFile.mimeType?.startsWith('video/');
        const isDoc = pickedFile.mimeType === 'application/pdf' || pickedFile.mimeType?.includes('presentation');
        const isImage = pickedFile.mimeType?.startsWith('image/');
        
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

  const handleUpload = async () => {
    if (!editingMaterial && !file) return Toast.show({ type: 'error', text1: 'Please select a file' });
    if (!title.trim()) return Toast.show({ type: 'error', text1: 'Please enter a title' });
    if (!subject) return Toast.show({ type: 'error', text1: 'Please select a subject' });
    if (!grade) return Toast.show({ type: 'error', text1: 'Please select a grade' });

    setUploading(true);
    
    if (editingMaterial) {
      try {
        const resultAction = await dispatch(editMaterial({
          materialId: editingMaterial._id,
          data: { title, subject, grade, description, lockedForAll: isLocked }
        }));
        if (editMaterial.fulfilled.match(resultAction)) {
          Toast.show({ type: 'success', text1: 'Updated successfully!' });
          closeUploadModal();
        } else {
          Toast.show({ type: 'error', text1: 'Update failed', text2: resultAction.payload });
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Update failed', text2: 'Network error' });
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
      
      // Append file
      if (Platform.OS === 'web' && file.file) {
        formData.append('file', file.file);
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });
      }

      try {
        const resultAction = await dispatch(uploadMaterial(formData));
        if (uploadMaterial.fulfilled.match(resultAction)) {
          Toast.show({ type: 'success', text1: 'Uploaded successfully!' });
          closeUploadModal();
        } else {
          Toast.show({ type: 'error', text1: 'Upload failed', text2: resultAction.payload });
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Network error' });
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
    setFile(null); // Backend API currently doesn't support changing file after upload
    setUploadModalVisible(true);
  };

  const handleToggleLock = (material) => {
    const action = material.lockedForAll ? 'Unlock for all' : 'Lock for all';
    Alert.alert(`${action}?`, `${material.title}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          const result = await dispatch(toggleLock({ materialId: material._id, studentId: null, unlock: material.lockedForAll, lockedForAll: !material.lockedForAll }));
          if (toggleLock.fulfilled.match(result)) {
            Toast.show({ type: 'success', text1: material.lockedForAll ? 'Unlocked! 🔓' : 'Locked! 🔒' });
            dispatch(fetchTeacherMaterials());
          }
        },
      },
    ]);
  };

  const handleDelete = (material) => {
    Alert.alert('Delete Material?', `Are you sure you want to delete "${material.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const result = await dispatch(deleteMaterial(material._id));
        if (deleteMaterial.fulfilled.match(result)) {
          Toast.show({ type: 'success', text1: 'Material deleted' });
        } else {
          Toast.show({ type: 'error', text1: 'Delete failed', text2: result.payload });
        }
      }},
    ]);
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'All' || m.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const renderMaterial = ({ item }) => (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={[styles.iconBox, { backgroundColor: (typeColors[item.type] || Colors.primary) + '18' }]}>
        <Ionicons name={typeIcons[item.type] || 'document'} size={24} color={typeColors[item.type] || Colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.sub, { color: textSec }]}>{item.subject} • {item.grade} • {formatFileSize(item.fileSize)}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.date, { color: textSec }]}>{formatDate(item.createdAt)}</Text>
          {item.lockedForAll ? (
             <Text style={[styles.statusText, { color: Colors.error }]}>🔒 Locked</Text>
          ) : (
             <Text style={[styles.statusText, { color: Colors.success }]}>🔓 Unlocked</Text>
          )}
        </View>
      </View>
      <View style={styles.actionCol}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.lockedForAll ? Colors.error + '14' : Colors.success + '14' }]} onPress={() => handleToggleLock(item)}>
          <Ionicons name={item.lockedForAll ? 'lock-closed' : 'lock-open'} size={18} color={item.lockedForAll ? Colors.error : Colors.success} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.pink + '14', marginTop: 8 }]} onPress={() => openEditModal(item)}>
          <Ionicons name="pencil" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error + '14', marginTop: 8 }]} onPress={() => handleDelete(item)}>
          <Ionicons name="trash" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Upload Button */}
      <View style={[styles.topBar, { borderBottomColor: borderCol }]}>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => setUploadModalVisible(true)}>
          <Ionicons name="cloud-upload" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.uploadBtnText}>UPLOAD MATERIAL</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={20} color={textSec} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search materials..."
            placeholderTextColor={textSec}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {['All', ...availableSubjects].map((sub) => (
            <TouchableOpacity 
              key={sub} 
              style={[styles.chip, filterSubject === sub ? { backgroundColor: Colors.primary } : { backgroundColor: cardBg, borderColor: borderCol, borderWidth: 1 }]}
              onPress={() => setFilterSubject(sub)}
            >
              <Text style={[styles.chipText, filterSubject === sub ? { color: '#fff' } : { color: textColor }]}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading && !uploading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredMaterials}
          keyExtractor={(item) => item._id}
          renderItem={renderMaterial}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={64} color={Colors.mediumGray} />
              <Text style={[styles.emptyText, { color: textSec }]}>No materials found</Text>
              <Text style={[styles.emptyHint, { color: textSec }]}>Tap upload to add a new study material</Text>
            </View>
          }
          refreshing={loading && !uploading}
          onRefresh={() => dispatch(fetchTeacherMaterials())}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
        />
      )}

      {/* Upload Modal */}
      <Modal visible={isUploadModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeUploadModal}>
        <KeyboardAvoidingView style={[styles.modalContainer, { backgroundColor: bgColor }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { borderBottomColor: borderCol }]}>
            <TouchableOpacity onPress={closeUploadModal}>
              <Ionicons name="close" size={28} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>{editingMaterial ? 'Edit Material' : 'Upload Material'}</Text>
            <View style={{ width: 28 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {/* File Picker */}
            {!editingMaterial && (
              <TouchableOpacity style={[styles.filePicker, { backgroundColor: cardBg, borderColor: borderCol }]} onPress={handlePickFile}>
                {file ? (
                  <View style={styles.fileSelected}>
                    <Ionicons name="document" size={40} color={Colors.primary} />
                    <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.fileSize, { color: textSec }]}>{formatFileSize(file.size)}</Text>
                  </View>
                ) : (
                  <View style={styles.filePlaceholder}>
                    <Ionicons name="folder-open" size={48} color={Colors.primary} />
                    <Text style={[styles.filePickerText, { color: textColor }]}>Select File</Text>
                    <Text style={[styles.fileLimits, { color: textSec }]}>PDF, PPT, Video, Image</Text>
                    <Text style={[styles.fileLimitsSmall, { color: textSec }]}>Max: 500MB Video / 50MB Doc</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { color: textColor }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: textColor, borderColor: borderCol }]}
              placeholder="e.g. Chapter 5 - Quadratic Eq..."
              placeholderTextColor={textSec}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <Text style={[styles.label, { color: textColor }]}>Subject *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollForm}>
              {availableSubjects.length > 0 ? availableSubjects.map((sub) => (
                <TouchableOpacity 
                  key={sub} 
                  style={[styles.chip, subject === sub ? { backgroundColor: Colors.primary } : { backgroundColor: cardBg, borderColor: borderCol, borderWidth: 1 }]}
                  onPress={() => setSubject(sub)}
                >
                  <Text style={[styles.chipText, subject === sub ? { color: '#fff' } : { color: textColor }]}>{sub}</Text>
                </TouchableOpacity>
              )) : (
                <View style={[styles.emptyMetaWrap, { borderColor: borderCol }]}> 
                  <Text style={[styles.emptyMetaText, { color: textSec }]}>No subjects loaded from courses. Enter manually below.</Text>
                </View>
              )}
            </ScrollView>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: textColor, borderColor: borderCol }]}
              placeholder="Enter subject"
              placeholderTextColor={textSec}
              value={subject}
              onChangeText={setSubject}
              maxLength={60}
            />

            <Text style={[styles.label, { color: textColor }]}>Grade *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollForm}>
              {availableGrades.length > 0 ? availableGrades.map((g) => (
                <TouchableOpacity 
                  key={g} 
                  style={[styles.chip, grade === g ? { backgroundColor: Colors.primary } : { backgroundColor: cardBg, borderColor: borderCol, borderWidth: 1 }]}
                  onPress={() => setGrade(g)}
                >
                  <Text style={[styles.chipText, grade === g ? { color: '#fff' } : { color: textColor }]}>{g}</Text>
                </TouchableOpacity>
              )) : (
                <View style={[styles.emptyMetaWrap, { borderColor: borderCol }]}> 
                  <Text style={[styles.emptyMetaText, { color: textSec }]}>No grades loaded from courses. Enter manually below.</Text>
                </View>
              )}
            </ScrollView>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: textColor, borderColor: borderCol }]}
              placeholder="Enter grade"
              placeholderTextColor={textSec}
              value={grade}
              onChangeText={setGrade}
              maxLength={30}
            />

            <Text style={[styles.label, { color: textColor }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.inputArea, { backgroundColor: cardBg, color: textColor, borderColor: borderCol }]}
              placeholder="Add some notes..."
              placeholderTextColor={textSec}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <View style={[styles.lockRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View>
                <Text style={[styles.lockTitle, { color: textColor }]}>Lock by default</Text>
                <Text style={[styles.lockDesc, { color: textSec }]}>Students can't see it until you unlock</Text>
              </View>
              <TouchableOpacity onPress={() => setIsLocked(!isLocked)}>
                <Ionicons name={isLocked ? 'toggle' : 'toggle-outline'} size={40} color={isLocked ? Colors.primary : textSec} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleUpload} disabled={uploading}>
              {uploading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>{editingMaterial ? 'UPDATING...' : 'UPLOADING...'}</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>{editingMaterial ? 'UPDATE MATERIAL' : 'UPLOAD MATERIAL'}</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { padding: 16, borderBottomWidth: 1, backgroundColor: Colors.primary + '10' },
  uploadBtn: { backgroundColor: Colors.pink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, ...Shadows.light },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  filterSection: { paddingHorizontal: 16, paddingTop: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 46, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  chipScroll: { paddingBottom: 8 },
  chipScrollForm: { marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipText: { fontSize: 14, fontWeight: '500' },
  emptyMetaWrap: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  emptyMetaText: { fontSize: 12, fontWeight: '500' },
  
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, ...Shadows.light },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sub: { fontSize: 13, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionCol: { marginLeft: 10, alignItems: 'center' },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 6, textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalScroll: { padding: 20 },
  filePicker: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  filePlaceholder: { alignItems: 'center' },
  filePickerText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  fileLimits: { fontSize: 13, marginTop: 4 },
  fileLimitsSmall: { fontSize: 11, marginTop: 4, opacity: 0.7 },
  fileSelected: { alignItems: 'center' },
  fileName: { fontSize: 15, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  fileSize: { fontSize: 13, marginTop: 4 },
  
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 16 },
  inputArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, fontSize: 15, height: 100, textAlignVertical: 'top', marginBottom: 20 },
  
  lockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  lockTitle: { fontSize: 15, fontWeight: '600' },
  lockDesc: { fontSize: 13, marginTop: 4 },
  
  submitBtn: { backgroundColor: Colors.pink, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', ...Shadows.medium },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
