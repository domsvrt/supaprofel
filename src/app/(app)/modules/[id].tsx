import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModuleForm } from '@/components/module-form';
import { getErrorMessage, getModule } from '@/lib/modules';
import type { Module } from '@/types/database';

export default function EditModuleScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [module, setModule] = useState<Module | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    if (!id) return;

    let isActive = true;

    getModule(id)
      .then((nextModule) => {
        if (isActive) setModule(nextModule);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setErrorMessage(getErrorMessage(error, 'Unable to load the post.'));
      });

    return () => {
      isActive = false;
    };
  }, [id, requestKey]);

  if (module) return <ModuleForm module={module} />;

  return (
    <SafeAreaView style={styles.screen}>
      {errorMessage || !id ? (
        <View style={styles.card}>
          <Text style={styles.title}>Unable to load module</Text>
          <Text style={styles.message}>
            {errorMessage ?? 'The module ID is missing.'}
          </Text>
          <Pressable
            onPress={() => {
              setErrorMessage(null);
              setRequestKey((current) => current + 1);
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ActivityIndicator color="#1B745C" size="large" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#F4F7F5',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    maxWidth: 440,
    padding: 24,
    width: '100%',
  },
  title: { color: '#142420', fontSize: 22, fontWeight: '800' },
  message: {
    color: '#687570',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1B745C',
    borderRadius: 13,
    marginTop: 20,
    padding: 14,
    width: '100%',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryButton: { marginTop: 12, padding: 10 },
  secondaryText: { color: '#1B745C', fontWeight: '800' },
});
