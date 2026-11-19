import { useEffect, useMemo, useState } from "react";
import { navigate } from "../router";
import { useSession } from "../state/session";
import OperationsCommandCenter from "./OperationsCommandCenter";
import { buildPlanningFlowProgress } from "./planningFlowProgress";
import { guidedPlanningCompletionPath, isGuidedPlanningContext, shouldOpenGuidedPlanningWorkspace } from "./planningFlowContext.js";
import { getCompanyHub, getCompanyPersonels, getCompanyShifts, getCompanyWorkflowSummary } from "../utils/companyDataHub";

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

function openGuidedPlanningStep(step) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("psv1:planning-flow-open", { detail: { step } }));
}

function PlanningFlowNavigator({ token, companyRegionId, me, onOpenGuidedPlanning }) {
  const [state, setState] = useState({ status: "loading", progress: null });

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    let alive = true;
    Promise.all([
      getCompanyHub(token, { signal: controller.signal, force: true }),
      getCompanyPersonels(token, { signal: controller.signal, force: true, take: 500 }),
      getCompanyShifts(token, { signal: controller.signal, force: true, take: 200, includeStops: true }),
      getCompanyWorkflowSummary(token, { signal: controller.signal, force: true }),
    ])
      .then(([hub, personels, shifts, summary]) => {
        if (!alive) return;
        setState({
          status: "ready",
          progress: buildPlanningFlowProgress({
            hub,
            personels: personels?.items,
            shifts: shifts?.items,
            summary,
            companyRegionId,
          }),
        });
      })
      .catch(() => {
        if (!alive || controller.signal.aborted) return;
        setState({ status: "error", progress: buildPlanningFlowProgress() });
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [token, companyRegionId]);

  const progress = state.progress;
  const nextStep = progress?.nextStep || null;
  const primaryLabel = state.status === "loading" ? "Durum okunuyor…" : "Yönlendir";

  function openNextStep() {
    if (state.status === "loading") return;
    if (progress?.allDone) {
      navigate(guidedPlanningCompletionPath(me));
      return;
    }
    onOpenGuidedPlanning?.();
    openGuidedPlanningStep(nextStep?.modalStep ?? 0);
  }

  return (
    <section className="planningFlowNavigator" data-testid="planning-flow-navigator" data-planning-flow-status={state.status} data-planning-next-step={nextStep?.key || (progress?.allDone ? "complete" : "unknown")} aria-labelledby="planning-flow-title">
      <div className="planningFlowNavigatorHead">
        <div>
          <div className="roleSectionKicker">PLANLAMA MERKEZİ · SIRADAKİ ADIM</div>
          <h2 id="planning-flow-title">İşi sırayla hazırla</h2>
          <p>Konumdan toplu teklif talebine kadar önce eksik olan gerçek işlemi tamamla.</p>
        </div>
        <button type="button" className="btn primary planningFlowNavigatorAction" onClick={openNextStep} disabled={state.status === "loading"} data-testid="planning-flow-primary-action">
          {primaryLabel}
        </button>
      </div>

      <ol className="planningFlowNavigatorSteps" aria-label="Planlama adımları">
        {(progress?.steps || []).map((step, index) => (
          <li key={step.key} className="planningFlowNavigatorStep" data-step-key={step.key} data-step-done={step.done ? "true" : "false"} data-step-current={nextStep?.key === step.key ? "true" : "false"}>
            <span className="planningFlowNavigatorStepIndex">{step.done ? "✓" : index + 1}</span>
            <span>{step.label}</span>
            <strong>{step.done ? "Tamamlandı" : nextStep?.key === step.key ? "Sıradaki" : "Bekliyor"}</strong>
          </li>
        ))}
      </ol>

      {state.status === "error" ? <div className="planningFlowNavigatorNote" role="status">Kayıt durumu okunamadı; tamamlandı varsayılmadı. Rehberi açıp kontrol edebilirsin.</div> : null}
      {progress?.allDone ? <div className="planningFlowNavigatorNote" role="status">Planlama adımları mevcut gerçek kayıtlarla tamamlandı. Teklif ve kabul durumunu ticari akıştan takip edebilirsin.</div> : null}
    </section>
  );
}

export default function RoleTaskHome({ children }) {
  const { token, me } = useSession();
  const role = contextKey(me);
  const copy = ROLE_COPY[role] || ROLE_COPY.COMPANY;
  const primary = useMemo(() => copy, [copy]);
  const [workspaceOpen, setWorkspaceOpen] = useState(() => shouldOpenGuidedPlanningWorkspace(role));
  const guidedPlanningContext = isGuidedPlanningContext(role);

  useEffect(() => {
    function openPlanningWorkspace() {
      setWorkspaceOpen(true);
    }

    window.addEventListener("psv1:planning-flow-open", openPlanningWorkspace);
    return () => window.removeEventListener("psv1:planning-flow-open", openPlanningWorkspace);
  }, []);

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

      {guidedPlanningContext ? (
        <PlanningFlowNavigator
          token={token}
          companyRegionId={me?.companyRegionId}
          me={me}
          onOpenGuidedPlanning={() => setWorkspaceOpen(true)}
        />
      ) : null}

      <section className="roleTaskSummaryGrid" aria-label="Özet">
        <article className="roleTaskSummaryCard"><span>Şu an</span><strong>{copy.state}</strong><small>Bu bağlamdaki ana çalışma alanı</small></article>
        <article className="roleTaskSummaryCard"><span>Sorun / fırsat</span><strong>{copy.issue}</strong><small>Gerçek sinyal varsa aşağıda önem sırasıyla görünür</small></article>
        <article className="roleTaskSummaryCard roleTaskSummaryCard--next"><span data-summary-next="true">Şimdi ne yapmalıyım?</span><strong>{copy.next}</strong><button type="button" className="btn sm" onClick={() => navigate(primary.path)}>Ana adıma git</button></article>
      </section>

      <OperationsCommandCenter me={me} token={token} />

      <details
        className="roleTaskDetails"
        data-details="task-workspace"
        open={workspaceOpen}
        onToggle={(event) => setWorkspaceOpen(event.currentTarget.open)}
      >
        <summary>Ayrıntılı çalışma alanını göster</summary>
        <div className="roleTaskDetailsBody">{children}</div>
      </details>
    </div>
  );
}
