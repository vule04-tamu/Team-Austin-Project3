import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState('cashier')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (role === 'customer') {
      navigate('/menu')
      return
    }

    if (role == 'cashier') {
      navigate('/cashier')
      return
    }

    if (!username || !password) {
      setError('Username and password are required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed.')
        return
      }

      if (data.role !== role) {
        setError(`Your account is registered as "${data.role}", not "${role}".`)
        return
      }

      // alert(`Logged in as ${data.username} (${data.role}). Views coming in a future phase!`)
    } catch {
      setError('Could not reach server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Austin's Boba Shop</h1>
        <p className="login-subtitle">User Login</p>

        <div className="role-selector">
          {['manager', 'cashier', 'customer'].map((r) => (
            <button
              key={r}
              className={`role-btn ${role === r ? 'active' : ''}`}
              onClick={() => { setRole(r); setError('') }}
              type="button"
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {role !== 'customer' ? (
            <>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <p className="customer-note">
              No login required. Continue as a customer to browse the menu and place an order.
            </p>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' :
              role === 'customer' ? 'Continue as Customer' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
