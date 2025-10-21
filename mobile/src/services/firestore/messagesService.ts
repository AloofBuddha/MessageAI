import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { Message } from '@messageai/shared';
import { firestore } from '../firebase/config';

/**
 * Listen to messages in a conversation in real-time
 * Returns unsubscribe function to clean up listener
 */
export function listenToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void
): () => void {
  const messagesRef = collection(firestore, `conversations/${conversationId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          conversationId,
          senderId: data.senderId,
          type: data.type,
          content: data.content,
          imageURL: data.imageURL || null,
          timestamp: data.timestamp
            ? (data.timestamp as Timestamp).toDate()
            : new Date(),
          status: data.status || 'sent',
          deliveredTo: data.deliveredTo || [],
          readBy: data.readBy || [],
          localId: data.localId || null,
        } as Message;
      });
      callback(messages);
    },
    (error) => {
      console.error('Error listening to messages:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Send a new message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: 'text' | 'image' = 'text',
  imageURL: string | null = null,
  localId: string | null = null
): Promise<string> {
  try {
    const messagesRef = collection(firestore, `conversations/${conversationId}/messages`);
    
    const docRef = await addDoc(messagesRef, {
      senderId,
      type,
      content,
      imageURL,
      timestamp: serverTimestamp(),
      status: 'sent',
      deliveredTo: [],
      readBy: [],
      localId,
    });

    // Update conversation's lastMessage
    const conversationRef = doc(firestore, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: content,
      lastMessageTimestamp: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Mark messages as delivered
 * Uses batch write for efficiency when marking multiple messages
 */
export async function markAsDelivered(
  conversationId: string,
  messageIds: string[],
  userId: string
): Promise<void> {
  if (messageIds.length === 0) return;

  try {
    const batch = writeBatch(firestore);

    for (const messageId of messageIds) {
      const messageRef = doc(firestore, `conversations/${conversationId}/messages`, messageId);
      batch.update(messageRef, {
        deliveredTo: arrayUnion(userId),
        status: 'delivered',
      });
    }

    await batch.commit();
    console.log(`✅ Marked ${messageIds.length} messages as delivered`);
  } catch (error) {
    console.error('Error marking messages as delivered:', error);
    throw error;
  }
}

/**
 * Mark messages as read
 * Uses batch write for efficiency when marking multiple messages
 */
export async function markAsRead(
  conversationId: string,
  messageIds: string[],
  userId: string
): Promise<void> {
  if (messageIds.length === 0) return;

  try {
    const batch = writeBatch(firestore);

    for (const messageId of messageIds) {
      const messageRef = doc(firestore, `conversations/${conversationId}/messages`, messageId);
      batch.update(messageRef, {
        readBy: arrayUnion(userId),
        deliveredTo: arrayUnion(userId), // Also mark as delivered if not already
        status: 'read',
      });
    }

    await batch.commit();
    console.log(`✅ Marked ${messageIds.length} messages as read`);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Update message status (for delivery/read receipts)
 * @deprecated Use markAsDelivered or markAsRead instead for better batch support
 */
export async function updateMessageStatus(
  conversationId: string,
  messageId: string,
  status: 'sent' | 'delivered' | 'read',
  userId?: string
): Promise<void> {
  try {
    const messageRef = doc(firestore, `conversations/${conversationId}/messages`, messageId);
    
    const updates: any = { status };
    
    if (status === 'delivered' && userId) {
      updates.deliveredTo = arrayUnion(userId);
    } else if (status === 'read' && userId) {
      updates.readBy = arrayUnion(userId);
    }
    
    await updateDoc(messageRef, updates);
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
}
