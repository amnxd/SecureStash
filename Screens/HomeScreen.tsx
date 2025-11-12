import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable, FlatList, ActivityIndicator, Image, Modal } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TopNavbar from "../components/TopNavbar";
import StarredScreen from "./StarredScreen";
import SharedScreen from "./SharedScreen";
import { pickAndUploadImage, pickAndUploadVideo, pickAndUploadDocument } from "../services/uploadService";
import { Alert } from "react-native";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getFileUrl, getFileIcon, moveToBin } from '../services/fileService';
import { verifyFilePassword, setFilePassword, clearFilePasswordWithAccountAuth, setFilePasswordWithAccountAuth } from '../services/fileProtectionService';
import InputModal from '../components/InputModal';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { makeAvailableOffline, removeOffline, isOffline } from '../services/offlineService';
import ActionSheet, { SheetAction } from '../components/ActionSheet';

// Define the tab param list to align with React Navigation types
type RootTabParamList = {
  Home: undefined;
  Starred: undefined;
  Shared: undefined;
};

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
  trashed?: boolean;
  password_protected?: boolean;
};

// --- Screens ---
export const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<FileRecord | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<FileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [onPromptConfirm, setOnPromptConfirm] = useState<(val: string)=>void>(()=>()=>{});
  // Optional WebView support without hard dependency during compile
  let WebViewComp: any = null;
  try { WebViewComp = (require('react-native-webview') as any).WebView; } catch {}
  
  const onItemMenu = (item: FileRecord) => {
    setCurrentItem(item);
    setSheetVisible(true);
  };

  const openInlinePreview = async (item: FileRecord) => {
    try {
      if (item.password_protected) {
        // ask for file password first
  setPromptTitle('Enter file password');
        setOnPromptConfirm(() => async (val: string) => {
          setPromptVisible(false);
          const ok = await verifyFilePassword(item.id, val);
          if (!ok) { Alert.alert('Incorrect password'); return; }
          const url = await getFileUrl(item.path, 600);
          setPreviewItem(item);
          setPreviewUrl(url);
          setPreviewVisible(true);
        });
        setPromptVisible(true);
        return;
      }
      const url = await getFileUrl(item.path, 600);
      setPreviewItem(item);
      setPreviewUrl(url);
      setPreviewVisible(true);
    } catch (e: any) {
      Alert.alert('Open failed', e?.message || String(e));
    }
  };

  const sheetActions: SheetAction[] = currentItem ? [
    {
      key: 'share',
      label: 'Share',
      icon: 'share-variant',
      onPress: async () => {
        setSheetVisible(false);
        // Navigate to Shared screen in manage mode with the selected file id
        try {
          navigation.navigate('Shared', { fileId: currentItem.id, fileName: currentItem.name });
        } catch {}
      },
    },
    {
      key: 'open',
      label: 'Open',
      icon: 'open-in-new',
      onPress: async () => {
        try {
          if (currentItem.password_protected) {
            setSheetVisible(false);
            setPromptTitle('Enter file password');
            setOnPromptConfirm(() => async (val: string) => {
              setPromptVisible(false);
              const ok = await verifyFilePassword(currentItem.id, val);
              if (!ok) { Alert.alert('Incorrect password'); return; }
              const url = await getFileUrl(currentItem.path, 300);
              Linking.openURL(url);
            });
            setPromptVisible(true);
            return;
          }
          const url = await getFileUrl(currentItem.path, 300);
          setSheetVisible(false);
          Linking.openURL(url);
        } catch (e: any) {
          Alert.alert('Open failed', e?.message || String(e));
        }
      },
    },
    {
      key: 'copy',
      label: 'Copy link',
      icon: 'link-variant',
      onPress: async () => {
        try {
          if (currentItem.password_protected) {
            setSheetVisible(false);
            setPromptTitle('Enter file password');
            setOnPromptConfirm(() => async (val: string) => {
              setPromptVisible(false);
              const ok = await verifyFilePassword(currentItem.id, val);
              if (!ok) { Alert.alert('Incorrect password'); return; }
              const url = await getFileUrl(currentItem.path, 600);
              Clipboard.setString(url);
              Alert.alert('Copied', 'Signed link copied to clipboard');
            });
            setPromptVisible(true);
            return;
          }
          const url = await getFileUrl(currentItem.path, 600);
          setSheetVisible(false);
          Clipboard.setString(url);
          Alert.alert('Copied', 'Signed link copied to clipboard');
        } catch (e: any) {
          Alert.alert('Link failed', e?.message || String(e));
        }
      },
    },
    {
      key: 'star',
      label: currentItem.starred ? 'Remove from starred' : 'Add to starred',
      icon: currentItem.starred ? 'star-off' : 'star',
      onPress: async () => {
            try {
              const db = getFirestore();
              const ref = doc(collection(db, 'files'), currentItem.id);
              await updateDoc(ref as any, { starred: !currentItem.starred } as any);
              setSheetVisible(false);
            } catch (e: any) {
              Alert.alert('Star failed', e?.message || String(e));
            }
      },
    },
    {
      key: 'offline',
      label: 'Make available offline',
      icon: 'download',
      onPress: async () => {
        try {
          const offline = await isOffline(currentItem.id);
          if (offline) {
            await removeOffline(currentItem.id);
            Alert.alert('Offline', 'Removed local copy');
          } else {
            const local = await makeAvailableOffline(currentItem.id, currentItem.name, currentItem.path, currentItem.size);
            Alert.alert('Offline', `Saved to: ${local}`);
          }
          setSheetVisible(false);
        } catch (e: any) {
          Alert.alert('Offline failed', e?.message || String(e));
        }
      },
    },
    // Password protection actions
    ...(!currentItem.password_protected ? [
      {
        key: 'protect',
        label: 'Protect with password',
        icon: 'lock-outline',
        onPress: async () => {
          setSheetVisible(false);
          setPromptTitle('Set file password');
          setOnPromptConfirm(() => async (val: string) => {
            setPromptVisible(false);
            if (!val || val.length < 4) { Alert.alert('Password too short'); return; }
            try { await setFilePassword(currentItem.id, val); Alert.alert('Protected', 'Password set for this file'); }
            catch (e:any) { Alert.alert('Failed', e?.message || String(e)); }
          });
          setPromptVisible(true);
        },
      },
    ] : [
      {
        key: 'change-pass',
        label: 'Change file password',
        icon: 'lock-reset',
        onPress: async () => {
          setSheetVisible(false);
          // Step 1: ask for account password
          setPromptTitle('Enter your account password');
          setOnPromptConfirm(() => async (accountPass: string) => {
            setPromptVisible(false);
            // Step 2: ask for new file password
            setTimeout(() => {
              setPromptTitle('Enter new file password');
              setOnPromptConfirm(() => async (newPass: string) => {
                setPromptVisible(false);
                if (!newPass || newPass.length < 4) { Alert.alert('Password too short'); return; }
                try {
                  const email = auth().currentUser?.email || '';
                  await setFilePasswordWithAccountAuth(currentItem.id, newPass, email, accountPass);
                  Alert.alert('Updated', 'File password updated');
                } catch (e:any) { Alert.alert('Failed', e?.message || String(e)); }
              });
              setPromptVisible(true);
            }, 300);
          });
          setPromptVisible(true);
        },
      },
      {
        key: 'remove-pass',
        label: 'Remove file password',
        icon: 'lock-open-variant',
        onPress: async () => {
          setSheetVisible(false);
          setPromptTitle('Enter your account password');
          setOnPromptConfirm(() => async (accountPass: string) => {
            setPromptVisible(false);
            try {
              const email = auth().currentUser?.email || '';
              await clearFilePasswordWithAccountAuth(currentItem.id, email, accountPass);
              Alert.alert('Removed', 'Password protection removed');
            } catch (e:any) { Alert.alert('Failed', e?.message || String(e)); }
          });
          setPromptVisible(true);
        },
      },
    ]),
    {
      key: 'delete',
      label: 'Move to bin',
      icon: 'delete',
      danger: true,
      onPress: async () => {
        Alert.alert(
          'Move to bin',
          `Move "${currentItem.name}" to bin?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Move', style: 'destructive', onPress: async () => {
              try { await moveToBin(currentItem.id); setSheetVisible(false); }
              catch (e:any) { Alert.alert('Move failed', e?.message || String(e)); }
            }}
          ]
        );
      },
    },
  ] : [];

  // Subscribe to current user's files in Firestore
  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
  const db = getFirestore();
  const q = query(collection(db, 'files'), where('owner_id', '==', user.uid));
    // No orderBy to avoid composite index requirement for now
    const sub = onSnapshot(q as any,
      (snap: any) => {
        const rows: FileRecord[] = [];
        snap.forEach((docSnap: any) => {
          const d = docSnap.data() || {} as any;
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
            trashed: d.trashed === true,
            password_protected: d.password_protected === true,
          });
        });
        setFiles(rows.filter(r => !r.trashed));
        setLoading(false);
      },
      (err: any) => {
        console.warn('files subscription error', err);
        setLoading(false);
      }
    );
    return () => sub();
  }, []);

  return (
    <View style={styles.container}>
      <TopNavbar navigation={navigation} />
      {/* Files header with list/grid toggle */}
      <View style={styles.filesHeaderRow}>
        <Text style={styles.filesHeaderTitle}>Files</Text>
        <View style={styles.viewToggleWrap}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' ? styles.toggleBtnActive : styles.toggleBtnIdle]}
            onPress={() => setViewMode('list')}
            accessibilityLabel="List view"
          >
            <Icon name="view-list" size={18} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'grid' ? styles.toggleBtnActive : styles.toggleBtnIdle]}
            onPress={() => setViewMode('grid')}
            accessibilityLabel="Grid view"
          >
            <Icon name="view-grid" size={18} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      {/* File list or empty state */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#22c55e" />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="cloud-upload-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No files yet</Text>
          <Text style={styles.emptySubtitle}>Use the + button to upload images, videos, or documents</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          key={viewMode}
          data={files}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FileRow item={item} onMenu={onItemMenu} onOpen={openInlinePreview} />
          )}
          ItemSeparatorComponent={ListSep}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          key={viewMode}
          data={files}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <FileTile item={item} onMenu={onItemMenu} onOpen={openInlinePreview} />
          )}
          contentContainerStyle={styles.gridContent}
        />
      )}

      {/* Backdrop for Plus Menu */}
      {showPlusMenu && (
        <Pressable style={styles.backdrop} onPress={() => setShowPlusMenu(false)} />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowPlusMenu(!showPlusMenu)}
      >
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Plus Menu */}
      {showPlusMenu && (
        <View style={styles.plusMenu}>
          <TouchableOpacity style={styles.plusMenuItem} onPress={async () => { 
            setShowPlusMenu(false);
            try {
              const res = await pickAndUploadImage();
              if (res) Alert.alert('Uploaded', res.storagePath);
            } catch (e:any) { Alert.alert('Upload failed', e?.message || String(e)); }
          }}>
            <Icon name="image-plus" size={20} color="#22c55e" />
            <Text style={styles.plusMenuText}>Upload Image</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.plusMenuItem} onPress={async () => {
            setShowPlusMenu(false);
            try {
              const res = await pickAndUploadVideo();
              if (res) Alert.alert('Uploaded', res.storagePath);
            } catch (e:any) { Alert.alert('Upload failed', e?.message || String(e)); }
          }}>
            <Icon name="video-plus" size={20} color="#22c55e" />
            <Text style={styles.plusMenuText}>Upload Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.plusMenuItem} onPress={async () => { 
            setShowPlusMenu(false);
            try {
              const res = await pickAndUploadDocument();
              if (res) Alert.alert('Uploaded', res.storagePath);
            } catch (e:any) { Alert.alert('Upload failed', e?.message || String(e)); }
          }}>
            <Icon name="file-document-plus" size={20} color="#22c55e" />
            <Text style={styles.plusMenuText}>Upload Document</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modern Action Sheet */}
      <ActionSheet
        isVisible={sheetVisible}
        title={currentItem?.name}
        actions={sheetActions}
        onClose={() => setSheetVisible(false)}
      />

      {/* Inline Preview Modal */}
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewVisible(false)} />
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle} numberOfLines={1}>{previewItem?.name || 'Preview'}</Text>
            <TouchableOpacity onPress={() => setPreviewVisible(false)}>
              <Icon name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
          <View style={styles.previewBody}>
            {previewItem?.kind === 'image' || (previewItem?.contentType || '').startsWith('image/') ? (
              previewUrl ? <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" /> : <ActivityIndicator />
            ) : WebViewComp && previewUrl ? (
              <WebViewComp source={{ uri: previewUrl }} style={styles.previewWeb} />
            ) : (
              <View style={styles.previewFallback}>
                <Icon name="file-eye-outline" size={36} color="#6b7280" />
                <Text style={styles.previewFallbackText}>Preview not available</Text>
                {previewUrl ? (
                  <TouchableOpacity style={styles.openExternalBtn} onPress={() => { setPreviewVisible(false); Linking.openURL(previewUrl!); }}>
                    <Text style={styles.openExternalText}>Open externally</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Password/Input Prompt */}
      <InputModal
        visible={promptVisible}
        title={promptTitle}
        placeholder="Password"
        secureTextEntry={true}
        onConfirm={onPromptConfirm}
        onCancel={() => setPromptVisible(false)}
      />
    </View>
  );
};

// --- Bottom Tab Navigator ---
const Tab = createBottomTabNavigator<RootTabParamList>();

const getTabBarIcon = (routeName: string, color: string, size?: number) => {
  let iconName: string = "help-circle";
  if (routeName === "Home") iconName = "view-dashboard";
  if (routeName === "Starred") iconName = "star";
  if (routeName === "Shared") iconName = "account-group";
  return <Icon name={iconName} size={size || 24} color={color} />;
};

export default function Home() {
  return (
    // @ts-ignore - React Navigation v7 typing mismatch with JSX children in this TS version
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size }) => getTabBarIcon(route.name, color, size),
        tabBarActiveTintColor: "#22c55e",
        tabBarInactiveTintColor: "#6b7280",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Starred" component={StarredScreen} />
      <Tab.Screen name="Shared" component={SharedScreen} />
    </Tab.Navigator>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ecfdf5",
    padding: 12,
  },
  filesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filesHeaderTitle: {
    fontSize: 18,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  viewToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#cbd5e1',
  },
  toggleBtnIdle: {
    backgroundColor: '#dbeafe',
    opacity: 0.6,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 900,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  plusMenu: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    minWidth: 180,
    zIndex: 1000,
  },
  plusMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  plusMenuText: {
    fontSize: 14,
    color: "#111827",
    marginLeft: 12,
    fontWeight: "500",
  },
  // Preview modal styles
  previewBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  previewCard: {
    position: 'absolute',
    top: '10%',
    left: 16,
    right: 16,
    bottom: '10%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 12,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  previewBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  previewWeb: { width: '100%', height: '100%' },
  previewFallback: { alignItems: 'center' },
  previewFallbackText: { marginTop: 8, color: '#6b7280' },
  openExternalBtn: { marginTop: 10, backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  openExternalText: { color: '#111827', fontWeight: '600' },
  // removed old tabs styles
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  fileText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#111827",
  },
  flexSpacer: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingVertical: 6,
  },
  gridContent: {
    paddingVertical: 6,
    gap: 10,
  },
  gridRow: {
    gap: 10,
    justifyContent: 'space-between',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sep: {
    height: 6,
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  starIcon: {
    marginRight: 8,
  },
  // Grid tile styles
  tileWrap: { flex: 1, minWidth: 0 },
  tileCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, height: 150 },
  tileActionsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  tilePreviewWrap: { alignItems: 'center', paddingVertical: 6 },
  tileName: { marginTop: 6, color: '#111827', fontSize: 12, fontWeight: '600' },
  tileStar: { marginTop: 4 },
  tileImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#E5E7EB' },
});

function ListSep() {
  return <View style={styles.sep} />;
}

function FileRow({ item, onMenu, onOpen }: { item: FileRecord; onMenu: (item: FileRecord) => void; onOpen: (item: FileRecord) => void | Promise<void> }) {
  const meta = getFileIcon(item.name, item.kind, item.contentType);
  return (
    <TouchableOpacity style={styles.fileItem} activeOpacity={0.8} onPress={() => onOpen(item)}>
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
    </TouchableOpacity>
  );
}

function FileTile({ item, onMenu, onOpen }: { item: FileRecord; onMenu: (item: FileRecord) => void; onOpen: (item: FileRecord) => void | Promise<void> }) {
  const meta = getFileIcon(item.name, item.kind, item.contentType);
  return (
    <View style={styles.tileWrap}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onOpen(item)} style={styles.tileCard}>
        <View style={styles.tileActionsRow}>
          <TouchableOpacity onPress={() => onMenu(item)}>
            <Icon name="dots-vertical" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.tilePreviewWrap}>
          {meta.icon === 'image' ? (
            <LargeThumbnail path={item.path} />
          ) : (
            <Icon name={meta.icon} size={36} color={meta.color} />
          )}
        </View>
        <Text numberOfLines={2} style={styles.tileName}>{item.name}</Text>
        {item.starred ? <Icon name="star" size={16} color="#f59e0b" style={styles.tileStar} /> : null}
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

function LargeThumbnail({ path }: { path: string }) {
  const [url, setUrl] = React.useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try { const u = await getFileUrl(path, 180); if (mounted) setUrl(u); } catch {}
    })();
    return () => { mounted = false; };
  }, [path]);
  if (!url) return <Icon name="image" size={36} color="#9CA3AF" />;
  return <Image source={{ uri: url }} style={styles.tileImage} />;
}