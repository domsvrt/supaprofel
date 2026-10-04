import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegister() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isConfigured || !supabase) {
      setErrorMessage('Student registration is unavailable. Please contact the teacher.');
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Use a password with at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: Linking.createURL('sign-in'),
        },
      });

      if (error) throw error;
      if (!data.session) setRegisteredEmail(normalizedEmail);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create your account. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SUPAPROFEL</Text>
          <Text style={styles.title}>Student registration</Text>
          <Text style={styles.subtitle}>Create an account to view your teacher’s assignments.</Text>
        </View>

        <View style={styles.card}>
          {!isConfigured ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Registration is unavailable until Supabase is configured.</Text>
            </View>
          ) : null}
          {registeredEmail ? (
            <>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.helper}>
                We sent a confirmation link to {registeredEmail}. Confirm your email, then return here to sign in.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/sign-in')}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryText}>Go to sign in</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isSubmitting}
                inputMode="email"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#8A918F"
                style={styles.input}
                value={email}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!isSubmitting}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#8A918F"
                secureTextEntry
                style={styles.input}
                value={password}
              />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                accessibilityLabel="Confirm password"
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!isSubmitting}
                onChangeText={setConfirmPassword}
                onSubmitEditing={handleRegister}
                placeholder="Re-enter your password"
                placeholderTextColor="#8A918F"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />

              {errorMessage ? (
                <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting || !isConfigured}
                onPress={handleRegister}
                style={[styles.primaryButton, (isSubmitting || !isConfigured) && styles.disabled]}
              >
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Create account</Text>}
              </Pressable>
            </>
          )}
        </View>

        {!registeredEmail ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/sign-in')}
            style={styles.signInLink}
          >
            <Text style={styles.signInText}>Already have an account? Sign in</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F4F7F5', flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingBottom: 32, paddingHorizontal: 24, paddingTop: 72 },
  header: { alignItems: 'center', marginBottom: 28 },
  eyebrow: { color: '#26725E', fontSize: 12, fontWeight: '800', letterSpacing: 2.4, marginBottom: 12 },
  title: { color: '#142420', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#66736F', fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  card: { alignSelf: 'center', backgroundColor: '#FFFFFF', borderColor: '#E1E8E4', borderRadius: 24, borderWidth: 1, maxWidth: 460, padding: 22, width: '100%' },
  label: { color: '#263A34', fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  input: { backgroundColor: '#F8FAF9', borderColor: '#CFD9D5', borderRadius: 14, borderWidth: 1, color: '#142420', fontSize: 16, marginBottom: 18, minHeight: 54, paddingHorizontal: 16 },
  errorBox: { backgroundColor: '#FFF1F0', borderColor: '#F3C3BF', borderRadius: 12, borderWidth: 1, marginBottom: 18, padding: 12 },
  errorText: { color: '#9C2F26', fontSize: 13, lineHeight: 19 },
  primaryButton: { alignItems: 'center', backgroundColor: '#1B745C', borderRadius: 14, justifyContent: 'center', minHeight: 54 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  signInLink: { alignSelf: 'center', marginTop: 20, padding: 8 },
  signInText: { color: '#1B745C', fontSize: 14, fontWeight: '700' },
  successTitle: { color: '#142420', fontSize: 22, fontWeight: '800' },
  helper: { color: '#66736F', fontSize: 15, lineHeight: 23, marginBottom: 22, marginTop: 10 },
});
