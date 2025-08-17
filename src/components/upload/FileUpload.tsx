"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { Document, DocumentUploadResponse } from "@/types/pdf";

interface FileUploadProps {
  onUploadComplete?: (document: Document) => void;
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
      // Prepare form data for upload
      const formData = new FormData();
      formData.append("file", file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadState(prev => ({ ...prev, progress: Math.round(percentComplete) }));
        }
      });

      // Handle upload completion
      const uploadPromise = new Promise<DocumentUploadResponse>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText) as DocumentUploadResponse;
              resolve(response);
            } catch (parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error?.message || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));
      });

      // Set timeout and send request
      xhr.timeout = 60000; // 60 seconds timeout
      xhr.open('POST', '/api/documents/upload');
      xhr.send(formData);

      // Wait for upload to complete
      const response = await uploadPromise;

      // Transform API response to Document format for dashboard
      const uploadedDocument: Document = {
        id: response.data.id,
        title: response.data.title,
        filename: response.data.filename,
        originalName: response.data.originalName,
        fileUrl: response.data.fileUrl,
        fileSize: response.data.fileSize,
        mimeType: 'application/pdf',
        pageCount: response.data.pageCount,
        uploadedAt: response.data.uploadedAt,
        lastAccessedAt: response.data.uploadedAt,
        conversationCount: 0,
        hasActiveConversation: false,
        lastMessageAt: null,
      };

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        success: true,
      });

      onUploadComplete?.(uploadedDocument);

      // Reset after success
      setTimeout(() => {
        setUploadState({
          isUploading: false,
          progress: 0,
          error: null,
          success: false,
        });
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadState({
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : "Upload failed. Please try again.",
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
