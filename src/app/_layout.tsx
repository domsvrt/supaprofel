import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { isLoading, retryRole, role, roleError, session } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color="#1B745C" size="large" />
      </View>
    );
  }

  if (session && roleError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Unable to open your account</Text>
          <Text style={styles.message}>{roleError}</Text>
          <Pressable accessibilityRole="button" onPress={retryRole} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => supabase?.auth.signOut()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={Boolean(session && role === 'teacher')}>
        <Stack.Screen name="teacher" />
      </Stack.Protected>

      <Stack.Protected guard={Boolean(session && role === 'student')}>
        <Stack.Screen name="student" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#F4F7F5', flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, maxWidth: 440, padding: 24, width: '100%' },
  title: { color: '#142420', fontSize: 22, fontWeight: '800' },
  message: { color: '#687570', fontSize: 14, lineHeight: 20, marginTop: 12 },
  button: { alignItems: 'center', backgroundColor: '#1B745C', borderRadius: 12, marginTop: 22, padding: 15 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryButton: { alignItems: 'center', marginTop: 10, padding: 12 },
  secondaryText: { color: '#1B745C', fontWeight: '700' },
});
