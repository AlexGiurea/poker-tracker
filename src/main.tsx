import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/app.css'

const container = document.querySelector('#app')

if (!container) {
  throw new Error('Missing #app root element')
}

createRoot(container).render(<App />)
