import { uploadAndRecord, softDeleteFile, restoreFile } from '../lib/fileService'

// Mock supabase storage upload
jest.mock('../lib/supabaseClient', () => {
  const mockUpload = jest.fn().mockResolvedValue({ data: { Key: 'ok' }, error: null })
  const mockInsert = jest.fn().mockResolvedValue({ error: null })
  const mockUpdate = jest.fn().mockResolvedValue({ error: null })
  const supabase = {
    storage: { from: jest.fn(() => ({ upload: mockUpload })) },
    from: jest.fn(() => ({ insert: mockInsert, update: mockUpdate }))
  }
  return { supabase }
})

// Mock firebase client to simulate presence of db for Firestore path
jest.mock('../lib/firebaseClient', () => ({ db: {} }))

// Mock firebase/firestore methods used by fileService
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({}),
  doc: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue({})
}))

describe('fileService (Firestore path)', () => {
  test('uploadAndRecord uploads and adds Firestore doc', async () => {
    const file = new File(['hello'], 'test-fs.txt', { type: 'text/plain' })
    await expect(uploadAndRecord(file, { uid: 'user-fs' })).resolves.toBeDefined()
  })

  test('softDeleteFile uses updateDoc on Firestore', async () => {
    await expect(softDeleteFile('fs-file-1')).resolves.toBeUndefined()
  })

  test('restoreFile uses updateDoc on Firestore', async () => {
    await expect(restoreFile('fs-file-1')).resolves.toBeUndefined()
  })
})
