import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Get user's documents
 * GET /api/documents
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Fetch documents with conversation counts
    const documents = await prisma.document.findMany({
      where,
      include: {
        conversations: {
          select: {
            id: true,
            updatedAt: true,
                      messages: {
            select: {
              id: true,
              timestamp: true,
            },
            orderBy: {
              timestamp: 'desc',
            },
            take: 1,
          },
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    // Transform data for frontend
    const transformedDocuments = documents.map((doc) => {
      const conversationCount = doc._count.conversations;
      const lastConversation = doc.conversations[0];
      const lastMessage = lastConversation?.messages[0];

      return {
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        originalName: doc.originalName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        pageCount: doc.pageCount,
        mimeType: doc.mimeType,
        uploadedAt: doc.uploadedAt,
        lastAccessedAt: doc.lastAccessedAt,
        conversationCount,
        lastMessageAt: lastMessage?.timestamp || null,
        hasActiveConversation: conversationCount > 0,
      };
    });

    return NextResponse.json(
      { data: transformedDocuments },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch documents' } },
      { status: 500 }
    );
  }
}

/**
 * Create a new document (metadata only)
 * POST /api/documents
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

    const body = await request.json();
    const { title, filename, originalName, fileUrl, fileSize, pageCount, mimeType } = body;

    // Validate required fields
    if (!title || !filename || !fileUrl) {
      return NextResponse.json(
        { error: { code: 'INVALID_DATA', message: 'Title, filename, and fileUrl are required' } },
        { status: 400 }
      );
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        title,
        filename,
        originalName: originalName || filename,
        fileUrl,
        fileSize: fileSize || 0,
        pageCount: pageCount || 0,
        mimeType: mimeType || 'application/pdf',
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { data: document },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create document' } },
      { status: 500 }
    );
  }
}
