import { File as ExpoFile } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type {
  Module,
  ModuleInsert,
  ModuleRow,
  ModuleUpdate,
  ResourceType,
} from '@/types/database';

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const MODULE_BUCKET = 'module-resources';

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

export type UploadResource = {
  body: ArrayBuffer;
  kind: 'upload';
  mimeType: string;
  name: string;
  resourceType: Exclude<ResourceType, 'link'>;
  size: number;
};

type PickedUpload = Omit<UploadResource, 'body' | 'size'> & {
  size: number | null;
  uri: string;
};

export type LinkResource = {
  kind: 'link';
  url: string;
};

export type SelectedResource = LinkResource | UploadResource;

export type ModuleDraft = {
  description: string;
  resource?: SelectedResource | null;
  title: string;
};

function getClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function fromRow(row: ModuleRow): Module {
  return {
    createdAt: row.created_at,
    description: row.description,
    fileName: row.file_name,
    fileSize: row.file_size,
    id: row.id,
    mimeType: row.mime_type,
    ownerId: row.owner_id,
    resourceType: row.resource_type,
    resourceUrl: row.resource_url,
    storagePath: row.storage_path,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function normalizedText(draft: ModuleDraft) {
  const title = draft.title.trim();

  if (!title) {
    throw new Error('Enter a module title.');
  }

  return {
    description: draft.description.trim() || null,
    title,
  };
}

function normalizeLink(value: string) {
  const candidate = value.trim();

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error('Enter a valid link beginning with http:// or https://.');
  }
}

function safeFileName(name: string) {
  const sanitized = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'module-file';
}

function decodeBase64(value: string): ArrayBuffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const base64 = value.replace(/\s/g, '');
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((base64.length / 4) * 3 - padding);
  let offset = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const a = alphabet.indexOf(base64[i]);
    const b = alphabet.indexOf(base64[i + 1]);
    const c = base64[i + 2] === '=' ? 0 : alphabet.indexOf(base64[i + 2]);
    const d = base64[i + 3] === '=' ? 0 : alphabet.indexOf(base64[i + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      throw new Error('Unable to decode the selected file. Choose it again.');
    }
    const chunk = (a << 18) | (b << 12) | (c << 6) | d;
    bytes[offset++] = chunk >> 16;
    if (offset < bytes.length) bytes[offset++] = chunk >> 8;
    if (offset < bytes.length) bytes[offset++] = chunk;
  }

  return bytes.buffer;
}

