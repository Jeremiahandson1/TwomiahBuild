import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase, enqueueSync } from '../../../src/utils/database';
import { v4 as uuid } from 'uuid';

interface Task {
  id: string;
  serverId?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  synced: boolean;
}

export default function TasksScreen() {
  const { jobId, jobName } = useLocalSearchParams<{ jobId: string; jobName: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Task>(
      `SELECT id, server_id as serverId, title, description, status, synced
       FROM tasks WHERE job_id = ? ORDER BY updated_at DESC`,
      [jobId]
    );
    setTasks(rows);
  };

  const toggleStatus = async (task: Task) => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET status = ?, completed_at = ?, updated_at = ?, synced = 0 WHERE id = ?`,
      [next, next === 'completed' ? now : null, now, task.id]
    );
    await enqueueSync({
      method: task.serverId ? 'PATCH' : 'PUT',
      endpoint: `/api/v1/jobs/${jobId}/tasks/${task.serverId || task.id}`,
      body: { status: next },
      entityType: 'task',
    });
    loadTasks();
  };

  const addTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Enter a task name.');
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      const id = uuid();
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO tasks (id, job_id, title, description, status, synced, updated_at)
         VALUES (?, ?, ?, ?, 'pending', 0, ?)`,
        [id, jobId, newTitle.trim(), newDesc.trim() || null, now]
      );

      await enqueueSync({
        method: 'POST',
        endpoint: `/api/v1/jobs/${jobId}/tasks`,
        body: { title: newTitle.trim(), description: newDesc.trim() || undefined },
        localId: id,
        entityType: 'task',
      });

      setNewTitle('');
      setNewDesc('');
      setAddOpen(false);
      loadTasks();
    } finally {
      setSaving(false);
    }
  };

  const completed = tasks.filter((t) => t.status === 'completed').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← {jobName}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Tasks</Text>
            <Text style={styles.progress}>
              {completed}/{tasks.length} complete
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completed / tasks.length) * 100}%` }]} />
          </View>
        )}

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.taskCard, item.status === 'completed' && styles.taskDone]}
              onPress={() => toggleStatus(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, item.status === 'completed' && styles.checkboxDone]}>
                {item.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, item.status === 'completed' && styles.taskTitleDone]}>
                  {item.title}
                </Text>
                {item.description && (
                  <Text style={styles.taskDesc}>{item.description}</Text>
                )}
              </View>
              {!item.synced && <Text style={styles.pendingDot}>⏳</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No tasks yet — add one to get started</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>

      {/* Add task modal */}
      <Modal visible={addOpen} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <View style={{ padding: 24 }}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Task name"
                placeholderTextColor="#94a3b8"
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: 12, minHeight: 80 }]}
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Description (optional)"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={addTask}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add Task'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAddOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  back: { marginBottom: 8 },
  backText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  progress: { color: '#64748b', fontSize: 14, marginTop: 2 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  progressBar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  taskDone: { opacity: 0.65 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
  },
  checkboxDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  taskDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  pendingDot: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#1e293b', backgroundColor: '#fff',
  },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontSize: 16 },
});
