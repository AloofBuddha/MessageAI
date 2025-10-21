# System Patterns

## Architecture Overview

### Monorepo Structure
```
MessageAI-try2/
├── mobile/           # React Native + Expo app
│   ├── app/          # Expo Router (file-based routing)
│   ├── src/
│   │   ├── components/
│   │   │   ├── atoms/       # Simple UI components
│   │   │   └── molecules/   # Composite components
│   │   ├── services/
│   │   │   ├── firebase/    # Firebase config
│   │   │   ├── firestore/   # Firestore operations
│   │   │   ├── sqlite/      # Local database
│   │   │   ├── network/     # Network monitoring
│   │   │   └── sync/        # Sync manager
│   │   ├── stores/          # Zustand state management
│   │   └── utils/           # Helper functions
├── shared/           # Shared TypeScript types
│   └── src/types/
├── functions/        # Firebase Cloud Functions
└── docs/stories/     # Story documentation
```

## Key Design Patterns

### 1. Cache-First Data Loading
**Pattern**: Load from local cache immediately, then sync with server
```
┌─────────────┐
│ User Action │
└──────┬──────┘
       │
       ├──── INSTANT: Load from SQLite cache
       │     └──> Update UI immediately
       │
       └──── ASYNC: Subscribe to Firestore
             └──> Sync cache when data arrives
             └──> Update UI if changes detected
```

**Implementation**:
- Messages: `loadMessages()` in messagesStore
- Conversations: `loadConversations()` in conversationsStore
- Both use repository pattern for SQLite access

### 2. Repository Pattern
**Purpose**: Abstraction layer over SQLite operations

**Structure**:
```typescript
class MessageRepository {
  async upsert(message: Message): Promise<void>
  async bulkUpsert(messages: Message[]): Promise<void>
  async replaceForConversation(conversationId: string, messages: Message[]): Promise<void>
  async getByConversation(conversationId: string): Promise<Message[]>
  async updateStatus(messageId: string, status: Status): Promise<void>
  async deleteByConversation(conversationId: string): Promise<void>
}
```

**Key Method**: `replaceForConversation()`
- Deletes all cached messages for conversation
- Inserts fresh messages from Firestore
- Ensures cache exactly matches server (no stale data)

### 3. Offline Queue with Auto-Sync
**Pattern**: Queue operations when offline, sync automatically when online

**Flow**:
```
Online:
  Send Message → Firestore → Update Status

Offline:
  Send Message → SQLite pending_messages → Show "sending" status
  ↓
  Network Restored → Sync Manager → Process Queue → Firestore
                                                   ↓
                                            Delete from Queue
```

**Implementation**:
- `syncManager.addToPendingQueue()` - Queue message
- `syncManager.processPendingQueue()` - Sync on reconnect
- `networkMonitor` triggers sync when online

### 4. Network State Management
**Pattern**: Centralized network monitoring with pub/sub

**Components**:
- `initializeNetworkMonitor()` - Fetch initial state, listen for changes
- `getNetworkStatus()` - Get current status synchronously
- `subscribeToNetworkStatus()` - Subscribe to changes
- `useNetworkStatus()` - React hook for components

**Offline Detection Logic**:
```typescript
const isOffline = !networkStatus.isConnected || 
                  networkStatus.isInternetReachable === false;
```
Must check BOTH fields (device can be connected but no internet).

### 5. Optimistic UI Updates
**Pattern**: Show changes immediately, sync in background

**Implementation**:
```typescript
// 1. Create optimistic message
const optimisticMessage = { ...data, status: 'sending' }

// 2. Update UI immediately
setState({ messages: [...messages, optimisticMessage] })

// 3. Save to SQLite cache
await messageRepository.upsert(optimisticMessage)

// 4. Send to Firestore (or queue if offline)
if (offline) {
  await syncManager.addToPendingQueue(...)
} else {
  await sendMessageToFirestore(...)
}

// 5. Firestore listener updates status when confirmed
```

### 6. State Management (Zustand)
**Pattern**: Simple, hook-based state management without boilerplate

**Key Stores**:
- `authStore` - User authentication state
- `conversationsStore` - Conversation list
- `messagesStore` - Messages by conversation

**Pattern**:
```typescript
export const useMessagesStore = create<MessagesState>((set, get) => ({
  // State
  messagesByConversation: {},
  isLoading: {},
  
  // Actions
  loadMessages: async (conversationId) => { ... },
  sendMessage: async (...) => { ... },
}))
```

### 7. Firestore Real-time Listeners
**Pattern**: Subscribe to Firestore, update cache and state

**Lifecycle**:
1. Set up listener with `onSnapshot()`
2. Store unsubscribe function
3. Clean up on unmount or conversation change

**Example**:
```typescript
const unsubscribe = listenToMessages(
  conversationId,
  (messages) => {
    // Update cache
    await messageRepository.replaceForConversation(conversationId, messages)
    // Update state
    set({ messages })
  }
)

// Cleanup
return () => unsubscribe()
```

## Component Organization

### Atomic Design Structure
- **Atoms**: Simple, reusable UI components (OfflineIndicator, etc.)
- **Molecules**: Composite components (MessageBubble, ChatInput, ConversationListItem)
- **Screens**: Full screen components in `/app` directory (Expo Router)

### Screen-Level Patterns
- Use hooks to access stores: `useAuthStore()`, `useMessagesStore()`
- Handle loading and error states
- Clean up listeners on unmount
- Use `useEffect` for side effects (subscriptions, data loading)

## Data Flow Patterns

### Authentication Flow
```
App Start → initializeAuthListener()
          → Firebase onAuthStateChanged()
          → Update Zustand authStore
          → Expo Router redirects based on isAuthenticated
```

### Message Sending Flow (Online)
```
User Input → sendMessage()
          → Optimistic UI update
          → Cache to SQLite
          → Send to Firestore
          → Firestore listener updates status
          → UI shows "sent" status
```

### Message Sending Flow (Offline)
```
User Input → sendMessage()
          → Optimistic UI update
          → Cache to SQLite
          → Add to pending queue
          → Show offline banner
          ↓
Network Restored → syncManager.processPendingQueue()
                 → Send queued messages
                 → Remove from queue
                 → Firestore listener updates status
```

## Critical Implementation Details

### SQLite Migrations
- Use `PRAGMA user_version` to track schema version
- Run migrations in `withTransactionSync()` for atomicity
- Use new Expo SQLite API (NOT old WebSQL API)
- Key methods: `execSync()`, `runSync()`, `getFirstSync()`, `getAllSync()`

### Avoiding Circular Dependencies
- syncManager should NOT import messagesStore
- Let Firestore listeners handle status updates (single source of truth)
- Use `useAuthStore.getState()` for accessing user without subscription

### Network Detection
- MUST check both `isConnected` AND `isInternetReachable`
- Fetch initial state on app start
- Subscribe to changes for reactive UI
- Consider offline if either check fails

### Cache Consistency
- Use `replaceForConversation()` not `bulkUpsert()` for Firestore sync
- Ensures cache exactly matches server (deletes stale data)
- Use `upsert()` for optimistic updates (keeps pending messages)

