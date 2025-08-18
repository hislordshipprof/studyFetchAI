import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as fs from "node:fs";
import * as mupdf from "mupdf";

// Force Node.js runtime for MuPDF.js server-side usage
export const runtime = 'nodejs';

/**
 * PDF Text Search API using MuPDF.js server-side
 * Exact replication of chatapp.py lines 128-142 for text search and highlighting
 * POST /api/pdf/search
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

    const { documentId, excerpts } = await request.json();

    if (!documentId || !excerpts || !Array.isArray(excerpts)) {
      return NextResponse.json(
        { error: 'Document ID and excerpts array are required' },
        { status: 400 }
      );
    }

    // Load document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId, userId: session.user.id }
    });

    if (!document || !document.fileUrl) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('Loading PDF with MuPDF.js server-side...');
    console.log('Searching for excerpts:', excerpts);
    
    // Fetch PDF content from storage
    const response = await fetch(document.fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load PDF with MuPDF.js (equivalent to fitz.open in chatapp.py line 183)
    const doc = mupdf.Document.openDocument(uint8Array, "application/pdf");
    console.log(`Loaded PDF document with ${doc.countPages()} pages`);

    const annotations: any[] = [];
    const processedCoordinates = new Set<string>(); // Track processed coordinates to prevent overlaps

    // Break down AI sources into searchable segments with fuzzy matching support
    const searchableSegments: string[] = [];
    
    for (const excerpt of excerpts) {
      if (!excerpt || excerpt.trim() === '') continue;
      
      // Split by sentences for precise matching
      const sentences = excerpt
        .split(/[.!?]\s+/)
        .filter(s => s.trim().length > 15) // Longer segments for better relevance
        .map(s => s.trim());
      
      // Also try the full excerpt (in case it's a complete thought)
      if (excerpt.trim().length > 15) {
        searchableSegments.push(excerpt.trim());
      }
      
      // Add sentences
      searchableSegments.push(...sentences);
      
      // Add partial phrases (for fuzzy matching)
      for (const sentence of sentences) {
        const words = sentence.split(/\s+/);
        if (words.length > 8) {
          // Create overlapping phrases of 6-8 words for better matching
          for (let i = 0; i <= words.length - 6; i++) {
            const phrase = words.slice(i, i + 6).join(' ');
            if (phrase.length > 20) {
              searchableSegments.push(phrase);
            }
          }
        }
      }
    }
    
    // Remove duplicates and sort by length (longer first for better matching)
    const uniqueSegments = [...new Set(searchableSegments)].sort((a, b) => b.length - a.length);
    console.log(`Created ${uniqueSegments.length} searchable segments from ${excerpts.length} excerpts`);
    
    // Exact replication of chatapp.py lines 128-142
    // Search through ALL pages for ALL segments (text-based search only)
    for (let pageNum = 0; pageNum < doc.countPages(); pageNum++) {
      const page = doc.loadPage(pageNum);
      
      for (const segment of uniqueSegments) {
        if (!segment || segment.trim() === '') continue;
        
        try {
          console.log(`Searching page ${pageNum + 1} for: "${segment.substring(0, 50)}..."`);
          
          // MuPDF.js search method - equivalent to page.search_for(excerpt) in PyMuPDF
          const searchResults = page.search(segment);
          
          if (searchResults && searchResults.length > 0) {
            console.log(`Found ${searchResults.length} matches on page ${pageNum + 1}`);
          }
          
          // Process each search result (equivalent to "for inst in page.search_for(excerpt)")
          for (const quadPoints of searchResults) {
            // Convert MuPDF.js QuadPoints to annotation format
            // QuadPoints format: [ulx, uly, urx, ury, llx, lly, lrx, lry]
            // Convert to rectangle: x0, y0, x1, y1 (like PyMuPDF inst)
            
            for (const quad of quadPoints) {
              const [ulx, uly, urx, ury, llx, lly, lrx, lry] = quad;
              
              // Calculate bounding rectangle (equivalent to PyMuPDF inst.x0, y0, x1, y1)
              const x0 = Math.min(ulx, llx); // leftmost x
              const y0 = Math.min(uly, ury); // topmost y  
              const x1 = Math.max(urx, lrx); // rightmost x
              const y1 = Math.max(lly, lry); // bottommost y
              
              // Prevent multiple overlapping highlights on same coordinates (fix opacity stacking)
              const coordKey = `${pageNum + 1}-${Math.round(x0)}-${Math.round(y0)}-${Math.round(x1 - x0)}-${Math.round(y1 - y0)}`;
              if (processedCoordinates.has(coordKey)) {
                console.log(`Skipping duplicate annotation at (${x0}, ${y0}) on page ${pageNum + 1}`);
                continue; // Skip this annotation to prevent opacity stacking
              }
              processedCoordinates.add(coordKey);
              
              // Exact same annotation structure as chatapp.py lines 134-141
              annotations.push({
                id: `ann_${Date.now()}_${pageNum}_${annotations.length}`,
                type: "HIGHLIGHT",
                pageNumber: pageNum + 1,              // Exact same as line 135: "page": page_num + 1 (1-based)
                coordinates: {
                  x: x0,                              // Exact same as line 136: "x": inst.x0
                  y: y0,                              // Exact same as line 137: "y": inst.y0  
                  width: x1 - x0,                     // Exact same as line 138: "width": inst.x1 - inst.x0
                  height: y1 - y0                     // Exact same as line 139: "height": inst.y1 - inst.y0
                },
                color: "red",                         // Exact same as line 140: "color": "red"
                opacity: 0.15,                        // Light uniform opacity for better readability
                createdAt: new Date().toISOString(),
                documentId: documentId,
                excerpt: segment
              });
              
              console.log(`Added annotation for "${segment.substring(0, 30)}..." on page ${pageNum + 1} at (${x0}, ${y0})`);
            }
          }
        } catch (searchError) {
          console.warn(`Error searching for segment "${segment.substring(0, 30)}..." on page ${pageNum + 1}:`, searchError);
        }
      }
    }

    // Clean up
    doc.destroy();

    console.log(`Generated ${annotations.length} annotations from ${uniqueSegments.length} searchable segments`);

    // Find pages with highlights (for navigation) - 1-based page numbers
    const highlightedPages = [...new Set(annotations.map(ann => ann.pageNumber))].sort((a, b) => a - b);

    return NextResponse.json({
      success: true,
      annotations,
      highlightedPages,
      totalMatches: annotations.length
    });

  } catch (error) {
    console.error('PDF search error:', error);
    return NextResponse.json({ 
      error: 'PDF search failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}