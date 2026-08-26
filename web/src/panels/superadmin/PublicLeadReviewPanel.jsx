import { useCallback, useEffect, useMemo, useState } from "react";
import { listPublicLeadReviewQueue, updatePublicLeadReviewStatus } from "../../api";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { displayStatusLabel } from "../../utils/displayStatus";
import { statusBadgeInlineStyle } from "../../utils/statusBadge";

const LEAD_TYPE_LABELS = {
  DEMO_REQUEST: "Demo talebi",
  LIVE_SUPPORT_REQUEST: "Canlı destek",
  SERVICE_NEED: "Servis ihtiyacı",
  SUPPLIER_APPLICATION: "Tedarikçi başvurusu",
};

function fmtTR(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function safeText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function maskPhone(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
}

function maskEmail(value) {
  const text = String(value ?? "").trim();
  if (!text || !text.includes("@")) return null;
  const [local, domain] = text.split("@");
  const safeLocal = local.length <= 2 ? `${local[0] || "*"}***` : `${local.slice(0, 2)}***`;
  const parts = String(domain || "").split(".");
  if (!parts.length) return `${safeLocal}@***`;
  parts[0] = `${String(parts[0] || "").slice(0, 1)}***`;
  return `${safeLocal}@${parts.join(".")}`;
}

function leadTypeLabel(type) {
  return LEAD_TYPE_LABELS[String(type || "").trim().toUpperCase()] || String(type || "-");
}

function buildContactSummary(item) {
  const phone = item?.phoneMasked || maskPhone(item?.phone);
  const email = item?.emailMasked || maskEmail(item?.email);
  return [
    phone ? `Telefon: ${phone}` : "Telefon yok",
    email ? `E-posta: ${email}` : "E-posta yok",
  ].join(" • ");
}

function renderKeyValue(label, value, note = "") {
  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, minWidth: 0 }}>
      <div className="panelMeta">{label}</div>
      <div style={{ marginTop: 4, fontWeight: 800, wordBreak: "break-word" }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 4 }}>{note}</div> : null}
    </div>
  );
}

