import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, ActivityIndicator, Alert, TextInput, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLibraryAccessListAPI, approveLibraryAccessAPI, revokeLibraryAccessAPI } from '../../services/api';

const ScaleBtn = ({ onPress, children, activeScale = 0.96, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: activeScale, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled} style={style}>
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
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
          }
        }
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
      <FadeSlideView index={Math.min(index, 10)}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.teacherName}>{item.name}</Text>
              <Text style={styles.teacherSub}>{item.email || item.mobile || 'No contact info'}</Text>
            </View>
          </View>
          <View style={styles.actionCol}>
            <View style={styles.segmentedControl}>
              <ScaleBtn activeScale={0.96} style={{ flex: 1 }} onPress={() => { if (!isApproved) handleToggle(item); }}>
                <View style={[styles.segmentBtn, !isApproved && styles.segmentBtnActive]}>
                  <Text style={[styles.segmentText, !isApproved && styles.segmentTextActive]}>🔒 Locked</Text>
                </View>
              </ScaleBtn>
              <ScaleBtn activeScale={0.96} style={{ flex: 1 }} onPress={() => { if (isApproved) handleToggle(item); }}>
                <View style={[styles.segmentBtn, isApproved && styles.segmentBtnActive]}>
                  <Text style={[styles.segmentText, isApproved && styles.segmentTextActive]}>🔓 Unlocked</Text>
                </View>
              </ScaleBtn>
            </View>
          </View>
        </View>
      </FadeSlideView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* HEADER */}
      <LinearGradient 
        colors={['#EC4899', '#F472B6']} 
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.premiumHeader, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <View style={styles.headerTopRow}>
          <ScaleBtn style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </ScaleBtn>
        </View>
        <Text style={styles.headerTitle}>Library Access</Text>
        <Text style={styles.headerSubtitle}>Approve teachers for material library access</Text>
      </LinearGradient>

      {/* SEARCH BOX */}
      <View style={styles.searchBoxModern}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
        <TextInput
          style={styles.searchInputModern}
          placeholder="Search teachers by name..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* LIST */}
      <View style={{ flex: 1 }}>
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredTeachers}
            keyExtractor={(item) => item._id}
            renderItem={renderTeacher}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={onRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={64} color="#FBCFE8" />
                <Text style={styles.emptyText}>{searchQuery ? 'No matching teachers found.' : 'No teachers found.'}</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  premiumHeader: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 24, paddingBottom: 24, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#FCE7F3', fontWeight: '500' },
  
  searchBoxModern: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12, backgroundColor: '#FFF', marginHorizontal: 24, marginTop: 24, marginBottom: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchInputModern: { flex: 1, fontSize: 15, color: '#1F2937' },
  
  listContent: { padding: 24, paddingBottom: 100 },
  
  card: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#EC4899' },
  infoCol: { flex: 1 },
  teacherName: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  teacherSub: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  
  actionCol: { marginTop: 4 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, height: 44 },
  segmentBtn: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#059669' },
  
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 16 },
});
