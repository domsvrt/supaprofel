import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  deleteModule,
  formatFileSize,
  getErrorMessage,
  getModuleResourceUrl,
  listModules,
} from "@/lib/modules";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import type { Module, ResourceType } from "@/types/database";

const RESOURCE_LABELS: Record<ResourceType, string> = {
  file: "FILE",
  image: "IMAGE",
  link: "LINK",
  video: "VIDEO",
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  file: "▤",
  image: "▧",
  link: "↗",
  video: "▶",
};

export default function ModuleRepositoryScreen() {
  const { session } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadModules = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      setModules(await listModules());
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load your posts."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadModules();
    }, [loadModules]),
  );

  async function handleSignOut() {
    if (!supabase) return;

    setIsSigningOut(true);
    setErrorMessage(null);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      setIsSigningOut(false);
    }
  }

  async function handleOpen(module: Module) {
    setOpeningId(module.id);
    setErrorMessage(null);

    try {
      await Linking.openURL(await getModuleResourceUrl(module));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to open the resource."));
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const module = deleteTarget;
    setDeletingId(module.id);
    setDeleteTarget(null);
    setErrorMessage(null);

    try {
      await deleteModule(module);
      setModules((current) => current.filter((item) => item.id !== module.id));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete the post."));
    } finally {
      setDeletingId(null);
    }
  }

  function renderModule({ item }: { item: Module }) {
    const resourceType = item.resourceType;
    const detail = !resourceType
      ? null
      : resourceType === "link"
        ? item.resourceUrl
        : [item.fileName, formatFileSize(item.fileSize)]
            .filter(Boolean)
            .join(" · ");

    return (
      <View style={styles.moduleCard}>
        <View style={styles.moduleTopRow}>
          <View style={styles.resourceMark}>
            <Text style={styles.resourceMarkText}>
              {resourceType ? RESOURCE_ICONS[resourceType] : "✦"}
            </Text>
          </View>
          <View style={styles.moduleTitleBlock}>
            <Text style={styles.typeLabel}>
              {resourceType ? RESOURCE_LABELS[resourceType] : "ANNOUNCEMENT"}
            </Text>
            <Text numberOfLines={2} style={styles.moduleTitle}>
              {item.title}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text numberOfLines={3} style={styles.description}>
            {item.description}
          </Text>
        ) : null}

        {detail ? (
          <View style={styles.resourceDetail}>
            <Text numberOfLines={1} style={styles.resourceDetailText}>
              {detail}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.dateText}>
            Added {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          {deletingId === item.id ? (
            <ActivityIndicator color="#1B745C" size="small" />
          ) : null}
        </View>

        <View style={styles.actions}>
          {resourceType ? (
            <Pressable
              accessibilityRole="button"
              disabled={openingId === item.id || deletingId === item.id}
              onPress={() => handleOpen(item)}
              style={({ pressed }) => [
                styles.openButton,
                pressed && styles.openButtonPressed,
              ]}
            >
              {openingId === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.openButtonText}>Open</Text>
              )}
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={deletingId === item.id}
            onPress={() =>
              router.push({
                pathname: "/modules/[id]",
                params: { id: item.id },
              })
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={deletingId === item.id}
            onPress={() => setDeleteTarget(item)}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deletePressed,
            ]}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <FlatList
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#1B745C" size="large" />
              <Text style={styles.stateText}>Loading your posts…</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyMark}>
                <Text style={styles.emptyMarkText}>＋</Text>
              </View>
              <Text style={styles.emptyTitle}>Your repository is empty</Text>
              <Text style={styles.emptyText}>
                Post an announcement or add a teaching resource.
              </Text>
              <Pressable
                onPress={() => router.push("/modules/new")}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>Create a post</Text>
              </Pressable>
            </View>
          )
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.logoMark}>
                  <Text style={styles.logoLetter}>S</Text>
                </View>
                <View style={styles.brandText}>
                  <Text style={styles.eyebrow}>SUPAPROFEL</Text>
                  <Text style={styles.title}>{"Ocsing's Repository"}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isSigningOut}
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.signOutButton,
                  pressed && styles.secondaryPressed,
                ]}
              >
                {isSigningOut ? (
                  <ActivityIndicator color="#173C35" size="small" />
                ) : (
                  <Text style={styles.signOutText}>Sign out</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.welcomeRow}>
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeLabel}>YOUR LIBRARY</Text>
                <Text numberOfLines={1} style={styles.email}>
                  {session?.user.email ?? "Teacher account"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/modules/new")}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.addButtonPressed,
                ]}
              >
                <Text style={styles.addButtonText}>＋ New post</Text>
              </Pressable>
            </View>

            {errorMessage ? (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Pressable onPress={() => loadModules()}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {!isLoading && modules.length ? (
              <Text style={styles.countText}>
                {modules.length} {modules.length === 1 ? "post" : "posts"}
              </Text>
            ) : null}
          </>
        }
        contentContainerStyle={styles.content}
        data={modules}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            colors={["#1B745C"]}
            onRefresh={() => loadModules(true)}
            refreshing={isRefreshing}
            tintColor="#1B745C"
          />
        }
        renderItem={renderModule}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
        transparent
        visible={Boolean(deleteTarget)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this post?</Text>
            <Text style={styles.modalText}>
              “{deleteTarget?.title}” and any uploaded resource will be removed.
              This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteTarget(null)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.modalDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F4F7F5", flex: 1 },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    maxWidth: 760,
    paddingBottom: 40,
    paddingHorizontal: 20,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingTop: 10,
  },
  brandRow: { alignItems: "center", flexDirection: "row", flex: 1 },
  logoMark: {
    alignItems: "center",
    backgroundColor: "#173C35",
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  logoLetter: { color: "#80E5B6", fontSize: 22, fontWeight: "900" },
  brandText: { flex: 1, marginLeft: 12 },
  eyebrow: {
    color: "#26725E",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  title: {
    color: "#142420",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  signOutButton: {
    alignItems: "center",
    borderColor: "#C9D5D0",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    marginLeft: 10,
    minHeight: 42,
    minWidth: 76,
    paddingHorizontal: 12,
  },
  signOutText: { color: "#173C35", fontSize: 12, fontWeight: "800" },
  welcomeRow: {
    alignItems: "center",
    backgroundColor: "#173C35",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    padding: 18,
  },
  welcomeText: { flex: 1, marginRight: 10 },
  welcomeLabel: {
    color: "#80E5B6",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  email: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginTop: 5 },
  addButton: {
    backgroundColor: "#80E5B6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addButtonPressed: { backgroundColor: "#66CAA0" },
  addButtonText: { color: "#173C35", fontSize: 13, fontWeight: "900" },
  errorBox: {
    alignItems: "center",
    backgroundColor: "#FFF1F0",
    borderColor: "#F3C3BF",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    padding: 13,
  },
  errorText: { color: "#9C2F26", flex: 1, fontSize: 12, lineHeight: 18 },
  retryText: {
    color: "#8D2821",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 12,
  },
  countText: {
    color: "#64716C",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 3,
    textTransform: "uppercase",
  },
  moduleCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E0E8E4",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 13,
    padding: 18,
  },
  moduleTopRow: { alignItems: "center", flexDirection: "row" },
  resourceMark: {
    alignItems: "center",
    backgroundColor: "#E1F5EB",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  resourceMarkText: { color: "#1B745C", fontSize: 21, fontWeight: "900" },
  moduleTitleBlock: { flex: 1, marginLeft: 13 },
  typeLabel: {
    color: "#278166",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  moduleTitle: {
    color: "#172923",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 3,
  },
  description: {
    color: "#64716C",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 13,
  },
  resourceDetail: {
    backgroundColor: "#F5F8F6",
    borderRadius: 10,
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  resourceDetailText: { color: "#687570", fontSize: 11 },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 11,
  },
  dateText: { color: "#8A9490", fontSize: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 15 },
  openButton: {
    alignItems: "center",
    backgroundColor: "#1B745C",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  openButtonPressed: { backgroundColor: "#155D4A" },
  openButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#BDD0C8",
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 18,
  },
  secondaryPressed: { backgroundColor: "#EAF1EE" },
  secondaryButtonText: { color: "#1C5D4C", fontSize: 13, fontWeight: "800" },
  deleteButton: {
    alignItems: "center",
    borderRadius: 11,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 10,
  },
  deletePressed: { backgroundColor: "#FFF0EF" },
  deleteButtonText: { color: "#A23A31", fontSize: 12, fontWeight: "800" },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
  },
  stateText: { color: "#687570", fontSize: 13, marginTop: 13 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE6E1",
    borderRadius: 22,
    borderStyle: "dashed",
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  emptyMark: {
    alignItems: "center",
    backgroundColor: "#E2F5EC",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  emptyMarkText: { color: "#1B745C", fontSize: 30, fontWeight: "700" },
  emptyTitle: {
    color: "#172923",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 17,
  },
  emptyText: {
    color: "#6D7975",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: "#1B745C",
    borderRadius: 12,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  emptyButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(12, 28, 23, 0.55)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    maxWidth: 430,
    padding: 22,
    width: "100%",
  },
  modalTitle: { color: "#172923", fontSize: 21, fontWeight: "800" },
  modalText: { color: "#66736F", fontSize: 14, lineHeight: 21, marginTop: 9 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  modalCancel: {
    alignItems: "center",
    borderColor: "#C9D5D0",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 13,
  },
  modalCancelText: { color: "#31463F", fontWeight: "800" },
  modalDelete: {
    alignItems: "center",
    backgroundColor: "#A73E35",
    borderRadius: 12,
    flex: 1,
    padding: 13,
  },
  modalDeleteText: { color: "#FFFFFF", fontWeight: "800" },
});
