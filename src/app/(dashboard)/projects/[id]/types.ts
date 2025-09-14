// Shared types for project detail page components

export interface Asset {
  _id: string;
  projectId: string;
  type: 'pdf' | 'html' | 'docx' | 'md';
  title: string;
  hash: string;
  createdAt: string;
  chunkCount?: number;
}

export interface IngestResponse {
  assetId: string;
  chunkCount: number;
}

export interface GeneratedDraft {
  subject: string;
  html: string;
  preheader: string;
}

export interface GetResponseResult {
  newsletterId: string;
  openUrl: string;
}

export type ContentType = 'text' | 'url' | 'file';

// Chunk interfaces
export interface ChunkWithAsset {
  _id: string;
  projectId: string;
  assetId: string;
  chunkId: string;
  userId?: string;
  md_text: string;
  tokens: number;
  section?: string;
  meta?: {
    hpath: string[];
  };
  vector?: boolean;
  embedding?: number[];
  createdAt: string | Date;
  updatedAt?: string | Date;
  // Additional fields for display
  assetTitle?: string;
  assetType?: Asset['type'];
  isCustom?: boolean; // True for user-created chunks, false for asset-derived chunks
}

export interface CreateChunkRequest {
  title: string;
  content: string;
  section?: string;
}

export interface UpdateChunkRequest {
  title?: string;
  content?: string;
  section?: string;
}