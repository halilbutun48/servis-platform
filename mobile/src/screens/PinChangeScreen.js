import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function PinChangeScreen({ onSubmit }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!/^\d{4,8}$/.test(newPin)) return setError('Yeni PIN 4-8 hane rakam olmali.');
    if (newPin !== newPin2) return setError('Yeni PIN tekrari ayni olmali.');
    setBusy(true);
    try {
      await onSubmit({ currentPin, newPin });
    } catch (err) {
      setError(String(err?.payload?.message || err?.payload?.error || err?.message || err || 'PIN degistirilemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Yeni PIN belirle</Text>
        <Text style={styles.subtitle}>Ilk giriste gecici PIN yerine sana ait yeni bir PIN belirlemelisin.</Text>

        <Field label="Gecici PIN" value={currentPin} onChangeText={setCurrentPin} />
        <Field label="Yeni PIN" value={newPin} onChangeText={setNewPin} />
        <Field label="Yeni PIN tekrar" value={newPin2} onChangeText={setNewPin2} />

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSubmit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>PIN'i kaydet</Text>}
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </ScrollView>
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
  wrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  card: {
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
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    lineHeight: 20,
  },
});
