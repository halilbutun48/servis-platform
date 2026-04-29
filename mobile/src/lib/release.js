import Constants from 'expo-constants';

const API_BASE_URL = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
const RELEASE_STAGE = String(process.env.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase();
const REQUEST_TIMEOUT_MS = Math.max(4000, Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 12000));

const ALLOWED_STAGES = ['preview-internal', 'preview-simulator', 'production'];

function isPrivateOrLocalHost(hostname = '') {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1' || host === '::1') return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/\.local$/.test(host)) return true;
  return false;
}

function isPlaceholderHost(hostname = '', rawUrl = '') {
  const host = String(hostname || '').trim().toLowerCase();
  const text = `${host} ${String(rawUrl || '').trim().toLowerCase()}`;
  if (!text.trim()) return false;
  return /example\.com|example\.org|example\.net|__set_|changeme|your-api|replace-me|placeholder/.test(text);
}

function buildIssueList({ apiBaseUrl = API_BASE_URL, releaseStage = RELEASE_STAGE, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const issues = [];
  const warnings = [];
  const stage = String(releaseStage || '').trim().toLowerCase();
  const urlText = String(apiBaseUrl || '').trim();
  let parsed = null;
  const executionEnvironment = String(Constants?.executionEnvironment || '').trim();
  const appOwnership = String(Constants?.appOwnership || '').trim();
  const debugMode = Boolean(Constants?.debugMode);

  if (!stage) {
    issues.push('Release stage ayarlı değil. EXPO_PUBLIC_RELEASE_STAGE gerekli.');
  } else if (!ALLOWED_STAGES.includes(stage)) {
    issues.push(`Release stage tanınmadı: ${stage}. Geçerli değer preview-internal, preview-simulator veya production olmalı.`);
  }

  if (executionEnvironment === 'storeClient' || appOwnership === 'expo') {
    issues.push('Expo Go desteklenmiyor. Internal build veya standalone release kullanın.');
  }

  if (stage === 'production' && debugMode) {
    issues.push('Production stage debug modda çalışamaz.');
  }

  if (!urlText) {
    issues.push('Mobil API adresi ayarlı değil. EXPO_PUBLIC_API_BASE_URL gerekli.');
  } else {
    try {
      parsed = new URL(urlText);
    } catch {
      issues.push('Mobil API adresi geçerli bir URL değil. HTTPS tam adres gerekli.');
    }
  }

  if (parsed) {
    const protocol = String(parsed.protocol || '').toLowerCase();
    const hostname = String(parsed.hostname || '').toLowerCase();
    if (protocol !== 'https:') {
      issues.push('Mobil API adresi HTTPS olmalı.');
    }
    if (isPrivateOrLocalHost(hostname)) {
      issues.push('Mobil API adresi localhost veya özel ağ IP olamaz. Gerçek cihaz için dışarıdan erişilen HTTPS adres gerekli.');
    }
    if (isPlaceholderHost(hostname, urlText)) {
      issues.push('Mobil API adresi placeholder durumda. Gerçek preview/production backend adresi girilmeli.');
    }
    if (/trycloudflare\.com$/i.test(hostname)) {
      warnings.push('Geçici Cloudflare tüneli uzun testlerde kırılabilir. Kalıcı HTTPS adres tercih edin.');
    }
    if (stage === 'production' && /preview/i.test(hostname)) {
      warnings.push('Production release stage için API host preview görünüyor. Build profilini tekrar kontrol edin.');
    }
    if (stage.startsWith('preview') && /(prod|production)/i.test(hostname)) {
      warnings.push('Preview release stage production host kullanıyor olabilir. İç dağıtım profilini doğrulayın.');
    }
    if (!['', '/'].includes(parsed.pathname || '')) {
      warnings.push('Mobil API adresinde path var. Kök API tabanı kullanmanız daha güvenlidir.');
    }
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 4000) {
    issues.push('API timeout değeri çok düşük. EXPO_PUBLIC_API_TIMEOUT_MS en az 4000 olmalı.');
  } else if (timeoutMs > 30000) {
    warnings.push('API timeout değeri yüksek. Ağ hataları kullanıcıya geç yansıyabilir.');
  }

  if (stage === 'production' && executionEnvironment && executionEnvironment !== 'standalone') {
    issues.push(`Production stage standalone build olmalı. Geçerli runtime: ${executionEnvironment}.`);
  } else if (stage.startsWith('preview') && executionEnvironment === 'storeClient') {
    warnings.push('Preview build Expo Go içinde görünüyor. Bu dağıtım yüzeyi için internal build tercih edin.');
  }

  return { issues, warnings, parsed };
}

export function getReleaseGuard() {
  const { issues, warnings, parsed } = buildIssueList();
  const apiBaseUrl = String(API_BASE_URL || '').trim();
  const stage = String(RELEASE_STAGE || '').trim().toLowerCase();
  return {
    stage,
    apiBaseUrl,
    apiHost: parsed?.host || '',
    apiScheme: parsed?.protocol ? String(parsed.protocol).replace(/:$/, '') : '',
    timeoutMs: REQUEST_TIMEOUT_MS,
    issues,
    warnings,
    blocking: issues.length > 0,
    statusText: issues.length ? `BLOCKING (${issues.length})` : warnings.length ? `WARN (${warnings.length})` : 'READY',
    summary: issues[0] || warnings[0] || 'Release / env kabul kontrolü hazır.',
  };
}

export function humanizeReleaseGuard(guard = getReleaseGuard()) {
  return guard?.summary || 'Release / env kabul kontrolü hazır.';
}

export function buildReleaseBlockingError(guard = getReleaseGuard()) {
  const error = new Error(humanizeReleaseGuard(guard));
  error.code = 'RELEASE_ENV_BLOCKING';
  error.userMessage = humanizeReleaseGuard(guard);
  error.releaseGuard = guard;
  error.status = 0;
  return error;
}

export function buildReleaseInfo() {
  const guard = getReleaseGuard();
  return {
    appVersion: '0.2.3',
    releaseTarget: 'Android + iOS M82.6 acceptance sertlestirme',
    buildProfiles: 'preview / production / preview-simulator',
    deliveryMode: 'EAS Build + internal dagitim',
    expoGoStatus: 'Expo Go degil, internal build ile test et',
    androidPreview: 'Preview APK / internal dagitim',
    productionBundle: 'Production AAB + iOS store hazırlığı',
    envStage: guard.stage || 'ayarsiz',
    apiBaseUrl: guard.apiBaseUrl || '',
    apiHost: guard.apiHost || '',
    apiScheme: guard.apiScheme || '-',
    timeoutMs: guard.timeoutMs,
    executionEnvironment: String(Constants?.executionEnvironment || '-'),
    appOwnership: String(Constants?.appOwnership || '-'),
    debugMode: Boolean(Constants?.debugMode),
    acceptanceBlocking: guard.blocking,
    acceptanceStatusText: guard.statusText,
    acceptanceSummary: guard.summary,
    acceptanceIssues: guard.issues,
    acceptanceWarnings: guard.warnings,
    releaseDiscipline: 'Env doğrulama + acceptance özeti + runtime guard + checker',
    fieldHardeningSummary: 'Sürücünün telefon GPS’i, KVKK blokları ve release guard birlikte izlenir.',
  };
}
