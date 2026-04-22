import { useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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
          <Route path="/manager" element={<ManagerView />}/>
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
