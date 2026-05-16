import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate } from '../../utils/formatters';

export default function DiscussScenarioScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostDesc, setNewPostDesc] = useState('');

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const mockDiscussions = [
    {
      id: 1,
      title: 'How to approach case study analysis?',
      author: 'Priya Kumar',
      avatar: '👩‍🎓',
      timestamp: '2 hours ago',
      replies: 5,
      views: 24,
      category: 'Case Study',
      categoryColor: '#6C5CE7',
    },
    {
      id: 2,
      title: 'Best practices for presentation skills',
      author: 'Arun Singh',
      avatar: '👨‍🎓',
      timestamp: '4 hours ago',
      replies: 8,
      views: 42,
      category: 'Skills',
      categoryColor: '#00B894',
    },
    {
      id: 3,
      title: 'Real-world problem solving examples',
      author: 'Neha Sharma',
      avatar: '👩‍💼',
      timestamp: '1 day ago',
      replies: 12,
      views: 67,
      category: 'Problem Solving',
      categoryColor: '#0984E3',
    },
  ];

  useEffect(() => {
    setDiscussions(mockDiscussions);
    setLoading(false);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setDiscussions(mockDiscussions);
      setRefreshing(false);
    }, 1000);
  };

  const handlePostDiscussion = () => {
    if (!newPostTitle.trim() || !newPostDesc.trim()) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Please fill in title and description' });
      return;
    }

    const newDiscussion = {
      id: discussions.length + 1,
      title: newPostTitle,
      author: user?.name || 'You',
      avatar: '👤',
      timestamp: 'just now',
      replies: 0,
      views: 1,
      category: 'General',
      categoryColor: '#00A8AB',
    };

    setDiscussions([newDiscussion, ...discussions]);
    setNewPostTitle('');
    setNewPostDesc('');
    setShowNewPost(false);
    Toast.show({ type: 'success', text1: 'Discussion posted!', text2: 'Your scenario is now visible' });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      {/* Teal Header */}
      <View style={styles.tealHeader}>
        <Text style={styles.headerTitle}>Discuss Scenario</Text>
        <Text style={styles.headerSub}>Share knowledge & solve problems together</Text>
      </View>

      {/* White Content Section */}
      <View style={[styles.contentSection, { backgroundColor: Colors.white }]}>
        {/* New Post Button */}
        <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowNewPost(!showNewPost)}>
          <Ionicons name="add-circle" size={20} color={Colors.white} />
          <Text style={styles.newPostBtnText}>Start Discussion</Text>
        </TouchableOpacity>

        {/* New Post Form */}
        {showNewPost && (
          <View style={[styles.postForm, { backgroundColor: '#F8F9FA' }]}>
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Scenario title..."
              placeholderTextColor={textSec}
              value={newPostTitle}
              onChangeText={setNewPostTitle}
            />
            <TextInput
              style={[styles.inputDesc, { color: textColor }]}
              placeholder="Describe the scenario or question..."
              placeholderTextColor={textSec}
              value={newPostDesc}
              onChangeText={setNewPostDesc}
              multiline
              numberOfLines={4}
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewPost(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postActionBtn} onPress={handlePostDiscussion}>
                <Text style={styles.postActionText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Discussions List */}
        <View style={styles.discussionsList}>
          {discussions.length ? (
            discussions.map((disc) => (
              <TouchableOpacity
                key={disc.id}
                style={[styles.discussionCard, { backgroundColor: cardBg }]}
                onPress={() => navigation.navigate('DiscussionDetail', { discussion: disc })}
              >
                {/* Avatar & Title */}
                <View style={styles.cardHeader}>
                  <Text style={styles.avatar}>{disc.avatar}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.discussTitle, { color: textColor }]} numberOfLines={2}>
                      {disc.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.meta, { color: textSec }]}>{disc.author}</Text>
                      <Text style={[styles.meta, { color: textSec }]}>•</Text>
                      <Text style={[styles.meta, { color: textSec }]}>{disc.timestamp}</Text>
                    </View>
                  </View>
                </View>

                {/* Category Badge */}
                <View style={{ marginVertical: 10 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: disc.categoryColor + '20', borderColor: disc.categoryColor }]}>
                    <Text style={[styles.categoryText, { color: disc.categoryColor }]}>{disc.category}</Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Ionicons name="chatbubbles-outline" size={16} color={textSec} />
                    <Text style={[styles.statText, { color: textSec }]}>{disc.replies} replies</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="eye-outline" size={16} color={textSec} />
                    <Text style={[styles.statText, { color: textSec }]}>{disc.views} views</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={textSec} />
              <Text style={[styles.emptyText, { color: textSec }]}>No discussions yet</Text>
              <Text style={[styles.emptySubText, { color: textSec }]}>Start one to engage with the community</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Teal Header
  tealHeader: {
    backgroundColor: '#00A8AB',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },

  // Content Section with white background
  contentSection: { paddingHorizontal: 16, paddingTop: 16 },

  // New Post Button (Pink)
  newPostBtn: {
    backgroundColor: Colors.pink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...Shadows.light,
  },
  newPostBtnText: { color: Colors.white, fontWeight: '800', marginLeft: 8, fontSize: 15 },

  // Post Form
  postForm: { borderRadius: 14, padding: 14, marginBottom: 16, ...Shadows.light },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '500',
  },
  inputDesc: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '400',
  },
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#E0E0E0' },
  cancelText: { color: '#616161', fontWeight: '700' },
  postActionBtn: { flex: 1.5, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.pink },
  postActionText: { color: Colors.white, fontWeight: '800' },

  // Discussions List
  discussionsList: { marginBottom: 16 },
  discussionCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    ...Shadows.light,
  },
  cardHeader: { flexDirection: 'row', gap: 10 },
  avatar: { fontSize: 32 },
  discussTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  meta: { fontSize: 12, fontWeight: '500' },

  categoryBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  categoryText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubText: { fontSize: 13, marginTop: 6 },
});
