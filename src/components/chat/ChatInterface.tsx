"use client";

import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Mic, 
  MicOff, 
  FileText, 
  Clock,
  Bot,
  User,
  Volume2,
  VolumeX
} from "lucide-react";
import type { Document, Annotation } from "@/types/pdf";
import type { Message } from "@/types/chat";
import { generateHighlightAnnotations, injectPageCitations } from "@/lib/pdf-annotations";
import CitableMessage from "./CitableMessage";

// Helper function for fallback annotations when MuPDF document not loaded
const generateBasicAnnotationsFromSources = async (sources: string[], sourceDocuments: any[]): Promise<Annotation[]> => {
  const annotations: Annotation[] = [];
  
  // Extract page information from sourceDocuments (like Python version)
  sourceDocuments.forEach((doc, index) => {
    if (doc.metadata?.page) {
      annotations.push({
        id: `ann_${Date.now()}_${index}`,
        type: "HIGHLIGHT" as const,
        pageNumber: doc.metadata.page,
        coordinates: { 
          x: 50 + (index * 10), 
          y: 150 + (index * 80), 
          width: 400, 
          height: 60 
        },
        color: "red", // Match chatapp.py color format
        opacity: 0.15, // Light uniform opacity for better readability
        createdAt: new Date(),
        documentId: "current_doc"
      });
    }
  });
  
  return annotations;
};

interface ChatInterfaceProps {
  document: Document;
  messages: Message[];
  onSendMessage: (message: Message) => void;
  onPageNavigation: (page: number) => void;
  onAddAnnotations: (annotations: Annotation[]) => void;
}

