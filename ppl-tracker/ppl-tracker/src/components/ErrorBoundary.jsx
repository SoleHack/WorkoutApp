import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: 32,
          background: 'var(--bg, #0C0C0B)',
          color: 'var(--text, #E8E3D8)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 52 }}>⚠️</div>
          <div style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 32,
            letterSpacing: '0.06em',
          }}>
            Something went wrong
          </div>
          <div style={{
            fontSize: 14,
            color: 'var(--muted, #6B6860)',
            maxWidth: 360,
            lineHeight: 1.6,
          }}>
            The app hit an unexpected error. Your workout data is safe — it's stored in the cloud.
          </div>
          <button
            onClick={() => {
              this.setState({ error: null, errorInfo: null })
              window.location.href = '/'
            }}
            style={{
              padding: '14px 28px',
              background: 'var(--text, #E8E3D8)',
              color: 'var(--bg, #0C0C0B)',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Return to Home
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{
              marginTop: 16,
              fontSize: 11,
              color: 'var(--muted, #6B6860)',
              textAlign: 'left',
              maxWidth: 500,
              wordBreak: 'break-all',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Error details</summary>
              <pre>{this.state.error?.toString()}</pre>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
