import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as fs from "node:fs";
import * as mupdf from "mupdf";
import Fuse from 'fuse.js';

// Force Node.js runtime for MuPDF.js server-side usage
export const runtime = 'nodejs';

/**
 * PDF Text Search API using MuPDF.js server-side
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

    // console.log('Loading PDF with MuPDF.js server-side...');
    // console.log('Using fuzzy search for excerpts:', excerpts);
    
    // Fetch PDF content from storage
    const response = await fetch(document.fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load PDF with MuPDF.js (
    const doc = mupdf.Document.openDocument(uint8Array, "application/pdf");
    console.log(`Loaded PDF document with ${doc.countPages()} pages`);

    const annotations: any[] = [];
    const processedCoordinates = new Set<string>(); // Track processed coordinates to prevent overlaps

    console.log('Using enhanced exact search to find all sources...');
    

    
    // Enhanced exact search method - try multiple search strategies
    for (let pageNum = 0; pageNum < doc.countPages(); pageNum++) {
      const page = doc.loadPage(pageNum);
      console.log(`Searching page ${pageNum + 1} with enhanced strategies...`);
      
      for (const excerpt of excerpts) {
        if (!excerpt || excerpt.trim().length < 10) continue;
        
        // Strategy 1: Try full excerpt first
        try {
          const searchResults = page.search(excerpt.trim());
          if (searchResults && searchResults.length > 0) {
            console.log(`  Full excerpt found ${searchResults.length} matches on page ${pageNum + 1}`);
            
            for (const quadPoints of searchResults) {
              for (const quad of quadPoints) {
                const [ulx, uly, urx, ury, llx, lly, lrx, lry] = quad;
                
                const coordKey = `${pageNum + 1}-${Math.round(ulx)}-${Math.round(uly)}`;
                if (!processedCoordinates.has(coordKey)) {
                  processedCoordinates.add(coordKey);
                  
                  annotations.push({
                    id: `ann_${Date.now()}_${pageNum}_${annotations.length}`,
                    type: "HIGHLIGHT",
                    pageNumber: pageNum + 1,
                    coordinates: {
                      x: Math.min(ulx, llx),
                      y: Math.min(uly, ury),
                      width: Math.max(urx, lrx) - Math.min(ulx, llx),
                      height: Math.max(lly, lry) - Math.min(uly, ury)
                    },
                    color: "red",
                    opacity: 0.15,
                    createdAt: new Date().toISOString(),
                    documentId: documentId,
                    excerpt: excerpt,
                    strategy: "full_excerpt"
                  });
                }
              }
            }
          }
        } catch (searchError) {
          console.warn(`  Error searching full excerpt on page ${pageNum + 1}:`, searchError);
        }
        
        // Strategy 2: Break into sentences and search each
        const sentences = excerpt.split(/[.!?]\s+/).filter(s => s.trim().length > 15);
        for (const sentence of sentences) {
          try {
            const searchResults = page.search(sentence.trim());
            if (searchResults && searchResults.length > 0) {
              console.log(`  Sentence found ${searchResults.length} matches on page ${pageNum + 1}: "${sentence.substring(0, 30)}..."`);
              
              for (const quadPoints of searchResults) {
                for (const quad of quadPoints) {
                  const [ulx, uly, urx, ury, llx, lly, lrx, lry] = quad;
                  
                  // Better overlap detection - 
                  const x = Math.min(ulx, llx);
                  const y = Math.min(uly, ury);
                  const width = Math.max(urx, lrx) - Math.min(ulx, llx);
                  const height = Math.max(lly, lry) - Math.min(uly, ury);
                  
                  // Check for overlaps with existing annotations on same page
                  const overlaps = annotations.some(existing => {
                    if (existing.pageNumber !== pageNum + 1) return false;
                    
                    const ex = existing.coordinates.x;
                    const ey = existing.coordinates.y;
                    const ew = existing.coordinates.width;
                    const eh = existing.coordinates.height;
                    
                    // Check if rectangles overlap (with 10px tolerance)
                    return !(x > ex + ew + 10 || 
                            ex > x + width + 10 || 
                            y > ey + eh + 10 || 
                            ey > y + height + 10);
                  });
                  
                  if (!overlaps) {
                    annotations.push({
                      id: `ann_${Date.now()}_${pageNum}_${annotations.length}`,
                      type: "HIGHLIGHT",
                      pageNumber: pageNum + 1,
                      coordinates: { x, y, width, height },
                      color: "red",
                      opacity: 0.15,
                      createdAt: new Date().toISOString(),
                      documentId: documentId,
                      excerpt: sentence,
                      strategy: "sentence"
                    });
                  } else {
                    console.log(`    Skipped overlapping sentence on page ${pageNum + 1}`);
                  }
                }
              }
            }
          } catch (searchError) {
            console.warn(`  Error searching sentence on page ${pageNum + 1}:`, searchError);
          }
        }
        
        // Strategy 3: Search for key phrases (6-12 words)
        const words = excerpt.split(/\s+/);
        for (let i = 0; i <= words.length - 6; i++) {
          const phrase = words.slice(i, i + Math.min(12, words.length - i)).join(' ');
          if (phrase.length > 20) {
            try {
              const searchResults = page.search(phrase);
              if (searchResults && searchResults.length > 0) {
                console.log(`  Phrase found ${searchResults.length} matches on page ${pageNum + 1}: "${phrase.substring(0, 30)}..."`);
                
                for (const quadPoints of searchResults) {
                  for (const quad of quadPoints) {
                    const [ulx, uly, urx, ury, llx, lly, lrx, lry] = quad;
                    
                    // Better overlap detection for phrases
                    const x = Math.min(ulx, llx);
                    const y = Math.min(uly, ury);
                    const width = Math.max(urx, lrx) - Math.min(ulx, llx);
                    const height = Math.max(lly, lry) - Math.min(uly, ury);
                    
                    const overlaps = annotations.some(existing => {
                      if (existing.pageNumber !== pageNum + 1) return false;
                      const ex = existing.coordinates.x;
                      const ey = existing.coordinates.y;
                      const ew = existing.coordinates.width;
                      const eh = existing.coordinates.height;
                      return !(x > ex + ew + 10 || ex > x + width + 10 || y > ey + eh + 10 || ey > y + height + 10);
                    });
                    
                    if (!overlaps) {
                      annotations.push({
                        id: `ann_${Date.now()}_${pageNum}_${annotations.length}`,
                        type: "HIGHLIGHT",
                        pageNumber: pageNum + 1,
                        coordinates: { x, y, width, height },
                        color: "red",
                        opacity: 0.15,
                        createdAt: new Date().toISOString(),
                        documentId: documentId,
                        excerpt: phrase,
                        strategy: "phrase"
                      });
                    }
                  }
                }
              }
            } catch (searchError) {
              // Silent fail for phrase searches to reduce noise
            }
          }
        }
      }
    }
    

    // Clean up
    doc.destroy();

    console.log(`\nGenerated ${annotations.length} non-overlapping annotations using enhanced exact search strategies`);

    // Find pages with highlights (for navigation) - 1-based page numbers
    const highlightedPages = [...new Set(annotations.map(ann => ann.pageNumber))].sort((a, b) => a - b);
    
    // Create source-to-page mapping for interactive citations
    const sourcePageMapping = new Map<string, number[]>();
    annotations.forEach(annotation => {
      const excerpt = annotation.excerpt;
      if (!sourcePageMapping.has(excerpt)) {
        sourcePageMapping.set(excerpt, []);
      }
      if (!sourcePageMapping.get(excerpt)!.includes(annotation.pageNumber)) {
        sourcePageMapping.get(excerpt)!.push(annotation.pageNumber);
      }
    });
    
    // Convert to array format for JSON response
    const pageMappings = Array.from(sourcePageMapping.entries()).map(([excerpt, pages]) => ({
      excerpt,
      pages: pages.sort((a, b) => a - b)
    }));

    return NextResponse.json({
      success: true,
      annotations,
      highlightedPages,
      totalMatches: annotations.length,
      pageMappings // New: source text to page number mappings
    });

  } catch (error) {
    console.error('PDF search error:', error);
    return NextResponse.json({ 
      error: 'PDF search failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}