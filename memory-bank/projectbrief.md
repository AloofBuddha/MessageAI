# Project Brief: MessageAI

## Overview
MessageAI is a real-time messaging application built with React Native, Expo, and Firebase. The project follows a story-based development approach with clear acceptance criteria and incremental feature delivery.

## Core Requirements

### Primary Goals
1. Build a production-ready messaging app for mobile (iOS/Android)
2. Support real-time one-on-one and group conversations
3. Provide robust offline support with local persistence
4. Implement modern UX patterns (optimistic UI, instant feedback)
5. Maintain clean, maintainable code architecture

### Technical Constraints
- **Platform**: React Native with Expo SDK 54
- **Backend**: Firebase (Firestore, Auth, Cloud Functions)
- **State Management**: Zustand
- **Local Storage**: SQLite (expo-sqlite)
- **UI Library**: React Native Paper
- **Language**: TypeScript
- **Workspace**: NPM Workspaces (mobile, shared, functions)

### Development Approach
- **Story-driven development** with markdown documentation in `/docs/stories/`
- **Planning before implementation** - always discuss approach before coding
- **User runs dev server** - never start expo/dev servers automatically
- **Testing in emulator** preferred over Expo Go for offline features
- **Incremental delivery** - complete and test each story before moving to next

## Project Structure
```
MessageAI-try2/
├── mobile/           # React Native app
├── shared/           # Shared types and utilities
├── functions/        # Firebase Cloud Functions
├── docs/
│   └── stories/      # Story documentation
└── memory-bank/      # Project context and progress
```

## Success Criteria
- All acceptance criteria in each story met
- Features tested and working in emulator
- Clean, maintainable code
- Proper error handling and edge cases covered
- Documentation kept up-to-date

