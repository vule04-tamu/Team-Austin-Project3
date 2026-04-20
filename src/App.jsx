import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Login from './Login'
import Menu from './Menu'
import TextSizeControl from './TextSizeControl'
import './App.css'
import CashierView from './CashierView'
import ManagerView from './ManagerView'
import CustomerView from './CustomerView'

function AppRoutes() {
  const location = useLocation()
  const hideGlobalTextControls = location.pathname === '/customer'

  return (
    <div className="app-container">
      {!hideGlobalTextControls && (
        <div className="app-header">
          <TextSizeControl />
        </div>
      )}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cashier" element={<CashierView />}/>
        <Route path="/manager" element={<ManagerView />}/>
        <Route path="/customer" element={<CustomerView />}/>
      </Routes>
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
