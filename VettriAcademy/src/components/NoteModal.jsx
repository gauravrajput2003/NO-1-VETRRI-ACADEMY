import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { Colors } from '../utils/colors';
import { addNote, updateNote } from '../redux/slices/pdfSlice';

const NOTE_COLORS = [
  { name: 'yellow', hex: '#FFF9C4' },
  { name: 'green', hex: '#C8E6C9' },
  { name: 'blue', hex: '#BBDEFB' },
  { name: 'pink', hex: '#F8BBD0' },
  { name: 'purple', hex: '#E1BEE7' },
];

export default function NoteModal({ visible, onClose, onSave, pageNumber, materialId, existingNote }) {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  useEffect(() => {
    if (existingNote) {
      setNoteText(existingNote.noteText || '');
      setSelectedColor(existingNote.color || 'yellow');
    } else {
      setNoteText('');
      setSelectedColor('yellow');
    }
  }, [existingNote, visible]);

  const handleSave = async () => {
    if (!noteText.trim()) return;

    if (existingNote) {
      dispatch(updateNote({
        noteId: existingNote._id, materialId,
        noteText: noteText.trim(), color: selectedColor,
      }));
    } else {
      dispatch(addNote({
        materialId, pageNumber,
        noteText: noteText.trim(), color: selectedColor,
      }));
    }

    onSave?.({ noteText: noteText.trim(), color: selectedColor });
    setNoteText('');
  };

  const bg = isDark ? '#152238' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#888';
  const inputBg = isDark ? '#0A1628' : '#F8F9FA';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.wrapper}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: textColor }]}>
              {existingNote ? 'Edit Note' : `Add Note — Page ${pageNumber}`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={mutedColor} />
            </TouchableOpacity>
          </View>

          {/* Color Picker */}
          <View style={styles.colorRow}>
            <Text style={[styles.colorLabel, { color: mutedColor }]}>Color:</Text>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                onPress={() => setSelectedColor(c.name)}
                style={[styles.colorDot, {
                  backgroundColor: c.hex,
                  borderWidth: selectedColor === c.name ? 3 : 1,
                  borderColor: selectedColor === c.name ? Colors.pink : '#DDD',
                }]}
              >
                {selectedColor === c.name && (
                  <Ionicons name="checkmark" size={14} color="#333" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Text Input */}
          <TextInput
            style={[styles.textInput, {
              backgroundColor: inputBg, color: textColor,
              borderColor: isDark ? '#30475E' : '#E0E0E0',
            }]}
            placeholder="Write your note here..."
            placeholderTextColor={mutedColor}
            multiline
            maxLength={2000}
            value={noteText}
            onChangeText={setNoteText}
            textAlignVertical="top"
          />

          {/* Character count */}
          <Text style={[styles.charCount, { color: noteText.length > 1800 ? Colors.error : mutedColor }]}>
            {noteText.length} / 2000
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={[styles.cancelText, { color: mutedColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { opacity: noteText.trim() ? 1 : 0.5 }]}
              onPress={handleSave}
              disabled={!noteText.trim()}
            >
              <Text style={styles.saveText}>
                {existingNote ? 'Update' : 'Save Note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  colorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  colorLabel: { fontSize: 13, fontWeight: '600', marginRight: 4 },
  colorDot: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  textInput: {
    height: 140, borderWidth: 1, borderRadius: 12, padding: 14,
    fontSize: 15, lineHeight: 22,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16,
  },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#FF4F8B', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
  },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
