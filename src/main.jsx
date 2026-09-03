import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

class ScreenError extends Component {
  constructor(props) {
    super(props)
    this.state = { message: '' }
  }
  static getDerivedStateFromError(error) {
    return { message: error?.message || 'Error al abrir Tommy' }
  }
  render() {
    if (this.state.message) {
      return (
        <div style={{ padding: 24, color: '#F7F6FF', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Tommy</h1>
          <p>{this.state.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

function render() {
  const root = document.getElementById('root')
  if (!root) return
  createRoot(root).render(
    <StrictMode>
      <ScreenError>
        <App />
      </ScreenError>
    </StrictMode>,
  )
}

render()

try {
  registerSW({ immediate: true })
} catch {
  // Sin PWA en desarrollo no pasa nada
}
