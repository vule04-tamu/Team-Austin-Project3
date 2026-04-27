import { useEffect, useRef, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'

import Login from './Login'
import Menu from './Menu'
import './App.css'
import CashierView from './CashierView'
import ManagerView from './ManagerView'
import CustomerView from './CustomerView'
import KioskScreenMagnifier from './KioskScreenMagnifier'
import { useScreenMagnifier } from './ScreenMagnifierContext'
import { useTextSize } from './TextSizeControl'
import { useLanguage } from './LanguageSwitch'

const API_BASE = import.meta.env.VITE_API_URL || ''

function ManagerGuard() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    // Check if Google just redirected here with a token in the URL
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')

    if (urlToken) {
      // Store token in sessionStorage and clean the URL
      sessionStorage.setItem('manager_token', urlToken)
      window.history.replaceState({}, '', '/manager')
    }

    const token = urlToken || sessionStorage.getItem('manager_token')

    if (!token) {
      navigate('/')
      setChecking(false)
      return
    }

    // Verify token with backend
    fetch(`${API_BASE}/api/auth/google/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) setAuthed(true)
        else {
          sessionStorage.removeItem('manager_token')
          navigate('/?error=unauthorized_email')
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setChecking(false))
  }, [navigate])

  if (checking) return <div style={{ padding: 40 }}>Verifying access...</div>
  if (!authed) return null
  return <ManagerView />
}

function AppRoutes() {
  const location = useLocation()
  const isAccessibilityRoute =
    location.pathname === '/' || location.pathname === '/customer'
  const captureRef = useRef(null)
  const {
    magnifierEnabled,
    magnifierZoom,
    setMagnifierEnabled,
  } = useScreenMagnifier()
  const { scale, setScale } = useTextSize()
  const { language, setLanguage } = useLanguage()

  useEffect(() => {
    if (isAccessibilityRoute) return

    if (magnifierEnabled) {
      setMagnifierEnabled(false)
    }
    if (scale !== 'normal') {
      setScale('normal')
    }
    if (language !== 'english') {
      setLanguage('english')
    }
  }, [
    isAccessibilityRoute,
    language,
    magnifierEnabled,
    scale,
    setLanguage,
    setMagnifierEnabled,
    setScale,
  ])

  return (
    <div className="app-container">
      <div ref={captureRef} className="app-routes-shell">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cashier" element={<CashierView />}/>
          <Route path="/manager" element={<ManagerGuard />}/>
          <Route path="/customer" element={<CustomerView />}/>
        </Routes>
      </div>
      {isAccessibilityRoute && (
        <KioskScreenMagnifier
          captureRef={captureRef}
          enabled={magnifierEnabled}
          zoom={magnifierZoom}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <Router>
      <div>
        <AppRoutes />
      </div>
    </Router>
  )
}

export default App
