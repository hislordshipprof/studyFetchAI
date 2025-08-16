"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";

interface FileUploadProps {
  onUploadComplete?: (document: any) => void;
  onUploadStart?: () => void;
  className?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export default function FileUpload({ onUploadComplete, onUploadStart, className }: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      setUploadState(prev => ({ ...prev, error: "Please upload a PDF file only" }));
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadState(prev => ({ ...prev, error: "File size must be less than 10MB" }));
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      success: false,
    });

    onUploadStart?.();

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadState(prev => {
          if (prev.progress >= 90) {
            clearInterval(interval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 10 };
        });
      }, 200);

      // TODO: Replace with actual upload logic
      const formData = new FormData();
      formData.append("file", file);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful response
      const mockDocument = {
        id: `doc_${Date.now()}`,
        title: file.name.replace(".pdf", ""),
        filename: file.name,
        originalName: file.name,
        pageCount: Math.floor(Math.random() * 50) + 10,
        fileSize: file.size,
        uploadedAt: new Date(),
        lastAccessedAt: new Date(),
        conversationCount: 0,
        hasActiveConversation: false,
        lastViewedPage: null,
        lastMessageAt: null,
      };

      clearInterval(interval);
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        success: true,
      });

      onUploadComplete?.(mockDocument);

      // Reset after success
      setTimeout(() => {
        setUploadState({
          isUploading: false,
          progress: 0,
          error: null,
          success: false,
        });
      }, 2000);

    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: "Upload failed. Please try again.",
        success: false,
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: uploadState.isUploading,
  });

  const clearError = () => {
    setUploadState(prev => ({ ...prev, error: null }));
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${uploadState.isUploading ? "pointer-events-none opacity-75" : ""}
          `}
        >
          <input {...getInputProps()} />
          
          {uploadState.isUploading ? (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 text-blue-500">
                <Upload className="h-12 w-12 animate-bounce" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Uploading PDF...</p>
                <Progress value={uploadState.progress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-gray-500">{uploadState.progress}% complete</p>
              </div>
            </div>
          ) : uploadState.success ? (
            <div className="space-y-2">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-700">Upload successful!</p>
              <p className="text-xs text-gray-500">Your PDF is ready for AI tutoring</p>
            </div>
          ) : uploadState.error ? (
            <div className="space-y-4">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">Upload Error</p>
                <p className="text-xs text-red-600">{uploadState.error}</p>
                <Button onClick={clearError} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {isDragActive ? (
                    <span className="font-semibold text-blue-600">Drop your PDF here</span>
                  ) : (
                    <>
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500">PDF files only (up to 10MB)</p>
              </div>
              <Button type="button" disabled={uploadState.isUploading}>
                <FileText className="mr-2 h-4 w-4" />
                Select PDF File
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
