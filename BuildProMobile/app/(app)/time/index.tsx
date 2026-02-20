import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, Modal, TextInput,
} from 'react-native';
import { useTimeStore } from '../../../src/store/timeStore';
import { useJobsStore } from '../../../src/store/jobsStore';
import { format, formatDuration, intervalToDuration } from 'date-fns';

function formatSeconds(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TimeScreen() {
  const { activeEntry, entries, clockIn, clockOut, fetchEntries, loadActiveEntry } = useTimeStore();
  const { jobs, fetchJobs } = useJobsStore();
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [ticking, setTicking] = useState(0);

  useEffect(() => {
    loadActiveEntry();
    fetchEntries();
    fetchJobs();
  }, []);

  // Live timer tick
  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => setTicking((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const activeDuration = activeEntry
    ? intervalToDuration({ start: new Date(activeEntry.clockIn), end: new Date() })
    : null;

  const handleClockIn = async (jobId?: string) => {
    setJobPickerOpen(false);
    try {
      await clockIn(jobId);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleClockOut = async () => {
    setClockOutOpen(false);
    try {
      await clockOut(clockOutNotes || undefined);
      setClockOutNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Time Tracking</Text>

        {/* Clock in/out card */}
        <View style={styles.clockCard}>
          {activeEntry ? (
            <>
              <Text style={styles.clockStatus}>⏱️ Currently Clocked In</Text>
              <Text style={styles.clockBig}>
                {activeDuration ? `${activeDuration.hours || 0}:${String(activeDuration.minutes || 0).padStart(2, '0')}:${String(activeDuration.seconds || 0).padStart(2, '0')}` : '0:00:00'}
              </Text>
              <Text style={styles.clockSince}>
                Since {format(new Date(activeEntry.clockIn), 'h:mm a')}
                {activeEntry.jobName ? `  ·  ${activeEntry.jobName}` : ''}
              </Text>
              <TouchableOpacity
                style={styles.clockOutBtn}
                onPress={() => setClockOutOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.clockOutText}>Clock Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.clockStatus}>Not Clocked In</Text>
              <Text style={styles.clockBig}>—</Text>
              <TouchableOpacity
                style={styles.clockInBtn}
                onPress={() => setJobPickerOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.clockInText}>Clock In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryJob}>{item.jobName || 'No job selected'}</Text>
                <Text style={styles.entryDate}>
                  {format(new Date(item.clockIn), 'EEE MMM d  ·  h:mm a')}
                  {item.clockOut ? ` – ${format(new Date(item.clockOut), 'h:mm a')}` : ' (active)'}
                </Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryDuration}>
                  {item.duration ? formatSeconds(item.duration) : '—'}
                </Text>
                {!item.synced && <Text style={styles.pendingDot}>⏳</Text>}
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<Text style={styles.empty}>No time entries yet</Text>}
        />
      </View>

      {/* Job picker modal */}
      <Modal visible={jobPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Select a Job</Text>
            <TouchableOpacity onPress={() => handleClockIn(undefined)} style={styles.jobRow}>
              <Text style={styles.jobRowText}>No specific job</Text>
            </TouchableOpacity>
            <FlatList
              data={jobs.filter((j) => j.status === 'active' || j.status === 'in_progress')}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleClockIn(item.id)} style={styles.jobRow}>
                  <Text style={styles.jobRowText}>{item.name}</Text>
                  {item.address && <Text style={styles.jobRowSub}>{item.address}</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setJobPickerOpen(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Clock out notes modal */}
      <Modal visible={clockOutOpen} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Clock Out</Text>
            <Text style={{ color: '#64748b', marginBottom: 12 }}>Add notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={clockOutNotes}
              onChangeText={setClockOutNotes}
              placeholder="What did you work on?"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={styles.clockOutBtn} onPress={handleClockOut}>
              <Text style={styles.clockOutText}>Confirm Clock Out</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setClockOutOpen(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  clockCard: { backgroundColor: '#1e3a5f', borderRadius: 16, padding: 24, marginBottom: 28, alignItems: 'center' },
  clockStatus: { color: '#93c5fd', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  clockBig: { fontSize: 52, fontWeight: '800', color: '#fff', marginBottom: 8, fontVariant: ['tabular-nums'] },
  clockSince: { color: '#93c5fd', fontSize: 13, marginBottom: 20 },
  clockInBtn: { backgroundColor: '#10b981', borderRadius: 10, paddingHorizontal: 48, paddingVertical: 14 },
  clockInText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  clockOutBtn: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 48, paddingVertical: 14 },
  clockOutText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  entryCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginBottom: 8, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  entryJob: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  entryDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  entryRight: { alignItems: 'flex-end' },
  entryDuration: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  pendingDot: { fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 32, fontSize: 15 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  jobRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  jobRowText: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  jobRowSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cancelBtn: { marginTop: 16, padding: 14, alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontSize: 16 },
  notesInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1e293b', backgroundColor: '#fff',
    minHeight: 100, textAlignVertical: 'top', marginBottom: 20,
  },
});
