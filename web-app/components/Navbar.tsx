import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link href="/">SecureStash</Link>
      </div>
      <div className="nav-right">
        <Link href="/uploads" className="nav-action">Uploads</Link>
        <Link href="/starred" className="nav-action">Starred</Link>
        <Link href="/shared" className="nav-action">Shared</Link>
        <Link href="/bin" className="nav-action">Bin</Link>
        <Link href="/settings" className="nav-action">Settings</Link>
        {user ? (
          <>
            <span className="nav-user-email">{user.email}</span>
            <button className="nav-button" onClick={() => signOut()}>Sign out</button>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-action">Login</Link>
            <Link href="/signup" className="nav-action">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
