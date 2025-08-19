import type { Annotation } from "@/types/pdf";

export async function generateHighlightAnnotations(documentId: string, excerpts: string[]): Promise<{annotations: Annotation[], pageMappings: Array<{excerpt: string, pages: number[]}>}> {
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
    console.log(`Server-side search generated ${result.annotations.length} annotations with page mappings`);
    
    return {
      annotations: result.annotations || [],
      pageMappings: result.pageMappings || []
    };
    
  } catch (error) {
    console.error('Error generating highlight annotations via API:', error);
    return {
      annotations: [],
      pageMappings: []
    };
  }
}

/**
 * Inject clickable page citations into AI response text
 * Transforms generic response into interactive text with page references
 */
export function injectPageCitations(
  aiResponse: string, 
  sources: string[], 
  pageMappings: Array<{excerpt: string, pages: number[]}>
): string {
  let modifiedResponse = aiResponse;
  
  console.log('Injecting page citations:', {
    sources: sources.length,
    pageMappings: pageMappings.length,
    mappingDetails: pageMappings.map(m => ({ excerpt: m.excerpt.substring(0, 60), pages: m.pages }))
  });
  
  // Create a map from source content to pages using improved matching
  const sourceToPages = new Map<string, number[]>();
  
  // Match sources to page mappings using multiple strategies
  sources.forEach((source, sourceIndex) => {
    console.log(`\nMatching source ${sourceIndex + 1}: "${source.substring(0, 60)}..."`);
    
    // Strategy 1: Find exact excerpt matches (should be direct from server)
    const exactMatch = pageMappings.find(mapping => 
      mapping.excerpt === source || source === mapping.excerpt
    );
    
    if (exactMatch) {
      console.log(`  ✓ Exact match found: pages ${exactMatch.pages.join(', ')}`);
      sourceToPages.set(source, exactMatch.pages);
      return;
    }
    
    // Strategy 2: Fuzzy matching with improved algorithm
    const fuzzyMatch = pageMappings.find(mapping => {
      const sourceWords = source.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const excerptWords = mapping.excerpt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      // Count word matches (more lenient)
      const matches = sourceWords.filter(word => 
        excerptWords.some(ew => ew.includes(word) || word.includes(ew) || 
                             ew.startsWith(word.substring(0, 4)) || 
                             word.startsWith(ew.substring(0, 4)))
      ).length;
      
      // Lower threshold for better matching
      const threshold = Math.min(sourceWords.length, excerptWords.length) * 0.2;
      const isMatch = matches >= Math.max(2, threshold);
      
      if (isMatch) {
        console.log(`  ✓ Fuzzy match found: ${matches} word matches, pages ${mapping.pages.join(', ')}`);
      }
      
      return isMatch;
    });
    
    if (fuzzyMatch) {
      sourceToPages.set(source, fuzzyMatch.pages);
      return;
    }
    
    // Strategy 3: Fallback - use source index to match with pageMappings
    if (sourceIndex < pageMappings.length) {
      console.log(`  ✓ Fallback match: using mapping ${sourceIndex}, pages ${pageMappings[sourceIndex].pages.join(', ')}`);
      sourceToPages.set(source, pageMappings[sourceIndex].pages);
      return;
    }
    
    console.log(`  ✗ No match found for source ${sourceIndex + 1}`);
  });
  
  console.log(`\nFound ${sourceToPages.size} source-to-page mappings:`);
  sourceToPages.forEach((pages, source) => {
    console.log(`  "${source.substring(0, 40)}..." → pages ${pages.join(', ')}`);
  });
  
  // Inject page citations using improved text matching
  sourceToPages.forEach((pages, source) => {
    // Extract multiple key phrases for better matching
    const keyPhrases = [
      source.substring(0, 30).trim(),
      source.split('.')[0].trim(),
      source.split(',')[0].trim()
    ].filter(phrase => phrase.length > 10);
    
    // Try to match each phrase
    keyPhrases.forEach(phrase => {
      const words = phrase.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
      
      words.forEach(word => {
        // Look for this word in a sentence context
        const regex = new RegExp(`([^.!?]*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!?]*?)([.!?])`, 'gi');
        modifiedResponse = modifiedResponse.replace(regex, (match, beforePunct, punct) => {
          // Only add citation if not already present
          if (!beforePunct.includes('(page')) {
            const pageList = pages.length === 1 ? `page ${pages[0]}` : `pages ${pages.join(', ')}`;
            console.log(`  ✓ Injected citation: "${beforePunct.trim()}" → (${pageList})`);
            return `${beforePunct} (${pageList})${punct}`;
          }
          return match;
        });
      });
    });
  });
  
  console.log('\nFinal response with citations:', modifiedResponse.substring(0, 200) + '...');
  return modifiedResponse;
}


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