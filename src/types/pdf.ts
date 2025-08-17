export interface Document {
  id: string;
  title: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  textContent?: string;
  uploadedAt: Date | string;
  lastAccessedAt: Date | string;
  userId?: string; // Optional for frontend display
  
  // Additional fields from API responses
  conversationCount?: number;
  lastMessageAt?: Date | string | null;
  hasActiveConversation?: boolean;
}

// Upload response from API
export interface DocumentUploadResponse {
  data: {
    id: string;
    title: string;
    filename: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    pageCount: number;
    uploadedAt: Date | string;
  };
}

// Documents list response from API
export interface DocumentsListResponse {
  data: Document[];
}

export interface DocumentChunk {
  id: string;
  pageNumber: number;
  content: string;
  documentId: string;
}

export interface PDFViewerProps {
  documentId: string;
  currentPage: number;
  annotations: Annotation[];
  onPageChange: (page: number) => void;
}

// Forward declaration for Annotation type
export interface Annotation {
  id: string;
  type: 'HIGHLIGHT' | 'CIRCLE' | 'ARROW' | 'RECTANGLE' | 'NOTE' | 'UNDERLINE';
  pageNumber: number;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    points?: Array<{ x: number; y: number }>;
  };
  content?: string;
  color: string;
  opacity: number;
  createdAt: Date;
  documentId: string;
}
