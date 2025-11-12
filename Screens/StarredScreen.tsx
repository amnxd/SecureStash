import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import TopNavbar from '../components/TopNavbar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getFileIcon, getFileUrl, deleteFile } from '../services/fileService';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ActionSheet, { SheetAction } from '../components/ActionSheet';

type FileRecord = {
  id: string;
  name: string;
  kind?: 'image' | 'video' | 'document';
  path: string;
  size?: number;
  contentType?: string;
  created_at?: any;
  updated_at?: any;
  starred?: boolean;
};

interface StarredScreenProps { navigation: any; }

const StarredScreen: React.FC<StarredScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<FileRecord | null>(null);

  // Subscribe to starred files for current user
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const sub = firestore()
      .collection('files')
      .where('owner_id', '==', user.uid)
      .onSnapshot(
        (snap) => {
          const rows: FileRecord[] = [];
          snap.forEach((docSnap) => {
            const d = (docSnap.data() || {}) as any;
            rows.push({
              id: docSnap.id,
              name: d.name || 'Untitled',
              kind: d.kind,
              path: d.path,
              size: d.size,
              contentType: d.contentType,
              created_at: d.created_at,
              updated_at: d.updated_at,
              starred: d.starred === true,
            });
          });
          setFiles(rows.filter(r => r.starred));
          setLoading(false);
        },
        (err) => { console.warn('starred subscription error', err); setLoading(false); }
      );
    return () => sub();
  }, []);

  const onItemMenu = (item: FileRecord) => {
    setCurrentItem(item);
    setSheetVisible(true);
  };

  const sheetActions: SheetAction[] = currentItem ? [
    {
      key: 'open',
      label: 'Open',
      icon: 'open-in-new',
      onPress: async () => {
        try { const url = await getFileUrl(currentItem.path, 300); setSheetVisible(false); Linking.openURL(url); }
        catch (e:any) { Alert.alert('Open failed', e?.message || String(e)); }
      },
    },
    {
      key: 'copy',
      label: 'Copy link',
      icon: 'link-variant',
      onPress: async () => {
        try { const url = await getFileUrl(currentItem.path, 600); setSheetVisible(false); Clipboard.setString(url); Alert.alert('Copied', 'Signed link copied'); }
        catch (e:any) { Alert.alert('Link failed', e?.message || String(e)); }
      },
    },
    {
      key: 'unstar',
      label: 'Remove from starred',
      icon: 'star-off',
      onPress: async () => {
        try { await firestore().collection('files').doc(currentItem.id).update({ starred: false }); setSheetVisible(false); }
        catch (e:any) { Alert.alert('Update failed', e?.message || String(e)); }
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'delete',
      danger: true,
      onPress: async () => {
        try { await deleteFile(currentItem.id, currentItem.path); setSheetVisible(false); }
        catch (e:any) { Alert.alert('Delete failed', e?.message || String(e)); }
      },
    },
  ] : [];

  return (
    <View style={styles.container}>
      <TopNavbar navigation={navigation} />
      <View style={styles.header}>
        <Text style={styles.title}>Starred Files</Text>
        <Text style={styles.subtitle}>Files and folders you've starred will appear here</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="small" color="#22c55e" /></View>
      ) : files.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No starred files yet</Text>
          <Text style={styles.emptySubtext}>Star important files to quickly access them later</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FileRow item={item} onMenu={onItemMenu} />}
          ItemSeparatorComponent={ListSep}
          contentContainerStyle={styles.listContent}
        />
      )}

      <ActionSheet
        isVisible={sheetVisible}
        title={currentItem?.name}
        actions={sheetActions}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
};

function FileRow({ item, onMenu }: { item: FileRecord; onMenu: (it: FileRecord) => void }) {
  const meta = getFileIcon(item.name, item.kind, item.contentType);
  return (
    <View style={styles.fileItem}>
      {meta.icon === 'image' ? (
        <Thumbnail path={item.path} />
      ) : (
        <Icon name={meta.icon} size={24} color={meta.color} />
      )}
      <Text style={styles.fileText} numberOfLines={1}>{item.name}</Text>
      <View style={styles.flexSpacer} />
      {item.starred ? <Icon name="star" size={18} color="#f59e0b" style={styles.starIcon} /> : null}
      <TouchableOpacity onPress={() => onMenu(item)}>
        <Icon name="dots-vertical" size={22} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
}

function Thumbnail({ path }: { path: string }) {
  const [url, setUrl] = React.useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try { const u = await getFileUrl(path, 120); if (mounted) setUrl(u); } catch {}
    })();
    return () => { mounted = false; };
  }, [path]);
  if (!url) return <Icon name="image" size={24} color="#9CA3AF" />;
  return <Image source={{ uri: url }} style={styles.thumb} />;
}

function ListSep() { return <View style={styles.sep} />; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fileItem: {
    flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderRadius: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  fileText: { marginLeft: 8, fontSize: 14, color: '#111827', maxWidth: '65%' },
  thumb: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#E5E7EB' },
  sep: { height: 6 },
  listContent: { paddingHorizontal: 20, paddingBottom: 16 },
  flexSpacer: { flex: 1 },
  starIcon: { marginRight: 8 },
});

export default StarredScreen;