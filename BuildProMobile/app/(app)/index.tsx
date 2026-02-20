import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useTimeStore } from '../../src/store/timeStore';
import { useSyncStore } from '../../src/store/syncStore';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { format, formatDuration, intervalToDuration } from 'date-fns';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const { activeEntry, loadActiveEntry, clockOut } = useTimeStore();
  const { pendingCount, lastSynced } = useSyncStore();
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    loadActiveEntry();
  }, []);

  const activeDuration = activeEntry
    ? intervalToDuration({ start: new Date(activeEntry.clockIn), end: new Date() })
    : null;

  const quickActions = [
    { label: 'Clock In', icon: '⏱️', route: '/(app)/time', color: '#10b981' },
    { label: 'View Jobs', icon: '🔨', route: '/(app)/jobs', color: '#2563eb' },
    { label: 'Daily Log', icon: '📋', route: '/(app)/daily-logs', color: '#f59e0b' },
    { label: 'Take Photo', icon: '📷', route: '/(app)/photos', color: '#8b5cf6' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getGreeting()}</Text>
            <Text style={styles.name}>{user?.name || 'Field Crew'}</Text>
          </View>
        </View>

        {/* Connection status */}
        <View style={[styles.statusBar, isOnline ? styles.statusOnline : styles.statusOffline]}>
          <Text style={styles.statusText}>
            {isOnline ? '🟢 Online' : '🔴 Offline — changes will sync when connected'}
          </Text>
          {pendingCount > 0 && (
            <Text style={styles.statusText}>{pendingCount} pending</Text>
          )}
        </View>

        {/* Active clock-in card */}
        {activeEntry && (
          <View style={styles.activeCard}>
            <View style={styles.activeCardHeader}>
              <Text style={styles.activeCardTitle}>⏱️ Clocked In</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.activeTime}>
              {activeDuration
                ? `${activeDuration.hours || 0}h ${activeDuration.minutes || 0}m`
                : '0h 0m'}
            </Text>
            <Text style={styles.activeSince}>
              Since {format(new Date(activeEntry.clockIn), 'h:mm a')}
              {activeEntry.jobName ? ` · ${activeEntry.jobName}` : ''}
            </Text>
            <TouchableOpacity
              style={styles.clockOutBtn}
              onPress={() => clockOut()}
              activeOpacity={0.85}
            >
              <Text style={styles.clockOutText}>Clock Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { borderLeftColor: action.color }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sync info */}
        {lastSynced && (
          <Text style={styles.syncInfo}>
            Last synced {format(lastSynced, 'h:mm a')}
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 14, color: '#64748b' },
  name: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginTop: 2 },
  statusBar: { borderRadius: 8, padding: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  statusOnline: { backgroundColor: '#d1fae5' },
  statusOffline: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#1e293b' },

  activeCard: {
    backgroundColor: '#1e3a5f', borderRadius: 16, padding: 20, marginBottom: 24,
  },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeCardTitle: { color: '#93c5fd', fontSize: 14, fontWeight: '600' },
  liveBadge: { backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  activeTime: { fontSize: 48, fontWeight: '800', color: '#fff', marginTop: 8 },
  activeSince: { color: '#93c5fd', fontSize: 13, marginTop: 4, marginBottom: 16 },
  clockOutBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 14, alignItems: 'center' },
  clockOutText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  syncInfo: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 32 },
});
