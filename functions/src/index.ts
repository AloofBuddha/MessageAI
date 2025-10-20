import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Sample HTTP function
export const helloWorld = functions.https.onRequest((request, response) => {
  response.json({ message: 'Hello from MessageAI Cloud Functions!' });
});

// Sample Firestore trigger (will be used in later stories)
export const onMessageCreated = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    console.log('New message created:', message);
    // Notification logic will be added in Story 1.9
  });

