import Navbar from '../components/Navbar'
import FileList from '../components/FileList'

export default function Starred() {
  // TODO: fetch starred files from backend
  const items: any[] = []
  return (
    <div>
      <Navbar />
      <main className="container">
        <h1>Starred</h1>
        <div className="card">
          <FileList files={items} />
        </div>
      </main>
    </div>
  )
}
