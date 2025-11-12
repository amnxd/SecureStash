import Navbar from '../components/Navbar'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const { signIn, user } = useAuth()
  const router = useRouter()

  async function handleSignIn(e: any) {
    e.preventDefault()
    setMessage('Signing in...')
    try {
      await signIn(email, password)
      setMessage('')
      router.push('/')
    } catch (err: any) {
      setMessage(String(err.message || err))
    }
  }

  if (user) {
    // already signed in
    router.push('/')
    return null
  }

  return (
    <div>
      <Navbar />
      <main className="container">
        <h1>Login</h1>
        <div className="card">
          <form onSubmit={handleSignIn}>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <div className="form-actions">
              <button type="submit">Sign in</button>
            </div>
            {message && <p>{message}</p>}
          </form>
        </div>
      </main>
    </div>
  )
}
