import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

function normalizeLoginError(error, fallback = 'Giris basarisiz.') {
  const code = String(error?.code || error?.payload?.code || error?.payload?.error || '').toUpperCase();
  const cooldownSec = Number(error?.payload?.cooldownSec || 0) || 0;
  if (error?.userMessage) return error.userMessage;
  if (code === 'INVALID_CREDENTIALS') return 'Surucu kodu veya PIN hatali.';
  if (code === 'PIN_LOCKED') {
    return cooldownSec > 0
      ? `Cok fazla hatali PIN denemesi oldu. ${cooldownSec} saniye sonra tekrar deneyin.`
      : 'Cok fazla hatali PIN denemesi oldu. Bir sure sonra tekrar deneyin.';
  }
  if (code === 'DEVICE_MISMATCH') return 'Bu cihaz bu surucu hesabi ile eslesmiyor. Operasyon ile cihaz eslesmesini kontrol edin.';
  if (code === 'DEVICE_ID_REQUIRED') return 'Bu hesap icin cihaz dogrulamasi gerekli.';
  if (code === 'NETWORK_TIMEOUT') return 'Sunucu gec cevap verdi. Tekrar deneyin.';
  if (code === 'NETWORK_ERROR') return 'Baglanti kurulamadı. Interneti kontrol edin.';
  return String(error?.payload?.message || error?.payload?.error || error?.message || error || fallback);
}

export default function LoginScreen({ onLogin, initialError = '', apiBaseUrl = '', deviceId = '', releaseInfo = null }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(initialError || '');
  }, [initialError]);

  const helper = useMemo(() => {
    if (releaseInfo?.acceptanceBlocking) return releaseInfo.acceptanceSummary || 'Release / env kabul kontrolu blokluyor.';
    if (!apiBaseUrl) return 'Uygulama sunucu adresi ayarli degil. Teknik ekip EXPO_PUBLIC_API_BASE_URL degerini kontrol etmelidir.';
    return 'Gercek akis: Surucu kodunuzu ve PIN bilginizi girin. Cihaz eslesme hatasinda operasyon ile iletisime gecin.';
  }, [apiBaseUrl, releaseInfo]);

  async function handleSubmit() {
    setBusy(true);
    setError('');
    try {
      await onLogin({ identifier: identifier.trim(), password: password.trim() });
    } catch (err) {
      setError(normalizeLoginError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Surucu Mobil</Text>
        <Text style={styles.subtitle}>Bugunun gorevini ac, rotayi takip et ve surucunun telefon GPS'i hazirligini kontrol et.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Surucu Kodu veya e-posta</Text>
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
          <Text style={styles.label}>PIN veya sifre</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="PIN girin"
          />
        </View>

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSubmit} disabled={busy || !apiBaseUrl || !!releaseInfo?.acceptanceBlocking}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Girisi ac</Text>}
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Baglanti ve cihaz</Text>
          <Text style={styles.noteText}>{helper}</Text>
          <Text style={styles.meta}>API: {apiBaseUrl || 'AYARSIZ'}</Text>
          <Text style={styles.meta}>Cihaz: {deviceId || '-'}</Text>
        </View>

        <View style={[styles.noteBox, releaseInfo?.acceptanceBlocking ? styles.acceptanceBoxDanger : null]}>
          <Text style={[styles.noteTitle, releaseInfo?.acceptanceBlocking ? styles.acceptanceTitleDanger : null]}>Release / env kabul kontrolu</Text>
          <Text style={[styles.noteText, releaseInfo?.acceptanceBlocking ? styles.acceptanceTextDanger : null]}>{releaseInfo?.acceptanceStatusText || 'READY'}</Text>
          <Text style={[styles.noteText, releaseInfo?.acceptanceBlocking ? styles.acceptanceTextDanger : null]}>{releaseInfo?.acceptanceSummary || 'Release / env kabul kontrolu hazir.'}</Text>
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
  noteTitle: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  noteText: {
    color: '#1e3a8a',
    lineHeight: 20,
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
