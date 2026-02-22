import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabaseSafe, enqueueSync } from '../../../src/utils/database';
import { useJobsStore } from '../../../src/store/jobsStore';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';

const WEATHER_OPTIONS = ['☀️ Clear', '⛅ Partly Cloudy', '☁️ Overcast', '🌧️ Rain', '⛈️ Storm', '❄️ Snow', '🌫️ Fog'];

export default function DailyLogsScreen() {
  const params = useLocalSearchParams<{ jobId?: string; jobName?: string }>();
  const { jobs, fetchJobs } = useJobsStore();

  const [jobId, setJobId] = useState(params.jobId || '');
  const [weather, setWeather] = useState('');
  const [temperature, setTemperature] = useState('');
  const [workersOnSite, setWorkersOnSite] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [delays, setDelays] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  const handleSave = async () => {
    if (!jobId) {
      Alert.alert('Required', 'Select a job for this daily log.');
      return;
    }
    if (!workPerformed.trim()) {
      Alert.alert('Required', 'Describe the work performed today.');
      return;
    }

    setSaving(true);
    try {
      const db = await getDatabaseSafe();
      if (!db) throw new Error('Database unavailable');
      const id = uuid();
      const today = format(new Date(), 'yyyy-MM-dd');
      const { getSession } = await import('../../../src/utils/database');
      const session = await getSession();

      await db.runAsync(
        `INSERT INTO daily_logs (id, job_id, user_id, log_date, weather, temperature, workers_on_site, work_performed, delays, notes, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [id, jobId, session?.user_id || 'local', today, weather || null,
         temperature || null, workersOnSite ? parseInt(workersOnSite) : 0,
         workPerformed.trim(), delays.trim() || null, notes.trim() || null]
      );

      await enqueueSync({
        method: 'POST',
        endpoint: '/api/v1/daily-logs',
        body: {
          jobId, logDate: today, weather, temperature,
          workersOnSite: workersOnSite ? parseInt(workersOnSite) : 0,
          workPerformed: workPerformed.trim(),
          delays: delays.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        localId: id,
        entityType: 'daily_log',
      });

      setSaved(true);
      setTimeout(() => router.back(), 1000);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 64 }}>✅</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 16 }}>Log Saved</Text>
        <Text style={{ color: '#64748b', marginTop: 8 }}>Will sync when online</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Daily Log</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>

          {/* Job selector */}
          {!params.jobId && (
            <View style={styles.field}>
              <Text style={styles.label}>Job *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {jobs.map((j) => (
                  <TouchableOpacity
                    key={j.id}
                    onPress={() => setJobId(j.id)}
                    style={[styles.chip, jobId === j.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, jobId === j.id && styles.chipTextActive]}>
                      {j.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {params.jobId && (
            <View style={styles.jobBadge}>
              <Text style={styles.jobBadgeText}>🔨 {params.jobName}</Text>
            </View>
          )}

          {/* Weather */}
          <View style={styles.field}>
            <Text style={styles.label}>Weather</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {WEATHER_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w}
                  onPress={() => setWeather(weather === w ? '' : w)}
                  style={[styles.chip, weather === w && styles.chipActive]}
                >
                  <Text style={[styles.chipText, weather === w && styles.chipTextActive]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Two columns: temp + workers */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Temperature (°F)</Text>
              <TextInput
                style={styles.input}
                value={temperature}
                onChangeText={setTemperature}
                placeholder="72"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Workers on Site</Text>
              <TextInput
                style={styles.input}
                value={workersOnSite}
                onChangeText={setWorkersOnSite}
                placeholder="4"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Work performed */}
          <View style={styles.field}>
            <Text style={styles.label}>Work Performed *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={workPerformed}
              onChangeText={setWorkPerformed}
              placeholder="Describe what was completed today..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Delays */}
          <View style={styles.field}>
            <Text style={styles.label}>Delays / Issues</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={delays}
              onChangeText={setDelays}
              placeholder="Any delays, weather issues, or site problems..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other notes..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Daily Log'}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  back: { marginBottom: 8 },
  backText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  date: { color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#1e293b', backgroundColor: '#fff',
  },
  textarea: { minHeight: 100 },
  row: { flexDirection: 'row', gap: 12 },
  chip: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, marginRight: 8, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  jobBadge: { backgroundColor: '#dbeafe', borderRadius: 8, padding: 12, marginBottom: 20 },
  jobBadgeText: { color: '#1d4ed8', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
