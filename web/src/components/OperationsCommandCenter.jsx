import { useEffect, useMemo, useState } from "react";
import { loadCompanyOperationsBundle, loadRoomOperationHealthBundle, loadSchoolOperationsBundle, loadSuperAdminOverviewBundle } from "../utils/dashboardBulk";

const GROUPS = ["KRİTİK", "BUGÜN ÇÖZÜLMELİ", "TAKİP EDİLMELİ", "FIRSAT"];

function roleKey(me) {
  if (me?.role === "COMPANY") {
    const kind = String(me?.companyKind || "").toUpperCase();
    if (kind === "SCHOOL") return "SCHOOL";
    if (kind === "ORGANIZATION") return "ORGANIZATION";
  }
  return String(me?.role || "").toUpperCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function event({ id, group, title, importance, impact, actionLabel, actionPath, evidence, sourceOwner = "Operasyon özeti" }) {
  return { id, group, title, importance, impact, actionLabel, actionPath, evidence, sourceOwner };
}

function deriveEvents(role, payload) {
  const rows = [];
  if (!payload) return rows;
  for (const item of asArray(payload.errors)) {
    rows.push(event({
      id: `error:${item.section}`,
      group: "KRİTİK",
      title: "Özet verisi tamamlanamadı",
      importance: `${item.section || "Bir veri bölümü"} okunamadı.`,
      impact: "Bu bölümün ayrıntısını kontrol etmek gerekebilir.",
      actionLabel: "Operasyon merkezini yenile",
      actionPath: role === "ROOM" ? "/room" : role === "SUPER_ADMIN" ? "/superadmin" : role === "SCHOOL" ? "/school" : role === "ORGANIZATION" ? "/organization" : "/company",
      evidence: "Özet verisi okunamadı",
    }));
  }

  if (role === "ROOM") {
    const cards = payload.summary?.cards || {};
    if (Number(cards.openIssues || 0) > 0) rows.push(event({ id: "room:open-issues", group: "KRİTİK", title: "Açık operasyon sorunu var", importance: `${cards.openIssues} açık sorun takip bekliyor.`, impact: "Saha akışında gecikme veya görünürlük riski olabilir.", actionLabel: "Operasyon sağlığını incele", actionPath: "/room/operation-health", evidence: `Açık sorun sayısı: ${cards.openIssues}` }));
    if (Number(cards.riskyDevices || 0) > 0 || Number(cards.staleOrOffline || 0) > 0) rows.push(event({ id: "room:gps-signal", group: "TAKİP EDİLMELİ", title: "Konum sinyali kontrol bekliyor", importance: `${cards.riskyDevices || 0} riskli araç, ${cards.staleOrOffline || 0} gecikmiş veya çevrim dışı konum sinyali var.`, impact: "Araç ve görev görünürlüğü etkilenebilir.", actionLabel: "Canlı durumu aç", actionPath: "/room/map", evidence: `Konum sinyali: ${cards.riskyDevices || 0} riskli, ${cards.staleOrOffline || 0} gecikmiş veya çevrim dışı` }));
  }

  if (role === "COMPANY" || role === "ORGANIZATION") {
    const request = asArray(payload.requests)[0];
    if (request) rows.push(event({ id: `company:request:${request.id || 0}`, group: "TAKİP EDİLMELİ", title: "İncelenecek operasyon talebi var", importance: "Talep akışında yanıt bekleyen bir kayıt bulunuyor.", impact: "Planlama veya hizmet akışı bekleyebilir.", actionLabel: "Operasyon panelini aç", actionPath: role === "ORGANIZATION" ? "/organization/operations" : "/company/operations", evidence: "Yanıt bekleyen operasyon talebi" }));
    if (asArray(payload.notifications).length > 0) rows.push(event({ id: "company:notifications", group: "BUGÜN ÇÖZÜLMELİ", title: "Yeni bildirimleri kontrol et", importance: `${payload.notifications.length} bildirim mevcut.`, impact: "Güncel değişiklikler planı etkileyebilir.", actionLabel: "Bildirimleri aç", actionPath: "/shared/notifications", evidence: `Yeni bildirim sayısı: ${payload.notifications.length}` }));
  }

  if (role === "SCHOOL") {
    const pendingInvite = asArray(payload.invites).find((item) => !["ACCEPTED", "USED", "CANCELLED"].includes(String(item?.status || "").toUpperCase()));
    if (pendingInvite) rows.push(event({ id: `school:invite:${pendingInvite.id || 0}`, group: "TAKİP EDİLMELİ", title: "Veli erişimi takip bekliyor", importance: "Erişim davetlerinden en az biri tamamlanmamış.", impact: "Veli, servis bilgilerine henüz erişemeyebilir.", actionLabel: "Veli erişimini aç", actionPath: "/school/parents", evidence: "Tamamlanmamış veli erişimi" }));
  }

  if (role === "SUPER_ADMIN") {
    const active = Number(payload.feedbackSummary?.active || 0);
    if (active > 0) rows.push(event({ id: "superadmin:feedback", group: "BUGÜN ÇÖZÜLMELİ", title: "Açık geri bildirimler var", importance: `${active} kayıt çözüm takibi bekliyor.`, impact: "Sistem kalitesi ve kullanıcı akışı etkilenebilir.", actionLabel: "Denetim panelini aç", actionPath: "/superadmin/operations", evidence: `Açık geri bildirim sayısı: ${active}` }));
  }

  return rows;
}

async function loadSignals(role, token) {
  if (!token) return null;
  if (role === "ROOM") return loadRoomOperationHealthBundle({ token });
  if (role === "SCHOOL") return loadSchoolOperationsBundle({ token });
  if (role === "COMPANY" || role === "ORGANIZATION") return loadCompanyOperationsBundle({ token });
  if (role === "SUPER_ADMIN") return loadSuperAdminOverviewBundle({ token });
  return { bundle: "context-only", generatedAt: new Date().toISOString(), errors: [] };
}

export default function OperationsCommandCenter({ me, token }) {
  const role = roleKey(me);
  const [payload, setPayload] = useState(null);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = `${role}:${token ? "authenticated" : "anonymous"}`;

  useEffect(() => {
    let active = true;
    loadSignals(role, token).then((next) => {
      if (active) setPayload(next);
    }).finally(() => {
      if (active) setLoadedKey(requestKey);
    });
    return () => { active = false; };
  }, [role, token, requestKey]);

  const events = useMemo(() => deriveEvents(role, payload), [role, payload]);
  const loading = loadedKey !== requestKey;
  const grouped = useMemo(() => GROUPS.reduce((result, group) => {
    result[group] = events.filter((item) => item.group === group);
    return result;
  }, {}), [events]);

  return (
    <section className="roleCommandCenter" data-command-center="true" data-command-center-role={role} aria-labelledby="command-center-title">
      <div className="roleCommandCenterHead">
        <div>
          <div className="roleSectionKicker">OPERASYON KOMUTA MERKEZİ</div>
          <h2 id="command-center-title" className="roleSectionTitle">Sorunlar ve fırsatlar</h2>
          <p className="roleSectionLead">Mevcut operasyon sinyalleri burada önem sırasıyla görünür. Her kayıt kaynağına ve güvenli sonraki adıma bağlıdır.</p>
        </div>
        <div className="roleCommandCenterCounts" aria-label="Sinyal grupları">
          {GROUPS.map((group) => <span key={group} className="roleSignalCount">{group}: {grouped[group].length}</span>)}
        </div>
      </div>

      {loading ? <div className="roleCommandCenterEmpty">Sinyaller okunuyor…</div> : null}
      {!loading && !events.length ? (
        <div className="roleCommandCenterEmpty" data-command-center-empty="true">
          <strong>Şu an açık bir sinyal görünmüyor.</strong>
          <span>Yeni bir sorun veya takip gerektiren durum oluştuğunda burada gösterilir.</span>
        </div>
      ) : null}
      {!loading && events.length ? (
        <div className="roleCommandCenterGroups">
          {GROUPS.map((group) => grouped[group].length ? (
            <section key={group} className="roleSignalGroup" data-signal-group={group}>
              <div className="roleSignalGroupTitle">{group}</div>
              {grouped[group].map((item) => (
                <article key={item.id} className="roleSignalCard">
                  <div className="roleSignalCardBody">
                    <h3>{item.title}</h3>
                    <div><b>Ne oldu?</b> {item.importance}</div>
                    <div><b>Neden önemli?</b> {item.impact}</div>
                    <div className="roleSignalEvidence"><b>Dayanak:</b> {item.evidence}</div>
                  </div>
                  <a className="btn roleSignalAction" href={`#${item.actionPath}`}>{item.actionLabel}</a>
                </article>
              ))}
            </section>
          ) : null)}
        </div>
      ) : null}
    </section>
  );
}
