export interface StorageObject {
  key: string;
  size: number;
  contentType?: string;
  metadata?: Record<string, string>;
  lastModified?: Date;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
}

export interface DownloadOptions {
  stream?: boolean;
}

export interface IStorageAdapter {
  /**
   * Get adapter name
   */
  getName(): string;

  /**
   * Upload file or data
   */
  upload(key: string, data: Buffer | string, options?: UploadOptions): Promise<string>;

  /**
   * Download file or data
   */
  download(key: string, options?: DownloadOptions): Promise<Buffer | ReadableStream>;

  /**
   * Delete file
   */
  delete(key: string): Promise<void>;

  /**
   * Check if file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * List objects with prefix
   */
  list(prefix?: string, limit?: number): Promise<StorageObject[]>;

  /**
   * Get object metadata
   */
  getMetadata(key: string): Promise<StorageObject>;

  /**
   * Generate signed URL for temporary access
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}
