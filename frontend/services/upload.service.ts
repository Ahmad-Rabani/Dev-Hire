import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';

export type UploadPurpose = 'avatar' | 'portfolio' | 'job_attachment' | 'milestone_deliverable';

export type PublicUpload = {
  id: string;
  purpose: UploadPurpose;
  visibility: 'public' | 'private';
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export async function uploadFile(input: {
  file: File;
  purpose: UploadPurpose;
  resourceType?: 'job' | 'contract' | 'portfolio';
  resourceId?: string;
  onProgress?: (percent: number) => void;
}): Promise<PublicUpload> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('purpose', input.purpose);
  if (input.resourceType) form.append('resourceType', input.resourceType);
  if (input.resourceId) form.append('resourceId', input.resourceId);

  const response = await apiClient.post<ApiSuccessResponse<{ upload: PublicUpload }>>(
    '/uploads',
    form,
    {
      timeout: 60_000,
      transformRequest: [
        (data, headers) => {
          // Drop the default JSON Content-Type so the browser sets multipart boundaries.
          if (data instanceof FormData && headers && typeof headers === 'object') {
            delete (headers as Record<string, unknown>)['Content-Type'];
          }
          return data;
        },
      ],
      onUploadProgress: (event) => {
        if (!input.onProgress || !event.total) return;
        input.onProgress(Math.round((event.loaded / event.total) * 100));
      },
    },
  );
  return response.data.data.upload;
}

/** Fetch a private file with the auth header and open/download it. */
export async function downloadUpload(uploadId: string, filename?: string): Promise<void> {
  const response = await apiClient.get(`/uploads/${uploadId}/content`, {
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename ?? 'download';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}
