import 'react-native-get-random-values';
import storage from '@react-native-firebase/storage';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import { pick as pickDocument, keepLocalCopy, types as DocTypes } from '@react-native-documents/picker';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_BACKEND } from '../config/storage';
import { supabase } from '../config/supabase';
import { SUPABASE_BUCKET } from '../config/storage';
import RNFS from 'react-native-fs';
import { DEFAULT_USER_STORAGE_LIMIT_BYTES } from '../config/quota';
import { getUserUsageBytes } from './storageService';
import { decode as base64Decode } from 'base64-arraybuffer';

export type UploadResult = {
  fileId: string;
  storagePath: string;
  downloadUrl?: string;
};

// Firestore collection names
const FILES = 'files';

function sanitizeFileName(name: string): string {
  let out = name;
  out = out.replace(/[\n\r\t]/g, '_');
  out = out.replace(/#/g, '_');
  out = out.replace(/\[/g, '_');
  out = out.replace(/\]/g, '_');
  out = out.replace(/\*/g, '_');
  out = out.replace(/\?/g, '_');
  out = out.replace(/\s+/g, ' ');
  return out.trim();
}

function assertStorageReady() {
  // Ensure default app has a storage bucket configured
  // @react-native-firebase/app exposes options via storage().app.options
  const bucket = (storage() as any)?.app?.options?.storageBucket;
  if (STORAGE_BACKEND === 'firebase' && !bucket) {
    throw new Error(
      'Firebase Storage is not configured. Add android/app/google-services.json (and iOS plist) to set storageBucket.'
    );
  }
}

async function ensureMediaPermission() {
  if (Platform.OS !== 'android') return true;

  // Android 13+ uses READ_MEDIA_IMAGES, older uses READ_EXTERNAL_STORAGE
  const permission = (Number(Platform.Version) >= 33)
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const has = await PermissionsAndroid.check(permission);
  if (has) return true;

  const granted = await PermissionsAndroid.request(permission);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureVideoPermission() {
  if (Platform.OS !== 'android') return true;
  const permission = (Number(Platform.Version) >= 33)
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const has = await PermissionsAndroid.check(permission);
  if (has) return true;
  const granted = await PermissionsAndroid.request(permission);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureCameraPermission() {
  if (Platform.OS !== 'android') return true;
  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  const has = await PermissionsAndroid.check(permission);
  if (has) return true;
  const granted = await PermissionsAndroid.request(permission);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function uploadAssetToStorage(userId: string, asset: Asset, defaultExt: string, kind: 'image'|'video'|'document'): Promise<UploadResult> {
  let uri = asset.uri;
  if (!uri) throw new Error('Invalid asset URI');
  // On Android, ImagePicker often returns content:// URIs for gallery items.
  // Copy them to a local file first so putFile can read them reliably.
  if (Platform.OS === 'android' && uri.startsWith('content://')) {
    const fileNameFallback = asset.fileName || `${kind}-${Date.now()}.${defaultExt}`;
    const [localCopy] = await keepLocalCopy({
      files: [{ uri, fileName: fileNameFallback }],
      destination: 'cachesDirectory',
    });
    // @ts-ignore: localUri provided by library
    uri = (localCopy as any).localUri || uri;
  }
  const originalName = sanitizeFileName(asset.fileName || `${kind}-${Date.now()}.${defaultExt}`);
  // Determine file size accurately; fallback to local file size when missing
  let size = asset.fileSize || 0;
  const contentType = asset.type || (kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'application/octet-stream');

  const fileId = uuidv4();
  const storagePath = `files/${userId}/${fileId}/${originalName}`;

  // If size is still unknown, try stat on local path
  if (!size) {
    try {
      let statPath = uri;
      if (statPath.startsWith('file://')) statPath = statPath.replace('file://', '');
      const stat = await RNFS.stat(statPath);
      if (stat?.size) size = Number(stat.size);
    } catch {}
  }

  // Enforce per-user storage quota before uploading
  const used = await getUserUsageBytes(userId);
  if (size && used + size > DEFAULT_USER_STORAGE_LIMIT_BYTES) {
    const remaining = Math.max(0, DEFAULT_USER_STORAGE_LIMIT_BYTES - used);
    throw new Error(`Storage quota exceeded. Remaining: ${Math.round(remaining / (1024*1024))} MB`);
  }

  if (STORAGE_BACKEND === 'firebase') {
    const ref = storage().ref(storagePath);
    // Normalize local file path for putFile
    if (uri.startsWith('file://')) {
      uri = uri.replace('file://', '');
    }
    // Retry putFile a couple of times in case of transient resolver issues
    let lastErr: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await ref.putFile(uri, { contentType });
        lastErr = undefined;
        break;
      } catch (e: any) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt))); // 200ms, 400ms, 800ms
      }
    }
    if (lastErr) {
      const bucket = (storage() as any)?.app?.options?.storageBucket || 'unknown-bucket';
      const msg = typeof lastErr?.message === 'string' ? lastErr.message : String(lastErr);
      throw new Error(`[upload] ${msg}\nBucket: ${bucket}\nPath: ${storagePath}\nLocal: ${uri}`);
    }
  } else {
    // SUPABASE path inside bucket
    // Convert local file to bytes
    let localPath = uri;
    if (localPath.startsWith('file://')) localPath = localPath.replace('file://', '');
    // Read as base64, then decode to ArrayBuffer
    const b64 = await RNFS.readFile(localPath, 'base64');
    const bytes = base64Decode(b64);
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, bytes, {
        contentType,
        upsert: false,
      });
    if (error) {
      throw new Error(`[upload][supabase] ${error.message}\nBucket: ${SUPABASE_BUCKET}\nPath: ${storagePath}\nLocal: ${localPath}`);
    }
  }

  const db = getFirestore();
  const now = serverTimestamp();
  const fileRef = doc(collection(db, FILES), fileId);
  await setDoc(fileRef as any, {
    owner_id: userId,
    name: originalName,
    path: storagePath,
    size,
    contentType,
    kind,
    storage_provider: STORAGE_BACKEND,
    created_at: now,
    updated_at: now,
  });

  return { fileId, storagePath };
}

