import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
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
          padding: '24px',
          background: '#FFF8F0',
          fontFamily: "'Poppins', sans-serif",
          textAlign: 'center',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '32px 24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            border: '1px solid #F0E6D8',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#E8552F', marginBottom: '8px' }}>
              NabPrize Esports
            </h2>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#2E2A26', marginBottom: '8px' }}>
              Something went wrong
            </p>
            <p style={{ fontSize: '12px', color: '#8A8078', marginBottom: '24px', lineHeight: 1.5 }}>
              We encountered a temporary display issue. Tap reload below to refresh the page.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '13px',
                background: '#FF6B4A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 107, 74, 0.3)',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
