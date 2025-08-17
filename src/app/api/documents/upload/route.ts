import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadPDFToBlob, validatePDFFile, generateStorageFilename } from '@/lib/blob-storage';
import { extractPDFPageCount, extractPDFMetadata } from '@/lib/pdf-utils';
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

    // Extract PDF metadata (page count and optionally text content)
    let pageCount = 0;
    let textContent: string | null = null;
    
    try {
      console.log('Starting PDF metadata extraction...');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('Created buffer from file, size:', buffer.length);
      
      // Validate it's actually a PDF
      if (!buffer.subarray(0, 4).toString().startsWith('%PDF')) {
        console.warn('File does not appear to be a valid PDF, skipping metadata extraction');
        pageCount = 0;
      } else {
        try {
          // Extract page count (fast operation)
          console.log('Extracting page count...');
          pageCount = await extractPDFPageCount(buffer);
          console.log('Page count extracted:', pageCount);
          
          // For small files (< 1MB), also extract text content for future AI use
          if (file.size < 1024 * 1024) {
            try {
              console.log('Extracting text content for small file...');
              const metadata = await extractPDFMetadata(buffer);
              textContent = metadata.textContent;
              console.log('Text content extracted, length:', textContent?.length || 0);
            } catch (textError) {
              // Non-critical error, continue without text content
              console.warn('Failed to extract PDF text content:', textError);
            }
          } else {
            console.log('File too large for text extraction, skipping...');
          }
        } catch (pdfError) {
          console.warn('PDF parsing failed, using fallback:', pdfError);
          pageCount = 0;
        }
      }
    } catch (error) {
      // Non-critical error, continue with pageCount = 0
      console.warn('Failed to extract PDF metadata:', error);
      if (error instanceof Error) {
        console.warn('PDF metadata error details:', error.message);
        console.warn('Error stack:', error.stack);
      }
      pageCount = 0;
    }

    // Create document record in database
    console.log('Creating document record in database...');
    console.log('Document data:', {
      title: file.name.replace('.pdf', ''),
      filename: storageFilename,
      originalName: file.name,
      fileUrl: uploadResult.url,
      fileSize: uploadResult.size,
      mimeType: 'application/pdf',
      pageCount,
      textContentLength: textContent?.length || 0,
      userId: session.user.id,
    });
    
    const document = await prisma.document.create({
      data: {
        title: file.name.replace('.pdf', ''), // Remove .pdf extension for title
        filename: storageFilename,
        originalName: file.name,
        fileUrl: uploadResult.url,
        fileSize: uploadResult.size,
        mimeType: 'application/pdf',
        pageCount,
        textContent,
        uploadedAt: uploadResult.uploadedAt,
        userId: session.user.id,
      },
    });
    
    console.log('Document created successfully:', document.id);

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
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

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
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: error instanceof Error ? error.message : 'Failed to upload document',
          details: error instanceof Error ? error.stack : undefined
        } 
      },
      { status: 500 }
    );
  }
}
