import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors } from '../../utils/colors';

export function SalaryScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Salary</Text>
        <Text style={styles.subtitle}>Salary & Payment History</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
  },
});

export default SalaryScreen;
