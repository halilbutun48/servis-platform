import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function normalizePasswordError(error, fallback = 'Şifre değiştirilemedi.') {
  if (error?.userMessage) return error.userMessage;
  const code = String(error?.code || error?.payload?.code || error?.payload?.error || '').toUpperCase();
  if (code === 'PASSWORD_POLICY_INVALID') {
    return String(error?.payload?.message || error?.payload?.error || 'Şifre kurallara uymuyor.');
  }
  if (code === 'PASSWORD_CHANGE_REQUIRED') return 'Önce ilk şifrenizi değiştirin.';
  if (code === 'NETWORK_TIMEOUT') return 'Sunucu geç cevap verdi. Tekrar deneyin.';
  if (code === 'NETWORK_ERROR') return 'Bağlantı kurulamadı. İnterneti kontrol edin.';
  return String(error?.payload?.message || error?.payload?.error || error?.message || fallback);
}

export default function ForcePasswordChangeScreen({ onSubmit, onLogout, initialError = '' }) {
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const submitLockRef = useRef(false);

  useEffect(() => {
    setError(initialError || '');
  }, [initialError]);

  async function handleSubmit() {
    if (busy || submitLockRef.current) return;
    const first = String(newPassword || '');
    const second = String(newPassword2 || '');
    if (!first) return setError('Yeni şifre gerekli.');
    if (first !== second) return setError('Yeni şifreler eşleşmiyor.');

    submitLockRef.current = true;
    setError('');
    setBusy(true);
    try {
      await onSubmit({ newPassword: first, confirmPassword: second });
    } catch (err) {
      setError(normalizePasswordError(err));
    } finally {
      setBusy(false);
      submitLockRef.current = false;
    }
  }

  async function handleLogout() {
    if (!onLogout) return;
    if (busy || submitLockRef.current) return;
    submitLockRef.current = true;
    setBusy(true);
    try {
      await onLogout();
    } finally {
      setBusy(false);
      submitLockRef.current = false;
    }
  }

  return (
    <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.card}>
          <Text style={styles.title}>İlk şifreni değiştir</Text>
          <Text style={styles.subtitle}>
            İlk girişte size ait güvenli bir şifre belirleyin. Şifre değişince oturum otomatik olarak devam eder.
          </Text>

          <Field label="Yeni şifre" value={newPassword} onChangeText={setNewPassword} />
          <Field label="Yeni şifre tekrar" value={newPassword2} onChangeText={setNewPassword2} />

          <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSubmit} disabled={busy || submitLockRef.current}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şifreyi kaydet</Text>}
          </Pressable>

          <View style={styles.errorShell}>
            {!!error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.errorPlaceholder}> </Text>}
          </View>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>Güvenli ilerleme</Text>
            <Text style={styles.helpText}>
              Şifre değişikliği tamamlandıktan sonra uygulama sizi otomatik olarak devam ettirir.
            </Text>
          </View>

          {!!onLogout && (
            <Pressable style={[styles.secondaryButton, busy && styles.buttonDisabled]} onPress={handleLogout} disabled={busy || submitLockRef.current}>
              <Text style={styles.secondaryButtonText}>Güvenli çıkış yap</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChangeText }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="new-password"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  wrap: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  field: { gap: 6 },
  label: {
    color: '#334155',
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
    marginTop: 6,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    lineHeight: 20,
  },
  errorShell: {
    minHeight: 28,
    justifyContent: 'center',
  },
  errorPlaceholder: {
    color: 'transparent',
    lineHeight: 20,
  },
  helpBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  helpTitle: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  helpText: {
    color: '#1e3a8a',
    lineHeight: 20,
  },
});
