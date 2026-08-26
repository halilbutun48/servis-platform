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
  "Generic API",
  "Webhook",
  "Excel/CSV import",
  "Özel entegrasyon talebi",
];

const CONNECTION_TYPES = [
  "API polling",
  "Webhook push",
  "Excel/CSV import",
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
  "secret/token policy",
  "webhook signature requirement",
  "rate limit",
  "IP allowlist",
  "KVKK / veri minimizasyonu",
  "raw payload masking",
];

const ROOM_MATCH_FIELDS = [
  "plate",
  "IMEI",
  "deviceId",
  "externalDeviceId",
  "serial",
];

export default function TelematicsHubPanel() {
  const { me } = useSession();

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Telematik / GPS Sağlayıcıları"
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
            Super Admin platform provider kataloğunu, adapter şablonlarını ve güvenlik / KVKK kurallarını yönetir.
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Taşımacılık Firması kendi GPS hesabını yalnızca onaylı provider kataloğu üzerinden bağlar; gerçek provider entegrasyonu, webhook ingest, polling job, TCP bridge ve secret saklama bu sürümde açılmaz.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Pill status="OK">Provider kataloğu hazır</Pill>
          <Pill status="INFO">Adapter şablonları okunur</Pill>
          <Pill status="WARN">Özel entegrasyonlar insan incelemesi ister</Pill>
          <Pill status="PASS">Taşımacılık Firması kendi işlemleri izinli provider üzerinden</Pill>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <HubCard
          title="Provider kataloğu"
          desc="Platform-level provider kataloğu ve adapter görünürlüğü."
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
          title="Template readiness"
          desc="Provider şablon ve inceleme durumları."
          items={TEMPLATE_STATUSES}
          tone="INFO"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
          <div>
            <div className="panelSectionTitle">Güvenlik / KVKK</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Secret / token, webhook güvenliği ve veri minimizasyonu kuralları bu yüzeyde görünür.
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SECURITY_REQUIREMENTS.map((item) => (
              <Pill key={item} status={item.includes("secret") ? "WARN" : "ROLE"}>
                {item}
              </Pill>
            ))}
          </div>
          <div className="panelMeta">
            Not: `secret/token policy`, `webhook signature requirement`, `rate limit` ve `IP allowlist` kararları platform tarafından yönetilir; Taşımacılık Firması bu detayları görmez.
          </div>
        </div>

      <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div>
          <div className="panelSectionTitle">Custom provider review</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Yeni provider veya özel entegrasyon talebi burada inceleme kuyruğuna gider.
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Pill status="WARN">NEEDS_REVIEW</Pill>
          <Pill status="ROLE">AVAILABLE</Pill>
          <Pill status="INFO">CONFIG_TEMPLATE_READY</Pill>
          <Pill status="PASS">DISABLED</Pill>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ROOM_MATCH_FIELDS.map((item) => (
            <Pill key={item} status="INFO">
              {item}
            </Pill>
          ))}
        </div>
        <div className="panelMeta">
          Taşımacılık Firması kendi araçlarını plate / IMEI / deviceId / externalDeviceId / serial üzerinden eşleştirir; platform yönetimi burada kalır.
        </div>
      </div>
      </div>

      <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div className="panelSectionTitle">Taşımacılık Firması işlemleri notu</div>
        <div className="panelMeta">
            Taşımacılık Firması kendi GPS hesabını onaylı provider kataloğu üzerinden bağlar, bağlantı readiness durumunu okur ve eşleşmeyen cihazları inceleyerek araçlarını eşler.
        </div>
        <div className="panelMeta">
          Bu yüzeyde platform genelindeki adapter güvenlik kuralları, secret saklama veya raw payload gösterimi yapılmaz.
        </div>
      </div>
    </div>
  );
}
