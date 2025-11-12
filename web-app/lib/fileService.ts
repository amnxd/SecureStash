import { supabase } from './supabaseClient'
import { db } from './firebaseClient'
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'

type UserLike = { uid?: string | null }

export async function uploadAndRecord(file: File, user?: UserLike) {
  const filename = `${Date.now()}_${file.name}`
  const { data, error } = await supabase.storage.from('uploads').upload(filename, file)
  if (error) throw error

  // Create a DB record so file shows up in Home list.
  if (db) {
    await addDoc(collection(db, 'files'), {
      owner_id: user?.uid || null,
      name: file.name,
      path: filename,
      size: file.size,
      content_type: file.type,
      created_at: new Date()
    })
    return { storage: data }
  }

  if (user && user.uid) {
    const { error: insertErr } = await supabase.from('files').insert([{
      owner_id: user.uid,
      name: file.name,
      path: filename,
      size: file.size,
      content_type: file.type,
      created_at: new Date().toISOString()
    }])
    if (insertErr) throw insertErr
  }

  return { storage: data }
}

export async function softDeleteFile(fileId: string) {
  if (db) {
    const dref = doc(db as any, 'files', fileId)
    await updateDoc(dref, { deleted: true })
    return
  }
  const { error } = await supabase.from('files').update({ deleted: true }).eq('id', fileId)
  if (error) throw error
}

export async function restoreFile(fileId: string) {
  if (db) {
    const dref = doc(db as any, 'files', fileId)
    await updateDoc(dref, { deleted: false })
    return
  }
  const { error } = await supabase.from('files').update({ deleted: false }).eq('id', fileId)
  if (error) throw error
}

export default {
  uploadAndRecord,
  softDeleteFile,
  restoreFile
}
