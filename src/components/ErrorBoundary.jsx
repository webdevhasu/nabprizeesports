import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    // Clear potentially corrupted local storage caches if needed
    try {
      if (window.caches) {
        caches.keys().then(names => {
          for (let name of names) caches.delete(name);
        });
      }
    } catch (e) {}

    // Reload the page hard
    window.location.reload(true);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: '#1A1310',
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <AlertTriangle size={64} color="#FF6B4A" style={{ marginBottom: '20px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>
            Oops! Something went wrong.
          </h1>
          <p style={{ color: '#C4BCB2', marginBottom: '30px', maxWidth: '400px' }}>
            We've encountered an unexpected issue while loading the application. 
            This is usually fixed by refreshing the page.
          </p>
          <button 
            onClick={this.handleReset}
            style={{
              background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255, 107, 74, 0.3)'
            }}
          >
            <RefreshCw size={20} />
            Reload Application
          </button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ marginTop: '40px', padding: '15px', background: '#2E1B15', borderRadius: '8px', textAlign: 'left', maxWidth: '100%', overflow: 'auto' }}>
              <p style={{ color: '#FF6B4A', fontWeight: 600, margin: '0 0 10px 0' }}>{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
