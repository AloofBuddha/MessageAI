# Product Context

## Why This Project Exists
MessageAI is a messaging application that provides reliable, real-time communication with robust offline support. The goal is to create a production-ready messaging experience that works seamlessly even with poor or no network connectivity.

## Problems It Solves

### 1. Unreliable Network Conditions
Users in areas with poor connectivity need to:
- Send messages that queue automatically when offline
- See their conversation history instantly (even offline)
- Have messages sync automatically when back online
- Not lose messages if the app crashes while offline

### 2. Modern Messaging UX
Users expect:
- Messages to appear instantly when sent (optimistic UI)
- Real-time updates when others send messages
- Clear status indicators (sending, sent, delivered, read)
- Smooth, responsive interface

### 3. Multi-line Message Composition
Users need to:
- Write multi-line messages easily
- See their full message as they type (up to 5 lines visible)
- Scroll when message exceeds 5 lines

## How It Should Work

### Core User Flows

**Sending Messages (Online)**
1. User types message in chat input
2. Message appears immediately with "sending" status
3. Message syncs to Firebase
4. Status updates to "sent" when confirmed
5. Message cached to SQLite for future offline access

**Sending Messages (Offline)**
1. User types message in chat input
2. Offline banner appears at top
3. Message appears immediately with "sending" status
4. Message queued in SQLite pending_messages table
5. When back online, message automatically syncs
6. Status updates to "sent" when confirmed

**Viewing Conversations**
1. User opens app
2. Conversations load instantly from SQLite cache
3. Firestore syncs in background to update with latest data
4. List updates seamlessly if changes detected

**Viewing Messages**
1. User taps conversation
2. Messages load instantly from SQLite cache
3. Firestore listener subscribes for real-time updates
4. New messages appear automatically
5. Message status updates in real-time

### Key UX Principles
- **Instant feedback**: Never make users wait for network
- **Cache-first**: Show data immediately, sync in background
- **Clear status**: Always show network state and message status
- **Resilient**: Handle offline, poor network, app crashes gracefully
- **Automatic**: Sync happens automatically, no manual refresh needed

## Target Users
- Anyone who needs reliable messaging
- Users in areas with poor connectivity
- Users who want their messages to "just work"
- Mobile-first users (iOS and Android)

