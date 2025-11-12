import Navbar from '../components/Navbar'
import UploadForm from '../components/UploadForm'
// supabase client is used inside fileService; import removed here to avoid unused var lint
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import { uploadAndRecord } from '../lib/fileService'

export default function Uploads() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // protect route
  if (!loading && !user) {
    if (typeof window !== 'undefined') router.push('/login')
    return null
  }

  async function handleUpload(file: File) {
    try {
      await uploadAndRecord(file, user || undefined)
      // Navigate back to home to see new file (trigger re-fetch)
      if (typeof window !== 'undefined') window.location.href = '/'
    } catch (e) {
      console.error('Upload error', e)
    }
  }

  return (
    <div>
      <Navbar />
      <main className="container">
        <h1>Uploads</h1>
        <div className="card">
          <UploadForm onUpload={handleUpload} />
        </div>
      </main>
    </div>
  )
}
