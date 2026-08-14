import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';

import { Image } from 'expo-image';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { formatDate } from '../../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import { normalizeMaterialFileUrl } from '../../utils/fileUtils';


// ─────────────────────────────────────────────
// Format media time
// ─────────────────────────────────────────────

function formatMediaTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;

  return `${m}:${String(r).padStart(2, '0')}`;
}


// ─────────────────────────────────────────────
// Audio Row
// ─────────────────────────────────────────────

function AudioRow({ audio }) {
  const player = useAudioPlayer(audio.url);
  const status = useAudioPlayerStatus(player);

  const playing = Boolean(status?.playing);
  const current = status?.currentTime || 0;
  const duration =
    status?.duration || audio.duration || 0;

  const progress =
    duration > 0
      ? Math.min(1, current / duration)
      : 0;

  const togglePlay = () => {
    try {
      if (playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (err) {
      console.log(
        'Audio play error:',
        err
      );
    }
  };

  const seekTo = async (ratio) => {
    try {
      if (!duration) return;

      await player.seekTo(
        ratio * duration
      );
    } catch (err) {
      console.log(
        'Audio seek error:',
        err
      );
    }
  };

  return (
    <View style={st.annAudioRow}>

      <TouchableOpacity
        style={st.annAudioBtn}
        onPress={togglePlay}
        activeOpacity={0.8}
      >
        <Ionicons
          name={playing ? 'pause' : 'play'}
          size={18}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <View style={st.audioContent}>

        <Text
          style={st.annAudioName}
          numberOfLines={1}
        >
          {audio.originalFilename ||
            'Voice Message'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={st.annSeekTrack}
          onPress={(e) => {
            const x =
              e.nativeEvent.locationX;

            const ratio =
              Math.min(
                1,
                Math.max(0, x / 200)
              );

            seekTo(ratio);
          }}
        >
          <View
            style={[
              st.annSeekFill,
              {
                width: `${progress * 100}%`,
              },
            ]}
          />
        </TouchableOpacity>

        <View style={st.annTimeRow}>

          <Text style={st.annTimeText}>
            {formatMediaTime(current)}
          </Text>

          <Text style={st.annTimeText}>
            {formatMediaTime(duration)}
          </Text>

        </View>

      </View>

      <Ionicons
        name="mic"
        size={16}
        color={Colors.primary}
      />

    </View>
  );
}


// ─────────────────────────────────────────────
// Announcement Card
// ─────────────────────────────────────────────

export default function AnnouncementCard({
  ann,
  onDelete,
  showTargetBadge,
  showPinBadge,
}) {
  const navigation =
    useNavigation();

  const media =
    Array.isArray(ann?.media)
      ? ann.media
      : [];

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


  // ─────────────────────────────────────────
  // Open PDF
  // ─────────────────────────────────────────

  const openDocument = (document) => {
    if (!document?.url) {
      console.warn(
        '[Announcement PDF] Missing URL:',
        document
      );
      return;
    }

    const normalizedUrl =
      normalizeMaterialFileUrl(
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

    console.log(
      '[Announcement PDF] Opening:',
      {
        originalUrl:
          document.url,

        normalizedUrl,

        mimeType:
          document.mimeType,

        resourceType:
          document.resourceType ||
          document.resource_type,

        publicId:
          document.publicId ||
          document.public_id,
      }
    );

    navigation.navigate(
      'PdfViewer',
      {
        title:
          document.originalFilename ||
          'PDF Document',

        pdfUrl:
          normalizedUrl,

        materialId:
          document._id ||
          null,

        totalPages:
          document.totalPages ||
          0,
      }
    );
  };


  // ─────────────────────────────────────────
  // Open video
  // ─────────────────────────────────────────

  const openVideo = (video) => {
    if (!video?.url) {
      return;
    }

    Linking.openURL(
      video.url
    ).catch((error) => {
      console.log(
        '[Announcement Video] Error:',
        error
      );
    });
  };


  // ─────────────────────────────────────────
  // Open image
  // ─────────────────────────────────────────

  const openImage = (image) => {
    if (!image?.url) {
      return;
    }

    Linking.openURL(
      image.url
    ).catch(() => {});
  };


  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <LinearGradient
      colors={[
        '#FFFFFF',
        '#F8FAFC',
      ]}
      style={st.annCard}
    >

      {/* Header */}

      <View style={st.annCardTop}>

        <View style={st.annIconWrap}>
          <Ionicons
            name="megaphone"
            size={22}
            color={Colors.primary}
          />
        </View>

        <View style={st.titleContainer}>

          {showPinBadge &&
            ann.isPinned && (
              <Text
                style={st.pinBadge}
              >
                📌 PINNED
              </Text>
            )}

          <Text
            style={st.annTitle}
            numberOfLines={2}
          >
            {ann.title}
          </Text>

        </View>

        {onDelete && (
          <TouchableOpacity
            style={st.deleteBtn}
            onPress={() =>
              onDelete(ann)
            }
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#EF4444"
            />
          </TouchableOpacity>
        )}

      </View>


      {/* Announcement text */}

      {!!ann.content && (
        <Text style={st.annBody}>
          {ann.content}
        </Text>
      )}


      {/* Images */}

      {images.length > 0 && (
        <View>

          {images.map(
            (image, index) => (
              <TouchableOpacity
                key={`image-${index}`}
                activeOpacity={0.9}
                onPress={() =>
                  openImage(image)
                }
              >

                <Image
                  source={{
                    uri: image.url,
                  }}
                  style={
                    st.annMediaImg
                  }
                  contentFit="cover"
                />

                <View
                  style={
                    st.tapToOpenBadge
                  }
                >
                  <Ionicons
                    name="expand-outline"
                    size={14}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      st.tapToOpenText
                    }
                  >
                    Tap to view
                  </Text>
                </View>

                {index === 0 &&
                  images.length > 1 && (
                    <Text
                      style={
                        st.annMoreImages
                      }
                    >
                      +
                      {images.length - 1}{' '}
                      more
                    </Text>
                  )}

              </TouchableOpacity>
            )
          )}

        </View>
      )}


      {/* Videos */}

      {videos.map(
        (video, index) => (
          <TouchableOpacity
            key={`video-${index}`}
            style={
              st.annVideoWrap
            }
            activeOpacity={0.9}
            onPress={() =>
              openVideo(video)
            }
          >

            <View
              style={
                st.annVideoPoster
              }
            >

              {video.thumbnail ? (
                <Image
                  source={{
                    uri:
                      video.thumbnail,
                  }}
                  style={
                    st.videoThumbnail
                  }
                  contentFit="cover"
                />
              ) : (
                <View
                  style={
                    st.videoFallback
                  }
                />
              )}

              <View
                style={
                  st.annVideoPlay
                }
              >
                <Ionicons
                  name="play"
                  size={26}
                  color="#FFFFFF"
                />
              </View>

              <Text
                style={
                  st.annVideoLabel
                }
              >
                VIDEO
              </Text>

              {video.duration && (
                <View
                  style={
                    st.annVideoDur
                  }
                >
                  <Text
                    style={
                      st.annVideoDurText
                    }
                  >
                    {formatMediaTime(
                      video.duration
                    )}
                  </Text>
                </View>
              )}

            </View>

          </TouchableOpacity>
        )
      )}


      {/* Audio */}

      {audios.map(
        (audio, index) => (
          <AudioRow
            key={`audio-${index}`}
            audio={audio}
          />
        )
      )}


      {/* PDF / Documents */}

      {documents.map(
        (document, index) => (
          <TouchableOpacity
            key={`document-${index}`}
            style={
              st.documentRow
            }
            onPress={() =>
              openDocument(
                document
              )
            }
            activeOpacity={0.8}
          >

            <View
              style={
                st.documentIconWrap
              }
            >
              <Ionicons
                name="document-text"
                size={20}
                color="#F59E0B"
              />
            </View>

            <View
              style={
                st.documentInfo
              }
            >

              <Text
                style={
                  st.documentName
                }
                numberOfLines={1}
              >
                {document.originalFilename ||
                  'File Attachment'}
              </Text>

              <Text
                style={
                  st.documentSub
                }
              >
                Tap to preview PDF
              </Text>

            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#F59E0B"
            />

          </TouchableOpacity>
        )
      )}


      {/* Footer */}

      {(showTargetBadge ||
        ann.createdAt) && (

        <View
          style={st.cardMeta}
        >

          <Text
            style={st.metaText}
          >
            {formatDate(
              ann.createdAt
            )}
          </Text>

          {showTargetBadge && (
            <View
              style={
                st.targetBadge
              }
            >
              <Text
                style={
                  st.targetText
                }
              >
                @{ann.targetRole ||
                  'all'}
              </Text>
            </View>
          )}

        </View>
      )}

    </LinearGradient>
  );
}


// ─────────────────────────────────────────────
// IMPORTANT:
// Styles are OUTSIDE AudioRow and AnnouncementCard.
// Both components can access `st`.
// ─────────────────────────────────────────────

const st = StyleSheet.create({

  annCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  annCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  annIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,

    backgroundColor:
      Colors.primary + '15',

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 12,
  },

  titleContainer: {
    flex: 1,
  },

  annTitle: {
    fontSize: 17,
    fontWeight: '800',

    color:
      Colors.text?.light ||
      '#1E293B',

    marginBottom: 4,
  },

  annBody: {
    fontSize: 14,

    color:
      Colors.textSecondary?.light ||
      '#64748B',

    lineHeight: 20,

    marginBottom: 4,
  },

  pinBadge: {
    fontSize: 11,
    color: '#F59E0B',
    marginBottom: 2,
    fontWeight: '700',
  },

  deleteBtn: {
    padding: 4,
  },


  // Images

  annMediaImg: {
    width: '100%',
    height: 180,

    borderRadius: 14,

    backgroundColor:
      '#E2E8F0',

    marginTop: 8,
  },

  tapToOpenBadge: {
    position: 'absolute',

    bottom: 12,
    right: 12,

    backgroundColor:
      'rgba(0,0,0,0.6)',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 12,

    gap: 4,
  },

  tapToOpenText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  annMoreImages: {
    position: 'absolute',

    bottom: 12,
    left: 12,

    backgroundColor:
      'rgba(0,0,0,0.6)',

    color: '#FFFFFF',

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 8,

    fontSize: 11,
    fontWeight: '700',
  },


  // Video

  annVideoWrap: {
    width: '100%',
    height: 200,

    borderRadius: 14,

    overflow: 'hidden',

    marginTop: 12,

    backgroundColor: '#000000',
  },

  annVideoPoster: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',
  },

  videoThumbnail: {
    width: '100%',
    height: '100%',
  },

  videoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
  },

  annVideoPlay: {
    width: 56,
    height: 56,

    borderRadius: 28,

    backgroundColor:
      'rgba(0,0,0,0.5)',

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 2,
    borderColor: '#FFFFFF',

    position: 'absolute',
  },

  annVideoDur: {
    position: 'absolute',

    bottom: 12,
    right: 12,

    backgroundColor:
      'rgba(0,0,0,0.7)',

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 8,
  },

  annVideoDurText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  annVideoLabel: {
    position: 'absolute',

    top: 12,
    left: 12,

    backgroundColor: '#8B5CF6',

    color: '#FFFFFF',

    paddingHorizontal: 10,
    paddingVertical: 4,

    borderRadius: 8,

    fontSize: 11,
    fontWeight: '700',
  },


  // Audio

  annAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#F8FAFC',

    borderRadius: 16,

    padding: 12,

    marginTop: 12,

    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  annAudioBtn: {
    width: 40,
    height: 40,

    borderRadius: 20,

    backgroundColor:
      Colors.primary,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 12,

    shadowColor:
      Colors.primary,

    shadowOpacity: 0.3,
    shadowRadius: 6,

    elevation: 3,
  },

  audioContent: {
    flex: 1,
  },

  annAudioName: {
    fontSize: 14,
    fontWeight: '700',

    color:
      Colors.text?.light ||
      '#1E293B',

    marginBottom: 6,
  },

  annSeekTrack: {
    height: 6,

    backgroundColor:
      '#E2E8F0',

    borderRadius: 3,

    width: '100%',

    overflow: 'hidden',
  },

  annSeekFill: {
    height: '100%',

    backgroundColor:
      Colors.primary,

    borderRadius: 3,
  },

  annTimeRow: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    marginTop: 6,
  },

  annTimeText: {
    fontSize: 11,

    color:
      Colors.textSecondary?.light ||
      '#64748B',

    fontWeight: '600',
  },


  // Documents / PDF

  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#FFFBEB',

    borderRadius: 14,

    padding: 12,

    marginTop: 12,

    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  documentIconWrap: {
    width: 36,
    height: 36,

    borderRadius: 8,

    backgroundColor: '#FEF3C7',

    justifyContent: 'center',
    alignItems: 'center',
  },

  documentInfo: {
    flex: 1,
    marginLeft: 10,
  },

  documentName: {
    fontSize: 14,
    fontWeight: '700',

    color: '#92400E',

    marginBottom: 2,
  },

  documentSub: {
    fontSize: 11,
    color: '#B45309',
  },


  // Footer

  cardMeta: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',

    marginTop: 14,

    paddingTop: 14,

    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  metaText: {
    fontSize: 12,

    color:
      Colors.textSecondary?.light ||
      '#64748B',

    fontWeight: '500',
  },

  targetBadge: {
    backgroundColor:
      Colors.info + '18',

    paddingHorizontal: 10,
    paddingVertical: 4,

    borderRadius: 8,
  },

  targetText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.info,
  },

});