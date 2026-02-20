import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useSyncStore } from '../../src/store/syncStore';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '🏠',
    jobs: '🔨',
    time: '⏱️',
    'daily-logs': '📋',
    photos: '📷',
    profile: '👤',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { pendingCount, isSyncing } = useSyncStore();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      {/* Offline sync banner */}
      {pendingCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            {isSyncing ? `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}...` : `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`}
          </Text>
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="jobs"
          options={{
            title: 'Jobs',
            tabBarIcon: ({ focused }) => <TabIcon name="jobs" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="time"
          options={{
            title: 'Time',
            tabBarIcon: ({ focused }) => <TabIcon name="time" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="daily-logs"
          options={{
            title: 'Logs',
            tabBarIcon: ({ focused }) => <TabIcon name="daily-logs" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="photos"
          options={{
            title: 'Photos',
            tabBarIcon: ({ focused }) => <TabIcon name="photos" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  syncBanner: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    alignItems: 'center',
  },
  syncText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
