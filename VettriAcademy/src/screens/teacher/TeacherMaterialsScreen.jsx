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
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#F8FAFC' }]} />
      
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.contentContainer}>
        {loading && !uploading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <ActivityIndicator size="large" color="#FF4D8D" />
          </View>
        ) : (
          <FlatList
            data={filteredMaterials}
            keyExtractor={(item) => item._id}
            renderItem={renderMaterial}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={{ paddingBottom: 10 }}>
                {/* PREMIUM MODERN HEADER */}
                <LinearGradient 
                  colors={['#EC4899', '#F472B6']} 
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.premiumHeader, { height: insets.top + 160, paddingTop: insets.top + 20 }]}
                >
                  <View style={styles.headerTopRow}>
                    <ScaleBtn style={styles.headerBackBtn} onPress={() => navigation?.goBack()}>
                      <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </ScaleBtn>
                  </View>
                  
                  <View style={styles.headerTitlesModern}>
                    <Text style={styles.headerTitleModern}>Manage Materials</Text>
                   
                  </View>
                </LinearGradient>

                {/* Upload Button */}
                <ScaleBtn activeScale={0.96} onPress={() => setUploadModalVisible(true)} style={styles.uploadBtnWrapModern}>
                  <LinearGradient colors={['#EC4899', '#F472B6']} style={styles.uploadBtnModern} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.uploadIconCircleModern}>
                      <Ionicons name="cloud-upload" size={24} color="#FFF" />
                    </View>
                    <Text style={styles.uploadBtnTextModern}>Upload Material</Text>
                    <View style={styles.uploadArrowCircle}>
                      <Ionicons name="arrow-forward" size={20} color="#EC4899" />
                    </View>
                  </LinearGradient>
                </ScaleBtn>

                {/* Search & Filter */}
                <View style={styles.filterSectionModern}>
                  <View style={styles.searchBoxModern}>
                    <View style={styles.searchIconWrapModern}>
                      <Ionicons name="search" size={20} color="#EC4899" />
                    </View>
                    <TextInput
                      style={styles.searchInputModern}
                      placeholder="Search by title, subject..."
                      placeholderTextColor="#9CA3AF"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollModern} contentContainerStyle={{ paddingHorizontal: 24 }}>
                    {filterTabs.map((sub) => {
                      const isActive = filterSubject === sub;
                      const icon = FILTER_ICONS[sub];
                      return (
                        <ScaleBtn key={sub} activeScale={0.92} onPress={() => setFilterSubject(sub)}>
                          <View style={[styles.chipModernHeader, isActive ? styles.chipModernHeaderActive : styles.chipModernHeaderInactive]}>
                            {isActive && <LinearGradient colors={['#EC4899', '#F472B6']} style={StyleSheet.absoluteFillObject} start={{x:0, y:0}} end={{x:1, y:1}} />}
                            <Text style={[styles.chipTextModernHeader, isActive ? { color: '#FFF' } : { color: '#1E293B' }]}>
                              {icon ? `${icon} ${sub}` : sub}
                            </Text>
                          </View>
                        </ScaleBtn>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            }
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

      {/* FULL SCREEN UPLOAD MODAL */}
      <Modal visible={isUploadModalVisible} animationType="slide" transparent={false} onRequestClose={closeUploadModal}>
        <View style={styles.fullScreenModal}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          
          <LinearGradient 
            colors={['#EC4899', '#F472B6']} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.fullScreenHeader, { paddingTop: insets.top + 20 }]}
          >
            <View style={styles.fsHeaderTop}>
              <ScaleBtn style={styles.fsBackBtn} onPress={closeUploadModal}>
                <Ionicons name="arrow-back" size={24} color="#1E293B" />
              </ScaleBtn>
            </View>
            <Text style={styles.fsHeaderTitle}>Upload Material</Text>
            <Text style={styles.fsHeaderSubtitle}>Upload PDFs, videos, images and study materials.</Text>
          </LinearGradient>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.fsScrollContent} showsVerticalScrollIndicator={false}>
              
              {/* UPLOAD CARD */}
              <ScaleBtn activeScale={0.98} onPress={handlePickFile} disabled={!!editingMaterial}>
                <View style={styles.uploadCard}>
                  {file ? (
                    <View style={styles.fileSelectedState}>
                      <View style={styles.fileIconWrap}>
                        <Ionicons name="document-text" size={40} color="#14B8A6" />
                      </View>
                      <Text style={styles.fileSelectedName} numberOfLines={1}>{file.name}</Text>
                      <Text style={styles.fileSelectedSize}>{formatFileSize(file.size)}</Text>
                    </View>
                  ) : (
                    <View style={styles.uploadCardPlaceholder}>
                      <View style={styles.uploadIconBigWrap}>
                        <Ionicons name="cloud-upload" size={40} color="#14B8A6" />
                      </View>
                      <Text style={styles.uploadCardTitle}>Select File</Text>
                      <Text style={styles.uploadCardSupported}>Supported: PDF • PPT • Video • Image</Text>
                      <Text style={styles.uploadCardLimits}>Max: 500MB Video / 50MB Document</Text>
                      
                      {!editingMaterial && (
                        <View style={styles.chooseFileBtnBig}>
                          <Text style={styles.chooseFileBtnText}>Choose File</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </ScaleBtn>

              {/* FORM FIELDS */}
              <View style={styles.formSection}>
                <Text style={styles.fsLabel}>Title *</Text>
                <View style={styles.fsInputWrap}>
                  <Ionicons name="document-text-outline" size={22} color="#94A3B8" style={styles.fsInputIcon} />
                  <TextInput
                    style={styles.fsInput}
                    placeholder="e.g. Chapter 5 - Quadratic Equations"
                    placeholderTextColor="#94A3B8"
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                  />
                </View>

                <Text style={styles.fsLabel}>Subject *</Text>
                <View style={styles.fsInputWrap}>
                  <Ionicons name="book-outline" size={22} color="#94A3B8" style={styles.fsInputIcon} />
                  <TextInput
                    style={styles.fsInput}
                    placeholder="Enter subject"
                    placeholderTextColor="#94A3B8"
                    value={subject}
                    onChangeText={setSubject}
                    maxLength={60}
                  />
                </View>

                <Text style={styles.fsLabel}>Grade / Class *</Text>
                <View style={styles.fsInputWrap}>
                  <Ionicons name="school-outline" size={22} color="#94A3B8" style={styles.fsInputIcon} />
                  <TextInput
                    style={styles.fsInput}
                    placeholder="Enter grade or class"
                    placeholderTextColor="#94A3B8"
                    value={grade}
                    onChangeText={setGrade}
                    maxLength={30}
                  />
                </View>

                <Text style={styles.fsLabel}>Visibility</Text>
                <View style={styles.segmentedControl}>
                  <ScaleBtn activeScale={0.96} style={{ flex: 1 }} onPress={() => setIsLocked(false)}>
                    <View style={[styles.segmentBtn, !isLocked && styles.segmentBtnActive]}>
                      <Ionicons name="lock-open" size={18} color={!isLocked ? '#14B8A6' : '#64748B'} style={{ marginRight: 6 }} />
                      <Text style={[styles.segmentText, !isLocked && styles.segmentTextActive]}>Unlocked</Text>
                    </View>
                  </ScaleBtn>
                  <ScaleBtn activeScale={0.96} style={{ flex: 1 }} onPress={() => setIsLocked(true)}>
                    <View style={[styles.segmentBtn, isLocked && styles.segmentBtnActive]}>
                      <Ionicons name="lock-closed" size={18} color={isLocked ? '#14B8A6' : '#64748B'} style={{ marginRight: 6 }} />
                      <Text style={[styles.segmentText, isLocked && styles.segmentTextActive]}>Locked</Text>
                    </View>
                  </ScaleBtn>
                </View>
              </View>

              {/* ACTION BUTTON */}
              <ScaleBtn activeScale={0.96} onPress={handleUpload} disabled={uploading}>
                <LinearGradient colors={['#14B8A6', '#0D9488']} style={styles.fsSubmitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {uploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.fsSubmitBtnText}>{editingMaterial ? 'Update Material' : 'Upload Material'}</Text>
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
  container: { flex: 1 },
  premiumHeader: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 24, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerBackBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  headerTitlesModern: { alignItems: 'flex-start' },
  headerTitleModern: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  headerSubtitleModern: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.9)' },

  contentContainer: { flex: 1 },
  
  uploadBtnWrapModern: { marginHorizontal: 24, marginTop: 24, marginBottom: 24, zIndex: 10 },
  uploadBtnModern: { height: 60, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  uploadIconCircleModern: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  uploadBtnTextModern: { flex: 1, color: '#FFF', fontSize: 17, fontWeight: '700' },
  uploadArrowCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  filterSectionModern: { paddingTop: 4 },
  searchBoxModern: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', marginHorizontal: 24, marginBottom: 24, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  searchIconWrapModern: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF2F8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  searchInputModern: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  
  chipScrollModern: { paddingBottom: 16 },
  chipModernHeader: { height: 46, paddingHorizontal: 20, borderRadius: 999, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  chipModernHeaderActive: { backgroundColor: '#EC4899', shadowColor: '#EC4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  chipModernHeaderInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipTextModernHeader: { fontSize: 15, fontWeight: '600' },

  listContent: { paddingBottom: 140 },
  
  card: { marginHorizontal: 24, borderRadius: 24, marginBottom: 18, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 8, overflow: 'hidden' },
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

  // Full Screen Upload Page
  fullScreenModal: { flex: 1, backgroundColor: '#F8FAFC' },
  fullScreenHeader: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 24, paddingBottom: 24, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  fsHeaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  fsBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  fsHeaderTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  fsHeaderSubtitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  
  fsScrollContent: { padding: 24, paddingBottom: 80 },
  
  uploadCard: { backgroundColor: '#F0FDF4', borderRadius: 18, borderWidth: 2, borderColor: '#5EEAD4', borderStyle: 'dashed', padding: 24, alignItems: 'center', marginBottom: 30 },
  uploadIconBigWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  uploadCardTitle: { fontSize: 20, fontWeight: '700', color: '#0F766E', marginBottom: 8 },
  uploadCardSupported: { fontSize: 14, color: '#0F766E', fontWeight: '500', marginBottom: 4 },
  uploadCardLimits: { fontSize: 12, color: '#14B8A6', opacity: 0.8, marginBottom: 24 },
  chooseFileBtnBig: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 14, shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  chooseFileBtnText: { fontSize: 16, fontWeight: '700', color: '#14B8A6' },
  
  fileSelectedState: { alignItems: 'center', paddingVertical: 10 },
  fileIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  fileSelectedName: { fontSize: 16, fontWeight: '700', color: '#0F766E', textAlign: 'center', marginBottom: 6 },
  fileSelectedSize: { fontSize: 14, color: '#14B8A6', fontWeight: '500' },

  formSection: { marginBottom: 30 },
  fsLabel: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 8, marginLeft: 2 },
  fsInputWrap: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  fsInputIcon: { paddingHorizontal: 16 },
  fsInput: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '500', height: '100%' },

  segmentedControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, height: 52 },
  segmentBtn: { flex: 1, flexDirection: 'row', height: '100%', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#14B8A6' },

  fsSubmitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  fsSubmitBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
