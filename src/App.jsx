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
    fetch(`${API_BASE}/api/auth/google/status`, {
      credentials: 'include',   // required — sends the session cookie cross-origin
    })
      .then(res => {
        if (res.ok) {
          setAuthed(true)
        } else {
          navigate('/?error=unauthorized_email')
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setChecking(false))
  }, [navigate])

  // Show a brief loading state while the session check is in flight
  if (checking) return <div style={{ padding: 40 }}>Verifying access...</div>

  // If the check failed navigate() already fired, return null to render nothing
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
