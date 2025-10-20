# MessageAI Fullstack Architecture Document

**Version:** 0.1  
**Date:** 2025-10-20  
**Architect:** Winston

---

## Introduction

This document outlines the complete fullstack architecture for MessageAI, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

### Starter Template or Existing Project

**Decision:** Greenfield project starting with Expo CLI (`npx create-expo-app`)

**Rationale:** No pre-existing codebase constraints. Firebase integration is straightforward. Offline-first architecture with custom message queue requires bespoke implementation. Maximum architectural control for complex real-time sync requirements.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-20 | 0.1 | Initial architecture document from PRD | Winston (Architect) |

---

## High Level Architecture

### Technical Summary

MessageAI is a mobile-first, offline-capable messaging application built with React Native and Expo, backed by Firebase's real-time infrastructure. The architecture follows a serverless, event-driven pattern where the mobile app communicates directly with Firestore for messaging operations and invokes Cloud Functions for AI-enhanced features. Local persistence via SQLite ensures offline functionality with optimistic UI updates, while Firestore real-time listeners provide instant message delivery when online. Cloud Functions act as a secure backend-for-frontend (BFF) layer, proxying OpenAI API calls and implementing RAG pipelines for AI features.

### Platform and Infrastructure Choice

**Platform:** Firebase + Google Cloud Platform  
**Key Services:** Firestore, Cloud Functions, Firebase Auth, FCM, Firebase Storage  
**Deployment Host and Regions:** us-central1 (Firebase default)

**Rationale:** Firebase eliminates the hardest technical challenge—real-time message delivery with built-in offline support.

### Repository Structure

**Structure:** Monorepo  
**Monorepo Tool:** NPM Workspaces  
**Package Organization:** `/mobile`, `/functions`, `/shared`

### Architectural Patterns

- **Offline-First Architecture** - SQLite as local source of truth, Firestore syncs in background
- **Optimistic UI** - State updates immediately, background sync handles persistence
- **Event-Driven Serverless** - Cloud Functions trigger on Firestore events
- **Backend-for-Frontend (BFF)** - Cloud Functions proxy OpenAI API securely
- **Real-Time Listener Pattern** - Firestore onSnapshot provides live updates

---

## Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Frontend Language | TypeScript | 5.3+ | Type-safe mobile development |
| Frontend Framework | React Native | 0.73+ | Cross-platform mobile app |
| Mobile Platform | Expo | SDK 50+ | React Native toolchain |
| Navigation | Expo Router | 3.0+ | File-based routing |
| UI Components | React Native Paper | 5.11+ | Material Design components |
| State Management | Zustand | 4.4+ | Lightweight global state |
| Local Database | Expo SQLite | Latest | Offline persistence |
| Backend Language | TypeScript (Node.js) | Node 18 LTS | Cloud Functions runtime |
| Backend Framework | Firebase Cloud Functions | Gen 2 | Serverless compute |
| Database | Firestore | Latest | Real-time NoSQL database |
| File Storage | Firebase Storage | Latest | Images and profile pictures |
| Authentication | Firebase Auth | Latest | User authentication |
| AI Provider | OpenAI GPT-4 Turbo | Latest | LLM for AI features |
| AI Framework | Vercel AI SDK | 3.0+ | Structured outputs, function calling |

See PRD Technical Assumptions section for complete rationale.

---

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  profilePictureURL: string | null;
  isOnline: boolean;
  lastSeen: Date;
  fcmToken: string | null;
  createdAt: Date;
}
```

### Conversation
```typescript
interface Conversation {
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
```

### Message
```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image';
  content: string;
  imageURL: string | null;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  deliveredTo: string[];
  readBy: string[];
  localId: string | null;
}
```

See full data models section in this document for complete schemas.

---

## Database Schema

### Firestore Collections

**`/users/{userId}`** - User documents with profile and presence  
**`/conversations/{conversationId}`** - Conversation metadata  
**`/conversations/{conversationId}/messages/{messageId}`** - Messages subcollection  
**`/typing/{compositeId}`** - Ephemeral typing indicators (TTL 5 seconds)

### SQLite Tables

**`users`** - Cached user data  
**`conversations`** - Cached conversations  
**`messages`** - Cached messages  
**`pending_messages`** - Queue for offline messages

**Key Indexes:**
- Firestore: `participants (array-contains) + lastMessageTimestamp (desc)` for conversation list
- Firestore: `conversationId + timestamp (asc)` for messages in conversation
- SQLite: `conversation_id + timestamp` for chat screen queries

See Database Schema section for complete DDL and security rules.

---

## API Specification

**Base URL:** `https://us-central1-<project-id>.cloudfunctions.net/`

