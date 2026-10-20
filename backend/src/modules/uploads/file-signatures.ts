import type { UploadPurpose } from './upload.types';

type Detected = { mimeType: string; extension: string };

/**
 * Inspect magic bytes — do not trust browser Content-Type alone.
 * Not a malware scanner; documents that limitation in docs.
 */
export function detectImageOrPdf(buffer: Buffer): Detected | null {
  if (buffer.length < 12) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  // PDF
  if (buffer.toString('ascii', 0, 4) === '%PDF') {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }

  return null;
}

export function allowedForPurpose(purpose: UploadPurpose, mimeType: string): boolean {
  if (purpose === 'avatar' || purpose === 'portfolio') {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
  }
  // job_attachment + milestone_deliverable
  return ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType);
}

export function visibilityForPurpose(purpose: UploadPurpose): 'public' | 'private' {
  if (purpose === 'avatar' || purpose === 'portfolio') return 'public';
  return 'private';
}

export function maxBytesForPurpose(purpose: UploadPurpose, globalMaxMb: number): number {
  const mb =
    purpose === 'avatar' ? Math.min(2, globalMaxMb) : purpose === 'portfolio' ? Math.min(5, globalMaxMb) : globalMaxMb;
  return mb * 1024 * 1024;
}
