"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import FileUpload from "@/components/upload/FileUpload";
import DocumentCard from "@/components/dashboard/DocumentCard";
import { Search, Filter, BookOpen, MessageSquare, FileText, Loader2 } from "lucide-react";
import { Document, DocumentsListResponse } from "@/types/pdf";

// API fetcher function
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return response.json();
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "history" | "new">("all");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Build API URL with search parameters
  const apiUrl = `/api/documents${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
  
  // Fetch documents from API
  const { data: documentsResponse, error, isLoading, mutate: refreshDocuments } = useSWR<DocumentsListResponse>(
    status === "authenticated" ? apiUrl : null,
    fetcher,
    {
      refreshInterval: 0, // Don't auto-refresh
      revalidateOnFocus: true,
    }
  );

  const documents = documentsResponse?.data || [];

  const handleUploadComplete = (newDocument: Document) => {
    // Refresh the documents list after successful upload
    refreshDocuments();
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (confirm("Are you sure you want to delete this document? This will also delete all conversation history.")) {
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          // Refresh the documents list after successful deletion
          refreshDocuments();
        } else {
          throw new Error('Failed to delete document');
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document. Please try again.');
      }
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filterStatus) {
      case "active":
        return doc.hasActiveConversation;
      case "history":
        return (doc.conversationCount || 0) > 0 && !doc.hasActiveConversation;
      case "new":
        return (doc.conversationCount || 0) === 0;
      default:
        return true;
    }
  });

  const getStats = () => {
    const total = documents.length;
    const active = documents.filter(d => d.hasActiveConversation).length;
    const withHistory = documents.filter(d => (d.conversationCount || 0) > 0).length;
    const totalConversations = documents.reduce((sum, d) => sum + (d.conversationCount || 0), 0);

    return { total, active, withHistory, totalConversations };
  };

  const stats = getStats();

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  // Show error state if API request failed
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Failed to load documents</div>
          <p className="text-gray-600 mb-4">There was an error loading your documents.</p>
          <Button onClick={() => refreshDocuments()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
              <span className="text-xl font-bold">StudyFetch AI Tutor</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="text-gray-900 font-medium">{session.user.name || "User"}</div>
                <div className="text-gray-600">{session.user.email}</div>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your PDF Library</h1>
          <p className="text-gray-600 mb-4">Upload and manage your educational materials</p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Documents</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-gray-600">Active Chats</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.withHistory}</p>
                <p className="text-sm text-gray-600">With History</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
                <p className="text-sm text-gray-600">Total Conversations</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upload New Document</h2>
            <Button className="hidden md:flex" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Upload PDF
            </Button>
          </div>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All ({documents.length})
              </Button>
              <Button
                variant={filterStatus === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("active")}
              >
                Active ({stats.active})
              </Button>
              <Button
                variant={filterStatus === "history" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("history")}
              >
                History ({stats.withHistory - stats.active})
              </Button>
              <Button
                variant={filterStatus === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("new")}
              >
                New ({stats.total - stats.withHistory})
              </Button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {filterStatus === "all" ? "All Documents" : 
               filterStatus === "active" ? "Active Conversations" :
               filterStatus === "history" ? "Documents with History" : "New Documents"}
            </h2>
            <p className="text-sm text-gray-500">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""}
            </p>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="text-center py-12">
                <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading your documents...</p>
              </CardContent>
            </Card>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                {documents.length === 0 ? (
                  <>
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">No documents uploaded yet</p>
                    <p className="text-sm text-gray-500">Upload your first PDF to get started with AI tutoring</p>
                  </>
                ) : (
                  <>
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">No documents match your search</p>
                    <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}