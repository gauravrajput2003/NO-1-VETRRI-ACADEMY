import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../utils/colors';

export function StatCard({ icon, label, amount, change, color = 'pink' }) {
  const gradients = {
    pink: [Colors.hotPink, Colors.brightPink],
    teal: [Colors.teal, Colors.lightTeal],
  };

  return (
    <LinearGradient
      colors={gradients[color]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.amountContainer}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.amount}>{amount}</Text>
      </View>
      <Text style={styles.change}>{change}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    height: 140,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    marginHorizontal: '1%',
    marginVertical: 8,
    shadowColor: Colors.hotPink,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  label: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 8,
  },
  amount: {
    fontSize: 28,
    color: Colors.white,
    fontWeight: '700',
  },
  change: {
    fontSize: 11,
    color: Colors.white,
    opacity: 0.8,
  },
});