**Authentication:** Firebase ID token in `Authorization: Bearer <token>` header

### Endpoints

- `POST /ai-summarize` - Summarize conversation (FR12)
- `POST /ai-extract-actions` - Extract action items (FR13)
- `POST /ai-search` - Smart search messages (FR14)
- `POST /ai-detect-priority` - Flag priority messages (FR15)
- `POST /ai-track-decisions` - Track decisions (FR16)
- `POST /ai-suggest-meeting` - Suggest meeting times (FR17)

**Note:** Core messaging (send/receive) goes directly to Firestore, not via Cloud Functions.

See API Specification section for complete OpenAPI schema.

---

## Project Structure

```
messageai/
├── mobile/          # React Native + Expo app
│   ├── src/
│   │   ├── app/            # Expo Router routes
│   │   ├── components/     # UI components (atoms/molecules/organisms)
│   │   ├── stores/         # Zustand state stores
│   │   ├── services/       # Firestore, SQLite, API services
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Utilities
│   └── package.json
├── functions/       # Firebase Cloud Functions
│   ├── src/
│   │   ├── https/          # HTTP callable functions
│   │   ├── triggers/       # Event-triggered functions
│   │   ├── services/       # OpenAI, Firestore, FCM services
│   │   └── utils/          # Auth, errors, logging
│   └── package.json
├── shared/          # Shared TypeScript types
│   └── src/types/
└── package.json     # Root (workspaces)
```

See Unified Project Structure section for complete directory tree.

---

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Build shared package
npm run shared:build

# Start mobile app
npm run mobile

# Start Firebase emulators (optional)
cd functions && firebase emulators:start
```

### Environment Variables

**mobile/.env:**
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FUNCTIONS_URL=...
```

**functions/.env:**
```
OPENAI_API_KEY=sk-...
```

See Development Workflow section for complete setup guide.

---

## Deployment

### Mobile (EAS Build)
```bash
cd mobile
eas build --platform ios|android --profile production
eas submit --platform ios|android
```

### Cloud Functions
```bash
firebase use production
firebase deploy --only functions
```

See Deployment Architecture section for complete CI/CD setup.

---

## Security & Performance

**Security:**
- Auth tokens in SecureStore (encrypted)
- API keys in Firebase secrets
- Firestore security rules enforce participant-only access
- Input validation with Zod schemas

**Performance:**
- Bundle size < 15MB
- AI response time < 5 seconds
- Message delivery < 2 seconds (online)
- SQLite for instant UI (offline-first)

---

## Critical Architecture Decisions

1. **SQLite + Firestore dual storage** - Offline-first with cloud sync
2. **Cloud Functions for AI** - Secure API key storage, server-side caching
3. **Optimistic UI** - Instant feedback, background sync
4. **Monorepo with shared types** - Type safety across frontend/backend
5. **Expo over bare React Native** - Faster development, managed native modules

---

## Architecture Validation

✅ **READY FOR IMPLEMENTATION**

**Next Steps:**
1. Run Story 1.1: Project Foundation & Firebase Setup
2. Refer to this document for implementation details
3. See PRD for story acceptance criteria

**Key References:**
- Data models: Import from `@messageai/shared`
- API endpoints: See API Specification section
- Workflows: See Core Workflows section for sequence diagrams
- Component patterns: See Frontend Architecture section

---

*For detailed information on any section, refer to the full architecture document above.*

