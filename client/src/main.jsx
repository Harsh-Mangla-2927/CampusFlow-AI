import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastProvider } from './components/Toast.jsx'

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('CampusFlow Error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#080808', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 40, fontFamily: 'monospace',
        }}>
          <div style={{ width: 40, height: 40, background: '#E8FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#080808', marginBottom: 24, fontSize: 14 }}>CF</div>
          <div style={{ color: '#EF4444', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Runtime Error
          </div>
          <div style={{ color: '#AAAAAA', fontSize: 13, maxWidth: 600, textAlign: 'center', lineHeight: 1.7, marginBottom: 16 }}>
            {this.state.error.message}
          </div>
          <pre style={{ color: '#666', fontSize: 11, maxWidth: 700, overflow: 'auto', textAlign: 'left', background: '#111', padding: 16, width: '100%' }}>
            {this.state.error.stack?.slice(0, 600)}
          </pre>
          <button
            style={{ marginTop: 24, padding: '10px 24px', background: '#E8FF00', color: '#080808', border: 'none', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 12 }}
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
