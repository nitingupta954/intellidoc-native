// ─────────────────────────────────────────────────────────────────────────────
// 3-step presigned upload orchestration
// Ported from doc_maanagement/src/hooks/use-documents.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import api from './client';
import { PickedFile, Document } from '../types';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB hard cap

export interface UploadOptions {
  workspaceId: string;
  knowledgeBaseId?: string;
  folderId?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Full 3-step upload:
 * 1. POST /api/upload            → presignedUrl + storageKey
 * 2. PUT binary to S3/MinIO      → via FileSystem.uploadAsync
 * 3. POST /api/upload/complete   → creates Document row + queues RabbitMQ job
 */
export async function uploadDocument(
  file: PickedFile,
  opts: UploadOptions,
): Promise<Document> {
  // Client-side size cap before touching the server
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds the 20 MB limit.');
  }

  opts.onProgress?.(10);

  // Step 1: Get presigned URL
  const presignRes = await api.post('/api/upload', {
    fileName: file.name,
    fileType: file.mimeType || 'application/octet-stream',
    fileSize: file.size,
    workspaceId: opts.workspaceId,
    knowledgeBaseId: opts.knowledgeBaseId ?? undefined,
    folderId: opts.folderId ?? undefined,
  });

  const { presignedUrl, storageKey } = presignRes.data as {
    presignedUrl: string;
    storageKey: string;
  };

  opts.onProgress?.(30);

  // Step 2: PUT raw bytes to S3/MinIO
  // On Web, use standard fetch with the native File object.
  // On Native (iOS/Android), use FileSystem.uploadAsync.
  if (Platform.OS === 'web' && file.file) {
    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
      },
      body: file.file,
    });
    if (!uploadRes.ok) {
      throw new Error(`Failed to upload to storage: HTTP ${uploadRes.status}`);
    }
  } else {
    const uploadResult = await FileSystem.uploadAsync(presignedUrl, file.uri, {
      httpMethod: 'PUT',
      // @ts-ignore: expo-file-system might not export FileSystemUploadType correctly in this version
      uploadType: FileSystem.FileSystemUploadType?.BINARY_CONTENT ?? 0,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
      },
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(`Failed to upload to storage: HTTP ${uploadResult.status}`);
    }
  }

  opts.onProgress?.(80);

  // Step 3: Complete the upload — creates the DB row + publishes RabbitMQ job
  const completeRes = await api.post('/api/upload/complete', {
    storageKey,
    fileName: file.name,
    fileType: file.mimeType || 'application/octet-stream',
    fileSize: file.size,
    workspaceId: opts.workspaceId,
    knowledgeBaseId: opts.knowledgeBaseId ?? undefined,
    folderId: opts.folderId ?? undefined,
  });

  opts.onProgress?.(100);

  return completeRes.data.document as Document;
}
