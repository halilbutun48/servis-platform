import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

const PANEL_RULES = {
  users: {
    purpose: "Bu ekranda hesap açma, şifre sıfırlama ve erişim yönetimi yapılır. Gizli doğrulama verisi burada açılmaz.",
    canView: ["rol", "kullanıcı adı", "durum", "scope özeti", "geçici şifre sonucu (1 kez)"],
    canWrite: ["hesap oluştur", "disable / enable", "şifre sıfırla", "sınırlı profil güncelle"],
    hidden: ["mevcut şifre", "şifre hash'i", "token", "TOTP secret", "ham kişisel veri export'u"],
    reason: "Bu ekran erişim yönetimi içindir; kullanıcıyı doğrulayan sırlar yalnız sistem tarafında tutulur.",
  },
  companies: {
    purpose: "Bu ekranda şirket, okul ve organizasyon kayıtları yönetilir. Ticari kapsam görünür, gereksiz kişi verisi açılmaz.",
    canView: ["ad", "tür", "bölge", "durum", "profil özeti", "iletişim özeti"],
    canWrite: ["oluştur", "güncelle", "durum değiştir", "profil notu düzenle"],
    hidden: ["çalışanların tam kişi listesi", "ham onay kayıtları", "tam log izi", "ham GPS geçmişi"],
    reason: "Bu ekran kurum kaydı içindir; kişi bazlı hareket ve hassas operasyon verisi burada detaylı açılmaz.",
  },
  rooms: {
    purpose: "Bu ekranda operasyon odası ve sağlayıcı kapsamı yönetilir. Oda bağları görünür, kişi bazlı gereksiz veri açılmaz.",
    canView: ["oda adı", "bölge", "bağlı şirket özeti", "operasyon durumu"],
    canWrite: ["oluştur", "güncelle", "bağlantı bilgisi düzenle"],
    hidden: ["tam kişi adresi", "ham sürücünün telefon GPS'i geçmişi", "ilgili olmayan oda verisi"],
    reason: "Oda ekranı operasyon yapısını yönetir; konum ve kişi verisi amaç ve kapsam sınırıyla gösterilir.",
  },
  observability: {
    purpose: "Bu ekranda canlı sağlık ve risk özeti görülür. Amaç sorun tespiti ve güven görünürlüğüdür.",
    canView: ["mobil sağlık olay özeti", "GPS güven skoru", "cihaz sağlık özeti", "risk sinyali"],
    canWrite: ["bu ekranda yazma yok", "yalnız yenile / inceleme"],
    hidden: ["ham token", "tam kişisel rota izi", "gereksiz kimlik bilgisi", "ham debug sırrı"],
    reason: "Canlı izleme yalnız karar destek için özet verir; ham ve hassas veriler burada varsayılan olarak açılmaz.",
  },
  auditLogs: {
    purpose: "Bu ekranda işlem izi görülür. Kim ne yaptı sorusuna cevap verir; gizli içerik burada açılmaz.",
    canView: ["zaman", "actor", "action", "entity", "meta özeti"],
    canWrite: ["bu ekranda yazma yok", "yalnız filtrele / kopyala"],
    hidden: ["şifre", "token", "TOTP secret", "ham export içeriği", "gereksiz kişisel veri"],
    reason: "Audit ekranı iz bırakır; doğrulama sırları ve hassas içerik bu ekranda maskeleme dışında açılmaz.",
  },
  operationVerification: {
    purpose: "Bu ekranda kontrol sonucu, kanıt tipi ve kısa not tutulur. Seçilen rolün beklentisi gösterilir; ham veri açılmaz.",
    canView: ["kontrol maddesi", "durum özeti", "kanıt tipi", "kısa not", "referans metni"],
    canWrite: ["durum kaydet", "kanıt tipi seç", "kısa not gir", "referans gir"],
    hidden: ["ham belge içeriği", "tam export dosyası", "gereksiz kişisel veri", "ilişkisiz rol verisi"],
    reason: "Bu ekran karar ve kanıt omurgası içindir; ayrıntılı veri başka ekranda, burada ise kontrollü özet tutulur.",
  },
};

function roleTitle(role) {
  const r = String(role || "").toUpperCase();
  if (r === "SUPER_ADMIN") return "Sistem yöneticisi";
  if (r === "ROOM") return "Oda operasyonu";
  if (r === "COMPANY") return "Firma / okul / organizasyon";
  if (r === "DRIVER") return "Sürücü";
  if (r === "PERSONEL") return "Personel";
  if (r === "PARENT") return "Veli";
  return r || "Rol";
}

function Section({ title, items, muted }) {
  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {Array.isArray(items) && items.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          {items.map((item) => (
            <div key={item} className="muted" style={muted ? { opacity: 0.9 } : null}>• {item}</div>
          ))}
        </div>
      ) : (
        <div className="muted">-</div>
      )}
    </div>
  );
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
        const payload = await api("/api/kvkk/matrix", { token });
        if (!cancelled) setMatrix(payload || null);
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

  const scopeItems = [];
  if (Array.isArray(row?.dataScopes) && row.dataScopes.length) {
    scopeItems.push(`Veri kapsamı: ${row.dataScopes.join(" • ")}`);
  }
  if (row?.notes) {
    scopeItems.push(`Rol notu: ${row.notes}`);
  }
  if (rules?.reason) {
    scopeItems.push(`Bu ekranın nedeni: ${rules.reason}`);
  }
  if (err) {
    scopeItems.push(`Matrix özeti alınamadı: ${err}`);
  } else if (matrix?.version) {
    scopeItems.push(`Güncel matris: v${matrix.version}`);
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="title" style={{ fontSize: 16 }}>Bu ekranda KVKK sınırı</div>
          <div className="muted" style={{ marginTop: 6 }}>{rules.purpose}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
          <span className="pill" data-status="ROLE">{roleTitle(roleId)}</span>
          {matrix?.version ? <span className="pill">Matrix v{matrix.version}</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Section title="Görürsün" items={rules.canView} />
        <Section title="Yazabilirsin" items={rules.canWrite} />
        <Section title="Burada görünmez" items={rules.hidden} muted />
        <Section title="Kapsam ve neden" items={scopeItems} muted />
      </div>
    </div>
  );
}
