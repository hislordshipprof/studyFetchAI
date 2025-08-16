export interface Conversation {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  userId: string;
  documentId: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  metadata?: {
    annotations?: any[];
    navigateTo?: number;
    [key: string]: any;
  };
  timestamp: Date;
  conversationId: string;
  annotations?: MessageAnnotation[];
}

export interface MessageAnnotation {
  id: string;
  messageId: string;
  annotationId: string;
}

export interface ChatInterfaceProps {
  documentId: string;
  conversationId?: string;
  onMessageSent: (message: Message) => void;
  onPageNavigation: (page: number) => void;
}
