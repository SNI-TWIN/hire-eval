import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ParamsProvider } from './context/ParamsContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ParamsProvider>
        <App />
      </ParamsProvider>
    </AuthProvider>
  </StrictMode>
)
