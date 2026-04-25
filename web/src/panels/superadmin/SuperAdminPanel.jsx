import { useEffect, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import FeedbackLoopSection from "../../components/feedback/FeedbackLoopSection";

function copyText(s) {
  const v = String(s ?? "");
  if (!v) return;
  if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(v).catch(() => {});
  else window.prompt("Kopyala:", v);
}

function trRole(role) {
  if (role === "SUPER_ADMIN") return "Süper Yönetici";
  if (role === "ROOM") return "Operasyon Odası";
  if (role === "COMPANY") return "Şirket";
  if (role === "DRIVER") return "Sürücü";
  if (role === "PERSONEL") return "Personel";
  if (role === "PARENT") return "Veli";
  return role || "-";
}

const MENU_GUIDE = [
  { title: "Genel Bakış", desc: "İlk açılış ekranı. Genel durumu görüp doğru yere buradan geçersin." },
  { title: "Şirketler", desc: "Şirket kayıtları, kapsam ve bağlı yapıların yönetimi." },
  { title: "Operasyon Odaları", desc: "Operasyon odaları, araç ve sürücü omurgasının merkezi." },
  { title: "Kullanıcılar", desc: "Kullanıcı hesapları, roller ve erişim görünümü." },
  { title: "Bölgeler", desc: "İl ve bölge tanımlarının yönetimi." },
  { title: "İşlem Kayıtları", desc: "Kim, ne zaman, hangi işlemi yaptı sorusunun kaydı." },
  { title: "Canlı İzleme", desc: "Sistemin ve sahadaki akışın canlı görünümü." },
  { title: "Kabul Merkezi", desc: "Saha kabul ve doğrulama işlerinin ana ekranı." },
  { title: "Operasyon Doğrulama", desc: "Checklist, kanıt ve sonuç kaydı için kullanılan ekran." },
  { title: "Sistem Standartları", desc: "Resmi doküman, paket ve çalışma hattının aynı kurala göre ilerlediğini gösterir." },
  { title: "Ticari Akış", desc: "Talep, teklif, pazarlık ve sözleşme adımlarını tek akışta özetler." },
  { title: "Güven ve Kalite", desc: "Kalite, hizmet değerlendirme ve güven görünümü." },
  { title: "Yardımcı", desc: "Yardımcı cevabın yapısını ve geri bildirim akışını gösterir." },
  { title: "Sahaya Çıkış Kontrolü", desc: "Canlıya çıkmadan önce son kontrol kapısı." },
  { title: "KVKK", desc: "Veri koruma ve uyum yüzeyi." },
  { title: "Log Dışa Aktarımı", desc: "Sistem kayıtlarını dışa alma ekranı." },
];

function Pill({ children, status }) {
  return (
    <span className="pill" data-status={status || "ROLE"}>
      {children}
    </span>
  );
}

const DEMO_PASSWORD = "demo123";
const DEMO_ACCOUNTS = [
  { email: "superadmin@demo.com", role: "SUPER_ADMIN", name: "Süper Yönetici", scope: "-" },
  { email: "company@demo.com", role: "COMPANY", name: "Şirket Operatörü", scope: "Şirket #1 DemoCompany" },
  { email: "room@demo.com", role: "ROOM", name: "Operasyon Odası Operatörü", scope: "Oda #1 DemoRoom" },
  { email: "driver@demo.com", role: "DRIVER", name: "Sürücü Bir", scope: "Oda #1" },
  { email: "personel@demo.com", role: "PERSONEL", name: "Personel Bir", scope: "Şirket #1" },
  { email: "parent@demo.com", role: "PARENT", name: "Demo Veli", scope: "Veli" },
  { email: "school@demo.com", role: "COMPANY", name: "Okul Operatörü", scope: "Şirket #2 DemoOkul (Okul)" },
  { email: "organization@demo.com", role: "COMPANY", name: "Organizasyon Operatörü", scope: "Şirket #3 DemoOrganizasyon (Organizasyon)" },
];

export default function SuperAdminPanel() {
  const { me, token } = useSession();
  const [stats, setStats] = useState({
    companies: null,
    rooms: null,
    vehicles: null,
    drivers: null,
    companiesTotal: null,
    roomsTotal: null,
    vehiclesTotal: null,
    driversTotal: null,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadStats() {
    setBusy(true);
    setErr("");
    try {
      const s = await api("/api/admin/stats", { token });
      setStats({
        companies: s?.companies ?? null,
        rooms: s?.rooms ?? null,
        vehicles: s?.vehicles ?? null,
        drivers: s?.drivers ?? null,
        companiesTotal: s?.companiesTotal ?? null,
        roomsTotal: s?.roomsTotal ?? null,
        vehiclesTotal: s?.vehiclesTotal ?? null,
        driversTotal: s?.driversTotal ?? null,
      });
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadStats();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fmtActiveTotal = (active, total) => {
    if (active == null && total == null) return "-";
    if (total == null) return String(active ?? "-");
    return `${active ?? "-"} / ${total}`;
  };

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Süper Yönetici"
        subtitle={`${me?.email} • ${trRole(me?.role)}`}
        actions={(
          <button className="btn sm" disabled={busy} onClick={loadStats}>
            Özeti Yenile
          </button>
        )}
      />

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {/* Quick */}
        <div
          style={{
            flex: "1 1 320px",
            padding: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        >
          <div className="panelSectionTitle" style={{ marginBottom: 8 }}>Hızlı erişim</div>
          <div className="saActions">
            <button className="btn sm" onClick={() => navigate("/superadmin/companies")}>Şirketler</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/rooms")}>Operasyon Odaları</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/users")}>Kullanıcılar</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/regions")}>Bölgeler</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/audit")}>İşlem Kayıtları</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/observability")}>Canlı İzleme</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/acceptance")}>Kabul Merkezi</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/ssot-alignment")}>Sistem Standartları</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/commercial-core")}>Ticari Akış</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/trust-quality")}>Güven + Kalite</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/copilot")}>Yardımcı</button>
                    <button className="btn sm" onClick={() => navigate("/superadmin/pilot-launch-gate")}>Sahaya Çıkış Kontrolü</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/operation-verification")}>Operasyon Doğrulama</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/logexport")}>Log Dışa Aktarımı</button>
          </div>
          {err ? <div style={{ marginTop: 10, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
        </div>

        {/* Summary */}
        <div
          style={{
            flex: "1 1 320px",
            padding: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        >
          <div className="panelSectionTitle" style={{ marginBottom: 8 }}>Özet</div>

          <div className="panelBody">Şirket (aktif/toplam): {fmtActiveTotal(stats.companies, stats.companiesTotal)}</div>
          <div className="panelBody" style={{ marginTop: 6 }}>Operasyon odası (aktif/toplam): {fmtActiveTotal(stats.rooms, stats.roomsTotal)}</div>
          <div className="panelBody" style={{ marginTop: 6 }}>Araç sayısı: {stats.vehiclesTotal ?? stats.vehicles ?? "-"}</div>
          <div className="panelBody" style={{ marginTop: 6 }}>Şoför sayısı: {stats.driversTotal ?? stats.drivers ?? "-"}</div>

          <div className="panelMeta" style={{ marginTop: 10 }}>
            Not: Özet “aktif” sayıları silinmiş olarak işaretlenen kayıtları hariç tutar.
          </div>
        </div>

        <div
          style={{
            flex: "1 1 420px",
            padding: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        >
          <div className="panelSectionTitle" style={{ marginBottom: 8 }}>Bölüm rehberi</div>
          <div className="panelMeta" style={{ marginBottom: 10 }}>
            Hangi menünün ne işe yaradığını hızlıca buradan okuyabilirsin.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {MENU_GUIDE.map((item) => (
              <div
                key={item.title}
                style={{
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <div className="panelSectionTitle" style={{ marginBottom: 4 }}>{item.title}</div>
                <div className="panelMeta">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo accounts */}
        <details
          style={{
            flex: "1 1 320px",
            padding: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
          }}
        >
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Demo hesapları (kurulum / debug)</summary>

          <div className="panelMeta" style={{ marginTop: 8 }}>
            Gerekmedikçe kapalı kalır. Canlı ortamda demo hesapları kullanmayın.
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn sm" onClick={() => copyText(DEMO_ACCOUNTS.map((a) => a.email).join("\n"))}>
              Mailleri Kopyala
            </button>
            <div className="panelMeta">
              Şifre: <b>{DEMO_PASSWORD}</b>
            </div>
            <button className="btn sm" onClick={() => copyText(DEMO_PASSWORD)}>
              Şifreyi Kopyala
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {DEMO_ACCOUNTS.map((a) => (
              <div
                key={a.email}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <code style={{ opacity: 0.9 }}>{a.email}</code>
                    <Pill status="ROLE">{trRole(a.role)}</Pill>
                  </div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>
                    {a.name} • {a.scope}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn sm" onClick={() => copyText(a.email)}>
                    Kopyala
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div style={{ marginTop: 14 }}>
        <FeedbackLoopSection
          title="Gelen geri bildirimler"
          subtitle="Sahadan gelen notları ve yıldızlı değerlendirmeleri Super Admin buradan okur ve durumlarını günceller."
          mode="review"
        />
      </div>
    </div>
  );
}

