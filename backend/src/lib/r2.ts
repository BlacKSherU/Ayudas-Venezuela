import type { Env } from "../types";
import { newId } from "./ids";
import { AppError } from "./responses";

export const MEDIA_LIMITS = {
  photoMaxBytes: 5 * 1024 * 1024, // 5 MB
  videoMaxBytes: 25 * 1024 * 1024, // 25 MB
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/webm", "video/quicktime"],
};

export type MediaKind = "cedula" | "evidencia" | "prueba_entrega";

/** Valida el tipo y tamaño de un medio según los límites (foto/video). */
export function validateMedia(contentType: string, sizeBytes: number): void {
  const isImage = MEDIA_LIMITS.imageTypes.includes(contentType);
  const isVideo = MEDIA_LIMITS.videoTypes.includes(contentType);
  if (!isImage && !isVideo) {
    throw new AppError("UNSUPPORTED_MEDIA", "Tipo de archivo no admitido", 415);
  }
  const max = isImage ? MEDIA_LIMITS.photoMaxBytes : MEDIA_LIMITS.videoMaxBytes;
  if (sizeBytes > max) {
    throw new AppError("MEDIA_TOO_LARGE", "El archivo excede el tamaño permitido", 413);
  }
}

/** Sube un objeto a R2 y registra sus metadatos en D1. Devuelve la clave opaca. */
export async function putMedia(
  env: Env,
  params: {
    kind: MediaKind;
    contentType: string;
    body: ArrayBuffer | ArrayBufferView;
    ownerRef?: string;
    encrypted?: boolean;
    now: number;
  },
): Promise<string> {
  const key = `${params.kind}/${newId()}`;
  await env.MEDIA.put(key, params.body, {
    httpMetadata: { contentType: params.encrypted ? "application/octet-stream" : params.contentType },
  });
  await env.DB.prepare(
    `INSERT INTO media_object (key, kind, content_type, size_bytes, owner_ref, encrypted, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      key,
      params.kind,
      params.contentType,
      params.body.byteLength,
      params.ownerRef ?? null,
      params.encrypted ? 1 : 0,
      params.now,
    )
    .run();
  return key;
}

export interface MediaMeta {
  key: string;
  kind: MediaKind;
  content_type: string;
  encrypted: number;
  owner_ref: string | null;
}

export async function getMediaMeta(env: Env, key: string): Promise<MediaMeta | null> {
  return env.DB.prepare(
    `SELECT key, kind, content_type, encrypted, owner_ref FROM media_object WHERE key = ?`,
  )
    .bind(key)
    .first<MediaMeta>();
}
