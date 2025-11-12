import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';

const db = getFirestore();

export type SharePermission = 'read' | 'write';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Path helpers
const fileDoc = (fileId: string) => doc(collection(db, 'files'), fileId);
const sharesCol = (fileId: string) => collection(db, 'files', fileId, 'shares');

export async function shareFileByEmail(fileId: string, ownerUid: string, email: string, permission: SharePermission, ownerEmail?: string) {
  const em = normalizeEmail(email);
  const ref = doc(sharesCol(fileId), em);
  await setDoc(ref as any, {
    email: em,
    permission,
    owner_id: ownerUid,
    owner_email: ownerEmail ? normalizeEmail(ownerEmail) : undefined,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  }, { merge: true } as any);
}

export async function updateSharePermission(fileId: string, email: string, permission: SharePermission) {
  const em = normalizeEmail(email);
  const ref = doc(sharesCol(fileId), em);
  await updateDoc(ref as any, { permission, updated_at: serverTimestamp() } as any);
}

export async function revokeShare(fileId: string, email: string) {
  const em = normalizeEmail(email);
  const ref = doc(sharesCol(fileId), em);
  await deleteDoc(ref as any);
}

export type SharedFileRecord = {
  id: string;
  name: string;
  path: string;
  kind?: 'image'|'video'|'document';
  contentType?: string;
  size?: number;
  owner_id?: string;
  ownerEmail?: string;
  permission: SharePermission;
  password_protected?: boolean;
};

// Subscribe to all files shared with a specific email address.
// Uses collectionGroup on `shares`. For each share doc we fetch its parent `files/{id}` document.
export function subscribeSharedWithMe(email: string, onChange: (rows: SharedFileRecord[]) => void, onError?: (e:any) => void) {
  const em = normalizeEmail(email);
  const q = query(collectionGroup(db, 'shares'), where('email', '==', em));
  const sub = onSnapshot(q as any, async (snap: any) => {
    try {
      const tasks = snap.docs.map(async (shareDoc: any) => {
        const permission: SharePermission = (shareDoc.data()?.permission as SharePermission) || 'read';
        const ownerEmail: string | undefined = (shareDoc.data()?.owner_email as string | undefined) || undefined;
        const fileRef = shareDoc.ref.parent.parent; // files/{fileId}
        if (!fileRef) return null;
        const fileSnap = await getDoc(fileRef as any);
        if (!fileSnap.exists) return null;
        const d: any = fileSnap.data() || {};
        return {
          id: fileSnap.id,
          name: d.name || 'Untitled',
          path: d.path,
          kind: d.kind,
          contentType: d.contentType,
          size: d.size,
          owner_id: d.owner_id,
          ownerEmail,
          permission,
          password_protected: d.password_protected === true,
        } as SharedFileRecord;
      });
      const rows = (await Promise.all(tasks)).filter(Boolean) as SharedFileRecord[];
      onChange(rows);
    } catch (e) {
      onError && onError(e);
    }
  }, (err: any) => onError && onError(err));
  return sub;
}

export function subscribeSharesForFile(fileId: string, onChange: (rows: {email: string; permission: SharePermission}[]) => void, onError?: (e:any)=>void) {
  const sub = onSnapshot(sharesCol(fileId) as any, (snap: any) => {
    const rows: {email: string; permission: SharePermission}[] = [];
    snap.forEach((docSnap: any) => {
      const d: any = docSnap.data() || {};
      rows.push({ email: d.email || docSnap.id, permission: (d.permission as SharePermission) || 'read' });
    });
    onChange(rows);
  }, (err: any) => onError && onError(err));
  return sub;
}

/*
  NOTE: Firestore Security Rules (pseudo):
  - Allow file owner full access to files/{fileId} and subcollection shares.
  - Allow users to read files/{fileId} if a matching shares doc exists with their email.
  - Allow writes (e.g., metadata updates) only if shares permission == 'write'.

  match /databases/{db}/documents {
    function isOwner(file) {
      return request.auth != null && file.data.owner_id == request.auth.uid;
    }
    function isSharedWith(fileId) {
      return exists(/databases/$(db)/documents/files/$(fileId)/shares/$(request.auth.token.email));
    }
    function hasWrite(fileId) {
      return get(/databases/$(db)/documents/files/$(fileId)/shares/$(request.auth.token.email)).data.permission == 'write';
    }

    match /files/{fileId} {
      allow read: if isOwner(resource) || isSharedWith(fileId);
      allow update, delete: if isOwner(resource) || hasWrite(fileId);
      allow create: if request.auth != null; // created by owner via app

      match /shares/{email} {
        allow read, write: if isOwner(get(/databases/$(db)/documents/files/$(fileId)));
      }
    }
  }
*/
