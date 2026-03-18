export const SSOT_ALIGNMENT_TARGETS = [
  { id: "readme", label: "README", rel: "README.md", area: "root" },
  { id: "project_spec", label: "Project Spec", rel: "docs/PROJECT_SPEC_V1.md", area: "docs" },
  { id: "primer", label: "Primer SSOT", rel: "docs/PRIMER_SSOT.md", area: "docs" },
  { id: "startpack", label: "Startpack", rel: "docs/STARTPACK_V1.md", area: "docs" },
  { id: "checklist", label: "Checklist SSOT", rel: "docs/CHECKLIST_SSOT.md", area: "docs" },
  { id: "backlog", label: "Next Backlog", rel: "docs/NEXT_BACKLOG_V1.md", area: "docs" },
  { id: "tools_primer", label: "Tools Primer", rel: "tools/PRIMER_SNAPSHOT.md", area: "tools" },
  { id: "tools_checklist", label: "Tools Checklist", rel: "tools/CHECKLIST_SSOT.md", area: "tools" },
  { id: "tools_readme", label: "Tools README", rel: "tools/README.md", area: "tools" },
  { id: "registry", label: "Milestone Registry", rel: "docs/MILESTONE_REGISTRY_V1.md", area: "docs" },
];

export const MILESTONE_ROUTE = [
  { id: "M59", title: "Gözlemleme + Saha Teşhis", status: "GREEN" },
  { id: "M60", title: "Saha Acceptance Merkezi", status: "GREEN" },
  { id: "M61", title: "SSOT + Milestone Hizası", status: "ACTIVE" },
  { id: "M62", title: "Ticari Omurga Güçlendirme", status: "PENDING" },
  { id: "M63", title: "Güven + Kalite + Hizmet Değerlendirme", status: "PENDING" },
  { id: "M64", title: "Doğal Copilot Katmanı", status: "PENDING" },
  { id: "M65", title: "Pilot Launch Gate", status: "PENDING" },
];

export function getSsotAlignmentManifest() {
  return {
    targets: SSOT_ALIGNMENT_TARGETS,
    route: MILESTONE_ROUTE,
    activeMilestone: "M61",
  };
}

export function buildSsotAlignmentSummaryTemplate() {
  return {
    activeMilestone: "M61",
    activeRule: "M61 green olmadan M62 acilmaz",
    targetCount: SSOT_ALIGNMENT_TARGETS.length,
    greenCount: MILESTONE_ROUTE.filter((item) => item.status === "GREEN").length,
    note: "Resmi urun gercegi README, PRIMER, CHECKLIST, STARTPACK ve milestone registry uzerinden hizalanir.",
  };
}
