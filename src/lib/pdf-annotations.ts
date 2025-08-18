import type { Annotation } from "@/types/pdf";

/**
 * Client-side PDF annotation utilities
 * Uses server-side MuPDF.js API for actual text search and coordinate extraction
 * This approach matches chatapp.py server-side architecture
 */

/**
 * Generate highlight annotations by calling server-side MuPDF.js API
 * Exact replication of chatapp.py lines 128-142 via server-side implementation
 */
export async function generateHighlightAnnotations(documentId: string, excerpts: string[]): Promise<Annotation[]> {
  try {
    console.log('Calling server-side PDF search API for text highlighting...');
    
    const response = await fetch('/api/pdf/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        documentId, 
        excerpts 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`Server-side search generated ${result.annotations.length} annotations`);
    
    return result.annotations || [];
    
  } catch (error) {
    console.error('Error generating highlight annotations via API:', error);
    return [];
  }
}

/**
 * Locate pages containing specific excerpts via server-side API
 * Exact replication of lines 72-79 from chatapp.py via server-side implementation
 */
export async function locatePagesContainingExcerpts(documentId: string, excerpts: string[]): Promise<number[]> {
  try {
    const response = await fetch('/api/pdf/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        documentId, 
        excerpts 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.highlightedPages || [1];
    
  } catch (error) {
    console.error('Error locating pages with excerpts:', error);
    return [1];
  }
}