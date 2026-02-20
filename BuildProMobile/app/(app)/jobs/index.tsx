import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useJobsStore } from '../../../src/store/jobsStore';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  in_progress: '#3b82f6',
  completed: '#6b7280',
  on_hold: '#f59e0b',
  cancelled: '#ef4444',
  quoted: '#8b5cf6',
};

export default function JobsScreen() {
  const { jobs, loading, error, fetchJobs } = useJobsStore();
  const { isOnline } = useNetworkStatus();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchJobs(); }, []);

  const filtered = search
    ? jobs.filter(
        (j) =>
          j.name.toLowerCase().includes(search.toLowerCase()) ||
          j.number?.toLowerCase().includes(search.toLowerCase()) ||
          j.address?.toLowerCase().includes(search.toLowerCase()) ||
          j.contactName?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Jobs</Text>
          {!isOnline && <Text style={styles.offlineBadge}>Cached</Text>}
        </View>

        {/* Search */}
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search jobs, addresses, clients..."
          placeholderTextColor="#94a3b8"
          clearButtonMode="while-editing"
        />

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && jobs.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchJobs} tintColor="#2563eb" />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/(app)/jobs/[id]', params: { id: item.id, name: item.name } } as any)}
                activeOpacity={0.8}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobName}>{item.name}</Text>
                    {item.number && <Text style={styles.jobNumber}>#{item.number}</Text>}
                    {item.contactName && <Text style={styles.jobMeta}>👤 {item.contactName}</Text>}
                    {item.address && <Text style={styles.jobMeta}>📍 {item.address}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#94a3b8' }]}>
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔨</Text>
                <Text style={styles.emptyText}>{search ? 'No jobs match your search' : 'No active jobs'}</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  offlineBadge: { backgroundColor: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  search: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, color: '#1e293b',
  },
  errorBanner: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { color: '#92400e', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  jobName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  jobNumber: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  jobMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
