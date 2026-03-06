import { navigate } from "../../router";

export default function FeatureFlagNotice({ title = "Bu modül kapalı", feature = "FEATURE_CHECKIN", fallbackPath = "/" }) {
  return (
    <div className="card err">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="muted" style={{ marginTop: 8 }}>
        Bu panel opsiyonel release olarak tasarlandı. Şu an sunucuda <code>{feature}</code> kapalı olduğu için menü gizli tutulur ve derin link kontrollü şekilde bloklanır.
      </div>
      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={() => navigate(fallbackPath)}>
          Güvenli ekrana dön
        </button>
      </div>
    </div>
  );
}
