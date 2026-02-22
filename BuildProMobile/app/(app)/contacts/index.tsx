import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useContactsStore } from '../../../src/store/contactsStore';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';

const TYPE_COLORS: Record<string, string> = {
  lead:          '#f59e0b',
  client:        '#10b981',
  subcontractor: '#3b82f6',
  vendor:        '#8b5cf6',
};

const TYPE_ICONS: Record<string, string> = {
  lead: '🎯',
  client: '✅',
  subcontractor: '🔨',
  vendor: '📦',
};

export default function ContactsScreen() {
  const { contacts, loading, error, fetchContacts } = useContactsStore();
  const { isOnline } = useNetworkStatus();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => { fetchContacts(); }, []);

  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const counts = contacts.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Contacts</Text>
          {!isOnline && <Text style={styles.offlineBadge}>Cached</Text>}
        </View>

        {/* Search */}
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, company, phone..."
          placeholderTextColor="#94a3b8"
          clearButtonMode="while-editing"
        />

        {/* Type filter pills */}
        <View style={styles.filters}>
          {[null, 'lead', 'client', 'subcontractor', 'vendor'].map(t => (
            <TouchableOpacity
              key={t ?? 'all'}
              onPress={() => setTypeFilter(t)}
              style={[styles.filterPill, typeFilter === t && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
                {t ? `${TYPE_ICONS[t]} ${t} ${counts[t] ? `(${counts[t]})` : ''}` : `All (${contacts.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && contacts.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchContacts} tintColor="#f97316" />
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.avatar, { backgroundColor: (TYPE_COLORS[item.type] || '#94a3b8') + '20' }]}>
                    <Text style={styles.avatarText}>
                      {item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{item.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[item.type] || '#94a3b8') + '20' }]}>
                        <Text style={[styles.typeText, { color: TYPE_COLORS[item.type] || '#94a3b8' }]}>
                          {item.type}
                        </Text>
                      </View>
                    </View>
                    {item.company && <Text style={styles.meta}>🏢 {item.company}</Text>}
                    {item.phone  && <Text style={styles.meta}>📞 {item.phone}</Text>}
                    {item.email  && <Text style={styles.meta} numberOfLines={1}>✉️ {item.email}</Text>}
                    {(item.city || item.state) && (
                      <Text style={styles.meta}>📍 {[item.city, item.state].filter(Boolean).join(', ')}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>
                  {search ? 'No contacts match your search' : 'No contacts yet'}
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
  search: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, color: '#1e293b',
  },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterPillActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  errorBanner: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { color: '#92400e', fontSize: 13 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#475569' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  typeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
