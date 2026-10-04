import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage, listModules } from '@/lib/modules';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { Module } from '@/types/database';

function resourceLabel(module: Module) {
  if (!module.resourceType) return 'ANNOUNCEMENT';
  if (module.resourceType === 'link') return 'LINK';
  if (module.resourceType === 'image') return 'IMAGE';
  if (module.resourceType === 'video') return 'VIDEO';
  return 'FILE';
}

export default function StudentAssignmentsScreen() {
  const { session } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadModules = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      setModules(await listModules());
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to load assignments.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadModules(); }, [loadModules]));

  async function handleSignOut() {
    if (!supabase) return;
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(error.message);
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={modules}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <View style={styles.brand}>
                <Text style={styles.eyebrow}>SUPAPROFEL</Text>
                <Text style={styles.title}>Assignments</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isSigningOut}
                onPress={handleSignOut}
                style={styles.signOutButton}
              >
                {isSigningOut ? <ActivityIndicator color="#173C35" size="small" /> : <Text style={styles.signOutText}>Sign out</Text>}
              </Pressable>
            </View>
            <Text numberOfLines={1} style={styles.accountText}>{session?.user.email}</Text>
            <Text style={styles.intro}>Posts and resources shared by your teacher.</Text>
            {errorMessage ? (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Pressable accessibilityRole="button" onPress={() => loadModules()} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}
            {!isLoading && !errorMessage && modules.length > 0 ? (
              <Text style={styles.countText}>{modules.length} {modules.length === 1 ? 'post' : 'posts'}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#1B745C" size="large" />
              <Text style={styles.stateText}>Loading assignments…</Text>
            </View>
          ) : errorMessage ? null : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No assignments yet</Text>
              <Text style={styles.stateText}>New posts from your teacher will appear here.</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={['#1B745C']}
            onRefresh={() => loadModules(true)}
            refreshing={isRefreshing}
            tintColor="#1B745C"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={`View ${item.title}`}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/student/assignments/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Text style={styles.typeLabel}>{resourceLabel(item)}</Text>
            <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
            {item.description ? <Text numberOfLines={3} style={styles.description}>{item.description}</Text> : null}
            <View style={styles.cardFooter}>
              <Text style={styles.dateText}>Posted {new Date(item.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.viewText}>View ›</Text>
            </View>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F4F7F5', flex: 1 },
  content: { alignSelf: 'center', flexGrow: 1, maxWidth: 760, paddingBottom: 40, paddingHorizontal: 20, width: '100%' },
  header: { paddingBottom: 10, paddingTop: 20 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { flex: 1, paddingRight: 12 },
  eyebrow: { color: '#26725E', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#142420', fontSize: 30, fontWeight: '800', marginTop: 4 },
  signOutButton: { backgroundColor: '#FFFFFF', borderColor: '#DCE5E0', borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11 },
  signOutText: { color: '#173C35', fontSize: 13, fontWeight: '700' },
  accountText: { color: '#66736F', fontSize: 13, marginTop: 8 },
  intro: { color: '#53665E', fontSize: 15, lineHeight: 22, marginBottom: 20, marginTop: 20 },
  countText: { color: '#53665E', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E1E8E4', borderRadius: 18, borderWidth: 1, marginBottom: 12, padding: 18 },
  pressed: { opacity: 0.7 },
  typeLabel: { color: '#26725E', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  cardTitle: { color: '#142420', fontSize: 19, fontWeight: '800', marginTop: 8 },
  description: { color: '#53665E', fontSize: 14, lineHeight: 21, marginTop: 9 },
  cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  dateText: { color: '#7A8581', fontSize: 12 },
  viewText: { color: '#1B745C', fontSize: 14, fontWeight: '800' },
  stateBox: { alignItems: 'center', padding: 40 },
  stateText: { color: '#66736F', fontSize: 14, lineHeight: 21, marginTop: 12, textAlign: 'center' },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 28 },
  emptyTitle: { color: '#142420', fontSize: 20, fontWeight: '800' },
  errorBox: { backgroundColor: '#FFF1F0', borderColor: '#F3C3BF', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 14 },
  errorText: { color: '#9C2F26', fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  retryText: { color: '#9C2F26', fontWeight: '800' },
});
