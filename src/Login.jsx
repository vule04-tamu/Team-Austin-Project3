import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from './LanguageSwitch'
import AccessibilityDrawer from './AccessibilityDrawer'
import Chatbot from './Chatbot'
import './KioskAccessibility.css'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''
const CONTRAST_LS_KEY = 'kioskAccessibilityContrastPct'

function Login() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  
  const [role, setRole] = useState('cashier')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState(null)
  const [contrastPct, setContrastPct] = useState(100)

  useEffect(() => {
    const raw = localStorage.getItem(CONTRAST_LS_KEY)
    if (raw != null) {
      const value = parseInt(raw, 10)
      if (!Number.isNaN(value)) {
        setContrastPct(Math.min(200, Math.max(50, value)))
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CONTRAST_LS_KEY, String(contrastPct))
  }, [contrastPct])

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err === 'unauthorized_email') setError('Your Google account is not authorized as a manager.')
    else if (err === 'state_mismatch') setError('Login failed: security check failed. Please try again.')
    else if (err === 'token_exchange_failed') setError('Google login failed. Please try again.')
    else if (err === 'invalid_token') setError('Could not verify your Google account.')
    if (err) window.history.replaceState({}, '', '/')  // clean the ?error= from the URL
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (role === 'customer') {
      navigate('/customer')
      return
    }

    if (role === 'manager') return

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
      <Chatbot />
      <AccessibilityDrawer
        contrastPct={contrastPct}
        onContrastChange={setContrastPct}
      />
      <div
        className="kiosk-contrast-layer"
        style={{ filter: `contrast(${contrastPct}%)` }}
      >
        <div className="kiosk-contrast-mag-inner login-accessibility-shell">
          <div className="login-card">
            <h1 className="login-title">{t('shop_name')}</h1>
            <p className="login-subtitle">{t('user_login')}</p>

            <div className="role-selector">
              {['manager', 'cashier', 'customer'].map((r) => (
                <button
                  key={r}
                  className={`role-btn ${role === r ? 'active' : ''}`}
                  onClick={() => { setRole(r); setError('') }}
                  type="button"
                >
                  {t(r)}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="login-form">
              {role === 'manager' ? (
                <div className="google-login-section" style={{ textAlign: 'center' }}>
                  <p className="customer-note">
                    Manager access requires a Google account.<br />
                    You will be redirected to sign in.
                  </p>
                  <button
                    type="button"
                    className="login-btn google-btn"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                    onClick={() => {
                      window.location.href = `${API_BASE}/api/auth/google`
                    }}
                  >
                    <img
                      src="https://developers.google.com/identity/images/g-logo.png"
                      alt="Google"
                      style={{ width: 20, height: 20, marginRight: 8, verticalAlign: 'middle' }}
                    />
                    Sign in with Google
                  </button>
                </div>
              ) : role === 'cashier' ? (
                <>
                  <div className="field">
                    <label htmlFor="username">{t('username')}</label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('username_placeholder')}
                      autoComplete="username"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="password">{t('password')}</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('password_placeholder')}
                      autoComplete="current-password"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="customer-note">
                    {t('customer_welcome')}<br />
                    {t('customer_note')}
                  </p>
                  <button type="button" className="login-btn menu-view-btn" onClick={() => navigate('/menu')}>
                    {t('view_menu')}
                  </button>
                </>
              )}

              {error && <p className="error-msg">{error}</p>}

              {role === 'cashier' && (
                <button className="login-btn" type="submit" disabled={loading}>
                  {loading ? t('signing_in') : t('sign_in')}
                </button>
              )}

              {role === 'customer' && (
                <button className="login-btn" type="button" onClick={() => navigate('/customer')}>
                  {t('continue_as_customer')}
                </button>
              )}
            </form>
          </div>

          {weather && weather.daily && (
            <div className="weather-container">
              {weather.daily.time.map((date, index) => (
                <div key={date} className="weather-card">
                  <div className="weather-date">{index === 0 ? t('today') : formatDate(date)}</div>
                  
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
                    💧 {t('rain')}: {weather.daily.precipitation_probability_max[index]}%
                  </div>
                  
                  <div className="weather-sun">
                    <span>🌅 {t('sunrise')}: {formatTime(weather.daily.sunrise[index])}</span>
                    <span>🌇 {t('sunset')}: {formatTime(weather.daily.sunset[index])}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
