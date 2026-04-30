import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

function normalizeLoginError(error, fallback = 'Giriş başarısız.') {
  const code = String(error?.code || error?.payload?.code || error?.payload?.error || '').toUpperCase();
  const cooldownSec = Number(error?.payload?.cooldownSec || 0) || 0;
  const fieldErrors = error?.payload?.fieldErrors || null;
  if (error?.userMessage) return error.userMessage;
  if (fieldErrors && typeof fieldErrors === 'object') {
    if (fieldErrors.identifier || fieldErrors.code || fieldErrors.email) return 'Sürücü kodu veya e-posta gerekli.';
    if (fieldErrors.password || fieldErrors.pin) return 'PIN veya şifre gerekli.';
  }
  if (code === 'INVALID_CREDENTIALS') return 'Sürücü kodu/e-posta veya PIN/şifre hatalı.';
  if (code === 'PIN_LOCKED') {
    return cooldownSec > 0
      ? `Çok fazla hatalı PIN denemesi oldu. ${cooldownSec} saniye sonra tekrar deneyin.`
      : 'Çok fazla hatalı PIN denemesi oldu. Bir süre sonra tekrar deneyin.';
  }
  if (code === 'DEVICE_MISMATCH') return 'Bu cihaz bu sürücü hesabı ile eşleşmiyor. Operasyon ile cihaz eşleşmesini kontrol edin.';
  if (code === 'DEVICE_ID_REQUIRED') return 'Bu hesap için cihaz doğrulaması gerekli.';
  if (code === 'NETWORK_TIMEOUT') return 'Sunucu geç cevap verdi. Tekrar deneyin.';
  if (code === 'NETWORK_ERROR') return 'Bağlantı kurulamadı. İnterneti kontrol edin.';
  return String(error?.payload?.message || error?.payload?.error || error?.message || error || fallback);
}

function buildLoginDebugViewModel(error) {
  const diagnostics = error?.loginDiagnostics || error?.diagnostics || null;
  if (!diagnostics || String(diagnostics?.stage || '').trim().toLowerCase() !== 'local-emulator') return null;
  return {
    endpoint: `${String(diagnostics.method || 'POST').trim()} ${String(diagnostics.endpointPath || '/api/auth/login').trim()}`.trim(),
    attemptedUrl: String(diagnostics.attemptedUrl || '').trim(),
    status: String(diagnostics.status || 0).trim(),
    code: String(diagnostics.code || '').trim() || '-',
    message: String(diagnostics.message || '').trim() || '-',
    fieldErrorKeys: Array.isArray(diagnostics.fieldErrorKeys) ? diagnostics.fieldErrorKeys.filter(Boolean) : [],
    networkErrorName: String(diagnostics.networkErrorName || '').trim(),
    networkErrorMessage: String(diagnostics.networkErrorMessage || '').trim(),
    transport: String(diagnostics.transport || '').trim() || '-',
  };
}

