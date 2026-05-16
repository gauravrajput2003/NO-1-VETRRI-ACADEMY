import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ScrollView, ActivityIndicator,
  Switch, RefreshControl, Image, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import {
  getAdminTrainingVideosAPI, uploadTrainingVideoByUrlAPI,
  uploadTrainingVideoFileAPI,
  editTrainingVideoAPI, toggleTrainingVideoStatusAPI,
  deleteAdminTrainingVideoAPI, reorderTrainingVideosAPI,
} from '../../services/api';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid-outline', color: '#6C5CE7' },
  { key: 'getting-started', label: 'Getting Started', icon: 'rocket-outline', color: '#00B894' },
  { key: 'teaching-setup', label: 'Teaching Setup', icon: 'desktop-outline', color: '#0984E3' },
  { key: 'live-classes', label: 'Live Classes', icon: 'radio-outline', color: '#E17055' },
  { key: 'student-management', label: 'Students', icon: 'people-outline', color: '#6C5CE7' },
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-circle-outline', color: '#00B894' },
  { key: 'exams', label: 'Exams', icon: 'document-text-outline', color: '#FDCB6E' },
  { key: 'assignments', label: 'Assignments', icon: 'create-outline', color: '#E17055' },
  { key: 'platform-tutorials', label: 'Platform', icon: 'laptop-outline', color: '#FF4F8B' },
];

const CAT_COLORS = {
  'getting-started':'#00B894','teaching-setup':'#0984E3','live-classes':'#E17055',
  'student-management':'#6C5CE7','attendance':'#00B894','exams':'#FDCB6E',
  'assignments':'#E17055','platform-tutorials':'#FF4F8B',
  'platform-tutorial':'#6C63FF','teaching-methods':'#FF6B6B',
  'technical-setup':'#00B894','other':'#FDCB6E',
};
const getCatColor = (c) => CAT_COLORS[c] || '#6C5CE7';
const getCatLabel = (k) => CATEGORIES.find(c => c.key === k)?.label || k;
const formatDur = (s) => { if (!s) return '0:00'; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; };
const EMPTY_FORM = { title:'', description:'', category:'getting-started', videoUrl:'', thumbnailUrl:'', duration:'', isMandatory:false };

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <View style={[ts.toast, type==='error' ? ts.toastErr : ts.toastOk]}>
      <Ionicons name={type==='error' ? 'close-circle':'checkmark-circle'} size={18} color='#fff' />
      <Text style={ts.toastTxt}>{msg}</Text>
    </View>
  );
}

