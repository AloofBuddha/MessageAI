# Tech Context

## Technology Stack

### Frontend (Mobile App)
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **UI Library**: React Native Paper
- **Local Database**: expo-sqlite (SQLite)
- **Network Monitoring**: @react-native-community/netinfo

### Backend
- **Platform**: Firebase
  - **Authentication**: Firebase Auth (email/password)
  - **Database**: Cloud Firestore (real-time NoSQL)
  - **Functions**: Cloud Functions (Node.js)
  - **Messaging**: FCM (planned for future stories)

### Development Tools
- **Package Manager**: NPM with Workspaces
- **Version Control**: Git
- **Node Version**: 18 (managed with nvm)
- **TypeScript**: Shared types across workspaces

## Project Structure

### NPM Workspaces
```json
{
  "workspaces": ["mobile", "shared", "functions"]
}
```

**Benefits**:
- Shared TypeScript types via `@messageai/shared`
- Consistent dependency management
- Cross-workspace building

### Workspace Details

#### mobile/
React Native app with:
- Expo Router for navigation
- Protected routes (auth vs authenticated)
- SQLite for local persistence
- Zustand stores for state

#### shared/
Shared TypeScript types:
- `User`, `Conversation`, `Message` interfaces
- Common utilities
- Built with `tsc`, outputs to `dist/`

#### functions/
Firebase Cloud Functions:
- Not yet implemented (planned for future stories)
- Will handle server-side logic

## Development Setup

### Prerequisites
```bash
# Node.js 18
nvm use 18

# Install dependencies
npm install  # Root (installs all workspaces)

# Build shared package
cd shared && npm run build
```

### Running the App
```bash
cd mobile
npx expo start

# Options:
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
# - Scan QR code for Expo Go (limited offline testing)
```

### Firebase Configuration
- Project ID: `messageai-524e2`
- Credentials in `mobile/.env` (not in git)
- Config in `mobile/src/services/firebase/config.ts`

## Key Dependencies

### Mobile App
```json
{
  "expo": "~54.0.0",
  "expo-router": "~4.0.0",
  "expo-sqlite": "^14.0.0",
  "react-native-paper": "^5.12.5",
  "zustand": "^5.0.2",
  "firebase": "^11.1.0",
  "@react-native-community/netinfo": "^11.4.1"
}
```

### Critical Version Notes
- **Expo SQLite**: Using NEW API (`openDatabaseSync`, `execSync`, etc.)
  - NOT the old WebSQL API (`db.transaction`, `executeSql`)
- **Firebase**: Web SDK (not React Native specific)
  - Auth persistence handled by Zustand + SecureStore
  - Suppressed AsyncStorage warning with LogBox

## Database Schemas

### SQLite (Local)
```sql
-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text', 'image')),
  content TEXT NOT NULL DEFAULT '',
  timestamp INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  local_id TEXT,
  synced_at INTEGER NOT NULL DEFAULT 0
);

-- Pending messages table
CREATE TABLE pending_messages (
  local_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0
);

-- Plus: users, conversations tables
```

### Firestore (Cloud)
```
conversations/
  {conversationId}/
    messages/
      {messageId}
        - senderId
        - type
        - content
        - timestamp
        - status
        - deliveredTo[]
        - readBy[]
        - localId

users/
  {userId}
    - email
    - displayName
    - isOnline
    - lastSeen
```

## Firebase Security Rules

### Conversations Collection
```javascript
match /conversations/{conversationId} {
  allow read: if request.auth != null && 
    request.auth.uid in resource.data.participants;
  allow write: if request.auth != null && 
    request.auth.uid in resource.data.participants;
  
  match /messages/{messageId} {
    allow read, write: if request.auth != null && 
      request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
  }
}
```

### Users Collection
```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    request.auth.uid == userId;
}
```

## Development Constraints

### Testing Limitations
**Expo Go**:
- ❌ Can't test true offline mode (loses Metro connection)
- ❌ SQLite doesn't persist through restarts
- ✅ Good for quick UI testing

**Emulators** (Recommended):
- ✅ Full offline mode support
- ✅ SQLite persists through restarts
- ✅ Network simulation controls
- ✅ Better debugging tools

### Build Requirements
For full offline testing and crash recovery:
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Technical Decisions

### Why Zustand over Redux?
- Simpler API, less boilerplate
- Better TypeScript support
- Easier to integrate with Expo
- Persistence built-in (SecureStore integration)

### Why SQLite over AsyncStorage?
- Structured queries (SQL)
- Better performance for large datasets
- Relational data support
- Transactions for data integrity

### Why Expo Router over React Navigation?
- File-based routing (simpler)
- Built-in deep linking
- Better TypeScript integration
- Less configuration

### Why Repository Pattern?
- Abstraction over SQLite
- Easier to test
- Consistent API
- Easier to swap storage layer

## Environment Variables

### mobile/.env
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=messageai-524e2
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

**Note**: Must prefix with `EXPO_PUBLIC_` for client-side access

## Performance Considerations

### Optimizations Implemented
1. **Cache-first loading** - Instant UI feedback
2. **Optimistic updates** - No waiting for network
3. **Batch SQLite operations** - `withTransactionSync()` for multiple inserts
4. **Efficient Firestore queries** - Indexed queries, pagination ready
5. **Clean up listeners** - Prevent memory leaks

### Future Optimizations (Planned)
- Message pagination (load more on scroll)
- Image lazy loading
- Background sync for large message batches
- Service worker for push notifications

