import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import WhatsAppDemo from './pages/WhatsAppDemo'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/whatsapp" element={<WhatsAppDemo />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
