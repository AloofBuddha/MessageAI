import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { Conversation } from '@messageai/shared';
import { firestore, auth } from '../firebase/config';

/**
 * Listen to user's conversations in real-time
 * Returns unsubscribe function to clean up listener
 */
export function listenToUserConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(firestore, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTimestamp', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          name: data.name || null,
          participants: data.participants,
          lastMessage: data.lastMessage || null,
          lastMessageTimestamp: data.lastMessageTimestamp 
            ? (data.lastMessageTimestamp as Timestamp).toDate() 
            : null,
          groupPictureURL: data.groupPictureURL || null,
          createdAt: data.createdAt 
            ? (data.createdAt as Timestamp).toDate() 
            : new Date(),
          createdBy: data.createdBy,
        } as Conversation;
      });
      callback(conversations);
    },
    (error) => {
      console.error('Error listening to conversations:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Create a new conversation
 * Returns the conversation ID
 */
export async function createConversation(
  participants: string[],
  type: 'direct' | 'group',
  createdBy: string,
  name?: string
): Promise<string> {
  try {
    const docRef = await addDoc(collection(firestore, 'conversations'), {
      type,
      name: name || null,
      participants,
      lastMessage: null,
      lastMessageTimestamp: null,
      groupPictureURL: null,
      createdAt: serverTimestamp(),
      createdBy,
    });

    console.log('Conversation created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Get display name for a conversation
 * For direct chats, returns the other participant's name
 * For groups, returns the group name
 */
export function getConversationDisplayName(
  conversation: Conversation,
  currentUserId: string,
  users: Map<string, { displayName: string }>
): string {
  if (conversation.type === 'group') {
    return conversation.name || 'Unnamed Group';
  }

  // For direct messages, find the other participant
  const otherUserId = conversation.participants.find(id => id !== currentUserId);
  if (!otherUserId) return 'Unknown';

  const otherUser = users.get(otherUserId);
  return otherUser?.displayName || 'Unknown User';
}

