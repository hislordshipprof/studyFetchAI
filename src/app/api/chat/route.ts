import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { setupQASystemWithLlamaCloud } from '@/lib/vector-store';
import { Document } from '@langchain/core/documents';

/**
 * Chat with document 
 * POST /api/chat
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { message, documentId } = await request.json();

    if (!message || !documentId) {
      return NextResponse.json(
        { error: 'Message and document ID are required' },
        { status: 400 }
      );
    }

    // Load document and QA system
    const document = await prisma.document.findUnique({ 
      where: { id: documentId, userId: session.user.id } 
    }) as any;

    if (!document || !(document as any).chunks) {
      return NextResponse.json(
        { error: 'Document not found or not processed' },
        { status: 404 }
      );
    }

    // Convert stored JSON chunks back to Document objects
    const storedChunks = (document as any).chunks as any[];
    const documents = storedChunks.map(chunk => 
      new Document({
        pageContent: chunk.pageContent,
        metadata: chunk.metadata || {}
      })
    );

    // Recreate QA system from stored chunks
    const qaSystem = await setupQASystemWithLlamaCloud(documents);
    if (!qaSystem) {
      return NextResponse.json(
        { error: 'Failed to initialize QA system' },
        { status: 500 }
      );
    }

    console.log('Generating response with OpenAI...');

    
    const result = await qaSystem.invoke({ query: message });
    
     let answer: string;
    let sources: string;
    
    try {
      const parsedResult = JSON.parse(result.text);
      console.log('Parsed JSON result:', parsedResult);
      answer = parsedResult.answer;
      sources = parsedResult.sources;
    } catch (jsonError) {
      console.log('JSON parsing failed, using raw result');
      // Handle JSON parsing failure (exact same as lines 235-237)
      answer = result.text;
      sources = "";
    }
    
    console.log('Final answer:', answer);
    console.log('Final sources:', sources);
    
    // Use AI's processed sources (more relevant) but handle text format differences
    // This ensures we highlight only text that was actually used in the response
    const sourceArray = typeof sources === 'string' ? sources.split(". ") : [];
    
    console.log('Processed sources for highlighting:', sourceArray);
    
    const response = {
      answer,
      sources: sourceArray,
      sourceDocuments: result.sourceDocuments
    };
    
    console.log('Final API response:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ 
      error: 'Chat failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}