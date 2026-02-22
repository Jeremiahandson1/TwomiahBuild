import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSyncStore } from '../../src/store/syncStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

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
          tabBarActiveTintColor: '#f97316',
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
          name="jobs/index"
          options={{
            title: 'Jobs',
            tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="time/index"
          options={{
            title: 'Time',
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="daily-logs/index"
          options={{
            title: 'Logs',
            tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          }}
        />

        {/* Hidden screens — accessible via More or deep links */}
        <Tabs.Screen name="photos/index"      options={{ href: null }} />
        <Tabs.Screen name="profile"           options={{ href: null }} />
        <Tabs.Screen name="jobs/[id]"         options={{ href: null }} />
        <Tabs.Screen name="jobs/tasks"        options={{ href: null }} />
        <Tabs.Screen name="contacts/index"    options={{ href: null }} />
        <Tabs.Screen name="quotes/index"      options={{ href: null }} />
        <Tabs.Screen name="invoices/index"    options={{ href: null }} />
        <Tabs.Screen name="projects/index"    options={{ href: null }} />
        <Tabs.Screen name="schedule/index"    options={{ href: null }} />
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
