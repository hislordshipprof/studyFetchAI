"use client";

import React from 'react';

interface CitableMessageProps {
  content: string;
  pageMappings?: Array<{excerpt: string, pages: number[]}>;
  onPageNavigation: (page: number) => void;
}

export default function CitableMessage({ 
  content, 
  pageMappings = [], 
  onPageNavigation 
}: CitableMessageProps) {
  
  // Parse content and make page references clickable
  const renderContentWithCitations = (text: string) => {
    // Regex to find page citations like "(page 5)" or "(pages 2, 5, 7)"
    const citationRegex = /\((pages?\s+[\d,\s]+)\)/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Extract page numbers from the citation
      const citationText = match[1]; // "page 5" or "pages 2, 5, 7"
      const pageNumbers = citationText
        .replace(/pages?/g, '')
        .split(',')
        .map(p => parseInt(p.trim()))
        .filter(p => !isNaN(p));
      
      // Create clickable citation
      if (pageNumbers.length === 1) {
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
            onClick={() => onPageNavigation(pageNumbers[0])}
          >
            ({citationText})
          </span>
        );
      } else {
        // Multiple pages - create separate clickable links
        parts.push(
          <span key={match.index} className="inline-flex items-center">
            (pages{' '}
            {pageNumbers.map((page, index) => (
              <React.Fragment key={page}>
                <span
                  className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={() => onPageNavigation(page)}
                >
                  {page}
                </span>
                {index < pageNumbers.length - 1 && ', '}
              </React.Fragment>
            ))}
            )
          </span>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last citation
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="text-sm leading-relaxed">
      {renderContentWithCitations(content)}
    </div>
  );
}