import { useState, useEffect } from 'react'
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
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch(`${API_BASE}/api/weather/current`)
        if (res.ok) {
          const data = await res.json()
          setWeather(data)
        }
      } catch (err) {
        console.error('Failed to fetch weather data:', err)
      }
    }
    fetchWeather()
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (role === 'customer') {
      navigate('/customer')
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

      if (role === 'cashier') {
        navigate('/cashier')
      } else if (role === 'manager') {
        navigate('/manager')
      }
    } catch {
      setError('Could not reach server.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    const date = new Date(timeStr)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
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
            <>
              <p className="customer-note">
                Welcome<br />
                View the menu or continue as a customer to place an order
              </p>
              
              <button type="button" className="login-btn menu-view-btn" onClick={() => navigate('/menu')}>
                View Menu
              </button>
            </>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' :
              role === 'customer' ? 'Continue as Customer' : 'Sign In'}
          </button>
        </form>
      </div>

      {weather && weather.daily && (
        <div className="weather-container">
          {weather.daily.time.map((date, index) => (
            <div key={date} className="weather-card">
              <div className="weather-date">{index === 0 ? 'Today' : formatDate(date)}</div>
              
              {/* Current temp is only relevant for Today */}
              {index === 0 && weather.current && (
                <div className="weather-current">
                  {Math.round(weather.current.temperature_2m)}°F
                </div>
              )}
              
              <div className="weather-highlow">
                H: {Math.round(weather.daily.temperature_2m_max[index])}° 
                &nbsp;|&nbsp; 
                L: {Math.round(weather.daily.temperature_2m_min[index])}°
              </div>

              <div className="weather-precipitation">
                💧 Rain: {weather.daily.precipitation_probability_max[index]}%
              </div>
              
              <div className="weather-sun">
                <span>🌅 Sunrise: {formatTime(weather.daily.sunrise[index])}</span>
                <span>🌇 Sunset: {formatTime(weather.daily.sunset[index])}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Login
