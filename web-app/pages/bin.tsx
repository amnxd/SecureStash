import Navbar from '../components/Navbar'

export default function Bin() {
  return (
    <div>
      <Navbar />
      <main className="container">
        <h1>Bin</h1>
        <div className="card">
          <p>Recently deleted items will appear here.</p>
        </div>
      </main>
    </div>
  )
}
