// apps/mobile/App.tsx

import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import type { TriageResult } from '@vitascan/shared';

const mockTriage: TriageResult = {
  triageLevel: 'home',
  specialtySuggestion: null,
  possibleIssueCategories: ['general'],
  redFlags: [],
  confidence: 90,
  homeCareAdvice: 'Drink water and rest.',
  doctorVisitPreparationTips: 'If symptoms worsen, call your doctor.'
};

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>VitaScan Mobile</Text>
      <Text>Sample triage level: {mockTriage.triageLevel}</Text>
      <Text>Confidence: {mockTriage.confidence}%</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12
  }
});
