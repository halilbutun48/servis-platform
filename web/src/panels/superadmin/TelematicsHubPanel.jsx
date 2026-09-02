import { navigate } from "../../router";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import SystemModeSummaryBand from "../../components/SystemModeSummaryBand";

function trRole(role) {
  if (role === "SUPER_ADMIN") return "Süper Yönetici";
  if (role === "ROOM") return "Taşımacılık Firması";
  if (role === "COMPANY") return "Hizmet Alan Firma";
  if (role === "DRIVER") return "Sürücü";
  if (role === "PERSONEL") return "Personel";
  if (role === "PARENT") return "Veli";
  return role || "-";
}

function Pill({ children, status = "INFO" }) {
  return (
    <span className="pill" data-status={status}>
      {children}
    </span>
  );
}

function HubCard({ title, desc, items, tone = "INFO" }) {
  return (
    <div className="card" style={{ padding: 14, display: "grid", gap: 10, alignContent: "start" }}>
      <div>
        <div className="panelSectionTitle">{title}</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>{desc}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(items || []).map((item) => (
          <Pill key={item} status={tone}>
            {item}
          </Pill>
        ))}
      </div>
    </div>
  );
}

const PROVIDER_CATALOG = [
  "Arvento",
  "Mobiliz",
  "Filobil",
  "Genel veri bağlantısı",
  "Veri bildirimi",
  "Excel/CSV içe aktarımı",
  "Özel entegrasyon talebi",
];

const CONNECTION_TYPES = [
  "Zamanlanmış veri sorgusu",
  "Anlık veri bildirimi",
  "Excel/CSV içe aktarımı",
  "Özel entegrasyon talebi",
  "TCP/device bridge",
];

const TEMPLATE_STATUSES = [
  "AVAILABLE",
  "CONFIG_TEMPLATE_READY",
  "NEEDS_REVIEW",
  "DISABLED",
];

const SECURITY_REQUIREMENTS = [
  "Gizli anahtar politikası",
  "Veri bildirimi doğrulaması",
  "İstek sınırı",
  "İzinli ağ listesi",
  "KVKK / veri minimizasyonu",
  "Ham veriyi maskeleme",
];

const ROOM_MATCH_FIELDS = [
  "Plaka",
  "Cihaz numarası",
  "Harici cihaz numarası",
  "Seri numarası",
];

export default function TelematicsHubPanel() {
  const { me } = useSession();

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Konum veri sağlayıcıları"
        subtitle={`${me?.email || "-"} • ${trRole(me?.role)}`}
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={() => navigate("/superadmin")}>
              Genel Bakış
            </button>
            <button className="btn sm primary" onClick={() => navigate("/superadmin/onboarding-review")}>
              Başvuru İncelemesi
            </button>
          </div>
        )}
      />

      <SystemModeSummaryBand />

      <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div>
          <div className="panelSectionTitle">Bu yüzey ne yönetir?</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Süper Yönetici platform veri sağlayıcıları kataloğunu, bağlantı şablonlarını ve güvenlik / KVKK kurallarını yönetir.
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Taşımacılık Firması kendi konum hesabını yalnızca onaylı sağlayıcı kataloğu üzerinden bağlar; gerçek sağlayıcı entegrasyonu, veri alma, zamanlanmış sorgu, cihaz köprüsü ve gizli anahtar saklama bu sürümde açılmaz.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Pill status="OK">Sağlayıcı kataloğu hazır</Pill>
          <Pill status="INFO">Bağlantı şablonları okunur</Pill>
          <Pill status="WARN">Özel entegrasyonlar insan incelemesi ister</Pill>
          <Pill status="PASS">Taşımacılık Firması işlemleri izinli sağlayıcı üzerinden</Pill>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <HubCard
          title="Sağlayıcı kataloğu"
          desc="Platform veri sağlayıcıları ve bağlantı görünürlüğü."
          items={PROVIDER_CATALOG}
          tone="ROLE"
        />
        <HubCard
          title="Bağlantı tipleri"
          desc="İzinli bağlantı biçimleri ve genişleme yolları."
          items={CONNECTION_TYPES}
          tone="INFO"
        />
        <HubCard
          title="Şablon durumu"
          desc="Sağlayıcı şablonlarının inceleme durumu."
          items={TEMPLATE_STATUSES}
          tone="INFO"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
          <div>
            <div className="panelSectionTitle">Güvenlik / KVKK</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Gizli anahtar, veri alma güvenliği ve veri minimizasyonu kuralları bu yüzeyde görünür.
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SECURITY_REQUIREMENTS.map((item) => (
              <Pill key={item} status={item.includes("Gizli") || item.includes("Ham") ? "WARN" : "ROLE"}>
                {item}
              </Pill>
            ))}
          </div>
          <div className="panelMeta">
            Not: gizli anahtar politikası, veri bildirimi doğrulaması, istek sınırı ve izinli ağ kararları platform tarafından yönetilir; Taşımacılık Firması bu ayrıntıları görmez.
          </div>
        </div>

      <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div>
          <div className="panelSectionTitle">Özel sağlayıcı incelemesi</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Yeni sağlayıcı veya özel entegrasyon talebi burada inceleme kuyruğuna gider.
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Pill status="WARN">İnceleme gerekli</Pill>
          <Pill status="ROLE">Kullanılabilir</Pill>
          <Pill status="INFO">Bağlantı şablonu hazır</Pill>
          <Pill status="PASS">Devre dışı</Pill>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ROOM_MATCH_FIELDS.map((item) => (
            <Pill key={item} status="INFO">
              {item}
            </Pill>
          ))}
        </div>
        <div className="panelMeta">
          Taşımacılık Firması kendi araçlarını plaka, cihaz numarası veya seri numarasıyla eşleştirir; platform yönetimi burada kalır.
        </div>
      </div>
      </div>

      <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div className="panelSectionTitle">Taşımacılık Firması işlemleri notu</div>
        <div className="panelMeta">
            Taşımacılık Firması kendi konum hesabını onaylı sağlayıcı kataloğu üzerinden bağlar, bağlantı hazırlık durumunu okur ve eşleşmeyen cihazları inceleyerek araçlarını eşler.
        </div>
        <div className="panelMeta">
          Bu yüzeyde platform genelindeki bağlantı güvenlik kuralları, gizli anahtar saklama veya ham veri gösterimi yapılmaz.
        </div>
      </div>
    </div>
  );
}
