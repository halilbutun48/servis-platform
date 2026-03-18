import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen({ onLogin, initialError = '' }) {
  const [identifier, setIdentifier] = useState('SRC-000001');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(initialError || '');
  }, [initialError]);

  const helper = useMemo(() => 'Ana akis: Surucu Kodu + PIN. Demo kontrol icin driver@demo.com / demo123 da calisabilir.', []);

  async function handleSubmit() {
    setBusy(true);
    setError('');
    try {
      await onLogin({ identifier: identifier.trim(), password: password.trim() });
    } catch (err) {
      setError(String(err?.payload?.message || err?.payload?.error || err?.message || err || 'Giris basarisiz.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Surucu Mobil</Text>
        <Text style={styles.subtitle}>Telefondan kolay giris, bugun gorev, rota ozeti ve GPS hazirligi.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Surucu Kodu veya e-posta</Text>
          <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" style={styles.input} placeholder="SRC-000001" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PIN veya sifre</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="123456" />
        </View>

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSubmit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Girisi ac</Text>}
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Not</Text>
          <Text style={styles.noteText}>{helper}</Text>
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
});
