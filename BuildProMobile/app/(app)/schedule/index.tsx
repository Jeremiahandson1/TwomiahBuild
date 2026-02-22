import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useScheduleStore } from '../../../src/store/scheduleStore';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { format, isToday, isTomorrow, isYesterday, startOfWeek, addDays, isSameDay } from 'date-fns';

const TYPE_COLORS: Record<string, string> = {
  job:         '#3b82f6',
  task:        '#8b5cf6',
  appointment: '#10b981',
  estimate:    '#f59e0b',
};

const TYPE_ICONS: Record<string, string> = {
  job: '🔨', task: '✅', appointment: '📅', estimate: '📋',
};

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMM d');
}

export default function ScheduleScreen() {
  const { events, loading, error, fetchSchedule } = useScheduleStore();
  const { isOnline } = useNetworkStatus();
  const [selectedDay, setSelectedDay] = useState(new Date());

  useEffect(() => { fetchSchedule(); }, []);

  // Build week strip
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group events by day
  const eventsByDay: Record<string, typeof events> = {};
  for (const event of events) {
    const key = event.startDate?.split('T')[0] || '';
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(event);
  }

  const selectedKey = format(selectedDay, 'yyyy-MM-dd');
  const todayEvents = eventsByDay[selectedKey] || [];

  // Build agenda sections from next 30 days
  const today = new Date();
  const agendaDays: Array<{ date: string; label: string; events: typeof events }> = [];
  for (let i = -1; i < 30; i++) {
    const d = addDays(today, i);
    const key = format(d, 'yyyy-MM-dd');
    if (eventsByDay[key]?.length) {
      agendaDays.push({ date: key, label: getDayLabel(key), events: eventsByDay[key] });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule</Text>
          {!isOnline && <Text style={styles.offlineBadge}>Cached</Text>}
        </View>

        {/* Week strip */}
        <View style={styles.weekStrip}>
          {weekDays.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const hasEvents = (eventsByDay[key]?.length || 0) > 0;
            const isSelected = isSameDay(day, selectedDay);
            const todayDay = isToday(day);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {format(day, 'EEE')}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, todayDay && styles.dayNumToday]}>
                  {format(day, 'd')}
                </Text>
                {hasEvents && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day header */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>{getDayLabel(selectedKey)}</Text>
          <Text style={styles.dayHeaderCount}>
            {todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'}
          </Text>
        </View>

        {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}

        {loading && events.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
        ) : (
          <FlatList
            data={todayEvents.length > 0 ? todayEvents : agendaDays}
            keyExtractor={(item: any) => item.id || item.date}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchSchedule()} tintColor="#f97316" />}
            renderItem={({ item }: any) => {
              // Agenda section header
              if (item.date && item.label && item.events) {
                return (
                  <View>
                    <View style={styles.agendaDateHeader}>
                      <Text style={styles.agendaDateLabel}>{item.label}</Text>
                    </View>
                    {item.events.map((ev: any) => (
                      <EventCard key={ev.id} event={ev} />
                    ))}
                  </View>
                );
              }
              // Single event card
              return <EventCard event={item} />;
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>Nothing scheduled</Text>
                <Text style={styles.emptySub}>
                  {todayEvents.length === 0 && events.length > 0 ? 'No events on this day' : 'Your schedule is clear'}
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

function EventCard({ event }: { event: any }) {
  const color = TYPE_COLORS[event.type] || '#64748b';
  const icon  = TYPE_ICONS[event.type]  || '📌';

  return (
    <View style={[styles.eventCard, { borderLeftColor: color }]}>
      <View style={styles.eventRow}>
        <Text style={styles.eventIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.startDate && !event.allDay && (
            <Text style={styles.eventTime}>
              🕐 {format(new Date(event.startDate), 'h:mm a')}
              {event.endDate ? ` – ${format(new Date(event.endDate), 'h:mm a')}` : ''}
            </Text>
          )}
          {event.contactName  && <Text style={styles.eventMeta}>👤 {event.contactName}</Text>}
          {event.address      && <Text style={styles.eventMeta}>📍 {event.address}</Text>}
          {event.assigneeName && <Text style={styles.eventMeta}>👷 {event.assigneeName}</Text>}
        </View>
        <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.typeText, { color }]}>{event.type}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  offlineBadge: { backgroundColor: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  weekStrip: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 8, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  dayCellSelected: { backgroundColor: '#f97316' },
  dayName: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 4 },
  dayNameSelected: { color: '#fff' },
  dayNum: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  dayNumSelected: { color: '#fff' },
  dayNumToday: { color: '#f97316' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#f97316', marginTop: 4 },
  dotSelected: { backgroundColor: '#fff' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayHeaderText: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  dayHeaderCount: { fontSize: 13, color: '#94a3b8' },
  errorBanner: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { color: '#92400e', fontSize: 13 },
  agendaDateHeader: { paddingVertical: 8, marginBottom: 4 },
  agendaDateLabel: { fontSize: 14, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#3b82f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  eventRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  eventIcon: { fontSize: 20, marginTop: 2 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  eventTime: { fontSize: 13, color: '#3b82f6', fontWeight: '600', marginBottom: 2 },
  eventMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#1e293b', fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
});
