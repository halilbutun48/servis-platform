import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import SystemModeSummaryBand from "../../components/SystemModeSummaryBand";
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

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function fmtCount(value) {
  if (value == null) return "-";
  return String(value);
}

const MENU_GUIDE = [
  { title: "Genel Bakış", desc: "İlk açılış ekranı. Genel durumu görüp doğru yere buradan geçersin." },
  { title: "Şirketler", desc: "Şirket kayıtları, kapsam ve bağlı yapıların yönetimi." },
  { title: "Operasyon Odaları", desc: "Operasyon odaları, araç ve sürücü omurgasının merkezi." },
  { title: "Kullanıcılar", desc: "Kullanıcı hesapları, roller ve erişim görünümü." },
  { title: "İller ve Bölgeler", desc: "İl ve bölge tanımlarının yönetimi." },
  { title: "İşlem Kayıtları", desc: "Kim, ne zaman, hangi işlemi yaptı sorusunun kaydı." },
  { title: "Canlı İzleme", desc: "Sistemin ve sahadaki akışın canlı görünümü." },
  { title: "Kabul Merkezi", desc: "Saha kabul ve doğrulama işlerinin ana ekranı." },
  { title: "Check-in", desc: "ROOM, COMPANY, SCHOOL ve ORGANIZATION için check-in izleme ve hızlı geçiş alanı." },
  { title: "Operasyon Doğrulama", desc: "Checklist, kanıt ve sonuç kaydı için kullanılan ekran." },
  { title: "Sistem Standartları", desc: "Resmi doküman, paket ve çalışma hattının aynı kurala göre ilerlediğini gösterir." },
  { title: "Ticari Akış", desc: "Talep, teklif, pazarlık ve sözleşme adımlarını tek akışta özetler." },
  { title: "Güven ve Kalite", desc: "Kalite, hizmet değerlendirme ve güven görünümü." },
  { title: "Telematik / GPS Sağlayıcıları", desc: "Provider registry, cihaz eşleştirme ve readonly telematics signals görünürlüğü." },
  { title: "Başvuru İncelemesi", desc: "Public lead başvurularını insan onayıyla sıraya alır." },
  { title: "Yardımcı", desc: "Yardımcı cevabın yapısını ve geri bildirim akışını gösterir." },
  { title: "Sahaya Çıkış Kontrolü", desc: "Canlıya çıkmadan önce son kontrol kapısı." },
  { title: "KVKK", desc: "Veri koruma ve uyum yüzeyi." },
  { title: "Log Dışa Aktarımı", desc: "Sistem kayıtlarını dışa alma ekranı." },
];

const DETAIL_TABS = [
  { key: "system", label: "Sistem Detayları" },
  { key: "feedbacks", label: "Geri Bildirimler" },
  { key: "demo", label: "Demo Hesapları" },
];

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

function Pill({ children, status }) {
  return (
    <span className="pill" data-status={status || "ROLE"}>
      {children}
    </span>
  );
}

function StatTile({ label, value, tone = "INFO" }) {
  return (
    <div style={{ padding: 10, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
      <div className="panelMeta">{label}</div>
      <div className="panelSectionTitle" style={{ marginTop: 4 }}>
        <span className="pill" data-status={tone}>{value}</span>
      </div>
    </div>
  );
}

function DemoAccountsBody() {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div>
        <div className="panelSectionTitle">Demo Hesapları</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          Demo hesapları, kurulum notları ve hızlı erişim bilgileri burada tutulur. Varsayılan olarak kapalı kalabilir.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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

      <div style={{ display: "grid", gap: 8 }}>
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
    </div>
  );
}

function SystemDetailsBody({ me, stats, feedbackCount }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div>
        <div className="panelSectionTitle">Sistem detayları</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          Ayrıntılı sistem okuması, erişim özeti ve güvenli mod notları bu alanda tutulur.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <StatTile label="Oturum" value={me?.email || "-"} />
        <StatTile label="Rol" value={trRole(me?.role)} />
        <StatTile label="Şirket" value={fmtCount(stats.companiesTotal ?? stats.companies)} />
        <StatTile label="Oda" value={fmtCount(stats.roomsTotal ?? stats.rooms)} />
        <StatTile label="Araç" value={fmtCount(stats.vehiclesTotal ?? stats.vehicles)} />
        <StatTile label="Sürücü" value={fmtCount(stats.driversTotal ?? stats.drivers)} />
        <StatTile label="Geri bildirim" value={String(feedbackCount || 0)} tone={feedbackCount > 0 ? "WARN" : "OK"} />
      </div>

      <div className="panelMeta">
        Not: Bu yüzey sadece okuma ve yönlendirme içindir; ödeme, hakediş veya diğer write akışları burada başlatılmaz.
      </div>
    </div>
  );
}

