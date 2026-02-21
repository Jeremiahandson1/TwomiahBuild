import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useTimeStore } from '../../src/store/timeStore';
import { format } from 'date-fns';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface QuickAction {
  label: string;
  icon: IoniconName;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Clock In', icon: 'play-circle', route: '/(app)/time/index', color: '#10b981' },
  { label: 'View Jobs', icon: 'briefcase', route: '/(app)/jobs/index', color: '#2563eb' },
  { label: 'Daily Log', icon: 'newspaper', route: '/(app)/daily-logs/index', color: '#f59e0b' },
  { label: 'Take Photo', icon: 'camera', route: '/(app)/photos/index', color: '#8b5cf6' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { activeEntry, loadActiveEntry } = useTimeStore();

  useEffect(() => {
    loadActiveEntry();
  }, []);

  const activeDuration = activeEntry
    ? Math.floor((Date.now() - new Date(activeEntry.clockIn).getTime()) / 1000)
    : null;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}
            </Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0] || 'there'}</Text>
          </View>
          <Text style={styles.date}>{format(new Date(), 'EEE, MMM d')}</Text>
        </View>

        {/* Active clock in card */}
        {activeEntry && (
          <TouchableOpacity
            style={styles.activeCard}
            onPress={() => router.push('/(app)/time/index')}
            activeOpacity={0.9}
          >
            <View style={styles.activeCardTop}>
              <Ionicons name="timer" size={20} color="#6ee7b7" />
              <Text style={styles.activeCardTitle}> Clocked In</Text>
            </View>
            {activeDuration !== null && (
              <Text style={styles.activeTime}>{formatDuration(activeDuration)}</Text>
            )}
            <Text style={styles.activeCardSub}>
              Since {format(new Date(activeEntry.clockIn), 'h:mm a')}
              {activeEntry.jobName ? `  ·  ${activeEntry.jobName}` : ''}
            </Text>
            <Text style={styles.activeCardCta}>Tap to clock out →</Text>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { borderTopColor: action.color }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon} size={32} color={action.color} style={{ marginBottom: 8 }} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  name: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  date: { fontSize: 13, color: '#94a3b8', marginTop: 6 },
  activeCard: {
    backgroundColor: '#1e3a5f', borderRadius: 16, padding: 20, marginBottom: 28,
  },
  activeCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  activeCardTitle: { color: '#6ee7b7', fontWeight: '700', fontSize: 14 },
  activeTime: { fontSize: 48, fontWeight: '800', color: '#fff', marginTop: 8 },
  activeCardSub: { color: '#93c5fd', fontSize: 13, marginTop: 4 },
  activeCardCta: { color: '#93c5fd', fontSize: 12, marginTop: 12, opacity: 0.7 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 20,
    borderTopWidth: 4, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
});
