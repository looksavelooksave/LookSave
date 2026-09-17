import type { TaskKind, TaskStatus } from '@looksave/validation';

import { api, ApiClientError } from './client';

/**
 * Operator navbati — `/v1/developer-ai/*`.
 *
 * Server `admin` rolini talab qiladi; panel ham shuni tekshiradi, lekin
 * haqiqiy himoya serverda.
 */

export interface AvatarPayload {
  faceUrl?: string;
  prompt?: string;
  gender?: string | null;
  measurements?: Record<string, number | string>;
}

export interface Task {
  id: string;
  kind: TaskKind;
  userId: string;
  refId: string;
  status: TaskStatus;
  payload: AvatarPayload & Record<string, unknown>;
  /** Imzolangan ko'rish havolalari — kalit payload'dagi bilan bir xil */
  previews: Record<string, string>;
  claimedBy: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  resultUrl: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  waitingSeconds: number;
}

export type TaskFilter = TaskStatus | 'open';

export const listTasks = (status: TaskFilter): Promise<Task[]> =>
  api<Task[]>(`/developer-ai/tasks?status=${status}&limit=100`);

export const claimTask = (id: string): Promise<Task> =>
  api<Task>(`/developer-ai/tasks/${id}/claim`, { method: 'POST' });

export const releaseTask = (id: string): Promise<Task> =>
  api<Task>(`/developer-ai/tasks/${id}/release`, { method: 'POST' });

export const failTask = (id: string, reason: string): Promise<Task> =>
  api<Task>(`/developer-ai/tasks/${id}/fail`, { method: 'POST', body: { reason } });

interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
}

const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ImageType = (typeof TYPES)[number];

function isImageType(value: string): value is ImageType {
  return (TYPES as readonly string[]).includes(value);
}

/**
 * Natija suratini yuklab, ishni yopadi.
 *
 * ⚠️ IKKI QADAM, BITTA EMAS. Surat server orqali o'tmaydi — avval
 * imzolangan manzilga to'g'ridan-to'g'ri R2 ga yuklanadi, keyin faqat
 * manzil serverga beriladi. Server tashqi havolani qabul qilmaydi.
 */
export async function submitResult(id: string, file: File): Promise<Task> {
  if (!isImageType(file.type)) {
    throw new ApiClientError('VALIDATION_ERROR', 'Faqat JPG, PNG yoki WEBP', 0);
  }

  const presign = await api<PresignResult>('/developer-ai/uploads/presign', {
    method: 'POST',
    body: { purpose: 'avatar', contentType: file.type, fileName: file.name },
  });

  let uploaded: Response;
  try {
    uploaded = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: presign.headers,
      body: file,
    });
  } catch {
    /*
     * ⚠️ BRAUZER BU YERDA SABABNI AYTMAYDI. Internet uzilgani ham, omborning
     * CORS ro'yxatida panel manzili yo'qligi ham bir xil `TypeError` bo'lib
     * keladi. Ikkinchisi 2026-09-17 da haqiqatan bo'lgan — shuning uchun
     * matn ikkalasini ham aytadi.
     */
    throw new ApiClientError(
      'NETWORK',
      'Surat omborga yetmadi — internetni yoki omborning CORS sozlamasini tekshiring (npm run r2:cors)',
      0,
    );
  }

  if (!uploaded.ok) {
    throw new ApiClientError('NETWORK', `Surat yuklanmadi (${uploaded.status})`, uploaded.status);
  }

  return api<Task>(`/developer-ai/tasks/${id}/result`, {
    method: 'POST',
    body: { resultUrl: presign.publicUrl },
  });
}
