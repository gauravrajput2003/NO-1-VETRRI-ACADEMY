import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Image } from 'expo-image';

import { useSelector } from 'react-redux';

import {
  getActiveAnnouncementsAPI,
  markAnnouncementReadAPI,
} from '../services/api';

import { Colors } from '../utils/colors';
import { Shadows } from '../utils/theme';
import { formatDate } from '../utils/formatters';
import { normalizeMaterialFileUrl } from '../utils/fileUtils';

import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';


// ─────────────────────────────────────────────
// Audio Player
// ─────────────────────────────────────────────
function AudioAnnouncement({ audio }) {
  const player = useAudioPlayer(audio.url);
  const status = useAudioPlayerStatus(player);

  const playing = Boolean(status?.playing);

  const currentTime = status?.currentTime || 0;
  const duration = status?.duration || audio.duration || 0;

  const progress =
    duration > 0
      ? Math.min(1, currentTime / duration)
      : 0;

  const togglePlay = () => {
    try {
      if (playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.log(
        'Announcement audio error:',
        error
      );
    }
  };

  const formatTime = (seconds) => {
    const value = Math.max(
      0,
      Math.floor(seconds || 0)
    );

    const minutes = Math.floor(value / 60);
    const secondsPart = value % 60;

    return `${minutes}:${String(secondsPart).padStart(
      2,
      '0'
    )}`;
  };

  return (
    <View style={styles.audioBox}>

      <TouchableOpacity
        style={styles.audioPlayButton}
        onPress={togglePlay}
      >
        <Text style={styles.audioPlayText}>
          {playing ? '❚❚' : '▶'}
        </Text>
      </TouchableOpacity>

      <View style={styles.audioMiddle}>

        <Text
          style={styles.audioName}
          numberOfLines={1}
        >
          {audio.originalFilename ||
            'Voice Message'}
        </Text>

        <View style={styles.audioTrack}>
          <View
            style={[
              styles.audioProgress,
              {
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>

        <View style={styles.audioTimeRow}>
          <Text style={styles.audioTime}>
            {formatTime(currentTime)}
          </Text>

          <Text style={styles.audioTime}>
            {formatTime(duration)}
          </Text>
        </View>

      </View>

      <Text style={styles.audioIcon}>
        🎤
      </Text>

    </View>
  );
}


// ─────────────────────────────────────────────
// Video Player
// ─────────────────────────────────────────────

function VideoAnnouncement({ video }) {

  const [playing, setPlaying] = useState(false);

  const openVideo = () => {
    if (video?.url) {
      Linking.openURL(video.url).catch(() => {});
    }
  };

  return (
    <View style={styles.videoBox}>

      {!playing ? (
        <TouchableOpacity
          style={styles.videoPoster}
          activeOpacity={0.9}
          onPress={() => setPlaying(true)}
        >

          {video.thumbnail ? (
            <Image
              source={{
                uri: video.thumbnail,
              }}
              style={styles.videoImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.videoFallback} />
          )}

          <View style={styles.videoOverlay}>

            <View style={styles.videoPlayCircle}>
              <Text style={styles.videoPlayText}>
                ▶
              </Text>
            </View>

            <Text style={styles.videoLabel}>
              Tap to watch video
            </Text>

          </View>

        </TouchableOpacity>
      ) : (
        <View style={styles.videoPlayingBox}>

          {Platform.OS === 'web' ? (
            <video
              src={video.url}
              controls
              autoPlay
              style={{
                width: '100%',
                height: 220,
                borderRadius: 14,
                backgroundColor: '#000',
              }}
            />
          ) : (
            <TouchableOpacity
              style={styles.openVideoButton}
              onPress={openVideo}
            >
              <Text style={styles.openVideoText}>
                Open Video
              </Text>
            </TouchableOpacity>
          )}

        </View>
      )}

    </View>
  );
}


// ─────────────────────────────────────────────
// Document / PDF
// ─────────────────────────────────────────────

function DocumentAnnouncement({ document, navigation }) {
  const openDocument = () => {
    if (!document?.url) {
      console.warn('[Announcement PDF] Missing URL:', document);
      return;
    }

    const normalizedUrl = normalizeMaterialFileUrl(
      document.url,
      {
        resourceType:
          document.resourceType ||
          document.resource_type ||
          'raw',
        publicId:
          document.publicId ||
          document.public_id,
      }
    );

    console.log('[Announcement PDF] Opening:', {
      originalUrl: document.url,
      normalizedUrl,
      filename: document.originalFilename,
      mimeType: document.mimeType,
      resourceType: document.resourceType || document.resource_type,
      publicId: document.publicId || document.public_id,
    });

    navigation.navigate('PdfViewer', {
      title: document.originalFilename || 'PDF Document',
      pdfUrl: normalizedUrl,
      materialId: document._id || null,
      totalPages: document.totalPages || 0,
    });
  };

  return (
    <TouchableOpacity
      style={styles.documentBox}
      onPress={openDocument}
      activeOpacity={0.8}
    >
      <View style={styles.documentIcon}>
        <Text style={styles.documentIconText}>
          📄
        </Text>
      </View>

      <View style={styles.documentInfo}>
        <Text
          style={styles.documentName}
          numberOfLines={1}
        >
          {document.originalFilename || 'File Attachment'}
        </Text>

        <Text style={styles.documentHint}>
          {document.mimeType === 'application/pdf'
            ? 'Tap to preview PDF'
            : 'Tap to open attachment'}
        </Text>
      </View>

      <Text style={styles.documentArrow}>
        →
      </Text>
    </TouchableOpacity>
  );
}


// ─────────────────────────────────────────────
// Main Popup
// ─────────────────────────────────────────────

export function AnnouncementPopup() {
  const navigation = useNavigation();
  const { user } = useSelector(
    (s) => s.auth
  );

  const theme = useSelector(
    (s) => s.ui.theme
  );

  const isDark = theme === 'dark';

  const [announcements, setAnnouncements] =
    useState([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [visible, setVisible] =
    useState(false);

  const [fadeAnim] =
    useState(new Animated.Value(0));


  useEffect(() => {

    if (
      user &&
      user.role !== 'admin'
    ) {
      fetchAnnouncements();
    } else {

      setVisible(false);
      setAnnouncements([]);

    }

  }, [user]);


  const fetchAnnouncements = async () => {

    try {

      const { data } =
        await getActiveAnnouncementsAPI();

      const list =
        data?.announcements || [];

      if (list.length > 0) {

        setAnnouncements(list);

        setCurrentIndex(0);

        setVisible(true);

        Animated.timing(
          fadeAnim,
          {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }
        ).start();

      }

    } catch (error) {

      if (
        error?.response?.status !== 429
      ) {

        console.log(
          'Failed to fetch announcements',
          error
        );

      }

    }

  };


  const handleDismiss = async () => {

    const current =
      announcements[currentIndex];

    if (!current) return;


    try {

      await markAnnouncementReadAPI(
        current._id
      );

    } catch (error) {

      console.log(
        'Failed to mark announcement as read',
        error
      );

    }


    if (
      currentIndex <
      announcements.length - 1
    ) {

      Animated.sequence([

        Animated.timing(
          fadeAnim,
          {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          fadeAnim,
          {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }
        ),

      ]).start();

      setCurrentIndex(
        (prev) => prev + 1
      );

    } else {

      Animated.timing(
        fadeAnim,
        {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }
      ).start(() => {

        setVisible(false);
        setAnnouncements([]);

      });

    }

  };


  if (
    !visible ||
    announcements.length === 0
  ) {
    return null;
  }


  const current =
    announcements[currentIndex];


  const cardBg =
    isDark
      ? Colors.card.dark
      : Colors.card.light;

  const textColor =
    isDark
      ? Colors.text.dark
      : Colors.text.light;

  const textSec =
    isDark
      ? Colors.textSecondary.dark
      : Colors.textSecondary.light;


  const media =
    current.media || [];

  const images =
    media.filter(
      (m) => m.type === 'image'
    );

  const videos =
    media.filter(
      (m) => m.type === 'video'
    );

  const audios =
    media.filter(
      (m) => m.type === 'audio'
    );

  const documents =
    media.filter(
      (m) =>
        m.type === 'document' ||
        m.type === 'raw'
    );


  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >

      <View style={styles.overlay}>

        <Animated.View
          style={[
            styles.cardContainer,
            {
              backgroundColor: cardBg,
              opacity: fadeAnim,
            },
          ]}
        >

          {/* Header */}

          <View style={styles.header}>

            <View style={styles.badge}>

              <Text
                style={styles.badgeText}
              >
                Important Notice
              </Text>

            </View>

            {announcements.length > 1 && (

              <Text
                style={[
                  styles.counterText,
                  {
                    color: textSec,
                  },
                ]}
              >
                {currentIndex + 1} of{' '}
                {announcements.length}
              </Text>

            )}

          </View>


          {/* Title */}

          <Text
            style={[
              styles.title,
              {
                color: textColor,
              },
            ]}
          >
            {current.title}
          </Text>


          {/* Date */}

          <Text
            style={[
              styles.date,
              {
                color: textSec,
              },
            ]}
          >
            Posted:{' '}
            {formatDate(
              current.createdAt
            )}
          </Text>


          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
          >

            {/* TEXT */}

            {!!current.content && (

              <Text
                style={[
                  styles.content,
                  {
                    color: textColor,
                  },
                ]}
              >
                {current.content}
              </Text>

            )}


            {/* IMAGES */}

            {images.map(
              (image, index) => (

                <TouchableOpacity
                  key={`image-${index}`}
                  activeOpacity={0.9}
                  onPress={() =>
                    Linking.openURL(
                      image.url
                    ).catch(() => {})
                  }
                >

                  <Image
                    source={{
                      uri: image.url,
                    }}
                    style={
                      styles.announcementImage
                    }
                    contentFit="cover"
                  />

                  <Text
                    style={
                      styles.mediaHint
                    }
                  >
                    Tap image to view full
                  </Text>

                </TouchableOpacity>

              )
            )}


            {/* VIDEOS */}

            {videos.map(
              (video, index) => (

                <VideoAnnouncement
                  key={`video-${index}`}
                  video={video}
                />

              )
            )}


            {/* AUDIO */}

            {audios.map(
              (audio, index) => (

                <AudioAnnouncement
                  key={`audio-${index}`}
                  audio={audio}
                />

              )
            )}


            {/* FILE / PDF */}

            {documents.map((document, index) => (
              <DocumentAnnouncement
                key={`document-${index}`}
                document={document}
                navigation={navigation}
              />
            ))}

          </ScrollView>


          {/* Dismiss */}

          <TouchableOpacity
            style={styles.button}
            onPress={handleDismiss}
          >

            <Text
              style={styles.buttonText}
            >
              {currentIndex <
              announcements.length - 1
                ? 'Next'
                : 'OK, I got it'}
            </Text>

          </TouchableOpacity>

        </Animated.View>

      </View>

    </Modal>
  );
}


const styles = StyleSheet.create({

  overlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  cardContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    ...Shadows.medium,
    maxHeight: '90%',
  },

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  badge: {
    backgroundColor:
      Colors.pink + '20',
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
    marginBottom: 12,
  },

  scrollArea: {
    maxHeight: 500,
    marginBottom: 18,
  },

  content: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },

  // IMAGE

  announcementImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: '#E2E8F0',
  },

  mediaHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14,
    textAlign: 'right',
  },

  // VIDEO

  videoBox: {
    width: '100%',
    marginBottom: 14,
  },

  videoPoster: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  videoImage: {
    width: '100%',
    height: '100%',
  },

  videoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
  },

  videoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0,0,0,0.25)',
  },

  videoPlayCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor:
      'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoPlayText: {
    fontSize: 24,
    color: '#FF4D8D',
    marginLeft: 4,
  },

  videoLabel: {
    color: '#FFF',
    fontWeight: '700',
    marginTop: 10,
  },

  videoPlayingBox: {
    width: '100%',
    minHeight: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  openVideoButton: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },

  openVideoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // AUDIO

  audioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },

  audioPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  audioPlayText: {
    color: '#FFF',
    fontSize: 16,
  },

  audioMiddle: {
    flex: 1,
    marginLeft: 12,
  },

  audioName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 7,
  },

  audioTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    overflow: 'hidden',
  },

  audioProgress: {
    height: '100%',
    backgroundColor:
      Colors.primary,
  },

  audioTimeRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginTop: 4,
  },

  audioTime: {
    fontSize: 10,
    color: '#64748B',
  },

  audioIcon: {
    fontSize: 18,
    marginLeft: 8,
  },

  // DOCUMENT

  documentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    marginBottom: 14,
  },

  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  documentIconText: {
    fontSize: 20,
  },

  documentInfo: {
    flex: 1,
    marginLeft: 10,
  },

  documentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },

  documentHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },

  documentArrow: {
    fontSize: 22,
    color: '#F59E0B',
  },

  // BUTTON

  button: {
    backgroundColor:
      Colors.primary,
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