export default function ChatInterface({
  document,
  messages,
  onSendMessage,
  onPageNavigation,
  onAddAnnotations
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [currentSources, setCurrentSources] = useState<string[]>([]); // Store current AI sources
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true; // Enable real-time results
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results in real-time
        if (interimTranscript) {
          setInterimTranscript(interimTranscript);
        }

        // When we get final results, add to input and clear interim
        if (finalTranscript) {
          setInputValue(prev => prev + finalTranscript);
          setInterimTranscript('');
        }
      };

      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognition.current.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      setIsVoiceEnabled(true);
    }
  }, []);


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputValue,
      role: 'USER',
      timestamp: new Date(),
      conversationId: `conv_${document.id}`
    };

    onSendMessage(userMessage);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    // Call real AI API - exact same as chatapp.py flow
    try {
      console.log('Sending message to AI:', currentInput);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput, 
          documentId: document.id 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('AI response received:', result);

      // Store sources and generate annotations FIRST (exact same as chatapp.py lines 248-273)
      let finalAiResponse = result.answer;
      let finalPageMappings: Array<{excerpt: string, pages: number[]}> = [];
      
      if (result.sources && result.sources.length > 0) {
        // Update session state with new sources for highlighting (lines 248-249)
        setCurrentSources(result.sources);
        
        console.log('Generating highlights for sources via server-side API:', result.sources);
        
        // Generate real text-based annotations using server-side MuPDF.js API (line 273)
        // Exact same as chatapp.py: generate_highlight_annotations(doc, st.session_state.sources)
        const highlightResult = await generateHighlightAnnotations(document.id, result.sources);
        
        if (highlightResult.annotations.length > 0) {
          onAddAnnotations(highlightResult.annotations);
          
          // Inject clickable page citations into AI response BEFORE sending message
          finalAiResponse = injectPageCitations(
            result.answer,
            result.sources,
            highlightResult.pageMappings
          );
          
          finalPageMappings = highlightResult.pageMappings;
          
          // Navigate to first highlighted page (like chatapp.py)
          const firstPage = highlightResult.annotations[0].pageNumber;
          onPageNavigation(firstPage);
          
          console.log(`Generated ${highlightResult.annotations.length} highlights with interactive citations, navigating to page ${firstPage}`);
        } else {
          console.log('No text matches found for highlighting');
          // Fallback to basic annotations from sourceDocuments if no text search results
          const fallbackAnnotations = await generateBasicAnnotationsFromSources(result.sources, result.sourceDocuments);
          onAddAnnotations(fallbackAnnotations);
          
          if (fallbackAnnotations.length > 0) {
            onPageNavigation(fallbackAnnotations[0].pageNumber);
          }
        }
      }

      // Create AI message with final response (citations already injected)
      const aiMessage: Message = {
        id: `msg_${Date.now()}`,
        content: finalAiResponse,
        role: 'ASSISTANT',
        timestamp: new Date(),
        conversationId: `conv_${document.id}`,
        metadata: {
          sources: result.sources,
          sourceDocuments: result.sourceDocuments,
          pageMappings: finalPageMappings
        }
      };

      // Send the complete message once (prevents double rendering)
      onSendMessage(aiMessage);

      // Speak the response if TTS is enabled
      if (isSpeaking && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(finalAiResponse);
        speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error("Error generating AI response:", error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        content: `I'm sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        role: 'ASSISTANT',
        timestamp: new Date(),
        conversationId: `conv_${document.id}`
      };

      onSendMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!isVoiceEnabled) return;

    if (isRecording) {
      recognition.current?.stop();
      setIsRecording(false);
      setInterimTranscript('');
    } else {
      recognition.current?.start();
      setIsRecording(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date | string) => {
    // Ensure we have a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid date";
    }
    
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white max-h-full overflow-hidden">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Tutor</h3>
            <p className="text-sm text-gray-500">
              Ask questions about {document.title}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isVoiceEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSpeaking(!isSpeaking)}
              >
                {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <FileText className="h-3 w-3" />
              <span>{messages.length} messages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 min-h-0">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h4>
              <p className="text-gray-500 mb-4">
                Ask me anything about this document. I can help explain concepts, 
                find specific information, and guide you through the content.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(`What are the main topics covered in ${document.title}?`)}
                >
                  Main topics in {document.title}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(`Can you summarize the key concepts from this document?`)}
                >
                  Summarize key concepts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(`Explain the most important information in ${document.title}`)}
                >
                  Most important info
                </Button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.role === 'USER' ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {message.role === 'USER' ? (
                      <User className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Bot className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-xs text-gray-500">
                      {message.role === 'USER' ? 'You' : 'AI Tutor'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    message.role === 'USER' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.role === 'ASSISTANT' && message.metadata?.pageMappings ? (
                      <CitableMessage 
                        content={message.content}
                        pageMappings={message.metadata.pageMappings}
                        onPageNavigation={onPageNavigation}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                    {message.metadata?.pageMappings && message.metadata.pageMappings.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          📄 Interactive citations • Click page numbers to navigate
                        </p>
                      </div>
                    )}
                    {message.metadata?.navigateTo && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs opacity-75">
                           Navigated to page {message.metadata.navigateTo}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-gray-500">AI Tutor</span>
                  <Clock className="h-3 w-3 text-gray-400" />
                </div>
                <div className="p-3 rounded-lg bg-gray-100">
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Message Input */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about this document..."
              disabled={isLoading}
              className="pr-20"
            />
            {/* Real-time transcript overlay */}
            {isRecording && interimTranscript && (
              <div className="absolute inset-y-0 left-3 right-20 flex items-center pointer-events-none">
                <span className="text-gray-400 italic">
                  {inputValue}
                  <span className="text-blue-500 bg-blue-50 px-1 rounded">
                    {interimTranscript}
                  </span>
                </span>
              </div>
            )}
            {isVoiceEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceToggle}
                disabled={isLoading}
                className={`absolute right-12 top-1/2 transform -translate-y-1/2 ${
                  isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'
                }`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isRecording && (
          <div className="mt-2 space-y-1 flex-shrink-0">
            <p className="text-xs text-red-500 flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
              Listening... Speak now
            </p>
            {interimTranscript && (
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded max-h-20 overflow-y-auto">
                <span className="font-medium">Real-time:</span> "{interimTranscript}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
