import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import TopNavbar from '../components/TopNavbar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getFileIcon, deleteFile, restoreFromBin } from '../services/fileService';

interface Props { navigation: any; }

export default function BinScreen({ navigation }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const sub = firestore()
      .collection('files')
      .where('owner_id', '==', user.uid)
      .where('trashed', '==', true)
      .onSnapshot((snap) => {
        const rows: any[] = [];
        snap.forEach((docSnap) => {
          const d: any = docSnap.data() || {};
          rows.push({ id: docSnap.id, name: d.name || 'Untitled', kind: d.kind, contentType: d.contentType, path: d.path, size: d.size });
        });
        setItems(rows);
        setLoading(false);
      }, (err) => { console.warn('bin sub error', err); setLoading(false); });
    return () => sub();
  }, []);

  return (
    <View style={styles.container}>
      <TopNavbar navigation={navigation} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Bin</Text>
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
        <Text style={styles.subtitle}>Items moved to bin. Permanently delete or restore.</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}> 
          <Icon name="trash-can-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Bin is empty</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={ListSep}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <BinRow item={item} />}
        />
      )}
    </View>
  );
}

function BinRow({ item }: { item: any }) {
  const meta = getFileIcon(item.name, item.kind, item.contentType);
  return (
    <View style={styles.row}>
      <Icon name={meta.icon} size={24} color={meta.color} />
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
  <View style={styles.flexSpacer} />
      <TouchableOpacity style={styles.pill} onPress={() => {
        Alert.alert('Restore', `Restore "${item.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', onPress: async ()=>{ try { await restoreFromBin(item.id); } catch (e:any){ Alert.alert('Restore failed', e?.message || String(e)); } } }
        ]);
      }}>
        <Text style={styles.pillText}>Restore</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.pill, styles.danger]} onPress={() => {
        Alert.alert('Delete permanently', `This will permanently delete "${item.name}". Continue?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async ()=>{ try { await deleteFile(item.id, item.path); } catch (e:any){ Alert.alert('Delete failed', e?.message || String(e)); } } }
        ]);
      }}>
        <Text style={[styles.pillText, styles.dangerText]}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 8, color: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  name: { marginLeft: 8, color: '#111827', maxWidth: '55%' },
  pill: { marginLeft: 8, backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  pillText: { color: '#111827', fontWeight: '600' },
  danger: { backgroundColor: '#FEE2E2' },
  dangerText: { color: '#b91c1c' },
  listContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sep: { height: 6 },
  flexSpacer: { flex: 1 },
  homeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  homeBtnText: { marginLeft: 6, color: '#111827', fontWeight: '600' },
});

function ListSep() { return <View style={styles.sep} />; }
