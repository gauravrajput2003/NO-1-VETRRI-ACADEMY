import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import { askVettriAiAPI } from '../services/api';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { setAIOpen } from '../redux/slices/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
// Use full width on small screens, or a fixed width drawer on larger screens
const DRAWER_WIDTH = width > 400 ? 350 : width; 

export default function AIAssistantDrawer() {
  const dispatch = useDispatch();
  const { isAIOpen, theme } = useSelector((s) => s.ui);
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: "Hello! I'm Vettri AI. How can I help you with your studies today?" }
  ]);
  
  const scrollViewRef = useRef();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const borderCol = isDark ? Colors.border.dark : Colors.border.light;

  useEffect(() => {
    if (isAIOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [isAIOpen]);

  const handleSend = async () => {
    if (!question.trim()) return;
    
    const userQ = question.trim();
    setQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', text: userQ }]);
    setLoading(true);
    
    try {
      const response = await askVettriAiAPI(userQ);
      if (response.data.success) {
        if (response.data.fallback) {
          Toast.show({ type: 'info', text1: 'Vettri AI is in fallback mode', text2: 'Showing a safe offline response.' });
        }
        setChatHistory(prev => [...prev, { role: 'ai', text: response.data.answer }]);
      } else {
        Toast.show({ type: 'error', text1: 'Vettri AI Error', text2: response.data.message });
        setChatHistory(prev => [...prev, { role: 'ai', text: "I'm sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Connection Error', text2: err.response?.data?.message || 'Failed to connect to AI' });
      setChatHistory(prev => [...prev, { role: 'ai', text: "English:\nI am unable to connect right now. Please try again shortly.\n\nTamil:\nஇப்போது இணைப்பு சிக்கல் உள்ளது. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்." }]);
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    dispatch(setAIOpen(false));
  };

  // If completely closed, don't render touchable overlay to save resources
  if (!isAIOpen && slideAnim._value === DRAWER_WIDTH) return null;

  return (
    <View style={[styles.overlay, { pointerEvents: isAIOpen ? 'auto' : 'none' }]}>
      {/* Backdrop */}
      {isAIOpen && (
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={closeDrawer} 
        />
      )}

      {/* Drawer */}
      <Animated.View 
        style={[
          styles.drawerContainer, 
          { backgroundColor: isDark ? '#0f172a' : '#f8fafc', transform: [{ translateX: slideAnim }] }
        ]}
      >
        <LinearGradient 
          colors={isDark ? ['#0f172a', '#1e1b4b'] : ['#f8fafc', '#eef2ff']} 
          style={StyleSheet.absoluteFillObject} 
        />
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <LinearGradient colors={Colors.gradient.primary} style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={closeDrawer}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="sparkles" size={20} color={Colors.gold} style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Vettri AI</Text>
            </View>
            <TouchableOpacity onPress={() => setChatHistory([{ role: 'ai', text: "Hello! I'm Vettri AI. How can I help you with your studies today?" }])}>
               <Ionicons name="trash-outline" size={20} color="#fff" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 + insets.bottom }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {chatHistory.map((msg, index) => (
              <View 
                key={index} 
                style={[
                  styles.messageBubble, 
                  msg.role === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: cardBg }]
                ]}
              >
                {msg.role === 'ai' && (
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                  </View>
                )}
                <Text style={[
                  styles.messageText, 
                  msg.role === 'user' ? styles.userText : { color: textColor }
                ]}>
                  {msg.text}
                </Text>
              </View>
            ))}
            
            {loading && (
              <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: cardBg }]}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                </View>
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginHorizontal: 10 }} />
                <Text style={{ color: Colors.mediumGray, fontStyle: 'italic' }}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: cardBg,
                borderTopColor: borderCol,
                paddingBottom: Math.max(insets.bottom + 8, 16),
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: isDark ? Colors.background.dark : Colors.background.light }]}
              placeholder="Ask a question..."
              placeholderTextColor={isDark ? Colors.textSecondary.dark : Colors.textSecondary.light}
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !question.trim() && { opacity: 0.5 }]} 
              onPress={handleSend}
              disabled={!question.trim() || loading}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: '100%',
    ...Shadows.large,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // account for safe area in modal
    paddingBottom: 16,
    paddingHorizontal: 16,
    ...Shadows.medium,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  chatContainer: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...Shadows.light,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: -2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    marginRight: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
});