export async function pickAndUploadImage(): Promise<UploadResult | null> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not authenticated');
  assertStorageReady();

  // Request runtime permission if needed on Android
  await ensureMediaPermission();

  const picker = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
  if (picker.didCancel || !picker.assets || picker.assets.length === 0) return null;
  const asset = picker.assets[0];
  return uploadAssetToStorage(user.uid, asset, 'jpg', 'image');
}

export async function pickAndUploadVideo(): Promise<UploadResult | null> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not authenticated');
  assertStorageReady();
  await ensureVideoPermission();
  const picker = await launchImageLibrary({ mediaType: 'video', selectionLimit: 1 });
  if (picker.didCancel || !picker.assets || picker.assets.length === 0) return null;
  const asset = picker.assets[0];
  return uploadAssetToStorage(user.uid, asset, 'mp4', 'video');
}

export async function pickAndUploadDocument(): Promise<UploadResult | null> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not authenticated');
  assertStorageReady();
  // Storage read permission is the same as media for pre-Android 13; safe to attempt
  await ensureMediaPermission();
  const [file] = await pickDocument({
    type: [DocTypes.pdf, DocTypes.doc, DocTypes.docx, DocTypes.ppt, DocTypes.pptx, DocTypes.plainText, DocTypes.xlsx, DocTypes.xls, DocTypes.zip],
  });
  if (!file) return null;
  // Ensure we have a local file path we can upload
  const [localCopy] = await keepLocalCopy({
    files: [{ uri: file.uri, fileName: file.name ?? `doc-${Date.now()}.bin` }],
    destination: 'cachesDirectory',
  });
  const asset: Asset = {
    uri: (localCopy as any).localUri || (localCopy as any).uri || file.uri,
    fileName: file.name ? sanitizeFileName(file.name) : undefined,
    fileSize: file.size || undefined,
    type: file.type || undefined,
  } as Asset;
  return uploadAssetToStorage(user.uid, asset, 'bin', 'document');
}

export async function captureAndUploadImage(): Promise<UploadResult | null> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not authenticated');
  assertStorageReady();
  await ensureCameraPermission();
  const result = await launchCamera({ mediaType: 'photo', saveToPhotos: true });
  if (result.didCancel || !result.assets || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return uploadAssetToStorage(user.uid, asset, 'jpg', 'image');
}
