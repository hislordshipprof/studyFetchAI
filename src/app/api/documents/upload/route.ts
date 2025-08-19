import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractDocumentsWithLlamaParse } from '@/lib/llama-parse';
import { uploadPDFToBlob, validatePDFFile, generateStorageFilename } from '@/lib/blob-storage';

/**
 * Upload a PDF document using LlamaParse 
 * POST /api/documents/upload
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!user) {
      console.error('User not found in database:', session.user.id);
      return NextResponse.json(
        { error: 'User not found. Please log out and log back in.' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate PDF file
    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Generate clean filename for storage
    const storageFilename = generateStorageFilename(file.name);

    console.log('Uploading PDF to Vercel Blob storage...');
    
    // Upload to Vercel Blob Storage first
    const uploadResult = await uploadPDFToBlob(file, storageFilename);
    
    console.log('Processing file with LlamaParse...');
    
    const { langchainDocs, documents } = await extractDocumentsWithLlamaParse(file);
    console.log(`Document processed successfully! Found ${langchainDocs.length} sections.`);
    
    // Split documents into chunks for vector storage
    const { CharacterTextSplitter } = await import("langchain/text_splitter");
    const textSplitter = new CharacterTextSplitter({
      chunkSize: 1000,    
      chunkOverlap: 200   
    });
    
    const textChunks = await textSplitter.splitDocuments(langchainDocs);
    console.log(`Created ${textChunks.length} text chunks for vector storage`);
    
    // Store in database with Blob storage URL and processed chunks
    console.log('Creating document record for user:', session.user.id);
    const documentRecord = await prisma.document.create({
      data: {
        title: file.name.replace('.pdf', ''),
        filename: storageFilename,
        originalName: file.name,
        fileUrl: uploadResult.url,           // Vercel Blob storage URL
        fileSize: uploadResult.size,
        mimeType: file.type,
        pageCount: documents.length,
        textContent: langchainDocs.map(doc => doc.pageContent).join('\n'),
        chunks: textChunks,                  // Text chunks ready for vector search
        vectorStore: null,                   // We'll recreate vector store when needed
        uploadedAt: uploadResult.uploadedAt,
        userId: user.id                      // Use verified user ID
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        id: documentRecord.id,
        title: documentRecord.title,
        filename: documentRecord.filename,
        originalName: documentRecord.originalName,
        fileUrl: documentRecord.fileUrl,
        fileSize: documentRecord.fileSize,
        pageCount: documentRecord.pageCount,
        uploadedAt: documentRecord.uploadedAt
      },
      message: `Document processed successfully! Found ${langchainDocs.length} sections.`
    }, { status: 201 }); // Return 201 Created as expected by frontend
    
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ 
      error: 'Upload failed - LlamaParse processing required', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}