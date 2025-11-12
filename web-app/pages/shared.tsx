import Navbar from '../components/Navbar'
import FileList from '../components/FileList'

export default function Shared() {
  const items: any[] = []
  return (
    <div>
      <Navbar />
      <main className="container">
        <h1>Shared</h1>
        <div className="card">
          <FileList files={items} />
        </div>
      </main>
    </div>
  )
}
