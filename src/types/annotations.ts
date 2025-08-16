export type AnnotationType = 
  | 'HIGHLIGHT' 
  | 'CIRCLE' 
  | 'ARROW' 
  | 'RECTANGLE' 
  | 'NOTE' 
  | 'UNDERLINE';

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: Array<{ x: number; y: number }>;
  };
  content?: string;
  color: string;
  opacity: number;
  createdAt: Date;
  documentId: string;
}

export interface AnnotationInstruction {
  type: 'highlight' | 'circle' | 'arrow';
  page: number;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  text?: string;
}
