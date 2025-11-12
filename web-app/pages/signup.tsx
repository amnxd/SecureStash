import Navbar from '../components/Navbar'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const { signUp, user } = useAuth()
  const router = useRouter()

  async function handleSignup(e: any) {
    e.preventDefault()
    setMessage('Creating account...')
    try {
      await signUp(email, password)
      setMessage('Account created.')
      router.push('/')
    } catch (err: any) {
      setMessage(String(err.message || err))
    }
  }

  if (user) {
    router.push('/')
    return null
  }

  return (
    <div>
      <Navbar />
      <main className="container">
        <h1>Sign up</h1>
        <div className="card">
          <form onSubmit={handleSignup}>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <div className="form-actions">
              <button type="submit">Create account</button>
            </div>
            {message && <p>{message}</p>}
          </form>
        </div>
      </main>
    </div>
  )
}
