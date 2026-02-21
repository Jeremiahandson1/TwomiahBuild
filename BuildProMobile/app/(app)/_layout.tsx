import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSyncStore } from '../../src/store/syncStore';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { pendingCount, isSyncing } = useSyncStore();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      {pendingCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            {isSyncing
              ? `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}...`
              : `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`}
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
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="jobs"
          options={{
            title: 'Jobs',
            tabBarIcon: ({ color, size }) => <Ionicons name="hammer" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="time"
          options={{
            title: 'Time',
            tabBarIcon: ({ color, size }) => <Ionicons name="timer" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="daily-logs"
          options={{
            title: 'Logs',
            tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="photos"
          options={{
            title: 'Photos',
            tabBarIcon: ({ color, size }) => <Ionicons name="camera" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
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