function renderObjectBlock(title, rows) {
  if (!rows?.length) return null;
  return (
    <div className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
      <div className="panelSectionTitle">{title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div className="panelMeta">{row.label}</div>
            <div style={{ fontWeight: 700, textAlign: "right", wordBreak: "break-word" }}>{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicLeadReviewPanel() {
  const { me, token } = useSession();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ total: 0, byStatus: {}, byType: {}, pendingCount: 0, inviteReadyCount: 0, rejectedCount: 0 });
  const [busy, setBusy] = useState(false);
  const [savingLeadId, setSavingLeadId] = useState("");
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [draftReviewNote, setDraftReviewNote] = useState("");
  const [draftOperationNote, setDraftOperationNote] = useState("");

  const loadQueue = useCallback(async (preferredLeadId = "") => {
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const response = await listPublicLeadReviewQueue({ take: 200 }, { token });
      const rows = Array.isArray(response?.items) ? response.items : [];
      setItems(rows);
      setCounts(response?.counts || { total: rows.length, byStatus: {}, byType: {}, pendingCount: 0, inviteReadyCount: 0, rejectedCount: 0 });
      const nextSelectedId = preferredLeadId && rows.some((item) => item.id === preferredLeadId)
        ? preferredLeadId
        : rows[0]?.id || "";
      setSelectedLeadId(nextSelectedId);
    } catch (error) {
      setErr(String(error?.message || error));
      setItems([]);
      setCounts({ total: 0, byStatus: {}, byType: {}, pendingCount: 0, inviteReadyCount: 0, rejectedCount: 0 });
      setSelectedLeadId("");
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadQueue();
  }, [token, loadQueue]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((item) => String(item.status || "").toUpperCase() === statusFilter);
  }, [items, statusFilter]);

  const selectedLead = useMemo(() => {
    if (!filteredItems.length) return null;
    return filteredItems.find((item) => item.id === selectedLeadId) || filteredItems[0] || null;
  }, [filteredItems, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) {
      setDraftReviewNote("");
      setDraftOperationNote("");
      return;
    }
    setDraftReviewNote(String(selectedLead.reviewNote || ""));
    setDraftOperationNote(String(selectedLead.operationNote || ""));
  }, [selectedLead]);

  useEffect(() => {
    if (!selectedLead) {
      clearCopilotSelection("/superadmin/onboarding-review");
      return;
    }

    const summaryParts = [
      selectedLead.statusLabel || displayStatusLabel(selectedLead.status),
      leadTypeLabel(selectedLead.type),
      selectedLead.organizationName || selectedLead.city || selectedLead.district || null,
    ].filter(Boolean);

    setCopilotSelection({
      scopeKey: "/superadmin/onboarding-review",
      entityType: "public-lead",
      entityId: selectedLead.id,
      label: selectedLead.name || "Başvuru incelemesi",
      summary: summaryParts.join(" • "),
      fields: [
        { label: "Durum", value: selectedLead.statusLabel || displayStatusLabel(selectedLead.status), help: "Başvurunun insan inceleme durumunu gösterir." },
        { label: "Tür", value: leadTypeLabel(selectedLead.type), help: "Başvuru tipini gösterir." },
        { label: "İletişim", value: buildContactSummary(selectedLead), help: "Telefon ve e-posta yalnız inceleme amacıyla gösterilir." },
        { label: "KVKK", value: selectedLead.kvkkAccepted ? "Onaylı" : "Eksik", help: "KVKK onayı olmadan ilerleme yoktur." },
        { label: "İnceleme notu", value: safeText(selectedLead.reviewNote || draftReviewNote), help: "İnceleme notunu özetler." },
        { label: "Operasyon notu", value: safeText(selectedLead.operationNote || draftOperationNote), help: "Operasyon notunu özetler." },
      ],
      badges: [
        { label: "Sadece inceleme", value: "Aktif", help: "Bu ekran invite, kullanıcı, ödeme veya sözleşme açmaz." },
        { label: "Kullanıcı onayı", value: "Gerekli", help: "Otomatik onay kapalıdır." },
      ],
      facts: {
        screenType: "PUBLIC_LEAD_REVIEW",
        leadId: selectedLead.id,
        leadType: selectedLead.type,
        leadTypeLabel: leadTypeLabel(selectedLead.type),
        reviewStatus: selectedLead.status,
        reviewStatusLabel: selectedLead.statusLabel || displayStatusLabel(selectedLead.status),
        source: selectedLead.source,
        sourceLabel: selectedLead.sourceLabel || "Public landing",
        humanReviewOnly: true,
        autoInvite: false,
        autoAccountCreation: false,
        autoPayment: false,
        nextBestAction: selectedLead.status === "RECEIVED"
          ? "Başvuruyu incelemeye al ve ilk karar notunu yaz."
          : selectedLead.status === "IN_REVIEW"
            ? "Eksik bilgileri kontrol et ve gerekirse ek bilgi iste."
            : selectedLead.status === "NEEDS_INFO"
              ? "Ek bilgi dönüşünü bekle veya reddetme gerekçesini netleştir."
              : selectedLead.status === "APPROVED_FOR_INVITE"
                ? "Davet hazırlığına uygunluk var; yine de davet veya kullanıcı açma yok."
                : "Kararı ve notları son kez gözden geçir.",
      },
    });

    return () => clearCopilotSelection("/superadmin/onboarding-review");
  }, [draftOperationNote, draftReviewNote, selectedLead]);

  const statusTabs = useMemo(() => {
    const byStatus = counts.byStatus || {};
    const tabs = [
      { key: "ALL", label: "Tümü", badge: counts.total || items.length || 0 },
      { key: "RECEIVED", label: displayStatusLabel("RECEIVED"), badge: byStatus.RECEIVED || 0 },
      { key: "IN_REVIEW", label: displayStatusLabel("IN_REVIEW"), badge: byStatus.IN_REVIEW || 0 },
      { key: "NEEDS_INFO", label: displayStatusLabel("NEEDS_INFO"), badge: byStatus.NEEDS_INFO || 0 },
      { key: "APPROVED_FOR_INVITE", label: displayStatusLabel("APPROVED_FOR_INVITE"), badge: byStatus.APPROVED_FOR_INVITE || 0 },
      { key: "REJECTED", label: displayStatusLabel("REJECTED"), badge: byStatus.REJECTED || 0 },
    ];
    return tabs;
  }, [counts.byStatus, counts.total, items.length]);

  const filteredSummary = useMemo(() => {
    const total = filteredItems.length;
    const pending = filteredItems.filter((item) => ["RECEIVED", "IN_REVIEW", "NEEDS_INFO"].includes(String(item.status || "").toUpperCase())).length;
    const ready = filteredItems.filter((item) => String(item.status || "").toUpperCase() === "APPROVED_FOR_INVITE").length;
    return { total, pending, ready };
  }, [filteredItems]);

  const saveCurrentLead = useCallback(async (nextStatus) => {
    if (!selectedLead?.id || !token || savingLeadId) return;
    const status = String(nextStatus || selectedLead.status || "RECEIVED").trim().toUpperCase();
    setSavingLeadId(selectedLead.id);
    setErr("");
    try {
      await updatePublicLeadReviewStatus(
        selectedLead.id,
        {
          status,
          reviewNote: draftReviewNote,
          operationNote: draftOperationNote,
        },
        { token }
      );
      await loadQueue(selectedLead.id);
    } catch (error) {
      setErr(String(error?.message || error));
    } finally {
      setSavingLeadId("");
    }
  }, [draftOperationNote, draftReviewNote, loadQueue, selectedLead, savingLeadId, token]);

  const saveNotesOnly = useCallback(async () => {
    await saveCurrentLead(selectedLead?.status || "RECEIVED");
  }, [saveCurrentLead, selectedLead]);

  if (me?.role !== "SUPER_ADMIN") {
    return <div className="card err">Bu panel yalnızca SUPER_ADMIN scope için görünür.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Başvuru İnceleme Kuyruğu"
        subtitle="Public lead başvurularını kullanıcı onayıyla okur. Bu yüzey davet, kullanıcı, ödeme, sözleşme veya tedarikçi doğrulama başlatmaz."
        actions={(
          <>
            <button className="btn sm" disabled={busy} onClick={() => loadQueue(selectedLead?.id || "")}>{busy ? "Yenileniyor..." : "Yenile"}</button>
            <button className="btn sm" onClick={() => loadQueue("")} disabled={busy}>İlk kaydı aç</button>
          </>
        )}
      />

      {err ? <div className="card err">{err}</div> : null}

      <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="panelSectionTitle">İnceleme sınırı aktif</div>
            <div className="panelMeta" style={{ marginTop: 4 }}>
              Bu ekran sadece başvuruları listeler ve durum/not günceller. Otomatik hesap, davet, ödeme veya sözleşme açmaz.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill" data-status="INFO">Sadece inceleme</span>
            <span className="pill" data-status="INFO">KVKK kontrollü</span>
            <span className="pill" data-status="WARN">Kullanıcı onayı gerekli</span>
            <span className="pill" data-status="INFO">Read-only sınırları açık</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {renderKeyValue("Toplam başvuru", String(counts.total || items.length || 0), "Tüm kayıtlar") }
          {renderKeyValue("Bekleyen", String(counts.pendingCount ?? filteredSummary.pending), "Received / review / bilgi bekleyen") }
          {renderKeyValue("Davet için uygun", String(counts.inviteReadyCount ?? filteredSummary.ready), "Ama burada invite açılmaz") }
          {renderKeyValue("Filtreli görünüm", String(filteredSummary.total), statusFilter === "ALL" ? "Tüm kayıtlar" : displayStatusLabel(statusFilter)) }
        </div>
      </div>

      <PanelSegmentTabs
        tabs={statusTabs}
        value={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Başvuru durum filtreleri"
        compact
      />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(320px, 1.1fr) minmax(360px, 1.4fr)" }}>
        <div className="card" style={{ padding: 12, minWidth: 0, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div className="panelSectionTitle">Başvuru listesi</div>
              <div className="panelMeta" style={{ marginTop: 4 }}>
                Ad soyad, tip, durum ve maskeli iletişim görünür. Detaylar yalnız seçili kayıtta açılır.
              </div>
            </div>
            <div className="panelMeta">{filteredItems.length ? `${filteredItems.length} kayıt` : "Kayıt yok"}</div>
          </div>

          <div style={{ display: "grid", gap: 8, maxHeight: 680, overflow: "auto", paddingRight: 2 }}>
            {filteredItems.length ? filteredItems.map((item) => {
              const active = item.id === selectedLead?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedLeadId(item.id)}
                  style={{
                    textAlign: "left",
                    border: active ? "1px solid rgba(59,130,246,0.70)" : "1px solid rgba(255,255,255,0.08)",
                    background: active ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.02)",
                    borderRadius: 12,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{safeText(item.name, "İsimsiz başvuru")}</div>
                      <div className="panelMeta" style={{ marginTop: 4 }}>
                        {leadTypeLabel(item.type)} • {safeText(item.organizationName, "Kurum/firma adı yok")}
                      </div>
                    </div>
                    <span className="pill" style={statusBadgeInlineStyle(item.status)}>
                      {item.statusLabel || displayStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="panelMeta" style={{ lineHeight: 1.45 }}>
                    {buildContactSummary(item)}
                  </div>
                  <div className="panelMeta" style={{ lineHeight: 1.45 }}>
                    {safeText(item.city, "İl yok")} / {safeText(item.district, "İlçe yok")} • {fmtTR(item.createdAt)}
                  </div>
                  <div className="panelMeta" style={{ lineHeight: 1.45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {safeText(item.message, "Mesaj yok")}
                  </div>
                </button>
              );
            }) : (
              <div className="muted">Filtreye uyan başvuru yok.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 12, minWidth: 0, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div className="panelSectionTitle">Seçili başvuru detayı</div>
              <div className="panelMeta" style={{ marginTop: 4 }}>
                Detay ekranı yalnız inceleme içindir. Buradan invite, kullanıcı veya ödeme işlemi başlatılmaz.
              </div>
            </div>
            {selectedLead ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="pill" data-status="INFO">{leadTypeLabel(selectedLead.type)}</span>
                <span className="pill" style={statusBadgeInlineStyle(selectedLead.status)}>{selectedLead.statusLabel || displayStatusLabel(selectedLead.status)}</span>
              </div>
            ) : null}
          </div>

          {!selectedLead ? (
            <div className="muted">Sağdan bir başvuru seçin.</div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                {renderKeyValue("Başvuran", safeText(selectedLead.name, "-"))}
                {renderKeyValue("Durum", selectedLead.statusLabel || displayStatusLabel(selectedLead.status), "İnsan inceleme statüsü")}
                {renderKeyValue("Tür / kaynak", `${leadTypeLabel(selectedLead.type)} • ${safeText(selectedLead.sourceLabel, "Public landing")}`)}
                {renderKeyValue("Zaman", fmtTR(selectedLead.createdAt), "Başvurunun oluşturulma zamanı")}
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {renderKeyValue("Kurum / firma", safeText(selectedLead.organizationName, "-"))}
                {renderKeyValue("İl / ilçe", `${safeText(selectedLead.city, "-")} / ${safeText(selectedLead.district, "-")}`)}
                {renderKeyValue("Rol / başvuru tipi", safeText(selectedLead.role, "-"))}
                {renderKeyValue("İletişim", buildContactSummary(selectedLead), "Detay yalnız inceleme için görünür")}
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {renderKeyValue("KVKK", selectedLead.kvkkAccepted ? "Onaylı" : "Eksik", selectedLead.kvkkAccepted ? "Onay var" : "Başvuru ilerlemez")}
                {renderKeyValue("İletişim izni", selectedLead.contactPermission ? "Var" : "Yok", "İzin zorunlu değildir")}
                {renderKeyValue("İnceleyen", safeText(selectedLead.reviewedBy || "-", "-"))}
                {renderKeyValue("Son güncelleme", fmtTR(selectedLead.reviewedAt), "Durum veya not değişince güncellenir")}
              </div>

              {selectedLead.message ? (
                <div className="card" style={{ padding: 12 }}>
                  <div className="panelSectionTitle">Mesaj / not</div>
                  <div className="panelBody" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{selectedLead.message}</div>
                </div>
              ) : null}

              {selectedLead.serviceNeed ? renderObjectBlock("Servis ihtiyacı ek alanları", [
                { label: "Hizmet türü", value: safeText(selectedLead.serviceNeed.serviceType, "-") },
                { label: "Yaklaşık kişi sayısı", value: selectedLead.serviceNeed.approxPeopleCount == null ? "-" : String(selectedLead.serviceNeed.approxPeopleCount) },
                { label: "Başlangıç bölgesi", value: safeText(selectedLead.serviceNeed.originRegion, "-") },
                { label: "Varış bölgesi", value: safeText(selectedLead.serviceNeed.destinationRegion, "-") },
                { label: "Gün / saat", value: safeText(selectedLead.serviceNeed.scheduleText, "-") },
                { label: "Ek not", value: safeText(selectedLead.serviceNeed.followUpNote, "-") },
              ]) : null}

              {selectedLead.supplierInfo ? renderObjectBlock("Tedarikçi başvurusu ek alanları", [
                { label: "Araç sayısı", value: selectedLead.supplierInfo.vehicleCount == null ? "-" : String(selectedLead.supplierInfo.vehicleCount) },
                { label: "Hizmet bölgeleri", value: safeText(selectedLead.supplierInfo.serviceRegions, "-") },
                { label: "Araç tipleri", value: safeText(selectedLead.supplierInfo.vehicleTypes, "-") },
                { label: "Yetkili kişi", value: safeText(selectedLead.supplierInfo.authorizedPerson, "-") },
                { label: "Kapasite notu", value: safeText(selectedLead.supplierInfo.capacityNote, "-") },
                { label: "Davete hazırlık notu", value: safeText(selectedLead.supplierInfo.invitedMembershipNote, "-") },
              ]) : null}

              <div className="card" style={{ padding: 12, display: "grid", gap: 12 }}>
                <div className="panelSectionTitle">İnceleme notları</div>
                <div className="panelMeta">Notlar yalnız review amaçlıdır. Bu alanlar invite, ödeme veya sözleşme akışı başlatmaz.</div>

                <label className="muted" style={{ display: "grid", gap: 6 }}>
                  İnceleme notu
                  <textarea
                    rows={4}
                    value={draftReviewNote}
                    onChange={(e) => setDraftReviewNote(e.target.value)}
                    placeholder="Bu başvuruda neye bakılmalı?"
                  />
                </label>

                <label className="muted" style={{ display: "grid", gap: 6 }}>
                  Operasyon notu
                  <textarea
                    rows={4}
                    value={draftOperationNote}
                    onChange={(e) => setDraftOperationNote(e.target.value)}
                    placeholder="İşlem notu, çağrı notu veya takip notu"
                  />
                </label>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn sm" onClick={() => saveCurrentLead("IN_REVIEW")} disabled={savingLeadId === selectedLead.id || busy}>
                    İncelemeye al
                  </button>
                  <button className="btn sm" onClick={() => saveCurrentLead("NEEDS_INFO")} disabled={savingLeadId === selectedLead.id || busy}>
                    Ek bilgi gerekli
                  </button>
                  <button className="btn sm" onClick={() => saveCurrentLead("APPROVED_FOR_INVITE")} disabled={savingLeadId === selectedLead.id || busy}>
                    Invite için uygun
                  </button>
                  <button className="btn sm" onClick={() => saveCurrentLead("REJECTED")} disabled={savingLeadId === selectedLead.id || busy}>
                    Reddet
                  </button>
                  <button className="btn sm" onClick={saveNotesOnly} disabled={savingLeadId === selectedLead.id || busy}>
                    Notları kaydet
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
