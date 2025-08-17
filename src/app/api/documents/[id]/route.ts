import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deletePDFFromBlob } from '@/lib/blob-storage';

/**
 * Get a specific document
 * GET /api/documents/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // Fetch document with conversations and chunks
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id, // Ensure user owns the document
      },
      include: {
                conversations: {
          include: {
            messages: {
              orderBy: {
                timestamp: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        documentChunks: {
          orderBy: {
            pageNumber: 'asc',
          },
        },
        _count: {
          select: {
            conversations: true,
            documentChunks: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: document },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch document' } },
      { status: 500 }
    );
  }
}

/**
 * Update a document
 * PUT /api/documents/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;
    const body = await request.json();
    const { title, pageCount } = body;

    // Verify document ownership
    const existingDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        ...(title && { title }),
        ...(pageCount !== undefined && { pageCount }),
        lastAccessedAt: new Date(),
      },
    });

    return NextResponse.json(
      { data: updatedDocument },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update document' } },
      { status: 500 }
    );
  }
}

/**
 * Delete a document
 * DELETE /api/documents/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // Verify document ownership and get file URL
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    // Delete from database (cascading deletes will handle related records)
    await prisma.document.delete({
      where: {
        id: documentId,
      },
    });

    // Delete file from blob storage
    try {
      if (document.fileUrl) {
        await deletePDFFromBlob(document.fileUrl);
      }
    } catch (blobError) {
      // Log error but don't fail the request if blob deletion fails
      console.error('Error deleting file from blob storage:', blobError);
    }

    return NextResponse.json(
      { data: { message: 'Document deleted successfully' } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' } },
      { status: 500 }
    );
  }
}
