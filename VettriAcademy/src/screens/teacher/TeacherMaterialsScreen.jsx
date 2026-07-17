import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { fetchTeacherMaterials, toggleLock, uploadMaterial, deleteMaterial, editMaterial } from '../../redux/slices/teacherSlice';
import { getCoursesMetaAPI } from '../../services/api';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

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
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }).start();
  }, [anim, index]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return <Animated.View style={[{ opacity: anim, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

const Sparkle = ({ size, color, opacity, style }) => (
  <View style={[style, { width: size, height: size, backgroundColor: color, opacity, borderRadius: size / 2, transform: [{ rotate: '45deg' }] }]} />
);

const getTypeConfig = (type) => {
  if (type === 'pdf') return { color: '#EF4444', bg: '#FEE2E2', icon: 'document-text' };
  if (type === 'image') return { color: '#22C55E', bg: '#DCFCE7', icon: 'image' };
  if (type === 'video') return { color: '#A855F7', bg: '#F3E8FF', icon: 'videocam' };
  if (type === 'ppt' || type?.includes('presentation')) return { color: '#F97316', bg: '#FFEDD5', icon: 'easel' };
  return { color: '#3B82F6', bg: '#DBEAFE', icon: 'document' };
};

const FILTER_ICONS = {
  'All': '📚',
  'PDF': '📄',
  'Images': '🖼',
  'Videos': '🎥',
  'Locked': '🔒',
  'Unlocked': '🔓'
};

export default function TeacherMaterialsScreen({ navigation }) {
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
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    if (navigation) navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
      { 
        text: 'Delete', onPress: async () => {
          const result = await dispatch(deleteMaterial(material._id));
          if (deleteMaterial.fulfilled.match(result)) {
            Toast.show({ type: 'success', text1: 'Material deleted' });
          } else {
            Toast.show({ type: 'error', text1: 'Delete failed', text2: result.payload });
          }
        }
      },
    ]);
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    if (filterSubject === 'All') matchesFilter = true;
    else if (filterSubject === 'PDF') matchesFilter = m.type === 'pdf';
    else if (filterSubject === 'Images') matchesFilter = m.type === 'image';
    else if (filterSubject === 'Videos') matchesFilter = m.type === 'video';
    else if (filterSubject === 'Locked') matchesFilter = m.lockedForAll === true;
    else if (filterSubject === 'Unlocked') matchesFilter = m.lockedForAll === false;
    else matchesFilter = m.subject === filterSubject;
    return matchesSearch && matchesFilter;
  });

  const filterTabs = ['All', 'PDF', 'Images', 'Videos', 'Locked', 'Unlocked', ...availableSubjects];

  const renderMaterial = ({ item, index }) => {
    const tConf = getTypeConfig(item.type);
    return (
      <FadeSlideView index={index}>
        <ScaleBtn activeScale={0.97} onPress={() => {}}>
          <ParticleWrapper>
            <View style={styles.card}>
              <LinearGradient colors={['#FFFFFF', '#F9FFFF']} style={StyleSheet.absoluteFillObject} />
              
              {/* Glass Highlights & Decos */}
              <View style={styles.cardGlass} />
              <View style={styles.cardDecoCircle1} />
              <View style={styles.cardDecoCircle2} />

              <View style={styles.cardInner}>
                {/* Left Side: Thumbnail */}
                <View style={[styles.thumbnail, { backgroundColor: tConf.bg }]}>
                  <Ionicons name={tConf.icon} size={32} color={tConf.color} />
                </View>

                {/* Center Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  
                  <View style={styles.chipRow}>
                    <View style={[styles.infoChip, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.infoChipText, { color: '#0284C7' }]}>{item.subject}</Text></View>
                    <View style={[styles.infoChip, { backgroundColor: '#CCFBF1' }]}><Text style={[styles.infoChipText, { color: '#0F766E' }]}>{item.grade}</Text></View>
                    <View style={[styles.infoChip, { backgroundColor: '#FFEDD5' }]}><Text style={[styles.infoChipText, { color: '#C2410C' }]}>{formatFileSize(item.fileSize)}</Text></View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    {item.lockedForAll ? (
                      <View style={[styles.statusPill, { backgroundColor: '#FFF7ED' }]}><Text style={[styles.statusPillText, { color: '#EA580C' }]}>🔒 Locked</Text></View>
                    ) : (
                      <View style={[styles.statusPill, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.statusPillText, { color: '#16A34A' }]}>🔓 Unlocked</Text></View>
                    )}
                  </View>
                </View>

                {/* Right Side: Action Column */}
                <View style={styles.actionCol}>
                  <ScaleBtn style={styles.actionCircleBtn} onPress={() => handleToggleLock(item)}>
                    <Ionicons name={item.lockedForAll ? 'lock-open' : 'lock-closed'} size={18} color="#16A34A" />
                  </ScaleBtn>
                  <ScaleBtn style={styles.actionCircleBtn} onPress={() => openEditModal(item)}>
                    <Ionicons name="pencil" size={18} color="#EC4899" />
                  </ScaleBtn>
                  <ScaleBtn style={styles.actionCircleBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </ScaleBtn>
                </View>
              </View>
            </View>
          </ParticleWrapper>
        </ScaleBtn>
      </FadeSlideView>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFF8FB', '#F8F7FC', '#F5FCFF', '#F2FFFC']} style={StyleSheet.absoluteFillObject} />
      
      {/* Background Decor */}
      <View style={styles.bgBlobPink} />
      <View style={styles.bgBlobTeal} />
      <View style={styles.bgBubble1} />
      <View style={styles.bgBubble2} />
      <Sparkle size={12} color="#EC4899" opacity={0.06} style={{ position: 'absolute', top: 250, left: 60 }} />
      <Sparkle size={18} color="#14B8A6" opacity={0.05} style={{ position: 'absolute', top: 450, right: 40 }} />
      
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* COMPACT PREMIUM HEADER */}
      <View style={[styles.headerWrap, { height: Math.max(90, insets.top + 50), paddingTop: insets.top }]}>
        <ScaleBtn style={styles.glassCircleBtn} onPress={() => navigation?.goBack()}><Ionicons name="arrow-back" size={24} color="#1F2937" /></ScaleBtn>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Manage Materials</Text>
          <Text style={styles.headerSubtitle}>Upload and manage study materials</Text>
        </View>
        <View style={{ width: 46 }} />
      </View>

      <View style={styles.contentContainer}>
        {/* Upload Button */}
        <ParticleWrapper>
          <ScaleBtn activeScale={0.96} onPress={() => setUploadModalVisible(true)} style={styles.uploadBtnWrap}>
            <LinearGradient colors={['#FF4D8D', '#FF6EA8']} style={styles.uploadBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload" size={20} color="#FF4D8D" />
              </View>
              <Text style={styles.uploadBtnText}>UPLOAD MATERIAL</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ position: 'absolute', right: 20 }} />
            </LinearGradient>
          </ScaleBtn>
        </ParticleWrapper>

        {/* Search & Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <View style={styles.searchIconWrap}>
              <Ionicons name="search" size={18} color="#EC4899" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title, subject or class"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 18 }}>
            {filterTabs.map((sub) => {
              const isActive = filterSubject === sub;
              const icon = FILTER_ICONS[sub];
              return (
                <TouchableOpacity key={sub} style={[styles.chip, isActive && styles.chipActive]} onPress={() => setFilterSubject(sub)}>
                  {isActive && <LinearGradient colors={['#FF4D8D', '#FF6EA8']} style={StyleSheet.absoluteFillObject} borderRadius={20} />}
                  <Text style={[styles.chipText, isActive ? { color: '#FFF' } : { color: '#4B5563' }]}>
                    {icon ? `${icon} ${sub}` : sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        {loading && !uploading ? (
          <ActivityIndicator size="large" color="#FF4D8D" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredMaterials}
            keyExtractor={(item) => item._id}
            renderItem={renderMaterial}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIllustrationBox}>
                  <Ionicons name="book" size={48} color="#FF4D8D" style={{ position: 'absolute', top: 10, left: 10 }} />
                  <Ionicons name="laptop" size={64} color="#14B8A6" style={{ position: 'absolute', top: 30, right: 10 }} />
                  <Ionicons name="folder-open" size={56} color="#3B82F6" style={{ position: 'absolute', bottom: 10, left: 30 }} />
                </View>
                <Text style={styles.emptyText}>No materials found</Text>
                <Text style={styles.emptyHint}>Tap upload to add a new study material</Text>
              </View>
            }
            refreshing={loading && !uploading}
            onRefresh={() => dispatch(fetchTeacherMaterials())}
            onScroll={onTabBarScroll}
            scrollEventThrottle={16}
          />
        )}
      </View>

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
  bgBlobPink: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#EC4899', opacity: 0.05, top: 150, left: -100, filter: 'blur(60px)' },
  bgBlobTeal: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#14B8A6', opacity: 0.04, top: 500, right: -80, filter: 'blur(70px)' },
  bgBubble1: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.2)', top: 280, right: 50, opacity: 0.08 },
  bgBubble2: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.2)', top: 550, left: 40, opacity: 0.08 },

  headerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, zIndex: 10 },
  glassCircleBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  headerTitles: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, fontWeight: '500', color: '#EC4899', marginTop: 2 },

  contentContainer: { flex: 1 },
  
  uploadBtnWrap: { marginHorizontal: 18, marginTop: 18, marginBottom: 12, zIndex: 10 },
  uploadBtn: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, shadowColor: '#FF4D8D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  uploadIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  uploadBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  filterSection: { paddingHorizontal: 18, paddingTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 16, paddingHorizontal: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(236, 72, 153, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', fontWeight: '500' },
  
  chipScroll: { paddingBottom: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', marginRight: 10, justifyContent: 'center' },
  chipActive: { borderWidth: 0, shadowColor: '#FF4D8D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  chipText: { fontSize: 14, fontWeight: '700' },

  listContent: { padding: 18, paddingBottom: 140 },
  
  card: { borderRadius: 24, marginBottom: 18, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 8, overflow: 'hidden' },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  cardGlass: { position: 'absolute', top: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(255,255,255,0.4)' },
  cardDecoCircle1: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.4)', top: -20, right: -20 },
  cardDecoCircle2: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', top: 20, right: 40 },
  
  thumbnail: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 8, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  infoChipText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  
  actionCol: { marginLeft: 16, alignItems: 'center', gap: 10 },
  actionCircleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  
  empty: { alignItems: 'center', marginTop: 40 },
  emptyIllustrationBox: { width: 140, height: 140, marginBottom: 20, position: 'relative' },
  emptyText: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  emptyHint: { fontSize: 14, fontWeight: '500', color: '#9CA3AF', marginTop: 8 },

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
