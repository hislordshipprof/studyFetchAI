"use client";

import { useState, useEffect } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface SplitScreenProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultSplit?: number;
  minSizes?: [number, number];
  className?: string;
}

export default function SplitScreen({
  leftPanel,
  rightPanel,
  defaultSplit = 60,
  minSizes = [30, 25],
  className
}: SplitScreenProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile layout - stacked with tabs
  if (isMobile) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Mobile Tab Navigation */}
        <div className="flex bg-white border-b border-gray-200">
          <button
            onClick={() => setActivePanel('left')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors",
              activePanel === 'left'
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            📄 PDF Document
          </button>
          <button
            onClick={() => setActivePanel('right')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors",
              activePanel === 'right'
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            💬 AI Chat
          </button>
        </div>

        {/* Mobile Panel Content */}
        <div className="flex-1 overflow-hidden">
          <div className={cn(
            "h-full transition-transform duration-300",
            activePanel === 'left' ? "translate-x-0" : "-translate-x-full hidden"
          )}>
            {leftPanel}
          </div>
          <div className={cn(
            "h-full transition-transform duration-300",
            activePanel === 'right' ? "translate-x-0" : "translate-x-full hidden"
          )}>
            {rightPanel}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - resizable panels
  return (
    <div className={cn("h-full", className)}>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
      >
        <ResizablePanel
          defaultSize={defaultSplit}
          minSize={minSizes[0]}
          className="bg-white"
        >
          <div className="h-full overflow-hidden">
            {leftPanel}
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />
        
        <ResizablePanel
          defaultSize={100 - defaultSplit}
          minSize={minSizes[1]}
          className="bg-white"
        >
          <div className="h-full overflow-hidden border-l border-gray-200">
            {rightPanel}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
