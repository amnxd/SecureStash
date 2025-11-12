import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from '@react-native-firebase/firestore';

const db = getFirestore();

export async function getUserUsageBytes(userId: string): Promise<number> {
  const q = query(collection(db, 'files'), where('owner_id', '==', userId));
  const snap = await getDocs(q as any);
  let total = 0;
  snap.forEach((doc: any) => {
    const d: any = doc.data() || {};
    const size = typeof d.size === 'number' ? d.size : 0;
    total += size;
  });
  return total;
}

export function subscribeUserUsage(userId: string, onChange: (bytes: number) => void): () => void {
  const q = query(collection(db, 'files'), where('owner_id', '==', userId));
  const unsub = onSnapshot(q as any, (snap: any) => {
    let total = 0;
    snap.forEach((doc: any) => {
      const d: any = doc.data() || {};
      const size = typeof d.size === 'number' ? d.size : 0;
      total += size;
    });
    onChange(total);
  });
  return unsub as () => void;
}

export function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}
