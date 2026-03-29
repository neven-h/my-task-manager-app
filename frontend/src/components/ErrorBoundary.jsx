import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info?.componentStack);
    }

    render() {
        if (this.state.hasError) {
            const { fallback } = this.props;
            if (fallback) return fallback;
            return (
                <div style={{ padding: 20, textAlign: 'center', color: '#FF3B30', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
                    <div style={{ fontSize: '0.75rem', color: '#8E8E93', wordBreak: 'break-word' }}>
                        {this.state.error?.message || 'Unknown error'}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: 12, padding: '8px 16px', border: 'none', borderRadius: 8,
                            background: '#007AFF', color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
