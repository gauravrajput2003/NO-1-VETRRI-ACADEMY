import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../utils/colors';

export function ListItem({ 
  icon, 
  title, 
  subtitle, 
  metadata, 
  actions,
  onPress 
}) {
  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {metadata && <Text style={styles.metadata}>{metadata}</Text>}
        </View>
      </View>
      <View style={styles.actions}>
        {actions?.map((action, i) => (
          <TouchableOpacity 
            key={i} 
            onPress={action.onPress}
            style={styles.actionButton}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    shadowColor: Colors.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 2,
  },
  metadata: {
    fontSize: 11,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
});
