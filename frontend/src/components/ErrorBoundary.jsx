import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          color: "#7a96b4",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😕</div>
          <h2 style={{ margin: "0 0 0.5rem", color: "#0c1f36", fontSize: "1.25rem" }}>
            Something went wrong
          </h2>
          <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", maxWidth: 400 }}>
            An unexpected error occurred. Please refresh the page or go back to continue.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { this.setState({ hasError: false, error: null }); window.history.back(); }}
            >
              ← Go Back
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "#fff0f0",
              border: "1px solid #fecaca",
              borderRadius: 8,
              fontSize: "0.75rem",
              color: "#dc2626",
              textAlign: "left",
              maxWidth: "100%",
              overflow: "auto",
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;