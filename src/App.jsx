import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Menu from './Menu'
import './App.css'
import CashierView from './CashierView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cashier-view" element={<CashierView />}/>
      </Routes>
    </Router>
  )
}

export default App
