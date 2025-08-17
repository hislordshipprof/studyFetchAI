// Alternative PDF parsing approach to avoid ENOENT issues
let pdfParse: any;

async function getPdfParse() {
  if (!pdfParse) {
    try {
      // Try dynamic import first
      const pdfParseModule = await import('pdf-parse');
      pdfParse = pdfParseModule.default || pdfParseModule;
    } catch (importError) {
      console.warn('Dynamic import failed, trying require:', importError);
      try {
        // Fallback to require
        pdfParse = require('pdf-parse');
      } catch (requireError) {
        console.error('Both import methods failed:', requireError);
        throw new Error('Could not load pdf-parse library');
      }
    }
  }
  return pdfParse;
}

// Alternative: Use a simpler approach for page counting
function estimatePageCountFromPDF(buffer: Buffer): number {
  try {
    // Convert buffer to string to search for page markers
    const pdfString = buffer.toString('binary');
    
    // Look for common PDF page markers
    const pageMarkers = [
      '/Count ', // Most common page count marker
      '/Page ', // Page object markers
      'endobj', // Object markers (rough estimate)
    ];
    
    let pageCount = 0;
    
    // Try to find /Count marker first (most reliable)
    const countMatch = pdfString.match(/\/Count\s+(\d+)/);
    if (countMatch && countMatch[1]) {
      pageCount = parseInt(countMatch[1], 10);
      if (pageCount > 0 && pageCount < 10000) { // Sanity check
        return pageCount;
      }
    }
    
    // Fallback: Count page objects
    const pageMatches = pdfString.match(/\/Page(?:\s|\/)/g);
    if (pageMatches) {
      pageCount = pageMatches.length;
      if (pageCount > 0 && pageCount < 10000) { // Sanity check
        return pageCount;
      }
    }
    
    // Last resort: Estimate based on file size (very rough)
    const avgPageSize = 50000; // ~50KB per page estimate
    pageCount = Math.max(1, Math.ceil(buffer.length / avgPageSize));
    return Math.min(pageCount, 1000); // Cap at 1000 pages
    
  } catch (error) {
    console.warn('Error estimating page count:', error);
    return 1; // Default to 1 page
  }
}

/**
 * Extract metadata and text content from a PDF buffer
 */
export async function extractPDFMetadata(buffer: Buffer): Promise<{
  pageCount: number;
  textContent: string;
  title?: string;
  author?: string;
}> {
  try {
    // First try pdf-parse library for full metadata
    const pdfParseLib = await getPdfParse();
    const data = await pdfParseLib(buffer);
    
    return {
      pageCount: data.numpages,
      textContent: data.text,
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
    };
  } catch (error) {
    console.warn('pdf-parse failed for metadata extraction, using fallback:', error);
    
    // Fallback: Get page count manually, skip text extraction
    try {
      const pageCount = estimatePageCountFromPDF(buffer);
      console.log('Using fallback metadata extraction with page count:', pageCount);
      
      return {
        pageCount,
        textContent: '', // Empty text content as fallback
        title: undefined,
        author: undefined,
      };
    } catch (fallbackError) {
      console.error('Both PDF metadata extraction methods failed:', fallbackError);
      throw new Error(
        `Failed to extract PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Extract only the page count from a PDF buffer (faster than full extraction)
 */
export async function extractPDFPageCount(buffer: Buffer): Promise<number> {
  try {
    // First try pdf-parse library
    const pdfParseLib = await getPdfParse();
    const data = await pdfParseLib(buffer, {
      // Only extract page count, not text content for performance
      pagerender: () => Promise.resolve(''), // Skip text extraction
    });
    
    return data.numpages;
  } catch (error) {
    console.warn('pdf-parse failed, using fallback method:', error);
    
    // Fallback to manual PDF parsing
    try {
      const pageCount = estimatePageCountFromPDF(buffer);
      console.log('Fallback page count estimation:', pageCount);
      return pageCount;
    } catch (fallbackError) {
      console.error('Both PDF parsing methods failed:', fallbackError);
      return 1; // Default to 1 page
    }
  }
}

/**
 * Extract text content from specific pages of a PDF
 */
export async function extractPDFTextFromPages(
  buffer: Buffer, 
  startPage: number = 1, 
  endPage?: number
): Promise<string> {
  try {
    const pdfParseLib = await getPdfParse();
    const data = await pdfParseLib(buffer);
    
    // For now, return all text content
    // In the future, could implement page-specific extraction
    return data.text;
  } catch (error) {
    console.warn('pdf-parse failed for text extraction:', error);
    
    // Fallback: Return empty string if text extraction fails
    console.log('Text extraction failed, returning empty string');
    return '';
  }
}

/**
 * Check if a buffer contains a valid PDF
 */
export function isValidPDF(buffer: Buffer): boolean {
  // PDF files start with %PDF
  const pdfHeader = buffer.subarray(0, 4);
  return pdfHeader.toString() === '%PDF';
}

/**
 * Estimate reading time based on text content
 */
export function estimateReadingTime(textContent: string): number {
  // Average reading speed: 200 words per minute
  const wordsPerMinute = 200;
  const wordCount = textContent.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract document chunks for AI processing (future use)
 */
export function createDocumentChunks(
  textContent: string, 
  chunkSize: number = 1000
): Array<{ content: string; index: number }> {
  const chunks: Array<{ content: string; index: number }> = [];
  const words = textContent.split(/\s+/);
  
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push({
      content: chunk,
      index: Math.floor(i / chunkSize),
    });
  }
  
  return chunks;
}
