import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function normalizePinError(error, fallback = 'PIN değiştirilemedi.') {
  const code = String(error?.code || error?.payload?.code || error?.payload?.error || '').toUpperCase();
  if (error?.userMessage) return error.userMessage;
  if (code === 'BAD_CURRENT_PIN') return 'Mevcut PIN hatalı.';
  if (code === 'CURRENT_PIN_REQUIRED') return 'Mevcut PIN gerekli.';
  if (code === 'DEVICE_MISMATCH') return 'Bu cihaz eşleşmesi doğrulanamadı. Güvenli çıkış yapıp tekrar giriş deneyin.';
  if (code === 'NETWORK_TIMEOUT') return 'Sunucu geç cevap verdi. Tekrar deneyin.';
  if (code === 'NETWORK_ERROR') return 'Bağlantı kurulamadı. İnterneti kontrol edin.';
  return String(error?.payload?.message || error?.payload?.error || error?.message || error || fallback);
}

export default function PinChangeScreen({ onSubmit, onLogout, initialError = '' }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const submitLockRef = useRef(false);

  useEffect(() => {
    setError(initialError || '');
  }, [initialError]);

  async function handleSubmit() {
    if (busy || submitLockRef.current) return;
    if (!/^\d{4,8}$/.test(newPin)) return setError('Yeni PIN 4-8 haneli rakam olmalı.');
    if (newPin !== newPin2) return setError('Yeni PIN tekrarı aynı olmalı.');
    submitLockRef.current = true;
    setError('');
    setBusy(true);
    try {
      await onSubmit({ currentPin, newPin });
    } catch (err) {
      setError(normalizePinError(err));
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
          <Text style={styles.title}>Yeni PIN belirle</Text>
          <Text style={styles.subtitle}>İlk girişte geçici PIN yerine size ait yeni bir PIN belirlemelisiniz.</Text>

          <Field label="Geçici PIN" value={currentPin} onChangeText={setCurrentPin} />
          <Field label="Yeni PIN" value={newPin} onChangeText={setNewPin} />
          <Field label="Yeni PIN tekrar" value={newPin2} onChangeText={setNewPin2} />

          <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSubmit} disabled={busy || submitLockRef.current}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>PIN'i kaydet</Text>}
          </Pressable>

          <View style={styles.errorShell}>
            {!!error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.errorPlaceholder}> </Text>}
          </View>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>Sorun olursa</Text>
            <Text style={styles.helpText}>Mevcut PIN hatalıysa önce doğru geçici PIN ile tekrar deneyin. Cihaz eşleşme veya oturum sorunu varsa güvenli çıkış yapıp yeniden giriş açın.</Text>
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
      <TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" secureTextEntry style={styles.input} />
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
