import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, TextInput, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, formatScheduledTime } from '../../utils/formatters';
import { fetchSchedules } from '../../redux/slices/classesSlice';
import { fetchAdminTeachers, fetchAdminStudents } from '../../redux/slices/adminSlice';
import { createScheduleAPI, cancelScheduleAPI, getTeacherStudentsAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


export default function ClassSchedulerScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { schedules, loading } = useSelector((s) => s.classes);
  const { teachers, students } = useSelector((s) => s.admin);
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const isTeacher = user?.role === 'teacher';
  const [showForm, setShowForm] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [form, setForm] = useState({
    title: '',
    subject: '',
    course: '',
    grade: '',
    teacherId: '',
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: '60',
    notes: '',
  });
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [tempTimeDate, setTempTimeDate] = useState(new Date());
  const [teacherStudents, setTeacherStudents] = useState([]);
  const loggedInTeacherId = user?._id || user?.id || '';

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;
  const courseOptions = ['CBSE', 'Matric', 'Engineering', 'Arts', 'Language', 'Competitive'];
  const gradeOptions = ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'UG', 'PG', 'All'];
  const studentPool = isTeacher ? teacherStudents : students;

  const filteredStudents = studentPool.filter((s) => {
    if (s.isActive === false) return false;
    const gradeMatch = !form.grade || form.grade === 'All' ? true : s.grade === form.grade;
    if (!gradeMatch) return false;

    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = (s.displayName || s.name || '').toLowerCase();
    const mobile = (s.mobile || '').toLowerCase();
    return name.includes(q) || mobile.includes(q);
  });
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudents.some((sel) => sel._id === s._id));
  const dateOptions = Array.from({ length: 60 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return {
      value: `${yyyy}-${mm}-${dd}`,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    };
  });
  const getTimeDateFromValue = (value) => {
    if (!value || !value.includes(':')) return new Date();
    const [h, m] = value.split(':').map((n) => Number.parseInt(n, 10));
    const d = new Date();
    d.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
    return d;
  };

  const formatTimeForPayload = (dateObj) => {
    const h = `${dateObj.getHours()}`.padStart(2, '0');
    const m = `${dateObj.getMinutes()}`.padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatDisplayTime = (dateObj) => {
    return dateObj.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

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
      try {
        const { data } = await getTeacherStudentsAPI();
        setTeacherStudents(data.students || []);
      } catch {
        setTeacherStudents([]);
      }
    })();
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher || !loggedInTeacherId) return;
    setForm((prev) => ({ ...prev, teacherId: loggedInTeacherId }));
    setSelectedTeacher({
      _id: loggedInTeacherId,
      name: user.displayName || user.name || 'You',
      mobile: user.mobile || '',
    });
  }, [isTeacher, loggedInTeacherId, user?.displayName, user?.name, user?.mobile]);

  useEffect(() => {
    if (!showForm || !isTeacher || !loggedInTeacherId) return;
    setForm((prev) => ({ ...prev, teacherId: prev.teacherId || loggedInTeacherId }));
    setSelectedTeacher((prev) => prev || {
      _id: loggedInTeacherId,
      name: user?.displayName || user?.name || 'You',
      mobile: user?.mobile || '',
    });
  }, [showForm, isTeacher, loggedInTeacherId, user?.displayName, user?.name, user?.mobile]);

  const handleCreate = async () => {
    const teacherIdForPayload = form.teacherId || (isTeacher ? loggedInTeacherId : '');
    if (!form.title || !teacherIdForPayload || selectedStudents.length === 0 || !form.course || !form.subject || !form.grade || !form.scheduledDate || !form.scheduledTime) {
      Toast.show({ type: 'error', text1: 'Fill required fields' }); return;
    }
    try {
      await createScheduleAPI({
        ...form,
        teacherId: teacherIdForPayload,
        studentIds: selectedStudents.map((s) => s._id),
        durationMinutes: Number.parseInt(form.durationMinutes, 10) || 60,
      });
      Toast.show({ type: 'success', text1: 'Class Scheduled ?' });
      setShowForm(false);
      setForm({
        title: '',
        subject: '',
        course: '',
        grade: '',
        teacherId: isTeacher ? loggedInTeacherId : '',
        scheduledDate: '',
        scheduledTime: '',
        durationMinutes: '60',
        notes: '',
      });
      setSelectedTeacher(isTeacher ? {
        _id: loggedInTeacherId,
        name: user?.displayName || user?.name || 'You',
        mobile: user?.mobile || '',
      } : null);
      setSelectedStudents([]);
      dispatch(fetchSchedules({}));
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed', text2: e.response?.data?.message || 'Error' });
    }
  };

  const toggleStudent = (student) => {
    setSelectedStudents((prev) => {
      const exists = prev.some((s) => s._id === student._id);
      if (exists) return prev.filter((s) => s._id !== student._id);
      return [...prev, student];
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredStudents.map((s) => s._id));
      setSelectedStudents((prev) => prev.filter((s) => !filteredIds.has(s._id)));
      return;
    }

    setSelectedStudents((prev) => {
      const map = new Map(prev.map((s) => [s._id, s]));
      filteredStudents.forEach((s) => map.set(s._id, s));
      return Array.from(map.values());
    });
  };

  const handleCancel = async (id) => {
    try {
      await cancelScheduleAPI(id);
      Toast.show({ type: 'success', text1: 'Class Cancelled' });
      dispatch(fetchSchedules({}));
    } catch {}
  };

  const statusColors = { scheduled: Colors.info, live: Colors.error, completed: Colors.success, cancelled: Colors.mediumGray };

  const openTimePicker = () => {
    setTempTimeDate(getTimeDateFromValue(form.scheduledTime));
    setShowTimePicker(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setShowCoursePicker(false);
    setShowGradePicker(false);
    setShowTeacherPicker(false);
    setShowStudentPicker(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addText}>Schedule Class</Text>
      </TouchableOpacity>

      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={schedules} keyExtractor={(i) => i._id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, { backgroundColor: (statusColors[item.status] || Colors.mediumGray) + '18' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status?.toUpperCase()}</Text>
              </View>
              {item.status === 'scheduled' && (
                <TouchableOpacity onPress={() => handleCancel(item._id)}><Ionicons name="close-circle-outline" size={22} color={Colors.error} /></TouchableOpacity>
              )}
            </View>
            <Text style={[styles.cTitle, { color: textColor }]}>{item.title || item.subject}</Text>
            <Text style={[styles.cDetail, { color: textSec }]}>👤 {item.teacherId?.name || 'Teacher'}</Text>
            <Text style={[styles.cDetail, { color: textSec }]}>🎓 Students: {item.studentIds?.length || 0}</Text>
            <Text style={[styles.cDetail, { color: textSec }]}>📅 {formatDate(item.scheduledDate)} • {formatScheduledTime(item.scheduledTime)} • {item.durationMinutes}min</Text>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="calendar-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No scheduled classes</Text></View>}
        refreshing={loading} onRefresh={() => dispatch(fetchSchedules({}))}
      />

      {/* Schedule Form Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white }]} contentContainerStyle={{ padding: 24, paddingBottom: Math.max(40, bottomPadding) }}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Schedule New Class</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Title *" placeholderTextColor={Colors.mediumGray} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Subject *" placeholderTextColor={Colors.mediumGray} value={form.subject} onChangeText={(v) => setForm({ ...form, subject: v })} />

            <Text style={[styles.label, { color: textColor }]}>Course *</Text>
            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]} onPress={() => setShowCoursePicker(true)}>
              <Text style={[styles.selectorText, { color: form.course ? textColor : Colors.mediumGray }]}>{form.course || 'Select course'}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.mediumGray} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: textColor }]}>Grade *</Text>
            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]} onPress={() => setShowGradePicker(true)}>
              <Text style={[styles.selectorText, { color: form.grade ? textColor : Colors.mediumGray }]}>{form.grade || 'Select grade'}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.mediumGray} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: textColor }]}>Teacher *</Text>
            {isTeacher ? (
              <View style={[styles.selectorBtn, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]}> 
                <Text style={[styles.selectorText, { color: textColor }]}>{selectedTeacher?.name || 'Assigned teacher'}</Text>
                <Ionicons name="person-circle-outline" size={18} color={Colors.mediumGray} />
              </View>
            ) : (
              <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]} onPress={() => setShowTeacherPicker(true)}>
                <Text style={[styles.selectorText, { color: selectedTeacher ? textColor : Colors.mediumGray }]}>{selectedTeacher?.name || 'Select teacher'}</Text>
                <Ionicons name="chevron-down" size={18} color={Colors.mediumGray} />
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { color: textColor }]}>Student *</Text>
            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]} onPress={() => setShowStudentPicker(true)}>
              <Text style={[styles.selectorText, { color: selectedStudents.length ? textColor : Colors.mediumGray }]}>
                {selectedStudents.length ? `${selectedStudents.length} student(s) selected` : 'Select students'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.mediumGray} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: textColor }]}>Date *</Text>
            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.selectorText, { color: form.scheduledDate ? textColor : Colors.mediumGray }]}>{form.scheduledDate || 'Select date'}</Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.mediumGray} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: textColor }]}>Time *</Text>
            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]} onPress={openTimePicker}>
              <Text style={[styles.selectorText, { color: form.scheduledTime ? textColor : Colors.mediumGray }]}>{form.scheduledTime || 'Select time'}</Text>
              <Ionicons name="time-outline" size={18} color={Colors.mediumGray} />
            </TouchableOpacity>

            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Duration (minutes)" placeholderTextColor={Colors.mediumGray} keyboardType="numeric" value={form.durationMinutes} onChangeText={(v) => setForm({ ...form, durationMinutes: v })} />
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Notes (optional)" placeholderTextColor={Colors.mediumGray} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeForm}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate}><Text style={styles.confirmText}>Schedule</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Course Picker */}
      <Modal visible={showCoursePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, maxHeight: '60%' }]}> 
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: textColor, marginBottom: 0 }]}>Select Course</Text>
              <TouchableOpacity onPress={() => setShowCoursePicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={courseOptions} keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.teacherItem} onPress={() => { setForm({ ...form, course: item }); setShowCoursePicker(false); }}>
                  <Text style={[styles.teacherName, { color: textColor }]}>{item}</Text>
                </TouchableOpacity>
              )} />
          </View>
        </View>
      </Modal>

      {/* Grade Picker */}
      <Modal visible={showGradePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, maxHeight: '60%' }]}> 
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: textColor, marginBottom: 0 }]}>Select Grade</Text>
              <TouchableOpacity onPress={() => setShowGradePicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={gradeOptions} keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.teacherItem} onPress={() => { setForm({ ...form, grade: item }); setShowGradePicker(false); }}>
                  <Text style={[styles.teacherName, { color: textColor }]}>{item}</Text>
                </TouchableOpacity>
              )} />
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, maxHeight: '70%' }]}> 
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: textColor, marginBottom: 0 }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={dateOptions} keyExtractor={(i) => i.value}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.teacherItem} onPress={() => { setForm({ ...form, scheduledDate: item.value }); setShowDatePicker(false); }}>
                  <Text style={[styles.teacherName, { color: textColor }]}>{item.label}</Text>
                  <Text style={[styles.teacherContact, { color: textSec }]}>{item.value}</Text>
                </TouchableOpacity>
              )} />
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      {Platform.OS === 'android' ? (
        showTimePicker && (
          <DateTimePicker
            value={tempTimeDate}
            mode="time"
            display="default"
            is24Hour={false}
            minuteInterval={5}
            onChange={(event, selectedDate) => {
              if (event.type === 'set' && selectedDate) {
                setTempTimeDate(selectedDate);
                setForm({ ...form, scheduledTime: formatTimeForPayload(selectedDate) });
              }
              setShowTimePicker(false);
            }}
          />
        )
      ) : (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, maxHeight: '55%', padding: 20 }]}> 
              <View style={styles.pickerHeader}>
                <Text style={[styles.modalTitle, { color: textColor, marginBottom: 0 }]}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.timePreview, { color: textSec }]}>{formatDisplayTime(tempTimeDate)}</Text>
              <DateTimePicker
                value={tempTimeDate}
                mode="time"
                display="spinner"
                is24Hour={false}
                minuteInterval={5}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setTempTimeDate(selectedDate);
                }}
              />
              <View style={[styles.modalActions, { marginTop: 12 }]}> 
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => {
                    setForm({ ...form, scheduledTime: formatTimeForPayload(tempTimeDate) });
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.confirmText}>Confirm Time</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Teacher Picker */}
      <Modal visible={showTeacherPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, maxHeight: '60%' }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: textColor, marginBottom: 0 }]}>Select Teacher</Text>
              <TouchableOpacity onPress={() => setShowTeacherPicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={teachers.filter((t) => t.isApproved)} keyExtractor={(i) => i._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.teacherItem} onPress={() => { setSelectedTeacher(item); setForm({ ...form, teacherId: item._id }); setShowTeacherPicker(false); }}>
                  <Text style={[styles.teacherName, { color: textColor }]}>{item.name}</Text>
                  <Text style={[styles.teacherContact, { color: textSec }]}>{item.mobile}</Text>
                </TouchableOpacity>
              )} />
          </View>
        </View>
      </Modal>

      {/* Student Picker */}
      <Modal visible={showStudentPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, maxHeight: '75%', padding: 20, paddingBottom: 30 }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Select Students ({selectedStudents.length} selected)</Text>
            <Text style={[{ color: textSec, fontSize: 13, marginBottom: 12 }]}>Total available: {studentPool.length} | Filtered: {filteredStudents.length}</Text>
            <View style={styles.multiSelectActions}>
              <TouchableOpacity style={styles.multiActionBtn} onPress={() => setShowStudentPicker(false)}>
                <Text style={styles.multiActionText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.multiActionBtn} onPress={toggleSelectAllFiltered}>
                <Text style={styles.multiActionText}>{allFilteredSelected ? 'Unselect All' : 'Select All'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.multiActionBtn} onPress={() => setSelectedStudents([])}>
                <Text style={styles.multiActionText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.multiDoneBtn} onPress={() => setShowStudentPicker(false)}>
                <Text style={styles.multiDoneText}>Done ({selectedStudents.length})</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: isDark ? Colors.surface.dark : Colors.lightGray }]}>
              <Ionicons name="search" size={18} color={Colors.mediumGray} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search by name or mobile"
                placeholderTextColor={Colors.mediumGray}
                value={studentSearchQuery}
                onChangeText={setStudentSearchQuery}
              />
            </View>
            <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16}
              data={filteredStudents}
              keyExtractor={(i) => i._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.teacherItem}
                  onPress={() => toggleStudent(item)}
                >
                  <View style={styles.studentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.teacherName, { color: textColor }]}>{item.displayName || item.name}</Text>
                      <Text style={[styles.teacherContact, { color: textSec }]}>Grade {item.grade || 'N/A'} • {item.mobile || item.email || 'No contact'}</Text>
                    </View>
                    <Ionicons
                      name={selectedStudents.some((s) => s._id === item._id) ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={Colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Ionicons name="people-outline" size={40} color={Colors.mediumGray} />
                  <Text style={{ color: textSec, fontSize: 14, marginTop: 10 }}>
                    {studentPool.length === 0 ? 'No students loaded from server' : 'No students match the current filter'}
                  </Text>
                  <Text style={{ color: textSec, fontSize: 12, marginTop: 4 }}>
                    {studentPool.length === 0 ? 'No students assigned yet' : `Grade filter: ${form.grade || 'None'} | Search: "${studentSearchQuery}"`}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.pink, margin: 16, borderRadius: 12, paddingVertical: 14 },
  addText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cTitle: { fontSize: 17, fontWeight: '600' },
  cDetail: { fontSize: 13, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  pickerCancel: { color: Colors.pink, fontSize: 14, fontWeight: '700' },
  timePreview: { textAlign: 'center', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  selectorText: { fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.pink },
  confirmText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  teacherItem: { paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)', padding: 24 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  multiSelectActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  multiActionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: Colors.lightGray },
  multiActionText: { color: Colors.darkGray, fontWeight: '600', fontSize: 12 },
  multiDoneBtn: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: Colors.pink },
  multiDoneText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  teacherName: { fontSize: 16, fontWeight: '500' },
  teacherContact: { fontSize: 13, marginTop: 2 },
});
