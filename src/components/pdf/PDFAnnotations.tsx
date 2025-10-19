"use client";

import { useEffect, useRef } from "react";
import type { Annotation } from "@/types/pdf";

interface PDFAnnotationsProps {
  annotations: Annotation[];
  pageNumber: number;
  pdfDimensions: { width: number; height: number };
  scale: number;
  onAnnotationClick?: (annotation: Annotation) => void;
}

export default function PDFAnnotations({
  annotations,
  pageNumber,
  pdfDimensions,
  scale,
  onAnnotationClick
}: PDFAnnotationsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match PDF dimensions
    canvas.width = pdfDimensions.width;
    canvas.height = pdfDimensions.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw annotations for current page
    const pageAnnotations = annotations.filter(
      annotation => annotation.pageNumber === pageNumber
    );

    pageAnnotations.forEach((annotation, index) => {
      drawAnnotation(ctx, annotation, index);
    });
  }, [annotations, pageNumber, pdfDimensions]);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation, index: number) => {
    const { coordinates, type, color, opacity } = annotation;

    // Save the context before making changes
    ctx.save();

    // Apply uniform light opacity for all highlights (15% for better readability)
    ctx.globalAlpha = 0.15; // Uniform light opacity for all highlights

    switch (type) {
      case 'HIGHLIGHT':
        drawHighlight(ctx, coordinates, color);
        break;
      case 'CIRCLE':
        drawCircle(ctx, coordinates, color);
        break;
      case 'ARROW':
        drawArrow(ctx, coordinates, color);
        break;
      case 'RECTANGLE':
        drawRectangle(ctx, coordinates, color);
        break;
      case 'UNDERLINE':
        drawUnderline(ctx, coordinates, color);
        break;
      default:
        break;
    }

    // Restore the context
    ctx.restore();

    // Add a subtle animation for new annotations
    if (index === annotations.length - 1) {
      animateAnnotation(ctx, annotation);
    }
  };

  const drawHighlight = (ctx: CanvasRenderingContext2D, coordinates: any, color: string) => {
    // Uniform light highlighting for better text readability
    // Use solid red color - opacity is controlled by ctx.globalAlpha above
    ctx.fillStyle = '#ff0000'; // Pure red, opacity controlled globally
    
    ctx.fillRect(
      coordinates.x,
      coordinates.y,
      coordinates.width || 200,
      coordinates.height || 20
    );
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, coordinates: any, color: string) => {
    // Use solid colors - opacity is controlled by ctx.globalAlpha above
    ctx.strokeStyle = '#ff0000'; // Pure red, opacity controlled globally
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      coordinates.x,
      coordinates.y,
      coordinates.radius || 30,
      0,
      2 * Math.PI
    );
    ctx.stroke();
    
    // Add a subtle fill with same global opacity
    ctx.fillStyle = '#ff0000'; // Pure red, opacity controlled globally
    ctx.fill();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, coordinates: any, color: string) => {
    const { x, y, width = 50, height = 20 } = coordinates;
    
    // Use solid colors - opacity is controlled by ctx.globalAlpha above
    ctx.strokeStyle = '#ff0000'; // Pure red, opacity controlled globally
    ctx.fillStyle = '#ff0000'; // Pure red, opacity controlled globally
    ctx.lineWidth = 2;
    
    // Arrow body
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - 10, y);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(x + width - 10, y - 5);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width - 10, y + 5);
    ctx.closePath();
    ctx.fill();
  };

  const drawRectangle = (ctx: CanvasRenderingContext2D, coordinates: any, color: string) => {
    // Use solid colors - opacity is controlled by ctx.globalAlpha above
    ctx.strokeStyle = '#ff0000'; // Pure red, opacity controlled globally
    ctx.lineWidth = 2;
    ctx.strokeRect(
      coordinates.x,
      coordinates.y,
      coordinates.width || 100,
      coordinates.height || 50
    );
  };

  const drawUnderline = (ctx: CanvasRenderingContext2D, coordinates: any, color: string) => {
    // Use solid colors - opacity is controlled by ctx.globalAlpha above
    ctx.strokeStyle = '#ff0000'; // Pure red, opacity controlled globally
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(coordinates.x, coordinates.y);
    ctx.lineTo(coordinates.x + (coordinates.width || 200), coordinates.y);
    ctx.stroke();
  };

  // Simplified animation that doesn't interfere with uniform opacity
  const animateAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    // Skip animation to prevent opacity conflicts - annotations appear immediately with uniform opacity
    // This ensures consistent 15% opacity for all highlights without animation interference
    return;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onAnnotationClick) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    // Find clicked annotation
    const clickedAnnotation = annotations.find(annotation => {
      if (annotation.pageNumber !== pageNumber) return false;
      
      const coords = annotation.coordinates;
      
      switch (annotation.type) {
        case 'HIGHLIGHT':
        case 'RECTANGLE':
          return x >= coords.x && 
                 x <= coords.x + (coords.width || 100) &&
                 y >= coords.y && 
                 y <= coords.y + (coords.height || 20);
        
        case 'CIRCLE':
          const distance = Math.sqrt(
            Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2)
          );
          return distance <= (coords.radius || 30);
        
        case 'ARROW':
        case 'UNDERLINE':
          return x >= coords.x && 
                 x <= coords.x + (coords.width || 50) &&
                 Math.abs(y - coords.y) <= 10;
        
        default:
          return false;
      }
    });

    if (clickedAnnotation) {
      onAnnotationClick(clickedAnnotation);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto cursor-pointer"
      onClick={handleCanvasClick}
      style={{
        width: '100%',
        height: '100%'
      }}
    />
  );
}
