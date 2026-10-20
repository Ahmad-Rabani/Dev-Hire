'use client';

import { Alert, Button, Progress, Upload } from 'antd';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  downloadUpload,
  uploadFile,
  type PublicUpload,
  type UploadPurpose,
} from '@/services/upload.service';

const ACCEPT_BY_PURPOSE: Record<UploadPurpose, string> = {
  avatar: 'image/jpeg,image/png,image/webp',
  portfolio: 'image/jpeg,image/png,image/webp',
  job_attachment: 'image/jpeg,image/png,image/webp,application/pdf',
  milestone_deliverable: 'image/jpeg,image/png,image/webp,application/pdf',
};

const HINT_BY_PURPOSE: Record<UploadPurpose, string> = {
  avatar: 'JPEG, PNG, or WebP · max 2MB',
  portfolio: 'JPEG, PNG, or WebP · max 5MB',
  job_attachment: 'Images or PDF · max 5MB each',
  milestone_deliverable: 'Images or PDF · max 5MB each',
};

type FileUploadFieldProps = {
  purpose: UploadPurpose;
  resourceType?: 'job' | 'contract' | 'portfolio';
  resourceId?: string;
  multiple?: boolean;
  maxFiles?: number;
  value?: PublicUpload[];
  onChange?: (files: PublicUpload[]) => void;
  label?: string;
};

export function FileUploadField({
  purpose,
  resourceType,
  resourceId,
  multiple = false,
  maxFiles = 1,
  value = [],
  onChange,
  label = 'Upload file',
}: FileUploadFieldProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const canAddMore = value.length < maxFiles;

  const runUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadFile({
        file,
        purpose,
        resourceType,
        resourceId,
        onProgress: setProgress,
      });
      const next = multiple ? [...value, uploaded].slice(0, maxFiles) : [uploaded];
      onChange?.(next);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">{HINT_BY_PURPOSE[purpose]}</p>

      {canAddMore ? (
        <Upload
          accept={ACCEPT_BY_PURPOSE[purpose]}
          showUploadList={false}
          disabled={uploading}
          beforeUpload={(file) => {
            void runUpload(file);
            return false;
          }}
          multiple={multiple}
        >
          <Button loading={uploading}>{uploading ? 'Uploading…' : 'Choose file'}</Button>
        </Upload>
      ) : null}

      {progress !== null ? <Progress percent={progress} size="small" /> : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}

      {value.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {value.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2"
            >
              <span className="truncate text-slate-700">{file.originalName}</span>
              <span className="flex gap-2">
                {file.visibility === 'public' ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 hover:underline"
                  >
                    Preview
                  </a>
                ) : (
                  <button
                    type="button"
                    className="text-teal-700 hover:underline"
                    onClick={() => void downloadUpload(file.id, file.originalName)}
                  >
                    Download
                  </button>
                )}
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => onChange?.(value.filter((f) => f.id !== file.id))}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
