import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadPDFToBlob, validatePDFFile, generateStorageFilename } from '@/lib/blob-storage';
import { prisma } from '@/lib/db';

/**
 * Upload a PDF document
 * POST /api/documents/upload
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate PDF file
    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE', message: validation.error } },
        { status: 400 }
      );
    }

    // Generate clean filename
    const storageFilename = generateStorageFilename(file.name);

    // Upload to Vercel Blob Storage
    const uploadResult = await uploadPDFToBlob(file, storageFilename);

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        title: file.name.replace('.pdf', ''), // Remove .pdf extension for title
        filename: storageFilename,
        originalName: file.name,
        fileUrl: uploadResult.url,
        fileSize: uploadResult.size,
        mimeType: 'application/pdf',
        pageCount: 0, // TODO: Extract page count from PDF
        uploadedAt: uploadResult.uploadedAt,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: document.id,
          title: document.title,
          filename: document.filename,
          originalName: document.originalName,
          fileUrl: document.fileUrl,
          fileSize: document.fileSize,
          pageCount: document.pageCount,
          uploadedAt: document.uploadedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading document:', error);

    // Handle specific blob storage errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to upload PDF')) {
        return NextResponse.json(
          { error: { code: 'UPLOAD_FAILED', message: error.message } },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to upload document' } },
      { status: 500 }
    );
  }
}
