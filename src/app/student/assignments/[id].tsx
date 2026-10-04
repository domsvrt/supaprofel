import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatFileSize, getErrorMessage, getModule, getModuleResourceUrl } from '@/lib/modules';
import type { Module } from '@/types/database';

export default function StudentAssignmentScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [module, setModule] = useState<Module | null>(null);
  const [loadError, setLoadError] = useState<{
    id: string;
    requestKey: number;
    message: string;
  } | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'open' | 'download' | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let isActive = true;
    getModule(id)
      .then((nextModule) => {
        if (isActive) setModule(nextModule);
      })
      .catch((error: unknown) => {
        if (isActive) setLoadError({
          id,
          requestKey,
          message: getErrorMessage(error, 'Unable to load this assignment.'),
        });
      });

    return () => { isActive = false; };
  }, [id, requestKey]);

  const displayedModule = module?.id === id ? module : null;
  const errorMessage = loadError?.id === id && loadError.requestKey === requestKey
    ? loadError.message
    : null;

  async function handleResource(download = false) {
    if (!displayedModule) return;
    setOpenError(null);
    setActiveAction(download ? 'download' : 'open');

    try {
      await Linking.openURL(await getModuleResourceUrl(displayedModule, download));
    } catch (error) {
      setOpenError(getErrorMessage(error, download
        ? 'Unable to download this resource.'
        : 'Unable to open this resource.'));
    } finally {
      setActiveAction(null);
    }
  }

  const attachment = displayedModule?.resourceType === 'link'
    ? displayedModule.resourceUrl
    : displayedModule?.fileName;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Assignment</Text>
      </View>

      {!displayedModule ? (
        <View style={styles.stateBox}>
          {errorMessage || !id ? (
            <>
              <Text style={styles.stateTitle}>Unable to load assignment</Text>
              <Text style={styles.stateText}>{errorMessage ?? 'The assignment ID is missing.'}</Text>
              {id ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRequestKey((current) => current + 1)}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              ) : null}
            </>
          ) : <ActivityIndicator color="#1B745C" size="large" />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              {displayedModule.resourceType ? displayedModule.resourceType.toUpperCase() : 'ANNOUNCEMENT'}
            </Text>
            <Text style={styles.title}>{displayedModule.title}</Text>
            <Text style={styles.dateText}>Posted {new Date(displayedModule.createdAt).toLocaleDateString()}</Text>
            {displayedModule.description ? (
              <Text style={styles.description}>{displayedModule.description}</Text>
            ) : null}

            {displayedModule.resourceType ? (
              <View style={styles.resourceBox}>
                <Text style={styles.resourceLabel}>Attached resource</Text>
                {attachment ? <Text style={styles.resourceName}>{attachment}</Text> : null}
                {displayedModule.fileSize !== null ? (
                  <Text style={styles.resourceMeta}>{formatFileSize(displayedModule.fileSize)}</Text>
                ) : null}
                {openError ? (
                  <Text accessibilityLiveRegion="polite" style={styles.errorText}>{openError}</Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={activeAction !== null}
                  onPress={() => handleResource()}
                  style={[styles.openButton, activeAction !== null && styles.disabled]}
                >
                  {activeAction === 'open' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.openText}>{displayedModule.resourceType === 'link' ? 'Open link' : 'Open resource'}</Text>}
                </Pressable>
                {displayedModule.resourceType !== 'link' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={activeAction !== null}
                    onPress={() => handleResource(true)}
                    style={[styles.downloadButton, activeAction !== null && styles.disabled]}
                  >
                    {activeAction === 'download' ? <ActivityIndicator color="#1B745C" /> : <Text style={styles.downloadText}>Download file</Text>}
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F4F7F5', flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12 },
  backButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  backText: { color: '#173C35', fontSize: 34, lineHeight: 38 },
  headerTitle: { color: '#142420', fontSize: 18, fontWeight: '800', marginLeft: 8 },
  content: { alignSelf: 'center', maxWidth: 760, paddingBottom: 32, paddingHorizontal: 20, width: '100%' },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E1E8E4', borderRadius: 20, borderWidth: 1, padding: 22 },
  eyebrow: { color: '#26725E', fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: '#142420', fontSize: 27, fontWeight: '800', lineHeight: 34, marginTop: 10 },
  dateText: { color: '#7A8581', fontSize: 13, marginTop: 12 },
  description: { color: '#334A40', fontSize: 16, lineHeight: 25, marginTop: 24 },
  resourceBox: { backgroundColor: '#F4F8F5', borderColor: '#DCE8E0', borderRadius: 15, borderWidth: 1, marginTop: 26, padding: 16 },
  resourceLabel: { color: '#26725E', fontSize: 12, fontWeight: '800' },
  resourceName: { color: '#142420', fontSize: 15, fontWeight: '700', marginTop: 7 },
  resourceMeta: { color: '#66736F', fontSize: 13, marginTop: 4 },
  openButton: { alignItems: 'center', backgroundColor: '#1B745C', borderRadius: 12, justifyContent: 'center', marginTop: 16, minHeight: 50 },
  openText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  downloadButton: { alignItems: 'center', borderColor: '#1B745C', borderRadius: 12, borderWidth: 1, justifyContent: 'center', marginTop: 10, minHeight: 50 },
  downloadText: { color: '#1B745C', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  errorText: { color: '#9C2F26', fontSize: 13, lineHeight: 19, marginTop: 12 },
  stateBox: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  stateTitle: { color: '#142420', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#66736F', fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  retryButton: { backgroundColor: '#1B745C', borderRadius: 12, marginTop: 20, paddingHorizontal: 24, paddingVertical: 14 },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
});
