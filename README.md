# MessageAI

Cross-platform messaging app with AI features for Remote Team Professionals.

## Project Structure

This is a monorepo containing:
- **mobile/** - React Native + Expo mobile app
- **functions/** - Firebase Cloud Functions (backend)
- **shared/** - Shared TypeScript types

## Prerequisites

- Node.js 18+ (Node 22 currently in use, Node 18 recommended for Cloud Functions)
- npm 10+
- Expo CLI (`npm install -g expo-cli`)
- Firebase CLI (`npm install -g firebase-tools`)
- Expo Go app on your mobile device (for testing)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (mobile, functions, shared).

### 2. Configure Firebase

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore, Authentication (Email/Password), Storage, and Cloud Messaging
3. Get your Firebase config from Project Settings > General > Your apps
4. Copy `mobile/.env.example` to `mobile/.env`
5. Fill in your Firebase credentials in `mobile/.env`

### 3. Build Shared Package

```bash
npm run shared:build
```

## Development

### Run Mobile App

```bash
npm run mobile
# or
cd mobile && npx expo start
```

Scan the QR code with Expo Go app to run on your device.

### Run Cloud Functions Locally

```bash
# First, build the functions
cd functions && npm run build

# Then start Firebase emulators
firebase emulators:start
```

### Build Shared Types

```bash
npm run shared:build
# or watch mode
cd shared && npm run watch
```

## Project Commands

From the root directory:

- `npm run mobile` - Start Expo development server
- `npm run functions` - Serve Cloud Functions locally
- `npm run shared:build` - Build shared types package

## Tech Stack

- **Frontend**: React Native, Expo SDK 54, TypeScript, Expo Router
- **Backend**: Firebase (Firestore, Cloud Functions, Auth, Storage, FCM)
- **Local Storage**: Expo SQLite
- **State Management**: Zustand (coming in Story 1.2)
- **AI**: OpenAI GPT-4 (coming in Stories 2-7)

## Development Timeline

- **Day 1 (24 hours)**: MVP - Core messaging (Stories 1.1-1.11)
- **Days 2-7**: AI features for Remote Team Professionals

## Current Status

✅ Story 1.1: Project Foundation & Firebase Setup (In Progress)

## Next Steps

1. Fill in Firebase credentials in `mobile/.env`
2. Run `npm run mobile` to test the Hello World screen
3. Proceed to Story 1.2: User Authentication

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Documentation](https://reactnative.dev/)

