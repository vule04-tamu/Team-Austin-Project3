import { useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Login from './Login'
import Menu from './Menu'
import TextSizeControl from './TextSizeControl'
import './App.css'
import CashierView from './CashierView'
import ManagerView from './ManagerView'
import CustomerView from './CustomerView'
import KioskScreenMagnifier from './KioskScreenMagnifier'
import { useScreenMagnifier } from './ScreenMagnifierContext'

function GlobalMagnifierControl() {
  const {
    magnifierEnabled,
    setMagnifierEnabled,
    magnifierZoom,
    setMagnifierZoom,
    magnifierZoomLevels,
  } = useScreenMagnifier()

  return (
    <div className="global-mag-control">
      <button
        type="button"
        className={`global-mag-toggle ${magnifierEnabled ? 'on' : ''}`}
        onClick={() => setMagnifierEnabled(!magnifierEnabled)}
      >
        Magnifier {magnifierEnabled ? 'On' : 'Off'}
      </button>
      <div className="global-mag-zooms">
        {magnifierZoomLevels.map((z) => (
          <button
            key={z}
            type="button"
            className={`global-mag-zoom-btn ${magnifierZoom === z ? 'active' : ''}`}
            onClick={() => setMagnifierZoom(z)}
            disabled={!magnifierEnabled}
          >
            {z}x
          </button>
        ))}
      </div>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const hideGlobalTextControls = location.pathname === '/customer'
  const captureRef = useRef(null)
  const { magnifierEnabled, magnifierZoom } = useScreenMagnifier()

  return (
    <div className="app-container">
      {!hideGlobalTextControls && (
        <div className="app-header">
          <GlobalMagnifierControl />
          <TextSizeControl />
        </div>
      )}
      <div ref={captureRef} className="app-routes-shell">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cashier" element={<CashierView />}/>
          <Route path="/manager" element={<ManagerView />}/>
          <Route path="/customer" element={<CustomerView />}/>
        </Routes>
      </div>
      <KioskScreenMagnifier
        captureRef={captureRef}
        enabled={magnifierEnabled}
        zoom={magnifierZoom}
      />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App