export default function AdminTrainingVideosScreen({ navigation }) {
  const theme = useSelector(s => s.ui.theme);
  const isDark = theme === 'dark';
  const bg = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : '#fff';
  const txt = isDark ? '#fff' : Colors.navy;
  const txtSec = isDark ? '#B0BEC5' : Colors.mediumGray;
  const border = isDark ? '#30475E' : '#E8E8E8';

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [toast, setToast] = useState({ msg:'', type:'ok' });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  // 'file' = pick from device, 'url' = paste link
  const [uploadMode, setUploadMode] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null); // { name, uri, mimeType, size }
  const toastTimer = useRef(null);

  const showToast = (msg, type='ok') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ msg:'', type:'ok' }), 3000);
  };

  const load = useCallback(async () => {
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (search) params.search = search;
      const res = await getAdminTrainingVideosAPI(params);
      setVideos(res.data.videos || []);
    } catch { showToast('Failed to load videos','error'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [category, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    setUploadMode('file');
    setUploadProgress(0);
    setShowModal(true);
  };
  const openEdit = (v) => {
    setEditingId(v._id);
    setSelectedFile(null);
    setUploadMode(v.videoUrl ? 'url' : 'file');
    setUploadProgress(0);
    setForm({
      title: v.title || '',
      description: v.description || '',
      category: v.category || 'getting-started',
      videoUrl: v.videoUrl || v.cloudinaryUrl || '',
      thumbnailUrl: v.thumbnailUrl || '',
      duration: v.duration ? String(v.duration) : '',
      isMandatory: v.isMandatory || false,
    });
    setShowModal(true);
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType || 'video/mp4',
          size: asset.size,
          // On Expo Web (browser), asset.file is the real File object
          file: asset.file || null,
        });
        showToast(`Selected: ${asset.name}`);
      }
    } catch (e) {
      showToast('Could not open file picker', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return showToast('Title is required', 'error');

    // Editing existing — just update metadata, no file required
    if (editingId) {
      setSaving(true);
      try {
        const payload = { ...form, duration: parseInt(form.duration) || 0 };
        await editTrainingVideoAPI(editingId, payload);
        showToast('Video updated!');
        setShowModal(false);
        load();
      } catch (e) { showToast(e.response?.data?.message || 'Update failed', 'error'); }
      finally { setSaving(false); }
      return;
    }

    // Adding new video
    if (uploadMode === 'file') {
      if (!selectedFile) return showToast('Please pick a video file first', 'error');
      setSaving(true);
      setUploadProgress(0);
      try {
        const fd = new FormData();

        if (Platform.OS === 'web') {
          // Expo Web (browser): use the real File object OR fetch blob from URI
          if (selectedFile.file instanceof File) {
            fd.append('video', selectedFile.file, selectedFile.name);
          } else {
            // Fallback: fetch blob from the blob URI
            const blobRes = await fetch(selectedFile.uri);
            const blob = await blobRes.blob();
            fd.append('video', new File([blob], selectedFile.name, { type: selectedFile.mimeType || 'video/mp4' }));
          }
        } else {
          // Native iOS/Android: React Native's { uri, name, type } pattern
          fd.append('video', {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.mimeType || 'video/mp4',
          });
        }

        fd.append('title', form.title);
        fd.append('description', form.description || '');
        fd.append('category', form.category || 'getting-started');
        fd.append('thumbnailUrl', form.thumbnailUrl || '');
        fd.append('duration', String(parseInt(form.duration) || 0));
        fd.append('isMandatory', String(form.isMandatory));
        console.log('[Upload] Sending file:', selectedFile.name, selectedFile.mimeType, selectedFile.size, 'platform:', Platform.OS);
        await uploadTrainingVideoFileAPI(fd);
        showToast('Video uploaded successfully!');
        setShowModal(false);
        load();
      } catch (e) {
        const msg = e.message || e.response?.data?.message || 'Upload failed';
        console.error('[Upload] Error:', msg, JSON.stringify(e.response?.data));
        showToast(msg, 'error');
      } finally { setSaving(false); setUploadProgress(0); }
    } else {
      // URL mode
      if (!form.videoUrl.trim()) return showToast('Please paste a video URL', 'error');
      setSaving(true);
      try {
        const payload = { ...form, duration: parseInt(form.duration) || 0 };
        await uploadTrainingVideoByUrlAPI(payload);
        showToast('Video added!');
        setShowModal(false);
        load();
      } catch (e) { showToast(e.response?.data?.message || 'Save failed', 'error'); }
      finally { setSaving(false); }
    }
  };

  const handleToggle = async (v) => {
    try {
      await toggleTrainingVideoStatusAPI(v._id);
      setVideos(p => p.map(x => x._id===v._id ? {...x, isActive:!x.isActive} : x));
      showToast(v.isActive ? 'Video deactivated' : 'Video activated');
    } catch { showToast('Toggle failed','error'); }
  };

  const handleDelete = (v) => {
    Alert.alert('Delete Video', `Delete "${v.title}"? This cannot be undone.`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        try { await deleteAdminTrainingVideoAPI(v._id); setVideos(p => p.filter(x => x._id!==v._id)); showToast('Video deleted'); }
        catch { showToast('Delete failed','error'); }
      }},
    ]);
  };

  const handleReorder = async (v, dir) => {
    const idx = videos.findIndex(x => x._id===v._id);
    const newIdx = dir==='up' ? idx-1 : idx+1;
    if (newIdx < 0 || newIdx >= videos.length) return;
    const r = [...videos]; [r[idx], r[newIdx]] = [r[newIdx], r[idx]];
    const items = r.map((x,i) => ({ id:x._id, order:i }));
    setVideos(r);
    try { await reorderTrainingVideosAPI(items); }
    catch { load(); showToast('Reorder failed','error'); }
  };

  const active = videos.filter(v => v.isActive).length;
  const inactive = videos.length - active;

  const renderVideo = ({ item, index }) => {
    const cc = getCatColor(item.category);
    return (
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.cardLeft}>
          <View style={[styles.thumb, { backgroundColor: cc+'22' }]}>
            {item.thumbnailUrl ? <Image source={{ uri:item.thumbnailUrl }} style={styles.thumbImg} /> : <Ionicons name='videocam' size={28} color={cc} />}
            {!item.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveTxt}>OFF</Text></View>}
          </View>
          <View style={styles.reorderBtns}>
            <TouchableOpacity onPress={() => handleReorder(item,'up')} style={styles.reorderBtn}><Ionicons name='chevron-up' size={16} color={txtSec} /></TouchableOpacity>
            <Text style={[styles.orderNum,{color:txtSec}]}>#{index+1}</Text>
            <TouchableOpacity onPress={() => handleReorder(item,'down')} style={styles.reorderBtn}><Ionicons name='chevron-down' size={16} color={txtSec} /></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex:1, paddingLeft:12 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <View style={[styles.catChip, { backgroundColor:cc+'18' }]}><Text style={[styles.catTxt,{color:cc}]}>{getCatLabel(item.category)}</Text></View>
            {item.isMandatory && <View style={styles.mandChip}><Text style={styles.mandTxt}>★ Mandatory</Text></View>}
          </View>
          <Text style={[styles.cardTitle,{color:txt}]} numberOfLines={2}>{item.title}</Text>
          {item.description ? <Text style={[styles.cardDesc,{color:txtSec}]} numberOfLines={2}>{item.description}</Text> : null}
          <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginTop:6 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name='time-outline' size={12} color={txtSec} /><Text style={[styles.metaTxt,{color:txtSec}]}>{formatDur(item.duration)}</Text></View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Ionicons name='eye-outline' size={12} color={txtSec} /><Text style={[styles.metaTxt,{color:txtSec}]}>{item.stats?.totalWatchers||0} watched</Text></View>
          </View>
          <View style={styles.cardActions}>
            <Switch value={item.isActive} onValueChange={() => handleToggle(item)} trackColor={{ false:'#ccc', true:Colors.teal+'88' }} thumbColor={item.isActive?Colors.teal:'#aaa'} style={{ transform:[{scaleX:0.8},{scaleY:0.8}] }} />
            <TouchableOpacity style={[styles.actionBtn,{backgroundColor:Colors.primary+'15'}]} onPress={() => openEdit(item)}><Ionicons name='pencil' size={15} color={Colors.primary} /><Text style={[styles.actionBtnTxt,{color:Colors.primary}]}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn,{backgroundColor:'#FF4F4F18'}]} onPress={() => handleDelete(item)}><Ionicons name='trash' size={15} color='#FF4F4F' /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor:bg }]}>
      <Toast msg={toast.msg} type={toast.type} />
      <LinearGradient colors={['#FF4F8B','#6C5CE7']} style={styles.header}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight:10 }}>
            <Ionicons name='arrow-back' size={24} color='#fff' />
          </TouchableOpacity>
          <View style={{ flex:1 }}>
            <Text style={styles.hTitle}>Training Videos</Text>
            <Text style={styles.hSub}>{videos.length} total · {active} active · {inactive} inactive</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}><Ionicons name='add' size={22} color='#fff' /></TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={[styles.searchBox, { backgroundColor:cardBg, borderColor:border }]}>
        <Ionicons name='search-outline' size={18} color={txtSec} />
        <TextInput style={[styles.searchIn,{color:txt}]} placeholder='Search videos...' placeholderTextColor={txtSec} value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name='close-circle' size={18} color={txtSec} /></TouchableOpacity> : null}
      </View>

      <FlatList data={CATEGORIES} horizontal showsHorizontalScrollIndicator={false} keyExtractor={i=>i.key} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:8 }}
        renderItem={({ item:c }) => {
          const a = category===c.key;
          return <TouchableOpacity style={[styles.fChip, a?{backgroundColor:c.color,borderColor:c.color}:{borderColor:border}]} onPress={() => setCategory(c.key)}><Ionicons name={c.icon} size={13} color={a?'#fff':c.color} style={{marginRight:4}} /><Text style={[styles.fTxt,{color:a?'#fff':c.color}]}>{c.label}</Text></TouchableOpacity>;
        }} />

      {loading ? (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><ActivityIndicator size='large' color={Colors.primary} /></View>
      ) : (
        <FlatList data={videos} keyExtractor={i=>i._id} renderItem={renderVideo} contentContainerStyle={{ padding:16, paddingBottom:32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name='videocam-off-outline' size={64} color={Colors.mediumGray} />
              <Text style={[styles.emptyTitle,{color:txt}]}>No Videos Yet</Text>
              <Text style={[styles.emptyDesc,{color:txtSec}]}>Tap + to add your first training video</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
                <Ionicons name='add-circle' size={18} color='#fff' /><Text style={{ color:'#fff', fontWeight:'700', marginLeft:6 }}>Add Video</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showModal} animationType='slide' transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor:cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle,{color:txt}]}>{editingId ? 'Edit Video' : 'Add Training Video'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name='close' size={24} color={txt} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={[styles.label,{color:txtSec}]}>Title *</Text>
              <TextInput style={[styles.input,{color:txt,borderColor:border}]} placeholder='e.g. How to Take Live Classes' placeholderTextColor={txtSec} value={form.title} onChangeText={v=>setForm(p=>({...p,title:v}))} />

              {/* Description */}
              <Text style={[styles.label,{color:txtSec}]}>Description</Text>
              <TextInput style={[styles.input,styles.textarea,{color:txt,borderColor:border}]} placeholder='Brief description...' placeholderTextColor={txtSec} multiline numberOfLines={3} value={form.description} onChangeText={v=>setForm(p=>({...p,description:v}))} />

              {/* Upload Mode Toggle — only show when adding new */}
              {!editingId && (
                <>
                  <Text style={[styles.label,{color:txtSec,marginTop:8}]}>Video Source</Text>
                  <View style={styles.modeRow}>
                    <TouchableOpacity
                      style={[styles.modeBtn, uploadMode==='file' && styles.modeBtnActive]}
                      onPress={() => { setUploadMode('file'); setSelectedFile(null); }}
                    >
                      <Ionicons name='phone-portrait-outline' size={16} color={uploadMode==='file' ? '#fff' : Colors.primary} />
                      <Text style={[styles.modeTxt, uploadMode==='file' && styles.modeTxtActive]}>From Device</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modeBtn, uploadMode==='url' && styles.modeBtnActive]}
                      onPress={() => { setUploadMode('url'); setSelectedFile(null); }}
                    >
                      <Ionicons name='link-outline' size={16} color={uploadMode==='url' ? '#fff' : Colors.primary} />
                      <Text style={[styles.modeTxt, uploadMode==='url' && styles.modeTxtActive]}>Paste URL</Text>
                    </TouchableOpacity>
                  </View>

                  {/* File Upload */}
                  {uploadMode === 'file' && (
                    <TouchableOpacity style={[styles.filePicker, selectedFile && styles.filePickerSelected]} onPress={pickVideo}>
                      {selectedFile ? (
                        <View style={{ alignItems:'center', gap:6 }}>
                          <Ionicons name='checkmark-circle' size={32} color='#00B894' />
                          <Text style={[styles.filePickerTxt,{color:'#00B894'}]} numberOfLines={2}>{selectedFile.name}</Text>
                          <Text style={{color:Colors.mediumGray, fontSize:11}}>
                            {selectedFile.size ? `${(selectedFile.size/1024/1024).toFixed(1)} MB` : ''}
                          </Text>
                          <Text style={{color:Colors.primary, fontSize:12, fontWeight:'700'}}>Tap to change</Text>
                        </View>
                      ) : (
                        <View style={{ alignItems:'center', gap:8 }}>
                          <View style={styles.filePickerIcon}>
                            <Ionicons name='cloud-upload-outline' size={36} color={Colors.primary} />
                          </View>
                          <Text style={styles.filePickerTxt}>Tap to pick video from device</Text>
                          <Text style={{color:Colors.mediumGray, fontSize:11, textAlign:'center'}}>Supports MP4, MOV, AVI, WebM</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* URL Input */}
                  {uploadMode === 'url' && (
                    <>
                      <TextInput style={[styles.input,{color:txt,borderColor:border}]} placeholder='https://... (YouTube, MP4, Cloudinary, Drive)' placeholderTextColor={txtSec} value={form.videoUrl} onChangeText={v=>setForm(p=>({...p,videoUrl:v}))} autoCapitalize='none' keyboardType='url' />
                      <Text style={{color:Colors.mediumGray, fontSize:11, marginBottom:8}}>Paste a direct video link or streaming URL</Text>
                    </>
                  )}
                </>
              )}

              {/* Edit mode — show existing video URL */}
              {editingId && (
                <>
                  <Text style={[styles.label,{color:txtSec}]}>Video URL (optional — leave blank to keep existing)</Text>
                  <TextInput style={[styles.input,{color:txt,borderColor:border}]} placeholder='https://... or leave blank' placeholderTextColor={txtSec} value={form.videoUrl} onChangeText={v=>setForm(p=>({...p,videoUrl:v}))} autoCapitalize='none' keyboardType='url' />
                </>
              )}

              {/* Thumbnail URL */}
              <Text style={[styles.label,{color:txtSec}]}>Thumbnail URL (optional)</Text>
              <TextInput style={[styles.input,{color:txt,borderColor:border}]} placeholder='https://... (image link)' placeholderTextColor={txtSec} value={form.thumbnailUrl} onChangeText={v=>setForm(p=>({...p,thumbnailUrl:v}))} autoCapitalize='none' keyboardType='url' />
              {form.thumbnailUrl ? <Image source={{ uri:form.thumbnailUrl }} style={styles.thumbPreview} resizeMode='cover' /> : null}

              {/* Category */}
              <Text style={[styles.label,{color:txtSec}]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
                {CATEGORIES.filter(c=>c.key!=='all').map(c => (
                  <TouchableOpacity key={c.key} style={[styles.catPicker, form.category===c.key?{backgroundColor:c.color,borderColor:c.color}:{borderColor:border}]} onPress={() => setForm(p=>({...p,category:c.key}))}>
                    <Text style={{ color:form.category===c.key?'#fff':c.color, fontSize:12, fontWeight:'700' }}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Duration */}
              <Text style={[styles.label,{color:txtSec}]}>Duration (seconds)</Text>
              <TextInput style={[styles.input,{color:txt,borderColor:border}]} placeholder='e.g. 360 (= 6 min)' placeholderTextColor={txtSec} keyboardType='number-pad' value={form.duration} onChangeText={v=>setForm(p=>({...p,duration:v}))} />

              {/* Mandatory toggle */}
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginVertical:14 }}>
                <Text style={[styles.label,{color:txt,marginBottom:0}]}>Mark as Mandatory</Text>
                <Switch value={form.isMandatory} onValueChange={v=>setForm(p=>({...p,isMandatory:v}))} trackColor={{ false:'#ccc', true:Colors.primary+'88' }} thumbColor={form.isMandatory?Colors.primary:'#aaa'} />
              </View>

              {/* Upload progress bar */}
              {saving && uploadMode === 'file' && !editingId && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity style={[styles.saveBtn, saving&&{opacity:0.7}]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <><ActivityIndicator size='small' color='#fff' /><Text style={styles.saveTxt}>{uploadMode==='file'&&!editingId ? 'Uploading...' : 'Saving...'}</Text></>
                  : <><Ionicons name={editingId?'save': uploadMode==='file'?'cloud-upload':'link'} size={18} color='#fff' />
                     <Text style={styles.saveTxt}>{editingId ? 'Save Changes' : uploadMode==='file' ? 'Upload Video' : 'Add Video'}</Text></>
                }
              </TouchableOpacity>
              <View style={{ height:30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ts = StyleSheet.create({
  toast: { position:'absolute', top:60, left:20, right:20, zIndex:999, flexDirection:'row', alignItems:'center', gap:8, borderRadius:12, padding:14, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.2, shadowRadius:8, elevation:8 },
  toastOk: { backgroundColor:'#00B894' },
  toastErr: { backgroundColor:'#FF4F4F' },
  toastTxt: { color:'#fff', fontWeight:'700', fontSize:14, flex:1 },
});

const styles = StyleSheet.create({
  container: { flex:1 },
  header: { paddingTop:52, paddingBottom:20, paddingHorizontal:20 },
  hTitle: { fontSize:22, fontWeight:'800', color:'#fff' },
  hSub: { fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2 },
  addBtn: { width:44, height:44, borderRadius:22, backgroundColor:'rgba(255,255,255,0.25)', justifyContent:'center', alignItems:'center' },
  searchBox: { flexDirection:'row', alignItems:'center', margin:16, marginBottom:8, borderRadius:14, paddingHorizontal:14, borderWidth:1, ...Shadows.light },
  searchIn: { flex:1, fontSize:14, paddingVertical:11, marginLeft:8 },
  fChip: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:7, borderRadius:18, borderWidth:1.5, marginRight:8 },
  fTxt: { fontSize:12, fontWeight:'700' },
  card: { borderRadius:18, marginBottom:14, padding:14, flexDirection:'row', ...Shadows.medium },
  cardLeft: { alignItems:'center', width:72 },
  thumb: { width:72, height:72, borderRadius:14, justifyContent:'center', alignItems:'center', overflow:'hidden', marginBottom:4 },
  thumbImg: { width:'100%', height:'100%', borderRadius:14 },
  inactiveBadge: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.55)', borderRadius:14, justifyContent:'center', alignItems:'center' },
  inactiveTxt: { color:'#fff', fontSize:10, fontWeight:'800' },
  reorderBtns: { flexDirection:'row', alignItems:'center', gap:2, marginTop:4 },
  reorderBtn: { padding:2 },
  orderNum: { fontSize:10, fontWeight:'700' },
  catChip: { paddingHorizontal:8, paddingVertical:3, borderRadius:8, marginBottom:6 },
  catTxt: { fontSize:10, fontWeight:'700' },
  mandChip: { backgroundColor:'#FFD70022', paddingHorizontal:8, paddingVertical:3, borderRadius:8, marginBottom:6 },
  mandTxt: { color:'#B8860B', fontSize:10, fontWeight:'800' },
  cardTitle: { fontSize:14, fontWeight:'700', lineHeight:20 },
  cardDesc: { fontSize:12, marginTop:3, lineHeight:17 },
  metaTxt: { fontSize:11, fontWeight:'600' },
  cardActions: { flexDirection:'row', alignItems:'center', gap:8, marginTop:10 },
  actionBtn: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:6, borderRadius:10, gap:4 },
  actionBtnTxt: { fontSize:12, fontWeight:'700' },
  empty: { alignItems:'center', paddingTop:80, paddingBottom:40 },
  emptyTitle: { fontSize:20, fontWeight:'800', marginTop:16 },
  emptyDesc: { fontSize:13, marginTop:6, textAlign:'center' },
  emptyAddBtn: { flexDirection:'row', alignItems:'center', marginTop:20, backgroundColor:Colors.primary, paddingHorizontal:20, paddingVertical:12, borderRadius:14 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalBox: { borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, maxHeight:'90%' },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  modalTitle: { fontSize:20, fontWeight:'800' },
  label: { fontSize:13, fontWeight:'700', marginBottom:6, marginTop:4 },
  input: { borderWidth:1.5, borderRadius:12, paddingHorizontal:14, paddingVertical:11, fontSize:14, marginBottom:4 },
  textarea: { height:80, textAlignVertical:'top' },
  thumbPreview: { width:'100%', height:160, borderRadius:12, marginBottom:12 },
  catPicker: { paddingHorizontal:12, paddingVertical:7, borderRadius:12, borderWidth:1.5, marginRight:8 },
  saveBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:Colors.primary, borderRadius:16, paddingVertical:16, gap:8, marginTop:8 },
  saveTxt: { color:'#fff', fontSize:16, fontWeight:'800' },
  // Mode toggle
  modeRow: { flexDirection:'row', gap:10, marginBottom:16 },
  modeBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:12, borderRadius:14, borderWidth:2, borderColor:Colors.primary, backgroundColor:'transparent' },
  modeBtnActive: { backgroundColor:Colors.primary, borderColor:Colors.primary },
  modeTxt: { fontSize:13, fontWeight:'700', color:Colors.primary },
  modeTxtActive: { color:'#fff' },
  // File picker
  filePicker: { borderWidth:2, borderColor:Colors.primary, borderStyle:'dashed', borderRadius:16, padding:28, alignItems:'center', justifyContent:'center', marginBottom:12, backgroundColor:Colors.primary+'08' },
  filePickerSelected: { borderColor:'#00B894', backgroundColor:'#00B89408' },
  filePickerIcon: { width:72, height:72, borderRadius:36, backgroundColor:Colors.primary+'15', justifyContent:'center', alignItems:'center', marginBottom:4 },
  filePickerTxt: { fontSize:13, fontWeight:'700', color:Colors.primary, textAlign:'center' },
  // Progress
  progressBar: { height:6, borderRadius:3, backgroundColor:'#E8E8E8', marginBottom:14, overflow:'hidden' },
  progressFill: { height:'100%', backgroundColor:Colors.primary, borderRadius:3 },
});