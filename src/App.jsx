import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Menu from './Menu'
import './App.css'
import CashierView from './CashierView'
import ManagerView from './ManagerView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cashier-view" element={<CashierView />}/>
        <Route path="/manager-view" element={<ManagerView />}/>
      </Routes>
    </Router>
  )
}

export default App
