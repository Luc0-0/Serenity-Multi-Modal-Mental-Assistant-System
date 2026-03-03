import { Component } from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState((prev) => ({
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      errorCount: prev.errorCount + 1,
    }));

    // Log for debugging
    console.error("Error Boundary caught:", {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="errorBoundary">
          <div className="errorBoundaryContent">
            <div className="errorBoundaryIcon">!</div>

            <h2 className="errorBoundaryTitle">Something went wrong</h2>
            <p className="errorBoundarySubtitle">
              An unexpected error occurred. We're sorry for the inconvenience.
            </p>

            {isDevelopment && this.state.error && (
              <div className="errorDetails">
                <details className="errorStack">
                  <summary>Error details</summary>
                  <pre className="errorMessage">{this.state.error}</pre>
                  {this.state.errorInfo && (
                    <pre className="errorStack">{this.state.errorInfo}</pre>
                  )}
                </details>
              </div>
            )}

            <div className="errorActions">
              <button
                className="errorActionBtn errorActionBtn--primary"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button
                className="errorActionBtn errorActionBtn--secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>

            <p className="errorSupport">
              If the problem persists, please refresh the page or contact
              support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
