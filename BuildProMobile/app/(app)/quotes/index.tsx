import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuotesStore } from '../../../src/store/quotesStore';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  draft:    '#94a3b8',
  sent:     '#3b82f6',
  viewed:   '#8b5cf6',
  accepted: '#10b981',
  declined: '#ef4444',
  expired:  '#f59e0b',
};

export default function QuotesScreen() {
  const { quotes, loading, error, fetchQuotes } = useQuotesStore();
  const { isOnline } = useNetworkStatus();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => { fetchQuotes(); }, []);

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.number?.toLowerCase().includes(search.toLowerCase()) ||
      q.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      q.projectName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalValue = filtered.reduce((sum, q) => sum + (q.total || 0), 0);
  const pendingValue = filtered
    .filter(q => ['sent', 'viewed'].includes(q.status))
    .reduce((sum, q) => sum + (q.total || 0), 0);

  const statuses = ['draft', 'sent', 'viewed', 'accepted', 'declined'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Quotes</Text>
          {!isOnline && <Text style={styles.offlineBadge}>Cached</Text>}
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>${(totalValue / 1000).toFixed(0)}k</Text>
            <Text style={styles.summaryLabel}>Total Value</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.summaryValue, { color: '#d97706' }]}>${(pendingValue / 1000).toFixed(0)}k</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
              {quotes.filter(q => q.status === 'accepted').length}
            </Text>
            <Text style={styles.summaryLabel}>Won</Text>
          </View>
        </View>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search quotes, clients..."
          placeholderTextColor="#94a3b8"
          clearButtonMode="while-editing"
        />

        {/* Status filters */}
        <View style={styles.filters}>
          {[null, ...statuses].map(s => (
            <TouchableOpacity
              key={s ?? 'all'}
              onPress={() => setStatusFilter(s)}
              style={[styles.filterPill, statusFilter === s && { backgroundColor: STATUS_COLORS[s!] || '#f97316', borderColor: STATUS_COLORS[s!] || '#f97316' }]}
            >
              <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                {s ?? 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}

        {loading && quotes.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchQuotes} tintColor="#f97316" />}
            renderItem={({ item }) => {
              const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date() && item.status !== 'accepted';
              return (
                <View style={[styles.card, isExpired && styles.cardExpired]}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.quoteNumber}>Quote #{item.number}</Text>
                      {item.contactName && <Text style={styles.meta}>👤 {item.contactName}</Text>}
                      {item.projectName && <Text style={styles.meta}>🏗 {item.projectName}</Text>}
                      {item.expiresAt && (
                        <Text style={[styles.meta, isExpired && { color: '#ef4444' }]}>
                          {isExpired ? '⚠️ Expired ' : '⏱ Expires '}
                          {format(new Date(item.expiresAt), 'MMM d, yyyy')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.rightCol}>
                      <Text style={styles.amount}>${item.total.toLocaleString()}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#94a3b8') + '20' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#94a3b8' }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>{search ? 'No quotes match your search' : 'No quotes yet'}</Text>
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
  cardExpired: { borderWidth: 1, borderColor: '#fecaca' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quoteNumber: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
