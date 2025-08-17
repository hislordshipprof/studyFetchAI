"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf';
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
  FileText,
  AlertCircle,
  Loader2
} from "lucide-react";
import PDFAnnotations from "./PDFAnnotations";
import type { Document, Annotation } from "@/types/pdf";

// Configure PDF.js worker for react-pdf
if (typeof window !== 'undefined') {
  // Try CDN first, fallback to local worker
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.min.mjs`;
  } catch {
    // Fallback to local worker if CDN fails
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
}

// Types for react-pdf
interface PDFPageDimensions {
  width: number;
  height: number;
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageDimensions, setPageDimensions] = useState<PDFPageDimensions>({ width: 600, height: 800 });

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
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
    if (document.fileUrl) {
      const link = document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.originalName || document.filename;
      link.target = '_blank';
      link.click();
    }
  };

  // Handle PDF document load success
  const onDocumentLoadSuccess = useCallback(({ numPages: totalPages }: { numPages: number }) => {
    console.log('PDF loaded successfully with', totalPages, 'pages');
    setNumPages(totalPages);
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle PDF document load error
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError(`Failed to load PDF: ${error.message}`);
    setIsLoading(false);
  }, []);

  // Handle page load success
  const onPageLoadSuccess = useCallback((page: any) => {
    const viewport = page.getViewport({ scale: 1.0 });
    setPageDimensions({
      width: viewport.width,
      height: viewport.height
    });
  }, []);

  // Filter annotations for current page
  const currentPageAnnotations = annotations.filter(
    annotation => annotation.pageNumber === currentPage
  );

  // PDF loading options with correct version - memoized to prevent unnecessary reloads
  const pdfOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@5.3.93/cmaps/',
    cMapPacked: true,
  }), []);

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
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {numPages || document.pageCount || '?'}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= (numPages || document.pageCount || 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-600 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleFitToWidth}>
              <Maximize className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-8 flex justify-center">
            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load PDF</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !error && (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            )}

            {/* PDF Document */}
            {!error && document.fileUrl && (
              <div 
                className="relative"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center top',
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <PDFDocument
                  file={document.fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  }
                  options={pdfOptions}
                >
                  <div className="relative bg-white shadow-lg border border-gray-300">
                    <Page
                      pageNumber={currentPage}
                      onLoadSuccess={onPageLoadSuccess}
                      loading={
                        <div className="flex items-center justify-center h-96 w-96">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center h-96 w-96 bg-gray-50">
                          <div className="text-center">
                            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                            <p className="text-gray-600">Failed to load page</p>
                          </div>
                        </div>
                      }
                    />
                    
                    {/* Annotations Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <PDFAnnotations
                        annotations={currentPageAnnotations}
                        pageNumber={currentPage}
                        pdfDimensions={pageDimensions}
                        scale={1.0} // Pass 1.0 since scaling is handled by parent
                      />
                    </div>
                  </div>
                </PDFDocument>
              </div>
            )}

            {/* No PDF URL */}
            {!document.fileUrl && !isLoading && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No PDF Available</h3>
                <p className="text-gray-600">This document doesn't have a valid PDF file.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}