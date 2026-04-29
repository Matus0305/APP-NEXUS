import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// COMENTAMOS EL AUTH PROVIDER TEMPORALMENTE
// import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Quitamos el <AuthProvider> de aquí temporalmente */}
    <App />
  </React.StrictMode>,
)