const TELEMATICS_PROVIDER_STATUSES = [
  "NOT_CONNECTED",
  "CONFIG_REQUIRED",
  "TESTING",
  "READY",
  "ACTIVE",
  "ERROR",
  "DISABLED",
];

const TELEMATICS_MATCH_STATUSES = [
  "MATCHED",
  "NEEDS_REVIEW",
  "UNMATCHED",
  "DUPLICATE_MATCH",
  "DISABLED",
];

const TELEMATICS_REGISTRY_FIELDS = [
  "provider key/name",
  "supported connection type",
  "connection status",
  "last data time",
  "data delay",
  "matched vehicle count",
  "unmatched device count",
  "error count",
  "health status",
];

const TELEMATICS_FLOW_STEPS = [
  "Ayarlar / Telematik Entegrasyonları",
  "GPS sağlayıcı seçimi",
  "bağlantı tipi seçimi",
  "test bağlantısı",
  "örnek veri normalizasyonu",
  "cihaz eşleştirme",
  "eşleşmeyen cihazlar",
  "onay",
  "ACTIVE + readonly telematics signals",
];

function TelematicsProviderHubCard() {
  return (
    <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
      <div>
        <div className="panelSectionTitle">Telematik / GPS Sağlayıcıları</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          Provider-agnostic telematics hub, Ayarlar / Telematik Entegrasyonları ve ROOM eşleştirme görünürlüğünü tek readonly kartta toplar.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
          <div className="panelSectionTitle">User GPS entegrasyon akışı</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Ayarlar / Telematik Entegrasyonları → sağlayıcı seç → bağlantı tipi seç → test bağlantısı → cihaz eşleştirme → onay → ACTIVE.
          </div>
          <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
            {TELEMATICS_FLOW_STEPS.map((step) => (
              <div key={step} className="panelMeta" style={{ fontSize: 12, lineHeight: 1.4 }}>
                • {step}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
          <div className="panelSectionTitle">Provider registry</div>
          <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
            {TELEMATICS_REGISTRY_FIELDS.map((field) => (
              <div key={field} className="panelMeta" style={{ fontSize: 12, lineHeight: 1.4 }}>
                • {field}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TELEMATICS_PROVIDER_STATUSES.map((status) => (
          <Pill key={status} status="INFO">
            {status}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TELEMATICS_MATCH_STATUSES.map((status) => (
          <Pill key={status} status={status === "DISABLED" ? "WARN" : "ROLE"}>
            {status}
          </Pill>
        ))}
      </div>

      <div className="panelMeta">
        Safe boundary: gizli erişim bilgileri repo'ya yazılmaz; gerçek sağlayıcı entegrasyonu bu sürümde yoktur; yalnızca salt-okunur telematik sinyaller gösterilir.
      </div>
    </div>
  );
}

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
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackErr, setFeedbackErr] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState("system");
  const telematicsHubRef = useRef(null);

  const loadStats = useCallback(async () => {
    if (!token) return;
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
  }, [token]);

  const loadFeedback = useCallback(async () => {
    if (!token) return;
    setFeedbackBusy(true);
    setFeedbackErr("");
    try {
      const response = await api("/api/pilot-launch-gate/field-feedback-loop/records", { token });
      const list = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
      setFeedbackItems(list);
    } catch (error) {
      setFeedbackErr(String(error?.message || error));
      setFeedbackItems([]);
    } finally {
      setFeedbackBusy(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadStats();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadFeedback();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFeedback]);

  const fmtActiveTotal = (active, total) => {
    if (active == null && total == null) return "-";
    if (total == null) return String(active ?? "-");
    return `${active ?? "-"} / ${total}`;
  };

  const feedbackSummary = useMemo(() => {
    const total = feedbackItems.length;
    const active = feedbackItems.filter((item) => !["COZULDU", "KAPANDI"].includes(String(item?.status || "").toUpperCase())).length;
    const latestAt = feedbackItems[0]?.updatedAt || feedbackItems[0]?.createdAt || null;
    return { total, active, latestAt };
  }, [feedbackItems]);

  const goToTelematicsHub = useCallback(() => {
    telematicsHubRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

      <SystemModeSummaryBand />

      {feedbackSummary.active > 0 ? (
        <div
          className="card"
          style={{
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="panelSectionTitle">Kritik geri bildirim</div>
            <div className="panelMeta" style={{ marginTop: 4 }}>
              Yeni geri bildirim var · {feedbackSummary.active} kayıt
              {feedbackSummary.latestAt ? <> • Son kayıt: {fmtTR(feedbackSummary.latestAt)}</> : null}
            </div>
          </div>
          <button className="btn sm primary" onClick={() => setActiveDetailTab("feedbacks")}>
            Geri Bildirimleri aç
          </button>
        </div>
      ) : null}

      <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="panelSectionTitle">Alt detay alanları</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
              Geri bildirimler, demo hesapları ve sistem detayları ana dashboardu şişirmeden burada tutulur.
          </div>
          </div>
          <div className="panelMeta">
            {feedbackBusy ? "Geri bildirimler yenileniyor..." : feedbackSummary.total ? `Toplam geri bildirim: ${feedbackSummary.total}` : "Geri bildirim yok"}
          </div>
        </div>

        <PanelSegmentTabs
          tabs={DETAIL_TABS}
          value={activeDetailTab}
          onChange={setActiveDetailTab}
          ariaLabel="Süper Yönetici detay alanları"
          compact
        />

        <div style={{ minWidth: 0 }}>
          {activeDetailTab === "feedbacks" ? (
            <FeedbackLoopSection
              title="Gelen geri bildirimler"
              subtitle="Sahadan gelen notları ve yıldızlı değerlendirmeleri Super Admin buradan okur ve durumlarını günceller."
              mode="review"
              compact
            />
          ) : null}

          {activeDetailTab === "demo" ? <DemoAccountsBody /> : null}

          {activeDetailTab === "system" ? (
            <SystemDetailsBody me={me} stats={stats} feedbackCount={feedbackSummary.active} />
          ) : null}

          {feedbackErr && activeDetailTab === "feedbacks" ? (
            <div className="panelMeta" style={{ marginTop: 10, color: "#fca5a5", whiteSpace: "pre-wrap" }}>
              {feedbackErr}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          alignItems: "start",
        }}
      >
        <div className="card" style={{ padding: 14 }}>
          <div className="panelSectionTitle" style={{ marginBottom: 8 }}>Hızlı erişim</div>
          <div className="saActions">
            <button className="btn sm" onClick={() => navigate("/superadmin/companies")}>Şirketler</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/rooms")}>Operasyon Odaları</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/users")}>Kullanıcılar</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/regions")}>İller ve Bölgeler</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/audit")}>İşlem Kayıtları</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/operations")}>Denetim Paneli</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/observability")}>Canlı İzleme</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/acceptance")}>Kabul Merkezi</button>
            <button className="btn sm" onClick={() => navigate("/room/checkin")}>Check-in</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/ssot-alignment")}>Sistem Standartları</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/commercial-core")}>Ticari Akış</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/trust-quality")}>Güven ve Kalite</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/onboarding-review")}>Başvuru İncelemesi</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/copilot")}>Yardımcı</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/pilot-launch-gate")}>Sahaya Çıkış Kontrolü</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/operation-verification")}>Operasyon Doğrulama</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/logexport")}>Log Dışa Aktarımı</button>
            <button className="btn sm" onClick={goToTelematicsHub}>Telematik / GPS Sağlayıcıları</button>
          </div>
          {err ? <div style={{ marginTop: 10, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
        </div>

        <div ref={telematicsHubRef}>
          <TelematicsProviderHubCard />
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="panelSectionTitle" style={{ marginBottom: 8 }}>Özet</div>

          <div className="panelBody">Şirket (aktif/toplam): {fmtActiveTotal(stats.companies, stats.companiesTotal)}</div>
          <div className="panelBody" style={{ marginTop: 6 }}>Operasyon odası (aktif/toplam): {fmtActiveTotal(stats.rooms, stats.roomsTotal)}</div>
          <div className="panelBody" style={{ marginTop: 6 }}>Araç sayısı: {stats.vehiclesTotal ?? stats.vehicles ?? "-"}</div>
          <div className="panelBody" style={{ marginTop: 6 }}>Şoför sayısı: {stats.driversTotal ?? stats.drivers ?? "-"}</div>

          <div className="panelMeta" style={{ marginTop: 10 }}>
            Not: Özet “aktif” sayıları silinmiş olarak işaretlenen kayıtları hariç tutar.
          </div>
        </div>

        <div className="card" style={{ padding: 14, maxHeight: 360, overflow: "auto" }}>
          <div className="panelSectionTitle" style={{ marginBottom: 8 }}>Bölüm rehberi</div>
          <div className="panelMeta" style={{ marginBottom: 10 }}>
            Hangi menünün ne işe yaradığını hızlıca buradan okuyabilirsin.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {MENU_GUIDE.map((item) => (
              <div
                key={item.title}
                style={{
                  padding: "8px 10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}
              >
                <div className="panelSectionTitle" style={{ marginBottom: 4 }}>{item.title}</div>
                <div className="panelMeta" style={{ fontSize: 12, lineHeight: 1.35 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
