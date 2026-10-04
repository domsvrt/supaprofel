import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createModule,
  formatFileSize,
  getErrorMessage,
  MAX_UPLOAD_BYTES,
  type SelectedResource,
  type UploadResource,
  updateModule,
} from "@/lib/modules";
import { useAuth } from "@/providers/auth-provider";
import type { Module, ResourceType } from "@/types/database";

type ModuleFormProps = {
  module?: Module;
};

type ResourceChoice = "link" | "none" | "upload" | null;

function resourceTypeFromMime(
  mimeType: string,
  fallback?: "image" | "video" | null,
): Exclude<ResourceType, "link"> {
  if (mimeType.startsWith("image/") || fallback === "image") return "image";
  if (mimeType.startsWith("video/") || fallback === "video") return "video";
  return "file";
}

export function ModuleForm({ module }: ModuleFormProps) {
  const { session } = useAuth();
  const isEditing = Boolean(module);
  const [title, setTitle] = useState(module?.title ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [resourceChoice, setResourceChoice] = useState<ResourceChoice>(
    module ? null : "none",
  );
  const [upload, setUpload] = useState<UploadResource | null>(null);
  const [link, setLink] = useState(module?.resourceUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function validateUploadSize(size: number | null) {
    if (size !== null && size > MAX_UPLOAD_BYTES) {
      setErrorMessage(
        "That file is larger than 6 MB. Add it as a link instead.",
      );
      return false;
    }

    return true;
  }

  async function chooseDocument() {
    setErrorMessage(null);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*",
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const size = asset.size ?? asset.file?.size ?? null;
    if (!validateUploadSize(size)) return;

    const mimeType =
      asset.mimeType || asset.file?.type || "application/octet-stream";
    setUpload({
      kind: "upload",
      mimeType,
      name: asset.name,
      resourceType: resourceTypeFromMime(mimeType),
      size,
      uri: asset.uri,
    });
    setResourceChoice("upload");
  }

  async function chooseMedia() {
    setErrorMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage("Photo library permission is required to choose media.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ["images", "videos"],
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const size = asset.fileSize ?? asset.file?.size ?? null;
    if (!validateUploadSize(size)) return;

    const fallbackType = asset.type === "video" ? "video" : "image";
    const mimeType =
      asset.mimeType ||
      asset.file?.type ||
      (fallbackType === "video" ? "video/mp4" : "image/jpeg");
    const extension = fallbackType === "video" ? "mp4" : "jpg";

    setUpload({
      kind: "upload",
      mimeType,
      name:
        asset.fileName || `module-${fallbackType}-${Date.now()}.${extension}`,
      resourceType: resourceTypeFromMime(mimeType, fallbackType),
      size,
      uri: asset.uri,
    });
    setResourceChoice("upload");
  }

  async function handleSubmit() {
    if (!session) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    let resource: SelectedResource | null | undefined;
    if (resourceChoice === "link") {
      resource = { kind: "link", url: link };
    } else if (resourceChoice === "upload" && upload) {
      resource = upload;
    } else if (resourceChoice === "none") {
      resource = null;
    }

    try {
      const draft = { description, resource, title };

      if (module) {
        await updateModule(module, draft);
      } else {
        await createModule(session.user.id, draft);
      }

      router.back();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save the post."));
      setIsSubmitting(false);
    }
  }

  const currentResourceLabel = module
    ? module.resourceType === "link"
      ? module.resourceUrl
      : module.fileName
    : null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            disabled={isSubmitting}
            hitSlop={10}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{"Ocsing's Repository"}</Text>{" "}
            <Text style={styles.heading}>
              {" "}
              {isEditing ? "Edit post" : "New post"}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              autoCapitalize="sentences"
              editable={!isSubmitting}
              maxLength={160}
              onChangeText={setTitle}
              placeholder="Example: Introduction to fractions"
              placeholderTextColor="#89938F"
              style={styles.input}
              value={title}
            />

            <Text style={[styles.label, styles.fieldSpacing]}>Description</Text>
            <TextInput
              editable={!isSubmitting}
              maxLength={2000}
              multiline
              onChangeText={setDescription}
              placeholder="Optional notes about this module"
              placeholderTextColor="#89938F"
              style={[styles.input, styles.descriptionInput]}
              textAlignVertical="top"
              value={description}
            />

            <View style={styles.resourceHeadingRow}>
              <View style={styles.resourceHeadingText}>
                <Text style={styles.label}>Resource</Text>
                <Text style={styles.helperText}>
                  Optional for announcements
                </Text>
              </View>
              {isEditing && resourceChoice ? (
                <Pressable
                  onPress={() => {
                    setResourceChoice(null);
                    setUpload(null);
                    setErrorMessage(null);
                  }}
                >
                  <Text style={styles.keepCurrentText}>Keep current</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.resourceButtons}>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => {
                  setResourceChoice("none");
                  setUpload(null);
                  setErrorMessage(null);
                }}
                style={({ pressed }) => [
                  styles.resourceButton,
                  resourceChoice === "none" && styles.resourceButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.resourceIcon}>✦</Text>
                <Text style={styles.resourceButtonText}>Announcement</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={chooseDocument}
                style={({ pressed }) => [
                  styles.resourceButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.resourceIcon}>▤</Text>
                <Text style={styles.resourceButtonText}>File</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={chooseMedia}
                style={({ pressed }) => [
                  styles.resourceButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.resourceIcon}>▧</Text>
                <Text style={styles.resourceButtonText}>Photo/video</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => {
                  setResourceChoice("link");
                  setUpload(null);
                  setErrorMessage(null);
                }}
                style={({ pressed }) => [
                  styles.resourceButton,
                  resourceChoice === "link" && styles.resourceButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.resourceIcon}>↗</Text>
                <Text style={styles.resourceButtonText}>Link</Text>
              </Pressable>
            </View>

            {resourceChoice === "link" ? (
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                inputMode="url"
                onChangeText={setLink}
                placeholder="https://example.com/resource"
                placeholderTextColor="#89938F"
                style={[styles.input, styles.resourceInput]}
                value={link}
              />
            ) : null}

            {resourceChoice === "upload" && upload ? (
              <View style={styles.resourcePreview}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {upload.resourceType.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.previewText}>
                  <Text numberOfLines={1} style={styles.previewName}>
                    {upload.name}
                  </Text>
                  <Text style={styles.previewMeta}>
                    {formatFileSize(upload.size) ??
                      "Size checked during upload"}
                  </Text>
                </View>
              </View>
            ) : null}

            {resourceChoice === "none" ? (
              <View style={styles.resourcePreview}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>TEXT</Text>
                </View>
                <View style={styles.previewText}>
                  <Text style={styles.previewName}>Text-only announcement</Text>
                  <Text style={styles.previewMeta}>No attachment required</Text>
                </View>
              </View>
            ) : null}

            {!resourceChoice && module ? (
              <View style={styles.resourcePreview}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {module.resourceType?.toUpperCase() ?? "TEXT"}
                  </Text>
                </View>
                <View style={styles.previewText}>
                  <Text numberOfLines={1} style={styles.previewName}>
                    {currentResourceLabel ?? "Text-only announcement"}
                  </Text>
                  <Text style={styles.previewMeta}>Current resource</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.limitText}>
              Upload limit: 6 MB. Use a link for larger videos or files.
            </Text>

            {errorMessage ? (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                isSubmitting && styles.disabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Save changes" : "Create post"}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F4F7F5", flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5E1",
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    marginRight: 14,
    width: 46,
  },
  backText: { color: "#173C35", fontSize: 34, lineHeight: 37 },
  headerText: { flex: 1 },
  eyebrow: {
    color: "#26725E",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  heading: {
    color: "#142420",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 3,
  },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  card: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E0E8E4",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 620,
    padding: 20,
    width: "100%",
  },
  label: { color: "#263A34", fontSize: 14, fontWeight: "800" },
  fieldSpacing: { marginTop: 20 },
  input: {
    backgroundColor: "#F8FAF9",
    borderColor: "#CFD9D5",
    borderRadius: 14,
    borderWidth: 1,
    color: "#142420",
    fontSize: 16,
    marginTop: 8,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  descriptionInput: { minHeight: 110, paddingTop: 14 },
  resourceHeadingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  resourceHeadingText: { flex: 1 },
  helperText: { color: "#7A8581", fontSize: 12, marginTop: 3 },
  keepCurrentText: { color: "#1B745C", fontSize: 13, fontWeight: "800" },
  resourceButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  resourceButton: {
    alignItems: "center",
    backgroundColor: "#F4F7F5",
    borderColor: "#D5DFDB",
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "45%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 74,
    paddingHorizontal: 6,
  },
  resourceButtonSelected: {
    backgroundColor: "#E5F6EE",
    borderColor: "#64B798",
  },
  resourceIcon: { color: "#1B745C", fontSize: 20, fontWeight: "800" },
  resourceButtonText: {
    color: "#263A34",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },
  resourceInput: { marginTop: 12 },
  resourcePreview: {
    alignItems: "center",
    backgroundColor: "#F2F8F5",
    borderColor: "#D3E7DE",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 12,
    padding: 12,
  },
  typeBadge: {
    alignItems: "center",
    backgroundColor: "#D9F1E6",
    borderRadius: 9,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 51,
    paddingHorizontal: 7,
  },
  typeBadgeText: { color: "#176349", fontSize: 9, fontWeight: "900" },
  previewText: { flex: 1, marginLeft: 11 },
  previewName: { color: "#243832", fontSize: 14, fontWeight: "700" },
  previewMeta: { color: "#74807C", fontSize: 11, marginTop: 3 },
  limitText: { color: "#7A8581", fontSize: 11, marginTop: 9 },
  errorBox: {
    backgroundColor: "#FFF1F0",
    borderColor: "#F3C3BF",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
    padding: 12,
  },
  errorText: { color: "#9C2F26", fontSize: 13, lineHeight: 19 },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#1B745C",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 22,
    minHeight: 54,
  },
  saveButtonPressed: { backgroundColor: "#155D4A" },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.65 },
});
