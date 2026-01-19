import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Disable StrictMode to prevent double API calls during development
createRoot(document.getElementById('root')!).render(
  <App />
)
