import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { askVettriAiAPI } from '../../services/api';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VettriAIScreen({ navigation }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: "Hello! I'm Vettri AI. How can I help you with your studies today?" }
  ]);
  
  const scrollViewRef = useRef();
  const insets = useSafeAreaInsets();
  
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  
  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const borderCol = isDark ? Colors.border.dark : Colors.border.light;

  const handleSend = async () => {
    if (!question.trim()) return;
    
    const userQ = question.trim();
    setQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', text: userQ }]);
    setLoading(true);
    
    try {
      const response = await askVettriAiAPI(userQ);
      if (response.data.success) {
        setChatHistory(prev => [...prev, { role: 'ai', text: response.data.answer }]);
      } else {
        Toast.show({ type: 'error', text1: 'Vettri AI Error', text2: response.data.message });
        setChatHistory(prev => [...prev, { role: 'ai', text: "I'm sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Connection Error', text2: err.response?.data?.message || 'Failed to connect to AI' });
      setChatHistory(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting to the server. Please check your internet connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: bgColor }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={Colors.gradient.primary} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={20} color={Colors.gold} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Vettri AI Assistant</Text>
        </View>
        <View style={{ width: 40 }} />
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

      <View style={[styles.inputContainer, { backgroundColor: cardBg, borderTopColor: borderCol }]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
