import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Alert, Modal, TextInput,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePhotosStore } from '../../../src/store/photosStore';
import { useJobsStore } from '../../../src/store/jobsStore';

const COLS = 3;
const SIZE = (Dimensions.get('window').width - 40 - (COLS - 1) * 4) / COLS;

export default function PhotosScreen() {
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { photos, loading, capturePhoto, pickFromLibrary, fetchPhotos } = usePhotosStore();
  const { jobs, fetchJobs } = useJobsStore();

  const [jobId, setJobId] = useState(params.jobId || '');
  const [captionModal, setCaptionModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [pendingAction, setPendingAction] = useState<'camera' | 'library' | null>(null);
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    if (jobId) fetchPhotos(jobId);
  }, [jobId]);

  const startCapture = (action: 'camera' | 'library') => {
    if (!jobId) {
      setJobPickerOpen(true);
      return;
    }
    setPendingAction(action);
    setCaptionModal(true);
  };

  const executeCapture = async () => {
    setCaptionModal(false);
    if (!pendingAction || !jobId) return;

    try {
      if (pendingAction === 'camera') {
        await capturePhoto(jobId, caption.trim() || undefined);
      } else {
        await pickFromLibrary(jobId, caption.trim() || undefined);
      }
      setCaption('');
      fetchPhotos(jobId);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
    setPendingAction(null);
  };

  const jobName = jobs.find((j) => j.id === jobId)?.name;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Site Photos</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => startCapture('library')}>
              <Text style={styles.iconBtnText}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraBtn} onPress={() => startCapture('camera')}>
              <Text style={styles.cameraBtnText}>📷 Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Job filter */}
        {!params.jobId && (
          <TouchableOpacity
            style={styles.jobSelector}
            onPress={() => setJobPickerOpen(true)}
          >
            <Text style={styles.jobSelectorText}>
              {jobId ? `🔨 ${jobName}` : '📂 Select a job to view photos'}
            </Text>
            <Text style={{ color: '#94a3b8' }}>▾</Text>
          </TouchableOpacity>
        )}

        {params.jobId && jobName && (
          <View style={styles.jobBadge}>
            <Text style={styles.jobBadgeText}>🔨 {jobName}</Text>
          </View>
        )}

        {/* Photo grid */}
        {!jobId ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyText}>Select a job to view and add photos</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            numColumns={COLS}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={{ gap: 4 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedPhoto(item.localUri)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.localUri }} style={styles.thumb} />
                {!item.synced && (
                  <View style={styles.pendingOverlay}>
                    <Text style={styles.pendingIcon}>⏳</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📷</Text>
                <Text style={styles.emptyText}>No photos yet — tap 📷 to add one</Text>
              </View>
            }
            contentContainerStyle={{ gap: 4, paddingBottom: 32 }}
          />
        )}
      </View>

      {/* Caption modal */}
      <Modal visible={captionModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ padding: 24 }}>
            <Text style={styles.modalTitle}>
              {pendingAction === 'camera' ? '📷 Take Photo' : '🖼️ Choose Photo'}
            </Text>
            <Text style={{ color: '#64748b', marginBottom: 12 }}>Add a caption (optional)</Text>
            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="e.g. Foundation pour complete, north wall framing"
              placeholderTextColor="#94a3b8"
              multiline
              autoFocus
            />
            <TouchableOpacity style={styles.captureBtn} onPress={executeCapture}>
              <Text style={styles.captureBtnText}>
                {pendingAction === 'camera' ? 'Open Camera' : 'Choose from Library'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCaptionModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Job picker */}
      <Modal visible={jobPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Select Job</Text>
            <FlatList
              data={jobs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.jobRow}
                  onPress={() => {
                    setJobId(item.id);
                    setJobPickerOpen(false);
                    if (pendingAction) {
                      setCaptionModal(true);
                    }
                  }}
                >
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

      {/* Full screen photo viewer */}
      <Modal visible={!!selectedPhoto} animationType="fade" presentationStyle="fullScreen">
        <View style={styles.photoViewer}>
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.photoFull} resizeMode="contain" />
          )}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSelectedPhoto(null)}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { padding: 8 },
  iconBtnText: { fontSize: 24 },
  cameraBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  cameraBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  jobSelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1,
    borderColor: '#e2e8f0', marginBottom: 16,
  },
  jobSelectorText: { color: '#475569', fontSize: 14 },
  jobBadge: { backgroundColor: '#dbeafe', borderRadius: 8, padding: 10, marginBottom: 16 },
  jobBadgeText: { color: '#1d4ed8', fontWeight: '600' },
  thumb: { width: SIZE, height: SIZE, borderRadius: 6 },
  pendingOverlay: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2,
  },
  pendingIcon: { fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  captionInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1e293b', backgroundColor: '#fff', minHeight: 80,
    textAlignVertical: 'top', marginBottom: 20,
  },
  captureBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center' },
  captureBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { marginTop: 12, padding: 14, alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontSize: 16 },
  jobRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  jobRowText: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  jobRowSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  photoViewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  photoFull: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute', top: 56, right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
