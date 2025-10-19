"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, MessageSquare } from "lucide-react";
import SplitScreen from "@/components/layout/SplitScreen";
import ChatInterface from "@/components/chat/ChatInterface";
import type { Document, Annotation } from "@/types/pdf";
import type { Message } from "@/types/chat";

// Dynamic import to avoid SSR issues with DOMMatrix
const PDFViewer = dynamic(() => import("@/components/pdf/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

// API response type for individual document
interface DocumentResponse {
  data: Document;
}

export default function TutorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const documentId = params.documentId as string;
  
  const [document, setDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load document data from API
  useEffect(() => {
    const loadDocument = async () => {
      // Don't load if not authenticated yet
      if (status !== "authenticated") {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch document from API
        const response = await fetch(`/api/documents/${documentId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Document not found");
          } else if (response.status === 401) {
            setError("Authentication required");
            router.push("/login");
          } else {
            setError("Failed to load document");
          }
          return;
        }

        const documentResponse: DocumentResponse = await response.json();
        setDocument(documentResponse.data);
        
        // Update last accessed time
        try {
          await fetch(`/api/documents/${documentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              // Just update lastAccessedAt by calling the API
            }),
          });
        } catch (updateError) {
          // Non-critical error, don't show to user
          console.warn("Failed to update last accessed time:", updateError);
        }
        
        // Load conversation history from localStorage (for now)
        const savedMessages = localStorage.getItem(`conversation_${documentId}`);
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        }
        
        // Load last viewed page from localStorage
        const savedPage = localStorage.getItem(`lastPage_${documentId}`);
        if (savedPage) {
          setCurrentPage(parseInt(savedPage, 10));
        }

      } catch (err) {
        setError("Failed to load document");
        console.error("Error loading document:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId, status, router]);

  // Save current page when it changes
  useEffect(() => {
    if (documentId && currentPage > 0) {
      localStorage.setItem(`lastPage_${documentId}`, currentPage.toString());
    }
  }, [documentId, currentPage]);

  // Save messages when they change
  useEffect(() => {
    if (documentId && messages.length > 0) {
      localStorage.setItem(`conversation_${documentId}`, JSON.stringify(messages));
    }
  }, [documentId, messages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSendMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handlePageNavigation = (page: number) => {
    if (page >= 1 && page <= (document?.pageCount || 1)) {
      setCurrentPage(page);
    }
  };

  const handleAddAnnotations = (newAnnotations: Annotation[]) => {
    setAnnotations(prev => [...prev, ...newAnnotations]);
  };

  // Show loading state while checking authentication or loading document
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === "loading" ? "Checking authentication..." : "Loading document..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  // Show error state
  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The requested document could not be found."}</p>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {document.title}
              </h1>
              <p className="text-sm text-gray-500">
                Page {currentPage} of {document.pageCount}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>{document.pageCount} pages</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <MessageSquare className="h-4 w-4" />
              <span>{messages.length} messages</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <div className="h-[calc(100vh-73px)]">
        <SplitScreen
          leftPanel={
            <PDFViewer
              document={document}
              currentPage={currentPage}
              annotations={annotations}
              onPageChange={handlePageChange}
            />
          }
          rightPanel={
            <ChatInterface
              document={document}
              messages={messages}
              onSendMessage={handleSendMessage}
              onPageNavigation={handlePageNavigation}
              onAddAnnotations={handleAddAnnotations}
            />
          }
        />
      </div>
    </div>
  );
}
