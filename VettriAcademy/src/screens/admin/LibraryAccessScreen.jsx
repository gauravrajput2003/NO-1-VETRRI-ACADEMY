import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, ActivityIndicator, Alert, TextInput, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLibraryAccessListAPI, approveLibraryAccessAPI, revokeLibraryAccessAPI } from '../../services/api';

// ─── Strict palette: teal + pink + gold + white only ───────────────────────
const P = {
  teal: '#14B8A6',
  tealDeep: '#0D9488',
  tealSoft: '#CCFBF1',
  pink: '#EC4899',
  pinkDeep: '#DB2777',
  pinkSoft: '#FCE7F3',
  gold: '#F4C752',
  goldDeep: '#D89A2B',
  white: '#FFFFFF',
  ink: '#134E4A', // dark teal used in place of generic gray/black for text
};

const ScaleBtn = ({ onPress, children, activeScale = 0.96, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: activeScale, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled} style={style}>
      <Animated.View style={[styles.fillFlex, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

const FadeSlideView = ({ children, index = 0, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }).start();
  }, [anim, index]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return <Animated.View style={[{ opacity: anim, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

export default function LibraryAccessScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTeachers = async () => {
    try {
      const { data } = await getLibraryAccessListAPI();
      if (data.success && data.libraryAccessList) {
        setTeachers(data.libraryAccessList);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to load teachers.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTeachers();
  };

  const handleToggle = (teacher) => {
    const isCurrentlyApproved = teacher.libraryAccess?.approved;
    if (isCurrentlyApproved) {
      Alert.alert('Revoke Access?', `Are you sure you want to revoke library access for ${teacher.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeLibraryAccessAPI(teacher._id);
              Toast.show({ type: 'success', text1: 'Access revoked successfully.' });
              loadTeachers();
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Failed to revoke access.' });
            }
          },
        },
      ]);
    } else {
      approveAccess(teacher._id);
    }
  };

  const approveAccess = async (teacherId) => {
    try {
      await approveLibraryAccessAPI(teacherId);
      Toast.show({ type: 'success', text1: 'Access approved successfully.' });
      loadTeachers();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to approve access.' });
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTeacher = ({ item, index }) => {
    const isApproved = item.libraryAccess?.approved;
    return (
      <FadeSlideView index={Math.min(index, 10)} style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.teacherName}>{item.name}</Text>
              <Text style={styles.teacherSub}>{item.email || item.mobile || 'No contact info'}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isApproved ? P.teal : P.pink }]} />
          </View>

          {/* Locked / Unlocked toggle — every state has a colored fill so it
              never blends into the white card background. */}
          <View style={styles.segmentedControl}>
            <ScaleBtn
              activeScale={0.96}
              style={styles.segmentWrap}
              onPress={() => {
                if (isApproved) handleToggle(item);
              }}
            >
              {!isApproved ? (
                <LinearGradient
                  colors={[P.pink, P.pinkDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segmentBtn}
                >
                  <Ionicons name="lock-closed" size={16} color={P.white} style={{ marginRight: 6 }} />
                  <Text style={styles.segmentTextActive}>Locked</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.segmentBtn, styles.segmentBtnInactivePink]}>
                  <Ionicons name="lock-closed-outline" size={16} color={P.pinkDeep} style={{ marginRight: 6 }} />
                  <Text style={[styles.segmentText, { color: P.pinkDeep }]}>Locked</Text>
                </View>
              )}
            </ScaleBtn>

            <ScaleBtn
              activeScale={0.96}
              style={styles.segmentWrap}
              onPress={() => {
                if (!isApproved) handleToggle(item);
              }}
            >
              {isApproved ? (
                <LinearGradient
                  colors={[P.teal, P.tealDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segmentBtn}
                >
                  <Ionicons name="lock-open" size={16} color={P.white} style={{ marginRight: 6 }} />
                  <Text style={styles.segmentTextActive}>Unlocked</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.segmentBtn, styles.segmentBtnInactiveTeal]}>
                  <Ionicons name="lock-open-outline" size={16} color={P.tealDeep} style={{ marginRight: 6 }} />
                  <Text style={[styles.segmentText, { color: P.tealDeep }]}>Unlocked</Text>
                </View>
              )}
            </ScaleBtn>
          </View>
        </View>
      </FadeSlideView>
    );
  };

  const ListHeader = () => (
    <>
      <LinearGradient
        colors={[P.pink, P.pinkDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.premiumHeader, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <View style={styles.headerTopRow}>
          <ScaleBtn style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <View style={styles.backBtnInner}>
              <Ionicons name="arrow-back" size={24} color={P.white} />
            </View>
          </ScaleBtn>
        </View>
        <Text style={styles.headerTitle}>Library Access</Text>
        <Text style={styles.headerSubtitle}>Approve teachers for material library access</Text>
      </LinearGradient>

      <View style={styles.searchBoxModern}>
        <Ionicons name="search" size={20} color={P.tealDeep} style={{ marginRight: 12 }} />
        <TextInput
          style={styles.searchInputModern}
          placeholder="Search teachers by name..."
          placeholderTextColor={P.tealDeep + '99'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {loading && !refreshing ? (
        <>
          <ListHeader />
          <ActivityIndicator size="large" color={P.pink} style={{ marginTop: 40 }} />
        </>
      ) : (
        <FlatList
          data={filteredTeachers}
          keyExtractor={(item) => item._id}
          renderItem={renderTeacher}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color={P.pinkSoft} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching teachers found.' : 'No teachers found.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.white },

  // Helper: makes the inner Animated.View of ScaleBtn always fill whatever
  // container it's placed in (fixes the "invisible button" layout bug where
  // flex/width on the outer TouchableOpacity wasn't reaching its children).
  fillFlex: { flex: 1, width: '100%' },

  // Centers just the back arrow inside the circular back button, without
  // affecting the shared ScaleBtn used by the Locked/Unlocked segment control.
  backBtnInner: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },

  premiumHeader: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: P.pinkDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '800', color: P.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: P.pinkSoft, fontWeight: '500' },

  searchBoxModern: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: P.white,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: P.tealSoft,
    shadowColor: P.tealDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInputModern: { flex: 1, fontSize: 15, color: P.ink, fontWeight: '500' },

  // Whole page now scrolls as one FlatList (header + search + cards),
  // so horizontal padding lives here instead of on individual sections.
  listContent: { paddingBottom: 100 },

  cardWrap: { paddingHorizontal: 24 },

  card: {
    backgroundColor: P.white,
    borderRadius: 20,
    marginTop: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: P.tealSoft,
    shadowColor: P.tealDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.pinkSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800', color: P.pinkDeep },
  infoCol: { flex: 1 },
  teacherName: { fontSize: 16, fontWeight: '700', color: P.ink, marginBottom: 2 },
  teacherSub: { fontSize: 13, color: P.tealDeep, fontWeight: '500' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },

  // Locked / Unlocked control — fixed: every state (active AND inactive)
  // now has a solid colored fill, so nothing disappears against the white card.
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: P.white,
    borderRadius: 14,
    padding: 4,
    height: 48,
    borderWidth: 1.5,
    borderColor: P.tealSoft,
    gap: 6,
  },
  segmentWrap: { flex: 1 },
  segmentBtn: {
    flex: 1,
    height: '100%',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inactive "Locked" side — tinted pink instead of plain white-on-white.
  segmentBtnInactivePink: {
    backgroundColor: P.pinkSoft,
    borderWidth: 1,
    borderColor: P.pink + '55',
  },
  // Inactive "Unlocked" side — tinted teal instead of plain white-on-white.
  segmentBtnInactiveTeal: {
    backgroundColor: P.tealSoft,
    borderWidth: 1,
    borderColor: P.teal + '55',
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  segmentTextActive: { fontSize: 13, fontWeight: '800', color: P.white },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 16, fontWeight: '600', color: P.tealDeep, marginTop: 16 },
});