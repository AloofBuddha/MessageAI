import { sendMessage } from '../firestore/messagesService';
import { pendingMessageRepository } from '../sqlite/pendingMessageRepository';
import { subscribeToNetworkStatus, getNetworkStatus } from '../network/networkMonitor';
import { useAuthStore } from '../../stores/authStore';

class SyncManager {
  private isProcessing = false;
  private unsubscribeNetwork?: () => void;

  /**
   * Initialize sync manager
   * Call this once at app startup
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Sync Manager');

    // Process any existing pending messages
    await this.processPendingQueue();

    // Subscribe to network changes
    this.unsubscribeNetwork = subscribeToNetworkStatus((status) => {
      console.log('🌐 Network status changed in SyncManager:', status);
      
      // When we come back online, process pending queue
      // Consider online if connected AND (internet reachable OR null - we'll try anyway)
      const isOnline = status.isConnected && status.isInternetReachable !== false;
      
      if (isOnline) {
        console.log('✅ Back online - processing pending messages');
        this.processPendingQueue();
      }
    });

    console.log('✅ Sync Manager initialized');
  }

  /**
   * Process all pending messages
   */
  async processPendingQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('⏭️ Already processing pending queue, skipping');
      return;
    }

    const networkStatus = getNetworkStatus();
    const isOffline = !networkStatus.isConnected || networkStatus.isInternetReachable === false;
    
    if (isOffline) {
      console.log('📴 Offline - skipping pending queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingMessages = await pendingMessageRepository.getAll();
      
      if (pendingMessages.length === 0) {
        console.log('✅ No pending messages to process');
        return;
      }

      console.log(`🔄 Processing ${pendingMessages.length} pending messages`);

      for (const pendingMsg of pendingMessages) {
        try {
          const user = useAuthStore.getState().user;
          if (!user) {
            console.warn('⚠️ No authenticated user, cannot send pending message');
            continue;
          }

          // Send to Firestore
          await sendMessage(
            pendingMsg.conversationId,
            user.id,
            pendingMsg.content,
            pendingMsg.type,
            null,
            pendingMsg.localId
          );

          // Success - remove from pending queue
          await pendingMessageRepository.delete(pendingMsg.localId);
          
          // Note: Message status will be updated automatically by the Firestore listener
          // in messagesStore when the message is received from the server

          console.log(`✅ Sent pending message: ${pendingMsg.localId}`);
          
        } catch (error) {
          console.error(`❌ Failed to send pending message ${pendingMsg.localId}:`, error);
          
          // Increment retry count
          await pendingMessageRepository.incrementRetry(pendingMsg.localId);

          // TODO: Implement exponential backoff
          // For now, we'll just let the next network reconnect trigger another attempt
        }
      }
      
      console.log('✅ Finished processing pending queue');
      
    } catch (error) {
      console.error('❌ Error processing pending queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Add a message to the pending queue
   */
  async addToPendingQueue(
    localId: string,
    conversationId: string,
    type: 'text' | 'image',
    content: string,
    imageLocalUri?: string
  ): Promise<void> {
    await pendingMessageRepository.add({
      localId,
      conversationId,
      type,
      content,
      imageLocalUri: imageLocalUri || null,
      createdAt: Date.now(),
    });
    
    console.log(`📥 Added message to pending queue: ${localId}`);
  }

  /**
   * Cleanup - call this when shutting down
   */
  cleanup(): void {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
    }
  }
}

export const syncManager = new SyncManager();

