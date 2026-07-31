import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView, Animated, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { fetchPendingMaterials, approvePendingMaterial, rejectPendingMaterial, fetchAdminMaterialPreview } from '../../redux/slices/adminSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialPalette } from '../../utils/theme';
import { detectFileType, normalizeMaterialFileUrl } from '../../utils/fileUtils';

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

export default function AdminPendingApprovalsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { pendingMaterials, loading, previewLoading } = useSelector((s) => s.admin);
  const insets = useSafeAreaInsets();
  
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewingId, setPreviewingId] = useState(null);

  useEffect(() => {
    dispatch(fetchPendingMaterials());
  }, [dispatch]);

  const handleApprove = (material) => {
    Alert.alert('Approve Request?', `Are you sure you want to approve this ${getActionLabel(material.approvalStatus).toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
          const result = await dispatch(approvePendingMaterial(material._id));
          if (approvePendingMaterial.fulfilled.match(result)) {
            Toast.show({ type: 'success', text1: 'Approved successfully' });
            dispatch(fetchPendingMaterials());
          } else {
            Toast.show({ type: 'error', text1: 'Approval failed' });
          }
      }}
    ]);
  };

  const openRejectModal = (material) => {
    setSelectedMaterial(material);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!selectedMaterial) return;
    const result = await dispatch(rejectPendingMaterial({ id: selectedMaterial._id, reviewNotes: rejectReason }));
    if (rejectPendingMaterial.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: 'Rejected successfully' });
      setRejectModalVisible(false);
      setSelectedMaterial(null);
      dispatch(fetchPendingMaterials());
    } else {
      Toast.show({ type: 'error', text1: 'Rejection failed' });
    }
  };

  const getActionLabel = (status) => {
    switch(status) {
      case 'pending_new': return 'New Upload';
      case 'pending_edit': return 'Edit Request';
      case 'pending_delete': return 'Delete Request';
      default: return 'Pending';
    }
  };

  const getActionColor = (status) => {
    switch(status) {
      case 'pending_new': return MaterialPalette.teal;
      case 'pending_edit': return MaterialPalette.gold;
      case 'pending_delete': return MaterialPalette.red;
      default: return '#6B7280';
    }
  };

  const getTypeConfig = (type) => {
    if (type === 'pdf') return { color: MaterialPalette.red, bg: MaterialPalette.redLight, icon: 'document-text' };
    if (type === 'image') return { color: MaterialPalette.tealDark, bg: MaterialPalette.tealLight, icon: 'image' };
    if (type === 'video') return { color: '#A855F7', bg: '#F3E8FF', icon: 'videocam' };
    if (type === 'ppt' || type?.includes('presentation')) return { color: MaterialPalette.gold, bg: MaterialPalette.goldSoft, icon: 'easel' };
    return { color: '#3B82F6', bg: '#DBEAFE', icon: 'document' };
  };

  const getReviewMeta = (material) => {
    const fileReplacement = material.pendingChanges?.fileReplacement;
    return {
      subject: material.pendingChanges?.subject ?? material.subject,
      grade: material.pendingChanges?.grade ?? material.grade,
      description: material.pendingChanges?.description ?? material.description,
      type: fileReplacement?.type || material.type,
      mimeType: fileReplacement?.mimeType || material.mimeType,
      extension: fileReplacement?.extension || material.extension,
      filename: fileReplacement?.originalFilename || material.originalFilename,
      fileSize: fileReplacement?.fileSize || material.fileSize,
      resourceType: fileReplacement?.resourceType || material.resourceType,
      publicId: fileReplacement?.publicId || material.publicId,
      hasReplacement: !!fileReplacement,
    };
  };

  const handleReview = async (material) => {
    const meta = getReviewMeta(material);
    setPreviewingId(material._id);
    try {
      const result = await dispatch(fetchAdminMaterialPreview({
        id: material._id,
        pendingReplacement: material.approvalStatus === 'pending_edit' && meta.hasReplacement,
      }));
      if (!fetchAdminMaterialPreview.fulfilled.match(result)) {
        Toast.show({ type: 'error', text1: 'Preview failed', text2: result.payload });
        return;
      }

      const preview = result.payload;
      const url = normalizeMaterialFileUrl(preview.url, {
        resourceType: preview.resourceType || meta.resourceType,
        publicId: meta.publicId,
      });
      const fileType = detectFileType({
        type: preview.type || meta.type,
        mimeType: preview.mimeType || meta.mimeType,
        extension: preview.extension || meta.extension,
        url,
        filename: preview.filename || meta.filename,
      });

      navigation.navigate('DocumentViewer', {
        url,
        title: material.title,
        fileType,
        mimeType: preview.mimeType || meta.mimeType,
        extension: preview.extension || meta.extension,
        filename: preview.filename || meta.filename,
      });
    } finally {
      setPreviewingId(null);
    }
  };

  const DiffRow = ({ label, oldVal, newVal }) => {
    if (oldVal === newVal) return null;
    return (
      <View style={styles.diffRow}>
        <Text style={styles.diffLabel}>{label}:</Text>
        <View style={styles.diffValuesContainer}>
          <Text style={styles.diffOld} numberOfLines={2}>{oldVal || '(empty)'}</Text>
          <Ionicons name="arrow-forward" size={14} color="#9CA3AF" style={{ marginHorizontal: 6 }}/>
          <Text style={styles.diffNew} numberOfLines={2}>{newVal || '(empty)'}</Text>
        </View>
      </View>
    );
  };

  const renderMaterial = ({ item, index }) => {
    const actionLabel = getActionLabel(item.approvalStatus);
    const actionColor = getActionColor(item.approvalStatus);
    const reviewMeta = getReviewMeta(item);
    const typeConfig = getTypeConfig(reviewMeta.type);

    return (
      <FadeSlideView index={index}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.actionBadge, { backgroundColor: `${actionColor}15` }]}>
              <View style={[styles.actionDot, { backgroundColor: actionColor }]} />
              <Text style={[styles.actionText, { color: actionColor }]}>{actionLabel}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
          
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.teacherText}>Requested by <Text style={styles.teacherName}>{item.teacher?.name || 'Unknown Teacher'}</Text></Text>

          <View style={styles.detailsContainer}>
            <View style={[styles.fileTypeIcon, { backgroundColor: typeConfig.bg }]}>
              <Ionicons name={typeConfig.icon} size={22} color={typeConfig.color} />
            </View>
            <View style={styles.detailsContent}>
              <View style={styles.chipRow}>
                <View style={[styles.infoChip, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.infoChipText, { color: '#0284C7' }]}>{reviewMeta.subject || 'No subject'}</Text></View>
                <View style={[styles.infoChip, { backgroundColor: MaterialPalette.tealLight }]}><Text style={[styles.infoChipText, { color: MaterialPalette.tealDark }]}>{reviewMeta.grade || 'All classes'}</Text></View>
                <View style={[styles.infoChip, { backgroundColor: MaterialPalette.goldSoft }]}><Text style={[styles.infoChipText, { color: MaterialPalette.gold }]}>{reviewMeta.type || 'file'}</Text></View>
                {reviewMeta.fileSize ? <View style={[styles.infoChip, { backgroundColor: '#F8FAFC' }]}><Text style={[styles.infoChipText, { color: '#64748B' }]}>{formatFileSize(reviewMeta.fileSize)}</Text></View> : null}
              </View>
              {reviewMeta.description ? <Text style={styles.descriptionText} numberOfLines={3}>{reviewMeta.description}</Text> : null}
            </View>
          </View>

          {item.approvalStatus === 'pending_edit' && item.pendingChanges && (
            <View style={styles.diffContainer}>
              <Text style={styles.diffTitle}>Proposed Changes</Text>
              <DiffRow label="Title" oldVal={item.title} newVal={item.pendingChanges.title} />
              <DiffRow label="Subject" oldVal={item.subject} newVal={item.pendingChanges.subject} />
              <DiffRow label="Grade" oldVal={item.grade} newVal={item.pendingChanges.grade} />
              <DiffRow label="Locked" oldVal={item.lockedForAll ? 'Yes' : 'No'} newVal={item.pendingChanges.lockedForAll !== undefined ? (item.pendingChanges.lockedForAll ? 'Yes' : 'No') : (item.lockedForAll ? 'Yes' : 'No')} />
            </View>
          )}

          <ScaleBtn activeScale={0.96} onPress={() => handleReview(item)} disabled={previewLoading && previewingId === item._id}>
            <View style={styles.reviewBtn}>
              {previewLoading && previewingId === item._id ? (
                <ActivityIndicator size="small" color={MaterialPalette.teal} />
              ) : (
                <Ionicons name="eye" size={18} color={MaterialPalette.teal} style={{ marginRight: 6 }} />
              )}
              <Text style={styles.reviewBtnText}>Review</Text>
            </View>
          </ScaleBtn>

          <View style={styles.actionRow}>
            <ScaleBtn activeScale={0.96} onPress={() => openRejectModal(item)} style={{ flex: 1, marginRight: 8 }}>
              <View style={[styles.btn, styles.rejectBtn]}>
                <Ionicons name="close" size={18} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </View>
            </ScaleBtn>
            <ScaleBtn activeScale={0.96} onPress={() => handleApprove(item)} style={{ flex: 1, marginLeft: 8 }}>
              <LinearGradient colors={[MaterialPalette.teal, MaterialPalette.tealDark]} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </LinearGradient>
            </ScaleBtn>
          </View>
        </View>
      </FadeSlideView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HEADER */}
      <LinearGradient 
        colors={[MaterialPalette.primaryPink, MaterialPalette.primaryPinkLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerTop}>
          <ScaleBtn style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </ScaleBtn>
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>{pendingMaterials.length}</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <Text style={styles.headerSubtitle}>Review and manage teacher material requests</Text>
      </LinearGradient>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" color={MaterialPalette.primaryPink} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pendingMaterials}
          keyExtractor={(item) => item._id}
          renderItem={renderMaterial}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="checkmark-done-circle" size={64} color={MaterialPalette.teal} />
              </View>
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No pending material requests right now.</Text>
            </View>
          }
        />
      )}

      {/* REJECT MODAL */}
      <Modal visible={rejectModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>Reject Request</Text>
            </View>
            <Text style={styles.modalText}>Provide an optional reason for rejecting <Text style={{fontWeight: '700'}}>{selectedMaterial?.title}</Text>. The teacher will be notified.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Title is unclear, please update..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
              textAlignVertical="top"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalRejectBtn} onPress={handleReject}>
                <Text style={styles.modalRejectText}>Reject Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 24, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  badgeWrap: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)' },
  
  listContent: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  actionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  actionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  actionText: { fontSize: 13, fontWeight: '700' },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  teacherText: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  teacherName: { fontWeight: '600', color: '#374151' },
  detailsContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  fileTypeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailsContent: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  infoChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  infoChipText: { fontSize: 11, fontWeight: '700' },
  descriptionText: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  
  diffContainer: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  diffTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 12, textTransform: 'uppercase' },
  diffRow: { marginBottom: 10 },
  diffLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  diffValuesContainer: { flexDirection: 'row', alignItems: 'center' },
  diffOld: { flex: 1, fontSize: 13, color: '#EF4444', textDecorationLine: 'line-through' },
  diffNew: { flex: 1, fontSize: 13, color: MaterialPalette.teal, fontWeight: '500' },
  
  reviewBtn: { height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: MaterialPalette.teal, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  reviewBtnText: { color: MaterialPalette.teal, fontWeight: '800', fontSize: 15 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  btn: { height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  rejectBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  approveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: MaterialPalette.tealLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  modalText: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 20 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 15, color: '#1F2937', height: 100, marginBottom: 24 },
  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  modalCancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  modalRejectBtn: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalRejectText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
