export const PILOT_LAUNCH_GATE_CAPABILITIES = [
  "Launch checklist",
  "Kritik risk listesi",
  "Acceptance ozetleri",
  "Gozlemleme saglik ozeti",
  "Build / cihaz uygunluk matrisi",
  "GO / LIMITED GO / NO-GO kapisi",
];

export function getPilotLaunchGateManifest() {
  return {
    code: "M65_PILOT_LAUNCH_GATE",
    title: "M65 Pilot Launch Gate",
    summary: "Saha oncesi son karar kapisi",
    sections: [
      { key: "checklist", title: "Launch checklist" },
      { key: "risks", title: "Kritik risk listesi" },
      { key: "acceptance", title: "Acceptance ozetleri" },
      { key: "health", title: "Gozlemleme saglik ozeti" },
      { key: "deviceMatrix", title: "Build / cihaz uygunluk matrisi" },
      { key: "decision", title: "GO / LIMITED GO / NO-GO" },
    ],
  };
}
