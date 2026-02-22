import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTimeStore } from '../../../src/store/timeStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Action {
  icon: IoniconName;
  label: string;
  color: string;
  onPress: () => void;
}

export default function JobDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { activeEntry, clockIn, clockOut } = useTimeStore();
  const [clockingIn, setClockingIn] = useState(false);

  const isClockedInHere = activeEntry?.jobId === id;

  const handleClockIn = async () => {
    if (activeEntry && !isClockedInHere) {
      Alert.alert('Already Clocked In', 'Clock out of your current job first.');
      return;
    }
    setClockingIn(true);
    try {
      await clockIn(id);
    } finally {
      setClockingIn(false);
    }
  };

  const actions: Action[] = [
    {
      icon: isClockedInHere ? 'stop-circle' : 'play-circle',
      label: isClockedInHere ? 'Clock Out' : 'Clock In',
      color: isClockedInHere ? '#ef4444' : '#10b981',
      onPress: isClockedInHere ? () => clockOut() : handleClockIn,
    },
    {
      icon: 'newspaper',
      label: 'Daily Log',
      color: '#f59e0b',
      onPress: () => router.push({ pathname: '/(app)/daily-logs/index', params: { jobId: id, jobName: name } } as any),
    },
    {
      icon: 'camera',
      label: 'Photos',
      color: '#8b5cf6',
      onPress: () => router.push({ pathname: '/(app)/photos/index', params: { jobId: id } } as any),
    },
    {
      icon: 'checkmark-circle',
      label: 'Tasks',
      color: '#2563eb',
      onPress: () => router.push({ pathname: '/(app)/jobs/tasks', params: { jobId: id, jobName: name } } as any),
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Jobs</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{name}</Text>

        {isClockedInHere && (
          <View style={styles.activeClockBadge}>
            <Text style={styles.activeClockText}>⏱ You're clocked in on this job</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Field Actions</Text>
        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { borderTopColor: action.color }]}
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon} size={36} color={action.color} style={{ marginBottom: 8 }} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  back: { marginBottom: 16 },
  backText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  activeClockBadge: { backgroundColor: '#d1fae5', borderRadius: 8, padding: 12, marginBottom: 20 },
  activeClockText: { color: '#065f46', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 20,
    borderTopWidth: 4, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
});
