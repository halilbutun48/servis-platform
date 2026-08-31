import { useMemo } from "react";
import { navigate } from "../router";
import { useSession } from "../state/session";
import OperationsCommandCenter from "./OperationsCommandCenter";

const ROLE_COPY = {
  SUPER_ADMIN: { label: "Süper Yönetici", state: "Sistem ve operasyon durumu", issue: "Öncelikli kontrol gerektiren sinyaller", next: "Denetim durumunu incele", action: "Denetim durumunu aç", path: "/superadmin/operations" },
  COMPANY: { label: "Hizmet Alan Firma", state: "Planlama ve hizmet operasyonu", issue: "Takip gerektiren hizmet durumu", next: "Operasyonu incele", action: "Operasyonu aç", path: "/company/operations" },
  SCHOOL: { label: "Okul", state: "Okul servisi ve veli erişimi", issue: "Takip gerektiren okul durumu", next: "Veli erişimini kontrol et", action: "Veli erişimini aç", path: "/school/parents" },
  ORGANIZATION: { label: "Organizasyon", state: "Gezi ve ulaşım planı", issue: "Takip gerektiren plan durumu", next: "Planı incele", action: "Planları aç", path: "/organization/plans" },
  ROOM: { label: "Turizm/Taşımacılık Firması", state: "Teklif, vardiya ve saha operasyonu", issue: "Takip gerektiren operasyon sinyalleri", next: "Teklifleri ve operasyonu incele", action: "Teklifleri aç", path: "/room/offers" },
  DRIVER: { label: "Sürücü", state: "Bugünkü görev ve rota", issue: "Görevde dikkat gerektiren durum", next: "Rotanı kontrol et", action: "Rotayı aç", path: "/driver/route" },
  PERSONEL: { label: "Personel", state: "Servis ve canlı ulaşım durumu", issue: "Servis erişiminde dikkat gerektiren durum", next: "Servis durumunu gör", action: "Servisimi aç", path: "/personel/my" },
  PARENT: { label: "Veli", state: "Çocuk ve servis durumu", issue: "Takip gerektiren servis bilgisi", next: "Canlı durumu kontrol et", action: "Canlı durumu aç", path: "/parent/live" },
};

function contextKey(me) {
  if (me?.role === "COMPANY") {
    const kind = String(me?.companyKind || "").toUpperCase();
    if (kind === "SCHOOL") return "SCHOOL";
    if (kind === "ORGANIZATION") return "ORGANIZATION";
  }
  return String(me?.role || "").toUpperCase();
}

export default function RoleTaskHome({ children }) {
  const { token, me } = useSession();
  const role = contextKey(me);
  const copy = ROLE_COPY[role] || ROLE_COPY.COMPANY;
  const primary = useMemo(() => copy, [copy]);

  return (
    <div className="wrap wrap--fluid roleTaskHome" data-role-task-home={role}>
      <section className="roleTaskHero" aria-labelledby="role-task-home-title">
        <div className="roleTaskHeroCopy">
          <div className="roleSectionKicker">GÖREV MERKEZİ · {copy.label.toUpperCase()}</div>
          <h1 id="role-task-home-title">Bugün neye odaklanmalısın?</h1>
          <p>Bulunduğun yer: <b>{copy.label}</b>. Önce durumunu gör, sonra tek ana adımla ilerle.</p>
        </div>
        <div className="roleTaskHeroAction">
          <div className="roleTaskActionHint">Sıradaki adım</div>
          <button type="button" className="btn primary rolePrimaryCta" data-primary-cta="true" onClick={() => navigate(primary.path)}>{primary.action}</button>
        </div>
      </section>

      <section className="roleTaskSummaryGrid" aria-label="Özet">
        <article className="roleTaskSummaryCard"><span>Şu an</span><strong>{copy.state}</strong><small>Bu bağlamdaki ana çalışma alanı</small></article>
        <article className="roleTaskSummaryCard"><span>Sorun / fırsat</span><strong>{copy.issue}</strong><small>Gerçek sinyal varsa aşağıda önem sırasıyla görünür</small></article>
        <article className="roleTaskSummaryCard roleTaskSummaryCard--next"><span data-summary-next="true">Şimdi ne yapmalıyım?</span><strong>{copy.next}</strong><button type="button" className="btn sm" onClick={() => navigate(primary.path)}>Ana adıma git</button></article>
      </section>

      <OperationsCommandCenter me={me} token={token} />

      <details className="roleTaskDetails" data-details="task-workspace">
        <summary>Ayrıntılı çalışma alanını göster</summary>
        <div className="roleTaskDetailsBody">{children}</div>
      </details>
    </div>
  );
}
