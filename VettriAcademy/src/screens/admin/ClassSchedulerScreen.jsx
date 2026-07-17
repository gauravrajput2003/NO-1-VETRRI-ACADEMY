import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity,
  TextInput, StyleSheet, Modal, ScrollView, Platform, Animated,
  StatusBar, KeyboardAvoidingView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { formatDate, formatScheduledTime } from '../../utils/formatters';
import { fetchSchedules } from '../../redux/slices/classesSlice';
import { fetchAdminTeachers, fetchAdminStudents } from '../../redux/slices/adminSlice';
import { createScheduleAPI, cancelScheduleAPI, getTeacherStudentsAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

// ─── ANIMATION HELPERS ───
const FadeSlideView = ({ children, index = 0, delay = 0, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 400,
      delay: delay + index * 80, useNativeDriver: true
    }).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }]
    }]}>
      {children}
    </Animated.View>
  );
};

const PulseView = ({ children }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ transform: [{ scale: anim }] }}>{children}</Animated.View>;
};

const ScaleBtn = ({ onPress, style, children, activeScale = 0.95, disabled, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <RNTouchableOpacity
      activeOpacity={1}
      onPressIn={() => Animated.spring(scale, { toValue: activeScale, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </RNTouchableOpacity>
  );
};

// ─── SECTION CONFIG ───
const SECTIONS = [
  {
    key: 'class',
    label: 'Class Details',
    icon: 'grid-outline',
    accent: '#FF4F8B',
    bgFrom: '#FFF0F6',
    bgTo: '#FFF7FB',
    accentLight: '#FFD6EA',
  },
  {
    key: 'participants',
    label: 'Participants',
    icon: 'people-outline',
    accent: '#11C5C6',
    bgFrom: '#F0FFFE',
    bgTo: '#F7FFFF',
    accentLight: '#C8F7F7',
  },
  {
    key: 'schedule',
    label: 'Schedule',
    icon: 'calendar-outline',
    accent: '#FFB547',
    bgFrom: '#FFFBF0',
    bgTo: '#FFFDF7',
    accentLight: '#FFE8B0',
  },
  {
    key: 'meeting',
    label: 'Meeting Details',
    icon: 'videocam-outline',
    accent: '#7C6FD4',
    bgFrom: '#F5F3FF',
    bgTo: '#FAFAFF',
    accentLight: '#DDD8F8',
  },
];

// ─── FORM FIELD CARD ───
const FieldCard = ({ icon, iconColor, placeholder, value, onChangeText, onFocus, onBlur, focused, keyboardType, multiline, height }) => (
  <View style={[
    fieldStyles.wrap,
    { height: height || 56 },
    focused && { borderColor: iconColor, shadowColor: iconColor, shadowOpacity: 0.2, elevation: 6 }
  ]}>
    <Ionicons name={icon} size={20} color={focused ? iconColor : '#B0B8CC'} style={fieldStyles.icon} />
    <TextInput
      style={[fieldStyles.input, { color: '#1E293B', height: height || 56 }]}
      placeholder={placeholder}
      placeholderTextColor="#B0B8CC"
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onBlur={onBlur}
      keyboardType={keyboardType}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

const SelectorCard = ({ icon, iconColor, placeholder, value, onPress }) => (
  <RNTouchableOpacity style={fieldStyles.wrap} onPress={onPress} activeOpacity={0.75}>
    <Ionicons name={icon} size={20} color={value ? iconColor : '#B0B8CC'} style={fieldStyles.icon} />
    <Text style={[fieldStyles.input, { color: value ? '#1E293B' : '#B0B8CC', paddingTop: 0 }]} numberOfLines={1}>
      {value || placeholder}
    </Text>
    <Ionicons name="chevron-down" size={18} color="#B0B8CC" />
  </RNTouchableOpacity>
);

const fieldStyles = StyleSheet.create({
  wrap: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#EEF2FF',
    shadowColor: '#8B9ECC',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: { marginRight: 14 },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },
});

// ─── SECTION BLOCK ───
const SectionBlock = ({ section, children }) => (
  <FadeSlideView delay={50}>
    <LinearGradient
      colors={[section.bgFrom, section.bgTo]}
      style={sectionStyles.block}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[sectionStyles.stripe, { backgroundColor: section.accent }]} />
      <View style={sectionStyles.header}>
        <View style={[sectionStyles.iconBadge, { backgroundColor: section.accentLight }]}>
          <Ionicons name={section.icon} size={16} color={section.accent} />
        </View>
        <Text style={[sectionStyles.label, { color: section.accent }]}>{section.label}</Text>
        <View style={[sectionStyles.divider, { backgroundColor: section.accentLight }]} />
      </View>
      <View style={sectionStyles.fields}>{children}</View>
    </LinearGradient>
  </FadeSlideView>
);

const sectionStyles = StyleSheet.create({
  block: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  stripe: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 5,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  iconBadge: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2, marginBottom: -2 },
  divider: { flex: 1, height: 2, borderRadius: 2, marginLeft: 4 },
  fields: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
});

// ─── STATUS COLORS ───
const statusColors = { scheduled: '#3B82F6', live: '#EC4899', completed: '#14B8A6', cancelled: '#EF4444' };
const getStatusIcon = (s) => ({ live: 'videocam', scheduled: 'calendar', completed: 'trophy', cancelled: 'close-circle' }[s] || 'calendar');
const isValidOptionalUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function ClassSchedulerScreen({ navigation }) {
  const dispatch = useDispatch();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { schedules, loading } = useSelector((s) => s.classes);
  const { teachers, students } = useSelector((s) => s.admin);
  const { user } = useSelector((s) => s.auth);
  const insets = useSafeAreaInsets();

  const isTeacher = user?.role === 'teacher';
  const loggedInTeacherId = user?._id || user?.id || '';

  const [showForm, setShowForm] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [tempTimeDate, setTempTimeDate] = useState(new Date());

  const [form, setForm] = useState({
    title: '', subject: '', course: '', grade: '',
    teacherId: '', scheduledDate: '', scheduledTime: '',
    durationMinutes: '60', googleMeetLink: '', zoomMeetingLink: '',
  });

  const courseOptions = ['CBSE', 'Matriculation', 'Engineering', 'Arts College', 'TET & TRB', 'Competition Exam', 'Computer Course', 'Spoken English/Hindi', 'Others'];
  const gradeOptions = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'UG', 'PG', 'All', 'Others'];

  const dateOptions = Array.from({ length: 60 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return {
      value: `${yyyy}-${mm}-${dd}`,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    };
  });

  const studentPool = isTeacher ? teacherStudents : students;
  const filteredStudents = studentPool.filter((s) => {
    if (s.isActive === false) return false;
    if (form.grade && form.grade !== 'All' && s.grade !== form.grade) return false;
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (s.displayName || s.name || '').toLowerCase().includes(q) || (s.mobile || '').toLowerCase().includes(q);
  });
  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudents.some((sel) => sel._id === s._id));

  const formatTimeForPayload = (d) =>
    `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '00')}`;
  const formatDisplayTime = (d) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const getTimeDateFromValue = (v) => {
    if (!v || !v.includes(':')) return new Date();
    const [h, m] = v.split(':').map(Number);
    const d = new Date(); d.setHours(h || 9, m || 0, 0, 0); return d;
  };

  useEffect(() => { if (navigation) navigation.setOptions({ headerShown: false }); }, [navigation]);

  useEffect(() => {
    dispatch(fetchSchedules({}));
    if (!isTeacher) {
      dispatch(fetchAdminTeachers());
      dispatch(fetchAdminStudents({ page: 1, limit: 500 }));
    }
  }, [dispatch, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;
    (async () => {
      try { const { data } = await getTeacherStudentsAPI(); setTeacherStudents(data.students || []); }
      catch { setTeacherStudents([]); }
    })();
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher || !loggedInTeacherId) return;
    setForm((p) => ({ ...p, teacherId: loggedInTeacherId }));
    setSelectedTeacher({ _id: loggedInTeacherId, name: user?.displayName || user?.name || 'You', mobile: user?.mobile || '' });
  }, [isTeacher, loggedInTeacherId]);

  const resetForm = () => {
    setForm({
      title: '', subject: '', course: '', grade: '',
      teacherId: isTeacher ? loggedInTeacherId : '',
      scheduledDate: '', scheduledTime: '', durationMinutes: '60',
      googleMeetLink: '', zoomMeetingLink: '',
    });
    setSelectedStudents([]);
    setSelectedTeacher(isTeacher ? {
      _id: loggedInTeacherId,
      name: user?.displayName || user?.name || 'You',
      mobile: user?.mobile || ''
    } : null);
  };

  const handleCreate = async () => {
    const tid = form.teacherId || (isTeacher ? loggedInTeacherId : '');
    if (!form.title || !tid || !selectedStudents.length || !form.course || !form.subject || !form.grade || !form.scheduledDate || !form.scheduledTime) {
      Toast.show({ type: 'error', text1: 'Fill all required fields' }); return;
    }
    if (!isValidOptionalUrl(form.googleMeetLink) || !isValidOptionalUrl(form.zoomMeetingLink)) {
      Toast.show({ type: 'error', text1: 'Invalid meeting link', text2: 'Please enter a valid URL.' }); return;
    }
    try {
      await createScheduleAPI({
        ...form,
        googleMeetLink: form.googleMeetLink.trim(),
        zoomMeetingLink: form.zoomMeetingLink.trim(),
        teacherId: tid,
        studentIds: selectedStudents.map((s) => s._id),
        durationMinutes: parseInt(form.durationMinutes, 10) || 60
      });
      Toast.show({ type: 'success', text1: 'Class Scheduled 🎉' });
      resetForm(); setShowForm(false);
      dispatch(fetchSchedules({}));
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed', text2: e.response?.data?.message || 'Error' });
    }
  };

  const toggleStudent = (s) =>
    setSelectedStudents((p) =>
      p.some((x) => x._id === s._id) ? p.filter((x) => x._id !== s._id) : [...p, s]
    );

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const ids = new Set(filteredStudents.map((s) => s._id));
      setSelectedStudents((p) => p.filter((s) => !ids.has(s._id)));
    } else {
      setSelectedStudents((p) => {
        const map = new Map(p.map((s) => [s._id, s]));
        filteredStudents.forEach((s) => map.set(s._id, s));
        return Array.from(map.values());
      });
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelScheduleAPI(id);
      Toast.show({ type: 'success', text1: 'Class Cancelled' });
      dispatch(fetchSchedules({}));
    } catch {}
  };

  // Shared picker/form props
  const formProps = {
    form, setForm, focusedField, setFocusedField,
    selectedTeacher, setSelectedTeacher, selectedStudents, setSelectedStudents,
    isTeacher, insets,
    onClose: () => { resetForm(); setShowForm(false); },
    onSubmit: handleCreate,
    onOpenCourse: () => setShowCoursePicker(true),
    onOpenGrade: () => setShowGradePicker(true),
    onOpenTeacher: () => setShowTeacherPicker(true),
    onOpenStudents: () => setShowStudentPicker(true),
    onOpenDate: () => setShowDatePicker(true),
    onOpenTime: () => { setTempTimeDate(getTimeDateFromValue(form.scheduledTime)); setShowTimePicker(true); },
    showCoursePicker, setShowCoursePicker,
    showGradePicker, setShowGradePicker,
    showTeacherPicker, setShowTeacherPicker,
    showStudentPicker, setShowStudentPicker,
    showDatePicker, setShowDatePicker,
    showTimePicker, setShowTimePicker,
    courseOptions, gradeOptions, teachers,
    filteredStudents, studentPool, allFilteredSelected,
    toggleStudent, toggleSelectAllFiltered,
    studentSearchQuery, setStudentSearchQuery,
    dateOptions, tempTimeDate, setTempTimeDate,
    formatTimeForPayload, formatDisplayTime,
    onTabBarScroll,
  };

  if (showForm) {
    return <ScheduleForm {...formProps} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFF7FB', '#F8F7FC', '#F5FCFF']} style={StyleSheet.absoluteFillObject} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HERO */}
      <View style={[styles.headerWrap, { paddingTop: Math.max(insets.top, 16) }]}>
        <LinearGradient colors={['#C2185B', '#FF5D9E']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />
        <View style={styles.headerTopBar}>
          <ScaleBtn style={styles.glassBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </ScaleBtn>
        </View>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Class Scheduler</Text>
            <Text style={styles.headerSub}>Manage and organize your classes</Text>
          </View>
          <Ionicons name="calendar" size={70} color="rgba(255,255,255,0.22)" />
        </View>
        <RNTouchableOpacity style={styles.scheduleBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
          <View style={styles.scheduleBtnIcon}>
            <Ionicons name="add" size={20} color="#FF5D9E" />
          </View>
          <Text style={styles.scheduleBtnText}>Schedule New Class</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 'auto' }} />
        </RNTouchableOpacity>
      </View>

      <FlatList
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        data={schedules}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => dispatch(fetchSchedules({}))}
        renderItem={({ item, index }) => {
          const sColor = statusColors[item.status] || '#94A3B8';
          const isLive = item.status === 'live';
          return (
            <FadeSlideView index={index}>
              <View style={[listStyles.card, { borderLeftColor: sColor }]}>
                <View style={listStyles.cardTop}>
                  <View style={[listStyles.badge, { backgroundColor: sColor + '20' }]}>
                    {isLive
                      ? <PulseView><View style={[listStyles.dot, { backgroundColor: sColor }]} /></PulseView>
                      : <View style={[listStyles.dot, { backgroundColor: sColor }]} />
                    }
                    <Text style={[listStyles.badgeText, { color: sColor }]}>{item.status?.toUpperCase()}</Text>
                  </View>
                  <Ionicons name={getStatusIcon(item.status)} size={32} color={sColor} style={{ opacity: 0.25 }} />
                </View>
                <Text style={listStyles.title} numberOfLines={1}>{item.title || item.subject}</Text>
                <View style={listStyles.pills}>
                  <View style={[listStyles.pill, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="time" size={13} color="#0284C7" />
                    <Text style={[listStyles.pillText, { color: '#0284C7' }]}>{formatScheduledTime(item.scheduledTime)}</Text>
                  </View>
                  <View style={[listStyles.pill, { backgroundColor: '#CCFBF1' }]}>
                    <Ionicons name="people" size={13} color="#0F766E" />
                    <Text style={[listStyles.pillText, { color: '#0F766E' }]}>{item.studentIds?.length || 0} Students</Text>
                  </View>
                  <View style={[listStyles.pill, { backgroundColor: '#FFEDD5' }]}>
                    <Ionicons name="calendar" size={13} color="#C2410C" />
                    <Text style={[listStyles.pillText, { color: '#C2410C' }]}>{formatDate(item.scheduledDate)}</Text>
                  </View>
                  {item.status === 'scheduled' && (
                    <RNTouchableOpacity
                      onPress={() => handleCancel(item._id)}
                      style={[listStyles.pill, { backgroundColor: '#FEE2E2', marginLeft: 'auto' }]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </RNTouchableOpacity>
                  )}
                </View>
              </View>
            </FadeSlideView>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={{ color: '#94A3B8', fontSize: 15 }}>No scheduled classes</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── SCHEDULE FORM (Full-Screen Page) ───
function ScheduleForm({
  form, setForm, focusedField, setFocusedField,
  selectedTeacher, setSelectedTeacher, selectedStudents, setSelectedStudents,
  isTeacher, insets, onClose, onSubmit,
  onOpenCourse, onOpenGrade, onOpenTeacher, onOpenStudents, onOpenDate, onOpenTime,
  showCoursePicker, setShowCoursePicker,
  showGradePicker, setShowGradePicker,
  showTeacherPicker, setShowTeacherPicker,
  showStudentPicker, setShowStudentPicker,
  showDatePicker, setShowDatePicker,
  showTimePicker, setShowTimePicker,
  courseOptions, gradeOptions, teachers,
  filteredStudents, studentPool, allFilteredSelected,
  toggleStudent, toggleSelectAllFiltered,
  studentSearchQuery, setStudentSearchQuery,
  dateOptions, tempTimeDate, setTempTimeDate,
  formatTimeForPayload, formatDisplayTime,
  onTabBarScroll,
}) {
  const S = SECTIONS;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F7FC' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── HERO HEADER ── */}
      <View style={[formStyles.heroWrap, { paddingTop: Math.max(insets.top, 20) }]}>
        <LinearGradient
          colors={['#FF4F8B', '#FF79AD', '#A8EDEA']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={formStyles.deco1} />
        <View style={formStyles.deco2} />
        <View style={formStyles.deco3} />

        <RNTouchableOpacity style={formStyles.backBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#FF4F8B" />
        </RNTouchableOpacity>

        <View style={formStyles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={formStyles.heroLabel}>Schedule</Text>
            <Text style={formStyles.heroTitle}>New Class</Text>
            <Text style={formStyles.heroSub}>Create and organize your{'\n'}classroom session.</Text>
          </View>
          {/* Illustration card — replace with <Image> if you have the asset */}
          <View style={formStyles.illustrationWrap}>
            <View style={formStyles.illustBg}>
              <Ionicons name="calendar" size={44} color="#FF4F8B" style={{ opacity: 0.9 }} />
            </View>
            <View style={formStyles.illustStar1}>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
            <View style={formStyles.illustStar2}>
              <Ionicons name="star" size={8} color="#FFD700" />
            </View>
          </View>
        </View>
      </View>

      {/* ── SCROLLABLE FORM BODY ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 120, 140) }}
        >
          {/* CLASS DETAILS */}
          <SectionBlock section={S[0]}>
            <FieldCard
              icon="text-outline" iconColor={S[0].accent} placeholder="Title *"
              value={form.title} onChangeText={(v) => setForm({ ...form, title: v })}
              focused={focusedField === 'title'}
              onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)}
            />
            <FieldCard
              icon="book-outline" iconColor={S[0].accent} placeholder="Subject *"
              value={form.subject} onChangeText={(v) => setForm({ ...form, subject: v })}
              focused={focusedField === 'subject'}
              onFocus={() => setFocusedField('subject')} onBlur={() => setFocusedField(null)}
            />
            <SelectorCard icon="school-outline" iconColor={S[0].accent} placeholder="Course *" value={form.course} onPress={onOpenCourse} />
            <SelectorCard icon="stats-chart-outline" iconColor={S[0].accent} placeholder="Grade *" value={form.grade} onPress={onOpenGrade} />
          </SectionBlock>

          {/* PARTICIPANTS */}
          <SectionBlock section={S[1]}>
            {isTeacher ? (
              <View style={[fieldStyles.wrap, { backgroundColor: '#F0FFFE' }]}>
                <Ionicons name="person-circle-outline" size={20} color={S[1].accent} style={fieldStyles.icon} />
                <Text style={[fieldStyles.input, { color: '#1E293B' }]}>{selectedTeacher?.name || 'You'}</Text>
              </View>
            ) : (
              <SelectorCard icon="person-outline" iconColor={S[1].accent} placeholder="Teacher *" value={selectedTeacher?.name} onPress={onOpenTeacher} />
            )}
            <SelectorCard
              icon="people-outline" iconColor={S[1].accent}
              placeholder="Students *"
              value={selectedStudents.length ? `${selectedStudents.length} student(s) selected` : ''}
              onPress={onOpenStudents}
            />
          </SectionBlock>

          {/* SCHEDULE */}
          <SectionBlock section={S[2]}>
            <SelectorCard icon="calendar-outline" iconColor={S[2].accent} placeholder="Date *" value={form.scheduledDate} onPress={onOpenDate} />
            <SelectorCard icon="time-outline" iconColor={S[2].accent} placeholder="Time *" value={form.scheduledTime} onPress={onOpenTime} />
            <FieldCard
              icon="hourglass-outline" iconColor={S[2].accent} placeholder="Duration (minutes)"
              value={form.durationMinutes} onChangeText={(v) => setForm({ ...form, durationMinutes: v })}
              keyboardType="numeric" focused={focusedField === 'duration'}
              onFocus={() => setFocusedField('duration')} onBlur={() => setFocusedField(null)}
            />
          </SectionBlock>

          {/* MEETING DETAILS */}
          <SectionBlock section={S[3]}>
            <Text style={[sectionStyles.fieldLabel, { color: S[3].accent }]}>Google Meet Link</Text>
            <FieldCard
              icon="link-outline" iconColor={S[3].accent}
              placeholder="https://meet.google.com/..."
              value={form.googleMeetLink} onChangeText={(v) => setForm({ ...form, googleMeetLink: v })}
              focused={focusedField === 'googleMeetLink'}
              onFocus={() => setFocusedField('googleMeetLink')} onBlur={() => setFocusedField(null)}
              keyboardType="url"
            />
            <Text style={[sectionStyles.fieldLabel, { color: S[3].accent }]}>Zoom Meeting Link</Text>
            <FieldCard
              icon="videocam-outline" iconColor={S[3].accent}
              placeholder="https://zoom.us/j/..."
              value={form.zoomMeetingLink} onChangeText={(v) => setForm({ ...form, zoomMeetingLink: v })}
              focused={focusedField === 'zoomMeetingLink'}
              onFocus={() => setFocusedField('zoomMeetingLink')} onBlur={() => setFocusedField(null)}
              keyboardType="url"
            />
          </SectionBlock>

          <View style={formStyles.actionBar}>
            <RNTouchableOpacity style={formStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={formStyles.cancelText}>Cancel</Text>
            </RNTouchableOpacity>
            <RNTouchableOpacity activeOpacity={0.9} onPress={onSubmit} style={{ flex: 1 }}>
              <LinearGradient
                colors={['#FF4F8B', '#FF79AD']}
                style={formStyles.submitBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="calendar" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={formStyles.submitText}>Schedule Class</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </RNTouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── PICKERS ── */}
      <PickerModal
        visible={showCoursePicker} onClose={() => setShowCoursePicker(false)}
        title="Select Course" accent={S[0].accent} accentLight={S[0].accentLight}
        bgFrom={S[0].bgFrom} bgTo={S[0].bgTo}
        data={courseOptions} selected={form.course}
        onSelect={(v) => { setForm({ ...form, course: v }); setShowCoursePicker(false); }}
        keyExtractor={(i) => i} renderLabel={(i) => i} getKey={(i) => i}
        onTabBarScroll={onTabBarScroll}
      />
      <PickerModal
        visible={showGradePicker} onClose={() => setShowGradePicker(false)}
        title="Select Grade" accent={S[0].accent} accentLight={S[0].accentLight}
        bgFrom={S[0].bgFrom} bgTo={S[0].bgTo}
        data={gradeOptions} selected={form.grade}
        onSelect={(v) => { setForm({ ...form, grade: v }); setShowGradePicker(false); }}
        keyExtractor={(i) => i} renderLabel={(i) => i} getKey={(i) => i}
        onTabBarScroll={onTabBarScroll}
      />
      <PickerModal
        visible={showTeacherPicker} onClose={() => setShowTeacherPicker(false)}
        title="Select Teacher" accent={S[1].accent} accentLight={S[1].accentLight}
        bgFrom={S[1].bgFrom} bgTo={S[1].bgTo}
        data={teachers.filter((t) => t.isApproved)} selected={form.teacherId}
        onSelect={(item) => { setSelectedTeacher(item); setForm({ ...form, teacherId: item._id }); setShowTeacherPicker(false); }}
        keyExtractor={(i) => i._id} renderLabel={(i) => i.name} renderSub={(i) => i.mobile}
        getKey={(item) => item._id}
        onTabBarScroll={onTabBarScroll}
      />
      <PickerModal
        visible={showDatePicker} onClose={() => setShowDatePicker(false)}
        title="Select Date" accent={S[2].accent} accentLight={S[2].accentLight}
        bgFrom={S[2].bgFrom} bgTo={S[2].bgTo}
        data={dateOptions} selected={form.scheduledDate}
        onSelect={(item) => { setForm({ ...form, scheduledDate: item.value }); setShowDatePicker(false); }}
        keyExtractor={(i) => i.value} renderLabel={(i) => i.label} renderSub={(i) => i.value}
        getKey={(item) => item.value}
        onTabBarScroll={onTabBarScroll}
      />

      {/* Student Picker */}
      <Modal visible={showStudentPicker} transparent animationType="slide">
        <View style={pickerStyles.overlay}>
          <View style={[pickerStyles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <LinearGradient colors={[S[1].bgFrom, S[1].bgTo]} style={pickerStyles.sheetHeader}>
              <View style={[pickerStyles.headerAccentBar, { backgroundColor: S[1].accent }]} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
                <View style={[pickerStyles.iconBadge, { backgroundColor: S[1].accentLight }]}>
                  <Ionicons name="people-outline" size={16} color={S[1].accent} />
                </View>
                <Text style={[pickerStyles.sheetTitle, { color: S[1].accent }]}>
                  Select Students ({selectedStudents.length})
                </Text>
              </View>
              <View style={[pickerStyles.searchBox, { marginHorizontal: 20, marginBottom: 10 }]}>
                <Ionicons name="search" size={16} color="#B0B8CC" style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
                  placeholder="Search by name or mobile"
                  placeholderTextColor="#B0B8CC"
                  value={studentSearchQuery}
                  onChangeText={setStudentSearchQuery}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Back', onPress: () => setShowStudentPicker(false), primary: false },
                  { label: allFilteredSelected ? 'Unselect All' : 'Select All', onPress: toggleSelectAllFiltered, primary: false },
                  { label: 'Clear', onPress: () => setSelectedStudents([]), primary: false },
                  { label: `Done (${selectedStudents.length})`, onPress: () => setShowStudentPicker(false), primary: true },
                ].map((btn) => (
                  <RNTouchableOpacity
                    key={btn.label}
                    style={[pickerStyles.actionChip, btn.primary && { backgroundColor: S[1].accent, marginLeft: 'auto' }]}
                    onPress={btn.onPress}
                  >
                    <Text style={[pickerStyles.actionChipText, btn.primary && { color: '#FFF' }]}>{btn.label}</Text>
                  </RNTouchableOpacity>
                ))}
              </View>
            </LinearGradient>

            <FlatList
              onScroll={onTabBarScroll} scrollEventThrottle={16}
              data={filteredStudents} keyExtractor={(i) => i._id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const sel = selectedStudents.some((s) => s._id === item._id);
                return (
                  <RNTouchableOpacity
                    style={[pickerStyles.item, sel && { borderColor: S[1].accent, backgroundColor: S[1].bgFrom }]}
                    onPress={() => toggleStudent(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[pickerStyles.itemLabel, { color: sel ? S[1].accent : '#1E293B' }]}>{item.displayName || item.name}</Text>
                      <Text style={[pickerStyles.itemSub, { color: sel ? S[1].accent : '#94A3B8' }]}>
                        Grade {item.grade || 'N/A'} • {item.mobile || item.email || 'No contact'}
                      </Text>
                    </View>
                    <Ionicons name={sel ? 'checkbox' : 'square-outline'} size={22} color={sel ? S[1].accent : '#B0B8CC'} />
                  </RNTouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
                  <Ionicons name="people-outline" size={36} color="#CBD5E1" />
                  <Text style={{ color: '#94A3B8', fontSize: 14 }}>
                    {studentPool.length === 0 ? 'No students loaded' : 'No students match filter'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      {Platform.OS === 'android' ? (
        showTimePicker && (
          <DateTimePicker
            value={tempTimeDate} mode="time" display="default"
            is24Hour={false} minuteInterval={5}
            onChange={(e, d) => {
              if (e.type === 'set' && d) {
                setTempTimeDate(d);
                setForm({ ...form, scheduledTime: formatTimeForPayload(d) });
              }
              setShowTimePicker(false);
            }}
          />
        )
      ) : (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={pickerStyles.overlay}>
            <View style={[pickerStyles.sheet, { maxHeight: '60%', paddingBottom: Math.max(insets.bottom, 20) }]}>
              <LinearGradient colors={[S[2].bgFrom, S[2].bgTo]} style={pickerStyles.sheetHeader}>
                <View style={[pickerStyles.headerAccentBar, { backgroundColor: S[2].accent }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, paddingBottom: 10 }}>
                  <View style={[pickerStyles.iconBadge, { backgroundColor: S[2].accentLight }]}>
                    <Ionicons name="time-outline" size={16} color={S[2].accent} />
                  </View>
                  <Text style={[pickerStyles.sheetTitle, { color: S[2].accent }]}>Select Time</Text>
                  <RNTouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => setShowTimePicker(false)}>
                    <Text style={{ color: S[2].accent, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
                  </RNTouchableOpacity>
                </View>
                <Text style={{ textAlign: 'center', color: S[2].accent, fontWeight: '700', fontSize: 18, marginBottom: 8 }}>
                  {formatDisplayTime(tempTimeDate)}
                </Text>
              </LinearGradient>
              <DateTimePicker
                value={tempTimeDate} mode="time" display="spinner"
                is24Hour={false} minuteInterval={5}
                onChange={(_, d) => { if (d) setTempTimeDate(d); }}
              />
              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8 }}>
                <RNTouchableOpacity
                  style={[pickerStyles.actionChip, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={pickerStyles.actionChipText}>Back</Text>
                </RNTouchableOpacity>
                <RNTouchableOpacity
                  style={[pickerStyles.actionChip, { flex: 2, backgroundColor: S[2].accent, justifyContent: 'center' }]}
                  onPress={() => {
                    setForm((p) => ({ ...p, scheduledTime: formatTimeForPayload(tempTimeDate) }));
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={[pickerStyles.actionChipText, { color: '#FFF' }]}>Confirm Time</Text>
                </RNTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── GENERIC PICKER MODAL ───
function PickerModal({
  visible, onClose, title, accent, accentLight, bgFrom, bgTo,
  data, selected, onSelect, keyExtractor, renderLabel, renderSub, getKey, onTabBarScroll
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <LinearGradient colors={[bgFrom || `${accent}18`, bgTo || `${accent}06`]} style={pickerStyles.sheetHeader}>
            <View style={[pickerStyles.headerAccentBar, { backgroundColor: accent }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, paddingBottom: 14 }}>
              <View style={[pickerStyles.iconBadge, { backgroundColor: accentLight }]}>
                <Ionicons name="list-outline" size={16} color={accent} />
              </View>
              <Text style={[pickerStyles.sheetTitle, { color: accent }]}>{title}</Text>
              <RNTouchableOpacity style={{ marginLeft: 'auto' }} onPress={onClose}>
                <Text style={{ color: accent, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
              </RNTouchableOpacity>
            </View>
          </LinearGradient>

          <FlatList
            onScroll={onTabBarScroll} scrollEventThrottle={16}
            data={data} keyExtractor={keyExtractor}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const sel = selected === (getKey ? getKey(item) : item);
              return (
                <RNTouchableOpacity
                  style={[pickerStyles.item, sel && { borderColor: accent, backgroundColor: `${accent}12` }]}
                  onPress={() => onSelect(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[pickerStyles.itemLabel, { color: sel ? accent : '#1E293B' }]}>{renderLabel(item)}</Text>
                    {renderSub && (
                      <Text style={[pickerStyles.itemSub, { color: sel ? accent : '#94A3B8' }]}>{renderSub(item)}</Text>
                    )}
                  </View>
                  {sel && <Ionicons name="checkmark-circle" size={22} color={accent} />}
                </RNTouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── STYLES ───
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden', paddingBottom: 16, zIndex: 5,
  },
  heroCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  heroCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -30,
  },
  headerTopBar: { paddingHorizontal: 20, marginBottom: 10 },
  glassBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 14,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scheduleBtn: {
    marginHorizontal: 20, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12,
  },
  scheduleBtnIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  scheduleBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

const listStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12,
    borderLeftWidth: 5,
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  title: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillText: { fontSize: 12, fontWeight: '700' },
});

const formStyles = StyleSheet.create({
  heroWrap: { overflow: 'hidden', paddingBottom: 0 },
  deco1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -40,
  },
  deco2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(168,237,234,0.25)', bottom: 10, left: -40,
  },
  deco3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', top: 40, right: 110,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 20, marginBottom: 12,
    shadowColor: '#FF4F8B', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  heroRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 24, paddingBottom: 28,
  },
  heroLabel: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
    fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2,
  },
  heroTitle: { fontSize: 34, fontWeight: '900', color: '#FFF', letterSpacing: -1, lineHeight: 38 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 6, lineHeight: 18 },
  illustrationWrap: { width: 110, height: 110, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  illustBg: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF4F8B', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  illustStar1: { position: 'absolute', top: 4, right: 8 },
  illustStar2: { position: 'absolute', bottom: 14, left: 2 },
  actionBar: {
    flexDirection: 'row', gap: 12,
    paddingTop: 4,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  cancelBtn: {
    width: 110, height: 52, borderRadius: 16,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#FF4F8B',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: '#FF4F8B', fontSize: 15, fontWeight: '700' },
  submitBtn: {
    flex: 1, height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF4F8B', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '75%', overflow: 'hidden',
  },
  sheetHeader: { overflow: 'hidden' },
  headerAccentBar: { height: 4, width: '100%' },
  iconBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 16, fontWeight: '800' },
  searchBox: {
    height: 44, backgroundColor: '#F8FAFC', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#EEF2FF',
  },
  actionChip: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: '#F1F5F9',
  },
  actionChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  item: {
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#EEF2FF',
    padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  itemLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  itemSub: { fontSize: 13, fontWeight: '500' },
});
