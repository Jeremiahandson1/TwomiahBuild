import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const ITEMS = [
  { label: 'Contacts',  icon: '👥', route: '/(app)/contacts/index',  color: '#f97316', desc: 'Leads, clients & subs' },
  { label: 'Schedule',  icon: '📅', route: '/(app)/schedule/index',  color: '#3b82f6', desc: 'Upcoming jobs & appointments' },
  { label: 'Projects',  icon: '🏗',  route: '/(app)/projects/index',  color: '#8b5cf6', desc: 'Active & planned projects' },
  { label: 'Quotes',    icon: '📋', route: '/(app)/quotes/index',    color: '#10b981', desc: 'Estimates & proposals' },
  { label: 'Invoices',  icon: '💰', route: '/(app)/invoices/index',  color: '#ef4444', desc: 'Billing & payments' },
] as const;

const SECONDARY = [
  { label: 'Photos',    icon: '📷', route: '/(app)/photos/index' },
  { label: 'Daily Logs',icon: '📝', route: '/(app)/daily-logs/index' },
] as const;

export default function MoreScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>More</Text>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <Text style={styles.userRole}>{user?.role || 'team'}</Text>
          </View>
        </View>

        {/* Primary navigation items */}
        <Text style={styles.sectionLabel}>MANAGEMENT</Text>
        <View style={styles.grid}>
          {ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.gridItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBg, { backgroundColor: item.color + '20' }]}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
              <Text style={styles.gridDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary items */}
        <Text style={styles.sectionLabel}>FIELD TOOLS</Text>
        <View style={styles.listSection}>
          {SECONDARY.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.listItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.listIcon}>{item.icon}</Text>
              <Text style={styles.listLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.listSection}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push('/(app)/profile' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.listIcon}>⚙️</Text>
            <Text style={styles.listLabel}>Profile & Settings</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.listItem, styles.logoutItem]}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Text style={styles.listIcon}>🚪</Text>
            <Text style={[styles.listLabel, { color: '#ef4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 1 },
  userRole: { fontSize: 11, color: '#f97316', fontWeight: '700', textTransform: 'uppercase', marginTop: 3 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  gridItem: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  iconBg: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  icon: { fontSize: 22 },
  gridLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  gridDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  listSection: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  logoutItem: { borderBottomWidth: 0 },
  listIcon: { fontSize: 20 },
  listLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  chevron: { fontSize: 20, color: '#94a3b8', fontWeight: '300' },
});
