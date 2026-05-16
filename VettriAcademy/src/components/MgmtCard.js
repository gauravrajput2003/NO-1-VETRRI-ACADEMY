import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../utils/colors';

export function MgmtCard({ icon, title, number, onPress }) {
  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.number}>{number}</Text>
      <Text style={styles.subtitle}>Active</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    height: 160,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.lightPink,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginVertical: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: Colors.hotPink,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 4,
  },
  number: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.gray,
  },
});
