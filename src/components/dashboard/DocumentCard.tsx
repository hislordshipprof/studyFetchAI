"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare, Clock, BookOpen, Trash2 } from "lucide-react";

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    filename: string;
    pageCount: number;
    fileSize: number;
    uploadedAt: Date;
    lastAccessedAt?: Date;
    conversationCount: number;
    hasActiveConversation: boolean;
    lastViewedPage?: number;
    lastMessageAt?: Date;
  };
  onDelete?: (documentId: string) => void;
}

export default function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatRelativeTime = (date: Date | string) => {
    // Ensure we have a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return dateObj.toLocaleDateString();
  };

  const getDocumentStatus = () => {
    if (document.hasActiveConversation) {
      return { status: "active", color: "bg-green-100 text-green-800", text: "Active Chat" };
    }
    if (document.conversationCount > 0) {
      return { status: "history", color: "bg-blue-100 text-blue-800", text: "Has History" };
    }
    return { status: "new", color: "bg-gray-100 text-gray-800", text: "New" };
  };

  const status = getDocumentStatus();

  return (
    <Card className="hover:shadow-lg transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
              <Badge variant="secondary" className={status.color}>
                {status.text}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight truncate" title={document.title}>
              {document.title}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{document.pageCount} pages</span>
              <span>{formatFileSize(document.fileSize)}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(document.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Conversation Status */}
        {document.conversationCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <MessageSquare className="h-4 w-4" />
                <span>{document.conversationCount} conversation{document.conversationCount > 1 ? "s" : ""}</span>
              </div>
              {document.lastMessageAt && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{formatRelativeTime(document.lastMessageAt)}</span>
                </div>
              )}
            </div>
            
            {document.lastViewedPage && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                <span>Last viewed: Page {document.lastViewedPage}</span>
              </div>
            )}
          </div>
        )}

        {/* Upload Information */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <div className="flex items-center justify-between">
            <span>Uploaded {formatRelativeTime(document.uploadedAt)}</span>
            {document.lastAccessedAt && document.lastAccessedAt > document.uploadedAt && (
              <span>Accessed {formatRelativeTime(document.lastAccessedAt)}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {document.hasActiveConversation ? (
            <Link href={`/tutor/${document.id}`} className="flex-1">
              <Button className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                Continue Chat
              </Button>
            </Link>
          ) : document.conversationCount > 0 ? (
            <Link href={`/tutor/${document.id}`} className="flex-1">
              <Button className="w-full" variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Resume Reading
              </Button>
            </Link>
          ) : (
            <Link href={`/tutor/${document.id}`} className="flex-1">
              <Button className="w-full">
                <BookOpen className="mr-2 h-4 w-4" />
                Start Learning
              </Button>
            </Link>
          )}
        </div>

        {/* Resume from specific page hint */}
        {document.lastViewedPage && document.lastViewedPage > 1 && (
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded text-center">
            Resume from page {document.lastViewedPage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
