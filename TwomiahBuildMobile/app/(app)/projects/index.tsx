import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useProjectsStore } from '../../../src/store/projectsStore';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  planning:    '#94a3b8',
  active:      '#3b82f6',
  in_progress: '#f59e0b',
  on_hold:     '#f97316',
  completed:   '#10b981',
  cancelled:   '#ef4444',
};

export default function ProjectsScreen() {
  const { projects, loading, error, fetchProjects } = useProjectsStore();
  const { isOnline } = useNetworkStatus();
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => { fetchProjects(); }, []);

  const filtered = projects.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.number?.toLowerCase().includes(search.toLowerCase()) ||
      p.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount    = projects.filter(p => ['active','in_progress'].includes(p.status)).length;
  const totalBudget    = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent     = projects.reduce((s, p) => s + (p.spent  || 0), 0);
  const statuses       = ['planning', 'active', 'in_progress', 'on_hold', 'completed'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Projects</Text>
          {!isOnline && <Text style={styles.offlineBadge}>Cached</Text>}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>
              ${(totalBudget / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.summaryLabel}>Budgeted</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fefce8' }]}>
            <Text style={[styles.summaryValue, { color: '#ca8a04' }]}>
              ${(totalSpent / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.summaryLabel}>Spent</Text>
          </View>
        </View>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects, clients, addresses..."
          placeholderTextColor="#94a3b8"
          clearButtonMode="while-editing"
        />

        <View style={styles.filters}>
          {[null, ...statuses].map(s => (
            <TouchableOpacity
              key={s ?? 'all'}
              onPress={() => setStatusFilter(s)}
              style={[
                styles.filterPill,
                statusFilter === s && {
                  backgroundColor: STATUS_COLORS[s!] || '#f97316',
                  borderColor:     STATUS_COLORS[s!] || '#f97316',
                },
              ]}
            >
              <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                {s ? s.replace('_', ' ') : `All (${projects.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}

        {loading && projects.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProjects} tintColor="#f97316" />}
            renderItem={({ item }) => {
              const budgetUsed = item.budget && item.spent
                ? Math.min(Math.round((item.spent / item.budget) * 100), 100)
                : null;
              const overBudget = item.budget && item.spent && item.spent > item.budget;

              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.projectName}>{item.name}</Text>
                        {item.number && <Text style={styles.number}>#{item.number}</Text>}
                      </View>
                      {item.contactName && <Text style={styles.meta}>👤 {item.contactName}</Text>}
                      {item.address     && <Text style={styles.meta}>📍 {item.address}</Text>}
                      {item.startDate   && (
                        <Text style={styles.meta}>
                          📅 {format(new Date(item.startDate), 'MMM d')}
                          {item.endDate ? ` – ${format(new Date(item.endDate), 'MMM d, yyyy')}` : ''}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#94a3b8' }]}>
                        {item.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* Budget progress bar */}
                  {budgetUsed !== null && (
                    <View style={styles.budgetSection}>
                      <View style={styles.budgetLabels}>
                        <Text style={styles.budgetText}>
                          ${(item.spent! / 1000).toFixed(0)}k spent
                        </Text>
                        <Text style={[styles.budgetText, overBudget && { color: '#ef4444' }]}>
                          {overBudget ? '⚠️ Over budget' : `$${(item.budget! / 1000).toFixed(0)}k budget`}
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[
                          styles.progressFill,
                          { width: `${budgetUsed}%` as any },
                          { backgroundColor: overBudget ? '#ef4444' : budgetUsed > 80 ? '#f59e0b' : '#10b981' },
                        ]} />
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🏗</Text>
                <Text style={styles.emptyText}>
                  {search ? 'No projects match your search' : 'No projects yet'}
                </Text>
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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  summaryLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  search: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, color: '#1e293b',
  },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  errorBanner: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { color: '#92400e', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  projectName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  number: { fontSize: 12, color: '#94a3b8' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  budgetSection: { marginTop: 12 },
  budgetLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  budgetText: { fontSize: 12, color: '#64748b' },
  progressTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
