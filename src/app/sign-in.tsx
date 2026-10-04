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

export default function SignInScreen() {
  const { isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isConfigured || !supabase) {
      setErrorMessage(
        'Add your Supabase URL and publishable key to .env.local, then restart Expo.',
      );
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Enter your password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={styles.eyebrow}>SUPAPROFEL</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue to your account.
          </Text>
        </View>

        <View style={styles.formCard}>
          {!isConfigured ? (
            <View style={styles.setupNotice}>
              <Text style={styles.setupNoticeTitle}>Setup required</Text>
              <Text style={styles.setupNoticeText}>
                Copy .env.example to .env.local and add your Supabase project
                values.
              </Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSubmitting}
              inputMode="email"
              onChangeText={(value) => {
                setEmail(value);
                setErrorMessage(null);
              }}
              onSubmitEditing={() => undefined}
              placeholder="you@example.com"
              placeholderTextColor="#8A918F"
              returnKeyType="next"
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordField}>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!isSubmitting}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrorMessage(null);
                }}
                onSubmitEditing={handleSignIn}
                placeholder="Enter your password"
                placeholderTextColor="#8A918F"
                returnKeyType="done"
                secureTextEntry={!isPasswordVisible}
                style={styles.passwordInput}
                value={password}
              />
              <Pressable
                accessibilityLabel={
                  isPasswordVisible ? 'Hide password' : 'Show password'
                }
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setIsPasswordVisible((visible) => !visible)}
                style={({ pressed }) => [
                  styles.visibilityButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.visibilityText}>
                  {isPasswordVisible ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
          </View>

          {errorMessage ? (
            <View accessibilityLiveRegion="polite" style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          Secure authentication powered by Supabase
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 72,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: '#173C35',
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#173C35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    width: 58,
  },
  logoLetter: {
    color: '#80E5B6',
    fontSize: 28,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#26725E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginBottom: 12,
  },
  title: {
    color: '#142420',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#66736F',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  formCard: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E8E4',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 460,
    padding: 22,
    shadowColor: '#183B32',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    width: '100%',
  },
  setupNotice: {
    backgroundColor: '#FFF8E8',
    borderColor: '#F3D690',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    padding: 14,
  },
  setupNoticeTitle: {
    color: '#6D4C00',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  setupNoticeText: {
    color: '#795F23',
    fontSize: 13,
    lineHeight: 19,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    color: '#263A34',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAF9',
    borderColor: '#CFD9D5',
    borderRadius: 14,
    borderWidth: 1,
    color: '#142420',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  passwordField: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderColor: '#CFD9D5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
  },
  passwordInput: {
    color: '#142420',
    flex: 1,
    fontSize: 16,
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 8,
  },
  visibilityButton: {
    paddingHorizontal: 15,
    paddingVertical: 16,
  },
  visibilityText: {
    color: '#26725E',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: '#FFF1F0',
    borderColor: '#F3C3BF',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
    padding: 12,
  },
  errorText: {
    color: '#9C2F26',
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#1B745C',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: '#1B745C',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  submitButtonPressed: {
    backgroundColor: '#155D4A',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerText: {
    color: '#7A8581',
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
});
