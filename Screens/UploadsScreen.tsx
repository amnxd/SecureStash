import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import TopNavbar from '../components/TopNavbar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getFileIcon } from '../services/fileService';
import { pickAndUploadImage, pickAndUploadVideo, pickAndUploadDocument, captureAndUploadImage } from '../services/uploadService';
import { DEFAULT_USER_STORAGE_LIMIT_GB, DEFAULT_USER_STORAGE_LIMIT_BYTES } from '../config/quota';
import { subscribeUserUsage } from '../services/storageService';

interface Props { navigation: any; }

type Row = {
  id: string;
  name: string;
  kind?: string;
  contentType?: string;
  size?: number;
  created_at?: any;
  trashed?: boolean;
};

export default function UploadsScreen({ navigation }: Props) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [usedBytes, setUsedBytes] = useState(0);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // Order by created_at desc for upload history
    const sub = firestore()
      .collection('files')
      .where('owner_id', '==', user.uid)
      .orderBy('created_at', 'desc')
      .onSnapshot((snap) => {
        const rows: Row[] = [];
        snap.forEach((docSnap) => {
          const d: any = docSnap.data() || {};
          rows.push({ id: docSnap.id, name: d.name || 'Untitled', kind: d.kind, contentType: d.contentType, size: d.size, created_at: d.created_at, trashed: d.trashed });
        });
        setItems(rows);
        setLoading(false);
      }, (err) => { console.warn('uploads sub error', err); setLoading(false); });
    return () => sub();
  }, []);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user?.uid) return;
    const unsub = subscribeUserUsage(user.uid, setUsedBytes);
    return () => unsub();
  }, []);

  const onUpload = useCallback(async (which: 'image'|'video'|'document'|'camera') => {
    try {
      setBusy(true);
      if (which === 'image') await pickAndUploadImage();
      else if (which === 'video') await pickAndUploadVideo();
      else if (which === 'document') await pickAndUploadDocument();
      else await captureAndUploadImage();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const remainingBytes = Math.max(0, DEFAULT_USER_STORAGE_LIMIT_BYTES - usedBytes);
  const remainingGB = remainingBytes / (1024 * 1024 * 1024);
  const usedPct = Math.min(100, Math.round((usedBytes / DEFAULT_USER_STORAGE_LIMIT_BYTES) * 100));
  const atCap = usedBytes >= DEFAULT_USER_STORAGE_LIMIT_BYTES;
  const lowSpace = !atCap && usedPct >= 90;

  return (
    <View style={styles.container}>
      <TopNavbar navigation={navigation} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Uploads</Text>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Home')}
            accessibilityRole="button"
            accessibilityLabel="Go to Home"
          >
            <Icon name="home-outline" size={18} color="#111827" />
            <Text style={styles.homeBtnText}>Home</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Pick a file to upload and view your upload history.</Text>
        <View style={[
          styles.quotaBanner,
          atCap ? styles.quotaDanger : lowSpace ? styles.quotaWarn : styles.quotaOk,
        ]}>
          <Icon name="harddisk" size={18} color={atCap ? '#b91c1c' : lowSpace ? '#b45309' : '#065f46'} />
          <Text style={[styles.quotaText, atCap ? styles.quotaTextDanger : lowSpace ? styles.quotaTextWarn : styles.quotaTextOk]}>
            {atCap
              ? 'Storage full. Delete some files to continue uploading.'
              : `${remainingGB.toFixed(2)} GB of ${DEFAULT_USER_STORAGE_LIMIT_GB} GB remaining (${100 - usedPct}%)`}
          </Text>
        </View>
        <View style={styles.quickActionsRow}>
          <QuickAction label="Image" icon="image-outline" onPress={() => onUpload('image')} disabled={busy || atCap} />
          <QuickAction label="Video" icon="video-outline" onPress={() => onUpload('video')} disabled={busy || atCap} />
          <QuickAction label="Document" icon="file-document-outline" onPress={() => onUpload('document')} disabled={busy || atCap} />
          <QuickAction label="Camera" icon="camera-outline" onPress={() => onUpload('camera')} disabled={busy || atCap} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#6b7280" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}> 
          <Icon name="cloud-upload-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No uploads yet</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={ListSep}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <UploadRow item={item} />}
        />
      )}
    </View>
  );
}

function UploadRow({ item }: { item: Row }) {
  const meta = getFileIcon(item.name, item.kind, item.contentType);
  const dateStr = item.created_at?.toDate ? item.created_at.toDate().toLocaleString() : '';
  return (
    <View style={styles.row}>
      <Icon name={meta.icon} size={24} color={meta.color} />
      <View style={styles.rowTextWrap}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.metaText} numberOfLines={1}>{dateStr ? `Uploaded ${dateStr}` : ''}{item.trashed ? '  •  In Bin' : ''}</Text>
      </View>
    </View>
  );
}

function QuickAction({ label, icon, onPress, disabled }: { label: string; icon: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.quickBtn, disabled && styles.quickBtnDisabled]} onPress={onPress} disabled={disabled}>
      <Icon name={icon} size={18} color="#111827" />
      <Text style={styles.quickBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ListSep() { return <View style={styles.sep} />; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  quotaBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, marginBottom: 8 },
  quotaOk: { backgroundColor: '#ECFDF5' },
  quotaWarn: { backgroundColor: '#FFFBEB' },
  quotaDanger: { backgroundColor: '#FEF2F2' },
  quotaText: { marginLeft: 8, fontSize: 12, fontWeight: '600' },
  quotaTextOk: { color: '#065f46' },
  quotaTextWarn: { color: '#b45309' },
  quotaTextDanger: { color: '#b91c1c' },
  quickActionsRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  quickBtnText: { marginLeft: 6, color: '#111827', fontWeight: '600' },
  homeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  homeBtnText: { marginLeft: 6, color: '#111827', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 8, color: '#6b7280' },
  listContent: { paddingHorizontal: 20, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  rowTextWrap: { marginLeft: 8, flex: 1 },
  name: { color: '#111827', fontWeight: '600' },
  metaText: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  sep: { height: 6 },
  quickBtnDisabled: { opacity: 0.6 },
});
