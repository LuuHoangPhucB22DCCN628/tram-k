export type MediaKind = "image" | "audio";

export interface UploadedMediaFile {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly originalname: string;
  readonly size: number;
}

export interface StoredMedia {
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
}
