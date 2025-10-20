// Shared data models for MessageAI
// These will be populated in subsequent stories

export interface User {
  id: string;
  email: string;
  displayName: string;
  profilePictureURL: string | null;
  isOnline: boolean;
  lastSeen: Date;
  fcmToken: string | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  participants: string[];
  lastMessage: string | null;
  lastMessageTimestamp: Date | null;
  groupPictureURL: string | null;
  createdAt: Date;
  createdBy: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image';
  content: string;
  imageURL: string | null;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveredTo: string[];
  readBy: string[];
  localId: string | null;
}

// Additional models will be added in later stories