async function readViaAppCache(uri: string): Promise<ArrayBuffer> {
  const cacheDirectory = LegacyFileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('Unable to access the app cache.');
  const cachedUri = `${cacheDirectory}supaprofel-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    await LegacyFileSystem.copyAsync({ from: uri, to: cachedUri });
    return decodeBase64(await LegacyFileSystem.readAsStringAsync(cachedUri, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    }));
  } finally {
    await LegacyFileSystem.deleteAsync(cachedUri, { idempotent: true }).catch(() => undefined);
  }
}

export async function prepareUpload(
  resource: PickedUpload,
  preferCacheCopy = false,
): Promise<UploadResource> {
  if (resource.size !== null && resource.size > MAX_UPLOAD_BYTES) {
    throw new Error('Uploads must be 6 MB or smaller. Use a link for larger files.');
  }

  let body: ArrayBuffer;
  if (Platform.OS === 'web') {
    const response = await fetch(resource.uri);
    if (!response.ok) throw new Error('Unable to read the selected file. Choose it again.');
    body = await response.arrayBuffer();
  } else if (preferCacheCopy && Platform.OS === 'android') {
    // Document provider URIs are read only through the legacy cache copy.
    // Do not fall back to FileSystemFile.bytes, which rejects some files.
    try {
      body = await readViaAppCache(resource.uri);
    } catch {
      throw new Error('Unable to prepare this file. Choose it again or add a link.');
    }
  } else {
    try {
      body = await new ExpoFile(resource.uri).arrayBuffer();
    } catch {
      try {
        body = await readViaAppCache(resource.uri);
      } catch {
        throw new Error('Unable to read the selected file. Choose it again.');
      }
    }
  }

  if (body.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Uploads must be 6 MB or smaller. Use a link for larger files.');
  }

  return {
    body,
    kind: 'upload',
    mimeType: resource.mimeType,
    name: resource.name,
    resourceType: resource.resourceType,
    size: body.byteLength,
  };
}

async function uploadResource(ownerId: string, resource: UploadResource) {
  const client = getClient();
  const path = `${ownerId}/${Date.now()}-${safeFileName(resource.name)}`;
  const { error } = await client.storage.from(MODULE_BUCKET).upload(path, resource.body, {
    contentType: resource.mimeType,
    upsert: false,
  });

  if (error) throw error;

  return { path, size: resource.size };
}

async function removeStoredResource(path: string) {
  const { error } = await getClient().storage.from(MODULE_BUCKET).remove([path]);

  if (error) throw error;
}

export async function listModules() {
  const { data, error } = await getClient()
    .from('modules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(fromRow);
}

export async function getModule(id: string) {
  const { data, error } = await getClient()
    .from('modules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return fromRow(data);
}

export async function createModule(ownerId: string, draft: ModuleDraft) {
  const client = getClient();
  const text = normalizedText(draft);

  let uploadedPath: string | null = null;
  let insert: ModuleInsert;

  if (!draft.resource) {
    insert = {
      ...text,
      owner_id: ownerId,
      resource_type: null,
    };
  } else if (draft.resource.kind === 'link') {
    insert = {
      ...text,
      owner_id: ownerId,
      resource_type: 'link',
      resource_url: normalizeLink(draft.resource.url),
    };
  } else {
    const uploaded = await uploadResource(ownerId, draft.resource);
    uploadedPath = uploaded.path;
    insert = {
      ...text,
      file_name: draft.resource.name,
      file_size: uploaded.size,
      mime_type: draft.resource.mimeType,
      owner_id: ownerId,
      resource_type: draft.resource.resourceType,
      storage_path: uploaded.path,
    };
  }

  const { data, error } = await client
    .from('modules')
    .insert(insert)
    .select('*')
    .single();

  if (error) {
    if (uploadedPath) {
      await removeStoredResource(uploadedPath).catch(() => undefined);
    }
    throw error;
  }

  return fromRow(data);
}

export async function updateModule(module: Module, draft: ModuleDraft) {
  const client = getClient();
  const text = normalizedText(draft);
  let uploadedPath: string | null = null;
  let update: ModuleUpdate = text;

  if (draft.resource === null) {
    update = {
      ...text,
      file_name: null,
      file_size: null,
      mime_type: null,
      resource_type: null,
      resource_url: null,
      storage_path: null,
    };
  } else if (draft.resource?.kind === 'link') {
    update = {
      ...text,
      file_name: null,
      file_size: null,
      mime_type: null,
      resource_type: 'link',
      resource_url: normalizeLink(draft.resource.url),
      storage_path: null,
    };
  } else if (draft.resource?.kind === 'upload') {
    const uploaded = await uploadResource(module.ownerId, draft.resource);
    uploadedPath = uploaded.path;
    update = {
      ...text,
      file_name: draft.resource.name,
      file_size: uploaded.size,
      mime_type: draft.resource.mimeType,
      resource_type: draft.resource.resourceType,
      resource_url: null,
      storage_path: uploaded.path,
    };
  }

  const { data, error } = await client
    .from('modules')
    .update(update)
    .eq('id', module.id)
    .eq('owner_id', module.ownerId)
    .select('*')
    .single();

  if (error) {
    if (uploadedPath) {
      await removeStoredResource(uploadedPath).catch(() => undefined);
    }
    throw error;
  }

  if (draft.resource !== undefined && module.storagePath) {
    await removeStoredResource(module.storagePath).catch(() => undefined);
  }

  return fromRow(data);
}

export async function deleteModule(module: Module) {
  if (module.storagePath) {
    await removeStoredResource(module.storagePath);
  }

  const { error } = await getClient()
    .from('modules')
    .delete()
    .eq('id', module.id)
    .eq('owner_id', module.ownerId);

  if (error) throw error;
}

export async function getModuleResourceUrl(module: Module, download = false) {
  if (!module.resourceType) {
    throw new Error('This announcement does not have an attached resource.');
  }

  if (module.resourceType === 'link' && module.resourceUrl) {
    return module.resourceUrl;
  }

  if (!module.storagePath) {
    throw new Error('This module does not have a resource to open.');
  }

  const { data, error } = await getClient()
    .storage.from(MODULE_BUCKET)
    .createSignedUrl(
      module.storagePath,
      60,
      download ? { download: module.fileName || true } : undefined,
    );

  if (error) throw error;

  return data.signedUrl;
}

export function formatFileSize(size: number | null) {
  if (size === null) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
