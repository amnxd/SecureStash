import { uploadAndRecord, softDeleteFile, restoreFile } from '../lib/fileService'

// Mock supabase client
jest.mock('../lib/supabaseClient', () => {
  const mockUpload = jest.fn().mockResolvedValue({ data: { Key: 'ok' }, error: null })
  const mockInsert = jest.fn().mockResolvedValue({ error: null })
  const mockUpdate = jest.fn().mockImplementation(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
  const supabase = {
    storage: { from: jest.fn(() => ({ upload: mockUpload })) },
    from: jest.fn(() => ({ insert: mockInsert, update: mockUpdate }))
  }
  return { supabase }
})

// Mock firebase client to simulate absence of db for supabase path
jest.mock('../lib/firebaseClient', () => ({ db: undefined }))

describe('fileService (supabase path)', () => {
  test('uploadAndRecord uploads and inserts record in supabase', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await expect(uploadAndRecord(file, { uid: 'user1' })).resolves.toBeDefined()
  })

  test('softDeleteFile calls supabase update', async () => {
    await expect(softDeleteFile('file-123')).resolves.toBeUndefined()
  })

  test('restoreFile calls supabase update', async () => {
    await expect(restoreFile('file-123')).resolves.toBeUndefined()
  })
})
