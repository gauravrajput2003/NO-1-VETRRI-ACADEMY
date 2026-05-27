import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useSelector } from 'react-redux';
import { getActiveAnnouncementsAPI, markAnnouncementReadAPI } from '../services/api';
import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import { formatDate } from '../utils/formatters';

export function AnnouncementPopup() {
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Only fetch if logged in and NOT an admin
    if (user && user.role !== 'admin') {
      fetchAnnouncements();
    } else {
      setVisible(false);
      setAnnouncements([]);
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await getActiveAnnouncementsAPI();
      if (data && data.announcements && data.announcements.length > 0) {
        setAnnouncements(data.announcements);
        setCurrentIndex(0);
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      if (error?.response?.status !== 429) {
        console.log('Failed to fetch announcements', error);
      }
    }
  };

  const handleDismiss = async () => {
    const current = announcements[currentIndex];
    if (!current) return;

    try {
      await markAnnouncementReadAPI(current._id);
    } catch (error) {
      console.log('Failed to mark as read', error);
    }

    if (currentIndex < announcements.length - 1) {
      // Next announcement
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true })
      ]).start();
      setCurrentIndex(prev => prev + 1);
    } else {
      // Close modal
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        setAnnouncements([]);
      });
    }
  };

  if (!visible || announcements.length === 0) return null;

  const current = announcements[currentIndex];
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.cardContainer, { backgroundColor: cardBg, opacity: fadeAnim }]}>
          
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Important Notice</Text>
            </View>
            {announcements.length > 1 && (
              <Text style={[styles.counterText, { color: textSec }]}>
                {currentIndex + 1} of {announcements.length}
              </Text>
            )}
          </View>

          <Text style={[styles.title, { color: textColor }]}>{current.title}</Text>
          <Text style={[styles.date, { color: textSec }]}>Posted: {formatDate(current.createdAt)}</Text>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={[styles.content, { color: textColor }]}>{current.content}</Text>
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={handleDismiss}>
            <Text style={styles.buttonText}>OK, I got it</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    ...Shadows.medium,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: Colors.pink + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.pink,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    marginBottom: 16,
  },
  scrollArea: {
    maxHeight: 250,
    marginBottom: 24,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    ...Shadows.light,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
