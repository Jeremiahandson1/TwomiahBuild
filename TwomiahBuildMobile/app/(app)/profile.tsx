import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, Switch,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useSyncStore } from '../../src/store/syncStore';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { forceSync } from '../../src/api/syncEngine';
import { getDatabase } from '../../src/utils/database';
import { format } from 'date-fns';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { pendingCount, isSyncing, lastSynced } = useSyncStore();
  const { isOnline, connectionType } = useNetworkStatus();
  const [syncing, setSyncing] = useState(false);

  const handleForceSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to the internet to sync your data.');
      return;
    }
    setSyncing(true);
    try {
      await forceSync();
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Local Cache',
      'This will remove cached jobs and data from your device. Your unsynced entries will NOT be deleted. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await db.runAsync(`DELETE FROM jobs`);
            Alert.alert('Done', 'Cache cleared. Data will reload next time you go online.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      pendingCount > 0
        ? `You have ${pendingCount} unsynced item${pendingCount !== 1 ? 's' : ''}. Sign out anyway? They will sync next time you log in.`
        : 'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Owner',
      admin: 'Admin',
      manager: 'Manager',
      employee: 'Field Crew',
      viewer: 'Viewer',
    };
    return labels[role] || role;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || '—'}</Text>
            <Text style={styles.userEmail}>{user?.email || '—'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel(user?.role || '')}</Text>
            </View>
          </View>
        </View>

        {/* Sync status */}
        <Text style={styles.sectionTitle}>Sync Status</Text>
        <View style={styles.card}>
          <Row
            label="Connection"
            value={isOnline ? `Online (${connectionType || 'wifi'})` : 'Offline'}
            valueColor={isOnline ? '#10b981' : '#ef4444'}
          />
          <Row
            label="Pending items"
            value={pendingCount > 0 ? `${pendingCount} waiting` : 'All synced ✓'}
            valueColor={pendingCount > 0 ? '#f59e0b' : '#10b981'}
          />
          {lastSynced && (
            <Row
              label="Last synced"
              value={format(lastSynced, 'h:mm a')}
            />
          )}

          <TouchableOpacity
            style={[styles.syncBtn, (!isOnline || syncing) && styles.btnDisabled]}
            onPress={handleForceSync}
            disabled={!isOnline || syncing}
          >
            <Text style={styles.syncBtnText}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Row label="App Version" value="1.0.0" />
          <Row label="Platform" value="Twomiah Build Field" />
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Text style={styles.actionText}>Clear Local Cache</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 24 },

  userCard: {
    backgroundColor: '#1e3a5f', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  userName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  userEmail: { fontSize: 13, color: '#93c5fd', marginTop: 2 },
  roleBadge: {
    marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  roleText: { color: '#93c5fd', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  rowLabel: { fontSize: 14, color: '#64748b' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

  syncBtn: {
    margin: 12, backgroundColor: '#2563eb', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  actionText: { fontSize: 14, color: '#ef4444' },
  actionChevron: { fontSize: 18, color: '#94a3b8' },

  logoutBtn: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 8,
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
