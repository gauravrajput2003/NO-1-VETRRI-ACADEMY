import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity as RNTouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Modal, ActionSheetIOS } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { formatTime, formatFileSize } from '../../utils/formatters';
import { fetchMessages, sendMessage, setCurrentConversation, resetMessages, addIncomingMessage, setTyping, markConversationRead } from '../../redux/slices/chatSlice';
import { onSocketEvent, sendTypingIndicator, joinChatRoom } from '../../services/socket';
import { sendChatFileAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


export default function ChatRoomScreen({ route, navigation }) {
  const { conversationId, otherUser } = route.params;
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { messages, loading, typingUsers } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const flatListRef = useRef();
  const typingTimeout = useRef(null);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => {
    dispatch(setCurrentConversation(conversationId));
    dispatch(fetchMessages({ conversationId, page: 1 }));
    dispatch(markConversationRead(conversationId));

    if (user?._id && otherUser?._id) {
      joinChatRoom(user._id, otherUser._id);
    }

    const unsubMessage = onSocketEvent('chat:message', (msg) => {
      if (msg.conversationId === conversationId) dispatch(addIncomingMessage(msg));
    });
    const unsubFile = onSocketEvent('chat:file', (msg) => {
      if (msg.conversationId === conversationId) dispatch(addIncomingMessage(msg));
    });
    const unsubTyping = onSocketEvent('chat:typing', (data) => {
      if (data.conversationId === conversationId) dispatch(setTyping({ conversationId, userId: data.userId, isTyping: data.isTyping }));
    });

    return () => { unsubMessage(); unsubFile(); unsubTyping(); dispatch(resetMessages()); dispatch(setCurrentConversation(null)); };
  }, [conversationId]);

  const handleSend = () => {
    if (!text.trim()) return;
    dispatch(sendMessage({ receiverId: otherUser._id, message: text.trim() }));
    setText('');
    sendTypingIndicator(conversationId, false, otherUser._id);
  };

  const handleTextChange = (val) => {
    setText(val);
    sendTypingIndicator(conversationId, true, otherUser._id);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTypingIndicator(conversationId, false, otherUser._id), 2000);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const file = result.assets[0];
      uploadFile(file.uri, file.fileName || 'image.jpg', 'image/jpeg', file.file);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        uploadFile(file.uri, file.name, file.mimeType || 'application/octet-stream', file.file);
      }
    } catch {}
  };

  const uploadFile = async (uri, name, type, nativeFile) => {
    setUploading(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && nativeFile) {
        formData.append('file', nativeFile);
      } else {
        formData.append('file', { uri, name, type });
      }
      formData.append('receiverId', otherUser._id);
      const { data } = await sendChatFileAPI(formData);
      if (data.message) {
        dispatch(addIncomingMessage(data.message));
      }
      Toast.show({ type: 'success', text1: 'File sent! 📎' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: error.response?.data?.message || 'Try again' });
    } finally {
      setUploading(false);
    }
  };

  const showAttachOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancel', '📷 Photo', '📄 Document'], cancelButtonIndex: 0 }, (idx) => {
        if (idx === 1) pickImage();
        if (idx === 2) pickDocument();
      });
    } else {
      // Android: Show simple inline picker
      pickImage(); // Default to image; long press for document
    }
  };

  const isTyping = typingUsers[conversationId];

  const renderMessage = ({ item }) => {
    const isMine = item.senderId?._id === user?._id || item.senderId === user?._id;
    const isImage = item.messageType === 'image' || item.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)/i);
    const isFile = item.messageType === 'file' || (item.fileUrl && !isImage);

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleSent : [styles.bubbleReceived, { backgroundColor: isDark ? Colors.chatReceived.dark : Colors.chatReceived.light }]]}>
          {isImage && item.fileUrl ? (
            <TouchableOpacity onPress={() => setPreviewImage(item.fileUrl)}>
              <Image source={{ uri: item.fileUrl }} style={styles.messageImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : isFile && item.fileUrl ? (
            <TouchableOpacity style={styles.fileMsg} onPress={() => item.fileUrl && require('react-native').Linking.openURL(item.fileUrl)}>
              <Ionicons name="document-outline" size={24} color={isMine ? Colors.white : textColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileName, { color: isMine ? Colors.white : textColor }]} numberOfLines={1}>{item.fileName || 'File'}</Text>
                {item.fileSize && <Text style={[styles.fileSize, { color: isMine ? 'rgba(255,255,255,0.7)' : textSec }]}>{formatFileSize(item.fileSize)}</Text>}
              </View>
              <Ionicons name="download-outline" size={20} color={isMine ? 'rgba(255,255,255,0.8)' : Colors.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.msgText, { color: isMine ? Colors.white : textColor }]}>{item.message}</Text>
          )}
          <View style={styles.msgMeta}>
            <Text style={[styles.timeStamp, { color: isMine ? 'rgba(255,255,255,0.65)' : textSec }]}>{formatTime(item.createdAt)}</Text>
            {isMine && (
              <Ionicons name={item.isRead ? 'checkmark-done' : 'checkmark'} size={14} color={item.isRead ? (isMine ? '#4FC3F7' : Colors.info) : (isMine ? 'rgba(255,255,255,0.5)' : textSec)} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bgColor }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16}
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {isTyping && (
        <View style={styles.typingBar}>
          <Text style={[styles.typingText, { color: textSec }]}>{otherUser?.displayName || otherUser?.name} is typing...</Text>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: isDark ? Colors.card.dark : Colors.white }]}>
        <TouchableOpacity style={styles.attachBtn} onPress={showAttachOptions} disabled={uploading}>
          <Ionicons name={uploading ? 'hourglass-outline' : 'attach-outline'} size={24} color={uploading ? Colors.mediumGray : Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickDocument} style={styles.attachBtn} disabled={uploading}>
          <Ionicons name="document-outline" size={22} color={uploading ? Colors.mediumGray : Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="Type a message..."
          placeholderTextColor={Colors.mediumGray}
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!text.trim()}>
          <Ionicons name="send" size={22} color={text.trim() ? Colors.primary : Colors.mediumGray} />
        </TouchableOpacity>
      </View>

      {/* Image Preview Modal */}
      <Modal visible={!!previewImage} transparent>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          {previewImage && <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 8 },
  msgRowRight: { alignItems: 'flex-end' },
  msgRowLeft: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleSent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  messageImage: { width: 220, height: 180, borderRadius: 12, marginBottom: 4 },
  fileMsg: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200 },
  fileName: { fontSize: 14, fontWeight: '500' },
  fileSize: { fontSize: 11, marginTop: 2 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  timeStamp: { fontSize: 10 },
  typingBar: { paddingHorizontal: 20, paddingVertical: 4 },
  typingText: { fontSize: 12, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' },
  attachBtn: { padding: 8 },
  input: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 10, paddingHorizontal: 8 },
  sendBtn: { padding: 10 },
  // Preview
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  previewImage: { width: '90%', height: '70%' },
});
