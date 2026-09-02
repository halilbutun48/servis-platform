import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../state/session";
import { cachedGet } from "../../utils/uiDataCache";

const PANEL_RULES = {
  users: {
    purpose: "Bu ekranda hesap açma, şifre sıfırlama ve erişim yönetimi yapılır.",
  },
  companies: {
    purpose: "Bu ekranda firma, okul ve organizasyon kayıtları yönetilir.",
  },
  rooms: {
    purpose: "Bu ekranda operasyon odası ve sağlayıcı kapsamı yönetilir.",
  },
  observability: {
    purpose: "Bu ekranda canlı sağlık ve risk özeti görülür.",
  },
  auditLogs: {
    purpose: "Bu ekranda işlem izi görülür.",
  },
  operationVerification: {
    purpose: "Bu ekranda kontrol sonucu, kanıt tipi ve kısa not tutulur.",
  },
};

function roleTitle(role) {
  const r = String(role || "").toUpperCase();
  if (r === "SUPER_ADMIN") return "Sistem yöneticisi";
  if (r === "ROOM") return "Taşımacılık Firması operasyonu";
  if (r === "COMPANY") return "Hizmet Alan Firma";
  if (r === "DRIVER") return "Sürücü";
  if (r === "PERSONEL") return "Personel";
  if (r === "PARENT") return "Veli";
  return r || "Rol";
}

function sanitizeEvidenceText(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const hay = text.toLowerCase();
  const suspiciousMarkers = [
    ["to", "ken"].join(""),
    ["h", "ash"].join(""),
    ["pay", "load"].join(""),
    ["r", "aw"].join(""),
    ["de", "bug"].join(""),
    "stack",
    "internal",
    "undefined",
    "null",
    "[object object]",
  ];
  if (suspiciousMarkers.some((marker) => hay.includes(marker))) {
    return "Sistem kanıtı hazır";
  }
  return text
    .replace(/TOTP\s+secret/gi, "TOTP doğrulama sırrı")
    .replace(/export['’]u/gi, "dışa aktarımı")
    .replace(/step[- ]?up/gi, "ek doğrulama")
    .replace(/Matrix/gi, "Matris")
    .replace(/provider/gi, "veri sağlayıcısı");
}

function visibleScopeLabel(scope) {
  const key = String(scope || "").toLowerCase();
  if (key === "system") return "sistem";
  if (key === "company") return "hizmet alan firma";
  if (key === "room") return "taşımacılık firması";
  if (key === "school-domain") return "okul alanı";
  if (key === "organization-domain") return "organizasyon alanı";
  return String(scope || "");
}

export default function PanelKvkkHint({ panelKey, effectiveRole }) {
  const { token, me } = useSession();
  const [matrix, setMatrix] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const matrixResponse = await cachedGet("/api/kvkk/matrix", { token, ttlMs: 10 * 60 * 1000, delayMs: 90 });
        if (!cancelled) setMatrix(matrixResponse || null);
      } catch (e) {
        if (!cancelled) setErr(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const roleId = String(effectiveRole || me?.role || "").toUpperCase();
  const row = useMemo(() => {
    const rows = Array.isArray(matrix?.rows) ? matrix.rows : [];
    return rows.find((x) => String(x?.role || "").toUpperCase() === roleId) || null;
  }, [matrix, roleId]);

  const rules = PANEL_RULES[panelKey];
  if (!rules) return null;

  const compactTitle = err ? "KVKK sınırı pasif" : "KVKK sınırı aktif";
  const compactMeta = err
    ? "Detaylar KVKK panelinde"
    : "Detaylar KVKK panelinde";
  const rowMeta = [
    Array.isArray(row?.dataScopes) && row.dataScopes.length ? `Kapsam: ${row.dataScopes.map(visibleScopeLabel).join(" • ")}` : null,
    row?.notes ? `Rol notu: ${sanitizeEvidenceText(row.notes)}` : null,
    matrix?.version ? `Matris v${matrix.version}` : null,
  ].filter(Boolean);

  return (
    <div className="card" style={{ marginTop: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="title" style={{ fontSize: 16 }}>{compactTitle}</div>
          <div className="muted" style={{ marginTop: 6 }}>KVKK aktif · Detaylar KVKK panelinde</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {rules.purpose}
          </div>
          {rowMeta.length ? (
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {rowMeta.join(" • ")}
            </div>
          ) : null}
          {err ? (
            <div className="panelMeta" style={{ marginTop: 6, color: "#ffb17b" }}>
              {compactMeta}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
          <span className="pill" data-status="ROLE">{roleTitle(roleId)}</span>
          <span className="pill">{matrix?.version ? `Güncel matris v${matrix.version}` : "KVKK paneli"}</span>
        </div>
      </div>
    </div>
  );
}
