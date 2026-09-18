import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity as RNTouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActionSheetIOS,
  ActivityIndicator,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { formatTime, formatFileSize } from '../../utils/formatters';
import {
  fetchMessages,
  sendMessage,
  setCurrentConversation,
  resetMessages,
  addIncomingMessage,
  setTyping,
  markConversationRead,
} from '../../redux/slices/chatSlice';
import { onSocketEvent, sendTypingIndicator, joinChatRoom } from '../../services/socket';
import { sendChatFileAPI } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 15, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

export default function ChatRoomScreen({ route, navigation }) {
  const { conversationId, otherUser } = route.params || {};
  const dispatch = useDispatch();
  const { messages, loading, typingUsers } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const tabVis = useTabBarVisibility();
  const hidePermanently = tabVis?.hidePermanently;
  const showPermanently = tabVis?.showPermanently;

  useFocusEffect(
    useCallback(() => {
      if (typeof hidePermanently === 'function') hidePermanently();
      return () => {
        if (typeof showPermanently === 'function') showPermanently();
      };
    }, [hidePermanently, showPermanently])
  );

  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const flatListRef = useRef();
  const typingTimeout = useRef(null);

  const bgColor = isDark ? Colors.background.dark : '#F4F7FB';
  const textColor = isDark ? Colors.text.dark : '#1F2937';
  const textSec = isDark ? Colors.textSecondary.dark : '#6B7280';
  const cardBg = isDark ? Colors.card.dark : '#FFFFFF';

  const resolvedConvId =
    conversationId ||
    (user?._id && otherUser?._id ? [user._id.toString(), otherUser._id.toString()].sort().join('_') : null);

  useEffect(() => {
    if (!resolvedConvId) return;

    dispatch(setCurrentConversation(resolvedConvId));
    dispatch(fetchMessages({ conversationId: resolvedConvId, page: 1 }));
    dispatch(markConversationRead(resolvedConvId));

    if (user?._id && otherUser?._id) {
      joinChatRoom(user._id, otherUser._id);
    }

    const unsubMessage = onSocketEvent('chat:message', (msg) => {
      if (msg.conversationId === resolvedConvId) {
        dispatch(addIncomingMessage(msg));
        dispatch(markConversationRead(resolvedConvId));
      }
    });

    const unsubFile = onSocketEvent('chat:file', (msg) => {
      if (msg.conversationId === resolvedConvId) {
        dispatch(addIncomingMessage(msg));
        dispatch(markConversationRead(resolvedConvId));
      }
    });

    const unsubTyping = onSocketEvent('chat:typing', (data) => {
      if (data.conversationId === resolvedConvId) {
        dispatch(setTyping({ conversationId: resolvedConvId, userId: data.userId, isTyping: data.isTyping }));
      }
    });

    return () => {
      unsubMessage();
      unsubFile();
      unsubTyping();
      dispatch(resetMessages());
      dispatch(setCurrentConversation(null));
    };
  }, [resolvedConvId, user?._id, otherUser?._id]);

  const handleSend = () => {
    if (!text.trim() || !otherUser?._id) return;
    dispatch(sendMessage({ receiverId: otherUser._id, message: text.trim() }));
    setText('');
    sendTypingIndicator(resolvedConvId, false, otherUser._id);
  };

  const handleTextChange = (val) => {
    setText(val);
    if (resolvedConvId && otherUser?._id) {
      sendTypingIndicator(resolvedConvId, true, otherUser._id);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => sendTypingIndicator(resolvedConvId, false, otherUser._id), 2000);
    }
  };

  const uploadFile = async (uri, name, type, nativeFile) => {
    if (!otherUser?._id) return;
    setUploading(true);
    setUploadProgress('Uploading media...');
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && nativeFile) {
        formData.append('file', nativeFile);
      } else {
        formData.append('file', { uri, name: name || 'upload_file', type: type || 'application/octet-stream' });
      }
      formData.append('receiverId', otherUser._id);

      const { data } = await sendChatFileAPI(formData);
      if (data.message) {
        dispatch(addIncomingMessage(data.message));
      }
      Toast.show({ type: 'success', text1: 'Media sent successfully! ✨' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error.response?.data?.message || 'Could not send file',
      });
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const pickImageOrVideo = async (mediaType = 'Images') => {
    setActionSheetVisible(false);
    const mediaTypes =
      mediaType === 'Videos'
        ? ImagePicker.MediaTypeOptions.Videos
        : mediaType === 'All'
        ? ImagePicker.MediaTypeOptions.All
        : ImagePicker.MediaTypeOptions.Images;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const isVid = asset.type === 'video' || (asset.uri && asset.uri.endsWith('.mp4'));
      const mime = isVid ? 'video/mp4' : 'image/jpeg';
      const ext = isVid ? '.mp4' : '.jpg';
      const fileName = asset.fileName || `media_${Date.now()}${ext}`;
      uploadFile(asset.uri, fileName, mime, asset.file);
    }
  };

  const pickAudio = async () => {
    setActionSheetVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        uploadFile(file.uri, file.name, file.mimeType || 'audio/mp3', file.file);
      }
    } catch {}
  };

  const pickDocument = async () => {
    setActionSheetVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '*/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        uploadFile(file.uri, file.name, file.mimeType || 'application/pdf', file.file);
      }
    } catch {}
  };

  const openAttachMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', '📷 Photo', '🎥 Video', '🎙️ Audio', '📄 PDF & Document'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) pickImageOrVideo('Images');
          if (idx === 2) pickImageOrVideo('Videos');
          if (idx === 3) pickAudio();
          if (idx === 4) pickDocument();
        }
      );
    } else {
      setActionSheetVisible(true);
    }
  };

  const isOtherTyping = resolvedConvId && typingUsers[resolvedConvId];

  const getRoleBadgeStyle = (role) => {
    if (role === 'admin') return { bg: '#FF4FA3', text: 'Admin Desk' };
    if (role === 'teacher') return { bg: '#14B8A6', text: 'Teacher' };
    return { bg: '#0EA5E9', text: 'Student' };
  };

  const badgeInfo = getRoleBadgeStyle(otherUser?.role);

  const renderMessageContent = (item, isMine) => {
    const isImage = item.messageType === 'image' || item.fileType === 'image';
    const isVideo = item.messageType === 'video' || item.fileType === 'video';
    const isAudio = item.messageType === 'audio' || item.fileType === 'audio';
    const isPdf = item.fileType === 'pdf';
    const isDoc = item.messageType === 'file' && !isImage && !isVideo && !isAudio;

    if (isImage && item.fileUrl) {
      return (
        <TouchableOpacity onPress={() => setPreviewImage(item.fileUrl)} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <Image source={{ uri: item.fileUrl }} style={styles.messageImage} contentFit="cover" transition={200} />
          {item.fileName && (
            <Text style={[styles.captionText, { color: isMine ? 'rgba(255,255,255,0.85)' : textSec }]} numberOfLines={1}>
              {item.fileName}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    if (isVideo && item.fileUrl) {
      return (
        <TouchableOpacity
          style={[styles.mediaCard, { backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(14, 165, 233, 0.08)' }]}
          onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
        >
          <View style={[styles.mediaIconWrap, { backgroundColor: '#0EA5E9' }]}>
            <Ionicons name="play" size={24} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fileName, { color: isMine ? '#FFF' : textColor }]} numberOfLines={1}>
              {item.fileName || 'Video Message'}
            </Text>
            <Text style={[styles.fileSub, { color: isMine ? 'rgba(255,255,255,0.7)' : textSec }]}>
              🎥 Video {item.fileSize ? `· ${formatFileSize(item.fileSize)}` : ''} · Tap to Play
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (isAudio && item.fileUrl) {
      return (
        <TouchableOpacity
          style={[styles.mediaCard, { backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(20, 184, 166, 0.08)' }]}
          onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
        >
          <View style={[styles.mediaIconWrap, { backgroundColor: '#14B8A6' }]}>
            <Ionicons name="volume-high" size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fileName, { color: isMine ? '#FFF' : textColor }]} numberOfLines={1}>
              {item.fileName || 'Audio Note'}
            </Text>
            <Text style={[styles.fileSub, { color: isMine ? 'rgba(255,255,255,0.7)' : textSec }]}>
              🎙️ Audio {item.fileSize ? `· ${formatFileSize(item.fileSize)}` : ''} · Tap to Listen
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if ((isPdf || isDoc) && item.fileUrl) {
      return (
        <TouchableOpacity
          style={[styles.mediaCard, { backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(255, 79, 163, 0.08)' }]}
          onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
        >
          <View style={[styles.mediaIconWrap, { backgroundColor: isPdf ? '#EF4444' : '#6366F1' }]}>
            <Ionicons name={isPdf ? 'document-text' : 'document'} size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fileName, { color: isMine ? '#FFF' : textColor }]} numberOfLines={1}>
              {item.fileName || (isPdf ? 'Document.pdf' : 'Attachment')}
            </Text>
            <Text style={[styles.fileSub, { color: isMine ? 'rgba(255,255,255,0.7)' : textSec }]}>
              {isPdf ? '📄 PDF Document' : '📎 File'} {item.fileSize ? `· ${formatFileSize(item.fileSize)}` : ''}
            </Text>
          </View>
          <Ionicons name="download-outline" size={20} color={isMine ? '#FFF' : Colors.primary} />
        </TouchableOpacity>
      );
    }

    return <Text style={[styles.msgText, { color: isMine ? '#FFF' : textColor }]}>{item.message}</Text>;
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderId?._id === user?._id || item.senderId === user?._id;

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        <View
          style={[
            styles.bubble,
            isMine
              ? styles.bubbleSent
              : [
                  styles.bubbleReceived,
                  { backgroundColor: isDark ? Colors.card.dark : '#FFFFFF' },
                ],
          ]}
        >
          {renderMessageContent(item, isMine)}

          <View style={styles.msgMeta}>
            <Text style={[styles.timeStamp, { color: isMine ? 'rgba(255,255,255,0.75)' : textSec }]}>
              {formatTime(item.createdAt)}
            </Text>
            {isMine && (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.isRead ? '#93C5FD' : 'rgba(255,255,255,0.6)'}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      {/* ── CUSTOM HEADER ── */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: isDark ? '#2D3748' : '#E5E7EB' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>

        <View style={styles.headerAvatarWrap}>
          {otherUser?.profilePic ? (
            <Image source={{ uri: otherUser.profilePic }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarFallback, { backgroundColor: badgeInfo.bg }]}>
              <Text style={styles.headerAvatarText}>
                {(otherUser?.displayName || otherUser?.name || 'U')[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          {otherUser?.isOnline && <View style={styles.headerOnlineDot} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: textColor }]} numberOfLines={1}>
            {otherUser?.displayName || otherUser?.name || 'User'}
          </Text>
          <View style={styles.headerSubRow}>
            <View style={[styles.headerRoleBadge, { backgroundColor: badgeInfo.bg }]}>
              <Text style={styles.headerRoleBadgeText}>{badgeInfo.text}</Text>
            </View>
            {otherUser?.grade && (
              <Text style={[styles.headerGradeText, { color: textSec }]}>· {otherUser.grade}</Text>
            )}
          </View>
        </View>
      </View>

      {/* ── CHAT BODY ── */}
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: bgColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: textSec }]}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id || item.createdAt}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={54} color={Colors.mediumGray} />
                <Text style={[styles.emptyTitle, { color: textColor }]}>Direct Private Chat</Text>
                <Text style={[styles.emptySub, { color: textSec }]}>
                  Send a message to start this 1-on-1 conversation.
                </Text>
              </View>
            }
          />
        )}

        {/* Typing indicator */}
        {isOtherTyping && (
          <View style={styles.typingBar}>
            <Text style={[styles.typingText, { color: textSec }]}>
              ✍️ {otherUser?.displayName || otherUser?.name} is typing...
            </Text>
          </View>
        )}

        {/* Uploading progress bar */}
        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadingText}>{uploadProgress}</Text>
          </View>
        )}

        {/* ── INPUT BAR ── */}
        <View style={[styles.inputBar, { backgroundColor: cardBg, borderTopColor: isDark ? '#2D3748' : '#E5E7EB' }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={openAttachMenu} disabled={uploading}>
            <Ionicons name="add-circle" size={30} color={Colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: textColor, backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
            placeholder="Type a message..."
            placeholderTextColor={Colors.mediumGray}
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={3000}
          />

          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!text.trim() || uploading}>
            <View style={[styles.sendCircle, { backgroundColor: text.trim() ? Colors.primary : Colors.mediumGray }]}>
              <Ionicons name="send" size={18} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Android Media Selection Modal */}
        <Modal visible={actionSheetVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.actionModalOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
            <View style={[styles.actionModalContent, { backgroundColor: cardBg }]}>
              <Text style={[styles.actionModalTitle, { color: textColor }]}>Share Attachment</Text>
              <View style={styles.actionModalGrid}>
                <TouchableOpacity style={styles.actionOption} onPress={() => pickImageOrVideo('Images')}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#FF4FA3' }]}>
                    <Ionicons name="image" size={26} color="#FFF" />
                  </View>
                  <Text style={[styles.actionText, { color: textColor }]}>Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionOption} onPress={() => pickImageOrVideo('Videos')}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#0EA5E9' }]}>
                    <Ionicons name="videocam" size={26} color="#FFF" />
                  </View>
                  <Text style={[styles.actionText, { color: textColor }]}>Video</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionOption} onPress={pickAudio}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#14B8A6' }]}>
                    <Ionicons name="mic" size={26} color="#FFF" />
                  </View>
                  <Text style={[styles.actionText, { color: textColor }]}>Audio</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionOption} onPress={pickDocument}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#F59E0B' }]}>
                    <Ionicons name="document-text" size={26} color="#FFF" />
                  </View>
                  <Text style={[styles.actionText, { color: textColor }]}>Document</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Full Image Preview Modal */}
        <Modal visible={!!previewImage} transparent animationType="fade">
          <View style={styles.previewOverlay}>
            <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
              <Ionicons name="close-circle" size={36} color="#FFF" />
            </TouchableOpacity>
            {previewImage && <Image source={{ uri: previewImage }} style={styles.previewImage} contentFit="contain" />}
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerAvatarWrap: { position: 'relative', marginRight: 10 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarFallback: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '800' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerRoleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  headerRoleBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  headerGradeText: { fontSize: 12, fontWeight: '500' },

  // Messages list
  messagesList: { padding: 16, paddingBottom: 16 },
  emptyWrap: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  msgRow: { marginBottom: 12 },
  msgRowRight: { alignItems: 'flex-end' },
  msgRowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleSent: { backgroundColor: '#FF4FA3', borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, justifyContent: 'flex-end' },
  timeStamp: { fontSize: 10, fontWeight: '500' },

  // Media
  messageImage: { width: 240, height: 190, borderRadius: 12 },
  captionText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  mediaCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 10, minWidth: 220 },
  mediaIconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  fileName: { fontSize: 14, fontWeight: '700' },
  fileSub: { fontSize: 11, marginTop: 2 },

  // Typing & uploading
  typingBar: { paddingHorizontal: 20, paddingVertical: 4 },
  typingText: { fontSize: 12, fontStyle: 'italic', fontWeight: '500' },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
  },
  uploadingText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  attachBtn: { padding: 6, marginBottom: 2 },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginHorizontal: 8,
  },
  sendBtn: { padding: 4, marginBottom: 2 },
  sendCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  // Modal actions
  actionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  actionModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  actionModalTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  actionModalGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  actionOption: { alignItems: 'center', gap: 8 },
  actionIconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },

  // Preview modal
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  previewImage: { width: '92%', height: '75%' },
});
