import { put, del, head } from '@vercel/blob';

/**
 * Upload a PDF file to Vercel Blob Storage
 */
export async function uploadPDFToBlob(
  file: File,
  filename: string
): Promise<{
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}> {
  try {
    // Validate file is PDF
    if (file.type !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFilename = `documents/${timestamp}-${filename}`;

    // Upload to Vercel Blob Storage
    const blob = await put(uniqueFilename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error('Error uploading PDF to blob storage:', error);
    throw new Error(
      `Failed to upload PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a PDF file from Vercel Blob Storage
 */
export async function deletePDFFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Error deleting PDF from blob storage:', error);
    throw new Error(
      `Failed to delete PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get metadata about a file in Vercel Blob Storage
 */
export async function getBlobMetadata(url: string): Promise<{
  size: number;
  uploadedAt: Date;
  contentType: string;
}> {
  try {
    const metadata = await head(url);
    
    return {
      size: metadata.size,
      uploadedAt: metadata.uploadedAt,
      contentType: metadata.contentType || 'application/pdf',
    };
  } catch (error) {
    console.error('Error getting blob metadata:', error);
    throw new Error(
      `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate PDF file before upload
 */
export function validatePDFFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  // Check file type
  if (file.type !== 'application/pdf') {
    return {
      isValid: false,
      error: 'Only PDF files are allowed',
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 10MB',
    };
  }

  // Check file name
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      isValid: false,
      error: 'File must have a .pdf extension',
    };
  }

  return { isValid: true };
}

/**
 * Generate a clean filename for storage
 */
export function generateStorageFilename(originalFilename: string): string {
  // Remove special characters and spaces
  const cleanName = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  // Ensure .pdf extension
  if (!cleanName.toLowerCase().endsWith('.pdf')) {
    return `${cleanName}.pdf`;
  }

  return cleanName;
}
