const FRAME_ROLES = Object.freeze([
  "IDLE_CANDIDATE",
  "LISTENING",
  "THINKING",
  "SPEAKING_RESERVE",
  "SUCCESS",
  "WARNING",
  "UNUSED_CANDIDATE",
]);

const FRAME_QUALITY = Object.freeze(["LIVE_APPROVED", "RESERVED", "NOT_PROVEN", "REJECTED"]);

function frame({ id, row, column, role, quality, liveEnabled, audioSyncReady = false, reason }) {
  return Object.freeze({
    id,
    row,
    column,
    role,
    quality,
    liveEnabled,
    audioSyncReady,
    reason,
  });
}

// The 4×4 source is deliberately cataloged as a grid.  The supplied frames
// are not redrawn or face-patched; quality decisions remain explicit so an
// unproven frame cannot silently become a live expression.
export const SEFER_ABI_EXPRESSION_FRAME_CATALOG = Object.freeze([
  frame({ id: "frame-01", row: 0, column: 0, role: "IDLE_CANDIDATE", quality: "RESERVED", liveEnabled: false, reason: "Nötr açık göz karesi; onaylı üçlü IDLE blink kaynağı zaten daha kararlı ve korunuyor." }),
  frame({ id: "frame-02", row: 0, column: 1, role: "IDLE_CANDIDATE", quality: "RESERVED", liveEnabled: false, reason: "Yarı kapalı göz adayı; canlı IDLE döngüsüne ikinci tam yüz kaynağı eklemek gereksiz hizalama riski taşır." }),
  frame({ id: "frame-03", row: 0, column: 2, role: "IDLE_CANDIDATE", quality: "RESERVED", liveEnabled: false, reason: "Kapalı göz adayı; onaylı blink karesinin yerine geçmez, tam yüz varyantı olarak yalnız kaynak kaydıdır." }),
  frame({ id: "frame-04", row: 0, column: 3, role: "IDLE_CANDIDATE", quality: "RESERVED", liveEnabled: false, reason: "Nötr gülümseme tekrarı; IDLE durumunda dramatik tam yüz sıçraması üretmemek için canlıdan çıkarıldı." }),
  frame({ id: "frame-05", row: 1, column: 0, role: "LISTENING", quality: "LIVE_APPROVED", liveEnabled: true, reason: "Hafif yana eğik, sakin ve dikkatli bakış; gerçek input odaklanması/dinleme olayına uygun." }),
  frame({ id: "frame-06", row: 1, column: 1, role: "LISTENING", quality: "LIVE_APPROVED", liveEnabled: true, reason: "Baş yukarı ve dikkatli bakış; uzun dinleme durumunda küçük deterministik varyant olarak kullanılabilir." }),
  frame({ id: "frame-07", row: 1, column: 2, role: "THINKING", quality: "LIVE_APPROVED", liveEnabled: true, reason: "Yukarı yönlü düşünceli bakış; gerçek yanıt hazırlama olayını temsil eder, rastgele oynatılmaz." }),
  frame({ id: "frame-08", row: 1, column: 3, role: "WARNING", quality: "LIVE_APPROVED", liveEnabled: true, reason: "Ciddi kaş ve sakin yüz; gerçek eksik/uyarı olayında uygun, abartılı şaşkınlık içermez." }),
  frame({ id: "frame-09", row: 2, column: 0, role: "SPEAKING_RESERVE", quality: "RESERVED", liveEnabled: false, audioSyncReady: true, reason: "Açık ağız fonem adayı; gerçek ses seviyesi/zamanlaması yokken canlı döngüye alınmıyor." }),
  frame({ id: "frame-10", row: 2, column: 1, role: "SPEAKING_RESERVE", quality: "RESERVED", liveEnabled: false, audioSyncReady: true, reason: "Diş görünen ağız fonem adayı; ileride fonem veya ses seviyesi zamanlaması için korunuyor." }),
  frame({ id: "frame-11", row: 2, column: 2, role: "SPEAKING_RESERVE", quality: "RESERVED", liveEnabled: false, audioSyncReady: true, reason: "Yuvarlak ağız fonem adayı; sahte ses senkronizasyonu oluşturmamak için yalnız rezerv." }),
  frame({ id: "frame-12", row: 2, column: 3, role: "SPEAKING_RESERVE", quality: "RESERVED", liveEnabled: false, audioSyncReady: true, reason: "Geniş ağız ifadesi; 80 px ölçekte dramatik kalabileceği için gerçek ses altyapısı gelene kadar canlı değil." }),
  frame({ id: "frame-13", row: 3, column: 0, role: "SUCCESS", quality: "LIVE_APPROVED", liveEnabled: true, reason: "Yumuşak gülümseme; doğrulanmış tamamlanma olayında kısa SUCCESS yüzü olarak uygun." }),
  frame({ id: "frame-14", row: 3, column: 1, role: "SUCCESS", quality: "NOT_PROVEN", liveEnabled: false, reason: "Daha geniş gülümseme; 80 px ve 112 px kullanımında doğal yoğunluk için ayrıca görsel insan onayı gerekir." }),
  frame({ id: "frame-15", row: 3, column: 2, role: "WARNING", quality: "LIVE_APPROVED", liveEnabled: true, reason: "Düz ve ciddi ifade; kritik uyarı veya onay bekleyen gerçek kayıt için sakin alternatif." }),
  frame({ id: "frame-16", row: 3, column: 3, role: "UNUSED_CANDIDATE", quality: "REJECTED", liveEnabled: false, reason: "Açık ağızlı şaşkın ifade; WARNING için sakin değil ve gerçek olay olmadan dramatik görünür." }),
]);

export function getSeferAbiExpressionFrame(frameId) {
  return SEFER_ABI_EXPRESSION_FRAME_CATALOG.find((frame) => frame.id === String(frameId || "")) || null;
}

export function getSeferAbiExpressionFrameIdsByRole(role) {
  const normalized = String(role || "").trim().toUpperCase();
  if (!FRAME_ROLES.includes(normalized)) return [];
  return SEFER_ABI_EXPRESSION_FRAME_CATALOG.filter((frame) => frame.role === normalized).map((frame) => frame.id);
}

export function getSeferAbiLiveExpressionFrames(role) {
  const normalized = String(role || "").trim().toUpperCase();
  if (!FRAME_ROLES.includes(normalized)) return [];
  return SEFER_ABI_EXPRESSION_FRAME_CATALOG.filter((frame) => frame.role === normalized && frame.liveEnabled && frame.quality === "LIVE_APPROVED");
}

export function getSeferAbiExpressionFrameBackgroundPosition(frameId) {
  const selected = getSeferAbiExpressionFrame(frameId);
  if (!selected) return null;
  const percent = (index) => `${(index / 3) * 100}%`;
  return {
    backgroundPosition: `${percent(selected.column)} ${percent(selected.row)}`,
    backgroundSize: "400% 400%",
  };
}

export const SEFER_ABI_EXPRESSION_FRAME_SOURCE = "sefer-abi-expression-sprite-set.png";
