import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null, lastResetKey: props.resetKey || "" };
  }

  static getDerivedStateFromError(error) {
    return { err: error };
  }

  static getDerivedStateFromProps(props, state) {
    const nextKey = props.resetKey || "";
    if (nextKey !== state.lastResetKey) {
      return { err: null, lastResetKey: nextKey };
    }
    return null;
  }

  componentDidCatch() {
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
            <div className="muted" style={{ marginTop: 8 }}>
              Bu ekran koptu. Menüden başka bir bölüme geçince ekran kendini sıfırlar.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button
                className="btn"
                type="button"
                onClick={() => this.setState({ err: null })}
              >
                Tekrar Dene
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
