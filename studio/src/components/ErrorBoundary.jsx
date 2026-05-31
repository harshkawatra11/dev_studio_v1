import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(err) {
    return { error: err };
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          flex:           1,
          padding:        32,
          background:     '#000000',
          color:          '#fca5a5',
          fontFamily:     "'JetBrains Mono', monospace",
          fontSize:       12,
          gap:            12,
          textAlign:      'center',
        }}>
          <div style={{ fontSize: 24 }}>⚠</div>
          <div style={{ color: '#e2e8f0', fontWeight: 700 }}>
            {this.props.title || 'Something went wrong'}
          </div>
          <div style={{ color: '#64748b', maxWidth: 400 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop:    8,
              padding:      '6px 16px',
              background:   'rgba(239,68,68,0.1)',
              border:       '1px solid rgba(239,68,68,0.25)',
              borderRadius: 6,
              color:        '#fca5a5',
              fontSize:     11,
              cursor:       'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
