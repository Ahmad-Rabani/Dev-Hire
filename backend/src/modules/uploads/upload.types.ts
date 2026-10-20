export const UPLOAD_PURPOSES = [
  'avatar',
  'portfolio',
  'job_attachment',
  'milestone_deliverable',
] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const UPLOAD_VISIBILITIES = ['public', 'private'] as const;
export type UploadVisibility = (typeof UPLOAD_VISIBILITIES)[number];

export type PublicUpload = {
  id: string;
  purpose: UploadPurpose;
  visibility: UploadVisibility;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};
