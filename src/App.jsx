import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Menu from './Menu'
import TextSizeControl from './TextSizeControl'
import './App.css'
import CashierView from './CashierView'
import ManagerView from './ManagerView'
import CustomerView from './CustomerView'

function App() {
  return (
    <Router>
      <div className="app-container">
        <div className="app-header">
          <TextSizeControl />
        </div>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cashier" element={<CashierView />}/>
          <Route path="/manager" element={<ManagerView />}/>
          <Route path="/customer" element={<CustomerView />}/>
        </Routes>
      </div>
    </Router>
  )
}

export default App
