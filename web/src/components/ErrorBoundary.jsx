import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(error) {
    return { err: error };
  }

  componentDidCatch(error, info) {
    // İstersen log:
    // console.error("UI crashed:", error, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="wrap">
          <div className="card err">
            <h3>UI Hatası</h3>
            <div className="muted" style={{ marginTop: 8 }}>
              {String(this.state.err?.message || this.state.err)}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}