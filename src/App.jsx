import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Menu from './Menu'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Menu" element={<Menu />} />
      </Routes>
    </Router>
  )
}

export default App
