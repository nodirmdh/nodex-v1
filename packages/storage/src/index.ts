export interface SignedUploadRequest {
  key: string;
  contentType: string;
  sizeBytes: number;
}

export interface ObjectStorage {
  createSignedUpload(input: SignedUploadRequest): Promise<{ url: string; key: string }>;
  createSignedDownload(key: string): Promise<{ url: string }>;
}

export interface FileScanner {
  scan(key: string): Promise<"APPROVED" | "REJECTED" | "QUARANTINED">;
}

export class NoopFileScanner implements FileScanner {
  async scan(_key: string) {
    return "APPROVED" as const;
  }
}