export default function LoginScreen({ onLogin, initialError = '', apiBaseUrl = '', deviceId = '', releaseInfo = null }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [loginDebug, setLoginDebug] = useState(null);
  const [busy, setBusy] = useState(false);
  const isLocalEmulator = String(releaseInfo?.envStage || '').trim().toLowerCase() === 'local-emulator';

  useEffect(() => {
    setError(initialError || '');
    if (!initialError) setLoginDebug(null);
  }, [initialError]);

  useEffect(() => {
    if (!isLocalEmulator) setLoginDebug(null);
  }, [isLocalEmulator]);

  const helper = useMemo(() => {
    if (releaseInfo?.acceptanceBlocking) return releaseInfo.acceptanceSummary || 'Release / env kabul kontrolü blokluyor.';
    if (!apiBaseUrl) return 'Uygulama sunucu adresi ayarlı değil. Teknik ekip EXPO_PUBLIC_API_BASE_URL değerini kontrol etmelidir.';
    return 'Gerçek akış: Sürücü kodunuzu ve PIN bilginizi girin. Cihaz eşleşme hatasında operasyon ile iletişime geçin.';
  }, [apiBaseUrl, releaseInfo]);

  async function handleSubmit() {
    setBusy(true);
    setError('');
    setLoginDebug(null);
    try {
      await onLogin({ identifier: identifier.trim(), password: password.trim() });
    } catch (err) {
      setError(normalizeLoginError(err));
      setLoginDebug(buildLoginDebugViewModel(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Sürücü Mobil</Text>
        <Text style={styles.subtitle}>Bugünün görevini aç, rotayı takip et ve sürücünün telefon GPS'i hazırlığını kontrol et.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Sürücü Kodu veya e-posta</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="SRC-000001"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PIN veya şifre</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="PIN girin"
          />
        </View>

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSubmit} disabled={busy || !apiBaseUrl || !!releaseInfo?.acceptanceBlocking}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Girişi aç</Text>}
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {isLocalEmulator && loginDebug ? (
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>Login debug</Text>
            <Text style={styles.debugText}>Endpoint: {loginDebug.endpoint || '-'}</Text>
            <Text style={styles.debugText}>URL: {loginDebug.attemptedUrl || '-'}</Text>
            <Text style={styles.debugText}>Status: {loginDebug.status || '-'}</Text>
            <Text style={styles.debugText}>Code: {loginDebug.code || '-'}</Text>
            <Text style={styles.debugText}>Message: {loginDebug.message || '-'}</Text>
            {loginDebug.fieldErrorKeys.length ? (
              <Text style={styles.debugText}>Validation: {loginDebug.fieldErrorKeys.join(', ')}</Text>
            ) : null}
            {(loginDebug.networkErrorName || loginDebug.networkErrorMessage) ? (
              <Text style={styles.debugText}>
                Network: {loginDebug.networkErrorName || '-'} {loginDebug.networkErrorMessage || '-'}
              </Text>
            ) : null}
            <Text style={styles.debugMeta}>Transport: {loginDebug.transport || '-'}</Text>
          </View>
        ) : null}

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Bağlantı ve cihaz</Text>
          <Text style={styles.noteText}>{helper}</Text>
          <Text style={styles.meta}>API: {apiBaseUrl || 'AYARSIZ'}</Text>
          <Text style={styles.meta}>Cihaz: {deviceId || '-'}</Text>
        </View>

        <View style={[styles.noteBox, releaseInfo?.acceptanceBlocking ? styles.acceptanceBoxDanger : null]}>
          {/* Release / env kabul kontrolu */}
          <Text style={[styles.noteTitle, releaseInfo?.acceptanceBlocking ? styles.acceptanceTitleDanger : null]}>Release / env kabul kontrolü</Text>
          <Text style={[styles.noteText, releaseInfo?.acceptanceBlocking ? styles.acceptanceTextDanger : null]}>{releaseInfo?.acceptanceStatusText || 'READY'}</Text>
          <Text style={[styles.noteText, releaseInfo?.acceptanceBlocking ? styles.acceptanceTextDanger : null]}>{releaseInfo?.acceptanceSummary || 'Release / env kabul kontrolü hazır.'}</Text>
          <Text style={styles.meta}>Stage: {releaseInfo?.envStage || '-'}</Text>
          <Text style={styles.meta}>Host: {releaseInfo?.apiHost || '-'}</Text>
          <Text style={styles.meta}>Timeout: {releaseInfo?.timeoutMs != null ? `${releaseInfo.timeoutMs} ms` : '-'}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  noteBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  debugBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  noteTitle: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  debugTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  noteText: {
    color: '#1e3a8a',
    lineHeight: 20,
  },
  debugText: {
    color: '#334155',
    lineHeight: 18,
    fontSize: 12,
  },
  debugMeta: {
    color: '#64748b',
    lineHeight: 18,
    fontSize: 12,
  },
  meta: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
  acceptanceBoxDanger: {
    backgroundColor: '#fef2f2',
  },
  acceptanceTitleDanger: {
    color: '#b91c1c',
  },
  acceptanceTextDanger: {
    color: '#991b1b',
  },
});
