import { useEffect, useMemo, useState } from "react";
import { loadActionableEventsBundle } from "../utils/dashboardBulk";

const GROUPS = ["KRİTİK", "BUGÜN ÇÖZÜLMELİ", "TAKİP EDİLMELİ", "FIRSAT"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function roleKey(me) {
  if (me?.role === "COMPANY") {
    const kind = String(me?.companyKind || "").toUpperCase();
    if (kind === "SCHOOL") return "SCHOOL";
    if (kind === "ORGANIZATION") return "ORGANIZATION";
  }
  return String(me?.role || "").toUpperCase();
}

export default function OperationsCommandCenter({ me, token }) {
  const role = roleKey(me);
  const [payload, setPayload] = useState(null);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = `${role}:${token ? "authenticated" : "anonymous"}`;

  useEffect(() => {
    let active = true;
    loadActionableEventsBundle({ token, force: true }).then((next) => {
      if (active) setPayload(next);
    }).finally(() => {
      if (active) setLoadedKey(requestKey);
    });
    return () => { active = false; };
  }, [role, token, requestKey]);

  const events = useMemo(() => asArray(payload?.events), [payload]);
  const primaryEvents = useMemo(() => events.slice(0, 5), [events]);
  const secondaryEvents = useMemo(() => events.slice(5), [events]);
  const grouped = useMemo(() => {
    const source = payload?.summary?.byGroup || {};
    return GROUPS.reduce((result, group) => {
      result[group] = Number(source[group] || 0);
      return result;
    }, {});
  }, [payload]);
  const loading = loadedKey !== requestKey;
  const sourceUnavailable = !loading && !payload;

  return (
    <section className="roleCommandCenter" data-command-center="true" data-command-center-role={role} data-command-center-source={payload?.source || "unavailable"} aria-labelledby="command-center-title">
      <div className="roleCommandCenterHead">
        <div>
          <div className="roleSectionKicker">GÜNCEL OPERASYON DURUMU</div>
          <h2 id="command-center-title" className="roleSectionTitle">Sorunlar ve fırsatlar</h2>
          <p className="roleSectionLead">Yetkili güncel kayıtlar tek kaynaktan önem sırasıyla görünür. Önce özeti oku, sonra tek ana adımla ilerle.</p>
        </div>
        <div className="roleCommandCenterCounts" aria-label="Aksiyon grupları">
          {GROUPS.map((group) => <span key={group} className="roleSignalCount">{group}: {grouped[group]}</span>)}
        </div>
      </div>

      {loading ? <div className="roleCommandCenterEmpty" role="status">Aksiyon özeti okunuyor…</div> : null}
      {sourceUnavailable ? (
        <div className="roleCommandCenterEmpty" role="status" data-command-center-unavailable="true">
          <strong>Aksiyon özeti şu an okunamadı.</strong>
          <span>Bu durum yeni bir kaydın olmadığı anlamına gelmez. Biraz sonra tekrar deneyebilirsin.</span>
        </div>
      ) : null}
      {!loading && payload && !events.length ? (
        <div className="roleCommandCenterEmpty" data-command-center-empty="true">
          <strong>Şu an açık bir sorun veya fırsat görünmüyor.</strong>
          <span>Yetkili güncel kayıtlarda şu anda karar veya takip gerektiren bir iş yok.</span>
        </div>
      ) : null}
      {!loading && payload && events.length ? (
        <>
          <div className="roleSignalGroup" data-signal-group="SORUN / FIRSAT">
            <div className="roleSignalGroupTitle">SORUN / FIRSAT</div>
            <div className="roleCommandCenterPrimaryList">
              {primaryEvents.map((item, index) => (
                <article key={item.id} className="roleSignalCard" data-actionable-event-id={item.id} data-actionable-event-category={item.category} data-actionable-event-source-type={item.sourceType}>
                  <div className="roleSignalCardBody">
                    <h3>{item.title}</h3>
                    <div><b>Ne oldu?</b> {item.whatHappened}</div>
                    <div><b>Neden önemli?</b> {item.why}</div>
                    <div className="roleSignalEvidence"><b>Dayanak:</b> {item.evidence}</div>
                  </div>
                  {index === 0 ? <a className="btn roleSignalAction" data-command-center-primary-action="true" data-primary-action-scope="actionable-events" href={`#${item.actionPath}`}>{item.actionLabel}</a> : null}
                </article>
              ))}
            </div>
          </div>
          {secondaryEvents.length ? (
            <details className="roleTaskDetails" data-command-center-secondary="true">
              <summary>Tüm gelişmeleri göster</summary>
              <div className="roleTaskDetailsBody">
                <div className="roleSignalGroup">
                  {secondaryEvents.map((item) => (
                    <article key={item.id} className="roleSignalCard" data-actionable-event-id={item.id} data-actionable-event-category={item.category} data-actionable-event-source-type={item.sourceType}>
                      <div className="roleSignalCardBody">
                        <h3>{item.title}</h3>
                        <div><b>Ne oldu?</b> {item.whatHappened}</div>
                        <div><b>Dayanak:</b> {item.evidence}</div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
