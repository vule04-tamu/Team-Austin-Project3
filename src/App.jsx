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
        <Route path="/cashier" element={<CashierView />}/>
        <Route path="/manager" element={<ManagerView />}/>
      </Routes>
    </Router>
  )
}

export default App
