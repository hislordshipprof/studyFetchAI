import { z } from 'zod';

// Authentication validation schemas
export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Document validation schemas
export const DocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  filename: z.string().min(1, 'Filename is required'),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.literal('application/pdf', {
    errorMap: () => ({ message: 'Only PDF files are allowed' })
  }),
  pageCount: z.number().int().positive('Page count must be a positive integer'),
});

// Message validation schemas
export const MessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
  role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']),
  conversationId: z.string().cuid('Invalid conversation ID'),
  metadata: z.object({
    annotations: z.array(z.any()).optional(),
    navigateTo: z.number().int().positive().optional(),
  }).optional(),
});

// Conversation validation schemas
export const ConversationSchema = z.object({
  title: z.string().max(255, 'Title too long').optional(),
  documentId: z.string().cuid('Invalid document ID'),
});

// Annotation validation schemas
export const AnnotationSchema = z.object({
  type: z.enum(['HIGHLIGHT', 'CIRCLE', 'ARROW', 'RECTANGLE', 'NOTE', 'UNDERLINE']),
  pageNumber: z.number().int().positive('Page number must be positive'),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    radius: z.number().optional(),
    points: z.array(z.object({
      x: z.number(),
      y: z.number(),
    })).optional(),
  }),
  content: z.string().max(1000, 'Annotation content too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#ffff00'),
  opacity: z.number().min(0).max(1).default(0.3),
  documentId: z.string().cuid('Invalid document ID'),
});

// Type exports for use in components
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type DocumentInput = z.infer<typeof DocumentSchema>;
export type MessageInput = z.infer<typeof MessageSchema>;
export type ConversationInput = z.infer<typeof ConversationSchema>;
export type AnnotationInput = z.infer<typeof AnnotationSchema>;
