"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Maximize,
  Download,
  FileText
} from "lucide-react";
import PDFAnnotations from "./PDFAnnotations";
import type { Document, Annotation } from "@/types/pdf";

// Mock PDF content for demonstration
const mockPDFPages: Record<string, Record<number, string>> = {
  "doc_1": {
    1: `Chapter 5: Viruses and Bacteria

Introduction to Microorganisms

This chapter explores the fascinating world of microscopic organisms, 
focusing specifically on viruses and bacteria. These tiny life forms 
play crucial roles in our ecosystem and have significant impacts on 
human health and disease.

Learning Objectives:
• Understand what viruses are and how they function
• Learn about bacterial structure and reproduction
• Explore the differences between viruses and bacteria
• Examine their roles in disease and health`,

    5: `What is a Virus?

A virus is a microscopic infectious agent that can only replicate 
inside the living cells of an organism. Viruses are much smaller 
than bacteria and are not considered to be living organisms because 
they cannot reproduce independently.

Key Characteristics of Viruses:
• Composed of genetic material (DNA or RNA)
• Surrounded by a protein coat called a capsid
• Cannot reproduce without a host cell
• Cause various diseases in humans, animals, and plants

Virus Structure:
The basic structure of a virus consists of nucleic acid (genetic 
material) surrounded by a protein coat. Some viruses also have 
an additional outer envelope made of lipids.`,

    18: `Viral Replication Cycle

The viral replication cycle involves multiple stages through which 
a virus reproduces within a host cell:

1. Attachment: The virus binds to specific receptor sites on the 
   host cell surface.

2. Penetration: The virus or its genetic material enters the host cell.

3. Replication: The viral genetic material is replicated using the 
   host cell's machinery.

4. Assembly: New viral components are assembled into complete viruses.

5. Release: New viruses are released from the host cell, often 
   destroying the cell in the process.

This cycle allows viruses to spread from cell to cell and from 
organism to organism, leading to viral infections and diseases.`
  },
  "doc_2": {
    1: `Chapter 1: Introduction to Quantum Physics

Quantum mechanics is a fundamental theory in physics that describes 
the behavior of matter and energy at the atomic and subatomic level. 
It represents one of the most significant scientific discoveries of 
the 20th century.

Historical Development:
• Max Planck's quantum hypothesis (1900)
• Einstein's photoelectric effect (1905)
• Bohr's atomic model (1913)
• Heisenberg's uncertainty principle (1927)
• Schrödinger's wave equation (1926)`,

    23: `Wave-Particle Duality

Wave-particle duality is a fundamental concept in quantum mechanics 
that describes how quantum entities exhibit both wave-like and 
particle-like properties depending on the experimental setup.

Key Experiments:
• Double-slit experiment with electrons
• Photoelectric effect
• Compton scattering

The wave-particle duality principle shows that:
• Light can behave as both waves and particles (photons)
• Matter particles (like electrons) can exhibit wave properties
• The measurement process affects the observed behavior

This duality is central to understanding quantum mechanics and 
has profound implications for our understanding of reality at 
the quantum level.`
  }
};

interface PDFViewerProps {
  document: Document;
  currentPage: number;
  annotations: Annotation[];
  onPageChange: (page: number) => void;
}

export default function PDFViewer({
  document,
  currentPage,
  annotations,
  onPageChange
}: PDFViewerProps) {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < document.pageCount) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFitToWidth = () => {
    setScale(1.0);
  };

  const handleDownload = () => {
    // Mock download functionality
    const link = document.createElement('a');
    link.href = '#';
    link.download = document.filename;
    link.click();
  };

  // Get current page content
  const currentPageContent = mockPDFPages[document.id]?.[currentPage] || 
    `Page ${currentPage} content would be displayed here.\n\nThis is a mock PDF viewer showing the structure and layout of the actual PDF content.`;

  // Filter annotations for current page
  const currentPageAnnotations = annotations.filter(
    annotation => annotation.pageNumber === currentPage
  );

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* PDF Controls */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              Page {currentPage} of {document.pageCount}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= document.pageCount}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-600 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToWidth}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Additional Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-8 flex justify-center">
            <div 
              className="relative bg-white shadow-lg border border-gray-300"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center top',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {/* Mock PDF Page */}
              <div className="w-[600px] min-h-[800px] p-8 relative">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{document.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">Page {currentPage}</span>
                </div>

                {/* Page Content */}
                <div className="prose prose-sm max-w-none">
                  {currentPageContent.split('\n').map((line, index) => (
                    <p key={index} className="mb-2 leading-relaxed text-gray-800">
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>

                {/* Annotations Overlay */}
                <PDFAnnotations
                  annotations={currentPageAnnotations}
                  pageNumber={currentPage}
                  pdfDimensions={{ width: 600, height: 800 }}
                  scale={scale}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading page...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
